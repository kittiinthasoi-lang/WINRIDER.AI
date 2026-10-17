import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Building2, Compass, Crosshair, Flame, HeartHandshake, Hospital,
  List, Loader2, Map as MapIcon, MapPin, Navigation, Phone, PhoneCall, RefreshCw,
  ShieldAlert, ShieldCheck,
} from 'lucide-react';
import { useRealGeolocation } from '../hooks/useRealGeolocation';
import { auth } from '../firebase';
import { getAuthHeaders } from '../utils/dispatchSync';
import { playTactileBlip } from '../utils/audio';
import { RealTacticalRadar, TacticalRadarItem } from './RealTacticalRadar';
import { RealInteractiveMap } from './RealInteractiveMap';

interface Props {
  audioEnabled: boolean;
  onOpenWinBuddy?: () => void;
  onRideToDestination?: (name: string, address?: string, distanceKm?: number) => void;
  onBackToMain?: () => void;
}

export interface EmergencyPlace {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire_station' | 'rescue' | 'clinic' | string;
  categoryLabel?: string;
  address: string;
  phone: string;
  mapsUrl: string;
  openNow: boolean | null;
  distanceKm: number | null;
  bearingDeg?: number;
  etaMinutes: number | null;
  latitude: number;
  longitude: number;
}

type EmergencyFilter = 'all' | 'hospital' | 'police' | 'fire_station' | 'rescue';
type ViewMode = 'radar' | 'map' | 'list';

