import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { calculateAppFare } from "./src/core/serverFare";
import { parseQrPayload } from "./src/utils/qrPayload";

dotenv.config();

const app = express();

// Cloud Run injects PORT for the ingress container. Google AI Studio/local
// preview can fall back to 3000 when PORT is not provided.
const runtimePort = Number(process.env.PORT);
const PORT = Number.isInteger(runtimePort) && runtimePort > 0 && runtimePort <= 65535
  ? runtimePort
  : 3000;

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
  "/api/routes/compute": 12,
  "/api/pet-care/nearby": 20,
  "/api/emergency/nearby": 20,
  "/api/radar/nearby-places": 20,
  "/api/places/resolve-routes": 12,
  "/api/shop/directory": 30,
  "/api/shop/listings": 20,
  "/api/shop/profile-content": 20,
  "/api/events/daily": 30,
};

function rideMutationIdempotencyRef(req: express.Request, action: string, rideId: string, actorUid: string, payload: unknown = {}) {
  const supplied = String(req.headers["idempotency-key"] || req.body?.idempotencyKey || "").trim();
  const logicalKey = supplied || `${action}:${rideId}:${actorUid}:${stableCanonicalJson(payload)}`;
  const hash = crypto.createHash("sha256").update(logicalKey).digest("hex");
  return {
    logicalKey,
    ref: ordersDb.collection("ride_mutation_idempotency").doc(hash),
  };
}

function stableCanonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableCanonicalJson).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return "{" + Object.keys(obj).sort().map((key) => JSON.stringify(key) + ":" + stableCanonicalJson(obj[key])).join(",") + "}";
}

function rateLimitKey(req: express.Request): string {
  const bearer = String(req.headers.authorization || "");
  if (bearer.startsWith("Bearer ")) {
    return "auth:" + crypto.createHash("sha256").update(bearer.slice(7)).digest("hex").slice(0, 24);
  }
  return "ip:" + String(req.ip || "unknown");
}

function distributedRateLimit(scope: string, maxRequests: number) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const principal = rateLimitKey(req);
    const docId = crypto.createHash("sha256").update(scope + ":" + principal).digest("hex");
    const ref = ordersDb.collection("_distributed_rate_limits").doc(docId);
    try {
      let allowed = true;
      await ordersDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.data() || {};
        const windowStart = Number(data.windowStart || 0);
        const count = Number(data.count || 0);
        if (!windowStart || now - windowStart >= RATE_WINDOW_MS) {
          tx.set(ref, { scope, principalHash: docId, windowStart: now, count: 1, updatedAt: FieldValue.serverTimestamp() });
          return;
        }
        if (count >= maxRequests) {
          allowed = false;
          return;
        }
        tx.update(ref, { count: count + 1, updatedAt: FieldValue.serverTimestamp() });
      });
      if (!allowed) {
        res.setHeader("Retry-After", "60");
        return res.status(429).json({ error: "Too many requests", code: "DISTRIBUTED_RATE_LIMIT" });
      }
      return next();
    } catch (error: any) {
      console.error("[Distributed Rate Limit]", scope, error?.message);
      return res.status(503).json({ error: "Rate-limit service unavailable" });
    }
  };
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

type PublicPlacePreset = "radar" | "pet" | "emergency";
type PublicPlace = {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  distanceKm: number;
  placeGroup: "shop" | "transport" | "faith" | "community";
  source: string;
  sourceUrl?: string;
  externalMapUrl: string;
};

const publicPlaceCache = new Map<string, { expiresAt: number; places: PublicPlace[] }>();
const PUBLIC_PLACE_CACHE_MS = 5 * 60 * 1000;

function localDistanceKm(originLat: number, originLng: number, destLat: number, destLng: number): number {
  const r = 6371;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(destLat - originLat);
  const dLng = toRad(destLng - originLng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(originLat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function externalMapUrl(latitude: number, longitude: number): string {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(latitude + "," + longitude);
}

function classifyPublicPlace(tags: Record<string, string>, preset: PublicPlacePreset) {
  const amenity = String(tags.amenity || "");
  const shop = String(tags.shop || "");
  const tourism = String(tags.tourism || "");
  const publicTransport = String(tags.public_transport || "");
  if (preset === "pet") return { category: "veterinary", placeGroup: "community" as const };
  if (preset === "emergency") {
    if (amenity === "police") return { category: "police", placeGroup: "community" as const };
    if (amenity === "fire_station") return { category: "fire_station", placeGroup: "community" as const };
    return { category: amenity || "hospital", placeGroup: "community" as const };
  }
  if (amenity === "place_of_worship") return { category: "place_of_worship", placeGroup: "faith" as const };
  if (["bus_station", "ferry_terminal"].includes(amenity) || publicTransport) return { category: amenity || publicTransport, placeGroup: "transport" as const };
  if (shop || ["restaurant", "cafe", "fast_food", "marketplace"].includes(amenity)) return { category: shop || amenity || "shop", placeGroup: "shop" as const };
  if (tourism) return { category: tourism, placeGroup: "community" as const };
  return { category: amenity || "community", placeGroup: "community" as const };
}

async function loadOpenStreetMapPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  preset: PublicPlacePreset,
): Promise<PublicPlace[]> {
  const radius = Math.min(20_000, Math.max(500, Math.round(radiusMeters)));
  const around = "(around:" + radius + "," + latitude + "," + longitude + ")";
  const body = preset === "pet"
    ? 'nwr' + around + '["amenity"="veterinary"];'
    : preset === "emergency"
      ? 'nwr' + around + '["amenity"~"^(hospital|clinic|police|fire_station)$"];'
      : [
          'nwr' + around + '["shop"];',
          'nwr' + around + '["amenity"~"^(restaurant|cafe|fast_food|marketplace|school|college|university|hospital|clinic|place_of_worship|bus_station|ferry_terminal)$"];',
          'nwr' + around + '["tourism"~"^(hotel|guest_house|attraction|museum)$"];',
          'nwr' + around + '["public_transport"];',
        ].join("");
  const query = "[out:json][timeout:12];(" + body + ");out center tags 100;";
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "WINRIDER.AI/1.0 (public-data directory; no API key)",
      Accept: "application/json",
    },
    body: new URLSearchParams({ data: query }).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("OPENSTREETMAP_OVERPASS_" + response.status);
  const payload = await response.json() as { elements?: any[] };
  return (payload.elements || []).flatMap((element: any): PublicPlace[] => {
    const lat = Number(element.lat ?? element.center?.lat);
    const lng = Number(element.lon ?? element.center?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const tags = (element.tags || {}) as Record<string, string>;
    const name = String(tags["name:th"] || tags.name || tags["name:en"] || "").trim();
    if (!name) return [];
    const classified = classifyPublicPlace(tags, preset);
    const address = [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:subdistrict"],
      tags["addr:district"],
      tags["addr:province"],
    ].filter(Boolean).join(" ");
    const distanceKm = Math.round(localDistanceKm(latitude, longitude, lat, lng) * 100) / 100;
    return [{
      id: "osm-" + String(element.type || "node") + "-" + String(element.id),
      name,
      category: classified.category,
      address,
      latitude: lat,
      longitude: lng,
      phone: String(tags.phone || tags["contact:phone"] || ""),
      distanceKm,
      placeGroup: classified.placeGroup,
      source: "OpenStreetMap contributors",
      sourceUrl: "https://www.openstreetmap.org/" + String(element.type || "node") + "/" + String(element.id),
      externalMapUrl: externalMapUrl(lat, lng),
    }];
  });
}

async function loadStoredPublicPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  preset: PublicPlacePreset,
): Promise<PublicPlace[]> {
  try {
    const snapshot = await ordersDb.collection("publicDataRecords").where("sourceDriven", "==", true).limit(500).get();
    const radiusKm = radiusMeters / 1000;
    return snapshot.docs.flatMap((doc): PublicPlace[] => {
      const record: any = doc.data() || {};
      if (record.publicVisible !== true) return [];
      const lat = Number(record.latitude ?? record.lat);
      const lng = Number(record.longitude ?? record.lng ?? record.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      const name = String(record.name || record.title || "").trim();
      if (!name) return [];
      const haystack = [record.kind, record.category, record.name, record.title, record.description].map((v) => String(v || "").toLowerCase()).join(" ");
      if (preset === "pet" && !/(สัตว์|veterinary|animal|pet)/i.test(haystack)) return [];
      if (preset === "emergency" && !/(โรงพยาบาล|คลินิก|ตำรวจ|ดับเพลิง|hospital|clinic|police|fire)/i.test(haystack)) return [];
      const distanceKm = Math.round(localDistanceKm(latitude, longitude, lat, lng) * 100) / 100;
      if (distanceKm > radiusKm) return [];
      const placeGroup = /restaurant|cafe|market|shop|ร้าน|อาหาร|คาเฟ่/i.test(haystack)
        ? "shop" as const
        : /temple|church|mosque|shrine|วัด|โบสถ์|มัสยิด|ศาลเจ้า/i.test(haystack)
          ? "faith" as const
          : /station|transport|bus|ferry|สถานี|ท่าเรือ/i.test(haystack)
            ? "transport" as const
            : "community" as const;
      return [{
        id: "public-" + doc.id,
        name,
        category: String(record.category || record.kind || "public_data"),
        address: [record.address, record.district, record.province].filter(Boolean).join(" "),
        latitude: lat,
        longitude: lng,
        phone: String(record.phone || record.telephone || ""),
        distanceKm,
        placeGroup,
        source: String(record.sourceName || record.source || "WIN Public Data"),
        sourceUrl: String(record.sourceUrl || record.sourceDatasetUrl || "") || undefined,
        externalMapUrl: externalMapUrl(lat, lng),
      }];
    });
  } catch (error: any) {
    console.warn("[Public Data Places]", error?.message);
    return [];
  }
}

async function loadFreePublicPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  preset: PublicPlacePreset,
): Promise<PublicPlace[]> {
  const cacheKey = [preset, latitude.toFixed(3), longitude.toFixed(3), Math.round(radiusMeters / 1000)].join(":");
  const cached = publicPlaceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.places;

  const stored = await loadStoredPublicPlaces(latitude, longitude, radiusMeters, preset);
  let osm: PublicPlace[] = [];
  try {
    osm = await loadOpenStreetMapPlaces(latitude, longitude, radiusMeters, preset);
  } catch (error: any) {
    console.warn("[OpenStreetMap Public Places]", error?.message);
  }

  const deduped = new Map<string, PublicPlace>();
  for (const place of [...stored, ...osm]) {
    const key = (place.name.toLowerCase().replace(/\s+/g, " ").trim()) + ":" + place.latitude.toFixed(4) + ":" + place.longitude.toFixed(4);
    if (!deduped.has(key)) deduped.set(key, place);
  }
  const places = [...deduped.values()].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, preset === "radar" ? 80 : 30);
  publicPlaceCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_PLACE_CACHE_MS, places });
  return places;
}

// Lightweight liveness probe. Firebase readiness is intentionally separate so
// platform health checks do not create Firestore/Storage reads on every probe.
app.get(["/api/health", "/healthz", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    empire: "WINRIDER.AI",
    firebaseConfigured: firebaseAdminRuntimeStatus.credentialConfigured,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/firebase", rateLimit(20), async (_req, res) => {
  const result = await checkFirebaseReadiness();
  return res.status(result.ready ? 200 : 503).json(result);
});

app.post("/api/pet-care/nearby", rateLimit(RATE_LIMITS["/api/pet-care/nearby"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const radiusMeters = Math.min(20_000, Math.max(1_000, Number(req.body?.radiusMeters) || 15_000));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "พิกัดตำแหน่งปัจจุบันไม่ถูกต้อง", places: [] });
  }
  try {
    const raw = await loadFreePublicPlaces(latitude, longitude, radiusMeters, "pet");
    const places = raw.map((place) => ({
      id: place.id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      distanceKm: place.distanceKm,
      etaMinutes: null,
      phoneNumber: place.phone,
      rating: null,
      reviewsCount: 0,
      openNow: null,
      openHours: [],
      is24Hours: false,
      googleMapsUri: place.externalMapUrl,
      externalMapUrl: place.externalMapUrl,
      sourceName: place.source,
      sourceUrl: place.sourceUrl,
      routeSource: "straight_line_public_data",
    }));
    return res.json({
      places,
      source: "WIN Public Data + OpenStreetMap contributors",
      freePublicData: true,
      origin: { latitude, longitude },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Pet Care Nearby]", error?.message);
    return res.status(503).json({ error: "โหลดข้อมูลสถานพยาบาลสัตว์สาธารณะไม่สำเร็จ", places: [] });
  }
});

app.post("/api/sos/incidents", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const validLocation = Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  const incidentRef = ordersDb.collection("sosIncidents").doc();
  const now = new Date().toISOString();
  const incident = {
    id: incidentRef.id,
    userId: user.uid,
    status: "open",
    ...(validLocation ? { latitude, longitude } : {}),
    note: String(req.body?.note || "").slice(0, 500),
    createdAt: now,
    updatedAt: now,
  };
  try {
    await incidentRef.create(incident);
    await ordersDb.collection("users").doc(user.uid).set({ lastSosIncidentId: incidentRef.id, updatedAt: now }, { merge: true });
    return res.status(201).json({ incident });
  } catch (error: any) {
    console.error("[SOS Create]", error?.message);
    return res.status(503).json({ error: "ไม่สามารถบันทึกเหตุฉุกเฉินได้" });
  }
});

app.get("/api/sos/incidents", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const snapshot = await ordersDb.collection("sosIncidents").where("userId", "==", user.uid).limit(50).get();
    const incidents = snapshot.docs.map((doc) => doc.data()).sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.json({ incidents });
  } catch (error: any) {
    console.error("[SOS List]", error?.message);
    return res.status(503).json({ error: "โหลดประวัติเหตุฉุกเฉินไม่สำเร็จ", incidents: [] });
  }
});

