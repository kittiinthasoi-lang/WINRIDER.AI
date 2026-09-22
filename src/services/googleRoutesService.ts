// Source: Google Maps Platform Code Assist
// Internal Usage Attribution: gmp_mcp_codeassist_v1_aistudio

import { ARManeuverType } from '../components/ARLiveCameraNavigation';
import { auth } from '../firebase';

export interface RouteCoordinate {
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
}

export interface RouteDestination {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  landmark: string;
}

export interface LiveRouteStep {
  stepIndex: number;
  instructions: string;
  maneuver: ARManeuverType;
  rawManeuver?: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  polylinePoints?: Array<{ lat: number; lng: number }>;
}

export interface ComputedLiveRoute {
  success: boolean;
  source: 'unavailable';
  provider: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalDistanceKm: string;
  totalDurationMinutes: number;
  formattedEta: string;
  routeDescription: string;
  steps: LiveRouteStep[];
  polylineCoordinates: Array<{ lat: number; lng: number }>;
  timestamp: string;
}

export interface ResolvedDestinationSearch extends RouteDestination {
  placeId?: string;
  distanceKm?: number;
  etaMinutes?: number | null;
}

import { REAL_BANGKOK_LOCATIONS } from '../data/realBangkokLocations';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.35 * 10) / 10; // 1.35x Bangkok urban road factor
}

/**
 * Generate a Google Maps Universal Directions URL for external navigation.
 * Can be called with a single destination (uses current location), or origin + destination.
 */
export function getExternalGoogleMapsNavUrl(
  destinationOrOrigin: { lat: number; lng: number } | string,
  maybeDestination?: { lat: number; lng: number } | string
): string {
  if (!maybeDestination) {
    const d = typeof destinationOrOrigin === 'string'
      ? encodeURIComponent(destinationOrOrigin)
      : `${destinationOrOrigin.lat},${destinationOrOrigin.lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${d}&travelmode=two-wheeler`;
  }
  const origin = destinationOrOrigin;
  const destination = maybeDestination;
  if (typeof origin === 'object' && typeof destination === 'object') {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=two-wheeler`;
  }
  const o = typeof origin === 'string' ? encodeURIComponent(origin) : `${origin.lat},${origin.lng}`;
  const d = typeof destination === 'string' ? encodeURIComponent(destination) : `${destination.lat},${destination.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=two-wheeler`;
}

/**
 * Opens external Google Maps turn-by-turn navigation in a new window/tab.
 */
export function openExternalGoogleMaps(
  destination: { lat: number; lng: number; name?: string; address?: string },
  origin?: { lat: number; lng: number }
): void {
  const originStr = origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
    ? `&origin=${origin.lat},${origin.lng}`
    : '';
  const destStr = Number.isFinite(destination.lat) && Number.isFinite(destination.lng) && destination.lat !== 0
    ? `&destination=${destination.lat},${destination.lng}`
    : `&destination=${encodeURIComponent(destination.address || destination.name || 'กรุงเทพมหานคร')}`;
  const url = `https://www.google.com/maps/dir/?api=1${originStr}${destStr}&travelmode=two-wheeler`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Search reference destinations from GPS.
 * Evaluates Bangkok reference points first, supplemented with the server resolver when available.
 * Fares are NEVER fixed per destination; authoritative fares are always calculated via calculateAppFare(serviceId, distanceKm).
 */
export async function searchDestinationsFromGps(params: {
  latitude: number;
  longitude: number;
  query: string;
}): Promise<ResolvedDestinationSearch[]> {
  const query = params.query.trim().toLowerCase();
  if (!query || !Number.isFinite(params.latitude) || !Number.isFinite(params.longitude)) return [];

  // 1. Instant local matching against Bangkok reference destinations
  const localMatches: ResolvedDestinationSearch[] = [];
  const allReferencePlaces = [
    ...POPULAR_BANGKOK_DESTINATIONS,
    ...REAL_BANGKOK_LOCATIONS.map((loc) => ({
      id: loc.id,
      name: loc.name,
      nameEn: loc.name,
      category: loc.zoneTitle,
      lat: loc.lat,
      lng: loc.lng,
      address: loc.addressTh,
      landmark: loc.landmarkNote,
    })),
  ];

  for (const place of allReferencePlaces) {
    const textCorpus = `${place.name} ${place.nameEn} ${place.address} ${place.landmark} ${place.category}`.toLowerCase();
    if (textCorpus.includes(query)) {
      const dist = calculateDistanceKm(params.latitude, params.longitude, place.lat, place.lng);
      localMatches.push({
        ...place,
        distanceKm: undefined,
        etaMinutes: null,
      });
    }
  }

  // 2. Admin-verified public Thai destinations (TAT). No fake coordinates or fares are created here.
  try {
    const response = await fetch('/api/public-data/places?kind=attractions&query=' + encodeURIComponent(params.query) + '&limit=20', {
      headers: { Accept: 'application/json' }
    });
    if (response.ok) {
      const payload = await response.json() as { records?: Array<{ id:string; name:string; category?:string; address?:string; province?:string; district?:string; latitude:number; longitude:number }> };
      for (const record of payload.records || []) {
        if (!Number.isFinite(record.latitude) || !Number.isFinite(record.longitude)) continue;
        if (!localMatches.some((lm) => Math.abs(lm.lat - record.latitude) < 0.001 && Math.abs(lm.lng - record.longitude) < 0.001)) {
          localMatches.push({
            id: String(record.id),
            name: String(record.name),
            nameEn: '',
            category: String(record.category || 'แหล่งท่องเที่ยว'),
            lat: Number(record.latitude),
            lng: Number(record.longitude),
            address: [record.address, record.district, record.province].filter(Boolean).join(' '),
            landmark: '',
            placeId: String(record.id),
            distanceKm: undefined,
            etaMinutes: null,
          });
        }
      }
    }
  } catch {
    // Public-data service is optional; never fabricate a destination when it is unavailable.
  }

  // 2. Optionally attempt authenticated server-side places search for expanded coverage
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      const response = await fetch('/api/places/resolve-routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: params.latitude,
          longitude: params.longitude,
          places: [{ key: 'knight-destination-search', query: `${params.query.trim()} ประเทศไทย` }]
        })
      });

      if (response.ok) {
        const payload = await response.json() as {
          routes?: Array<{
            key: string;
            placeId?: string;
            name?: string;
            address?: string;
            latitude?: number;
            longitude?: number;
            distanceKm?: number;
            etaMinutes?: number | null;
          }>;
        };

        const serverPlaces: ResolvedDestinationSearch[] = (payload.routes || [])
          .filter((route) => typeof route.latitude === 'number' && Number.isFinite(route.latitude) && typeof route.longitude === 'number' && Number.isFinite(route.longitude))
          .map((route) => ({
            id: String(route.placeId || route.key),
            name: String(route.name || params.query),
            nameEn: '',
            category: 'สถานที่ค้นหา',
            lat: Number(route.latitude),
            lng: Number(route.longitude),
            address: String(route.address || ''),
            landmark: '',
            placeId: route.placeId,
            distanceKm: typeof route.distanceKm === 'number' && Number.isFinite(route.distanceKm) ? Number(route.distanceKm) : calculateDistanceKm(params.latitude, params.longitude, Number(route.latitude), Number(route.longitude)),
            etaMinutes: route.etaMinutes ?? Math.max(3, Math.ceil((route.distanceKm || 3) * 3.5))
          }));

        // Merge without duplicates by proximity
        for (const sp of serverPlaces) {
          if (!localMatches.some((lm) => Math.abs(lm.lat - sp.lat) < 0.001 && Math.abs(lm.lng - sp.lng) < 0.001)) {
            localMatches.push(sp);
          }
        }
      }
    }
  } catch {
    // Graceful fallback to local reference matches
  }

  return localMatches.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
}

