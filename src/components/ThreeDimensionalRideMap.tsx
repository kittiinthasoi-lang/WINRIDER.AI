import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  Navigation, 
  Layers, 
  Eye, 
  Maximize2, 
  Minimize2,
  Compass, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  MapPin,
  RotateCw,
  Sliders,
  LocateFixed,
  Plus,
  Minus,
  CloudRain,
  Sun,
  ZapOff,
  Flame,
  CloudLightning,
  Video,
  Plane,
  Route,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Cpu,
  Train
} from 'lucide-react';
import { DreamRideVehicle } from '../types';
import { playTactileBlip } from '../utils/audio';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { GoogleMapsLiveView } from './GoogleMapsLiveView';
import {
  BANGKOK_COMPLEX_ROUTES,
  BANGKOK_3D_LANDMARKS,
  BANGKOK_MAP_INFRASTRUCTURE,
  BangkokComplexRoute,
  RouteWaypoint,
  MapLandmark3D,
  MapInfrastructurePoint
} from '../data/bangkokCapillaryRoutes';

interface ThreeDimensionalRideMapProps {
  selectedDreamRide?: DreamRideVehicle;
  pickupLocation?: string;
  destinationLocation?: string;
  driverName?: string;
  driverLevel?: number;
  driverEmoji?: string;
  etaMinutes?: number;
  onEmergencyClick?: () => void;
  audioEnabled?: boolean;
}

