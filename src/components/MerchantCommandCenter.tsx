import React, { useState, useMemo } from 'react';
import { FlashSaleItem } from '../types';
import { NeonProfileAvatar } from './NeonProfileAvatar';
import { SovereignTiersModal } from './SovereignTiersModal';
import { SovereignQuestCenter } from './SovereignQuestCenter';
import { WinScanAndPayModal } from './WinScanAndPayModal';
import { MerchantParcelPickupMapModal } from './MerchantParcelPickupMapModal';
import { ProfileCustomizerModal, ProfileCustomizationData } from './ProfileCustomizerModal';
import { DensityRadarOverlay } from './DensityRadarOverlay';
import { AIProductPhotoVerifier, AIVerificationResult } from './AIProductPhotoVerifier';
import { getMerchantTier, MERCHANT_10_TIERS, calculateLevelMaxXp, getLevelDifficultyMetrics } from '../data/tierHierarchyData';
import { playTactileBlip, playRadarScan } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  ShoppingBag, 
  Users, 
  Truck, 
  TrendingUp, 
  Clock, 
  Plus, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  DollarSign, 
  ArrowUpRight, 
  Store, 
  Zap,
  Activity,
  Flame,
  Award,
  ChevronRight,
  Package,
  CreditCard,
  Banknote,
  QrCode,
  Radio,
  Eye,
  Camera
} from 'lucide-react';

interface MerchantCommandCenterProps {
  audioEnabled: boolean;
  onOpenWinBuddy?: () => void;
}

