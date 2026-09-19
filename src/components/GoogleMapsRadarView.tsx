// Source: Google Maps Platform Code Assist
// Internal Usage Attribution: gmp_mcp_codeassist_v1_aistudio

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  ControlPosition,
  MapControl
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Layers,
  Compass,
  RotateCw,
  LocateFixed,
  Radio,
  Search,
  Sliders,
  Filter,
  Users,
  Store,
  Bike,
  Sparkles,
  Phone,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Star,
  Clock,
  ExternalLink,
  X,
  Volume2,
  VolumeX,
  CheckCircle2,
  Train,
  Heart
} from 'lucide-react';
import { playTactileBlip, playRadarScan } from '../utils/audio';
import { useRealtimeGps } from './GpsRealTimeTracker';

const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');

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

/**
 * Controller subcomponent to access the underlying Google Map instance
 */
function MapViewController({
  center,
  zoom,
  panTrigger
}: {
  center: { lat: number; lng: number };
  zoom: number;
  panTrigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
      map.setZoom(zoom);
    }
  }, [map, panTrigger, center.lat, center.lng, zoom]);
  return null;
}

export const GoogleMapsRadarView: React.FC<GoogleMapsRadarViewProps> = ({
  targetPerspective = 'customer',
  venueName,
  venueIcon,
  venueCategory,
  radiusKm = 2.5,
  height = '520px',
  audioEnabled = true,
  onSelectEntity,
  onBookRideWithRider,
  onAcceptJobFromCustomer,
  onNavigateToEntity,
  onBackToHome
}) => {
  const { gpsState } = useRealtimeGps(true);
  const [selectedRadius, setSelectedRadius] = useState<number>(radiusKm);
  const [filterType, setFilterType] = useState<'all' | 'riders' | 'customers' | 'merchants' | 'transit'>('all');
  const [selectedEntity, setSelectedEntity] = useState<MapRadarEntity | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [mapZoom, setMapZoom] = useState<number>(16);
  const [panTrigger, setPanTrigger] = useState<number>(0);

  // User's base coordinates (defaulting to Bangkok Sukhumvit 39 / Phrom Phong area)
  const userLat = gpsState.latitude || 13.7314;
  const userLng = gpsState.longitude || 100.5700;

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: userLat,
    lng: userLng
  });

  // Sync center when live GPS updates initially
  useEffect(() => {
    if (gpsState.latitude && gpsState.longitude) {
      setMapCenter({ lat: gpsState.latitude, lng: gpsState.longitude });
    }
  }, [gpsState.latitude, gpsState.longitude]);

  // Generate realistic nearby entities around user's live coordinates
  const entities = useMemo<MapRadarEntity[]>(() => {
    const baseLat = userLat;
    const baseLng = userLng;

    return [
      // 1. RIDERS (พี่วิน)
      {
        id: 'r-201',
        type: 'rider',
        name: 'พี่วินสมชาย รักเกียรติ (LV.38)',
        avatar: '🛵',
        lat: baseLat + 0.0018,
        lng: baseLng + 0.0012,
        rating: 4.98,
        level: 38,
        vehicleModel: 'Honda Forza 350',
        licensePlate: '1กข 7789 กทม.',
        status: 'พร้อมรับทันที • จอดหน้า EmQuartier',
        distanceMeters: 180,
        etaMin: 1.2,
        specialBadge: '⚡ ใกล้สุด 180 ม.',
        phone: '089-123-4567',
        categoryLabel: 'Win Rider Top-Tier'
      },
      {
        id: 'r-202',
        type: 'rider',
        name: 'พี่วินเอกชัย (LV.72 Sovereign)',
        avatar: '🏍️',
        lat: baseLat - 0.0025,
        lng: baseLng + 0.0031,
        rating: 5.0,
        level: 72,
        vehicleModel: 'Yamaha XMAX 300 Tech MAX',
        licensePlate: '9กฬ 5566 กทม.',
        status: 'สแตนด์บายปากซอย 39 • หมวกกันน็อกใหม่',
        distanceMeters: 380,
        etaMin: 2.1,
        specialBadge: '👑 อัศวินจักรพรรดิ',
        phone: '081-445-5678',
        categoryLabel: 'Sovereign Knight'
      },
      {
        id: 'r-203',
        type: 'rider',
        name: 'พี่วินอนุชา (Clean Eco-EV)',
        avatar: '⚡',
        lat: baseLat + 0.0032,
        lng: baseLng - 0.0022,
        rating: 4.95,
        level: 45,
        vehicleModel: 'DECO Super EV 4000W (เงียบ ไร้มลพิษ)',
        licensePlate: '3กม 9911 กทม.',
        status: 'รถไฟฟ้า 100% ขับนุ่มมาก',
        distanceMeters: 450,
        etaMin: 2.8,
        specialBadge: '🌿 รถรักษ์โลก Eco-EV',
        phone: '086-778-9900',
        categoryLabel: 'Green Mobility'
      },
      {
        id: 'r-204',
        type: 'rider',
        name: 'พี่วินกิตติ (LV.100 Sovereign)',
        avatar: '🦁',
        lat: baseLat - 0.0012,
        lng: baseLng - 0.0019,
        rating: 5.0,
        level: 100,
        vehicleModel: 'Honda ADV 350 Urban Adventure',
        licensePlate: 'WIN-0001',
        status: 'ระดับจักรพรรดิ • ประกันภัยคุ้มครอง 1 ล้าน',
        distanceMeters: 250,
        etaMin: 1.5,
        specialBadge: '⭐ อัศวินอันดับ 1',
        phone: '089-999-8888',
        categoryLabel: 'Grand Master'
      },

      // 2. CUSTOMERS (ลูกค้า)
      {
        id: 'c-101',
        type: 'customer',
        name: 'คุณณิชา รัตนเวช',
        avatar: '👩‍💼',
        lat: baseLat + 0.0022,
        lng: baseLng + 0.0025,
        status: 'รอรถหน้าคอนโด 39 ไปสาทร ซิตี้ ทาวเวอร์',
        fareOrDeal: '฿74 (ทิป ฿15)',
        distanceMeters: 320,
        etaMin: 1.8,
        specialBadge: '🔥 งานด่วนเร่งด่วน',
        categoryLabel: 'Passenger Ride',
        pickupNote: 'เสื้อสูทสีเบจ ถือแก้วสตาร์บัคส์'
      },
      {
        id: 'c-102',
        type: 'customer',
        name: 'คุณธนภัทร (ส่งพัสดุด่วน)',
        avatar: '📦',
        lat: baseLat - 0.0035,
        lng: baseLng + 0.0018,
        status: 'เอกสารสำคัญ & โน้ตบุ๊ก ไปตึก Exchange Tower',
        fareOrDeal: '฿85 (ด่วนพิเศษ)',
        distanceMeters: 420,
        etaMin: 2.4,
        specialBadge: 'WIN Express',
        categoryLabel: 'Parcel Delivery',
        pickupNote: 'รอตรงป้อม รปภ. กล่องพัสดุสีน้ำตาล'
      },
      {
        id: 'c-103',
        type: 'customer',
        name: 'คุณศศิธร & น้องคอร์กี้',
        avatar: '🐕',
        lat: baseLat + 0.0015,
        lng: baseLng - 0.0034,
        status: 'ไปรพ.สัตว์ทองหล่อ (มีเบาะสัตว์เลี้ยง)',
        fareOrDeal: '฿130',
        distanceMeters: 510,
        etaMin: 3.0,
        specialBadge: 'WIN Pet Care 🐶',
        categoryLabel: 'Pet Friendly',
        pickupNote: 'น้องใส่สายจูงเรียบร้อย มีกระเป๋าใส่สัตว์เลี้ยง'
      },

      // 3. MERCHANTS (ร้านค้า)
      {
        id: 'm-301',
        type: 'merchant',
        name: 'ร้านป้าสมร ตามสั่ง (Michelin Local)',
        avatar: '🍲',
        lat: baseLat + 0.0010,
        lng: baseLng + 0.0038,
        status: 'เปิดบริการ • สั่งล่วงหน้าลด 15%',
        fareOrDeal: 'ลด 15% ข้าวกะเพราเนื้อโคขุน',
        distanceMeters: 390,
        etaMin: 2.0,
        rating: 4.9,
        specialBadge: '⭐ พาร์ทเนอร์ยอดนิยม',
        categoryLabel: 'Street Food Michelin'
      },
      {
        id: 'm-302',
        type: 'merchant',
        name: 'Summer Rain Specialty Coffee',
        avatar: '☕',
        lat: baseLat - 0.0019,
        lng: baseLng - 0.0028,
        status: 'เปิดบริการ 07:00 - 18:00 • มีที่จอดมอเตอร์ไซค์',
        fareOrDeal: 'ส่วนลด ฿20 เมนู Dirty Coffee',
        distanceMeters: 310,
        etaMin: 1.7,
        rating: 4.95,
        specialBadge: '☕ คาเฟ่แนะนำ',
        categoryLabel: 'Specialty Roastery'
      },
      {
        id: 'm-303',
        type: 'merchant',
        name: 'Aura Bake สุขุมวิท 39 (เบเกอรี่สด)',
        avatar: '🧁',
        lat: baseLat + 0.0028,
        lng: baseLng - 0.0015,
        status: 'อบขนมปังสดใหม่ทุกเช้า • รับส่งพัสดุด่วน',
        fareOrDeal: 'ครัวซองต์ซื้อ 2 แถม 1',
        distanceMeters: 460,
        etaMin: 2.6,
        rating: 4.85,
        specialBadge: '🥐 เบเกอรี่ฝรั่งเศส',
        categoryLabel: 'French Bakery'
      },

      // 4. TRANSIT HUBS & PARTNERS (จุดเชื่อมต่อ & พาร์ทเนอร์)
      {
        id: 't-401',
        type: 'transit_hub',
        name: 'BTS พร้อมพงษ์ (ทางออก 3 สุขุมวิท 39)',
        avatar: '🚊',
        lat: baseLat - 0.0020,
        lng: baseLng + 0.0005,
        status: 'จุดรับส่งหลัก • มีซุ้มวินรับงาน 15 คัน',
        fareOrDeal: 'จุดเชื่อมต่อระบบราง',
        distanceMeters: 220,
        etaMin: 1.1,
        specialBadge: '🚉 รถไฟฟ้า BTS สายสีเขียว',
        categoryLabel: 'Transit Hub'
      },
      {
        id: 't-402',
        type: 'transit_hub',
        name: 'ศูนย์การค้า The EmQuartier & Emporium',
        avatar: '🛍️',
        lat: baseLat - 0.0027,
        lng: baseLng + 0.0015,
        status: 'จุดจอดรับส่ง VIP Gate 1 • ร่มรื่น',
        fareOrDeal: 'จุดนัดพบอัศวิน',
        distanceMeters: 300,
        etaMin: 1.6,
        specialBadge: '💎 ห้างสรรพสินค้าชั้นนำ',
        categoryLabel: 'Partner Mall'
      },
      {
        id: 't-403',
        type: 'transit_hub',
        name: 'โรงพยาบาลสมิติเวช สุขุมวิท (ซอย 49)',
        avatar: '🏥',
        lat: baseLat + 0.0045,
        lng: baseLng + 0.0035,
        status: 'จุดฉุกเฉิน & รับส่งผู้ป่วย/ญาติ',
        fareOrDeal: 'บริการด่วนส่งยาถึงบ้าน',
        distanceMeters: 850,
        etaMin: 4.2,
        specialBadge: '🏥 โรงพยาบาลพาร์ทเนอร์',
        categoryLabel: 'Medical Hub'
      }
    ];
  }, [userLat, userLng]);

  // Filter entities by selected type and radius
  const filteredEntities = useMemo(() => {
    return entities.filter(item => {
      // Radius filter (convert km to meters)
      if (item.distanceMeters > selectedRadius * 1000) return false;

      if (filterType === 'all') return true;
      if (filterType === 'riders') return item.type === 'rider';
      if (filterType === 'customers') return item.type === 'customer';
      if (filterType === 'merchants') return item.type === 'merchant';
      if (filterType === 'transit') return item.type === 'transit_hub';
      return true;
    });
  }, [entities, filterType, selectedRadius]);

  const handleRecenter = () => {
    if (audioEnabled) playTactileBlip(800);
    setMapCenter({ lat: userLat, lng: userLng });
    setMapZoom(16);
    setPanTrigger(prev => prev + 1);
  };

  const handleMarkerClick = (entity: MapRadarEntity) => {
    if (audioEnabled) playRadarScan();
    setSelectedEntity(entity);
    setMapCenter({ lat: entity.lat, lng: entity.lng });
    setPanTrigger(prev => prev + 1);
    onSelectEntity?.(entity);
  };

  const getPerspectiveLabel = (p?: string) => {
    switch (p) {
      case 'customer':
        return 'มุมมองพลเมืองผู้โดยสาร (รอบตัวคุณ)';
      case 'driver':
        return 'มุมมองอัศวินพี่วิน (ผู้โดยสาร & งานรอบตัว)';
      case 'merchant':
        return 'มุมมองร้านค้าพันธมิตร (พี่วิน & ลูกค้า)';
      case 'partner':
        return 'มุมมองพาร์ทเนอร์ & ขนส่ง (เครือข่ายรอบตัว)';
      default:
        return 'มุมมองรอบตัวคุณ';
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border-2 border-cyan-500/50 bg-[#060D1E] shadow-2xl flex flex-col">
      {/* 1. TOP STATUS & CONTROLS HEADER */}
      <div className="px-4 py-3 bg-[#0A1633]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs font-mono z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>Google Maps Radar</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  LIVE GPS
                </span>
              </h3>
            </div>
            <p className="text-[10px] text-slate-300">
              {venueName ? `${venueName} • ` : ''}
              {getPerspectiveLabel(targetPerspective)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Radius Selector Pills */}
          <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/15 text-[10px]">
            {[
              { km: 1.0, label: '1 กม.' },
              { km: 2.5, label: '2.5 กม.' },
              { km: 5.0, label: '5 กม.' }
            ].map(r => (
              <button
                key={r.km}
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(750);
                  setSelectedRadius(r.km);
                }}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  selectedRadius === r.km
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Map Layer Switcher (Roadmap vs Satellite) */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setMapType(prev => (prev === 'roadmap' ? 'hybrid' : 'roadmap'));
            }}
            className="px-2.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold flex items-center gap-1 transition-all"
            title="สลับแผนที่ถนน / ดาวเทียม"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapType === 'roadmap' ? 'ถนน' : 'ดาวเทียม'}</span>
          </button>

          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 text-[10px] font-bold"
            >
              ปิด
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER PILLS BAR */}
      <div className="px-4 py-2 bg-[#081226] border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-[11px] font-mono z-10">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setFilterType('all');
            }}
            className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md font-black'
                : 'bg-black/40 text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            <span>🔥 ทั้งหมด</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30">
              {entities.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setFilterType('riders');
            }}
            className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              filterType === 'riders'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md font-black'
                : 'bg-black/40 text-amber-300 hover:bg-white/10 border border-amber-500/20'
            }`}
          >
            <span>🛵 พี่วิน</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30">
              {entities.filter(e => e.type === 'rider').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setFilterType('customers');
            }}
            className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              filterType === 'customers'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-md font-black'
                : 'bg-black/40 text-emerald-300 hover:bg-white/10 border border-emerald-500/20'
            }`}
          >
            <span>👥 ลูกค้า</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30">
              {entities.filter(e => e.type === 'customer').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setFilterType('merchants');
            }}
            className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              filterType === 'merchants'
                ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-slate-950 shadow-md font-black'
                : 'bg-black/40 text-purple-300 hover:bg-white/10 border border-purple-500/20'
            }`}
          >
            <span>🏪 ร้านค้า</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30">
              {entities.filter(e => e.type === 'merchant').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setFilterType('transit');
            }}
            className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              filterType === 'transit'
                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 shadow-md font-black'
                : 'bg-black/40 text-sky-300 hover:bg-white/10 border border-sky-500/20'
            }`}
          >
            <span>🚊 ขนส่ง & พาร์ทเนอร์</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30">
              {entities.filter(e => e.type === 'transit_hub').length}
            </span>
          </button>
        </div>

        <div className="text-[10px] text-cyan-300 whitespace-nowrap font-bold flex items-center gap-1">
          <span>พบ {filteredEntities.length} จุด</span>
          <span className="text-slate-500">ใน {selectedRadius} กม.</span>
        </div>
      </div>

      {/* 3. GOOGLE MAP CONTAINER */}
      <div className="relative w-full" style={{ height }}>
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="th" region="TH">
          <Map
            defaultCenter={{ lat: userLat, lng: userLng }}
            defaultZoom={mapZoom}
            mapId="DEMO_MAP_ID"
            mapTypeId={mapType}
            gestureHandling="greedy"
            fullscreenControl={false}
            streetViewControl={false}
            mapTypeControl={false}
            zoomControl={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <MapViewController
              center={mapCenter}
              zoom={mapZoom}
              panTrigger={panTrigger}
            />

            {/* A. USER'S LIVE LOCATION ADVANCED MARKER */}
            <AdvancedMarker
              position={{ lat: userLat, lng: userLng }}
              title="ตำแหน่งปัจจุบันของคุณ"
              zIndex={50}
            >
              <div className="relative flex items-center justify-center cursor-pointer">
                <div className="absolute -inset-3 rounded-full bg-cyan-400/30 animate-ping" />
                <div className="absolute -inset-1.5 rounded-full bg-cyan-500/40 animate-pulse" />
                <div className="relative w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 border-2 border-white shadow-[0_0_15px_#00D2FF] flex items-center justify-center text-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                </div>
                {/* Floating user label */}
                <div className="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-950/90 border border-cyan-400/60 text-[9px] font-mono font-bold text-cyan-300 shadow-md">
                  📍 คุณอยู่ที่นี่
                </div>
              </div>
            </AdvancedMarker>

            {/* B. SURROUNDING ENTITY ADVANCED MARKERS */}
            {filteredEntities.map(entity => {
              const isSelected = selectedEntity?.id === entity.id;

              return (
                <AdvancedMarker
                  key={entity.id}
                  position={{ lat: entity.lat, lng: entity.lng }}
                  title={entity.name}
                  zIndex={isSelected ? 40 : 20}
                  onClick={() => handleMarkerClick(entity)}
                >
                  <div className="relative group cursor-pointer transition-transform transform hover:scale-110">
                    {/* Pulsing ring if selected */}
                    {isSelected && (
                      <div className="absolute -inset-2 rounded-2xl bg-cyan-400/40 animate-ping" />
                    )}

                    {/* Custom Styled Marker Bubble */}
                    <div
                      className={`px-2 py-1 rounded-2xl flex items-center gap-1.5 shadow-xl border-2 transition-all ${
                        entity.type === 'rider'
                          ? isSelected
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-white scale-110 shadow-[0_0_20px_#FFD700]'
                            : 'bg-[#0F1E36] text-amber-300 border-amber-400/80 hover:border-amber-300'
                          : entity.type === 'customer'
                          ? isSelected
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 border-white scale-110 shadow-[0_0_20px_#10B981]'
                            : 'bg-[#07241A] text-emerald-300 border-emerald-400/80 hover:border-emerald-300'
                          : entity.type === 'merchant'
                          ? isSelected
                            ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-slate-950 border-white scale-110 shadow-[0_0_20px_#A855F7]'
                            : 'bg-[#1C0F2B] text-purple-300 border-purple-400/80 hover:border-purple-300'
                          : isSelected
                          ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 border-white scale-110 shadow-[0_0_20px_#0284C7]'
                          : 'bg-[#0B1A38] text-sky-300 border-sky-400/80 hover:border-sky-300'
                      }`}
                    >
                      <span className="text-sm">{entity.avatar}</span>
                      <div className="text-left font-mono">
                        <div className="text-[10px] font-black leading-tight truncate max-w-[80px]">
                          {entity.name.split(' ')[0]}
                        </div>
                        <div className="text-[8px] opacity-85 leading-none">
                          {entity.distanceMeters} ม.
                        </div>
                      </div>
                    </div>

                    {/* Pin needle pointer */}
                    <div
                      className={`w-0 h-0 mx-auto border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-6 ${
                        entity.type === 'rider'
                          ? 'border-t-amber-400'
                          : entity.type === 'customer'
                          ? 'border-t-emerald-400'
                          : entity.type === 'merchant'
                          ? 'border-t-purple-400'
                          : 'border-t-sky-400'
                      }`}
                    />
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>

        {/* 4. FLOATING FLOATING MAP CONTROLS (Right side) */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          {/* Re-center Button */}
          <button
            type="button"
            onClick={handleRecenter}
            className="w-10 h-10 rounded-2xl bg-[#09152C]/90 hover:bg-[#0E2044] border border-cyan-400/50 text-cyan-300 flex items-center justify-center shadow-lg transition-all active:scale-95"
            title="เล็งกลับมาตำแหน่งปัจจุบัน"
          >
            <LocateFixed className="w-5 h-5 text-cyan-400" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setMapZoom(prev => Math.min(prev + 1, 20));
              setPanTrigger(prev => prev + 1);
            }}
            className="w-10 h-10 rounded-2xl bg-[#09152C]/90 hover:bg-[#0E2044] border border-white/20 text-white flex items-center justify-center shadow-lg transition-all text-lg font-bold"
          >
            +
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setMapZoom(prev => Math.max(prev - 1, 12));
              setPanTrigger(prev => prev + 1);
            }}
            className="w-10 h-10 rounded-2xl bg-[#09152C]/90 hover:bg-[#0E2044] border border-white/20 text-white flex items-center justify-center shadow-lg transition-all text-lg font-bold"
          >
            -
          </button>
        </div>

        {/* 5. FLOATING LIVE RADAR TELEMETRY BADGE (Top Left) */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-cyan-500/40 text-cyan-300 shadow-xl font-mono text-[11px] space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-white">Google Maps Live Radar</span>
            </div>
            <div className="text-[9px] text-slate-400">
              พิกัด: {userLat.toFixed(4)}, {userLng.toFixed(4)}
            </div>
          </div>
        </div>

        {/* 6. SELECTED ENTITY BOTTOM SHEET / CARD */}
        {selectedEntity && (
          <div className="absolute bottom-4 left-4 right-4 z-30 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0B1A38] via-[#081226] to-[#050B18] border-2 border-cyan-400 shadow-[0_10px_35px_rgba(0,210,255,0.3)] space-y-3 font-mono">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                      selectedEntity.type === 'rider'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                        : selectedEntity.type === 'customer'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : selectedEntity.type === 'merchant'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400/50'
                        : 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                    }`}
                  >
                    {selectedEntity.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-white text-sm">
                        {selectedEntity.name}
                      </h4>
                      {selectedEntity.specialBadge && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-bold">
                          {selectedEntity.specialBadge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-0.5">
                      {selectedEntity.status}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 flex-wrap">
                      <span className="text-cyan-300 font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        <span>ห่างคุณ {selectedEntity.distanceMeters} ม.</span>
                      </span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>อีก ~{selectedEntity.etaMin} นาที</span>
                      </span>
                      {selectedEntity.rating && (
                        <span className="text-yellow-400 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{selectedEntity.rating}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(700);
                    setSelectedEntity(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Extra Details (License plate, Fare, Pickup note) */}
              {selectedEntity.vehicleModel && (
                <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs flex items-center justify-between text-slate-300">
                  <span>🏍️ ยานพาหนะ: <strong className="text-white">{selectedEntity.vehicleModel}</strong></span>
                  <span className="text-amber-300 font-mono text-[10px]">{selectedEntity.licensePlate}</span>
                </div>
              )}

              {selectedEntity.fareOrDeal && (
                <div className="px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs flex items-center justify-between">
                  <span className="text-emerald-300 font-bold">💰 ข้อเสนอ / ค่าโดยสาร:</span>
                  <span className="text-amber-400 font-black text-sm">{selectedEntity.fareOrDeal}</span>
                </div>
              )}

              {selectedEntity.pickupNote && (
                <div className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-[10px] text-slate-400">
                  <strong className="text-cyan-300">จุดสังเกต:</strong> {selectedEntity.pickupNote}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {selectedEntity.type === 'rider' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(950);
                        onBookRideWithRider?.(selectedEntity);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <Bike className="w-4 h-4 text-slate-950" />
                      <span>เรียกรถกับพี่วินท่านนี้ทันที</span>
                    </button>
                    {selectedEntity.phone && (
                      <a
                        href={`tel:${selectedEntity.phone}`}
                        className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1 border border-white/20"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>โทร</span>
                      </a>
                    )}
                  </>
                )}

                {selectedEntity.type === 'customer' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(950);
                      onAcceptJobFromCustomer?.(selectedEntity);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>กดรับงานลูกค้ารายนี้ทันที ({selectedEntity.fareOrDeal})</span>
                  </button>
                )}

                {selectedEntity.type === 'merchant' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(950);
                      onSelectEntity?.(selectedEntity);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-300 hover:to-pink-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    <Store className="w-4 h-4 text-slate-950" />
                    <span>ดูเมนู & ส่วนลดพิเศษของร้าน</span>
                  </button>
                )}

                {selectedEntity.type === 'transit_hub' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(950);
                      onSelectEntity?.(selectedEntity);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    <Train className="w-4 h-4 text-slate-950" />
                    <span>ดูจุดเชื่อมต่อและเรียกวินไปที่นี่</span>
                  </button>
                )}

                {onNavigateToEntity && (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(900);
                      onNavigateToEntity(selectedEntity);
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>นำทาง</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
