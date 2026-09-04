import React, { useState, useEffect } from 'react';
import { playTactileBlip, playRadarScan, playEngineRev, playLevelUpFanfare, speakThaiText } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Radio,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Navigation,
  Phone,
  User,
  Shield,
  Zap,
  Flame,
  Award,
  DollarSign,
  AlertTriangle,
  RotateCw,
  Eye,
  Check,
  ChevronRight,
  Compass,
  ExternalLink,
  Map,
  Globe,
  Sliders,
  Filter,
  Sun,
  SunMedium
} from 'lucide-react';
import { Vehicle } from '../types';
import { ThreeDimensionalDriverRadar, Radar3DPing } from './ThreeDimensionalDriverRadar';
import { KnightNavigationMapScreen } from './KnightNavigationMapScreen';
import {
  generateRealGoogleMapsJob,
  REAL_BANGKOK_LOCATIONS,
  RealBangkokLocation,
  getGoogleMapsNavigationUrl
} from '../data/realBangkokLocations';
import { useWakeLock } from '../hooks/useWakeLock';
import { subscribeToLiveOrders, acceptLiveOrder, advanceLiveOrderStep, LiveRideOrder } from '../utils/dispatchSync';
import { TripSummaryReceiptModal } from './TripSummaryReceiptModal';

export interface IncomingJobData {
  id: string;
  serviceId: 'knight' | 'express' | 'spirit' | 'mu' | 'pet' | 'food' | 'backhaul';
  serviceTitle: string;
  serviceIconEmoji: string;
  customerName: string;
  customerGender?: 'female' | 'male';
  customerRating: number;
  customerPhone: string;
  customerAvatarEmoji: string;
  customerNote?: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  driverDistanceToPickupKm: number; // Proximity to driver
  fairDispatchQueueRank: number; // e.g. Rank #1 Closest
  totalCandidatesInRadius: number;
  estMinutes: number;
  baseFare: number;
  tips: number;
  netFare: number;
  platformFee: number; // 1 baht flat
  xpReward: number;
  specialBadges?: string[];
  vehicleRequested?: string;
  urgency: 'normal' | 'high' | 'urgent';
  // Google Maps Coordinates & Data
  pickupCoord?: { lat: number; lng: number };
  dropoffCoord?: { lat: number; lng: number };
  pickupAddressTh?: string;
  dropoffAddressTh?: string;
  googleMapsUrl?: string;
  zoneTitle?: string;
}

interface DriverStandbyAndIncomingJobProps {
  isOnDuty: boolean;
  onToggleDuty: (active: boolean) => void;
  activeVehicle: Vehicle;
  driverLevel: number;
  driverCreditScore: number;
  audioEnabled: boolean;
  onAcceptJob: (job: IncomingJobData) => void;
  onGainXp: (amount: number, reason: string) => void;
  onAddEarnings: (amount: number) => void;
}

