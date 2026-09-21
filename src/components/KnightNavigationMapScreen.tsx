import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Navigation,
  MapPin,
  Compass,
  Phone,
  MessageSquare,
  Shield,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCw,
  Zap,
  Clock,
  Eye,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Send,
  Radio,
  ArrowUpRight,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  Sliders,
  Award,
  Plus,
  Minus,
  CloudRain,
  Sun,
  Flame,
  CloudLightning,
  Plane,
  Video,
  Activity,
  TrendingUp,
  BarChart2,
  BatteryCharging,
  QrCode,
  Globe,
  Home,
  Check,
  LocateFixed,
  Route,
  Droplet,
  Train,
  Anchor,
  Cpu,
  Tv,
  HelpCircle,
  Footprints,
  Info,
  DollarSign,
  Gauge,
  Camera,
  Play,
  Pause,
  RefreshCw,
  Star,
  Receipt,
  CheckCheck,
  Smartphone,
  ShieldCheck,
  UserCheck,
  SlidersHorizontal,
  Volume1,
  MessageCircle,
  X
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { IncomingJobData } from './DriverStandbyAndIncomingJob';
import { Vehicle } from '../types';
import { 
  playTactileBlip, 
  playRadarScan, 
  playEngineRev, 
  playLevelUpFanfare, 
  speakThaiText, 
  playCameraSnap, 
  playPaymentSuccessChime,
  AIVoicePersona,
  AI_VOICE_PERSONAS
} from '../utils/audio';
import { DensityRadarOverlay } from './DensityRadarOverlay';
import { DriverPaymentQrCodeModal } from './DriverPaymentQrCodeModal';
import { InRideDirectChatModal } from './InRideDirectChatModal';
import { RealGpsMapModal } from './RealGpsMapModal';
import { ARLiveCameraNavigation, ARManeuverType } from './ARLiveCameraNavigation';
import { VirtualArOverlay } from './VirtualArOverlay';
import { GoogleMapsLiveView } from './GoogleMapsLiveView';
import { GoogleMapsNavigationScreen } from './GoogleMapsNavigationScreen';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { chatWithPassengerOnLine } from '../utils/lineIntegration';
import {
  computeLiveRoute,
  ComputedLiveRoute,
  LiveRouteStep,
  RouteDestination,
  POPULAR_BANGKOK_DESTINATIONS,
  searchDestinationsFromGps
} from '../services/googleRoutesService';
import confetti from 'canvas-confetti';
import {
  BANGKOK_COMPLEX_ROUTES,
  BANGKOK_3D_LANDMARKS,
  BANGKOK_MAP_INFRASTRUCTURE,
  BangkokComplexRoute,
  RouteWaypoint,
  MapLandmark3D,
  MapInfrastructurePoint
} from '../data/bangkokCapillaryRoutes';

export interface KnightNavigationMapScreenProps {
  activeJob?: IncomingJobData | null;
  activeVehicle?: Vehicle;
  driverLevel?: number;
  audioEnabled?: boolean;
  onAdvanceTripStep?: () => void;
  onCompleteTrip?: (job: IncomingJobData) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
  initialNavMode?: '3d_map' | 'google_maps' | 'live_camera_ar';
}

