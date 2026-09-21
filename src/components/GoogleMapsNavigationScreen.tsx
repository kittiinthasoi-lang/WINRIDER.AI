// Source: Google Maps Platform Code Assist
// Internal Usage Attribution: gmp_mcp_codeassist_v1_aistudio

declare const google: any;

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  MessageSquare,
  Zap,
  CheckCircle2,
  Layers,
  ChevronRight,
  X,
  ExternalLink,
  ListOrdered
} from 'lucide-react';
import { playTactileBlip } from '../utils/audio';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { fetchDriverLiveLocation } from '../utils/dispatchSync';
import {
  computeLiveRoute,
  ComputedLiveRoute,
  LiveRouteStep
} from '../services/googleRoutesService';

const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
const GOOGLE_MAPS_MAP_ID = String(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID');

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
 * Native Google Maps Polyline and Bounds Renderer
 */
function MapRouteRenderer({
  path,
  driverPosition,
  pickupCoords,
  dropoffCoords,
  isFollowDriver,
  strokeColor = '#00D2FF'
}: {
  path: Array<{ lat: number; lng: number }>;
  driverPosition?: { lat: number; lng: number };
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  isFollowDriver: boolean;
  strokeColor?: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !path || path.length < 2) return;

    // 1. Draw Polyline
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: strokeColor,
      strokeOpacity: 0.95,
      strokeWeight: 6,
      map
    });

    // 2. Fit Bounds on initial path load
    if (!isFollowDriver) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach(pt => bounds.extend(pt));
      if (pickupCoords) bounds.extend(pickupCoords);
      if (dropoffCoords) bounds.extend(dropoffCoords);
      map.fitBounds(bounds, { top: 90, right: 40, bottom: 140, left: 40 });
    }

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, strokeColor, isFollowDriver, pickupCoords, dropoffCoords]);

  // Smoothly center on user/driver if follow mode active
  useEffect(() => {
    if (map && isFollowDriver && driverPosition) {
      map.panTo(driverPosition);
    }
  }, [map, isFollowDriver, driverPosition]);

  return null;
}

