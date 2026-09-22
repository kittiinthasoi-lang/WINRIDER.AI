import React from 'react';
import { ExternalLink, MapPin, Navigation, Phone, ShieldCheck, X } from 'lucide-react';
import { DreamRideVehicle } from '../types';
import { playTactileBlip } from '../utils/audio';

interface ThreeDimensionalRideMapProps {
  selectedDreamRide?: DreamRideVehicle;
  pickupLocation?: string;
  destinationLocation?: string;
  driverName?: string;
  driverPhone?: string;
  driverLevel?: number;
  driverEmoji?: string;
  etaMinutes?: number;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  onEmergencyClick?: () => void;
  audioEnabled?: boolean;
}

/**
 * Lightweight ride reference view.
 * The previous embedded Google Maps implementation has been removed from this
 * component. Coordinates remain real data; road navigation is delegated to
 * Google Maps outside WINRIDER.AI.
 */
export const ThreeDimensionalRideMap: React.FC<ThreeDimensionalRideMapProps> = ({
  pickupLocation = '',
  destinationLocation = '',
  driverName = '',
  driverPhone = '',
  etaMinutes,
  pickupCoords,
  dropoffCoords,
  onEmergencyClick,
  audioEnabled = true,
}) => {
  const destination = dropoffCoords || pickupCoords;
  const hasDestination = Boolean(destination && destination.lat !== 0 && destination.lng !== 0);
  const mapsUrl = hasDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=two-wheeler`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationLocation || 'ประเทศไทย')}`;
  const openMaps = () => {
    if (audioEnabled) playTactileBlip(900);
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative flex min-h-[420px] w-full flex-col overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#07111f] text-white">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-4">
        <div><div className="text-[10px] font-black text-cyan-300">RIDE MAP REFERENCE</div><div className="text-sm font-black">{destinationLocation || 'ยังไม่ได้ระบุปลายทาง'}</div></div>
        {onEmergencyClick && <button onClick={onEmergencyClick} className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-2 text-rose-300"><X className="h-4 w-4" /></button>}
      </div>
      <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,.15),transparent_55%)] p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/30 p-6 text-center backdrop-blur">
          <Navigation className="mx-auto h-12 w-12 text-cyan-300" />
          <p className="mt-3 text-lg font-black">แผนที่อ้างอิงการเดินทาง</p>
          <p className="mt-1 text-[10px] text-slate-400">แอปจะแสดงข้อมูลสถานที่และพิกัดจริง ส่วนการนำทางถนนเปิดภายนอก</p>
          {pickupLocation && <p className="mt-3 text-xs text-slate-300">รับ: {pickupLocation}</p>}
          {destinationLocation && <p className="mt-1 text-xs text-slate-300">ส่ง: {destinationLocation}</p>}
          {hasDestination && <p className="mt-2 font-mono text-[10px] text-slate-500">{destination!.lat.toFixed(6)}, {destination!.lng.toFixed(6)}</p>}
          {driverName && <p className="mt-3 text-xs text-emerald-300">พี่วิน: {driverName}</p>}
          {etaMinutes !== undefined && <p className="mt-1 text-[10px] text-slate-500">ETA: ใช้เฉพาะค่าที่มาจากข้อมูลจริงของงาน</p>}
          <button onClick={openMaps} className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950"><ExternalLink className="mr-2 inline h-4 w-4" />เปิด Google Maps ภายนอก</button>
          {driverPhone && <a href={`tel:${driverPhone.replace(/\D/g, '')}`} className="mt-2 block rounded-2xl border border-white/10 px-4 py-3 text-xs font-black"><Phone className="mr-2 inline h-4 w-4" />โทรพี่วิน</a>}
          {onEmergencyClick && <button onClick={onEmergencyClick} className="mt-2 w-full rounded-2xl border border-rose-400/20 px-4 py-3 text-xs font-black text-rose-300"><ShieldCheck className="mr-2 inline h-4 w-4" />ฉุกเฉิน</button>}
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-500"><MapPin className="h-3.5 w-3.5" /> ไม่มี Google Maps JavaScript API ฝังในแอป</div>
        </div>
      </div>
    </div>
  );
};

export default ThreeDimensionalRideMap;
