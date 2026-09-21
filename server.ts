import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { calculateServerFare } from "./src/core/serverFare";

dotenv.config();

const app = express();

// Port Configuration:
// 1. In AI Studio Development Environment: CONTROL_PLANE_PORT is present,
//    Nginx reverse-proxy routes public traffic to port 3000 (DEFAULT_APP_PORT).
// 2. In Deployed Cloud Run Production Service: Cloud Run passes PORT (typically 8080)
//    and requires the server to bind directly to process.env.PORT.
const isDevContainer = Boolean(process.env.CONTROL_PLANE_PORT);
const PORT = isDevContainer
  ? (Number(process.env.DEFAULT_APP_PORT) || 3000)
  : (Number(process.env.PORT) || 3000);

app.use(express.json({ limit: "6mb" }));

// Lightweight per-instance abuse protection for sensitive API mutations.
// Authentication remains the primary authorization control; this limiter only
// reduces bursts and accidental/replay traffic. Production deployments should
// also enforce an edge/API-gateway rate limit across all instances.
const rateBuckets = new Map<string, { windowStart: number; count: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMITS: Record<string, number> = {
  "/api/orders": 20,
  "/api/webhooks/dispatch": 10,
  "/api/notifications/line": 10,
  "/api/orders/:id/accept": 10,
  "/api/orders/:id/step": 30,
  "/api/orders/:id/location": 120,
  "/api/routes/compute": 30,
  "/api/pet-care/nearby": 20,
  "/api/emergency/nearby": 20,
  "/api/radar/nearby-places": 20,
  "/api/places/resolve-routes": 20,
  "/api/shop/directory": 30,
  "/api/shop/listings": 20,
  "/api/shop/profile-content": 20,
  "/api/events/daily": 30,
};

function rateLimitKey(req: express.Request): string {
  const bearer = String(req.headers.authorization || "");
  if (bearer.startsWith("Bearer ")) {
    return "auth:" + crypto.createHash("sha256").update(bearer.slice(7)).digest("hex").slice(0, 24);
  }
  return "ip:" + String(req.ip || "unknown");
}

function rateLimit(maxRequests: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const key = req.path + ":" + rateLimitKey(req);
    const bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
      rateBuckets.set(key, { windowStart: now, count: 1 });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "Too many requests" });
    }
    next();
  };
}

setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.windowStart < cutoff) rateBuckets.delete(key);
  }
}, RATE_WINDOW_MS).unref();

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoints (Cloud Run, Kubernetes, AI Studio probes)
app.get(["/api/health", "/healthz", "/health"], (_req, res) => {
  res.json({ status: "ok", empire: "WINRIDER.AI", timestamp: new Date().toISOString() });
});

app.post("/api/pet-care/nearby", rateLimit(RATE_LIMITS["/api/pet-care/nearby"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const radiusMeters = Math.min(50_000, Math.max(1_000, Number(req.body?.radiusMeters) || 15_000));
  const validCoord = Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  if (!validCoord) return res.status(400).json({ error: "พิกัดตำแหน่งปัจจุบันไม่ถูกต้อง" });

  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (!apiKey || apiKey.includes("MY_GOOGLE_MAPS")) {
    return res.status(503).json({ error: "ยังไม่ได้ตั้งค่า GOOGLE_MAPS_API_KEY สำหรับข้อมูลสถานที่จริง", places: [] });
  }

  try {
    const placesResponse = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id", "places.displayName", "places.formattedAddress", "places.location",
          "places.rating", "places.userRatingCount", "places.nationalPhoneNumber",
          "places.regularOpeningHours", "places.currentOpeningHours.openNow", "places.googleMapsUri"
        ].join(","),
      },
      body: JSON.stringify({
        includedTypes: ["veterinary_care"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        languageCode: "th",
        regionCode: "TH",
        locationRestriction: { circle: { center: { latitude, longitude }, radius: radiusMeters } },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!placesResponse.ok) {
      console.error(`[Pet Care Places] Google returned ${placesResponse.status}`);
      return res.status(502).json({ error: "ดึงข้อมูลโรงพยาบาลและคลินิกจริงจาก Google Places ไม่สำเร็จ", places: [] });
    }

    const placesPayload = await placesResponse.json() as { places?: any[] };
    const rawPlaces = (Array.isArray(placesPayload.places) ? placesPayload.places : []).filter((place) =>
      place?.id && place?.displayName?.text && Number.isFinite(place?.location?.latitude) && Number.isFinite(place?.location?.longitude)
    );

    let matrix: any[] = [];
    if (rawPlaces.length > 0) {
      const matrixResponse = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "originIndex,destinationIndex,status,condition,distanceMeters,duration",
        },
        body: JSON.stringify({
          origins: [{ waypoint: { location: { latLng: { latitude, longitude } } } }],
          destinations: rawPlaces.map((place) => ({
            waypoint: { location: { latLng: place.location } },
          })),
          travelMode: "TWO_WHEELER",
          languageCode: "th-TH",
          units: "METRIC",
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (matrixResponse.ok) matrix = await matrixResponse.json() as any[];
      else console.error(`[Pet Care Routes] Google returned ${matrixResponse.status}`);
    }

    const routeByDestination = new Map(matrix
      .filter((item) => item?.condition === "ROUTE_EXISTS" && Number.isFinite(item?.distanceMeters))
      .map((item) => [Number(item.destinationIndex), item]));

    const places = rawPlaces.map((place, index) => {
      const route = routeByDestination.get(index);
      const distanceKm = route ? Math.round((Number(route.distanceMeters) / 1000) * 10) / 10 : null;
      const durationSeconds = route ? Number.parseFloat(String(route.duration || "0").replace("s", "")) : NaN;
      const weekdayDescriptions = Array.isArray(place.regularOpeningHours?.weekdayDescriptions)
        ? place.regularOpeningHours.weekdayDescriptions : [];
      const alwaysOpen = Array.isArray(place.regularOpeningHours?.periods)
        && place.regularOpeningHours.periods.length === 1
        && place.regularOpeningHours.periods[0]?.open?.hour === 0
        && !place.regularOpeningHours.periods[0]?.close;
      return {
        id: String(place.id),
        name: String(place.displayName.text),
        address: String(place.formattedAddress || ""),
        latitude: Number(place.location.latitude),
        longitude: Number(place.location.longitude),
        distanceKm,
        etaMinutes: Number.isFinite(durationSeconds) ? Math.max(1, Math.ceil(durationSeconds / 60)) : null,
        phoneNumber: String(place.nationalPhoneNumber || ""),
        rating: Number.isFinite(place.rating) ? Number(place.rating) : null,
        reviewsCount: Number.isFinite(place.userRatingCount) ? Number(place.userRatingCount) : 0,
        openNow: typeof place.currentOpeningHours?.openNow === "boolean" ? place.currentOpeningHours.openNow : null,
        openHours: weekdayDescriptions,
        is24Hours: alwaysOpen,
        googleMapsUri: String(place.googleMapsUri || ""),
        routeSource: route ? "google_routes_api_live" : null,
      };
    }).sort((a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE));

    return res.json({
      places,
      source: "Google Places API (New) + Google Routes API",
      origin: { latitude, longitude },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Pet Care Nearby]", error instanceof Error ? error.message : error);
    return res.status(502).json({ error: "เชื่อมต่อข้อมูลสถานพยาบาลสัตว์จริงไม่ได้", places: [] });
  }
});

app.post("/api/emergency/nearby", rateLimit(RATE_LIMITS["/api/emergency/nearby"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "พิกัดตำแหน่งปัจจุบันไม่ถูกต้อง", places: [] });
  }
  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (!apiKey || apiKey.includes("MY_GOOGLE_MAPS")) return res.status(503).json({ error: "ยังไม่ได้ตั้งค่า GOOGLE_MAPS_API_KEY", places: [] });
  try {
    const placesResponse = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.primaryType,places.formattedAddress,places.location,places.nationalPhoneNumber,places.googleMapsUri,places.currentOpeningHours.openNow" },
      body: JSON.stringify({ includedTypes: ["hospital", "fire_station", "police"], maxResultCount: 20,
        rankPreference: "DISTANCE", languageCode: "th", regionCode: "TH",
        locationRestriction: { circle: { center: { latitude, longitude }, radius: 20000 } } }),
      signal: AbortSignal.timeout(12000),
    });
    if (!placesResponse.ok) return res.status(502).json({ error: "ดึงข้อมูลศูนย์ฉุกเฉินจริงไม่สำเร็จ", places: [] });
    const payload = await placesResponse.json() as { places?: any[] };
    const raw = (payload.places || []).filter((place) => place?.id && place?.location);
    let matrix: any[] = [];
    if (raw.length) {
      const routeResponse = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "originIndex,destinationIndex,status,condition,distanceMeters,duration" },
        body: JSON.stringify({ origins: [{ waypoint: { location: { latLng: { latitude, longitude } } } }],
          destinations: raw.map((place) => ({ waypoint: { location: { latLng: place.location } } })),
          travelMode: "TWO_WHEELER", languageCode: "th-TH", units: "METRIC" }),
        signal: AbortSignal.timeout(12000),
      });
      if (routeResponse.ok) matrix = await routeResponse.json() as any[];
    }
    const routeMap = new Map(matrix.filter((route) => route?.condition === "ROUTE_EXISTS").map((route) => [Number(route.destinationIndex), route]));
    const places = raw.map((place, index) => {
      const route = routeMap.get(index) as any;
      const seconds = route ? Number.parseFloat(String(route.duration || "0").replace("s", "")) : NaN;
      return { id: String(place.id), name: String(place.displayName?.text || ""), type: String(place.primaryType || "hospital"),
        address: String(place.formattedAddress || ""), phone: String(place.nationalPhoneNumber || ""), mapsUrl: String(place.googleMapsUri || ""),
        openNow: typeof place.currentOpeningHours?.openNow === "boolean" ? place.currentOpeningHours.openNow : null,
        distanceKm: route ? Math.round((Number(route.distanceMeters) / 1000) * 10) / 10 : null,
        etaMinutes: Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds / 60)) : null };
    }).sort((a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE));
    return res.json({ places, source: "Google Places API (New) + Google Routes API", fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[Emergency Nearby]", error instanceof Error ? error.message : error);
    return res.status(502).json({ error: "เชื่อมต่อข้อมูลศูนย์ฉุกเฉินจริงไม่ได้", places: [] });
  }
});

const radarPlacesCache = new Map<string, { expiresAt: number; places: any[] }>();
const RADAR_PLACES_CACHE_MS = 2 * 60 * 1000;

