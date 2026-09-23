import { ARManeuverType } from '../components/ARLiveCameraNavigation';
import { auth } from '../firebase';
import { REAL_BANGKOK_LOCATIONS } from '../data/realBangkokLocations';

export interface RouteCoordinate { lat: number; lng: number; latitude?: number; longitude?: number; }
export interface RouteDestination { id: string; name: string; nameEn: string; category: string; lat: number; lng: number; address: string; landmark: string; }
export interface LiveRouteStep { stepIndex: number; instructions: string; maneuver: ARManeuverType; rawManeuver?: string; distanceMeters: number; durationSeconds: number; startLocation: { lat: number; lng: number }; endLocation: { lat: number; lng: number }; polylinePoints?: Array<{ lat: number; lng: number }>; }
export interface ComputedLiveRoute { success: boolean; source: 'local_estimate' | 'google_routes'; provider: string; totalDistanceMeters: number; totalDurationSeconds: number; totalDistanceKm: string; totalDurationMinutes: number; formattedEta: string; routeDescription: string; steps: LiveRouteStep[]; polylineCoordinates: Array<{ lat: number; lng: number }>; timestamp: string; }
export interface ResolvedDestinationSearch extends RouteDestination { placeId?: string; distanceKm?: number; etaMinutes?: number | null; }

const isFiniteCoord = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = 6371; const dLat = (b.lat - a.lat) * Math.PI / 180; const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export function getExternalGoogleMapsNavUrl(destinationOrOrigin: { lat: number; lng: number } | string, maybeDestination?: { lat: number; lng: number } | string): string {
  const clean = (value: { lat: number; lng: number } | string) => typeof value === 'string' ? encodeURIComponent(value.trim()) : `${value.lat},${value.lng}`;
  if (!maybeDestination) return `https://www.google.com/maps/dir/?api=1&destination=${clean(destinationOrOrigin)}&travelmode=two-wheeler`;
  return `https://www.google.com/maps/dir/?api=1&origin=${clean(destinationOrOrigin)}&destination=${clean(maybeDestination)}&travelmode=two-wheeler`;
}
export function openExternalGoogleMaps(destination: { lat: number; lng: number; name?: string; address?: string }, origin?: { lat: number; lng: number }): void {
  const url = origin ? getExternalGoogleMapsNavUrl(origin, isFiniteCoord(destination.lat, destination.lng) ? destination : (destination.address || destination.name || 'กรุงเทพมหานคร')) : getExternalGoogleMapsNavUrl(isFiniteCoord(destination.lat, destination.lng) ? destination : (destination.address || destination.name || 'กรุงเทพมหานคร'));
  window.open(url, '_blank', 'noopener,noreferrer');
}

export const POPULAR_BANGKOK_DESTINATIONS: RouteDestination[] = [
  { id: 'dest-skv39', name: 'ซอยสุขุมวิท 39 (BTS พร้อมพงษ์)', nameEn: 'Soi Sukhumvit 39 (Phrom Phong)', category: 'Commercial / Transit', lat: 13.7314, lng: 100.5700, address: 'สุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ', landmark: 'EmQuartier & BTS พร้อมพงษ์' },
  { id: 'dest-siam', name: 'สยามพารากอน - สยามสแควร์วัน', nameEn: 'Siam Paragon & Siam Square One', category: 'Shopping & Landmark', lat: 13.7462, lng: 100.5348, address: 'ถนนพระรามที่ 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ', landmark: 'BTS สยาม' },
  { id: 'dest-iconsiam', name: 'ไอคอนสยาม (ICONSIAM)', nameEn: 'ICONSIAM Chao Phraya River', category: 'Riverside & Tourism', lat: 13.7267, lng: 100.5108, address: 'ถนนเจริญนคร แขวงคลองต้นไทร เขตคลองสาน กรุงเทพฯ', landmark: 'ท่าเรือไอคอนสยาม' },
  { id: 'dest-siriraj', name: 'โรงพยาบาลศิริราช', nameEn: 'Siriraj Hospital', category: 'Medical & Emergency', lat: 13.7578, lng: 100.4851, address: 'ถนนวังหลัง แขวงศิริราช เขตบางกอกน้อย กรุงเทพฯ', landmark: 'ท่าเรือวังหลัง' },
  { id: 'dest-thonglo', name: 'ทองหล่อ ซอย 10', nameEn: 'Thong Lo Soi 10', category: 'Lifestyle & Dining', lat: 13.7335, lng: 100.5847, address: 'สุขุมวิท 55 (ทองหล่อ 10) เขตวัฒนา กรุงเทพฯ', landmark: 'Arena 10' },
  { id: 'dest-silom', name: 'สีลม - ช่องนนทรี', nameEn: 'Silom - Chong Nonsi', category: 'Business District', lat: 13.7226, lng: 100.5283, address: 'ถนนสีลม - สาทร กรุงเทพฯ', landmark: 'BTS ศาลาแดง / ช่องนนทรี' },
  { id: 'dest-chatuchak', name: 'ตลาดนัดจตุจักร - BTS หมอชิต', nameEn: 'Chatuchak Weekend Market', category: 'Market & Transit Hub', lat: 13.8016, lng: 100.5516, address: 'ถนนพหลโยธิน แขวงจตุจักร กรุงเทพฯ', landmark: 'MRT กำแพงเพชร' },
];