/**
 * Curated Bangkok Reference Destinations
 * Note: Estimated fares are strictly computed by the real distance and WINRIDER Fare Engine.
 * No static/hard-coded fares exist on reference destinations.
 */
export const POPULAR_BANGKOK_DESTINATIONS: RouteDestination[] = [
  {
    id: 'dest-skv39',
    name: 'ซอยสุขุมวิท 39 (BTS พร้อมพงษ์)',
    nameEn: 'Soi Sukhumvit 39 (Phrom Phong)',
    category: 'Commercial / Transit',
    lat: 13.7314,
    lng: 100.5700,
    address: 'สุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ',
    landmark: 'ปากซอยติดศูนย์การค้า EmQuartier & BTS พร้อมพงษ์',
  },
  {
    id: 'dest-siam',
    name: 'สยามพารากอน - สยามสแควร์วัน',
    nameEn: 'Siam Paragon & Siam Square One',
    category: 'Shopping & Landmark',
    lat: 13.7462,
    lng: 100.5348,
    address: 'ถนนพระรามที่ 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ',
    landmark: 'ลานน้ำพุพารากอน ใกล้ BTS สยาม',
  },
  {
    id: 'dest-iconsiam',
    name: 'ไอคอนสยาม (ICONSIAM - ริมแม่น้ำเจ้าพระยา)',
    nameEn: 'ICONSIAM Chao Phraya River',
    category: 'Riverside & Tourism',
    lat: 13.7267,
    lng: 100.5108,
    address: 'ถนนเจริญนคร แขวงคลองต้นไทร เขตคลองสาน กรุงเทพฯ',
    landmark: 'ริมแม่น้ำเจ้าพระยา ท่าเรือไอคอนสยาม',
  },
  {
    id: 'dest-siriraj',
    name: 'โรงพยาบาลศิริราช (ฝั่งธนบุรี)',
    nameEn: 'Siriraj Hospital (Thonburi)',
    category: 'Medical & Emergency',
    lat: 13.7578,
    lng: 100.4851,
    address: 'ถนนวังหลัง แขวงศิริราช เขตบางกอกน้อย กรุงเทพฯ',
    landmark: 'ตึก 100 ปี สมเด็จพระศรีนครินทร์ ท่าเรือวังหลัง',
  },
  {
    id: 'dest-thonglo',
    name: 'ทองหล่อ ซอย 10 (Arena 10)',
    nameEn: 'Thong Lo Soi 10 (Arena 10)',
    category: 'Lifestyle & Dining',
    lat: 13.7335,
    lng: 100.5847,
    address: 'สุขุมวิท 55 (ทองหล่อ 10) แขวงคลองตันเหนือ เขตวัฒนา',
    landmark: 'หน้าศูนย์รวมร้านอาหาร The Commons & Arena 10',
  },
  {
    id: 'dest-silom',
    name: 'สีลม - ช่องนนทรี (ตึกมหานคร / BTS ศาลาแดง)',
    nameEn: 'Silom - Chong Nonsi (King Power Mahanakhon)',
    category: 'Business District',
    lat: 13.7226,
    lng: 100.5283,
    address: 'ถนนสีลม - สาทร แขวงสีลม เขตบางรัก กรุงเทพฯ',
    landmark: 'สกายวอล์กช่องนนทรี ใกล้ตึกมหานคร',
  },
  {
    id: 'dest-chatuchak',
    name: 'ตลาดนัดจตุจักร - BTS หมอชิต',
    nameEn: 'Chatuchak Weekend Market (BTS Mo Chit)',
    category: 'Market & Transit Hub',
    lat: 13.8016,
    lng: 100.5516,
    address: 'ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ',
    landmark: 'หอนาฬิกาจตุจักร ประตู 1 ติด MRT กำแพงเพชร',
  }
];