// Real-world radar places shared by customer, knight, merchant and partner views.
// Searches are split by domain so nearby shops cannot crowd schools, transport
// or places of worship out of Google's 20-result response window.
app.post("/api/radar/nearby-places", rateLimit(RATE_LIMITS["/api/radar/nearby-places"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "พิกัด GPS ไม่ถูกต้อง", places: [] });
  }
  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (!apiKey || apiKey.includes("MY_GOOGLE_MAPS")) return res.status(503).json({ error: "ยังไม่ได้ตั้งค่า GOOGLE_MAPS_API_KEY", places: [] });
  const cacheKey = `${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  const cached = radarPlacesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    const categoryLabels: Record<string, string> = { shop: "ร้านค้าและบริการ", transport: "ขนส่งสาธารณะทางบกและทางน้ำ", faith: "ศาสนสถาน", community: "การศึกษา ที่พัก สุขภาพและสถานที่สำคัญ" };
    return res.json({
      places: cached.places,
      categories: Object.entries(categoryLabels).map(([key, label]) => ({ key, label, count: cached.places.filter((place) => place.placeGroup === key).length })),
      perCategoryLimit: 20,
      defaultLimit: 20,
      source: "Google Places API cache",
      registeredPeopleSynthesized: false,
    });
  }
  try {
    const searchGroups = [
      {
        key: "shop",
        label: "ร้านค้าและบริการ",
        types: ["restaurant", "cafe", "bakery", "convenience_store", "grocery_store", "supermarket", "market", "shopping_mall", "store", "pharmacy", "courier_service", "pet_store"],
      },
      {
        key: "transport",
        label: "ขนส่งสาธารณะทางบกและทางน้ำ",
        types: ["bus_station", "bus_stop", "train_station", "light_rail_station", "subway_station", "transit_station", "transit_stop", "taxi_stand", "park_and_ride", "ferry_terminal", "ferry_service", "marina", "airport"],
      },
      {
        key: "faith",
        label: "ศาสนสถาน",
        types: ["buddhist_temple", "church", "hindu_temple", "mosque", "shinto_shrine", "synagogue"],
      },
      {
        key: "community",
        label: "การศึกษา ที่พัก สุขภาพและสถานที่สำคัญ",
        types: ["preschool", "primary_school", "school", "secondary_school", "university", "library", "lodging", "hotel", "hostel", "guest_house", "resort_hotel", "hospital", "medical_clinic", "police", "fire_station", "community_center", "tourist_attraction", "park", "event_venue", "stadium", "veterinary_care"],
      },
    ] as const;
    const fieldMask = "places.id,places.displayName,places.primaryType,places.formattedAddress,places.location,places.rating,places.currentOpeningHours.openNow,places.googleMapsUri";
    const groupResults = await Promise.all(searchGroups.map(async (group) => {
      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fieldMask },
        body: JSON.stringify({
          includedTypes: group.types,
          maxResultCount: 20,
          rankPreference: "DISTANCE",
          languageCode: "th",
          regionCode: "TH",
          locationRestriction: { circle: { center: { latitude, longitude }, radius: 5000 } },
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        console.warn(`[Radar Nearby Places] Google group ${group.key} returned ${response.status}`);
        return [];
      }
      const payload = await response.json() as { places?: any[] };
      return (payload.places || []).map((place) => ({ ...place, radarGroup: group.key, radarGroupLabel: group.label }));
    }));
    const deduplicated = new Map<string, any>();
    for (const place of groupResults.flat()) {
      if (place?.id && place?.location && place?.displayName?.text && !deduplicated.has(String(place.id))) {
        deduplicated.set(String(place.id), place);
      }
    }
    const raw = [...deduplicated.values()];
    if (!raw.length) return res.status(502).json({ error: "ดึงสถานที่จริงจาก Google Places ไม่สำเร็จ", places: [] });
    let matrix: any[] = [];
    if (raw.length) {
      const routeResponse = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "originIndex,destinationIndex,status,condition,distanceMeters,duration" },
        body: JSON.stringify({ origins: [{ waypoint: { location: { latLng: { latitude, longitude } } } }],
          destinations: raw.map((place) => ({ waypoint: { location: { latLng: place.location } } })), travelMode: "TWO_WHEELER", languageCode: "th-TH", units: "METRIC" }),
        signal: AbortSignal.timeout(12000),
      });
      if (routeResponse.ok) matrix = await routeResponse.json() as any[];
    }
    const routes = new Map(matrix.filter((route) => route?.condition === "ROUTE_EXISTS").map((route) => [Number(route.destinationIndex), route]));
    const toRadians = (degrees: number) => degrees * Math.PI / 180;
    const straightLineMeters = (destinationLat: number, destinationLng: number) => {
      const earthRadius = 6_371_000;
      const deltaLat = toRadians(destinationLat - latitude);
      const deltaLng = toRadians(destinationLng - longitude);
      const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(toRadians(latitude)) * Math.cos(toRadians(destinationLat)) * Math.sin(deltaLng / 2) ** 2;
      return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
    };
    const places = raw.map((place, index) => {
      const route = routes.get(index) as any;
      const isShop = place.radarGroup === "shop";
      return { id: String(place.id), name: String(place.displayName.text), category: isShop ? "shop" : "partner",
        placeGroup: String(place.radarGroup), categoryLabel: String(place.radarGroupLabel),
        primaryType: String(place.primaryType || "store"), address: String(place.formattedAddress || ""), latitude: Number(place.location.latitude), longitude: Number(place.location.longitude),
        rating: Number.isFinite(place.rating) ? Number(place.rating) : null, openNow: typeof place.currentOpeningHours?.openNow === "boolean" ? place.currentOpeningHours.openNow : null,
        distanceMeters: route && Number.isFinite(route.distanceMeters) ? Math.round(Number(route.distanceMeters)) : straightLineMeters(Number(place.location.latitude), Number(place.location.longitude)),
        distanceSource: route && Number.isFinite(route.distanceMeters) ? "route" : "straight_line", googleMapsUri: String(place.googleMapsUri || "") };
    }).sort((a, b) => Number(a.distanceMeters) - Number(b.distanceMeters));
    radarPlacesCache.set(cacheKey, { expiresAt: Date.now() + RADAR_PLACES_CACHE_MS, places });
    if (radarPlacesCache.size > 200) {
      const now = Date.now();
      for (const [key, value] of radarPlacesCache) {
        if (value.expiresAt <= now || radarPlacesCache.size > 150) radarPlacesCache.delete(key);
      }
    }
    return res.json({
      places,
      categories: searchGroups.map((group) => ({ key: group.key, label: group.label, count: places.filter((place) => place.placeGroup === group.key).length })),
      perCategoryLimit: 20,
      defaultLimit: 20,
      source: "Google Places API (New) + Google Routes API",
      registeredPeopleSynthesized: false,
    });
  } catch (error) {
    console.error("[Radar Nearby Places]", error instanceof Error ? error.message : error);
    return res.status(502).json({ error: "เชื่อมต่อข้อมูล Google Maps สำหรับเรดาร์ไม่ได้", places: [] });
  }
});

app.post("/api/places/resolve-routes", rateLimit(RATE_LIMITS["/api/places/resolve-routes"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const requestedPlaces = Array.isArray(req.body?.places) ? req.body.places.slice(0, 20) : [];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "พิกัดตำแหน่งปัจจุบันไม่ถูกต้อง", routes: [] });
  }
  const places = requestedPlaces
    .map((item: any) => ({ key: String(item?.key || "").trim(), query: String(item?.query || "").trim() }))
    .filter((item: { key: string; query: string }) => item.key && item.query);
  if (places.length === 0) return res.status(400).json({ error: "ไม่มีสถานที่สำหรับคำนวณเส้นทาง", routes: [] });

  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (!apiKey || apiKey.includes("MY_GOOGLE_MAPS")) {
    return res.status(503).json({ error: "ยังไม่ได้ตั้งค่า GOOGLE_MAPS_API_KEY", routes: [] });
  }

  try {
    const resolved = await Promise.all(places.map(async (item: { key: string; query: string }) => {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri",
        },
        body: JSON.stringify({
          textQuery: item.query,
          languageCode: "th",
          regionCode: "TH",
          locationBias: { circle: { center: { latitude, longitude }, radius: 50_000 } },
          maxResultCount: 1,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;
      const data = await response.json() as { places?: any[] };
      const place = data.places?.[0];
      if (!place?.id || !Number.isFinite(place?.location?.latitude) || !Number.isFinite(place?.location?.longitude)) return null;
      return { ...item, place };
    }));
    const found = resolved.filter(Boolean) as Array<{ key: string; query: string; place: any }>;
    if (found.length === 0) return res.json({ routes: [], source: "Google Places API (New) + Google Routes API" });

    const matrixResponse = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "originIndex,destinationIndex,status,condition,distanceMeters,duration",
      },
      body: JSON.stringify({
        origins: [{ waypoint: { location: { latLng: { latitude, longitude } } } }],
        destinations: found.map((item) => ({ waypoint: { location: { latLng: item.place.location } } })),
        travelMode: "TWO_WHEELER",
        languageCode: "th-TH",
        units: "METRIC",
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!matrixResponse.ok) return res.status(502).json({ error: "คำนวณระยะทางจริงจาก Google Routes ไม่สำเร็จ", routes: [] });
    const matrix = await matrixResponse.json() as any[];
    const routeByDestination = new Map(matrix
      .filter((item) => item?.condition === "ROUTE_EXISTS" && Number.isFinite(item?.distanceMeters))
      .map((item) => [Number(item.destinationIndex), item]));

    const routes = found.flatMap((item, index) => {
      const route = routeByDestination.get(index);
      if (!route) return [];
      const durationSeconds = Number.parseFloat(String(route.duration || "0").replace("s", ""));
      return [{
        key: item.key,
        placeId: String(item.place.id),
        name: String(item.place.displayName?.text || item.query),
        address: String(item.place.formattedAddress || ""),
        latitude: Number(item.place.location.latitude),
        longitude: Number(item.place.location.longitude),
        distanceKm: Math.round((Number(route.distanceMeters) / 1000) * 10) / 10,
        etaMinutes: Number.isFinite(durationSeconds) ? Math.max(1, Math.ceil(durationSeconds / 60)) : null,
        googleMapsUri: String(item.place.googleMapsUri || ""),
      }];
    }).sort((a, b) => a.distanceKm - b.distanceKm);
    return res.json({ routes, source: "Google Places API (New) + Google Routes API", fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[Resolve Place Routes]", error instanceof Error ? error.message : error);
    return res.status(502).json({ error: "เชื่อมต่อข้อมูลสถานที่และเส้นทางจริงไม่ได้", routes: [] });
  }
});

app.get("/api/shop/directory", rateLimit(RATE_LIMITS["/api/shop/directory"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const snapshot = await ordersDb.collection("users").limit(300).get();
    const eligible = snapshot.docs
      .map((doc) => ({ uid: doc.id, ...doc.data() } as any))
      .filter((entry) => entry.status === "active" && (entry.role === "merchant" || entry.role === "partner"));
    const profiles = await Promise.all(eligible.map(async (entry) => {
      const roleCollection = entry.role === "merchant" ? "merchants" : "partners";
      const roleData = (await ordersDb.collection(roleCollection).doc(entry.uid).get()).data() || {};
      const custom = roleData.profileCustomization || entry.profileCustomization || {};
      const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, 30) : [];
      const recordArray = (value: unknown) => Array.isArray(value)
        ? value.filter((item) => item && typeof item === "object").slice(0, 50)
        : [];
      return {
        id: entry.uid,
        role: entry.role,
        name: String(custom.displayName || roleData.shopName || roleData.orgName || entry.displayName || "").trim(),
        description: String(custom.bioStatus || roleData.description || "").trim(),
        avatarUrl: String(custom.avatarUrl || entry.avatarUrl || ""),
        avatarEmoji: String(custom.avatarEmoji || entry.avatarEmoji || (entry.role === "merchant" ? "🏪" : "🏢")),
        address: String(roleData.address || [entry.district, entry.province].filter(Boolean).join(" ") || "").trim(),
        phone: String(entry.phone || roleData.phone || ""),
        category: String(roleData.shopType || roleData.orgType || roleData.category || ""),
        products: recordArray(roleData.products),
        services: recordArray(roleData.services),
        promotions: recordArray(roleData.promotions),
        openHours: String(roleData.openHours || ""),
        highlights: stringArray(roleData.highlights || roleData.amenities),
        updatedAt: roleData.updatedAt || entry.updatedAt || null,
      };
    }));
    return res.json({ profiles: profiles.filter((profile) => profile.name), source: "Firestore verified registrations" });
  } catch (error) {
    console.error("[Shop Directory]", error instanceof Error ? error.message : error);
    return res.status(503).json({ error: "โหลดรายชื่อร้านค้าและพาร์ทเนอร์จริงไม่ได้", profiles: [] });
  }
});

app.get("/api/shop/profile-content", rateLimit(RATE_LIMITS["/api/shop/directory"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const userData = (await ordersDb.collection("users").doc(user.uid).get()).data() || {};
    const role = userData.role === "partner" ? "partner" : userData.role === "merchant" ? "merchant" : null;
    if (!role) return res.status(403).json({ error: "บัญชีนี้ไม่มีสิทธิ์จัดการโปรไฟล์ร้านค้า/พาร์ทเนอร์" });
    const collectionName = role === "merchant" ? "merchants" : "partners";
    const roleSnapshot = await ordersDb.collection(collectionName).doc(user.uid).get();
    const roleData = roleSnapshot.data() || {};
    return res.json({
      role,
      products: Array.isArray(roleData.products) ? roleData.products.slice(0, 100) : [],
      services: Array.isArray(roleData.services) ? roleData.services.slice(0, 100) : [],
      promotions: Array.isArray(roleData.promotions) ? roleData.promotions.slice(0, 100) : [],
      highlights: Array.isArray(roleData.highlights) ? roleData.highlights.slice(0, 30) : [],
    });
  } catch (error) {
    console.error("[Shop Profile Content GET]", error instanceof Error ? error.message : error);
    return res.status(503).json({ error: "โหลดข้อมูลหน้าร้านไม่สำเร็จ" });
  }
});

app.put("/api/shop/profile-content", rateLimit(RATE_LIMITS["/api/shop/directory"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const userData = (await ordersDb.collection("users").doc(user.uid).get()).data() || {};
    const role = userData.role === "partner" ? "partner" : userData.role === "merchant" ? "merchant" : null;
    if (!role) return res.status(403).json({ error: "บัญชีนี้ไม่มีสิทธิ์จัดการโปรไฟล์ร้านค้า/พาร์ทเนอร์" });
    const collectionName = role === "merchant" ? "merchants" : "partners";
    const cleanArray = (value: unknown, max: number) => Array.isArray(value) ? value.filter((item) => item && typeof item === "object").slice(0, max) : [];
    const cleanStrings = (value: unknown, max: number) => Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, max) : [];
    const products = cleanArray(req.body?.products, 100);
    const services = cleanArray(req.body?.services, 100);
    const promotions = cleanArray(req.body?.promotions, 100);
    const highlights = cleanStrings(req.body?.highlights, 30);
    await ordersDb.collection(collectionName).doc(user.uid).set({
      products, services, promotions, highlights, updatedAt: new Date().toISOString(),
    }, { merge: true });
    return res.json({ ok: true, role, products, services, promotions, highlights });
  } catch (error) {
    console.error("[Shop Profile Content PUT]", error instanceof Error ? error.message : error);
    return res.status(503).json({ error: "บันทึกข้อมูลหน้าร้านไม่สำเร็จ" });
  }
});

app.get("/api/shop/listings", rateLimit(RATE_LIMITS["/api/shop/listings"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const snapshot = await ordersDb.collection("marketListings").orderBy("createdAt", "desc").limit(100).get();
    const listings = snapshot.docs.map((doc) => doc.data()).filter((item: any) => item.status === "active");
    return res.json({ listings });
  } catch (error) {
    console.error("[Shop Listings GET]", error instanceof Error ? error.message : error);
    return res.status(503).json({ error: "โหลดสินค้าจากผู้ขายจริงไม่ได้", listings: [] });
  }
});

app.post("/api/shop/listings", rateLimit(RATE_LIMITS["/api/shop/listings"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const input = req.body || {};
  const title = String(input.title || "").trim();
  const price = Number(input.price);
  const stock = Number(input.stock ?? 1);
  if (title.length < 3 || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 1) {
    return res.status(400).json({ error: "ข้อมูลสินค้าไม่ถูกต้อง" });
  }
  try {
    const userData = (await ordersDb.collection("users").doc(user.uid).get()).data() || {};
    const id = `listing-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const listing = {
      id,
      sellerUserId: user.uid,
      sellerType: userData.role === "merchant" ? "merchant" : "citizen",
      sellerName: String(userData.displayName || user.name || "ผู้ขาย WIN"),
      sellerAvatar: String(userData.avatarEmoji || "👤"),
      title,
      price,
      originalPrice: Number.isFinite(Number(input.originalPrice)) ? Number(input.originalPrice) : null,
      category: String(input.category || "second_hand"),
      categoryLabel: String(input.categoryLabel || "สินค้าทั่วไป"),
      condition: String(input.condition || "used"),
      conditionLabel: String(input.conditionLabel || "สภาพดี"),
      description: String(input.description || "").trim(),
      imageIcon: String(input.imageIcon || "📦"),
      imageUrl: String(input.imageUrl || ""),
      isAiVerified: input.isAiVerified === true,
      aiCertificateId: input.isAiVerified === true ? String(input.aiCertificateId || "") : "",
      aiQualityScore: input.isAiVerified === true && Number.isFinite(Number(input.aiQualityScore)) ? Number(input.aiQualityScore) : null,
      location: String(input.location || "").trim(),
      stock,
      tags: Array.isArray(input.tags) ? input.tags.filter((tag: unknown) => typeof tag === "string").slice(0, 10) : [],
      status: "active",
      salesCount: 0,
      createdAt: now,
      updatedAt: now,
      serverCreatedAt: FieldValue.serverTimestamp(),
    };
    await ordersDb.collection("marketListings").doc(id).create(listing);
    return res.status(201).json({ listing });
  } catch (error) {
    console.error("[Shop Listings POST]", error instanceof Error ? error.message : error);
    return res.status(503).json({ error: "บันทึกสินค้าไม่สำเร็จ" });
  }
});

// Real-world event discovery. PredictHQ remains the source of truth; this route
// intentionally returns an empty/error state instead of substituting mock events.
type EventCategory = "sale" | "market" | "concert" | "sports" | "festival" | "community" | "other";

interface NearbyEventResult {
  id: string;
  title: string;
  category: EventCategory;
  venueName: string;
  venueArea: string;
  latitude: number;
  longitude: number;
  startAt: string;
  endAt?: string;
  description?: string;
  sourceName: string;
  providerEventId: string;
  attendance?: number;
  rank?: number;
}

const dailyEventsCache = new Map<string, { expiresAt: number; value: NearbyEventResult[] }>();
const EVENT_CACHE_MS = 5 * 60 * 1000;

function classifyRealEvent(category: string, title: string, labels: string[] = []): EventCategory {
  const searchable = `${category} ${title} ${labels.join(" ")}`.toLowerCase();
  if (/sale|discount|ลดราคา|clearance|shopping/.test(searchable)) return "sale";
  if (/market|bazaar|popup|pop-up|ตลาด|fair|expo/.test(searchable)) return "market";
  if (/concert|music|performing-arts|ดนตรี|คอนเสิร์ต/.test(searchable)) return "concert";
  if (/sport|football|soccer|basketball|กีฬา|แข่งขัน/.test(searchable)) return "sports";
  if (/festival|เทศกาล/.test(searchable)) return "festival";
  if (/community|academic|school|public-holiday|daylight-savings|observance/.test(searchable)) return "community";
  return "other";
}

app.get("/api/events/daily", rateLimit(RATE_LIMITS["/api/events/daily"]), async (req, res) => {
  const eventDate = String(req.query.date || "");
  const country = "TH";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return res.status(400).json({ message: "วันที่กิจกรรมไม่ถูกต้อง" });
  }

  const dayStart = new Date(`${eventDate}T00:00:00+07:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  if (Number.isNaN(dayStart.getTime())) {
    return res.status(400).json({ message: "วันที่กิจกรรมไม่ถูกต้อง" });
  }

  const accessToken = process.env.PREDICTHQ_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return res.status(503).json({
      message: "ยังไม่ได้เชื่อม PREDICTHQ_ACCESS_TOKEN สำหรับข้อมูลอีเวนต์จริง",
      events: [],
    });
  }

  const cacheKey = `${country}:${eventDate}`;
  const cached = dailyEventsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ events: cached.value, source: "PredictHQ Events API", fetchedAt: new Date().toISOString(), eventDate, country, cached: true });
  }

  const params = new URLSearchParams({
    country,
    "active.gte": dayStart.toISOString(),
    "active.lte": dayEnd.toISOString(),
    "active.tz": "Asia/Bangkok",
    category: "concerts,sports,festivals,community,expos,performing-arts",
    sort: "start",
    limit: "100",
  });

  try {
    const providerResponse = await fetch(`https://api.predicthq.com/v1/events/?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!providerResponse.ok) {
      const providerStatus = providerResponse.status;
      console.error(`[Events API] PredictHQ returned ${providerStatus}`);
      return res.status(502).json({ message: "ผู้ให้บริการข้อมูลอีเวนต์จริงไม่พร้อมใช้งาน", events: [] });
    }

    const payload = await providerResponse.json() as { results?: any[] };
    const events = (Array.isArray(payload.results) ? payload.results : []).flatMap((item): NearbyEventResult[] => {
      const coordinates = Array.isArray(item.location) ? item.location : [];
      const eventLongitude = Number(coordinates[0]);
      const eventLatitude = Number(coordinates[1]);
      if (!item.id || !item.title || !item.start || !Number.isFinite(eventLatitude) || !Number.isFinite(eventLongitude)) return [];

      const venueEntity = Array.isArray(item.entities)
        ? item.entities.find((entity: any) => entity?.type === "venue")
        : undefined;
      const venueName = String(venueEntity?.name || item.geo?.address?.formatted_address || "สถานที่ตามพิกัดผู้จัดงาน");
      const venueArea = String(item.geo?.address?.locality || item.geo?.address?.region || item.country || "");
      const attendance = Number(item.phq_attendance);
      const rank = Number(item.rank);

      return [{
        id: `predicthq-${item.id}`,
        title: String(item.title),
        category: classifyRealEvent(String(item.category || ""), String(item.title), Array.isArray(item.labels) ? item.labels : []),
        venueName,
        venueArea,
        latitude: eventLatitude,
        longitude: eventLongitude,
        startAt: String(item.start),
        endAt: item.end ? String(item.end) : undefined,
        description: typeof item.description === "string" ? item.description : undefined,
        sourceName: "PredictHQ Events API",
        providerEventId: String(item.id),
        attendance: Number.isFinite(attendance) && attendance > 0 ? attendance : undefined,
        rank: Number.isFinite(rank) ? rank : undefined,
      }];
    }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || (b.rank || 0) - (a.rank || 0));

    dailyEventsCache.set(cacheKey, { value: events, expiresAt: Date.now() + EVENT_CACHE_MS });
    return res.json({ events, source: "PredictHQ Events API", fetchedAt: new Date().toISOString(), eventDate, country, cached: false });
  } catch (error) {
    console.error("[Events API] Fetch failed:", error instanceof Error ? error.message : error);
    return res.status(502).json({ message: "เชื่อมต่อผู้ให้บริการข้อมูลอีเวนต์จริงไม่ได้", events: [] });
  }
});

// Persistent order store: Firestore is the source of truth across instances/restarts.
interface ServerOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceIconEmoji: string;
  passengerUserId?: string;
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fare: number;
  welfareFund2Baht: number;
  netFare: number;
  estMinutes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  driverUserId?: string;
  driverName?: string;
  driverLevel?: number;
  driverPhone?: string;
  driverPlate?: string;
  driverAvatarEmoji?: string;
  driverVehicle?: string;
  tipAmount?: number;
  ratingGiven?: number;
  reviewComment?: string;
  pickupCoord?: { lat: number; lng: number };
  dropoffCoord?: { lat: number; lng: number };
  customerGender?: "female" | "male";
  preferredDriverId?: string;
  offeredDriverId?: string;
  offerExpiresAt?: string;
  dispatchCandidateIds?: string[];
  dispatchCandidateIndex?: number;
  dispatchAttempt?: number;
  dispatchMode?: "preferred" | "automatic";
}

function getAdminDb() {
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "ai-studio-winriderai-96f1b3b6-26ee-4fca-ba51-662b278eea8d";
  if (getApps().length) {
    return getFirestore(getApps()[0], databaseId);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  let defaultStorageBucket = "decoded-robot-6lkcn.firebasestorage.app";
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (cfg.storageBucket) defaultStorageBucket = cfg.storageBucket;
    }
  } catch (e) {}
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || defaultStorageBucket;

  if (projectId && clientEmail && privateKey) {
    const adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
        ...(storageBucket ? { storageBucket } : {}),
      });
    return getFirestore(adminApp, databaseId);
  }

  // Cloud Run / Firebase environments can use Application Default Credentials.
  return getFirestore(initializeApp(storageBucket ? { storageBucket } : undefined), databaseId);
}

const ordersDb = getAdminDb();
const adminAuth = getAuth();

function isSuperAdminToken(user: any) {
  const ownerEmail = String(process.env.ADMIN_OWNER_EMAIL || "").trim().toLowerCase();
  const email = String(user?.email || "").trim().toLowerCase();
  return user?.admin === true || user?.adminLevel === "super" || user?.role === "admin"
    || email === "kittiinthasoi@gmail.com"
    || (ownerEmail && email === ownerEmail);
}

function decodeImageDataUrl(value: unknown) {
  const match = String(value || "").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length < 100 || buffer.length > 4 * 1024 * 1024) return null;
  return { mimeType, buffer };
}

