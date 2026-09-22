import React from 'react';
import { ExternalLink, MapPin, Navigation, X } from 'lucide-react';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { ComputedLiveRoute } from '../services/googleRoutesService';
import { playTactileBlip } from '../utils/audio';

export type NavigationRole = 'customer' | 'driver';
export type NavigationPhase = 'approaching' | 'in_transit' | 'completed';

export interface NavigationProps {
  role?: NavigationRole;
  initialPhase?: NavigationPhase;
  driverName?: string;
  driverAvatar?: string;
  driverPlate?: string;
  driverVehicle?: string;
  driverPhone?: string;
  passengerName?: string;
  passengerPhone?: string;
  pickupAddress?: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffAddress?: string;
  dropoffCoords?: { lat: number; lng: number };
  fareBaht?: number;
  audioEnabled?: boolean;
  onArrivedAtPickup?: () => void;
  onArrivedAtDropoff?: () => void;
  onRouteUpdate?: (route: ComputedLiveRoute | null) => void;
  onClose?: () => void;
  onOpenChat?: () => void;
}

/**
 * Free-first navigation reference screen.
 * WINRIDER.AI does not embed Google Maps or depend on Google Maps JS API.
 * It shows real GPS/coordinates as reference and opens external Google Maps for navigation.
 */
export const GoogleMapsNavigationScreen: React.FC<NavigationProps> = ({
  role = 'customer',
  initialPhase = 'approaching',
  driverName = 'ยังไม่มีข้อมูลพี่วิน',
  pickupAddress = '',
  pickupCoords = { lat: 0, lng: 0 },
  dropoffAddress = '',
  dropoffCoords = { lat: 0, lng: 0 },
  fareBaht = 0,
  audioEnabled = true,
  onClose,
}) => {
  const { gpsState } = useRealtimeGps(true);
  const destination = initialPhase === 'approaching' ? pickupCoords : dropoffCoords;
  const destinationAddress = initialPhase === 'approaching' ? pickupAddress : dropoffAddress;
  const hasDestination = Number.isFinite(destination.lat) && Number.isFinite(destination.lng) && destination.lat !== 0 && destination.lng !== 0;
  const hasGps = Number.isFinite(gpsState.latitude) && Number.isFinite(gpsState.longitude) && Boolean(gpsState.latitude && gpsState.longitude);

  const openGoogleMaps = () => {
    if (!hasDestination) return;
    if (audioEnabled) playTactileBlip(900);
    const origin = hasGps ? `&origin=${gpsState.latitude},${gpsState.longitude}` : '';
    const url = `https://www.google.com/maps/dir/?api=1${origin}&destination=${destination.lat},${destination.lng}&travelmode=two-wheeler`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const googleSearchUrl = hasDestination
    ? `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationAddress || 'ประเทศไทย')}`;

  return (
    <div className="relative w-full min-h-[520px] overflow-hidden rounded-3xl border border-emerald-500/30 bg-[#07111f] text-white">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-emerald-300"><Navigation className="h-4 w-4" /> แผนที่อ้างอิงปลายทาง</div>
          <h2 className="mt-1 text-sm font-bold">{destinationAddress || 'ยังไม่ได้ระบุปลายทาง'}</h2>
        </div>
        {onClose && <button onClick={onClose} className="rounded-xl border border-white/10 p-2"><X className="h-4 w-4" /></button>}
      </div>

      <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(34,211,238,.14),transparent_55%)] p-6">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px, transparent 1px)',backgroundSize:'32px 32px'}} />
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#081526]/90 p-6 text-center shadow-2xl backdrop-blur">
          <MapPin className="mx-auto h-12 w-12 text-cyan-300" />
          <p className="mt-3 text-xs text-slate-400">สถานที่นี้ใช้เป็นข้อมูลอ้างอิงเท่านั้น</p>
          <p className="mt-1 text-lg font-black">{destinationAddress || 'ปลายทางจากพิกัดจริง'}</p>
          {hasDestination && <p className="mt-2 font-mono text-[10px] text-slate-500">{destination.lat.toFixed(6)}, {destination.lng.toFixed(6)}</p>}
          {hasGps && <p className="mt-2 text-[10px] text-emerald-300">GPS ปัจจุบันพร้อมใช้งาน</p>}
          <p className="mt-4 text-[10px] text-slate-500">การนำทางถนนจริงเปิดใน Google Maps ภายนอกแอป เพื่อไม่ผูก WINRIDER.AI กับ Google Maps API/Billing</p>
        </div>
      </div>

      <div className="grid gap-2 border-t border-white/10 bg-black/20 p-4 sm:grid-cols-2">
        <button onClick={openGoogleMaps} disabled={!hasDestination} className="rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><ExternalLink className="mr-2 inline h-4 w-4" />เปิดนำทาง Google Maps</button>
        <a href={googleSearchUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 px-4 py-3 text-center text-xs font-black text-white"><MapPin className="mr-2 inline h-4 w-4" />เปิดสถานที่ใน Google Maps</a>
      </div>
      {driverName && role === 'driver' && <p className="px-4 pb-3 text-center text-[10px] text-slate-500">บัญชีพี่วิน: {driverName} • ใช้เฉพาะข้อมูลตำแหน่งจริงจาก GPS</p>}
      {fareBaht > 0 && <p className="px-4 pb-4 text-center text-xs text-slate-400">ค่าโดยสารที่ระบบคำนวณไว้: ฿{fareBaht.toLocaleString('th-TH')}</p>}
    </div>
  );
};

export default GoogleMapsNavigationScreen;