export const SAMPLE_INCOMING_JOBS: IncomingJobData[] = [
  {
    id: 'JOB-KNIGHT-8821',
    serviceId: 'knight',
    serviceTitle: 'WIN KNIGHT (รับส่งด่วนเลี่ยงรถติด)',
    serviceIconEmoji: '🛵',
    customerName: 'คุณณิชา รัตนเวช',
    customerGender: 'female',
    customerRating: 4.9,
    customerPhone: '089-445-1234',
    customerAvatarEmoji: '👩‍💼',
    customerNote: 'รออยู่หน้าคอนโดไอดีโอ ฝั่งถนนเจริญนคร ใส่เสื้อขาวค่ะ',
    pickupLocation: 'คอนโด ไอดีโอ สาทร-วงเวียนใหญ่',
    dropoffLocation: 'อาคารสาทรสแควร์ BTS ช่องนนทรี',
    distanceKm: 3.4,
    driverDistanceToPickupKm: 0.25, // Closest!
    fairDispatchQueueRank: 1,
    totalCandidatesInRadius: 6,
    estMinutes: 8,
    baseFare: 65,
    tips: 10,
    netFare: 74, // 65 + 10 - 1
    platformFee: 1,
    xpReward: 150,
    specialBadges: ['📍 ใกล้จุดรับที่สุด 250 ม.', '⭐ ลูกค้าชั้น 1 เครดิตดี'],
    vehicleRequested: 'Honda Wave 125i (ประหยัดสุด)',
    urgency: 'high'
  },
  {
    id: 'JOB-SPIRIT-4402',
    serviceId: 'spirit',
    serviceTitle: 'WIN Spirit (พาคุณตาไปละหมาดที่มัสยิด)',
    serviceIconEmoji: '🕌 👵',
    customerName: 'คุณลุงฮาซัน & คุณตาอิบราฮิม',
    customerRating: 5.0,
    customerPhone: '081-998-3344',
    customerAvatarEmoji: '🧓',
    customerNote: 'พาคุณตาวัย 78 ปีไปละหมาดวันศุกร์ที่มัสยิดบางหลวง ขับนุ่มนวลและช่วยประคองขึ้นลงครับ',
    pickupLocation: 'ซอยเจริญรัถ 28 (ใกล้วงเวียนใหญ่)',
    dropoffLocation: 'มัสยิดบางหลวง (กุฎีขาว) คลองบางหลวง',
    distanceKm: 2.1,
    driverDistanceToPickupKm: 0.35,
    fairDispatchQueueRank: 1,
    totalCandidatesInRadius: 4,
    estMinutes: 10,
    baseFare: 80,
    tips: 20,
    netFare: 99,
    platformFee: 1,
    xpReward: 300,
    specialBadges: ['🕌 ศาสนกิจทุกศาสนา', '🛡️ อบรมดูแลผู้สูงอายุ', '📍 ใกล้ที่สุด 350 ม.'],
    urgency: 'normal'
  },
  {
    id: 'JOB-MU-7719',
    serviceId: 'mu',
    serviceTitle: 'WIN MU BUDDY (ทริปไหว้พระสายมู 9 วัด)',
    serviceIconEmoji: '🪷 ✨',
    customerName: 'คุณแพรวา สายบุญ',
    customerGender: 'female',
    customerRating: 4.95,
    customerPhone: '095-223-8899',
    customerAvatarEmoji: '🧘‍♀️',
    customerNote: 'มีบทสวดมนต์และของไหว้พร้อมค่ะ ขอพี่วินที่รู้จุดไหว้ท้าวเวสสุวรรณและพระแม่ลักษมี',
    pickupLocation: 'วัดระฆังโฆสิตารามวรมหาวิหาร',
    dropoffLocation: 'วัดกัลยาณมิตรวรมหาวิหาร & ศาลเจ้ากวนอู',
    distanceKm: 4.8,
    driverDistanceToPickupKm: 0.4,
    fairDispatchQueueRank: 1,
    totalCandidatesInRadius: 5,
    estMinutes: 14,
    baseFare: 120,
    tips: 30,
    netFare: 149,
    platformFee: 1,
    xpReward: 280,
    specialBadges: ['🪷 สายมู 9 วัด', '📜 มีคลังบทสวด AI', '📍 สุ่มความใกล้ลำดับ 1'],
    urgency: 'normal'
  },
  {
    id: 'JOB-EXPRESS-1109',
    serviceId: 'express',
    serviceTitle: 'WIN Express (ส่งของด่วน + กล่อง 20฿)',
    serviceIconEmoji: '📦 ⚡',
    customerName: 'ร้านเค้กเบเกอรี่ โฮมเมด',
    customerRating: 4.85,
    customerPhone: '086-771-4567',
    customerAvatarEmoji: '🧁',
    customerNote: 'กล่องเค้กวันเกิด 2 ปอนด์ ระวังหน้าเค้กเอียง มีกล่องท้ายรถล็อคกันกระแทกเรียบร้อย',
    pickupLocation: 'ร้าน Aura Bake ซอยลาดหญ้า 12',
    dropoffLocation: 'คอนโด The River ถ.เจริญนคร',
    distanceKm: 2.8,
    driverDistanceToPickupKm: 0.18,
    fairDispatchQueueRank: 1,
    totalCandidatesInRadius: 8,
    estMinutes: 9,
    baseFare: 70,
    tips: 15,
    netFare: 84,
    platformFee: 1,
    xpReward: 200,
    specialBadges: ['📦 ค่ากล่องพัสดุ +20฿', '📍 ใกล้ที่สุด 180 ม.'],
    urgency: 'high'
  },
  {
    id: 'JOB-PET-3321',
    serviceId: 'pet',
    serviceTitle: 'WIN-Pet Care (ส่งน้องหมาหาหมอฉุกเฉิน)',
    serviceIconEmoji: '🐾 🏥',
    customerName: 'คุณหมอทราย (เจ้าของน้องปอม)',
    customerRating: 5.0,
    customerPhone: '083-112-9900',
    customerAvatarEmoji: '🐶',
    customerNote: 'น้องปอมมีไข้ซึม ต้องการพัดลมระบายอากาศในกล่อง WIN-Pet Space Pod ขอบคุณค่ะ',
    pickupLocation: 'ซอยกรุงธนบุรี 4 (BTS กรุงธนบุรี)',
    dropoffLocation: 'โรงพยาบาลสัตว์ตากสิน 24 ชม.',
    distanceKm: 2.5,
    driverDistanceToPickupKm: 0.28,
    fairDispatchQueueRank: 1,
    totalCandidatesInRadius: 3,
    estMinutes: 7,
    baseFare: 110,
    tips: 25,
    netFare: 134,
    platformFee: 1,
    xpReward: 320,
    specialBadges: ['🐾 WIN-Pet Pod มีแอร์', '📍 เลเวล 10+ & ใกล้สุด'],
    urgency: 'urgent'
  }
];

