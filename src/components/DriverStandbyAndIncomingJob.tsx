import React, { useState, useEffect } from 'react';
import { playTactileBlip, playRadarScan, playEngineRev, playLevelUpFanfare, speakThaiText } from '../utils/audio';
import confetti from 'canvas-confetti';
import { getAuth } from 'firebase/auth';
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
  SunMedium,
  Video,
  MessageCircle,
  Share2
} from 'lucide-react';
import { Vehicle } from '../types';
import { ThreeDimensionalDriverRadar, Radar3DPing } from './ThreeDimensionalDriverRadar';
import { KnightNavigationMapScreen } from './KnightNavigationMapScreen';
import {
  getGoogleMapsNavigationUrl
} from '../data/realBangkokLocations';
import { useWakeLock } from '../hooks/useWakeLock';
import { subscribeToLiveOrders, acceptLiveOrder, advanceLiveOrderStep, declineLiveOrder, updateDriverPresence, fetchAvailableOrdersForDriver, fetchMyOrders, LiveRideOrder } from '../utils/dispatchSync';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { getCurrentUserSession } from '../utils/userSession';
import { TripSummaryReceiptModal } from './TripSummaryReceiptModal';
import { sendJobToLine, chatWithPassengerOnLine } from '../utils/lineIntegration';

export interface IncomingJobData {
  id: string;
  serviceId: 'knight' | 'express' | 'spirit' | 'mu' | 'family' | 'pet' | 'link' | 'lifestyle' | 'food' | 'backhaul';
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
  const [onlineMinutes, setOnlineMinutes] = useState<number>(0);
  const [radarPulseCount, setRadarPulseCount] = useState<number>(0);
  const [showDispatchRulesModal, setShowDispatchRulesModal] = useState<boolean>(false);
  const [showNavigationMapModal, setShowNavigationMapModal] = useState<boolean>(false);
  const [navModalInitialMode, setNavModalInitialMode] = useState<'3d_map' | 'google_maps' | 'live_camera_ar'>('3d_map');
  const [lastDeclinedJobId, setLastDeclinedJobId] = useState<string | null>(null);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  const [showGoogleMapsModal, setShowGoogleMapsModal] = useState<boolean>(false);
  const [dispatchActionPending, setDispatchActionPending] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const { gpsState } = useRealtimeGps(isOnDuty);
  const presenceLatitude = Number(gpsState.latitude.toFixed(4));
  const presenceLongitude = Number(gpsState.longitude.toFixed(4));