const FALLBACK_EMERGENCY_PLACES: Array<Omit<EmergencyPlace, 'distanceKm' | 'etaMinutes' | 'bearingDeg'>> = [
  // Hospitals
  {
    id: 'emg-chula',
    name: 'โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย (ศูนย์อุบัติเหตุฉุกเฉิน)',
    type: 'hospital',
    categoryLabel: 'โรงพยาบาลทั่วไป',
    address: '1874 ถนนพระรามที่ 4 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ',
    phone: '02-256-4000',
    mapsUrl: 'https://maps.google.com/?q=13.7314,100.5342',
    openNow: true,
    latitude: 13.7314,
    longitude: 100.5342,
  },
  {
    id: 'emg-siriraj',
    name: 'โรงพยาบาลศิริราช (ศูนย์การแพทย์ฉุกเฉินสยามินทร์)',
    type: 'hospital',
    categoryLabel: 'โรงพยาบาลทั่วไป',
    address: '2 ถนนวังหลัง แขวงศิริราช เขตบางกอกน้อย กรุงเทพฯ',
    phone: '02-419-7000',
    mapsUrl: 'https://maps.google.com/?q=13.7578,100.4855',
    openNow: true,
    latitude: 13.7578,
    longitude: 100.4855,
  },
  {
    id: 'emg-rama',
    name: 'โรงพยาบาลรามาธิบดี (หน่วยกู้ชีพและเวชศาสตร์ฉุกเฉิน)',
    type: 'hospital',
    categoryLabel: 'โรงพยาบาลทั่วไป',
    address: '270 ถนนพระรามที่ 6 แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพฯ',
    phone: '02-201-1000',
    mapsUrl: 'https://maps.google.com/?q=13.7668,100.5284',
    openNow: true,
    latitude: 13.7668,
    longitude: 100.5284,
  },
  {
    id: 'emg-police-hosp',
    name: 'โรงพยาบาลตำรวจ (ศูนย์รับแจ้งเหตุและช่วยชีวิตฉุกเฉิน)',
    type: 'hospital',
    categoryLabel: 'โรงพยาบาลทั่วไป',
    address: '492/1 ถนนพระรามที่ 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ',
    phone: '02-207-6000',
    mapsUrl: 'https://maps.google.com/?q=13.7438,100.5391',
    openNow: true,
    latitude: 13.7438,
    longitude: 100.5391,
  },

  // Police Stations
  {
    id: 'emg-police-patumwan',
    name: 'สถานีตำรวจนครบาลปทุมวัน (สน.ปทุมวัน)',
    type: 'police',
    categoryLabel: 'สถานีตำรวจ',
    address: 'ถนนพระรามที่ 1 เขตปทุมวัน กรุงเทพฯ',
    phone: '02-214-1056',
    mapsUrl: 'https://maps.google.com/?q=13.7441,100.5349',
    openNow: true,
    latitude: 13.7441,
    longitude: 100.5349,
  },
  {
    id: 'emg-police-phayathai',
    name: 'สถานีตำรวจนครบาลพญาไท (สน.พญาไท)',
    type: 'police',
    categoryLabel: 'สถานีตำรวจ',
    address: 'ถนนศรีอยุธยา แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพฯ',
    phone: '02-354-6957',
    mapsUrl: 'https://maps.google.com/?q=13.7584,100.5320',
    openNow: true,
    latitude: 13.7584,
    longitude: 100.5320,
  },
  {
    id: 'emg-police-thonglor',
    name: 'สถานีตำรวจนครบาลทองหล่อ (สน.ทองหล่อ)',
    type: 'police',
    categoryLabel: 'สถานีตำรวจ',
    address: 'ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ',
    phone: '02-381-8850',
    mapsUrl: 'https://maps.google.com/?q=13.7328,100.5826',
    openNow: true,
    latitude: 13.7328,
    longitude: 100.5826,
  },

  // Fire Stations
  {
    id: 'emg-fire-banthatthong',
    name: 'สถานีดับเพลิงและกู้ภัยบรรทัดทอง',
    type: 'fire_station',
    categoryLabel: 'สถานีดับเพลิง',
    address: 'ถนนบรรทัดทอง แขวงรองเมือง เขตปทุมวัน กรุงเทพฯ',
    phone: '199',
    mapsUrl: 'https://maps.google.com/?q=13.7482,100.5262',
    openNow: true,
    latitude: 13.7482,
    longitude: 100.5262,
  },
  {
    id: 'emg-fire-phayathai',
    name: 'สถานีดับเพลิงและกู้ภัยพญาไท',
    type: 'fire_station',
    categoryLabel: 'สถานีดับเพลิง',
    address: 'ถนนพระรามที่ 6 แขวงพญาไท เขตพญาไท กรุงเทพฯ',
    phone: '199',
    mapsUrl: 'https://maps.google.com/?q=13.7621,100.5338',
    openNow: true,
    latitude: 13.7621,
    longitude: 100.5338,
  },
  {
    id: 'emg-fire-klongtoei',
    name: 'สถานีดับเพลิงและกู้ภัยคลองเตย',
    type: 'fire_station',
    categoryLabel: 'สถานีดับเพลิง',
    address: 'ถนนอาจณรงค์ แขวงคลองเตย เขตคลองเตย กรุงเทพฯ',
    phone: '199',
    mapsUrl: 'https://maps.google.com/?q=13.7145,100.5630',
    openNow: true,
    latitude: 13.7145,
    longitude: 100.5630,
  },

  // Rescue Stations
  {
    id: 'emg-rescue-pohtecktung',
    name: 'มูลนิธิป่อเต็กตึ๊ง พลับพลาไชย (หน่วยกู้ชีพ-กู้ภัย 1418)',
    type: 'rescue',
    categoryLabel: 'สถานีกู้ภัย',
    address: '326 ถนนเจ้าคำรพ แขวงป้อมปราบ เขตป้อมปราบศัตรูพ่าย กรุงเทพฯ',
    phone: '1418',
    mapsUrl: 'https://maps.google.com/?q=13.7432,100.5098',
    openNow: true,
    latitude: 13.7432,
    longitude: 100.5098,
  },
  {
    id: 'emg-rescue-ruamkatanyu',
    name: 'มูลนิธิร่วมกตัญญู (ศูนย์กู้ภัยฉุกเฉิน)',
    type: 'rescue',
    categoryLabel: 'สถานีกู้ภัย',
    address: 'ถนนบางนา-ตราด กม.32 ตำบลบางพลีน้อย จังหวัดสมุทรปราการ',
    phone: '02-751-0951',
    mapsUrl: 'https://maps.google.com/?q=13.6148,100.7025',
    openNow: true,
    latitude: 13.6148,
    longitude: 100.7025,
  },
  {
    id: 'emg-rescue-erawan',
    name: 'ศูนย์บริการการแพทย์ฉุกเฉินกรุงเทพมหานคร (ศูนย์เอราวัณ 1669)',
    type: 'rescue',
    categoryLabel: 'สถานีกู้ภัย',
    address: 'โรงพยาบาลกลาง 514 ถนนหลวง แขวงป้อมปราบ กรุงเทพฯ',
    phone: '1669',
    mapsUrl: 'https://maps.google.com/?q=13.7533,100.5002',
    openNow: true,
    latitude: 13.7533,
    longitude: 100.5002,
  },
];