export const DriverStandbyAndIncomingJob: React.FC<DriverStandbyAndIncomingJobProps> = ({
  isOnDuty,
  onToggleDuty,
  activeVehicle,
  driverLevel,
  driverCreditScore,
  audioEnabled,
  onAcceptJob,
  onGainXp,
  onAddEarnings
}) => {
  const [activeIncomingJob, setActiveIncomingJob] = useState<IncomingJobData | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(30);
  const [currentActiveTrip, setCurrentActiveTrip] = useState<IncomingJobData | null>(null);
  const [tripStep, setTripStep] = useState<'heading_pickup' | 'picked_up' | 'navigating' | 'completed'>('heading_pickup');
  const [onlineMinutes, setOnlineMinutes] = useState<number>(142);
  const [radarPulseCount, setRadarPulseCount] = useState<number>(0);
  const [autoSimulateToggle, setAutoSimulateToggle] = useState<boolean>(true);
  const [showDispatchRulesModal, setShowDispatchRulesModal] = useState<boolean>(false);
  const [showNavigationMapModal, setShowNavigationMapModal] = useState<boolean>(false);
  const [lastDeclinedJobId, setLastDeclinedJobId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  const [showGoogleMapsModal, setShowGoogleMapsModal] = useState<boolean>(false);

  // Screen Wake Lock & Trip Receipt States
  const { isLocked: isScreenAwake, isSupported: isWakeLockSupported, toggleWakeLock } = useWakeLock();
  const [completedOrderForReceipt, setCompletedOrderForReceipt] = useState<LiveRideOrder | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Live Order Listener (Real-Time Passenger <-> Driver Cross-Screen Sync)
  useEffect(() => {
    const unsubscribe = subscribeToLiveOrders((order, type) => {
      if (type === 'created' && order.status === 'pending' && isOnDuty) {
        const incomingJob: IncomingJobData = {
          id: order.id,
          serviceId: (order.serviceId as any) || 'knight',
          serviceTitle: order.serviceTitle,
          serviceIconEmoji: order.serviceIconEmoji || '🛵',
          customerName: order.passengerName,
          customerGender: 'female',
          customerRating: 4.95,
          customerPhone: order.passengerPhone,
          customerAvatarEmoji: '👩‍💼',
          customerNote: `รออยู่ที่ ${order.pickupLocation}`,
          pickupLocation: order.pickupLocation,
          dropoffLocation: order.dropoffLocation,
          distanceKm: order.distanceKm,
          driverDistanceToPickupKm: 0.25,
          fairDispatchQueueRank: 1,
          totalCandidatesInRadius: 4,
          estMinutes: order.estMinutes,
          baseFare: order.fare,
          tips: 0,
          netFare: order.netFare,
          platformFee: 2,
          xpReward: 250,
          specialBadges: ['🚨 งานสดเรียลไทม์ (Live Passenger)', '⚡ 2-Baht Sovereign Fund', '📍 ใกล้จุดรับที่สุด'],
          vehicleRequested: activeVehicle?.name || 'Honda Wave 125i',
          urgency: 'high'
        };
        setActiveIncomingJob(incomingJob);
        setCountdownSeconds(30);
        if (audioEnabled) {
          playRadarScan();
          speakThaiText(`มีงานใหม่เข้ามาจากผู้โดยสาร ${order.passengerName} จุดรับ ${order.pickupLocation} ค่าโดยสาร ${order.fare} บาท`);
        }
      }
    });
    return () => unsubscribe();
  }, [isOnDuty, audioEnabled, activeVehicle]);

  // Online minutes counter
  useEffect(() => {
    if (!isOnDuty) return;
    const interval = setInterval(() => {
      setOnlineMinutes(prev => prev + 1);
      setRadarPulseCount(prev => (prev + 1) % 100);
    }, 60000);
    return () => clearInterval(interval);
  }, [isOnDuty]);

  // Countdown timer for incoming job (30 seconds)
  useEffect(() => {
    if (!activeIncomingJob) return;

    setCountdownSeconds(30);
    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto timeout -> passed to next closest driver
          if (audioEnabled) playTactileBlip(400);
          setLastDeclinedJobId(activeIncomingJob.id);
          setActiveIncomingJob(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeIncomingJob, audioEnabled]);

  // Periodic incoming job trigger simulation if on-duty and no active trip/job
  useEffect(() => {
    if (!isOnDuty || activeIncomingJob || currentActiveTrip || !autoSimulateToggle) return;

    const randomDelay = Math.floor(Math.random() * 8000) + 12000; // 12-20s interval
    const timeout = setTimeout(() => {
      triggerRealGoogleMapsJob();
    }, randomDelay);

    return () => clearTimeout(timeout);
  }, [isOnDuty, activeIncomingJob, currentActiveTrip, autoSimulateToggle, selectedZone]);

  const triggerRealGoogleMapsJob = (customZone?: string, customService?: string) => {
    if (!isOnDuty) {
      if (audioEnabled) playTactileBlip(400);
      alert('กรุณาเปิดสถานะ "🟢 พร้อมรับงาน (ON DUTY)" ก่อนครับ');
      return;
    }

    const zoneToUse = customZone || (selectedZone !== 'all' ? selectedZone : undefined);
    const serviceToUse = customService || (selectedServiceFilter !== 'all' ? selectedServiceFilter : undefined);

    const realJob = generateRealGoogleMapsJob({
      zone: zoneToUse,
      serviceId: serviceToUse
    });

    setActiveIncomingJob(realJob);
    if (audioEnabled) {
      playRadarScan();
      playTactileBlip(1200);
      speakThaiText(`มีงานใหม่จาก ${realJob.pickupLocation.split('(')[0]} ไป ${realJob.dropoffLocation.split('(')[0]} ระยะทาง ${realJob.distanceKm} กิโลเมตรค่ะ`);
    }
  };

  const triggerRandomJob = (specificIndex?: number) => {
    if (!isOnDuty) {
      if (audioEnabled) playTactileBlip(400);
      alert('กรุณาเปิดสถานะ "🟢 พร้อมรับงาน (ON DUTY)" ก่อนครับ');
      return;
    }

    if (specificIndex !== undefined && SAMPLE_INCOMING_JOBS[specificIndex]) {
      setActiveIncomingJob(SAMPLE_INCOMING_JOBS[specificIndex]);
    } else {
      triggerRealGoogleMapsJob();
    }

    if (audioEnabled) {
      playRadarScan();
      playTactileBlip(1200);
    }
  };

  const triggerServiceJob = (serviceType: 'knight' | 'express' | 'pet' | 'mu' | 'spirit') => {
    if (!isOnDuty) {
      if (audioEnabled) playTactileBlip(400);
      alert('กรุณาเปิดสถานะ "🟢 พร้อมรับงาน (ON DUTY)" ก่อนครับ');
      return;
    }
    triggerRealGoogleMapsJob(undefined, serviceType);
  };

  const handleConfirmAccept = () => {
    if (!activeIncomingJob) return;

    if (audioEnabled) {
      playEngineRev();
    }
    confetti({
      particleCount: 70,
      spread: 80,
      colors: ['#00D2FF', '#FFD700', '#10B981']
    });

    const job = activeIncomingJob;
    setCurrentActiveTrip(job);
    setTripStep('heading_pickup');
    setActiveIncomingJob(null);
    onAcceptJob(job);

    // Sync accept order to passenger and webhook
    acceptLiveOrder(job.id, {
      driverName: 'พี่สมศักดิ์ ไนท์สายฟ้า',
      driverLevel: driverLevel || 100,
      driverPlate: '1กข 7789 กทม.',
      driverAvatarEmoji: '🦁',
      driverVehicle: activeVehicle?.name || 'Honda Wave 125i'
    });
  };

  const handleDeclineJob = () => {
    if (!activeIncomingJob) return;
    if (audioEnabled) playTactileBlip(600);
    setLastDeclinedJobId(activeIncomingJob.id);
    setActiveIncomingJob(null);
  };

  const handleAdvanceTripStep = () => {
    if (!currentActiveTrip) return;

    if (tripStep === 'heading_pickup') {
      if (audioEnabled) playTactileBlip(1000);
      setTripStep('picked_up');
      advanceLiveOrderStep(currentActiveTrip.id, 'picked_up');
    } else if (tripStep === 'picked_up') {
      if (audioEnabled) playEngineRev();
      setTripStep('navigating');
      advanceLiveOrderStep(currentActiveTrip.id, 'in_transit');
    } else if (tripStep === 'navigating') {
      // Complete Trip!
      if (audioEnabled) playLevelUpFanfare();
      confetti({
        particleCount: 100,
        spread: 90,
        colors: ['#00D2FF', '#FFD700', '#10B981', '#FFFFFF']
      });

      onAddEarnings(currentActiveTrip.netFare);
      onGainXp(currentActiveTrip.xpReward, `ส่งงานสำเร็จ: ${currentActiveTrip.serviceTitle}`);

      advanceLiveOrderStep(currentActiveTrip.id, 'completed');

      const receiptOrder: LiveRideOrder = {
        id: currentActiveTrip.id,
        serviceId: currentActiveTrip.serviceId,
        serviceTitle: currentActiveTrip.serviceTitle,
        serviceIconEmoji: currentActiveTrip.serviceIconEmoji,
        passengerName: currentActiveTrip.customerName,
        passengerPhone: currentActiveTrip.customerPhone || '089-445-1234',
        pickupLocation: currentActiveTrip.pickupLocation,
        dropoffLocation: currentActiveTrip.dropoffLocation,
        distanceKm: currentActiveTrip.distanceKm,
        fare: currentActiveTrip.baseFare,
        welfareFund2Baht: 2.0,
        netFare: currentActiveTrip.netFare,
        estMinutes: currentActiveTrip.estMinutes,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driverName: 'พี่สมศักดิ์ ไนท์สายฟ้า',
        driverLevel: driverLevel || 100,
        driverPlate: '1กข 7789 กทม.',
        driverAvatarEmoji: '🦁'
      };
      setCompletedOrderForReceipt(receiptOrder);
      setShowReceiptModal(true);

      setTripStep('completed');
      setTimeout(() => {
        setCurrentActiveTrip(null);
        setTripStep('heading_pickup');
      }, 3500);
    }
  };

  const formatOnlineTime = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs.toString().padStart(2, '0')} ชม. ${m.toString().padStart(2, '0')} นาที`;
  };

  return (
    <div className="space-y-4">
      {/* 1. ON-DUTY / STANDBY HERO CONTROL CARD */}
      <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all relative overflow-hidden ${
        isOnDuty
          ? 'bg-gradient-to-br from-[#0A2246] via-[#081735] to-[#040C1E] border-[#00D2FF] shadow-[0_0_30px_rgba(0,210,255,0.25)]'
          : 'bg-gradient-to-br from-[#1A1822] via-[#121118] to-[#0A0910] border-slate-700 shadow-none'
      }`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-all ${
              isOnDuty 
                ? 'bg-gradient-to-tr from-[#00D2FF] to-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(0,210,255,0.5)] animate-pulse' 
                : 'bg-slate-800 text-slate-400'
            }`}>
              {isOnDuty ? '📡' : '💤'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase flex items-center gap-1.5 ${
                  isOnDuty
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-800 text-slate-400 border border-white/10'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  {isOnDuty ? 'พร้อมรับงาน (ON DUTY - RADAR ACTIVE)' : 'พักชั่วคราว (OFF DUTY)'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDispatchRulesModal(true)}
                  className="text-[10px] text-cyan-300 hover:text-white underline font-mono flex items-center gap-0.5"
                >
                  <Shield className="w-3 h-3 text-[#FFD700]" />
                  <span>ระบบสุ่มยุติธรรม (ไม่วัดเลเวล)</span>
                </button>
              </div>
              <h3 className="text-base font-black text-white mt-1 flex items-center gap-2">
                <span>หน้าจอเรดาร์สแตนด์บายพี่วิน</span>
                <span className="text-xs font-normal text-slate-400 font-mono hidden sm:inline">
                  (Capillary Zone: ฝั่งธนบุรี โซน 4)
                </span>
              </h3>
            </div>
          </div>

          {/* Toggle Switch, Wake Lock & Map HUD Launcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            {/* Screen Always-On / WakeLock Button */}
            {isWakeLockSupported && (
              <button
                type="button"
                onClick={async () => {
                  if (audioEnabled) playTactileBlip(950);
                  await toggleWakeLock();
                }}
                className={`px-3 py-2.5 rounded-2xl font-mono text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isScreenAwake
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-black/40 text-slate-400 border-white/10 hover:border-white/20'
                }`}
                title="ป้องกันหน้าจอดับขณะขับขี่บนแฮนด์มอเตอร์ไซค์ (Screen Always-On)"
              >
                <Sun className={`w-3.5 h-3.5 ${isScreenAwake ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                <span>{isScreenAwake ? 'จอสว่างตลอด ✓' : 'กันจอดับ'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(900);
                setShowNavigationMapModal(true);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white font-bold text-xs font-mono shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center gap-1.5 transition-all"
            >
              <Navigation className="w-4 h-4 text-white" />
              <span>🗺️ แผนที่นำทาง GPS (ROUTE HUD)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (audioEnabled) {
                  if (!isOnDuty) playEngineRev();
                  else playTactileBlip(500);
                }
                onToggleDuty(!isOnDuty);
              }}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-lg ${
                isOnDuty
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'bg-gradient-to-r from-emerald-400 to-[#00D2FF] hover:brightness-110 text-slate-950 shadow-[0_0_20px_rgba(0,210,255,0.5)]'
              }`}
            >
              {isOnDuty ? (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>กดเพื่อพักงาน (OFF-DUTY)</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 animate-spin" />
                  <span>🟢 เปิดเรดาร์พร้อมรับงาน (ON-DUTY)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. STANDBY 3D RADAR HUD DISPLAY */}
        {isOnDuty ? (
          <div className="pt-3 space-y-3">
            {/* Live Visual 3D Holographic Cyber Radar Stage */}
            <ThreeDimensionalDriverRadar
              activeVehicle={activeVehicle}
              isOnDuty={isOnDuty}
              driverLevel={driverLevel}
              audioEnabled={audioEnabled}
              onTriggerJob={(serviceType) => triggerServiceJob(serviceType)}
            />

            {/* Telemetry and Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-slate-400 block">เวลาออนไลน์วันนี้:</span>
                <span className="text-cyan-300 font-bold text-sm flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {formatOnlineTime(onlineMinutes)}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-slate-400 block">ยานรบออกศึก:</span>
                <span className="text-white font-bold text-[11px] truncate block">
                  {activeVehicle.name}
                </span>
                <span className="text-[9px] text-amber-300">({activeVehicle.plateNumber})</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-slate-400 block">เกณฑ์การสุ่มงาน:</span>
                <span className="text-emerald-300 font-bold text-xs flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ระยะทางใกล้สุด 100%</span>
                </span>
                <span className="text-[9px] text-slate-400">ยุติธรรม ไม่วัดเลเวล</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-slate-400 block">ความพร้อมหมวก HUD:</span>
                <span className="text-purple-300 font-bold text-xs flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>เชื่อมต่อ Smart HUD</span>
                </span>
                <span className="text-[9px] text-slate-400">เสียงนำทาง AI พร้อม</span>
              </div>
            </div>

            {/* 🗺️ GOOGLE MAPS REAL LOCATION RANDOM DISPATCH CONTROL PANEL */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0B254E] via-[#081B3B] to-[#051126] border-2 border-[#00D2FF] shadow-[0_0_25px_rgba(0,210,255,0.3)] space-y-3 font-mono">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-400 text-slate-950 shadow-md">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>สุ่มงานตามสถานที่จริง (Google Maps Real GPS Dispatch)</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </h4>
                    <p className="text-[10px] text-cyan-200/80">
                      พิกัด GPS จริง ทั่วกรุงเทพฯ คำนวณระยะทาง & ค่าโดยสารแม่นยำ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <label className="flex items-center gap-1.5 text-cyan-300 cursor-pointer bg-black/40 px-2.5 py-1 rounded-xl border border-white/10">
                    <input
                      type="checkbox"
                      checked={autoSimulateToggle}
                      onChange={(e) => setAutoSimulateToggle(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-cyan-400 bg-black/40"
                    />
                    <span>สุ่มงานอัตโนมัติ (12-20s)</span>
                  </label>
                </div>
              </div>

              {/* Zone Filter Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  <span>เลือกโซนสถานที่จริงที่ต้องการสุ่ม:</span>
                </span>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {[
                    { id: 'all', label: '🌟 ทุกโซนทั่วกรุงเทพฯ' },
                    { id: 'siam_sukhumvit', label: '🏙️ สยาม - สุขุมวิท' },
                    { id: 'silom_sathorn', label: '💼 สีลม - สาทร' },
                    { id: 'thonburi_wongwian', label: '🏛️ ฝั่งธน - วงเวียนใหญ่' },
                    { id: 'ratchada_rama9', label: '⚡ รัชดา - พระราม 9' },
                    { id: 'ari_chatuchak', label: '🛍️ อารีย์ - จตุจักร' },
                    { id: 'pinklao_siriraj', label: '🏥 ปิ่นเกล้า - ศิริราช' },
                    { id: 'bangna_samutprakan', label: '✈️ บางนา' }
                  ].map(z => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setSelectedZone(z.id);
                      }}
                      className={`px-2.5 py-1 rounded-xl border transition-all ${
                        selectedZone === z.id
                          ? 'bg-cyan-400 text-slate-950 font-black border-cyan-300 shadow-[0_0_10px_#00D2FF]'
                          : 'bg-black/40 text-slate-300 border-white/10 hover:border-cyan-400/50'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Trigger Buttons */}
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => triggerRealGoogleMapsJob(undefined, 'knight')}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 text-[10px] font-bold border border-cyan-400/40 transition-all flex items-center gap-1"
                  >
                    <span>🛵 วินด่วน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerRealGoogleMapsJob(undefined, 'express')}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 text-[10px] font-bold border border-emerald-400/40 transition-all flex items-center gap-1"
                  >
                    <span>📦 ส่งพัสดุ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerRealGoogleMapsJob(undefined, 'spirit')}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500 hover:text-slate-950 text-purple-300 text-[10px] font-bold border border-purple-400/40 transition-all flex items-center gap-1"
                  >
                    <span>🧓 ผู้สูงอายุ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerRealGoogleMapsJob(undefined, 'mu')}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[10px] font-bold border border-amber-400/40 transition-all flex items-center gap-1"
                  >
                    <span>🪷 สายมู 9 วัด</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerRealGoogleMapsJob(undefined, 'pet')}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 hover:text-slate-950 text-rose-300 text-[10px] font-bold border border-rose-400/40 transition-all flex items-center gap-1"
                  >
                    <span>🐾 สัตว์เลี้ยง</span>
                  </button>
                </div>

                <button
                  type="button"
                  id="btn-trigger-real-google-map-job"
                  onClick={() => triggerRealGoogleMapsJob()}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#00D2FF] via-cyan-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs font-mono shadow-[0_0_20px_rgba(0,210,255,0.6)] flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  <span>🗺️ สุ่มงานสถานที่จริงทันที (Google Maps)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-slate-400">
              สถานะขณะนี้: <strong>ออฟไลน์ (พักผ่อน)</strong> คุณจะไม่ได้รับการยิงคำของานจากผู้โดยสาร
            </p>
            <p className="text-[11px] text-cyan-400/80 font-mono">
              กดปุ่ม "🟢 เปิดเรดาร์พร้อมรับงานทันที" ด้านบนเพื่อเริ่มจับคู่คำขอโดยสารรอบตัวด้วยระบบความใกล้เคียง
            </p>
          </div>
        )}
      </div>

      {/* 3. ACTIVE TRIP EXECUTION VIEW (WITH LIVE GPS NAVIGATION MAP SCREEN) */}
      {currentActiveTrip && (
        <div className="space-y-4 animate-fade-in">
          {/* Main Integrated GPS Route Navigation Map Screen */}
          <KnightNavigationMapScreen
            activeJob={currentActiveTrip}
            activeVehicle={activeVehicle}
            driverLevel={driverLevel}
            audioEnabled={audioEnabled}
            onAdvanceTripStep={handleAdvanceTripStep}
            onCompleteTrip={(job) => {
              handleAdvanceTripStep();
            }}
            isEmbedded={true}
          />
        </div>
      )}

      {/* STANDALONE / PREVIEW GPS NAVIGATION MAP MODAL */}
      {showNavigationMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto">
            <KnightNavigationMapScreen
              activeJob={currentActiveTrip || undefined}
              activeVehicle={activeVehicle}
              driverLevel={driverLevel}
              audioEnabled={audioEnabled}
              onClose={() => setShowNavigationMapModal(false)}
              onAdvanceTripStep={() => {
                if (currentActiveTrip) handleAdvanceTripStep();
              }}
              onCompleteTrip={(job) => {
                if (currentActiveTrip) handleAdvanceTripStep();
                setShowNavigationMapModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* 4. POPUP MODAL: INCOMING JOB DISPATCH WITH 30s COUNTDOWN & FAIR PROXIMITY FIRST */}
      {activeIncomingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0C1A35] via-[#09152B] to-[#050C1A] rounded-[32px] border-2 border-[#FFD700] p-5 sm:p-6 shadow-[0_0_60px_rgba(255,215,0,0.4)] space-y-4 max-h-[95vh] overflow-y-auto">
            
            {/* Countdown Top Progress Bar (30s Depletion Bar) */}
            <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden border border-white/10 p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  countdownSeconds <= 10 
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse' 
                    : countdownSeconds <= 20
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : 'bg-gradient-to-r from-[#00D2FF] via-cyan-400 to-emerald-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, (countdownSeconds / 30) * 100))}%` }}
              />
            </div>

            {/* Pulsating Header with Ring Sound Indicator & Countdown */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FFD700] to-amber-500 flex items-center justify-center text-2xl text-slate-950 font-black shadow-[0_0_25px_rgba(255,215,0,0.6)] animate-bounce">
                  {activeIncomingJob.serviceIconEmoji.split(' ')[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold font-mono uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                      มีงานเข้าใหม่! (INCOMING DISPATCH)
                    </span>
                    <span className="text-[10px] text-cyan-300 font-mono">
                      #{activeIncomingJob.id}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white mt-0.5">
                    {activeIncomingJob.serviceTitle}
                  </h3>
                </div>
              </div>

              {/* 30s Circular Countdown Badge */}
              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-black/70 border-2 border-rose-500 text-rose-400 font-mono shadow-[0_0_20px_rgba(244,63,94,0.4)] flex-shrink-0 animate-pulse">
                <span className="text-lg font-black leading-none">{countdownSeconds}</span>
                <span className="text-[8px] uppercase tracking-tighter text-slate-300">/ 30 วิ</span>
              </div>
            </div>

            {/* FAIR PROXIMITY DISPATCH VERIFICATION BADGE */}
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>ระบบสุ่มงานยุติธรรม: คุณอยู่ใกล้จุดรับที่สุด!</span>
                </span>
                <span className="bg-emerald-400/20 px-2 py-0.2 rounded-full text-[10px]">
                  อันดับ 1 ในรัศมี
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                ระยะห่างจากคุณถึงจุดรับเพียง <strong>{activeIncomingJob.driverDistanceToPickupKm * 1000} เมตร</strong> (จากพี่วินทั้งหมด {activeIncomingJob.totalCandidatesInRadius} นายในเขต) • จ่ายงานให้คนที่อยู่ใกล้สุดเป็นอันดับหนึ่ง ไม่ดักงาน ไม่วัดที่เลเวล
              </p>
            </div>

            {/* Net Payout & XP Reward Hero Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-emerald-500/20 border border-[#FFD700]/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">รายได้สุทธิที่คุณจะได้รับ:</span>
                <div className="text-2xl font-black text-[#FFD700] font-mono flex items-center gap-1">
                  <span>฿{activeIncomingJob.netFare}.00</span>
                  <span className="text-xs font-normal text-slate-300">(หักค่าธรรมเนียม 1฿ แล้ว)</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-mono block">รางวัลเกียรติยศ:</span>
                <span className="text-base font-black text-cyan-300 font-mono flex items-center gap-1 justify-end">
                  <Sparkles className="w-4 h-4 text-[#00D2FF]" />
                  <span>+{activeIncomingJob.xpReward} XP</span>
                </span>
              </div>
            </div>

            {/* Passenger & Note */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-base">
                    {activeIncomingJob.customerAvatarEmoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{activeIncomingJob.customerName}</span>
                      <span className="text-[10px] text-[#FFD700] font-mono">★ {activeIncomingJob.customerRating}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ประวัติเดินทาง 42 เที่ยว • สุภาพ ไม่ยกเลิกงาน
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {activeIncomingJob.specialBadges?.map((b, i) => (
                    <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {activeIncomingJob.customerNote && (
                <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200">
                  <strong>ข้อความจากลูกค้า:</strong> "{activeIncomingJob.customerNote}"
                </div>
              )}
            </div>

            {/* Route Locations & Google Maps GPS Badge */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-300 font-bold">
                      จุดรับ ({activeIncomingJob.driverDistanceToPickupKm * 1000} ม. จากจุดที่คุณอยู่):
                    </span>
                    {activeIncomingJob.pickupCoord && (
                      <span className="text-[9px] text-slate-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                        GPS: {activeIncomingJob.pickupCoord.lat.toFixed(4)}, {activeIncomingJob.pickupCoord.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-semibold block">{activeIncomingJob.pickupLocation}</span>
                  {activeIncomingJob.pickupAddressTh && (
                    <span className="text-[10px] text-slate-300 block mt-0.5">{activeIncomingJob.pickupAddressTh}</span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-start gap-2">
                <Navigation className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-purple-300 font-bold">
                      ปลายทางส่ง ({activeIncomingJob.distanceKm} กม. • ~{activeIncomingJob.estMinutes} นาที):
                    </span>
                    {activeIncomingJob.dropoffCoord && (
                      <span className="text-[9px] text-slate-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                        GPS: {activeIncomingJob.dropoffCoord.lat.toFixed(4)}, {activeIncomingJob.dropoffCoord.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-semibold block">{activeIncomingJob.dropoffLocation}</span>
                  {activeIncomingJob.dropoffAddressTh && (
                    <span className="text-[10px] text-slate-300 block mt-0.5">{activeIncomingJob.dropoffAddressTh}</span>
                  )}
                </div>
              </div>

              {/* Google Maps Real Route Link */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-500/30 text-[11px]">
                <div className="flex items-center gap-1.5 text-blue-300">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>รองรับพิกัด Google Maps จริง</span>
                  {activeIncomingJob.zoneTitle && (
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-200 text-[10px]">
                      {activeIncomingJob.zoneTitle}
                    </span>
                  )}
                </div>
                <a
                  href={activeIncomingJob.googleMapsUrl || getGoogleMapsNavigationUrl(activeIncomingJob.pickupLocation, activeIncomingJob.dropoffLocation, activeIncomingJob.dropoffCoord)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-cyan-400/20 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 text-[10px] font-bold border border-cyan-400/40 flex items-center gap-1 transition-all"
                >
                  <span>เปิด Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Action Buttons: Big Accept Button & Decline */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDeclineJob}
                className="w-1/3 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-bold text-xs font-mono transition-all"
              >
                ปฏิเสธ (ส่งต่อ)
              </button>

              <button
                type="button"
                onClick={handleConfirmAccept}
                className="w-2/3 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-[#00D2FF] to-blue-500 hover:brightness-110 text-slate-950 font-black text-sm font-mono shadow-[0_0_30px_rgba(0,210,255,0.6)] flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse"
              >
                <CheckCircle2 className="w-5 h-5 text-slate-950" />
                <span>กดรับงานทันที (฿{activeIncomingJob.netFare})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. FAIR DISPATCH RULES EXPLANATION MODAL */}
      {showDispatchRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0A1428] rounded-3xl border-2 border-[#00D2FF] p-6 shadow-[0_0_40px_rgba(0,210,255,0.3)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#FFD700]" />
                <h3 className="text-sm font-bold text-white">ระบบสุ่มงานยุติธรรม (Fair Proximity First)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchRulesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-mono">
              <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-1">
                <strong className="text-cyan-300 block">1. เกณฑ์ตัดสินอันดับ 1: ระยะทางใกล้จุดรับที่สุด (GPS Proximity)</strong>
                <p className="text-[11px] text-slate-300">
                  ระบบจะยิงงานให้พี่วินที่อยู่ใกล้จุดรับผู้โดยสารที่สุดเป็นอันดับแรกเสมอ ไม่ว่าพี่วินจะอยู่เลเวล 1 หรือเลเวล 100 เพื่อให้ลูกค้าได้รถไวที่สุดและพี่วินไม่ต้องขับรถไกลเปลืองน้ำมัน
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                <strong className="text-emerald-300 block">2. ไร้การดักงาน ไร้การเลือกที่รักมักที่ชัง (Level Neutral)</strong>
                <p className="text-[11px] text-slate-300">
                  เลเวลสูงจะได้รับสิทธิประโยชน์ทางค่าตอบแทน สวัสดิการ และปลดล็อกประเภทงานบริการพิเศษ แต่ในการรับงานทั่วไป ทุกเลเวลมีสิทธิได้รับงานเท่าเทียมกัน 100%
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-1">
                <strong className="text-amber-300 block">3. วนคิวเท่าเทียม (Fair Round-Robin)</strong>
                <p className="text-[11px] text-slate-300">
                  หากมีพี่วินอยู่ในระยะใกล้เคียงกันเท่ากัน ระบบจะยิงงานให้คนที่รอนานที่สุดก่อน เพื่อกระจายรายได้อย่างทั่วถึงทุกนายในวิน
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDispatchRulesModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs font-mono"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

      {/* Trip Summary & 2-Baht Fund Receipt Modal */}
      <TripSummaryReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        order={completedOrderForReceipt}
        audioEnabled={audioEnabled}
      />
    </div>
  );
};