export const KnightNavigationMapScreen: React.FC<KnightNavigationMapScreenProps> = ({
  activeJob,
  activeVehicle,
  driverLevel = 100,
  audioEnabled = true,
  onAdvanceTripStep,
  onCompleteTrip,
  onClose,
  isEmbedded = false,
  initialNavMode
}) => {
  // Active Selected Job
  const EMPTY_REAL_JOB: IncomingJobData = {
    id: '',
    serviceId: 'knight',
    serviceTitle: '',
    serviceIconEmoji: '',
    customerName: '',
    customerRating: 0,
    customerPhone: '',
    customerAvatarEmoji: '',
    pickupLocation: '',
    dropoffLocation: '',
    distanceKm: 0,
    driverDistanceToPickupKm: 0,
    fairDispatchQueueRank: 0,
    totalCandidatesInRadius: 0,
    estMinutes: 0,
    baseFare: 0,
    tips: 0,
    netFare: 0,
    platformFee: 0,
    xpReward: 0,
    urgency: 'normal'
  };
  const [selectedJob, setSelectedJob] = useState<IncomingJobData>(() => activeJob || EMPTY_REAL_JOB);
  
  // Trip navigation phase for a real accepted order.
  // Phase: 'to_pickup' (A -> B), 'at_pickup' (B), 'to_destination' (B -> C), 'arrived_destination' (C)
  const [navPhase, setNavPhase] = useState<'to_pickup' | 'at_pickup' | 'to_destination' | 'arrived_destination'>('to_pickup');

  // Multi-Route Selection (Complex Route Network)
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-ci-capillary');
  const activeRoute = useMemo(() => {
    return BANGKOK_COMPLEX_ROUTES.find(r => r.id === selectedRouteId) || BANGKOK_COMPLEX_ROUTES[0];
  }, [selectedRouteId]);

  // Split Route into Leg 1 (A -> B: Pickup) and Leg 2 (B -> C: Dropoff)
  const routeLegs = useMemo(() => {
    const pts = activeRoute.points || [];
    const midIndex = Math.max(1, Math.min(pts.length - 2, Math.floor(pts.length * 0.5)));
    const legAtoB = pts.slice(0, midIndex + 1);
    const legBtoC = pts.slice(midIndex);

    // Build SVG paths for both legs
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

  // Trip progress reflects the real accepted-order phase; it is advanced by the trip state machine.
  const [tripProgress, setTripProgress] = useState<number>(activeJob ? 0.08 : 0);

  // Camera & Visual HUD Controls: '3d_chase' | '3d_isometric' | '2d_radar' | 'drone' | 'fpv' | 'lidar'
  const [cameraView, setCameraView] = useState<'3d_chase' | '3d_isometric' | '2d_radar' | 'drone' | 'fpv' | 'lidar'>('3d_chase');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [elevation3D, setElevation3D] = useState<number>(45); // 0m to 150m (3D Floating Height / Altitude)
  const [cleanMapMode, setCleanMapMode] = useState<boolean>(false);
  const [showCapillaryLanes, setShowCapillaryLanes] = useState<boolean>(true);
  const [showTrafficHeatmap, setShowTrafficHeatmap] = useState<boolean>(true);
  const [show3DBuildings, setShow3DBuildings] = useState<boolean>(true);
  const [showSkytrainViaduct, setShowSkytrainViaduct] = useState<boolean>(true);
  const [showCanalDetails, setShowCanalDetails] = useState<boolean>(true);
  const [showInfrastructureNodes, setShowInfrastructureNodes] = useState<boolean>(true);
  const [showWaypointsList, setShowWaypointsList] = useState<boolean>(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState<RouteWaypoint | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<MapLandmark3D | null>(null);
  const [selectedInfraPoint, setSelectedInfraPoint] = useState<MapInfrastructurePoint | null>(null);

  // Audio & AI Voice Guidance Customizer
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState<boolean>(true);
  const [voicePersona, setVoicePersona] = useState<AIVoicePersona>('fah_sai');
  const [voiceSpeedRate, setVoiceSpeedRate] = useState<number>(1.05);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showQuickChatModal, setShowQuickChatModal] = useState<boolean>(false);
  const [chatToast, setChatToast] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState<boolean>(false);

  // 3D Density Radar (2.5 km) & Driver QR Code Modals
  const [showRadarModal, setShowRadarModal] = useState<boolean>(false);
  const [showQrPayModal, setShowQrPayModal] = useState<boolean>(false);
  const [showDirectChatModal, setShowDirectChatModal] = useState<boolean>(false);
  const [showRealGpsModal, setShowRealGpsModal] = useState<boolean>(false);

  // Job Completion Workflow States (Proof of Delivery, QR Payment, Rating)
  const [showDeliveryProofModal, setShowDeliveryProofModal] = useState<boolean>(false);
  const [capturedProofPhoto, setCapturedProofPhoto] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState<boolean>(false);
  const [proofChecklist, setProofChecklist] = useState<{ helmCheck: boolean; safeHandover: boolean; packageIntact: boolean }>({
    helmCheck: true,
    safeHandover: true,
    packageIntact: true
  });
  const [paymentStepDone, setPaymentStepDone] = useState<boolean>(false);
  const [customerStarRating, setCustomerStarRating] = useState<number>(5);
  const [customerTip, setCustomerTip] = useState<number>(20);
  const [completionStep, setCompletionStep] = useState<'photo' | 'payment' | 'rating' | 'success'>('photo');

  // Google Maps Real-time Traffic Layer Status
  const [googleMapsLiveActive, setGoogleMapsLiveActive] = useState<boolean>(true);
  
  // Google Maps Navigation View Mode: default to google_maps (3D map disabled)
  const [navDisplayMode, setNavDisplayMode] = useState<'google_maps' | 'live_camera_ar'>('google_maps');
  const [driverLegPhase, setDriverLegPhase] = useState<'to_pickup' | 'to_destination'>('to_pickup');
  const { gpsState } = useRealtimeGps(true);

  // Google Maps Routes API (New) Live Integration State
  const [selectedDestination, setSelectedDestination] = useState<RouteDestination>({
    id: '', name: '', nameEn: '', category: '', lat: 0, lng: 0,
    address: '', landmark: '', estimatedFare: 0
  });
  const [liveRoute, setLiveRoute] = useState<ComputedLiveRoute | null>(null);
  const [isComputingRoute, setIsComputingRoute] = useState<boolean>(false);
  const [currentRouteStepIndex, setCurrentRouteStepIndex] = useState<number>(0);
  const [routeTravelMode, setRouteTravelMode] = useState<'TWO_WHEELER' | 'DRIVE' | 'BICYCLE'>('TWO_WHEELER');
  const [showDestinationPicker, setShowDestinationPicker] = useState<boolean>(false);
  const [destinationSearchQuery, setDestinationSearchQuery] = useState<string>('');
  const [destinationSearchResults, setDestinationSearchResults] = useState<RouteDestination[]>([]);
  const [isSearchingDestination, setIsSearchingDestination] = useState<boolean>(false);
  const [destinationInputError, setDestinationInputError] = useState<string>('');

  // Real-time mobile camera backdrop behind 3D map
  const [cameraBackdropActive, setCameraBackdropActive] = useState<boolean>(false);
  const [backdropCameraFacing, setBackdropCameraFacing] = useState<'environment' | 'user'>('environment');
  const [backdropCameraLive, setBackdropCameraLive] = useState<boolean>(false);
  const [backdropManeuver, setBackdropManeuver] = useState<ARManeuverType>('turn_left');
  const [backdropManeuverDist, setBackdropManeuverDist] = useState<number>(45);
  const [backdropManeuverStreet, setBackdropManeuverStreet] = useState<string>('ซอยสุขุมวิท 39 (พร้อมพงษ์)');
  const backdropVideoRef = useRef<HTMLVideoElement | null>(null);
  const backdropStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (cameraBackdropActive && navDisplayMode === '3d_map') {
      if (navigator?.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: backdropCameraFacing } },
          audio: false
        }).then(stream => {
          backdropStreamRef.current = stream;
          setBackdropCameraLive(true);
          if (backdropVideoRef.current) {
            backdropVideoRef.current.srcObject = stream;
            backdropVideoRef.current.play().catch(() => {});
          }
        }).catch(err => {
          console.warn('Camera backdrop access:', err);
          setBackdropCameraLive(false);
        });
      }
    } else {
      if (backdropStreamRef.current) {
        backdropStreamRef.current.getTracks().forEach(t => t.stop());
        backdropStreamRef.current = null;
      }
      if (backdropVideoRef.current) {
        backdropVideoRef.current.srcObject = null;
      }
      setBackdropCameraLive(false);
    }

    return () => {
      if (backdropStreamRef.current) {
        backdropStreamRef.current.getTracks().forEach(t => t.stop());
        backdropStreamRef.current = null;
      }
    };
  }, [cameraBackdropActive, navDisplayMode, backdropCameraFacing]);

  // Handle Google Maps Routes API Calculation
  const handleCalculateRoute = async (targetDest?: RouteDestination) => {
    const dest = targetDest || selectedDestination;
    if (!gpsState.isRealGps || !gpsState.latitude || !gpsState.longitude || !dest.lat || !dest.lng) {
      setLiveRoute(null);
      setVoiceInstruction('รอตำแหน่ง GPS และปลายทางจริงจากงานที่รับ');
      return;
    }
    setIsComputingRoute(true);
    try {
      const origLat = gpsState.latitude;
      const origLng = gpsState.longitude;
      const res = await computeLiveRoute({
        origin: { latitude: origLat, longitude: origLng },
        destination: { latitude: dest.lat, longitude: dest.lng, name: dest.name, address: dest.address },
        travelMode: routeTravelMode,
        routingPreference: 'TRAFFIC_AWARE'
      });
      setLiveRoute(res.success ? res : null);
      setCurrentRouteStepIndex(0);

      // Sync first step with AR overlay and voice
      if (res.steps && res.steps.length > 0) {
        const step0 = res.steps[0];
        setBackdropManeuver(step0.maneuver);
        setBackdropManeuverDist(step0.distanceMeters);
        setBackdropManeuverStreet(step0.instructions);
        setVoiceInstruction(step0.instructions);
        if (voiceGuidanceEnabled && audioEnabled) {
          speakThaiText(step0.instructions, voicePersona);
        }
      }
    } catch (e) {
      console.warn('Google Routes API compute error:', e);
    } finally {
      setIsComputingRoute(false);
    }
  };

  // Search a real destination by name/address using the Knight's current GPS.
  // Results come from Google Places (New); the selected result is then routed by Google Routes API.
  const handleSearchDestination = async () => {
    const query = destinationSearchQuery.trim();
    if (query.length < 2) {
      setDestinationInputError('กรุณาพิมพ์ชื่อสถานที่หรือที่อยู่อย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (!gpsState.isRealGps || !Number.isFinite(gpsState.latitude) || !Number.isFinite(gpsState.longitude)) {
      setDestinationInputError('ยังไม่ได้ตำแหน่ง GPS จริงของพี่วิน กรุณาเปิด Location ก่อน');
      return;
    }
    setIsSearchingDestination(true);
    setDestinationInputError('');
    try {
      const results = await searchDestinationsFromGps({
        latitude: gpsState.latitude,
        longitude: gpsState.longitude,
        query
      });
      setDestinationSearchResults(results.map((result) => ({
        id: result.id,
        name: result.name,
        nameEn: result.nameEn,
        category: result.category,
        lat: result.lat,
        lng: result.lng,
        address: result.address,
        landmark: result.landmark,
        estimatedFare: result.estimatedFare
      })));
      if (results.length === 0) {
        setDestinationInputError('ไม่พบปลายทางจริงจาก Google Places ลองค้นชื่อสถานที่หรือที่อยู่อีกครั้ง');
      }
    } catch (error) {
      console.warn('[Knight Destination Search]', error);
      setDestinationSearchResults([]);
      setDestinationInputError('ค้นหาปลายทางจริงไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSearchingDestination(false);
    }
  };

  const handleSelectDestination = (destination: RouteDestination) => {
    if (!Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) return;
    setDestinationInputError('');
    setSelectedDestination(destination);
    setShowDestinationPicker(false);
    void handleCalculateRoute(destination);
  };

  const handleOpenDestinationPicker = () => {
    setDestinationInputError('');
    setDestinationSearchResults([]);
    setShowDestinationPicker(true);
  };

  // Step selector
  const handleSelectRouteStep = (stepIdx: number) => {
    if (!liveRoute || stepIdx < 0 || stepIdx >= liveRoute.steps.length) return;
    setCurrentRouteStepIndex(stepIdx);
    const step = liveRoute.steps[stepIdx];
    setBackdropManeuver(step.maneuver);
    setBackdropManeuverDist(step.distanceMeters);
    setBackdropManeuverStreet(step.instructions);
    setVoiceInstruction(step.instructions);
    if (audioEnabled) playTactileBlip(880);
    if (voiceGuidanceEnabled && audioEnabled) {
      speakThaiText(step.instructions, voicePersona);
    }
  };

  // The accepted job's dropoff is kept as a real recommendation, but the driver
  // chooses/confirms the destination only after arriving at pickup.
  useEffect(() => {
    setLiveRoute(null);
    setDestinationSearchQuery('');
    setDestinationSearchResults([]);
    setDestinationInputError('');
    setShowDestinationPicker(false);
    if (!activeJob?.dropoffCoord) {
      setSelectedDestination({ id: '', name: '', nameEn: '', category: '', lat: 0, lng: 0, address: '', landmark: '', estimatedFare: 0 });
      return;
    }
    setSelectedDestination({
      id: activeJob.id,
      name: activeJob.dropoffLocation || activeJob.dropoffAddressTh || 'ปลายทางจากงาน',
      nameEn: '',
      category: activeJob.serviceId,
      lat: activeJob.dropoffCoord.lat,
      lng: activeJob.dropoffCoord.lng,
      address: activeJob.dropoffAddressTh || activeJob.dropoffLocation || '',
      landmark: 'ปลายทางที่มากับงานที่รับ',
      estimatedFare: activeJob.netFare || activeJob.baseFare || 0
    });
  }, [activeJob?.id]);

  // Holo Overlay & Weather
  const [showRoutesOverlay, setShowRoutesOverlay] = useState<boolean>(false);
  const [showHoloGraph, setShowHoloGraph] = useState<boolean>(false);
  const [showCompactNavWidget, setShowCompactNavWidget] = useState<boolean>(false);
  const [weatherCondition, setWeatherCondition] = useState<'clear' | 'rain' | 'heat' | 'storm' | 'traffic_dense'>('clear');

  // Live telemetry is read from real navigation/GPS; no synthetic motion generator.
  const [currentSpeed] = useState<number>(0);
  const [liveHeading] = useState<number>(0);
  const [liveLeanAngle] = useState<number>(0);
  const [voiceInstruction, setVoiceInstruction] = useState<string>('รอข้อมูลนำทางจากตำแหน่งจริง');
  const lastSpokenRef = useRef<string>('');

  // Recharts Telemetry Data
  const telemetryHistory: { time: string; battery: number; earningsPerKm: number; speed: number }[] = [];
  const trainProgress = 0.65;

  const triggerVoiceGuidance = (text: string) => {
    if (voiceGuidanceEnabled && audioEnabled) {
      speakThaiText(text, voicePersona, voiceSpeedRate);
    }
  };

  // Sync with prop if activeJob changes
  useEffect(() => {
    if (activeJob) {
      setSelectedJob(activeJob);
      setTripProgress(0.08);
      setNavPhase('to_pickup');
      triggerVoiceGuidance(`รับงานนำทางจากจุด A ไปรับ ${activeJob.customerName} ที่จุด B และไปส่งจุด C`);
    }
  }, [activeJob]);

  // Interpolate Position along multi-stage path (A -> B -> C)
  const calculateCurrentPosition = (t: number) => {
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

  const riderState = calculateCurrentPosition(tripProgress);

  const handleAdvancePhase = () => {
    if (navPhase === 'to_pickup') {
      if (audioEnabled) playTactileBlip(1000);
      setNavPhase('at_pickup');
      setTripProgress(0.5);
      triggerVoiceGuidance(`ถึงจุด B รับ ${selectedJob.customerName} เรียบร้อยแล้ว`);
      if (onAdvanceTripStep) onAdvanceTripStep();
    } else if (navPhase === 'at_pickup') {
      if (audioEnabled) playTactileBlip(1000);
      setNavPhase('to_destination');
      setTripProgress(0.53);
      triggerVoiceGuidance(`ออกเดินทางช่วงที่ 2 จากจุด B ไป ${selectedJob.dropoffLocation}`);
      if (onAdvanceTripStep) onAdvanceTripStep();
    } else if (navPhase === 'to_destination') {
      if (audioEnabled) playLevelUpFanfare();
      setNavPhase('arrived_destination');
      setTripProgress(1.0);
      triggerVoiceGuidance(`ถึงจุด C แล้ว ค่าโดยสาร ${selectedJob.netFare} บาท`);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00D2FF', '#FFD700', '#10B981']
      });
      if (onAdvanceTripStep) onAdvanceTripStep();
    } else if (navPhase === 'arrived_destination') {
      if (audioEnabled) playLevelUpFanfare();
      if (onCompleteTrip) onCompleteTrip(selectedJob);
      if (onClose) onClose();
    }
  };

  const handleZoom = (delta: number) => {
    if (audioEnabled) playTactileBlip(950);
    setZoomLevel(prev => Math.min(2.0, Math.max(0.5, Number((prev + delta).toFixed(2)))));
  };

  const remainingDistM = Math.max(30, Math.round((1 - tripProgress) * activeRoute.distanceKm * 1000));
  const remainingMinutes = currentSpeed > 0.5
    ? (remainingDistM / (currentSpeed * 16.6)).toFixed(1)
    : 'กำลังคำนวณ';

  const getStageTransform = () => {
    const pitchOffset = Math.round((elevation3D - 45) * 0.25);
    const zOffset = Math.round(elevation3D * 1.2);
    switch (cameraView) {
      case '3d_chase':
        return `rotateX(${Math.max(10, Math.min(85, 55 + pitchOffset))}deg) rotateZ(-${liveHeading * 0.4}deg) translateY(${20 + elevation3D * 0.3}px) translateZ(${zOffset}px)`;
      case '3d_isometric':
        return `rotateX(${Math.max(10, Math.min(85, 50 + pitchOffset))}deg) rotateZ(-30deg) translateZ(${zOffset}px)`;
      case 'drone':
        return `rotateX(${Math.max(5, Math.min(65, 15 + pitchOffset * 0.5))}deg) rotateZ(0deg) translateZ(${zOffset * 1.5}px)`;
      case 'fpv':
        return `rotateX(${Math.max(30, Math.min(88, 75 + pitchOffset * 0.4))}deg) rotateZ(-${liveHeading * 0.3}deg) translateY(${50 + elevation3D * 0.2}px) translateZ(${zOffset * 0.5}px)`;
      case 'lidar':
        return `rotateX(${Math.max(10, Math.min(80, 40 + pitchOffset))}deg) rotateZ(-20deg) translateZ(${zOffset}px)`;
      default:
        return `rotateX(0deg) rotateZ(0deg) translateZ(${zOffset}px)`;
    }
  };

  // Weather Ambient shifts
  const weatherGradients = {
    clear: 'from-[#030713] via-[#050D24] to-[#02050E]',
    rain: 'from-[#031526] via-[#061B30] to-[#020B14]',
    heat: 'from-[#1A0B02] via-[#261205] to-[#0A0502]',
    storm: 'from-[#150524] via-[#1E0933] to-[#090212]',
    traffic_dense: 'from-[#1F0808] via-[#1A0505] to-[#0D0202]'
  };

  return (
    <div className={`space-y-3 font-sans relative ${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-[#040814] p-3 sm:p-6 overflow-y-auto max-h-screen' 
        : 'w-full'
    }`}>
      {/* TOAST NOTIFICATION */}
      {chatToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold font-mono text-xs shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{chatToast}</span>
        </div>
      )}

      {/* SOS MODAL NOTIFICATION */}
      {sosActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="p-6 rounded-3xl bg-gradient-to-b from-rose-950 to-slate-950 border-2 border-rose-500 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.6)]">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 text-rose-400 mx-auto flex items-center justify-center text-3xl animate-ping">
              🚨
            </div>
            <h3 className="text-lg font-black text-white">ระบบแจ้งเหตุฉุกเฉิน & AI อัศวินคู่กาย</h3>
            <p className="text-xs text-slate-300">
              กำลังส่งพิกัด GPS สด ({riderState.x.toFixed(2)}%, {riderState.y.toFixed(2)}%) และบันทึกภาพ 4K ไปยังศูนย์สั่งการ WIN Guard และสถานีตำรวจในพื้นที่
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSosActive(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold"
              >
                ยกเลิก (ปลอดภัย)
              </button>
              <button
                onClick={() => {
                  alert('เชื่อมต่อสายตรงศูนย์ช่วยเหลืออัศวิน 24 ชม.');
                  setSosActive(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-black shadow-lg"
              >
                ยืนยันขอความช่วยเหลือ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP TURN-BY-TURN GUIDANCE & STATUS BAR (อยู่นอกแผนที่ ไม่ลอยบังแผนที่) */}
      {/* ========================================================================= */}
      <div className="p-3 rounded-2xl bg-[#07132B]/95 border-2 border-cyan-400/60 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Turn cue & Speed indicator */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 flex items-center justify-center text-lg sm:text-xl font-black shadow-[0_0_15px_#00D2FF] flex-shrink-0">
            {liveHeading > 60 ? <CornerUpRight className="w-5 h-5 sm:w-6 sm:h-6" /> : liveHeading < 30 ? <CornerUpLeft className="w-5 h-5 sm:w-6 sm:h-6" /> : <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-mono font-bold text-cyan-300 line-clamp-1">
                {voiceInstruction}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
              <span>ความเร็ว: <strong className="text-cyan-300 font-black">{currentSpeed} km/h</strong></span>
              <span>• ETA: <strong className="text-emerald-400 font-black">~{remainingMinutes} นาที</strong></span>
              <span>• เหลือ: <strong className="text-amber-300 font-black">{remainingDistM} ม.</strong></span>
              <span>• สภาพอากาศ: <strong className="text-white font-bold">{weatherCondition === 'clear' ? '☀️ แจ่มใส' : weatherCondition === 'rain' ? '🌧️ ฝนตก' : weatherCondition === 'heat' ? '🔥 อากาศร้อน' : weatherCondition === 'storm' ? '⚡ พายุ' : '🚗 รถติดหนาแน่น'}</strong></span>
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 font-mono flex-shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-white/10 flex-wrap">
          {/* NAVIGATION VIEW INDICATOR: GOOGLE MAPS */}
          <div className="flex items-center bg-black/80 p-1 rounded-xl border border-amber-400/50 shadow-[0_0_15px_rgba(255,215,0,0.25)]">
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_0_10px_#FFD700] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>🌍 Google Maps Navigation</span>
            </div>
          </div>

          {/* Proof of Delivery / End Job Button */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(950);
              setShowDeliveryProofModal(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-[0_0_12px_#10B981] transition-all"
            title="ส่งงาน, ถ่ายรูปหลักฐานส่งมอบ, แสกน QR รับเงินคำนวณจริง"
          >
            <Camera className="w-3.5 h-3.5 text-slate-950" />
            <span>📸 ส่งงาน</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'ย่อหน้าต่าง' : 'ขยายเต็มจอ'}
            className="p-1.5 rounded-xl bg-black/60 hover:bg-slate-800 border border-white/10 text-slate-300"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close Navigation Screen Button */}
          {onClose && (
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                onClose();
              }}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-110 text-white font-black text-[10px] shadow-[0_0_12px_rgba(244,63,94,0.5)] flex items-center gap-1 transition-all active:scale-95"
              title="ปิดหน้าต่างแผนที่นำทาง"
            >
              <X className="w-3.5 h-3.5 text-white" />
              <span>ปิดหน้าต่าง</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.5 GOOGLE MAPS ROUTES API (NEW) - LIVE NAVIGATION COMMAND DECK */}
      {/* Source: Google Maps Platform Code Assist (gmp_mcp_codeassist_v1_aistudio) */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#0A1633]/95 border border-cyan-500/40 rounded-2xl p-3 shadow-[0_0_25px_rgba(0,210,255,0.15)] backdrop-blur-md font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Left: Provider branding & status badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg border border-cyan-400/40">
              <img 
                src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" 
                alt="Google Maps" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-xs sm:text-sm tracking-wide">
                  Google Maps Routes API (Live)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{liveRoute?.source === 'google_routes_api_live' ? 'สด 100%' : 'เชื่อมต่อพร้อมทำงาน'}</span>
                </span>
              </div>
              <div className="text-[10px] text-cyan-300 flex items-center gap-1.5 mt-0.5">
                <span>📍 ต้นทาง: {gpsState.addressLabel || 'จุดปัจจุบัน (BTS พร้อมพงษ์)'}</span>
              </div>
            </div>
          </div>

          {/* Center/Right: Destination Selector & Compute Button */}
          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
            {/* Travel Mode Pills */}
            <div className="flex items-center bg-black/60 p-0.5 rounded-xl border border-white/10 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setRouteTravelMode('TWO_WHEELER');
                }}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  routeTravelMode === 'TWO_WHEELER'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_8px_#FFD700]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="โหมดมอเตอร์ไซค์รับจ้าง TWO_WHEELER (ซอกแซกซอย & เลี่ยงรถติด)"
              >
                🛵 มอเตอร์ไซค์
              </button>
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setRouteTravelMode('DRIVE');
                }}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  routeTravelMode === 'DRIVE'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_8px_#00D2FF]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="โหมดรถยนต์ DRIVE"
              >
                🚗 รถยนต์
              </button>
            </div>

            <div className="w-full lg:w-[360px] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenDestinationPicker}
                  className="flex-1 min-w-0 rounded-xl bg-black/70 border border-cyan-400/50 px-3 py-2 text-left text-[11px] text-white hover:border-cyan-300 active:scale-[0.99]"
                >
                  <span className="block text-[9px] text-cyan-300 font-black">🏁 ปลายทาง</span>
                  <span className="block truncate mt-0.5">{selectedDestination.name || 'ค้นหาปลายทางหลังถึงจุดรับ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenDestinationPicker}
                  className="shrink-0 px-2.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-400/30 border border-cyan-400/50 text-cyan-200 font-black text-[10px] active:scale-95"
                >
                  🔍 ค้นหา
                </button>
              </div>
              {selectedDestination.name && (
                <div className="text-[9px] text-slate-400 px-1 truncate">📍 {selectedDestination.address || 'พิกัดจากระบบสถานที่จริง'}</div>
              )}
              {destinationInputError && (
                <div className="text-[10px] text-rose-300 font-semibold px-1">⚠️ {destinationInputError}</div>
              )}
            </div>

            {/* Calculate Button */}
            <button
              type="button"
              disabled={isComputingRoute || !selectedDestination.lat || !selectedDestination.lng || driverLegPhase !== 'to_destination'}
              onClick={() => {
                if (audioEnabled) playTactileBlip(950);
                void handleCalculateRoute(selectedDestination);
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00D2FF] via-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_15px_#00D2FF] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isComputingRoute ? 'animate-spin' : ''}`} />
              <span>{isComputingRoute ? 'กำลังคำนวณ...' : '🔄 คำนวณเส้นทาง'}</span>
            </button>
          </div>
        </div>

        {/* Live Route Stats & Turn-by-Turn Maneuver Tracker */}
        {liveRoute && (
          <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            {/* Route Stats */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                📏 ระยะทาง: <strong className="text-white font-black">{liveRoute.totalDistanceKm}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                ⏱️ เวลา: <strong className="text-white font-black">{liveRoute.formattedEta}</strong>
              </span>
              <span className="text-[11px] text-slate-300 hidden md:inline">
                {liveRoute.routeDescription}
              </span>
            </div>

            {/* Step Controller */}
            {liveRoute.steps && liveRoute.steps.length > 0 && (
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-[10px] text-amber-300 font-bold">
                  คำแนะนำที่ {currentRouteStepIndex + 1}/{liveRoute.steps.length}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentRouteStepIndex <= 0}
                    onClick={() => handleSelectRouteStep(currentRouteStepIndex - 1)}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold disabled:opacity-30 cursor-pointer"
                  >
                    ◀ ก่อนหน้า
                  </button>

                  <button
                    type="button"
                    disabled={currentRouteStepIndex >= liveRoute.steps.length - 1}
                    onClick={() => handleSelectRouteStep(currentRouteStepIndex + 1)}
                    className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[10px] font-bold disabled:opacity-30 cursor-pointer"
                  >
                    ถัดไป ▶
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      const currentStep = liveRoute.steps[currentRouteStepIndex];
                      if (currentStep) {
                        speakThaiText(currentStep.instructions, voicePersona);
                      }
                    }}
                    className="p-1 rounded-lg bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/40 cursor-pointer"
                    title="ฟังเสียงนำทางสำหรับขั้นตอนนี้"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESTINATION PICKER: shown after the Knight arrives at pickup */}
      {/* ========================================================================= */}
      {showDestinationPicker && driverLegPhase === 'to_destination' && (
        <div className="w-full rounded-2xl border-2 border-cyan-400/50 bg-[#07132B]/95 p-3 shadow-xl font-mono">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <div className="text-sm font-black text-white">🏁 ปลายทาง</div>
              <div className="text-[10px] text-cyan-300">ค้นหาจาก Google Places หรือเลือกปลายทางที่ระบบแนะนำ</div>
            </div>
            <button type="button" onClick={() => setShowDestinationPicker(false)} className="p-1.5 rounded-lg bg-white/10 text-slate-300 hover:bg-white/20"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-1.5">
            <input
              value={destinationSearchQuery}
              onChange={(e) => {
                setDestinationSearchQuery(e.target.value);
                if (destinationInputError) setDestinationInputError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSearchDestination();
              }}
              placeholder="🔍 ค้นหาปลายทาง เช่น สยามพารากอน, สนามบินสุวรรณภูมิ"
              className="min-w-0 flex-1 rounded-xl bg-black/70 border border-cyan-400/50 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-300"
              aria-label="ค้นหาปลายทาง"
            />
            <button type="button" onClick={() => void handleSearchDestination()} disabled={isSearchingDestination} className="shrink-0 px-3 py-2 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs disabled:opacity-50">
              {isSearchingDestination ? 'กำลังค้นหา…' : 'ค้นหา'}
            </button>
          </div>
          {destinationInputError && <div className="mt-2 text-[10px] text-rose-300 font-semibold">⚠️ {destinationInputError}</div>}
          {destinationSearchResults.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="text-[9px] font-black text-cyan-300">ผลการค้นหาจริง</div>
              {destinationSearchResults.map((destination) => (
                <button key={destination.id} type="button" onClick={() => handleSelectDestination(destination)} className="w-full rounded-xl border border-white/10 bg-black/30 hover:bg-cyan-500/10 hover:border-cyan-400/50 p-2.5 text-left transition-all">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-cyan-300 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-white truncate">{destination.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{destination.address}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-[9px] font-black text-amber-300 mb-1.5">⭐ ปลายทางที่ระบบแนะนำ</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {POPULAR_BANGKOK_DESTINATIONS.slice(0, 6).map((destination) => (
                <button key={destination.id} type="button" onClick={() => handleSelectDestination(destination)} className="rounded-xl border border-white/10 bg-white/5 hover:bg-amber-400/10 hover:border-amber-300/40 p-2 text-left">
                  <div className="text-[10px] font-black text-white truncate">{destination.name}</div>
                  <div className="text-[9px] text-slate-500 truncate">{destination.address}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. NAVIGATION VIEWPORT: CAMERA AR / GOOGLE MAPS / PURE 3D MAP */}
      {/* ========================================================================= */}
      {navDisplayMode === 'live_camera_ar' ? (
        <div className="w-full">
          <ARLiveCameraNavigation
            activeJob={selectedJob}
            voiceInstruction={liveRoute?.steps[currentRouteStepIndex]?.instructions || voiceInstruction}
            remainingDistM={liveRoute?.steps[currentRouteStepIndex]?.distanceMeters || remainingDistM}
            remainingMinutes={liveRoute?.totalDurationMinutes || parseFloat(remainingMinutes) || 4}
            currentSpeed={currentSpeed}
            liveHeading={liveHeading}
            audioEnabled={audioEnabled}
            voiceGuidanceEnabled={voiceGuidanceEnabled}
            voicePersona={voicePersona}
            onClose={onClose}
            onSwitchToMap={() => setNavDisplayMode('3d_map')}
            onSwitchToGoogleMaps={() => setNavDisplayMode('google_maps')}
            onAdvanceTripStep={() => {
              if (liveRoute && currentRouteStepIndex < liveRoute.steps.length - 1) {
                handleSelectRouteStep(currentRouteStepIndex + 1);
              } else {
                handleAdvancePhase();
              }
            }}
          />
        </div>
      ) : navDisplayMode === 'google_maps' ? (
        <div className="relative w-full rounded-3xl overflow-hidden border-2 border-cyan-400/60 shadow-[0_0_40px_rgba(0,210,255,0.25)]">
          {activeJob?.pickupCoord && activeJob?.dropoffCoord && (driverLegPhase === 'to_pickup' || (driverLegPhase === 'to_destination' && selectedDestination.lat && selectedDestination.lng)) ? <GoogleMapsNavigationScreen
            role="driver"
            initialPhase={driverLegPhase === 'to_pickup' ? 'approaching' : 'in_transit'}
            driverName={activeVehicle?.name || 'พี่วินอัศวิน'}
            driverAvatar={activeVehicle?.imageEmoji || '🛵'}
            driverPlate={(activeVehicle as any)?.plateNumber || ''}
            driverVehicle={activeVehicle?.model || ''}
            passengerName={selectedJob?.customerName || ''}
            pickupAddress={activeJob?.pickupLocation || ''}
            pickupCoords={activeJob.pickupCoord}
            dropoffAddress={driverLegPhase === 'to_destination' ? (selectedDestination.address || selectedDestination.name) : (activeJob?.dropoffLocation || '')}
            dropoffCoords={driverLegPhase === 'to_destination' && selectedDestination.lat && selectedDestination.lng ? { lat: selectedDestination.lat, lng: selectedDestination.lng } : activeJob.dropoffCoord}
            fareBaht={activeJob.netFare || activeJob.baseFare || 0}
            audioEnabled={audioEnabled}
            onArrivedAtPickup={() => {
              if (audioEnabled) playTactileBlip(950);
              setDriverLegPhase('to_destination');
              setLiveRoute(null);
              setShowDestinationPicker(true);
              triggerVoiceGuidance('ถึงจุดรับแล้ว กรุณาค้นหาหรือเลือกปลายทางเพื่อเริ่มนำทาง');
            }}
            onArrivedAtDropoff={() => {
              if (audioEnabled) playTactileBlip(950);
              setShowDeliveryProofModal(true);
              triggerVoiceGuidance('ถึงปลายทางส่งผู้โดยสารเรียบร้อย กรุณาตรวจสอบความปลอดภัยและยืนยันการรับชำระเงิน');
            }}
            onClose={onClose}
            onOpenChat={() => setShowDirectChatModal(true)}
          /> : (
            <div className="min-h-[420px] flex items-center justify-center p-8 text-center text-sm text-slate-300 bg-slate-950">
              {driverLegPhase === 'to_destination' && !selectedDestination.lat
                ? 'ถึงจุดรับแล้ว — กรุณาค้นหาหรือเลือกปลายทางด้านบน เพื่อคำนวณเส้นทางจริง'
                : 'ยังไม่มีงานจริงที่มีพิกัดจุดรับและปลายทาง จึงไม่แสดงเส้นทางจำลอง'}
            </div>
          )}
        </div>
      ) : navDisplayMode === 'mapbox' ? (
        <div className="relative w-full rounded-3xl overflow-hidden border-2 border-cyan-400/60 shadow-[0_0_40px_rgba(0,210,255,0.25)]">
          <GoogleMapsLiveView
            gpsLocation={gpsState}
            targetDestination={selectedDestination.name}
            initialProvider="mapbox"
            height={isFullscreen ? '640px' : '520px'}
            audioEnabled={audioEnabled}
            zoom={16}
            onSwitchToCameraAR={() => {
              if (audioEnabled) playTactileBlip(900);
              setNavDisplayMode('live_camera_ar');
            }}
            onSwitchTo3DMap={() => {
              if (audioEnabled) playTactileBlip(800);
              setNavDisplayMode('3d_map');
            }}
            onClose={onClose}
          />
        </div>
      ) : (
        <>
          <div className={`relative w-full rounded-3xl overflow-hidden ${
            cameraBackdropActive ? 'bg-black/30' : `bg-gradient-to-b ${weatherGradients[weatherCondition]}`
          } border-2 border-[#00D2FF]/60 shadow-[0_0_40px_rgba(0,210,255,0.25)] select-none ${
            isFullscreen ? 'h-[640px]' : 'h-[460px] sm:h-[520px]'
          }`}>
        {/* Real-time mobile camera stream overlaid as live backdrop behind 3D map */}
        {cameraBackdropActive && (
          <>
            <video
              ref={backdropVideoRef}
              playsInline
              autoPlay
              muted
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 pointer-events-none"
            />
            {/* Realistic street POV background if camera is not granted */}
            {!backdropCameraLive && (
              <div className="absolute inset-0 bg-gradient-to-b from-[#06142E]/70 via-[#0B254E]/60 to-[#040A18]/80 pointer-events-none z-0" />
            )}
            
            {/* VIRTUAL AR 3D ARROW OVERLAY OVER LIVE CAMERA FEED */}
            <VirtualArOverlay
              currentManeuver={backdropManeuver}
              distanceM={backdropManeuverDist}
              streetName={backdropManeuverStreet}
              landmarkNotice="จุดสังเกต: ปากซอยมีร้าน 7-Eleven และวินมอเตอร์ไซค์"
              speedKmH={currentSpeed}
              cameraActive={backdropCameraLive}
              cameraFacing={backdropCameraFacing}
              onToggleCameraFacing={() => {
                if (audioEnabled) playTactileBlip(800);
                setBackdropCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
              }}
              onSelectManeuver={(m, dist, street) => {
                if (audioEnabled) playTactileBlip(850);
                setBackdropManeuver(m);
                setBackdropManeuverDist(dist);
                setBackdropManeuverStreet(street);
              }}
            />
          </>
        )}
        {/* 3D MAP CANVAS CONTAINER (PERSPECTIVE 3D RENDER ENGINE) */}
        <div 
          className="relative w-full h-full overflow-hidden"
          style={{
            perspective: cameraView === '2d_radar' ? 'none' : '1100px',
            perspectiveOrigin: '50% 65%'
          }}
        >
          {/* Weather Animated FX Particles */}
          {weatherCondition === 'rain' && (
            <div className="absolute inset-0 pointer-events-none z-10 opacity-40 bg-[radial-gradient(#00D2FF_1px,transparent_1px)] [background-size:16px_16px] animate-pulse" />
          )}
          {weatherCondition === 'storm' && (
            <div className="absolute inset-0 pointer-events-none z-10 opacity-30 bg-purple-500/20 animate-ping" style={{ animationDuration: '4s' }} />
          )}

          {/* 3D TILTED STAGE PLANE */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out"
            style={{
              transform: `scale(${zoomLevel}) ${getStageTransform()}`,
              transformStyle: 'preserve-3d',
              transformOrigin: '50% 60%'
            }}
          >
            {/* SVG ROAD NETWORK, LASER PATHS & CAPILLARY SOIS */}
            <svg 
              className="w-full h-full absolute inset-0 pointer-events-none" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
              style={{ transform: 'translateZ(0px)' }}
            >
              {/* 1. KHLOONG SAEN SAEP WATERWAY (คลองแสนแสบ 3D) */}
              {showCanalDetails && (
                <g>
                  <path
                    d="M 0 32 Q 25 36 50 30 T 100 35"
                    fill="none"
                    stroke="#00E5FF"
                    strokeWidth="10"
                    strokeOpacity="0.45"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 8px #00E5FF)' }}
                  />
                  <path
                    d="M 0 32 Q 25 36 50 30 T 100 35"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    strokeDasharray="4 6"
                    strokeOpacity="0.7"
                    className="animate-pulse"
                  />
                </g>
              )}

              {/* 2. BTS SKYTRAIN ELEVATED VIADUCT (รางรถไฟฟ้าสายสุขุมวิท 3D) */}
              {showSkytrainViaduct && (
                <g>
                  {/* Elevated Track Beam */}
                  <line 
                    x1="0" 
                    y1="82" 
                    x2="100" 
                    y2="82" 
                    stroke="#4ADE80" 
                    strokeWidth="12" 
                    strokeOpacity="0.5"
                    style={{ filter: 'drop-shadow(0 4px 12px #22C55E)' }}
                  />
                  <line 
                    x1="0" 
                    y1="82" 
                    x2="100" 
                    y2="82" 
                    stroke="#FFFFFF" 
                    strokeWidth="2" 
                    strokeDasharray="8 6"
                  />
                  {/* Moving BTS Skytrain 3D Model Blip */}
                  <circle
                    cx={`${trainProgress * 100}%`}
                    cy="82%"
                    r="4"
                    fill="#FFD700"
                    stroke="#040814"
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                </g>
              )}

              {/* 3. MAJOR HIGHWAYS / MAIN ARTERIES */}
              <g>
                {/* Sukhumvit Main Road (E-W) */}
                <line x1="0" y1="82" x2="100" y2="82" stroke="#1E293B" strokeWidth="16" />
                <line x1="0" y1="82" x2="100" y2="82" stroke="#00D2FF" strokeWidth="2" strokeDasharray="3 3" strokeOpacity="0.4" />
                {/* Asoke-Din Daeng Road (N-S) */}
                <line x1="64" y1="0" x2="64" y2="100" stroke="#1E293B" strokeWidth="16" />
                <line x1="64" y1="0" x2="64" y2="100" stroke="#00D2FF" strokeWidth="2" strokeDasharray="3 3" strokeOpacity="0.4" />
                {/* New Phetchaburi Road (E-W North) */}
                <line x1="0" y1="18" x2="100" y2="18" stroke="#1E293B" strokeWidth="14" />
              </g>

              {/* 4. CAPILLARY SHORTCUT LANES (ตรอก ซอก ซอยลัด เครือข่ายเส้นเลือดฝอยพี่วิน) */}
              {showCapillaryLanes && (
                <g>
                  {/* Soi 39, Soi Phrom Chit, Soi 31, Soi 23 interconnects */}
                  <path
                    d="M 14% 82% L 22% 72% L 30% 68% L 38% 58% L 44% 52% L 54% 44% L 68% 34% L 78% 24% L 86% 16%"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="8"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 30% 68% Q 40% 70% 50% 65% T 64% 55%"
                    fill="none"
                    stroke="#06B6D4"
                    strokeWidth="5"
                    strokeOpacity="0.35"
                    strokeDasharray="6 4"
                  />
                  <path
                    d="M 44% 52% Q 52% 58% 64% 45%"
                    fill="none"
                    stroke="#06B6D4"
                    strokeWidth="5"
                    strokeOpacity="0.35"
                    strokeDasharray="6 4"
                  />
                </g>
              )}

              {/* 5. TRAFFIC CONGESTION HEATMAP */}
              {showTrafficHeatmap && (
                <g>
                  {/* Asoke Traffic Jam: Red Blockage */}
                  <line x1="58%" y1="82%" x2="70%" y2="82%" stroke="#EF4444" strokeWidth="8" strokeOpacity="0.8" strokeDasharray="6 4" />
                  <line x1="64%" y1="70%" x2="64%" y2="90%" stroke="#EF4444" strokeWidth="8" strokeOpacity="0.8" strokeDasharray="6 4" />
                  {/* Sukhumvit Slow Traffic: Orange */}
                  <line x1="30%" y1="82%" x2="55%" y2="82%" stroke="#F59E0B" strokeWidth="6" strokeOpacity="0.65" />
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
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeOpacity={tripProgress <= 0.5 ? 0.95 : 0.4}
                    style={{ filter: 'drop-shadow(0 0 16px #00D2FF)' }}
                  />
                  <path
                    d={routeLegs.svgAtoB}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeDasharray="10 8"
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
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeOpacity={tripProgress > 0.5 ? 0.95 : 0.4}
                    style={{ filter: 'drop-shadow(0 0 16px #10B981)' }}
                  />
                  <path
                    d={routeLegs.svgBtoC}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="3"
                    strokeDasharray="10 8"
                    strokeLinecap="round"
                    className="animate-pulse"
                  />
                </g>
              )}

              {/* Waypoint Cues on Path */}
              {activeRoute.waypoints.map((wp, i) => (
                <g key={wp.id} style={{ transform: 'translateZ(10px)' }}>
                  <circle cx={`${wp.coord.x}%`} cy={`${wp.coord.y}%`} r="3.5" fill={activeRoute.color} stroke="#FFFFFF" strokeWidth="1.5" />
                  <text 
                    x={`${wp.coord.x}%`} 
                    y={`${wp.coord.y - 2}%`} 
                    fill="#FFFFFF" 
                    fontSize="7.5" 
                    fontWeight="bold" 
                    textAnchor="middle" 
                    fontFamily="monospace"
                  >
                    W{i + 1}
                  </text>
                </g>
              ))}
            </svg>

            {/* 3D WAYPOINT TOWERS (เสาเลเซอร์ 3 มิติชี้พิกัด จุด A, จุด B, จุด C) */}
            {/* POINT A: Driver Start Stand (ซุ้มวิน BTS พร้อมพงษ์) */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 pointer-events-auto"
              style={{
                left: `${routeLegs.pointA.x}%`,
                top: `${routeLegs.pointA.y}%`,
                transform: 'translate(-50%, -50%) translateZ(28px)'
              }}
            >
              <div className="flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-lg bg-cyan-500/90 text-slate-950 font-black font-mono text-[9px] border-2 border-white shadow-[0_0_15px_#00D2FF] whitespace-nowrap animate-bounce">
                  🚩 จุด A (พี่วิน)
                </div>
                <div className="w-1 h-8 bg-gradient-to-t from-cyan-400 to-transparent shadow-[0_0_8px_#00D2FF]" />
                <div className="w-4 h-4 rounded-full bg-cyan-400/40 border border-cyan-300 animate-ping -mt-1" />
              </div>
            </div>

            {/* POINT B: Pickup Customer / Parcel Location (จุดรับลูกค้าหรือพัสดุ) */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 pointer-events-auto"
              style={{
                left: `${routeLegs.pointB.x}%`,
                top: `${routeLegs.pointB.y}%`,
                transform: 'translate(-50%, -50%) translateZ(32px)'
              }}
            >
              <div className="flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black font-mono text-[9px] border-2 border-white shadow-[0_0_20px_#F59E0B] whitespace-nowrap animate-pulse">
                  📦/👤 จุด B ({selectedJob.customerName.slice(0, 10)})
                </div>
                <div className="w-1.5 h-10 bg-gradient-to-t from-amber-400 to-transparent shadow-[0_0_12px_#F59E0B]" />
                <div className="w-5 h-5 rounded-full bg-amber-400/40 border border-amber-300 animate-ping -mt-1" />
              </div>
            </div>

            {/* POINT C: Final Destination (จุดหมายปลายทาง) */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 pointer-events-auto"
              style={{
                left: `${routeLegs.pointC.x}%`,
                top: `${routeLegs.pointC.y}%`,
                transform: 'translate(-50%, -50%) translateZ(34px)'
              }}
            >
              <div className="flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-lg bg-emerald-400 text-slate-950 font-black font-mono text-[9px] border-2 border-white shadow-[0_0_20px_#10B981] whitespace-nowrap animate-bounce">
                  🏁 จุด C ({selectedJob.dropoffLocation.slice(0, 12)})
                </div>
                <div className="w-1.5 h-12 bg-gradient-to-t from-emerald-400 to-transparent shadow-[0_0_15px_#10B981]" />
                <div className="w-6 h-6 rounded-full bg-emerald-400/50 border border-emerald-300 animate-ping -mt-1" />
              </div>
            </div>

            {/* 3D BUILDINGS & ARCHITECTURAL LANDMARKS */}
            {show3DBuildings && !cleanMapMode && BANGKOK_3D_LANDMARKS.map(b => (
              <div 
                key={b.id}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setSelectedLandmark(b);
                }}
                className="absolute rounded-lg border flex flex-col justify-between p-1.5 shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                style={{ 
                  top: `${b.y}%`, 
                  left: `${b.x}%`, 
                  width: `${b.width}px`, 
                  height: `${b.height}px`, 
                  transform: `translateZ(${b.depth / 2}px)`,
                  background: `linear-gradient(135deg, ${b.color}33 0%, #030816 100%)`,
                  borderColor: `${b.color}88`,
                  boxShadow: `0 0 20px ${b.color}44`
                }}
              >
                <div className="flex items-center justify-between text-[7px] font-mono text-white/90">
                  <span className="font-black truncate">{b.name.split(' ')[0]}</span>
                  {b.hasHelipad && <span className="text-[7px] text-amber-400 font-bold">🚁 H</span>}
                </div>
                <div className="grid grid-cols-3 gap-0.5 opacity-60">
                  {Array.from({ length: Math.min(12, b.floors * 2) }).map((_, wIdx) => (
                    <div 
                      key={wIdx} 
                      className="h-1 rounded-[1px]" 
                      style={{ backgroundColor: wIdx % 2 === 0 ? b.color : 'rgba(255,255,255,0.3)' }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[6px] font-mono text-cyan-300">
                  <span>{b.floors}F</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                </div>
              </div>
            ))}

            {/* 3D MICRO-INFRASTRUCTURE NODES (EV Battery Swap, Win Stand, 5G Beacon) */}
            {showInfrastructureNodes && !cleanMapMode && BANGKOK_MAP_INFRASTRUCTURE.map(infra => (
              <div
                key={infra.id}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(850);
                  setSelectedInfraPoint(infra);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 hover:scale-125 transition-transform"
                style={{
                  left: `${infra.x}%`,
                  top: `${infra.y}%`,
                  transform: 'translate(-50%, -50%) translateZ(16px)'
                }}
                title={infra.name}
              >
                <div className={`p-1.5 rounded-xl border flex items-center justify-center text-xs shadow-lg ${
                  infra.type === 'win_station'
                    ? 'bg-amber-500 text-slate-950 border-white shadow-[0_0_12px_#FFD700]'
                    : infra.type === 'ev_swap'
                    ? 'bg-emerald-500 text-slate-950 border-white shadow-[0_0_12px_#10B981]'
                    : infra.type === 'traffic_light'
                    ? 'bg-rose-600 text-white border-rose-300 shadow-[0_0_12px_#EF4444]'
                    : 'bg-cyan-600 text-white border-cyan-300 shadow-[0_0_12px_#00D2FF]'
                }`}>
                  {infra.type === 'win_station' ? '🏍️' : infra.type === 'ev_swap' ? '⚡' : infra.type === 'traffic_light' ? '🚦' : '📡'}
                </div>
              </div>
            ))}

            {/* 3D DRIVER MOTORCYCLE BLIP */}
            <div 
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none z-30"
              style={{
                left: `${riderState.x}%`,
                top: `${riderState.y}%`,
                transform: `translate(-50%, -50%) translateZ(22px) rotate(${riderState.angle + (cameraView === 'fpv' ? 0 : 0)}deg)`
              }}
            >
              <div className="absolute -inset-4 rounded-full bg-cyan-400/40 blur-md animate-pulse" />
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-slate-950 border-2 border-white shadow-[0_0_30px_#00D2FF] flex items-center justify-center text-xl">
                🛵
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CAMERA MODES & MAP TOOLBAR (แถบควบคุมกล้องและเครื่องมือใต้แผนที่) */}
      {/* ========================================================================= */}
      <div className="p-2.5 rounded-2xl bg-[#07132B]/90 border border-cyan-500/40 shadow-lg flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
        {/* Camera Modes */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 overflow-x-auto">
          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setCameraView('3d_chase');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
              cameraView === '3d_chase'
                ? 'bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>3D ตามรถ</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setCameraView('3d_isometric');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
              cameraView === '3d_isometric'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>ไอโซเมตริก</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setCameraView('fpv');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
              cameraView === 'fpv'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>FPV หน้ารถ</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setCameraView('drone');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
              cameraView === 'drone'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>โดรนมุมสูง</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setCameraView('lidar');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
              cameraView === 'lidar'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>LiDAR เรดาร์</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => handleZoom(-0.15)}
            className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-white/10"
            title="ซูมออก"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-cyan-300 font-bold px-1.5">{zoomLevel.toFixed(1)}x</span>
          <button
            onClick={() => handleZoom(0.15)}
            className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-white/10"
            title="ซูมเข้า"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3D Elevation / Floating Height Control (ปรับความลอยสูง 3D) */}
        <div className="flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded-xl border border-cyan-500/30 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-bold">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>ลอยสูง 3D:</span>
            <span className="text-[#FFD700] font-black">{elevation3D}m</span>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            step="5"
            value={elevation3D}
            onChange={(e) => {
              setElevation3D(Number(e.target.value));
            }}
            className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
            title="ปรับระดับความลอยสูง 3 มิติ (0m - 150m)"
          />
          {/* Quick presets */}
          <div className="flex items-center gap-1">
            {[
              { val: 0, label: 'ราบ 0m' },
              { val: 45, label: 'ปกติ 45m' },
              { val: 90, label: 'สูง 90m' },
              { val: 150, label: 'อวกาศ 150m' }
            ].map(preset => (
              <button
                key={preset.val}
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(750);
                  setElevation3D(preset.val);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                  elevation3D === preset.val
                    ? 'bg-[#00D2FF] text-slate-950 shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowRadarModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>เรดาร์ 2.5km</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(880);
              setShowDirectChatModal(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(0,210,255,0.2)]"
            title="แชทสดกับลูกค้า (In-Ride Direct Chat)"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>แชทลูกค้า</span>
          </button>

          {/* Contact Customer via LINE */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(880);
              const customerName = selectedJob?.customerName || 'ผู้โดยสาร';
              const rideDetails = selectedJob 
                ? `งานรับส่ง: ${selectedJob.pickupLocation} -> ${selectedJob.dropoffLocation} (ค่าโดยสาร ${selectedJob.fareThb} บาท)`
                : `งานนำทางไปยัง: ${selectedDestination.name}`;
              chatWithPassengerOnLine(customerName, rideDetails);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-[#06C755]/20 hover:bg-[#06C755]/30 text-[#06C755] border border-[#06C755]/50 text-xs font-mono font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(6,199,85,0.25)] transition-all active:scale-95"
            title="ติดต่อหรือแชทกับลูกค้าผ่าน LINE ทันที"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#06C755]" />
            <span>ทัก LINE ลูกค้า</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(920);
              setShowRealGpsModal(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-mono font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            title="พิกัดดาวเทียม GPS จริง & นำทางเลี้ยวต่อเลี้ยว (Turn-by-Turn GPS)"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>GPS จริง</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              setNavDisplayMode('live_camera_ar');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_12px_#00D2FF] flex items-center gap-1 animate-pulse"
            title="สลับเข้าโหมดกล้องสด AR ซ้อนลูกศร 3D แบบเต็มจอ"
          >
            <Video className="w-3.5 h-3.5 text-slate-950" />
            <span>กล้องสด AR เต็มจอ</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setCameraBackdropActive(!cameraBackdropActive);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 border transition-all ${
              cameraBackdropActive
                ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'bg-black/60 text-slate-300 border-white/10 hover:text-white'
            }`}
            title="เปิด/ปิดการดึงภาพกล้องสดมือถือมาซ้อนกับลูกศรเสมือน AR บนแผนที่ 3D"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{cameraBackdropActive ? 'ซ้อนกล้องสด AR: เปิดอยู่' : '📹 ซ้อนกล้องสด AR บนแผนที่'}</span>
          </button>

          {cameraBackdropActive && (
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(750);
                setBackdropCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
              }}
              className="px-2 py-1.5 rounded-xl bg-black/60 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold flex items-center gap-1 hover:bg-slate-800"
              title="สลับกล้องหน้า/กล้องหลัง"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>สลับกล้อง</span>
            </button>
          )}

          <button
            onClick={() => setShowQrPayModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] border border-[#FFD700]/40 text-xs font-mono font-bold flex items-center gap-1"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR รับเงิน</span>
          </button>

          <button
            onClick={() => setSosActive(true)}
            className="p-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold"
            title="ขอความช่วยเหลือฉุกเฉิน SOS"
          >
            🚨 SOS
          </button>
        </div>
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-3xl bg-gradient-to-r from-[#07132B] via-[#091C3E] to-[#050E24] border-2 border-cyan-400/60 shadow-[0_0_30px_rgba(0,210,255,0.25)] space-y-3">
        {/* Title & Stage Indicators */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-lg shadow-lg border transition-all ${
              navPhase === 'to_pickup'
                ? 'bg-gradient-to-tr from-cyan-400 to-blue-600 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.5)]'
                : navPhase === 'to_destination'
                ? 'bg-gradient-to-tr from-amber-400 to-yellow-600 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-gradient-to-tr from-emerald-400 to-green-600 text-slate-950 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
            }`}>
              {navPhase === 'to_pickup' ? '🛵' : navPhase === 'to_destination' ? '🚀' : '🏁'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase border ${
                  navPhase === 'to_pickup'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                    : navPhase === 'to_destination'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                }`}>
                  {navPhase === 'to_pickup' ? '🛵 กำลังไปจุดรับ B' : navPhase === 'to_destination' ? '🚀 กำลังไปส่งจุด C' : '🏁 ถึงปลายทางแล้ว'}
                </span>
                <span className="text-[10px] text-amber-300 font-mono font-bold">
                  ค่าโดยสาร: ฿{selectedJob.netFare} ({selectedJob.distanceKm} กม.)
                </span>
              </div>
              <h4 className="text-xs font-black text-white mt-0.5">
                {selectedJob.pickupLocation.split('/')[0]} ➔ {selectedJob.dropoffLocation.split('/')[0]}
              </h4>
            </div>
          </div>

          {/* Real trip state controls */}
          <div className="flex items-center justify-end gap-2 self-end sm:self-center">
            <button
              onClick={handleAdvancePhase}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-black text-xs shadow-[0_0_15px_#00D2FF] hover:brightness-110 flex items-center gap-1.5 transition-all"
            >
              <span>{navPhase === 'to_pickup' ? '✓ ถึงจุดรับ' : navPhase === 'at_pickup' ? '✓ เริ่มเดินทางไปส่ง' : navPhase === 'to_destination' ? '✓ ถึงปลายทาง' : '🏁 จบทริป'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-[10px] font-mono text-slate-300">
          สถานะงานจริง: <span className="text-cyan-300 font-bold">{navPhase}</span>
          <span className="mx-2">•</span>
          ความคืบหน้าจากสถานะงาน: <span className="text-emerald-300 font-bold">{Math.round(tripProgress * 100)}%</span>
        </div>
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={tripProgress}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setTripProgress(val);
                if (val < 0.48) setNavPhase('to_pickup');
                else if (val >= 0.48 && val <= 0.52) setNavPhase('at_pickup');
                else if (val > 0.52 && val < 0.98) setNavPhase('to_destination');
                else setNavPhase('arrived_destination');
              }}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            {/* Middle Marker (Point B at 50%) */}
            <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950 pointer-events-none shadow-[0_0_8px_#F59E0B]" title="จุด B (รับลูกค้า/พัสดุ)" />
          </div>
        </div>

      {/* ========================================================================= */}
      {/* 3. MULTI-ROUTE ALTERNATIVES (เลือก 3 เส้นทางนำทาง) */}
      {/* ========================================================================= */}
      <div className="p-3 rounded-2xl bg-[#061229] border border-cyan-500/30 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Route className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-bold">3 ทางเลือกเส้นทาง (Alternative Multi-Routes):</span>
            <span className="text-[10px] text-cyan-300 font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/30">
              {activeRoute.name} (~{activeRoute.estMinutes} นาที)
            </span>
          </div>

          <button
            onClick={() => setShowWaypointsList(!showWaypointsList)}
            className="px-2.5 py-1 rounded-xl border border-cyan-500/40 text-[10px] text-cyan-300 hover:bg-cyan-500/20"
          >
            {showWaypointsList ? 'ซ่อน Waypoints' : 'ดู Waypoints'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {BANGKOK_COMPLEX_ROUTES.map(route => {
            const isSelected = route.id === selectedRouteId;
            return (
              <button
                key={route.id}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(850);
                  setSelectedRouteId(route.id);
                  triggerVoiceGuidance(`เปลี่ยนเส้นทางเป็น: ${route.name}`);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-950 to-blue-950 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.3)] ring-1 ring-cyan-400/50'
                    : 'bg-black/40 border-white/10 hover:border-cyan-500/40 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    route.category === 'ci_capillary' 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      : route.category === 'flood_safe'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                  }`}>
                    {route.badge}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {route.estMinutes} นาที ({route.distanceKm} km)
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{route.name}</h4>
                <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">{route.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* WAYPOINTS TIMELINE DRAWER */}
      {showWaypointsList && (
        <div className="p-4 rounded-3xl bg-slate-950 border-2 border-cyan-500/50 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Route className="w-4 h-4 text-cyan-400" />
              <span>ลำดับจุดเลี้ยวและช่องทางลัด ({activeRoute.waypoints.length} จุดตรวจ):</span>
            </h4>
            <span className="text-[10px] text-cyan-300 font-mono">
              เส้นทางปัจจุบัน: {activeRoute.name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {activeRoute.waypoints.map((wp, idx) => (
              <div 
                key={wp.id}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setSelectedWaypoint(wp);
                }}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedWaypoint?.id === wp.id
                    ? 'bg-cyan-950/80 border-cyan-400 shadow-md'
                    : 'bg-slate-900/60 border-white/10 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-cyan-400 font-bold">#{idx + 1} {wp.type.toUpperCase()}</span>
                  <span className="text-slate-400">{wp.distanceFromPrevM > 0 ? `+${wp.distanceFromPrevM} ม.` : 'จุดเริ่มต้น'}</span>
                </div>
                <h5 className="font-bold text-white mt-1 text-[11px]">{wp.name}</h5>
                <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-2">{wp.instructionThai}</p>
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-white/5">
                  <span className="text-emerald-400">จำกัด {wp.speedLimitKmH} กม./ชม.</span>
                  {wp.warningNote && <span className="text-amber-400">⚠️ {wp.warningNote}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS: AI VOICE CONTROLLER, BANGKOK RANDOMIZER & PROOF OF DELIVERY */}
      {/* ========================================================================= */}

      {/* AI VOICE SETTINGS & SPEED CONTROLLER MODAL */}
      {showVoiceSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="p-6 rounded-3xl bg-[#07132B] border-2 border-purple-400/60 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(168,85,247,0.4)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-400 text-purple-300 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">ปรับแต่งเสียง AI นำทาง & ความเร็ว</h3>
                  <p className="text-[10px] text-purple-300 font-mono">ปรับเสียงคนขับ (Driver Voice Controller)</p>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceSettingsModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Persona Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200">เลือกบุคลิกเสียง AI (Voice Persona):</label>
              <div className="grid grid-cols-2 gap-2">
                {AI_VOICE_PERSONAS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(850);
                      setVoicePersona(p.id);
                      speakThaiText(`เปลี่ยนเสียงนำทางเป็น ${p.name}`, p.id, voiceSpeedRate);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      voicePersona === p.id
                        ? 'bg-purple-600/30 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] ring-1 ring-purple-400'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:border-purple-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{p.icon}</span>
                      <span className="text-[9px] font-mono text-purple-300">{p.tag}</span>
                    </div>
                    <h5 className="text-xs font-bold text-white mt-1">{p.name}</h5>
                    <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Speech Rate Slider */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-black/40 border border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">ความเร็วการพูด (Speech Rate):</span>
                <span className="text-purple-300 font-bold">{voiceSpeedRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.75"
                step="0.05"
                value={voiceSpeedRate}
                onChange={(e) => setVoiceSpeedRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>0.75x (ช้าชัด)</span>
                <span>1.0x (ปกติ)</span>
                <span>1.75x (เร็วพิเศษ)</span>
              </div>
            </div>

            {/* Test Voice Button */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  speakThaiText(`ทดสอบเสียงนำทาง: อีก 150 เมตรข้างหน้า เลี้ยวซ้ายเข้าซอยสุขุมวิท 39 ช่องทางลัดโล่งพิเศษ`, voicePersona, voiceSpeedRate);
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Volume2 className="w-4 h-4" />
                <span>📢 ทดสอบฟังเสียง AI</span>
              </button>
              <button
                onClick={() => setShowVoiceSettingsModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700"
              >
                บันทึก & ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      <DriverPaymentQrCodeModal
          isOpen={showQrPayModal}
          onClose={() => setShowQrPayModal(false)}
          driverName="กิตติ อินทะสร้อย"
          driverLevel={driverLevel}
          driverCode="WR-SOV-001"
          amount={selectedJob.netFare}
          jobId={selectedJob.id}
          audioEnabled={audioEnabled}
        />

      {/* DIRECT IN-RIDE CHAT WITH PASSENGER */}
      <InRideDirectChatModal
        isOpen={showDirectChatModal}
        onClose={() => setShowDirectChatModal(false)}
        orderId={selectedJob.id}
        currentUserRole="driver"
        currentUserName="พี่กิตติ (อัศวิน LV.100)"
        otherPartyName={selectedJob.customerName}
        audioEnabled={audioEnabled}
      />

      {/* REAL GPS SATELLITE MAP & TURN-BY-TURN GUIDANCE */}
      <RealGpsMapModal
        isOpen={showRealGpsModal}
        onClose={() => setShowRealGpsModal(false)}
        destinationTitle={selectedJob.dropoffLocation}
        audioEnabled={audioEnabled}
      />
    </div>
  );
};