// โมเดลกลุ่ม Free Tier ของ Google AI Studio (ลำดับ fallback อัตโนมัติ)
const aiModels = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

function classifyGeminiError(error: any): { errorCode: string; message: string } {
  if (!process.env.GEMINI_API_KEY) {
    return {
      errorCode: "MISSING_API_KEY",
      message: "ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ (คีย์ไม่ครบ)"
    };
  }
  const str = String(error?.message || error?.statusText || error || "").toLowerCase();
  const status = Number(error?.status || error?.statusCode || 0);

  if (status === 400 || str.includes("api_key_invalid") || str.includes("api key not valid") || str.includes("invalid api key") || str.includes("permission_denied")) {
    return {
      errorCode: "INVALID_API_KEY",
      message: "API Key ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง (คีย์ผิด)"
    };
  }

  if (status === 429 || str.includes("resource_exhausted") || str.includes("quota") || str.includes("rate limit")) {
    return {
      errorCode: "QUOTA_EXCEEDED",
      message: "โควต้าการใช้งาน Gemini API เต็มแล้ว (Quota Exceeded / 429)"
    };
  }

  if (status === 503 || status === 500 || str.includes("unavailable") || str.includes("overloaded") || str.includes("not found")) {
    return {
      errorCode: "MODEL_UNAVAILABLE",
      message: "โมเดล AI ขัดข้องชั่วคราวหรือไม่พร้อมให้บริการ (Model Unavailable)"
    };
  }

  if (str.includes("timeout") || str.includes("deadline") || str.includes("timed out") || str.includes("etimedout")) {
    return {
      errorCode: "TIMEOUT",
      message: "การตอบกลับจาก AI หมดเวลาเกิน 30 วินาที"
    };
  }

  return {
    errorCode: "MODEL_UNAVAILABLE",
    message: "WIN-AI ยังไม่พร้อมใช้งานในขณะนี้ กรุณาลองใหม่อีกครั้ง"
  };
}

function generateLocalTacticalFallback(mode: string, message: string, _imageProvided: boolean): string {
  if (mode === 'motorcycle_mechanic') {
    const lower = message.toLowerCase();
    let urgency = "🟡 ปานกลาง (ควรนำรถเข้าตรวจเช็กภายใน 1-3 วัน ไม่ควรใช้เดินทางไกล)";
    let causes = "1. ระบบไฟ/แบตเตอรี่เสื่อมหรือขั้วหลวม\n2. ระบบส่งกำลัง/โซ่-สายพานหย่อนหรือสึกหรอตามระยะ\n3. ระบบจุดระเบิด (หัวเทียน) หรือกรองอากาศอุดตัน";
    let check = "• ตรวจดูระดับน้ำมันเครื่องผ่านตาแมวหรือก้านวัด (ขณะดับเครื่องบนขาตั้งคู่)\n• บิดกุญแจ ON แล้วกดแตร/เปิดไฟเลี้ยวเพื่อเช็กกำลังไฟแบตเตอรี่\n• สังเกตรอยหยดของเหลวใต้ท้องรถ";
    let forbidden = "• ห้ามกดสตาร์ตแช่ยาวเกิน 5 วินาที\n• ห้ามฝืนขี่ต่อหากมีกลิ่นไหม้หรือมีไฟเตือนเครื่องยนต์ติดค้าง\n• ห้ามใช้น้ำราดชิ้นส่วนเครื่องยนต์หรือจานเบรกขณะร้อนจัด";
    let cost = "• ค่าตรวจเช็ก/ค่าแรงเบื้องต้น: 50 - 150 บาท\n• ค่าอะไหล่สิ้นเปลืองทั่วไป: 120 - 450 บาท (ขึ้นอยู่กับรุ่นและยี่ห้อ)";

    if (lower.includes("เบรก") || lower.includes("เบรค")) {
      urgency = "🔴 สูงมาก (ห้ามขับขี่เด็ดขาด เสี่ยงเกิดอุบัติเหตุร้ายแรง)";
      causes = "1. ผ้าเบรกหมดหรือสึกหรอจนถึงเนื้อเหล็กจานเบรก\n2. น้ำมันเบรกรั่วซึมหรือมีฟองอากาศในสายน้ำมัน\n3. จานเบรกคด สึกเป็นร่อง หรือมีคราบน้ำมันเกาะ";
      check = "• ก้มดูความหนาของผ้าเบรก (ไม่ควรบางกว่า 2 มม.)\n• เช็กระดับน้ำมันเบรกในกระปุกปั๊มบน/ล่าง\n• บีบก้านเบรกดูว่ามีอาการจมลึกหรือวูบหรือไม่";
      forbidden = "• ห้ามฝืนขับขี่บนท้องถนนโดยเด็ดขาด\n• ห้ามฉีดสเปรย์หล่อลื่นหรือน้ำมันลงบนจานเบรกหรือผ้าเบรกเด็ดขาด";
      cost = "• ผ้าเบรกแท้/เทียบ: 120 - 350 บาท\n• ค่าแรงเปลี่ยนและไล่น้ำมันเบรก: 80 - 150 บาท";
    } else if (lower.includes("สตาร์ต") || lower.includes("สตาร์ท") || lower.includes("แชะ") || lower.includes("แบต")) {
      urgency = "🟡 ปานกลาง (รถสตาร์ตไม่ติด แต่ปลอดภัยหากจอดในที่ปลอดภัย)";
      causes = "1. แบตเตอรี่เสื่อมสภาพหรือไฟหมด (อายุเกิน 1.5 - 2 ปี)\n2. สวิตช์ขาตั้งข้างสกปรก หรือเซนเซอร์ตัดสตาร์ตทำงานค้าง\n3. ไดสตาร์ทหรือรีเลย์สตาร์ทขัดข้อง / หัวเทียนบอด";
      check = "• บิดกุญแจ ON แล้วกดแตร หากเสียงแตรเบามากหรือเงียบ แสดงว่าแบตหมด\n• เตะขาตั้งข้างขึ้นลง 2-3 ครั้ง และกำเบรกให้แน่นขณะกดปุ่มสตาร์ต";
      forbidden = "• ห้ามกดปุ่มสตาร์ตแช่ยาวเกิน 5 วินาทีติดต่อกัน (อาจทำให้ไดสตาร์ตไหม้)\n• ห้ามเข็นกระตุกแรงๆ ในรถเกียร์ออโตเมติก (CVT)";
      cost = "• ชาร์จแบตเตอรี่: 30 - 50 บาท\n• เปลี่ยนแบตเตอรี่ใหม่: 450 - 750 บาท\n• เปลี่ยนหัวเทียน: 90 - 180 บาท";
    } else if (lower.includes("ควัน") || lower.includes("น้ำมันเครื่อง") || lower.includes("ร้อน")) {
      urgency = "🔴 สูงมาก (เสี่ยงลูกสูบติด แหวนหัก หรือเครื่องยนต์น็อก)";
      causes = "1. น้ำมันเครื่องแห้งหรือต่ำกว่าเกณฑ์ขั้นต่ำมาก\n2. ซีลยางตีนวาล์วหรือแหวนลูกสูบสึกหรอ ทำให้น้ำมันเครื่องเล็ดลอดเข้าห้องเผาไหม้\n3. ระบบระบายความร้อนบกพร่อง (พัดลมไม่หมุน หรือน้ำยาหล่อเย็นแห้ง)";
      check = "• ดึงก้านวัดน้ำมันเครื่องออกมาเช็กระดับทันที (ขณะดับเครื่อง)\n• เช็กใต้ท้องรถว่ามีคราบน้ำมันเครื่องหยดนองหรือไม่";
      forbidden = "• ห้ามฝืนสตาร์ตหรือเร่งเครื่องยนต์เด็ดขาด\n• ห้ามเปิดฝาหม้อน้ำขณะเครื่องยนต์ยังร้อนอยู่เด็ดขาด";
      cost = "• เติม/เปลี่ยนถ่ายน้ำมันเครื่อง: 120 - 250 บาท\n• ซ่อมชุดแหวนลูกสูบ/วาล์ว: 1,200 - 2,800 บาท";
    }

    return `1. 🚨 ระดับความเร่งด่วน:
${urgency}

2. 🔍 สาเหตุที่เป็นไปได้:
${causes}

3. 🛠️ วิธีตรวจสอบเบื้องต้นอย่างปลอดภัย:
${check}

4. ⚠️ สิ่งที่ห้ามทำเด็ดขาด:
${forbidden}

5. 💵 ประมาณการค่าใช้จ่ายและค่าอะไหล่:
${cost}

*(หมายเหตุ: ตอบโดยระบบฐานข้อมูลช่างเบื้องต้นของ WINRIDER ออฟไลน์)*`;
  } else {
    return `1. 💰 การคำนวณต้นทุนและตั้งราคา (Pricing & Margin):
• ต้นทุนวัตถุดิบหลัก (COGS): แนะนำให้อยู่ที่ประมาณ 35% - 45% ของราคาขาย
• ค่าบรรจุภัณฑ์และขนส่ง: ประมาณ 10% - 15%
• เป้าหมายกำไรสุทธิ: ควรอยู่ที่ 35% - 50%
• สูตรคิดราคาขายแนะนำ = ต้นทุนรวม ÷ (1 - %กำไรที่ต้องการ) เช่น ต้นทุน 35 บาท ต้องการกำไร 40% ควรตั้งขายที่ 58 - 60 บาท

2. 📢 แนวทางการเขียนประกาศและแคปชั่น (Copywriting):
• Hook ดึงดูด: ชี้จุดเด่นชัดเจน เช่น สดใหม่ กรอบนาน หรือสภาพ 95% พร้อมส่ง
• รายละเอียดสินค้า: ระบุขนาด ปริมาณ สภาพ หรือวันผลิต
• Call to Action: กระตุ้นการตัดสินใจ พร้อมข้อมูลจัดส่งด่วนผ่าน WINRIDER

3. 🍳 สูตรอาหารและเทคนิคการผลิต (กรณีอาหาร):
• ชั่งตวงวัตถุดิบเป็นกรัมเพื่อคุมต้นทุนต่อจานให้แม่นยำ
• เตรียมวัตถุดิบล่วงหน้าแบบ Portion เพื่อส่งได้ไวและไม่สูญเสียวัตถุดิบ

4. 💡 คำแนะนำการตลาด:
• ตรวจสอบราคาเฉลี่ยของร้านในพื้นที่รัศมี 3 กิโลเมตร
• รูปภาพสินค้าควรชัดเจน ใช้แสงธรรมชาติเพื่อเพิ่มความน่าสนใจ`;
  }
}

async function generateWithGemini(contents: any, config: any) {
  const ai = getAiClient();
  if (!ai) {
    const err: any = new Error("MISSING_API_KEY");
    err.code = "MISSING_API_KEY";
    throw err;
  }
  let lastError: any;
  for (const model of aiModels) {
    try {
      const response = await ai.models.generateContent({ model, contents, config });
      if (response && response.text) return { text: response.text, model };
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini model ${model} unavailable, trying next fallback...`, error?.message || error);
    }
  }
  throw lastError || new Error("ALL_MODELS_FAILED");
}

app.post("/api/ai/personal-assistant", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const mode = String(req.body?.mode || "");
  if (!['motorcycle_mechanic', 'personal_commerce'].includes(mode)) {
    return res.status(400).json({ error: "โหมด WIN-AI ไม่ถูกต้อง", errorCode: "INVALID_MODE" });
  }

  const message = String(req.body?.message || "").trim().slice(0, 4000);
  const image = req.body?.imageDataUrl ? decodeImageDataUrl(req.body.imageDataUrl) : null;
  if (!message && !image) {
    return res.status(400).json({ error: "กรุณาส่งคำถามหรือรูปภาพ", errorCode: "EMPTY_REQUEST" });
  }
  if (req.body?.imageDataUrl && !image) {
    return res.status(400).json({
      error: "รูปภาพต้องเป็นไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 4 MB",
      errorCode: "INVALID_IMAGE"
    });
  }

  const systemInstruction = mode === 'motorcycle_mechanic'
    ? `คุณคือ "WIN-AI ช่างส่วนตัว" ผู้เชี่ยวชาญด้านรถจักรยานยนต์และระบบเครื่องยนต์ 2 ล้อประจำแพลตฟอร์ม WINRIDER
หน้าที่ของคุณคือให้คำแนะนำที่เป็นมืออาชีพ ชัดเจน เข้าใจง่าย และคำนึงถึงความปลอดภัยของผู้ขับขี่เป็นอันดับหนึ่ง

เมื่อผู้ใช้ส่งอาการ ปัญหา หรือรูปภาพชิ้นส่วนรถ ให้ตอบกลับโดยจัดโครงสร้างเนื้อหาตาม 5 หัวข้อนี้อย่างเคร่งครัด:

1. 🚨 ระดับความเร่งด่วน:
(ระบุให้ชัดเจนด้วยอิโมจิ เช่น 🟢 ต่ำ / 🟡 ปานกลาง / 🔴 สูงมาก พร้อมคำอธิบายสั้นๆ ว่าขับต่อได้หรือไม่)

2. 🔍 สาเหตุที่เป็นไปได้:
(แจกแจง 2-4 สาเหตุหลักที่พบบ่อย เรียงจากโอกาสเกิดมากที่สุดไปน้อย)

3. 🛠️ วิธีตรวจสอบเบื้องต้นอย่างปลอดภัย:
(ระบุขั้นตอนที่ผู้ขับขี่ตรวจสอบได้เองด้วยตาเปล่าอย่างปลอดภัย เช่น การตรวจระดับน้ำมันเครื่อง, เช็กระยะฟรีเบรก, ตรวจดูรอยหยดใต้ท้องรถ)

4. ⚠️ สิ่งที่ห้ามทำเด็ดขาด:
(เตือนข้อห้ามเพื่อความปลอดภัย เช่น ห้ามสตาร์ตแช่เกิน 5 วินาที, ห้ามใช้น้ำราดจานเบรกร้อน, ห้ามฝืนขี่ต่อ)

5. 💵 ประมาณการค่าใช้จ่ายและค่าอะไหล่:
(ประเมินช่วงราคาค่าอะไหล่แท้/เทียบ และค่าแรงช่างในไทย พร้อมระบุว่าเป็นราคาประมาณการ)

ข้อปฏิบัติความปลอดภัยขั้นวิกฤต:
- หากพบอาการเกี่ยวกับระบบเบรก, ยางบวมหรือปริแตก, น้ำมันเชื้อเพลิงรั่ว, ระบบไฟลัดวงจร, มีกลิ่นไหม้ หรือเครื่องร้อนจัด ให้แจ้งเตือนตัวหนาว่า "อันตรายระดับสูง: ให้หยุดใช้รถทันทีและติดต่อช่าง"
- ห้ามฟันธง 100% จากรูปถ่ายอย่างเดียว ต้องแนะนำให้นำรถเข้าตรวจเช็กกับช่างผู้ชำนาญ
- หากข้อมูลไม่พอ ให้ถามยี่ห้อ รุ่น และปีรถเพิ่มเติมอย่างสุภาพ`
    : `คุณคือ "WIN-AI ผู้ช่วยส่วนตัว" ที่ปรึกษาการค้าขาย การตั้งราคา คำนวณต้นทุน/กำไร การเขียนประกาศ และสูตรอาหารสำหรับพ่อค้าแม่ค้าและผู้ใช้ WINRIDER

จัดโครงสร้างคำตอบให้กระชับ ชัดเจน และนำไปใช้ได้ทันที ครอบคลุม:

1. 💰 การคำนวณต้นทุนและตั้งราคา (Pricing & Margin):
- จำแนกต้นทุนวัตถุดิบ (COGS), ค่าบรรจุภัณฑ์/กล่อง, ค่าขนส่งหรือ GP (ถ้ามี)
- แสดงสูตรคำนวณ: กำไรสุทธิ = ราคาขาย - ต้นทุนรวม และคิดเป็น % Margin
- แนะนำช่วงราคาขายที่เหมาะสม (คุ้มทุน, แนะนำ, พรีเมียม)

2. 📢 การเขียนประกาศและแคปชั่นขาย (Copywriting):
- พาดหัวดึงดูดสายตา (Hook)
- ชี้จุดเด่น ประโยชน์ และความคุ้มค่า
- Call to Action พร้อมแฮชแท็กที่ตรงกลุ่มเป้าหมาย

3. 🍳 สูตรอาหารและเทคนิคการทำ (Recipes & Cooking):
- รายการวัตถุดิบพร้อมสัดส่วนที่ชัดเจน และระบุจำนวนเสิร์ฟ
- ขั้นตอนการทำอย่างละเอียดพร้อมเคล็ดลับ (Pro-tips)
- ประมาณการต้นทุนวัตถุดิบต่อจาน/กล่อง

4. 💡 คำแนะนำการตลาดและข้อควรระวัง:
- ระบุเสมอว่าราคาและตัวเลขเป็นค่าประมาณการจากเกณฑ์ทั่วไป แนะนำให้คิดต้นทุนจริงจากแหล่งซื้อประจำ
- ถามรายละเอียดเพิ่มเติมอย่างสุภาพเมื่อข้อมูลไม่พอ`;

  // Build context history (up to last 8 messages)
  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  const last8 = rawHistory.slice(-8);
  const contents: Array<{ role: string; parts: any[] }> = [];

  for (const item of last8) {
    const role = (item.role === 'assistant' || item.role === 'model') ? 'model' : 'user';
    const text = String(item.text || item.content || '').trim();
    if (!text) continue;

    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n${text}`;
    } else {
      if (contents.length === 0 && role === 'model') continue;
      contents.push({ role, parts: [{ text }] });
    }
  }

  const currentParts: any[] = [{ text: message || "โปรดวิเคราะห์รูปนี้ตามบทบาทของคุณ" }];
  if (image) {
    currentParts.push({ inlineData: { mimeType: image.mimeType, data: image.buffer.toString("base64") } });
  }

  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.push({ role: 'model', parts: [{ text: 'รับทราบข้อมูล' }] });
  }
  contents.push({ role: 'user', parts: currentParts });

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("REQUEST_TIMEOUT_30S")), 30000);
    });

    const result = await Promise.race([
      generateWithGemini(contents, { systemInstruction, temperature: 0.3 }),
      timeoutPromise
    ]) as { text: string; model: string };

    return res.json({
      reply: result.text,
      source: result.model,
      mode,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("WIN-AI generation error:", error?.message || error);
    const classified = classifyGeminiError(error);
    const fallbackText = generateLocalTacticalFallback(mode, message, Boolean(image));

    return res.status(classified.errorCode === "TIMEOUT" ? 504 : 503).json({
      error: classified.message,
      errorCode: classified.errorCode,
      detail: String(error?.message || error),
      modelsAttempted: aiModels,
      fallbackReply: fallbackText,
      canRetry: true
    });
  }
});

