import React, { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { Building2, Flame, Hospital, Loader2, MapPin, Navigation, PhoneCall, ShieldAlert } from 'lucide-react';
import { useRealGeolocation } from '../hooks/useRealGeolocation';

interface Props { audioEnabled: boolean; onOpenWinBuddy?: () => void; }
interface EmergencyPlace { id: string; name: string; type: string; address: string; phone: string; mapsUrl: string; openNow: boolean | null; distanceKm: number | null; etaMinutes: number | null; }

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

const labels: Record<string, string> = { hospital: 'โรงพยาบาล', fire_station: 'สถานีดับเพลิง', police: 'สถานีตำรวจ' };
const iconFor = (type: string) => type === 'fire_station' ? Flame : type === 'police' ? ShieldAlert : Hospital;

export const HospitalCommandCenter: React.FC<Props> = () => {
  const geo = useRealGeolocation(true);
  const [places, setPlaces] = useState<EmergencyPlace[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!geo.isRealGps || geo.latitude === null || geo.longitude === null) return;
    if (canReuseEmergencyScan(geo.latitude, geo.longitude)) {
      setPlaces(emergencyScanCache?.places || []);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true); setError('');
      try {
        const user = getAuth().currentUser;
        if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนเปิดศูนย์ฉุกเฉิน');
        const response = await fetch('/api/emergency/nearby', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ latitude: geo.latitude, longitude: geo.longitude }) });
        const payload = await response.json() as { places?: EmergencyPlace[]; error?: string };
        if (!response.ok) throw new Error(payload.error || 'โหลดศูนย์ฉุกเฉินไม่สำเร็จ');
        if (!cancelled) {
          const nextPlaces = payload.places || [];
          setPlaces(nextPlaces);
          emergencyScanCache = { latitude: geo.latitude as number, longitude: geo.longitude as number, fetchedAt: Date.now(), places: nextPlaces };
        }
      } catch (cause) { if (!cancelled) { setPlaces([]); setError(cause instanceof Error ? cause.message : 'โหลดศูนย์ฉุกเฉินไม่สำเร็จ'); } }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [geo.isRealGps, geo.latitude, geo.longitude]);

  const visible = useMemo(() => places.filter((place) => filter === 'all' || place.type === filter), [places, filter]);
  return <div className="space-y-5">
    <header className="rounded-3xl border border-rose-400/40 bg-gradient-to-br from-[#241025] to-[#071126] p-5 text-white"><p className="text-xs font-bold text-rose-300">LIVE EMERGENCY DIRECTORY</p><h2 className="mt-1 text-xl font-black">ศูนย์ฉุกเฉินจากตำแหน่งจริง</h2><p className="mt-1 text-sm text-slate-300">โรงพยาบาล สถานีดับเพลิง และสถานีตำรวจจาก Google Places พร้อมระยะทางถนนจริง ไม่มีหน่วยหรือภารกิจจำลอง</p><div className="mt-4 grid grid-cols-3 gap-2">{[['1669','แพทย์ฉุกเฉิน'],['199','ดับเพลิง'],['191','ตำรวจ']].map(([number, label]) => <a key={number} href={`tel:${number}`} className="rounded-xl bg-rose-500 px-2 py-3 text-center text-xs font-black text-white"><PhoneCall className="mr-1 inline h-4 w-4" />{label} {number}</a>)}</div></header>
    {!geo.isRealGps && !geo.isLoading && <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">กรุณาอนุญาตตำแหน่ง GPS เพื่อค้นหาศูนย์ฉุกเฉินจริงใกล้คุณ ระบบจะไม่ใช้ตำแหน่งตัวอย่างแทน</div>}
    {geo.error && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{geo.error}</div>}
    {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
    <div className="flex gap-2 overflow-x-auto">{[['all','ทั้งหมด'],['hospital','โรงพยาบาล'],['fire_station','ดับเพลิง'],['police','ตำรวจ']].map(([id,label]) => <button key={id} onClick={() => setFilter(id)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold ${filter === id ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300'}`}>{label}</button>)}</div>
    {(loading || geo.isLoading) && <div className="p-10 text-center text-slate-300"><Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" />กำลังค้นหาจาก GPS และคำนวณเส้นทางจริง…</div>}
    {!loading && geo.isRealGps && visible.length === 0 && !error && <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-300">ไม่พบศูนย์ฉุกเฉินจริงในผลการค้นหา ระบบไม่เติมข้อมูลตัวอย่าง</div>}
    <div className="grid gap-3 sm:grid-cols-2">{visible.map((place) => { const Icon = iconFor(place.type); return <article key={place.id} className="rounded-2xl border border-white/10 bg-[#071126] p-4 text-white"><div className="flex items-start gap-3"><div className="rounded-xl bg-rose-500/15 p-3"><Icon className="h-5 w-5 text-rose-300" /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-cyan-300">{labels[place.type] || 'ศูนย์ฉุกเฉิน'}</p><h3 className="font-black">{place.name}</h3><p className="mt-1 text-xs text-slate-400"><MapPin className="mr-1 inline h-3.5 w-3.5" />{place.address}</p></div></div><div className="mt-3 flex flex-wrap gap-2 text-xs">{place.distanceKm !== null && <span className="rounded-lg bg-white/5 px-2 py-1">{place.distanceKm} กม. • {place.etaMinutes ?? '—'} นาที</span>}{place.openNow !== null && <span className={`rounded-lg px-2 py-1 ${place.openNow ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>{place.openNow ? 'เปิดอยู่' : 'ปิดอยู่'}</span>}</div><div className="mt-4 grid grid-cols-2 gap-2">{place.phone ? <a href={`tel:${place.phone.replace(/\D/g, '')}`} className="rounded-xl bg-rose-500 py-2 text-center text-xs font-black"><PhoneCall className="mr-1 inline h-4 w-4" />โทร</a> : <span className="rounded-xl bg-white/5 py-2 text-center text-xs text-slate-500">ไม่มีเบอร์ในข้อมูล</span>}{place.mapsUrl ? <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-cyan-400 py-2 text-center text-xs font-black text-slate-950"><Navigation className="mr-1 inline h-4 w-4" />นำทาง</a> : <span />}</div></article>; })}</div>
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400"><Building2 className="mr-1 inline h-4 w-4" />หน้านี้เป็นสมุดรายชื่อสถานที่จริง ไม่สร้างงานฉุกเฉินหรืออ้างว่ามีหน่วยกำลังเดินทาง หากเป็นเหตุฉุกเฉินให้โทรหมายเลขราชการด้านบนทันที</div>
  </div>;
};