function calculateFallbackPlaces(userLat: number, userLng: number): EmergencyPlace[] {
  const toRad = (v: number) => (v * Math.PI) / 180;
  return FALLBACK_EMERGENCY_PLACES.map((p) => {
    const dLat = (p.latitude - userLat) * 111;
    const dLng = (p.longitude - userLng) * 111 * Math.cos((userLat * Math.PI) / 180);
    const dist = Math.round(Math.hypot(dLat, dLng) * 10) / 10;

    // Bearing
    const dLonRad = toRad(p.longitude - userLng);
    const y = Math.sin(dLonRad) * Math.cos(toRad(p.latitude));
    const x =
      Math.cos(toRad(userLat)) * Math.sin(toRad(p.latitude)) -
      Math.sin(toRad(userLat)) * Math.cos(toRad(p.latitude)) * Math.cos(dLonRad);
    const bearing = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

    return {
      ...p,
      distanceKm: dist,
      bearingDeg: bearing,
      etaMinutes: Math.round(dist * 2.8 + 2),
    };
  }).sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
}

const EMERGENCY_SCAN_TTL_MS = 5 * 60 * 1000;
const EMERGENCY_SCAN_MIN_MOVE_KM = 0.5;
let emergencyScanCache: { latitude: number; longitude: number; fetchedAt: number; places: EmergencyPlace[] } | null = null;

const canReuseEmergencyScan = (latitude: number, longitude: number) => {
  if (!emergencyScanCache) return false;
  const age = Date.now() - emergencyScanCache.fetchedAt;
  const movedKm = Math.hypot(
    (latitude - emergencyScanCache.latitude) * 111,
    (longitude - emergencyScanCache.longitude) * 111 * Math.cos((latitude * Math.PI) / 180),
  );
  return age < EMERGENCY_SCAN_TTL_MS && movedKm < EMERGENCY_SCAN_MIN_MOVE_KM;
};

const labels: Record<string, string> = {
  hospital: 'โรงพยาบาลทั่วไป',
  police: 'สถานีตำรวจ',
  fire_station: 'สถานีดับเพลิง',
  rescue: 'สถานีกู้ภัย',
  clinic: 'คลินิก / สถานพยาบาล',
};

const iconFor = (type: string) => {
  if (type === 'fire_station') return Flame;
  if (type === 'police') return ShieldAlert;
  if (type === 'rescue') return HeartHandshake;
  return Hospital;
};

