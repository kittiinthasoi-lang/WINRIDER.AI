import React from 'react';
import { ExternalLink, MapPin, Navigation, Radio, ShieldAlert, Siren, Stethoscope, PawPrint, Flame, HeartPulse } from 'lucide-react';
import { playTactileBlip } from '../utils/audio';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { buildGoogleMapsCoordinateUrl, buildGoogleMapsSearchUrl, openGoogleMapsExternal } from '../services/googleMapsExternal';

export type RadarPerspective = 'customer' | 'driver' | 'merchant' | 'partner';

export interface MapRadarEntity {
  id: string;
  type: 'rider' | 'customer' | 'merchant' | 'transit_hub';
  name: string;
  avatar: string;
  lat: number;
  lng: number;
  rating?: number;
  vehicleModel?: string;
  licensePlate?: string;
  level?: number;
  fareOrDeal?: string;
  status: string;
  distanceMeters: number;
  etaMin: number;
  specialBadge?: string;
  categoryLabel?: string;
  placeGroup?: string;
  phone?: string;
  pickupNote?: string;
}

interface GoogleMapsRadarViewProps {
  targetPerspective?: RadarPerspective;
  venueName?: string;
  venueIcon?: string;
  venueCategory?: string;
  radiusKm?: number;
  height?: string;
  audioEnabled?: boolean;
  onSelectEntity?: (entity: MapRadarEntity) => void;
  onBookRideWithRider?: (rider: MapRadarEntity) => void;
  onAcceptJobFromCustomer?: (customer: MapRadarEntity) => void;
  onNavigateToEntity?: (entity: MapRadarEntity) => void;
  onSelectDestinationForRide?: (entity: MapRadarEntity) => void | Promise<void>;
  onBackToHome?: () => void;
}

type Scan = { label: string; query: string; icon: React.ReactNode; note: string };

/**
 * Free-first radar reference. No map provider is embedded.
 * Radar categories are real-world search targets; selecting one opens the
 * corresponding Google Maps search externally so Google can show current local results.
 */
export const GoogleMapsRadarView: React.FC<GoogleMapsRadarViewProps> = ({
  venueName,
  venueCategory,
  radiusKm = 5,
  height = '560px',
  audioEnabled = true,
  onBackToHome,
}) => {
  const { gpsState } = useRealtimeGps(true);
  const hasGps = Number.isFinite(gpsState.latitude) && Number.isFinite(gpsState.longitude) && Boolean(gpsState.latitude && gpsState.longitude);
  const origin = hasGps ? { latitude: gpsState.latitude as number, longitude: gpsState.longitude as number } : null;
  const makeUrl = (query: string) => buildGoogleMapsSearchUrl(query, origin);
  const open = (url: string) => { if (audioEnabled) playTactileBlip(900); openGoogleMapsExternal(url); };

  const scans: Scan[] = [
    { label: 'โรงพยาบาล / คลินิกคน', query: 'โรงพยาบาล คลินิก', icon: <Stethoscope className="h-4 w-4" />, note: 'ค้นหาสถานพยาบาลใกล้ตำแหน่งจริง' },
    { label: 'WIN PETCARE / สัตว์เลี้ยง', query: 'โรงพยาบาลสัตว์ คลินิกสัตว์', icon: <PawPrint className="h-4 w-4" />, note: 'ค้นหาสถานพยาบาลสัตว์ใกล้ตำแหน่งจริง' },
    { label: 'ดับเพลิง / กู้ภัย', query: 'สถานีดับเพลิง กู้ภัย', icon: <Flame className="h-4 w-4" />, note: 'ค้นหาหน่วยฉุกเฉินใกล้ตำแหน่งจริง' },
    { label: 'สถานีตำรวจ', query: 'สถานีตำรวจ', icon: <ShieldAlert className="h-4 w-4" />, note: 'ค้นหาสถานีตำรวจใกล้ตำแหน่งจริง' },
    { label: 'ศูนย์พยาบาล / ฉุกเฉิน', query: 'ศูนย์พยาบาล ศูนย์ฉุกเฉิน', icon: <HeartPulse className="h-4 w-4" />, note: 'ค้นหาศูนย์พยาบาลและฉุกเฉินใกล้ตำแหน่งจริง' },
    { label: 'ศูนย์กู้ชีพ', query: 'ศูนย์กู้ชีพ รถพยาบาล', icon: <Siren className="h-4 w-4" />, note: 'ค้นหาบริการกู้ชีพใกล้ตำแหน่งจริง' },
  ];

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#07111f] text-white" style={{ height }}>
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-4">
        <div><div className="flex items-center gap-2 text-[10px] font-black text-cyan-300"><Radio className="h-4 w-4" /> RADAR / สแกนสถานที่จริง</div><div className="mt-1 text-sm font-black">{venueName || 'ตำแหน่งปัจจุบัน'}</div>{venueCategory && <div className="text-[10px] text-slate-500">{venueCategory} • รัศมีอ้างอิง {radiusKm} กม.</div>}</div>
        {onBackToHome && <button onClick={onBackToHome} className="rounded-xl border border-white/10 px-3 py-2 text-[10px]">กลับ</button>}
      </div>
      <div className="h-[calc(100%-73px)] overflow-y-auto p-4">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3 text-[10px] text-slate-300">
          <MapPin className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
          {hasGps ? <>GPS จริงพร้อมใช้งาน • {gpsState.latitude!.toFixed(6)}, {gpsState.longitude!.toFixed(6)}</> : <>กำลังรอ GPS จริง — เมื่ออนุญาตตำแหน่งแล้วจะแนบพิกัดให้การค้นหา</>}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {scans.map((scan) => (
            <button key={scan.label} type="button" onClick={() => open(makeUrl(scan.query))} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/5">
              <div className="flex items-center gap-2 text-xs font-black text-white">{scan.icon}<span>{scan.label}</span></div>
              <p className="mt-1 text-[9px] leading-4 text-slate-500">{scan.note}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-cyan-300"><ExternalLink className="h-3 w-3" />ดูผลใกล้ตำแหน่งใน Google Maps</span>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-[9px] leading-4 text-slate-500">
          หน้าจอ RADAR นี้ไม่ฝังแผนที่จาก provider อื่นและไม่ใช้ Google Maps JavaScript API ใน browser. รายชื่อ/ตำแหน่งล่าสุดของ Google จะแสดงเมื่อเปิดผลการค้นหาภายนอกตามคำค้นที่เลือก.
        </div>
        <button type="button" onClick={() => open(hasGps ? buildGoogleMapsCoordinateUrl(origin as { latitude: number; longitude: number }) : makeUrl('สถานที่สำคัญ'))} className="mt-3 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950"><Navigation className="mr-2 inline h-4 w-4" />เปิดตำแหน่งใน Google Maps</button>
      </div>
    </div>
  );
};

export default GoogleMapsRadarView;