export const MerchantCommandCenter: React.FC<MerchantCommandCenterProps> = ({ audioEnabled, onOpenWinBuddy }) => {
  const [knightsAvailable, setKnightsAvailable] = useState(14);
  const [merchantLevel, setMerchantLevel] = useState(75);
  const [merchantNextXp, setMerchantNextXp] = useState(() => calculateLevelMaxXp(75, 'merchant'));
  const [merchantXp, setMerchantXp] = useState(() => Math.round(calculateLevelMaxXp(75, 'merchant') * 0.58));
  const [merchantXpToast, setMerchantXpToast] = useState<string | null>(null);
  const [showTiersModal, setShowTiersModal] = useState<boolean>(false);
  const [tiersModalInitialRole, setTiersModalInitialRole] = useState<'knight' | 'citizen' | 'merchant'>('merchant');
  const [showScanAndPayModal, setShowScanAndPayModal] = useState<boolean>(false);
  const [showPickupMapModal, setShowPickupMapModal] = useState<boolean>(false);
  const [showProfileCustomizerModal, setShowProfileCustomizerModal] = useState<boolean>(false);
  const [merchantProfileData, setMerchantProfileData] = useState<ProfileCustomizationData>({
    displayName: 'ร้านออร่าเซนโก้ (Aura Zenco)',
    bioStatus: 'ของฝากงานฝีมือคุณภาพ • กาแฟสด • ส่งด่วนทันใจผ่านอัศวิน 🏪✨',
    avatarEmoji: '🏪',
    themeColor: '#FFD700',
    bannerGlow: 'from-[#0D1E3A] via-[#09152B] to-[#060D1E]'
  });

  const currentMerchantTier = useMemo(() => getMerchantTier(merchantLevel), [merchantLevel]);
  const merchantDifficultyMetrics = useMemo(() => getLevelDifficultyMetrics(merchantLevel), [merchantLevel]);

  // Merchant Financial Credit Score (คะแนนเครดิตทางการเงินร้านค้า)
  const [merchantCreditScore, setMerchantCreditScore] = useState<number>(825);
  const [workingCapitalAvailable, setWorkingCapitalAvailable] = useState<number>(250000);
  const workingCapitalLimit = 250000;

  const handleGainMerchantCredit = (points: number, reason: string) => {
    if (audioEnabled) playTactileBlip(1200);
    setMerchantCreditScore(prev => Math.min(850, prev + points));
    setMerchantXpToast(`💳 +${points} คะแนนเครดิตร้านค้า: ${reason}! (รวม: ${Math.min(850, merchantCreditScore + points)}/850)`);
    confetti({ particleCount: 45, spread: 65, colors: ['#FFD700', '#00D2FF', '#10B981'] });
    setTimeout(() => setMerchantXpToast(null), 3500);
  };

  const handleDrawWorkingCapital = (amount: number) => {
    if (workingCapitalAvailable < amount) {
      if (audioEnabled) playTactileBlip(400);
      alert(`⚠️ วงเงินหมุนเวียนคงเหลือไม่เพียงพอ (คงเหลือ ฿${workingCapitalAvailable.toLocaleString()})`);
      return;
    }
    if (audioEnabled) playRadarScan();
    setWorkingCapitalAvailable(prev => prev - amount);
    confetti({ particleCount: 50, spread: 75, colors: ['#FFD700', '#00D2FF'] });
    setMerchantXpToast(`💸 เบิกเงินทุนหมุนเวียนคู่ค้า 0% ดอกเบี้ย: ฿${amount.toLocaleString()} โอนเข้าบัญชีร้านค้าเรียบร้อย!`);
    setTimeout(() => setMerchantXpToast(null), 4000);
  };

  const handleGainMerchantXp = (amount: number, reason: string) => {
    if (audioEnabled) playTactileBlip(1100 + amount * 2);
    setMerchantXp(prev => {
      const newXp = prev + amount;
      if (newXp >= merchantNextXp) {
        const nextLvl = merchantLevel + 1;
        setMerchantLevel(nextLvl);
        const nextReq = calculateLevelMaxXp(nextLvl, 'merchant');
        setMerchantNextXp(nextReq);
        if (audioEnabled) playRadarScan();
        confetti({ particleCount: 80, spread: 90, colors: ['#FFD700', '#F59E0B', '#00D2FF'] });
        setMerchantXpToast(`👑 LEVEL UP! ร้านค้าเลื่อนขั้นเป็น Level ${nextLvl}! (หลอดถัดไป: ${nextReq.toLocaleString()} XP)`);
        return Math.max(0, newXp - merchantNextXp);
      } else {
        setMerchantXpToast(`✨ +${amount} XP: ${reason}`);
        setTimeout(() => setMerchantXpToast(null), 3500);
        return newXp;
      }
    });
  };

  const [flashSales, setFlashSales] = useState<FlashSaleItem[]>([
    {
      id: '1',
      title: 'นาฬิกาสำริดลิมิเต็ดอิดิชั่น Imperial Bronze Watch',
      price: 4500,
      originalPrice: 6200,
      timeLeft: '02:14:38',
      salesCount: 18,
      category: 'หัตถศิลป์พรีเมียม',
      imageIcon: '⌚'
    },
    {
      id: '2',
      title: 'เมล็ดกาแฟดริปพิเศษ Single Origin คั่วเข้ม (500g)',
      price: 390,
      originalPrice: 550,
      timeLeft: '04:50:12',
      salesCount: 42,
      category: 'กาแฟและอาหารเลิศรส',
      imageIcon: '☕'
    }
  ]);

  const [deliveries, setDeliveries] = useState([
    { id: '#8812', item: 'ชุดกาน้ำชาเซรามิก', destination: 'ถ.เจริญนคร ฝั่งธนบุรี', eta: '12 นาที', status: 'กำลังจัดส่ง', knight: 'อัศวิน-019 (Vespa)' },
    { id: '#8813', item: 'กล่องของขวัญน้ำผึ้งป่าเดือนห้า', destination: 'ย่านสาทร CBD', eta: '25 นาที', status: 'รับของแล้ว', knight: 'อัศวิน-088 (Wave 110i)' }
  ]);

  const [incomingCustomers, setIncomingCustomers] = useState([
    { name: 'คุณศิรินทิพย์', status: 'สมาชิกระดับ VIP', eta: '5 นาที', rideType: 'WIN KNIGHT' },
    { name: 'คุณธนกฤต', status: 'ลูกค้าประจำ', eta: 'กำลังเดินทางมา', rideType: 'WIN Lifestyle' }
  ]);

  const [showAddFlashModal, setShowAddFlashModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newOrigPrice, setNewOrigPrice] = useState('');
  const [flashAiVerified, setFlashAiVerified] = useState<AIVerificationResult | null>(null);
  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(true);

  const handleBulkPickup = () => {
    if (audioEnabled) playRadarScan();
    setShowPickupMapModal(true);
    setKnightsAvailable(prev => Math.max(prev - 3, 5));
    handleGainMerchantXp(120, "เรียกอัศวิน Knight Bulk Pickup สำเร็จ (เปิดเรดาร์แผนที่)");
    confetti({ particleCount: 35, spread: 60, colors: ['#00D2FF', '#FFD700'] });
  };

  const handleAddFlashSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice) return;
    if (!flashAiVerified) {
      alert('⚠️ กฎระเบียบความปลอดภัย: จำเป็นต้องผ่านการตรวจสอบและยืนยันรูปถ่ายสินค้าด้วย AI Vision Guard ก่อนเริ่ม Flash Sale ทุกครั้ง');
      return;
    }
    const item: FlashSaleItem = {
      id: Date.now().toString(),
      title: newTitle,
      price: parseFloat(newPrice) || 299,
      originalPrice: parseFloat(newOrigPrice) || (parseFloat(newPrice) * 1.3),
      timeLeft: '06:00:00',
      salesCount: 0,
      category: flashAiVerified.detectedCategory || 'ดีลพิเศษผ่าน AI Verify',
      imageIcon: flashAiVerified.imageIcon || '✨'
    };
    setFlashSales([...flashSales, item]);
    setNewTitle('');
    setNewPrice('');
    setNewOrigPrice('');
    setFlashAiVerified(null);
    setShowAddFlashModal(false);
    handleGainMerchantXp(200, "สร้างดีล Flash Sale ผ่านการรับรอง AI Vision Guard สำเร็จ ✨");
    if (audioEnabled) playTactileBlip(1200);
    confetti({ particleCount: 50, spread: 75, colors: ['#00D2FF', '#FFD700', '#10B981'] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {merchantXpToast && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-black text-xs text-center shadow-2xl border-2 border-white/40 animate-bounce">
          {merchantXpToast}
        </div>
      )}

      {/* Header Banner */}
      <div 
        className={`p-6 rounded-3xl bg-gradient-to-r ${merchantProfileData.bannerGlow || 'from-[#0C1E40] via-[#091530] to-[#070D1E]'} border border-[#FFD700]/40 shadow-2xl relative overflow-hidden space-y-4 transition-all`}
        style={{ borderColor: merchantProfileData.themeColor }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFD700]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {merchantProfileData.avatarUrl ? (
              <div className="relative">
                <img 
                  src={merchantProfileData.avatarUrl} 
                  alt={merchantProfileData.displayName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 shadow-lg"
                  style={{ borderColor: merchantProfileData.themeColor }}
                />
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-black/80 rounded-full text-[9px] font-bold text-amber-400 border border-amber-400">
                  LV.{merchantLevel}
                </div>
              </div>
            ) : (
              <NeonProfileAvatar 
                level={merchantLevel} 
                emoji={merchantProfileData.avatarEmoji || "🏪"} 
                role="merchant" 
                size="lg" 
              />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white flex items-center gap-1.5">
                  <span>{merchantProfileData.displayName}</span>
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 shadow-[0_0_10px_rgba(255,215,0,0.3)] flex items-center gap-1">
                  <span>{currentMerchantTier.badge}</span>
                  <span>{currentMerchantTier.title}</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                  <CreditCard className="w-3 h-3" />
                  เครดิตร้านค้า: {merchantCreditScore}/850 (AAA)
                </span>
                <button
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(950);
                    setShowProfileCustomizerModal(true);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-600/30 hover:brightness-110 text-cyan-300 border border-cyan-400/60 text-[10px] font-mono font-bold flex items-center gap-1 transition-all shadow-sm"
                >
                  <Camera className="w-3 h-3 text-cyan-400" />
                  <span>แต่งโปรไฟล์ร้าน</span>
                </button>
                <button
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(950);
                    setTiersModalInitialRole('merchant');
                    setShowTiersModal(true);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                >
                  <Award className="w-3 h-3 text-cyan-400" />
                  <span>ดูทำเนียบ 10 ระดับยศ</span>
                </button>
              </div>
              <p className="text-xs text-amber-200/90 font-mono mt-0.5 line-clamp-1">
                {merchantProfileData.bioStatus}
              </p>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                รหัสบัญชีร้านค้า: <strong className="text-amber-300">MCH-AURA-ZENCO-001</strong> • โซนเจริญรัถ-คลองสาน • วงเงินหมุนเวียน ฿{workingCapitalAvailable.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-right">
              <span className="text-[10px] text-slate-400 font-mono block">อัศวินสแตนด์บายใกล้ร้าน</span>
              <span className="text-lg font-black text-[#00D2FF] font-mono flex items-center gap-1.5 justify-end">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                {knightsAvailable} นายพร้อมรับงาน
              </span>
            </div>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(900);
                setShowScanAndPayModal(true);
              }}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#FFD700] via-amber-400 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center gap-2 transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>WIN Scan & Pay (สร้าง QR ชำระเงิน)</span>
            </button>

            <button
              onClick={handleBulkPickup}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center gap-2 transition-all"
            >
              <Truck className="w-4 h-4" />
              <span>เรียกพี่วินรับพัสดุจำนวนมาก (Bulk Pickup)</span>
            </button>
          </div>
        </div>

        {/* MERCHANT XP PROGRESS BAR HEADER */}
        <div className="p-3 rounded-2xl bg-black/40 border border-[#FFD700]/30 space-y-1.5 font-mono">
          <div className="flex flex-wrap items-center justify-between text-xs gap-1">
            <span className="text-amber-300 font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#FFD700]" />
              <span>หลอดระดับขั้นร้านค้าพันธมิตร (LV.{merchantLevel}):</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded border ${merchantDifficultyMetrics.badgeColor}`}>
                {merchantDifficultyMetrics.difficultyLabel} ({merchantDifficultyMetrics.difficultyIndex})
              </span>
            </span>
            <span className="text-white font-black">
              {merchantXp.toLocaleString()} / {merchantNextXp.toLocaleString()} XP ({Math.round((merchantXp / merchantNextXp) * 100)}%)
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-white/10 relative">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-[#00D2FF] transition-all duration-500 relative shadow-[0_0_10px_rgba(255,215,0,0.5)]"
              style={{ width: `${Math.min(100, Math.max(5, (merchantXp / merchantNextXp) * 100))}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>ขาดอีก {(merchantNextXp - merchantXp).toLocaleString()} XP ถึงเลเวล {merchantLevel + 1}</span>
            <span className="text-amber-300 font-bold">อัตราทดร้านค้า x21.0 • สิทธิพิเศษคอมมิชชั่น 0% ตลอดชีพ</span>
          </div>
        </div>
      </div>

      {/* DYNAMIC 3D DENSITY RADAR OVERLAY (REAL-TIME FOOT TRAFFIC & KNIGHT TELEMETRY) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-black text-white font-mono uppercase tracking-wide">
              3D DENSITY RADAR (ระบบตรวจจับความหนาแน่นลูกค้า & อัศวิน WIN)
            </h3>
          </div>
          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              setShowRadarOverlay(!showRadarOverlay);
            }}
            className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-mono flex items-center gap-1.5 transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showRadarOverlay ? 'ย่อเรดาร์' : '📡 ขยายเรดาร์ 3D Hologram'}</span>
          </button>
        </div>

        {showRadarOverlay && (
          <DensityRadarOverlay
            venueName="ร้านค้าพันธมิตร WIN HQ (Merchant Command Center)"
            venueIcon="🏬"
            venueCategory="ศูนย์การค้า & พันธมิตรธุรกิจ"
            radiusKm={2.5}
            audioEnabled={audioEnabled}
          />
        )}
      </div>

      {/* Main Grid: Logistics & Outbound vs Flash Sales & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1 & 2: Logistics & Deliveries */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Incoming Customers & Outbound Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Incoming Customers */}
            <div className="p-5 rounded-2xl bg-[#09152E] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  ลูกค้าที่กำลังเดินทางมาร้าน
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">เวลาถึงโดยประมาณ</span>
              </div>

              <div className="space-y-2">
                {incomingCustomers.map((cust, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{cust.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono">
                          {cust.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{cust.rideType}</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-300 font-mono">{cust.eta}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Outbound Deliveries */}
            <div className="p-5 rounded-2xl bg-[#09152E] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  พัสดุและอาหารที่กำลังส่งออก
                </h4>
                <button
                  onClick={() => {
                    if (audioEnabled) playRadarScan();
                    setShowPickupMapModal(true);
                  }}
                  className="text-[10px] text-cyan-300 hover:text-white font-mono underline flex items-center gap-1"
                >
                  <Truck className="w-3 h-3 text-[#00D2FF]" />
                  <span>ดูแผนที่ 3D สด ({deliveries.length} รายการ)</span>
                </button>
              </div>

              <div className="space-y-2">
                {deliveries.map((del, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      setShowPickupMapModal(true);
                    }}
                    className="p-3 rounded-xl bg-black/30 hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-500/40 space-y-1 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{del.id} • {del.item}</span>
                      <span className="text-emerald-400 font-mono text-[10px]">ถึงใน {del.eta}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{del.destination}</span>
                      <span className="text-cyan-300">{del.knight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Flash Sale Manager & P2P Marketplace */}
          <div className="p-6 rounded-3xl bg-[#09142A] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  จัดการดีลลดราคาสด Flash Sale & ตลาดร้านค้า
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  สร้างดีลส่วนลดพิเศษแบบจำกัดเวลา กระจายสู่สมาร์ตโฟนผู้โดยสารรอบรัศมี 3 กม.
                </p>
              </div>

              <button
                onClick={() => setShowAddFlashModal(true)}
                className="px-3 py-1.5 rounded-xl bg-[#FFD700] hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มสินค้า Flash Sale +</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {flashSales.map((sale) => (
                <div key={sale.id} className="p-4 rounded-2xl bg-[#060D1E] border border-cyan-500/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-xl">
                        {sale.imageIcon}
                      </div>
                      <div>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-cyan-300 border border-white/10">
                          {sale.category}
                        </span>
                        <h5 className="text-xs font-bold text-white line-clamp-1 mt-0.5">{sale.title}</h5>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-sm font-black text-amber-400">฿{sale.price.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 line-through ml-2">฿{sale.originalPrice.toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      เหลือเวลา {sale.timeLeft}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>ขายแล้ว: <strong>{sale.salesCount} ชิ้น</strong></span>
                    <span className="text-emerald-400 font-bold">กำลังเปิดขาย</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Revenue Analytics & Partner Tier Perks */}
        <div className="space-y-6">
          
          {/* Real-time Revenue Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0F2248] via-[#091530] to-[#070D1E] border border-[#00D2FF]/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-300 font-bold uppercase">ยอดขายวันนี้</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                +36.2% เทียบกับเมื่อวาน
              </span>
            </div>

            <div>
              <div className="text-3xl font-black text-white">฿24,800.00</div>
              <div className="text-xs text-slate-400 mt-1 font-mono">เมื่อวาน: ฿18,200.00</div>
            </div>

            {/* Simple Bar Comparison */}
            <div className="space-y-2 pt-2 border-t border-white/10 text-xs font-mono">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">วันนี้:</span>
                  <span className="text-cyan-400 font-bold">฿24,800 (100%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div className="w-full h-full bg-cyan-400 shadow-[0_0_8px_#00D2FF]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">เมื่อวาน:</span>
                  <span className="text-slate-400">฿18,200 (73%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div className="w-[73%] h-full bg-slate-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Merchant Financial Credit Score Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0D2447] via-[#091633] to-[#070E22] border-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>คะแนนเครดิตร้านค้าพันธมิตร</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                      AAA SOVEREIGN
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-300 font-mono">ความน่าเชื่อถือทางการเงินระดับองค์กร</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-emerald-400 font-mono flex items-center justify-end gap-1">
                  <TrendingUp className="w-5 h-5" />
                  <span>{merchantCreditScore}</span>
                  <span className="text-xs text-slate-400 font-normal">/850</span>
                </div>
                <span className="text-[9px] text-emerald-300 font-mono font-bold">สถานะ: พันธมิตรความน่าเชื่อถือสูงสุด</span>
              </div>
            </div>

            {/* Score Progress Bar */}
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">เกณฑ์ประเมินเครดิต B2B (300 - 850):</span>
                <span className="text-cyan-300 font-bold">สูงสุด Top 2.5% ของร้านค้าในกรุงเทพฯ</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-white/10 p-0.5 relative">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 transition-all duration-700 relative"
                  style={{ width: `${Math.min(100, Math.max(10, ((merchantCreditScore - 300) / 550) * 100))}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Credit Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">วงเงินทุนหมุนเวียน 0% (14 วัน):</div>
                <div className="text-sm font-bold text-[#FFD700]">฿{workingCapitalAvailable.toLocaleString()}</div>
                <div className="text-[9px] text-slate-400">จากวงเงินอนุมัติ ฿{workingCapitalLimit.toLocaleString()}</div>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">ประวัติส่งของตรงเวลา:</div>
                <div className="text-sm font-bold text-emerald-400">99.8% อัตราสำเร็จ</div>
                <div className="text-[9px] text-slate-400">อัศวินรับพัสดุไวเฉลี่ย 2.8 นาที</div>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">เครดิตเรียกอัศวินล่วงหน้า:</div>
                <div className="text-sm font-bold text-cyan-300">Net-30 ไม่ต้องวางมัดจำ</div>
                <div className="text-[9px] text-slate-400">ตัดรอบบิลรวมรายเดือน</div>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">อัตราข้อพิพาท/เคลมสินค้า:</div>
                <div className="text-sm font-bold text-amber-300">0.02% (ไร้ข้อพิพาท)</div>
                <div className="text-[9px] text-slate-400">ระดับความพึงพอใจ 4.98/5</div>
              </div>
            </div>

            {/* Interactive Actions */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">สิทธิประโยชน์เครดิตคู่ค้า:</span>
                <span className="text-[10px] text-emerald-300">กดเบิกเงินได้ทันที</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleDrawWorkingCapital(20000)}
                  className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-cyan-950/70 hover:from-emerald-900/90 hover:to-cyan-900/90 border border-emerald-500/50 hover:border-emerald-400 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4" />
                      <span>เบิกเงินหมุนเวียน ฿20,000</span>
                    </div>
                    <div className="text-[10px] text-slate-300">0% ดอกเบี้ย 14 วัน เข้าบัญชี</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-emerald-500 text-slate-950">
                    กดเบิก
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGainMerchantCredit(15, "ปิดรอบบิลส่งพัสดุตรงเวลา")}
                  className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/70 to-yellow-950/70 hover:from-amber-900/90 hover:to-yellow-900/90 border border-amber-500/50 hover:border-amber-400 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      <span>จำลองปิดรอบบิลตรงเวลา</span>
                    </div>
                    <div className="text-[10px] text-slate-300">เพิ่มเครดิตคู่ค้า B2B</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-[#FFD700] text-slate-950">
                    +15 แต้ม
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Partner Tier & Perks Card with 10-Tier Merchant Hierarchy */}
          <div className="p-6 rounded-3xl bg-[#091428] border-2 border-[#FFD700]/40 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFD700] to-amber-600 flex items-center justify-center text-slate-950 font-black">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase flex items-center gap-1.5">
                    <span>{currentMerchantTier.title}</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-rose-300 border border-rose-500/40">
                      🔥 สเกลความยาก +50%
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentMerchantTier.levelRange} • {currentMerchantTier.rarity}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(950);
                  setTiersModalInitialRole('merchant');
                  setShowTiersModal(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FFD700] to-amber-500 hover:brightness-110 text-slate-950 font-bold text-[10px] font-mono shadow-sm flex items-center gap-1"
              >
                <Award className="w-3.5 h-3.5" />
                <span>ดูครบ 10 ระดับ</span>
              </button>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">XP ร้านค้าพันธมิตร:</span>
                <span className="text-amber-300 font-bold">
                  {merchantXp.toLocaleString()} / {merchantNextXp.toLocaleString()} XP ({Math.round((merchantXp / merchantNextXp) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-black/50 overflow-hidden border border-white/10 p-[1px]">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-[#00D2FF] transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(5, (merchantXp / merchantNextXp) * 100))}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentMerchantTier.description}
            </p>

            {/* Active Perks List */}
            <div className="space-y-2 text-xs text-slate-200">
              {currentMerchantTier.keyPerks.map((perk, pIdx) => (
                <div key={pIdx} className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            {/* Exclusive Reward */}
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/60 to-yellow-950/40 border border-amber-500/30 text-[10px] text-amber-300 font-mono flex items-center justify-between">
              <span>🎁 <strong>รางวัลคู่ค้า:</strong> {currentMerchantTier.exclusiveReward}</span>
              <span className="text-[#FFD700] font-bold">เปิดใช้งานแล้ว</span>
            </div>

            {/* Quick 10-Tier Progress Ribbon */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>ผัง 10 ลำดับขั้นร้านค้า (LV.1 - 100):</span>
                <span className="text-amber-400">ขั้นที่ {currentMerchantTier.tierIndex + 1}/10</span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 text-[9px] font-mono">
                {MERCHANT_10_TIERS.map((t, idx) => {
                  const isReached = merchantLevel >= t.minLevel;
                  const isCurrent = merchantLevel >= t.minLevel && merchantLevel <= t.maxLevel;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800 + idx * 40);
                        setTiersModalInitialRole('merchant');
                        setShowTiersModal(true);
                      }}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        isCurrent
                          ? 'bg-amber-400 text-slate-950 font-black border-white shadow-md'
                          : isReached
                          ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                          : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                      title={`${t.levelRange}: ${t.title}`}
                    >
                      <span className="block text-[10px]">{t.icon}</span>
                      <span className="block scale-90">T{idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Merchant XP Fast Actions */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                <span>ภารกิจสะสม XP ร้านค้า:</span>
                <span className="text-cyan-400">กดรับ XP ทันที</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleGainMerchantXp(90, "ส่งพัสดุสำเร็จ")}
                  className="p-2 rounded-xl bg-black/40 hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-400 text-left transition-all flex items-center justify-between"
                >
                  <span>📦 ส่งพัสดุอัศวิน</span>
                  <span className="font-mono text-cyan-300 font-bold">+90 XP</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGainMerchantXp(110, "ลูกค้ากดรีวิว 5 ดาว")}
                  className="p-2 rounded-xl bg-black/40 hover:bg-amber-950/40 border border-white/10 hover:border-amber-400 text-left transition-all flex items-center justify-between"
                >
                  <span>⭐ ได้ 5 ดาวหน้าร้าน</span>
                  <span className="font-mono text-amber-300 font-bold">+110 XP</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(1000);
                handleGainMerchantXp(300, "ปลดล็อกสิทธิพิเศษพันธมิตร");
                alert("👑 ปลดล็อกสิทธิพิเศษระดับสูง: เข้าถึงระบบวิเคราะห์ทราฟฟิกผู้โดยสารล่วงหน้า 24 ชม. (+300 XP)");
                confetti({ particleCount: 50, spread: 60 });
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFD700] to-amber-600 hover:brightness-110 text-slate-950 font-bold text-xs shadow-md"
            >
              ปลดล็อกสิทธิพิเศษระดับสูง (Unlock Premium Perks +300 XP)
            </button>
          </div>
        </div>
      </div>

      {/* SOVEREIGN QUEST CENTER FOR MERCHANTS */}
      <SovereignQuestCenter
        initialRole="merchant"
        merchantLevel={merchantLevel}
        audioEnabled={audioEnabled}
        onGainMerchantXp={(amount, reason) => handleGainMerchantXp(amount, reason)}
        onRewardBonusCash={(amount) => {
          setWorkingCapitalAvailable(prev => prev + amount);
        }}
      />

      {/* Add Flash Sale Modal */}
      {showAddFlashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form onSubmit={handleAddFlashSale} className="relative w-full max-w-md bg-[#0A1428] rounded-3xl border-2 border-[#FFD700] p-6 shadow-[0_0_40px_rgba(255,215,0,0.3)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-base font-bold text-[#FFD700]">เพิ่มดีล Flash Sale</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddFlashModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Mandatory AI Photo Verification Section */}
              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  📸 รูปถ่ายสินค้าและยืนยันด้วย AI (จำเป็นต้องยืนยันทุกครั้ง):
                </label>
                <AIProductPhotoVerifier
                  audioEnabled={audioEnabled}
                  initialItemName={newTitle}
                  initialCategory="Flash Sale Merchant"
                  onVerificationComplete={(result) => {
                    setFlashAiVerified(result);
                    if (!newTitle) setNewTitle(result.detectedTitle);
                    if (!newPrice) setNewPrice(result.fairPriceRange.min.toString());
                    if (!newOrigPrice) setNewOrigPrice(result.fairPriceRange.max.toString());
                  }}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ชื่อสินค้าลดราคาพิเศษ:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น ชุดกาแฟดริปของขวัญ Artisan Coffee Gift Set"
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">ราคาพิเศษ (บาท):</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="เช่น 299"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">ราคาปกติ (บาท):</label>
                  <input
                    type="number"
                    value={newOrigPrice}
                    onChange={(e) => setNewOrigPrice(e.target.value)}
                    placeholder="เช่น 450"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddFlashModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 font-semibold text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FFD700] hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
              >
                เริ่ม Flash Sale
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 10-TIER SOVEREIGN CODEX MODAL */}
      <SovereignTiersModal
        isOpen={showTiersModal}
        onClose={() => setShowTiersModal(false)}
        initialRole={tiersModalInitialRole}
        currentLevel={merchantLevel}
        audioEnabled={audioEnabled}
        onApplySimulatedLevel={(role, lvl) => {
          if (role === 'merchant') {
            setMerchantLevel(lvl);
            const req = calculateLevelMaxXp(lvl, 'merchant');
            setMerchantNextXp(req);
            setMerchantXp(Math.round(req * 0.5));
          }
        }}
      />

      {/* WIN SCAN & PAY QR GENERATOR MODAL */}
      <WinScanAndPayModal
        isOpen={showScanAndPayModal}
        onClose={() => setShowScanAndPayModal(false)}
        entityName="ร้านออร่าเซนโก้ (Aura Zenco)"
        entityType="merchant"
        entityCategoryLabel="ร้านค้าพันธมิตร (เจริญรัถ-คลองสาน)"
        defaultAmount={250}
        qrWalletAddress="WIN-MCH-ZENCO-9988-2104"
        audioEnabled={audioEnabled}
      />

      {/* 3D PARCEL PICKUP MAP MODAL */}
      <MerchantParcelPickupMapModal
        isOpen={showPickupMapModal}
        onClose={() => setShowPickupMapModal(false)}
        audioEnabled={audioEnabled}
        onGainMerchantXp={(amt, rsn) => handleGainMerchantXp(amt, rsn)}
      />

      {/* PROFILE CUSTOMIZER MODAL FOR MERCHANT */}
      <ProfileCustomizerModal
        isOpen={showProfileCustomizerModal}
        onClose={() => setShowProfileCustomizerModal(false)}
        currentData={merchantProfileData}
        role="shop"
        onSave={(updated) => setMerchantProfileData(updated)}
        audioEnabled={audioEnabled}
      />
    </div>
  );
};