export const HospitalCommandCenter: React.FC<Props> = ({
  audioEnabled,
  onOpenWinBuddy,
  onRideToDestination,
  onBackToMain,
}) => {
  const geo = useRealGeolocation(true);
  const [viewMode, setViewMode] = useState<ViewMode>('radar');
  const [places, setPlaces] = useState<EmergencyPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<EmergencyFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');

  const loadEmergencyPlaces = useCallback(async (force = false) => {
    const lat = geo.latitude ?? 13.7563;
    const lng = geo.longitude ?? 100.5018;

    if (!force && canReuseEmergencyScan(lat, lng)) {
      const cached = emergencyScanCache?.places || [];
      setPlaces(cached);
      if (cached.length > 0 && !selectedPlaceId) setSelectedPlaceId(cached[0].id);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders().catch(() => ({ 'Content-Type': 'application/json' }));
      const response = await fetch('/api/emergency/nearby', {
        method: 'POST',
        headers,
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const payload = await response.json().catch(() => ({})) as { places?: EmergencyPlace[]; error?: string; fetchedAt?: string };

      if (response.ok && Array.isArray(payload.places) && payload.places.length > 0) {
        setPlaces(payload.places);
        if (payload.places.length > 0) setSelectedPlaceId(payload.places[0].id);
        setFetchedAt(payload.fetchedAt || new Date().toISOString());
        emergencyScanCache = { latitude: lat, longitude: lng, fetchedAt: Date.now(), places: payload.places };
      } else {
        const fallback = calculateFallbackPlaces(lat, lng);
        setPlaces(fallback);
        if (fallback.length > 0) setSelectedPlaceId(fallback[0].id);
        emergencyScanCache = { latitude: lat, longitude: lng, fetchedAt: Date.now(), places: fallback };
      }
    } catch {
      const fallback = calculateFallbackPlaces(lat, lng);
      setPlaces(fallback);
      if (fallback.length > 0) setSelectedPlaceId(fallback[0].id);
    } finally {
      setLoading(false);
    }
  }, [geo.latitude, geo.longitude, selectedPlaceId]);

  useEffect(() => {
    void loadEmergencyPlaces();
  }, [loadEmergencyPlaces]);

  const visiblePlaces = useMemo(() => {
    return places.filter((place) => {
      if (filter === 'all') return true;
      if (filter === 'hospital') return place.type === 'hospital' || place.name.includes('โรงพยาบาล');
      if (filter === 'police') return place.type === 'police' || place.name.includes('ตำรวจ');
      if (filter === 'fire_station') return place.type === 'fire_station' || place.name.includes('ดับเพลิง');
      if (filter === 'rescue') return place.type === 'rescue' || place.name.includes('กู้ภัย') || place.name.includes('มูลนิธิ');
      return true;
    });
  }, [places, filter]);

  // Convert to TacticalRadarItem for Radar and Map components
  const tacticalRadarItems = useMemo<TacticalRadarItem[]>(() => {
    return visiblePlaces.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.type,
      categoryLabel: p.categoryLabel || labels[p.type] || 'ศูนย์ฉุกเฉิน',
      latitude: p.latitude,
      longitude: p.longitude,
      distanceKm: p.distanceKm ?? 0,
      bearingDeg: p.bearingDeg,
      phone: p.phone,
      address: p.address,
      openNow: p.openNow ?? true,
      is24Hours: true,
      mapsUrl: p.mapsUrl,
      etaMinutes: p.etaMinutes ?? Math.max(3, Math.round((p.distanceKm || 1) * 2.8 + 2)),
      typeIcon: p.type === 'fire_station' ? 'fire_station' : p.type === 'police' ? 'police' : p.type === 'rescue' ? 'rescue' : 'hospital',
    }));
  }, [visiblePlaces]);

  const handleSelectFromRadarOrMap = (item: TacticalRadarItem) => {
    setSelectedPlaceId(item.id);
  };

  const handleActionFromRadarOrMap = (item: TacticalRadarItem) => {
    if (onRideToDestination) {
      if (audioEnabled) playTactileBlip(1200);
      onRideToDestination(item.name, item.address, item.distanceKm);
    }
  };

  const hospitalCount = places.filter((p) => p.type === 'hospital' || p.name.includes('โรงพยาบาล')).length;
  const policeCount = places.filter((p) => p.type === 'police' || p.name.includes('ตำรวจ')).length;
  const fireCount = places.filter((p) => p.type === 'fire_station' || p.name.includes('ดับเพลิง')).length;
  const rescueCount = places.filter((p) => p.type === 'rescue' || p.name.includes('กู้ภัย') || p.name.includes('มูลนิธิ')).length;

  const userLat = geo.latitude ?? 13.7563;
  const userLng = geo.longitude ?? 100.5018;

  return (
    <div className="space-y-4">
      {onBackToMain && (
        <button
          type="button"
          onClick={onBackToMain}
          className="rounded-xl border border-rose-500/40 bg-black/40 px-3 py-2 text-xs font-bold text-rose-300"
        >
          ← กลับหน้าหลัก
        </button>
      )}

      {/* Emergency Hotline Header */}
      <header className="rounded-3xl border-2 border-rose-500/40 bg-gradient-to-br from-[#2a0e1c] via-[#160a1c] to-[#080d1e] p-5 text-white shadow-[0_0_35px_rgba(244,63,94,0.2)]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black tracking-wider uppercase text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              PUBLIC EMERGENCY & RESCUE COMMAND
            </div>
            <h2 className="mt-1 text-xl font-black text-white">ศูนย์พยาบาลและกู้ภัยรอบตำแหน่งจริง</h2>
            <p className="mt-1 text-xs text-slate-300">
              โรงพยาบาลทั่วไป สถานีตำรวจ สถานีดับเพลิง และสถานีกู้ภัย จากตำแหน่ง GPS ปัจจุบัน • มีเรดาร์ 360° และแผนที่พิกัดจริง
            </p>
          </div>
          {onOpenWinBuddy && (
            <button
              type="button"
              onClick={onOpenWinBuddy}
              className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 transition-colors"
            >
              🤖 ผู้ช่วยฉุกเฉิน WIN Buddy
            </button>
          )}
        </div>

        {/* Big Emergency Dial Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['1669', 'การแพทย์ฉุกเฉิน', 'bg-rose-600 hover:bg-rose-500', '🏥'],
            ['191', 'เหตุด่วนเหตุร้าย (ตำรวจ)', 'bg-blue-600 hover:bg-blue-500', '🚓'],
            ['199', 'ดับเพลิงและกู้ภัย', 'bg-orange-600 hover:bg-orange-500', '🚒'],
            ['1418', 'มูลนิธิกู้ภัย (ป่อเต็กตึ๊ง)', 'bg-amber-600 hover:bg-amber-500', '🚑'],
          ].map(([number, label, bgClass, emoji]) => (
            <a
              key={number}
              href={`tel:${number}`}
              className={`flex flex-col items-center justify-center rounded-2xl ${bgClass} p-3 text-center transition-all shadow-md active:scale-95`}
            >
              <div className="text-xl">{emoji}</div>
              <div className="mt-1 font-mono text-base font-black text-white">{number}</div>
              <div className="text-[10px] font-bold text-white/90">{label}</div>
            </a>
          ))}
        </div>

        {/* GPS Coordinates Bar */}
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2">
            <Crosshair className={`h-4 w-4 ${geo.isRealGps ? 'text-emerald-400' : 'text-amber-300'}`} />
            {geo.isRealGps ? (
              <span className="text-emerald-300">
                จุดศูนย์กลาง GPS จริง: ละติจูด {geo.latitude?.toFixed(4)}, ลองจิจูด {geo.longitude?.toFixed(4)} • แม่นยำ ±{Math.round(geo.accuracy || 0)} ม.
              </span>
            ) : (
              <span className="text-amber-200">อนุญาตตำแหน่ง GPS เพื่อให้เรดาร์และแผนที่หาศูนย์ฉุกเฉินจริงรอบตัวคุณ</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={geo.refreshLocation}
              className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-colors"
            >
              <Crosshair className="mr-1 inline h-3.5 w-3.5" /> ขอพิกัดใหม่
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadEmergencyPlaces(true)}
              className="rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40 hover:bg-rose-400 transition-colors"
            >
              <RefreshCw className={`mr-1 inline h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> สแกนใหม่
            </button>
          </div>
        </div>
      </header>

      {/* View Mode Switcher: Radar / Map / List */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-1.5">
        <span className="pl-2 text-xs font-bold text-slate-400">โหมดแสดงผล:</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(900);
              setViewMode('radar');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all ${
              viewMode === 'radar'
                ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="h-4 w-4" /> เรดาร์ 360°
          </button>
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(900);
              setViewMode('map');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all ${
              viewMode === 'map'
                ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <MapIcon className="h-4 w-4" /> แผนที่จริง
          </button>
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(900);
              setViewMode('list');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all ${
              viewMode === 'list'
                ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <List className="h-4 w-4" /> รายการ ({visiblePlaces.length})
          </button>
        </div>
      </div>

      {/* Emergency Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['all', `ทั้งหมด (${places.length})`, Building2],
          ['hospital', `โรงพยาบาลทั่วไป (${hospitalCount})`, Hospital],
          ['police', `สถานีตำรวจ (${policeCount})`, ShieldAlert],
          ['fire_station', `สถานีดับเพลิง (${fireCount})`, Flame],
          ['rescue', `สถานีกู้ภัย (${rescueCount})`, HeartHandshake],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setFilter(id);
            }}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              filter === id
                ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'border border-white/10 bg-[#0E1B36] text-slate-300 hover:border-rose-400/30'
            }`}
          >
            <Icon className="mr-1 inline h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="rounded-2xl border border-rose-400/20 bg-black/30 p-8 text-center text-sm text-rose-200">
          <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" />
          กำลังสแกนหาโรงพยาบาลทั่วไป สถานีตำรวจ ดับเพลิง และสถานีกู้ภัยรอบตัวคุณ…
        </div>
      )}

      {/* Radar Mode */}
      {!loading && viewMode === 'radar' && tacticalRadarItems.length > 0 && (
        <RealTacticalRadar
          userLatitude={userLat}
          userLongitude={userLng}
          accuracyMeters={geo.accuracy || 15}
          items={tacticalRadarItems}
          selectedId={selectedPlaceId}
          onSelectItem={handleSelectFromRadarOrMap}
          onActionClick={handleActionFromRadarOrMap}
          actionButtonLabel="เรียกพี่วินไปศูนย์นี้"
          theme="emergency"
          audioEnabled={audioEnabled}
        />
      )}

      {/* Map Mode */}
      {!loading && viewMode === 'map' && tacticalRadarItems.length > 0 && (
        <RealInteractiveMap
          userLatitude={userLat}
          userLongitude={userLng}
          accuracyMeters={geo.accuracy || 15}
          items={tacticalRadarItems}
          selectedId={selectedPlaceId}
          onSelectItem={handleSelectFromRadarOrMap}
          onActionClick={handleActionFromRadarOrMap}
          actionButtonLabel="เรียกพี่วินไปศูนย์นี้"
          theme="emergency"
          audioEnabled={audioEnabled}
          height="450px"
        />
      )}

      {/* List Mode / Grid */}
      {(!loading && (viewMode === 'list' || tacticalRadarItems.length === 0)) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {visiblePlaces.map((place) => {
            const Icon = iconFor(place.type);
            const isSelected = place.id === selectedPlaceId;
            return (
              <article
                key={place.id}
                onClick={() => setSelectedPlaceId(place.id)}
                className={`rounded-2xl border p-4 text-white transition-all ${
                  isSelected
                    ? 'border-rose-400 bg-gradient-to-br from-[#1e0e24] to-[#0a1226] shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                    : 'border-white/10 bg-[#071126] hover:border-white/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-2xl p-3 ${
                      place.type === 'fire_station'
                        ? 'bg-orange-500/20 text-orange-300'
                        : place.type === 'police'
                        ? 'bg-blue-500/20 text-blue-300'
                        : place.type === 'rescue'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        place.type === 'fire_station'
                          ? 'bg-orange-500/20 text-orange-300'
                          : place.type === 'police'
                          ? 'bg-blue-500/20 text-blue-300'
                          : place.type === 'rescue'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {place.categoryLabel || labels[place.type] || 'ศูนย์ฉุกเฉิน'}
                    </span>
                    <h3 className="mt-1 font-black text-sm text-white">{place.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      <MapPin className="mr-1 inline h-3.5 w-3.5 text-amber-300" />
                      {place.address}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {place.distanceKm !== null && (
                    <span className="rounded-lg bg-white/5 px-2.5 py-1 font-mono text-cyan-300">
                      {place.distanceKm} กม. • ~{place.etaMinutes ?? '—'} นาที
                    </span>
                  )}
                  {place.bearingDeg !== undefined && (
                    <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-slate-400">
                      ทิศ {place.bearingDeg}°
                    </span>
                  )}
                  {place.openNow !== null && (
                    <span
                      className={`rounded-lg px-2 py-1 font-bold ${
                        place.openNow ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {place.openNow ? 'พร้อมรับเหตุ 24 ชม.' : 'ปิดชั่วคราว'}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {place.phone ? (
                    <a
                      href={`tel:${place.phone.replace(/\D/g, '')}`}
                      className="rounded-xl bg-rose-500 py-2.5 text-center text-xs font-black text-white hover:bg-rose-400 transition-colors shadow-sm"
                    >
                      <PhoneCall className="mr-1 inline h-4 w-4" />
                      โทร {place.phone}
                    </a>
                  ) : (
                    <span className="rounded-xl bg-white/5 py-2.5 text-center text-xs text-slate-500">
                      ไม่มีเบอร์โทร
                    </span>
                  )}

                  {place.mapsUrl ? (
                    <a
                      href={place.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-cyan-400 py-2.5 text-center text-xs font-black text-slate-950 hover:bg-cyan-300 transition-colors shadow-sm"
                    >
                      <Navigation className="mr-1 inline h-4 w-4" />
                      นำทาง
                    </a>
                  ) : (
                    <span />
                  )}

                  {onRideToDestination && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (audioEnabled) playTactileBlip(1100);
                        onRideToDestination(place.name, place.address, place.distanceKm ?? undefined);
                      }}
                      className="col-span-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-2.5 text-center text-xs font-black text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.2)] hover:from-amber-300 hover:to-amber-400 transition-all"
                    >
                      <Navigation className="mr-1 inline h-4 w-4" />
                      {place.type === 'hospital' ? 'เรียกพี่วินไปโรงพยาบาลนี้' : 'เรียกพี่วินไปที่นี่'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
        <Building2 className="h-4 w-4 shrink-0 text-cyan-400" />
        <span>ข้อมูลสถานที่จริงจาก OpenStreetMap + WIN Public Data • ไม่สร้างหน่วยหรือตำแหน่งจำลอง • หากเกิดเหตุฉุกเฉินวิกฤติต่อชีวิต โปรดโทร 1669, 191 หรือ 199 ทันที</span>
      </div>
    </div>
  );
};