/**
 * Standard Google Polyline Decoder
 */
export function decodeGooglePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  if (!encoded || typeof encoded !== 'string') return [];
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  try {
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }
  } catch (err) {
    console.warn('[Polyline Decoder] Error decoding string:', err);
  }

  return points;
}

/**
 * Maps a route-provider maneuver string or Thai instruction to our ARManeuverType
 */
export function mapGoogleManeuverToArType(maneuverStr?: string, instructionsText?: string): ARManeuverType {
  const m = (maneuverStr || '').toUpperCase();
  const text = (instructionsText || '').toLowerCase();

  if (m.includes('LEFT') || text.includes('ซ้าย')) {
    if (m.includes('SLIGHT') || text.includes('เบี่ยงซ้าย') || text.includes('ชิดซ้าย')) return 'slight_left';
    if (m.includes('SHARP') || text.includes('หักศอก')) return 'sharp_left';
    return 'turn_left';
  }

  if (m.includes('RIGHT') || text.includes('ขวา')) {
    if (m.includes('SLIGHT') || text.includes('เบี่ยงขวา') || text.includes('ชิดขวา')) return 'slight_right';
    if (m.includes('SHARP') || text.includes('หักศอก')) return 'sharp_right';
    return 'turn_right';
  }

  if (m.includes('UTURN') || text.includes('กลับรถ')) {
    return 'u_turn';
  }

  if (m.includes('ARRIVE') || text.includes('ถึงจุดหมาย') || text.includes('ปลายทาง')) {
    return 'arrived';
  }

  return 'straight';
}

/**
 * Route calculation is currently unavailable because Google Maps Platform Routes API is disabled.
 */
export async function computeLiveRoute(_params: {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number; name?: string; address?: string };
  travelMode?: 'TWO_WHEELER' | 'DRIVE' | 'BICYCLE' | 'WALK';
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL' | 'REGULAR';
}): Promise<ComputedLiveRoute> {
  // Google Routes API is intentionally disabled for billing safety.
  return {
    success: false,
    source: 'unavailable',
    provider: 'Road routing unavailable (Google Routes API disabled)',
    totalDistanceMeters: 0,
    totalDurationSeconds: 0,
    totalDistanceKm: '',
    totalDurationMinutes: 0,
    formattedEta: '',
    routeDescription: 'การคำนวณเส้นทางจริงถูกปิดชั่วคราวเพื่อความปลอดภัยด้านค่าใช้บริการ',
    steps: [],
    polylineCoordinates: [],
    timestamp: new Date().toISOString()
  };
}

function travelModeToString(mode: string): string {
  switch (mode) {
    case 'TWO_WHEELER': return 'มอเตอร์ไซค์รับจ้าง';
    case 'DRIVE': return 'รถยนต์';
    case 'BICYCLE': return 'จักรยาน';
    case 'WALK': return 'เดินเท้า';
    default: return 'การเดินทาง';
  }
}
