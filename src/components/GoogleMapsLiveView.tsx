import React from 'react';
import { ExternalLink, MapPin, Navigation, X } from 'lucide-react';
import { GpsLocationState } from './GpsRealTimeTracker';
import { playTactileBlip } from '../utils/audio';

/** @deprecated Kept only for component API compatibility; no provider is embedded. */
export type MapProvider = 'google_maps' | 'mapbox';

interface GoogleMapsLiveViewProps {
  gpsLocation: GpsLocationState;
  targetDestination?: string;
  driverLocation?: { lat: number; lng: number; name: string };
  zoom?: number;
  height?: string;
  showControls?: boolean;
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  initialProvider?: MapProvider;
  audioEnabled?: boolean;
  onSwitchToCameraAR?: () => void;
  onSwitchTo3DMap?: () => void;
  onClose?: () => void;
}

/**
 * In-app location reference. No Google Maps/Mapbox JavaScript, iframe, tiles,
 * or API key is embedded. Real coordinates are displayed and Google Maps is
 * opened externally for the actual street map/navigation.
 */
export const GoogleMapsLiveView: React.FC<GoogleMapsLiveViewProps> = ({
  gpsLocation,
  targetDestination,
  driverLocation,
  height = '420px',
  audioEnabled = true,
  onSwitchToCameraAR,
  onSwitchTo3DMap,
  onClose,
}) => {
  const lat = Number.isFinite(gpsLocation.latitude) ? gpsLocation.latitude : 0;
  const lng = Number.isFinite(gpsLocation.longitude) ? gpsLocation.longitude : 0;
  const hasPosition = lat !== 0 && lng !== 0;
  const destination = targetDestination || (hasPosition ? `${lat},${lng}` : 'ประเทศไทย');
  const googleUrl = hasPosition
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
  const directionsUrl = hasPosition && driverLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${driverLocation.lat},${driverLocation.lng}&travelmode=two-wheeler`
    : googleUrl;

  const open = (url: string) => {
    if (audioEnabled) playTactileBlip(900);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#07111f] text-white" style={{ height }}>
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#07111f]/90 p-3 backdrop-blur">
        <div><div className="flex items-center gap-1.5 text-[10px] font-black text-cyan-300"><Navigation className="h-3.5 w-3.5" /> LOCATION REFERENCE</div><div className="text-xs font-bold">{targetDestination || 'ตำแหน่ง GPS ปัจจุบัน'}</div></div>
        {onClose && <button onClick={onClose} className="rounded-xl border border-white/10 p-2"><X className="h-4 w-4" /></button>}
      </div>
      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,.14),transparent_55%)] p-5 pt-16">
        <div className="relative w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#081526]/90 p-5 shadow-2xl backdrop-blur">
          <div className="relative h-48 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1830]">
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            <div className="absolute left-1/2 top-1/2 h-28 w-1 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-cyan-400/30" />
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-cyan-200 bg-cyan-400/20 p-2 shadow-[0_0_22px_rgba(34,211,238,.45)]"><MapPin className="h-5 w-5 text-cyan-200" /></div>
            {driverLocation && <div className="absolute right-7 top-7 flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-[9px] font-bold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" />พี่วิน</div>}
            <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-black/45 px-2 py-1 text-[8px] text-slate-400">GPS / Google Maps external reference</div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] text-slate-500">GPS ปัจจุบัน</div><div className="mt-1 font-mono text-[10px] text-cyan-300">{hasPosition ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'กำลังรอพิกัดจริง'}</div></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] text-slate-500">ปลายทาง</div><div className="mt-1 truncate text-[10px] font-bold text-white">{targetDestination || 'ยังไม่ได้ระบุ'}</div></div>
          </div>
          <p className="mt-3 text-center text-[9px] text-slate-500">หน้าจอนี้ไม่ฝังแผนที่จากผู้ให้บริการรายอื่น และไม่ใช้ Google Maps API key ใน browser</p>
        </div>
      </div>
      <div className="grid gap-2 border-t border-white/10 bg-black/20 p-4 sm:grid-cols-2">
        <button onClick={() => open(googleUrl)} className="rounded-2xl bg-emerald-500 px-3 py-2.5 text-[11px] font-black text-slate-950"><ExternalLink className="mr-1 inline h-4 w-4" />เปิดสถานที่ใน Google Maps</button>
        <button onClick={() => open(directionsUrl)} className="rounded-2xl border border-white/10 px-3 py-2.5 text-[11px] font-black">นำทางภายนอก</button>
      </div>
      {(onSwitchToCameraAR || onSwitchTo3DMap) && <div className="flex justify-center gap-2 px-4 pb-3">{onSwitchToCameraAR && <button onClick={onSwitchToCameraAR} className="rounded-xl border border-white/10 px-3 py-2 text-[10px]">กล้อง AR</button>}{onSwitchTo3DMap && <button onClick={onSwitchTo3DMap} className="rounded-xl border border-white/10 px-3 py-2 text-[10px]">มุมมอง 3D</button>}</div>}
    </div>
  );
};

export default GoogleMapsLiveView;
