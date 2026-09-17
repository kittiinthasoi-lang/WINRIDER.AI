import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Power, 
  Award, 
  Zap, 
  Wallet, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Navigation, 
  ShieldAlert, 
  User, 
  Flame, 
  ArrowRight,
  Sparkles,
  Phone,
  Check,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Shield,
  Layers
} from 'lucide-react';
import { globalFeeEngine, FeeBreakdown } from '../core/feeEngine';
import { globalLedgerEngine } from '../core/ledger';
import { TripModel, TripStateMachine } from '../core/tripStateMachine';
import { defaultNotifyProvider } from '../adapters/defaultProviders';
import { KnightWalletView } from './KnightWalletView';

interface KnightDashboardViewProps {
  userName?: string;
  onLogout?: () => void;
  onSwitchRole?: () => void;
}

export const KnightDashboardView: React.FC<KnightDashboardViewProps> = ({
  userName = 'อัศวินกล้าหาญ',
  onLogout,
  onSwitchRole
}) => {
  // Knight State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'home' | 'missions' | 'wallet' | 'armor' | 'profile'>('home');
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(180);
  const xpToNextLevel = 500;
  const [todayMissionsCount, setTodayMissionsCount] = useState<number>(4);
  const [walletBalance, setWalletBalance] = useState<number>(globalLedgerEngine.getWallet().balance);

  // Incoming Mission & Countdown
  const [incomingMission, setIncomingMission] = useState<{
    id: string;
    pillar: string;
    pillarName: string;
    citizenName: string;
    pickupLocation: string;
    dropoffLocation: string;
    distanceKm: number;
    fare: number;
    feeCalc: FeeBreakdown;
  } | null>(null);

  const [countdown, setCountdown] = useState<number>(15);
  const [activeTrip, setActiveTrip] = useState<TripModel | null>(null);

  // Periodic incoming mission simulation when online
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOnline && !incomingMission && !activeTrip) {
      timer = setTimeout(() => {
        const baseFare = 45;
        const feeCalc = globalFeeEngine.calculateTripFees(baseFare, 'WIN_KNIGHT');

        setIncomingMission({
          id: `TRIP-${Date.now().toString().slice(-4)}`,
          pillar: 'WIN_KNIGHT',
          pillarName: 'WIN KNIGHT (รับส่งด่วนประจำจุด)',
          citizenName: 'คุณกิตติ (พลเมืองอัศวิน)',
          pickupLocation: 'สถานีรถไฟฟ้า BTS สยาม ประตู 3',
          dropoffLocation: 'อาคารสามย่านมิตรทาวน์ ถนนพระราม 4',
          distanceKm: 2.1,
          fare: baseFare,
          feeCalc
        });
        setCountdown(15);
        defaultNotifyProvider.playAlertSound('mission_incoming');
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [isOnline, incomingMission, activeTrip]);

  // Countdown timer effect
  useEffect(() => {
    if (!incomingMission) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIncomingMission(null); // Timeout reject
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingMission]);

  // Accept Mission
  const handleAcceptMission = () => {
    if (!incomingMission) return;
    defaultNotifyProvider.playAlertSound('mission_accepted');

    const newTrip = TripStateMachine.createNewTrip({
      id: incomingMission.id,
      pillar: 'WIN_KNIGHT',
      citizenId: 'CITIZEN-DEMO-01',
      citizenName: incomingMission.citizenName,
      citizenPhone: '089-999-8888',
      knightId: 'KNT-SOVEREIGN-01',
      knightName: userName,
      originName: incomingMission.pickupLocation,
      destinationName: incomingMission.dropoffLocation,
      distanceKm: incomingMission.distanceKm,
      fare: incomingMission.fare,
      feeBreakdown: {
        baseFare: incomingMission.feeCalc.baseFare,
        platformFee: incomingMission.feeCalc.citizenPlatformFee,
        knightNet: incomingMission.feeCalc.knightNetEarnings,
        deductionsTotal: incomingMission.feeCalc.knightDeductions.totalDeduction
      },
      proofPhotos: {}
    });

    // Move to ACCEPTED
    const acceptedTrip = TripStateMachine.transition(
      newTrip, 
      'ACCEPTED', 
      'KNT-SOVEREIGN-01', 
      'knight', 
      'อัศวินกดรับภารกิจ'
    );

    setActiveTrip(acceptedTrip);
    setIncomingMission(null);
  };

  const handleAdvanceTripState = () => {
    if (!activeTrip) return;
    try {
      if (activeTrip.status === 'ACCEPTED') {
        const next = TripStateMachine.transition(activeTrip, 'ARRIVED', 'KNT-01', 'knight', 'อัศวินถึงจุดรับผู้โดยสาร');
        setActiveTrip(next);
      } else if (activeTrip.status === 'ARRIVED') {
        const next = TripStateMachine.transition(activeTrip, 'IN_PROGRESS', 'KNT-01', 'knight', 'เริ่มออกเดินทาง');
        setActiveTrip(next);
      } else if (activeTrip.status === 'IN_PROGRESS') {
        const next = TripStateMachine.transition(activeTrip, 'COMPLETED', 'KNT-01', 'knight', 'ส่งถึงปลายทางสำเร็จ');
        
        // Post Double-Entry Ledger
        const settlement = globalLedgerEngine.postTripSettlement({
          tripId: next.id,
          grossFare: next.fare,
          systemFee: 2.0,
          insuranceFee: 1.0,
          pensionFee: 1.0,
          equipmentFee: 1.0
        });

        setWalletBalance(settlement.wallet.balance);
        setTodayMissionsCount((prev) => prev + 1);
        setXp((prev) => prev + 60);
        defaultNotifyProvider.playAlertSound('success');
        setActiveTrip(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const progressPercent = Math.min(100, Math.round((xp / xpToNextLevel) * 100));

  return (
    <div className="min-h-screen bg-[#0A1633] text-white flex flex-col font-thai max-w-md mx-auto relative overflow-x-hidden">
      {/* Top Header */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-[#00D4FF]/20 bg-[#0A1633]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#00D4FF]/20 border border-[#00D4FF] flex items-center justify-center text-[#00D4FF] font-black text-xs">
            W
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
              {userName}
              {/* Level Badge with 3% Gold rule */}
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#FFC93C] text-[#0A1633] font-black glow-gold-badge">
                Lv.{level}
              </span>
            </h1>
            <span className="text-[10px] text-gray-400">อัศวินไรเดอร์ประจำจุด</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchRole && (
            <button
              onClick={onSwitchRole}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition"
            >
              สลับบทบาท
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area Based on Active Tab */}
      <main className="flex-1 px-4 py-3 space-y-4 pb-24 overflow-y-auto">
        {activeTab === 'home' && (
          <>
            {/* 1. Giant Online / Offline Switch */}
            <div className="relative p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-gray-400">สถานะรับภารกิจ</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-[#00D4FF] animate-ping' : 'bg-gray-600'}`} />
                  <h3 className="text-base font-bold text-white">
                    {isOnline ? 'พร้อมรับภารกิจ (ONLINE)' : 'พักรบชั่วคราว (OFFLINE)'}
                  </h3>
                </div>
                <p className="text-[10px] text-gray-400">
                  {isOnline ? 'ระบบ AI กำลังค้นหาภารกิจในรัศมี 3 กม.' : 'กดสวิตช์เพื่อเริ่มรับงาน'}
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => {
                  setIsOnline(!isOnline);
                  if (incomingMission) setIncomingMission(null);
                }}
                className={`relative w-20 h-11 rounded-full transition-all duration-300 p-1 flex items-center ${
                  isOnline 
                    ? 'bg-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.6)] justify-end' 
                    : 'bg-gray-700 justify-start'
                }`}
              >
                <motion.div 
                  layout
                  className="w-9 h-9 rounded-full bg-[#0A1633] flex items-center justify-center text-white shadow-md"
                >
                  <Power className={`w-5 h-5 ${isOnline ? 'text-[#00D4FF]' : 'text-gray-400'}`} />
                </motion.div>
              </button>
            </div>

            {/* 2. Knight Level & Stats Card */}
            <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/25 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Gold Level Badge (3% Gold rule) */}
                  <div className="px-2 py-1 rounded-xl bg-[#FFC93C]/15 border border-[#FFC93C] text-[#FFC93C] text-xs font-black flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>LEVEL {level}</span>
                  </div>
                  <span className="text-xs text-gray-300">อัศวินระดับเริ่มต้น</span>
                </div>
                <span className="text-[11px] font-mono text-[#00D4FF]">
                  {xp} / {xpToNextLevel} XP
                </span>
              </div>

              {/* XP Progress Bar */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00D4FF] to-[#38E1FF] rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div 
                  onClick={() => setActiveTab('wallet')}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-[#00D4FF]/40 transition"
                >
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-[#00D4FF]" />
                    กระเป๋าอัศวิน (ทอง)
                  </span>
                  <div className="text-base font-black text-[#FFC93C] font-mono mt-0.5">
                    ฿{walletBalance.toFixed(2)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ภารกิจสำเร็จวันนี้
                  </span>
                  <div className="text-base font-black text-white font-mono mt-0.5">
                    {todayMissionsCount} ภารกิจ
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Active Trip Progress (if any) */}
            {activeTrip && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-[#0A1633] border-2 border-[#00D4FF] shadow-[0_0_25px_rgba(0,212,255,0.35)] space-y-3"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-ping" />
                    <h4 className="text-xs font-bold text-white">ภารกิจที่กำลังปฏิบัติ</h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] font-mono font-bold">
                    {activeTrip.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#00D4FF] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-gray-400 block">จุดรับ</span>
                      <strong className="text-white text-xs">{activeTrip.originName}</strong>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <Navigation className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-gray-400 block">จุดส่ง</span>
                      <strong className="text-white text-xs">{activeTrip.destinationName}</strong>
                    </div>
                  </div>
                </div>

                {/* State Advance Button */}
                <button
                  onClick={handleAdvanceTripState}
                  className="w-full py-3 px-4 rounded-xl bg-[#00D4FF] text-[#0A1633] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#38E1FF] transition shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                >
                  {activeTrip.status === 'ACCEPTED' && 'กดเมื่อถึงจุดรับ (ARRIVED)'}
                  {activeTrip.status === 'ARRIVED' && 'รับผู้โดยสารแล้ว ออกเดินทาง (IN_PROGRESS)'}
                  {activeTrip.status === 'IN_PROGRESS' && 'ส่งถึงปลายทาง สำเร็จภารกิจ (COMPLETED)'}
                </button>
              </motion.div>
            )}

            {/* 4. Incoming Mission Card with 15-second Countdown */}
            <AnimatePresence>
              {incomingMission && !activeTrip && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative p-4 rounded-2xl bg-[#0A1633] border-2 border-[#00D4FF] shadow-[0_0_35px_rgba(0,212,255,0.4)] space-y-3 ring-1 ring-[#00D4FF]"
                >
                  {/* Top Bar with Countdown */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#00D4FF] animate-bounce" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {incomingMission.pillarName}
                      </span>
                    </div>

                    {/* 15s Countdown Ring */}
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40 text-xs font-mono font-bold animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{countdown}s</span>
                    </div>
                  </div>

                  {/* Route & Distance */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-300">
                      <span>ผู้โดยสาร: <strong className="text-white">{incomingMission.citizenName}</strong></span>
                      <span className="text-[#00D4FF] font-mono font-bold">{incomingMission.distanceKm} กม.</span>
                    </div>
                    <div className="text-[11px] text-gray-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <span className="w-2 h-2 rounded-full bg-[#00D4FF]" />
                        <span className="line-clamp-1">{incomingMission.pickupLocation}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="line-clamp-1">{incomingMission.dropoffLocation}</span>
                      </div>
                    </div>
                  </div>

                  {/* 100% Transparent Fee Breakdown (Strict Rule 1: from fee_rules) */}
                  <div className="p-3 rounded-xl bg-[#0A1633] border border-[#00D4FF]/30 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-gray-300">
                      <span>ค่าโดยสารตามระยะทาง:</span>
                      <strong className="text-white font-mono">฿{incomingMission.fare.toFixed(2)}</strong>
                    </div>

                    {/* Transparent Deductions */}
                    <div className="text-[10px] space-y-1 border-y border-white/10 py-1.5 text-gray-400">
                      <div className="flex justify-between">
                        <span>• ค่าระบบปฏิบัติการ WINRIDER:</span>
                        <span className="font-mono text-gray-300">-฿{incomingMission.feeCalc.knightDeductions.system.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• กองทุนคุ้มครองอุบัติเหตุ:</span>
                        <span className="font-mono text-emerald-400">-฿{incomingMission.feeCalc.knightDeductions.insurance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• เงินออมเพื่ออนาคตอัศวิน:</span>
                        <span className="font-mono text-[#FFC93C]">-฿{incomingMission.feeCalc.knightDeductions.pension.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• ผ่อนอุปกรณ์ชุดเกราะ:</span>
                        <span className="font-mono text-cyan-300">-฿{incomingMission.feeCalc.knightDeductions.equipment.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-white text-xs">รายได้สุทธิเข้ากระเป๋า:</span>
                      <span className="text-base font-black text-[#FFC93C] font-mono">
                        ฿{incomingMission.feeCalc.knightNetEarnings.toFixed(2)} บาท
                      </span>
                    </div>
                  </div>

                  {/* Accept / Reject Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setIncomingMission(null)}
                      className="flex-1 py-3 px-3 rounded-xl bg-white/5 border border-white/15 text-gray-400 text-xs font-bold hover:bg-white/10 transition"
                    >
                      ปฏิเสธ
                    </button>
                    <button
                      onClick={handleAcceptMission}
                      className="flex-[2] py-3 px-3 rounded-xl bg-[#00D4FF] text-[#0A1633] text-xs font-black flex items-center justify-center gap-1.5 hover:bg-[#38E1FF] transition shadow-[0_0_20px_rgba(0,212,255,0.45)] active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      <span>รับภารกิจ ({countdown}s)</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Tab 2: Missions Feed */}
        {activeTab === 'missions' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              ประวัติและคิวภารกิจวันนี้
            </h3>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/20 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-white">ภารกิจ #{1020 + i} - BTS หมอชิต</h5>
                    <span className="text-[10px] text-gray-400">เสร็จสิ้นเมื่อ {i * 45} นาทีที่แล้ว</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[#FFC93C] font-mono block">+฿40.00</span>
                    <span className="text-[9px] text-emerald-400">สำเร็จแล้ว</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Wallet View (กระเป๋าอัศวิน) */}
        {activeTab === 'wallet' && <KnightWalletView />}

        {/* Tab 4: Armor (ชุดเกราะ) */}
        {activeTab === 'armor' && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/25">
              <h3 className="text-sm font-bold text-white mb-1">ชุดเกราะ & อุปกรณ์ประจำกายอัศวิน</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                หมวกนิรภัยอัจฉริยะ เสื้อกั๊กสะท้อนแสงมาตรฐานสากล และกล่องบรรทุกสัมภาระกันสะเทือน
              </p>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>สถานะการผ่อนชำระ:</span>
                  <strong className="text-[#00D4FF] font-mono">1,420 / 3,600 บาท</strong>
                </div>
                <div className="flex justify-between">
                  <span>การรับรองอุปกรณ์:</span>
                  <span className="text-emerald-400 font-semibold">ผ่านการตรวจสอบความปลอดภัย</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/25 text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-[#00D4FF]/20 border border-[#00D4FF] text-[#00D4FF] flex items-center justify-center mx-auto text-xl font-bold">
                {userName.charAt(0)}
              </div>
              <h3 className="text-sm font-bold text-white">{userName}</h3>
              <p className="text-xs text-gray-400 font-mono">ID: KNT-SOVEREIGN-01</p>

              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold hover:bg-red-500/20 transition"
                  >
                    ออกจากระบบ
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5 Bottom Nav Menus (Strict Requirement) */}
      {/* หน้าหลัก / ภารกิจ / กระเป๋า / ชุดเกราะ / โปรไฟล์ */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0A1633]/95 backdrop-blur-md border-t border-[#00D4FF]/20 py-2 px-3 flex items-center justify-around z-40">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 text-[10px] transition ${
            activeTab === 'home' ? 'text-[#00D4FF] font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span>หน้าหลัก</span>
        </button>

        <button
          onClick={() => setActiveTab('missions')}
          className={`flex flex-col items-center gap-1 text-[10px] transition ${
            activeTab === 'missions' ? 'text-[#00D4FF] font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span>ภารกิจ</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center gap-1 text-[10px] transition ${
            activeTab === 'wallet' ? 'text-[#00D4FF] font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span>กระเป๋า</span>
        </button>

        <button
          onClick={() => setActiveTab('armor')}
          className={`flex flex-col items-center gap-1 text-[10px] transition ${
            activeTab === 'armor' ? 'text-[#00D4FF] font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>ชุดเกราะ</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 text-[10px] transition ${
            activeTab === 'profile' ? 'text-[#00D4FF] font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span>โปรไฟล์</span>
        </button>
      </nav>
    </div>
  );
};
