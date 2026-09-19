import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Navigation, 
  Layers, 
  Eye, 
  Maximize2, 
  Compass, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  MapPin,
  RotateCw,
  Sliders,
  LocateFixed,
  Flame,
  Volume2,
  VolumeX,
  Box,
  Layers3,
  Shield,
  Smartphone,
  Store,
  Users,
  Building2,
  BatteryCharging,
  Wrench,
  Coffee,
  Package,
  HeartHandshake,
  CheckCircle2,
  ChevronRight,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  Route,
  Camera,
  X,
  Crosshair,
  Clock,
  Leaf,
  Globe
} from 'lucide-react';
import { Vehicle } from '../types';
import { playTactileBlip, playRadarScan, playEngineRev, speakThaiText } from '../utils/audio';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { GoogleMapsLiveView } from './GoogleMapsLiveView';
import { CyberGraphic } from './CyberGraphic';
import { ARLiveCameraNavigation, ARManeuverType } from './ARLiveCameraNavigation';
import { 
  RadarNavRoute, 
  RadarNavStep, 
  calculateHaversineMeters, 
  CAPILLARY_PRESET_ROUTES, 
  generateRouteToPing 
} from '../data/radarNavigationData';
import { RadarRoutePlannerModal } from './RadarRoutePlannerModal';

export type RadarCategory = 'all' | 'customer' | 'shop' | 'partner' | 'driver';

export interface Radar3DPing {
  id: string;
  name: string;
  avatar: string;
  imageUrl?: string;
  category: 'customer' | 'shop' | 'partner' | 'driver';
  categoryLabel: string;
  service: string;
  serviceEmoji: string;
  serviceType: 'knight' | 'express' | 'pet' | 'mu' | 'spirit';
  fare: number;
  distanceMeters: number;
  location: string;
  // Normalized 3D radar coordinate (-100 to 100 on X and Y, elevation Z 0 to 60)
  x: number;
  y: number;
  elevation: number;
  urgency: 'normal' | 'high' | 'urgent';
  specialNote?: string;
  badge: string;
  details?: string;
}

interface ThreeDimensionalDriverRadarProps {
  activeVehicle: Vehicle;
  isOnDuty: boolean;
  driverLevel: number;
  audioEnabled: boolean;
  onTriggerJob?: (serviceType: 'knight' | 'express' | 'pet' | 'mu' | 'spirit') => void;
  onSelectPing?: (ping: Radar3DPing) => void;
}

const LIVE_RADAR_PINGS: Radar3DPing[] = [];