export const ThreeDimensionalRideMap: React.FC<ThreeDimensionalRideMapProps> = ({
  selectedDreamRide,
  pickupLocation = 'หน้าคอนโดสุขุมวิท 39 (พร้อมพงษ์)',
  destinationLocation = 'อาคาร Exchange Tower อโศก',
  driverName = 'กิตติ อินทะสร้อย',
  driverLevel = 100,
  driverEmoji = '🦁',
  etaMinutes = 2,
  onEmergencyClick,
  audioEnabled = true
}) => {
  // 3D Camera Modes: isometric, chase, orbit, fpv (First-Person View), drone (High-altitude Drone View), lidar (LiDAR Radar)
  const [cameraMode, setCameraMode] = useState<'isometric' | 'chase' | 'orbit' | 'fpv' | 'drone' | 'lidar'>('isometric');
  const [customPitch, setCustomPitch] = useState<number>(54); // rotateX in deg
  const [customHeading, setCustomHeading] = useState<number>(-22); // rotateZ in deg
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [elevation3D, setElevation3D] = useState<number>(45); // 0m to 150m (3D Floating Height / Altitude)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showBuildings3D, setShowBuildings3D] = useState<boolean>(true);
  const [showTrafficDensity, setShowTrafficDensity] = useState<boolean>(true);
  const [showCapillaryShortcuts, setShowCapillaryShortcuts] = useState<boolean>(true);
  const [showSkytrainViaduct, setShowSkytrainViaduct] = useState<boolean>(true);
  const [showCanalDetails, setShowCanalDetails] = useState<boolean>(true);
  const [showControlsPanel, setShowControlsPanel] = useState<boolean>(false);
  const [showWaypointDrawer, setShowWaypointDrawer] = useState<boolean>(false);
  const [selectedLandmark, setSelectedLandmark] = useState<MapLandmark3D | null>(null);

  // Selected Complex Route
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-ci-capillary');
  const activeRoute = useMemo(() => {
    return BANGKOK_COMPLEX_ROUTES.find(r => r.id === selectedRouteId) || BANGKOK_COMPLEX_ROUTES[0];
  }, [selectedRouteId]);
  
  // Weather condition state: 'clear' | 'rain' | 'heat' | 'storm' | 'traffic_dense'
  const [weatherCondition, setWeatherCondition] = useState<'clear' | 'rain' | 'heat' | 'storm' | 'traffic_dense'>('clear');

  // Realtime Live GPS Hook
  const { gpsState } = useRealtimeGps(true);
  // View mode: '3d_radar' or 'google_maps'
  const [mapDisplayMode, setMapDisplayMode] = useState<'3d_radar' | 'google_maps'>('3d_radar');

  // Split Route into Leg 1 (A -> B: Driver heading to Customer) and Leg 2 (B -> C: Heading to Destination)
  const routeLegs = useMemo(() => {
    const pts = activeRoute.points || [];
    const midIndex = Math.max(1, Math.min(pts.length - 2, Math.floor(pts.length * 0.5)));
    const legAtoB = pts.slice(0, midIndex + 1);
    const legBtoC = pts.slice(midIndex);

    const buildSvgPath = (points: { x: number; y: number }[]) => {
      if (points.length < 2) return '';
      return points.reduce((acc, p, idx) => {
        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
      }, '');
    };

    const pointA = pts[0] || { x: 14, y: 82 };
    const pointB = pts[midIndex] || { x: 44, y: 52 };
    const pointC = pts[pts.length - 1] || { x: 86, y: 16 };

    return {
      midIndex,
      legAtoB,
      legBtoC,
      svgAtoB: buildSvgPath(legAtoB),
      svgBtoC: buildSvgPath(legBtoC),
      pointA,
      pointB,
      pointC
    };
  }, [activeRoute]);

  // Overall Trip Simulation Progress (0.0 to 1.0)
  // 0.0 - 0.5: Driver travels from Point A to Point B (Customer)
  // 0.5: Driver arrives at Point B (Customer board / parcel pickup)
  // 0.5 - 1.0: Driver and Customer travel together to Point C (Destination)
  const [tripProgress, setTripProgress] = useState<number>(0.22);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [riderSpeed, setRiderSpeed] = useState<number>(43);
  const [trainProgress, setTrainProgress] = useState<number>(0.45);

  // Current simulation phase for customer: 'driver_coming' | 'at_pickup' | 'en_route' | 'arrived'
  const customerTripPhase = useMemo(() => {
    if (tripProgress < 0.48) return 'driver_coming';
    if (tripProgress >= 0.48 && tripProgress <= 0.52) return 'at_pickup';
    if (tripProgress > 0.52 && tripProgress < 0.98) return 'en_route';
    return 'arrived';
  }, [tripProgress]);

  // Interpolate 3D coordinates along multi-stage path (A -> B -> C)
  const calculatePosition = (t: number) => {
    const isFirstLeg = t <= 0.5;
    const subPts = isFirstLeg ? routeLegs.legAtoB : routeLegs.legBtoC;
    if (!subPts || subPts.length < 2) return { x: 50, y: 50, angle: 0, currentWaypointIndex: 0, isFirstLeg };

    const normalizedT = isFirstLeg ? t / 0.5 : (t - 0.5) / 0.5;
    const clampedT = Math.min(0.9999, Math.max(0, normalizedT));

    const totalSegments = subPts.length - 1;
    const scaledT = clampedT * totalSegments;
    const segIndex = Math.floor(scaledT);
    const segT = scaledT - segIndex;

    const p0 = subPts[segIndex];
    const p1 = subPts[Math.min(subPts.length - 1, segIndex + 1)];

    const x = p0.x + (p1.x - p0.x) * segT;
    const y = p0.y + (p1.y - p0.y) * segT;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    return { 
      x, 
      y, 
      angle: angleDeg, 
      currentWaypointIndex: isFirstLeg ? segIndex : routeLegs.midIndex + segIndex,
      isFirstLeg
    };
  };

  const riderPos = calculatePosition(tripProgress);
  const remainingMeters = Math.max(40, Math.round((1 - tripProgress) * activeRoute.distanceKm * 1000));
  const dynamicEta = (remainingMeters / (riderSpeed * 16.6)).toFixed(1);

  // Jump to simulation stage
  const jumpToCustomerStage = (stage: 'A' | 'A_TO_B' | 'B' | 'B_TO_C' | 'C') => {
    if (audioEnabled) playTactileBlip(850);
    if (stage === 'A') setTripProgress(0.02);
    else if (stage === 'A_TO_B') setTripProgress(0.25);
    else if (stage === 'B') setTripProgress(0.5);
    else if (stage === 'B_TO_C') setTripProgress(0.75);
    else if (stage === 'C') setTripProgress(1.0);
  };

  // Simulate smooth rider progress and realistic speed fluctuations
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTrainProgress(prev => (prev + 0.007) % 1);
      setTripProgress(prev => {
        const next = prev + (0.0045 * speedMultiplier);
        return next > 0.99 ? 0.02 : next;
      });
      setRiderSpeed(prev => {
        const delta = (Math.random() - 0.48) * 3;
        return Math.min(55, Math.max(30, Math.round(prev + delta)));
      });
    }, 220);
    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier]);

  // Update pitch/heading when switching camera modes
  const handleCameraModeChange = (mode: 'isometric' | 'chase' | 'orbit' | 'fpv' | 'drone' | 'lidar') => {
    if (audioEnabled) playTactileBlip(850);
    setCameraMode(mode);
    if (mode === 'isometric') {
      setCustomPitch(54);
      setCustomHeading(-22);
      setZoomLevel(1);
    } else if (mode === 'chase') {
      setCustomPitch(66);
      setCustomHeading(-14);
      setZoomLevel(1.15);
    } else if (mode === 'orbit') {
      setCustomPitch(35);
      setCustomHeading(0);
      setZoomLevel(0.95);
    } else if (mode === 'fpv') {
      setCustomPitch(82);
      setCustomHeading(-8);
      setZoomLevel(1.35);
    } else if (mode === 'drone') {
      setCustomPitch(12);
      setCustomHeading(0);
      setZoomLevel(0.85);
    } else if (mode === 'lidar') {
      setCustomPitch(42);
      setCustomHeading(-15);
      setZoomLevel(1.05);
    }
  };

  const handleZoom = (delta: number) => {
    if (audioEnabled) playTactileBlip(950);
    setZoomLevel(prev => Math.min(1.9, Math.max(0.5, Number((prev + delta).toFixed(2)))));
  };

  const handleResetZoom = () => {
    if (audioEnabled) playTactileBlip(600);
    setZoomLevel(1);
  };

  // Ambient styling based on weather
  const weatherGradients = {
    clear: 'from-[#020617] via-[#050E24] to-[#01040A]',
    rain: 'from-[#031526] via-[#061B30] to-[#020B14]',
    heat: 'from-[#1A0B02] via-[#261205] to-[#0A0502]',
    storm: 'from-[#150524] via-[#1E0933] to-[#090212]',
    traffic_dense: 'from-[#1F0808] via-[#1A0505] to-[#0D0202]'
  };

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden bg-[#030712] border border-cyan-500/40 shadow-2xl flex flex-col select-none transition-all duration-300 ${
      isExpanded ? 'h-[580px]' : 'h-auto'
    }`}>
      
      {/* 3D TOP TELEMETRY HUD BAR */}
      <div className="relative z-20 px-3 py-2.5 bg-[#050C1F]/90 backdrop-blur-md border-b border-cyan-500/30 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle Button (3D Radar / Google Maps) */}
          <div className="flex items-center bg-black/70 p-1 rounded-2xl border border-cyan-400/50 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setMapDisplayMode('3d_radar');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 transition-all ${
                mapDisplayMode === '3d_radar'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md scale-102'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${mapDisplayMode === '3d_radar' ? 'animate-pulse' : ''}`} />
              <span>3D Radar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setMapDisplayMode('google_maps');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 transition-all ${
                mapDisplayMode === 'google_maps'
                  ? 'bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 shadow-md scale-102'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
              <span>Google Maps</span>
            </button>
          </div>

          <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono font-bold hidden sm:flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,210,255,0.3)]">
            <span>📍 GPS: {gpsState.latitude.toFixed(4)}, {gpsState.longitude.toFixed(4)}</span>
          </span>
          
          {/* Weather status indicator badge */}
          <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-lg border border-white/10 text-[9px] font-mono">
            {weatherCondition === 'clear' && <span className="text-emerald-400 flex items-center gap-1"><Sun className="w-3 h-3" /> ท้องฟ้าแจ่มใส</span>}
            {weatherCondition === 'rain' && <span className="text-cyan-400 flex items-center gap-1"><CloudRain className="w-3 h-3 animate-bounce" /> ฝนตก • ทางลัดปลอดภัย</span>}
            {weatherCondition === 'heat' && <span className="text-amber-400 flex items-center gap-1"><Flame className="w-3 h-3" /> อากาศร้อน 38°C</span>}
            {weatherCondition === 'storm' && <span className="text-purple-400 flex items-center gap-1"><CloudLightning className="w-3 h-3 animate-pulse" /> พายุฟ้าคะนอง</span>}
            {weatherCondition === 'traffic_dense' && <span className="text-red-400 flex items-center gap-1">🚗 การจราจรถนนใหญ่ติดขัด</span>}
          </div>
        </div>

        {/* 3D Camera Mode Selectors */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-[10px] font-mono flex-wrap">
          <button
            onClick={() => handleCameraModeChange('isometric')}
            className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 font-bold ${
              cameraMode === 'isometric'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="3D Isometric View"
          >
            <Compass className="w-3 h-3" />
            <span>ไอโซเมตริก</span>
          </button>
          
          <button
            onClick={() => handleCameraModeChange('chase')}
            className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 font-bold ${
              cameraMode === 'chase'
                ? 'bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="3D Chase Camera Mode"
          >
            <Navigation className="w-3 h-3" />
            <span>ตามรถ</span>
          </button>

          {/* First-Person View (FPV) */}
          <button
            onClick={() => handleCameraModeChange('fpv')}
            className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 font-bold ${
              cameraMode === 'fpv'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="First-Person View (มุมมองบุคคลที่หนึ่ง POV)"
          >
            <Video className="w-3 h-3" />
            <span>บุคคลที่ 1 (FPV)</span>
          </button>

          {/* Drone High-Altitude View */}
          <button
            onClick={() => handleCameraModeChange('drone')}
            className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 font-bold ${
              cameraMode === 'drone'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Drone Overhead Sky Perspective"
          >
            <Plane className="w-3 h-3" />
            <span>โดรนมุมสูง</span>
          </button>

          {/* LiDAR Mode */}
          <button
            onClick={() => handleCameraModeChange('lidar')}
            className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 font-bold ${
              cameraMode === 'lidar'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="LiDAR Radar Dark Mode"
          >
            <Cpu className="w-3 h-3" />
            <span>LiDAR</span>
          </button>

          {/* 3D Elevation Quick Control */}
          <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-lg border border-cyan-500/30">
            <span className="text-[9px] text-cyan-300 font-bold">ลอยสูง:</span>
            <input
              type="range"
              min="0"
              max="150"
              step="5"
              value={elevation3D}
              onChange={(e) => setElevation3D(Number(e.target.value))}
              className="w-12 sm:w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-[#00D2FF]"
              title="ปรับระดับความลอยสูง 3 มิติ"
            />
            <span className="text-[9px] text-[#FFD700] font-black">{elevation3D}m</span>
          </div>

          <button
            onClick={() => setShowControlsPanel(!showControlsPanel)}
            className={`p-1 rounded-lg border transition-all ${
              showControlsPanel ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400' : 'bg-transparent text-slate-400 border-transparent hover:text-white'
            }`}
            title="ปรับแต่งมุมมองสภาพอากาศ & แผนที่"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Expand/Collapse Map Screen */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? 'ย่อแผนที่' : 'ขยายแผนที่เต็มพื้นที่'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* POPUP: ADVANCED 3D PERSPECTIVE & WEATHER CONTROLLER */}
      {showControlsPanel && (
        <div className="relative z-20 px-3 py-2 bg-slate-950/95 border-b border-cyan-500/20 flex items-center justify-between gap-4 text-[10px] font-mono flex-wrap animate-fadeIn">
          {/* Weather Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">สภาพอากาศ:</span>
            {[
              { id: 'clear' as const, label: '☀️ แจ่มใส' },
              { id: 'rain' as const, label: '🌧️ ฝนตก' },
              { id: 'heat' as const, label: '🔥 ร้อนจัด' },
              { id: 'storm' as const, label: '⚡ พายุ' },
              { id: 'traffic_dense' as const, label: '🚗 รถติด' }
            ].map(w => (
              <button
                key={w.id}
                onClick={() => setWeatherCondition(w.id)}
                className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold ${
                  weatherCondition === w.id ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-black text-slate-400 border-white/10'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBuildings3D(!showBuildings3D)}
              className={`px-2 py-1 rounded-md border text-[9px] font-bold transition-all ${
                showBuildings3D ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black text-slate-500 border-white/10'
              }`}
            >
              🏢 ตึก 3D {showBuildings3D ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setShowCapillaryShortcuts(!showCapillaryShortcuts)}
              className={`px-2 py-1 rounded-md border text-[9px] font-bold transition-all ${
                showCapillaryShortcuts ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-black text-slate-500 border-white/10'
              }`}
            >
              ⚡ ซอยลัด CI {showCapillaryShortcuts ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setShowSkytrainViaduct(!showSkytrainViaduct)}
              className={`px-2 py-1 rounded-md border text-[9px] font-bold transition-all ${
                showSkytrainViaduct ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-black text-slate-500 border-white/10'
              }`}
            >
              🚆 ราง BTS {showSkytrainViaduct ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* A -> B -> C PASSENGER TRIP SIMULATION CONTROLLER & STEPPER */}
      <div className="p-3 bg-gradient-to-r from-[#061229] via-[#091D3E] to-[#050E24] border-b border-cyan-500/40 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg ${
              customerTripPhase === 'driver_coming'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_#00D2FF]'
                : customerTripPhase === 'at_pickup'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_#F59E0B]'
                : customerTripPhase === 'en_route'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_#10B981]'
                : 'bg-emerald-400 text-slate-950 shadow-[0_0_15px_#10B981]'
            }`}>
              {customerTripPhase === 'driver_coming' ? '🛵' : customerTripPhase === 'at_pickup' ? '📍' : customerTripPhase === 'en_route' ? '🚀' : '🏁'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white font-mono">
                  {customerTripPhase === 'driver_coming'
                    ? 'ขั้นตอนที่ 1: พี่วินกำลังเดินทางมารับคุณ (A ➔ B)'
                    : customerTripPhase === 'at_pickup'
                    ? 'ขั้นตอนที่ 2: พี่วินถึงจุดรับคุณแล้ว / รับพัสดุ (จุด B)'
                    : customerTripPhase === 'en_route'
                    ? 'ขั้นตอนที่ 3: กำลังเดินทางสู่จุดหมายปลายทาง (B ➔ C)'
                    : 'ขั้นตอนที่ 4: ถึงจุดหมายปลายทางเรียบร้อย (จุด C)'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[9px] font-mono font-bold animate-pulse">
                  ● 3D LIVE MAP
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                จุด A (ซุ้มพี่วิน) ➔ จุด B ({pickupLocation.slice(0, 15)}) ➔ จุด C ({destinationLocation.slice(0, 15)})
              </p>
            </div>
          </div>

          {/* Speed & Playback */}
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <div className="flex items-center bg-black/60 p-0.5 rounded-xl border border-white/10 text-[9px] font-mono">
              {[0.5, 1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(750);
                    setSpeedMultiplier(s);
                  }}
                  className={`px-1.5 py-0.5 rounded-lg font-bold transition-all ${
                    speedMultiplier === s ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setIsPlaying(!isPlaying);
              }}
              className={`px-2.5 py-1 rounded-xl font-mono text-[10px] font-bold border transition-all ${
                isPlaying 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isPlaying ? '⏸️ พัก' : '▶️ เล่น'}
            </button>
          </div>
        </div>

        {/* 4 Stage Quick Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[9px]">
          <button
            onClick={() => jumpToCustomerStage('A')}
            className={`p-1.5 rounded-xl border text-left transition-all ${
              tripProgress <= 0.25
                ? 'bg-cyan-500 text-slate-950 border-white font-black shadow-[0_0_10px_#00D2FF]'
                : 'bg-black/40 border-cyan-500/30 text-cyan-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">🚩 จุด A (พี่วิน)</span>
              <span>0%</span>
            </div>
            <p className="opacity-75 truncate text-[8px]">BTS พร้อมพงษ์</p>
          </button>

          <button
            onClick={() => jumpToCustomerStage('B')}
            className={`p-1.5 rounded-xl border text-left transition-all ${
              tripProgress >= 0.48 && tripProgress <= 0.52
                ? 'bg-amber-400 text-slate-950 border-white font-black shadow-[0_0_10px_#F59E0B]'
                : 'bg-black/40 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">📍 จุด B (จุดรับคุณ)</span>
              <span>50%</span>
            </div>
            <p className="opacity-75 truncate text-[8px]">{pickupLocation.slice(0, 16)}</p>
          </button>

          <button
            onClick={() => jumpToCustomerStage('B_TO_C')}
            className={`p-1.5 rounded-xl border text-left transition-all ${
              tripProgress > 0.52 && tripProgress < 0.98
                ? 'bg-emerald-500 text-slate-950 border-white font-black shadow-[0_0_10px_#10B981]'
                : 'bg-black/40 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">🚀 มุ่งหน้าปลายทาง</span>
              <span>75%</span>
            </div>
            <p className="opacity-75 truncate text-[8px]">ซอยลัดประสานมิตร 23</p>
          </button>

          <button
            onClick={() => jumpToCustomerStage('C')}
            className={`p-1.5 rounded-xl border text-left transition-all ${
              tripProgress >= 0.98
                ? 'bg-emerald-400 text-slate-950 border-white font-black shadow-[0_0_10px_#10B981]'
                : 'bg-black/40 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">🏁 จุด C (ถึงที่หมาย)</span>
              <span>100%</span>
            </div>
            <p className="opacity-75 truncate text-[8px]">{destinationLocation.slice(0, 16)}</p>
          </button>
        </div>

        {/* Passenger Timeline Slider */}
        <div className="relative flex items-center pt-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={tripProgress}
            onChange={(e) => setTripProgress(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950 pointer-events-none shadow-[0_0_8px_#F59E0B]" title="จุด B (รับคุณ)" />
        </div>
      </div>

      {/* MULTI-ROUTE SELECTION STRIP (PASSENGER PERSPECTIVE) */}
      <div className="relative z-20 px-3 py-2 bg-[#061026] border-b border-cyan-500/30 flex items-center justify-between gap-2 overflow-x-auto text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-white font-bold flex items-center gap-1 text-[11px]">
            <Route className="w-3.5 h-3.5 text-cyan-400" />
            <span>เส้นทางที่พี่วินเลือก:</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {BANGKOK_COMPLEX_ROUTES.map(route => {
            const isSelected = route.id === selectedRouteId;
            return (
              <button
                key={route.id}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setSelectedRouteId(route.id);
                }}
                className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                    : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <span>{route.badge}</span>
                <span className="font-mono">({route.distanceKm}km • ~{route.estMinutes}m)</span>
              </button>
            );
          })}

          <button
            onClick={() => setShowWaypointDrawer(!showWaypointDrawer)}
            className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-[10px] flex items-center gap-0.5"
            title="ดูรายละเอียดจุดเลี้ยว"
          >
            <span>{showWaypointDrawer ? '▲ ซ่อน' : '▼ ดูจุดเลี้ยว'}</span>
          </button>
        </div>
      </div>

      {/* WAYPOINT TIMELINE DRAWER */}
      {showWaypointDrawer && (
        <div className="relative z-20 p-3 bg-slate-950/95 border-b border-cyan-500/30 space-y-2 animate-fadeIn text-xs">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-cyan-300 font-bold">🛣️ ข้อมูลขั้นตอนนำทาง (Turn-by-Turn Route Navigation):</span>
            <span className="text-emerald-400 font-bold">เลี่ยงรถติด: {activeRoute.trafficAvoidancePercent}%</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {activeRoute.waypoints.map((wp, i) => (
              <div key={wp.id} className="p-2 rounded-xl bg-slate-900 border border-white/10 text-[10px] space-y-1">
                <div className="flex items-center justify-between font-mono font-bold text-cyan-400">
                  <span>#{i + 1} {wp.name}</span>
                  <span className="text-slate-400">{wp.distanceFromPrevM} ม.</span>
                </div>
                <p className="text-slate-300 line-clamp-2">{wp.instructionThai}</p>
                {wp.warningNote && <span className="text-amber-400 font-mono block">⚠️ {wp.warningNote}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEWPORT: GOOGLE MAPS OR 3D CAPILLARY RADAR */}
      {mapDisplayMode === 'google_maps' ? (
        <div className="p-3 bg-[#030816]">
          <GoogleMapsLiveView
            gpsLocation={gpsState}
            targetDestination={destinationLocation}
            height={isExpanded ? '480px' : '360px'}
            audioEnabled={audioEnabled}
          />
        </div>
      ) : (
        /* 3D VIEWPORT CONTAINER */
        <div 
          className={`relative w-full overflow-hidden bg-gradient-to-b ${weatherGradients[weatherCondition]} flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-300 ${
            isExpanded ? 'h-[460px]' : 'h-72 sm:h-84'
          }`}
          style={{ perspective: cameraMode === 'fpv' ? '600px' : '900px' }}
        >
        {/* Weather FX Overlays */}
        {weatherCondition === 'rain' && (
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,180,255,0.25),transparent_70%)] animate-pulse" />
        )}
        {weatherCondition === 'heat' && (
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,120,0,0.25),transparent_70%)]" />
        )}
        {weatherCondition === 'storm' && (
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(160,32,240,0.3),transparent_70%)] animate-pulse" />
        )}

        {/* Drone View Grid & Compass Telemetry Overlay */}
        {cameraMode === 'drone' && (
          <div className="absolute inset-0 pointer-events-none z-10 p-4 flex flex-col justify-between text-cyan-400 font-mono text-[10px]">
            <div className="flex justify-between items-start bg-black/60 p-2 rounded-xl border border-cyan-500/30">
              <div>
                <span>DRONE OVERHEAD ELEVATION: <strong>500 METERS</strong></span>
                <p className="text-[9px] text-slate-400">CI MAP HIGH-ALTITUDE SCANNER ACTIVE</p>
              </div>
              <span className="text-amber-400 font-bold">GRID ACCURACY: 99.8%</span>
            </div>
            <div className="text-center">
              <span className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400 text-cyan-300">
                จำลองโครงข่ายเส้นเลือดฝอย อโศก-พร้อมพงษ์-สุขุมวิท
              </span>
            </div>
          </div>
        )}

        {/* 3D TRANSFORMED CITY PLANE */}
        <div 
          className="relative w-[130%] h-[130%] transition-transform duration-300 ease-out pointer-events-auto"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${customPitch}deg) rotateZ(${customHeading}deg) scale(${zoomLevel}) translateY(${cameraMode === 'fpv' ? '80px' : '20px'}) translateZ(${elevation3D * 1.2}px)`,
          }}
        >
          {/* 1. 3D CYBERPUNK FLOOR GRID */}
          <div 
            className="absolute inset-0 rounded-3xl border border-cyan-500/30"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(0, 210, 255, 0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0, 210, 255, 0.12) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              backgroundColor: cameraMode === 'lidar' ? '#000814' : '#050D20'
            }}
          />

          {/* 2. SVG LAYER: CANAL, ROADS, BTS SKYTRAIN, CAPILLARY SHORTCUTS */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translateZ(2px)' }}>
            
            {/* KHLONG SAEN SAEP CANAL */}
            {showCanalDetails && (
              <g>
                <path
                  d="M 5% 58% Q 30% 55% 50% 52% T 95% 45%"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.65"
                />
                <path
                  d="M 5% 58% Q 30% 55% 50% 52% T 95% 45%"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeDasharray="14 10"
                  className="animate-pulse"
                />
                {/* Motorbike Bridge */}
                <line x1="36%" y1="53%" x2="40%" y2="63%" stroke="#E2E8F0" strokeWidth="7" strokeLinecap="square" />
              </g>
            )}

            {/* Sukhumvit Main Road */}
            <line x1="5%" y1="82%" x2="95%" y2="82%" stroke="#1E293B" strokeWidth="24" strokeLinecap="round" />
            <line x1="5%" y1="82%" x2="95%" y2="82%" stroke="#FCD34D" strokeWidth="1.5" strokeDasharray="12 8" />

            {/* Asoke Montri Road */}
            <line x1="64%" y1="95%" x2="64%" y2="15%" stroke="#1E293B" strokeWidth="22" strokeLinecap="round" />
            <line x1="64%" y1="95%" x2="64%" y2="15%" stroke="#FCD34D" strokeWidth="1.5" strokeDasharray="12 8" />

            {/* BTS Elevated Track & Animated Train */}
            {showSkytrainViaduct && (
              <g style={{ transform: 'translateZ(12px)' }}>
                <line x1="5%" y1="82%" x2="95%" y2="82%" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
                <line x1="5%" y1="82%" x2="95%" y2="82%" stroke="#10B981" strokeWidth="3" strokeDasharray="16 8" opacity="0.85" />
                
                {/* BTS Stations */}
                <rect x="12%" y="80.5%" width="7%" height="3%" fill="#059669" rx="2" />
                <rect x="60%" y="80.5%" width="7%" height="3%" fill="#059669" rx="2" />

                {/* BTS Train */}
                <rect 
                  x={`${(trainProgress * 80) + 5}%`} 
                  y="81.2%" 
                  width="5%" 
                  height="1.6%" 
                  fill="#FFFFFF" 
                  rx="1" 
                  stroke="#10B981" 
                  strokeWidth="1"
                  className="drop-shadow-[0_0_6px_#10B981]" 
                />
              </g>
            )}

            {/* CAPILLARY SHORTCUT ALLEYS */}
            {showCapillaryShortcuts && (
              <g>
                <path 
                  d="M 14% 82% L 22% 72% L 30% 68% L 38% 58% L 44% 52% L 54% 44% L 68% 34% L 78% 24% L 86% 16%" 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="4" 
                  strokeDasharray="4 4" 
                  opacity="0.6" 
                />
                <path 
                  d="M 30% 68% Q 40% 70% 50% 65% T 64% 55%" 
                  fill="none" 
                  stroke="#06B6D4" 
                  strokeWidth="3" 
                  strokeDasharray="3 3" 
                  opacity="0.5" 
                />
              </g>
            )}

            {/* TRAFFIC DENSITY HOTSPOT */}
            {showTrafficDensity && (
              <g>
                <line x1="58%" y1="82%" x2="70%" y2="82%" stroke="#EF4444" strokeWidth="6" strokeOpacity="0.8" strokeDasharray="5 3" />
                <line x1="64%" y1="70%" x2="64%" y2="90%" stroke="#EF4444" strokeWidth="6" strokeOpacity="0.8" strokeDasharray="5 3" />
              </g>
            )}

            {/* 6. MULTI-STAGE A -> B -> C LASER PATHS */}
            {/* Leg 1: A -> B (Cyan High-Intensity Laser with Pulse) */}
            {routeLegs.svgAtoB && (
              <g>
                <path 
                  d={routeLegs.svgAtoB} 
                  fill="none" 
                  stroke="#00D2FF" 
                  strokeWidth="7" 
                  strokeLinecap="round"
                  strokeOpacity={tripProgress <= 0.5 ? 0.95 : 0.4}
                  style={{ filter: 'drop-shadow(0 0 14px #00D2FF)' }}
                />
                <path 
                  d={routeLegs.svgAtoB} 
                  fill="none" 
                  stroke="#FFFFFF" 
                  strokeWidth="2.5" 
                  strokeDasharray="12 8" 
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              </g>
            )}

            {/* Leg 2: B -> C (Emerald / Gold High-Intensity Laser with Pulse) */}
            {routeLegs.svgBtoC && (
              <g>
                <path 
                  d={routeLegs.svgBtoC} 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="7" 
                  strokeLinecap="round"
                  strokeOpacity={tripProgress > 0.5 ? 0.95 : 0.4}
                  style={{ filter: 'drop-shadow(0 0 14px #10B981)' }}
                />
                <path 
                  d={routeLegs.svgBtoC} 
                  fill="none" 
                  stroke="#FFD700" 
                  strokeWidth="2.5" 
                  strokeDasharray="12 8" 
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              </g>
            )}
          </svg>

          {/* 3. 3D DETAILED BUILDINGS */}
          {showBuildings3D && BANGKOK_3D_LANDMARKS.map((b) => (
            <div
              key={b.id}
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setSelectedLandmark(b);
              }}
              className="absolute pointer-events-auto cursor-pointer hover:scale-105 transition-all"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.width}px`,
                height: `${b.height}px`,
                transformStyle: 'preserve-3d',
                transform: `translateZ(${b.depth / 2}px)`
              }}
            >
              <div 
                className="relative w-full h-full rounded-md border flex flex-col justify-between p-1 shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${b.color}22 0%, #030816 100%)`,
                  borderColor: `${b.color}66`,
                  boxShadow: `0 0 15px ${b.color}33, inset 0 0 10px ${b.color}22`,
                  transform: `translateZ(${b.depth}px) rotateX(-90deg)`,
                  transformOrigin: 'bottom center',
                  height: `${b.depth * 1.5}px`
                }}
              >
                <div className="grid grid-cols-3 gap-0.5 opacity-60">
                  {Array.from({ length: Math.min(12, b.floors * 2) }).map((_, wIdx) => (
                    <div 
                      key={wIdx} 
                      className="h-1 rounded-[1px]" 
                      style={{ backgroundColor: wIdx % 2 === 0 ? b.color : 'rgba(255,255,255,0.2)' }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[7px] font-mono text-white/90 px-0.5 border-t border-white/20">
                  <span className="truncate">{b.name.split(' ')[0]}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                </div>
              </div>
            </div>
          ))}

          {/* 4. MICRO-INFRASTRUCTURE MARKERS */}
          {BANGKOK_MAP_INFRASTRUCTURE.map(infra => (
            <div
              key={infra.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
              style={{
                left: `${infra.x}%`,
                top: `${infra.y}%`,
                transform: 'translate(-50%, -50%) translateZ(15px)'
              }}
            >
              <div className={`p-1 rounded-lg border text-[10px] shadow-lg ${
                infra.type === 'win_station' ? 'bg-amber-500 text-slate-950 border-white' : 'bg-emerald-500 text-slate-950 border-white'
              }`}>
                {infra.type === 'win_station' ? '🏍️' : '⚡'}
              </div>
            </div>
          ))}

          {/* 5. 3D WAYPOINT TOWERS (เสาเลเซอร์ 3 มิติ A, B, C) */}
          {/* POINT A: Driver Initial Location (ซุ้มวิน BTS พร้อมพงษ์) */}
          <div 
            className="absolute pointer-events-auto cursor-pointer flex flex-col items-center justify-center z-30"
            style={{
              left: `${routeLegs.pointA.x}%`,
              top: `${routeLegs.pointA.y}%`,
              transformStyle: 'preserve-3d',
              transform: 'translate(-50%, -50%) translateZ(24px)'
            }}
            onClick={() => jumpToCustomerStage('A')}
          >
            <div className="px-2 py-0.5 rounded-xl bg-[#091633] text-cyan-300 font-bold text-[9px] font-mono flex items-center gap-1 border-2 border-cyan-400 shadow-[0_0_18px_rgba(0,210,255,0.7)] whitespace-nowrap animate-bounce">
              <span>🚩 จุด A (พี่วิน)</span>
            </div>
            <div className="w-1 h-8 bg-gradient-to-t from-cyan-400 to-transparent shadow-[0_0_8px_#00D2FF]" />
            <div className="w-4 h-4 rounded-full bg-cyan-400/40 border border-cyan-300 animate-ping -mt-1" />
          </div>

          {/* POINT B: Customer / Parcel Pickup Location (จุดรับของคุณหรือพัสดุ) */}
          <div 
            className="absolute pointer-events-auto cursor-pointer flex flex-col items-center justify-center z-30"
            style={{
              left: `${routeLegs.pointB.x}%`,
              top: `${routeLegs.pointB.y}%`,
              transformStyle: 'preserve-3d',
              transform: 'translate(-50%, -50%) translateZ(28px)'
            }}
            onClick={() => jumpToCustomerStage('B')}
          >
            <div className="px-2 py-0.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] font-mono flex items-center gap-1 border-2 border-white shadow-[0_0_20px_#F59E0B] whitespace-nowrap animate-pulse">
              <span>📍 จุด B (จุดรับ: {pickupLocation.split(' ')[0]})</span>
            </div>
            <div className="w-1.5 h-10 bg-gradient-to-t from-amber-400 to-transparent shadow-[0_0_12px_#F59E0B]" />
            <div className="w-5 h-5 rounded-full bg-amber-400/40 border border-amber-300 animate-ping -mt-1" />
          </div>

          {/* POINT C: Destination (จุดหมายปลายทาง) */}
          <div 
            className="absolute pointer-events-auto cursor-pointer flex flex-col items-center justify-center z-30"
            style={{
              left: `${routeLegs.pointC.x}%`,
              top: `${routeLegs.pointC.y}%`,
              transformStyle: 'preserve-3d',
              transform: 'translate(-50%, -50%) translateZ(30px)'
            }}
            onClick={() => jumpToCustomerStage('C')}
          >
            <div className="px-2 py-0.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-[9px] font-mono flex items-center gap-1 shadow-[0_0_20px_#10B981] border-2 border-white whitespace-nowrap animate-bounce">
              <MapPin className="w-3 h-3 fill-slate-950 text-slate-950" />
              <span>🏁 จุด C ({destinationLocation.split(' ')[0]})</span>
            </div>
            <div className="w-1.5 h-12 bg-gradient-to-t from-emerald-400 to-transparent shadow-[0_0_15px_#10B981]" />
            <div className="w-6 h-6 rounded-full bg-emerald-400/50 border border-emerald-300 animate-ping -mt-1" />
          </div>

          {/* 6. 3D MOVING KNIGHT RIDER */}
          <div 
            className="absolute pointer-events-none transition-all duration-200 ease-out z-40"
            style={{
              left: `${riderPos.x}%`,
              top: `${riderPos.y}%`,
              transformStyle: 'preserve-3d',
              transform: `translate(-50%, -50%) translateZ(22px) rotateZ(${riderPos.angle + customHeading}deg)`
            }}
          >
            <div className="absolute -inset-4 rounded-full bg-cyan-400/40 blur-md animate-pulse" />
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-slate-950 border-2 border-white shadow-[0_0_25px_#00D2FF] flex items-center justify-center text-lg">
              {driverEmoji}
            </div>
          </div>
        </div>

        {/* First-Person View (FPV) Cockpit Overlay */}
        {cameraMode === 'fpv' && (
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
            <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 bg-black/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              <span className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>FIRST PERSON COCKPIT HUD (มุมมองผู้ขับขี่จริง)</span>
              </span>
              <span>HEADING: {riderPos.angle.toFixed(1)}°</span>
            </div>

            <div className="w-full flex justify-center items-end">
              <div className="relative px-6 py-2.5 rounded-t-3xl bg-slate-950/90 border-t-2 border-x-2 border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center gap-6">
                <div className="text-center font-mono">
                  <span className="text-[9px] text-slate-400">SPEED</span>
                  <p className="text-xl font-black text-emerald-300">{riderSpeed} <span className="text-[10px]">km/h</span></p>
                </div>
                <div className="w-[1px] h-8 bg-white/20" />
                <div className="text-center font-mono">
                  <span className="text-[9px] text-slate-400">GEAR</span>
                  <p className="text-xl font-black text-[#FFD700]">D3</p>
                </div>
                <div className="w-[1px] h-8 bg-white/20" />
                <div className="text-center font-mono">
                  <span className="text-[9px] text-slate-400">ETA</span>
                  <p className="text-xl font-black text-cyan-300">~{dynamicEta}m</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Zoom & Controls Widget */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-2xl border border-cyan-500/30 shadow-xl">
          <button
            onClick={() => handleZoom(0.15)}
            className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-cyan-300 hover:text-white transition-colors"
            title="ซูมเข้า (+)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-1.5 py-1 rounded-lg text-[9px] font-mono font-bold text-slate-400 hover:text-cyan-300 transition-colors text-center"
            title="รีเซ็ตระดับซูม (1x)"
          >
            {zoomLevel.toFixed(1)}x
          </button>
          <button
            onClick={() => handleZoom(-0.15)}
            className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-cyan-300 hover:text-white transition-colors"
            title="ซูมออก (-)"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

          {/* Bottom Floating Stealth ETA HUD */}
          <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-cyan-500/40 text-xs font-mono flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>ความเร็ว: <strong>{riderSpeed} กม./ชม.</strong></span>
            </div>
            <div className="text-amber-400">
              ระยะทางเหลือ: <strong>{remainingMeters} ม.</strong>
            </div>
            <div className="text-emerald-400">
              ETA: <strong>~{dynamicEta} นาที</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