export async function searchDestinationsFromGps(params: { latitude: number; longitude: number; query: string }): Promise<ResolvedDestinationSearch[]> {
  if (!isFiniteCoord(params.latitude, params.longitude) || !params.query.trim()) return [];
  const query = params.query.trim().toLowerCase();
  const references = [...POPULAR_BANGKOK_DESTINATIONS, ...REAL_BANGKOK_LOCATIONS.map((loc) => ({ id: loc.id, name: loc.thaiName || loc.name, nameEn: loc.name, category: loc.zoneTitle, lat: loc.lat, lng: loc.lng, address: loc.addressTh, landmark: loc.landmarkNote }))];
  const local: ResolvedDestinationSearch[] = references.filter((place) => `${place.name} ${place.nameEn} ${place.address} ${place.landmark} ${place.category}`.toLowerCase().includes(query)).map((place) => ({ ...place, distanceKm: haversineKm({ lat: params.latitude, lng: params.longitude }, place), etaMinutes: null }));
  try {
    const response = await fetch(`/api/public-data/places?kind=attractions&query=${encodeURIComponent(params.query)}&limit=20`, { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const payload = await response.json() as { records?: Array<{ id: string; name: string; category?: string; address?: string; province?: string; district?: string; latitude: number; longitude: number }> };
      for (const record of payload.records || []) if (isFiniteCoord(record.latitude, record.longitude) && !local.some((p) => Math.abs(p.lat - record.latitude) < .001 && Math.abs(p.lng - record.longitude) < .001)) local.push({ id: String(record.id), name: String(record.name), nameEn: '', category: String(record.category || 'แหล่งท่องเที่ยว'), lat: Number(record.latitude), lng: Number(record.longitude), address: [record.address, record.district, record.province].filter(Boolean).join(' '), landmark: '', placeId: String(record.id), distanceKm: haversineKm({ lat: params.latitude, lng: params.longitude }, { lat: Number(record.latitude), lng: Number(record.longitude) }), etaMinutes: null });
    }
  } catch { /* local verified reference data remains available */ }
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      const response = await fetch('/api/places/resolve-routes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ latitude: params.latitude, longitude: params.longitude, places: [{ key: 'knight-destination-search', query: `${params.query.trim()} ประเทศไทย` }] }) });
      if (response.ok) {
        const payload = await response.json() as { routes?: Array<{ key: string; placeId?: string; name?: string; address?: string; latitude?: number; longitude?: number; distanceKm?: number; etaMinutes?: number | null }> };
        for (const route of payload.routes || []) if (isFiniteCoord(Number(route.latitude), Number(route.longitude)) && !local.some((p) => Math.abs(p.lat - Number(route.latitude)) < .001 && Math.abs(p.lng - Number(route.longitude)) < .001)) local.push({ id: String(route.placeId || route.key), name: String(route.name || params.query), nameEn: '', category: 'สถานที่ค้นหา', lat: Number(route.latitude), lng: Number(route.longitude), address: String(route.address || ''), landmark: '', placeId: route.placeId, distanceKm: typeof route.distanceKm === 'number' ? route.distanceKm : haversineKm({ lat: params.latitude, lng: params.longitude }, { lat: Number(route.latitude), lng: Number(route.longitude) }), etaMinutes: route.etaMinutes ?? null });
      }
    }
  } catch { /* provider unavailable: keep verified/local results */ }
  return local.sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
}

