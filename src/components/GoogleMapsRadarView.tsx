import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  RefreshCw,
  Search,
  ExternalLink,
  Phone,
  Bike,
  User,
  Store,
  Building2,
  Train,
  Zap,
  LocateFixed,
  Navigation,
  Sparkles,
  X,
  Compass,
  Radio,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { playTactileBlip, playRadarScan } from '../utils/audio';
import { auth } from '../firebase';

export type RadarPerspective = 'driver' | 'customer' | 'merchant' | 'partner';

export type PublicPlace = {
  id: string;
  name: string;
  category: string;
  primaryType: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  openNow: boolean | null;
  distanceMeters: number;
  placeGroup:
    | 'driver'
    | 'customer'
    | 'shop'
    | 'restaurant'
    | 'transport'
    | 'partner'
    | 'partner_station'
    | 'hospital'
    | 'emergency'
    | 'landmark'
    | 'mall'
    | 'hotel'
    | 'school'
    | 'faith'
    | 'stadium'
    | 'music_studio'
    | 'community';
  categoryLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  externalMapUrl?: string;
  phone?: string;
  etaMin?: number;
};

export type MapRadarEntity = {
  id: string;
  name: string;
  type: 'rider' | 'customer' | 'merchant' | 'transit_hub' | 'partner';
  avatar: string;
  categoryLabel: string;
  distanceKm: number;
  etaMin: number;
  rating?: number;
  status: string;
  address?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  sourceUrl?: string;
  externalMapUrl?: string;
};

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
  onSelectDestinationForRide?: (entity: MapRadarEntity) => void | Promise<void>;
  onBackToHome?: () => void;
}

