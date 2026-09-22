import React from 'react';
import { ExternalLink, MapPin, Navigation, Radio } from 'lucide-react';
import { playTactileBlip } from '../utils/audio';
import { useRealtimeGps } from './GpsRealTimeTracker';

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

/**
 * Free-first radar reference.
 * The radar no longer creates or displays synthetic people, drivers, merchants,
 * or customers. Verified live entities can be supplied by the dispatch layer;
 * navigation is opened in an external maps application.
 */
export const GoogleMapsRadarView: React.FC<GoogleMapsRadarViewProps> = ({
  venueName,
  venueCategory,
  radiusKm = 5,
  height = '420px',
  audioEnabled = true,
  onBackToHome,
}) => {
  const { gpsState } = useRealtimeGps(true);
  const hasGps = Number.isFinite(gpsState.latitude) && Number.isFinite(gpsState.longitude) && Boolean(gpsState.latitude && gpsState.longitude);
  const url = hasGps
    ? `https://www.google.com/maps/search/?api=1&query=${gpsState.latitude},${gpsState.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName || 'ประเทศไทย')}`;

  const openMaps = () => {
    if (audioEnabled) playTactileBlip(900);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#07111f] text-white" style={{height}}>
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-4">
        <div><div className="flex items-center gap-2 text-[10px] font-black text-cyan-300"><Radio className="h-4 w-4" /> RADAR อ้างอิงตำแหน่ง</div><div className="mt-1 text-sm font-black">{venueName || 'ตำแหน่งปัจจุบัน'}</div>{venueCategory && <div className="text-[10px] text-slate-500">{venueCategory} • รัศมี {radiusKm} กม.</div>}</div>
        {onBackToHome && <button onClick={onBackToHome} className="rounded-xl border border-white/10 px-3 py-2 text-[10px]">กลับ</button>}
      </div>
      <div className="flex h-[calc(100%-73px)] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,.14),transparent_55%)] p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/30 p-6 text-center backdrop-blur">
          <MapPin className="mx-auto h-12 w-12 text-cyan-300" />
          <p className="mt-3 text-lg font-black">ตำแหน่งอ้างอิง</p>
          <p className="mt-1 text-[10px] text-slate-400">แสดงเฉพาะตำแหน่งจริงที่ได้รับจาก GPS/ระบบ dispatch ที่ผ่านการยืนยัน</p>
          {hasGps && <p className="mt-3 font-mono text-[10px] text-slate-500">{gpsState.latitude!.toFixed(6)}, {gpsState.longitude!.toFixed(6)}</p>}
          <p className="mt-4 text-[10px] text-slate-500">ไม่มีรายชื่อพี่วิน ลูกค้า ร้านค้า หรือพาร์ทเนอร์จำลอง และไม่มี Google Maps JavaScript API ฝังในหน้านี้</p>
          <button onClick={openMaps} className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950"><ExternalLink className="mr-2 inline h-4 w-4" />เปิดตำแหน่งใน Google Maps</button>
          <button onClick={openMaps} className="mt-2 w-full rounded-2xl border border-white/10 px-4 py-3 text-xs font-black"><Navigation className="mr-2 inline h-4 w-4" />นำทางภายนอก</button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsRadarView;