export const GoogleMapsNavigationScreen: React.FC<NavigationProps> = ({
  role = 'customer',
  initialPhase = 'approaching',
  driverName = 'ยังไม่มีข้อมูลพี่วิน',
  driverAvatar = '🛵',
  driverPlate = '',
  driverVehicle = '',
  driverPhone = '',
  passengerName = 'ผู้โดยสาร',
  pickupAddress = '',
  pickupCoords = { lat: 0, lng: 0 },
  dropoffAddress = '',
  dropoffCoords = { lat: 0, lng: 0 },
  fareBaht = 0,
  audioEnabled = true,
  onArrivedAtPickup,
  onArrivedAtDropoff,
  onRouteUpdate,
  onClose,
  onOpenChat
}) => {
  const { gpsState } = useRealtimeGps(true);

  // Current trip phase
  const [phase, setPhase] = useState<NavigationPhase>(initialPhase);
  const [isFollowDriver, setIsFollowDriver] = useState<boolean>(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [showStepsDrawer, setShowStepsDrawer] = useState<boolean>(false);

  // Real GPS speed in km/h (calculated directly from GPS hardware or 0 if stationary)
  const speedKmh = useMemo(() => {
    if (gpsState.speed && gpsState.speed > 0) {
      return Math.round(gpsState.speed * 3.6);
    }
    return 0;
  }, [gpsState.speed]);

  // Real position:
  // If role is driver and device has GPS, use real device GPS.
  // Never invent a position when GPS is unavailable.
  const driverPos = useMemo(() => {
    if (gpsState.latitude && gpsState.longitude) {
      return { lat: gpsState.latitude, lng: gpsState.longitude };
    }
    return null;
  }, [gpsState.latitude, gpsState.longitude, phase, pickupCoords]);

  // Active calculated route. Recalculate from real GPS periodically or after meaningful movement,
  // rather than on every GPS tick, so live navigation stays current without request bursts.
  const [liveRoute, setLiveRoute] = useState<ComputedLiveRoute | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(true);
  const lastRouteRequestRef = useRef<{ lat: number; lng: number; at: number; phase: NavigationPhase; destLat: number; destLng: number } | null>(null);

  // Calculate a real route from the Knight's current GPS to the active waypoint (CI verification branch).
  // Refresh on meaningful movement or after 10s so ETA/traffic stays current without
  // firing a Routes API request for every GPS update.
  useEffect(() => {
    let isCancelled = false;

    async function loadRoute() {
      const hasDriverPosition = Boolean(driverPos && Number.isFinite(driverPos.lat) && Number.isFinite(driverPos.lng));
      const destination = phase === 'approaching' ? pickupCoords : dropoffCoords;
      if (!hasDriverPosition || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng) || destination.lat === 0 && destination.lng === 0) {
        setLiveRoute(null);
        onRouteUpdate?.(null);
        setIsLoadingRoute(false);
        return;
      }

      const previous = lastRouteRequestRef.current;
      const movedMeters = previous && previous.phase === phase && previous.destLat === destination.lat && previous.destLng === destination.lng
        ? Math.hypot((driverPos!.lat - previous.lat) * 111_000, (driverPos!.lng - previous.lng) * 111_000 * Math.cos((driverPos!.lat * Math.PI) / 180))
        : Number.POSITIVE_INFINITY;
      const ageMs = previous ? Date.now() - previous.at : Number.POSITIVE_INFINITY;
      if (previous && previous.phase === phase && previous.destLat === destination.lat && previous.destLng === destination.lng && movedMeters < 75 && ageMs < 10_000) {
        return;
      }

      lastRouteRequestRef.current = {
        lat: driverPos!.lat,
        lng: driverPos!.lng,
        at: Date.now(),
        phase,
        destLat: destination.lat,
        destLng: destination.lng
      };
      setIsLoadingRoute(true);
      try {
        const destPt = phase === 'approaching'
          ? { latitude: pickupCoords.lat, longitude: pickupCoords.lng, name: pickupAddress }
          : { latitude: dropoffCoords.lat, longitude: dropoffCoords.lng, name: dropoffAddress };

        const res = await computeLiveRoute({
          origin: { latitude: driverPos!.lat, longitude: driverPos!.lng },
          destination: destPt,
          travelMode: 'TWO_WHEELER',
          routingPreference: 'TRAFFIC_AWARE'
        });

        if (!isCancelled) {
          setLiveRoute(res);
          onRouteUpdate?.(res.success ? res : null);
        }
      } catch (err) {
        console.warn('Routes calculation error:', err);
      } finally {
        if (!isCancelled) setIsLoadingRoute(false);
      }
    }

    void loadRoute();
    return () => { isCancelled = true; };
  }, [phase, driverPos?.lat, driverPos?.lng, pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng, pickupAddress, dropoffAddress]);

  // Launch Real Google Maps Turn-by-Turn Navigation on device
  const handleOpenNativeGoogleMaps = () => {
    if (audioEnabled) playTactileBlip(900);
    const dest = phase === 'approaching' ? pickupCoords : dropoffCoords;
    const destAddress = encodeURIComponent(phase === 'approaching' ? pickupAddress : dropoffAddress);
    
    // Check if origin is available from real GPS
    const originParam = gpsState.latitude && gpsState.longitude
      ? `&origin=${gpsState.latitude},${gpsState.longitude}`
      : '';

    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${dest.lat},${dest.lng}&destination_place_id=&travelmode=two-wheeler`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden bg-[#070F1E] border-2 border-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col font-sans select-none text-white">
      
      {/* ========================================================================= */}
      {/* 1. TOP STATUS BAR */}
      {/* ========================================================================= */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 bg-gradient-to-b from-[#061427]/98 via-[#061427]/90 to-transparent backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          
          {/* Status Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <Navigation className="w-5 h-5 text-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono font-bold">
                  {phase === 'approaching' ? 'พี่วินกำลังเดินทางมารับ' : 'มุ่งหน้าสู่ปลายทาง'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {role === 'driver' ? 'โหมดคนขับ' : 'โหมดผู้โดยสาร'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white line-clamp-1">
                {phase === 'approaching' ? pickupAddress : dropoffAddress}
              </h2>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-1.5">
            {/* Real Google Maps Turn-by-Turn Button */}
            <button
              type="button"
              onClick={handleOpenNativeGoogleMaps}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
              title="เปิดนำทางด้วย Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เปิดแอป</span>
              <span>Google Maps</span>
            </button>

            {/* Turn-by-Turn Steps Toggle */}
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(750);
                setShowStepsDrawer(prev => !prev);
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                showStepsDrawer
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                  : 'bg-black/50 text-slate-200 border-white/10 hover:bg-black/70'
              }`}
              title="ดูรายการเลี้ยวทั้งหมด"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-black/40 hover:bg-black/60 text-white flex items-center justify-center border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE GOOGLE MAP */}
      {/* ========================================================================= */}
      <div className="relative w-full h-full">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="th" region="TH">
          <Map
            defaultCenter={pickupCoords}
            defaultZoom={16}
            mapId={GOOGLE_MAPS_MAP_ID}
            mapTypeId={mapType}
            gestureHandling="greedy"
            fullscreenControl={false}
            streetViewControl={false}
            mapTypeControl={false}
            zoomControl={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Real Route Polyline */}
            <MapRouteRenderer
              path={liveRoute?.polylineCoordinates || []}
              driverPosition={driverPos || undefined}
              pickupCoords={pickupCoords}
              dropoffCoords={dropoffCoords}
              isFollowDriver={isFollowDriver}
              strokeColor={phase === 'approaching' ? '#38BDF8' : '#10B981'}
            />

            {/* A. Pickup Location Marker */}
            <AdvancedMarker
              position={pickupCoords}
              title={`จุดรับ: ${pickupAddress}`}
              zIndex={40}
            >
              <div className="relative flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-lg bg-[#062417] border border-emerald-400 text-emerald-300 text-[10px] font-bold shadow-xl whitespace-nowrap mb-1">
                  🟢 จุดขึ้นรถ ({passengerName.split(' ')[0]})
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
            </AdvancedMarker>

            {/* B. Dropoff Location Marker */}
            <AdvancedMarker
              position={dropoffCoords}
              title={`ปลายทาง: ${dropoffAddress}`}
              zIndex={40}
            >
              <div className="relative flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-lg bg-[#380916] border border-rose-400 text-rose-300 text-[10px] font-bold shadow-xl whitespace-nowrap mb-1">
                  🏁 ปลายทาง
                </div>
                <div className="w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
            </AdvancedMarker>

            {/* C. Real Rider/Vehicle Marker */}
            {driverPos && <AdvancedMarker
              position={driverPos}
              title={`${driverName} - ${driverVehicle}`}
              zIndex={60}
            >
              <div className="relative flex flex-col items-center">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 border-2 border-white shadow-[0_0_20px_#FFD700] flex items-center justify-center text-slate-950 text-lg">
                  {driverAvatar}
                </div>
                <div className="mt-0.5 px-2 py-0.5 rounded-full bg-slate-950/90 border border-amber-400 text-[9px] font-mono font-bold text-amber-300 shadow-md whitespace-nowrap">
                  {driverPlate}
                </div>
              </div>
            </AdvancedMarker>}
          </Map>
        </APIProvider>

        {/* ========================================================================= */}
        {/* 3. FLOATING MAP CONTROLS */}
        {/* ========================================================================= */}
        <div className="absolute top-20 right-3 flex flex-col gap-2 z-20">
          {/* Center on current position */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setIsFollowDriver(prev => !prev);
            }}
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-xl transition-all ${
              isFollowDriver
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-bold'
                : 'bg-[#08172D]/90 text-cyan-300 border-cyan-400/40'
            }`}
            title="ล็อกจุดกึ่งกลางตามตำแหน่ง"
          >
            <LocateFixed className="w-4 h-4" />
          </button>

          {/* Map Type Toggle */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              setMapType(prev => (prev === 'roadmap' ? 'hybrid' : 'roadmap'));
            }}
            className="w-10 h-10 rounded-2xl bg-[#08172D]/90 border border-white/20 text-white flex items-center justify-center shadow-xl"
            title="สลับแผนที่ถนน / ดาวเทียม"
          >
            <Layers className="w-4 h-4 text-emerald-300" />
          </button>

          {/* Real Speedometer Badge */}
          <div className="w-10 h-10 rounded-2xl bg-black/85 border border-white/20 text-white flex flex-col items-center justify-center shadow-xl font-mono">
            <span className="text-xs font-black leading-none text-emerald-400">{speedKmh}</span>
            <span className="text-[7px] text-slate-400 leading-none">km/h</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. REAL TURN-BY-TURN STEPS DRAWER */}
        {/* ========================================================================= */}
        {showStepsDrawer && liveRoute && liveRoute.steps && (
          <div className="absolute top-20 left-3 right-16 max-h-72 overflow-y-auto z-20 p-3 rounded-2xl bg-[#061427]/95 backdrop-blur-md border border-emerald-500/40 shadow-2xl space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <span className="font-bold text-emerald-300 flex items-center gap-1">
                <ListOrdered className="w-3.5 h-3.5" /> รายละเอียดเส้นทางนำทางจริง
              </span>
              <button
                type="button"
                onClick={() => setShowStepsDrawer(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {liveRoute.steps.map((step, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <div className="flex-1 text-[11px]">
                    <p className="text-slate-200">{step.instructions}</p>
                    <p className="text-[9px] text-slate-400 pt-0.5">ระยะทาง: {step.distanceMeters} ม.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. BOTTOM TRIP SUMMARY & ACTIONS */}
        {/* ========================================================================= */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-3.5 bg-gradient-to-t from-[#06101E] via-[#081427]/98 to-[#081427]/90 backdrop-blur-md border-t-2 border-white/10 shadow-2xl space-y-2.5 font-mono">
          <div className="flex items-center justify-between gap-3">
            {/* Real ETA & Distance */}
            <div className="flex items-baseline gap-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-400 tracking-tight">
                  {liveRoute?.totalDurationMinutes ?? (isLoadingRoute ? '…' : '—')}
                </span>
                <span className="text-xs font-bold text-emerald-300">นาที</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>•</span>
                <span className="font-bold text-white">
                  {liveRoute?.totalDistanceKm || (isLoadingRoute ? 'กำลังคำนวณ' : '—')}
                </span>
                <span>•</span>
                <span className="text-slate-400 text-[11px]">
                  ค่าโดยสาร: <strong className="text-amber-300 font-bold">฿{fareBaht}</strong>
                </span>
              </div>
            </div>

            {/* Quick Actions: Call & Chat */}
            <div className="flex items-center gap-1.5">
              {onOpenChat && (
                <button
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    onOpenChat();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>แชท</span>
                </button>
              )}

              {driverPhone && (
                <a
                  href={`tel:${driverPhone}`}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>โทร</span>
                </a>
              )}
            </div>
          </div>

          {/* Progression Actions */}
          <div className="flex items-center gap-2 pt-0.5">
            {phase === 'approaching' ? (
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(950);
                  setPhase('in_transit');
                  onArrivedAtPickup?.();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>
                  {role === 'driver'
                    ? '🛵 ถึงจุดรับลูกค้าแล้ว (กดเริ่มเดินทางไปส่ง)'
                    : '🛵 พี่วินมาถึงแล้ว (ขึ้นรถเพื่อเริ่มเดินทาง)'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(950);
                  setPhase('completed');
                  onArrivedAtDropoff?.();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>
                  {role === 'driver'
                    ? `🏁 ถึงปลายทางส่งลูกค้าแล้ว (รับค่าโดยสาร ฿${fareBaht})`
                    : '🏁 ถึงที่หมายเรียบร้อย (ดูรายละเอียดชำระเงิน)'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
