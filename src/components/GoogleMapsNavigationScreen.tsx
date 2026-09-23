import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, MapPin, Navigation, Route, X } from 'lucide-react';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { ComputedLiveRoute } from '../services/googleRoutesService';
import { playTactileBlip } from '../utils/audio';
import { auth } from '../firebase';
import { WinLiveLocationBoard, WinLocationPoint } from './WinLiveLocationBoard';

export type NavigationRole = 'customer' | 'driver';
export type NavigationPhase = 'approaching' | 'in_transit' | 'completed';

export interface NavigationProps {
  role?: NavigationRole;
  initialPhase?: NavigationPhase;
  rideId?: string;
  driverUserId?: string;
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

type LiveLocations = {
  driver?: { lat: number; lng: number; timestamp?: string | null } | null;
  passenger?: { lat: number; lng: number; timestamp?: string | null } | null;
  destination?: { lat: number; lng: number } | null;
  status?: string;
};

const validCoord = (coord?: { lat: number; lng: number } | null) =>
  Boolean(coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lng) && Math.abs(coord.lat) <= 90 && Math.abs(coord.lng) <= 180 && (coord.lat !== 0 || coord.lng !== 0));

const haversineKm = (a?: { lat: number; lng: number } | null, b?: { lat: number; lng: number } | null) => {
  if (!validCoord(a) || !validCoord(b)) return null;
  const r = 6371;
  const dLat = ((b!.lat - a!.lat) * Math.PI) / 180;
  const dLng = ((b!.lng - a!.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos((a!.lat * Math.PI) / 180) * Math.cos((b!.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const googleUrl = (destination: { lat: number; lng: number }, origin?: { lat: number; lng: number } | null) =>
  `https://www.google.com/maps/dir/?api=1${validCoord(origin) ? `&origin=${origin!.lat},${origin!.lng}` : ''}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
const appleUrl = (destination: { lat: number; lng: number }, origin?: { lat: number; lng: number } | null) =>
  `https://maps.apple.com/?daddr=${destination.lat},${destination.lng}${validCoord(origin) ? `&saddr=${origin!.lat},${origin!.lng}` : ''}&dirflg=d`;
const wazeUrl = (destination: { lat: number; lng: number }) =>
  `https://www.waze.com/ul?ll=${destination.lat}%2C${destination.lng}&navigate=yes`;

export const GoogleMapsNavigationScreen: React.FC<NavigationProps> = ({
  role = 'customer',
  initialPhase = 'approaching',
  rideId,
  driverName = 'พี่วิน',
  passengerName = 'ลูกค้า',
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
  const [live, setLive] = useState<LiveLocations>({});
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'live' | 'unavailable'>('idle');

  const own = useMemo(
    () => gpsState.isRealGps && Number.isFinite(gpsState.latitude) && Number.isFinite(gpsState.longitude)
      ? { lat: Number(gpsState.latitude), lng: Number(gpsState.longitude) }
      : null,
    [gpsState.isRealGps, gpsState.latitude, gpsState.longitude],
  );

  const sync = useCallback(async () => {
    if (!rideId || !auth.currentUser) return;
    const token = await auth.currentUser.getIdToken();
    try {
      setSyncStatus('syncing');
      if (validCoord(own)) {
        await fetch(`/api/orders/${encodeURIComponent(rideId)}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            latitude: own!.lat,
            longitude: own!.lng,
            accuracyMeters: gpsState.accuracy,
            heading: gpsState.heading,
            speedMps: typeof gpsState.speed === 'number' ? gpsState.speed / 3.6 : undefined,
          }),
        }).catch(() => undefined);
      }
      const response = await fetch(`/api/orders/${encodeURIComponent(rideId)}/locations`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('location unavailable');
      setLive(await response.json());
      setSyncStatus('live');
    } catch {
      setSyncStatus('unavailable');
    }
  }, [rideId, own?.lat, own?.lng, gpsState.accuracy, gpsState.heading, gpsState.speed]);

  useEffect(() => {
    if (!rideId) return;
    void sync();
    const timer = window.setInterval(() => void sync(), 5000);
    return () => window.clearInterval(timer);
  }, [rideId, sync]);

  useEffect(() => { onRouteUpdate?.(null); }, [onRouteUpdate]);

  const driverCoord = role === 'driver' ? own : (live.driver || null);
  const passengerCoord = role === 'customer'
    ? own
    : (live.passenger || (validCoord(pickupCoords) ? pickupCoords : null));
  const destinationCoord = validCoord(live.destination || null)
    ? live.destination!
    : (validCoord(dropoffCoords) ? dropoffCoords : null);

  const pointA: WinLocationPoint | null = validCoord(driverCoord)
    ? { lat: driverCoord!.lat, lng: driverCoord!.lng, label: driverName || 'พี่วิน', detail: role === 'driver' ? 'ตำแหน่งของคุณ' : 'ตำแหน่งพี่วินล่าสุด' }
    : null;
  const pointB: WinLocationPoint | null = validCoord(passengerCoord)
    ? { lat: passengerCoord!.lat, lng: passengerCoord!.lng, label: passengerName || 'ลูกค้า / จุดรับ', detail: pickupAddress || 'จุดรับ' }
    : null;
  const pointC: WinLocationPoint | null = destinationCoord
    ? { lat: destinationCoord.lat, lng: destinationCoord.lng, label: 'ปลายทาง', detail: dropoffAddress || 'จุดส่ง' }
    : null;

  const ab = haversineKm(driverCoord, passengerCoord);
  const bc = haversineKm(passengerCoord, destinationCoord);
  const target = role === 'driver' && initialPhase === 'approaching'
    ? (validCoord(passengerCoord) ? passengerCoord! : pickupCoords)
    : (destinationCoord || dropoffCoords);
  const targetReady = validCoord(target);

  const open = (url: string) => {
    if (audioEnabled) playTactileBlip(900);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return <div className="relative w-full overflow-hidden rounded-3xl border border-cyan-400/25 bg-[#07111f] text-white">
    <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-black text-cyan-300"><Navigation className="h-4 w-4" /> WIN Live Location</div>
        <h2 className="mt-1 text-sm font-bold">{role === 'driver' ? 'A คุณ • B ลูกค้า • C ปลายทาง' : 'A พี่วิน • B คุณ • C ปลายทาง'}</h2>
      </div>
      {onClose && <button onClick={onClose} className="rounded-xl border border-white/10 p-2"><X className="h-4 w-4" /></button>}
    </div>

    <div className="p-4">
      <WinLiveLocationBoard pointA={pointA} pointB={pointB} pointC={pointC} />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] text-slate-500">A → B</div><div className="mt-1 text-sm font-black text-cyan-300">{ab !== null ? `${ab.toFixed(2)} กม.` : 'รอพิกัด'}</div></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] text-slate-500">B → C</div><div className="mt-1 text-sm font-black text-amber-300">{bc !== null ? `${bc.toFixed(2)} กม.` : 'รอพิกัด'}</div></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] text-slate-500">Live sync</div><div className={`mt-1 text-xs font-black ${syncStatus === 'live' ? 'text-emerald-300' : syncStatus === 'unavailable' ? 'text-rose-300' : 'text-slate-300'}`}>{rideId ? (syncStatus === 'live' ? 'ตำแหน่งสด' : syncStatus === 'syncing' ? 'กำลังอัปเดต' : syncStatus === 'unavailable' ? 'เชื่อมต่อไม่ได้' : 'กำลังเริ่ม') : 'รอสร้างงาน'}</div></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] text-slate-500">Map API key</div><div className="mt-1 text-sm font-black text-emerald-300">ไม่ใช้</div></div>
      </div>
      <p className="mt-3 text-center text-[9px] text-slate-500">เส้น A-B-C เป็นตำแหน่งอ้างอิงสด ไม่ใช่เส้นถนน • Traffic/turn-by-turn เปิดในแอปภายนอก</p>
    </div>

    <div className="grid gap-2 border-t border-white/10 bg-black/20 p-4 sm:grid-cols-3">
      <button disabled={!targetReady} onClick={() => targetReady && open(googleUrl(target, own))} className="rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-40"><ExternalLink className="mr-2 inline h-4 w-4" />Google Maps</button>
      <button disabled={!targetReady} onClick={() => targetReady && open(appleUrl(target, own))} className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black disabled:opacity-40"><MapPin className="mr-2 inline h-4 w-4" />Apple Maps</button>
      <button disabled={!targetReady} onClick={() => targetReady && open(wazeUrl(target))} className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black disabled:opacity-40"><Route className="mr-2 inline h-4 w-4" />Waze</button>
    </div>
    {fareBaht > 0 && <p className="px-4 pb-4 text-center text-xs text-slate-400">ค่าโดยสาร: ฿{fareBaht.toLocaleString('th-TH')}</p>}
  </div>;
};

export default GoogleMapsNavigationScreen;
