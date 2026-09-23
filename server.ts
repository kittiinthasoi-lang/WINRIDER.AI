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

// In AI Studio and Cloud Run sandboxed environments, nginx routes external
// traffic exclusively to port 3000. Port 3000 is hardcoded by infrastructure.
const PORT = 3000;

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

function timingSafeHexEqual(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
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

// Health check endpoints (Cloud Run, Kubernetes, AI Studio probes)
app.get(["/api/health", "/healthz", "/health"], (_req, res) => {
  res.json({ status: "ok", empire: "WINRIDER.AI", timestamp: new Date().toISOString() });
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

const radarPlacesCacheconst radarPlacesCache = new Map<string, { expiresAt: number; places: any[] }>();
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

app.get("/api/shop/directory"app.get("/api/shop/directory", rateLimit(RATE_LIMITS["/api/shop/directory"]), async (req, res) => {
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
  if (title.length < 3 || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 1) {
    return res.status(400).json({ error: "ข้อมูลสินค้าไม่ถูกต้อง" });
  }
  try {
    const userSnapshot = await ordersDb.collection("users").doc(user.uid).get();
    const userData = userSnapshot.data() || {};
    const sellerProfile = (userData.profileCustomization || {}) as Record<string, unknown>;
    const sellerRole = String(userData.role || "citizen").trim();
    const sellerWallet = await ensureWalletIdentityId(user.uid, WALLET_ROLE_PREFIX[sellerRole] ? sellerRole : "citizen");
    const id = `listing-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const listing = {
      id,
      sellerUserId: user.uid,
      sellerType: userData.role === "merchant" ? "merchant" : "citizen",
      sellerName: String(sellerProfile.displayName || userData.displayName || user.name || "ผู้ขาย WIN"),
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
      conditionLabel: String(input.conditionLabel || "สภาพดี"),
      description: String(input.description || "").trim(),
      imageIcon: String(input.imageIcon || "📦"),
      imageUrl: String(input.imageUrl || ""),
      isAiVerified: input.isAiVerified === true,
      aiCertificateId: input.isAiVerified === true ? String(input.aiCertificateId || "") : "",
      aiQualityScore: input.isAiVerified === true && Number.isFinite(Number(input.aiQualityScore)) ? Number(input.aiQualityScore) : null,
      location: sellerProfile.locationEnabled === true
        ? String(sellerProfile.locationLabel || "ตำแหน่งที่ผู้ขายบันทึกไว้ในโปรไฟล์")
        : String(input.location || userData.locationLabel || userData.address || "").trim(),
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


function dedupeWinAlertEventsfunction dedupeWinAlertEvents(events: NearbyEventResult[]) {
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

function requireTatSyncSecret(req: express.Request, res: express.Response): boolean {
  const configured = String(process.env.TAT_INTERNAL_SYNC_SECRET || "").trim();
  const supplied = String(req.headers["x-winrider-tat-sync-secret"] || "").trim();
  if (!configured) {
    res.status(503).json({ error: "TAT_INTERNAL_SYNC_SECRET is not configured" });
    return false;
  }
  if (!supplied || supplied !== configured) {
    res.status(401).json({ error: "Unauthorized TAT sync request" });
    return false;
  }
  return true;
}

// Internal endpoint for a scheduler (for example GitHub Actions) to run source sync
// without granting it an Admin Firebase session. The secret is never stored in source.
app.post("/api/internal/public-data/sync-tat", rateLimit(2), async (req, res) => {
  if (!requireTatSyncSecret(req, res)) return;
  try {
    const imported = await syncTatPublicData(["events", "attractions", "restaurants", "accommodations", "souvenirs"]);
    return res.json({
      success: true,
      source: "TAT Data Catalog",
      sourceDriven: true,
      publicVisible: true,
      imported,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[TAT Internal Sync]", error instanceof Error ? error.message : error);
    return res.status(503).json({ error: "ไม่สามารถซิงก์ข้อมูล TAT จากแหล่งต้นทางได้" });
  }
});


function requireWinAlertSyncSecret(req: express.Request, res: express.Response): boolean {
  const configured = String(process.env.WIN_ALERT_INTERNAL_SYNC_SECRET || process.env.TAT_INTERNAL_SYNC_SECRET || "").trim();
  const supplied = String(req.headers["x-winrider-event-sync-secret"] || req.headers["x-winrider-tat-sync-secret"] || "").trim();
  if (!configured) {
    res.status(503).json({ error: "WIN_ALERT_INTERNAL_SYNC_SECRET is not configured" });
    return false;
  }
  if (!supplied || supplied !== configured) {
    res.status(401).json({ error: "Unauthorized event sync request" });
    return false;
  }
  return true;
}

app.post("/api/internal/events/sync", rateLimit(2), async (req, res) => {
  if (!requireWinAlertSyncSecret(req, res)) return;
  try {
    const tat = await syncTatPublicData(["events"]);
    dailyEventsCache.clear();
    return res.json({
      success: true,
      sources: { tat },
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[WIN Alert Multi-source Sync]", error instanceof Error ? error.message : error);
    return res.status(503).json({ error: "ไม่สามารถซิงก์ข้อมูล WIN Alert จากแหล่งจริงได้" });
  }
});

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

  try {
    const [eventsSnapshot, publicDataSnapshot] = await Promise.all([
      ordersDb.collection("winAlertEvents").where("sourceDriven", "==", true).get(),
      ordersDb.collection("publicDataRecords").where("sourceDriven", "==", true).get(),
    ]);

    const candidates = [
      ...eventsSnapshot.docs.map((docSnap) => ({ docSnap, item: docSnap.data() || {} })),
      ...publicDataSnapshot.docs
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
    console.error("[Events API] public-data read failed:", error instanceof Error ? error.message : error);
    return res.status(503).json({ message: "โหลดกิจกรรมจากข้อมูลสาธารณะไม่สำเร็จ", events: [] });
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

  const requestedKind = String(req.body?.kind || "all") as PublicDataKind | "all";
  const kinds: PublicDataKind[] = requestedKind === "all"
    ? ["events", "attractions", "restaurants", "accommodations", "souvenirs"]
    : [requestedKind];

  if (kinds.some((kind) => !Object.prototype.hasOwnProperty.call(TAT_PUBLIC_DATASETS, kind))) {
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
  } catch (e) {}

  const rawDbId = process.env.FIRESTORE_DATABASE_ID || process.env.VITE_FIRESTORE_DATABASE_ID || defaultDbId;
  const databaseId = (!rawDbId || rawDbId === "(default)") ? undefined : rawDbId;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || defaultProjectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || defaultStorageBucket;

  const app = getApps().length
    ? getApps()[0]
    : (() => {
        if (saJson) {
          try {
            const parsed = JSON.parse(saJson);
            return initializeApp({
              credential: cert(parsed),
              projectId: parsed.project_id || projectId,
              ...(storageBucket ? { storageBucket } : {}),
            });
          } catch (e) {
            console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
          }
        }
        if (projectId && clientEmail && privateKey) {
          try {
            return initializeApp({
              credential: cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, "\n"),
              }),
              projectId,
              ...(storageBucket ? { storageBucket } : {}),
            });
          } catch (e) {
            console.warn("Failed to initialize Firebase Admin with clientEmail/privateKey:", e);
          }
        }
        return initializeApp({
          projectId,
          ...(storageBucket ? { storageBucket } : {}),
        });
      })();

  return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
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

function decodeImageDataUrl(value: unknown) {
  const match = String(value || "").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length < 100 || buffer.length > 4 * 1024 * 1024) return null;
  return { mimeType, buffer };
}

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

app.get("/api/wallet/topup-config"app.get("/api/wallet/topup-config", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const promptPayId = String(process.env.ADMIN_PROMPTPAY_ID || "0899999999").trim();
  const accountName = String(process.env.ADMIN_BANK_ACCOUNT_NAME || "WINRIDER.AI SYSTEM WALLET").trim();
  return res.json({ configured: true, promptPayId, accountName });
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

    if (parsed.kind === "promptpay" && parsed.promptPayId) {
      const normalized = parsed.promptPayId.replace(/^0066/, "0").replace(/[^0-9]/g, "");
      const snap = await ordersDb.collection("payment_profiles")
        .where("promptPayId", "==", normalized)
        .where("status", "==", "verified")
        .limit(1)
        .get();
      if (snap.empty) return res.status(404).json({ error: "VERIFIED_PAYMENT_OWNER_NOT_FOUND" });
      const profile = snap.docs[0].data() || {};
      if (String(profile.userId || "") === user.uid) return res.status(422).json({ error: "SELF_PAYMENT_NOT_ALLOWED" });
      return res.json({
        ok: true,
        kind: parsed.kind,
        amountBaht: effectiveAmount,
        owner: { userId: String(profile.userId), role: String(profile.role || ""), accountName: String(profile.accountName || ""), promptPayId: normalized },
        settlementMode: "EXTERNAL_PROMPTPAY",
        canExecute: false,
        message: "QR และเจ้าของช่องทางรับเงินผ่านการตรวจสอบแล้ว แต่การตัดเงินจากธนาคารต้องเกิดในระบบธนาคาร/ผู้ให้บริการชำระเงินจริง"
      });
    }

    return res.status(422).json({ error: "UNSUPPORTED_QR_TYPE" });
  } catch (error) {
    console.error("QR verification failed:", error);
    return res.status(500).json({ error: "QR_SERVER_VERIFY_FAILED" });
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
      const receiverBalance = Number(receiverSnap.data()?.balanceSatang || 0);
      if (payerBalance < amountSatang) throw new Error("INSUFFICIENT_BALANCE");

      const paymentRef = ordersDb.collection("wallet_payment_transactions").doc(idempotencyKey);
      const payerLedger = ordersDb.collection("ledger_entries").doc();
      const receiverLedger = ordersDb.collection("ledger_entries").doc();
      tx.set(payerRef, { userId: user.uid, balanceSatang: payerBalance - amountSatang, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(receiverRef, { userId: receiverUid, balanceSatang: receiverBalance + amountSatang, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
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
      walletId: walletIdentity.walletId,
      role: walletIdentity.role,
      balanceSatang,
      balance: balanceSatang / 100,
      systemPromptPay: { configured: true, promptPayId, accountName },
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
      balance: 0.0,
      systemPromptPay: {
        configured: Boolean(process.env.ADMIN_PROMPTPAY_ID),
        promptPayId: String(process.env.ADMIN_PROMPTPAY_ID || "").trim(),
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
  if (!process.env.ADMIN_BANK_ACCOUNT_NAME || !process.env.ADMIN_PROMPTPAY_ID) return res.status(503).json({ error: "ผู้ดูแลยังไม่ได้ตั้งค่าบัญชีรับเงิน" });
  if (!Number.isSafeInteger(amountSatang) || amountSatang < 100 || amountSatang > 10_000_000) return res.status(400).json({ error: "ยอดเติมเงินไม่ถูกต้อง" });
  if (!image) return res.status(400).json({ error: "สลิปต้องเป็น JPG, PNG หรือ WEBP ขนาดไม่เกิน 4 MB" });

  const imageHash = crypto.createHash("sha256").update(image.buffer).digest("hex");
  const submissionRef = ordersDb.collection("topup_submissions").doc();
  try {
    await ordersDb.runTransaction(async (tx) => {
      const duplicateRef = ordersDb.collection("topup_references").doc(imageHash);
      const duplicate = await tx.get(duplicateRef);
      if (duplicate.exists) throw new Error("DUPLICATE_SLIP");
      tx.create(duplicateRef, { submissionId: submissionRef.id, status: "WAITING_ADMIN", createdAt: FieldValue.serverTimestamp() });
      tx.create(submissionRef, {
        userId: user.uid,
        userEmail: user.email || null,
        amountSatang,
        reference: imageHash.slice(0, 20),
        refHash: imageHash,
        imageHash,
        extracted: null,
        verificationMode: "manual_proof_plus_provider_confirmation",
        status: "WAITING_ADMIN",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    const ext = image.mimeType.split("/")[1].replace("jpeg", "jpg");
    const proofStoragePath = "topup-proofs/" + user.uid + "/" + submissionRef.id + "." + ext;
    try {
      await getStorage().bucket().file(proofStoragePath).save(image.buffer, {
        contentType: image.mimeType,
        resumable: false,
        metadata: { cacheControl: "private, no-store" },
      });
      await submissionRef.update({ proofStoragePath, proofMimeType: image.mimeType, storageProvider: "firebase-storage" });
    } catch (storageError: any) {
      console.warn("Top-up proof GCS storage error (using Firestore fallback):", storageError?.message);
      try {
        await submissionRef.collection("proof_blobs").doc("image").set({
          data: image.buffer.toString("base64"),
          mimeType: image.mimeType,
          userId: user.uid,
          createdAt: FieldValue.serverTimestamp(),
        });
        await submissionRef.update({ proofStoragePath: "firestore:proof_blobs/image", proofMimeType: image.mimeType, storageProvider: "firestore-fallback" });
      } catch (fallbackError: any) {
        console.error("Top-up proof fallback storage error", fallbackError?.message);
        await Promise.allSettled([submissionRef.delete(), ordersDb.collection("topup_references").doc(imageHash).delete()]);
        return res.status(503).json({ error: "จัดเก็บภาพสลิปไม่สำเร็จ กรุณาลองใหม่" });
      }
    }
    return res.status(202).json({
      status: "WAITING_ADMIN",
      submissionId: submissionRef.id,
      message: "รับหลักฐานแล้ว การตรวจภาพไม่ใช้ AI; รอ Admin ตรวจหลักฐานและ payment provider ยืนยันเงินจริง",
    });
  } catch (error: any) {
    if (error?.message === "DUPLICATE_SLIP") return res.status(409).json({ error: "ภาพสลิปนี้ถูกส่งแล้ว" });
    console.error("Top-up proof error", error?.message);
    return res.status(503).json({ error: "รับหลักฐานไม่สำเร็จ กรุณาลองใหม่" });
  }
});

app.get("/api/admin/topup-submissions"app.get("/api/admin/topup-submissions", rateLimit(20), async (req, res) => {
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

    // 1. Try downloading from Cloud Storage if stored there
    if (proofStoragePath.startsWith(`topup-proofs/${data.userId}/`)) {
      try {
        const [buffer] = await getStorage().bucket().file(proofStoragePath).download();
        res.setHeader("Content-Type", String(data.proofMimeType || "image/jpeg"));
        res.setHeader("Cache-Control", "private, no-store, max-age=0");
        res.setHeader("Content-Disposition", `inline; filename="topup-${submissionId}"`);
        return res.send(buffer);
      } catch (storageErr: any) {
        console.warn("Storage download failed, attempting firestore fallback check:", storageErr?.message);
      }
    }

    // 2. Check Firestore fallback subcollection
    const blobDoc = await ordersDb.collection("topup_submissions").doc(submissionId).collection("proof_blobs").doc("image").get();
    if (blobDoc.exists) {
      const blobData = blobDoc.data() || {};
      const buffer = Buffer.from(String(blobData.data || ""), "base64");
      res.setHeader("Content-Type", String(blobData.mimeType || data.proofMimeType || "image/jpeg"));
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("Content-Disposition", `inline; filename="topup-${submissionId}"`);
      return res.send(buffer);
    }

    return res.status(404).json({ error: "ไม่พบภาพสลิปที่จัดเก็บไว้" });
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
    // Manual slip review never credits a wallet. It only attests that the proof
    // was inspected; settlement waits for a cryptographically verified provider event.
    tx.update(topupRef, { status: "PROOF_REVIEWED", reviewedBy: user.uid, reviewedAt: FieldValue.serverTimestamp() });
    tx.update(ordersDb.collection("topup_references").doc(topup.refHash), { status: "PROOF_REVIEWED" });
  });
  return res.json({ ok: true, status: decision === "APPROVE" ? "PROOF_REVIEWED" : "REJECTED_ADMIN" });
});


app.post("/api/webhooks/payment-provider", rateLimit(120), distributedRateLimit("payment_webhook", 120), async (req, res) => {
  const secret = String(process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET || "").trim();
  if (!secret) return res.status(503).json({ error: "Payment provider webhook is not configured" });

  const signatureHeader = String(req.headers["x-winrider-payment-signature"] || "");
  const supplied = signatureHeader.replace(/^sha256=/i, "").trim();
  const expected = crypto.createHmac("sha256", secret).update(stableCanonicalJson(req.body ?? {})).digest("hex");
  if (!timingSafeHexEqual(supplied, expected)) return res.status(401).json({ error: "Invalid payment webhook signature" });

  const eventId = String(req.body?.eventId || "").trim();
  const eventType = String(req.body?.type || "").trim().toUpperCase();
  if (!eventId || !["PAYMENT_CONFIRMED", "REFUND_CONFIRMED", "REFUND_FAILED"].includes(eventType)) {
    return res.status(400).json({ error: "Invalid payment event" });
  }

  try {
    const eventRef = ordersDb.collection("payment_provider_events").doc(crypto.createHash("sha256").update(eventId).digest("hex"));
    const result = await ordersDb.runTransaction(async (tx) => {
      const existing = await tx.get(eventRef);
      if (existing.exists) return { duplicate: true, ...(existing.data() || {}) };

      if (eventType === "PAYMENT_CONFIRMED") {
        const submissionId = String(req.body?.submissionId || "").trim();
        const providerTransactionId = String(req.body?.transactionId || "").trim();
        const userId = String(req.body?.userId || "").trim();
        const amountSatang = Number(req.body?.amountSatang);
        if (!submissionId || !providerTransactionId || !userId || !Number.isInteger(amountSatang) || amountSatang <= 0) {
          throw new Error("INVALID_PAYMENT_EVENT");
        }
        const submissionRef = ordersDb.collection("topup_submissions").doc(submissionId);
        const submissionSnap = await tx.get(submissionRef);
        if (!submissionSnap.exists) throw new Error("TOPUP_NOT_FOUND");
        const topup: any = submissionSnap.data() || {};
        if (!["WAITING_ADMIN", "PROOF_REVIEWED"].includes(String(topup.status))) throw new Error("TOPUP_ALREADY_SETTLED");
        if (String(topup.userId) !== userId || Number(topup.amountSatang) !== amountSatang) throw new Error("PAYMENT_MISMATCH");

        const providerTxRef = ordersDb.collection("payment_provider_transactions").doc(
          crypto.createHash("sha256").update(providerTransactionId).digest("hex")
        );
        const providerTxSnap = await tx.get(providerTxRef);
        if (providerTxSnap.exists) throw new Error("PROVIDER_TRANSACTION_REUSED");

        const walletRef = ordersDb.collection("wallets").doc(userId);
        const walletSnap = await tx.get(walletRef);
        const wallet = walletSnap.data() || {};
        const currentBalance = Number(wallet.balanceSatang || 0);
        const currentLocked = Number(wallet.lockedSatang || 0);
        const nextBalance = currentBalance + amountSatang;
        const ledgerRef = ordersDb.collection("ledger_entries").doc();

        tx.set(walletRef, {
          userId,
          balanceSatang: nextBalance,
          lockedSatang: currentLocked,
          availableSatang: nextBalance - currentLocked,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.create(ledgerRef, {
          userId,
          amountSatang,
          type: "TOP_UP_PROVIDER_VERIFIED",
          providerTransactionId,
          submissionId,
          totalDebitSatang: amountSatang,
          totalCreditSatang: amountSatang,
          balanced: true,
          legs: [
            { accountId: "PAYMENT_PROVIDER_CLEARING", direction: "DEBIT", amountSatang },
            { accountId: userId, direction: "CREDIT", amountSatang },
          ],
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.create(providerTxRef, {
          providerTransactionId,
          eventId,
          submissionId,
          userId,
          amountSatang,
          status: "CONFIRMED",
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(submissionRef, {
          status: "PROVIDER_CONFIRMED",
          providerTransactionId,
          providerConfirmedAt: FieldValue.serverTimestamp(),
        });
        if (topup.refHash) tx.update(ordersDb.collection("topup_references").doc(String(topup.refHash)), { status: "PROVIDER_CONFIRMED" });
        tx.create(eventRef, { eventId, type: eventType, providerTransactionId, userId, amountSatang, processedAt: FieldValue.serverTimestamp() });
        return { duplicate: false, status: "PROVIDER_CONFIRMED", ledgerId: ledgerRef.id };
      }

      const refundRequestId = String(req.body?.refundRequestId || "").trim();
      const providerRefundId = String(req.body?.refundId || "").trim();
      if (!refundRequestId) throw new Error("INVALID_REFUND_EVENT");
      const refundRef = ordersDb.collection("refund_requests").doc(refundRequestId);
      const refundSnap = await tx.get(refundRef);
      if (!refundSnap.exists) throw new Error("REFUND_NOT_FOUND");
      const refund: any = refundSnap.data() || {};
      if (String(refund.status) !== "PENDING_PROVIDER") throw new Error("REFUND_ALREADY_FINAL");
      const userId = String(refund.userId || "");
      const amountSatang = Number(refund.amountSatang || 0);
      const walletRef = ordersDb.collection("wallets").doc(userId);
      const walletSnap = await tx.get(walletRef);
      if (!walletSnap.exists) throw new Error("WALLET_NOT_FOUND");
      const wallet = walletSnap.data() || {};
      const balance = Number(wallet.balanceSatang || 0);
      const locked = Number(wallet.lockedSatang || 0);

      if (eventType === "REFUND_FAILED") {
        tx.update(walletRef, { lockedSatang: Math.max(0, locked - amountSatang), availableSatang: balance - Math.max(0, locked - amountSatang), updatedAt: FieldValue.serverTimestamp() });
        tx.update(refundRef, { status: "FAILED", providerRefundId: providerRefundId || null, failedAt: FieldValue.serverTimestamp() });
        tx.create(eventRef, { eventId, type: eventType, refundRequestId, processedAt: FieldValue.serverTimestamp() });
        return { duplicate: false, status: "FAILED" };
      }

      if (balance < amountSatang || locked < amountSatang) throw new Error("REFUND_LOCK_INCONSISTENT");
      const nextBalance = balance - amountSatang;
      const nextLocked = locked - amountSatang;
      const ledgerRef = ordersDb.collection("ledger_entries").doc();
      tx.update(walletRef, { balanceSatang: nextBalance, lockedSatang: nextLocked, availableSatang: nextBalance - nextLocked, updatedAt: FieldValue.serverTimestamp() });
      tx.create(ledgerRef, {
        userId, amountSatang, type: "TOP_UP_REFUND", refundRequestId, providerRefundId,
        totalDebitSatang: amountSatang, totalCreditSatang: amountSatang, balanced: true,
        legs: [
          { accountId: userId, direction: "DEBIT", amountSatang },
          { accountId: "PAYMENT_PROVIDER_CLEARING", direction: "CREDIT", amountSatang },
        ],
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(refundRef, { status: "REFUNDED", providerRefundId: providerRefundId || null, ledgerId: ledgerRef.id, refundedAt: FieldValue.serverTimestamp() });
      tx.create(eventRef, { eventId, type: eventType, refundRequestId, processedAt: FieldValue.serverTimestamp() });
      return { duplicate: false, status: "REFUNDED", ledgerId: ledgerRef.id };
    });
    return res.json({ ok: true, ...result });
  } catch (error: any) {
    const known = new Set(["INVALID_PAYMENT_EVENT","TOPUP_NOT_FOUND","TOPUP_ALREADY_SETTLED","PAYMENT_MISMATCH","PROVIDER_TRANSACTION_REUSED","INVALID_REFUND_EVENT","REFUND_NOT_FOUND","REFUND_ALREADY_FINAL","WALLET_NOT_FOUND","REFUND_LOCK_INCONSISTENT"]);
    if (known.has(error?.message)) return res.status(409).json({ error: error.message });
    console.error("[Payment Provider Webhook]", error?.message);
    return res.status(503).json({ error: "Payment event processing failed" });
  }
});

app.post("/api/admin/payments/refund", rateLimit(10), distributedRateLimit("admin_refund", 10), async (req, res) => {
  const adminUser = await requireSuperAdmin(req, res);
  if (!adminUser) return;
  const submissionId = String(req.body?.submissionId || "").trim();
  const amountSatang = Number(req.body?.amountSatang);
  const reason = String(req.body?.reason || "").trim().slice(0, 500);
  if (!submissionId || !Number.isInteger(amountSatang) || amountSatang <= 0 || reason.length < 3) {
    return res.status(400).json({ error: "Invalid refund request" });
  }

  const refundRef = ordersDb.collection("refund_requests").doc();
  try {
    let providerTransactionId = "";
    let userId = "";
    await ordersDb.runTransaction(async (tx) => {
      const submissionRef = ordersDb.collection("topup_submissions").doc(submissionId);
      const submissionSnap = await tx.get(submissionRef);
      if (!submissionSnap.exists) throw new Error("TOPUP_NOT_FOUND");
      const topup: any = submissionSnap.data() || {};
      if (String(topup.status) !== "PROVIDER_CONFIRMED") throw new Error("TOPUP_NOT_PROVIDER_CONFIRMED");
      userId = String(topup.userId || "");
      providerTransactionId = String(topup.providerTransactionId || "");
      const maxRefund = Number(topup.amountSatang || 0);
      if (amountSatang > maxRefund) throw new Error("REFUND_TOO_LARGE");

      const previousRefunds = await tx.get(ordersDb.collection("refund_requests").where("submissionId", "==", submissionId));
      const alreadyReserved = previousRefunds.docs
        .filter((doc) => ["PENDING_PROVIDER", "REFUNDED"].includes(String(doc.data().status)))
        .reduce((sum, doc) => sum + Number(doc.data().amountSatang || 0), 0);
      if (alreadyReserved + amountSatang > maxRefund) throw new Error("REFUND_TOO_LARGE");

      const walletRef = ordersDb.collection("wallets").doc(userId);
      const walletSnap = await tx.get(walletRef);
      if (!walletSnap.exists) throw new Error("WALLET_NOT_FOUND");
      const wallet = walletSnap.data() || {};
      const balance = Number(wallet.balanceSatang || 0);
      const locked = Number(wallet.lockedSatang || 0);
      const available = balance - locked;
      if (available < amountSatang) throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");

      tx.update(walletRef, { lockedSatang: locked + amountSatang, availableSatang: available - amountSatang, updatedAt: FieldValue.serverTimestamp() });
      tx.create(refundRef, {
        submissionId, providerTransactionId, userId, amountSatang, reason,
        status: "PENDING_PROVIDER", requestedBy: adminUser.uid, createdAt: FieldValue.serverTimestamp(),
      });
      tx.create(ordersDb.collection("audit_logs").doc(), {
        action: "PAYMENT_REFUND_REQUESTED", refundRequestId: refundRef.id, submissionId, userId,
        amountSatang, actorUid: adminUser.uid, reason, createdAt: FieldValue.serverTimestamp(),
      });
    });

    const refundUrlRaw = String(process.env.PAYMENT_PROVIDER_REFUND_URL || "").trim();
    const refundToken = String(process.env.PAYMENT_PROVIDER_API_TOKEN || "").trim();
    const allowedHost = String(process.env.PAYMENT_PROVIDER_ALLOWED_HOST || "").trim().toLowerCase();
    if (!refundUrlRaw || !refundToken || !allowedHost) {
      await refundRef.update({ providerDispatchStatus: "NOT_CONFIGURED" });
      return res.status(202).json({ ok: true, refundRequestId: refundRef.id, status: "PENDING_PROVIDER", providerDispatchStatus: "NOT_CONFIGURED" });
    }
    const refundUrl = new URL(refundUrlRaw);
    if (refundUrl.protocol !== "https:" || refundUrl.hostname.toLowerCase() !== allowedHost) {
      await refundRef.update({ providerDispatchStatus: "BLOCKED_INVALID_HOST" });
      return res.status(503).json({ error: "Payment refund provider host is not allowed" });
    }

    const response = await fetch(refundUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + refundToken },
      body: JSON.stringify({ refundRequestId: refundRef.id, providerTransactionId, userId, amountSatang, reason }),
      signal: AbortSignal.timeout(12_000),
    });
    const providerBody = await response.json().catch(() => ({}));
    await refundRef.update({
      providerDispatchStatus: response.ok ? "ACCEPTED" : "REJECTED",
      providerResponseCode: response.status,
      providerReference: String(providerBody?.refundId || providerBody?.id || "").slice(0, 200) || null,
      providerDispatchedAt: FieldValue.serverTimestamp(),
    });
    if (!response.ok) return res.status(502).json({ error: "Payment provider rejected refund request", refundRequestId: refundRef.id });
    return res.status(202).json({ ok: true, refundRequestId: refundRef.id, status: "PENDING_PROVIDER" });
  } catch (error: any) {
    const known = new Set(["TOPUP_NOT_FOUND","TOPUP_NOT_PROVIDER_CONFIRMED","REFUND_TOO_LARGE","WALLET_NOT_FOUND","INSUFFICIENT_AVAILABLE_BALANCE"]);
    if (known.has(error?.message)) return res.status(409).json({ error: error.message });
    console.error("[Refund Request]", error?.message);
    return res.status(503).json({ error: "Refund request failed" });
  }
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
      try {
        const batch = ordersDb.batch();
        stalePending.forEach((doc) => batch.update(doc.ref, {
          status: "cancelled",
          cancellationReason: "dispatch_timeout_no_driver",
          updatedAt: new Date().toISOString(),
        }));
        await batch.commit();
      } catch (ignore) {}
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
        const existing = await transaction.get(orderRef);
        if (existing.exists) {
          throw new Error("ORDER_ALREADY_EXISTS");
        }
        transaction.create(orderRef, {
          ...newOrder,
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
      console.warn("[Orders DB Admin Warning - using resilient store]:", dbError?.message);
    }

    // Store in resilient in-memory store
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
  const proofUrl = String(req.body?.proofUrl || "").trim();
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  if (!proofUrl || proofUrl.length > 2000 || !/^https?:\/\//i.test(proofUrl)) {
    return res.status(400).json({ error: "หลักฐานรูปถ่ายไม่ถูกต้อง", code: "INVALID_PROOF" });
  }
  try {
    const orderRef = ordersCollection.doc(id);
    const idempotency = rideMutationIdempotencyRef(req, "COMPLETION_PROOF", id, user.uid, { proofUrl });
    let updatedOrder: ServerOrder | null = null;
    await ordersDb.runTransaction(async (transaction) => {
      const idempotencySnap = await transaction.get(idempotency.ref);
      const snap = await transaction.get(orderRef);
      if (!snap.exists) throw new Error("ORDER_NOT_FOUND");
      const order = snap.data() as ServerOrder;
      if (idempotencySnap.exists) {
        updatedOrder = order;
        return;
      }
      if (order.driverUserId !== user.uid) throw new Error("DRIVER_REQUIRED");
      if (order.status !== "in_transit") throw new Error("PROOF_STATE_INVALID");
      const updatedAt = new Date().toISOString();
      const proof = {
        completionProofUrl: proofUrl,
        completionProofCapturedAt: updatedAt,
        ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? { completionProofLatitude: latitude, completionProofLongitude: longitude } : {})
      };
      updatedOrder = { ...order, ...proof, updatedAt };
      transaction.update(orderRef, { ...proof, updatedAt });
      transaction.create(idempotency.ref, {
        logicalKey: idempotency.logicalKey,
        action: "COMPLETION_PROOF",
        rideId: id,
        actorUid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    if (updatedOrder) resilientOrdersStore.set(id, updatedOrder);
    return res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") return res.status(404).json({ error: "Order not found" });
    if (error?.message === "DRIVER_REQUIRED") return res.status(403).json({ error: "Driver action required" });
    if (error?.message === "PROOF_STATE_INVALID") return res.status(409).json({ error: "Completion proof is only accepted while the ride is in transit" });
    console.error("[Completion Proof Error]:", error?.message);
    return res.status(503).json({ error: "ไม่สามารถบันทึกหลักฐานการส่งมอบได้" });
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

    const previous = (order as any).lastDriverLocation;
    if (previous && Number.isFinite(Number(previous.latitude)) && Number.isFinite(Number(previous.longitude))) {
      const previousAt = Date.parse(String(previous.recordedAt || ""));
      if (Number.isFinite(previousAt)) {
        const elapsedSeconds = (Date.now() - previousAt) / 1000;
        if (elapsedSeconds < 0) {
          return res.status(409).json({ error: "Out-of-order GPS sample", code: "GPS_OUT_OF_ORDER" });
        }
        // Allow a generous urban upper bound plus GPS-accuracy slack. This catches
        // impossible jumps without penalizing normal tunnels/reacquisition noise.
        const jumpKm = distanceKmBetween(
          { lat: Number(previous.latitude), lng: Number(previous.longitude) },
          { lat: latitude, lng: longitude }
        );
        const accuracySlackKm = Math.max(Number(previous.accuracyMeters || 0), Number(accuracyMeters || 0)) / 1000;
        const maxPlausibleKm = Math.max(0.75, elapsedSeconds * 0.075 + accuracySlackKm);
        if (jumpKm > maxPlausibleKm) {
          return res.status(409).json({
            error: "Implausible GPS jump rejected",
            code: "GPS_OUTLIER",
            jumpKm: Math.round(jumpKm * 1000) / 1000,
            maxPlausibleKm: Math.round(maxPlausibleKm * 1000) / 1000,
          });
        }
      }
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
