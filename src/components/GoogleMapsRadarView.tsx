import React, { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import {
  Building2,
  Clock,
  Landmark,
  Layers,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Star,
  Store,
  TrainFront,
  Users,
  X,
} from 'lucide-react';
import { playRadarScan, playTactileBlip } from '../utils/audio';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { RADAR_PLACE_GROUPS, RadarPlaceGroup, selectRadarPlaces } from '../utils/radarPlaces';

const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');

const RADAR_SCAN_TTL_MS = 2 * 60 * 1000;
const RADAR_SCAN_MIN_MOVE_KM = 0.3;
let radarScanCache: { latitude: number; longitude: number; fetchedAt: number; entities: MapRadarEntity[] } | null = null;

const canReuseRadarScan = (latitude: number, longitude: number) => {
  if (!radarScanCache) return false;
  const age = Date.now() - radarScanCache.fetchedAt;
  const movedKm = Math.hypot(
    (latitude - radarScanCache.latitude) * 111,
    (longitude - radarScanCache.longitude) * 111 * Math.cos((latitude * Math.PI) / 180),
  );
  return age < RADAR_SCAN_TTL_MS && movedKm < RADAR_SCAN_MIN_MOVE_KM;
};

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
  placeGroup?: Exclude<RadarPlaceGroup, 'all'>;
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
  onBackToHome?: () => void;
}

interface NearbyPlace {
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
}

function MapViewController({ center, zoom, trigger }: { center: { lat: number; lng: number }; zoom: number; trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center.lat, center.lng, zoom, trigger]);
  return null;
}

const PLACE_GROUP_STYLES: Record<
  'shop' | 'transport' | 'faith' | 'community',
  { label: string; emoji: string; markerClass: string; badgeClass: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  shop: {
    label: 'ร้านค้าและบริการ',
    emoji: '🏪',
    markerClass: 'border-purple-400 bg-purple-950 text-purple-200',
    badgeClass: 'border-purple-400/50 bg-purple-500/20 text-purple-300',
    Icon: Store,
  },
  transport: {
    label: 'ขนส่งสาธารณะ',
    emoji: '🚉',
    markerClass: 'border-sky-400 bg-sky-950 text-sky-200',
    badgeClass: 'border-sky-400/50 bg-sky-500/20 text-sky-300',
    Icon: TrainFront,
  },
  faith: {
    label: 'ศาสนสถาน',
    emoji: '🙏',
    markerClass: 'border-amber-400 bg-amber-950 text-amber-200',
    badgeClass: 'border-amber-400/50 bg-amber-500/20 text-amber-300',
    Icon: Landmark,
  },
  community: {
    label: 'ชุมชนและสถานที่สำคัญ',
    emoji: '🏫',
    markerClass: 'border-emerald-400 bg-emerald-950 text-emerald-200',
    badgeClass: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300',
    Icon: Users,
  },
};

const getEntityGroupStyle = (entity: MapRadarEntity) =>
  entity.placeGroup ? PLACE_GROUP_STYLES[entity.placeGroup] : undefined;