  // Screen Wake Lock & Trip Receipt States
  const { isLocked: isScreenAwake, isSupported: isWakeLockSupported, toggleWakeLock } = useWakeLock();
  const [completedOrderForReceipt, setCompletedOrderForReceipt] = useState<LiveRideOrder | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Live Order Listener (Real-Time Passenger <-> Driver Cross-Screen Sync)
  useEffect(() => {
    const unsubscribe = subscribeToLiveOrders((order, type) => {
      const currentUserId = getAuth().currentUser?.uid;
      if (
        type === 'created'
        && order.status === 'pending'
        && order.passengerUserId
        && order.passengerUserId !== currentUserId
        && order.offeredDriverId === currentUserId
        && order.id !== lastDeclinedJobId
        && isOnDuty
      ) {
        const incomingJob: IncomingJobData = {
          id: order.id,
          serviceId: (order.serviceId as any) || 'knight',
          serviceTitle: order.serviceTitle,
          serviceIconEmoji: order.serviceIconEmoji || '🛵',
          customerName: order.passengerName,
          customerGender: order.customerGender,
          customerRating: 0,
          customerPhone: order.passengerPhone,
          customerAvatarEmoji: '👤',
          customerNote: `รออยู่ที่ ${order.pickupLocation}`,
          pickupLocation: order.pickupLocation,
          dropoffLocation: order.dropoffLocation,
          distanceKm: order.distanceKm,
          driverDistanceToPickupKm: 0,
          fairDispatchQueueRank: 1,
          totalCandidatesInRadius: 0,
          estMinutes: order.estMinutes,
          baseFare: order.fare,
          tips: 0,
          netFare: order.netFare,
          platformFee: 2,
          xpReward: 0,
          specialBadges: ['งานจริงจาก Dispatch Engine', order.dispatchMode === 'preferred' ? 'ลูกค้าเลือกคุณเป็นลำดับแรก' : 'จับคู่จากระยะ GPS และเงื่อนไขบริการ'],
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
  }, [isOnDuty, audioEnabled, activeVehicle, lastDeclinedJobId]);

  useEffect(() => {
    if (!isOnDuty) {
      setActiveIncomingJob(null);
      setCountdownSeconds(30);
    }
  }, [isOnDuty]);

  // Real online presence and GPS heartbeat used by the server-side proximity dispatcher.
  useEffect(() => {
    let cancelled = false;
    const publish = async () => {
      try {
        if (isOnDuty && !gpsState.isRealGps) return;
        await updateDriverPresence({
          isOnline: isOnDuty,
          ...(isOnDuty ? { latitude: presenceLatitude, longitude: presenceLongitude } : {}),
          activeVehicleId: activeVehicle?.id,
        });
        if (!cancelled) setDispatchError('');
      } catch (error) {
        const reason = error instanceof Error ? error.message : '';
        const message = reason.includes('401') ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
          : reason.includes('403') ? 'บัญชีพี่วินยังไม่ได้รับสิทธิ์รับงานหรือ KYC ยังไม่ผ่าน'
          : reason.includes('Real GPS') || reason.includes('400') ? 'ยังไม่ได้รับตำแหน่ง GPS จริง กรุณาเปิด Location และอนุญาตตำแหน่งแม่นยำ'
          : reason.includes('503') ? 'เซิร์ฟเวอร์ Dispatch หรือ Firebase Admin ยังเชื่อมต่อไม่ได้'
          : isOnDuty ? 'ส่งสถานะออนไลน์ไปยัง Dispatch ไม่สำเร็จ กรุณาลองใหม่' : 'เปลี่ยนสถานะออฟไลน์ไม่สำเร็จ';
        if (!cancelled) setDispatchError(message);
      }
    };
    void publish();
    if (!isOnDuty || !gpsState.isRealGps) return () => { cancelled = true; };
    const timer = window.setInterval(publish, 30_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isOnDuty, gpsState.isRealGps, presenceLatitude, presenceLongitude, activeVehicle?.id]);

  // Backend polling keeps dispatch visible across devices/instances.
  useEffect(() => {
    if (!isOnDuty || activeIncomingJob || currentActiveTrip) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const orders = await fetchAvailableOrdersForDriver();
        if (cancelled) return;
        const pending = orders.find((order) => order.status === 'pending' && order.id !== lastDeclinedJobId);
        if (!pending) return;
        const incomingJob: IncomingJobData = {
          id: pending.id,
          serviceId: (pending.serviceId as any) || 'knight',
          serviceTitle: pending.serviceTitle,
          serviceIconEmoji: pending.serviceIconEmoji || '🛵',
          customerName: pending.passengerName,
          customerPhone: pending.passengerPhone,
          customerAvatarEmoji: '👤',
          customerRating: 0,
          customerNote: pending.pickupLocation,
          pickupLocation: pending.pickupLocation,
          dropoffLocation: pending.dropoffLocation,
          distanceKm: pending.distanceKm,
          driverDistanceToPickupKm: 0,
          fairDispatchQueueRank: 1,
          totalCandidatesInRadius: 0,
          estMinutes: pending.estMinutes,
          baseFare: pending.fare,
          tips: pending.tips || 0,
          netFare: pending.netFare,
          platformFee: pending.platformFee || 0,
          xpReward: 0,
          vehicleRequested: activeVehicle?.name,
          urgency: 'normal'
        };
        setActiveIncomingJob(incomingJob);
        setCountdownSeconds(30);
      } catch (err) {
        console.warn('Driver dispatch refresh failed:', err);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isOnDuty, activeIncomingJob, currentActiveTrip, activeVehicle, lastDeclinedJobId]);

  // Recover an assigned trip after refresh or switching devices/tabs.
  useEffect(() => {
    if (!isOnDuty || currentActiveTrip) return;
    let cancelled = false;
    const recover = async () => {
      try {
        const userId = getAuth().currentUser?.uid;
        const orders = await fetchMyOrders();
        let active = orders.find((order) => order.driverUserId === userId && ['accepted', 'heading_pickup', 'picked_up', 'in_transit'].includes(order.status));
        if (!active || cancelled) return;
        if (active.status === 'accepted') active = await advanceLiveOrderStep(active.id, 'heading_pickup') || active;
        const job: IncomingJobData = {
          id: active.id, serviceId: active.serviceId as IncomingJobData['serviceId'], serviceTitle: active.serviceTitle, serviceIconEmoji: active.serviceIconEmoji,
          customerName: active.passengerName, customerPhone: active.passengerPhone, customerAvatarEmoji: active.passengerAvatarEmoji || '👤', customerRating: 0,
          pickupLocation: active.pickupLocation, dropoffLocation: active.dropoffLocation, pickupCoord: active.pickupCoord, dropoffCoord: active.dropoffCoord,
          distanceKm: active.distanceKm, driverDistanceToPickupKm: 0, fairDispatchQueueRank: 1, totalCandidatesInRadius: 0,
          estMinutes: active.estMinutes, baseFare: active.fare, tips: active.tipAmount || 0, netFare: active.netFare, platformFee: active.welfareFund2Baht,
          xpReward: 0, vehicleRequested: active.driverVehicle || activeVehicle?.name, urgency: 'normal',
        };
        setCurrentActiveTrip(job);
        setTripStep(active.status === 'picked_up' ? 'picked_up' : active.status === 'in_transit' ? 'navigating' : 'heading_pickup');
      } catch (error) {
        console.warn('Unable to recover active trip:', error);
      }
    };
    void recover();
    const timer = window.setInterval(recover, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isOnDuty, currentActiveTrip, activeVehicle]);

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
          void declineLiveOrder(activeIncomingJob.id).catch((error) => console.warn('Dispatch timeout handoff failed:', error));
          setLastDeclinedJobId(activeIncomingJob.id);
          setActiveIncomingJob(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeIncomingJob, audioEnabled]);

  // Production mode: jobs are created only by real passenger orders.
  const handleConfirmAccept = async () => {
    if (!activeIncomingJob) return;
    const job = activeIncomingJob;
    setDispatchActionPending(true); setDispatchError('');
    try {
      const userSession = getCurrentUserSession();
      const accepted = await acceptLiveOrder(job.id, {
        driverUserId: userSession?.id, driverName: userSession?.name || '', driverLevel: userSession?.level || driverLevel || 1,
        driverPlate: userSession?.plateNumber || '', driverAvatarEmoji: userSession?.avatarEmoji || '🛵', driverVehicle: activeVehicle?.name || ''
      });
      if (!accepted) throw new Error('INVALID_ACCEPT_RESPONSE');
      await advanceLiveOrderStep(job.id, 'heading_pickup');
      if (audioEnabled) playEngineRev();
      confetti({ particleCount: 70, spread: 80, colors: ['#00D2FF', '#FFD700', '#10B981'] });
      setCurrentActiveTrip(job); setTripStep('heading_pickup'); setActiveIncomingJob(null); onAcceptJob(job);
    } catch (error) {
      console.error('Accept dispatch failed:', error);
      setDispatchError('รับงานไม่สำเร็จ งานอาจหมดเวลาหรือถูกส่งต่อแล้ว กรุณารอรายการถัดไป');
      setActiveIncomingJob(null);
    } finally { setDispatchActionPending(false); }
  };

  const handleDeclineJob = async () => {
    if (!activeIncomingJob) return;
    if (audioEnabled) playTactileBlip(600);
    const id = activeIncomingJob.id;
    setDispatchActionPending(true); setDispatchError('');
    try {
      await declineLiveOrder(id);
      setLastDeclinedJobId(id); setActiveIncomingJob(null);
    } catch (error) {
      console.error('Decline dispatch failed:', error);
      setDispatchError('ส่งต่องานไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally { setDispatchActionPending(false); }
  };

  const handleAdvanceTripStep = async () => {
    if (!currentActiveTrip) return;
    setDispatchActionPending(true); setDispatchError('');
    try {
      if (tripStep === 'heading_pickup') {
        await advanceLiveOrderStep(currentActiveTrip.id, 'picked_up');
        if (audioEnabled) playTactileBlip(1000);
        setTripStep('picked_up');
      } else if (tripStep === 'picked_up') {
        await advanceLiveOrderStep(currentActiveTrip.id, 'in_transit');
        if (audioEnabled) playEngineRev();
        setTripStep('navigating');
      } else if (tripStep === 'navigating') {
        await advanceLiveOrderStep(currentActiveTrip.id, 'completed');
      // Complete Trip!
      if (audioEnabled) playLevelUpFanfare();
      confetti({
        particleCount: 100,
        spread: 90,
        colors: ['#00D2FF', '#FFD700', '#10B981', '#FFFFFF']
      });

      onAddEarnings(currentActiveTrip.netFare);
      onGainXp(currentActiveTrip.xpReward, `ส่งงานสำเร็จ: ${currentActiveTrip.serviceTitle}`);

      const receiptOrder: LiveRideOrder = {
        id: currentActiveTrip.id,
        serviceId: currentActiveTrip.serviceId,
        serviceTitle: currentActiveTrip.serviceTitle,
        serviceIconEmoji: currentActiveTrip.serviceIconEmoji,
        passengerName: currentActiveTrip.customerName,
        passengerPhone: currentActiveTrip.customerPhone || '',
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
        driverName: getCurrentUserSession()?.name || '',
        driverLevel: driverLevel || 1,
        driverPlate: getCurrentUserSession()?.plateNumber || '',
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
    } catch (error) {
      console.error('Trip transition failed:', error);
      setDispatchError('อัปเดตขั้นตอนการเดินทางไม่สำเร็จ สถานะเดิมยังคงอยู่ กรุณาลองอีกครั้ง');
    } finally { setDispatchActionPending(false); }
  };

  const formatOnlineTime = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs.toString().padStart(2, '0')} ชม. ${m.toString().padStart(2, '0')} นาที`;
  };

  return (
    <div className="space-y-4">
      {dispatchError && (
        <div role="alert" className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-200">
          {dispatchError}
        </div>
      )}
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase flex items-center gap-1.5 ${
                  isOnDuty
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-800 text-slate-400 border border-white/10'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  {isOnDuty ? 'พร้อมรับงาน (ON DUTY - RADAR ACTIVE)' : 'พักชั่วคราว (OFF DUTY)'}
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-[#06C755]/20 text-emerald-300 border border-[#06C755]/40 text-[10px] font-mono flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-[#06C755]" />
                  <span>LINE แจ้งเตือน: เชื่อมต่อแล้ว</span>
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
                setNavModalInitialMode('3d_map');
                setShowNavigationMapModal(true);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white font-bold text-xs font-mono shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center gap-1.5 transition-all"
            >
              <Navigation className="w-4 h-4 text-white" />
              <span>🗺️ แผนที่ 3D (ROUTE HUD)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(950);
                setNavModalInitialMode('live_camera_ar');
                setShowNavigationMapModal(true);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600 hover:brightness-110 text-slate-950 font-black text-xs font-mono shadow-[0_0_20px_#00D2FF] flex items-center gap-1.5 transition-all border border-cyan-300 active:scale-95 animate-pulse"
            >
              <Video className="w-4 h-4 text-slate-950" />
              <span>📹 กล้องสด AR (ซ้อนลูกศร 3D)</span>
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

            {/* Real-time Order Dispatch Status */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0B254E] via-[#081B3B] to-[#051126] border border-cyan-500/30 shadow-lg space-y-2 font-mono">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    <Globe className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>ระบบเชื่อมต่อสัญญาณเรียกงานจริง (Live Dispatch Active)</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </h4>
                    <p className="text-[10px] text-cyan-200/80">
                      พร้อมรับงานจริงจากผู้โดยสารผ่านระบบคลาวด์ Firestore แบบเรียลไทม์
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    รอรับงานอัตโนมัติ
                  </span>
                </div>
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
              initialNavMode={navModalInitialMode}
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

              {/* Google Maps Real Route Link & LINE Actions */}
              <div className="space-y-2">
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

                {/* LINE DIRECT ACTION BUTTONS FOR JOB */}
                <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[#06C755]/10 border border-[#06C755]/40 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(850);
                      sendJobToLine({
                        id: activeIncomingJob.id,
                        serviceTitle: activeIncomingJob.serviceTitle,
                        pickupLocation: activeIncomingJob.pickupLocation,
                        dropoffLocation: activeIncomingJob.dropoffLocation,
                        fare: activeIncomingJob.netFare,
                        passengerName: activeIncomingJob.customerName,
                        passengerPhone: activeIncomingJob.customerPhone,
                        distanceKm: activeIncomingJob.distanceKm,
                        estMinutes: activeIncomingJob.estMinutes,
                        googleMapsUrl: activeIncomingJob.googleMapsUrl || getGoogleMapsNavigationUrl(activeIncomingJob.pickupLocation, activeIncomingJob.dropoffLocation, activeIncomingJob.dropoffCoord)
                      });
                    }}
                    className="p-2 rounded-lg bg-[#06C755] hover:brightness-110 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                    title="ส่งรายละเอียดงานนี้เข้าแชทหรือกลุ่ม LINE ของคุณ"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-slate-950" />
                    <span>แชร์งานเข้า LINE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(850);
                      chatWithPassengerOnLine(activeIncomingJob.customerName);
                    }}
                    className="p-2 rounded-lg bg-black/60 hover:bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/50 font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    title="เปิด LINE เพื่อทักคุยกับผู้โดยสารโดยตรง"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#06C755]" />
                    <span>ติดต่อผ่าน LINE</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons: Big Accept Button & Decline */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDeclineJob}
                disabled={dispatchActionPending}
                className="w-1/3 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-bold text-xs font-mono transition-all"
              >
                ปฏิเสธ (ส่งต่อ)
              </button>

              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={dispatchActionPending}
                className="w-2/3 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-[#00D2FF] to-blue-500 hover:brightness-110 text-slate-950 font-black text-sm font-mono shadow-[0_0_30px_rgba(0,210,255,0.6)] flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse"
              >
                <CheckCircle2 className="w-5 h-5 text-slate-950" />
                <span>{dispatchActionPending ? 'กำลังยืนยันกับระบบ…' : `กดรับงานทันที (฿${activeIncomingJob.netFare})`}</span>
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
