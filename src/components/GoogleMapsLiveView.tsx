import React from 'react';
import { ExternalLink, MapPin, X } from 'lucide-react';
import { GpsLocationState } from './GpsRealTimeTracker';
import { playTactileBlip } from '../utils/audio';

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
 * Map reference card. No embedded Google/Mapbox JavaScript API is used.
 * Real coordinates are shown for reference; navigation opens externally.
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
    <div className="relative w-full overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#07111f] text-white" style={{height}}>
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#07111f]/90 p-3 backdrop-blur">
        <div><div className="text-[10px] font-black text-cyan-300">MAP REFERENCE</div><div className="text-xs font-bold">{targetDestination || 'ตำแหน่ง GPS ปัจจุบัน'}</div></div>
        {onClose && <button onClick={onClose} className="rounded-xl border border-white/10 p-2"><X className="h-4 w-4" /></button>}
      </div>
      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,.15),transparent_55%)] p-5 pt-16">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/30 p-6 text-center backdrop-blur">
          <MapPin className="mx-auto h-12 w-12 text-cyan-300" />
          <p className="mt-3 text-sm font-black">ภาพอ้างอิงตำแหน่ง</p>
          <p className="mt-1 text-[10px] text-slate-400">WINRIDER.AI ไม่ฝัง Google Maps/Mapbox API ในแอป</p>
          {hasPosition && <p className="mt-3 font-mono text-[10px] text-slate-500">{lat.toFixed(6)}, {lng.toFixed(6)}</p>}
          {driverLocation && <p className="mt-2 text-[10px] text-emerald-300">ตำแหน่งพี่วิน: {driverLocation.name}</p>}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button onClick={() => open(googleUrl)} className="rounded-2xl bg-emerald-500 px-3 py-2.5 text-[11px] font-black text-slate-950"><ExternalLink className="mr-1 inline h-4 w-4" />เปิด Google Maps</button>
            <button onClick={() => open(directionsUrl)} className="rounded-2xl border border-white/10 px-3 py-2.5 text-[11px] font-black">นำทางภายนอก</button>
          </div>
          {(onSwitchToCameraAR || onSwitchTo3DMap) && <div className="mt-3 flex justify-center gap-2">{onSwitchToCameraAR && <button onClick={onSwitchToCameraAR} className="rounded-xl border border-white/10 px-3 py-2 text-[10px]">กล้อง AR</button>}{onSwitchTo3DMap && <button onClick={onSwitchTo3DMap} className="rounded-xl border border-white/10 px-3 py-2 text-[10px]">มุมมอง 3D</button>}</div>}
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsLiveView;
