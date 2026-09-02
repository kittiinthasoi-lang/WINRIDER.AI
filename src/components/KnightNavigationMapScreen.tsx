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
import { IncomingJobData, SAMPLE_INCOMING_JOBS } from './DriverStandbyAndIncomingJob';
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
}

// Bangkok Real Locations Pool for Realistic Random Simulation
const BANGKOK_SIMULATION_HUBS = [
  { name: 'BTS พร้อมพงษ์ / ซุ้มวินเอ็มควอเทียร์', district: 'สุขุมวิท', lat: 13.7303, lng: 100.5698 },
  { name: 'สยามพารากอน / จุดรับหน้าโรงแรมสยามเคมปินสกี้', district: 'ปทุมวัน', lat: 13.7460, lng: 100.5347 },
  { name: 'ซอยทองหล่อ 10 / ร้านข้าวต้มแสงชัย', district: 'วัฒนา', lat: 13.7335, lng: 100.5828 },
  { name: 'เซ็นทรัลพระราม 9 / อาคาร G Tower', district: 'ห้วยขวาง', lat: 13.7578, lng: 100.5658 },
  { name: 'ตลาดนัดจตุจักร / ประตู 1 ถนนพหลโยธิน', district: 'จตุจักร', lat: 13.7999, lng: 100.5504 },
  { name: 'สีลมคอมเพล็กซ์ / ซอยละลายทรัพย์', district: 'บางรัก', lat: 13.7279, lng: 100.5348 },
  { name: 'ไอคอนสยาม / ท่าเรือเจริญนคร', district: 'คลองสาน', lat: 13.7267, lng: 100.5109 },
  { name: 'เยาวราช / ซอยแปลงนาม ท่าเตียน', district: 'สัมพันธวงศ์', lat: 13.7412, lng: 100.5085 },
  { name: 'ซอยอารีย์ (พหลโยธิน 7) / ลา วิลล่า', district: 'พญาไท', lat: 13.7797, lng: 100.5447 },
  { name: 'เมกาบางนา / จุดนัดพบหน้าอิเกีย', district: 'บางนา', lat: 13.6465, lng: 100.6798 },
];

const SIM_JOB_TYPES: { type: 'ride' | 'delivery' | 'food' | 'special'; label: string; icon: string; rateMultiplier: number }[] = [
  { type: 'ride', label: 'WIN Ride (รับส่งผู้โดยสารเร่งด่วน)', icon: '🛵', rateMultiplier: 1.0 },
  { type: 'delivery', label: 'WIN Express (ส่งเอกสาร/พัสดุไวแสง)', icon: '📦', rateMultiplier: 1.15 },
  { type: 'food', label: 'WIN Food (ส่งอาหารร้านดังมิชลิน/สตรีทฟู้ด)', icon: '🍜', rateMultiplier: 1.2 },
  { type: 'special', label: 'WIN Mu Buddy (พาไหว้พระ/มูเตลูเสริมดวง)', icon: '🔮', rateMultiplier: 1.35 },
];

const SIM_SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
];

