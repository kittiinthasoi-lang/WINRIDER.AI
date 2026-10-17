import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import {
  Activity, AlertCircle, Building, ChevronRight, Clock, Compass, Crosshair,
  Dog, ExternalLink, Heart, List, Loader2, Map as MapIcon, MapPin, Phone, RefreshCw,
  ShieldCheck, Star,
} from 'lucide-react';
import { NearbyPetCareResponse, PetHospitalClinic } from '../data/petHospitalData';
import { useRealGeolocation } from '../hooks/useRealGeolocation';
import { playTactileBlip } from '../utils/audio';
import { RealTacticalRadar, TacticalRadarItem } from './RealTacticalRadar';
import { RealInteractiveMap } from './RealInteractiveMap';

interface PetCareHospitalSectionProps {
  audioEnabled: boolean;
  onSelectHospitalForBooking: (hospital: PetHospitalClinic) => void;
  onBackToMain?: () => void;
}

type FilterType = 'all' | 'hospital' | 'clinic' | 'open_now' | 'emergency_24h';
type ViewMode = 'radar' | 'map' | 'list';

const calculatePetFare = (distanceKm: number) => 15 + Math.round(Math.max(0, distanceKm - 1) * 7.5) + 5;

const PETCARE_SCAN_TTL_MS = 5 * 60 * 1000;
const PETCARE_SCAN_MIN_MOVE_KM = 0.5;
let petCareScanCache: { latitude: number; longitude: number; fetchedAt: number; data: NearbyPetCareResponse } | null = null;

const canReusePetCareScan = (latitude: number, longitude: number) => {
  if (!petCareScanCache) return false;
  const age = Date.now() - petCareScanCache.fetchedAt;
  const movedKm = Math.hypot(
    (latitude - petCareScanCache.latitude) * 111,
    (longitude - petCareScanCache.longitude) * 111 * Math.cos((latitude * Math.PI) / 180),
  );
  return age < PETCARE_SCAN_TTL_MS && movedKm < PETCARE_SCAN_MIN_MOVE_KM;
};

