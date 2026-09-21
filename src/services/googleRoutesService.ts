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
  estimatedFare: number;
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
  source: 'google_routes_api_live' | 'unavailable';
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

/**
 * Search a real destination from the Knight's current GPS through the existing
 * authenticated Google Places (New) + Routes API backend resolver.
 * The backend returns real coordinates/place IDs; the final turn-by-turn route
 * is still calculated separately by computeLiveRoute().
 */
export async function searchDestinationsFromGps(params: {
  latitude: number;
  longitude: number;
  query: string;
}): Promise<ResolvedDestinationSearch[]> {
  const query = params.query.trim();
  if (!query || !Number.isFinite(params.latitude) || !Number.isFinite(params.longitude)) return [];

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Authentication required for destination search');

  const response = await fetch('/api/places/resolve-routes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      latitude: params.latitude,
      longitude: params.longitude,
      places: [{ key: 'knight-destination-search', query: `${query} ประเทศไทย` }]
    })
  });

  if (!response.ok) {
    throw new Error('ค้นหาปลายทางจริงไม่สำเร็จ');
  }

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

  return (payload.routes || [])
    .filter((route) => Number.isFinite(route.latitude) && Number.isFinite(route.longitude))
    .map((route) => ({
      id: String(route.placeId || route.key),
      name: String(route.name || query),
      nameEn: '',
      category: 'Google Places',
      lat: Number(route.latitude),
      lng: Number(route.longitude),
      address: String(route.address || ''),
      landmark: '',
      estimatedFare: 0,
      placeId: route.placeId,
      distanceKm: Number.isFinite(route.distanceKm) ? Number(route.distanceKm) : undefined,
      etaMinutes: route.etaMinutes ?? null
    }));
}

/**
 * Curated Bangkok Destinations for Quick Route Testing and Navigation
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
    estimatedFare: 45
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
    estimatedFare: 65
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
    estimatedFare: 55
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
    estimatedFare: 40
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
    estimatedFare: 50
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
    estimatedFare: 50
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
    estimatedFare: 85
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
 * Maps Google Routes API Maneuver string or Thai instruction to our ARManeuverType
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
 * Requests real-time route from server proxy (Google Maps Platform Routes API)
 */
export async function computeLiveRoute(params: {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number; name?: string; address?: string };
  travelMode?: 'TWO_WHEELER' | 'DRIVE' | 'BICYCLE' | 'WALK';
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL' | 'REGULAR';
}): Promise<ComputedLiveRoute> {
  let json: any = null;
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Authentication required for live routing');
    const response = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        origin: params.origin,
        destination: params.destination,
        travelMode: params.travelMode || 'TWO_WHEELER',
        routingPreference: params.routingPreference || 'TRAFFIC_AWARE',
        languageCode: 'th-TH'
      })
    });

    if (response.ok) {
      json = await response.json();
    }
  } catch (_fetchErr) {
    // Gracefully handle network or server error
  }

  const rawRoute = json?.route;

  if (rawRoute) {
    const distMeters = rawRoute.distanceMeters || (rawRoute.legs && rawRoute.legs[0]?.distanceMeters) || 3500;
    let durationSec = 300;
    if (typeof rawRoute.duration === 'string') {
      durationSec = parseInt(rawRoute.duration.replace('s', ''), 10) || 300;
    } else if (rawRoute.legs && rawRoute.legs[0]?.duration) {
      durationSec = parseInt(rawRoute.legs[0].duration.replace('s', ''), 10) || 300;
    }

    // Parse Legs & Steps
    const rawSteps = (rawRoute.legs && rawRoute.legs[0]?.steps) || [];
    const parsedSteps: LiveRouteStep[] = rawSteps.map((s: any, idx: number) => {
      const instr = s.navigationInstruction?.instructions || `มุ่งหน้าไปตามเส้นทาง (ช่วงที่ ${idx + 1})`;
      const rawManeuver = s.navigationInstruction?.maneuver || 'STRAIGHT';
      const maneuverType = mapGoogleManeuverToArType(rawManeuver, instr);

      let stepSec = 60;
      if (typeof s.staticDuration === 'string') {
        stepSec = parseInt(s.staticDuration.replace('s', ''), 10) || 60;
      }

      const startLat = s.startLocation?.latLng?.latitude || params.origin.latitude;
      const startLng = s.startLocation?.latLng?.longitude || params.origin.longitude;
      const endLat = s.endLocation?.latLng?.latitude || params.destination.latitude;
      const endLng = s.endLocation?.latLng?.longitude || params.destination.longitude;

      return {
        stepIndex: idx,
        instructions: instr,
        maneuver: maneuverType,
        rawManeuver,
        distanceMeters: s.distanceMeters || 250,
        durationSeconds: stepSec,
        startLocation: { lat: startLat, lng: startLng },
        endLocation: { lat: endLat, lng: endLng },
        polylinePoints: s.polyline?.encodedPolyline ? decodeGooglePolyline(s.polyline.encodedPolyline) : undefined
      };
    });

    // Decode master route polyline
    let polylineCoords: Array<{ lat: number; lng: number }> = [];
    if (rawRoute.polyline?.encodedPolyline) {
      polylineCoords = decodeGooglePolyline(rawRoute.polyline.encodedPolyline);
    }

    // Fallback coords if no polyline
    if (polylineCoords.length === 0) {
      polylineCoords = [
        { lat: params.origin.latitude, lng: params.origin.longitude },
        { lat: (params.origin.latitude + params.destination.latitude) / 2, lng: (params.origin.longitude + params.destination.longitude) / 2 },
        { lat: params.destination.latitude, lng: params.destination.longitude }
      ];
    }

    const totalDistKm = (distMeters / 1000).toFixed(1);
    const totalMin = Math.max(1, Math.round(durationSec / 60));

    return {
      success: true,
      source: json?.source || 'google_routes_api_live',
      provider: json?.provider || 'Google Maps Platform Routes API',
      totalDistanceMeters: distMeters,
      totalDurationSeconds: durationSec,
      totalDistanceKm: `${totalDistKm} กม.`,
      totalDurationMinutes: totalMin,
      formattedEta: `${totalMin} นาที`,
      routeDescription: rawRoute.description || `เส้นทางเร็วที่สุด (${travelModeToString(params.travelMode || 'TWO_WHEELER')})`,
      steps: parsedSteps,
      polylineCoordinates: polylineCoords,
      timestamp: json?.timestamp || new Date().toISOString()
    };
  }

  return {
    success: false,
    source: 'unavailable',
    provider: 'Google Maps Platform Routes API',
    totalDistanceMeters: 0,
    totalDurationSeconds: 0,
    totalDistanceKm: '',
    totalDurationMinutes: 0,
    formattedEta: '',
    routeDescription: 'ไม่สามารถโหลดเส้นทางจริงได้ กรุณาตรวจสอบ API และการเชื่อมต่อ',
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