app.get("/api/ai/status", async (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const key = process.env.GEMINI_API_KEY || "";
  const maskedKey = hasKey
    ? `${key.slice(0, 6)}...${key.slice(-4)}`
    : "ยังไม่ได้ตั้งค่า";

  return res.json({
    status: hasKey ? "ok" : "warning",
    geminiConfigured: hasKey,
    apiKeyStatus: hasKey ? "configured" : "missing",
    keyMasked: maskedKey,
    activeModels: aiModels,
    currentPrimaryModel: aiModels[0],
    supportedModes: [
      {
        id: "motorcycle_mechanic",
        name: "WIN-AI ช่างส่วนตัว",
        description: "วินิจฉัยอาการรถ 5 หัวข้อ (ระดับความเร่งด่วน, สาเหตุ, วิธีตรวจ, สิ่งที่ห้ามทำ, ค่าใช้จ่าย)",
        urgencyLevels: ["🟢 ต่ำ", "🟡 ปานกลาง", "🔴 สูงมาก"]
      },
      {
        id: "personal_commerce",
        name: "WIN-AI ผู้ช่วยส่วนตัว",
        description: "ช่วยตั้งราคา คำนวณต้นทุน/กำไร (Margin), เขียนประกาศแคปชั่น และสูตรอาหาร",
        categories: ["ตั้งราคา & คำนวณกำไร", "เขียนแคปชั่นขาย", "สูตรอาหารคำนวณขนาดเสิร์ฟ"]
      }
    ],
    maxContextTurns: 8,
    timeoutSeconds: 30,
    supportedFormats: ["JPG", "PNG", "WEBP"],
    maxFileSizeMB: 4,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/ai/test-ping", rateLimit(10), async (_req, res) => {
  const startTime = Date.now();
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      success: false,
      errorCode: "MISSING_API_KEY",
      error: "ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ (คีย์ไม่ครบ)",
      latencyMs: Date.now() - startTime
    });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      success: false,
      errorCode: "MISSING_API_KEY",
      error: "ไม่สามารถเริ่มต้นไคลเอนต์ Gemini ได้",
      latencyMs: Date.now() - startTime
    });
  }

  try {
    const testResult = await Promise.race([
      ai.models.generateContent({
        model: aiModels[0],
        contents: [{ role: "user", parts: [{ text: "ตอบคำว่า PONG สั้นๆ เพียงคำเดียว" }] }],
        config: { maxOutputTokens: 10, temperature: 0.1 }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 10000))
    ]) as any;

    const latencyMs = Date.now() - startTime;
    return res.json({
      success: true,
      model: aiModels[0],
      reply: testResult?.text?.trim() || "PONG",
      latencyMs,
      message: `เชื่อมต่อโมเดล ${aiModels[0]} สำเร็จ ความเร็ว ${latencyMs} ms`,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const classified = classifyGeminiError(err);
    return res.status(503).json({
      success: false,
      errorCode: classified.errorCode,
      error: classified.message,
      detail: String(err?.message || err),
      latencyMs
    });
  }
});

app.get("/api/wallet/topup-config", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const promptPayId = String(process.env.ADMIN_PROMPTPAY_ID || "0899999999").trim();
  const accountName = String(process.env.ADMIN_BANK_ACCOUNT_NAME || "WINRIDER.AI SYSTEM WALLET").trim();
  return res.json({ configured: true, promptPayId, accountName });
});

app.get("/api/wallet/me", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const walletSnap = await ordersDb.collection("wallets").doc(user.uid).get();
    const walletData = walletSnap.data() || {};
    const balanceSatang = typeof walletData.balanceSatang === "number" ? walletData.balanceSatang : 0;
    
    let submissions: any[] = [];
    let withdrawals: any[] = [];
    try {
      const [topupSnap, withdrawSnap] = await Promise.all([
        ordersDb.collection("topup_submissions").where("userId", "==", user.uid).limit(10).get(),
        ordersDb.collection("withdrawal_requests").where("userId", "==", user.uid).limit(10).get()
      ]);
      submissions = topupSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      withdrawals = withdrawSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      // index or fetch fallback
    }

    const promptPayId = String(process.env.ADMIN_PROMPTPAY_ID || "0899999999").trim();
    const accountName = String(process.env.ADMIN_BANK_ACCOUNT_NAME || "WINRIDER.AI SYSTEM WALLET").trim();

    return res.json({
      userId: user.uid,
      balanceSatang,
      balance: balanceSatang / 100,
      systemPromptPay: {
        configured: true,
        promptPayId,
        accountName
      },
      submissions,
      withdrawals
    });
  } catch (err: any) {
    console.error("wallet me error:", err);
    return res.json({
      userId: user.uid,
      balanceSatang: 0,
      balance: 0.0,
      systemPromptPay: {
        configured: true,
        promptPayId: String(process.env.ADMIN_PROMPTPAY_ID || "0899999999").trim(),
        accountName: String(process.env.ADMIN_BANK_ACCOUNT_NAME || "WINRIDER.AI SYSTEM WALLET").trim()
      },
      submissions: [],
      withdrawals: []
    });
  }
});

app.post("/api/wallet/withdraw", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const amount = Number(req.body?.amount);
  const amountSatang = Math.round(amount * 100);
  const promptPayOrAccount = String(req.body?.promptPayOrAccount || "").trim();
  const accountName = String(req.body?.accountName || "").trim();
  const bankName = String(req.body?.bankName || "PromptPay").trim();

  if (!Number.isSafeInteger(amountSatang) || amountSatang < 2000) {
    return res.status(400).json({ error: "ยอดถอนขั้นต่ำคือ 20.00 บาท" });
  }
  if (!promptPayOrAccount) {
    return res.status(400).json({ error: "กรุณาระบุหมายเลข PromptPay หรือเลขบัญชีธนาคารปลายทาง" });
  }

  try {
    const walletRef = ordersDb.collection("wallets").doc(user.uid);
    let updatedBalanceSatang = 0;

    await ordersDb.runTransaction(async (tx) => {
      const snap = await tx.get(walletRef);
      const currentSatang = snap.exists ? Number(snap.data()?.balanceSatang || 0) : 0;
      if (currentSatang < amountSatang) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      updatedBalanceSatang = currentSatang - amountSatang;
      tx.set(walletRef, {
        userId: user.uid,
        balanceSatang: updatedBalanceSatang,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      const withdrawRef = ordersDb.collection("withdrawal_requests").doc();
      tx.create(withdrawRef, {
        userId: user.uid,
        userEmail: user.email || null,
        amountSatang,
        amountBaht: amountSatang / 100,
        promptPayOrAccount,
        accountName,
        bankName,
        status: "WAITING_ADMIN",
        createdAt: FieldValue.serverTimestamp()
      });

      const ledgerRef = ordersDb.collection("ledger_entries").doc();
      tx.create(ledgerRef, {
        userId: user.uid,
        amountSatang: -amountSatang,
        type: "WITHDRAWAL_REQUEST",
        promptPayOrAccount,
        accountName,
        createdAt: FieldValue.serverTimestamp()
      });
    });

    return res.json({
      status: "SUCCESS",
      newBalance: updatedBalanceSatang / 100,
      message: `ส่งคำขอถอนเงิน ฿${(amountSatang / 100).toFixed(2)} เรียบร้อยแล้ว ยอดเงินถูกตัดจาก WIN Wallet`
    });
  } catch (err: any) {
    if (err?.message === "INSUFFICIENT_BALANCE") {
      return res.status(400).json({ error: "ยอดเงินคงเหลือใน WIN Wallet ไม่เพียงพอสำหรับยอดที่ต้องการถอน (ยอดเงินปัจจุบันคือ ฿0.00)" });
    }
    console.error("withdrawal error:", err);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการทำรายการถอนเงิน กรุณาลองใหม่อีกครั้ง" });
  }
});

app.post("/api/wallet/topup-proof", rateLimit(5), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const amountSatang = Math.round(Number(req.body?.amount) * 100);
  const image = decodeImageDataUrl(req.body?.imageDataUrl);
  const expectedName = String(process.env.ADMIN_BANK_ACCOUNT_NAME || "").trim();
  if (!expectedName || !process.env.ADMIN_PROMPTPAY_ID) return res.status(503).json({ error: "ผู้ดูแลยังไม่ได้ตั้งค่าบัญชีรับเงิน" });
  if (!Number.isSafeInteger(amountSatang) || amountSatang < 100 || amountSatang > 10_000_000) return res.status(400).json({ error: "ยอดเติมเงินไม่ถูกต้อง" });
  if (!image) return res.status(400).json({ error: "สลิปต้องเป็น JPG, PNG หรือ WEBP ขนาดไม่เกิน 4 MB" });
  try {
    const schema = { type: "OBJECT", properties: {
      amount: { type: "NUMBER" }, reference: { type: "STRING" }, recipientName: { type: "STRING" },
      recipientAccountHint: { type: "STRING" }, transferDateTime: { type: "STRING" }, confidence: { type: "NUMBER" }
    }, required: ["amount", "reference", "recipientName", "confidence"] };
    const result = await generateWithGemini([{ role: "user", parts: [
      { text: "อ่านสลิปโอนเงินนี้ตามข้อมูลที่มองเห็นเท่านั้น ห้ามเดาหรือเติมข้อมูลที่ไม่มี" },
      { inlineData: { mimeType: image.mimeType, data: image.buffer.toString("base64") } }
    ]}], { responseMimeType: "application/json", responseSchema: schema, temperature: 0 });
    const extracted = JSON.parse(result.text);
    const reference = String(extracted.reference || "").replace(/\s/g, "").slice(0, 120);
    const nameOk = String(extracted.recipientName || "").replace(/\s/g, "").includes(expectedName.replace(/\s/g, ""));
    const amountOk = Math.round(Number(extracted.amount) * 100) === amountSatang;
    const confidenceOk = Number(extracted.confidence) >= 0.75;
    if (!reference || !nameOk || !amountOk || !confidenceOk) {
      const reasons = [!amountOk && "ยอดเงินไม่ตรง", !nameOk && "ชื่อผู้รับไม่ตรง", !reference && "ไม่พบเลขอ้างอิง", !confidenceOk && "อ่านสลิปไม่ชัด"].filter(Boolean);
      return res.status(422).json({ status: "REJECTED_AI", error: reasons.join(" • "), extracted });
    }
    const refHash = crypto.createHash("sha256").update(reference).digest("hex");
    const imageHash = crypto.createHash("sha256").update(image.buffer).digest("hex");
    const submissionRef = ordersDb.collection("topup_submissions").doc();
    await ordersDb.runTransaction(async (tx) => {
      const duplicateRef = ordersDb.collection("topup_references").doc(refHash);
      const duplicate = await tx.get(duplicateRef);
      if (duplicate.exists) throw new Error("DUPLICATE_SLIP");
      tx.create(duplicateRef, { submissionId: submissionRef.id, status: "WAITING_ADMIN", createdAt: FieldValue.serverTimestamp() });
      tx.create(submissionRef, { userId: user.uid, userEmail: user.email || null, amountSatang, reference, refHash, imageHash,
        extracted, aiModel: result.model, status: "WAITING_ADMIN", createdAt: FieldValue.serverTimestamp() });
    });
    const ext = image.mimeType.split('/')[1].replace('jpeg', 'jpg');
    const proofStoragePath = `topup-proofs/${user.uid}/${submissionRef.id}.${ext}`;
    try {
      await getStorage().bucket().file(proofStoragePath).save(image.buffer, {
        contentType: image.mimeType,
        resumable: false,
        metadata: { cacheControl: "private, no-store" },
      });
      await submissionRef.update({ proofStoragePath, proofMimeType: image.mimeType });
    } catch (storageError: any) {
      console.error("Top-up proof storage error", storageError?.message);
      await Promise.allSettled([submissionRef.delete(), ordersDb.collection("topup_references").doc(refHash).delete()]);
      return res.status(503).json({ error: "จัดเก็บภาพสลิปแบบส่วนตัวไม่สำเร็จ กรุณาตรวจ FIREBASE_STORAGE_BUCKET แล้วส่งใหม่" });
    }
    return res.status(202).json({ status: "WAITING_ADMIN", submissionId: submissionRef.id, message: "อ่านสลิปผ่านแล้ว กำลังรอ Super Admin ยืนยันยอด" });
  } catch (error: any) {
    if (error?.message === "DUPLICATE_SLIP") return res.status(409).json({ error: "เลขอ้างอิงสลิปนี้ถูกส่งแล้ว" });
    console.error("Top-up proof error", error?.message);
    return res.status(503).json({ error: "ตรวจสลิปไม่สำเร็จ กรุณาลองใหม่" });
  }
});

app.get("/api/admin/topup-submissions", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });
  const snap = await ordersDb.collection("topup_submissions").where("status", "==", "WAITING_ADMIN").limit(50).get();
  return res.json({ submissions: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
});

app.get("/api/admin/topup-proof/:id", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });
  const submissionId = String(req.params.id || "");
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(submissionId)) return res.status(400).json({ error: "Invalid submission" });
  try {
    const snap = await ordersDb.collection("topup_submissions").doc(submissionId).get();
    if (!snap.exists) return res.status(404).json({ error: "ไม่พบรายการสลิป" });
    const data = snap.data() || {};
    const proofStoragePath = String(data.proofStoragePath || "");
    if (!proofStoragePath.startsWith(`topup-proofs/${data.userId}/`)) return res.status(404).json({ error: "รายการเดิมไม่มีภาพสลิปที่จัดเก็บไว้" });
    const [buffer] = await getStorage().bucket().file(proofStoragePath).download();
    res.setHeader("Content-Type", String(data.proofMimeType || "image/jpeg"));
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Content-Disposition", `inline; filename="topup-${submissionId}"`);
    return res.send(buffer);
  } catch (error: any) {
    console.error("Top-up proof read error", error?.message);
    return res.status(503).json({ error: "โหลดภาพสลิปไม่สำเร็จ" });
  }
});

app.get("/api/admin/system-health", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });

  type HealthStatus = "ok" | "warning" | "error";
  const checks: Array<{ id: string; name: string; status: HealthStatus; detail: string }> = [
    { id: "server", name: "Application Server", status: "ok", detail: "API ตอบสนองและยืนยัน Super Admin สำเร็จ" },
    { id: "firebase_auth", name: "Firebase Authentication", status: "ok", detail: "ตรวจสอบ Firebase ID token สำเร็จ" },
  ];
  const add = (id: string, name: string, status: HealthStatus, detail: string) => checks.push({ id, name, status, detail });

  try {
    await ordersDb.collection("users").limit(1).get();
    add("firestore", "Firestore", "ok", `เชื่อมฐานข้อมูล ${process.env.FIRESTORE_DATABASE_ID || "configured database"} สำเร็จ`);
  } catch (error: any) {
    add("firestore", "Firestore", "error", `อ่านฐานข้อมูลไม่ได้: ${String(error?.code || error?.message || "unknown").slice(0, 100)}`);
  }

  try {
    const [metadata] = await getStorage().bucket().getMetadata();
    add("storage", "Firebase Storage", "ok", `เชื่อม bucket ${metadata.name || "สำเร็จ"}`);
  } catch (error: any) {
    add("storage", "Firebase Storage", "error", `ตรวจ bucket ไม่สำเร็จ: ${String(error?.code || error?.message || "unknown").slice(0, 100)}`);
  }

  const googleServer = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  add("google_maps_server", "Google Places & Routes", googleServer ? "ok" : "error", googleServer ? "พบคีย์ฝั่งเซิร์ฟเวอร์ (การเรียกจริงจะตรวจสิทธิ์ API อีกครั้ง)" : "ไม่พบ GOOGLE_MAPS_API_KEY");
  add("google_maps_browser", "Google Maps หน้าเว็บ", process.env.VITE_GOOGLE_MAPS_API_KEY ? "ok" : "warning", process.env.VITE_GOOGLE_MAPS_API_KEY ? "พบคีย์สำหรับ build หน้าเว็บ" : "เซิร์ฟเวอร์ไม่พบ VITE_GOOGLE_MAPS_API_KEY โปรดตรวจ Build Environment");
  add("gemini", "Gemini API", process.env.GEMINI_API_KEY ? "ok" : "warning", process.env.GEMINI_API_KEY ? "พบคีย์ WIN-AI และตรวจสลิป" : "WIN-AI จะไม่ทำงานจนกว่าจะตั้ง GEMINI_API_KEY");
  add("predicthq", "PredictHQ Events", process.env.PREDICTHQ_ACCESS_TOKEN ? "ok" : "warning", process.env.PREDICTHQ_ACCESS_TOKEN ? "พบ access token" : "อีเวนต์จริงยังไม่พร้อม");
  const promptPayReady = Boolean(process.env.ADMIN_PROMPTPAY_ID && process.env.ADMIN_BANK_ACCOUNT_NAME && process.env.ADMIN_OWNER_EMAIL);
  add("promptpay", "PromptPay Admin", promptPayReady ? "ok" : "error", promptPayReady ? "ตั้งค่าผู้รับเงินและเจ้าของระบบครบ" : "ข้อมูล PromptPay/ชื่อบัญชี/อีเมลเจ้าของยังไม่ครบ");

  let onlineKnights = 0;
  let pendingOrders = 0;
  try {
    const [knights, pending] = await Promise.all([
      ordersDb.collection("knights").where("isOnline", "==", true).get(),
      ordersCollection.where("status", "==", "pending").limit(100).get(),
    ]);
    const now = Date.now();
    onlineKnights = knights.docs.filter((doc) => {
      const heartbeat = Date.parse(String(doc.data().dispatchHeartbeatAt || ""));
      return Number.isFinite(heartbeat) && now - heartbeat <= 120_000 && validCoordinates(doc.data().lastDispatchLocation);
    }).length;
    pendingOrders = pending.size;
    add("dispatch", "Dispatch Engine", "ok", `ออนไลน์ด้วย GPS จริง ${onlineKnights} คน • ออเดอร์รอจับคู่ ${pendingOrders} รายการ`);
  } catch (error: any) {
    add("dispatch", "Dispatch Engine", "error", `อ่านสถานะ Dispatch ไม่ได้: ${String(error?.code || error?.message || "unknown").slice(0, 100)}`);
  }

  let recentOrders: any[] = [];
  try {
    const snapshot = await ordersCollection.orderBy("createdAt", "desc").limit(20).get();
    const rank: Record<string, number> = { pending: 0, accepted: 1, heading_pickup: 2, picked_up: 3, in_transit: 4, completed: 5 };
    recentOrders = snapshot.docs.map((doc) => {
      const order = doc.data() as ServerOrder;
      const currentRank = rank[order.status] ?? -1;
      const cancelled = order.status === "cancelled";
      const issues = [
        !order.passengerUserId && "ไม่มีเจ้าของออเดอร์",
        !validCoordinates(order.pickupCoord) && "พิกัดจุดรับไม่ถูกต้อง",
        !validCoordinates(order.dropoffCoord) && "พิกัดปลายทางไม่ถูกต้อง",
        !Number.isFinite(Number(order.fare)) && "ค่าโดยสารไม่ถูกต้อง",
        currentRank >= 1 && !order.driverUserId && "ไม่มีพี่วินหลังรับงาน",
      ].filter(Boolean);
      return {
        id: doc.id, serviceTitle: order.serviceTitle, status: order.status,
        passengerName: order.passengerName, driverName: order.driverName || null,
        createdAt: order.createdAt, updatedAt: order.updatedAt, issues,
        stages: {
          created: true,
          offered: Boolean(order.offeredDriverId || order.driverUserId || currentRank >= 1),
          accepted: currentRank >= 1,
          headingPickup: currentRank >= 2,
          pickedUp: currentRank >= 3,
          inTransit: currentRank >= 4,
          completed: currentRank >= 5,
          cancelled,
        },
      };
    });
  } catch (error: any) {
    add("order_audit", "Order Flow Audit", "error", `อ่านออเดอร์ล่าสุดไม่ได้: ${String(error?.code || error?.message || "unknown").slice(0, 100)}`);
  }
  if (!checks.some((item) => item.id === "order_audit")) {
    const completed = recentOrders.filter((order) => order.status === "completed" && order.issues.length === 0).length;
    add("order_audit", "Order Flow Audit", completed > 0 ? "ok" : "warning", recentOrders.length ? `พบออเดอร์จริง ${recentOrders.length} รายการ • จบครบวงจร ${completed} รายการ` : "ยังไม่มีออเดอร์จริงสำหรับยืนยันครบวงจร");
  }

  const summary = {
    ok: checks.filter((item) => item.status === "ok").length,
    warning: checks.filter((item) => item.status === "warning").length,
    error: checks.filter((item) => item.status === "error").length,
  };
  return res.json({ status: summary.error ? "action_required" : summary.warning ? "degraded" : "operational", summary, checks, dispatch: { onlineKnights, pendingOrders }, recentOrders, checkedAt: new Date().toISOString() });
});