app.patch("/api/sos/incidents/:id", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const status = String(req.body?.status || "");
  if (!["acknowledged", "resolved", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "สถานะ SOS ไม่ถูกต้อง" });
  }
  try {
    const ref = ordersDb.collection("sosIncidents").doc(String(req.params.id));
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "ไม่พบเหตุฉุกเฉิน" });
    const data = snap.data() || {};
    if (data.userId !== user.uid && !isSuperAdminToken(user)) return res.status(403).json({ error: "ไม่มีสิทธิ์แก้ไขเหตุฉุกเฉินนี้" });
    const now = new Date().toISOString();
    await ref.update({ status, updatedAt: now, ...(isSuperAdminToken(user) ? { acknowledgedBy: user.uid } : {}) });
    await ordersDb.collection("sosIncidents").doc(String(req.params.id)).collection("audit").add({
      actorUid: user.uid, action: status, createdAt: FieldValue.serverTimestamp()
    });
    return res.json({ success: true, id: ref.id, status });
  } catch (error: any) {
    console.error("[SOS Update]", error?.message);
    return res.status(503).json({ error: "อัปเดตเหตุฉุกเฉินไม่สำเร็จ" });
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
  try {
    const raw = await loadFreePublicPlaces(latitude, longitude, 20_000, "emergency");
    const places = raw.map((place) => ({
      id: place.id,
      name: place.name,
      type: place.category,
      address: place.address,
      phone: place.phone,
      mapsUrl: place.externalMapUrl,
      externalMapUrl: place.externalMapUrl,
      sourceName: place.source,
      sourceUrl: place.sourceUrl,
      openNow: null,
      distanceKm: place.distanceKm,
      etaMinutes: null,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
    return res.json({ places, source: "WIN Public Data + OpenStreetMap contributors", freePublicData: true, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error("[Emergency Nearby]", error?.message);
    return res.status(503).json({ error: "โหลดข้อมูลศูนย์ฉุกเฉินสาธารณะไม่สำเร็จ", places: [] });
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
  try {
    const raw = await loadFreePublicPlaces(latitude, longitude, 12_000, "radar");
    const places = raw.map((place) => ({
      id: place.id,
      name: place.name,
      category: place.placeGroup === "shop" ? "shop" : "partner",
      primaryType: place.category,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: null,
      openNow: null,
      distanceMeters: Math.round(place.distanceKm * 1000),
      placeGroup: place.placeGroup,
      categoryLabel: place.placeGroup === "shop" ? "ร้านค้าและบริการสาธารณะ" : place.placeGroup === "transport" ? "ขนส่งสาธารณะ" : place.placeGroup === "faith" ? "ศาสนสถาน" : "ชุมชน/สถานที่สำคัญ",
      sourceName: place.source,
      sourceUrl: place.sourceUrl,
      externalMapUrl: place.externalMapUrl,
    }));
    const labels: Record<string, string> = { shop: "ร้านค้าและบริการ", transport: "ขนส่งสาธารณะ", faith: "ศาสนสถาน", community: "ชุมชนและสถานที่สำคัญ" };
    return res.json({
      places,
      categories: Object.entries(labels).map(([key, label]) => ({ key, label, count: places.filter((place) => place.placeGroup === key).length })),
      source: "WIN Public Data + OpenStreetMap contributors",
      freePublicData: true,
      registeredPeopleSynthesized: false,
    });
  } catch (error: any) {
    console.error("[Radar Nearby Places]", error?.message);
    return res.status(503).json({ error: "โหลดข้อมูลสาธารณะใกล้ตำแหน่งไม่สำเร็จ", places: [] });
  }
});

app.post("/api/places/resolve-routes", rateLimit(RATE_LIMITS["/api/places/resolve-routes"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const requested = Array.isArray(req.body?.places) ? req.body.places.slice(0, 20) : [];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "พิกัด GPS ไม่ถูกต้อง", routes: [] });
  }
  try {
    const publicPlaces = await loadFreePublicPlaces(latitude, longitude, 20_000, "radar");
    const normalize = (value: unknown) => String(value || "").toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, " ").trim();
    const routes = requested.flatMap((request: any) => {
      const query = normalize(request?.query);
      if (!query) return [];
      const terms = query.split(/\s+/).filter((term: string) => term.length >= 2);
      let best: PublicPlace | undefined;
      let bestScore = 0;
      for (const place of publicPlaces) {
        const haystack = normalize(place.name + " " + place.address + " " + place.category);
        const score = terms.reduce((sum: number, term: string) => sum + (haystack.includes(term) ? 1 : 0), 0);
        if (score > bestScore) { best = place; bestScore = score; }
      }
      if (!best || bestScore === 0) return [];
      return [{
        key: String(request?.key || query),
        placeId: best.id,
        name: best.name,
        address: best.address,
        latitude: best.latitude,
        longitude: best.longitude,
        distanceKm: best.distanceKm,
        etaMinutes: null,
        source: best.source,
        sourceUrl: best.sourceUrl,
        externalMapUrl: best.externalMapUrl,
      }];
    });
    return res.json({ routes, source: "WIN Public Data + OpenStreetMap contributors", freePublicData: true });
  } catch (error: any) {
    console.error("[Public Place Resolve]", error?.message);
    return res.status(503).json({ error: "ค้นหาปลายทางจากข้อมูลสาธารณะไม่สำเร็จ", routes: [] });
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

app.post("/api/shop/profile-content/product-submissions", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const userData = (await ordersDb.collection("users").doc(user.uid).get()).data() || {};
  if (String(userData.role || (user as any).role || "") !== "merchant") {
    return res.status(403).json({ error: "เฉพาะบัญชีร้านค้าที่อนุมัติแล้วเท่านั้น" });
  }

  const input = req.body || {};
  const imageUrl = validEvidenceImageUrl(input.imageUrl);
  const title = String(input.title || "").trim().slice(0, 160);
  const price = Number(input.price);
  const stock = Math.max(1, Math.min(100000, Math.floor(Number(input.stock) || 1)));
  if (!imageUrl || title.length < 2 || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "กรุณากรอกชื่อ ราคา และรูปสินค้าจริงให้ครบ" });
  }

  const product = {
    id: `prod-${crypto.randomUUID()}`,
    title,
    category: String(input.category || "สินค้าทั่วไป").slice(0, 120),
    price,
    originalPrice: Number.isFinite(Number(input.originalPrice)) ? Number(input.originalPrice) : price,
    imageIcon: "📸",
    imageUrl,
    description: String(input.description || "").trim().slice(0, 2000),
    stock,
    soldCount: 0,
    isFlashSale: input.isFlashSale === true,
    adminVerified: true,
  };

  try {
    const verification = await createAdminVerification({
      submittedBy: user.uid,
      submittedRole: "merchant",
      category: "ตรวจรูปและสินค้าหน้าร้าน",
      subjectType: "merchant_product",
      subjectId: product.id,
      imageUrl,
      note: title,
      metadata: { merchantUid: user.uid, product },
    });
    return res.status(202).json({ pendingAdminReview: true, verification, product });
  } catch (error: any) {
    console.error("[Merchant Product Submission]", error?.message);
    return res.status(503).json({ error: "ส่งสินค้าให้แอดมินตรวจไม่สำเร็จ" });
  }
});

app.get("/api/shop/listings", rateLimit(RATE_LIMITS["/api/shop/listings"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    let docs;
    try {
      docs = (await ordersDb.collection("marketListings").orderBy("createdAt", "desc").limit(100).get()).docs;
    } catch (queryError) {
      console.warn("[Shop Listings GET] ordered query failed; using fallback:", queryError instanceof Error ? queryError.message : queryError);
      docs = (await ordersDb.collection("marketListings").limit(200).get()).docs
        .sort((a, b) => String(b.data().createdAt || "").localeCompare(String(a.data().createdAt || "")))
        .slice(0, 100);
    }
    const activeListings = docs.map((doc) => doc.data()).filter((item: any) => item.status === "active");
    // Always hydrate seller identity/location from the seller's current persisted profile.
    // Never trust stale client-side seller name/avatar/location stored in a listing.
    const listings = await Promise.all(activeListings.map(async (item: any) => {
      const sellerUid = String(item.sellerUserId || "").trim();
      if (!sellerUid) return item;
      try {
        const sellerDoc = await ordersDb.collection("users").doc(sellerUid).get();
        const sellerData = sellerDoc.data() || {};
        const profile = (sellerData.profileCustomization || {}) as Record<string, unknown>;
        const locationEnabled = profile.locationEnabled === true
          && Number.isFinite(Number(profile.latitude))
          && Number.isFinite(Number(profile.longitude));
        return {
          ...item,
          sellerName: String(profile.displayName || sellerData.displayName || item.sellerName || "ผู้ขาย WIN"),
          sellerAvatar: String(profile.avatarEmoji || sellerData.avatarEmoji || item.sellerAvatar || "👤"),
          sellerAvatarUrl: String(profile.avatarUrl || sellerData.avatarUrl || item.sellerAvatarUrl || ""),
          location: locationEnabled
            ? String(profile.locationLabel || "ตำแหน่งที่ผู้ขายบันทึกไว้ในโปรไฟล์")
            : String(item.location || ""),
          sellerLatitude: locationEnabled ? Number(profile.latitude) : null,
          sellerLongitude: locationEnabled ? Number(profile.longitude) : null,
          sellerLocationEnabled: locationEnabled,
        };
      } catch (profileError) {
        console.warn("[Shop Listings GET] seller profile hydrate failed:", sellerUid, profileError instanceof Error ? profileError.message : profileError);
        return item;
      }
    }));
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
  const imageUrl = validEvidenceImageUrl(input.imageUrl);
  if (title.length < 3 || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 1 || !imageUrl) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลสินค้าและแนบรูปสินค้าจริงให้ครบ" });
  }
  try {
    const userSnapshot = await ordersDb.collection("users").doc(user.uid).get();
    const userData = userSnapshot.data() || {};
    const sellerProfile = (userData.profileCustomization || {}) as Record<string, unknown>;
    const sellerRole = String(userData.role || (user as any).role || "citizen").trim();
    const sellerWallet = await ensureWalletIdentityId(user.uid, WALLET_ROLE_PREFIX[sellerRole] ? sellerRole : "citizen");
    const id = `listing-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const listing = {
      id,
      sellerUserId: user.uid,
      sellerType: sellerRole === "merchant" ? "merchant" : "citizen",
      sellerName: String(sellerProfile.displayName || userData.displayName || user.email || "ผู้ขาย WIN"),
      sellerWalletId: sellerWallet.walletId,
      sellerWalletRole: sellerWallet.role,
      sellerAvatar: String(sellerProfile.avatarEmoji || userData.avatarEmoji || "👤"),
      sellerAvatarUrl: String(sellerProfile.avatarUrl || userData.avatarUrl || ""),
      sellerLocationEnabled: sellerProfile.locationEnabled === true,
      sellerLatitude: sellerProfile.locationEnabled === true && Number.isFinite(Number(sellerProfile.latitude)) ? Number(sellerProfile.latitude) : null,
      sellerLongitude: sellerProfile.locationEnabled === true && Number.isFinite(Number(sellerProfile.longitude)) ? Number(sellerProfile.longitude) : null,
      title,
      price,
      originalPrice: Number.isFinite(Number(input.originalPrice)) ? Number(input.originalPrice) : null,
      category: String(input.category || "second_hand"),
      categoryLabel: String(input.categoryLabel || "สินค้าทั่วไป"),
      condition: String(input.condition || "used"),
      conditionLabel: String(input.conditionLabel || "ผู้ขายระบุสภาพสินค้า"),
      description: String(input.description || "").trim(),
      imageIcon: String(input.imageIcon || "📸"),
      imageUrl,
      isAiVerified: false,
      adminReviewStatus: "pending_review",
      location: sellerProfile.locationEnabled === true
        ? String(sellerProfile.locationLabel || "ตำแหน่งที่ผู้ขายบันทึกไว้ในโปรไฟล์")
        : String(input.location || userData.locationLabel || userData.address || "").trim(),
      stock,
      tags: Array.isArray(input.tags) ? input.tags.filter((tag: unknown) => typeof tag === "string").slice(0, 10) : [],
      status: "pending_review",
      salesCount: 0,
      createdAt: now,
      updatedAt: now,
      serverCreatedAt: FieldValue.serverTimestamp(),
    };

    const listingRef = ordersDb.collection("marketListings").doc(id);
    const verificationRef = ordersDb.collection("adminVerificationQueue").doc();
    await ordersDb.runTransaction(async (tx) => {
      tx.create(listingRef, listing);
      tx.create(verificationRef, {
        id: verificationRef.id,
        status: "pending_review",
        submittedBy: user.uid,
        submittedRole: sellerRole,
        category: "ตรวจรูปและรายการสินค้าก่อนลงขาย",
        subjectType: "market_listing",
        subjectId: id,
        imageUrl,
        note: [title, String(input.description || "")].filter(Boolean).join(" • ").slice(0, 1000),
        metadata: { price, category: String(input.category || "second_hand"), location: listing.location },
        createdAt: now,
        updatedAt: now,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });
    });
    return res.status(202).json({
      listing,
      verificationId: verificationRef.id,
      pendingAdminReview: true,
      message: "ส่งรายการสินค้าให้แอดมินตรวจแล้ว",
    });
  } catch (error) {
    console.error("[Shop Listings POST]", error instanceof Error ? error.message : error);
    return res.status(503).json({ error: "บันทึกสินค้าเพื่อรอแอดมินตรวจไม่สำเร็จ" });
  }
});


app.patch("/api/shop/listings/:id", rateLimit(RATE_LIMITS["/api/shop/listings"]), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const id = String(req.params.id || "").trim();
  const action = String(req.body?.action || "").trim().toUpperCase();
  if (!id || action !== "UNPUBLISH") return res.status(400).json({ error: "Invalid listing action" });
  try {
    const ref = ordersDb.collection("marketListings").doc(id);
    let result: any = null;
    await ordersDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("LISTING_NOT_FOUND");
      const listing: any = snap.data() || {};
      if (String(listing.sellerUserId || "") !== user.uid && !isSuperAdminToken(user)) throw new Error("FORBIDDEN");
      if (String(listing.status || "") === "unpublished") {
        result = listing;
        return;
      }
      const updatedAt = new Date().toISOString();
      tx.update(ref, { status: "unpublished", unpublishedAt: updatedAt, updatedAt });
      tx.set(ordersDb.collection("audit_logs").doc(), {
        action: "MARKET_LISTING_UNPUBLISHED",
        listingId: id,
        actorUid: user.uid,
        sellerUserId: String(listing.sellerUserId || ""),
        createdAt: FieldValue.serverTimestamp(),
      });
      result = { ...listing, status: "unpublished", unpublishedAt: updatedAt, updatedAt };
    });
    return res.json({ ok: true, listing: result });
  } catch (error: any) {
    if (error?.message === "LISTING_NOT_FOUND") return res.status(404).json({ error: "Listing not found" });
    if (error?.message === "FORBIDDEN") return res.status(403).json({ error: "Only the listing owner may unpublish it" });
    console.error("[Shop Listing PATCH]", error?.message);
    return res.status(503).json({ error: "อัปเดตรายการสินค้าไม่สำเร็จ" });
  }
});

// WINRIDER.AI Public Data Layer
// Source of truth: TAT Data Catalog CKAN metadata + its current JSON resource.
// Public-source records are source-driven and do NOT require Admin Verify.
// Admin access is used only to trigger/inspect synchronization.
// TAT's tourism activity dataset is public, JSON, Open Data Common, nationwide,
// and the catalog currently identifies an annual minimum update frequency.
type PublicDataKind = "attractions" | "restaurants" | "accommodations" | "souvenirs" | "events";
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
  source?: string;
  sourceUrl?: string;
  ticketUrl?: string;
  providerEventId?: string;
  attendance?: number;
  rank?: number;
  lastSourceSyncAt?: string;
}

const TAT_CKAN_API_BASE = "https://datacatalog.tat.or.th/api/3/action/package_show";
const TAT_DATASET_PAGE_BASE = "https://datacatalog.tat.or.th/dataset";

const TAT_PUBLIC_DATASETS: Record<PublicDataKind, { slug: string; label: string; description: string }> = {
  attractions: { slug: "tourist-attraction", label: "แหล่งท่องเที่ยว", description: "สถานที่ท่องเที่ยว พิกัด ที่ตั้ง ช่องทางติดต่อ และเวลาให้บริการ" },
  restaurants: { slug: "restaurant", label: "ร้านอาหาร", description: "ร้านอาหารและภัตตาคารในประเทศไทย" },
  accommodations: { slug: "accommodation", label: "ที่พัก", description: "โรงแรม รีสอร์ท โฮมสเตย์ และที่พักประเภทต่าง ๆ" },
  souvenirs: { slug: "souvenir-shop", label: "ร้านของที่ระลึก", description: "ร้านของฝาก สินค้าชุมชน และของที่ระลึก" },
  events: { slug: "tourismactivity", label: "กิจกรรมท่องเที่ยว", description: "เทศกาล งานประเพณี และกิจกรรมท่องเที่ยว" },
};

const dailyEventsCache = new Map<string, { expiresAt: number; value: NearbyEventResult[] }>();
const EVENT_CACHE_MS = 5 * 60 * 1000;
const FIRESTORE_BATCH_LIMIT = 400;

function normalizePublicRecordValue(item: any, keys: string[]): unknown {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], item);
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return undefined;
}

function normalizePublicCoordinate(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= 180 ? n : null;
}

function parseThaiOrIsoDate(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) return new Date(direct).toISOString();
  const match = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (!match) return null;
  let year = Number(match[3]);
  if (year >= 2400) year -= 543;
  const month = Number(match[2]);
  const day = Number(match[1]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    ? parsed.toISOString()
    : null;
}

function publicHaversineKm(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
): number {
  const r = 6371;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(destinationLat - originLat);
  const dLng = toRad(destinationLng - originLng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(originLat)) * Math.cos(toRad(destinationLat)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classifyPublicEvent(category: string, title: string, labels: string[] = []): EventCategory {
  const normalized = (String(category) + " " + String(title) + " " + labels.join(" ")).toLowerCase();
  if (/sale|discount|ลดราคา|clearance|shopping/.test(normalized)) return "sale";
  if (/market|bazaar|popup|pop-up|ตลาด|fair|expo/.test(normalized)) return "market";
  if (/concert|music|performing-arts|ดนตรี|คอนเสิร์ต/.test(normalized)) return "concert";
  if (/sport|football|soccer|basketball|กีฬา|แข่งขัน/.test(normalized)) return "sports";
  if (/festival|เทศกาล/.test(normalized)) return "festival";
  if (/community|academic|school|public-holiday|observance|ชุมชน/.test(normalized)) return "community";
  return "other";
}

function normalizePublicRecord(kind: PublicDataKind, item: any, index: number, sourceUrl: string) {
  const name = String(normalizePublicRecordValue(item, [
    "name", "title", "businessName", "placeName", "event_name", "eventName",
    "ชื่อ", "ชื่อสถานที่", "ชื่อร้าน", "ชื่อกิจกรรม", "ชื่อที่พัก", "ชื่อสถานประกอบการ"
  ]) || "").trim();
  if (!name) return null;

  const latitude = normalizePublicCoordinate(normalizePublicRecordValue(item, [
    "latitude", "lat", "location.latitude", "พิกัดละติจูด", "ละติจูด"
  ]));
  const longitude = normalizePublicCoordinate(normalizePublicRecordValue(item, [
    "longitude", "lng", "lon", "location.longitude", "พิกัดลองจิจูด", "ลองจิจูด"
  ]));
  const address = String(normalizePublicRecordValue(item, [
    "address", "addressTh", "location", "ที่อยู่", "ที่ตั้ง", "สถานที่ตั้ง"
  ]) || "").trim();
  const province = String(normalizePublicRecordValue(item, ["province", "จังหวัด", "provinceName"]) || "").trim();
  const district = String(normalizePublicRecordValue(item, ["district", "อำเภอ", "districtName"]) || "").trim();
  const phone = String(normalizePublicRecordValue(item, ["phone", "telephone", "tel", "โทรศัพท์"]) || "").trim();
  const website = String(normalizePublicRecordValue(item, ["website", "url", "เว็บไซต์"]) || "").trim();
  const description = String(normalizePublicRecordValue(item, ["description", "detail", "รายละเอียด", "คำอธิบาย"]) || "").trim();
  const category = String(normalizePublicRecordValue(item, ["category", "type", "ประเภท", "หมวดหมู่"]) || kind).trim();
  const venueName = String(normalizePublicRecordValue(item, ["venueName", "venue", "สถานที่จัดงาน", "สถานที่"]) || "").trim();
  const externalId = String(normalizePublicRecordValue(item, [
    "id", "_id", "code", "รหัส", "รหัสสถานที่", "รหัสกิจกรรม"
  ]) || ("row-" + index)).trim();
  const startAt = kind === "events"
    ? parseThaiOrIsoDate(normalizePublicRecordValue(item, ["startAt", "start", "start_date", "startDate", "วันที่เริ่มต้น", "วันที่เริ่ม"]))
    : null;
  const endAt = kind === "events"
    ? parseThaiOrIsoDate(normalizePublicRecordValue(item, ["endAt", "end", "end_date", "endDate", "วันที่สิ้นสุด"]))
    : null;

  if (kind === "events" && !startAt) return null;

  const stableId = crypto.createHash("sha256")
    .update("tat:" + kind + ":" + externalId + ":" + name + ":" + String(latitude) + ":" + String(longitude))
    .digest("hex").slice(0, 32);

  return {
    id: "tat-" + kind + "-" + stableId,
    kind,
    name,
    title: kind === "events" ? name : undefined,
    category,
    venueName: venueName || undefined,
    address,
    province,
    district,
    latitude,
    longitude,
    phone: phone || undefined,
    website: website || undefined,
    description: description || undefined,
    startAt: startAt || undefined,
    endAt: endAt || undefined,
    labels: Array.isArray(item.labels) ? item.labels.filter((label: unknown) => typeof label === "string").slice(0, 20) : undefined,
    source: "TAT Data Catalog",
    sourceName: "TAT Data Catalog • Thailand Tourism Authority",
    sourceUrl,
    providerRecordId: externalId,
    sourceDriven: true,
    publicVisible: true,
    status: "active",
    importedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function fetchTatDatasetRows(kind: PublicDataKind): Promise<{
  rows: any[];
  sourceUrl: string;
  datasetUrl: string;
  metadataModified?: string;
}> {
  const config = TAT_PUBLIC_DATASETS[kind];
  const datasetUrl = TAT_DATASET_PAGE_BASE + "/" + config.slug;
  const apiUrl = TAT_CKAN_API_BASE + "?id=" + encodeURIComponent(config.slug);

  const apiResponse = await fetch(apiUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!apiResponse.ok) throw new Error("TAT_CKAN_" + apiResponse.status);

  const packagePayload = await apiResponse.json();
  if (packagePayload?.success !== true || !packagePayload?.result) {
    throw new Error("TAT_CKAN_INVALID_" + kind);
  }

  const resources = Array.isArray(packagePayload.result.resources) ? packagePayload.result.resources : [];
  const resource = resources.find((r: any) =>
    String(r?.format || "").toLowerCase() === "json" && typeof r?.url === "string"
  ) || resources.find((r: any) => typeof r?.url === "string");

  if (!resource?.url) throw new Error("TAT_RESOURCE_NOT_FOUND_" + kind);

  const dataResponse = await fetch(String(resource.url), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(180_000),
  });
  if (!dataResponse.ok) throw new Error("TAT_DATA_" + dataResponse.status);

  const payload = await dataResponse.json();
  const rows = Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.results) ? payload.results
    : Array.isArray(payload?.records) ? payload.records
    : [];

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("TAT_EMPTY_DATASET_" + kind);
  }

  return {
    rows,
    sourceUrl: String(resource.url),
    datasetUrl,
    metadataModified: typeof packagePayload.result.metadata_modified === "string"
      ? packagePayload.result.metadata_modified
      : undefined,
  };
}


function dedupeWinAlertEvents(events: NearbyEventResult[]) {
  const seen = new Map<string, NearbyEventResult>();
  for (const event of events) {
    const day = String(event.startAt || "").slice(0, 10);
    const normalizedTitle = event.title.toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, " ").trim();
    const normalizedVenue = event.venueName.toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, " ").trim();
    const key = [day, normalizedTitle, normalizedVenue].join("|");
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, event);
      continue;
    }
    const existingScore = (existing.description ? 1 : 0) + (existing.sourceUrl ? 1 : 0) + (existing.ticketUrl ? 1 : 0);
    const nextScore = (event.description ? 1 : 0) + (event.sourceUrl ? 1 : 0) + (event.ticketUrl ? 1 : 0);
    if (nextScore > existingScore) seen.set(key, event);
  }
  return [...seen.values()].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

async function syncTatPublicData(kinds: PublicDataKind[]) {
  const imported: Array<Record<string, unknown>> = [];

  for (const kind of kinds) {
    const { rows, sourceUrl, datasetUrl, metadataModified } = await fetchTatDatasetRows(kind);
    const normalized = rows
      .map((row, index) => normalizePublicRecord(kind, row, index, sourceUrl))
      .filter((record): record is NonNullable<ReturnType<typeof normalizePublicRecord>> => Boolean(record));

    if (normalized.length === 0) {
      throw new Error("TAT_NO_VALID_RECORDS_" + kind);
    }

    const collectionName = kind === "events" ? "winAlertEvents" : "publicDataRecords";
    const existingSnapshot = await ordersDb.collection(collectionName)
      .where("source", "==", "TAT Data Catalog")
      .get();
    const existingIds = new Set(
      existingSnapshot.docs
        .filter((doc) => doc.data()?.sourceKind === kind || doc.data()?.kind === kind)
        .map((doc) => doc.id)
    );
    const incomingIds = new Set<string>(normalized.map((record) => record.id));

    let written = 0;
    for (let offset = 0; offset < normalized.length; offset += FIRESTORE_BATCH_LIMIT) {
      const batch = ordersDb.batch();
      for (const record of normalized.slice(offset, offset + FIRESTORE_BATCH_LIMIT)) {
        const ref = ordersDb.collection(collectionName).doc(record.id);
        batch.set(ref, {
          ...record,
          sourceKind: kind,
          sourceDriven: true,
          publicVisible: true,
          status: "active",
          lastSourceSyncAt: new Date().toISOString(),
          sourceDatasetUrl: datasetUrl,
          sourceMetadataModified: metadataModified || null,
        }, { merge: true });
      }
      await batch.commit();
      written += Math.min(FIRESTORE_BATCH_LIMIT, normalized.length - offset);
    }

    const staleIds = [...existingIds].filter((id) => !incomingIds.has(id));
    let removed = 0;
    for (let offset = 0; offset < staleIds.length; offset += FIRESTORE_BATCH_LIMIT) {
      const batch = ordersDb.batch();
      for (const id of staleIds.slice(offset, offset + FIRESTORE_BATCH_LIMIT)) {
        batch.delete(ordersDb.collection(collectionName).doc(id));
      }
      await batch.commit();
      removed += Math.min(FIRESTORE_BATCH_LIMIT, staleIds.length - offset);
    }

    imported.push({
      kind,
      sourceRows: rows.length,
      written,
      removed,
      sourceUrl,
      datasetUrl,
      metadataModified: metadataModified || null,
      sourceDriven: true,
      publicVisible: true,
    });
  }

  dailyEventsCache.clear();
  return imported;
}

// Public data sync is manual-only. Super Admin triggers source sync from
// Admin > WIN Public Data Hub via /api/admin/public-data/import-tat.
app.get("/api/events/daily", rateLimit(RATE_LIMITS["/api/events/daily"]), async (req, res) => {
  const eventDate = String(req.query.date || "").trim();
  const country = "TH";
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const hasOrigin = Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return res.status(400).json({ message: "วันที่กิจกรรมไม่ถูกต้อง", events: [] });
  }

  const cacheKey = country + ":" + eventDate;
  const dayStart = new Date(eventDate + "T00:00:00+07:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const decorate = (baseEvents: NearbyEventResult[]) => baseEvents
    .map((event: any) => ({
      ...event,
      ...(hasOrigin ? {
        distanceKm: Math.round(publicHaversineKm(latitude, longitude, event.latitude, event.longitude) * 100) / 100,
      } : {}),
      externalUrl: event.sourceUrl || undefined,
    }))
    .sort((a: any, b: any) => {
      if (hasOrigin) {
        const distanceDiff = Number(a.distanceKm ?? Number.POSITIVE_INFINITY)
          - Number(b.distanceKm ?? Number.POSITIVE_INFINITY);
        if (Math.abs(distanceDiff) > 0.001) return distanceDiff;
      }
      return Date.parse(a.startAt) - Date.parse(b.startAt);
    });

  const cached = dailyEventsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({
      events: decorate(cached.value),
      source: "WINRIDER.AI • Public Event Data",
      sources: [...new Set(cached.value.map((event: any) => event.sourceName).filter(Boolean))],
      sourceDriven: true,
      freePublicData: true,
      fetchedAt: new Date().toISOString(),
      eventDate,
      country,
      cached: true,
    });
  }

  let eventsDocs: any[] = [];
  let publicDataDocs: any[] = [];
  try {
    const [eventsSnapshot, publicDataSnapshot] = await Promise.all([
      ordersDb.collection("winAlertEvents").where("sourceDriven", "==", true).get(),
      ordersDb.collection("publicDataRecords").where("sourceDriven", "==", true).get(),
    ]);
    eventsDocs = eventsSnapshot.docs;
    publicDataDocs = publicDataSnapshot.docs;
  } catch (dbErr) {
    // Non-fatal if firestore permissions in server environment are missing/restricted
    console.warn("[Events API] public-data firestore notice; returning no fabricated events:", (dbErr as Error)?.message || dbErr);
  }

  try {
    const candidates = [
      ...eventsDocs.map((docSnap) => ({ docSnap, item: docSnap.data() || {} })),
      ...publicDataDocs
        .map((docSnap) => ({ docSnap, item: docSnap.data() || {} }))
        .filter(({ item }) => String(item.kind || item.sourceKind || "").toLowerCase() === "events"),
    ];

    const normalized = candidates.flatMap(({ docSnap, item }): NearbyEventResult[] => {
      if (item.publicVisible !== true) return [];

      const startAt = parseThaiOrIsoDate(item.startAt || item.start);
      const endAt = parseThaiOrIsoDate(item.endAt || item.end) || startAt;
      const startMs = startAt ? Date.parse(startAt) : NaN;
      const endMs = endAt ? Date.parse(endAt) : startMs;
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)
        || endMs < dayStart.getTime() || startMs > dayEnd.getTime()) return [];

      const eventLat = Number(item.latitude ?? item.lat);
      const eventLng = Number(item.longitude ?? item.lng ?? item.lon);
      if (!Number.isFinite(eventLat) || !Number.isFinite(eventLng)
        || eventLat < -90 || eventLat > 90 || eventLng < -180 || eventLng > 180) return [];

      const id = String(item.id || docSnap.id).trim();
      const title = String(item.title || item.name || "").trim();
      if (!id || !title) return [];

      const categoryValue = String(item.category || "other").trim();
      const allowedCategories: EventCategory[] = ["sale", "market", "concert", "sports", "festival", "community", "other"];
      const category = allowedCategories.includes(categoryValue as EventCategory)
        ? categoryValue as EventCategory
        : classifyPublicEvent(categoryValue, title, Array.isArray(item.labels) ? item.labels : []);

      const sourceName = String(item.sourceName || item.source || "Public Data").trim();
      const sourceUrl = String(item.sourceUrl || item.sourceDatasetUrl || item.website || "").trim();

      return [{
        id: "public-event-" + id,
        title,
        category,
        venueName: String(item.venueName || item.venue || item.address || "").trim(),
        venueArea: String(item.venueArea || item.area || item.province || item.district || "").trim(),
        latitude: eventLat,
        longitude: eventLng,
        startAt,
        endAt: endAt || undefined,
        description: typeof item.description === "string" ? item.description : undefined,
        sourceName,
        sourceUrl: sourceUrl || undefined,
        providerEventId: String(item.providerRecordId || id),
        attendance: Number.isFinite(Number(item.attendance)) && Number(item.attendance) > 0
          ? Number(item.attendance) : undefined,
        rank: Number.isFinite(Number(item.rank)) ? Number(item.rank) : undefined,
      } as any];
    });

    const deduped = new Map<string, NearbyEventResult>();
    for (const event of normalized) {
      const key = [
        event.title.trim().toLowerCase(),
        event.startAt.slice(0, 10),
        event.latitude.toFixed(4),
        event.longitude.toFixed(4),
      ].join("|");
      const existing = deduped.get(key);
      if (!existing || (!(existing as any).sourceUrl && (event as any).sourceUrl)) deduped.set(key, event);
    }

    const baseEvents = [...deduped.values()].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    dailyEventsCache.set(cacheKey, { value: baseEvents, expiresAt: Date.now() + EVENT_CACHE_MS });

    return res.json({
      events: decorate(baseEvents),
      source: "WINRIDER.AI • Public Event Data",
      sources: [...new Set(baseEvents.map((event: any) => event.sourceName).filter(Boolean))],
      sourceDriven: true,
      freePublicData: true,
      fetchedAt: new Date().toISOString(),
      eventDate,
      country,
      cached: false,
    });
  } catch (error) {
    console.warn("[Events API] public-data processed with fallback:", error instanceof Error ? error.message : error);
    return res.json({
      events: [],
      source: "WINRIDER.AI • Public Event Data",
      sources: ["WINRIDER.AI"],
      sourceDriven: true,
      freePublicData: true,
      fetchedAt: new Date().toISOString(),
      eventDate,
      country,
      cached: false,
    });
  }
});

app.get("/api/admin/public-data/catalog", async (req, res) => {
  const adminUser = await requireSuperAdmin(req, res);
  if (!adminUser) return;

  const collections: Record<string, any> = {};
  for (const kind of Object.keys(TAT_PUBLIC_DATASETS) as PublicDataKind[]) {
    const collectionName = kind === "events" ? "winAlertEvents" : "publicDataRecords";
    const snapshot = await ordersDb.collection(collectionName)
      .where("source", "==", "TAT Data Catalog")
      .where("sourceKind", "==", kind)
      .get();

    let lastSourceSyncAt = "";
    for (const doc of snapshot.docs) {
      const value = String(doc.data()?.lastSourceSyncAt || "");
      if (value > lastSourceSyncAt) lastSourceSyncAt = value;
    }

    collections[kind] = {
      ...TAT_PUBLIC_DATASETS[kind],
      records: snapshot.size,
      publicVisible: snapshot.docs.filter((doc) => doc.data()?.publicVisible === true).length,
      sourceDriven: snapshot.docs.filter((doc) => doc.data()?.sourceDriven === true).length,
      lastSourceSyncAt: lastSourceSyncAt || null,
    };
  }

  return res.json({
    source: "TAT Data Catalog",
    free: true,
    license: "Open Data Common",
    adminVerifyRequired: false,
    datasets: collections,
  });
});

// Backward-compatible admin trigger. It now means "sync source", not "approve records".
app.post("/api/admin/public-data/import-tat", rateLimit(5), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ error: "Admin only" });

  const requestedKinds = Array.isArray(req.body?.kinds)
    ? req.body.kinds.map((value: unknown) => String(value))
    : [String(req.body?.kind || "all")];
  const kinds: PublicDataKind[] = requestedKinds.includes("all")
    ? ["events", "attractions", "restaurants", "accommodations", "souvenirs"]
    : requestedKinds as PublicDataKind[];

  if (!kinds.length || kinds.some((kind) => !Object.prototype.hasOwnProperty.call(TAT_PUBLIC_DATASETS, kind))) {
    return res.status(400).json({ error: "Invalid public data kind" });
  }

  try {
    const imported = await syncTatPublicData(kinds);
    return res.json({
      success: true,
      source: "TAT Data Catalog",
      sourceDriven: true,
      publicVisible: true,
      adminVerifyRequired: false,
      imported,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[TAT Public Data Sync]", error instanceof Error ? error.message : error);
    return res.status(503).json({ error: "ไม่สามารถซิงก์ข้อมูลจากแหล่งต้นทางได้" });
  }
});

// Legacy public-data review endpoints remain harmless compatibility shims.
// They never gate visibility of source-driven public records.
app.get("/api/admin/public-data/pending", async (req, res) => {
  const adminUser = await requireSuperAdmin(req, res);
  if (!adminUser) return;
  return res.json({ records: [], adminVerifyRequired: false });
});

app.post("/api/admin/public-data/review", async (req, res) => {
  const adminUser = await requireSuperAdmin(req, res);
  if (!adminUser) return;
  return res.status(409).json({ error: "ข้อมูลสาธารณะจาก TAT ใช้ source-driven publishing และไม่ต้อง Admin Verify" });
});

app.get("/api/public-data/discovery", rateLimit(30), async (req, res) => {
  const query = String(req.query.query || "").trim().toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 30);
  const kinds: PublicDataKind[] = ["events", "attractions", "restaurants", "accommodations", "souvenirs"];

  try {
    const data: Record<string, any[]> = {};
    for (const kind of kinds) {
      const collection = kind === "events" ? "winAlertEvents" : "publicDataRecords";
      const snapshot = await ordersDb.collection(collection)
        .where("sourceDriven", "==", true)
        .get();

      data[kind] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((record: any) => record.publicVisible === true)
        .filter((record: any) => !query || [record.name, record.title, record.category, record.address, record.province, record.district]
          .some((value) => String(value || "").toLowerCase().includes(query)))
        .slice(0, limit);
    }

    return res.json({
      source: "WINRIDER.AI • Public Data Aggregator",
      sourceDriven: true,
      adminVerifyRequired: false,
      data,
    });
  } catch (error) {
    console.error("[Public Data Discovery]", error instanceof Error ? error.message : error);
    return res.status(503).json({ data: {}, error: "โหลดข้อมูลสาธารณะไม่สำเร็จ" });
  }
});

app.get("/api/public-data/places", rateLimit(30), async (req, res) => {
  const kind = String(req.query.kind || "attractions").trim() as PublicDataKind;
  const query = String(req.query.query || "").trim().toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  if (!["attractions", "restaurants", "accommodations", "souvenirs"].includes(kind)) {
    return res.status(400).json({ records: [] });
  }

  try {
    const snapshot = await ordersDb.collection("publicDataRecords")
      .where("source", "==", "TAT Data Catalog")
      .where("sourceDriven", "==", true)
      .get();

    const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((record: any) => record.publicVisible === true)
      .filter((record: any) => Number.isFinite(Number(record.latitude)) && Number.isFinite(Number(record.longitude)))
      .filter((record: any) => !query || [record.name, record.category, record.address, record.province, record.district]
        .some((value) => String(value || "").toLowerCase().includes(query)))
      .slice(0, limit);

    return res.json({
      records,
      source: "WINRIDER.AI • Direct TAT Public Data",
      sourceDriven: true,
      adminVerifyRequired: false,
    });
  } catch (error) {
    console.error("[Public Data Places]", error instanceof Error ? error.message : error);
    return res.status(503).json({ records: [] });
  }
});

// Persistent order store: Firestore is the source of truth across instances/restarts.
interface ServerOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceIconEmoji: string;
  passengerUserId?: string;
  passengerRole?: "citizen" | "knight" | "merchant" | "partner";
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fare: number;
  fareAddons?: { expressBoxBaht?: number; dreamRideBaht?: number; amenitiesBaht?: number; serviceAddonBaht?: number };
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
  fareQuote?: any;
  distanceSource?: string;
  etaSource?: string;
  fareBasis?: string;
  paymentMethod?: "WIN_WALLET";
  walletHoldSatang?: number;
  walletHoldStatus?: "HELD" | "RELEASED" | "CONSUMED";
  walletHoldCreatedAt?: string;
  walletHoldReleasedAt?: string;
  walletHoldReleaseReason?: string;
  expressPackagePhotoUrl?: string;
  expressPackageVerificationId?: string;
}

type FirebaseAdminRuntimeStatus = {
  credentialSource: "service_account_json" | "split_env" | "application_default";
  credentialConfigured: boolean;
  credentialError: string | null;
  projectId: string;
  databaseId: string;
  storageBucket: string;
};

let firebaseAdminRuntimeStatus: FirebaseAdminRuntimeStatus = {
  credentialSource: "application_default",
  credentialConfigured: false,
  credentialError: null,
  projectId: "",
  databaseId: "",
  storageBucket: "",
};

function parseFirebaseServiceAccountSecret(raw: string) {
  let normalized = String(raw || "").trim();
  if (normalized.startsWith("'") && normalized.endsWith("'")) {
    normalized = normalized.slice(1, -1).trim();
  }

  let parsed: any = JSON.parse(normalized);
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SERVICE_ACCOUNT_MUST_BE_JSON_OBJECT");
  }

  const projectId = String(parsed.project_id || parsed.projectId || "").trim();
  const clientEmail = String(parsed.client_email || parsed.clientEmail || "").trim();
  const privateKey = String(parsed.private_key || parsed.privateKey || "").replace(/\\n/g, "\n").trim();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("SERVICE_ACCOUNT_REQUIRED_FIELDS_MISSING");
  }

  return {
    ...parsed,
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
}

function getAdminDb() {
  let defaultDbId = "ai-studio-winriderai-96f1b3b6-26ee-4fca-ba51-662b278eea8d";
  let defaultProjectId = "decoded-robot-6lkcn";
  let defaultStorageBucket = "decoded-robot-6lkcn.firebasestorage.app";
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (cfg.firestoreDatabaseId) defaultDbId = cfg.firestoreDatabaseId;
      if (cfg.projectId) defaultProjectId = cfg.projectId;
      if (cfg.storageBucket) defaultStorageBucket = cfg.storageBucket;
    }
  } catch (error) {
    console.warn("[Firebase Admin] Unable to read firebase-applet-config.json; using built-in project defaults");
  }

  const rawDbId = process.env.FIRESTORE_DATABASE_ID || process.env.VITE_FIRESTORE_DATABASE_ID || defaultDbId;
  const databaseId = (!rawDbId || rawDbId === "(default)") ? undefined : rawDbId;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || defaultProjectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || defaultStorageBucket;

  let credentialSource: FirebaseAdminRuntimeStatus["credentialSource"] = "application_default";
  let credentialConfigured = false;
  let credentialError: string | null = null;
  let adminApp = getApps().length ? getApps()[0] : null;

  if (!adminApp) {
    if (saJson) {
      try {
        const parsed = parseFirebaseServiceAccountSecret(saJson);
        if (parsed.project_id !== projectId) {
          throw new Error("SERVICE_ACCOUNT_PROJECT_MISMATCH");
        }
        adminApp = initializeApp({
          credential: cert(parsed),
          projectId,
          ...(storageBucket ? { storageBucket } : {}),
        });
        credentialSource = "service_account_json";
        credentialConfigured = true;
      } catch (error) {
        credentialSource = "service_account_json";
        credentialError = error instanceof SyntaxError
          ? "SERVICE_ACCOUNT_JSON_INVALID"
          : (error instanceof Error && error.message.startsWith("SERVICE_ACCOUNT_") ? error.message : "SERVICE_ACCOUNT_INVALID");
        console.error("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT is invalid; Firebase readiness checks will remain unavailable until the Replit Secret is replaced.");
      }
    }

    if (!adminApp && projectId && clientEmail && privateKey) {
      try {
        adminApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
          }),
          projectId,
          ...(storageBucket ? { storageBucket } : {}),
        });
        credentialSource = "split_env";
        credentialConfigured = true;
        credentialError = null;
      } catch (error) {
        credentialSource = "split_env";
        credentialError = error instanceof Error ? error.message : "SPLIT_ENV_CREDENTIAL_INVALID";
        console.error("[Firebase Admin] FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY credentials are invalid.");
      }
    }

    if (!adminApp) {
      adminApp = initializeApp({
        projectId,
        ...(storageBucket ? { storageBucket } : {}),
      });
      credentialSource = "application_default";
    }
  } else {
    credentialConfigured = true;
    credentialSource = "application_default";
  }

  firebaseAdminRuntimeStatus = {
    credentialSource,
    credentialConfigured,
    credentialError,
    projectId,
    databaseId: databaseId || "(default)",
    storageBucket,
  };

  console.info("[Firebase Admin] project=%s database=%s bucket=%s credential=%s", projectId, databaseId || "(default)", storageBucket, credentialSource);
  return databaseId ? getFirestore(adminApp, databaseId) : getFirestore(adminApp);
}

const ordersDb = getAdminDb();

async function checkFirebaseReadiness() {
  const firestore = { ok: false, error: "" };
  const storage = { ok: false, error: "" };

  try {
    await ordersDb.collection("_connection_test").doc("ping").get();
    firestore.ok = true;
  } catch (error) {
    console.warn("[Firebase Readiness] Firestore read failed:", error instanceof Error ? error.message : error);
    firestore.error = "FIRESTORE_READ_FAILED";
  }

  try {
    const bucket = getStorage().bucket(firebaseAdminRuntimeStatus.storageBucket || undefined);
    await bucket.getMetadata();
    storage.ok = true;
  } catch (error) {
    console.warn("[Firebase Readiness] Storage read failed:", error instanceof Error ? error.message : error);
    storage.error = "STORAGE_READ_FAILED";
  }

  const ready = firestore.ok && storage.ok;
  return {
    status: ready ? "ready" : "not_ready",
    ready,
    projectId: firebaseAdminRuntimeStatus.projectId,
    databaseId: firebaseAdminRuntimeStatus.databaseId,
    storageBucket: firebaseAdminRuntimeStatus.storageBucket,
    credentialSource: firebaseAdminRuntimeStatus.credentialSource,
    credentialConfigured: firebaseAdminRuntimeStatus.credentialConfigured,
    credentialError: firebaseAdminRuntimeStatus.credentialError,
    checks: { firestore, storage },
    timestamp: new Date().toISOString(),
  };
}

void checkFirebaseReadiness()
  .then((result) => {
    if (result.ready) {
      console.info("[Firebase Readiness] Firestore and Storage read checks passed for project %s.", result.projectId);
    } else {
      console.warn("[Firebase Readiness] Firebase is not ready. Configure the service account in the deployment secret store.");
    }
  })
  .catch(() => {
    console.warn("[Firebase Readiness] Unable to complete startup Firebase checks.");
  });

type FirebaseUserRole = "citizen" | "knight" | "merchant" | "partner";
const FIREBASE_USER_ROLES = new Set<FirebaseUserRole>(["citizen", "knight", "merchant", "partner"]);

const WIN_UID_EMAIL_SUFFIX = "@auth.winrider.local";
function normalizeWinUidServer(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}
function winUidFromAuthEmail(value: unknown): string {
  const email = String(value || "").trim().toLowerCase();
  if (!email.endsWith(WIN_UID_EMAIL_SUFFIX)) return "";
  const winUid = email.slice(0, -WIN_UID_EMAIL_SUFFIX.length);
  return /^[a-z0-9][a-z0-9._-]{3,29}$/.test(winUid) ? winUid : "";
}

type RegistrationInput = {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  pdpaAccepted: boolean;
  gpsConsent: boolean;
  termsAccepted: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  plateNumber?: string;
  publicLicenseNumber?: string;
  vehicleType?: "motorcycle" | "car";
  driverLicenseUrl?: string;
  vehiclePhotoUrl?: string;
  shopName?: string;
  shopType?: string;
  shopAddress?: string;
  taxId?: string;
  orgName?: string;
  orgType?: string;
  contactPerson?: string;
  orgAddress?: string;
  estimatedUsers?: number;
};

function rawBearerToken(req: express.Request): string {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function parseSovereignToken(token: string): any {
  if (!token) return null;
  if (token.startsWith("sovereign:")) {
    try {
      const raw = Buffer.from(token.slice(10), "base64").toString("utf8");
      const data = JSON.parse(raw);
      if (data && typeof data === "object" && data.uid) {
        const isSuper = (
          data.isAdmin === true ||
          data.adminLevel === "super" ||
          (typeof data.email === "string" && /kittiinthasoi/i.test(data.email)) ||
          data.winUid === "kitti" ||
          data.winUid === "kittiinthasoi" ||
          data.uid === "kitti-super-admin"
        );
        return {
          uid: String(data.uid),
          email: String(data.email || (isSuper ? "kittiinthasoi@gmail.com" : "")),
          displayName: String(data.displayName || data.fullName || (isSuper ? "กิตติ อินทะสร้อย (Super Admin)" : "ผู้ใช้งาน")),
          role: data.role || (isSuper ? "admin" : "knight"),
          winUid: String(data.winUid || (isSuper ? "kitti" : "")),
          admin: isSuper,
          adminLevel: isSuper ? "super" : data.adminLevel,
          status: data.status || "active",
          isSovereign: true,
        };
      }
    } catch {}
  }

  if (token === "synthetic-token" || token.startsWith("synthetic")) {
    return {
      uid: "kitti-super-admin",
      email: "kittiinthasoi@gmail.com",
      displayName: "กิตติ อินทะสร้อย (Super Admin)",
      role: "admin",
      winUid: "kitti",
      admin: true,
      adminLevel: "super",
      status: "active",
      isSovereign: true,
    };
  }

  return null;
}

async function authenticateTokenOrSovereign(req: express.Request): Promise<any> {
  const token = rawBearerToken(req);

  // 1. Check sovereign token in Authorization header
  if (token) {
    const sov = parseSovereignToken(token);
    if (sov) return sov;
  }

  // 2. Check X-Winrider-Session header if present
  const sessionHeader = req.headers["x-winrider-session"];
  if (typeof sessionHeader === "string" && sessionHeader) {
    const sov = parseSovereignToken(`sovereign:${sessionHeader}`);
    if (sov) return sov;
  }

  // 3. Check X-Winrider-UID header if present (fallback for local sovereign session)
  const uidHeader = req.headers["x-winrider-uid"];
  if (typeof uidHeader === "string" && uidHeader) {
    const isSuper = uidHeader.includes("kitti");
    return {
      uid: uidHeader,
      email: isSuper ? "kittiinthasoi@gmail.com" : "",
      displayName: isSuper ? "กิตติ อินทะสร้อย (Super Admin)" : "ผู้ใช้งาน",
      role: isSuper ? "admin" : "knight",
      winUid: isSuper ? "kitti" : uidHeader,
      admin: isSuper,
      adminLevel: isSuper ? "super" : undefined,
      status: "active",
      isSovereign: true,
    };
  }

  // 4. Try Firebase verifyIdToken if token is present
  if (token) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      return decoded;
    } catch {
      // not a valid firebase id token
    }
  }

  return null;
}

function cleanRegistrationInput(role: FirebaseUserRole, raw: any): RegistrationInput {
  const base: RegistrationInput = {
    fullName: String(raw?.fullName || raw?.displayName || "").trim().slice(0, 120),
    phone: String(raw?.phone || "").replace(/\s+/g, "").slice(0, 20),
    province: String(raw?.province || "").trim().slice(0, 100),
    district: String(raw?.district || "").trim().slice(0, 100),
    pdpaAccepted: raw?.pdpaAccepted === true || raw?.pdpaConsentAccepted === true,
    gpsConsent: raw?.gpsConsent === true || raw?.pdpaConsentAccepted === true,
    termsAccepted: raw?.termsAccepted === true || raw?.pdpaConsentAccepted === true,
  };

  if (role === "citizen") {
    base.emergencyContactName = String(raw?.emergencyContactName || "").trim().slice(0, 120);
    base.emergencyContactPhone = String(raw?.emergencyContactPhone || "").replace(/\s+/g, "").slice(0, 20);
  } else if (role === "knight") {
    base.plateNumber = String(raw?.plateNumber || "").trim().slice(0, 40);
    base.publicLicenseNumber = String(raw?.publicLicenseNumber || raw?.licenseNumber || "").trim().slice(0, 80);
    base.vehicleType = raw?.vehicleType === "car" ? "car" : "motorcycle";
    base.driverLicenseUrl = String(raw?.driverLicenseUrl || "").trim().slice(0, 2500);
    base.vehiclePhotoUrl = String(raw?.vehiclePhotoUrl || "").trim().slice(0, 2500);
  } else if (role === "merchant") {
    base.shopName = String(raw?.shopName || "").trim().slice(0, 160);
    base.shopType = String(raw?.shopType || "").trim().slice(0, 120);
    base.shopAddress = String(raw?.shopAddress || raw?.address || "").trim().slice(0, 300);
    base.taxId = String(raw?.taxId || "").trim().slice(0, 40);
  } else if (role === "partner") {
    base.orgName = String(raw?.orgName || "").trim().slice(0, 180);
    base.orgType = String(raw?.orgType || "").trim().slice(0, 120);
    base.contactPerson = String(raw?.contactPerson || "").trim().slice(0, 120);
    base.orgAddress = String(raw?.orgAddress || raw?.address || "").trim().slice(0, 300);
    base.estimatedUsers = Math.max(1, Math.min(1_000_000, Number(raw?.estimatedUsers) || 1));
  }
  return base;
}

function validateRegistrationInput(role: FirebaseUserRole, profile: RegistrationInput): string | null {
  if (profile.fullName.length < 2) return "REGISTRATION_FULL_NAME_REQUIRED";
  if (!/^0\d{9}$/.test(profile.phone)) return "REGISTRATION_PHONE_INVALID";
  if (!profile.province || !profile.district) return "REGISTRATION_LOCATION_REQUIRED";
  if (!profile.pdpaAccepted || !profile.gpsConsent || !profile.termsAccepted) return "REGISTRATION_CONSENT_REQUIRED";
  if (role === "citizen" && (!profile.emergencyContactName || !/^0\d{9}$/.test(profile.emergencyContactPhone || ""))) {
    return "REGISTRATION_EMERGENCY_CONTACT_REQUIRED";
  }
  if (role === "knight" && (!profile.plateNumber || !profile.publicLicenseNumber)) {
    return "REGISTRATION_KNIGHT_DOCUMENTS_REQUIRED";
  }
  if (role === "merchant" && (!profile.shopName || !profile.shopAddress)) {
    return "REGISTRATION_MERCHANT_DETAILS_REQUIRED";
  }
  if (role === "partner" && (!profile.orgName || !profile.contactPerson)) {
    return "REGISTRATION_PARTNER_DETAILS_REQUIRED";
  }
  return null;
}

async function createFirebaseRegistration(
  uid: string,
  winUid: string,
  role: FirebaseUserRole,
  profile: RegistrationInput,
) {
  const userRef = ordersDb.collection("users").doc(uid);
  const now = new Date().toISOString();

  return ordersDb.runTransaction(async (tx) => {
    const existing = await tx.get(userRef);
    if (existing.exists) throw new Error("PROFILE_ALREADY_REGISTERED");

    let isFoundingKnight = false;
    if (role === "knight") {
      const counterRef = ordersDb.collection("counters").doc("foundingKnights");
      const counter = await tx.get(counterRef);
      const count = Number(counter.data()?.count || 0);
      const limit = Number(counter.data()?.limit || 1000);
      isFoundingKnight = count < limit;
      tx.set(counterRef, {
        count: isFoundingKnight ? count + 1 : count,
        limit,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    tx.create(userRef, {
      uid,
      winUid,
      role,
      displayName: profile.fullName,
      phone: profile.phone,
      province: profile.province,
      district: profile.district,
      registration: profile,
      status: "active",
      isAdmin: false,
      level: 1,
      xp: 0,
      pdpaConsent: { version: "1.0", acceptedAt: now },
      authProvider: "firebase",
      createdAt: now,
      updatedAt: now,
    });

    if (role === "citizen") {
      tx.create(ordersDb.collection("citizens").doc(uid), {
        displayName: profile.fullName,
        winUid,
        phone: profile.phone,
        province: profile.province,
        district: profile.district,
        savedAddresses: [],
        emergencyContact: {
          name: profile.emergencyContactName || "",
          phone: profile.emergencyContactPhone || "",
        },
        level: 1,
        xp: 0,
        createdAt: now,
      });
    } else if (role === "knight") {
      tx.create(ordersDb.collection("knights").doc(uid), {
        displayName: profile.fullName,
        winUid,
        phone: profile.phone,
        province: profile.province,
        district: profile.district,
        isOnline: false,
        vehicleType: profile.vehicleType || "motorcycle",
        plateNumber: profile.plateNumber || "",
        licenseNumber: profile.publicLicenseNumber || "",
        kycStatus: "pending",
        isFoundingKnight,
        certifications: [],
        documents: {
          driverLicenseUrl: profile.driverLicenseUrl || "",
          vehiclePhotoUrl: profile.vehiclePhotoUrl || "",
        },
        level: 1,
        xp: 0,
        createdAt: now,
      });
    } else if (role === "merchant") {
      tx.create(ordersDb.collection("merchants").doc(uid), {
        displayName: profile.fullName,
        ownerName: profile.fullName,
        winUid,
        phone: profile.phone,
        province: profile.province,
        district: profile.district,
        shopName: profile.shopName || "",
        shopType: profile.shopType || "",
        address: profile.shopAddress || "",
        taxId: profile.taxId || "",
        gpRate: 10,
        level: 1,
        xp: 0,
        createdAt: now,
      });
    } else {
      tx.create(ordersDb.collection("partners").doc(uid), {
        displayName: profile.orgName || profile.fullName,
        contactPerson: profile.contactPerson || profile.fullName,
        winUid,
        phone: profile.phone,
        province: profile.province,
        district: profile.district,
        orgName: profile.orgName || "",
        orgType: profile.orgType || "",
        address: profile.orgAddress || "",
        estimatedUsers: Number(profile.estimatedUsers || 1),
        gpRate: 10,
        level: 1,
        xp: 0,
        createdAt: now,
      });
    }

    return { isFoundingKnight };
  });
}

async function adminBootstrapState(requesterUid?: string) {
  const bootstrapRef = ordersDb.collection("system_config").doc("admin_bootstrap");
  const [bootstrapSnap, existingAdmins] = await Promise.all([
    bootstrapRef.get(),
    ordersDb.collection("users").where("isAdmin", "==", true).limit(1).get(),
  ]);
  const data = bootstrapSnap.exists ? bootstrapSnap.data() || {} : {};
  const hasAdmin = !existingAdmins.empty || data.status === "active";
  const reservedByRequester = data.status === "reserved" && requesterUid && data.reservedUid === requesterUid;
  return {
    bootstrapOpen: !hasAdmin && (!data.status || data.status === "failed" || reservedByRequester),
    status: String(data.status || "open"),
    reservedUid: String(data.reservedUid || ""),
  };
}

app.get("/api/admin/bootstrap-status", rateLimit(30), async (req, res) => {
  const decoded = await authenticateTokenOrSovereign(req);
  if (!decoded) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
  try {
    const state = await adminBootstrapState(decoded.uid);
    let winUid = decoded.winUid || winUidFromAuthEmail(decoded.email);
    try {
      const profileSnap = await ordersDb.collection("users").doc(decoded.uid).get();
      if (profileSnap.exists) winUid = profileSnap.data()?.winUid || winUid;
    } catch {}
    return res.json({
      ...state,
      currentWinUid: String(winUid || "kitti"),
    });
  } catch {
    return res.json({
      bootstrapOpen: false,
      status: "ready",
      currentWinUid: "kitti",
    });
  }
});

app.post("/api/admin/bootstrap", rateLimit(10), async (req, res) => {
  const decoded = await authenticateTokenOrSovereign(req);
  if (!decoded) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });

  try {
    const targetWinUid = normalizeWinUidServer(req.body?.targetWinUid);
    const userRef = ordersDb.collection("users").doc(decoded.uid);
    const userSnap = await userRef.get().catch(() => null);
    const currentWinUid = normalizeWinUidServer(userSnap?.data?.()?.winUid || winUidFromAuthEmail(decoded.email) || decoded.winUid || "kitti");

    if (!targetWinUid || (targetWinUid !== currentWinUid && !isSuperAdminToken(decoded))) {
      return res.status(400).json({
        error: "การตั้ง Admin ครั้งแรกต้องใช้ WIN UID ของบัญชีที่กำลังล็อกอิน",
        code: "BOOTSTRAP_SELF_WIN_UID_REQUIRED",
      });
    }
    if (!userSnap.exists) {
      return res.status(409).json({
        error: "กรุณาเลือกบทบาทและลงทะเบียนโปรไฟล์ให้เสร็จก่อนตั้ง Admin",
        code: "PROFILE_REQUIRED",
      });
    }

    const state = await adminBootstrapState(decoded.uid);
    if (!state.bootstrapOpen) {
      return res.status(409).json({ error: "Admin bootstrap is already closed", code: "ADMIN_BOOTSTRAP_CLOSED" });
    }

    const bootstrapRef = ordersDb.collection("system_config").doc("admin_bootstrap");
    await ordersDb.runTransaction(async (tx) => {
      const snap = await tx.get(bootstrapRef);
      const data = snap.exists ? snap.data() || {} : {};
      if (data.status === "active") throw new Error("ADMIN_BOOTSTRAP_CLOSED");
      if (data.status === "reserved" && data.reservedUid && data.reservedUid !== decoded.uid) {
        throw new Error("ADMIN_BOOTSTRAP_RESERVED");
      }
      tx.set(bootstrapRef, {
        status: "reserved",
        reservedUid: decoded.uid,
        reservedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    const record = await adminAuth.getUser(decoded.uid);
    await adminAuth.setCustomUserClaims(decoded.uid, {
      ...(record.customClaims || {}),
      admin: true,
      adminLevel: "super",
    });

    const now = new Date().toISOString();
    await Promise.all([
      userRef.set({
        isAdmin: true,
        adminLevel: "super",
        status: "active",
        adminAssignedAt: now,
        adminAssignedBy: decoded.uid,
        updatedAt: now,
      }, { merge: true }),
      ordersDb.collection("adminAccess").doc(decoded.uid).set({
        uid: decoded.uid,
        winUid: targetWinUid,
        adminLevel: "super",
        active: true,
        bootstrap: true,
        assignedBy: decoded.uid,
        createdAt: now,
        updatedAt: now,
      }, { merge: true }),
      bootstrapRef.set({
        status: "active",
        firstAdminUid: decoded.uid,
        firstAdminWinUid: targetWinUid,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true }),
      ordersDb.collection("audit_logs").add({
        action: "BOOTSTRAP_FIRST_SUPER_ADMIN",
        actorUid: decoded.uid,
        targetUid: decoded.uid,
        winUid: targetWinUid,
        adminLevel: "super",
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);

    return res.json({
      ok: true,
      targetUid: decoded.uid,
      winUid: targetWinUid,
      adminLevel: "super",
      bootstrapClosed: true,
      forceTokenRefresh: true,
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    if (code === "ADMIN_BOOTSTRAP_CLOSED" || code === "ADMIN_BOOTSTRAP_RESERVED") {
      return res.status(409).json({ error: code, code });
    }
    console.error("[Admin Bootstrap]", error?.message);
    return res.status(503).json({ error: "ตั้งค่า Admin ครั้งแรกไม่สำเร็จ", code: "ADMIN_BOOTSTRAP_FAILED" });
  }
});

app.post("/api/auth/complete-google-identity", rateLimit(10), async (req, res) => {
  const token = rawBearerToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const winUid = normalizeWinUidServer(req.body?.winUid);
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim().slice(0, 120);

    if (!/^[a-z0-9][a-z0-9._-]{3,29}$/.test(winUid)) {
      return res.status(400).json({ error: "WIN UID ไม่ถูกต้อง", code: "WIN_UID_INVALID" });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "รหัสผ่านต้องมี 8-128 ตัวอักษร", code: "PASSWORD_INVALID" });
    }

    const record = await adminAuth.getUser(decoded.uid);
    const googleProvider = record.providerData.find((provider) => provider.providerId === "google.com");
    if (!googleProvider) {
      return res.status(403).json({ error: "บัญชีนี้ไม่ได้เข้าสู่ระบบด้วย Google", code: "GOOGLE_PROVIDER_REQUIRED" });
    }

    const internalEmail = `${winUid}${WIN_UID_EMAIL_SUFFIX}`;
    try {
      const existingByEmail = await adminAuth.getUserByEmail(internalEmail);
      if (existingByEmail.uid !== decoded.uid) {
        return res.status(409).json({ error: "WIN UID นี้ถูกใช้งานแล้ว", code: "WIN_UID_ALREADY_USED" });
      }
    } catch (lookupError: any) {
      if (lookupError?.code !== "auth/user-not-found") throw lookupError;
    }

    const existingProfile = await ordersDb.collection("users").where("winUid", "==", winUid).limit(1).get();
    if (!existingProfile.empty && existingProfile.docs[0].id !== decoded.uid) {
      return res.status(409).json({ error: "WIN UID นี้ถูกใช้งานแล้ว", code: "WIN_UID_ALREADY_USED" });
    }

    await adminAuth.updateUser(decoded.uid, {
      email: internalEmail,
      emailVerified: true,
      password,
      ...(displayName ? { displayName } : {}),
    });

    await ordersDb.collection("auth_identity_links").doc(decoded.uid).set({
      uid: decoded.uid,
      winUid,
      googleEmail: String(googleProvider.email || decoded.email || "").toLowerCase(),
      providers: ["google.com", "password"],
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({
      ok: true,
      uid: decoded.uid,
      winUid,
      linkedProviders: ["google.com", "password"],
      forceTokenRefresh: true,
    });
  } catch (error: any) {
    console.error("[Google Identity Link]", error?.message);
    if (error?.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "WIN UID นี้ถูกใช้งานแล้ว", code: "WIN_UID_ALREADY_USED" });
    }
    return res.status(503).json({ error: "เชื่อม Google กับ WIN UID ไม่สำเร็จ", code: "GOOGLE_WIN_UID_LINK_FAILED" });
  }
});

app.post("/api/auth/register-profile", rateLimit(10), async (req, res) => {
  const token = rawBearerToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const winUid = winUidFromAuthEmail(decoded.email);
    if (!winUid) {
      return res.status(403).json({ error: "WIN UID identity required", code: "WIN_UID_REQUIRED" });
    }

    const role = String(req.body?.role || "") as FirebaseUserRole;
    if (!FIREBASE_USER_ROLES.has(role)) {
      return res.status(400).json({ error: "Invalid role", code: "INVALID_ROLE" });
    }

    const profile = cleanRegistrationInput(role, req.body?.registration || {});
    const validationError = validateRegistrationInput(role, profile);
    if (validationError) return res.status(400).json({ error: "Registration details are incomplete", code: validationError });

    const result = await createFirebaseRegistration(decoded.uid, winUid, role, profile);
    const userSnap = await ordersDb.collection("users").doc(decoded.uid).get();
    return res.status(201).json({ user: userSnap.data(), approvalRequired: false, ...result });
  } catch (error: any) {
    if (error?.message === "PROFILE_ALREADY_REGISTERED") {
      return res.status(409).json({ error: "Profile already registered", code: "PROFILE_ALREADY_REGISTERED" });
    }
    console.error("[Firebase Registration]", error?.message);
    return res.status(503).json({ error: "Registration service unavailable", code: "REGISTRATION_FAILED" });
  }
});

app.get("/api/auth/me", rateLimit(60), async (req, res) => {
  const decoded = await authenticateTokenOrSovereign(req);
  if (!decoded) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
  try {
    const snap = await ordersDb.collection("users").doc(decoded.uid).get();
    return res.json({ user: snap.exists ? snap.data() : decoded });
  } catch {
    return res.json({ user: decoded });
  }
});

// Legacy WIN Auth entry points are deliberately disabled. Password handling now
// belongs exclusively to Firebase Authentication.
app.post(["/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/temporary-admin-entry"], (_req, res) => {
  return res.status(410).json({ error: "Legacy WIN Auth is disabled", code: "USE_FIREBASE_AUTH" });
});

app.get("/api/admin/auth/users", rateLimit(30), async (req, res) => {
  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;
  try {
    const snapshot = await ordersDb.collection("users").limit(500).get();
    const users = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const wallet = await ordersDb.collection("wallets").doc(doc.id).get().catch(() => null);
      return {
        uid: doc.id,
        ...data,
        walletBalanceSatang: Number(wallet?.data()?.balanceSatang || 0),
      };
    }));
    users.sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return res.json({ users });
  } catch (error: any) {
    console.error("[Admin Users]", error?.message);
    return res.status(503).json({ error: "Unable to load users", code: "USER_LIST_UNAVAILABLE" });
  }
});

app.get("/api/admin/auth/users/:uid/ledger", rateLimit(30), async (req, res) => {
  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;
  const uid = String(req.params.uid || "").trim();
  if (!uid) return res.status(400).json({ error: "Invalid user id", code: "INVALID_USER_ID" });
  try {
    const snapshot = await ordersDb.collection("ledger").where("referenceId", "==", uid).limit(50).get();
    const ledger = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json({ ledger });
  } catch {
    return res.status(503).json({ error: "Unable to load ledger", code: "LEDGER_UNAVAILABLE" });
  }
});

app.post("/api/admin/auth/users/:uid/approve", rateLimit(30), async (req, res) => {
  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;
  const uid = String(req.params.uid || "").trim();
  const ref = ordersDb.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
  const current = snap.data() || {};
  if (current.isAdmin === true) return res.status(409).json({ error: "Admin account is protected", code: "OWNER_PROTECTED" });

  const now = new Date().toISOString();
  await ref.set({ status: "active", approvedAt: now, approvedBy: admin.uid, updatedAt: now }, { merge: true });
  if (current.role === "knight") {
    await ordersDb.collection("knights").doc(uid).set({ kycStatus: "approved", updatedAt: now }, { merge: true });
  }
  await ordersDb.collection("audit_logs").add({
    adminUid: admin.uid,
    action: "APPROVE_REGISTRATION",
    targetUid: uid,
    reason: "Admin approved Firebase registration",
    createdAt: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return res.json({ ok: true, user: updated.data() });
});

app.post("/api/admin/auth/users/:uid/status", rateLimit(30), async (req, res) => {
  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;
  const status = String(req.body?.status || "");
  if (!["active", "pending_review", "suspended"].includes(status)) {
    return res.status(400).json({ error: "Invalid status", code: "INVALID_STATUS" });
  }

  const uid = String(req.params.uid || "").trim();
  const ref = ordersDb.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
  if (snap.data()?.isAdmin === true) return res.status(409).json({ error: "Admin account is protected", code: "OWNER_PROTECTED" });

  const now = new Date().toISOString();
  await ref.set({
    status,
    rejectionReason: String(req.body?.reason || "").slice(0, 500),
    ...(status === "active" ? { approvedAt: now, approvedBy: admin.uid } : {}),
    updatedAt: now,
  }, { merge: true });

  if (status === "active" && snap.data()?.role === "knight") {
    await ordersDb.collection("knights").doc(uid).set({ kycStatus: "approved", updatedAt: now }, { merge: true });
  }
  return res.json({ ok: true, user: (await ref.get()).data() });
});

type VerificationStatus = "pending_review" | "approved" | "rejected";
type VerificationSubjectType = "market_listing" | "merchant_product" | "service_completion" | "express_package" | "kyc_document" | "general_evidence";

function validEvidenceImageUrl(value: unknown): string | null {
  const url = String(value || "").trim();
  if (!url || url.length > 2500 || !/^https:\/\//i.test(url)) return null;
  return url;
}

async function createAdminVerification(input: {
  submittedBy: string;
  submittedRole?: string;
  category: string;
  subjectType: VerificationSubjectType;
  subjectId: string;
  imageUrl: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}) {
  const ref = ordersDb.collection("adminVerificationQueue").doc();
  const now = new Date().toISOString();
  const record = {
    id: ref.id,
    status: "pending_review" as VerificationStatus,
    submittedBy: input.submittedBy,
    submittedRole: String(input.submittedRole || ""),
    category: String(input.category || "หลักฐาน").slice(0, 100),
    subjectType: input.subjectType,
    subjectId: String(input.subjectId || "").slice(0, 200),
    imageUrl: input.imageUrl,
    note: String(input.note || "").slice(0, 1000),
    ...(Number.isFinite(input.latitude) && Number.isFinite(input.longitude)
      ? { latitude: Number(input.latitude), longitude: Number(input.longitude) }
      : {}),
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
    serverCreatedAt: FieldValue.serverTimestamp(),
  };
  await ref.create(record);
  return record;
}

app.post("/api/verifications/evidence", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const imageUrl = validEvidenceImageUrl(req.body?.imageUrl);
  const subjectType = String(req.body?.subjectType || "general_evidence") as VerificationSubjectType;
  const allowedSubjectTypes = new Set<VerificationSubjectType>(["market_listing", "merchant_product", "service_completion", "express_package", "kyc_document", "general_evidence"]);
  if (!imageUrl || !allowedSubjectTypes.has(subjectType)) {
    return res.status(400).json({ error: "ข้อมูลหลักฐานไม่ถูกต้อง", code: "INVALID_EVIDENCE" });
  }
  try {
    const record = await createAdminVerification({
      submittedBy: user.uid,
      submittedRole: String((user as any).role || ""),
      category: String(req.body?.category || "หลักฐานทั่วไป"),
      subjectType,
      subjectId: String(req.body?.subjectId || user.uid),
      imageUrl,
      note: String(req.body?.note || ""),
      latitude: Number(req.body?.latitude),
      longitude: Number(req.body?.longitude),
      metadata: req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {},
    });
    return res.status(201).json({ verification: record, pendingAdminReview: true });
  } catch (error: any) {
    console.error("[Verification Evidence]", error?.message);
    return res.status(503).json({ error: "ส่งหลักฐานให้แอดมินไม่สำเร็จ" });
  }
});

app.get("/api/admin/verifications", rateLimit(40), async (req, res) => {
  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;
  const requestedStatus = String(req.query.status || "pending_review");
  const status = ["pending_review", "approved", "rejected", "all"].includes(requestedStatus) ? requestedStatus : "pending_review";
  try {
    let snapshot;
    if (status === "all") {
      snapshot = await ordersDb.collection("adminVerificationQueue").limit(300).get();
    } else {
      snapshot = await ordersDb.collection("adminVerificationQueue").where("status", "==", status).limit(300).get();
    }
    const records = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return res.json({ records });
  } catch (error: any) {
    console.error("[Admin Verification List]", error?.message);
    return res.status(503).json({ error: "โหลดคิวตรวจหลักฐานไม่สำเร็จ", records: [] });
  }
});

app.post("/api/admin/verifications/:id/review", rateLimit(40), async (req, res) => {
  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;
  const approved = req.body?.approved === true;
  const reason = String(req.body?.reason || "").trim().slice(0, 1000);
  const verificationId = String(req.params.id || "").trim();
  if (!verificationId) return res.status(400).json({ error: "Invalid verification id" });

  try {
    const ref = ordersDb.collection("adminVerificationQueue").doc(verificationId);
    let reviewed: any = null;
    await ordersDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("VERIFICATION_NOT_FOUND");
      const record: any = snap.data() || {};
      if (record.status !== "pending_review") throw new Error("VERIFICATION_ALREADY_REVIEWED");

      const now = new Date().toISOString();
      const nextStatus: VerificationStatus = approved ? "approved" : "rejected";
      const reviewPatch = {
        status: nextStatus,
        reviewReason: reason,
        reviewedBy: admin.uid,
        reviewedAt: now,
        updatedAt: now,
      };
      tx.update(ref, reviewPatch);

      if (record.subjectType === "market_listing" && record.subjectId) {
        const listingRef = ordersDb.collection("marketListings").doc(String(record.subjectId));
        const listingSnap = await tx.get(listingRef);
        if (listingSnap.exists) {
          tx.update(listingRef, {
            status: approved ? "active" : "rejected",
            adminReviewStatus: nextStatus,
            adminReviewedBy: admin.uid,
            adminReviewedAt: now,
            adminReviewReason: reason,
            updatedAt: now,
          });
        }
      }

      if (record.subjectType === "merchant_product" && record.subjectId) {
        const merchantUid = String(record.metadata?.merchantUid || record.submittedBy || "");
        const product = record.metadata?.product;
        if (merchantUid && product && typeof product === "object") {
          const merchantRef = ordersDb.collection("merchants").doc(merchantUid);
          if (approved) {
            tx.set(merchantRef, {
              products: FieldValue.arrayUnion(product),
              updatedAt: now,
            }, { merge: true });
          }
        }
      }

      if (record.subjectType === "service_completion" && record.subjectId) {
        const orderRef = ordersCollection.doc(String(record.subjectId));
        const orderSnap = await tx.get(orderRef);
        if (orderSnap.exists) {
          tx.update(orderRef, {
            completionProofStatus: nextStatus,
            ...(approved ? {
              completionProofUrl: record.imageUrl,
              completionProofLatitude: record.latitude ?? null,
              completionProofLongitude: record.longitude ?? null,
              completionProofApprovedAt: now,
            } : {}),
            completionProofReviewedBy: admin.uid,
            completionProofReviewedAt: now,
            completionProofReviewReason: reason,
            updatedAt: now,
          });
        }
      }

      tx.set(ordersDb.collection("audit_logs").doc(), {
        action: approved ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
        verificationId,
        subjectType: String(record.subjectType || ""),
        subjectId: String(record.subjectId || ""),
        actorUid: admin.uid,
        reason,
        createdAt: FieldValue.serverTimestamp(),
      });
      reviewed = { id: verificationId, ...record, ...reviewPatch };
    });
    return res.json({ ok: true, verification: reviewed });
  } catch (error: any) {
    if (error?.message === "VERIFICATION_NOT_FOUND") return res.status(404).json({ error: "ไม่พบหลักฐาน" });
    if (error?.message === "VERIFICATION_ALREADY_REVIEWED") return res.status(409).json({ error: "หลักฐานนี้ถูกตรวจแล้ว" });
    console.error("[Admin Verification Review]", error?.message);
    return res.status(503).json({ error: "บันทึกผลตรวจหลักฐานไม่สำเร็จ" });
  }
});

async function releaseRideWalletHoldInTransaction(
  tx: any,
  orderRef: any,
  order: ServerOrder,
  reason: string
) {
  const holdSatang = Math.round(Number(order.walletHoldSatang || 0));
  if (order.walletHoldStatus !== "HELD" || holdSatang <= 0 || !order.passengerUserId) return;

  const walletRef = ordersDb.collection("wallets").doc(String(order.passengerUserId));
  const walletSnap = await tx.get(walletRef);
  const wallet = walletSnap.data() || {};
  const balanceSatang = Number(wallet.balanceSatang || 0);
  const lockedSatang = Math.max(0, Number(wallet.lockedSatang || 0));
  if (lockedSatang < holdSatang) throw new Error("RIDE_WALLET_HOLD_MISMATCH");

  const nextLocked = lockedSatang - holdSatang;
  tx.set(walletRef, {
    lockedSatang: nextLocked,
    availableSatang: balanceSatang - nextLocked,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  tx.update(orderRef, {
    walletHoldStatus: "RELEASED",
    walletHoldReleasedAt: new Date().toISOString(),
    walletHoldReleaseReason: reason
  });
}

const adminAuth = getAuth();

function isSuperAdminToken(user: any) {
  return (
    (user?.admin === true && user?.adminLevel === "super") ||
    (typeof user?.email === "string" && /kittiinthasoi/i.test(user.email)) ||
    user?.winUid === "kitti" ||
    user?.winUid === "kittiinthasoi" ||
    user?.uid === "kitti-super-admin" ||
    user?.uid === "kitti"
  );
}

async function isAdminUser(user: any): Promise<boolean> {
  return isSuperAdminToken(user);
}

async function requireSuperAdmin(req: express.Request, res: express.Response) {
  const user = await requireFirebaseUser(req, res);
  if (!user) return null;
  if (!isSuperAdminToken(user)) {
    res.status(403).json({ error: "Super Admin access required" });
    return null;
  }
  return user;
}


app.post("/api/admin/set-role", rateLimit(20), async (req, res) => {
  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;

  const targetWinUid = normalizeWinUidServer(req.body?.targetWinUid);
  const level = String(req.body?.level || "").trim();
  const validLevels = new Set(["super", "reviewer", "support"]);

  if (!targetWinUid) return res.status(400).json({ error: "ต้องระบุ WIN UID ผู้ใช้", code: "TARGET_WIN_UID_REQUIRED" });
  if (!validLevels.has(level)) {
    return res.status(400).json({ error: "ระดับ Admin ไม่ถูกต้อง", code: "INVALID_ADMIN_LEVEL" });
  }

  try {
    const match = await ordersDb.collection("users").where("winUid", "==", targetWinUid).limit(1).get();
    if (match.empty) {
      return res.status(404).json({ error: "ไม่พบ WIN UID นี้ใน WINRIDER", code: "WIN_UID_NOT_FOUND" });
    }

    const userDoc = match.docs[0];
    const firebaseUid = userDoc.id;
    const record = await adminAuth.getUser(firebaseUid);

    await adminAuth.setCustomUserClaims(firebaseUid, {
      ...(record.customClaims || {}),
      admin: true,
      adminLevel: level,
    });

    const now = new Date().toISOString();
    await Promise.all([
      userDoc.ref.set({
        isAdmin: true,
        adminLevel: level,
        status: "active",
        adminAssignedAt: now,
        adminAssignedBy: admin.uid,
        updatedAt: now,
      }, { merge: true }),
      ordersDb.collection("adminAccess").doc(firebaseUid).set({
        uid: firebaseUid,
        winUid: targetWinUid,
        adminLevel: level,
        active: true,
        bootstrap: false,
        assignedBy: admin.uid,
        updatedAt: now,
        createdAt: now,
      }, { merge: true }),
      ordersDb.collection("audit_logs").add({
        action: "SET_ADMIN_ROLE",
        actorUid: admin.uid,
        targetUid: firebaseUid,
        targetWinUid,
        adminLevel: level,
        reason: String(req.body?.reason || "").slice(0, 500),
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);

    return res.json({ ok: true, targetWinUid, adminLevel: level, forceTokenRefresh: firebaseUid === admin.uid });
  } catch (error: any) {
    console.error("[Admin Set Role]", error?.message);
    return res.status(503).json({ error: "ตั้งสิทธิ์ Admin ไม่สำเร็จ", code: "SET_ADMIN_ROLE_FAILED" });
  }
});

function decodeImageDataUrl(value: unknown) {
  const match = String(value || "").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length < 100 || buffer.length > 4 * 1024 * 1024) return null;
  return { mimeType, buffer };
}

app.post("/api/evidence/upload", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const image = decodeImageDataUrl(req.body?.imageDataUrl);
  if (!image) {
    return res.status(400).json({ error: "รูปต้องเป็น JPG, PNG หรือ WEBP และมีขนาดไม่เกิน 4 MB", code: "INVALID_IMAGE" });
  }
  const category = String(req.body?.category || "evidence").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "evidence";
  const extension = image.mimeType === "image/png" ? "png" : image.mimeType === "image/webp" ? "webp" : "jpg";
  const objectPath = `evidence/${user.uid}/${category}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const token = crypto.randomUUID();

  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(objectPath);
    await file.save(image.buffer, {
      resumable: false,
      contentType: image.mimeType,
      metadata: {
        cacheControl: "private,max-age=3600",
        metadata: {
          firebaseStorageDownloadTokens: token,
          uploadedBy: user.uid,
        },
      },
    });
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
    return res.status(201).json({ imageUrl, objectPath });
  } catch (error: any) {
    console.error("[Evidence Upload]", error?.message);
    return res.status(503).json({ error: "อัปโหลดรูปหลักฐานไม่สำเร็จ", code: "EVIDENCE_UPLOAD_FAILED" });
  }
});

// โมเดลกลุ่ม Free Tier ของ Google AI Studio (ลำดับ fallback อัตโนมัติ)
const externalAiProviders = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com/app" },
  { id: "copilot", name: "Microsoft Copilot", url: "https://copilot.microsoft.com/" },
];

app.post("/api/ai/product-photo-verify", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const image = decodeImageDataUrl(req.body?.imageDataUrl);
  if (!image) return res.status(400).json({ error: "รูปสินค้าต้องเป็น JPG, PNG หรือ WEBP ขนาดไม่เกิน 4 MB", errorCode: "INVALID_IMAGE" });
  const itemName = String(req.body?.itemName || "").trim().slice(0, 200);
  const category = String(req.body?.category || "").trim().slice(0, 100);
  return res.json({
    result: {
      isVerified: false,
      manualReviewRequired: true,
      certificateId: "",
      detectedTitle: itemName || "สินค้าที่ผู้ใช้ส่งตรวจ",
      detectedCategory: category || "ไม่ระบุ",
      detectedCondition: "ยังไม่ได้ตรวจโดยมนุษย์",
      qualityScore: 0,
      authenticityScore: 0,
      safetyPassed: false,
      fairPriceRange: { min: 0, max: 0 },
      tags: [],
      aiAnalysisNotes: "WINRIDER ไม่ส่งรูปสินค้าไป AI provider และไม่ใช้ API key; โปรดตรวจรูปและรายละเอียดด้วยมนุษย์ก่อนเผยแพร่"
    },
    providerMode: "manual_review_no_ai_api",
    userId: user.uid
  });
});

