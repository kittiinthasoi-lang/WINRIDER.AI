import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, LocateFixed, MapPin, Navigation, Radio, RefreshCw } from 'lucide-react';
import { playTactileBlip } from '../utils/audio';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { buildGoogleMapsCoordinateUrl, openGoogleMapsExternal } from '../services/googleMapsExternal';
import { auth } from '../firebase';

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
  sourceName?: string;
  sourceUrl?: string;
  externalMapUrl?: string;
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

type PublicPlace = {
  id: string;
  name: string;
  category: 'shop' | 'partner';
  primaryType: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  openNow: boolean | null;
  distanceMeters: number;
  placeGroup?: string;
  categoryLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  externalMapUrl?: string;
};

export const GoogleMapsRadarView: React.FC<GoogleMapsRadarViewProps> = ({
  venueName,
  venueCategory,
  radiusKm = 5,
  height = '560px',
  audioEnabled = true,
  onSelectEntity,
  onSelectDestinationForRide,
  onBackToHome,
}) => {
  const { gpsState } = useRealtimeGps(true);
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('');
  const hasGps = gpsState.isRealGps && Number.isFinite(gpsState.latitude) && Number.isFinite(gpsState.longitude) && Boolean(gpsState.latitude && gpsState.longitude);

  const load = async () => {
    if (!hasGps || !auth.currentUser) return;
    setLoading(true);
    try {
      const response = await fetch('/api/radar/nearby-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await auth.currentUser.getIdToken()}` },
        body: JSON.stringify({ latitude: gpsState.latitude, longitude: gpsState.longitude }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลเรดาร์ไม่สำเร็จ');
      setPlaces(Array.isArray(data.places) ? data.places : []);
      setSource(String(data.source || 'WIN Public Data'));
    } catch {
      setPlaces([]);
      setSource('Public Data unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [hasGps, gpsState.latitude, gpsState.longitude]);

  const visible = useMemo(() => places.filter((place) => place.distanceMeters <= radiusKm * 1000).slice(0, 30), [places, radiusKm]);

  const toEntity = (place: PublicPlace): MapRadarEntity => ({
    id: place.id,
    type: place.placeGroup === 'transport' ? 'transit_hub' : 'merchant',
    name: place.name,
    avatar: place.placeGroup === 'shop' ? '🏪' : place.placeGroup === 'faith' ? '🛕' : place.placeGroup === 'transport' ? '🚉' : '📍',
    lat: place.latitude,
    lng: place.longitude,
    status: place.openNow === true ? 'เปิดอยู่' : place.openNow === false ? 'ปิด' : 'ข้อมูลสาธารณะ',
    distanceMeters: place.distanceMeters,
    etaMin: 0,
    categoryLabel: place.categoryLabel,
    placeGroup: place.placeGroup,
    sourceName: place.sourceName,
    sourceUrl: place.sourceUrl,
    externalMapUrl: place.externalMapUrl,
    pickupNote: place.address,
  });

  const openPlace = (place: PublicPlace) => {
    if (audioEnabled) playTactileBlip(900);
    const url = place.externalMapUrl || buildGoogleMapsCoordinateUrl({ latitude: place.latitude, longitude: place.longitude });
    openGoogleMapsExternal(url);
  };

  const plot = visible.slice(0, 16).map((place) => {
    const northKm = (place.latitude - gpsState.latitude) * 111;
    const eastKm = (place.longitude - gpsState.longitude) * 111 * Math.cos(gpsState.latitude * Math.PI / 180);
    const scale = Math.max(1, radiusKm);
    return { place, x: 50 + (eastKm / scale) * 42, y: 50 - (northKm / scale) * 42 };
  });

  return <div className="relative w-full overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#07111f] text-white" style={{ minHeight: height }}>
    <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-4">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black text-cyan-300"><Radio className="h-4 w-4" /> WIN PUBLIC RADAR</div>
        <div className="mt-1 text-sm font-black">{venueName || 'ตำแหน่งปัจจุบันของบัญชีนี้'}</div>
        <div className="text-[10px] text-slate-500">{venueCategory || 'Public Data'} • รัศมี {radiusKm} กม.</div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => void load()} className="rounded-xl border border-white/10 p-2 text-cyan-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        {onBackToHome && <button onClick={onBackToHome} className="rounded-xl border border-white/10 px-3 py-2 text-[10px]">กลับ</button>}
      </div>
    </div>

    <div className="p-4">
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3 text-[10px] text-slate-300">
        <LocateFixed className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
        {hasGps ? <>GPS จริง • {gpsState.latitude.toFixed(6)}, {gpsState.longitude.toFixed(6)}</> : <>กำลังรอ GPS จริง</>}
      </div>

      <div className="relative mt-3 h-64 overflow-hidden rounded-3xl border border-white/10 bg-[#081526]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(34,211,238,.22) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {[20, 35, 50].map((size) => <div key={size} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" style={{ width: `${size * 2}%`, height: `${size * 2}%` }} />)}
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-200 bg-cyan-400 px-3 py-2 text-[9px] font-black text-slate-950 shadow-[0_0_25px_rgba(34,211,238,.5)]">YOU</div>
        {plot.map(({ place, x, y }) => <button key={place.id} type="button" onClick={() => openPlace(place)} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/50 bg-amber-400/20 px-2 py-1 text-[8px] font-black text-amber-200" style={{ left: `${Math.max(6, Math.min(94, x))}%`, top: `${Math.max(8, Math.min(92, y))}%` }} title={place.name}>●</button>)}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {visible.length === 0 && <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-xs text-slate-400">{loading ? 'กำลังโหลดข้อมูลสาธารณะรอบตัว…' : 'ยังไม่พบสถานที่ในรัศมีนี้'}</div>}
        {visible.map((place) => {
          const entity = toEntity(place);
          return <article key={place.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-cyan-400/10 p-2 text-lg">{entity.avatar}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-black text-white">{place.name}</div>
                <div className="mt-1 truncate text-[9px] text-slate-500">{place.categoryLabel || place.primaryType}</div>
                <div className="mt-1 text-[9px] text-cyan-300">{(place.distanceMeters / 1000).toFixed(1)} กม. • {place.sourceName || 'Public Data'}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => { onSelectEntity?.(entity); void onSelectDestinationForRide?.(entity); }} className="rounded-xl border border-cyan-400/25 px-2 py-2 text-[10px] font-black text-cyan-300"><MapPin className="mr-1 inline h-3.5 w-3.5" />เลือกจุด</button>
              <button onClick={() => openPlace(place)} className="rounded-xl bg-emerald-500 px-2 py-2 text-[10px] font-black text-slate-950"><ExternalLink className="mr-1 inline h-3.5 w-3.5" />แผนที่ภายนอก</button>
            </div>
          </article>;
        })}
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-[9px] leading-4 text-slate-500">
        แหล่งข้อมูล: {source || 'WIN Public Data + OpenStreetMap'} • ไม่มี Google Places/Maps API key • การนำทางถนนจริงส่งออกไปแอปภายนอก
      </div>
      {hasGps && <button onClick={() => openGoogleMapsExternal(buildGoogleMapsCoordinateUrl({ latitude: gpsState.latitude, longitude: gpsState.longitude }))} className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 text-xs font-black text-white"><Navigation className="mr-2 inline h-4 w-4" />เปิดตำแหน่งปัจจุบันภายนอก</button>}
    </div>
  </div>;
};

export default GoogleMapsRadarView;
