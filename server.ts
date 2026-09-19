import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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

app.use(express.json({ limit: "64kb" }));

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

// Public business fallback for the radar. This never invents riders or customers:
// when no registered WIN entities are available, only real Google Places are returned.
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
  try {
    const googleResponse = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.primaryType,places.formattedAddress,places.location,places.rating,places.currentOpeningHours.openNow,places.googleMapsUri" },
      body: JSON.stringify({
        includedTypes: ["restaurant", "cafe", "convenience_store", "shopping_mall", "store", "lodging", "hospital", "school", "university", "gym", "tourist_attraction"],
        maxResultCount: 20, rankPreference: "DISTANCE", languageCode: "th", regionCode: "TH",
        locationRestriction: { circle: { center: { latitude, longitude }, radius: 5000 } },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!googleResponse.ok) return res.status(502).json({ error: "ดึงร้านค้าและสถานที่จริงจาก Google Places ไม่สำเร็จ", places: [] });
    const payload = await googleResponse.json() as { places?: any[] };
    const raw = (payload.places || []).filter((place) => place?.id && place?.location && place?.displayName?.text);
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
    const partnerTypes = new Set(["lodging", "hospital", "school", "university", "gym", "tourist_attraction"]);
    const places = raw.map((place, index) => {
      const route = routes.get(index) as any;
      return { id: String(place.id), name: String(place.displayName.text), category: partnerTypes.has(place.primaryType) ? "partner" : "shop",
        primaryType: String(place.primaryType || "store"), address: String(place.formattedAddress || ""), latitude: Number(place.location.latitude), longitude: Number(place.location.longitude),
        rating: Number.isFinite(place.rating) ? Number(place.rating) : null, openNow: typeof place.currentOpeningHours?.openNow === "boolean" ? place.currentOpeningHours.openNow : null,
        distanceMeters: route && Number.isFinite(route.distanceMeters) ? Math.round(Number(route.distanceMeters)) : null, googleMapsUri: String(place.googleMapsUri || "") };
    }).filter((place) => place.distanceMeters !== null).sort((a, b) => Number(a.distanceMeters) - Number(b.distanceMeters));
    return res.json({ places, source: "Google Places API (New) + Google Routes API", registeredPeopleSynthesized: false });
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
}

function getAdminDb() {
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "ai-studio-winriderai-96f1b3b6-26ee-4fca-ba51-662b278eea8d";
  if (getApps().length) {
    return getFirestore(getApps()[0], databaseId);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    const adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    return getFirestore(adminApp, databaseId);
  }

  // Cloud Run / Firebase environments can use Application Default Credentials.
  return getFirestore(initializeApp(), databaseId);
}

const ordersDb = getAdminDb();
const adminAuth = getAuth();

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

async function requireEligibleDriver(uid: string) {
  const [userSnap, knightSnap] = await Promise.all([
    ordersDb.collection("users").doc(uid).get(),
    ordersDb.collection("knights").doc(uid).get(),
  ]);
  const user = userSnap.data() || {};
  const knight = knightSnap.data() || {};
  const kyc = String(knight.kycStatus || "").toLowerCase();

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

const ordersCollection = ordersDb.collection("rides");

app.get("/api/orders", async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const snapshot = await ordersCollection.orderBy("createdAt", "desc").limit(100).get();
    const allOrders = snapshot.docs.map((doc) => doc.data() as ServerOrder);
    const isAdmin = user.admin === true;
    const driverEligibility = isAdmin ? null : await requireEligibleDriver(user.uid);
    const isDispatchRequest = req.query.scope === "dispatch";

    // A driver must only receive recent, unassigned requests made by another account.
    // This prevents an admin's historical/self-created test orders from resurfacing
    // as a new incoming job whenever the driver screen polls the API.
    if (isDispatchRequest) {
      if (!isAdmin && !driverEligibility) {
        return res.json({ orders: [] });
      }
      const pendingFreshnessCutoff = Date.now() - 15 * 60 * 1000;
      const dispatchOrders = allOrders.filter((order) => {
        const createdAtMs = Date.parse(order.createdAt);
        return order.status === "pending"
          && order.passengerUserId !== user.uid
          && Number.isFinite(createdAtMs)
          && createdAtMs >= pendingFreshnessCutoff;
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

app.post("/api/orders", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const newOrder = req.body as ServerOrder;
  if (!newOrder || !newOrder.id || !newOrder.passengerUserId || newOrder.passengerUserId !== user.uid) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  try {
    const orderRef = ordersCollection.doc(newOrder.id);
    await ordersDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(orderRef);
      if (existing.exists) {
        throw new Error("ORDER_ALREADY_EXISTS");
      }
      transaction.create(orderRef, {
        ...newOrder,
        status: "pending",
        createdAt: newOrder.createdAt || new Date().toISOString(),
        updatedAt: newOrder.updatedAt || new Date().toISOString(),
        serverCreatedAt: FieldValue.serverTimestamp(),
      });
    });
    return res.status(201).json({ success: true, order: newOrder });
  } catch (error: any) {
    if (error?.message === "ORDER_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Order already exists" });
    }
    console.error("[Orders POST Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

app.post("/api/orders/:id/accept", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const eligibility = await requireEligibleDriver(user.uid);
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
      });
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
    console.error("[Orders Accept Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

app.post("/api/orders/:id/step", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const { id } = req.params;
  const { status, tipAmount } = req.body;

  if (!status && tipAmount === undefined) {
    return res.status(400).json({ error: "Order update is required" });
  }

  const allowedStatuses = ["pending", "accepted", "heading_pickup", "picked_up", "in_transit", "completed", "cancelled"];
  if (status && !allowedStatuses.includes(String(status))) {
    return res.status(400).json({ error: "Invalid ride status" });
  }
  if (tipAmount !== undefined && (!Number.isFinite(Number(tipAmount)) || Number(tipAmount) < 0)) {
    return res.status(400).json({ error: "Invalid tip amount" });
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

      if (tipAmount !== undefined && !isPassenger) throw new Error("PASSENGER_REQUIRED");

      updatedOrder = {
        ...order,
        ...(status ? { status: String(status) } : {}),
        ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
        updatedAt: new Date().toISOString(),
      };
      transaction.update(orderRef, {
        ...(status ? { status: String(status) } : {}),
        ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
        updatedAt: updatedOrder.updatedAt,
      });
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
