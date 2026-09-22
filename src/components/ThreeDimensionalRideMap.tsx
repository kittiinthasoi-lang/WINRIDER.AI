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


// Google Maps JavaScript API is disabled in FREE-ONLY mode.
// The app uses its no-cost OSM/coordinate fallbacks instead of a billable dynamic map.
const FREE_ONLY_MODE = true;
const GOOGLE_MAPS_API_KEY = FREE_ONLY_MODE ? '' : String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');

interface ThreeDimensionalRideMapProps {
  selectedDreamRide?: DreamRideVehicle;
  pickupLocation?: string;
  destinationLocation?: string;
  driverName?: string;
  driverPhone?: string;
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
  driverName = 'พี่วิน',
  driverPhone,
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
            {driverPhone && (
              <a
                href={`tel:${driverPhone.replace(/\D/g, '')}`}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>โทรหาคนขับ</span>
              </a>
            )}
          </div>       </div>
      </div>
    </div>
  );
};