export const GoogleMapsRadarView: React.FC<GoogleMapsRadarViewProps> = ({
  targetPerspective = 'customer',
  venueName,
  radiusKm: initialRadiusKm = 5,
  height = '620px',
  audioEnabled = true,
  onSelectEntity,
  onBookRideWithRider,
  onAcceptJobFromCustomer,
  onSelectDestinationForRide,
  onBackToHome,
}) => {
  const { gpsState, acquireCurrentGps } = useRealtimeGps(true);

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRangeKm, setSelectedRangeKm] = useState<number>(initialRadiusKm);

  // Data states
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Real GPS or Bangkok City Center fallback
  const userLat = gpsState.isRealGps && gpsState.latitude ? gpsState.latitude : 13.7563;
  const userLng = gpsState.isRealGps && gpsState.longitude ? gpsState.longitude : 100.5018;

  // Leaflet map container refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Fetch real surroundings data from backend
  const loadPlaces = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken().catch(() => '') : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/radar/nearby-places', {
        method: 'POST',
        headers,
        body: JSON.stringify({ latitude: userLat, longitude: userLng }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลแผนที่จริงไม่สำเร็จ');

      const loaded = Array.isArray(data.places) ? data.places : [];
      setPlaces(loaded);
      if (loaded.length > 0 && !selectedPlaceId) {
        setSelectedPlaceId(loaded[0].id);
      }
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlaces();
  }, [userLat, userLng]);

  // Selected Place helper
  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return places.find((p) => p.id === selectedPlaceId) || null;
  }, [places, selectedPlaceId]);

  // Filtered Places by Range, Category, and Search Query
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      // Range check
      if (p.distanceMeters > selectedRangeKm * 1000) return false;

      // Category check
      if (activeCategory !== 'all') {
        if (activeCategory === 'transport') {
          if (p.placeGroup !== 'transport') return false;
        } else if (activeCategory === 'driver') {
          if (p.placeGroup !== 'driver') return false;
        } else if (activeCategory === 'customer') {
          if (p.placeGroup !== 'customer') return false;
        } else if (activeCategory === 'merchant') {
          if (p.placeGroup !== 'shop' && p.placeGroup !== 'restaurant') return false;
        } else if (activeCategory === 'partner') {
          if (p.placeGroup !== 'partner' && p.placeGroup !== 'partner_station') return false;
        } else if (activeCategory === 'hospital') {
          if (p.placeGroup !== 'hospital') return false;
        } else if (activeCategory === 'emergency') {
          if (p.placeGroup !== 'emergency') return false;
        } else if (activeCategory === 'landmark') {
          if (p.placeGroup !== 'landmark' && p.placeGroup !== 'mall') return false;
        } else if (activeCategory !== p.placeGroup) {
          return false;
        }
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${p.name} ${p.address} ${p.categoryLabel || ''} ${p.primaryType || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [places, selectedRangeKm, activeCategory, searchQuery]);

  // Convert PublicPlace to MapRadarEntity for callbacks
  const toEntity = (place: PublicPlace): MapRadarEntity => {
    const isDriver = place.placeGroup === 'driver';
    const isCustomer = place.placeGroup === 'customer';
    const isTransport = place.placeGroup === 'transport';
    const isPartner = place.placeGroup === 'partner' || place.placeGroup === 'partner_station';
    const isMerchant = place.placeGroup === 'shop' || place.placeGroup === 'restaurant';

    const entityType: MapRadarEntity['type'] = isDriver
      ? 'rider'
      : isCustomer
      ? 'customer'
      : isTransport
      ? 'transit_hub'
      : isPartner
      ? 'partner'
      : isMerchant
      ? 'merchant'
      : 'merchant';

    let avatar = '📍';
    if (isDriver) avatar = '🏍️';
    else if (isCustomer) avatar = '👤';
    else if (isTransport) avatar = '🚉';
    else if (isPartner) avatar = '⚡';
    else if (place.placeGroup === 'restaurant') avatar = '🍜';
    else if (place.placeGroup === 'mall') avatar = '🛍️';
    else if (place.placeGroup === 'hotel') avatar = '🏨';
    else if (place.placeGroup === 'hospital') avatar = '🏥';
    else if (place.placeGroup === 'emergency') avatar = '🚨';
    else if (place.placeGroup === 'landmark') avatar = '🏛️';
    else if (place.placeGroup === 'faith') avatar = '🪷';

    const distKm = place.distanceMeters / 1000;
    const etaMin = Math.max(2, Math.round(distKm * 2.5 + 2));

    return {
      id: place.id,
      name: place.name,
      type: entityType,
      avatar,
      categoryLabel: place.categoryLabel || place.primaryType || 'สถานที่',
      distanceKm: distKm,
      etaMin,
      rating: place.rating || undefined,
      status: place.openNow ? 'เปิดให้บริการ' : 'พร้อมบริการ',
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      phone: place.phone,
      sourceUrl: place.sourceUrl,
      externalMapUrl: place.externalMapUrl,
    };
  };

  // Helper function to build custom DivIcon for Leaflet Map
  const getMarkerDivIcon = (p: PublicPlace, isSelected: boolean) => {
    let iconEmoji = '📍';
    let badgeColor = 'bg-cyan-500/90 text-slate-950 border-cyan-300';
    let ringColor = 'border-cyan-400';

    if (p.placeGroup === 'transport') {
      iconEmoji = '🚉';
      badgeColor = 'bg-blue-500 text-white border-blue-300';
      ringColor = 'border-blue-400';
    } else if (p.placeGroup === 'driver') {
      iconEmoji = '🏍️';
      badgeColor = 'bg-amber-400 text-slate-950 border-amber-200';
      ringColor = 'border-amber-400';
    } else if (p.placeGroup === 'customer') {
      iconEmoji = '👤';
      badgeColor = 'bg-rose-500 text-white border-rose-300';
      ringColor = 'border-rose-400';
    } else if (p.placeGroup === 'shop' || p.placeGroup === 'restaurant') {
      iconEmoji = p.placeGroup === 'restaurant' ? '🍜' : '🏪';
      badgeColor = 'bg-emerald-500 text-slate-950 border-emerald-300';
      ringColor = 'border-emerald-400';
    } else if (p.placeGroup === 'partner' || p.placeGroup === 'partner_station') {
      iconEmoji = '⚡';
      badgeColor = 'bg-yellow-400 text-slate-950 border-yellow-200';
      ringColor = 'border-yellow-400';
    } else if (p.placeGroup === 'hospital') {
      iconEmoji = '🏥';
      badgeColor = 'bg-red-500 text-white border-red-300';
      ringColor = 'border-red-400';
    } else if (p.placeGroup === 'emergency') {
      iconEmoji = '🚨';
      badgeColor = 'bg-rose-600 text-white border-rose-300';
      ringColor = 'border-rose-400';
    } else if (p.placeGroup === 'mall') {
      iconEmoji = '🛍️';
      badgeColor = 'bg-pink-500 text-white border-pink-300';
      ringColor = 'border-pink-400';
    } else if (p.placeGroup === 'landmark') {
      iconEmoji = '🏛️';
      badgeColor = 'bg-purple-500 text-white border-purple-300';
      ringColor = 'border-purple-400';
    }

    const shortName = p.name.length > 20 ? `${p.name.slice(0, 18)}...` : p.name;
    const distText = p.distanceMeters < 1000 ? `${p.distanceMeters}ม.` : `${(p.distanceMeters / 1000).toFixed(1)}กม.`;

    const html = `
      <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200 hover:scale-110 select-none">
        ${isSelected ? '<div class="absolute -inset-2 rounded-full bg-cyan-400/40 animate-ping"></div>' : ''}
        <div class="flex items-center gap-1 rounded-full px-2 py-0.5 shadow-lg border-2 ${badgeColor} ${ringColor} ${isSelected ? 'ring-2 ring-white scale-110 shadow-[0_0_15px_rgba(34,211,238,0.8)]' : ''}">
          <span class="text-xs leading-none">${iconEmoji}</span>
          <span class="text-[9px] font-black leading-none whitespace-nowrap max-w-[110px] truncate">${shortName}</span>
          <span class="text-[8px] font-mono opacity-80 pl-0.5">${distText}</span>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'win-real-map-marker',
      html,
      iconSize: [120, 26],
      iconAnchor: [60, 13],
    });
  };

  // Leaflet Map Initialization & Markers Rendering
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLat, userLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // User location marker with glowing radar ping
      const userIconHtml = `
        <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute h-10 w-10 rounded-full bg-cyan-400 opacity-50 animate-ping"></div>
          <div class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl text-sm font-black text-white">
            📍
          </div>
          <div class="mt-1 whitespace-nowrap rounded-md bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-black text-cyan-300 border border-cyan-400/40 shadow">
            คุณอยู่ที่นี่
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        className: 'user-gps-marker',
        html: userIconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Update user marker position
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    }

    // Clear existing place markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Render markers for filtered places (up to 120 markers)
    const displayList = filteredPlaces.slice(0, 120);
    displayList.forEach((place) => {
      const isSelected = place.id === selectedPlaceId;
      const marker = L.marker([place.latitude, place.longitude], {
        icon: getMarkerDivIcon(place, isSelected),
        zIndexOffset: isSelected ? 1500 : 500,
      }).addTo(map);

      marker.on('click', () => {
        if (audioEnabled) playTactileBlip(850);
        setSelectedPlaceId(place.id);
        if (onSelectEntity) {
          onSelectEntity(toEntity(place));
        }
      });

      markersRef.current.push(marker);
    });

    // Draw dashed connection line to selected place
    if (selectedPlace) {
      const lineCoords: [number, number][] = [
        [userLat, userLng],
        [selectedPlace.latitude, selectedPlace.longitude],
      ];

      if (polylineRef.current) {
        polylineRef.current.setLatLngs(lineCoords);
      } else {
        polylineRef.current = L.polyline(lineCoords, {
          color: '#22d3ee',
          weight: 3,
          dashArray: '6, 6',
          opacity: 0.85,
        }).addTo(map);
      }
    } else if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
  }, [userLat, userLng, filteredPlaces, selectedPlaceId, selectedPlace, audioEnabled]);

  // Recenter Map on User GPS
  const handleRecenter = () => {
    if (audioEnabled) playTactileBlip(900);
    acquireCurrentGps();
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([userLat, userLng], 15, { animate: true });
    }
  };

  // Open in native Google Maps
  const handleOpenExternalMaps = (place: PublicPlace) => {
    if (audioEnabled) playTactileBlip(950);
    const url = place.externalMapUrl || `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Category pills with place counts
  const categoryPills = useMemo(() => {
    const transitCount = places.filter((p) => p.placeGroup === 'transport').length;
    const driverCount = places.filter((p) => p.placeGroup === 'driver').length;
    const customerCount = places.filter((p) => p.placeGroup === 'customer').length;
    const merchantCount = places.filter((p) => p.placeGroup === 'shop' || p.placeGroup === 'restaurant').length;
    const partnerCount = places.filter((p) => p.placeGroup === 'partner' || p.placeGroup === 'partner_station').length;
    const landmarkCount = places.filter((p) => p.placeGroup === 'landmark' || p.placeGroup === 'mall').length;
    const hospitalCount = places.filter((p) => p.placeGroup === 'hospital').length;
    const emergencyCount = places.filter((p) => p.placeGroup === 'emergency').length;

    return [
      { id: 'all', label: '🌐 ทั้งหมด', count: filteredPlaces.length },
      { id: 'transport', label: '🚉 สถานีรถไฟฟ้า & ขนส่ง (BTS/MRT)', count: transitCount },
      { id: 'driver', label: '🏍️ พี่วินรอบตัว', count: driverCount },
      { id: 'customer', label: '👤 ผู้โดยสารรอรถ', count: customerCount },
      { id: 'merchant', label: '🏪 ร้านค้า & ร้านอาหาร', count: merchantCount },
      { id: 'partner', label: '⚡ พาร์ทเนอร์ & EV', count: partnerCount },
      { id: 'landmark', label: '🏛️ แหล่งท่องเที่ยว & ห้าง', count: landmarkCount },
      { id: 'hospital', label: '🏥 โรงพยาบาล & คลินิก', count: hospitalCount },
      { id: 'emergency', label: '🚨 ตำรวจ & กู้ภัย', count: emergencyCount },
    ];
  }, [places, filteredPlaces.length]);

  return (
    <div
      className="relative flex flex-col w-full h-full max-w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-[#07111f] text-white shadow-2xl"
      style={{ minHeight: height || '480px' }}
    >
      {/* 1. TOP HEADER: TITLE, GPS STATUS, RANGE SELECTOR & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 bg-black/50 p-3 sm:p-4 backdrop-blur-md max-w-full">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            <MapPin className="h-5 w-5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                WIN REAL MAP RADAR
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-300 border border-emerald-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>GPS จริง</span>
              </span>
            </div>
            <h2 className="text-sm font-black text-white truncate mt-0.5">
              {venueName || 'แผนที่จริงรอบตัว: สถานีขนส่ง • พี่วิน • ลูกค้า • ร้านค้า • พาร์ทเนอร์'}
            </h2>
          </div>
        </div>

        {/* Action Buttons & Radius chips */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Radius selector */}
          <div className="flex items-center gap-1 text-[11px] font-mono bg-black/40 border border-white/10 rounded-xl p-1">
            <span className="text-slate-400 text-[10px] px-1 hidden sm:inline">รัศมี:</span>
            {[1, 2.5, 5, 10, 20].map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setSelectedRangeKm(km);
                }}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all ${
                  selectedRangeKm === km
                    ? 'bg-cyan-400 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {km}k
              </button>
            ))}
          </div>

          {/* Recenter GPS */}
          <button
            type="button"
            onClick={handleRecenter}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-white/5 text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition-all shadow"
            title="จัดกึ่งกลางตำแหน่ง GPS"
          >
            <LocateFixed className="h-4 w-4" />
          </button>

          {/* Refresh places */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playRadarScan();
              void loadPlaces();
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
            title="สแกนสถานที่ใหม่"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
              title="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. SEARCH BAR & HORIZONTAL CATEGORY FILTER PILLS (NO OVERFLOW) */}
      <div className="border-b border-white/10 bg-[#071328] p-2.5 sm:p-3 space-y-2 max-w-full">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาสถานี (BTS/MRT), พี่วิน, ลูกค้า, ร้านค้า, พาร์ทเนอร์ หรือสถานที่..."
            className="w-full rounded-xl bg-black/60 border border-white/15 pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-400 outline-none focus:border-cyan-400 transition-all font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar max-w-full">
          {categoryPills.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setActiveCategory(cat.id);
              }}
              className={`whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* 3. FULL INTERACTIVE REAL MAP VIEW CONTAINER */}
      <div className="relative flex-1 w-full min-h-[260px] overflow-hidden bg-[#050C18]">
        <div ref={mapContainerRef} className="h-full w-full z-10" />

        {/* Map Legend Overlay (Top Left of Map) */}
        <div className="absolute top-2.5 left-2.5 z-[900] pointer-events-none max-w-[calc(100vw-60px)]">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/85 px-2.5 py-1 backdrop-blur-md text-[9px] font-mono text-cyan-300 shadow">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="truncate">พบ {filteredPlaces.length} แห่งในรัศมี {selectedRangeKm} กม.</span>
          </div>
        </div>

        {/* Floating Selected Place Card (Bottom of Map) */}
        {selectedPlace && (
          <div className="absolute bottom-2 left-2 right-2 z-[950] max-w-full animate-fade-in">
            <div className="rounded-2xl border-2 border-cyan-400/50 bg-[#07132B]/95 p-3 sm:p-4 backdrop-blur-md shadow-2xl space-y-2.5 max-w-full overflow-hidden">
              <div className="flex items-start justify-between gap-2 max-w-full">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/20 border border-cyan-400/40 text-xl shadow">
                    {toEntity(selectedPlace).avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                        {selectedPlace.name}
                      </h3>
                      <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[8px] sm:text-[9px] font-bold text-cyan-300 border border-cyan-400/30 whitespace-nowrap">
                        {selectedPlace.categoryLabel || selectedPlace.primaryType}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-300 truncate mt-0.5">
                      {selectedPlace.address}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] sm:text-[10px] text-cyan-300 font-mono font-bold flex-wrap">
                      <span>{(selectedPlace.distanceMeters / 1000).toFixed(2)} กม.</span>
                      <span>• เดินทาง ~{toEntity(selectedPlace).etaMin} นาที</span>
                      {selectedPlace.phone && <span>• โทร: {selectedPlace.phone}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPlaceId(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Action Buttons Row (Responsive Wrapping, No Overflow) */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
                {/* Book Ride to this Location / Station */}
                {onSelectDestinationForRide && (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(950);
                      void onSelectDestinationForRide(toEntity(selectedPlace));
                    }}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-2 px-3 text-xs font-black text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow"
                  >
                    <Bike className="h-3.5 w-3.5" />
                    <span>เรียกรถไปที่นี่</span>
                  </button>
                )}

                {/* If selected place is a driver */}
                {selectedPlace.placeGroup === 'driver' && onBookRideWithRider && (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(1000);
                      onBookRideWithRider(toEntity(selectedPlace));
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2 px-3 text-xs font-black text-slate-950 hover:bg-amber-300 active:scale-95 transition-all shadow"
                  >
                    <Bike className="h-3.5 w-3.5" />
                    <span>เรียกรถกับพี่วินคนนี้</span>
                  </button>
                )}

                {/* If selected place is a waiting customer */}
                {selectedPlace.placeGroup === 'customer' && onAcceptJobFromCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(1000);
                      onAcceptJobFromCustomer(toEntity(selectedPlace));
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 py-2 px-3 text-xs font-black text-slate-950 hover:bg-emerald-300 active:scale-95 transition-all shadow"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>รับงานทันที</span>
                  </button>
                )}

                {/* Google Maps Real Turn-by-Turn Navigation */}
                <button
                  type="button"
                  onClick={() => handleOpenExternalMaps(selectedPlace)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/10 py-2 px-3 text-xs font-bold text-slate-200 hover:bg-white/20 active:scale-95 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Google Maps</span>
                </button>

                {/* Phone Call Button */}
                {selectedPlace.phone && (
                  <a
                    href={`tel:${selectedPlace.phone}`}
                    className="flex items-center justify-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/15 py-2 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 active:scale-95 transition-all"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>โทร</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleMapsRadarView;