export const KnightNavigationMapScreen: React.FC<KnightNavigationMapScreenProps> = ({
  activeJob,
  activeVehicle,
  driverLevel = 100,
  audioEnabled = true,
  onAdvanceTripStep,
  onCompleteTrip,
  onClose,
  isEmbedded = false
}) => {
  // Active Selected Job
  const [selectedJob, setSelectedJob] = useState<IncomingJobData>(() => activeJob || SAMPLE_INCOMING_JOBS[0]);
  
  // Trip Navigation Phase & Multi-stage A -> B -> C Simulation
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

  // Overall Trip Simulation Progress (0.0 to 1.0)
  // 0.0 = At Point A
  // 0.0 - 0.5 = Traveling from Point A to Point B
  // 0.5 = At Point B (Pickup)
  // 0.5 - 1.0 = Traveling from Point B to Point C
  // 1.0 = At Point C (Arrived & Dropoff)
  const [tripProgress, setTripProgress] = useState<number>(0.08);

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
  const [showRandomSimModal, setShowRandomSimModal] = useState<boolean>(false);

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

  // Holo Overlay & Weather
  const [showRoutesOverlay, setShowRoutesOverlay] = useState<boolean>(false);
  const [showHoloGraph, setShowHoloGraph] = useState<boolean>(false);
  const [showCompactNavWidget, setShowCompactNavWidget] = useState<boolean>(false);
  const [weatherCondition, setWeatherCondition] = useState<'clear' | 'rain' | 'heat' | 'storm' | 'traffic_dense'>('clear');

  // Live Telemetry Simulation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [currentSpeed, setCurrentSpeed] = useState<number>(42); // km/h
  const [liveHeading, setLiveHeading] = useState<number>(45); // degrees
  const [liveLeanAngle, setLiveLeanAngle] = useState<number>(0); // motorbike lean in deg
  const [voiceInstruction, setVoiceInstruction] = useState<string>('ออกจากซุ้มวิน BTS พร้อมพงษ์ มุ่งหน้าเข้าซอยสุขุมวิท 39');
  const [trainProgress, setTrainProgress] = useState<number>(0.35); // BTS Skytrain animation
  const lastSpokenRef = useRef<string>('');

  // Recharts Telemetry Data
  const [telemetryHistory, setTelemetryHistory] = useState<{ time: string; battery: number; earningsPerKm: number; speed: number }[]>([
    { time: '0m', battery: 94, earningsPerKm: 38, speed: 40 },
    { time: '1m', battery: 93.8, earningsPerKm: 42, speed: 46 },
    { time: '2m', battery: 93.2, earningsPerKm: 48, speed: 44 },
    { time: '3m', battery: 92.5, earningsPerKm: 52, speed: 48 },
    { time: '4m', battery: 91.9, earningsPerKm: 55, speed: 42 },
  ]);

  // Voice announcement trigger helper
  const triggerVoiceGuidance = (text: string) => {
    if (!voiceGuidanceEnabled || !audioEnabled) return;
    if (lastSpokenRef.current !== text) {
      lastSpokenRef.current = text;
      speakThaiText(text, voicePersona, voiceSpeedRate);
    }
  };

  // Random realistic Bangkok job generator
  const generateRandomBangkokJob = () => {
    const originIdx = Math.floor(Math.random() * BANGKOK_SIMULATION_HUBS.length);
    let destIdx = Math.floor(Math.random() * BANGKOK_SIMULATION_HUBS.length);
    if (destIdx === originIdx) destIdx = (originIdx + 1) % BANGKOK_SIMULATION_HUBS.length;
    
    const origin = BANGKOK_SIMULATION_HUBS[originIdx];
    const dest = BANGKOK_SIMULATION_HUBS[destIdx];
    const jobType = SIM_JOB_TYPES[Math.floor(Math.random() * SIM_JOB_TYPES.length)];

    const distKm = parseFloat((2.0 + Math.random() * 6.5).toFixed(1));
    const baseFare = 25;
    const distanceFare = Math.round(distKm * 8.5);
    const rushHourBonus = Math.random() > 0.4 ? 15 : 0;
    const totalFare = Math.round((baseFare + distanceFare + rushHourBonus) * jobType.rateMultiplier);

    const customers = [
      'คุณมัทนา วงศ์สวรรค์ (ลูกค้าประจำ)',
      'คุณธนภพ (ออฟฟิศ Asoke Tower)',
      'ร้านก๋วยเตี๋ยวทองหล่อ (พาร์ทเนอร์)',
      'คุณหมออรสา (รพ.บำรุงราษฎร์)',
      'คุณนลินดา (นักศึกษานานาชาติ)',
      'Gourmet Partner สยาม',
      'คุณเอกภาพ (ส่งเอกสารด่วนคอนโดสุขุมวิท)'
    ];

    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomWeather: ('clear' | 'rain' | 'heat' | 'storm' | 'traffic_dense')[] = ['clear', 'rain', 'heat', 'storm', 'traffic_dense'];
    const chosenWeather = randomWeather[Math.floor(Math.random() * randomWeather.length)];

    const newJob: IncomingJobData = {
      id: `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceId: (jobType.type as any) || 'knight',
      serviceTitle: jobType.label,
      serviceIconEmoji: jobType.icon,
      pickupLocation: origin.name,
      dropoffLocation: dest.name,
      customerName: randomCustomer,
      customerAvatarEmoji: '👤',
      customerPhone: '089-123-4567',
      customerRating: 4.9,
      netFare: totalFare,
      baseFare: baseFare,
      tips: rushHourBonus,
      platformFee: 1,
      estMinutes: Math.round(distKm * 2.8),
      driverDistanceToPickupKm: 0.3,
      fairDispatchQueueRank: 1,
      totalCandidatesInRadius: 4,
      urgency: 'normal',
      distanceKm: distKm,
      xpReward: Math.round(distKm * 40 + 50)
    };

    setSelectedJob(newJob);
    setWeatherCondition(chosenWeather);
    setTripProgress(0.05);
    setNavPhase('to_pickup');
    setPaymentStepDone(false);
    setCapturedProofPhoto(null);
    setCompletionStep('photo');

    if (audioEnabled) {
      playLevelUpFanfare();
      triggerVoiceGuidance(`สุ่มทริปใหม่ ${jobType.label} รับที่ ${origin.name} ไปส่งที่ ${dest.name} ระยะทาง ${distKm} กิโลเมตร ค่าโดยสารคำนวณจริง ฿${totalFare}`);
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

  // Jump to specific simulation stage
  const jumpToStage = (stage: 'A' | 'A_TO_B' | 'B' | 'B_TO_C' | 'C') => {
    if (audioEnabled) playTactileBlip(850);
    if (stage === 'A') {
      setTripProgress(0.01);
      setNavPhase('to_pickup');
      triggerVoiceGuidance(`จุด A: ซุ้มวินพี่วิน พร้อมสตาร์ทรถไปรับ ${selectedJob.customerName}`);
    } else if (stage === 'A_TO_B') {
      setTripProgress(0.25);
      setNavPhase('to_pickup');
      triggerVoiceGuidance(`กำลังเดินทางช่วงที่ 1 จากจุด A ไปยังจุด B`);
    } else if (stage === 'B') {
      setTripProgress(0.5);
      setNavPhase('at_pickup');
      triggerVoiceGuidance(`ถึงจุด B แล้ว ตรวจสอบพัสดุและรับ ${selectedJob.customerName} ขึ้นรถ`);
    } else if (stage === 'B_TO_C') {
      setTripProgress(0.75);
      setNavPhase('to_destination');
      triggerVoiceGuidance(`กำลังเดินทางช่วงที่ 2 จากจุด B มุ่งหน้าจุด C ปลายทาง`);
    } else if (stage === 'C') {
      setTripProgress(1.0);
      setNavPhase('arrived_destination');
      triggerVoiceGuidance(`ถึงจุด C ${selectedJob.dropoffLocation} เรียบร้อยแล้ว ค่าโดยสาร ฿${selectedJob.netFare}`);
    }
  };

  // Telemetry & Route Progress Loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Move BTS Train independently along Sukhumvit track (from left to right)
      setTrainProgress(prev => (prev + 0.008) % 1);

      setTripProgress(prev => {
        const step = 0.0045 * speedMultiplier;
        const next = prev + step;

        // Auto transition phase based on progress
        if (next < 0.48) {
          if (navPhase !== 'to_pickup') setNavPhase('to_pickup');
        } else if (next >= 0.48 && next <= 0.52) {
          if (navPhase !== 'at_pickup') {
            setNavPhase('at_pickup');
            if (audioEnabled) playTactileBlip(1200);
            triggerVoiceGuidance(`ถึงจุด B แล้ว! กำลังรับ ${selectedJob.customerName} / พัสดุ`);
          }
        } else if (next > 0.52 && next < 0.98) {
          if (navPhase !== 'to_destination') setNavPhase('to_destination');
        } else if (next >= 0.98) {
          if (navPhase !== 'arrived_destination') {
            setNavPhase('arrived_destination');
            if (audioEnabled) playLevelUpFanfare();
            triggerVoiceGuidance(`ถึงจุด C ${selectedJob.dropoffLocation} เรียบร้อยแล้ว`);
          }
          return 1.0;
        }

        // Determine current waypoint and instruction
        const totalWps = activeRoute.waypoints.length;
        const currentWpIndex = Math.min(totalWps - 1, Math.floor(next * totalWps));
        const activeWp = activeRoute.waypoints[currentWpIndex];

        if (activeWp) {
          if (next < 0.5) {
            setVoiceInstruction(`[ช่วง A➔B] มุ่งหน้าไปรับที่: ${selectedJob.pickupLocation} (${activeWp.instructionThai})`);
          } else {
            setVoiceInstruction(`[ช่วง B➔C] นำทางสู่ปลายทาง: ${selectedJob.dropoffLocation} (${activeWp.instructionThai})`);
          }
          setLiveHeading(Math.round(riderState.angle));
          
          // Motorbike lean angle based on turns
          const lean = Math.sin(next * 30) * 14;
          setLiveLeanAngle(Number(lean.toFixed(1)));
        }

        // Live speed fluctuation based on road segment
        const baseSpeed = activeWp?.speedLimitKmH || 40;
        const speed = Math.round(baseSpeed + Math.sin(next * 24) * 6 + (Math.random() - 0.5) * 3);
        setCurrentSpeed(speed);

        // Update Recharts telemetry
        setTelemetryHistory(hist => {
          const last = hist[hist.length - 1];
          const newEntry = {
            time: `${(next * 6).toFixed(1)}m`,
            battery: Math.max(70, Number((last.battery - 0.03).toFixed(1))),
            earningsPerKm: Math.round(42 + Math.sin(next * 12) * 14),
            speed
          };
          return [...hist.slice(-8), newEntry];
        });

        return next;
      });
    }, 220);

    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier, navPhase, activeRoute, audioEnabled, voiceGuidanceEnabled, riderState.angle, selectedJob]);

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
  const remainingMinutes = (remainingDistM / (currentSpeed * 16.6)).toFixed(1);

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
          {/* AI Voice Persona Controller button */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              setShowVoiceSettingsModal(true);
            }}
            className="px-2 py-1 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-200 border border-purple-400/50 text-[10px] font-bold flex items-center gap-1 shadow-md transition-all"
            title="ปรับแต่งเสียง AI นำทางและความเร็วพูด"
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
            <span>🎙️ เสียง AI ({AI_VOICE_PERSONAS.find(p => p.id === voicePersona)?.name.split(' ')[0] || 'ฟ้าใส'})</span>
          </button>

          {/* Speed Multiplier Quick Toggle */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              const nextSpeed = speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 4 : speedMultiplier === 4 ? 0.5 : 1;
              setSpeedMultiplier(nextSpeed);
            }}
            className="px-2 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold flex items-center gap-1 transition-all"
            title="เปลี่ยนความเร็วจำลอง (0.5x - 4x)"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>⚡ {speedMultiplier}x</span>
          </button>

          {/* Realistic Bangkok Job Randomizer */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(900);
              setShowRandomSimModal(true);
            }}
            className="px-2 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-400/50 text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all"
            title="สุ่มสภาพแวดล้อมจริง: พิกัดกทม., การจราจร, สภาพอากาศ, ลูกค้า, ระยะทาง"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>🎲 สุ่มสถานการณ์</span>
          </button>

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
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PURE 3D NAVIGATION MAP VIEWPORT (หน้าจอแผนที่โล่ง 100% ไม่มีหน้าต่างลอยบัง) */}
      {/* ========================================================================= */}
      <div className={`relative w-full rounded-3xl overflow-hidden bg-gradient-to-b ${weatherGradients[weatherCondition]} border-2 border-[#00D2FF]/60 shadow-[0_0_40px_rgba(0,210,255,0.25)] select-none ${
        isFullscreen ? 'h-[640px]' : 'h-[460px] sm:h-[520px]'
      }`}>
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
              onClick={() => jumpToStage('A')}
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
              onClick={() => jumpToStage('B')}
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
              onClick={() => jumpToStage('C')}
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

      {/* ========================================================================= */}
      {/* 2. TRIP STEP ADVANCE & SIMULATION SCRUBBER BAR */}
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

          {/* Action buttons: Play/Pause, Step Advance, Deliver Proof */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setIsPlaying(!isPlaying);
              }}
              className={`px-3 py-2 rounded-xl font-mono text-xs font-bold border transition-all ${
                isPlaying 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? '⏸️ พักจำลอง' : '▶️ เล่นจำลอง'}
            </button>

            <button
              onClick={handleAdvancePhase}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-black text-xs shadow-[0_0_15px_#00D2FF] hover:brightness-110 flex items-center gap-1.5 transition-all"
            >
              <span>{navPhase === 'to_pickup' ? '✓ ถึงจุดรับ (ขึ้นรถ)' : navPhase === 'to_destination' ? '✓ ถึงปลายทาง (ส่งงาน)' : '🏁 จบทริป'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Point Stage Buttons (Click to Jump) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-[10px]">
          {/* Point A */}
          <button
            onClick={() => jumpToStage('A')}
            className={`p-2 rounded-xl border text-left transition-all ${
              tripProgress <= 0.05
                ? 'bg-cyan-500 text-slate-950 border-white font-black shadow-[0_0_12px_#00D2FF]'
                : 'bg-black/40 border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">🚩 จุด A (พี่วิน)</span>
              <span>0%</span>
            </div>
            <p className="text-[9px] opacity-80 truncate mt-0.5">BTS พร้อมพงษ์</p>
          </button>

          {/* Leg 1: A -> B */}
          <button
            onClick={() => jumpToStage('A_TO_B')}
            className={`p-2 rounded-xl border text-left transition-all ${
              tripProgress > 0.05 && tripProgress < 0.48
                ? 'bg-cyan-500 text-slate-950 border-white font-black shadow-[0_0_12px_#00D2FF]'
                : 'bg-black/40 border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">🛵 ไปจุด B</span>
              <span>25%</span>
            </div>
            <p className="text-[9px] opacity-80 truncate mt-0.5">เข้าซอยสุขุมวิท 39</p>
          </button>

          {/* Point B: Pickup */}
          <button
            onClick={() => jumpToStage('B')}
            className={`p-2 rounded-xl border text-left transition-all ${
              tripProgress >= 0.48 && tripProgress <= 0.52
                ? 'bg-amber-400 text-slate-950 border-white font-black shadow-[0_0_12px_#F59E0B]'
                : 'bg-black/40 border-amber-500/30 text-amber-300 hover:bg-amber-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">📦 จุด B (รับของ)</span>
              <span>50%</span>
            </div>
            <p className="text-[9px] opacity-80 truncate mt-0.5">{selectedJob.pickupLocation.slice(0, 16)}</p>
          </button>

          {/* Leg 2: B -> C */}
          <button
            onClick={() => jumpToStage('B_TO_C')}
            className={`p-2 rounded-xl border text-left transition-all ${
              tripProgress > 0.52 && tripProgress < 0.98
                ? 'bg-emerald-500 text-slate-950 border-white font-black shadow-[0_0_12px_#10B981]'
                : 'bg-black/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">🚀 มุ่งหน้าจุด C</span>
              <span>75%</span>
            </div>
            <p className="text-[9px] opacity-80 truncate mt-0.5">ลัดซอยประสานมิตร 23</p>
          </button>

          {/* Point C: Destination */}
          <button
            onClick={() => jumpToStage('C')}
            className={`p-2 rounded-xl border text-left transition-all ${
              tripProgress >= 0.98
                ? 'bg-emerald-400 text-slate-950 border-white font-black shadow-[0_0_12px_#10B981]'
                : 'bg-black/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">🏁 จุด C (ถึงที่หมาย)</span>
              <span>100%</span>
            </div>
            <p className="text-[9px] opacity-80 truncate mt-0.5">{selectedJob.dropoffLocation.slice(0, 16)}</p>
          </button>
        </div>

        {/* Scrubber Progress Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="text-cyan-300 font-bold">
              ความคืบหน้าทริปจำลอง: {(tripProgress * 100).toFixed(0)}%
            </span>
            <span className="text-amber-300 font-bold">
              {tripProgress < 0.5 
                ? `ช่วงที่ 1: เดินทางไปรับ (${(tripProgress * 2 * 100).toFixed(0)}%)` 
                : `ช่วงที่ 2: เดินทางไปส่ง (${((tripProgress - 0.5) * 2 * 100).toFixed(0)}%)`}
            </span>
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

      {/* REAL-LIFE BANGKOK RANDOM SIMULATION MODAL */}
      {showRandomSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="p-6 rounded-3xl bg-[#07132B] border-2 border-amber-400/60 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.4)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 flex items-center justify-center text-xl">
                  🎲
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">จำลองสถานการณ์จริง (Bangkok Simulation)</h3>
                  <p className="text-[10px] text-amber-300 font-mono">สุ่มสภาพแวดล้อม, การจราจร, ระยะทาง & ค่าโดยสาร</p>
                </div>
              </div>
              <button
                onClick={() => setShowRandomSimModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300">
                ระบบจะสุ่มพิกัดลูกค้า ร้านค้าพาร์ทเนอร์ จุดรับ-ส่งในกรุงเทพฯ พร้อมคำนวณค่าโดยสารจริงตามระยะทาง + สภาพการจราจร:
              </p>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>พิกัดปัจจุบัน:</span>
                  <span className="text-cyan-300 font-bold">{selectedJob.pickupLocation.split('/')[0]}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ปลายทาง:</span>
                  <span className="text-emerald-300 font-bold">{selectedJob.dropoffLocation.split('/')[0]}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ระยะทางจริง:</span>
                  <span className="text-white font-bold">{selectedJob.distanceKm} กม.</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ค่าโดยสารคำนวณจริง:</span>
                  <span className="text-amber-300 font-black">฿{selectedJob.netFare}.00</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  generateRandomBangkokJob();
                  setShowRandomSimModal(false);
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_#F59E0B] hover:brightness-110"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>🎲 สุ่มสถานการณ์ใหม่ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY PROOF OF DELIVERY & DYNAMIC QR PAYMENT MODAL */}
      {showDeliveryProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="p-6 rounded-3xl bg-[#061226] border-2 border-emerald-400/70 max-w-lg w-full space-y-4 shadow-[0_0_60px_rgba(16,185,129,0.4)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ขั้นตอนส่งมอบงาน & รับชำระเงิน</h3>
                  <p className="text-[10px] text-emerald-300 font-mono">
                    เงื่อนไขส่งงาน: ถ่ายรูปหลักฐาน ➔ สแกนจ่ายตามระยะทางจริง ➔ ให้ดาว
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeliveryProofModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Camera Photo Proof */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>1. ถ่ายภาพหลักฐานส่งมอบ (Mandatory Photo Verification):</span>
                </span>
                <span className="text-[10px] text-cyan-300 font-mono">
                  {capturedProofPhoto ? '✓ ถ่ายภาพสำเร็จ' : '⚠️ ต้องถ่ายภาพก่อนจบงาน'}
                </span>
              </div>

              {/* Viewfinder Preview */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-cyan-400/50 bg-slate-950 h-44 flex flex-col items-center justify-center">
                {capturedProofPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={capturedProofPhoto}
                      alt="Delivery Proof"
                      className="w-full h-full object-cover"
                    />
                    {/* Watermark Overlay */}
                    <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/20 text-[9px] font-mono text-cyan-300 flex justify-between items-center">
                      <div>
                        <p className="text-white font-bold">📍 GPS: 13.7367° N, 100.5750° E ({selectedJob.dropoffLocation.split('/')[0]})</p>
                        <p className="text-slate-400">รหัสงาน: #{selectedJob.id} • เวลา: {new Date().toLocaleTimeString('th-TH')}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2 p-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 mx-auto flex items-center justify-center">
                      <Camera className="w-6 h-6 animate-pulse" />
                    </div>
                    <p className="text-xs text-slate-300 font-medium">กดปุ่มด้านล่างเพื่อจำลองการถ่ายภาพส่งมอบลูกค้าหรือพัสดุ</p>
                  </div>
                )}
              </div>

              {/* Camera Snap Button */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playCameraSnap();
                    setIsCapturingPhoto(true);
                    setTimeout(() => {
                      const randomPhoto = SIM_SAMPLE_PHOTOS[Math.floor(Math.random() * SIM_SAMPLE_PHOTOS.length)];
                      setCapturedProofPhoto(randomPhoto);
                      setIsCapturingPhoto(false);
                      if (audioEnabled) speakThaiText('บันทึกภาพถ่ายหลักฐานส่งมอบพร้อมพิกัดดาวเทียมเรียบร้อยแล้วค่ะ', voicePersona, voiceSpeedRate);
                    }, 400);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_#00D2FF]"
                >
                  <Camera className="w-4 h-4" />
                  <span>{capturedProofPhoto ? '📸 ถ่ายภาพใหม่' : '📸 กดถ่ายภาพหลักฐาน (GPS Stamp)'}</span>
                </button>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <label className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={proofChecklist.helmCheck}
                    onChange={(e) => setProofChecklist(prev => ({ ...prev, helmCheck: e.target.checked }))}
                    className="rounded accent-cyan-400"
                  />
                  <span>สวมหมวกกันน็อก</span>
                </label>
                <label className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={proofChecklist.safeHandover}
                    onChange={(e) => setProofChecklist(prev => ({ ...prev, safeHandover: e.target.checked }))}
                    className="rounded accent-emerald-400"
                  />
                  <span>ส่งถึงมือผู้รับ</span>
                </label>
                <label className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={proofChecklist.packageIntact}
                    onChange={(e) => setProofChecklist(prev => ({ ...prev, packageIntact: e.target.checked }))}
                    className="rounded accent-amber-400"
                  />
                  <span>สภาพสมบูรณ์</span>
                </label>
              </div>
            </div>

            {/* Step 2: Dynamic QR Payment based on Real Distance */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#FFD700]" />
                  <span>2. สแกนจ่ายเงิน PromptPay (คำนวณจริงตามระยะทาง):</span>
                </span>
                <span className="text-sm font-black text-amber-300 font-mono">
                  ฿{selectedJob.netFare}.00
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-black/50 border border-amber-400/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-10 h-10 text-slate-950" />
                  </div>
                  <div className="font-mono text-xs">
                    <p className="text-white font-bold">พร้อมเพย์อัศวิน: WR-SOV-001</p>
                    <p className="text-[10px] text-slate-400">ระยะทาง {selectedJob.distanceKm} กม. • ค่าโดยสารสุทธิ ฿{selectedJob.netFare}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playPaymentSuccessChime();
                    setPaymentStepDone(true);
                    confetti({
                      particleCount: 80,
                      spread: 60,
                      origin: { y: 0.6 }
                    });
                    speakThaiText(`ชำระเงินสำเร็จ ได้รับเงินค่าโดยสาร ${selectedJob.netFare} บาท และทิป ${customerTip} บาทเข้าวอลเล็ตเรียบร้อยค่ะ`, voicePersona, voiceSpeedRate);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    paymentStepDone
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_#10B981]'
                      : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_15px_#F59E0B] hover:brightness-110'
                  }`}
                >
                  {paymentStepDone ? <Check className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  <span>{paymentStepDone ? 'ชำระเงินสำเร็จแล้ว' : 'จำลองลูกค้าสแกนจ่าย'}</span>
                </button>
              </div>
            </div>

            {/* Step 3: Customer Rating & Tip */}
            {paymentStepDone && (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-400/40 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-bold flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>3. คะแนนรีวิว & ทิปจากลูกค้า:</span>
                  </span>
                  <div className="flex gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-emerald-300 font-mono">
                  "พี่วินขับนุ่มมาก ซอกแซกลัดซอยเก่งมาก ถึงที่หมายไวกว่าเวลาประเมิน 4 นาที!" (+ทิปพิเศษ ฿{customerTip})
                </p>
              </div>
            )}

            {/* Complete Button */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={!capturedProofPhoto || !paymentStepDone}
                onClick={() => {
                  if (onCompleteTrip) onCompleteTrip(selectedJob);
                  setShowDeliveryProofModal(false);
                  if (onClose) onClose();
                }}
                className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  capturedProofPhoto && paymentStepDone
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-green-600 text-slate-950 shadow-[0_0_20px_#10B981] hover:brightness-110 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>ยืนยันส่งงานสำเร็จ & รับเงินเข้ากระเป๋า (+{selectedJob.xpReward} XP)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DETAILS: LANDMARK OR INFRASTRUCTURE CLICK INSPECTOR */}
      {selectedLandmark && (
        <div className="p-3 rounded-2xl bg-slate-900 border border-cyan-400 flex items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏢</span>
            <div>
              <h4 className="font-bold text-white">{selectedLandmark.name}</h4>
              <p className="text-[10px] text-cyan-300 font-mono">ความสูง {selectedLandmark.floors} ชั้น • {selectedLandmark.nameEn}</p>
            </div>
          </div>
          <button 
            onClick={() => setSelectedLandmark(null)}
            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px]"
          >
            ปิด
          </button>
        </div>
      )}

      {selectedInfraPoint && (
        <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-400 flex items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h4 className="font-bold text-white">{selectedInfraPoint.name}</h4>
              <p className="text-[10px] text-emerald-300 font-mono">{selectedInfraPoint.detail}</p>
            </div>
          </div>
          <button 
            onClick={() => setSelectedInfraPoint(null)}
            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px]"
          >
            ปิด
          </button>
        </div>
      )}

      {/* MODALS */}
      {showRadarModal && (
        <DensityRadarOverlay
          isOpen={showRadarModal}
          onClose={() => setShowRadarModal(false)}
          currentDriverLevel={driverLevel}
          audioEnabled={audioEnabled}
        />
      )}

      {showQrPayModal && (
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
      )}
    </div>
  );
};