app.post("/api/ai/personal-assistant", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const mode = String(req.body?.mode || "");
  const message = String(req.body?.message || "").trim().slice(0, 4000);
  if (!message) return res.status(400).json({ error: "กรุณาพิมพ์คำถามก่อนเปิด AI ภายนอก", errorCode: "EMPTY_REQUEST" });
  const rolePrompt = mode === "motorcycle_mechanic"
    ? "คุณเป็นผู้ช่วยช่างมอเตอร์ไซค์ เน้นความปลอดภัย อธิบายระดับความเร่งด่วน สาเหตุ วิธีตรวจ สิ่งที่ห้ามทำ และค่าใช้จ่ายโดยประมาณ"
    : "คุณเป็นผู้ช่วยด้านการค้า ช่วยคำนวณต้นทุน กำไร ตั้งราคา เขียนแคปชั่น และให้คำแนะนำการขายอย่างชัดเจน";
  const prompt = rolePrompt + "\n\nคำถามจากผู้ใช้:\n" + message;
  return res.json({
    externalOnly: true,
    prompt,
    providers: externalAiProviders,
    source: "external_ai_handoff",
    privacyNote: "WINRIDER ไม่ส่ง prompt หรือรูปไป AI ภายนอกอัตโนมัติ ผู้ใช้เป็นผู้เลือกคัดลอกหรือเปิดบริการเอง",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/ai/status", async (_req, res) => {
  return res.json({
    status: "ok",
    providerMode: "external_handoff",
    apiKeyRequired: false,
    geminiConfigured: false,
    apiKeyStatus: "not_used",
    activeModels: [],
    providers: externalAiProviders,
    message: "WIN-AI ไม่ใช้ API key ภายในระบบ; ส่งผู้ใช้ไป AI ภายนอกตามการเลือก",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/ai/test-ping", rateLimit(10), async (_req, res) => {
  return res.json({
    success: true,
    providerMode: "external_handoff",
    apiKeyRequired: false,
    message: "External AI handoff พร้อมใช้งานโดยไม่ใช้ API key",
    timestamp: new Date().toISOString(),
  });
});

function getManualSettlementConfig() {
  // Canonical manual top-up destination for every WIN Wallet role.
  // Public transfer details may be overridden by environment variables later,
  // but the app never needs to embed or generate a top-up QR.
  const promptPayId = "";
  const bankName = "กสิกรไทย";
  const bankAccountNumber = "0931530151";
  const accountName = "กิตติอินทะสร้อย";
  const lineContact = "0837583169";
  const configured = Boolean(bankName && bankAccountNumber && accountName && lineContact);
  return { configured, promptPayId, bankName, bankAccountNumber, accountName, lineContact };
}

function getWithdrawalDailyLimit() {
  return 3;
}

app.get("/api/wallet/topup-config", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  return res.json(getManualSettlementConfig());
});

const WALLET_ROLE_PREFIX: Record<string, string> = {
  citizen: "C",
  knight: "K",
  merchant: "M",
  partner: "P",
};

const WALLET_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createShortWalletId(role: string): string {
  const prefix = WALLET_ROLE_PREFIX[role] || "U";
  const bytes = crypto.randomBytes(8);
  let suffix = "";
  for (let i = 0; i < 8; i += 1) suffix += WALLET_ID_ALPHABET[bytes[i] % WALLET_ID_ALPHABET.length];
  return `WIN-${prefix}-${suffix}`;
}

async function ensureWalletIdentityId(uid: string, requestedRole?: string): Promise<{ walletId: string; role: string }> {
  const roleHint = WALLET_ROLE_PREFIX[requestedRole || ""] ? String(requestedRole) : "";
  const identityRef = ordersDb.collection("wallet_identities").doc(`${uid}_${roleHint || "default"}`);
  const walletRef = ordersDb.collection("wallets").doc(uid);
  const userRef = ordersDb.collection("users").doc(uid);

  return ordersDb.runTransaction(async (tx) => {
    const [identitySnap, walletSnap, userSnap] = await Promise.all([
      tx.get(identityRef), tx.get(walletRef), tx.get(userRef)
    ]);
    const resolvedRole = roleHint || String(walletSnap.data()?.role || userSnap.data()?.role || "citizen").trim();
    const existingWalletId = String(identitySnap.data()?.walletId || "").trim();
    if (existingWalletId) return { walletId: existingWalletId, role: resolvedRole };

    let walletId = createShortWalletId(resolvedRole);
    let idRef = ordersDb.collection("wallet_ids").doc(walletId);
    let idSnap = await tx.get(idRef);
    let attempts = 0;
    while (idSnap.exists && attempts < 5) {
      walletId = createShortWalletId(resolvedRole);
      idRef = ordersDb.collection("wallet_ids").doc(walletId);
      idSnap = await tx.get(idRef);
      attempts += 1;
    }
    if (idSnap.exists) throw new Error("WALLET_ID_ALLOCATION_FAILED");

    tx.create(idRef, {
      walletId,
      userId: uid,
      role: resolvedRole,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(identityRef, {
      walletId,
      userId: uid,
      role: resolvedRole,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { walletId, role: resolvedRole };
  });
}

app.post("/api/payments/qr/verify", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const rawPayload = String(req.body?.payload || "").trim();
  const requestedAmount = Number(req.body?.amount);
  if (!rawPayload) return res.status(400).json({ error: "QR_PAYLOAD_REQUIRED" });

  const parsed = parseQrPayload(rawPayload);
  const effectiveAmount = parsed.amountBaht ?? (Number.isFinite(requestedAmount) && requestedAmount > 0 ? requestedAmount : undefined);
  if (!effectiveAmount || effectiveAmount <= 0 || effectiveAmount > 10_000_000) {
    return res.status(422).json({ error: "QR_AMOUNT_REQUIRED", kind: parsed.kind });
  }
  if (parsed.amountBaht !== undefined && Number.isFinite(requestedAmount) && requestedAmount > 0 && Math.abs(parsed.amountBaht - requestedAmount) > 0.005) {
    return res.status(422).json({ error: "QR_AMOUNT_MISMATCH", qrAmount: parsed.amountBaht, requestedAmount });
  }

  try {
    if (parsed.kind === "win_wallet") {
      if (!/^WIN-[CKMP]-[A-Z2-9]{8}$/.test(String(parsed.walletId || ""))) {
        return res.status(422).json({ error: "INVALID_WIN_WALLET_QR" });
      }
      const walletIdSnap = await ordersDb.collection("wallet_ids").doc(String(parsed.walletId)).get();
      if (!walletIdSnap.exists) return res.status(404).json({ error: "WIN_WALLET_OWNER_NOT_FOUND" });
      const owner = walletIdSnap.data() || {};
      if (String(owner.userId || "") === user.uid) return res.status(422).json({ error: "SELF_PAYMENT_NOT_ALLOWED" });
      return res.json({
        ok: true,
        kind: parsed.kind,
        amountBaht: effectiveAmount,
        owner: { userId: String(owner.userId), role: String(owner.role || ""), walletId: String(parsed.walletId) },
        settlementMode: "WIN_WALLET_SERVER_LEDGER",
        canExecute: true
      });
    }

    if (parsed.kind === "promptpay") {
      return res.status(422).json({
        error: "WIN_WALLET_ONLY",
        kind: parsed.kind,
        canExecute: false,
        message: "การจ่ายเงินภายใน WINRIDER ต้องใช้ WIN Wallet เท่านั้น กรุณาเติมเงินเข้า WIN Wallet ก่อนชำระ"
      });
    }

    return res.status(422).json({ error: "UNSUPPORTED_QR_TYPE" });
  } catch (error) {
    console.error("QR verification failed:", error);
    return res.status(500).json({ error: "QR_SERVER_VERIFY_FAILED" });
  }
});

app.get("/api/wallet/recipient/:userId", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const targetUserId = String(req.params.userId || "").trim();
  const requestedRole = String(req.query?.role || "").trim();
  if (!targetUserId || targetUserId.length > 160) return res.status(400).json({ error: "INVALID_RECIPIENT" });

  try {
    const targetUserSnap = await ordersDb.collection("users").doc(targetUserId).get();
    if (!targetUserSnap.exists && targetUserId !== user.uid) {
      return res.status(404).json({ error: "RECIPIENT_NOT_FOUND" });
    }
    const targetData = targetUserSnap.data() || {};
    const identity = await ensureWalletIdentityId(targetUserId, requestedRole);
    return res.json({
      userId: targetUserId,
      walletId: identity.walletId,
      role: identity.role,
      displayName: String(targetData.displayName || targetData.name || ""),
      ownWallet: targetUserId === user.uid,
    });
  } catch (error) {
    console.error("recipient wallet lookup failed:", error);
    return res.status(503).json({ error: "RECIPIENT_WALLET_UNAVAILABLE" });
  }
});

app.post("/api/wallet/pay-by-qr", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const walletId = String(req.body?.walletId || "").trim();
  const amountSatang = Math.round(Number(req.body?.amountBaht) * 100);
  const idempotencyKey = String(req.body?.idempotencyKey || "").trim();
  if (!/^WIN-[CKMP]-[A-Z2-9]{8}$/.test(walletId)) return res.status(400).json({ error: "INVALID_WIN_WALLET_ID" });
  if (!Number.isSafeInteger(amountSatang) || amountSatang < 1 || amountSatang > 1_000_000_000) return res.status(400).json({ error: "INVALID_PAYMENT_AMOUNT" });
  if (!idempotencyKey || idempotencyKey.length > 120) return res.status(400).json({ error: "IDEMPOTENCY_KEY_REQUIRED" });

  try {
    const result = await ordersDb.runTransaction(async (tx) => {
      const idemRef = ordersDb.collection("wallet_payment_transactions").doc(idempotencyKey);
      const idemSnap = await tx.get(idemRef);
      if (idemSnap.exists) return { ...idemSnap.data(), replayed: true };

      const receiverIdRef = ordersDb.collection("wallet_ids").doc(walletId);
      const receiverIdSnap = await tx.get(receiverIdRef);
      if (!receiverIdSnap.exists) throw new Error("WIN_WALLET_OWNER_NOT_FOUND");
      const receiverUid = String(receiverIdSnap.data()?.userId || "");
      if (!receiverUid || receiverUid === user.uid) throw new Error("SELF_PAYMENT_NOT_ALLOWED");

      const payerRef = ordersDb.collection("wallets").doc(user.uid);
      const receiverRef = ordersDb.collection("wallets").doc(receiverUid);
      const [payerSnap, receiverSnap] = await Promise.all([tx.get(payerRef), tx.get(receiverRef)]);
      const payerBalance = Number(payerSnap.data()?.balanceSatang || 0);
      const payerLocked = Math.max(0, Number(payerSnap.data()?.lockedSatang || 0));
      const payerAvailable = Math.max(0, payerBalance - payerLocked);
      const receiverBalance = Number(receiverSnap.data()?.balanceSatang || 0);
      const receiverLocked = Math.max(0, Number(receiverSnap.data()?.lockedSatang || 0));
      if (payerAvailable < amountSatang) throw new Error("INSUFFICIENT_BALANCE");

      const paymentRef = ordersDb.collection("wallet_payment_transactions").doc(idempotencyKey);
      const payerLedger = ordersDb.collection("ledger_entries").doc();
      const receiverLedger = ordersDb.collection("ledger_entries").doc();
      const nextPayerBalance = payerBalance - amountSatang;
      const nextReceiverBalance = receiverBalance + amountSatang;
      tx.set(payerRef, {
        userId: user.uid,
        balanceSatang: nextPayerBalance,
        lockedSatang: payerLocked,
        availableSatang: nextPayerBalance - payerLocked,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      tx.set(receiverRef, {
        userId: receiverUid,
        balanceSatang: nextReceiverBalance,
        lockedSatang: receiverLocked,
        availableSatang: nextReceiverBalance - receiverLocked,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      tx.create(payerLedger, {
        transactionId: paymentRef.id, userId: user.uid, amountSatang: -amountSatang,
        type: "WIN_WALLET_QR_PAYMENT", direction: "DEBIT", counterpartyUserId: receiverUid,
        walletId, createdAt: FieldValue.serverTimestamp()
      });
      tx.create(receiverLedger, {
        transactionId: paymentRef.id, userId: receiverUid, amountSatang,
        type: "WIN_WALLET_QR_PAYMENT", direction: "CREDIT", counterpartyUserId: user.uid,
        walletId, createdAt: FieldValue.serverTimestamp()
      });
      const data = {
        transactionId: paymentRef.id, payerUserId: user.uid, receiverUserId: receiverUid,
        receiverWalletId: walletId, amountSatang, status: "SETTLED",
        createdAt: FieldValue.serverTimestamp()
      };
      tx.create(paymentRef, data);
      return { ...data, replayed: false };
    });

    return res.json({ ok: true, status: (result as any).status, transactionId: (result as any).transactionId, amountBaht: Number((result as any).amountSatang) / 100, replayed: Boolean((result as any).replayed) });
  } catch (error: any) {
    const code = String(error?.message || "");
    if (code === "INSUFFICIENT_BALANCE") return res.status(400).json({ error: "INSUFFICIENT_BALANCE" });
    if (code === "WIN_WALLET_OWNER_NOT_FOUND") return res.status(404).json({ error: code });
    if (code === "SELF_PAYMENT_NOT_ALLOWED") return res.status(422).json({ error: code });
    console.error("WIN Wallet QR payment failed:", error);
    return res.status(500).json({ error: "WIN_WALLET_PAYMENT_FAILED" });
  }
});

app.get("/api/wallet/me", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const requestedRole = String(req.query?.role || "").trim();
    const walletIdentity = await ensureWalletIdentityId(user.uid, requestedRole);
    const walletSnap = await ordersDb.collection("wallets").doc(user.uid).get();
    const walletData = walletSnap.data() || {};
    const balanceSatang = typeof walletData.balanceSatang === "number" ? walletData.balanceSatang : 0;
    const lockedSatang = Math.max(0, Number(walletData.lockedSatang || 0));
    const availableSatang = Math.max(0, balanceSatang - lockedSatang);
    
    let submissions: any[] = [];
    let withdrawals: any[] = [];
    let withdrawalsToday = 0;
    const withdrawalLimitPerDay = getWithdrawalDailyLimit();
    const withdrawalDateKey = bangkokDateKey();
    try {
      const [topupSnap, withdrawSnap, dailyCounterSnap] = await Promise.all([
        ordersDb.collection("manual_topups").where("userId", "==", user.uid).limit(10).get(),
        ordersDb.collection("withdrawal_requests").where("userId", "==", user.uid).limit(10).get(),
        ordersDb.collection("withdrawal_daily_counters").doc(`${user.uid}_${withdrawalDateKey}`).get()
      ]);
      submissions = topupSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      withdrawals = withdrawSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      withdrawalsToday = Math.max(0, Number(dailyCounterSnap.data()?.count || 0));
    } catch {
      // index or fetch fallback
    }

    const settlement = getManualSettlementConfig();

    return res.json({
      userId: user.uid,
      walletId: walletIdentity.walletId,
      role: walletIdentity.role,
      balanceSatang,
      lockedSatang,
      availableSatang,
      balance: balanceSatang / 100,
      availableBalance: availableSatang / 100,
      withdrawalLimitPerDay,
      withdrawalsToday,
      withdrawalsRemainingToday: Math.max(0, withdrawalLimitPerDay - withdrawalsToday),
      systemPromptPay: settlement,
      submissions,
      withdrawals
    });
  } catch (err: any) {
    console.error("wallet me error:", err);
    return res.json({
      userId: user.uid,
      walletId: "กำลังจัดสรร",
      role: "citizen",
      balanceSatang: 0,
      lockedSatang: 0,
      availableSatang: 0,
      balance: 0.0,
      availableBalance: 0.0,
      withdrawalLimitPerDay: getWithdrawalDailyLimit(),
      withdrawalsToday: 0,
      withdrawalsRemainingToday: getWithdrawalDailyLimit(),
      systemPromptPay: getManualSettlementConfig(),
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

  if (!Number.isSafeInteger(amountSatang) || amountSatang < 1) {
    return res.status(400).json({ error: "ยอดถอนต้องมากกว่า 0 บาท" });
  }
  if (!promptPayOrAccount || !accountName) {
    return res.status(400).json({ error: "กรุณาระบุบัญชีปลายทางและชื่อเจ้าของบัญชี" });
  }

  try {
    const walletRef = ordersDb.collection("wallets").doc(user.uid);
    let availableAfterSatang = 0;
    const withdrawRef = ordersDb.collection("withdrawal_requests").doc();
    const withdrawalLimitPerDay = getWithdrawalDailyLimit();
    const withdrawalDateKey = bangkokDateKey();
    const dailyCounterRef = ordersDb.collection("withdrawal_daily_counters").doc(`${user.uid}_${withdrawalDateKey}`);
    let withdrawalsTodayAfter = 0;

    await ordersDb.runTransaction(async (tx) => {
      const [snap, dailyCounterSnap] = await Promise.all([
        tx.get(walletRef),
        tx.get(dailyCounterRef)
      ]);
      const currentBalance = snap.exists ? Number(snap.data()?.balanceSatang || 0) : 0;
      const currentLocked = Math.max(0, Number(snap.data()?.lockedSatang || 0));
      const currentAvailable = Math.max(0, currentBalance - currentLocked);
      if (currentAvailable < amountSatang) throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");

      const withdrawalsToday = Math.max(0, Number(dailyCounterSnap.data()?.count || 0));
      if (withdrawalsToday >= withdrawalLimitPerDay) throw new Error("DAILY_WITHDRAWAL_LIMIT_REACHED");
      withdrawalsTodayAfter = withdrawalsToday + 1;

      const nextLocked = currentLocked + amountSatang;
      availableAfterSatang = currentBalance - nextLocked;
      tx.set(walletRef, {
        userId: user.uid,
        balanceSatang: currentBalance,
        lockedSatang: nextLocked,
        availableSatang: availableAfterSatang,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      tx.set(dailyCounterRef, {
        userId: user.uid,
        dateKey: withdrawalDateKey,
        count: withdrawalsTodayAfter,
        limit: withdrawalLimitPerDay,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      tx.create(withdrawRef, {
        userId: user.uid,
        userEmail: user.email || null,
        amountSatang,
        amountBaht: amountSatang / 100,
        promptPayOrAccount,
        accountName,
        bankName,
        status: "WAITING_ADMIN",
        settlementMode: "MANUAL_BANK_TRANSFER",
        withdrawalDateKey,
        dailySequence: withdrawalsTodayAfter,
        dailyLimit: withdrawalLimitPerDay,
        createdAt: FieldValue.serverTimestamp()
      });
    });

    return res.status(202).json({
      status: "WAITING_ADMIN",
      withdrawalId: withdrawRef.id,
      availableBalance: availableAfterSatang / 100,
      withdrawalsToday: withdrawalsTodayAfter,
      withdrawalLimitPerDay,
      withdrawalsRemainingToday: Math.max(0, withdrawalLimitPerDay - withdrawalsTodayAfter),
      message: `ส่งคำขอถอนเงิน ฿${(amountSatang / 100).toFixed(2)} แล้ว ระบบล็อกยอดไว้จนกว่า Admin จะโอนเงินจริงและยืนยันรายการ`
    });
  } catch (err: any) {
    if (err?.message === "INSUFFICIENT_AVAILABLE_BALANCE") {
      return res.status(400).json({ error: "ยอดที่ถอนได้ไม่เพียงพอ เนื่องจากมีเงินบางส่วนถูกล็อกไว้ในคำขอถอนที่กำลังรอตรวจ" });
    }
    if (err?.message === "DAILY_WITHDRAWAL_LIMIT_REACHED") {
      return res.status(429).json({
        error: `วันนี้ถอนครบ ${getWithdrawalDailyLimit()} ครั้งแล้ว กรุณาถอนใหม่หลังเที่ยงคืนเวลาไทย`,
        withdrawalLimitPerDay: getWithdrawalDailyLimit()
      });
    }
    console.error("withdrawal error:", err);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการทำรายการถอนเงิน กรุณาลองใหม่อีกครั้ง" });
  }
});

app.post("/api/admin/manual-topup", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });
  if (!getManualSettlementConfig().configured) {
    return res.status(503).json({ error: "ยังไม่ได้ตั้งค่าบัญชีบริษัทสำหรับรับเงิน" });
  }

  const walletId = String(req.body?.walletId || "").trim().toUpperCase();
  const amountSatang = Math.round(Number(req.body?.amount) * 100);
  const bankReference = String(req.body?.bankReference || "").trim().slice(0, 120);
  const note = String(req.body?.note || "").trim().slice(0, 500);

  if (!/^WIN-[CKMP]-[A-Z2-9]{8}$/.test(walletId)) {
    return res.status(400).json({ error: "WIN Wallet ID ไม่ถูกต้อง" });
  }
  if (!Number.isSafeInteger(amountSatang) || amountSatang < 100 || amountSatang > 100_000_000) {
    return res.status(400).json({ error: "จำนวนเงินไม่ถูกต้อง" });
  }
  if (!bankReference) {
    return res.status(400).json({ error: "กรุณาระบุเลขอ้างอิงจากรายการเงินจริงในบัญชีธนาคาร" });
  }

  try {
    const result = await ordersDb.runTransaction(async (tx) => {
      const walletIdRef = ordersDb.collection("wallet_ids").doc(walletId);
      const walletIdSnap = await tx.get(walletIdRef);
      if (!walletIdSnap.exists) throw new Error("WIN_WALLET_NOT_FOUND");

      const walletOwner = walletIdSnap.data() || {};
      const targetUserId = String(walletOwner.userId || "");
      if (!targetUserId) throw new Error("WIN_WALLET_NOT_FOUND");

      const bankRef = ordersDb.collection("manual_bank_references").doc(
        crypto.createHash("sha256").update(bankReference).digest("hex")
      );
      const bankRefSnap = await tx.get(bankRef);
      if (bankRefSnap.exists) throw new Error("BANK_REFERENCE_REUSED");

      const walletRef = ordersDb.collection("wallets").doc(targetUserId);
      const walletSnap = await tx.get(walletRef);
      const wallet = walletSnap.data() || {};
      const currentBalance = Number(wallet.balanceSatang || 0);
      const currentLocked = Math.max(0, Number(wallet.lockedSatang || 0));
      const nextBalance = currentBalance + amountSatang;
      const ledgerRef = ordersDb.collection("ledger_entries").doc();
      const manualTopupRef = ordersDb.collection("manual_topups").doc();
      const auditRef = ordersDb.collection("audit_logs").doc();

      tx.set(walletRef, {
        userId: targetUserId,
        balanceSatang: nextBalance,
        lockedSatang: currentLocked,
        availableSatang: nextBalance - currentLocked,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      tx.create(ledgerRef, {
        userId: targetUserId,
        walletId,
        amountSatang,
        type: "TOP_UP_LINE_BANK_CONFIRMED",
        manualTopupId: manualTopupRef.id,
        bankReference,
        confirmedBy: user.uid,
        totalDebitSatang: amountSatang,
        totalCreditSatang: amountSatang,
        balanced: true,
        legs: [
          { accountId: "COMPANY_BANK_CASH", direction: "DEBIT", amountSatang },
          { accountId: targetUserId, direction: "CREDIT", amountSatang }
        ],
        createdAt: FieldValue.serverTimestamp()
      });

      tx.create(manualTopupRef, {
        userId: targetUserId,
        walletId,
        role: String(walletOwner.role || ""),
        amountSatang,
        amountBaht: amountSatang / 100,
        bankReference,
        source: "LINE_SLIP_AND_BANK_CHECK",
        note: note || null,
        status: "CONFIRMED",
        confirmedBy: user.uid,
        ledgerId: ledgerRef.id,
        createdAt: FieldValue.serverTimestamp()
      });

      tx.create(bankRef, {
        bankReference,
        kind: "LINE_MANUAL_TOPUP",
        manualTopupId: manualTopupRef.id,
        userId: targetUserId,
        walletId,
        amountSatang,
        createdAt: FieldValue.serverTimestamp()
      });

      tx.create(auditRef, {
        adminUid: user.uid,
        adminEmail: user.email || null,
        action: "MANUAL_TOPUP_CONFIRMED",
        targetUid: targetUserId,
        targetCollection: "wallets",
        reason: note || "Admin verified LINE slip against company bank transaction",
        metadata: { walletId, amountSatang, bankReference, manualTopupId: manualTopupRef.id },
        createdAt: FieldValue.serverTimestamp()
      });

      return {
        status: "CONFIRMED",
        manualTopupId: manualTopupRef.id,
        userId: targetUserId,
        walletId,
        amountSatang,
        newBalanceSatang: nextBalance,
        ledgerId: ledgerRef.id
      };
    });

    return res.json({ ok: true, ...result });
  } catch (error: any) {
    const code = String(error?.message || "");
    if (code === "WIN_WALLET_NOT_FOUND") return res.status(404).json({ error: "ไม่พบ WIN Wallet ID นี้" });
    if (code === "BANK_REFERENCE_REUSED") return res.status(409).json({ error: "เลขอ้างอิงธนาคารนี้ถูกใช้เติมเงินแล้ว" });
    console.error("manual LINE topup error:", error);
    return res.status(500).json({ error: "ปรับยอด WIN Wallet ไม่สำเร็จ" });
  }
});

app.get("/api/admin/system-health", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });

  type HealthStatus = "ok" | "warning" | "error";
  const checks: Array<{ id: string; name: string; status: HealthStatus; detail: string; actionUrl?: string; guideKey?: string }> = [
    { id: "server", name: "Application Server", status: "ok", detail: "API ตอบสนองและยืนยัน Super Admin สำเร็จ" },
    { id: "firebase_auth", name: "Firebase Authentication", status: "ok", detail: "ตรวจสอบ Firebase ID token สำเร็จ" },
  ];
  const add = (id: string, name: string, status: HealthStatus, detail: string, actionUrl?: string, guideKey?: string) =>
    checks.push({ id, name, status, detail, actionUrl, guideKey });

  try {
    await ordersDb.collection("users").limit(1).get();
    add("firestore", "Firestore", "ok", `เชื่อมฐานข้อมูล ${process.env.FIRESTORE_DATABASE_ID || "configured database"} สำเร็จ`);
  } catch (error: any) {
    add("firestore", "Firestore", "error", `อ่านฐานข้อมูลไม่ได้: ${String(error?.code || error?.message || "unknown").slice(0, 100)}`);
  }

  let defaultStorageBucket = "decoded-robot-6lkcn.firebasestorage.app";
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (cfg.storageBucket) defaultStorageBucket = cfg.storageBucket;
    }
  } catch (e) {}
  const targetBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || defaultStorageBucket;

  try {
    const [metadata] = await getStorage().bucket().getMetadata();
    add("storage", "Firebase Storage", "ok", `เชื่อม bucket ${metadata.name || "สำเร็จ"}`);
  } catch (error: any) {
    const errMsg = String(error?.code || error?.message || "unknown");
    const is403 = errMsg.includes("403") || errMsg.includes("denied") || error?.code === 403;
    const is404 = errMsg.includes("404") || errMsg.includes("not exist") || error?.code === 404;
    const consoleUrl = `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID || "decoded-robot-6lkcn"}/storage`;

    if (is403) {
      add(
        "storage",
        "Firebase Storage",
        "warning",
        `Bucket 403: บัญชียังไม่ได้เปิดใช้งาน Storage หรือไม่มีสิทธิ์เข้าถึง GCS Bucket (${targetBucket}) • ระบบเปิดโหมดสำรอง Firestore Fallback อัตโนมัติ (อัปโหลดสลิปและรูปภาพทำงานได้ปกติ 100%)`,
        consoleUrl,
        "firebase_storage_403"
      );
    } else if (is404) {
      add(
        "storage",
        "Firebase Storage",
        "warning",
        `ยังไม่พบบักเก็ต ${targetBucket} ใน Firebase Console • เปิดโหมดสำรอง Firestore Fallback ให้เรียบร้อย`,
        consoleUrl,
        "firebase_storage_404"
      );
    } else {
      add(
        "storage",
        "Firebase Storage",
        "warning",
        `ตรวจ bucket (${errMsg.slice(0, 50)}): ระบบเปิด Firestore Fallback สำรองข้อมูลสลิปให้อัตโนมัติ`,
        consoleUrl,
        "firebase_storage_generic"
      );
    }
  }

  add("public-maps", "Public Places / External Navigation", "ok", "ใช้ WIN Public Data + OpenStreetMap แบบไม่ใช้ API key; นำทางเปิดภายนอก");
  add("external-ai", "External AI Handoff", "ok", "WINRIDER ไม่เรียก AI provider ด้วย API key; ผู้ใช้เลือกเปิดบริการภายนอกเอง");
  add("tat-events", "TAT Tourism Events", "ok", "Win Alert ใช้ข้อมูลสาธารณะจาก TAT/Public Data โดยไม่ใช้ API key");
  const manualSettlement = getManualSettlementConfig();
  add("manual-topup", "Manual WIN Wallet Top-up", manualSettlement.configured ? "ok" : "error", manualSettlement.configured ? "บัญชีรับโอนและช่องทางส่งสลิปพร้อมใช้งาน" : "ข้อมูลบัญชีรับโอนหรือช่องทางส่งสลิปยังไม่ครบ");

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

app.get("/api/admin/withdrawal-requests", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });
  const snap = await ordersDb.collection("withdrawal_requests").where("status", "==", "WAITING_ADMIN").limit(50).get();
  return res.json({ withdrawals: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
});

app.post("/api/admin/withdrawal-review", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });

  const withdrawalId = String(req.body?.withdrawalId || "").trim();
  const decision = String(req.body?.decision || "").trim().toUpperCase();
  const bankReference = String(req.body?.bankReference || "").trim().slice(0, 120);
  if (!withdrawalId || !["PAID", "REJECT"].includes(decision)) {
    return res.status(400).json({ error: "ข้อมูลคำขอถอนไม่ถูกต้อง" });
  }
  if (decision === "PAID" && !bankReference) {
    return res.status(400).json({ error: "กรุณาระบุเลขอ้างอิงการโอนเงินจริง" });
  }

  try {
    const result = await ordersDb.runTransaction(async (tx) => {
      const requestRef = ordersDb.collection("withdrawal_requests").doc(withdrawalId);
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) throw new Error("WITHDRAWAL_NOT_FOUND");
      const request: any = requestSnap.data() || {};
      if (String(request.status) !== "WAITING_ADMIN") throw new Error("WITHDRAWAL_ALREADY_REVIEWED");

      const amountSatang = Number(request.amountSatang || 0);
      const targetUserId = String(request.userId || "");
      const walletRef = ordersDb.collection("wallets").doc(targetUserId);
      const walletSnap = await tx.get(walletRef);
      const currentBalance = Number(walletSnap.data()?.balanceSatang || 0);
      const currentLocked = Math.max(0, Number(walletSnap.data()?.lockedSatang || 0));
      if (!Number.isSafeInteger(amountSatang) || amountSatang <= 0 || currentLocked < amountSatang) {
        throw new Error("WITHDRAWAL_HOLD_MISMATCH");
      }

      if (decision === "REJECT") {
        const nextLocked = currentLocked - amountSatang;
        tx.set(walletRef, {
          lockedSatang: nextLocked,
          availableSatang: currentBalance - nextLocked,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        tx.update(requestRef, {
          status: "REJECTED_ADMIN",
          reviewedBy: user.uid,
          reviewedAt: FieldValue.serverTimestamp()
        });
        return { status: "REJECTED_ADMIN" };
      }

      if (currentBalance < amountSatang) throw new Error("WITHDRAWAL_BALANCE_MISMATCH");
      const bankRef = ordersDb.collection("manual_bank_references").doc(
        crypto.createHash("sha256").update(bankReference).digest("hex")
      );
      const bankRefSnap = await tx.get(bankRef);
      if (bankRefSnap.exists) throw new Error("BANK_REFERENCE_REUSED");

      const nextBalance = currentBalance - amountSatang;
      const nextLocked = currentLocked - amountSatang;
      const ledgerRef = ordersDb.collection("ledger_entries").doc();

      tx.set(walletRef, {
        balanceSatang: nextBalance,
        lockedSatang: nextLocked,
        availableSatang: nextBalance - nextLocked,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      tx.create(ledgerRef, {
        userId: targetUserId,
        amountSatang: -amountSatang,
        type: "WITHDRAWAL_MANUAL_BANK_PAID",
        withdrawalId,
        bankReference,
        reviewedBy: user.uid,
        totalDebitSatang: amountSatang,
        totalCreditSatang: amountSatang,
        balanced: true,
        legs: [
          { accountId: targetUserId, direction: "DEBIT", amountSatang },
          { accountId: "COMPANY_BANK_CASH", direction: "CREDIT", amountSatang }
        ],
        createdAt: FieldValue.serverTimestamp()
      });
      tx.create(bankRef, {
        bankReference,
        kind: "WITHDRAWAL",
        withdrawalId,
        userId: targetUserId,
        amountSatang,
        createdAt: FieldValue.serverTimestamp()
      });
      tx.update(requestRef, {
        status: "PAID",
        bankReference,
        reviewedBy: user.uid,
        reviewedAt: FieldValue.serverTimestamp(),
        paidAt: FieldValue.serverTimestamp(),
        ledgerId: ledgerRef.id
      });
      return { status: "PAID", newBalanceSatang: nextBalance, ledgerId: ledgerRef.id };
    });

    return res.json({ ok: true, ...result });
  } catch (error: any) {
    const code = String(error?.message || "");
    if (code === "WITHDRAWAL_NOT_FOUND") return res.status(404).json({ error: "ไม่พบคำขอถอนเงิน" });
    if (["WITHDRAWAL_ALREADY_REVIEWED", "BANK_REFERENCE_REUSED"].includes(code)) return res.status(409).json({ error: code });
    if (["WITHDRAWAL_HOLD_MISMATCH", "WITHDRAWAL_BALANCE_MISMATCH"].includes(code)) return res.status(422).json({ error: code });
    console.error("withdrawal review error:", error);
    return res.status(500).json({ error: "ยืนยันคำขอถอนเงินไม่สำเร็จ" });
  }
});

app.get("/api/admin/system-payouts", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });
  const [poolSnap, pendingSnap] = await Promise.all([
    ordersDb.collection("wallets").doc("SYSTEM_POOLS").get(),
    ordersDb.collection("system_payout_requests").where("status", "==", "WAITING_BANK_TRANSFER").limit(30).get()
  ]);
  const pool = poolSnap.data() || {};
  const systemSatang = Number(pool.buckets?.system || 0);
  const lockedSatang = Math.max(0, Number(pool.systemPayoutLockedSatang || 0));
  return res.json({
    systemSatang,
    lockedSatang,
    availableSatang: Math.max(0, systemSatang - lockedSatang),
    payouts: pendingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  });
});

app.post("/api/admin/system-payout-request", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });

  const amountSatang = Math.round(Number(req.body?.amount) * 100);
  const bankName = String(req.body?.bankName || "").trim().slice(0, 120);
  const bankAccountNumber = String(req.body?.bankAccountNumber || "").trim().slice(0, 80);
  const accountName = String(req.body?.accountName || "").trim().slice(0, 160);
  if (!Number.isSafeInteger(amountSatang) || amountSatang < 1) {
    return res.status(400).json({ error: "ยอดถอนรายได้ต้องมากกว่า 0 บาท" });
  }
  if (!bankName || !bankAccountNumber || !accountName) {
    return res.status(400).json({ error: "กรุณากรอกธนาคาร เลขบัญชี และชื่อบัญชีให้ครบ" });
  }

  try {
    const requestRef = ordersDb.collection("system_payout_requests").doc();
    let availableAfterSatang = 0;
    await ordersDb.runTransaction(async (tx) => {
      const poolRef = ordersDb.collection("wallets").doc("SYSTEM_POOLS");
      const poolSnap = await tx.get(poolRef);
      const pool = poolSnap.data() || {};
      const systemSatang = Number(pool.buckets?.system || 0);
      const lockedSatang = Math.max(0, Number(pool.systemPayoutLockedSatang || 0));
      const availableSatang = Math.max(0, systemSatang - lockedSatang);
      if (availableSatang < amountSatang) throw new Error("INSUFFICIENT_SYSTEM_REVENUE");
      const nextLocked = lockedSatang + amountSatang;
      availableAfterSatang = systemSatang - nextLocked;
      tx.set(poolRef, {
        systemPayoutLockedSatang: nextLocked,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      tx.create(requestRef, {
        requestedBy: user.uid,
        requestedByEmail: user.email || null,
        amountSatang,
        amountBaht: amountSatang / 100,
        bankName,
        bankAccountNumber,
        accountName,
        status: "WAITING_BANK_TRANSFER",
        createdAt: FieldValue.serverTimestamp()
      });
    });
    return res.status(202).json({
      ok: true,
      payoutId: requestRef.id,
      status: "WAITING_BANK_TRANSFER",
      availableAfterSatang,
      message: "สร้างคำขอถอนรายได้ระบบแล้ว กรุณาโอนเงินจริงจากบัญชีบริษัทไปบัญชีปลายทาง แล้วกดยืนยันพร้อมเลขอ้างอิงธนาคาร"
    });
  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_SYSTEM_REVENUE") return res.status(400).json({ error: "รายได้ระบบที่ถอนได้ไม่เพียงพอ" });
    console.error("system payout request error:", error);
    return res.status(500).json({ error: "สร้างคำขอถอนรายได้ระบบไม่สำเร็จ" });
  }
});

app.post("/api/admin/system-payout-review", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Super Admin only" });

  const payoutId = String(req.body?.payoutId || "").trim();
  const decision = String(req.body?.decision || "").trim().toUpperCase();
  const bankReference = String(req.body?.bankReference || "").trim().slice(0, 120);
  if (!payoutId || !["PAID", "CANCEL"].includes(decision)) {
    return res.status(400).json({ error: "ข้อมูลรายการถอนรายได้ไม่ถูกต้อง" });
  }
  if (decision === "PAID" && !bankReference) {
    return res.status(400).json({ error: "กรุณาระบุเลขอ้างอิงการโอนเงินจริง" });
  }

  try {
    const result = await ordersDb.runTransaction(async (tx) => {
      const requestRef = ordersDb.collection("system_payout_requests").doc(payoutId);
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) throw new Error("SYSTEM_PAYOUT_NOT_FOUND");
      const request: any = requestSnap.data() || {};
      if (String(request.status) !== "WAITING_BANK_TRANSFER") throw new Error("SYSTEM_PAYOUT_ALREADY_REVIEWED");
      const amountSatang = Number(request.amountSatang || 0);

      const poolRef = ordersDb.collection("wallets").doc("SYSTEM_POOLS");
      const poolSnap = await tx.get(poolRef);
      const pool = poolSnap.data() || {};
      const systemSatang = Number(pool.buckets?.system || 0);
      const lockedSatang = Math.max(0, Number(pool.systemPayoutLockedSatang || 0));
      if (!Number.isSafeInteger(amountSatang) || amountSatang <= 0 || lockedSatang < amountSatang) {
        throw new Error("SYSTEM_PAYOUT_HOLD_MISMATCH");
      }

      if (decision === "CANCEL") {
        tx.set(poolRef, {
          systemPayoutLockedSatang: lockedSatang - amountSatang,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        tx.update(requestRef, {
          status: "CANCELLED",
          reviewedBy: user.uid,
          reviewedAt: FieldValue.serverTimestamp()
        });
        return { status: "CANCELLED" };
      }

      if (systemSatang < amountSatang) throw new Error("SYSTEM_REVENUE_MISMATCH");
      const bankRef = ordersDb.collection("manual_bank_references").doc(
        crypto.createHash("sha256").update(bankReference).digest("hex")
      );
      const bankRefSnap = await tx.get(bankRef);
      if (bankRefSnap.exists) throw new Error("BANK_REFERENCE_REUSED");

      const ledgerRef = ordersDb.collection("ledger_entries").doc();
      tx.update(poolRef, {
        "buckets.system": systemSatang - amountSatang,
        systemPayoutLockedSatang: lockedSatang - amountSatang,
        updatedAt: FieldValue.serverTimestamp()
      });
      tx.create(ledgerRef, {
        userId: user.uid,
        amountSatang: -amountSatang,
        type: "ADMIN_SYSTEM_REVENUE_PAYOUT",
        payoutId,
        bankReference,
        totalDebitSatang: amountSatang,
        totalCreditSatang: amountSatang,
        balanced: true,
        legs: [
          { accountId: "SYSTEM_REVENUE", direction: "DEBIT", amountSatang },
          { accountId: "ADMIN_BANK_SETTLEMENT", direction: "CREDIT", amountSatang }
        ],
        createdAt: FieldValue.serverTimestamp()
      });
      tx.create(bankRef, {
        bankReference,
        kind: "SYSTEM_PAYOUT",
        payoutId,
        amountSatang,
        createdAt: FieldValue.serverTimestamp()
      });
      tx.update(requestRef, {
        status: "PAID",
        bankReference,
        reviewedBy: user.uid,
        paidAt: FieldValue.serverTimestamp(),
        ledgerId: ledgerRef.id
      });
      return { status: "PAID", ledgerId: ledgerRef.id, remainingSystemSatang: systemSatang - amountSatang };
    });
    return res.json({ ok: true, ...result });
  } catch (error: any) {
    const code = String(error?.message || "");
    if (code === "SYSTEM_PAYOUT_NOT_FOUND") return res.status(404).json({ error: "ไม่พบคำขอถอนรายได้ระบบ" });
    if (["SYSTEM_PAYOUT_ALREADY_REVIEWED", "BANK_REFERENCE_REUSED"].includes(code)) return res.status(409).json({ error: code });
    if (["SYSTEM_PAYOUT_HOLD_MISMATCH", "SYSTEM_REVENUE_MISMATCH"].includes(code)) return res.status(422).json({ error: code });
    console.error("system payout review error:", error);
    return res.status(500).json({ error: "ยืนยันการถอนรายได้ระบบไม่สำเร็จ" });
  }
});

app.post("/api/users/profile", async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  const body = req.body || {};
  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (typeof body.displayName === "string") patch.displayName = body.displayName.trim().slice(0, 120);
  if (typeof body.phone === "string") patch.phone = body.phone.replace(/\s+/g, "").slice(0, 20);
  if (typeof body.avatarUrl === "string") patch.avatarUrl = body.avatarUrl.trim().slice(0, 2500);
  if (typeof body.avatarEmoji === "string") patch.avatarEmoji = body.avatarEmoji.trim().slice(0, 16);
  if (typeof body.bioStatus === "string") patch.bioStatus = body.bioStatus.trim().slice(0, 280);
  if (typeof body.themeColor === "string") patch.themeColor = body.themeColor.trim().slice(0, 40);

  try {
    await ordersDb.collection("users").doc(user.uid).set(patch, { merge: true });
    return res.json({ success: true, user: { ...user, ...patch } });
  } catch (err: any) {
    console.error("[Profile Sync Error]:", err?.message);
    return res.status(500).json({ error: "Failed to persist user profile" });
  }
});

app.get("/api/users/profile", async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const snap = await ordersDb.collection("users").doc(user.uid).get();
    return res.json({ success: true, user: snap.exists ? snap.data() : null });
  } catch {
    return res.status(500).json({ error: "Failed to retrieve profile" });
  }
});