export function decodeGooglePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  if (!encoded) return []; const points: Array<{ lat: number; lng: number }> = []; let index = 0, lat = 0, lng = 0;
  try { while (index < encoded.length) { let b = 0, shift = 0, result = 0; do { b = encoded.charCodeAt(index++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32); lat += (result & 1) ? ~(result >> 1) : result >> 1; shift = 0; result = 0; do { b = encoded.charCodeAt(index++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32); lng += (result & 1) ? ~(result >> 1) : result >> 1; points.push({ lat: lat / 1e5, lng: lng / 1e5 }); } } catch { return []; } return points;
}
export function mapGoogleManeuverToArType(maneuverStr?: string, instructionsText?: string): ARManeuverType { const m = `${maneuverStr || ''}`.toUpperCase(); const t = `${instructionsText || ''}`.toLowerCase(); if (m.includes('LEFT') || t.includes('ซ้าย')) return m.includes('SHARP') ? 'sharp_left' : m.includes('SLIGHT') ? 'slight_left' : 'turn_left'; if (m.includes('RIGHT') || t.includes('ขวา')) return m.includes('SHARP') ? 'sharp_right' : m.includes('SLIGHT') ? 'slight_right' : 'turn_right'; if (m.includes('UTURN') || t.includes('กลับรถ')) return 'u_turn'; if (m.includes('ARRIVE') || t.includes('ถึง')) return 'arrived'; return 'straight'; }

/**
 * Provider-independent route fallback. It uses the user's real GPS and the
 * selected destination coordinates, so the app can calculate distance/fare
 * without a billable Routes API. Road navigation remains available through
 * the external Google Maps URL generated above.
 */
export async function computeLiveRoute(params: { origin: { latitude: number; longitude: number }; destination: { latitude: number; longitude: number; name?: string; address?: string }; travelMode?: 'TWO_WHEELER' | 'DRIVE' | 'BICYCLE' | 'WALK'; routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL' | 'REGULAR'; }): Promise<ComputedLiveRoute> {
  const o = { lat: Number(params.origin.latitude), lng: Number(params.origin.longitude) }; const d = { lat: Number(params.destination.latitude), lng: Number(params.destination.longitude) };
  if (!isFiniteCoord(o.lat, o.lng) || !isFiniteCoord(d.lat, d.lng)) return { success: false, source: 'local_estimate', provider: 'Local route fallback', totalDistanceMeters: 0, totalDurationSeconds: 0, totalDistanceKm: '0.0', totalDurationMinutes: 0, formattedEta: '—', routeDescription: 'พิกัดไม่ถูกต้อง', steps: [], polylineCoordinates: [], timestamp: new Date().toISOString() };
  const straightKm = haversineKm(o, d); const roadKm = straightKm < 0.1 ? straightKm : straightKm * 1.22;
  const speedKmh = params.travelMode === 'WALK' ? 5 : params.travelMode === 'BICYCLE' ? 15 : 28;
  const seconds = Math.max(60, Math.round((roadKm / speedKmh) * 3600)); const minutes = Math.max(1, Math.ceil(seconds / 60)); const distanceMeters = Math.round(roadKm * 1000);
  return { success: true, source: 'local_estimate', provider: 'WINRIDER local GPS distance fallback', totalDistanceMeters: distanceMeters, totalDurationSeconds: seconds, totalDistanceKm: roadKm.toFixed(1), totalDurationMinutes: minutes, formattedEta: `${minutes} นาที`, routeDescription: `ระยะทางประมาณ ${roadKm.toFixed(1)} กม. จาก GPS จริง • เปิด Google Maps เพื่อเส้นทางถนนแบบเลี้ยวต่อเลี้ยว`, steps: [{ stepIndex: 0, instructions: `มุ่งหน้าไป ${params.destination.name || params.destination.address || 'ปลายทาง'}`, maneuver: 'straight', distanceMeters, durationSeconds: seconds, startLocation: o, endLocation: d, polylinePoints: [o, d] }], polylineCoordinates: [o, d], timestamp: new Date().toISOString() };
}