export const PetCareHospitalSection: React.FC<PetCareHospitalSectionProps> = ({
  audioEnabled, onSelectHospitalForBooking, onBackToMain,
}) => {
  const geo = useRealGeolocation(true);
  const [viewMode, setViewMode] = useState<ViewMode>('radar');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [places, setPlaces] = useState<PetHospitalClinic[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [source, setSource] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [showEmergencyTips, setShowEmergencyTips] = useState(false);

  const loadNearbyPlaces = useCallback(async (force = false) => {
    if (!geo.isRealGps) return;
    if (!force && geo.latitude !== null && geo.longitude !== null && canReusePetCareScan(geo.latitude, geo.longitude)) {
      const cachedPlaces = petCareScanCache?.data.places || [];
      setPlaces(cachedPlaces);
      if (cachedPlaces.length > 0 && !selectedHospitalId) setSelectedHospitalId(cachedPlaces[0].id);
      setSource(petCareScanCache?.data.source || 'WIN Public Data + OpenStreetMap');
      setFetchedAt(petCareScanCache?.data.fetchedAt || new Date().toISOString());
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const user = auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }
      const response = await fetch('/api/pet-care/nearby', {
        method: 'POST',
        headers,
        body: JSON.stringify({ latitude: geo.latitude, longitude: geo.longitude, radiusMeters: 20000 }),
      });
      const data = await response.json() as NearbyPetCareResponse;
      if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลสถานพยาบาลสัตว์จริงไม่สำเร็จ');
      const loaded = Array.isArray(data.places) ? data.places : [];
      setPlaces(loaded);
      if (loaded.length > 0) setSelectedHospitalId(loaded[0].id);
      setSource(data.source || 'WIN Public Data + OpenStreetMap');
      setFetchedAt(data.fetchedAt || new Date().toISOString());
      petCareScanCache = { latitude: geo.latitude as number, longitude: geo.longitude as number, fetchedAt: Date.now(), data };
    } catch (error) {
      setPlaces([]);
      setErrorMessage(error instanceof Error ? error.message : 'โหลดข้อมูลจริงไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [geo.isRealGps, geo.latitude, geo.longitude, selectedHospitalId]);

  useEffect(() => { if (geo.isRealGps) void loadNearbyPlaces(); }, [geo.isRealGps, loadNearbyPlaces]);

  const filteredPlaces = useMemo(() => places.filter((place) => {
    if (filterType === 'hospital') return place.placeType === 'hospital' || place.name.includes('โรงพยาบาล');
    if (filterType === 'clinic') return place.placeType === 'clinic' || place.name.includes('คลินิก');
    if (filterType === 'open_now') return place.openNow === true;
    if (filterType === 'emergency_24h') return place.is24Hours;
    return true;
  }), [filterType, places]);

  const hospitalCount = places.filter((p) => p.placeType === 'hospital' || p.name.includes('โรงพยาบาล')).length;
  const clinicCount = places.filter((p) => p.placeType === 'clinic' || p.name.includes('คลินิก')).length;
  const openCount = places.filter((place) => place.openNow === true).length;
  const allDayCount = places.filter((place) => place.is24Hours).length;

  // Convert to TacticalRadarItem for Radar and Map components
  const tacticalRadarItems = useMemo<TacticalRadarItem[]>(() => {
    return filteredPlaces.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.placeType || 'veterinary',
      categoryLabel: p.categoryLabel || (p.name.includes('โรงพยาบาล') ? 'โรงพยาบาลสัตว์' : 'คลินิกรักษาสัตว์'),
      latitude: p.latitude,
      longitude: p.longitude,
      distanceKm: p.distanceKm ?? 0,
      bearingDeg: p.bearingDeg,
      phone: p.phoneNumber,
      address: p.address,
      openNow: p.openNow,
      is24Hours: p.is24Hours,
      mapsUrl: p.googleMapsUri,
      etaMinutes: p.etaMinutes ?? Math.max(3, Math.round((p.distanceKm || 1) * 2.8 + 2)),
      typeIcon: (p.placeType === 'hospital' || p.name.includes('โรงพยาบาล')) ? 'hospital' : 'clinic',
    }));
  }, [filteredPlaces]);

  const handleSelectFromRadarOrMap = (item: TacticalRadarItem) => {
    setSelectedHospitalId(item.id);
  };

  const handleActionFromRadarOrMap = (item: TacticalRadarItem) => {
    const found = places.find((p) => p.id === item.id);
    if (found) {
      if (audioEnabled) playTactileBlip(1100);
      onSelectHospitalForBooking(found);
    }
  };

  const userLat = geo.latitude ?? 13.7563;
  const userLng = geo.longitude ?? 100.5018;

  return (
    <div className="space-y-4">
      {onBackToMain && (
        <button type="button" onClick={onBackToMain} className="rounded-xl border border-amber-500/40 bg-black/40 px-3 py-2 text-xs font-bold text-amber-300">
          ← กลับหน้าหลัก
        </button>
      )}

      {/* Main Banner */}
      <section className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-[#1C160C] via-[#120E08] to-[#0A0D18] p-4 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl">🐾</div>
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-300">WIN-Pet Care • รัศมีรอบตำแหน่งปัจจุบัน</p>
              <h3 className="text-base font-black text-white">โรงพยาบาลสัตว์และคลินิกรักษาสัตว์รอบตัว</h3>
              <p className="mt-1 text-xs text-slate-300">ใช้ตำแหน่ง GPS ปัจจุบันเป็นศูนย์กลาง • สถานที่จริง 100% จาก OpenStreetMap • มีเรดาร์ 360° และแผนที่นำทางจริง</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowEmergencyTips((value) => !value)} className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
            <AlertCircle className="mr-1 inline h-4 w-4" /> คู่มือปฐมพยาบาลสัตว์
          </button>
        </div>

        {/* GPS Coordinates Bar */}
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Crosshair className={`h-4 w-4 ${geo.isRealGps ? 'text-emerald-400' : 'text-amber-300'}`} />
            {geo.isRealGps ? (
              <span className="text-emerald-300">
                จุดศูนย์กลาง GPS จริง: ละติจูด {geo.latitude?.toFixed(4)}, ลองจิจูด {geo.longitude?.toFixed(4)} • แม่นยำ ±{Math.round(geo.accuracy || 0)} ม.
              </span>
            ) : (
              <span className="text-amber-200">เปิด GPS บนอุปกรณ์เพื่อค้นหาโรงพยาบาลและคลินิกสัตว์รอบตัวคุณ</span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={geo.refreshLocation} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition-colors">
              <Crosshair className="mr-1 inline h-4 w-4" /> ขอพิกัดใหม่
            </button>
            <button type="button" disabled={!geo.isRealGps || loading} onClick={() => void loadNearbyPlaces(true)} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40 hover:bg-amber-300 transition-colors">
              <RefreshCw className={`mr-1 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> โหลดสถานที่ใหม่
            </button>
          </div>
        </div>
        {geo.error && <p className="mt-2 text-xs text-rose-300">{geo.error}</p>}
      </section>

      {showEmergencyTips && (
        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-slate-200 sm:grid-cols-2">
          <p><strong className="text-rose-300">ฮีทสโตรก:</strong> หอบรุนแรง ลิ้นม่วง อุณหภูมิสูง ให้รีบเช็ดตัวด้วยน้ำธรรมดา</p>
          <p><strong className="text-rose-300">อุบัติเหตุ:</strong> เลือดออกมาก ซึม หรือไม่ตอบสนอง ให้ระวังกระดูกหัก</p>
          <p><strong className="text-rose-300">สิ่งแปลกปลอม:</strong> อาเจียนไม่หยุดหรือหายใจติดขัด ห้ามให้อาหารหรือน้ำ</p>
          <p><strong className="text-rose-300">ชัก/หมดสติ:</strong> จัดท่านอนตะแคง แล้วโทรสถานพยาบาลก่อนออกเดินทาง</p>
        </div>
      )}

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
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
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
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
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
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <List className="h-4 w-4" /> รายการ ({filteredPlaces.length})
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['all', `ทั้งหมด (${places.length})`, Building],
          ['hospital', `โรงพยาบาลสัตว์ (${hospitalCount})`, Building],
          ['clinic', `คลินิกสัตว์ (${clinicCount})`, Activity],
          ['open_now', `เปิดตอนนี้ (${openCount})`, Clock],
          ['emergency_24h', `24 ชั่วโมง (${allDayCount})`, Heart],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setFilterType(id);
            }}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              filterType === id
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'border border-white/10 bg-[#0E1B36] text-slate-300 hover:border-amber-400/30'
            }`}
          >
            <Icon className="mr-1 inline h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="rounded-2xl border border-amber-400/20 bg-black/30 p-8 text-center text-sm text-amber-200">
          <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" />
          กำลังค้นหาโรงพยาบาลและคลินิกสัตว์จริงจาก OpenStreetMap รอบตำแหน่งปัจจุบัน…
        </div>
      )}

      {!loading && errorMessage && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <AlertCircle className="mr-2 inline h-5 w-5" />
          {errorMessage}
          <p className="mt-1 text-xs text-slate-400">ระบบจะไม่แสดงรายชื่อหรือระยะทางจำลองแทนข้อมูลจริง</p>
        </div>
      )}

      {!loading && geo.isRealGps && !errorMessage && places.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
          ไม่พบสถานพยาบาลสัตว์ในรัศมีรอบตำแหน่งปัจจุบันของคุณ
        </div>
      )}

      {/* Radar Mode */}
      {!loading && viewMode === 'radar' && tacticalRadarItems.length > 0 && (
        <RealTacticalRadar
          userLatitude={userLat}
          userLongitude={userLng}
          accuracyMeters={geo.accuracy || 15}
          items={tacticalRadarItems}
          selectedId={selectedHospitalId}
          onSelectItem={handleSelectFromRadarOrMap}
          onActionClick={handleActionFromRadarOrMap}
          actionButtonLabel="เรียกพี่วินพาไปหาหมอ"
          theme="pet"
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
          selectedId={selectedHospitalId}
          onSelectItem={handleSelectFromRadarOrMap}
          onActionClick={handleActionFromRadarOrMap}
          actionButtonLabel="เรียกพี่วินพาไปหาหมอ"
          theme="pet"
          audioEnabled={audioEnabled}
          height="450px"
        />
      )}

      {/* List Mode / Grid of Places */}
      {(!loading && (viewMode === 'list' || tacticalRadarItems.length === 0)) && (
        <div className="space-y-3">
          {filteredPlaces.map((hospital) => {
            const isSelected = hospital.id === selectedHospitalId;
            const routeReady = hospital.distanceKm !== null;
            const fare = routeReady ? calculatePetFare(hospital.distanceKm as number) : null;
            return (
              <article
                key={hospital.id}
                onClick={() => setSelectedHospitalId(hospital.id)}
                className={`space-y-3 rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-gradient-to-br from-[#1b263b] to-[#0a1224] shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'border-amber-400/30 bg-gradient-to-br from-[#0F1B33] to-[#070D1E] hover:border-amber-400/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl">
                      {hospital.placeType === 'hospital' ? '🏥' : '🐾'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className={`rounded-full px-2 py-0.5 ${hospital.placeType === 'hospital' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                          {hospital.categoryLabel || (hospital.name.includes('โรงพยาบาล') ? 'โรงพยาบาลสัตว์' : 'คลินิกรักษาสัตว์')}
                        </span>
                        {hospital.is24Hours && <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-300">24 ชั่วโมง</span>}
                        {hospital.openNow !== null && (
                          <span className={`rounded-full px-2 py-0.5 ${hospital.openNow ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
                            {hospital.openNow ? 'เปิดอยู่' : 'ปิดอยู่'}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-white">{hospital.name}</h4>
                      <p className="mt-1 text-[11px] text-slate-400">
                        <MapPin className="mr-1 inline h-3 w-3 text-amber-300" />
                        {hospital.address || 'ดูที่อยู่บนแผนที่ภายนอก'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    {hospital.rating !== null && (
                      <p className="font-bold text-amber-300">
                        <Star className="mr-1 inline h-3.5 w-3.5 fill-amber-300" />{hospital.rating} <span className="text-[10px] text-slate-400">({hospital.reviewsCount})</span>
                      </p>
                    )}
                    <p className="mt-1 text-cyan-300 font-bold">
                      {hospital.distanceKm !== null ? `${hospital.distanceKm} กม. • ~${hospital.etaMinutes || 5} นาที` : 'คำนวณระยะทาง…'}
                    </p>
                    {hospital.bearingDeg !== undefined && (
                      <p className="text-[10px] text-slate-400 font-mono">ทิศ {hospital.bearingDeg}°</p>
                    )}
                  </div>
                </div>

                {hospital.openHours.length > 0 && (
                  <p className="rounded-xl bg-black/30 p-2 text-[11px] text-slate-300">
                    <Clock className="mr-1 inline h-3.5 w-3.5 text-amber-300" />{hospital.openHours[0]}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <div className="flex gap-2">
                    {hospital.phoneNumber ? (
                      <a href={`tel:${hospital.phoneNumber.replace(/\D/g, '')}`} className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 transition-colors">
                        <Phone className="mr-1 inline h-4 w-4 text-emerald-300" />โทร
                      </a>
                    ) : null}
                    {hospital.googleMapsUri && (
                      <a href={hospital.googleMapsUri} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/20 transition-colors">
                        <ExternalLink className="mr-1 inline h-4 w-4 text-cyan-300" />แผนที่
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!routeReady}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (audioEnabled) playTactileBlip(1000);
                      onSelectHospitalForBooking(hospital);
                    }}
                    className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-3.5 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm hover:from-amber-300 hover:to-amber-500 transition-all"
                  >
                    <Dog className="mr-1 inline h-4 w-4" />{fare !== null ? `เรียกพี่วิน • ประมาณ ฿${fare}` : 'เรียกพี่วินพาไปหาหมอ'} <ChevronRight className="inline h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-200">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span>ข้อมูลสถานที่จริงจาก OpenStreetMap + WIN Public Data • ฟรี 100% ไม่มีค่าธรรมเนียม API • อัปเดต {fetchedAt ? new Date(fetchedAt).toLocaleTimeString('th-TH') : 'ล่าสุด'}</span>
      </div>
    </div>
  );
};