app.post("/api/admin/topup-review", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });
  const submissionId = String(req.body?.submissionId || "");
  const decision = String(req.body?.decision || "");
  if (!submissionId || !["APPROVE", "REJECT"].includes(decision)) return res.status(400).json({ error: "ข้อมูลการอนุมัติไม่ถูกต้อง" });
  await ordersDb.runTransaction(async (tx) => {
    const topupRef = ordersDb.collection("topup_submissions").doc(submissionId);
    const snap = await tx.get(topupRef);
    if (!snap.exists || snap.data()?.status !== "WAITING_ADMIN") throw new Error("ALREADY_REVIEWED");
    const topup: any = snap.data();
    if (decision === "REJECT") {
      tx.update(topupRef, { status: "REJECTED_ADMIN", reviewedBy: user.uid, reviewedAt: FieldValue.serverTimestamp() });
      tx.update(ordersDb.collection("topup_references").doc(topup.refHash), { status: "REJECTED_ADMIN" });
      return;
    }
    const walletRef = ordersDb.collection("wallets").doc(topup.userId);
    const wallet = await tx.get(walletRef);
    const balance = Number(wallet.data()?.balanceSatang || 0);
    tx.set(walletRef, { userId: topup.userId, balanceSatang: balance + topup.amountSatang, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.create(ordersDb.collection("ledger_entries").doc(), { userId: topup.userId, amountSatang: topup.amountSatang, type: "TOP_UP_MANUAL_REVIEW", submissionId, reference: topup.reference, createdAt: FieldValue.serverTimestamp(), createdBy: user.uid });
    tx.update(topupRef, { status: "APPROVED", reviewedBy: user.uid, reviewedAt: FieldValue.serverTimestamp() });
    tx.update(ordersDb.collection("topup_references").doc(topup.refHash), { status: "APPROVED" });
  });
  return res.json({ ok: true, status: decision === "APPROVE" ? "APPROVED" : "REJECTED_ADMIN" });
});

async function requireFirebaseUser(req: express.Request, res: express.Response) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  try {
    return await adminAuth.verifyIdToken(header.slice(7));
  } catch {
    res.status(401).json({ error: "Invalid authentication token" });
    return null;
  }
}

async function requireEligibleDriver(uid: string, token?: any) {
  const [userSnap, knightSnap] = await Promise.all([
    ordersDb.collection("users").doc(uid).get(),
    ordersDb.collection("knights").doc(uid).get(),
  ]);
  const user = userSnap.data() || {};
  const knight = knightSnap.data() || {};
  const kyc = String(knight.kycStatus || "").toLowerCase();

  // The application owner uses one Firebase account for every role. When the
  // owner explicitly opens Knight mode, presence creates this server-owned
  // Knight profile; the primary users/{uid} role remains admin and is not overwritten.
  if (token && isSuperAdminToken(token) && knight.ownerManagedDriver === true) {
    return { user: { ...user, role: "knight", status: "active", displayName: user.displayName || "กิตติ อินทะสร้อย", level: 100 }, knight };
  }

  if (
    user.role !== "knight" ||
    user.status !== "active" ||
    knight.isOnline !== true ||
    !["approved", "verified"].includes(kyc)
  ) {
    return null;
  }
  return { user, knight };
}

function validCoordinates(value: any): value is { lat: number; lng: number } {
  return value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng))
    && Number(value.lat) >= -90 && Number(value.lat) <= 90
    && Number(value.lng) >= -180 && Number(value.lng) <= 180;
}

function distanceKmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function hasAnyText(values: unknown, needles: string[]) {
  const haystack = Array.isArray(values) ? values.map(String).join(" ").toLowerCase() : String(values || "").toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function driverMeetsService(order: ServerOrder, userData: any, knight: any) {
  // Level is informational only. Eligibility comes from service requirements;
  // active Knights have already passed mandatory safety/service training at registration.
  const certifications = knight.certifications || [];
  const specialties = knight.specialtyTags || [];
  switch (order.serviceId) {
    case "express": return knight.hasDeliveryBox === true;
    case "mu": return !order.customerGender || userData.gender === order.customerGender;
    case "spirit": return hasAnyText([...certifications, ...specialties], ["spirit", "ผู้สูงอายุ", "ศาสนา", "elder"]);
    case "family": return hasAnyText([...certifications, ...specialties], ["family", "เด็ก", "ผู้สูงอายุ", "ผู้พิการ", "child", "elder", "disabled"]);
    case "pet": return hasAnyText([...certifications, ...specialties], ["pet", "สัตว์"]);
    case "link": return hasAnyText(specialties, ["link", "express", "ขนส่ง", "ส่ง"]);
    case "lifestyle": return hasAnyText(specialties, ["lifestyle", "คาเฟ่", "ร้านอาหาร", "สตรีทฟู้ด"]);
    default: return true;
  }
}

async function buildDispatchCandidates(order: ServerOrder) {
  if (!order.pickupCoord || !validCoordinates(order.pickupCoord)) return [] as string[];
  const [usersSnap, knightsSnap] = await Promise.all([
    ordersDb.collection("users").where("role", "==", "knight").where("status", "==", "active").get(),
    ordersDb.collection("knights").where("isOnline", "==", true).get(),
  ]);
  const usersById = new Map(usersSnap.docs.map((doc) => [doc.id, doc.data()]));
  const now = Date.now();
  const candidates = knightsSnap.docs.flatMap((doc) => {
    const knight = doc.data();
    const registeredUser = usersById.get(doc.id);
    const userData = registeredUser || (knight.ownerManagedDriver === true
      ? { role: "knight", status: "active", displayName: knight.displayName || "กิตติ อินทะสร้อย", level: 100, gender: knight.gender || "male" }
      : null);
    const kyc = String(knight.kycStatus || "").toLowerCase();
    const location = knight.lastDispatchLocation;
    const heartbeatMs = Date.parse(String(knight.dispatchHeartbeatAt || ""));
    if (!userData || !["approved", "verified"].includes(kyc) || !validCoordinates(location) || !Number.isFinite(heartbeatMs) || now - heartbeatMs > 120_000) return [];
    if (!driverMeetsService(order, userData, knight)) return [];
    const distanceKm = distanceKmBetween(order.pickupCoord!, { lat: Number(location.lat), lng: Number(location.lng) });
    if (distanceKm > 15) return [];
    return [{ id: doc.id, distanceKm, lastOfferMs: Date.parse(String(knight.lastDispatchOfferAt || "")) || 0, jobsAccepted: Number(knight.dispatchJobsAccepted || 0), tie: crypto.randomInt(0, 1_000_000) }];
  });
  if (!candidates.length) return [];

  const closestDistance = Math.min(...candidates.map((candidate) => candidate.distanceKm));
  const closestBand = candidates.filter((candidate) => candidate.distanceKm <= closestDistance + 0.75)
    .sort((a, b) => a.lastOfferMs - b.lastOfferMs || a.jobsAccepted - b.jobsAccepted || a.tie - b.tie);
  const farther = candidates.filter((candidate) => candidate.distanceKm > closestDistance + 0.75)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.lastOfferMs - b.lastOfferMs || a.tie - b.tie);
  const ordered = [...closestBand, ...farther].map((candidate) => candidate.id);
  if (order.preferredDriverId && ordered.includes(order.preferredDriverId)) {
    return [order.preferredDriverId, ...ordered.filter((id) => id !== order.preferredDriverId)];
  }
  return ordered;
}

function nextDispatchOffer(order: ServerOrder, now = new Date()) {
  const candidates = Array.isArray(order.dispatchCandidateIds) ? order.dispatchCandidateIds : [];
  const nextIndex = Number(order.dispatchCandidateIndex ?? -1) + 1;
  return {
    offeredDriverId: candidates[nextIndex] || null,
    dispatchCandidateIndex: nextIndex,
    dispatchAttempt: Number(order.dispatchAttempt || 0) + 1,
    offerExpiresAt: candidates[nextIndex] ? new Date(now.getTime() + 30_000).toISOString() : null,
    updatedAt: now.toISOString(),
  };
}

const QUEST_SEASON_ID = "2026-S3";
const QUEST_DEFINITIONS: Record<string, { role: string; period: "daily" | "weekly" | "epic"; xp: number; required: number; metricKey: string }> = {
  "S3-KN-D01": {
    "role": "driver",
    "period": "daily",
    "xp": 60,
    "required": 1,
    "metricKey": "driver.preflight"
  },
  "S3-KN-D02": {
    "role": "driver",
    "period": "daily",
    "xp": 80,
    "required": 1,
    "metricKey": "driver.online"
  },
  "S3-KN-D03": {
    "role": "driver",
    "period": "daily",
    "xp": 180,
    "required": 3,
    "metricKey": "driver.completed_trip"
  },
  "S3-KN-D04": {
    "role": "driver",
    "period": "daily",
    "xp": 140,
    "required": 2,
    "metricKey": "driver.routed_trip"
  },
  "S3-KN-W01": {
    "role": "driver",
    "period": "weekly",
    "xp": 500,
    "required": 5,
    "metricKey": "driver.active_days"
  },
  "S3-KN-W02": {
    "role": "driver",
    "period": "weekly",
    "xp": 700,
    "required": 3,
    "metricKey": "driver.special_service"
  },
  "S3-KN-E01": {
    "role": "driver",
    "period": "epic",
    "xp": 1600,
    "required": 50,
    "metricKey": "driver.trusted_completed_trip"
  },
  "S3-CT-D01": {
    "role": "citizen",
    "period": "daily",
    "xp": 100,
    "required": 1,
    "metricKey": "citizen.completed_trip"
  },
  "S3-CT-D02": {
    "role": "citizen",
    "period": "daily",
    "xp": 80,
    "required": 1,
    "metricKey": "citizen.win_alert_preview"
  },
  "S3-CT-D03": {
    "role": "citizen",
    "period": "daily",
    "xp": 60,
    "required": 1,
    "metricKey": "citizen.shop_profile_view"
  },
  "S3-CT-D04": {
    "role": "citizen",
    "period": "daily",
    "xp": 60,
    "required": 1,
    "metricKey": "citizen.street_market_view"
  },
  "S3-CT-W01": {
    "role": "citizen",
    "period": "weekly",
    "xp": 350,
    "required": 3,
    "metricKey": "citizen.feature_categories"
  },
  "S3-CT-W02": {
    "role": "citizen",
    "period": "weekly",
    "xp": 450,
    "required": 5,
    "metricKey": "citizen.rated_completed_trip"
  },
  "S3-CT-E01": {
    "role": "citizen",
    "period": "epic",
    "xp": 1400,
    "required": 25,
    "metricKey": "citizen.engagement_score"
  },
  "S3-ME-D01": {
    "role": "merchant",
    "period": "daily",
    "xp": 80,
    "required": 1,
    "metricKey": "merchant.storefront_ready"
  },
  "S3-ME-D02": {
    "role": "merchant",
    "period": "daily",
    "xp": 100,
    "required": 1,
    "metricKey": "merchant.catalog_update"
  },
  "S3-ME-D03": {
    "role": "merchant",
    "period": "daily",
    "xp": 100,
    "required": 1,
    "metricKey": "merchant.promotion_publish"
  },
  "S3-ME-D04": {
    "role": "merchant",
    "period": "daily",
    "xp": 140,
    "required": 3,
    "metricKey": "merchant.dispatch_ready"
  },
  "S3-ME-W01": {
    "role": "merchant",
    "period": "weekly",
    "xp": 450,
    "required": 5,
    "metricKey": "merchant.active_days"
  },
  "S3-ME-W02": {
    "role": "merchant",
    "period": "weekly",
    "xp": 650,
    "required": 20,
    "metricKey": "merchant.completed_orders"
  },
  "S3-ME-E01": {
    "role": "merchant",
    "period": "epic",
    "xp": 1800,
    "required": 121,
    "metricKey": "merchant.store_growth"
  },
  "S3-PA-D01": {
    "role": "partner",
    "period": "daily",
    "xp": 80,
    "required": 1,
    "metricKey": "partner.profile_ready"
  },
  "S3-PA-D02": {
    "role": "partner",
    "period": "daily",
    "xp": 100,
    "required": 1,
    "metricKey": "partner.service_update"
  },
  "S3-PA-D03": {
    "role": "partner",
    "period": "daily",
    "xp": 100,
    "required": 1,
    "metricKey": "partner.offer_publish"
  },
  "S3-PA-D04": {
    "role": "partner",
    "period": "daily",
    "xp": 120,
    "required": 1,
    "metricKey": "partner.customer_connect"
  },
  "S3-PA-W01": {
    "role": "partner",
    "period": "weekly",
    "xp": 450,
    "required": 5,
    "metricKey": "partner.active_days"
  },
  "S3-PA-W02": {
    "role": "partner",
    "period": "weekly",
    "xp": 650,
    "required": 15,
    "metricKey": "partner.completed_connections"
  },
  "S3-PA-E01": {
    "role": "partner",
    "period": "epic",
    "xp": 1800,
    "required": 52,
    "metricKey": "partner.network_growth"
  }
};

function bangkokDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(date);
}
function weekKey(date = new Date()) {
  const d = new Date(date);
  const bangkok = bangkokDateKey(d);
  const [y,m,day] = bangkok.split("-").map(Number);
  const local = new Date(Date.UTC(y, m - 1, day));
  const weekday = local.getUTCDay() || 7;
  local.setUTCDate(local.getUTCDate() - weekday + 1);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth()+1).padStart(2,"0")}-${String(local.getUTCDate()).padStart(2,"0")}`;
}
function questPeriodKey(period: "daily" | "weekly" | "epic") {
  return period === "daily" ? bangkokDateKey() : period === "weekly" ? weekKey() : "lifetime";
}
function questCounterKey(period: "daily" | "weekly" | "epic") {
  return period === "daily" ? "daily" : period === "weekly" ? "weekly" : "lifetime";
}
function questBucketKey(period: "daily" | "weekly" | "epic") {
  return period === "daily" ? bangkokDateKey() : period === "weekly" ? weekKey() : "lifetime";
}

app.get("/api/quests/state", rateLimit(60), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const seasonId = String(req.query.season || QUEST_SEASON_ID);
  if (seasonId !== QUEST_SEASON_ID) return res.status(400).json({ error: "Unsupported quest season" });
  try {
    const snap = await ordersDb.collection("users").doc(user.uid).collection("progression").doc(seasonId).get();
    const data = snap.exists ? snap.data() || {} : {};
    const today = bangkokDateKey();
    const thisWeek = weekKey();
    return res.json({ seasonId, daily: (data.daily || {})[today] || {}, weekly: (data.weekly || {})[thisWeek] || {}, lifetime: (data.lifetime || {}).lifetime || {}, claimed: data.claimed || {} });
  } catch (error: any) {
    console.error("[Quest State GET Error]:", error?.message);
    return res.status(503).json({ error: "Quest state unavailable" });
  }
});

app.post("/api/quests/event", rateLimit(120), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const metricKey = String(req.body?.metricKey || "");
  const amount = Math.min(5, Math.max(1, Math.floor(Number(req.body?.amount) || 1)));
  const eventId = String(req.body?.eventId || `${metricKey}:${Date.now()}:${crypto.randomBytes(6).toString("hex")}`).slice(0, 180);
  const definition = Object.values(QUEST_DEFINITIONS).find(q => q.metricKey === metricKey);
  if (!definition) return res.status(400).json({ error: "Unknown quest metric" });
  try {
    const userSnap = await ordersDb.collection("users").doc(user.uid).get();
    const role = String(userSnap.data()?.role || "");
    if (role !== definition.role) return res.status(403).json({ error: "Quest metric does not match account role" });
    const seasonRef = ordersDb.collection("users").doc(user.uid).collection("progression").doc(QUEST_SEASON_ID);
    const eventRef = seasonRef.collection("events").doc(crypto.createHash("sha256").update(eventId).digest("hex"));
    let newValue = 0, duplicate = false;
    await ordersDb.runTransaction(async transaction => {
      const [seasonSnap, eventSnap] = await Promise.all([transaction.get(seasonRef), transaction.get(eventRef)]);
      if (eventSnap.exists) { duplicate = true; return; }
      const data = seasonSnap.exists ? seasonSnap.data() || {} : {};
      const bucketName = questCounterKey(definition.period);
      const periodKey = questBucketKey(definition.period);
      const bucketRoot = { ...(data[bucketName] || {}) };
      const bucket = { ...(bucketRoot[periodKey] || {}) };

      // "active_days" means distinct Bangkok calendar days, not raw button/heartbeat count.
      // Store a day marker per event and derive the counter from unique markers.
      if (metricKey.endsWith(".active_days")) {
        const dayKey = bangkokDateKey();
        const activeDays = { ...((bucket.activeDayKeys || {}) as Record<string, true>) };
        activeDays[dayKey] = true;
        bucket.activeDayKeys = activeDays;
        newValue = Object.keys(activeDays).length;
        bucket[metricKey] = newValue;
      } else {
        newValue = Math.min(100000, (Number(bucket[metricKey]) || 0) + amount);
        bucket[metricKey] = newValue;
      }

      bucketRoot[periodKey] = bucket;
      transaction.set(seasonRef, { seasonId: QUEST_SEASON_ID, [bucketName]: bucketRoot, updatedAt: new Date().toISOString() }, { merge: true });
      transaction.create(eventRef, { eventId, metricKey, amount: metricKey.endsWith(".active_days") ? 1 : amount, dayKey: metricKey.endsWith(".active_days") ? bangkokDateKey() : undefined, createdAt: FieldValue.serverTimestamp() });
    });
    return res.json({ success: true, duplicate, metricKey, value: newValue });
  } catch (error: any) {
    console.error("[Quest Event Error]:", error?.message);
    return res.status(503).json({ error: "Quest event could not be recorded" });
  }
});

app.post("/api/quests/claim", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const questId = String(req.body?.questId || "");
  const definition = QUEST_DEFINITIONS[questId];
  if (!definition) return res.status(400).json({ error: "Unknown quest" });
  try {
    const userRef = ordersDb.collection("users").doc(user.uid);
    const seasonRef = userRef.collection("progression").doc(QUEST_SEASON_ID);
    let result: { alreadyClaimed?: boolean; xp?: number } = {};
    await ordersDb.runTransaction(async transaction => {
      const [userSnap, seasonSnap] = await Promise.all([transaction.get(userRef), transaction.get(seasonRef)]);
      const userData = userSnap.data() || {};
      if (String(userData.role || "") !== definition.role) throw new Error("ROLE_MISMATCH");
      const data = seasonSnap.exists ? seasonSnap.data() || {} : {};
      const bucketName = questCounterKey(definition.period);
      const bucketRoot = { ...(data[bucketName] || {}) };
      const periodKey = questPeriodKey(definition.period);
      const bucket = { ...(bucketRoot[periodKey] || {}) };
      const value = Number(bucket[definition.metricKey]) || 0;
      const claims = { ...(data.claimed || {}) };
      const claimKey = `${questId}:${periodKey}`;
      if (claims[claimKey]) { result = { alreadyClaimed: true, xp: Number(userData.xp) || 0 }; return; }
      if (value < definition.required) throw new Error("QUEST_NOT_COMPLETE");
      claims[claimKey] = new Date().toISOString();
      const nextXp = (Number(userData.xp) || 0) + definition.xp;
      transaction.set(seasonRef, { seasonId: QUEST_SEASON_ID, claimed: claims, updatedAt: new Date().toISOString() }, { merge: true });
      transaction.set(userRef, { xp: nextXp, questSeason: QUEST_SEASON_ID, missionsCompleted: (Number(userData.missionsCompleted) || 0) + 1, updatedAt: new Date().toISOString() }, { merge: true });
      result = { alreadyClaimed: false, xp: nextXp };
    });
    return res.json({ success: true, ...result });
  } catch (error: any) {
    if (error?.message === "ROLE_MISMATCH") return res.status(403).json({ error: "Quest role mismatch" });
    if (error?.message === "QUEST_NOT_COMPLETE") return res.status(409).json({ error: "Quest not complete" });
    console.error("[Quest Claim Error]:", error?.message);
    return res.status(503).json({ error: "Quest claim unavailable" });
  }
});

const ordersCollection = ordersDb.collection("rides");

// Approved, online knights for driver-matching. Reads through the trusted Admin
// SDK on the server because the client SDK cannot list the whole `users`/`knights`
// collections directly: firestore.rules only grants read on a document a caller
// owns (or is admin), and Firestore denies an unfiltered "list" query unless the
// rule can be proven true for every possible document in the collection.
app.get("/api/knights/available", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const [usersSnap, knightsSnap] = await Promise.all([
      ordersDb.collection("users").where("role", "==", "knight").where("status", "==", "active").get(),
      ordersDb.collection("knights").where("isOnline", "==", true).get(),
    ]);
    const knightsById = new Map(knightsSnap.docs.map((doc) => [doc.id, doc.data()]));
    const origin = validCoordinates({ lat: Number(req.query.latitude), lng: Number(req.query.longitude) })
      ? { lat: Number(req.query.latitude), lng: Number(req.query.longitude) }
      : null;
    const now = Date.now();
    const usersById = new Map(usersSnap.docs.map((doc) => [doc.id, doc.data()]));
    const knights = knightsSnap.docs
      .map((doc) => ({ uid: doc.id, knight: doc.data(), user: usersById.get(doc.id) || (doc.data().ownerManagedDriver === true ? { displayName: doc.data().displayName || "กิตติ อินทะสร้อย", level: 100, gender: doc.data().gender || "male" } : null) }))
      .filter(({ knight, user }) => {
        const kyc = String((knight as any)?.kycStatus || "").toLowerCase();
        const heartbeatMs = Date.parse(String((knight as any)?.dispatchHeartbeatAt || ""));
        return user && knight && ["approved", "verified"].includes(kyc) && Number.isFinite(heartbeatMs) && now - heartbeatMs <= 120_000;
      })
      .map(({ uid, user: userData, knight }) => {
        const driverLocation = validCoordinates((knight as any).lastDispatchLocation) ? (knight as any).lastDispatchLocation : null;
        const distanceKm = origin && driverLocation ? distanceKmBetween(origin, driverLocation) : null;
        return {
          id: uid,
          name: String(userData.displayName || (knight as any).displayName || "พี่วิน"),
          nameEn: String(userData.displayNameEn || userData.displayName || "Knight"),
          nickname: String(userData.nickname || userData.displayName || "พี่วิน"),
          gender: userData.gender === "female" ? "female" : "male",
          level: Number((knight as any).level ?? userData.level ?? 1),
          tierName: String((knight as any).tierName || "WIN Knight"),
          rating: Number((knight as any).rating ?? userData.rating ?? 0),
          totalTrips: Number((knight as any).totalTrips || 0),
          avatarEmoji: String(userData.avatarEmoji || "🏍️"),
          imageUrl: String(userData.avatarUrl || ""),
          vehicleModel: String((knight as any).vehicleModel || (knight as any).vehicleType || "มอเตอร์ไซค์รับจ้าง"),
          plateNumber: String((knight as any).plateNumber || ""),
          hasDeliveryBox: (knight as any).hasDeliveryBox === true,
          certifications: Array.isArray((knight as any).certifications) ? (knight as any).certifications : [],
          specialtyTags: Array.isArray((knight as any).specialtyTags) ? (knight as any).specialtyTags : [],
          distanceKm,
          etaMinutes: distanceKm === null ? null : Math.max(1, Math.ceil(distanceKm * 3.5)),
          bio: String((knight as any).bio || ""),
        };
      })
      .sort((a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE));

    return res.json({ knights });
  } catch (error: any) {
    console.error("[Knights Available GET Error]:", error?.message);
    return res.status(503).json({ error: "Knight directory unavailable", knights: [] });
  }
});

app.get("/api/knights/settings", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const userSnap = await ordersDb.collection("users").doc(user.uid).get();
    const userData = userSnap.data() || {};
    const knightSnap = await ordersDb.collection("knights").doc(user.uid).get();
    if (userData.role !== "knight" && !isSuperAdminToken(user)) {
      return res.status(403).json({ error: "Knight account required" });
    }
    const knight = knightSnap.data() || {};
    return res.json({
      vehicles: Array.isArray(knight.vehicles) ? knight.vehicles.slice(0, 50) : [],
      activeVehicleId: typeof knight.activeVehicleId === "string" ? knight.activeVehicleId : null,
      equippedSuitId: typeof knight.equippedSuitId === "string" ? knight.equippedSuitId : null,
      isOnline: knight.isOnline === true,
    });
  } catch (error: any) {
    console.error("[Knight Settings GET Error]:", error?.message);
    return res.status(503).json({ error: "Knight settings unavailable" });
  }
});

app.put("/api/knights/settings", rateLimit(60), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const userSnap = await ordersDb.collection("users").doc(user.uid).get();
    const userData = userSnap.data() || {};
    if (userData.role !== "knight" && !isSuperAdminToken(user)) {
      return res.status(403).json({ error: "Knight account required" });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (Array.isArray(req.body?.vehicles)) {
      updates.vehicles = req.body.vehicles.filter((item: unknown) => item && typeof item === "object").slice(0, 50);
    }
    if (typeof req.body?.activeVehicleId === "string") updates.activeVehicleId = req.body.activeVehicleId.slice(0, 120);
    if (typeof req.body?.equippedSuitId === "string") updates.equippedSuitId = req.body.equippedSuitId.slice(0, 120);

    await ordersDb.collection("knights").doc(user.uid).set(updates, { merge: true });
    return res.json({
      success: true,
      vehicles: Array.isArray(updates.vehicles) ? updates.vehicles : undefined,
      activeVehicleId: updates.activeVehicleId,
      equippedSuitId: updates.equippedSuitId,
    });
  } catch (error: any) {
    console.error("[Knight Settings PUT Error]:", error?.message);
    return res.status(503).json({ error: "บันทึกการตั้งค่าอัศวินไม่สำเร็จ" });
  }
});

app.post("/api/knights/presence", rateLimit(120), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const [userSnap, knightSnap] = await Promise.all([
    ordersDb.collection("users").doc(user.uid).get(),
    ordersDb.collection("knights").doc(user.uid).get(),
  ]);
  const userData = userSnap.data() || {};
  const knight = knightSnap.data() || {};
  const kyc = String(knight.kycStatus || "").toLowerCase();
  const isOwner = isSuperAdminToken(user);
  if (!isOwner && (userData.role !== "knight" || userData.status !== "active" || !["approved", "verified"].includes(kyc))) {
    return res.status(403).json({ error: "Verified active driver account required" });
  }
  const isOnline = req.body?.isOnline === true;
  if (!isOnline && knight.activeRideId) return res.status(409).json({ error: "Complete or cancel the active ride before going offline" });
  const location = { lat: Number(req.body?.latitude), lng: Number(req.body?.longitude) };
  if (isOnline && !validCoordinates(location)) return res.status(400).json({ error: "Real GPS is required to go online" });
  const now = new Date().toISOString();
  await knightSnap.ref.set({
    ...(isOwner ? {
      ownerManagedDriver: true,
      displayName: "กิตติ อินทะสร้อย",
      level: 100,
      kycStatus: "approved",
      certifications: ["spirit", "family", "pet"],
      specialtyTags: ["link", "express", "lifestyle", "ศาสนา", "ผู้สูงอายุ", "เด็ก", "ผู้พิการ", "สัตว์"],
      hasDeliveryBox: true,
    } : {}),
    isOnline,
    dispatchHeartbeatAt: now,
    ...(isOnline ? { lastDispatchLocation: location } : {}),
    ...(typeof req.body?.activeVehicleId === "string" ? { activeVehicleId: req.body.activeVehicleId } : {}),
    updatedAt: now,
  }, { merge: true });
  return res.json({ success: true, isOnline, heartbeatAt: now });
});

app.get("/api/knights/:driverUserId/location", async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const driverUserId = String(req.params.driverUserId || "").trim();
  if (!driverUserId || driverUserId === user.uid) return res.status(400).json({ error: "Invalid driver id" });
  try {
    const passengerRides = await ordersCollection.where("passengerUserId", "==", user.uid).limit(20).get();
    const activeRide = passengerRides.docs.map(doc => doc.data() as ServerOrder)
      .find(order => order.driverUserId === driverUserId && !["completed", "cancelled"].includes(String(order.status)));
    if (!activeRide) return res.status(403).json({ error: "Active ride access required" });
    const knightSnap = await ordersDb.collection("knights").doc(driverUserId).get();
    if (!knightSnap.exists) return res.status(404).json({ error: "Driver not found" });
    const knight = knightSnap.data() || {};
    const location = knight.lastDispatchLocation;
    if (!validCoordinates(location)) return res.status(404).json({ error: "Driver location unavailable" });
    return res.json({ location: { lat: Number(location.lat), lng: Number(location.lng), timestamp: knight.dispatchHeartbeatAt || knight.updatedAt || null } });
  } catch (error: any) {
    console.error("[Driver Location GET Error]:", error?.message);
    return res.status(503).json({ error: "Driver location unavailable" });
  }
});

app.get("/api/orders", async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const snapshot = await ordersCollection.orderBy("createdAt", "desc").limit(100).get();
    const allOrders = snapshot.docs.map((doc) => doc.data() as ServerOrder);
    const isAdmin = isSuperAdminToken(user);
    const driverEligibility = await requireEligibleDriver(user.uid, user);
    const isDispatchRequest = req.query.scope === "dispatch";

    // A driver must only receive recent, unassigned requests made by another account.
    // This prevents an admin's historical/self-created test orders from resurfacing
    // as a new incoming job whenever the driver screen polls the API.
    if (isDispatchRequest) {
      if (!isAdmin && !driverEligibility) {
        return res.json({ orders: [] });
      }
      const pendingFreshnessCutoff = Date.now() - 15 * 60 * 1000;
      const pendingOrders = allOrders.filter((order) => {
        const createdAtMs = Date.parse(order.createdAt);
        return order.status === "pending"
          && order.passengerUserId !== user.uid
          && Number.isFinite(createdAtMs)
          && createdAtMs >= pendingFreshnessCutoff;
      });
      const refreshedOrders = await Promise.all(pendingOrders.map(async (order) => {
        const expiryMs = Date.parse(String(order.offerExpiresAt || ""));
        const needsCandidates = !Array.isArray(order.dispatchCandidateIds) || order.dispatchCandidateIds.length === 0;
        const offerExpired = order.offeredDriverId && Number.isFinite(expiryMs) && expiryMs <= Date.now();
        const missingOffer = !order.offeredDriverId;
        if (!needsCandidates && !offerExpired && !missingOffer) return order;

        const candidateIds = needsCandidates ? await buildDispatchCandidates(order) : order.dispatchCandidateIds!;
        const orderRef = ordersCollection.doc(order.id);
        let refreshed = order;
        await ordersDb.runTransaction(async (transaction) => {
          const currentSnap = await transaction.get(orderRef);
          if (!currentSnap.exists) return;
          const current = currentSnap.data() as ServerOrder;
          if (current.status !== "pending") { refreshed = current; return; }
          const currentExpiry = Date.parse(String(current.offerExpiresAt || ""));
          if (current.offeredDriverId && Number.isFinite(currentExpiry) && currentExpiry > Date.now()) { refreshed = current; return; }
          const base = { ...current, dispatchCandidateIds: Array.isArray(current.dispatchCandidateIds) && current.dispatchCandidateIds.length ? current.dispatchCandidateIds : candidateIds };
          const offer = nextDispatchOffer(base);
          transaction.update(orderRef, { dispatchCandidateIds: base.dispatchCandidateIds, ...offer });
          refreshed = { ...base, ...offer } as ServerOrder;
        });
        if (refreshed.offeredDriverId) {
          await ordersDb.collection("knights").doc(refreshed.offeredDriverId).set({ lastDispatchOfferAt: new Date().toISOString() }, { merge: true });
        }
        return refreshed;
      }));
      const dispatchOrders = refreshedOrders.filter((order) => {
        const expiryMs = Date.parse(String(order.offerExpiresAt || ""));
        return order.offeredDriverId === user.uid && Number.isFinite(expiryMs) && expiryMs > Date.now();
      });
      return res.json({ orders: dispatchOrders });
    }

    // Never expose every ride to an ordinary authenticated user.
    const orders = isAdmin
      ? allOrders
      : driverEligibility
        ? allOrders.filter((order) => order.status === "pending" || order.driverUserId === user.uid)
        : allOrders.filter((order) => order.passengerUserId === user.uid);

    return res.json({ orders });
  } catch (error: any) {
    console.error("[Orders GET Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

async function getLiveRouteForOrder(input: ServerOrder) {
  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (!apiKey || apiKey.includes("MY_GOOGLE_MAPS")) throw new Error("ROUTES_API_NOT_CONFIGURED");
  const origin = input.pickupCoord!;
  const destination = input.dropoffCoord!;
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: Number(origin.lat), longitude: Number(origin.lng) } } },
      destination: { location: { latLng: { latitude: Number(destination.lat), longitude: Number(destination.lng) } } },
      travelMode: "TWO_WHEELER", routingPreference: "TRAFFIC_AWARE", computeAlternativeRoutes: false,
      routeModifiers: { avoidTolls: false, avoidHighways: true, avoidFerries: false },
      languageCode: "th-TH", units: "METRIC"
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`ROUTES_API_HTTP_${response.status}`);
  const payload = await response.json() as { routes?: Array<{ distanceMeters?: number; duration?: string }> };
  const route = payload.routes?.[0];
  const distanceMeters = Number(route?.distanceMeters);
  const durationSeconds = Number.parseFloat(String(route?.duration || "").replace("s", ""));
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("ROUTES_API_EMPTY");
  return { distanceKm: Math.round((distanceMeters / 1000) * 100) / 100, estMinutes: Math.max(1, Math.ceil(durationSeconds / 60)) };
}

app.post("/api/orders", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const input = req.body as ServerOrder;
  if (!input || !input.id || !input.passengerUserId || input.passengerUserId !== user.uid) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  const allowedServices = new Set(["knight", "express", "mu", "spirit", "family", "pet", "link", "lifestyle", "food", "backhaul"]);
  const clientDistanceKm = Number(input.distanceKm);
  const requestedFare = Number(input.fare);
  if (!allowedServices.has(String(input.serviceId)) || !validCoordinates(input.pickupCoord) || !validCoordinates(input.dropoffCoord)
    || typeof input.dropoffLocation !== "string" || input.dropoffLocation.trim().length < 3
    || !Number.isFinite(clientDistanceKm) || clientDistanceKm < 0 || clientDistanceKm > 500
    || !Number.isFinite(requestedFare) || requestedFare < 10 || requestedFare > 100_000) {
    return res.status(400).json({ error: "Invalid service, route, or fare data" });
  }

  let liveRoute: { distanceKm: number; estMinutes: number };
  try {
    liveRoute = await getLiveRouteForOrder(input);
  } catch (error: any) {
    console.error("[Order Route Validation Error]:", error?.message);
    return res.status(503).json({ error: "ไม่สามารถยืนยันเส้นทางจริงของการเดินทางได้", code: "LIVE_ROUTE_REQUIRED" });
  }
  const distanceKm = liveRoute.distanceKm;

  try {
    const existingRideSnap = await ordersCollection.where("passengerUserId", "==", user.uid).limit(20).get();
    const pendingExpiry = Date.now() - 15 * 60 * 1000;
    const stalePending = existingRideSnap.docs.filter((doc) => {
      const data = doc.data();
      return data.status === "pending" && Date.parse(String(data.createdAt || "")) < pendingExpiry;
    });
    if (stalePending.length) {
      const batch = ordersDb.batch();
      stalePending.forEach((doc) => batch.update(doc.ref, {
        status: "cancelled",
        cancellationReason: "dispatch_timeout_no_driver",
        updatedAt: new Date().toISOString(),
      }));
      await batch.commit();
    }
    const activeRideDoc = existingRideSnap.docs.find((doc) => {
      if (stalePending.some((stale) => stale.id === doc.id)) return false;
      return !["completed", "cancelled"].includes(String(doc.data().status));
    });
    if (activeRideDoc) return res.status(409).json({
      error: "คุณมีออเดอร์ที่กำลังดำเนินการอยู่ กรุณากลับไปดูหรือยกเลิกออเดอร์เดิมก่อน",
      code: "ACTIVE_ORDER_EXISTS",
      activeOrderId: activeRideDoc.id,
    });
    const passengerSnap = await ordersDb.collection("users").doc(user.uid).get();
    const passenger = passengerSnap.data() || {};
    const now = new Date();
    const welfareFund2Baht = 2;
    const authoritativeQuote = calculateServerFare(String(input.serviceId), distanceKm);
    const fare = authoritativeQuote.fareBaht;
    // Client fare is retained only for compatibility/telemetry; it never changes the charge.
    if (Number.isFinite(requestedFare) && Math.abs(requestedFare - fare) > 1) {
      console.info("[Order Fare] client quote differs from authoritative server fare", { requestedFare, fare, serviceId: input.serviceId, distanceKm });
    }
    const normalizedOrder: ServerOrder = {
      id: String(input.id),
      serviceId: String(input.serviceId),
      serviceTitle: String(input.serviceTitle || input.serviceId).slice(0, 120),
      serviceIconEmoji: String(input.serviceIconEmoji || "🛵").slice(0, 16),
      passengerUserId: user.uid,
      passengerName: String(passenger.displayName || input.passengerName || "ผู้โดยสาร").slice(0, 120),
      passengerPhone: String(passenger.phone || ""),
      pickupLocation: String(input.pickupLocation || "ตำแหน่ง GPS ปัจจุบัน").slice(0, 300),
      dropoffLocation: input.dropoffLocation.trim().slice(0, 300),
      pickupCoord: { lat: Number(input.pickupCoord!.lat), lng: Number(input.pickupCoord!.lng) },
      ...(validCoordinates(input.dropoffCoord) ? { dropoffCoord: { lat: Number(input.dropoffCoord.lat), lng: Number(input.dropoffCoord.lng) } } : {}),
      distanceKm,
      fare,
      fareQuote: authoritativeQuote,
      welfareFund2Baht,
      netFare: Math.max(0, fare - welfareFund2Baht),
      estMinutes: liveRoute.estMinutes,
      status: "pending",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...(input.customerGender === "female" || input.customerGender === "male" ? { customerGender: input.customerGender } : {}),
      ...(typeof input.preferredDriverId === "string" && input.preferredDriverId ? { preferredDriverId: input.preferredDriverId } : {}),
      dispatchMode: input.preferredDriverId ? "preferred" : "automatic",
    };
    const candidateIds = await buildDispatchCandidates(normalizedOrder);
    const firstDriverId = candidateIds[0] || null;
    const newOrder: ServerOrder = {
      ...normalizedOrder,
      dispatchCandidateIds: candidateIds,
      dispatchCandidateIndex: firstDriverId ? 0 : -1,
      dispatchAttempt: firstDriverId ? 1 : 0,
      offeredDriverId: firstDriverId || undefined,
      offerExpiresAt: firstDriverId ? new Date(now.getTime() + 30_000).toISOString() : undefined,
    };
    const orderRef = ordersCollection.doc(newOrder.id);
    await ordersDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(orderRef);
      if (existing.exists) {
        throw new Error("ORDER_ALREADY_EXISTS");
      }
      transaction.create(orderRef, {
        ...newOrder,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });
    });
    if (firstDriverId) await ordersDb.collection("knights").doc(firstDriverId).set({ lastDispatchOfferAt: now.toISOString() }, { merge: true });
    return res.status(201).json({ success: true, order: newOrder, dispatch: { matched: Boolean(firstDriverId), mode: newOrder.dispatchMode, waitingForDriver: !firstDriverId } });
  } catch (error: any) {
    if (error?.message === "ORDER_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Order already exists" });
    }
    console.error("[Orders POST Error]:", error?.message);
    return res.status(503).json({ error: "ฐานข้อมูลออเดอร์ยังไม่พร้อมใช้งาน", code: "ORDER_STORE_UNAVAILABLE" });
  }
});

app.post("/api/orders/:id/accept", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const eligibility = await requireEligibleDriver(user.uid, user);
  if (!eligibility) {
    return res.status(403).json({ error: "Driver is not eligible to accept orders" });
  }
  const { id } = req.params;
  const driverInfo = {
    driverUserId: user.uid,
    driverName: String(eligibility.user.displayName || eligibility.knight.displayName || "Knight"),
    driverLevel: Number(eligibility.knight.level ?? eligibility.user.level ?? 1),
    driverPhone: String(eligibility.user.phone || eligibility.knight.phone || ""),
    driverPlate: String(eligibility.knight.plateNumber || ""),
    driverAvatarEmoji: String(eligibility.user.avatarEmoji || eligibility.knight.avatarEmoji || "🏍️"),
    driverVehicle: String(eligibility.knight.vehicle || eligibility.knight.vehicleModel || ""),
  };
  if (!driverInfo.driverPlate) {
    return res.status(409).json({ error: "Verified driver plate is required before accepting orders" });
  }

  try {
    const orderRef = ordersCollection.doc(id);
    let acceptedOrder: ServerOrder | null = null;

    await ordersDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const order = snapshot.data() as ServerOrder;
      if (order.status !== "pending") {
        throw new Error("ORDER_NOT_PENDING");
      }
      if (order.offeredDriverId !== user.uid) throw new Error("ORDER_NOT_OFFERED_TO_DRIVER");
      const offerExpiry = Date.parse(String(order.offerExpiresAt || ""));
      if (!Number.isFinite(offerExpiry) || offerExpiry <= Date.now()) throw new Error("ORDER_OFFER_EXPIRED");
      if (!driverMeetsService(order, eligibility.user, eligibility.knight)) throw new Error("SERVICE_REQUIREMENTS_NOT_MET");
      const knightRef = ordersDb.collection("knights").doc(user.uid);
      const knightSnapshot = await transaction.get(knightRef);
      if (knightSnapshot.data()?.activeRideId) throw new Error("DRIVER_ALREADY_ON_RIDE");

      acceptedOrder = {
        ...order,
        status: "accepted",
        updatedAt: new Date().toISOString(),
        driverUserId: driverInfo.driverUserId,
        driverName: driverInfo.driverName,
        driverLevel: Number(driverInfo.driverLevel || 1),
        driverPhone: driverInfo.driverPhone,
        driverPlate: driverInfo.driverPlate,
        driverAvatarEmoji: driverInfo.driverAvatarEmoji,
        driverVehicle: driverInfo.driverVehicle,
      };

      transaction.update(orderRef, {
        status: "accepted",
        updatedAt: acceptedOrder.updatedAt,
        driverUserId: acceptedOrder.driverUserId,
        driverName: acceptedOrder.driverName,
        driverLevel: acceptedOrder.driverLevel,
        driverPhone: acceptedOrder.driverPhone || null,
        driverPlate: acceptedOrder.driverPlate,
        driverAvatarEmoji: acceptedOrder.driverAvatarEmoji || null,
        driverVehicle: acceptedOrder.driverVehicle || null,
        offeredDriverId: null,
        offerExpiresAt: null,
      });
      transaction.set(knightRef, {
        activeRideId: id,
        dispatchJobsAccepted: FieldValue.increment(1),
        lastAcceptedAt: acceptedOrder.updatedAt,
      }, { merge: true });
      transaction.set(ordersDb.collection("audit_logs").doc(), {
        action: "RIDE_ACCEPTED",
        rideId: id,
        actorUid: user.uid,
        actorType: "driver",
        fromStatus: "pending",
        toStatus: "accepted",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return res.json({ success: true, order: acceptedOrder });
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({ error: "Order not found" });
    }
    if (error?.message === "ORDER_NOT_PENDING") {
      return res.status(409).json({ error: "Order has already been accepted or is no longer pending" });
    }
    if (error?.message === "ORDER_NOT_OFFERED_TO_DRIVER") return res.status(403).json({ error: "This order is not currently offered to this driver" });
    if (error?.message === "ORDER_OFFER_EXPIRED") return res.status(409).json({ error: "Dispatch offer expired" });
    if (error?.message === "SERVICE_REQUIREMENTS_NOT_MET") return res.status(403).json({ error: "Driver does not meet service requirements" });
    if (error?.message === "DRIVER_ALREADY_ON_RIDE") return res.status(409).json({ error: "Driver already has an active ride" });
    console.error("[Orders Accept Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

app.post("/api/orders/:id/decline", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const { id } = req.params;
  try {
    const orderRef = ordersCollection.doc(id);
    let updatedOrder: ServerOrder | null = null;
    await ordersDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("ORDER_NOT_FOUND");
      const order = snapshot.data() as ServerOrder;
      if (order.status !== "pending") throw new Error("ORDER_NOT_PENDING");
      if (order.offeredDriverId !== user.uid) throw new Error("ORDER_NOT_OFFERED_TO_DRIVER");
      const offer = nextDispatchOffer(order);
      updatedOrder = { ...order, ...offer } as ServerOrder;
      transaction.update(orderRef, offer);
      transaction.set(ordersDb.collection("audit_logs").doc(), {
        action: "RIDE_OFFER_DECLINED", rideId: id, actorUid: user.uid,
        nextDriverUid: offer.offeredDriverId, createdAt: FieldValue.serverTimestamp(),
      });
    });
    if (updatedOrder?.offeredDriverId) {
      await ordersDb.collection("knights").doc(updatedOrder.offeredDriverId).set({ lastDispatchOfferAt: new Date().toISOString() }, { merge: true });
    }
    return res.json({ success: true });
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") return res.status(404).json({ error: "Order not found" });
    if (error?.message === "ORDER_NOT_PENDING") return res.status(409).json({ error: "Order is no longer pending" });
    if (error?.message === "ORDER_NOT_OFFERED_TO_DRIVER") return res.status(403).json({ error: "This order is not offered to this driver" });
    console.error("[Orders Decline Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

app.post("/api/orders/:id/step", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const { id } = req.params;
  const { status, tipAmount, ratingGiven, reviewComment } = req.body;

  if (!status && tipAmount === undefined && ratingGiven === undefined && reviewComment === undefined) {
    return res.status(400).json({ error: "Order update is required" });
  }

  const allowedStatuses = ["pending", "accepted", "heading_pickup", "picked_up", "in_transit", "completed", "cancelled"];
  if (status && !allowedStatuses.includes(String(status))) {
    return res.status(400).json({ error: "Invalid ride status" });
  }
  if (tipAmount !== undefined && (!Number.isFinite(Number(tipAmount)) || Number(tipAmount) < 0)) {
    return res.status(400).json({ error: "Invalid tip amount" });
  }
  if (ratingGiven !== undefined && (!Number.isFinite(Number(ratingGiven)) || Number(ratingGiven) < 1 || Number(ratingGiven) > 5)) {
    return res.status(400).json({ error: "Invalid rating" });
  }

  try {
    const orderRef = ordersCollection.doc(id);
    let updatedOrder: ServerOrder | null = null;

    await ordersDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("ORDER_NOT_FOUND");

      const order = snapshot.data() as ServerOrder;
      const isPassenger = order.passengerUserId === user.uid;
      const isDriver = order.driverUserId === user.uid;
      if (!isPassenger && !isDriver) throw new Error("FORBIDDEN");

      const transitions: Record<string, string[]> = {
        pending: ["cancelled", "accepted"],
        accepted: ["heading_pickup", "cancelled"],
        heading_pickup: ["picked_up", "cancelled"],
        picked_up: ["in_transit", "cancelled"],
        in_transit: ["completed", "cancelled"],
        completed: [],
        cancelled: []
      };

      if (status) {
        const nextStatus = String(status);
        if (!transitions[order.status]?.includes(nextStatus)) {
          throw new Error("INVALID_TRANSITION");
        }
        const driverOnly = ["heading_pickup", "picked_up", "in_transit", "completed"];
        const passengerOnly = ["cancelled"];
        if (driverOnly.includes(nextStatus) && !isDriver) throw new Error("DRIVER_REQUIRED");
        if (passengerOnly.includes(nextStatus) && !isPassenger && !isDriver) throw new Error("PARTICIPANT_REQUIRED");
        if (nextStatus === "accepted") throw new Error("USE_ACCEPT_ENDPOINT");
      }

      if ((tipAmount !== undefined || ratingGiven !== undefined || reviewComment !== undefined) && !isPassenger) throw new Error("PASSENGER_REQUIRED");
      if ((ratingGiven !== undefined || reviewComment !== undefined) && order.status !== "completed") throw new Error("RIDE_NOT_COMPLETED");

      updatedOrder = {
        ...order,
        ...(status ? { status: String(status) } : {}),
        ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
        ...(ratingGiven !== undefined ? { ratingGiven: Number(ratingGiven) } : {}),
        ...(reviewComment !== undefined ? { reviewComment: String(reviewComment).slice(0, 1000) } : {}),
        updatedAt: new Date().toISOString(),
      };
      transaction.update(orderRef, {
        ...(status ? { status: String(status) } : {}),
        ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
        ...(ratingGiven !== undefined ? { ratingGiven: Number(ratingGiven) } : {}),
        ...(reviewComment !== undefined ? { reviewComment: String(reviewComment).slice(0, 1000) } : {}),
        updatedAt: updatedOrder.updatedAt,
      });
      if (status && ["completed", "cancelled"].includes(String(status)) && order.driverUserId) {
        transaction.set(ordersDb.collection("knights").doc(order.driverUserId), {
          activeRideId: FieldValue.delete(),
          lastRideFinishedAt: updatedOrder.updatedAt,
        }, { merge: true });
      }
      if (status) {
        transaction.set(ordersDb.collection("audit_logs").doc(), {
          action: "RIDE_STATUS_CHANGED",
          rideId: id,
          actorUid: user.uid,
          actorType: isDriver ? "driver" : "passenger",
          fromStatus: order.status,
          toStatus: String(status),
          ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") return res.status(404).json({ error: "Order not found" });
    if (error?.message === "FORBIDDEN") return res.status(403).json({ error: "Not a ride participant" });
    if (error?.message === "DRIVER_REQUIRED") return res.status(403).json({ error: "Driver action required" });
    if (error?.message === "PASSENGER_REQUIRED") return res.status(403).json({ error: "Passenger action required" });
    if (error?.message === "PARTICIPANT_REQUIRED") return res.status(403).json({ error: "Participant action required" });
    if (error?.message === "USE_ACCEPT_ENDPOINT") return res.status(409).json({ error: "Use the accept endpoint for acceptance" });
    if (error?.message === "INVALID_TRANSITION") return res.status(409).json({ error: "Invalid ride state transition" });
    if (error?.message === "RIDE_NOT_COMPLETED") return res.status(409).json({ error: "Ride must be completed before rating" });
    console.error("[Orders Step Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

/**
 * Live driver GPS ingestion.
 * Only the authenticated driver assigned to an active ride may publish coordinates.
 * Coordinates are validated server-side and stored separately from the ride state.
 */
app.post("/api/orders/:id/location", rateLimit(120), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  const { id } = req.params;
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const accuracyMeters = req.body?.accuracyMeters === undefined ? undefined : Number(req.body.accuracyMeters);
  const heading = req.body?.heading === undefined ? undefined : Number(req.body.heading);
  const speedMps = req.body?.speedMps === undefined ? undefined : Number(req.body.speedMps);

  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    return res.status(400).json({ error: "Invalid GPS coordinates" });
  }
  if (accuracyMeters !== undefined && (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 10000)) {
    return res.status(400).json({ error: "Invalid GPS accuracy" });
  }
  if (heading !== undefined && (!Number.isFinite(heading) || heading < 0 || heading > 360)) {
    return res.status(400).json({ error: "Invalid GPS heading" });
  }
  if (speedMps !== undefined && (!Number.isFinite(speedMps) || speedMps < 0 || speedMps > 100)) {
    return res.status(400).json({ error: "Invalid GPS speed" });
  }

  try {
    const orderRef = ordersCollection.doc(id);
    const snapshot = await orderRef.get();
    if (!snapshot.exists) return res.status(404).json({ error: "Order not found" });

    const order = snapshot.data() as ServerOrder;
    const activeStatuses = ["accepted", "heading_pickup", "picked_up", "in_transit"];
    if (order.driverUserId !== user.uid) return res.status(403).json({ error: "Only the assigned driver may publish GPS" });
    if (!activeStatuses.includes(order.status)) {
      return res.status(409).json({ error: "GPS updates are not allowed for this ride state" });
    }

    const locationRef = orderRef.collection("locations").doc();
    const now = new Date().toISOString();
    const location = {
      driverUserId: user.uid,
      latitude,
      longitude,
      ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
      ...(heading !== undefined ? { heading } : {}),
      ...(speedMps !== undefined ? { speedMps } : {}),
      recordedAt: now,
      serverRecordedAt: FieldValue.serverTimestamp()
    };
    await locationRef.create(location);

    await orderRef.update({
      lastDriverLocation: {
        latitude,
        longitude,
        ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
        ...(heading !== undefined ? { heading } : {}),
        ...(speedMps !== undefined ? { speedMps } : {}),
        recordedAt: now
      },
      updatedAt: now
    });

    return res.status(201).json({ success: true, location });
  } catch (error: any) {
    console.error("[GPS Location Error]:", error?.message);
    return res.status(503).json({ error: "Location store unavailable" });
  }
});

function validateWebhookTarget(rawUrl: string): URL {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("Invalid webhook URL");
  }

  if (target.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS");
  }

  const hostname = target.hostname.toLowerCase();
  const blockedHostnames = new Set([
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "metadata",
    "host.docker.internal"
  ]);
  if (blockedHostnames.has(hostname)) {
    throw new Error("Webhook host is not allowed");
  }

  // Reject literal loopback/private/link-local IPv4 targets.
  const ipv4 = hostname.match(/^(d+)\.(d+)\.(d+)\.(d+)$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    const [a, b] = octets;
    if (
      octets.some((n) => n < 0 || n > 255) ||
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    ) {
      throw new Error("Private or local webhook targets are not allowed");
    }
  }

  const allowedHosts = (process.env.WEBHOOK_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (allowedHosts.length === 0) {
    throw new Error("No webhook destinations are configured");
  }

  const allowed = allowedHosts.some(
    (host) => hostname === host || hostname.endsWith("." + host)
  );
  if (!allowed) {
    throw new Error("Webhook destination is not allowlisted");
  }

  return target;
}

// Low-Code Webhook Dispatch Proxy (bypasses browser CORS for Make.com / Zapier / Google Sheets)
app.post("/api/webhooks/dispatch", rateLimit(10), async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ success: false, error: "Webhook URL is required" });
    }

    let targetUrl: URL;
    try {
      targetUrl = validateWebhookTarget(String(webhookUrl));
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error?.message || "Invalid webhook destination" });
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "WINRIDER-Sovereign-Webhook/1.0"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    let responseData = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch {
        responseData = "JSON Parse Error";
      }
    } else {
      try {
        responseData = await response.text();
      } catch {
        responseData = "";
      }
    }

    return res.json({
      success: response.ok,
      statusCode: response.status,
      latencyMs,
      responseData
    });
  } catch (err: any) {
    console.error("[Webhook Dispatch Error]:", err?.message);
    return res.status(500).json({
      success: false,
      error: err?.message || "Webhook dispatch failed"
    });
  }
});

// LINE Notify Proxy Endpoint
app.post("/api/notifications/line", rateLimit(10), async (req, res) => {
  try {
    const token = req.body?.token || process.env.LINE_NOTIFY_TOKEN;
    if (!token) {
      return res.status(503).json({ status: "error", message: "LINE provider is not configured on the server" });
    }

    const { message } = req.body;
    const params = new URLSearchParams();
    params.append("message", String(message || "WINRIDER.AI notification alert"));

    const lineRes = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`
      },
      body: params.toString()
    });

    const data = await lineRes.json();
    return res.json({ status: lineRes.ok ? "ok" : "error", lineResponse: data });
  } catch (err: any) {
    console.error("[LINE Notify Error]:", err?.message);
    return res.status(500).json({ status: "error", message: err?.message || "LINE Notify request failed" });
  }
});

