import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import {
  Activity, AlertCircle, Building, ChevronRight, Clock, Crosshair,
  Dog, ExternalLink, Heart, Loader2, MapPin, Phone, RefreshCw,
  ShieldCheck, Star,
} from 'lucide-react';
import { NearbyPetCareResponse, PetHospitalClinic } from '../data/petHospitalData';
import { useRealGeolocation } from '../hooks/useRealGeolocation';
import { playTactileBlip } from '../utils/audio';

interface PetCareHospitalSectionProps {
  audioEnabled: boolean;
  onSelectHospitalForBooking: (hospital: PetHospitalClinic) => void;
  onBackToMain?: () => void;
}

type FilterType = 'all' | 'open_now' | 'emergency_24h';

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
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [places, setPlaces] = useState<PetHospitalClinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [source, setSource] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [showEmergencyTips, setShowEmergencyTips] = useState(false);

  const loadNearbyPlaces = useCallback(async (force = false) => {
    if (!geo.isRealGps) return;
    if (!force && geo.latitude !== null && geo.longitude !== null && canReusePetCareScan(geo.latitude, geo.longitude)) {
      setPlaces(petCareScanCache?.data.places || []);
      setSource(petCareScanCache?.data.source || 'WIN Public Data + OpenStreetMap');
      setFetchedAt(petCareScanCache?.data.fetchedAt || new Date().toISOString());
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนค้นหาสถานพยาบาลสัตว์ใกล้คุณ');
      const response = await fetch('/api/pet-care/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ latitude: geo.latitude, longitude: geo.longitude, radiusMeters: 15000 }),
      });
      const data = await response.json() as NearbyPetCareResponse;
      if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลสถานพยาบาลสัตว์จริงไม่สำเร็จ');
      setPlaces(Array.isArray(data.places) ? data.places : []);
      setSource(data.source || 'WIN Public Data + OpenStreetMap');
      setFetchedAt(data.fetchedAt || new Date().toISOString());
      petCareScanCache = { latitude: geo.latitude as number, longitude: geo.longitude as number, fetchedAt: Date.now(), data };
    } catch (error) {
      setPlaces([]);
      setErrorMessage(error instanceof Error ? error.message : 'โหลดข้อมูลจริงไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [geo.isRealGps, geo.latitude, geo.longitude]);

  useEffect(() => { if (geo.isRealGps) void loadNearbyPlaces(); }, [geo.isRealGps, loadNearbyPlaces]);

  const filteredPlaces = useMemo(() => places.filter((place) => {
    if (filterType === 'open_now') return place.openNow === true;
    if (filterType === 'emergency_24h') return place.is24Hours;
    return true;
  }), [filterType, places]);

  const openCount = places.filter((place) => place.openNow === true).length;
  const allDayCount = places.filter((place) => place.is24Hours).length;

  return (
    <div className="space-y-3.5">
      {onBackToMain && (
        <button type="button" onClick={onBackToMain} className="rounded-xl border border-amber-500/40 bg-black/40 px-3 py-2 text-xs font-bold text-amber-300">
          ← กลับหน้าหลัก
        </button>
      )}

      <section className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-[#1C160C] via-[#120E08] to-[#0A0D18] p-4 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl">🐾</div>
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-300">WIN-Pet Care • Live Nearby Search</p>
              <h3 className="text-base font-black text-white">โรงพยาบาลและคลินิกรักษาสัตว์ใกล้ตำแหน่งปัจจุบัน</h3>
              <p className="mt-1 text-xs text-slate-300">รายชื่อจาก Public Data + OpenStreetMap • ระยะเส้นตรงโดยประมาณ (Google Routes ปิดชั่วคราว)</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowEmergencyTips((value) => !value)} className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
            <AlertCircle className="mr-1 inline h-4 w-4" /> คู่มือฉุกเฉิน
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Crosshair className={`h-4 w-4 ${geo.isRealGps ? 'text-emerald-400' : 'text-amber-300'}`} />
            {geo.isRealGps ? (
              <span className="text-emerald-300">GPS จริงพร้อมใช้งาน • ความแม่นยำ ±{Math.round(geo.accuracy || 0)} เมตร</span>
            ) : (
              <span className="text-amber-200">ต้องอนุญาตตำแหน่งปัจจุบันก่อนค้นหา — ไม่มีการใช้พิกัดจำลองแทน</span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={geo.refreshLocation} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white">
              <Crosshair className="mr-1 inline h-4 w-4" /> ขอพิกัดใหม่
            </button>
            <button type="button" disabled={!geo.isRealGps || loading} onClick={() => void loadNearbyPlaces(true)} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40">
              <RefreshCw className={`mr-1 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> โหลดข้อมูลใหม่
            </button>
          </div>
        </div>
        {geo.error && <p className="mt-2 text-xs text-rose-300">{geo.error}</p>}
      </section>

      {showEmergencyTips && (
        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-slate-200 sm:grid-cols-2">
          <p><strong className="text-rose-300">ฮีทสโตรก:</strong> หอบรุนแรง ลิ้นม่วง อุณหภูมิสูง</p>
          <p><strong className="text-rose-300">อุบัติเหตุ:</strong> เลือดออกมาก ซึม หรือไม่ตอบสนอง</p>
          <p><strong className="text-rose-300">สิ่งแปลกปลอม:</strong> อาเจียนไม่หยุดหรือหายใจติดขัด</p>
          <p><strong className="text-rose-300">ชัก/หมดสติ:</strong> ควรโทรสถานพยาบาลก่อนออกเดินทาง</p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['all', `ทั้งหมด (${places.length})`, Building],
          ['open_now', `เปิดตอนนี้ (${openCount})`, Activity],
          ['emergency_24h', `24 ชั่วโมง (${allDayCount})`, Heart],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setFilterType(id)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${filterType === id ? 'bg-amber-400 text-slate-950' : 'border border-white/10 bg-[#0E1B36] text-slate-300'}`}>
            <Icon className="mr-1 inline h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {loading && <div className="rounded-2xl border border-amber-400/20 bg-black/30 p-8 text-center text-sm text-amber-200"><Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" />กำลังค้นหาสถานพยาบาลจาก Public Data + OpenStreetMap…</div>}
      {!loading && errorMessage && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"><AlertCircle className="mr-2 inline h-5 w-5" />{errorMessage}<p className="mt-1 text-xs text-slate-400">ระบบจะไม่แสดงรายชื่อหรือระยะทางจำลองแทนข้อมูลจริง</p></div>}
      {!loading && geo.isRealGps && !errorMessage && places.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">ไม่พบสถานพยาบาลสัตว์ในรัศมี 15 กิโลเมตรจากตำแหน่งปัจจุบัน</div>}

      <div className="space-y-3">
        {filteredPlaces.map((hospital) => {
          const routeReady = hospital.distanceKm !== null && hospital.etaMinutes !== null;
          const fare = routeReady ? calculatePetFare(hospital.distanceKm as number) : null;
          return (
            <article key={hospital.id} className="space-y-3 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#0F1B33] to-[#070D1E] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl">🏥</div>
                  <div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                      {hospital.is24Hours && <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-300">24 ชั่วโมง</span>}
                      {hospital.openNow !== null && <span className={`rounded-full px-2 py-0.5 ${hospital.openNow ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>{hospital.openNow ? 'เปิดอยู่' : 'ปิดอยู่'}</span>}
                    </div>
                    <h4 className="mt-1 text-sm font-bold text-white">{hospital.name}</h4>
                    <p className="mt-1 text-[11px] text-slate-400"><MapPin className="mr-1 inline h-3 w-3 text-amber-300" />{hospital.address || 'ดูที่อยู่บน แผนที่ภายนอก'}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  {hospital.rating !== null && <p className="font-bold text-amber-300"><Star className="mr-1 inline h-3.5 w-3.5 fill-amber-300" />{hospital.rating} <span className="text-[10px] text-slate-400">({hospital.reviewsCount})</span></p>}
                  <p className="mt-1 text-cyan-300">{routeReady ? `${hospital.distanceKm} กม. • ${hospital.etaMinutes} นาที` : 'ยังไม่มีเส้นทางจริง'}</p>
                </div>
              </div>

              {hospital.openHours.length > 0 && <p className="rounded-xl bg-black/30 p-2 text-[11px] text-slate-300"><Clock className="mr-1 inline h-3.5 w-3.5 text-amber-300" />{hospital.openHours[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || hospital.openHours[0]}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                <div className="flex gap-2">
                  {hospital.phoneNumber && <a href={`tel:${hospital.phoneNumber.replace(/\D/g, '')}`} className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white"><Phone className="mr-1 inline h-4 w-4 text-emerald-300" />โทร</a>}
                  {hospital.googleMapsUri && <a href={hospital.googleMapsUri} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white"><ExternalLink className="mr-1 inline h-4 w-4 text-cyan-300" />แผนที่</a>}
                </div>
                <button type="button" disabled={!routeReady} onClick={() => { if (audioEnabled) playTactileBlip(1000); onSelectHospitalForBooking(hospital); }} className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-3.5 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
                  <Dog className="mr-1 inline h-4 w-4" />{fare !== null ? `เรียกพี่วิน • ประมาณ ฿${fare}` : 'รอข้อมูลระยะทาง'} <ChevronRight className="inline h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {source && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-200"><ShieldCheck className="h-4 w-4" />ข้อมูลจริงจาก {source} • อัปเดต {new Date(fetchedAt).toLocaleTimeString('th-TH')}</div>}
    </div>
  );
};
