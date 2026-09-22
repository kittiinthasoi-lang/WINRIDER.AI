import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Bike, 
  Package, 
  Dog, 
  Sparkles, 
  ShoppingBag, 
  HeartHandshake, 
  GraduationCap, 
  Train, 
  MapPin, 
  Navigation, 
  Search, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  UserCheck,
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { defaultMapProvider, defaultNotifyProvider } from '../adapters/defaultProviders';
import { globalFeeEngine, FeeBreakdown } from '../core/feeEngine';
import { calculateBaseFareBaht } from '../core/serverFare';
import { TripStateMachine, TripModel } from '../core/tripStateMachine';

interface CitizenDashboardViewProps {
  userName?: string;
  onSwitchRole?: () => void;
}

export const CitizenDashboardView: React.FC<CitizenDashboardViewProps> = ({
  userName = 'ผู้ใช้ WINRIDER.AI',
  onSwitchRole
}) => {
  const [selectedPillar, setSelectedPillar] = useState<string>('WIN_KNIGHT');
  const [pickupText, setPickupText] = useState<string>('');
  const [dropoffText, setDropoffText] = useState<string>('');
  const [estimatedDistance, setEstimatedDistance] = useState<number>(0);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown>(
    globalFeeEngine.calculateTripFees(0, 'WIN_KNIGHT')
  );

  const [isSearchingKnight, setIsSearchingKnight] = useState<boolean>(false);
  const [activeTrip, setActiveTrip] = useState<TripModel | null>(null);

  // 8 Pillars definition
  const pillars = [
    { id: 'WIN_KNIGHT', name: 'WIN KNIGHT', subtitle: 'เดินทางด่วน', icon: Bike, desc: 'รับส่งด่วนสองล้อคู่เมือง' },
    { id: 'WIN_EXPRESS', name: 'WIN EXPRESS', subtitle: 'ส่งพัสดุด่วน', icon: Package, desc: 'ส่งเอกสารและสิ่งของถึงมือทันที' },
    { id: 'WIN_PETCARE', name: 'WIN PETCARE', subtitle: 'ส่งสัตว์เลี้ยง', icon: Dog, desc: 'อัศวินที่ผ่านการอบรมดูแลสัตว์เลี้ยง' },
    { id: 'WIN_MU_BUDDY', name: 'WIN MU BUDDY', subtitle: 'เพื่อนสายมู', icon: Sparkles, desc: 'นำไหว้พระ ไหว้สิ่งศักดิ์สิทธิ์รอบกรุง' },
    { id: 'WIN_LIFESTYLE', name: 'WIN LIFESTYLE', subtitle: 'รับหิ้ว/ซื้อของ', icon: ShoppingBag, desc: 'ฝากซื้อของตลาด อาหาร ชำระบิล' },
    { id: 'WIN_SPIRIT', name: 'WIN SPIRIT', subtitle: 'พาผู้สูงวัย', icon: HeartHandshake, desc: 'ดูแลพาทำบุญ ไปโรงพยาบาล อบอุ่นปลอดภัย' },
    { id: 'WIN_FAMILY', name: 'WIN FAMILY', subtitle: 'รับส่งลูกหลาน', icon: GraduationCap, desc: 'รับส่งนักเรียนไป-กลับโรงเรียน ปลอดภัยสูงสุด' },
    { id: 'WIN_LINK', name: 'WIN LINK', subtitle: 'เชื่อมต่อขนส่ง', icon: Train, desc: 'เชื่อมต่อสถานีรถไฟฟ้า BTS/MRT และท่าเรือ' }
  ];

  // Recalculate fees only after a real route distance is available
  useEffect(() => {
    const baseFare = calculateBaseFareBaht(estimatedDistance);
    const calc = globalFeeEngine.calculateTripFees(baseFare, selectedPillar);
    setFeeBreakdown(calc);
  }, [selectedPillar, estimatedDistance]);

  const handleRequestTrip = () => {
    if (!pickupText.trim() || !dropoffText.trim() || estimatedDistance <= 0) return;
    setIsSearchingKnight(true);
    defaultNotifyProvider.playAlertSound('mission_incoming');

    setTimeout(() => {
      setIsSearchingKnight(false);
      const newTrip = TripStateMachine.createNewTrip({
        id: `TRIP-CTZ-${Date.now().toString().slice(-4)}`,
        pillar: selectedPillar as TripModel['pillar'],
        citizenId: '',
        citizenName: userName,
        citizenPhone: '',
        knightId: '',
        knightName: 'รอการจับคู่พี่วินที่ผ่านการยืนยัน',
        originName: pickupText,
        destinationName: dropoffText,
        distanceKm: estimatedDistance,
        fare: feeBreakdown.citizenTotalFare,
        feeBreakdown: {
          baseFare: feeBreakdown.baseFare,
          platformFee: feeBreakdown.citizenPlatformFee,
          knightNet: feeBreakdown.knightNetEarnings,
          deductionsTotal: feeBreakdown.knightDeductions.totalDeduction
        },
        proofPhotos: {}
      });

      setActiveTrip(newTrip);
      defaultNotifyProvider.playAlertSound('mission_incoming');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#0A1633] text-white flex flex-col font-thai max-w-md mx-auto pb-20">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-[#00D4FF]/20 bg-[#0A1633]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#00D4FF]/20 border border-[#00D4FF] flex items-center justify-center text-[#00D4FF] font-bold text-xs">
            W
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              {userName}
            </h1>
            <span className="text-[10px] text-gray-400">พลเมืองอัศวิน</span>
          </div>
        </div>

        {onSwitchRole && (
          <button
            onClick={onSwitchRole}
            className="text-[11px] px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition"
          >
            สลับบทบาท
          </button>
        )}
      </header>

      <main className="p-4 space-y-4">
        {/* Map View Container with Real-Time Knights Nearby */}
        <div className="relative h-44 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/30 overflow-hidden shadow-inner flex flex-col justify-between p-3">
          {/* Visual map shell — no simulated driver positions */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#00D4FF_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0A1633]/90 border border-[#00D4FF]/40 text-[#00D4FF] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-ping" />
              พี่วินที่ผ่านการยืนยันจากแอดมิน
            </span>
            <span className="text-[10px] text-gray-400 bg-black/40 px-2 py-0.5 rounded-md font-mono">
              GPS Active
            </span>
          </div>

          {/* Real verified drivers only: positions are supplied by the live dispatch/map layer. */}
          <div className="relative z-10 flex items-center justify-center py-5 text-center">
            <span className="text-xs text-gray-400">ระบบจะแสดงพี่วินที่ผ่านการยืนยันจากแอดมินและมีตำแหน่งจริง เมื่อมีข้อมูลออนไลน์</span>
          </div>

          <div className="relative z-10 text-[10px] text-gray-400 flex items-center justify-between">
            <span>รอพิกัด GPS จริงจากอุปกรณ์</span>
            <span className="text-[#00D4FF]">Sovereign Map Ready</span>
          </div>
        </div>

        {/* 8 Pillars Selection Grid (Strict Requirement) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              8 เสาหลักบริการอัศวิน
            </h3>
            <span className="text-[10px] text-[#00D4FF]">มาตรฐานความปลอดภัย</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {pillars.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPillar === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPillar(p.id)}
                  className={`p-2.5 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#00D4FF]/20 border border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.3)] ring-1 ring-[#00D4FF]'
                      : 'bg-[#0A1633] border border-[#00D4FF]/20 hover:border-[#00D4FF]/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-[#00D4FF]' : 'text-gray-400'}`} />
                  <span className="text-[10px] font-bold text-white leading-tight line-clamp-1">
                    {p.subtitle}
                  </span>
                  <span className="text-[8px] text-gray-400 line-clamp-1 mt-0.5">
                    {p.name.replace('WIN ', '')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pickup & Dropoff Form */}
        <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/25 space-y-3">
          <div>
            <label className="text-[11px] text-gray-400 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF]" />
              จุดรับผู้โดยสาร / พัสดุ
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#00D4FF] absolute left-3 top-3" />
              <input
                type="text"
                value={pickupText}
                onChange={(e) => setPickupText(e.target.value)}
                className="w-full bg-[#0A1633] border border-[#00D4FF]/25 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#00D4FF]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-gray-400 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              จุดส่งปลายทาง
            </label>
            <div className="relative">
              <Navigation className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
              <input
                type="text"
                value={dropoffText}
                onChange={(e) => setDropoffText(e.target.value)}
                className="w-full bg-[#0A1633] border border-[#00D4FF]/25 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#00D4FF]"
              />
            </div>
          </div>
        </div>

        {/* Trip Summary Card with Transparent Platform Fee (Strict Requirement: 2 THB) */}
        <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>ค่าเดินทางตามระยะทาง ({estimatedDistance} กม.):</span>
            <span className="font-mono font-bold text-white">฿{feeBreakdown.baseFare.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="flex items-center gap-1 text-[#00D4FF]">
              <ShieldCheck className="w-3.5 h-3.5" />
              ค่าบริการแพลตฟอร์มพลเมือง:
            </span>
            <span className="font-mono text-[#00D4FF] font-bold">+฿{feeBreakdown.citizenPlatformFee.toFixed(2)} บาท</span>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 block">ยอดรวมที่ต้องชำระ</span>
              <span className="text-xl font-black text-[#FFC93C] font-mono">
                ฿{feeBreakdown.citizenTotalFare.toFixed(2)} บาท
              </span>
            </div>

            {/* Request Button */}
            <button
              onClick={handleRequestTrip}
              disabled={isSearchingKnight || !!activeTrip}
              className={`py-3 px-5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                isSearchingKnight || activeTrip
                  ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                  : 'bg-[#00D4FF] text-[#0A1633] hover:bg-[#38E1FF] shadow-[0_0_20px_rgba(0,212,255,0.4)] active:scale-98'
              }`}
            >
              {isSearchingKnight ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#0A1633] border-t-transparent rounded-full animate-spin" />
                  <span>กำลังเรียกอัศวิน...</span>
                </>
              ) : activeTrip ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>อัศวินกำลังเดินทางมารับ</span>
                </>
              ) : (
                <>
                  <span>เรียกอัศวินทันที</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Trip Information Modal/Card */}
        {activeTrip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-[#0A1633] border-2 border-[#00D4FF] shadow-[0_0_25px_rgba(0,212,255,0.3)] space-y-2"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-[#00D4FF]" />
                <span className="text-xs font-bold text-white">{activeTrip.knightName}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                {activeTrip.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-300">
              กำลังเดินทางมารับที่: {activeTrip.originName}
            </p>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-gray-400">ประมาณการเวลา:</span>
              <span className="font-bold text-[#00D4FF]">3-5 นาที</span>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};