export const ThreeDimensionalDriverRadar: React.FC<ThreeDimensionalDriverRadarProps> = ({
  activeVehicle,
  isOnDuty,
  driverLevel,
  audioEnabled,
  onTriggerJob,
  onSelectPing
}) => {
  // 3D Camera & Visual State
  const [cameraMode, setCameraMode] = useState<'hologram_orbit' | 'cockpit_hud' | 'top_tactical'>('hologram_orbit');
  const [pitch, setPitch] = useState<number>(58); // rotateX in deg
  const [rotationZ, setRotationZ] = useState<number>(-20); // rotateZ in deg
  const [zoom, setZoom] = useState<number>(1);
  const [floatingHeightMultiplier, setFloatingHeightMultiplier] = useState<number>(1.2); // 0.8x to 2.0x
  const [show3DBuildings, setShow3DBuildings] = useState<boolean>(true);
  const [showCapillaryPaths, setShowCapillaryPaths] = useState<boolean>(true);
  const [showLaserBeacons, setShowLaserBeacons] = useState<boolean>(true);
  const [showGroundShadows, setShowGroundShadows] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<RadarCategory>('all');
  const [filterService, setFilterService] = useState<'all' | 'knight' | 'express' | 'pet' | 'mu' | 'spirit'>('all');
  const [selectedPing, setSelectedPing] = useState<Radar3DPing | null>(LIVE_RADAR_PINGS[0]);
  const [radarSweepAngle, setRadarSweepAngle] = useState<number>(0);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);

  // Realtime Live GPS Hook
  const { gpsState, acquireCurrentGps } = useRealtimeGps(true);
  const [gpsToast, setGpsToast] = useState<string | null>(null);

  // Real-time Turn-by-Turn Navigation & AR Camera State
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [isArCameraOpen, setIsArCameraOpen] = useState<boolean>(false);
  const [activeNavRoute, setActiveNavRoute] = useState<RadarNavRoute | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [currentStepRemainingDist, setCurrentStepRemainingDist] = useState<number>(0);

  // Real-time Step Detection via Haversine Distance Calculation
  useEffect(() => {
    if (!isNavigating || !activeNavRoute) return;
    const currentStep = activeNavRoute.steps[activeStepIndex];
    if (!currentStep) return;

    const dist = calculateHaversineMeters(
      gpsState.latitude,
      gpsState.longitude,
      currentStep.targetCoord.lat,
      currentStep.targetCoord.lng
    );

    // Update remaining distance
    setCurrentStepRemainingDist(dist > 0 ? dist : currentStep.distanceMeters);

    // Auto-advance if within 20 meters of waypoint
    if (dist < 20 && activeStepIndex < activeNavRoute.steps.length - 1) {
      const nextIdx = activeStepIndex + 1;
      setActiveStepIndex(nextIdx);
      if (audioEnabled) playTactileBlip(950);
      const nextStep = activeNavRoute.steps[nextIdx];
      speakThaiText(nextStep.instruction, 'fah_sai');
    }
  }, [gpsState.latitude, gpsState.longitude, isNavigating, activeNavRoute, activeStepIndex, audioEnabled]);

  const handleLocateMe = () => {
    if (audioEnabled) playTactileBlip(900);
    acquireCurrentGps();
    setGpsToast(`🛰️ ล็อคพิกัดดาวเทียมสำเร็จ (${gpsState.latitude.toFixed(4)}, ${gpsState.longitude.toFixed(4)})`);
    speakThaiText('เชื่อมต่อพิกัดดาวเทียมเรียบร้อยแล้วค่ะ', 'fah_sai');
    setTimeout(() => setGpsToast(null), 4000);
  };

  const handleStartNavigation = (route: RadarNavRoute) => {
    setActiveNavRoute(route);
    setActiveStepIndex(0);
    setIsNavigating(true);
    setCurrentStepRemainingDist(route.steps[0].distanceMeters);
    if (audioEnabled) playEngineRev();
    speakThaiText(`เริ่มการนำทางเรียลไทม์สู่ ${route.destinationName} ค่ะ ${route.steps[0].instruction}`, 'fah_sai');
  };

  const handleStartArCameraNav = (route: RadarNavRoute) => {
    handleStartNavigation(route);
    setIsArCameraOpen(true);
  };

  const advanceToNextStep = () => {
    if (!activeNavRoute) return;
    if (activeStepIndex < activeNavRoute.steps.length - 1) {
      const nextIdx = activeStepIndex + 1;
      setActiveStepIndex(nextIdx);
      if (audioEnabled) playTactileBlip(920);
      const nextStep = activeNavRoute.steps[nextIdx];
      speakThaiText(nextStep.instruction, 'fah_sai');
    } else {
      if (audioEnabled) playTactileBlip(1200);
      speakThaiText(`คุณได้เดินทางถึงจุดหมาย ${activeNavRoute.destinationName} เรียบร้อยแล้วค่ะ`, 'fah_sai');
    }
  };

  const handleEndNavigation = () => {
    setIsNavigating(false);
    setActiveNavRoute(null);
    setActiveStepIndex(0);
    if (audioEnabled) playTactileBlip(600);
    speakThaiText('สิ้นสุดการนำทางเรียบร้อยแล้วค่ะ ขอให้เดินทางปลอดภัยนะคะ', 'fah_sai');
  };

  const calculateSvgPathD = (points: { x: number; y: number }[]): string => {
    if (!points || points.length === 0) return '';
    return points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  };

  const getManeuverIcon = (maneuver: string, className = 'w-5 h-5') => {
    switch (maneuver) {
      case 'turn_left':
      case 'slight_left':
      case 'sharp_left':
        return <CornerUpLeft className={className} />;
      case 'turn_right':
      case 'slight_right':
      case 'sharp_right':
        return <CornerUpRight className={className} />;
      case 'arrived':
        return <CheckCircle2 className={className} />;
      default:
        return <ArrowUp className={className} />;
    }
  };

  // Toggle between 3D Radar, Google Maps, and Mapbox
  const [radarDisplayMode, setRadarDisplayMode] = useState<'3d_radar' | 'google_maps' | 'mapbox'>('3d_radar');

  // Radar continuous sweep rotation
  useEffect(() => {
    if (!isOnDuty) return;
    const interval = setInterval(() => {
      setRadarSweepAngle(prev => (prev + 3) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isOnDuty]);

  // Subtle auto slow orbit rotation in hologram mode
  useEffect(() => {
    if (!isOnDuty || !isAutoRotating || cameraMode !== 'hologram_orbit') return;
    const interval = setInterval(() => {
      setRotationZ(prev => (prev + 0.15) % 360);
    }, 60);
    return () => clearInterval(interval);
  }, [isOnDuty, isAutoRotating, cameraMode]);

  // Camera presets
  const applyCameraPreset = (mode: 'hologram_orbit' | 'cockpit_hud' | 'top_tactical') => {
    setCameraMode(mode);
    if (audioEnabled) playTactileBlip(800);

    if (mode === 'hologram_orbit') {
      setPitch(58);
      setRotationZ(-25);
      setZoom(1);
      setIsAutoRotating(true);
    } else if (mode === 'cockpit_hud') {
      setPitch(72);
      setRotationZ(0);
      setZoom(1.2);
      setIsAutoRotating(false);
    } else if (mode === 'top_tactical') {
      setPitch(25);
      setRotationZ(0);
      setZoom(0.95);
      setIsAutoRotating(false);
    }
  };

  const handlePingClick = (ping: Radar3DPing) => {
    if (audioEnabled) playRadarScan();
    setSelectedPing(ping);
    if (onSelectPing) onSelectPing(ping);
  };

  const filteredPings = LIVE_RADAR_PINGS.filter(p => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (filterService !== 'all' && p.serviceType !== filterService) return false;
    return true;
  });

  return (
    <div className="space-y-3 font-mono">
      {/* TOP VIEW SWITCHER & NAVIGATION CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-black/85 p-2 rounded-2xl border border-cyan-400/40 shadow-[0_0_20px_rgba(0,210,255,0.2)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              setRadarDisplayMode('3d_radar');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              radarDisplayMode === '3d_radar'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${radarDisplayMode === '3d_radar' ? 'animate-pulse' : ''}`} />
            <span>3D Cyber Radar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              setRadarDisplayMode('google_maps');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              radarDisplayMode === 'google_maps'
                ? 'bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span>Google Maps GPS สด</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              setRadarDisplayMode('mapbox');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              radarDisplayMode === 'mapbox'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-slate-950" />
            <span>Mapbox 3D</span>
          </button>

          {/* GPS จริง / พิกัดฉัน (Locate Me) */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all active:scale-95 shadow-sm"
            title="อัปเดตและล็อคพิกัดดาวเทียม GPS สดทันที"
          >
            <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
            <span>GPS จริง (Locate Me)</span>
          </button>

          {/* 🗺️ วางแผนเส้นทาง (Route Planner) */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setIsRoutePlannerOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all active:scale-95 shadow-sm"
            title="วางแผนเส้นทางซอยลัดจักรยานสีขาว"
          >
            <Route className="w-3.5 h-3.5 text-cyan-400" />
            <span>🗺️ วางแผนเส้นทาง</span>
          </button>

          {/* 📹 กล้องสด AR (Mobile Camera HUD) */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setIsArCameraOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition-all active:scale-95 shadow-sm"
            title="นำทางผ่านกล้องสดภาพสดจากมือถือพร้อมลูกศร AR และเสียง AI"
          >
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>📹 กล้องสด AR</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 pr-2 text-[10px] text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>GPS สด: {gpsState.latitude.toFixed(4)}, {gpsState.longitude.toFixed(4)} (±{gpsState.accuracy}ม.)</span>
        </div>
      </div>

      {/* GPS Confirmation Toast */}
      {gpsToast && (
        <div className="bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-xs px-3 py-2 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{gpsToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsToast(null)}
            className="text-emerald-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ACTIVE TURN-BY-TURN NAVIGATION BANNER */}
      {isNavigating && activeNavRoute && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/70 rounded-2xl p-3.5 shadow-[0_0_25px_rgba(16,185,129,0.35)] space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                {getManeuverIcon(activeNavRoute.steps[activeStepIndex]?.maneuver || 'straight', 'w-6 h-6')}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                    {activeNavRoute.steps[activeStepIndex]?.maneuver === 'arrived' 
                      ? 'ถึงจุดหมายปลายทาง' 
                      : `อีก ${currentStepRemainingDist} ม.`}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    ก้าว {activeStepIndex + 1}/{activeNavRoute.steps.length}
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold">
                    🏁 {activeNavRoute.destinationName}
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black text-white tracking-tight mt-0.5">
                  {activeNavRoute.steps[activeStepIndex]?.instruction}
                </div>
                {activeNavRoute.steps[activeStepIndex + 1] && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <span>ถัดไป:</span>
                    <span className="text-slate-300">{activeNavRoute.steps[activeStepIndex + 1].instruction}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Action Buttons */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              {/* Voice Guidance Repeat */}
              <button
                type="button"
                onClick={() => {
                  if (activeNavRoute.steps[activeStepIndex]) {
                    speakThaiText(activeNavRoute.steps[activeStepIndex].instruction, 'fah_sai');
                  }
                  if (audioEnabled) playTactileBlip(880);
                }}
                className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
                title="ฟังเสียง AI ไกด์นำทางภาษาไทยอีกครั้ง"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              {/* Manual Advance / Next Step Button */}
              {activeStepIndex < activeNavRoute.steps.length - 1 && (
                <button
                  type="button"
                  onClick={advanceToNextStep}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1"
                  title="จำลองเข้าใกล้จุดเลี้ยว (< 20 ม.) และเปลี่ยนก้าวถัดไป"
                >
                  <span>ก้าวถัดไป</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Live Camera AR Switcher Button */}
              <button
                type="button"
                onClick={() => setIsArCameraOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md hover:brightness-110"
                title="เปิดกล้องสดภาพสดจากมือถือพร้อมลูกศร AR นำทาง"
              >
                <Camera className="w-3.5 h-3.5 text-slate-950" />
                <span>กล้องสด AR</span>
              </button>

              {/* End Navigation Button */}
              <button
                type="button"
                onClick={handleEndNavigation}
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40"
                title="สิ้นสุดการนำทาง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {radarDisplayMode === 'google_maps' || radarDisplayMode === 'mapbox' ? (
        <GoogleMapsLiveView
          gpsLocation={gpsState}
          initialProvider={radarDisplayMode === 'mapbox' ? 'mapbox' : 'google_maps'}
          height="430px"
          audioEnabled={audioEnabled}
        />
      ) : (
        /* 3D RADAR CANVAS CONTAINER */
        <div className="relative w-full h-[400px] sm:h-[450px] rounded-3xl bg-gradient-to-b from-[#060D1E] via-[#040813] to-[#02040A] border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(0,210,255,0.25)] overflow-hidden flex items-center justify-center select-none">
        
        {/* Background Nebula & Sci-Fi Depth Grid Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.15)_0,transparent_75%)] pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(0,210,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.05)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

        {/* 3D PERSPECTIVE STAGE */}
        <div 
          className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] transition-transform duration-300 ease-out flex items-center justify-center"
          style={{
            perspective: '1000px',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* ROTATING 3D INCLINED PLANE */}
          <div
            className="relative w-full h-full rounded-full transition-transform duration-100 flex items-center justify-center"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${pitch}deg) rotateZ(${rotationZ}deg) scale(${zoom})`
            }}
          >
            {/* 1. Radar Circular Holographic Grid Rings */}
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 shadow-[0_0_25px_rgba(0,210,255,0.3)] bg-cyan-950/10 backdrop-blur-[1px]" />
            <div className="absolute inset-6 rounded-full border border-cyan-400/30" />
            <div className="absolute inset-14 rounded-full border border-cyan-400/30 border-dashed" />
            <div className="absolute inset-24 rounded-full border border-cyan-400/40 shadow-[inset_0_0_15px_rgba(0,210,255,0.2)]" />
            <div className="absolute inset-32 rounded-full border border-cyan-400/50" />

            {/* 2. Concentric Radial Axis Lines (Crosshairs & 45deg diagonals) */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-cyan-400/30" />
            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-cyan-400/30" />
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-cyan-400/20 rotate-45" />
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-cyan-400/20 -rotate-45" />

            {/* 3. Range Altitude Distance Rings Labels */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400/80 font-bold bg-black/60 px-1 rounded border border-cyan-500/20" style={{ transform: 'rotateX(-60deg)' }}>
              1,500m (Max Radius)
            </div>
            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400/80 font-bold bg-black/60 px-1 rounded border border-cyan-500/20" style={{ transform: 'rotateX(-60deg)' }}>
              800m
            </div>
            <div className="absolute top-20 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400/80 font-bold bg-black/60 px-1 rounded border border-cyan-500/20" style={{ transform: 'rotateX(-60deg)' }}>
              300m
            </div>

            {/* 4. 3D Holographic Radar Sweep Beam */}
            {isOnDuty && (
              <div 
                className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0_310deg,rgba(0,210,255,0.45)_360deg)] pointer-events-none"
                style={{
                  transform: `rotate(${radarSweepAngle}deg)`,
                  transformOrigin: 'center center'
                }}
              />
            )}

            {/* 5. 3D Wireframe Capillary Alleys (ซอยลัดฝั่งธนบุรี โซน 4) */}
            {showCapillaryPaths && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80 overflow-visible" viewBox="0 0 360 360">
                {/* Main Arterial Road (ถ.เจริญนคร - กรุงธนบุรี) */}
                <path d="M 40 190 Q 180 180 340 170" fill="none" stroke="#00D2FF" strokeWidth="2.5" strokeDasharray="6,4" />
                {/* Alley 1 (ซอยเจริญนคร 14 -> สาทร) */}
                <path d="M 180 180 Q 150 100 110 50" fill="none" stroke="#10B981" strokeWidth="1.5" />
                {/* Alley 2 (ซอยลาดหญ้า 12 -> วงเวียนใหญ่) */}
                <path d="M 180 180 Q 230 110 270 60" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,3" />
                {/* Alley 3 (คลองสาน -> กุฎีขาว) */}
                <path d="M 180 180 Q 240 250 280 300" fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
                {/* Alley 4 (ซอยกรุงธนบุรี 4 -> BTS) */}
                <path d="M 180 180 Q 100 240 60 290" fill="none" stroke="#EC4899" strokeWidth="1.5" />

                {/* 5.1 Real-Time Dynamic Active Navigation Green Polyline */}
                {isNavigating && activeNavRoute && (
                  <g className="filter drop-shadow-[0_0_12px_#10B981]">
                    {/* Glowing neon green base path */}
                    <path
                      d={calculateSvgPathD(activeNavRoute.radarPolyline)}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-80 animate-pulse"
                    />
                    {/* Bright pulsating dashline */}
                    <path
                      d={calculateSvgPathD(activeNavRoute.radarPolyline)}
                      fill="none"
                      stroke="#00FF9D"
                      strokeWidth="2.5"
                      strokeDasharray="8,6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Waypoint nodes */}
                    {activeNavRoute.radarPolyline.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={idx === activeNavRoute.radarPolyline.length - 1 ? 6 : 3.5}
                        fill={idx === activeNavRoute.radarPolyline.length - 1 ? '#FFD700' : '#10B981'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                )}
              </svg>
            )}

            {/* 5.2 Real-Time Destination Target 3D Beacon */}
            {isNavigating && activeNavRoute && (
              <div
                className="absolute pointer-events-none z-30"
                style={{
                  left: `${50 + (activeNavRoute.targetCoord.radarX / 2)}%`,
                  top: `${50 + (activeNavRoute.targetCoord.radarY / 2)}%`,
                  transform: 'translate(-50%, -100%) translateZ(35px)',
                  transformStyle: 'preserve-3d'
                }}
              >
                <div className="flex flex-col items-center animate-bounce">
                  <div className="bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full border border-white shadow-[0_0_15px_#10B981] whitespace-nowrap">
                    🏁 {activeNavRoute.destinationName}
                  </div>
                  <div className="w-1.5 h-6 bg-gradient-to-t from-emerald-400 to-transparent" />
                  <div className="w-4 h-4 rounded-full bg-emerald-400/40 border border-emerald-300 animate-ping -mt-2" />
                </div>
              </div>
            )}

            {/* 6. 3D Isometric Buildings along the alleys */}
            {show3DBuildings && (
              <>
                {/* Building A (ไอดีโอ สาทร-วงเวียนใหญ่) */}
                <div 
                  className="absolute"
                  style={{
                    left: '26%',
                    top: '20%',
                    transform: 'translateZ(20px)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <div className="w-8 h-8 bg-gradient-to-t from-cyan-900/80 to-cyan-500/30 border border-cyan-400/60 rounded flex items-center justify-center text-[7px] text-cyan-200 text-center font-bold shadow-[0_0_10px_rgba(0,210,255,0.4)]">
                    🏢 IDEO
                  </div>
                </div>

                {/* Building B (มัสยิดบางหลวง) */}
                <div 
                  className="absolute"
                  style={{
                    left: '68%',
                    top: '72%',
                    transform: 'translateZ(15px)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <div className="w-7 h-7 bg-gradient-to-t from-emerald-900/80 to-emerald-500/30 border border-emerald-400/60 rounded flex items-center justify-center text-[7px] text-emerald-200 text-center font-bold">
                    🕌 มัสยิด
                  </div>
                </div>

                {/* Building C (BTS กรุงธนบุรี) */}
                <div 
                  className="absolute"
                  style={{
                    left: '70%',
                    top: '28%',
                    transform: 'translateZ(18px)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <div className="w-9 h-6 bg-gradient-to-t from-purple-900/80 to-purple-500/30 border border-purple-400/60 rounded flex items-center justify-center text-[7px] text-purple-200 text-center font-bold">
                    🚆 BTS
                  </div>
                </div>
              </>
            )}

            {/* 7. Center Driver 3D Avatar (You - The Sovereign Knight) - FLOATING ABOVE GROUND */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer"
              style={{
                transform: `translateZ(${45 * floatingHeightMultiplier}px) rotateX(-${pitch}deg) rotateZ(-${rotationZ}deg)`,
                transformStyle: 'preserve-3d'
              }}
              title="ตำแหน่งยานรบของคุณ (ลอยเหนือจอเรดาร์)"
            >
              {/* Laser Floor Spotlight on Radar Grid */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-2 border-cyan-400/60 bg-cyan-400/20 blur-[2px] animate-ping pointer-events-none"
                style={{
                  top: `${45 * floatingHeightMultiplier}px`,
                  transform: `rotateX(${pitch}deg) rotateZ(${rotationZ}deg)`
                }}
              />
              
              {/* Vertical Laser Column up to Rider */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 top-10 w-[2px] bg-gradient-to-b from-cyan-300 via-cyan-500 to-transparent pointer-events-none"
                style={{ height: `${45 * floatingHeightMultiplier}px` }}
              />

              {/* Vehicle 3D Card HUD with floating levitate animation */}
              <div className="relative flex flex-col items-center animate-levitate">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00D2FF] via-blue-600 to-emerald-400 text-slate-950 flex items-center justify-center shadow-[0_0_30px_#00D2FF] ring-4 ring-cyan-400/60 overflow-hidden">
                  <img
                    src={activeVehicle.imageUrl || '/images/ride_sport.jpg'}
                    alt={activeVehicle.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-1 px-2.5 py-0.5 rounded-full bg-black/95 border-2 border-cyan-400 text-[9px] font-black text-cyan-300 shadow-xl whitespace-nowrap flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>พี่วิน (คุณ LV.{driverLevel})</span>
                </div>
              </div>
            </div>

            {/* 8. 3D FLOATING ICONS: CUSTOMERS, SHOPS, PARTNERS */}
            {filteredPings.map((ping, index) => {
              const isSelected = selectedPing?.id === ping.id;
              // Map -100..100 to 0..100%
              const leftPercent = 50 + (ping.x / 2);
              const topPercent = 50 + (ping.y / 2);
              const calculatedZ = (ping.elevation + 25) * floatingHeightMultiplier;

              // Color styles based on category
              const categoryBadgeColors = {
                customer: isSelected 
                  ? 'from-[#FFD700] to-amber-500 text-slate-950 border-white ring-4 ring-yellow-400/50 shadow-[0_0_25px_#FFD700]'
                  : ping.urgency === 'urgent'
                  ? 'from-rose-500 to-red-600 text-white border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'from-cyan-900 to-blue-950 text-cyan-300 border-cyan-400/80 shadow-[0_0_15px_rgba(0,210,255,0.4)]',
                shop: isSelected
                  ? 'from-amber-400 to-yellow-500 text-slate-950 border-white ring-4 ring-amber-400/50 shadow-[0_0_25px_#F59E0B]'
                  : 'from-amber-950 to-orange-950 text-amber-300 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
                partner: isSelected
                  ? 'from-emerald-400 to-teal-500 text-slate-950 border-white ring-4 ring-emerald-400/50 shadow-[0_0_25px_#10B981]'
                  : 'from-emerald-950 to-teal-950 text-emerald-300 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
                driver: 'from-blue-900 to-indigo-950 text-blue-300 border-blue-400'
              };

              const laserColors = {
                customer: isSelected ? 'via-[#FFD700] to-yellow-200' : 'via-cyan-400 to-cyan-200',
                shop: isSelected ? 'via-amber-400 to-yellow-200' : 'via-amber-400 to-orange-200',
                partner: isSelected ? 'via-emerald-400 to-teal-200' : 'via-emerald-400 to-green-200',
                driver: 'via-blue-400 to-indigo-200'
              };

              return (
                <div
                  key={ping.id}
                  className="absolute z-20 cursor-pointer group"
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    transform: `translateZ(${calculatedZ}px) rotateX(-${pitch}deg) rotateZ(-${rotationZ}deg)`,
                    transformStyle: 'preserve-3d'
                  }}
                  onClick={() => handlePingClick(ping)}
                >
                  {/* Ground Hologram Anchor Ring (Positioned at Radar Surface Plane) */}
                  {showGroundShadows && (
                    <div 
                      className={`absolute left-1/2 -translate-x-1/2 rounded-full border-2 transition-all pointer-events-none ${
                        isSelected 
                          ? 'w-10 h-10 border-[#FFD700] bg-amber-400/30 scale-125 animate-ping' 
                          : ping.urgency === 'urgent'
                          ? 'w-8 h-8 border-rose-400 bg-rose-500/25 animate-pulse'
                          : ping.category === 'shop'
                          ? 'w-7 h-7 border-amber-400 bg-amber-500/20'
                          : ping.category === 'partner'
                          ? 'w-8 h-8 border-emerald-400 bg-emerald-500/20'
                          : 'w-7 h-7 border-cyan-400 bg-cyan-400/15'
                      }`}
                      style={{
                        top: `${calculatedZ}px`,
                        transform: `rotateX(${pitch}deg) rotateZ(${rotationZ}deg)`
                      }}
                    />
                  )}

                  {/* 3D Vertical Holographic Laser Beacon Column Connecting Floor to Floating Icon */}
                  {showLaserBeacons && (
                    <div 
                      className={`absolute left-1/2 -translate-x-1/2 top-10 w-[2px] transition-all pointer-events-none bg-gradient-to-b from-white ${laserColors[ping.category]} to-transparent shadow-[0_0_10px_currentColor]`}
                      style={{ height: `${calculatedZ}px` }}
                    />
                  )}

                  {/* Elevated Floating 3D Target Marker with Levitation Bobbing Animation */}
                  <div className={`relative flex flex-col items-center transition-transform duration-200 hover:scale-125 ${
                    index % 2 === 0 ? 'animate-levitate' : 'animate-levitate-delayed'
                  } ${isSelected ? 'scale-115' : ''}`}>
                    
                    {/* Category Label Chip Floating on Top */}
                    <div className={`text-[8px] font-black px-1.5 py-0.2 rounded-full mb-0.5 whitespace-nowrap shadow-md border ${
                      isSelected
                        ? 'bg-[#FFD700] text-slate-950 border-white'
                        : ping.category === 'shop'
                        ? 'bg-amber-950/90 text-amber-300 border-amber-400/60'
                        : ping.category === 'partner'
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400/60'
                        : 'bg-cyan-950/90 text-cyan-300 border-cyan-400/60'
                    }`}>
                      {ping.categoryLabel}
                    </div>

                    {/* Main Avatar Bubble */}
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-2xl transition-all border-2 overflow-hidden bg-gradient-to-tr ${categoryBadgeColors[ping.category]}`}>
                      {ping.imageUrl ? (
                        <img 
                          src={ping.imageUrl} 
                          alt={ping.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <CyberGraphic emoji={ping.avatar || ping.serviceEmoji} size={32} />
                      )}
                    </div>

                    {/* Floating Info Tag Badge with Live Distance and Price */}
                    <div className={`mt-1 px-2 py-0.5 rounded-lg text-[8px] font-bold whitespace-nowrap shadow-lg border flex items-center gap-1.5 backdrop-blur-md ${
                      isSelected
                        ? 'bg-black/95 text-[#FFD700] border-[#FFD700] ring-1 ring-[#FFD700]'
                        : 'bg-black/85 text-white border-white/20'
                    }`}>
                      <span className="text-slate-300">{ping.distanceMeters}ม.</span>
                      {ping.fare > 0 ? (
                        <span className="text-emerald-400 font-bold">฿{ping.fare}</span>
                      ) : (
                        <span className="text-cyan-400 font-bold">ฟรี</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3D RADAR OVERLAYS & HUD CONTROLS */}

        {/* Top-Left Live Status Indicator */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-40">
          <div className="flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-cyan-500/40 text-[10px] text-cyan-300 shadow-lg">
            <Radio className={`w-3.5 h-3.5 ${isOnDuty ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="font-bold">
              {isOnDuty ? '3D FLOATING RADAR ACTIVE (1.5 กม.)' : '3D RADAR OFFLINE'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-slate-300 bg-black/80 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-md">
            <span className="text-emerald-400 font-bold">{filteredPings.length} จุดลอย</span>
            <span>(ลูกค้า • ร้านค้า • พาร์ทเนอร์)</span>
          </div>
        </div>

        {/* Top-Right 3D Camera View Angles Switcher */}
        <div className="absolute top-3 right-3 flex items-center gap-1 z-40 bg-black/85 backdrop-blur-md p-1 rounded-2xl border border-white/10">
          {[
            { id: 'hologram_orbit' as const, label: '🛸 โฮโลแกรม 3D', desc: '360° Orbit View' },
            { id: 'cockpit_hud' as const, label: '🏍️ Cockpit HUD', desc: 'มุมมองหมวกเกราะ' },
            { id: 'top_tactical' as const, label: '🛰️ แผนที่ยุทธวิธี', desc: 'Top-Down 3D' }
          ].map(cam => (
            <button
              key={cam.id}
              type="button"
              onClick={() => applyCameraPreset(cam.id)}
              className={`px-2 py-1 rounded-xl text-[9px] font-bold transition-all ${
                cameraMode === cam.id
                  ? 'bg-[#00D2FF] text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={cam.desc}
            >
              {cam.label}
            </button>
          ))}
        </div>

        {/* Bottom-Left 3D Layer Toggles */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 z-40 bg-black/85 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex-wrap">
          <button
            type="button"
            onClick={() => setShow3DBuildings(prev => !prev)}
            className={`px-2 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1 transition-all ${
              show3DBuildings ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
            title="เปิด/ปิด ตึก 3 มิติ"
          >
            <Box className="w-3 h-3" />
            <span>ตึก 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCapillaryPaths(prev => !prev)}
            className={`px-2 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1 transition-all ${
              showCapillaryPaths ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
            }`}
            title="เปิด/ปิด เส้นทางซอยลัด"
          >
            <Layers className="w-3 h-3" />
            <span>ซอยลัด</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLaserBeacons(prev => !prev)}
            className={`px-2 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1 transition-all ${
              showLaserBeacons ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
            }`}
            title="เปิด/ปิด เสาเลเซอร์ 3D"
          >
            <Zap className="w-3 h-3" />
            <span>เสาเลเซอร์</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAutoRotating(prev => !prev)}
            className={`px-2 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1 transition-all ${
              isAutoRotating ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'
            }`}
            title="หมุน 3D อัตโนมัติ"
          >
            <RotateCw className={`w-3 h-3 ${isAutoRotating ? 'animate-spin' : ''}`} />
            <span>หมุน 360°</span>
          </button>
        </div>

        {/* Bottom-Right 3D Floating Height & Tilt Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-40 bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-white/10 text-[9px] text-slate-300 flex-wrap justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 font-bold flex items-center gap-0.5">
              <Sparkles className="w-3 h-3 text-[#FFD700]" />
              <span>ความสูงลอย 3D:</span>
            </span>
            <input
              type="range"
              min="0.4"
              max="2.8"
              step="0.1"
              value={floatingHeightMultiplier}
              onChange={(e) => setFloatingHeightMultiplier(Number(e.target.value))}
              className="w-16 h-1.5 bg-cyan-900 rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
              title="ปรับระดับความลอยของไอคอนเหนือจอเรดาร์ (0.4x - 2.8x)"
            />
            <span className="text-[#FFD700] font-black">{Math.round(floatingHeightMultiplier * 45)}m</span>

            {/* Quick Presets */}
            <div className="flex items-center gap-0.5 ml-1">
              {[
                { val: 0.5, label: '20m ราบ' },
                { val: 1.0, label: '45m ปกติ' },
                { val: 1.8, label: '80m สูง' },
                { val: 2.5, label: '120m อวกาศ' }
              ].map(preset => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(750);
                    setFloatingHeightMultiplier(preset.val);
                  }}
                  className={`px-1 py-0.5 rounded text-[8px] font-mono font-bold transition-all ${
                    Math.abs(floatingHeightMultiplier - preset.val) < 0.1
                      ? 'bg-[#00D2FF] text-slate-950 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-[1px] h-4 bg-white/20 hidden sm:block" />

          <div className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-cyan-400" />
            <input
              type="range"
              min="20"
              max="80"
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
              className="w-12 h-1 bg-cyan-900 rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
              title="ปรับมุมเอียงเรดาร์"
            />
            <span className="text-cyan-300 font-bold">{pitch}°</span>
          </div>
        </div>
      </div>
      )}

      {/* CATEGORY FILTER TABS: ลูกค้า • ร้านค้า • พาร์ทเนอร์ • ทั้งหมด */}
      <div className="p-2 rounded-2xl bg-[#061126] border border-cyan-500/30 flex items-center justify-between gap-2 overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1 pl-1">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>โหมดเรดาร์:</span>
          </span>
          {[
            { id: 'all' as const, label: '🌐 แสดงทั้งหมด (12)', icon: Eye },
            { id: 'customer' as const, label: '👤 ลูกค้าผู้โดยสาร (4)', icon: Users },
            { id: 'shop' as const, label: '🏪 ร้านค้า & พัสดุ (4)', icon: Store },
            { id: 'partner' as const, label: '⚡ พาร์ทเนอร์ & ศูนย์ (4)', icon: BatteryCharging }
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(750);
                setFilterCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                filterCategory === cat.id
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                  : 'bg-black/50 text-slate-300 border border-white/10 hover:text-white hover:border-cyan-500/40'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SELECTED 3D PING LIVE CARD & INSTANT DISPATCH ACTION */}
      {selectedPing && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0C1E3C] via-[#09172E] to-[#060F20] border-2 border-[#FFD700]/60 shadow-[0_0_25px_rgba(255,215,0,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl border-2 border-amber-400 overflow-hidden shadow-lg flex-shrink-0">
              {selectedPing.imageUrl ? (
                <img 
                  src={selectedPing.imageUrl} 
                  alt={selectedPing.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <CyberGraphic emoji={selectedPing.avatar || selectedPing.serviceEmoji} size={56} />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                  selectedPing.category === 'shop'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                    : selectedPing.category === 'partner'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                }`}>
                  {selectedPing.categoryLabel} • {selectedPing.badge}
                </span>
                <span className="text-[9px] text-cyan-300 font-mono">
                  📍 ห่าง {selectedPing.distanceMeters} เมตร
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                <span>{selectedPing.name}</span>
                <span className="text-slate-400 font-normal">({selectedPing.service})</span>
              </h4>
              <p className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <span className="truncate">{selectedPing.location}</span>
                {selectedPing.specialNote && (
                  <span className="text-amber-300 hidden md:inline">• "{selectedPing.specialNote}"</span>
                )}
              </p>
              {selectedPing.details && (
                <p className="text-[9px] text-slate-400 mt-0.5 italic">
                  {selectedPing.details}
                </p>
              )}
            </div>
          </div>

          {/* Fare & Quick Lock-On Trigger Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
            {selectedPing.fare > 0 ? (
              <div className="text-left sm:text-right">
                <span className="text-[9px] text-slate-400 block">รายได้สุทธิ (0% GP):</span>
                <span className="text-base font-black text-[#FFD700] font-mono">
                  ฿{selectedPing.fare}.00
                </span>
              </div>
            ) : (
              <div className="text-left sm:text-right">
                <span className="text-[9px] text-slate-400 block">สิทธิประโยชน์:</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  สวัสดิการฟรี
                </span>
              </div>
            )}

            {/* Quick Navigate to Ping Button */}
            <button
              type="button"
              onClick={() => {
                const route = generateRouteToPing(selectedPing, gpsState.latitude, gpsState.longitude);
                handleStartNavigation(route);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs font-mono flex items-center gap-1.5 transition-all active:scale-95"
              title="เริ่มนำทางเรียลไทม์ไปยังเป้าหมายนี้"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              <span>เริ่มนำทาง</span>
            </button>

            {onTriggerJob && (
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1100);
                  onTriggerJob(selectedPing.serviceType);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-[#00D2FF] to-blue-500 hover:brightness-110 text-slate-950 font-black text-xs font-mono shadow-[0_0_15px_rgba(0,210,255,0.5)] flex items-center gap-1.5 transition-all active:scale-95 animate-pulse"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {selectedPing.category === 'partner' 
                    ? 'นำทางไปสถานีพาร์ทเนอร์' 
                    : selectedPing.category === 'shop' 
                    ? `รับออเดอร์ร้านค้า (฿${selectedPing.fare})`
                    : `ล็อคเป้าหมาย & รับงาน (฿${selectedPing.fare})`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Route Planner Modal */}
      <RadarRoutePlannerModal
        isOpen={isRoutePlannerOpen}
        onClose={() => setIsRoutePlannerOpen(false)}
        gpsState={gpsState}
        onLocateMe={handleLocateMe}
        onStartNavigation={handleStartNavigation}
        onStartArCameraNav={handleStartArCameraNav}
        availablePings={LIVE_RADAR_PINGS}
        selectedPing={selectedPing}
      />

      {/* Fullscreen Mobile Live Camera AR Navigation */}
      {isArCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black">
          <ARLiveCameraNavigation
            voiceInstruction={
              activeNavRoute 
                ? activeNavRoute.steps[activeStepIndex]?.instruction 
                : 'อีก 80 เมตร เลี้ยวซ้ายเข้าตรอกวานิช 2'
            }
            remainingDistM={currentStepRemainingDist || 250}
            remainingMinutes={activeNavRoute?.totalDurationMinutes || 4}
            currentSpeed={gpsState.speed || 32}
            liveHeading={gpsState.heading || 45}
            audioEnabled={audioEnabled}
            voiceGuidanceEnabled={true}
            onClose={() => setIsArCameraOpen(false)}
            onSwitchToMap={() => {
              setIsArCameraOpen(false);
              setRadarDisplayMode('3d_radar');
            }}
            onSwitchToGoogleMaps={() => {
              setIsArCameraOpen(false);
              setRadarDisplayMode('google_maps');
            }}
            onAdvanceTripStep={advanceToNextStep}
          />
        </div>
      )}
    </div>
  );
};