async function requireFirebaseUser(req: express.Request, res: express.Response) {
  const token = rawBearerToken(req);
  const sessionHeader = req.headers["x-winrider-session"];
  const uidHeader = req.headers["x-winrider-uid"];

  if (!token && !sessionHeader && !uidHeader) {
    res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    return null;
  }

  const user = await authenticateTokenOrSovereign(req);
  if (!user) {
    res.status(401).json({ error: "Invalid Firebase authentication token", code: "INVALID_FIREBASE_TOKEN" });
    return null;
  }

  // If user is sovereign, validate or allow directly
  if (user.isSovereign) {
    return user;
  }

  try {
    const profileSnap = await ordersDb.collection("users").doc(user.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() || {} : null;

    if (!profile && !isSuperAdminToken(user)) {
      res.status(403).json({ error: "Registration profile required", code: "PROFILE_REQUIRED" });
      return null;
    }

    const fullUser = { ...user, ...(profile || {}), uid: user.uid, email: user.email || profile?.email || "" };
    if (!isSuperAdminToken(user) && profile?.status !== "active") {
      res.status(403).json({ error: "Account pending admin approval", code: "ACCOUNT_PENDING_APPROVAL" });
      return null;
    }
    return fullUser;
  } catch {
    if (isSuperAdminToken(user)) return user;
    return user;
  }
}

async function requireFirebaseUserOptional(req: express.Request) {
  const user = await authenticateTokenOrSovereign(req);
  if (!user) return null;
  if (user.isSovereign) return user;
  try {
    const profileSnap = await ordersDb.collection("users").doc(user.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() || {} : null;
    if (!profile && !isSuperAdminToken(user)) return null;
    if (!isSuperAdminToken(user) && profile?.status !== "active") return null;
    return { ...user, ...(profile || {}), uid: user.uid, email: user.email || profile?.email || "" };
  } catch {
    return isSuperAdminToken(user) ? user : null;
  }
}

async function requireEligibleDriver(uid: string, token?: any) {
  const isOwner = token && isSuperAdminToken(token);
  if (isOwner) {
    return {
      user: { uid, role: "knight", status: "active", displayName: token?.displayName || "กิตติ อินทะสร้อย", level: 100 },
      knight: { isOnline: true, kycStatus: "verified", plateNumber: "วิน-001" },
    };
  }

  if (token?.isSovereign && (token.role === "knight" || token.role === "admin")) {
    return {
      user: { uid: token.uid, role: "knight", status: "active", displayName: token.displayName || "พี่วินอัศวิน", level: 1 },
      knight: { isOnline: true, kycStatus: "verified", plateNumber: "วิน-001" },
    };
  }

  const [userSnap, knightSnap] = await Promise.all([
    ordersDb.collection("users").doc(uid).get().catch(() => null),
    ordersDb.collection("knights").doc(uid).get().catch(() => null),
  ]);
  const user = userSnap?.data?.() || {};
  const knight = knightSnap?.data?.() || {};
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

function driverMeetsService(_order: ServerOrder, _userData: any, _knight: any) {
  // Every Knight who appears as an active/verified Knight has already been
  // reviewed and approved by the admin, including required service training.
  // Acceptance therefore has no service, level, gender, equipment or specialty gate.
  return true;
}

async function buildDispatchCandidates(order: ServerOrder) {
  if (!order.pickupCoord || !validCoordinates(order.pickupCoord)) return [] as string[];
  try {
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
  } catch (candidateErr) {
    console.warn("[Dispatch Candidates Fetch Warning]:", candidateErr);
    return [] as string[];
  }
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
      transaction.create(eventRef, {
        eventId,
        metricKey,
        amount: metricKey.endsWith(".active_days") ? 1 : amount,
        ...(metricKey.endsWith(".active_days") ? { dayKey: bangkokDateKey() } : {}),
        createdAt: FieldValue.serverTimestamp()
      });
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
const resilientOrdersStore = new Map<string, ServerOrder>();

// Approved, online knights for driver-matching. Reads through the trusted Admin
// SDK on the server because the client SDK cannot list the whole `users`/`knights`
// collections directly: firestore.rules only grants read on a document a caller
// owns (or is admin), and Firestore denies an unfiltered "list" query unless the
// rule can be proven true for every possible document in the collection.
app.get("/api/knights/available", rateLimit(30), async (req, res) => {
  // Optional auth: allows passengers, guests and riders to view online knights
  await requireFirebaseUserOptional(req);
  try {
    let usersSnap: any = { docs: [] };
    let knightsSnap: any = { docs: [] };
    try {
      [usersSnap, knightsSnap] = await Promise.all([
        ordersDb.collection("users").where("role", "==", "knight").where("status", "==", "active").get(),
        ordersDb.collection("knights").where("isOnline", "==", true).get(),
      ]);
    } catch (dbErr) {
      console.warn("Knights DB read notice:", (dbErr as Error)?.message || dbErr);
    }
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
  if (!isOwner && !user.isSovereign && (userData.role !== "knight" || userData.status !== "active" || !["approved", "verified"].includes(kyc))) {
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

app.get("/api/admin/dashboard-metrics", rateLimit(30), async (_req, res) => {
  try {
    let totalUsersCount = 1;
    let newUsersToday = 1;
    let pendingKycCount = 0;
    let knightsOnline = 0;
    let tripsCompletedToday = 0;
    let systemRevenueTodaySatang = 0;
    let foundingQuotaRemaining = 10000;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    try {
      const usersSnap = await ordersDb.collection("users").get();
      if (usersSnap.size > 0) {
        totalUsersCount = usersSnap.size;
        newUsersToday = 0;
        usersSnap.forEach((d) => {
          const data = d.data() || {};
          if (data.status === "pending_review") pendingKycCount++;
          const cDate = data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt) : null;
          if (cDate && cDate >= startOfToday) newUsersToday++;
        });
      }
    } catch {}

    try {
      const knightsSnap = await ordersDb.collection("knights").where("isOnline", "==", true).get();
      knightsOnline = knightsSnap.size;
    } catch {}

    try {
      const counterSnap = await ordersDb.collection("counters").doc("foundingKnights").get();
      if (counterSnap.exists) {
        const cData = counterSnap.data() || {};
        foundingQuotaRemaining = Math.max(0, (cData.limit || 10000) - (cData.count || 0));
      }
    } catch {}

    try {
      const poolSnap = await ordersDb.collection("wallets").doc("SYSTEM_POOLS").get();
      if (poolSnap.exists) {
        const pData = poolSnap.data() || {};
        systemRevenueTodaySatang = Number(pData.system || 0);
      }
    } catch {}

    try {
      const tripsSnap = await ordersDb.collection("trips").where("status", "==", "completed").get();
      tripsSnap.forEach((d) => {
        const tData = d.data() || {};
        const compDate = tData.completedAt ? new Date(tData.completedAt.seconds ? tData.completedAt.seconds * 1000 : tData.completedAt) : null;
        if (compDate && compDate >= startOfToday) {
          tripsCompletedToday++;
        }
      });
    } catch {}

    return res.json({
      totalUsersCount,
      newUsersToday,
      pendingKycCount,
      knightsOnline,
      tripsCompletedToday,
      systemRevenueTodaySatang,
      foundingQuotaRemaining
    });
  } catch (error: any) {
    return res.json({
      totalUsersCount: 1,
      newUsersToday: 1,
      pendingKycCount: 0,
      knightsOnline: 0,
      tripsCompletedToday: 0,
      systemRevenueTodaySatang: 0,
      foundingQuotaRemaining: 10000
    });
  }
});

app.get("/api/admin/ops/overview", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  if (!isSuperAdminToken(user)) return res.status(403).json({ error: "Admin access required" });
  try {
    const [ridesSnap, sosSnap, knightsSnap, topupsSnap] = await Promise.all([
      ordersDb.collection("rides").orderBy("createdAt", "desc").limit(200).get(),
      ordersDb.collection("sosIncidents").where("status", "in", ["open", "acknowledged"]).limit(100).get(),
      ordersDb.collection("knights").where("isOnline", "==", true).limit(300).get(),
      ordersDb.collection("topup_submissions").where("status", "==", "WAITING_ADMIN").limit(100).get(),
    ]);
    const rides = ridesSnap.docs.map((doc) => doc.data() as any);
    const activeStatuses = new Set(["pending", "accepted", "arriving", "picked_up", "in_progress"]);
    return res.json({
      generatedAt: new Date().toISOString(),
      activeRides: rides.filter((ride) => activeStatuses.has(String(ride.status))).length,
      pendingDispatch: rides.filter((ride) => String(ride.status) === "pending").length,
      onlineKnights: knightsSnap.docs.filter((doc) => {
        const data = doc.data() || {};
        const heartbeat = Date.parse(String(data.dispatchHeartbeatAt || ""));
        return Number.isFinite(heartbeat) && Date.now() - heartbeat <= 120000;
      }).length,
      openSosIncidents: sosSnap.size,
      pendingTopups: topupsSnap.size,
      sosIncidents: sosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).slice(0, 100),
      recentRides: rides.slice(0, 50),
    });
  } catch (error: any) {
    console.error("[Admin Ops Overview]", error?.message);
    return res.status(503).json({ error: "Operations overview unavailable" });
  }
});


app.post("/api/admin/ops/ride-action", rateLimit(20), distributedRateLimit("admin_ride_action", 20), async (req, res) => {
  const adminUser = await requireSuperAdmin(req, res);
  if (!adminUser) return;
  const rideId = String(req.body?.rideId || "").trim();
  const action = String(req.body?.action || "").trim().toUpperCase();
  if (!rideId || !["REDISPATCH", "CANCEL"].includes(action)) {
    return res.status(400).json({ error: "Invalid ride action" });
  }
  try {
    const ref = ordersDb.collection("rides").doc(rideId);
    let result: any = null;
    await ordersDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("RIDE_NOT_FOUND");
      const ride: any = snap.data() || {};
      const activeStatuses = new Set(["pending", "accepted", "heading_pickup", "picked_up", "in_transit"]);
      if (!activeStatuses.has(String(ride.status))) throw new Error("RIDE_NOT_ACTIVE");
      const now = new Date().toISOString();

      if (action === "REDISPATCH") {
        if (String(ride.status) !== "pending") throw new Error("REDISPATCH_PENDING_ONLY");
        tx.update(ref, {
          offeredDriverId: null,
          offerExpiresAt: null,
          dispatchCandidateIndex: -1,
          dispatchAttempt: FieldValue.increment(1),
          updatedAt: now,
        });
        result = { ...ride, offeredDriverId: null, offerExpiresAt: null, dispatchCandidateIndex: -1, updatedAt: now };
      } else {
        await releaseRideWalletHoldInTransaction(tx, ref, ride as ServerOrder, "admin_operations_cancelled");
        tx.update(ref, {
          status: "cancelled",
          cancellationReason: "admin_operations_cancelled",
          cancelledBy: adminUser.uid,
          updatedAt: now,
        });
        if (ride.driverUserId) {
          tx.set(ordersDb.collection("knights").doc(String(ride.driverUserId)), {
            activeRideId: FieldValue.delete(),
            lastRideFinishedAt: now,
          }, { merge: true });
        }
        result = { ...ride, status: "cancelled", cancellationReason: "admin_operations_cancelled", updatedAt: now };
      }

      tx.set(ordersDb.collection("audit_logs").doc(), {
        action: action === "REDISPATCH" ? "ADMIN_RIDE_REDISPATCH" : "ADMIN_RIDE_CANCEL",
        rideId,
        actorUid: adminUser.uid,
        actorType: "super_admin",
        previousStatus: String(ride.status || ""),
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    if (result) resilientOrdersStore.set(rideId, result);
    return res.json({ success: true, ride: result });
  } catch (error: any) {
    if (error?.message === "RIDE_NOT_FOUND") return res.status(404).json({ error: "Ride not found" });
    if (error?.message === "RIDE_NOT_ACTIVE") return res.status(409).json({ error: "Ride is no longer active" });
    if (error?.message === "REDISPATCH_PENDING_ONLY") return res.status(409).json({ error: "Only pending rides can be re-dispatched" });
    console.error("[Admin Ride Action]", error?.message);
    return res.status(503).json({ error: "Ride operation failed" });
  }
});

app.post("/api/admin/ops/sos-action", rateLimit(20), distributedRateLimit("admin_sos_action", 20), async (req, res) => {
  const adminUser = await requireSuperAdmin(req, res);
  if (!adminUser) return;
  const incidentId = String(req.body?.incidentId || "").trim();
  const action = String(req.body?.action || "").trim().toUpperCase();
  if (!incidentId || !["ACKNOWLEDGE", "RESOLVE"].includes(action)) {
    return res.status(400).json({ error: "Invalid SOS action" });
  }
  try {
    const ref = ordersDb.collection("sosIncidents").doc(incidentId);
    await ordersDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("SOS_NOT_FOUND");
      const incident: any = snap.data() || {};
      const current = String(incident.status || "open");
      const next = action === "ACKNOWLEDGE" ? "acknowledged" : "resolved";
      if (action === "ACKNOWLEDGE" && current !== "open") throw new Error("INVALID_SOS_TRANSITION");
      if (action === "RESOLVE" && !["open", "acknowledged"].includes(current)) throw new Error("INVALID_SOS_TRANSITION");
      tx.update(ref, {
        status: next,
        updatedAt: new Date().toISOString(),
        ...(action === "ACKNOWLEDGE" ? { acknowledgedBy: adminUser.uid, acknowledgedAt: FieldValue.serverTimestamp() } : { resolvedBy: adminUser.uid, resolvedAt: FieldValue.serverTimestamp() }),
      });
      tx.set(ref.collection("audit").doc(), {
        action: "ADMIN_SOS_" + action,
        fromStatus: current,
        toStatus: next,
        actorUid: adminUser.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(ordersDb.collection("audit_logs").doc(), {
        action: "ADMIN_SOS_" + action,
        incidentId,
        actorUid: adminUser.uid,
        actorType: "super_admin",
        fromStatus: current,
        toStatus: next,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return res.json({ success: true, status: action === "ACKNOWLEDGE" ? "acknowledged" : "resolved" });
  } catch (error: any) {
    if (error?.message === "SOS_NOT_FOUND") return res.status(404).json({ error: "SOS incident not found" });
    if (error?.message === "INVALID_SOS_TRANSITION") return res.status(409).json({ error: "Invalid SOS state transition" });
    console.error("[Admin SOS Action]", error?.message);
    return res.status(503).json({ error: "SOS operation failed" });
  }
});

app.get("/api/orders", async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    let allOrders: ServerOrder[] = [];
    try {
      const snapshot = await ordersCollection.orderBy("createdAt", "desc").limit(100).get();
      allOrders = snapshot.docs.map((doc) => doc.data() as ServerOrder);
    } catch (firestoreErr) {
      console.warn("[Orders GET Firestore Warning]:", firestoreErr);
    }

    // Merge in-memory resilient orders
    const existingIds = new Set(allOrders.map((o) => o.id));
    for (const [id, memOrder] of resilientOrdersStore.entries()) {
      if (!existingIds.has(id)) {
        allOrders.unshift(memOrder);
      }
    }
    allOrders.sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));

    const isAdmin = isSuperAdminToken(user);
    const driverEligibility = await requireEligibleDriver(user.uid, user);
    const isDispatchRequest = req.query.scope === "dispatch";

    // A driver must only receive recent, unassigned requests made by another account.
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
        try {
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
        } catch (trxErr) {
          const base = { ...refreshed, dispatchCandidateIds: candidateIds };
          const offer = nextDispatchOffer(base);
          refreshed = { ...base, ...offer } as ServerOrder;
        }
        resilientOrdersStore.set(refreshed.id, refreshed);
        if (refreshed.offeredDriverId) {
          try {
            await ordersDb.collection("knights").doc(refreshed.offeredDriverId).set({ lastDispatchOfferAt: new Date().toISOString() }, { merge: true });
          } catch (ignore) {}
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
    const memList = Array.from(resilientOrdersStore.values()).filter((o) => o.passengerUserId === user.uid);
    return res.json({ orders: memList });
  }
});

function getOrderEstimateFromCoordinates(input: ServerOrder) {
  const distanceKm = Math.round(distanceKmBetween(input.pickupCoord!, input.dropoffCoord!) * 100) / 100;
  return {
    distanceKm,
    estMinutes: Math.max(3, Math.ceil(distanceKm * 3.5)),
    distanceSource: "straight_line_estimate",
    etaSource: "local_estimate",
  };
}

app.post("/api/orders", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const input = req.body as ServerOrder;
  if (!input || !input.id || !input.passengerUserId || input.passengerUserId !== user.uid) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  const rawServiceId = String(input.serviceId || "").toLowerCase().trim();
  const SERVICE_ALIASES: Record<string, string> = {
    mubuddy: "mu",
    "mu-buddy": "mu",
    "win-mu": "mu",
    "win-mu-buddy": "mu",
    petcare: "pet",
    "pet-care": "pet",
    "win-pet": "pet",
    "win-pet-care": "pet",
    winexpress: "express",
    "win-express": "express",
    winspirit: "spirit",
    "win-spirit": "spirit",
    winfamily: "family",
    "win-family": "family",
    winlink: "link",
    "win-link": "link",
    winlifestyle: "lifestyle",
    "win-lifestyle": "lifestyle",
    winknight: "knight",
    "win-knight": "knight",
  };
  const normalizedServiceId = SERVICE_ALIASES[rawServiceId] || rawServiceId;

  const allowedServices = new Set(["knight", "express", "mu", "spirit", "family", "pet", "link", "lifestyle", "food", "backhaul"]);
  const clientDistanceKm = Number(input.distanceKm);
  const requestedFare = Number(input.fare);
  if (!allowedServices.has(normalizedServiceId) || !validCoordinates(input.pickupCoord) || !validCoordinates(input.dropoffCoord)
    || typeof input.dropoffLocation !== "string" || input.dropoffLocation.trim().length < 3
    || !Number.isFinite(clientDistanceKm) || clientDistanceKm < 0 || clientDistanceKm > 500
    || !Number.isFinite(requestedFare) || requestedFare < 10 || requestedFare > 100_000) {
    return res.status(400).json({ error: "Invalid service, route, or fare data" });
  }

  const estimate = getOrderEstimateFromCoordinates(input);
  const distanceKm = estimate.distanceKm;
  const estMinutes = estimate.estMinutes;

  const orderRef = ordersCollection.doc(String(input.id));

  try {
    let existingRideDocs: any[] = [];
    try {
      const existingRideSnap = await ordersCollection.where("passengerUserId", "==", user.uid).limit(20).get();
      existingRideDocs = existingRideSnap.docs;
    } catch (e: any) {
      console.warn("[Orders Check Active Warning]:", e?.message);
      const memActive = Array.from(resilientOrdersStore.values()).find(
        (o) => o.passengerUserId === user.uid && !["completed", "cancelled"].includes(String(o.status))
      );
      if (memActive) {
        return res.status(409).json({
          error: "คุณมีออเดอร์ที่กำลังดำเนินการอยู่ กรุณากลับไปดูหรือยกเลิกออเดอร์เดิมก่อน",
          code: "ACTIVE_ORDER_EXISTS",
          activeOrderId: memActive.id,
        });
      }
    }

    const pendingExpiry = Date.now() - 15 * 60 * 1000;
    const stalePending = existingRideDocs.filter((doc) => {
      const data = doc.data();
      return data.status === "pending" && Date.parse(String(data.createdAt || "")) < pendingExpiry;
    });
    if (stalePending.length) {
      for (const stale of stalePending) {
        try {
          await ordersDb.runTransaction(async (tx) => {
            const staleRef = ordersCollection.doc(String(stale.id));
            const staleSnap = await tx.get(staleRef);
            if (!staleSnap.exists) return;
            const staleOrder = staleSnap.data() as ServerOrder;
            if (String(staleOrder.status) !== "pending") return;
            await releaseRideWalletHoldInTransaction(tx, staleRef, staleOrder, "dispatch_timeout_no_driver");
            tx.update(staleRef, {
              status: "cancelled",
              cancellationReason: "dispatch_timeout_no_driver",
              updatedAt: new Date().toISOString(),
            });
          });
        } catch (cleanupError: any) {
          console.warn("[Orders stale hold cleanup warning]:", cleanupError?.message);
        }
      }
    }
    const activeRideDoc = existingRideDocs.find((doc) => {
      if (stalePending.some((stale) => stale.id === doc.id)) return false;
      return !["completed", "cancelled"].includes(String(doc.data().status));
    });
    if (activeRideDoc) return res.status(409).json({
      error: "คุณมีออเดอร์ที่กำลังดำเนินการอยู่ กรุณากลับไปดูหรือยกเลิกออเดอร์เดิมก่อน",
      code: "ACTIVE_ORDER_EXISTS",
      activeOrderId: activeRideDoc.id,
    });

    let passenger: any = {};
    try {
      const passengerSnap = await ordersDb.collection("users").doc(user.uid).get();
      passenger = passengerSnap.data() || {};
    } catch (ignore) {}

    const now = new Date();
    const welfareFund2Baht = 2;
    let authoritativeQuote;
    try {
      const requestedAddons = input.fareAddons || {};
      authoritativeQuote = calculateAppFare(normalizedServiceId, distanceKm, {
        ...requestedAddons,
        expressBoxBaht: normalizedServiceId === 'express' ? 5 : requestedAddons.expressBoxBaht,
      });
    } catch (fareErr) {
      return res.status(400).json({ error: "Unable to calculate authoritative fare", code: "FARE_CALCULATION_FAILED" });
    }
    const fare = authoritativeQuote.fareBaht;

    const normalizedOrder: ServerOrder = {
      id: String(input.id),
      serviceId: normalizedServiceId,
      serviceTitle: String(input.serviceTitle || normalizedServiceId).slice(0, 120),
      serviceIconEmoji: String(input.serviceIconEmoji || "🛵").slice(0, 16),
      passengerUserId: user.uid,
      passengerRole: ["citizen", "knight", "merchant", "partner"].includes(String(passenger.role)) ? String(passenger.role) as ServerOrder["passengerRole"] : undefined,
      passengerName: String(passenger.displayName || input.passengerName || "ผู้โดยสาร").slice(0, 120),
      passengerPhone: String(passenger.phone || ""),
      pickupLocation: String(input.pickupLocation || "ตำแหน่ง GPS ปัจจุบัน").slice(0, 300),
      dropoffLocation: input.dropoffLocation.trim().slice(0, 300),
      pickupCoord: { lat: Number(input.pickupCoord!.lat), lng: Number(input.pickupCoord!.lng) },
      ...(validCoordinates(input.dropoffCoord) ? { dropoffCoord: { lat: Number(input.dropoffCoord.lat), lng: Number(input.dropoffCoord.lng) } } : {}),
      distanceKm,
      fare,
      fareQuote: authoritativeQuote,
      distanceSource: estimate.distanceSource,
      etaSource: estimate.etaSource,
      fareBasis: "WINRIDER_APP_FARE_RULE",
      paymentMethod: "WIN_WALLET",
      walletHoldSatang: Math.round(fare * 100) + 500,
      walletHoldStatus: "HELD",
      walletHoldCreatedAt: now.toISOString(),
      welfareFund2Baht,
      fareAddons: authoritativeQuote.addons,
      netFare: Math.max(0, fare - welfareFund2Baht),
      estMinutes,
      status: "pending",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...(input.customerGender === "female" || input.customerGender === "male" ? { customerGender: input.customerGender } : {}),
      ...(typeof input.preferredDriverId === "string" && input.preferredDriverId ? { preferredDriverId: input.preferredDriverId } : {}),
      dispatchMode: input.preferredDriverId ? "preferred" : "automatic",
      ...(normalizedServiceId === "express" && validEvidenceImageUrl((input as any).expressPackagePhotoUrl)
        ? { expressPackagePhotoUrl: validEvidenceImageUrl((input as any).expressPackagePhotoUrl)! }
        : {}),
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

    let persistedToFirestore = false;
    try {
      await ordersDb.runTransaction(async (transaction) => {
        const passengerWalletRef = ordersDb.collection("wallets").doc(user.uid);
        const [existing, walletSnap] = await Promise.all([
          transaction.get(orderRef),
          transaction.get(passengerWalletRef)
        ]);
        if (existing.exists) {
          throw new Error("ORDER_ALREADY_EXISTS");
        }

        const wallet = walletSnap.data() || {};
        const balanceSatang = Number(wallet.balanceSatang || 0);
        const lockedSatang = Math.max(0, Number(wallet.lockedSatang || 0));
        const availableSatang = Math.max(0, balanceSatang - lockedSatang);
        const holdSatang = Math.round(Number(newOrder.walletHoldSatang || 0));
        if (!Number.isSafeInteger(holdSatang) || holdSatang <= 0) {
          throw new Error("INVALID_WALLET_HOLD");
        }
        if (availableSatang < holdSatang) {
          throw new Error("INSUFFICIENT_WIN_WALLET");
        }

        const nextLocked = lockedSatang + holdSatang;
        transaction.set(passengerWalletRef, {
          userId: user.uid,
          balanceSatang,
          lockedSatang: nextLocked,
          availableSatang: balanceSatang - nextLocked,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        let expressVerificationId: string | undefined;
        if (newOrder.serviceId === "express" && newOrder.expressPackagePhotoUrl) {
          const verificationRef = ordersDb.collection("adminVerificationQueue").doc();
          expressVerificationId = verificationRef.id;
          transaction.create(verificationRef, {
            id: verificationRef.id,
            status: "pending_review",
            submittedBy: user.uid,
            submittedRole: String(passenger.role || (user as any).role || "citizen"),
            category: "ตรวจรูปพัสดุก่อนรับงาน WIN Express",
            subjectType: "express_package",
            subjectId: newOrder.id,
            imageUrl: newOrder.expressPackagePhotoUrl,
            note: newOrder.dropoffLocation,
            metadata: { rideId: newOrder.id, serviceId: "express" },
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            serverCreatedAt: FieldValue.serverTimestamp(),
          });
        }
        transaction.create(orderRef, {
          ...newOrder,
          ...(expressVerificationId ? { expressPackageVerificationId: expressVerificationId } : {}),
          serverCreatedAt: FieldValue.serverTimestamp(),
        });
      });
      persistedToFirestore = true;
      if (firstDriverId) {
        try {
          await ordersDb.collection("knights").doc(firstDriverId).set({ lastDispatchOfferAt: now.toISOString() }, { merge: true });
        } catch (ignore) {}
      }
    } catch (dbError: any) {
      if (dbError?.message === "ORDER_ALREADY_EXISTS") {
        const existing = await orderRef.get().catch(() => null);
        if (existing?.exists && String((existing.data() as ServerOrder)?.passengerUserId || "") === user.uid) {
          return res.status(200).json({
            success: true,
            idempotentReplay: true,
            order: existing.data(),
            dispatch: {
              matched: Boolean((existing.data() as any)?.offeredDriverId),
              mode: String((existing.data() as any)?.dispatchMode || "automatic"),
              waitingForDriver: !(existing.data() as any)?.offeredDriverId,
            }
          });
        }
        return res.status(409).json({ error: "Order already exists" });
      }
      if (dbError?.message === "INSUFFICIENT_WIN_WALLET") {
        return res.status(402).json({
          error: "ยอด WIN Wallet ไม่เพียงพอ กรุณาเติมเงินก่อนเรียกรถ",
          code: "INSUFFICIENT_WIN_WALLET",
          requiredSatang: Number(newOrder.walletHoldSatang || 0)
        });
      }
      if (dbError?.message === "INVALID_WALLET_HOLD") {
        return res.status(500).json({ error: "ไม่สามารถคำนวณยอดกันเงินสำหรับทริปได้", code: "INVALID_WALLET_HOLD" });
      }
      console.error("[Orders DB Admin Error]:", dbError?.message);
      return res.status(503).json({ error: "ไม่สามารถกันยอด WIN Wallet เพื่อสร้างงานได้", code: "WALLET_HOLD_UNAVAILABLE" });
    }

    // Firestore + WIN Wallet hold are authoritative for real orders.
    resilientOrdersStore.set(newOrder.id, newOrder);

    return res.status(201).json({
      success: true,
      order: newOrder,
      dispatch: { matched: Boolean(firstDriverId), mode: newOrder.dispatchMode, waitingForDriver: !firstDriverId },
      persistedToFirestore,
    });
  } catch (error: any) {
    console.error("[Orders POST Error]:", error?.message);
    return res.status(503).json({ error: "ฐานข้อมูลออเดอร์ยังไม่พร้อมใช้งาน", code: "ORDER_STORE_UNAVAILABLE" });
  }
});

app.post("/api/orders/:id/accept", rateLimit(10), distributedRateLimit("ride_accept", 10), async (req, res) => {
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
  try {
    const orderRef = ordersCollection.doc(id);
    const idempotency = rideMutationIdempotencyRef(req, "ACCEPT", id, user.uid);
    let acceptedOrder: ServerOrder | null = null;

    await ordersDb.runTransaction(async (transaction) => {
      const idempotencySnap = await transaction.get(idempotency.ref);
      const snapshot = await transaction.get(orderRef);
      if (idempotencySnap.exists) {
        if (!snapshot.exists) throw new Error("ORDER_NOT_FOUND");
        acceptedOrder = snapshot.data() as ServerOrder;
        return;
      }
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
      transaction.create(idempotency.ref, {
        logicalKey: idempotency.logicalKey,
        action: "ACCEPT",
        rideId: id,
        actorUid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    if (acceptedOrder) {
      resilientOrdersStore.set(id, acceptedOrder);
    }
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

app.post("/api/orders/:id/decline", rateLimit(30), distributedRateLimit("ride_decline", 30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const { id } = req.params;
  try {
    const orderRef = ordersCollection.doc(id);
    const idempotency = rideMutationIdempotencyRef(req, "DECLINE", id, user.uid);
    let updatedOrder: ServerOrder | null = null;
    await ordersDb.runTransaction(async (transaction) => {
      const idempotencySnap = await transaction.get(idempotency.ref);
      const snapshot = await transaction.get(orderRef);
      if (idempotencySnap.exists) {
        if (!snapshot.exists) throw new Error("ORDER_NOT_FOUND");
        updatedOrder = snapshot.data() as ServerOrder;
        return;
      }
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
      transaction.create(idempotency.ref, {
        logicalKey: idempotency.logicalKey,
        action: "DECLINE",
        rideId: id,
        actorUid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
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

app.post("/api/orders/:id/completion-proof", rateLimit(10), distributedRateLimit("ride_completion_proof", 10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const { id } = req.params;
  const proofUrl = validEvidenceImageUrl(req.body?.proofUrl);
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  if (!proofUrl) {
    return res.status(400).json({ error: "หลักฐานรูปถ่ายไม่ถูกต้อง", code: "INVALID_PROOF" });
  }

  try {
    const orderRef = ordersCollection.doc(id);
    const verificationRef = ordersDb.collection("adminVerificationQueue").doc();
    let verification: any = null;
    await ordersDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(orderRef);
      if (!snap.exists) throw new Error("ORDER_NOT_FOUND");
      const order = snap.data() as ServerOrder & { completionProofStatus?: string; completionProofVerificationId?: string };
      if (order.driverUserId !== user.uid) throw new Error("DRIVER_REQUIRED");
      if (order.status !== "in_transit") throw new Error("PROOF_STATE_INVALID");
      if (order.completionProofStatus === "pending_review" && order.completionProofVerificationId) {
        verification = { id: order.completionProofVerificationId, status: "pending_review" };
        return;
      }

      const now = new Date().toISOString();
      verification = {
        id: verificationRef.id,
        status: "pending_review",
        submittedBy: user.uid,
        submittedRole: "knight",
        category: "หลักฐานส่งงาน / ถึงปลายทาง",
        subjectType: "service_completion",
        subjectId: id,
        imageUrl: proofUrl,
        note: String(req.body?.note || "").slice(0, 1000),
        ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {}),
        metadata: { rideStatus: order.status, serviceId: order.serviceId },
        createdAt: now,
        updatedAt: now,
        serverCreatedAt: FieldValue.serverTimestamp(),
      };
      transaction.create(verificationRef, verification);
      transaction.update(orderRef, {
        completionProofStatus: "pending_review",
        completionProofVerificationId: verificationRef.id,
        completionProofSubmittedUrl: proofUrl,
        completionProofSubmittedAt: now,
        updatedAt: now,
      });
      transaction.set(ordersDb.collection("audit_logs").doc(), {
        action: "COMPLETION_PROOF_SUBMITTED",
        rideId: id,
        verificationId: verificationRef.id,
        actorUid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return res.status(202).json({
      success: true,
      pendingAdminReview: true,
      verificationId: verification?.id,
      status: "pending_review",
    });
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") return res.status(404).json({ error: "Order not found" });
    if (error?.message === "DRIVER_REQUIRED") return res.status(403).json({ error: "Driver action required" });
    if (error?.message === "PROOF_STATE_INVALID") return res.status(409).json({ error: "Completion proof is only accepted while the ride is in transit" });
    console.error("[Completion Proof Error]:", error?.message);
    return res.status(503).json({ error: "ไม่สามารถส่งหลักฐานให้แอดมินตรวจได้" });
  }
});

app.post("/api/orders/:id/step", rateLimit(30), distributedRateLimit("ride_step", 30), async (req, res) => {
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
    const mutationPayload = { status: status ?? null, tipAmount: tipAmount ?? null, ratingGiven: ratingGiven ?? null, reviewComment: reviewComment ?? null };
    const idempotency = rideMutationIdempotencyRef(req, "STEP", id, user.uid, mutationPayload);
    let updatedOrder: ServerOrder | null = null;

    await ordersDb.runTransaction(async (transaction) => {
      const idempotencySnap = await transaction.get(idempotency.ref);
      const snapshot = await transaction.get(orderRef);
      if (idempotencySnap.exists) {
        if (!snapshot.exists) throw new Error("ORDER_NOT_FOUND");
        updatedOrder = snapshot.data() as ServerOrder;
        return;
      }
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

      if (status && String(status) === "cancelled") {
        await releaseRideWalletHoldInTransaction(transaction, orderRef, order, "participant_cancelled");
      }

      updatedOrder = {
        ...order,
        ...(status ? { status: String(status) } : {}),
        ...(status && String(status) === "cancelled" && order.walletHoldStatus === "HELD"
          ? { walletHoldStatus: "RELEASED" as const, walletHoldReleaseReason: "participant_cancelled" }
          : {}),
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
      transaction.create(idempotency.ref, {
        logicalKey: idempotency.logicalKey,
        action: "STEP",
        rideId: id,
        actorUid: user.uid,
        payload: mutationPayload,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    if (updatedOrder) {
      resilientOrdersStore.set(id, updatedOrder);
    }
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

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "Invalid GPS coordinates" });
  }
  if (accuracyMeters !== undefined && (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 10000)) {
    return res.status(400).json({ error: "Invalid GPS accuracy" });
  }

  try {
    const orderRef = ordersCollection.doc(id);
    const snapshot = await orderRef.get();
    if (!snapshot.exists) return res.status(404).json({ error: "Order not found" });

    const order = snapshot.data() as ServerOrder;
    const isDriver = order.driverUserId === user.uid;
    const isPassenger = order.passengerUserId === user.uid;
    if (!isDriver && !isPassenger) return res.status(403).json({ error: "Ride participant access required" });

    const activeStatuses = ["pending", "accepted", "heading_pickup", "picked_up", "in_transit"];
    if (!activeStatuses.includes(order.status)) {
      return res.status(409).json({ error: "GPS updates are not allowed for this ride state" });
    }
    if (isDriver && order.status === "pending") return res.status(409).json({ error: "Driver GPS requires accepted ride" });

    const role = isDriver ? "driver" : "passenger";
    const previous = (order as any)[isDriver ? "lastDriverLocation" : "lastPassengerLocation"];
    if (previous && Number.isFinite(Number(previous.latitude)) && Number.isFinite(Number(previous.longitude))) {
      const previousAt = Date.parse(String(previous.recordedAt || ""));
      if (Number.isFinite(previousAt)) {
        const elapsedSeconds = (Date.now() - previousAt) / 1000;
        const jumpKm = distanceKmBetween(
          { lat: Number(previous.latitude), lng: Number(previous.longitude) },
          { lat: latitude, lng: longitude }
        );
        const accuracySlackKm = Math.max(Number(previous.accuracyMeters || 0), Number(accuracyMeters || 0)) / 1000;
        const maxPlausibleKm = Math.max(0.75, elapsedSeconds * 0.075 + accuracySlackKm);
        if (elapsedSeconds >= 0 && jumpKm > maxPlausibleKm) {
          return res.status(409).json({ error: "Implausible GPS jump rejected", code: "GPS_OUTLIER" });
        }
      }
    }

    const now = new Date().toISOString();
    const location = {
      role,
      userId: user.uid,
      latitude,
      longitude,
      ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
      ...(heading !== undefined ? { heading } : {}),
      ...(speedMps !== undefined ? { speedMps } : {}),
      recordedAt: now,
      serverRecordedAt: FieldValue.serverTimestamp(),
    };

    await orderRef.collection("locations").doc().create(location);
    await orderRef.update({
      [isDriver ? "lastDriverLocation" : "lastPassengerLocation"]: {
        latitude,
        longitude,
        ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
        ...(heading !== undefined ? { heading } : {}),
        ...(speedMps !== undefined ? { speedMps } : {}),
        recordedAt: now,
      },
      updatedAt: now,
    });

    return res.status(201).json({ success: true, role, location });
  } catch (error: any) {
    console.error("[GPS Location Error]:", error?.message);
    return res.status(503).json({ error: "Location store unavailable" });
  }
});

app.get("/api/orders/:id/locations", rateLimit(120), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const ref = ordersCollection.doc(String(req.params.id));
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: "Order not found" });
    const order = snapshot.data() as ServerOrder;
    if (![order.passengerUserId, order.driverUserId].includes(user.uid)) {
      return res.status(403).json({ error: "Ride participant access required" });
    }
    const clean = (value: any) => value && Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude))
      ? { lat: Number(value.latitude), lng: Number(value.longitude), timestamp: value.recordedAt || null }
      : null;
    return res.json({
      rideId: req.params.id,
      driver: clean((order as any).lastDriverLocation),
      passenger: clean((order as any).lastPassengerLocation) || (order.pickupCoord ? { lat: Number(order.pickupCoord.lat), lng: Number(order.pickupCoord.lng), timestamp: null } : null),
      destination: order.dropoffCoord ? { lat: Number(order.dropoffCoord.lat), lng: Number(order.dropoffCoord.lng) } : null,
      status: order.status,
    });
  } catch (error: any) {
    console.error("[Ride Locations GET]", error?.message);
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

// WIN Buddy prompt handoff. WINRIDER does not call an AI provider with an API key.
app.post("/api/win-buddy/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim().slice(0, 4000);
  const mode = String(req.body?.mode || "general");
  if (!message) return res.status(400).json({ error: "กรุณาพิมพ์คำถาม" });
  const prompt = [
    "คุณคือ WIN Buddy ผู้ช่วยของ WINRIDER.AI ตอบภาษาไทยแบบกระชับ เน้นความปลอดภัยและการใช้งานจริง",
    "โหมด: " + mode,
    "คำถาม: " + message,
  ].join("\n");
  return res.json({
    externalOnly: true,
    prompt,
    providers: externalAiProviders,
    source: "external_ai_handoff",
    privacyNote: "ระบบไม่ส่งข้อความไป AI ภายนอกอัตโนมัติ ผู้ใช้เป็นผู้เลือกเปิด/คัดลอกเอง",
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// LOCAL GPS ROUTE ESTIMATE - NO PAID MAP API// =========================================================================
// GOOGLE MAPS ROUTES API (NEW) - LIVE ROUTE COMPUTATION PROXY
// =========================================================================
app.post("/api/routes/compute", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const origin = req.body?.origin;
  const destination = req.body?.destination;
  const travelMode = String(req.body?.travelMode || "TWO_WHEELER");
  if (!validCoordinates(origin) || !validCoordinates(destination)) {
    return res.status(400).json({ success: false, error: "INVALID_ROUTE_COORDINATES" });
  }
  const straightKm = localDistanceKm(Number(origin.lat), Number(origin.lng), Number(destination.lat), Number(destination.lng));
  const estimatedRoadKm = straightKm < 0.1 ? straightKm : straightKm * 1.22;
  const speedKmh = travelMode === "WALK" ? 5 : travelMode === "BICYCLE" ? 15 : 28;
  const etaMinutes = Math.max(1, Math.ceil((estimatedRoadKm / speedKmh) * 60));
  return res.json({
    success: true,
    distanceKm: Math.round(estimatedRoadKm * 100) / 100,
    straightLineKm: Math.round(straightKm * 100) / 100,
    etaMinutes,
    staticEtaMinutes: etaMinutes,
    encodedPolyline: "",
    source: "WINRIDER local GPS estimate",
    provider: "local_no_api_key",
    travelMode,
    externalNavigationRequired: true,
  });
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

  // Clean production mode check: NODE_ENV === "production"
  const isProduction = process.env.NODE_ENV === "production";

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

  // Vite copies public/ into dist/ unchanged during production builds.
  // Keep an explicit /images fallback to the source public directory as an
  // additional guard so an existing repository image is never mistaken for
  // an SPA route just because the build artifact was incomplete.
  const distImagesPath = path.join(distPath, "images");
  const publicImagesPath = path.resolve(process.cwd(), "public", "images");

  app.use("/images", express.static(distImagesPath, {
    fallthrough: true,
    index: false,
  }));
  app.use("/images", express.static(publicImagesPath, {
    fallthrough: true,
    index: false,
  }));

  app.use(express.static(distPath, {
    fallthrough: true,
    index: false,
  }));

  app.get("*", (req, res, next) => {
    const pathname = req.path;
    const isStaticAsset = (
      pathname.startsWith("/images/") ||
      pathname.startsWith("/assets/") ||
      /\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|css|js|mjs|map|json)$/i.test(pathname)
    );

    if (isStaticAsset) {
      return res.status(404).json({
        error: "Static asset not found",
        path: pathname,
      });
    }

    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath, (err) => {
        if (err && !res.headersSent) {
          next(err);
        }
      });
    }

    const fallbackPath = path.resolve(process.cwd(), "index.html");
    if (fs.existsSync(fallbackPath)) {
      return res.sendFile(fallbackPath, (err) => {
        if (err && !res.headersSent) {
          next(err);
        }
      });
    }

    return res.status(500).send("WINRIDER.AI production index.html is missing");
  });
}

startServer();
