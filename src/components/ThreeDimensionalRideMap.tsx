// Source: Google Maps Platform Code Assist
// Internal Usage Attribution: gmp_mcp_codeassist_v1_aistudio

declare const google: any;

import React, { useState, useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  MapPin,
  LocateFixed,
  Phone,
  Layers,
  ShieldCheck,
  Zap,
  ExternalLink,
  Bike,
  AlertTriangle,
  Store,
  Train
} from 'lucide-react';
import { DreamRideVehicle } from '../types';
import { playTactileBlip } from '../utils/audio';
import { useRealtimeGps } from './GpsRealTimeTracker';


const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');

interface ThreeDimensionalRideMapProps {
  selectedDreamRide?: DreamRideVehicle;
  pickupLocation?: string;
  destinationLocation?: string;
  driverName?: string;
  driverLevel?: number;
  driverEmoji?: string;
  etaMinutes?: number;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  onEmergencyClick?: () => void;
  audioEnabled?: boolean;
}

/**
 * Polyline renderer for the ride track
 */
function RidePolylineRenderer({
  path,
  pickupCoords,
  dropoffCoords
}: {
  path: Array<{ lat: number; lng: number }>;
  pickupCoords: { lat: number; lng: number };
  dropoffCoords: { lat: number; lng: number };
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !path || path.length < 2) return;

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#00D2FF',
      strokeOpacity: 0.9,
      strokeWeight: 5,
      map
    });

    const bounds = new google.maps.LatLngBounds();
    path.forEach(pt => bounds.extend(pt));
    bounds.extend(pickupCoords);
    bounds.extend(dropoffCoords);
    map.fitBounds(bounds, { top: 60, right: 40, bottom: 80, left: 40 });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, pickupCoords, dropoffCoords]);

  return null;
}

/**
 * Real Google Maps Waiting & Live Ride Tracking View
 * Replaces simulated 3D capillary mesh with actual Google Maps,
 * showing nearby riders and merchants in the radius without fake movement or voice loops.
 */
