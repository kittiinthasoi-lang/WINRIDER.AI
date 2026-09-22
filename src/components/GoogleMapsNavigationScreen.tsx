import React, { useEffect, useState } from 'react';
import { ExternalLink, MapPin, Navigation, Route, X } from 'lucide-react';
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
 * Navigation reference screen.
 * No Google Maps/Mapbox JavaScript, iframe, tiles, or browser API key is used.
 * The screen shows live GPS + destination + route state; street navigation
 * opens Google Maps externally.
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
  onRouteUpdate,
  onClose,
}) => {
  const { gpsState } = useRealtimeGps(true);
  const [route, setRoute] = useState<ComputedLiveRoute | null>(null);
  const [routeStatus, setRouteStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  const destination = initialPhase === 'approaching' ? pickupCoords : dropoffCoords;
  const destinationAddress = initialPhase === 'approaching' ? pickupAddress : dropoffAddress;
  const hasDestination = Number.isFinite(destination.lat) && Number.isFinite(destination.lng) && destination.lat !== 0 && destination.lng !== 0;
  const hasGps = Number.isFinite(gpsState.latitude) && Number.isFinite(gpsState.longitude) && Boolean(gpsState.latitude && gpsState.longitude);

  useEffect(() => {
    let cancelled = false;
    const loadRoute = async () => {
      if (!hasGps || !hasDestination) { setRoute(null); setRouteStatus('idle'); onRouteUpdate?.(null); return; }
      setRouteStatus('loading');
      try {
        const response = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ origin: { lat: gpsState.latitude, lng: gpsState.longitude }, destination: { lat: destination.lat, lng: destination.lng }, travelMode: 'TWO_WHEELER' }),
        });
        const text = await response.text();
        if (!response.ok || !text.trim()) throw new Error('route unavailable');
        let payload: any;
        try { payload = JSON.parse(text); } catch { throw new Error('route response invalid'); }
        const next = payload?.route || payload;
        if (!next || next.success === false) throw new Error('route unavailable');
        if (!cancelled) { setRoute(next as ComputedLiveRoute); setRouteStatus('ready'); onRouteUpdate?.(next as ComputedLiveRoute); }
      } catch {
        if (!cancelled) { setRoute(null); setRouteStatus('unavailable'); onRouteUpdate?.(null); }
      }
    };
    void loadRoute();
    return () => { cancelled = true; };
  }, [hasGps, hasDestination, gpsState.latitude, gpsState.longitude, destination.lat, destination.lng, onRouteUpdate]);

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

  const distanceText = route && Number.isFinite(Number((route as any).totalDistanceMeters)) ? `${(Number((route as any).totalDistanceMeters) / 1000).toFixed(1)} กม.` : 'ยังไม่มีเส้นทาง Google';
  const durationText = route && Number.isFinite(Number((route as any).totalDurationSeconds)) ? `${Math.max(1, Math.round(Number((route as any).totalDurationSeconds) / 60))} นาที` : 'เปิด Google Maps เพื่อดู ETA ถนนจริง';

  return (
    <div className="relative w-full min-h-[520px] overflow-hidden rounded-3xl border border-emerald-500/30 bg-[#07111f] text-white">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-4">
        <div><div className="flex items-center gap-2 text-xs font-black text-emerald-300"><Navigation className="h-4 w-4" /> {role === 'driver' ? 'หน้าจอนำทางพี่วิน' : 'หน้าจอรอรถลูกค้า'}</div><h2 className="mt-1 text-sm font-bold">{destinationAddress || 'ยังไม่ได้ระบุปลายทาง'}</h2></div>
        {onClose && <button onClick={onClose} className="rounded-xl border border-white/10 p-2"><X className="h-4 w-4" /></button>}
      </div>

      <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(34,211,238,.14),transparent_55%)] p-6">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#081526]/95 p-5 shadow-2xl backdrop-blur">
          <div className="relative h-44 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1830]">
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className="absolute left-[18%] top-[72%] flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-400/15 px-2 py-1 text-[8px] font-bold text-cyan-200"><span className="h-2 w-2 rounded-full bg-cyan-300" />GPS</div>
            <div className="absolute right-[18%] top-[22%] flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-1 text-[8px] font-bold text-amber-200"><MapPin className="h-3 w-3" />ปลายทาง</div>
            <div className="absolute left-[25%] top-[55%] h-1 w-[50%] -rotate-[28deg] rounded-full bg-cyan-400/50" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] text-slate-500">ระยะทาง</div><div className="mt-1 text-sm font-black text-cyan-300">{distanceText}</div></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] text-slate-500">ETA</div><div className="mt-1 text-sm font-black text-emerald-300">{durationText}</div></div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3 text-[10px]">
            <span className={hasGps ? 'text-emerald-300' : 'text-amber-300'}>{hasGps ? 'GPS จริงพร้อมใช้งาน' : 'กำลังรอ GPS จริง'}</span>
            <span className={routeStatus === 'ready' ? 'text-cyan-300' : routeStatus === 'loading' ? 'text-amber-300' : 'text-slate-500'}>{routeStatus === 'ready' ? 'Google Route พร้อม' : routeStatus === 'loading' ? 'กำลังคำนวณเส้นทาง…' : 'เส้นทางจะเปิดใน Google Maps'}</span>
          </div>
          <p className="mt-3 text-center text-[9px] text-slate-500">ภาพในกรอบนี้เป็นแผงอ้างอิงของ WINRIDER.AI ไม่ใช่แผนที่ provider อื่น • การนำทางถนนจริงเปิด Google Maps ภายนอก</p>
        </div>
      </div>

      <div className="grid gap-2 border-t border-white/10 bg-black/20 p-4 sm:grid-cols-2">
        <button onClick={openGoogleMaps} disabled={!hasDestination} className="rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><ExternalLink className="mr-2 inline h-4 w-4" />เปิดนำทาง Google Maps</button>
        <a href={googleSearchUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 px-4 py-3 text-center text-xs font-black text-white"><Route className="mr-2 inline h-4 w-4" />เปิดสถานที่ภายนอก</a>
      </div>
      {driverName && role === 'driver' && <p className="px-4 pb-3 text-center text-[10px] text-slate-500">บัญชีพี่วิน: {driverName} • GPS จริง • ไม่ฝัง Google Maps ในแอป</p>}
      {fareBaht > 0 && <p className="px-4 pb-4 text-center text-xs text-slate-400">ค่าโดยสารที่ระบบคำนวณไว้: ฿{fareBaht.toLocaleString('th-TH')}</p>}
    </div>
  );
};

export default GoogleMapsNavigationScreen;