const entityIcon = (entity: MapRadarEntity, className = 'w-4 h-4') => {
  const groupStyle = getEntityGroupStyle(entity);
  if (groupStyle) {
    const Icon = groupStyle.Icon;
    return <Icon className={className} />;
  }
  return entity.type === 'merchant' ? <Store className={className} /> : <Building2 className={className} />;
};
export const GoogleMapsRadarView: React.FC<GoogleMapsRadarViewProps> = ({
  targetPerspective = 'customer',
  venueName,
  radiusKm = 2.5,
  height = '520px',
  audioEnabled = true,
  onSelectEntity,
  onNavigateToEntity,
  onBackToHome,
}) => {
  const { gpsState } = useRealtimeGps(true);
  const [selectedRadius, setSelectedRadius] = useState(radiusKm);
  const [selectedCategory, setSelectedCategory] = useState<RadarPlaceGroup>('all');
  const [selectedEntity, setSelectedEntity] = useState<MapRadarEntity | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [mapZoom, setMapZoom] = useState(16);
  const [panTrigger, setPanTrigger] = useState(0);
  const [entities, setEntities] = useState<MapRadarEntity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesError, setEntitiesError] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });

  const userLat = gpsState.latitude;
  const userLng = gpsState.longitude;

  useEffect(() => {
    if (!gpsState.isRealGps) return;
    setMapCenter({ lat: userLat, lng: userLng });
  }, [gpsState.isRealGps, userLat, userLng]);

  useEffect(() => {
    if (!gpsState.isRealGps) {
      setEntities([]);
      setSelectedEntity(null);
      return;
    }
    if (userLat === null || userLng === null) return;
    if (canReuseRadarScan(userLat, userLng)) {
      setEntities(radarScanCache?.entities || []);
      setEntitiesLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setEntitiesLoading(true);
      setEntitiesError('');
      try {
        const user = getAuth().currentUser;
        if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนเปิดเรดาร์');
        const token = await user.getIdToken();

        const googleResponse = await fetch('/api/radar/nearby-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ latitude: userLat, longitude: userLng }),
        });
        const googlePayload = await googleResponse.json() as { places?: NearbyPlace[]; error?: string };
        if (!googleResponse.ok) throw new Error(googlePayload.error || 'โหลดสถานที่จริงจาก Google Maps ไม่สำเร็จ');

        const googleEntities: MapRadarEntity[] = (googlePayload.places || []).map((place) => ({
          id: `google:${place.id}`,
          type: place.category === 'shop' ? 'merchant' : 'transit_hub',
          name: place.name,
          avatar: '',
          lat: place.latitude,
          lng: place.longitude,
          rating: place.rating || undefined,
          status: place.openNow === null ? 'สถานที่จริงจาก Google Maps' : place.openNow ? 'เปิดอยู่' : 'ปิดอยู่',
          distanceMeters: place.distanceMeters,
          etaMin: Math.max(1, Math.ceil(place.distanceMeters / 350)),
          specialBadge: 'GOOGLE MAPS',
          categoryLabel: place.categoryLabel || (place.category === 'shop' ? 'ร้านค้าจาก Google Maps' : 'สถานที่และพาร์ทเนอร์จาก Google Maps'),
          placeGroup: (place.placeGroup || 'community') as Exclude<RadarPlaceGroup, 'all'>,
        }));

        const directoryResponse = await fetch('/api/shop/directory', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const directoryPayload = await directoryResponse.json() as {
          profiles?: Array<{ id: string; role: 'merchant' | 'partner'; name: string; address: string; category: string }>;
        };
        const profiles = directoryResponse.ok
          ? (directoryPayload.profiles || []).filter((profile) => profile.address)
          : [];
        let winEntities: MapRadarEntity[] = [];

        if (profiles.length) {
          const routeResponse = await fetch('/api/places/resolve-routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              latitude: userLat,
              longitude: userLng,
              places: profiles.slice(0, 20).map((profile) => ({
                key: profile.id,
                query: `${profile.name} ${profile.address} ประเทศไทย`,
              })),
            }),
          });
          const routePayload = await routeResponse.json() as {
            routes?: Array<{ key: string; latitude: number; longitude: number; distanceKm: number; etaMinutes: number | null }>;
          };
          const profileMap = new globalThis.Map(profiles.map((profile) => [profile.id, profile]));
          winEntities = (routePayload.routes || []).flatMap((route) => {
            const profile = profileMap.get(route.key);
            if (!profile) return [];
            return [{
              id: `win:${profile.id}`,
              type: profile.role === 'merchant' ? 'merchant' as const : 'transit_hub' as const,
              name: profile.name,
              avatar: '',
              lat: route.latitude,
              lng: route.longitude,
              status: 'บัญชีที่ผ่านการอนุมัติใน WINRIDER.AI',
              distanceMeters: Math.round(route.distanceKm * 1000),
              etaMin: route.etaMinutes || 0,
              specialBadge: 'WIN VERIFIED',
              categoryLabel: profile.category || profile.role,
              placeGroup: 'shop',
            }];
          });
        }

        if (!cancelled) {
          const nextEntities = [...winEntities, ...googleEntities];
          setEntities(nextEntities);
          radarScanCache = { latitude: userLat, longitude: userLng, fetchedAt: Date.now(), entities: nextEntities };
        }
      } catch (error) {
        if (!cancelled) {
          setEntities([]);
          setSelectedEntity(null);
          setEntitiesError(error instanceof Error ? error.message : 'โหลดเรดาร์จริงไม่สำเร็จ');
        }
      } finally {
        if (!cancelled) setEntitiesLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [gpsState.isRealGps, userLat, userLng]);

  const entitiesInRadius = useMemo(
    () => entities.filter((entity) => entity.distanceMeters <= selectedRadius * 1000),
    [entities, selectedRadius],
  );
  const filteredEntities = useMemo(
    () => selectRadarPlaces(entitiesInRadius, selectedCategory),
    [entitiesInRadius, selectedCategory],
  );

  const perspectiveLabel = targetPerspective === 'driver' ? 'เรดาร์พี่วิน' : 'เรดาร์ลูกค้า';
  const canShowMap = Boolean(GOOGLE_MAPS_API_KEY && gpsState.isRealGps);

  const selectEntity = (entity: MapRadarEntity) => {
    if (audioEnabled) playRadarScan();
    setSelectedEntity(entity);
    setMapCenter({ lat: entity.lat, lng: entity.lng });
    setPanTrigger((value) => value + 1);
    onSelectEntity?.(entity);
  };

  const recenter = () => {
    if (audioEnabled) playTactileBlip(800);
    setMapCenter({ lat: userLat, lng: userLng });
    setMapZoom(16);
    setPanTrigger((value) => value + 1);
  };

  const navigateToEntity = (entity: MapRadarEntity) => {
    if (audioEnabled) playTactileBlip(1200);
    if (onNavigateToEntity) {
      onNavigateToEntity(entity);
      return;
    }

    const origin = userLat !== null && userLng !== null
      ? `${userLat},${userLng}`
      : '';
    const destination = `${entity.lat},${entity.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&${origin ? `origin=${encodeURIComponent(origin)}&` : ''}destination=${encodeURIComponent(destination)}&travelmode=two_wheeler`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border-2 border-cyan-500/50 bg-[#060D1E] shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0A1633]/95 px-4 py-3 font-mono">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Google Maps Radar · {perspectiveLabel}</h3>
            <p className="text-[10px] text-slate-300">{venueName ? `${venueName} · ` : ''}ร้านค้าและพาร์ทเนอร์จากข้อมูลจริง</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2.5, 5].map((radius) => (
            <button key={radius} type="button" onClick={() => setSelectedRadius(radius)}
              className={`rounded-lg px-2 py-1 text-[10px] font-bold ${selectedRadius === radius ? 'bg-cyan-400 text-slate-950' : 'bg-black/40 text-slate-300'}`}>
              {radius} กม.
            </button>
          ))}
          <button type="button" onClick={() => setMapType((value) => value === 'roadmap' ? 'hybrid' : 'roadmap')}
            className="flex items-center gap-1 rounded-xl border border-cyan-400/30 bg-black/40 px-2.5 py-1.5 text-[10px] font-bold text-cyan-300">
            <Layers className="h-3.5 w-3.5" />{mapType === 'roadmap' ? 'ถนน' : 'ดาวเทียม'}
          </button>
          {onBackToHome && <button type="button" onClick={onBackToHome} className="rounded-xl bg-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white">ปิด</button>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-white/10 bg-[#081226] px-4 py-2">
        <div className="flex gap-1.5">
          {RADAR_PLACE_GROUPS.map(({ id, label, emoji }) => {
            const count = id === 'all'
              ? Math.min(20, entitiesInRadius.length)
              : Math.min(20, entitiesInRadius.filter((entity) => entity.placeGroup === id).length);
            return (
            <button key={id} type="button" onClick={() => { setSelectedCategory(id); setSelectedEntity(null); }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1 text-[11px] font-bold ${selectedCategory === id ? 'bg-cyan-400 text-slate-950' : 'border border-white/10 bg-black/40 text-slate-300'}`}>
              <span>{emoji}</span>
              {label} <span className="rounded-full bg-black/20 px-1.5 text-[9px]">{count}</span>
            </button>
          )})}
        </div>
               <span className="whitespace-nowrap text-[10px] font-bold text-cyan-300">แสดง {filteredEntities.length}/20 จุด</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-b border-white/10 bg-[#060D1E] px-4 py-2 font-mono">
        <span className="text-[9px] font-bold text-slate-400">สัญลักษณ์:</span>
        {(Object.entries(PLACE_GROUP_STYLES) as Array<[keyof typeof PLACE_GROUP_STYLES, typeof PLACE_GROUP_STYLES[keyof typeof PLACE_GROUP_STYLES]]>).map(([id, style]) => (
          <span key={id} className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[9px] font-bold ${style.badgeClass}`}>
            <span>{style.emoji}</span>
            <span>{style.label}</span>
          </span>
        ))}
      </div>

      <div className="relative w-full" style={{ height }}>
        {!gpsState.isRealGps && (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-amber-200">
            กรุณาอนุญาตตำแหน่ง GPS จริงเพื่อค้นหาร้านค้าและพาร์ทเนอร์ ระบบจะไม่แสดงตำแหน่งจำลอง
          </div>
        )}
        {gpsState.isRealGps && !GOOGLE_MAPS_API_KEY && (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-rose-200">
            ยังไม่ได้ตั้งค่า VITE_GOOGLE_MAPS_API_KEY สำหรับแผนที่หน้าเว็บ
          </div>
        )}
        {canShowMap && (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="th" region="TH">
            <Map defaultCenter={{ lat: userLat, lng: userLng }} defaultZoom={mapZoom} mapId="DEMO_MAP_ID"
              mapTypeId={mapType} gestureHandling="greedy" fullscreenControl={false} streetViewControl={false}
              mapTypeControl={false} zoomControl={false} style={{ width: '100%', height: '100%' }}>
              <MapViewController center={mapCenter} zoom={mapZoom} trigger={panTrigger} />
              <AdvancedMarker position={{ lat: userLat, lng: userLng }} title="ตำแหน่งปัจจุบันของคุณ" zIndex={50}>
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-cyan-500 shadow-[0_0_15px_#00D2FF]">
                  <div className="absolute -inset-2 animate-ping rounded-full bg-cyan-400/30" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white" />
                </div>
              </AdvancedMarker>
              {filteredEntities.map((entity) => {
                const selected = selectedEntity?.id === entity.id;
                return (
                  <AdvancedMarker key={entity.id} position={{ lat: entity.lat, lng: entity.lng }} title={entity.name}
                    zIndex={selected ? 40 : 20} onClick={() => selectEntity(entity)}>
                                  <div className={`flex cursor-pointer items-center gap-1.5 rounded-2xl border-2 px-2 py-1 shadow-xl ${(getEntityGroupStyle(entity)?.markerClass) || (entity.type === 'merchant' ? 'border-purple-400 bg-purple-950 text-purple-200' : 'border-sky-400 bg-sky-950 text-sky-200')} ${selected ? 'scale-110 ring-2 ring-white' : ''}`}>
                      {entityIcon(entity)}
                      <div className="font-mono text-[9px]"><div className="max-w-[100px] truncate font-black">{entity.name}</div><div>{entity.distanceMeters} ม.</div></div>
                    </div>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </APIProvider>
        )}

        {canShowMap && (
          <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
            <button type="button" onClick={recenter} title="กลับสู่ตำแหน่งปัจจุบัน" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/50 bg-[#09152C]/90 text-cyan-300"><LocateFixed className="h-5 w-5" /></button>
            <button type="button" onClick={() => { setMapZoom((value) => Math.min(value + 1, 20)); setPanTrigger((value) => value + 1); }} className="h-10 w-10 rounded-2xl border border-white/20 bg-[#09152C]/90 text-lg font-bold text-white">+</button>
            <button type="button" onClick={() => { setMapZoom((value) => Math.max(value - 1, 12)); setPanTrigger((value) => value + 1); }} className="h-10 w-10 rounded-2xl border border-white/20 bg-[#09152C]/90 text-lg font-bold text-white">−</button>
          </div>
        )}

        {entitiesLoading && <div className="absolute left-4 top-4 z-20 rounded-xl border border-cyan-400/40 bg-black/80 px-3 py-2 text-[10px] text-cyan-200">กำลังค้นหาสถานที่จริงจาก Google Maps…</div>}
        {entitiesError && <div className="absolute bottom-4 left-4 right-4 z-20 rounded-xl border border-rose-400/40 bg-rose-950/95 px-3 py-2 text-xs text-rose-100">{entitiesError}</div>}
        {canShowMap && !entitiesLoading && !entitiesError && filteredEntities.length === 0 && (
          <div className="absolute bottom-4 left-4 right-4 z-20 rounded-xl border border-white/20 bg-black/80 px-3 py-2 text-center text-xs text-slate-200">ยังไม่พบร้านค้าหรือพาร์ทเนอร์จริงในรัศมีที่เลือก</div>
        )}

        {selectedEntity && (
          <div className="absolute bottom-4 left-4 right-4 z-30 rounded-3xl border-2 border-cyan-400 bg-[#081226]/95 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${(getEntityGroupStyle(selectedEntity)?.badgeClass) || (selectedEntity.type === 'merchant' ? 'border-purple-400/50 bg-purple-500/20 text-purple-300' : 'border-sky-400/50 bg-sky-500/20 text-sky-300')}`}>{entityIcon(selectedEntity, 'w-6 h-6')}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-black text-white">{selectedEntity.name}</h4><span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-300">{selectedEntity.specialBadge}</span></div>
                  <p className="mt-1 text-xs text-slate-300">{selectedEntity.status}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-[10px]"><span className="flex items-center gap-1 text-cyan-300"><MapPin className="h-3 w-3" />{selectedEntity.distanceMeters} ม.</span><span className="flex items-center gap-1 text-amber-300"><Clock className="h-3 w-3" />ประมาณ {selectedEntity.etaMin} นาที</span>{selectedEntity.rating && <span className="flex items-center gap-1 text-yellow-300"><Star className="h-3 w-3" />{selectedEntity.rating}</span>}</div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedEntity(null)} className="rounded-full bg-white/10 p-2 text-white"><X className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={() => navigateToEntity(selectedEntity)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-xs font-black text-slate-950"><Navigation className="h-4 w-4" />นำทางไปสถานที่นี้</button>
          </div>
        )}
      </div>
    </div>
  );
};