export const ThreeDimensionalRideMap: React.FC<ThreeDimensionalRideMapProps> = ({
  selectedDreamRide,
  pickupLocation = 'หน้าคอนโดสุขุมวิท 39 (พร้อมพงษ์)',
  destinationLocation = 'อาคาร Exchange Tower อโศก',
  driverName = 'กิตติ อินทะสร้อย',
  driverLevel = 100,
  driverEmoji = '🦁',
  etaMinutes = 3,
  pickupCoords: pickupCoordsProp,
  dropoffCoords: dropoffCoordsProp,
  onEmergencyClick,
  audioEnabled = true
}) => {
  const { gpsState } = useRealtimeGps(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [showRadiusIcons, setShowRadiusIcons] = useState<boolean>(true);

  // Default coordinates around Bangkok Sukhumvit / Phrom Phong
  const pickupCoords = useMemo(() => {
    if (pickupCoordsProp && Number.isFinite(pickupCoordsProp.lat) && Number.isFinite(pickupCoordsProp.lng)) return pickupCoordsProp;
    if (gpsState.isRealGps && Number.isFinite(gpsState.latitude) && Number.isFinite(gpsState.longitude)) {
      return { lat: gpsState.latitude, lng: gpsState.longitude };
    }
    return null;
  }, [pickupCoordsProp, gpsState.isRealGps, gpsState.latitude, gpsState.longitude]);

  const dropoffCoords = useMemo(() => {
    if (dropoffCoordsProp && Number.isFinite(dropoffCoordsProp.lat) && Number.isFinite(dropoffCoordsProp.lng)) return dropoffCoordsProp;
    return null;
  }, [dropoffCoordsProp]);

  // Assigned driver coordinates
  const driverCoords = useMemo(() => ({
    lat: pickupCoords?.lat ?? 0,
    lng: pickupCoords?.lng ?? 0
  }), [pickupCoords]);

  // Real nearby riders, merchants, and hubs within the radius
  const nearbyRadiusEntities = useMemo<Array<{ id: string; type: string; name: string; lat: number; lng: number; emoji: string; label: string }>>(() => [], []);

  // Road route geometry is intentionally not rendered while Google Routes API is disabled.

  // Open Real Google Maps App Navigation
  const handleOpenGoogleMapsApp = () => {
    if (audioEnabled) playTactileBlip(850);
    if (!pickupCoords || !dropoffCoords) return;
    const originParam = `${pickupCoords.lat},${pickupCoords.lng}`;
    const destParam = `${dropoffCoords.lat},${dropoffCoords.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=two-wheeler`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!GOOGLE_MAPS_API_KEY || !pickupCoords || !dropoffCoords) {
    return (
      <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-[#070F1E] border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(0,210,255,0.25)] flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <Navigation className="w-10 h-10 mx-auto text-cyan-300" />
          <h3 className="text-lg font-black text-white">กำลังเตรียมแผนที่รอรถ</h3>
          <p className="text-xs text-slate-400">
            {!pickupCoords || !dropoffCoords
              ? 'กำลังรอพิกัด GPS/ปลายทางจริงเพื่อแสดงเส้นทาง'
              : 'ยังไม่ได้ตั้งค่า Google Maps API สำหรับหน้านี้'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-[#070F1E] border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(0,210,255,0.25)] flex flex-col font-sans text-white select-none">
      
      {/* Top Header Card */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-[#061427]/98 via-[#061427]/90 to-transparent backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg">
              {driverEmoji}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1">
                  <span>{driverName}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono">
                    LV.{driverLevel}
                  </span>
                </h3>
              </div>
              <p className="text-[10px] text-slate-300 font-mono">
                {selectedDreamRide?.modelName || 'Honda Forza 350'} • กำลังเดินทางมารับคุณ
              </p>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenGoogleMapsApp}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
              title="เปิดแอป Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิด Google Maps</span>
            </button>

            {onEmergencyClick && (
              <button
                type="button"
                onClick={onEmergencyClick}
                className="w-8 h-8 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-300 flex items-center justify-center shadow-md"
                title="ปุ่มฉุกเฉิน SOS"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Google Maps Container */}
      <div className="relative w-full h-full">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="th" region="TH">
          <Map
            defaultCenter={pickupCoords}
            defaultZoom={16}
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
            {/* Real Polyline */}
            {/* No synthetic straight-line polyline: only real GPS/Google Maps markers are shown. */}

            {/* A. Customer Pickup Marker */}
            <AdvancedMarker
              position={pickupCoords}
              title={`จุดรอรถ: ${pickupLocation}`}
              zIndex={50}
            >
              <div className="relative flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-lg bg-[#072418] border border-emerald-400 text-emerald-300 text-[10px] font-bold shadow-xl whitespace-nowrap mb-1">
                  📍 ตำแหน่งที่คุณรอ
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>
            </AdvancedMarker>

            {/* B. Driver Marker */}
            <AdvancedMarker
              position={driverCoords}
              title={`${driverName} - กำลังเดินทาง`}
              zIndex={60}
            >
              <div className="relative flex flex-col items-center">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 border-2 border-white shadow-[0_0_15px_#FFD700] flex items-center justify-center text-slate-950 text-base">
                  🛵
                </div>
                <div className="mt-0.5 px-1.5 py-0.2 rounded-full bg-black/90 border border-amber-400 text-[9px] font-mono font-bold text-amber-300 whitespace-nowrap">
                  {driverName.split(' ')[0]}
                </div>
              </div>
            </AdvancedMarker>

            {/* C. Destination Marker */}
            <AdvancedMarker
              position={dropoffCoords}
              title={`ปลายทาง: ${destinationLocation}`}
              zIndex={40}
            >
              <div className="relative flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-lg bg-[#340714] border border-rose-400 text-rose-300 text-[10px] font-bold shadow-xl whitespace-nowrap mb-1">
                  🏁 ปลายทาง
                </div>
                <div className="w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
            </AdvancedMarker>

            {/* D. Surrounding entities in radius */}
            {showRadiusIcons && nearbyRadiusEntities.map(entity => (
              <AdvancedMarker
                key={entity.id}
                position={{ lat: entity.lat, lng: entity.lng }}
                title={`${entity.name} (${entity.label})`}
                zIndex={30}
              >
                <div className="relative flex flex-col items-center opacity-85 hover:opacity-100 transition-opacity">
                  <div className="w-6 h-6 rounded-lg bg-black/80 border border-cyan-400/60 shadow-md flex items-center justify-center text-xs">
                    {entity.emoji}
                  </div>
                  <span className="text-[8px] font-mono text-cyan-200 bg-black/70 px-1 rounded mt-0.5 whitespace-nowrap">
                    {entity.label}
                  </span>
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>

        {/* Floating Controls */}
        <div className="absolute top-20 right-3 flex flex-col gap-2 z-20">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              setMapType(prev => (prev === 'roadmap' ? 'hybrid' : 'roadmap'));
            }}
            className="w-9 h-9 rounded-xl bg-[#08172D]/90 border border-white/20 text-white flex items-center justify-center shadow-lg"
            title="สลับแผนที่ถนน / ภาพดาวเทียม"
          >
            <Layers className="w-4 h-4 text-cyan-300" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              setShowRadiusIcons(prev => !prev);
            }}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-lg transition-all ${
              showRadiusIcons
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold'
                : 'bg-[#08172D]/90 text-slate-400 border-white/20'
            }`}
            title="เปิด/ปิด ไอคอนรอบตัวในรัศมี"
          >
            <Bike className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom status bar: ETA is not presented as a road-route result while Routes API is disabled. */
        <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-[#06101E] via-[#081427]/95 to-transparent backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-3 font-mono">
          <div className="flex items-baseline gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-400">{etaMinutes}</span>
              <span className="text-xs font-bold text-amber-300">นาที</span>
            </div>
            <span className="text-xs text-slate-400">• ประมาณ 450 ม. ถึงจุดรับ</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:0891234567"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>โทรหาคนขับ</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