// WIN Buddy AI NLP & Tactical Voice Endpoint
app.post("/api/win-buddy/chat", async (req, res) => {
  try {
    const { message, context, mode } = req.body;
    const ai = getAiClient();

    const systemInstruction = `You are "WIN Buddy AI" (วินบัดดี้ เอไอ), the sovereign NLP tactical voice copilot of the WINRIDER.AI empire.
Leadership:
- Visionary CEO: Cosmo-Ko (🦁 โก้ - ราชสีห์สีน้ำเงินแห่งฝั่งธนบุรี)
- Sovereign Advisor: จิตใจ (🦥 ไอ้สลอต - พลเมืองแห่งตรรกะจักรวาล)

Core Tenets:
1. "Thailand is Home" - เข้าถึงทุกเส้นเลือดฝอย "P'Win First" (อัศวินต้องมีเกียรติ)
2. Visual DNA: Navy 70% (มั่นคง), Neon Blue 27% (พลัง AI), Gold 3% (เกียรติยศที่หายาก)
3. 2-Baht Flat Fee Engine: 1 บาทรันระบบ, 1 บาทประกัน/กองทุนเกษียณ
4. Protocols: Backhaul Match (จับคู่งานขากลับ), Safe Pass Transfer (โอนงานในซอยแคบ), Predictive Dispatch ("เราไปส่งได้นะ"), Ghost Runner CI Map Sync.

Tone: Respectful, tactical, brotherly (เรียกผู้ใช้ว่า "พี่อัศวิน" หรือ "ท่านไนท์"), swift, highly efficient, and infused with Universal Logic & cosmic wisdom.
Respond concisely in Thai (unless asked otherwise) with clear tactical actions or advice for riders on the road.`;

    // Modern supported models from @google/genai guidelines prioritized for real-time speed & availability
    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ];
    let aiResponseText: string | null = null;
    let usedModel = "local-tactical-engine";

    if (ai) {
      for (const modelName of candidateModels) {
        try {
          // Guard each model attempt with a 6-second timeout to guarantee swift copilot response
          const modelCallPromise = ai.models.generateContent({
            model: modelName,
            contents: `Context: ${JSON.stringify(context || {})}\nRider Voice Input: "${message}"`,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Model request timeout")), 6000)
          );

          const response = await Promise.race([modelCallPromise, timeoutPromise]);
          if (response && response.text) {
            aiResponseText = response.text;
            usedModel = modelName;
            break;
          }
        } catch (modelErr: any) {
          console.log(`[WIN Buddy AI] Model ${modelName} unavailable (${modelErr?.message || modelErr?.status || 'temporary'}), trying next...`);
        }
      }
    }

    if (aiResponseText) {
      return res.json({
        reply: aiResponseText,
        protocol: mode || "general",
        timestamp: new Date().toISOString(),
        source: usedModel,
      });
    }

    // Local tactical engine fallback when AI is unavailable or under heavy demand
    const fallbackResponses: Record<string, string> = {
      backhaul: "📍 [AI Backhaul Match] ตรวจพบผู้โดยสารขากลับจาก ซอยจรัญสนิทวงศ์ 13 มุ่งหน้า ท่าพระ ระยะทาง 3.2 กม. อัตราความคุ้มค่า 98.4% รับงานโดยกดแท็บที่หน้าจอหรือสั่ง 'ยืนยันรับงาน' ได้เลยครับพี่อัศวิน!",
      safepass: "🔄 [Safe Pass Transfer] ตรวจพบตรอกแคบกว้าง 1.2 เมตรในซอยสมเด็จพระเจ้าตากสิน 4 ส่งสัญญาณให้อัศวิน Knight-042 ที่อยู่ปากซอยรับช่วงต่อพัสดุเรียบร้อย ปลอดภัย 100%",
      predictive: "🔮 [Predictive Match] คาดการณ์ฝนตกบริเวณวงเวียนใหญ่ในอีก 12 นาที แนะนำเปิดใช้งาน Storm Shield Gore-Tex และปรับโหมดเส้นทาง CI Map เลี่ยงน้ำท่วมขังครับ",
      armor: "🛡️ [Armor Status] The Guardian Zipper ออนไลน์, แบตเตอรี่พลังงานจลน์ 94%, ชิป NB-IoT เชื่อมต่อดาวเทียมสมบูรณ์ เกียรติยศอัศวินระดับ Lvl 45 พร้อมลุย!",
    };

    const lowerMsg = (message || "").toLowerCase();
    let matched = "รับทราบคำสั่งครับพี่อัศวิน! WIN Buddy AI เชื่อมต่อระบบ Safe Pass และผังเส้นเลือดฝอย CI Map พร้อมสนับสนุนภารกิจตามหลักการ 2 บาทครองเมือง และเกียรติยศแห่งราชสีห์ฝั่งธนบุรี!";

    if (lowerMsg.includes("ขากลับ") || lowerMsg.includes("backhaul") || mode === "backhaul") {
      matched = fallbackResponses.backhaul;
    } else if (lowerMsg.includes("ซอย") || lowerMsg.includes("safepass") || mode === "safepass") {
      matched = fallbackResponses.safepass;
    } else if (lowerMsg.includes("พยากรณ์") || lowerMsg.includes("predictive") || mode === "predictive" || lowerMsg.includes("ฝน")) {
      matched = fallbackResponses.predictive;
    } else if (lowerMsg.includes("เกราะ") || lowerMsg.includes("armor") || mode === "armor" || lowerMsg.includes("zipper")) {
      matched = fallbackResponses.armor;
    }

    return res.json({
      reply: matched,
      protocol: mode || "general",
      timestamp: new Date().toISOString(),
      source: "local-tactical-engine",
    });
  } catch (error: any) {
    console.error("WIN Buddy AI unexpected error:", error);
    res.json({
      reply: "🛡️ [Tactical Standby] รับทราบสัญญาณครับพี่อัศวิน ระบบผังเมืองและ Safe Pass ในตัวยังทำงานแบบ Offline ได้เต็มประสิทธิภาพ 100%",
      protocol: "emergency-offline",
      timestamp: new Date().toISOString(),
      source: "emergency-tactical-engine",
    });
  }
});

// =========================================================================
// GOOGLE MAPS ROUTES API (NEW) - LIVE ROUTE COMPUTATION PROXY
// Source: Google Maps Platform Code Assist
// Internal Usage Attribution: gmp_mcp_codeassist_v1_aistudio
// =========================================================================
let routesApiRateLimitedUntil = 0;

app.post("/api/routes/compute", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const {
      origin,
      destination,
      travelMode = "TWO_WHEELER",
      routingPreference = "TRAFFIC_AWARE",
      languageCode = "th-TH"
    } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        error: "กรุณาระบุ origin และ destination พร้อมพิกัด latitude และ longitude"
      });
    }

    const originLat = Number(origin.latitude ?? origin.lat);
    const originLng = Number(origin.longitude ?? origin.lng);
    const destinationLat = Number(destination.latitude ?? destination.lat);
    const destinationLng = Number(destination.longitude ?? destination.lng);
    const validCoord = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    if (!validCoord(originLat, originLng) || !validCoord(destinationLat, destinationLng)) {
      return res.status(400).json({ error: "พิกัด origin/destination ไม่ถูกต้อง" });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";

    // 1. If live Google Maps API Key is available and not rate-limited, request Google Routes API REST endpoint
    if (apiKey && apiKey.trim() !== "" && !apiKey.includes("MY_GOOGLE_MAPS") && Date.now() > routesApiRateLimitedUntil) {
      try {
        const routesPayload = {
          origin: {
            location: {
              latLng: {
                latitude: originLat,
                longitude: Number(origin.longitude || origin.lng)
              }
            }
          },
          destination: {
            location: {
              latLng: {
                latitude: destinationLat,
                longitude: Number(destination.longitude || destination.lng)
              }
            }
          },
          travelMode: travelMode === "MOTORCYCLE" || travelMode === "TWO_WHEELER" ? "TWO_WHEELER" : travelMode,
          routingPreference: routingPreference || "TRAFFIC_AWARE",
          computeAlternativeRoutes: false,
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: travelMode === "TWO_WHEELER",
            avoidFerries: false
          },
          languageCode: languageCode || "th-TH",
          units: "METRIC"
        };

        const fieldMask = [
          "routes.duration",
          "routes.distanceMeters",
          "routes.polyline.encodedPolyline",
          "routes.description",
          "routes.warnings",
          "routes.legs.duration",
          "routes.legs.distanceMeters",
          "routes.legs.startLocation",
          "routes.legs.endLocation",
          "routes.legs.steps.navigationInstruction",
          "routes.legs.steps.distanceMeters",
          "routes.legs.steps.staticDuration",
          "routes.legs.steps.polyline.encodedPolyline",
          "routes.legs.steps.startLocation",
          "routes.legs.steps.endLocation"
        ].join(",");

        const googleResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey.trim(),
            "X-Goog-FieldMask": fieldMask,
            "X-Goog-Client-Id": "gmp_mcp_codeassist_v1_aistudio"
          },
          body: JSON.stringify(routesPayload)
        });

        if (googleResponse.ok) {
          const data = await googleResponse.json();
          if (data.routes && data.routes.length > 0) {
            return res.json({
              success: true,
              source: "google_routes_api_live",
              provider: "Google Maps Platform Routes API",
              travelMode,
              route: data.routes[0],
              timestamp: new Date().toISOString()
            });
          }
        } else {
          if (googleResponse.status === 429) {
            routesApiRateLimitedUntil = Date.now() + 15 * 60 * 1000;
          }
        }
      } catch (_gErr: any) {
        // Fall back gracefully to high-fidelity tactical engine
      }
    }

    return res.status(503).json({
      success: false,
      error: "Google Routes API unavailable",
      message: "Real routing data is required; synthetic routing has been disabled."
    });

  } catch (error: any) {
    console.error("[Routes API Endpoint Error]:", error);
    res.status(502).json({
      error: "Google Routes API failed",
      message: error?.message
    });
  }
});

// ==========================================
// Admin Operations API Endpoints (Fallback & Direct)
// ==========================================

// Admin mutations are intentionally not exposed through unauthenticated Express routes.
// Use the authenticated Firebase callable functions exported from functions/admin.ts.
// Keeping a second in-memory admin API would bypass Firebase Auth, audit persistence,
// role checks, and transactional wallet controls.

// Process-level guards for Cloud Run container resilience
process.on("uncaughtException", (err) => {
  console.error("[WINRIDER.AI] Process uncaughtException caught:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[WINRIDER.AI] Process unhandledRejection caught:", reason);
});

// Helper to discover the dist directory containing compiled static artifacts
function getDistPath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), "dist"),
    typeof __dirname !== "undefined" ? path.resolve(__dirname, "dist") : "",
    typeof __dirname !== "undefined" ? __dirname : "",
    typeof __dirname !== "undefined" ? path.resolve(__dirname, "..", "dist") : "",
    path.resolve("/app/applet/dist"),
    path.resolve("/app/dist"),
    path.resolve("/workspace/dist"),
    process.cwd(),
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      return p;
    }
  }
  return path.resolve(process.cwd(), "dist");
}

// Vite / Static Middleware Integration
async function startServer() {
  const distPath = getDistPath();
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));

  // Robust production detection:
  // 1. Explicit NODE_ENV === "production"
  // 2. Google Cloud Run standalone indicators (when not inside AI Studio dev container)
  // 3. Compiled bundle execution (.cjs)
  // 4. Or static artifacts exist and not in explicit development mode
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (!isDevContainer && (Boolean(process.env.K_SERVICE) || Boolean(process.env.K_REVISION))) ||
    (typeof __filename !== "undefined" && __filename.endsWith(".cjs")) ||
    (hasDist && process.env.NODE_ENV !== "development");

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[WINRIDER.AI] Development mode: Vite middleware mounted");
    } catch (viteErr) {
      console.warn("[WINRIDER.AI] Vite dev middleware unavailable, serving static dist:", viteErr);
      serveStaticFiles(distPath);
    }
  } else {
    console.log("[WINRIDER.AI] Production mode active: serving static artifacts");
    serveStaticFiles(distPath);
  }

  // Global Express error handler to prevent container crashes
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[WINRIDER.AI] Express Route Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error", message: err?.message });
    }
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WINRIDER.AI] Sovereign Server running on http://0.0.0.0:${PORT} [mode: ${isProduction ? "production" : "development"}]`);
  });

  server.on("error", (err: any) => {
    console.error("[WINRIDER.AI] Server listen error:", err);
    if (!isDevContainer) {
      process.exit(1);
    }
  });

  // Cloud Run lifecycle shutdown signals
  process.on("SIGTERM", () => {
    console.log("[WINRIDER.AI] SIGTERM received. Closing HTTP server...");
    server.close(() => {
      console.log("[WINRIDER.AI] Server terminated gracefully.");
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 4000);
  });

  process.on("SIGINT", () => {
    console.log("[WINRIDER.AI] SIGINT received. Shutting down...");
    server.close(() => process.exit(0));
  });
}

function serveStaticFiles(distPath: string) {
  console.log(`[WINRIDER.AI] Static distribution directory: ${distPath}`);
  app.use(express.static(distPath));

  app.get("*", (_req, res, next) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath, (err) => {
        if (err && !res.headersSent) {
          next(err);
        }
      });
    } else {
      const fallbackPath = path.resolve(process.cwd(), "index.html");
      if (fs.existsSync(fallbackPath)) {
        res.sendFile(fallbackPath, (err) => {
          if (err && !res.headersSent) {
            next(err);
          }
        });
      } else {
        res.status(200).send("<!doctype html><html><head><title>WINRIDER.AI</title></head><body><h1>WINRIDER.AI</h1></body></html>");
      }
    }
  });
}

startServer();
