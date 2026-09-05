import React, { useState } from 'react';
import { Vehicle } from '../types';
import { KNIGHT_ARMOR_SUITS, ArmorSuit } from '../data/armorSuits';
import { playTactileBlip, playLevelUpFanfare, playRadarScan, playEngineRev } from '../utils/audio';
import confetti from 'canvas-confetti';
import { TwoBahtEmpireCalculator } from './TwoBahtEmpireCalculator';
import { ArmorInstallmentFourBahtModel } from './ArmorInstallmentFourBahtModel';
import { ArmorLevelTestingLab } from './ArmorLevelTestingLab';
import { ArmorCabinetView } from './ArmorCabinetView';
import { ArmorLevels1to70ShowcaseModal } from './ArmorLevels1to70ShowcaseModal';
import { NeonProfileAvatar } from './NeonProfileAvatar';
import { SovereignTiersModal } from './SovereignTiersModal';
import { DriverStandbyAndIncomingJob, IncomingJobData } from './DriverStandbyAndIncomingJob';
import { KnightNavigationMapScreen } from './KnightNavigationMapScreen';
import { SovereignQuestCenter } from './SovereignQuestCenter';
import { DensityRadarOverlay } from './DensityRadarOverlay';
import { DriverPaymentQrCodeModal } from './DriverPaymentQrCodeModal';
import { ProfileCustomizerModal, ProfileCustomizationData } from './ProfileCustomizerModal';
import { calculateLevelMaxXp, getLevelDifficultyMetrics } from '../data/tierHierarchyData';
import { 
  Shield, 
  Wrench, 
  Plus, 
  Coins, 
  CheckCircle2, 
  ChevronRight, 
  Layers, 
  Radio, 
  Activity, 
  Zap, 
  Sparkles, 
  Fuel, 
  Award, 
  Headphones, 
  Hand,
  Clock,
  Compass,
  DollarSign,
  AlertCircle,
  Eye,
  Check,
  Lock,
  Shirt,
  HardHat,
  Sliders,
  Flame,
  Info,
  Calculator,
  Percent,
  Calendar,
  Bike,
  RotateCcw,
  BatteryCharging,
  Gauge,
  FileCheck,
  CreditCard,
  TrendingUp,
  Banknote,
  Crown,
  Target,
  Navigation,
  QrCode,
  User
} from 'lucide-react';

interface KnightDriverAppViewProps {
  audioEnabled: boolean;
  onOpenWinBuddy?: () => void;
}

export const KnightDriverAppView: React.FC<KnightDriverAppViewProps> = ({ audioEnabled, onOpenWinBuddy }) => {
  const [activeDriverTab, setActiveDriverTab] = useState<'profile' | 'garage' | 'cabinet' | 'armor' | 'armorLab' | 'calculator' | 'installment' | 'wallet' | 'jobs' | 'quests' | 'navigation'>('jobs');
  const [isOnDuty, setIsOnDuty] = useState<boolean>(true);
  const [deviceFrameMode, setDeviceFrameMode] = useState(true);
  const [balance, setBalance] = useState(125400);
  const [ridesPaid, setRidesPaid] = useState(35);
  const totalRidesDebt = 35;

  // Knight Financial Credit Score State (คะแนนเครดิตทางการเงินอัศวิน - สูงสุด AAA Sovereign)
  const [driverCreditScore, setDriverCreditScore] = useState<number>(850);
  const [emergencyCreditLimit] = useState<number>(50000);
  const [emergencyCreditAvailable, setEmergencyCreditAvailable] = useState<number>(50000);
  const [creditToast, setCreditToast] = useState<string | null>(null);

  // 3D Density Radar (2.5 km) & Driver QR Code Modals & Armor Showcase Modal
  const [showDriverRadarModal, setShowDriverRadarModal] = useState<boolean>(false);
  const [showDriverQrModal, setShowDriverQrModal] = useState<boolean>(false);
  const [showArmorShowcaseModal, setShowArmorShowcaseModal] = useState<boolean>(false);

  // --- Win Knight Level & XP System (Progressive Proportional Scaling) ---
  const [driverLevel, setDriverLevel] = useState<number>(100);
  const [driverNextXp, setDriverNextXp] = useState<number>(() => calculateLevelMaxXp(100, 'knight'));
  const [driverXp, setDriverXp] = useState<number>(() => Math.round(calculateLevelMaxXp(100, 'knight') * 0.88));
  const [driverXpToast, setDriverXpToast] = useState<string | null>(null);
  const [showTiersModal, setShowTiersModal] = useState<boolean>(false);
  const [tiersModalInitialRole, setTiersModalInitialRole] = useState<'knight' | 'citizen' | 'merchant'>('knight');

  const driverDifficultyMetrics = getLevelDifficultyMetrics(driverLevel);

  const getDriverRankTitle = (lvl: number) => {
    if (lvl >= 91) return 'อัศวินเทพเจ้า (Godlike Sovereign - 1 เดียวในโลก) 👑🌌✨';
    if (lvl >= 81) return 'อัศวินตำนาน (Legendary Knight) 🌟';
    if (lvl >= 71) return 'อัศวินจักรพรรดิ ผู้นำวิก (Emperor Knight) 👑';
    if (lvl >= 61) return 'อัศวินผู้พิชิต (Conqueror Knight) ⚔️';
    if (lvl >= 51) return 'อัศวินเพชร (Diamond Knight) 💎';
    if (lvl >= 41) return 'อัศวินแพลตินัม (Platinum Knight) ✨';
    if (lvl >= 31) return 'อัศวินทองคำ (Gold Knight) 🥇';
    if (lvl >= 21) return 'อัศวินเงิน (Silver Knight) 🥈';
    if (lvl >= 11) return 'อัศวินทองแดง (Bronze Knight) 🥉';
    return 'อัศวินพื้นฐาน (Standard Knight) 🛡️';
  };

  const handleGainDriverXp = (amount: number, reason: string) => {
    if (audioEnabled) playTactileBlip(1100 + amount * 2);
    setDriverXp(prev => {
      const newXp = prev + amount;
      if (newXp >= driverNextXp) {
        const nextLvl = driverLevel + 1;
        setDriverLevel(nextLvl);
        // คำนวณคะแนนเต็ม XP ของเลเวลใหม่อย่างแม่นยำตามสัดส่วนความยาก (Progressive Power Curve)
        const nextReq = calculateLevelMaxXp(nextLvl, 'knight');
        setDriverNextXp(nextReq);
        if (audioEnabled) playEngineRev();
        confetti({ particleCount: 90, spread: 85, colors: ['#00D2FF', '#FFD700', '#10B981', '#FFFFFF'] });
        setDriverXpToast(`⚔️ LEVEL UP! อัศวินเลื่อนขั้นเป็น Level ${nextLvl} (${getDriverRankTitle(nextLvl)})! (หลอดใหม่: ${nextReq.toLocaleString()} XP)`);
        return Math.max(0, newXp - driverNextXp);
      } else {
        setDriverXpToast(`✨ +${amount} XP: ${reason}`);
        setTimeout(() => setDriverXpToast(null), 3500);
        return newXp;
      }
    });
  };

  const handleBoostDriverCredit = (points: number, reason: string) => {
    if (audioEnabled) playTactileBlip(1200);
    setDriverCreditScore(prev => Math.min(850, prev + points));
    setCreditToast(`💳 +${points} คะแนนเครดิต: ${reason}! (คะแนนรวม: ${Math.min(850, driverCreditScore + points)}/850)`);
    confetti({ particleCount: 40, spread: 60, colors: ['#00D2FF', '#FFD700', '#10B981'] });
    setTimeout(() => setCreditToast(null), 4000);
  };

  const handleDrawEmergencyCredit = (amount: number) => {
    if (emergencyCreditAvailable < amount) {
      if (audioEnabled) playTactileBlip(400);
      alert(`⚠️ วงเงินสินเชื่อฉุกเฉิน 0% คงเหลือไม่เพียงพอ (คงเหลือ ฿${emergencyCreditAvailable.toLocaleString()})`);
      return;
    }
    if (audioEnabled) playRadarScan();
    setEmergencyCreditAvailable(prev => prev - amount);
    setBalance(prev => prev + amount);
    confetti({ particleCount: 50, spread: 70, colors: ['#FFD700', '#00D2FF', '#FFFFFF'] });
    setCreditToast(`💸 เบิกสินเชื่อฉุกเฉิน 0% สำเร็จ: +฿${amount.toLocaleString()} โอนเข้ากระเป๋าเงินทันที!`);
    setTimeout(() => setCreditToast(null), 4500);
  };

  // Currently equipped Armor Suit & Helmet (Level 100 Godlike Custom Edition by default)
  const [equippedSuitId, setEquippedSuitId] = useState<string>('suit-v10');
  const [selectedInspectSuit, setSelectedInspectSuit] = useState<ArmorSuit | null>(null);
  const [selectedInspectVehicle, setSelectedInspectVehicle] = useState<Vehicle | null>(null);
  const [showProfileCustomizerModal, setShowProfileCustomizerModal] = useState<boolean>(false);
  const [driverProfileData, setDriverProfileData] = useState<ProfileCustomizationData>({
    displayName: 'กิตติ อินทะสร้อย',
    bioStatus: 'อัศวินส้มสายเลือดแท้ • ปลอดภัย ว่องไว มีน้ำใจ เลเวล 100 🏍️🔥',
    avatarEmoji: '🦁',
    themeColor: '#FF6B00',
    bannerGlow: 'from-[#0D1C3D] via-[#09142B] to-[#070D1E]'
  });

  const equippedSuit = KNIGHT_ARMOR_SUITS.find(s => s.id === equippedSuitId) || KNIGHT_ARMOR_SUITS[9];

  // Active Vehicle & Registered Fleet State
  const [activeVehicleId, setActiveVehicleId] = useState<string>('wave-110i');
  const [showSwitchVehicleModal, setShowSwitchVehicleModal] = useState<boolean>(false);
  const [switchSuccessToast, setSwitchSuccessToast] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: 'wave-110i',
      brand: 'HONDA',
      modelName: 'Wave 110i (PGM-FI)',
      name: 'Honda Wave 110i (PGM-FI)',
      type: '1. Legendary Daily Commuter',
      category: 'commuter',
      displacement: '109.5 cc',
      plateNumber: '1กข 8899 กทม.',
      registrationNumber: 'DLT-TH-88291',
      insuranceStatus: 'พ.ร.บ. & ประกันคุ้มครองผู้โดยสาร (Active)',
      status: 'READY',
      isPrimary: true,
      mileage: '70,240 km',
      fuel: 100,
      oil: 92,
      batteryHealth: 96,
      fuelEconomy: '60.0 กม./ลิตร',
      iconEmoji: '🛵',
      dailyRidesDone: 14,
      accent: 'border-cyan-500/40 bg-cyan-950/20',
      description: 'รถคู่ใจมหาชน ประหยัดน้ำมัน 60 กม./ลิตร ซอกแซกตรอกแคบได้ทุกเส้นเลือดฝอย คล่องตัวสูงสุด'
    },
    {
      id: 'pcx-160',
      brand: 'HONDA',
      modelName: 'PCX 160 ABS (Smart Key)',
      name: 'Honda PCX 160 ABS (Smart Key)',
      type: '2. Premium Urban Cruiser',
      category: 'scooter',
      displacement: '156.9 cc (eSP+)',
      plateNumber: '3ษล 4455 กทม.',
      registrationNumber: 'DLT-TH-94112',
      insuranceStatus: 'พ.ร.บ. & ประกันภัยชั้น 1 คุ้มครองผู้โดยสาร (Active)',
      status: 'READY',
      isPrimary: false,
      mileage: '24,180 km',
      fuel: 88,
      oil: 94,
      batteryHealth: 98,
      fuelEconomy: '45.0 กม./ลิตร',
      iconEmoji: '✨',
      dailyRidesDone: 7,
      accent: 'border-blue-500/40 bg-blue-950/20',
      description: 'สกู๊ตเตอร์พรีเมียม ขี่นุ่ม เงียบ เบาะกว้าง มีช่องชาร์จ Type-C ผู้โดยสารนั่งสบาย เดินทางสะดวก'
    },
    {
      id: 'africa-twin',
      brand: 'HONDA',
      modelName: 'Africa Twin (CRF1100L)',
      name: 'Honda Africa Twin (CRF1100L)',
      type: '3. Adventure Long-Distance Beast',
      category: 'touring',
      displacement: '1,084 cc (DCT Dual Clutch)',
      plateNumber: '5ขพ 7711 กทม.',
      registrationNumber: 'DLT-TH-11002',
      insuranceStatus: 'พ.ร.บ. & ประกันภัยชั้น 1 + วงเงินพิเศษ (Active)',
      status: 'READY',
      isPrimary: false,
      mileage: 'Dakar Spec • 18,400 km',
      fuel: 98,
      oil: 85,
      batteryHealth: 100,
      fuelEconomy: '20.5 กม./ลิตร',
      iconEmoji: '🏜️',
      dailyRidesDone: 2,
      accent: 'border-[#FFD700]/50 bg-amber-950/20',
      description: 'ยานรบทางไกล ข้ามจังหวัด ลุยน้ำท่วมลึก 40 ซม. พร้อมระบบกันสะเทือนไฟฟ้า Showa EERA'
    },
    {
      id: 'deco-ev-4000',
      brand: 'DECO',
      modelName: 'Super EV 4000W (Clean Knight)',
      name: 'Deco Super EV 4000W (Clean Knight)',
      type: '4. Clean Energy Eco-EV',
      category: 'ev',
      displacement: 'มอเตอร์ไฟฟ้า 4,000 Watt',
      plateNumber: '9ฉค 3344 กทม. (ป้ายเขียว)',
      registrationNumber: 'DLT-EV-04021',
      insuranceStatus: 'พ.ร.บ. & ประกันแบตเตอรี่และผู้โดยสาร (Active)',
      status: 'READY',
      isPrimary: false,
      mileage: '8,520 km',
      fuel: 95,
      oil: 100,
      batteryHealth: 99,
      fuelEconomy: '0.12 บาท/กม. (สลับแบตที่ Win Hub ฟรี)',
      iconEmoji: '⚡',
      dailyRidesDone: 8,
      accent: 'border-emerald-500/40 bg-emerald-950/20',
      description: 'รถพลังงานสะอาด 100% ไร้ควัน ไร้เสียง ต้นทุนต่อกม. ต่ำสุด สลับแบตเตอรี่ได้ที่ WIN HUB ทั่วกรุง'
    }
  ]);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0];

  const [showAddRideModal, setShowAddRideModal] = useState(false);
  const [newRideName, setNewRideName] = useState('');
  const [newRideCategory, setNewRideCategory] = useState<'commuter' | 'touring' | 'scooter' | 'sport' | 'ev'>('scooter');
  const [newRideType, setNewRideType] = useState('Scooter / Big Bike');
  const [newRidePlate, setNewRidePlate] = useState('');
  const [newRideDisplacement, setNewRideDisplacement] = useState('');
  const [newRideMileage, setNewRideMileage] = useState('');
  const [newRideSetAsActive, setNewRideSetAsActive] = useState(true);

  // Switch Active Vehicle Function
  const handleSwitchActiveVehicle = (targetId: string) => {
    setActiveVehicleId(targetId);
    setVehicles(prev => prev.map(v => ({
      ...v,
      isPrimary: v.id === targetId,
      status: v.id === targetId ? 'READY' : v.status
    })));

    const switched = vehicles.find(v => v.id === targetId);
    if (audioEnabled) {
      playEngineRev(180, 0.7);
    }
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00D2FF', '#FFD700', '#10B981']
    });

    setSwitchSuccessToast(`สลับใช้งาน [${switched?.name || 'ยานรบ'}] (${switched?.plateNumber || ''}) เป็นรถรับงานหลักเรียบร้อย!`);
    setTimeout(() => setSwitchSuccessToast(null), 4500);
  };

  const handleWithdraw = () => {
    if (audioEnabled) playTactileBlip(1100);
    alert(`💸 ดำเนินการโอนเงินสด ฿${balance.toLocaleString()}.00 จากกระเป๋าเงินอัศวินเข้าบัญชีธนาคารกสิกรไทยเรียบร้อย (ค่าธรรมเนียม 0 บาทตามนโยบายอธิปไตย)`);
    setBalance(0);
    confetti({
      particleCount: 50,
      spread: 70,
      colors: ['#00D2FF', '#FFD700', '#FFFFFF']
    });
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRideName) return;
    const newId = `ride-${Date.now()}`;
    const parts = newRideName.trim().split(' ');
    const brand = parts[0]?.toUpperCase() || 'CUSTOM';
    const modelName = parts.length > 1 ? parts.slice(1).join(' ') : newRideName;

    const v: Vehicle = {
      id: newId,
      name: newRideName,
      brand,
      modelName,
      type: `${vehicles.length + 1}. ${newRideType}`,
      category: newRideCategory,
      displacement: newRideDisplacement || '150 cc',
      plateNumber: newRidePlate || '7กข 1122 กทม.',
      registrationNumber: `DLT-TH-${Math.floor(10000 + Math.random() * 90000)}`,
      insuranceStatus: 'พ.ร.บ. & ประกันภัยชั้น 1 คุ้มครองผู้โดยสาร (Active)',
      status: 'READY',
      isPrimary: newRideSetAsActive,
      mileage: newRideMileage || '0 km',
      fuel: 100,
      oil: 100,
      batteryHealth: 100,
      fuelEconomy: '50.0 กม./ลิตร',
      iconEmoji: newRideCategory === 'ev' ? '⚡' : newRideCategory === 'touring' ? '🏜️' : '🛵',
      accent: newRideCategory === 'ev' ? 'border-emerald-400/40 bg-emerald-950/20' : 'border-cyan-400/40 bg-cyan-900/20',
      description: 'ยานรบคันใหม่ บันทึกในสมุดทะเบียนอัศวินจักรวรรดิ WINRIDER พร้อมออกรับงานทันที',
      dailyRidesDone: 0
    };

    if (newRideSetAsActive) {
      setActiveVehicleId(newId);
      setVehicles(prev => [...prev.map(item => ({ ...item, isPrimary: false })), v]);
    } else {
      setVehicles(prev => [...prev, v]);
    }

    setNewRideName('');
    setNewRidePlate('');
    setNewRideDisplacement('');
    setNewRideMileage('');
    setShowAddRideModal(false);
    if (audioEnabled) playLevelUpFanfare();
    confetti({ particleCount: 40, spread: 60, colors: ['#FFD700', '#00D2FF'] });

    setSwitchSuccessToast(`ลงทะเบียน [${v.name}] สำเร็จ! ${newRideSetAsActive ? 'และตั้งเป็นรถรับงานหลักแล้ว' : ''}`);
    setTimeout(() => setSwitchSuccessToast(null), 4500);
  };

  const handleEquipSuit = (suit: ArmorSuit) => {
    if (suit.levelRequired > 50) {
      if (audioEnabled) playTactileBlip(400);
      alert(`⚠️ ชุดเกราะ ${suit.name} ต้องการระดับเลเวล ${suit.levelRequired} (XP: ${suit.xpMilestone})\nกรุณาสะสม XP จากการวิ่งงานเพื่อปลดล็อก!`);
      return;
    }
    setEquippedSuitId(suit.id);
    if (audioEnabled) playLevelUpFanfare();
    confetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.6 },
      colors: [suit.accentColor, '#FFD700', '#FFFFFF']
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification for Switching Vehicle */}
      {switchSuccessToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md bg-gradient-to-r from-[#0C1A38] to-[#0A2647] border-2 border-[#00D2FF] text-white p-3.5 rounded-2xl shadow-[0_0_30px_rgba(0,210,255,0.4)] flex items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-cyan-400 flex items-center justify-center text-slate-950 font-black text-base flex-shrink-0">
            🏍️
          </div>
          <div className="text-xs">
            <div className="font-bold text-cyan-300">สลับรถรับงานสำเร็จ (Active Vehicle Switched)</div>
            <div className="text-slate-200 text-[11px] mt-0.5">{switchSuccessToast}</div>
          </div>
          <button 
            onClick={() => setSwitchSuccessToast(null)}
            className="text-slate-400 hover:text-white ml-auto text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0A1428] border border-[#00D2FF]/30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(255,215,0,0.4)]">
            🏍️
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>KNIGHT'S GARAGE & DRIVER ARSENAL</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-mono">
                ARMOR SUITS & FLEET DISPATCH
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              หน้าจออู่รถอัศวิน (กิตติ อินทะสร้อย • Level 100 Sovereign) • สลับรถรับงานได้ตลอดเวลา ({vehicles.length} คัน) • คลังชุดเกราะปลดล็อคทุกอย่าง • ผ่อนชำระ 5/35 รอบ & กระเป๋าเงิน ฿{balance.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setDeviceFrameMode(!deviceFrameMode)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-[#00D2FF]" />
            <span>{deviceFrameMode ? 'โหมดเต็มหน้าจอ (Full View)' : 'โหมดกรอบมือถือ (Phone Frame)'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className={`mx-auto transition-all ${deviceFrameMode ? 'w-full sm:max-w-md' : 'w-full max-w-5xl'}`}>
        <div className={`relative bg-[#070D1E] text-slate-100 overflow-hidden shadow-2xl border border-[#00D2FF]/30 transition-all ${
          deviceFrameMode ? 'rounded-2xl sm:rounded-[40px] p-2.5 sm:p-4 ring-0 sm:ring-8 sm:ring-slate-800/80 shadow-[0_0_50px_rgba(0,210,255,0.25)]' : 'rounded-2xl sm:rounded-3xl p-3 sm:p-6'
        }`}>

          {/* Color Palette Indicators on top right */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 px-2 text-[10px] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-white tracking-wider">KNIGHT OS V5.2 • FLEET DISPATCH ENGINE</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-slate-300">70% Navy</span>
              <span>•</span>
              <span className="text-cyan-400">27% Neon Blue</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">3% Gold Rank</span>
            </div>
          </div>

          {/* Toast Notification */}
          {driverXpToast && (
            <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-[#00D2FF] text-slate-950 font-black text-xs text-center shadow-2xl border-2 border-white/40 animate-bounce">
              {driverXpToast}
            </div>
          )}

          {/* DRIVER PROFILE CARD WITH ACTIVE ARMOR SUIT & ACTIVE DISPATCH VEHICLE */}
          <div 
            className={`my-4 p-4 rounded-3xl bg-gradient-to-br ${driverProfileData.bannerGlow || 'from-[#0D1C3D] via-[#09142B] to-[#070D1E]'} border border-[#FFD700]/40 shadow-[0_0_25px_rgba(255,215,0,0.15)] relative overflow-hidden transition-all`}
            style={{ borderColor: driverProfileData.themeColor }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                {driverProfileData.avatarUrl ? (
                  <div className="relative">
                    <img 
                      src={driverProfileData.avatarUrl} 
                      alt={driverProfileData.displayName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 shadow-lg"
                      style={{ borderColor: driverProfileData.themeColor }}
                    />
                    <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-black/80 rounded-full text-[9px] font-bold text-amber-400 border border-amber-400">
                      LV.{driverLevel}
                    </div>
                  </div>
                ) : (
                  <NeonProfileAvatar 
                    level={driverLevel} 
                    emoji={driverProfileData.avatarEmoji || "🦁"} 
                    role="driver" 
                    size="lg" 
                  />
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white flex items-center gap-1.5">
                      <span>{driverProfileData.displayName}</span>
                      <Crown className="w-4 h-4 text-[#FFD700] fill-[#FFD700] animate-pulse" />
                    </h3>
                  </div>
                  <p className="text-[10px] text-amber-200/90 font-mono mt-0.5 line-clamp-1">
                    {driverProfileData.bioStatus}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(950);
                        setShowProfileCustomizerModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 hover:bg-cyan-500/30 transition-all cursor-pointer shadow-sm"
                    >
                      <span>🎨 แต่งโปรไฟล์</span>
                    </button>
                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(950);
                        setTiersModalInitialRole('knight');
                        setShowTiersModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/50 hover:bg-[#FFD700]/30 shadow-[0_0_10px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
                    >
                      <Award className="w-3 h-3 text-[#FFD700]" />
                      <span>{getDriverRankTitle(driverLevel)} (LVL {driverLevel})</span>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-bold ml-0.5">10 TIERS</span>
                    </button>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <CreditCard className="w-3 h-3" />
                      เครดิตการเงิน: {driverCreditScore}/850 (AAA Sovereign Perfect)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    ID: <strong className="text-cyan-300">KNIGHT-SOVEREIGN-001</strong> • Thonburi Sector 4 [ALL UNLOCKED ⚡]
                  </p>
                </div>
              </div>

              {/* Driver Financial Credit Score Mini Widget */}
              <div 
                onClick={() => {
                  if (audioEnabled) playTactileBlip(900);
                  setActiveDriverTab('wallet');
                }}
                className="cursor-pointer p-2 rounded-2xl bg-black/50 border border-emerald-500/40 hover:border-emerald-400 transition-all text-right group"
              >
                <span className="text-[9px] font-mono text-slate-400 block group-hover:text-emerald-300">คะแนนเครดิตอัศวิน</span>
                <div className="text-sm font-black text-emerald-400 font-mono flex items-center justify-end gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{driverCreditScore}</span>
                  <span className="text-[9px] text-slate-400">/850</span>
                </div>
                <span className="text-[8px] font-mono text-[#FFD700] block">วงเงินฉุกเฉิน ฿{emergencyCreditAvailable.toLocaleString()}</span>
              </div>
            </div>

            {/* TWO CRITICAL BANNERS: 1) ACTIVE DISPATCH VEHICLE & 2) EQUIPPED ARMOR SUIT */}
            <div className="mt-3 space-y-2">
              {/* ACTIVE DISPATCH BIKE BANNER (ALLOWS SWITCHING ANYTIME) */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-r from-[#081830] to-[#0D2447] border border-[#00D2FF]/60 flex items-center justify-between gap-2 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00D2FF] to-blue-600 flex items-center justify-center text-slate-950 font-black text-base shadow-[0_0_12px_rgba(0,210,255,0.4)]">
                    {activeVehicle.iconEmoji || '🛵'}
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>ACTIVE DISPATCH BIKE (รถที่ใช้รับงานปัจจุบัน)</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{activeVehicle.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-amber-300 font-mono border border-amber-400/30">
                        {activeVehicle.plateNumber}
                      </span>
                    </div>
                    <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-2">
                      <span>⚡ {activeVehicle.displacement || '110cc'}</span>
                      <span>•</span>
                      <span>⛽ {activeVehicle.fuel}%</span>
                      <span>•</span>
                      <span>🌟 {activeVehicle.mileage}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    setShowSwitchVehicleModal(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-500 hover:brightness-110 text-slate-950 text-xs font-black shadow-[0_0_12px_rgba(0,210,255,0.3)] transition-all flex items-center gap-1.5 flex-shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>สลับรถ</span>
                </button>
              </div>

              {/* CURRENT EQUIPPED ARMOR SET STATUS BANNER */}
              <div className="p-2.5 rounded-2xl bg-[#070E22]/90 border border-cyan-500/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold text-sm shadow-md">
                    🛡️
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>EQUIPPED ARMOR & HELMET</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <div className="text-xs font-bold text-white line-clamp-1">
                      {equippedSuit.name}
                    </div>
                    <div className="text-[10px] text-amber-300 font-mono">
                      🧥 {equippedSuit.jacket.name.slice(0, 26)}... | 🪖 {equippedSuit.helmet.name.slice(0, 24)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(950);
                      setShowArmorShowcaseModal(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-bold border border-amber-500/40 transition-all flex items-center gap-1"
                    title="ดูตัวอย่างชุดเกราะเลเวล 1-70 (71-100 ยังไม่เปิดเผย)"
                  >
                    <Eye className="w-3 h-3" />
                    <span>ตัวอย่างเกราะ 1-70 (71-100 ลับ 🔒)</span>
                  </button>

                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(900);
                      setActiveDriverTab('cabinet');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-[10px] font-bold border border-cyan-500/40 transition-all flex items-center gap-1"
                  >
                    <span>ตู้เกราะ</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* DYNAMIC XP LEVEL PROGRESS BAR (PROGRESSIVE PROPORTIONAL SCALING) */}
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>หลอด XP อัศวิน (LV.{driverLevel}): <strong className="text-white">{driverXp.toLocaleString()} / {driverNextXp.toLocaleString()} XP</strong></span>
                  <span className="text-[10px] text-cyan-300">({Math.round((driverXp / driverNextXp) * 100)}%)</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${driverDifficultyMetrics.badgeColor}`}>
                    {driverDifficultyMetrics.icon} {driverDifficultyMetrics.difficultyLabel} ({driverDifficultyMetrics.difficultyIndex})
                  </span>
                  <span className="text-amber-400 font-bold text-[11px]">
                    {driverLevel >= 100 ? '👑 GODLIKE SOVEREIGN' : `สู่ LV.${driverLevel + 1}`}
                  </span>
                </div>
              </div>

              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-white/10 p-0.5 relative">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-[#FFD700] transition-all duration-500 relative shadow-[0_0_12px_rgba(0,210,255,0.6)]" 
                  style={{ width: `${Math.min(100, Math.max(5, (driverXp / driverNextXp) * 100))}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{driverLevel >= 100 ? '👑 คะแนนเต็มเพดานสูงสุด' : `ขาดอีก ${(driverNextXp - driverXp).toLocaleString()} XP ถึงเลเวล ${driverLevel + 1}`}</span>
                <span className="text-cyan-400 font-bold">{driverDifficultyMetrics.growthRateText}</span>
              </div>

              {/* QUICK DRIVER XP MISSION ACTIONS */}
              <div className="pt-2 border-t border-white/5 space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-cyan-300 font-bold">ภารกิจเก็บ XP อัศวิน (อัตราความยากตามสัดส่วนเลเวล):</span>
                  <span className="text-amber-300">กดรับ XP ได้เลย</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleGainDriverXp(100, "รับส่งผู้โดยสารสำเร็จ 1 ทริป")}
                    className="p-1.5 rounded-xl bg-black/40 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-400 text-left transition-all flex items-center justify-between"
                  >
                    <span>🛵 วิ่งส่งคน</span>
                    <span className="text-cyan-300 font-bold">+100 XP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGainDriverXp(250, "สวมใส่ชุดเกราะเต็มยศ")}
                    className="p-1.5 rounded-xl bg-black/40 hover:bg-amber-950/60 border border-white/10 hover:border-amber-400 text-left transition-all flex items-center justify-between"
                  >
                    <span>🛡️ เกราะเต็มยศ</span>
                    <span className="text-amber-300 font-bold">+250 XP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGainDriverXp(150, "ส่งพัสดุด่วนร้านค้า")}
                    className="p-1.5 rounded-xl bg-black/40 hover:bg-emerald-950/60 border border-white/10 hover:border-emerald-400 text-left transition-all flex items-center justify-between"
                  >
                    <span>📦 ส่งพัสดุด่วน</span>
                    <span className="text-emerald-300 font-bold">+150 XP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGainDriverXp(120, "ได้รับรีวิว 5 ดาว")}
                    className="p-1.5 rounded-xl bg-black/40 hover:bg-yellow-950/60 border border-white/10 hover:border-yellow-400 text-left transition-all flex items-center justify-between"
                  >
                    <span>⭐ รีวิว 5 ดาว</span>
                    <span className="text-yellow-300 font-bold">+120 XP</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3D RADAR 2.5KM QUICK ACTION STRIP */}
          <div className="mb-3">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(950);
                setShowDriverRadarModal(true);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#071F3D] via-[#0A2E5C] to-[#081B33] hover:from-[#092B54] hover:to-[#0D3B75] border border-[#00D2FF]/70 text-white flex items-center justify-between shadow-[0_0_15px_rgba(0,210,255,0.25)] transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5 text-left min-w-0">
                <div className="w-8 h-8 rounded-xl bg-cyan-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow-[0_0_10px_#00D2FF]">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-cyan-300 flex items-center gap-1.5 font-mono leading-tight truncate">
                    <span>3D DENSITY RADAR (2.5 KM)</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-300 truncate">
                    สแกนความหนาแน่นผู้โดยสาร & งานรอบตัวแบบ 360°
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-cyan-400 text-slate-950 font-mono flex-shrink-0 group-hover:scale-105 transition-transform">
                เปิดเรดาร์ 3D
              </span>
            </button>
          </div>

          {/* MAIN TABS SWITCHER (Consolidated: Standby/Radar Jobs, Navigation GPS Map, Profile & Arsenal, Quests, Garage, Cabinet, Calculator, Installment, Wallet) */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 p-1.5 bg-black/50 rounded-2xl border border-white/10 mb-4 text-center">
            {[
              { id: 'jobs' as const, label: '📡 เรดาร์รับงาน', icon: <Radio className="w-4 h-4 mx-auto text-[#00D2FF]" />, isHot: true },
              { id: 'navigation' as const, label: '🗺️ แผนที่นำทาง', icon: <Navigation className="w-4 h-4 mx-auto text-emerald-400" />, isHot: true },
              { id: 'profile' as const, label: '👤 โปรไฟล์พี่วิน', icon: <User className="w-4 h-4 mx-auto text-[#FFD700]" />, isHot: false },
              { id: 'quests' as const, label: '🎯 ภารกิจ XP', icon: <Target className="w-4 h-4 mx-auto text-[#FFD700]" />, isHot: true },
              { id: 'garage' as const, label: 'อู่รถ (GARAGE)', icon: <Wrench className="w-4 h-4 mx-auto" /> },
              { id: 'cabinet' as const, label: 'ตู้ชุดเกราะ', icon: <Shirt className="w-4 h-4 mx-auto" /> },
              { id: 'calculator' as const, label: '2฿ ENGINE', icon: <Calculator className="w-4 h-4 mx-auto" /> },
              { id: 'installment' as const, label: '4฿ GEAR PAY', icon: <Zap className="w-4 h-4 mx-auto" /> },
              { id: 'wallet' as const, label: 'กระเป๋าเงิน', icon: <Coins className="w-4 h-4 mx-auto" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setActiveDriverTab(tab.id as any);
                }}
                className={`relative py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                  activeDriverTab === tab.id
                    ? 'bg-[#00D2FF] text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab.isHot && (
                  <span className="absolute -top-1 right-1 px-1 py-0.2 rounded-full bg-[#FFD700] text-slate-950 font-black text-[7px] leading-tight">
                    NEW
                  </span>
                )}
                {tab.icon}
                <span className="block text-[10px] mt-0.5 leading-tight font-mono">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="space-y-4">
            
            {/* -2. DRIVER FULL PROFILE & SOVEREIGN STATUS TAB */}
            {activeDriverTab === 'profile' && (
              <div className="space-y-4">
                {/* Profile Detail Spotlight */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0E2248] via-[#091530] to-[#070D1E] border-2 border-[#FFD700]/60 shadow-[0_0_35px_rgba(255,215,0,0.2)] space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFD700]/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <NeonProfileAvatar 
                        level={driverLevel} 
                        emoji="🦁" 
                        role="driver" 
                        size="lg" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <span>กิตติ อินทะสร้อย</span>
                            <Crown className="w-5 h-5 text-[#FFD700] fill-[#FFD700] animate-pulse" />
                          </h3>
                        </div>
                        <p className="text-xs text-cyan-300 font-mono">Kitti Inthasoi • Thonburi Sector 4</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40">
                            {getDriverRankTitle(driverLevel)} (LV.{driverLevel})
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            เครดิต {driverCreditScore}/850 (AAA)
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(950);
                        setTiersModalInitialRole('knight');
                        setShowTiersModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FFD700] to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Award className="w-4 h-4" />
                      <span>ดูบันทึก 10 ลำดับเกียรติยศ</span>
                    </button>
                  </div>

                  {/* PROMPTPAY QR QUICK ACTION BANNER IN PROFILE */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#2A1F06]/80 via-[#3D2C08]/90 to-[#1E1604]/80 border border-[#FFD700]/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-xl bg-[#FFD700] text-slate-950 flex items-center justify-center font-black shadow-[0_0_10px_#FFD700] flex-shrink-0">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#FFD700] font-mono">PROMPTPAY DIRECT QR (วินรับเต็ม 100%)</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-mono">0% GP</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          แสดง QR ให้ผู้โดยสารสแกนจ่ายเงินทันที ไม่หักเปอร์เซ็นต์ เงินเข้ากระเป๋าวินเรียลไทม์
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(950);
                        setShowDriverQrModal(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#FFD700] hover:bg-amber-400 text-slate-950 font-black text-xs font-mono shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 flex-shrink-0"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>แสดง QR สแกนรับเงิน</span>
                    </button>
                  </div>

                  {/* Badges & Statistics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
                      <div className="text-[10px] text-slate-400">สถานะวิน</div>
                      <div className="text-sm font-black text-emerald-400">🟢 พร้อมรับงาน 24 ชม.</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
                      <div className="text-[10px] text-slate-400">ดาวและความพึงพอใจ</div>
                      <div className="text-sm font-black text-[#FFD700]">⭐ 5.00 / 5.0 (980 รีวิว)</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
                      <div className="text-[10px] text-slate-400">รอบวิ่งสำเร็จทั้งหมด</div>
                      <div className="text-sm font-black text-cyan-300">2,480+ เที่ยว</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
                      <div className="text-[10px] text-slate-400">สิทธิคุ้มครองประกันภัย</div>
                      <div className="text-sm font-black text-purple-300">คุ้มครอง 100% สองชั้น</div>
                    </div>
                  </div>

                  {/* Dispatch Bike & Equipped Suit Summaries */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-cyan-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
                          {activeVehicle.iconEmoji || '🛵'}
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-cyan-300 block">ยานพาหนะรับงานหลัก</span>
                          <span className="text-xs font-bold text-white">{activeVehicle.name} ({activeVehicle.plateNumber})</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setActiveDriverTab('garage');
                        }}
                        className="text-[10px] text-cyan-300 hover:text-white underline font-mono"
                      >
                        เปลี่ยนรถ
                      </button>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#FFD700] text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
                          🛡️
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-amber-300 block">ชุดเกราะที่สวมใส่</span>
                          <span className="text-xs font-bold text-white truncate max-w-[150px] block">{equippedSuit.name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setActiveDriverTab('cabinet');
                        }}
                        className="text-[10px] text-amber-300 hover:text-white underline font-mono"
                      >
                        เปลี่ยนเกราะ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -1. GPS NAVIGATION MAP TAB (หน้าจอแผนที่ระหว่างพี่วินไปหาลูกค้าหรือเป้าหมาย) */}
            {activeDriverTab === 'navigation' && (
              <div className="space-y-4">
                <KnightNavigationMapScreen
                  activeVehicle={activeVehicle}
                  driverLevel={driverLevel}
                  audioEnabled={audioEnabled}
                  onClose={() => setActiveDriverTab('jobs')}
                  onGainXp={(amount: number, reason: string) => handleGainDriverXp(amount, reason)}
                  onCompleteTrip={(job) => {
                    handleGainDriverXp(job.xpReward, `ส่งผู้โดยสารสำเร็จ: ${job.customerName}`);
                    setBalance(prev => prev + job.netFare);
                    setRidesPaid(prev => Math.min(prev + 1, totalRidesDebt));
                  }}
                />
              </div>
            )}
            
            {/* 0. ARMOR CABINET TAB (ตู้ชุดเกราะอัศวิน: รวมคลังเกราะ 7 แบบ และ ARMOR LAB) */}
            {activeDriverTab === 'cabinet' && (
              <ArmorCabinetView
                equippedSuitId={equippedSuitId}
                onEquipSuit={(suit) => handleEquipSuit(suit)}
                audioEnabled={audioEnabled}
              />
            )}
            
            {/* 1. MY GARAGE TAB (WITH ACTIVE VEHICLE SWITCHING ENGINE) */}
            {activeDriverTab === 'garage' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" />
                    MY GARAGE & FLEET DISPATCH ({vehicles.length} VEHICLES)
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    สลับรถรับงานได้ตลอดเวลา
                  </span>
                </div>

                {/* SPOTLIGHT HERO: CURRENTLY ACTIVE DISPATCH BIKE */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0B2046] via-[#091530] to-[#070D1E] border-2 border-[#00D2FF] shadow-[0_0_25px_rgba(0,210,255,0.25)] relative overflow-hidden space-y-3">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00D2FF] to-blue-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg">
                        {activeVehicle.iconEmoji || '🛵'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            คันหลักที่กำลังรับงาน (ACTIVE ON DUTY)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-cyan-400 text-slate-950">
                            {activeVehicle.brand || 'HONDA'}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-white">
                            {activeVehicle.modelName || activeVehicle.name}
                          </h3>
                        </div>
                        <div className="text-xs text-amber-300 font-mono mt-1 flex items-center gap-2">
                          <span>ทะเบียน: <strong className="text-white">{activeVehicle.plateNumber}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <button
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(850);
                          setSelectedInspectVehicle(activeVehicle);
                        }}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 hover:text-white text-xs font-bold border border-cyan-500/30 transition-all flex items-center gap-1"
                      >
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>ดูรายละเอียด</span>
                      </button>

                      <button
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(900);
                          setShowSwitchVehicleModal(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-500 hover:brightness-110 text-slate-950 text-xs font-black shadow-md flex items-center gap-1 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>สลับรถ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* LIST OF ALL REGISTERED VEHICLES (DREAM RIDES: SHOW BRAND & MODEL + VIEW DETAILS BUTTON) */}
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                    <span>รถในฝัน & ยานรบในอู่ ({vehicles.length} คัน):</span>
                    <span className="text-cyan-400 text-[11px]">โชว์แบรนด์และยี่ห้อ • กดดูรายละเอียดได้ทุกคัน</span>
                  </div>

                  {vehicles.map((v) => {
                    const isActive = v.id === activeVehicleId;
                    const brand = v.brand || (v.name.startsWith('Honda') ? 'HONDA' : v.name.startsWith('Deco') ? 'DECO' : 'YAMAHA');
                    const model = v.modelName || v.name;

                    return (
                      <div
                        key={v.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3 shadow-md ${
                          isActive 
                            ? 'border-[#00D2FF] bg-[#0A1A38]/90 ring-2 ring-[#00D2FF]/40' 
                            : 'border-white/10 bg-[#070D1E] hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl sm:text-3xl">{v.iconEmoji || '🏍️'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                                  {brand}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-amber-300 font-mono border border-amber-400/30">
                                  {v.plateNumber}
                                </span>
                              </div>
                              <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                                {model}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* VIEW DETAILS BUTTON */}
                            <button
                              onClick={() => {
                                if (audioEnabled) playTactileBlip(850);
                                setSelectedInspectVehicle(v);
                              }}
                              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold border border-white/10 hover:border-cyan-400/40 transition-all flex items-center gap-1"
                            >
                              <Info className="w-3.5 h-3.5 text-cyan-400" />
                              <span>ดูรายละเอียด</span>
                            </button>

                            {/* SWITCH / ACTIVE BUTTON */}
                            {isActive ? (
                              <span className="text-xs font-black px-3 py-2 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-500 text-slate-950 shadow-md flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">กำลังใช้งานรับงาน</span>
                                <span className="sm:hidden">กำลังใช้งาน</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSwitchActiveVehicle(v.id)}
                                className="text-xs font-bold px-3 py-2 rounded-xl bg-white/10 hover:bg-[#00D2FF] hover:text-slate-950 text-cyan-300 border border-cyan-400/40 hover:border-cyan-300 transition-all flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>สลับเป็นคันรับงาน</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* + Add New Dream Ride Button matching image */}
                <button
                  onClick={() => setShowAddRideModal(true)}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#FFD700]/60 hover:border-[#FFD700] bg-[#FFD700]/5 hover:bg-[#FFD700]/15 text-[#FFD700] text-xs font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.1)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Dream Ride (เพิ่มยานรบในอู่)</span>
                </button>
              </div>
            )}

            {/* 2. 2-BAHT EMPIRE CALCULATOR TAB */}
            {activeDriverTab === 'calculator' && (
              <TwoBahtEmpireCalculator audioEnabled={audioEnabled} />
            )}

            {/* 3. 4-BAHT ARMOR INSTALLMENT TAB */}
            {activeDriverTab === 'installment' && (
              <ArmorInstallmentFourBahtModel audioEnabled={audioEnabled} />
            )}

            {/* 6. WALLET & EQUIPMENT TAB (Matches IMG_6075 + Upgraded Armor/Helmet Cards) */}
            {activeDriverTab === 'wallet' && (
              <div className="space-y-4">
                {/* Credit Toast Notification */}
                {creditToast && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-xs text-center shadow-xl border border-white/30 animate-bounce">
                    {creditToast}
                  </div>
                )}

                {/* CURRENT BALANCE & WITHDRAW (IMG_6075) */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0F224A] via-[#091530] to-[#070D1E] border border-[#00D2FF]/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-300 font-bold">CURRENT BALANCE</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      INSTANT 24/7 PAYOUT
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-black text-white tracking-tight">
                      ฿{balance.toLocaleString()}.00
                    </div>
                    <span className="text-xs text-slate-400 font-mono">THB CURRENCY</span>
                  </div>

                  <button
                    onClick={handleWithdraw}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FFD700] via-amber-500 to-[#FFD700] hover:brightness-110 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all flex items-center justify-center gap-2 border border-white/40"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Withdraw Now (ถอนเงินสดเข้าบัญชี)</span>
                  </button>
                </div>

                {/* KNIGHT FINANCIAL CREDIT SCORE CARD (คะแนนเครดิตทางการเงินอัศวิน) */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0D2447] via-[#091633] to-[#070E22] border-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>คะแนนเครดิตทางการเงินอัศวิน</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                            TIER AAA (SOVEREIGN)
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-300 font-mono">KNIGHT FINANCIAL CREDIT SCORE ENGINE</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-400 font-mono flex items-center justify-end gap-1">
                        <TrendingUp className="w-5 h-5" />
                        <span>{driverCreditScore}</span>
                        <span className="text-xs text-slate-400 font-normal">/850</span>
                      </div>
                      <span className="text-[9px] text-emerald-300 font-mono font-bold">สถานะ: เครดิตดีเยี่ยมระดับสูงสุด</span>
                    </div>
                  </div>

                  {/* Visual Credit Score Progress Bar */}
                  <div className="space-y-1.5 font-mono">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">เกณฑ์คะแนน (300 - 850):</span>
                      <span className="text-cyan-300 font-bold">เหนือกว่า 96.8% ของผู้ขับขี่ในระบบ</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-white/10 p-0.5 relative">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 transition-all duration-700 relative"
                        style={{ width: `${Math.min(100, Math.max(10, ((driverCreditScore - 300) / 550) * 100))}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {/* Key Financial Metrics Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                      <div className="text-[10px] text-slate-400">ประวัติผ่อนชำระ 4฿ & 2฿:</div>
                      <div className="text-sm font-bold text-emerald-400">100% ตรงเวลา</div>
                      <div className="text-[9px] text-slate-400">ชำระครบ 20 รอบต่อเนื่องทุกวัน</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                      <div className="text-[10px] text-slate-400">วงเงินฉุกเฉิน 0% ดอกเบี้ย:</div>
                      <div className="text-sm font-bold text-[#FFD700]">฿{emergencyCreditAvailable.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-400">จากวงเงินอนุมัติ ฿{emergencyCreditLimit.toLocaleString()}</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                      <div className="text-[10px] text-slate-400">กองทุนสวัสดิการ & เงินออม:</div>
                      <div className="text-sm font-bold text-cyan-300">฿14,250</div>
                      <div className="text-[9px] text-slate-400">สะสมจากทริปอัศวิน</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                      <div className="text-[10px] text-slate-400">วงเงินซ่อมบำรุงล่วงหน้า:</div>
                      <div className="text-sm font-bold text-amber-300">฿8,000</div>
                      <div className="text-[9px] text-slate-400">เปลี่ยนยาง/น้ำมันเครื่องที่ศูนย์</div>
                    </div>
                  </div>

                  {/* Interactive Micro-Credit Actions */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">สิทธิประโยชน์และภารกิจเครดิต:</span>
                      <span className="text-[10px] text-cyan-300">กดรับสิทธิ์ได้ทันที</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleDrawEmergencyCredit(5000)}
                        className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-cyan-950/70 hover:from-emerald-900/90 hover:to-cyan-900/90 border border-emerald-500/50 hover:border-emerald-400 text-left transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                            <Banknote className="w-4 h-4" />
                            <span>เบิกสินเชื่อฉุกเฉิน ฿5,000</span>
                          </div>
                          <div className="text-[10px] text-slate-300">ดอกเบี้ย 0% เข้ากระเป๋าทันที</div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-emerald-500 text-slate-950">
                          กดเบิก
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBoostDriverCredit(10, "ผ่อนชุดเกราะตรงรอบเวลา")}
                        className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/70 to-yellow-950/70 hover:from-amber-900/90 hover:to-yellow-900/90 border border-amber-500/50 hover:border-amber-400 text-left transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-amber-300 flex items-center gap-1.5">
                            <Zap className="w-4 h-4" />
                            <span>จำลองผ่อนเกราะตรงเวลา</span>
                          </div>
                          <div className="text-[10px] text-slate-300">สร้างประวัติเครดิตชั้น 1</div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-[#FFD700] text-slate-950">
                          +10 แต้ม
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Financial Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(900);
                      setActiveDriverTab('calculator');
                    }}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0C1E3C] to-[#081326] border border-[#FFD700]/40 hover:border-[#FFD700] text-left transition-all space-y-1 shadow-md group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#FFD700]">
                      <span className="flex items-center gap-1.5 font-mono">
                        <Calculator className="w-4 h-4" />
                        เครื่องคำนวณ "2 บาทครองเมือง"
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#FFD700] group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[10px] text-slate-300">
                      เปรียบเทียบเงินเก็บเพิ่มขึ้นต่อเดือน/ปี ระหว่าง Flat Fee 2฿ VS หัก GP 25%
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(900);
                      setActiveDriverTab('installment');
                    }}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0A2238] to-[#061524] border border-cyan-400/40 hover:border-cyan-400 text-left transition-all space-y-1 shadow-md group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                      <span className="flex items-center gap-1.5 font-mono">
                        <Zap className="w-4 h-4" />
                        โมเดลผ่อนเกราะ 4฿ (20 รอบ)
                      </span>
                      <ChevronRight className="w-4 h-4 text-cyan-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[10px] text-slate-300">
                      หัก 4฿ เฉพาะ 20 รอบแรก/วัน (รอบที่ 21+ ฟรี!) ผ่อนครบ 45 วันรับกรรมสิทธิ์ 100%
                    </p>
                  </button>
                </div>

                {/* EQUIPMENT STATUS GRID (Including Armor Shirt & Helmet) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4" />
                      EQUIPMENT STATUS (สถานะชุดเกราะ & อุปกรณ์)
                    </h4>
                    <button
                      onClick={() => setActiveDriverTab('armor')}
                      className="text-[10px] text-cyan-300 hover:underline font-mono"
                    >
                      ปรับแต่ง &rarr;
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* 1. ARMOR SHIRT / JACKET */}
                    <div className="p-3 rounded-2xl bg-[#0D1C38] border border-cyan-500/40 space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 mb-1">
                        <Shirt className="w-4 h-4" />
                      </div>
                      <div className="text-[11px] font-bold text-white">WIN Armor (เสื้อ)</div>
                      <p className="text-[9px] text-slate-400 line-clamp-1">{equippedSuit.jacket.name}</p>
                      <span className="text-[9px] font-mono text-emerald-400 block font-bold">● Active 100%</span>
                    </div>

                    {/* 2. SMART HELMET */}
                    <div className="p-3 rounded-2xl bg-[#0D1C38] border border-amber-500/40 space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 mb-1">
                        <HardHat className="w-4 h-4" />
                      </div>
                      <div className="text-[11px] font-bold text-white">WIN Helmet (หมวก)</div>
                      <p className="text-[9px] text-slate-400 line-clamp-1">{equippedSuit.helmet.name}</p>
                      <span className="text-[9px] font-mono text-cyan-400 block font-bold">● HUD Synced</span>
                    </div>

                    {/* 3. BLUETOOTH COMMS */}
                    <div className="p-3 rounded-2xl bg-[#0D1C38] border border-purple-500/40 space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 mb-1">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <div className="text-[11px] font-bold text-white">WIN Headset</div>
                      <p className="text-[9px] text-slate-400">WIN-Comm Pro 3.0</p>
                      <span className="text-[9px] font-mono text-emerald-400 block font-bold">● Connected</span>
                    </div>

                    {/* 4. PRO GLOVES */}
                    <div className="p-3 rounded-2xl bg-[#0D1C38] border border-cyan-500/30 space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 mb-1">
                        <Hand className="w-4 h-4" />
                      </div>
                      <div className="text-[11px] font-bold text-white">WIN Pro Gloves</div>
                      <p className="text-[9px] text-slate-400">Carbon & NFC</p>
                      <span className="text-[9px] font-mono text-emerald-400 block font-bold">● Operational</span>
                    </div>

                    {/* 5. GUARDIAN PLATES */}
                    <div className="p-3 rounded-2xl bg-[#0D1C38] border border-emerald-500/30 space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 mb-1">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="text-[11px] font-bold text-white">Guardian Plates</div>
                      <p className="text-[9px] text-slate-400">D3O Knee Guards</p>
                      <span className="text-[9px] font-mono text-emerald-400 block font-bold">● Mounted</span>
                    </div>

                    {/* 6. VIBRATION MOUNT */}
                    <div className="p-3 rounded-2xl bg-[#0D1C38] border border-blue-500/30 space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-300 mb-1">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="text-[11px] font-bold text-white">WIN-Grip Mount</div>
                      <p className="text-[9px] text-slate-400">CNC 7075 Damper</p>
                      <span className="text-[9px] font-mono text-cyan-400 block font-bold">● Qi2 Charging</span>
                    </div>
                  </div>
                </div>

                {/* EQUIPMENT DEBT REPAYMENT (5 / 35 RIDES PAID) */}
                <div className="p-4 rounded-2xl bg-[#0C172E] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">EQUIPMENT DEBT REPAYMENT</span>
                    <span className="text-[#00D2FF] font-bold">{ridesPaid} / {totalRidesDebt} RIDES PAID</span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-black/60 overflow-hidden border border-white/10 p-[1px]">
                    <div 
                      className="h-full rounded-full bg-[#00D2FF] shadow-[0_0_10px_#00D2FF] transition-all duration-500" 
                      style={{ width: `${(ridesPaid / totalRidesDebt) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    โมเดล 0 บาทรับเกราะ: หักชำระอัตโนมัติเพียงรอบละ 10 บาทต่อเที่ยว เมื่อครบ 35 รอบ เกราะจะเป็นกรรมสิทธิ์ของอัศวิน 100%
                  </p>
                </div>

                {/* DAILY DEDUCTIONS (Platform fee, Armor, Insurance) */}
                <div className="p-4 rounded-2xl bg-[#091224] border border-white/10 space-y-2 text-xs">
                  <h5 className="font-bold text-slate-300 text-[11px] font-mono uppercase">
                    DAILY DEDUCTIONS (แจกแจงค่าใช้จ่ายรายวัน)
                  </h5>

                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Platform Flat Fee (1฿ ต่อเที่ยว x 75 เที่ยว)</span>
                      <span className="text-rose-400 font-bold">-฿75.00</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Armor Installment (ผ่อนชุดเกราะ)</span>
                      <span className="text-rose-400 font-bold">-฿150.00</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Welfare & Retirement Fund (สวัสดิการเกษียณ)</span>
                      <span className="text-rose-400 font-bold">-฿40.00</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold text-emerald-400">
                    <span>รายได้สุทธิวันนี้ (Net Day Payout):</span>
                    <span>+฿3,585.00</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. LIVE JOBS & DISPATCH TAB (STANDBY RADAR & FAIR PROXIMITY DISPATCH) */}
            {activeDriverTab === 'jobs' && (
              <div className="space-y-4">
                {/* STANDBY RADAR & INCOMING JOB POPUP SYSTEM */}
                <DriverStandbyAndIncomingJob
                  isOnDuty={isOnDuty}
                  onToggleDuty={(duty) => setIsOnDuty(duty)}
                  activeVehicle={activeVehicle}
                  driverLevel={driverLevel}
                  driverCreditScore={driverCreditScore}
                  audioEnabled={audioEnabled}
                  onAcceptJob={(job: IncomingJobData) => {
                    // Job accepted
                  }}
                  onGainXp={(amount, reason) => handleGainDriverXp(amount, reason)}
                  onAddEarnings={(amount) => {
                    setBalance(prev => prev + amount);
                    setRidesPaid(prev => Math.min(prev + 1, totalRidesDebt));
                  }}
                />

                {/* ADDITIONAL DISPATCH POOL SECTION */}
                <div className="pt-2 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-[#00D2FF]" />
                      คลังคำขอรับงานพิเศษในพื้นที่ (Special Fleet Dispatch Pool)
                    </h4>
                    <span className="text-[10px] text-amber-300 font-mono">
                      📍 สุ่มตามระยะทางใกล้สุดอันดับ 1
                    </span>
                  </div>

                  {/* LEVEL 10+ PET CARE CERTIFICATION STATUS BANNER */}
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    driverLevel >= 10 
                      ? 'bg-amber-950/30 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-rose-950/30 border-rose-500/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🐾</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">
                              ใบอนุญาตรับงาน WIN-Pet Care
                            </span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              driverLevel >= 10 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              {driverLevel >= 10 ? '✅ ผ่านเกณฑ์ (LEVEL 10+)' : `🔒 ล็อค (ต้องการ LEVEL 10+)`}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            {driverLevel >= 10 
                              ? `คุณมีเลเวล ${driverLevel} (${getDriverRankTitle(driverLevel).split('(')[0].trim()}) มีสิทธิ์รับงานสัตว์เลี้ยงพร้อมกล่อง WIN-Pet Pod`
                              : `พี่วินที่รับงาน WIN-Pet Care ต้องมีเลเวล 10 ขึ้นไป (คุณอยู่ในเลเวล ${driverLevel} ขาดอีก ${10 - driverLevel} เลเวล)`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(850);
                          setDriverLevel(prev => prev < 10 ? 10 : 5);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-mono text-cyan-300 border border-white/10 whitespace-nowrap transition-colors"
                        title="กดเพื่อทดสอบสลับเลเวลต่ำกว่า 10 หรือ 10+"
                      >
                        {driverLevel >= 10 ? '⚡ ทดสอบเลเวล 5 (<10)' : '⚡ ทดสอบเลเวล 10 (≥10)'}
                      </button>
                    </div>
                  </div>

                {/* WIN-PET CARE JOB 1 (HOSPITAL EMERGENCY) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  driverLevel >= 10
                    ? 'bg-gradient-to-r from-amber-950/40 via-[#0E1B33] to-[#0A1428] border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-900/60 border-slate-700/50 opacity-80'
                } space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm">
                        🐾 🏥
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-amber-300">
                            WIN-Pet Care: ส่งน้องหมาด่วนไป รพ.สัตว์ทองหล่อ (24 ชม.)
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-300">
                          จุดรับ: สุขุมวิท 39 &rarr; ปลายทาง: รพ.สัตว์ทองหล่อ (1.8 กม.)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/40 font-bold">
                      ฿145.00
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    น้องหมามีไข้สูง เจ้าของต้องการนำส่งห้องฉุกเฉินด่วน อัศวินต้องเปิดระบบแอร์ในกล่อง <strong>WIN-Pet Space Pod</strong>
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      +250 XP • โบนัสดูแลสัตว์เลี้ยง +฿50
                    </span>

                    {driverLevel >= 10 ? (
                      <button
                        onClick={() => {
                          if (audioEnabled) playLevelUpFanfare();
                          alert("🐾 รับงาน WIN-Pet Care เรียบร้อย!\nระบบเปิดระบบนำทางด่วนไป 'โรงพยาบาลสัตว์ทองหล่อ (24 ชม.)'\nเปิดระบบพัดลมปรับอากาศ WIN-Pet Space Pod เรียบร้อย");
                          setBalance(prev => prev + 145);
                          handleGainDriverXp(250, "งาน WIN-Pet Care ส่งสัตว์เลี้ยงฉุกเฉิน");
                          setRidesPaid(prev => Math.min(prev + 1, totalRidesDebt));
                          confetti({ particleCount: 45, spread: 70, colors: ['#F59E0B', '#10B981', '#00D2FF'] });
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 transition-all"
                      >
                        🐾 ยืนยันรับงาน WIN-Pet Care (฿145)
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs border border-white/5 cursor-not-allowed flex items-center gap-1.5"
                        title="ต้องมีระดับ Level 10 ขึ้นไปเพื่อรับงานนี้"
                      >
                        <span>🔒 ต้องเลเวล 10+ (ขาดอีก {10 - driverLevel} LV)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* WIN-PET CARE JOB 2 (CLINIC CHECKUP) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  driverLevel >= 10
                    ? 'bg-gradient-to-r from-amber-950/30 via-[#0E1B33] to-[#0A1428] border-amber-400/40'
                    : 'bg-slate-900/60 border-slate-700/50 opacity-80'
                } space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm">
                        🐱 🩺
                      </span>
                      <div>
                        <span className="text-xs font-bold text-amber-300">
                          WIN-Pet Care: พาแมวไปฉีดวัคซีน คลินิกสัตวแพทย์สี่ขา
                        </span>
                        <div className="text-[10px] font-mono text-cyan-300">
                          จุดรับ: ซอยสุขุมวิท 31 &rarr; ปลายทาง: คลินิกสี่ขา สุขุมวิท 39 (0.9 กม.)
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/40 font-bold">
                      ฿95.00
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      +180 XP • เบาะซับแรงกระแทก
                    </span>

                    {driverLevel >= 10 ? (
                      <button
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(1000);
                          alert("🐱 รับงานส่งน้องแมวไปคลินิกสำเร็จ!\nระบบบันทึกงาน WIN-Pet Care เรียบร้อย");
                          setBalance(prev => prev + 95);
                          handleGainDriverXp(180, "งาน WIN-Pet Care คลินิกรักษาสัตว์");
                          setRidesPaid(prev => Math.min(prev + 1, totalRidesDebt));
                          confetti({ particleCount: 35, spread: 60 });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all"
                      >
                        รับงานส่งแมว (฿95)
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed"
                      >
                        🔒 ล็อค (ต้องเลเวล 10+)
                      </button>
                    )}
                  </div>
                </div>

                {/* AI BACKHAUL JOB */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
                      AI BACKHAUL MATCH DETECTED
                    </span>
                    <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                      MATCH 98.4%
                    </span>
                  </div>

                  <p className="text-xs text-slate-200">
                    ผู้โดยสารขากลับ: <strong>ซอยจรัญสนิทวงศ์ 13 &rarr; วงเวียนใหญ่ (3.2 กม.)</strong>
                  </p>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-amber-400 font-bold font-mono">รายได้คาดการณ์: ฿75.00</span>
                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(1000);
                        alert("✅ รับงาน Backhaul เรียบร้อย! ระบบ CI Map นำทางด้วยเส้นทางลัดเลี่ยงรถติดแล้ว");
                        setBalance(prev => prev + 75);
                        setRidesPaid(prev => Math.min(prev + 1, totalRidesDebt));
                        confetti({ particleCount: 30, spread: 50 });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-md"
                    >
                      ยืนยันรับงาน (Accept)
                    </button>
                  </div>
                </div>

                {/* SAFE PASS TRANSFER JOB */}
                <div className="p-4 rounded-2xl bg-[#09142B] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-purple-400" />
                      SAFE PASS TRANSFER DISPATCH
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">ตรอกกว้าง 1.2M</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    พัสดุด่วนในซอยแคบ: ต้องการให้ส่งต่อพัสดุกับ Knight-042 ที่ปากซอยวัดสังข์กระจาย
                  </p>
                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(900);
                      alert("🤝 ส่งต่องาน Safe Pass สำเร็จ! ได้รับค่าเที่ยวระยะใกล้ ฿35.00");
                      setBalance(prev => prev + 35);
                    }}
                    className="w-full py-2 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-white font-bold text-xs border border-purple-500/40 transition-colors"
                  >
                    กดรับช่วงต่อพัสดุ (Safe Pass Transfer)
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* 5. SOVEREIGN XP QUEST CENTER TAB (ภารกิจเก็บ XP พี่วิน & เครือข่าย) */}
            {activeDriverTab === 'quests' && (
              <SovereignQuestCenter
                initialRole="driver"
                driverLevel={driverLevel}
                audioEnabled={audioEnabled}
                onGainDriverXp={(amount, reason) => handleGainDriverXp(amount, reason)}
                onRewardBonusCash={(amount) => {
                  setBalance(prev => prev + amount);
                  setRidesPaid(prev => Math.min(prev + 1, totalRidesDebt));
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* INSPECT SUIT DETAIL MODAL */}
      {selectedInspectSuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0A152E] rounded-3xl border-2 border-cyan-400 p-6 shadow-[0_0_50px_rgba(0,210,255,0.4)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedInspectSuit.name}</h3>
                  <span className="text-[10px] font-mono text-cyan-300">{selectedInspectSuit.code} • {selectedInspectSuit.nameEn}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInspectSuit(null)}
                className="p-1.5 rounded-xl bg-white/10 text-slate-400 hover:text-white hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#070E20] p-3 rounded-2xl border border-white/5">
              {selectedInspectSuit.designLore}
            </p>

            {/* JACKET DETAILS */}
            <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/40 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Shirt className="w-4 h-4 text-cyan-400" />
                <span>รายละเอียดเสื้อเกราะ (Jacket Spec): {selectedInspectSuit.jacket.name}</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div>• <strong>เนื้อผ้าและวัสดุ:</strong> {selectedInspectSuit.jacket.material}</div>
                <div>• <strong>ระบบไฟเรืองแสง:</strong> {selectedInspectSuit.jacket.lighting}</div>
                <div>• <strong>ซิปอธิปไตย:</strong> {selectedInspectSuit.jacket.zipperType}</div>
                <div>• <strong>ฟีเจอร์พิเศษ:</strong> {selectedInspectSuit.jacket.specialFeature}</div>
              </div>
            </div>

            {/* HELMET DETAILS */}
            <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <HardHat className="w-4 h-4 text-amber-400" />
                <span>รายละเอียดหมวกกันน็อค (Helmet Spec): {selectedInspectSuit.helmet.name}</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div>• <strong>ชิลด์หน้าและกระจก:</strong> {selectedInspectSuit.helmet.visorType}</div>
                <div>• <strong>ระบบสื่อสารและเสียง:</strong> {selectedInspectSuit.helmet.commsIntegration}</div>
                <div>• <strong>มาตรฐานความปลอดภัย:</strong> {selectedInspectSuit.helmet.safetyStandard}</div>
                <div>• <strong>ฟังก์ชันพิเศษ:</strong> {selectedInspectSuit.helmet.specialFeature}</div>
              </div>
            </div>

            {/* STATS BARS */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">DEFENSE:</span>
                  <span className="text-cyan-300 font-bold">{selectedInspectSuit.stats.defense}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${selectedInspectSuit.stats.defense}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">AERODYNAMICS:</span>
                  <span className="text-emerald-400 font-bold">{selectedInspectSuit.stats.aerodynamics}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${selectedInspectSuit.stats.aerodynamics}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">WEATHERPROOF:</span>
                  <span className="text-blue-400 font-bold">{selectedInspectSuit.stats.weatherProof}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${selectedInspectSuit.stats.weatherProof}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">HONOR XP:</span>
                  <span className="text-amber-400 font-bold">{selectedInspectSuit.stats.sovereignHonor}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${selectedInspectSuit.stats.sovereignHonor}%` }} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedInspectSuit(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 font-semibold text-xs"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => {
                  handleEquipSuit(selectedInspectSuit);
                  setSelectedInspectSuit(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-amber-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4" />
                <span>สวมใส่ชุดเกราะนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT VEHICLE / DREAM RIDE DETAILS MODAL */}
      {selectedInspectVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0A152E] rounded-3xl border-2 border-[#00D2FF] p-6 shadow-[0_0_50px_rgba(0,210,255,0.4)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00D2FF] to-blue-600 flex items-center justify-center text-2xl shadow-lg">
                  {selectedInspectVehicle.iconEmoji || '🏍️'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-cyan-400 text-slate-950">
                      {selectedInspectVehicle.brand || 'HONDA'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-black/50 text-amber-300 font-mono border border-amber-400/40">
                      {selectedInspectVehicle.plateNumber}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {selectedInspectVehicle.modelName || selectedInspectVehicle.name}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInspectVehicle(null)}
                className="p-1.5 rounded-xl bg-white/10 text-slate-400 hover:text-white hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* Vehicle Description */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-slate-300 leading-relaxed">
              {selectedInspectVehicle.description}
            </div>

            {/* Core Specifications */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 block font-bold">ประเภท / รุ่นอัศวิน:</span>
                <span className="text-white font-semibold text-[11px]">{selectedInspectVehicle.type}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 block font-bold">ความจุ / กำลังขับเคลื่อน:</span>
                <span className="text-amber-300 font-semibold text-[11px]">{selectedInspectVehicle.displacement}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 block font-bold">เล่มทะเบียนยานพาหนะ:</span>
                <span className="text-slate-300 font-semibold text-[11px]">{selectedInspectVehicle.registrationNumber || 'DLT-TH-88291'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 block font-bold">อัตราสิ้นเปลือง / เชื้อเพลิง:</span>
                <span className="text-purple-300 font-semibold text-[11px]">{selectedInspectVehicle.fuelEconomy || '50 กม./ลิตร'}</span>
              </div>
            </div>

            {/* Telemetry Progress Gauges */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">เลขไมล์สะสม (Mileage):</span>
                <span className="text-cyan-300 font-bold">{selectedInspectVehicle.mileage}</span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">เชื้อเพลิง / แบตเตอรี่ (Fuel/Battery):</span>
                  <span className="text-emerald-400 font-bold">{selectedInspectVehicle.fuel}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full" style={{ width: `${selectedInspectVehicle.fuel}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">สุขภาพน้ำมันเครื่อง (Oil Health):</span>
                  <span className="text-amber-400 font-bold">{selectedInspectVehicle.oil}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" style={{ width: `${selectedInspectVehicle.oil}%` }} />
                </div>
              </div>
            </div>

            {/* Insurance & Legal Protection Status */}
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-emerald-300">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>{selectedInspectVehicle.insuranceStatus || 'พ.ร.บ. & ประกันภัยชั้น 1 คุ้มครองผู้โดยสาร (Active)'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedInspectVehicle(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition-all"
              >
                ปิดหน้าต่าง
              </button>

              {selectedInspectVehicle.id === activeVehicleId ? (
                <div className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>กำลังใช้งานรับงานอยู่</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    handleSwitchActiveVehicle(selectedInspectVehicle.id);
                    setSelectedInspectVehicle(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>สลับเป็นคันรับงานทันที</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK SWITCH ACTIVE VEHICLE MODAL */}
      {showSwitchVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0A152E] rounded-3xl border-2 border-[#00D2FF] p-6 shadow-[0_0_50px_rgba(0,210,255,0.4)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏍️</span>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>สลับยานรบรับงาน (Switch Active Vehicle)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                      {vehicles.length} คันในอู่
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">เลือกยานรบที่ต้องการนำออกวิ่งรับงาน ระบบจะอัปเดตข้อมูลบนแอปผู้โดยสารแบบ Real-time</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSwitchVehicleModal(false)}
                className="p-1.5 rounded-xl bg-white/10 text-slate-400 hover:text-white hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {vehicles.map((v) => {
                const isActive = v.id === activeVehicleId;
                return (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      isActive
                        ? 'border-[#00D2FF] bg-[#0C224A] ring-2 ring-[#00D2FF]/50 shadow-[0_0_20px_rgba(0,210,255,0.3)]'
                        : 'border-white/10 bg-[#070D1E] hover:border-cyan-400/50 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                          isActive ? 'bg-[#00D2FF] text-slate-950 font-black' : 'bg-white/10 text-white'
                        }`}>
                          {v.iconEmoji || '🏍️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{v.name}</h4>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-amber-300 font-mono border border-amber-400/30">
                              {v.plateNumber}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{v.type} • ซีซี: {v.displacement}</p>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-500 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-md flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>กำลังใช้งาน</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            handleSwitchActiveVehicle(v.id);
                            setShowSwitchVehicleModal(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-400/20 hover:bg-[#00D2FF] text-cyan-300 hover:text-slate-950 font-bold text-[11px] border border-cyan-400/40 hover:border-cyan-300 transition-all flex items-center gap-1 flex-shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>เลือกคันนี้</span>
                        </button>
                      )}
                    </div>

                    {/* Compact Specs Row */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[10px] font-mono">
                      <div className="bg-black/30 p-1.5 rounded-lg text-center">
                        <span className="text-slate-400 block text-[9px]">ไมล์สะสม:</span>
                        <span className="text-cyan-300 font-bold">{v.mileage}</span>
                      </div>
                      <div className="bg-black/30 p-1.5 rounded-lg text-center">
                        <span className="text-slate-400 block text-[9px]">เชื้อเพลิง/แบต:</span>
                        <span className="text-emerald-400 font-bold">{v.fuel}%</span>
                      </div>
                      <div className="bg-black/30 p-1.5 rounded-lg text-center">
                        <span className="text-slate-400 block text-[9px]">อัตราประหยัด:</span>
                        <span className="text-purple-300 font-bold">{v.fuelEconomy?.slice(0, 10) || '50 กม./ลิตร'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setShowSwitchVehicleModal(false);
                  setShowAddRideModal(true);
                }}
                className="px-3 py-2 rounded-xl bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] text-xs font-bold border border-[#FFD700]/40 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มยานรบคันใหม่</span>
              </button>

              <button
                onClick={() => setShowSwitchVehicleModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddRideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleAddVehicle} className="relative w-full max-w-md bg-[#0A1428] rounded-3xl border-2 border-[#FFD700] p-6 shadow-[0_0_40px_rgba(255,215,0,0.3)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏍️</span>
                <h3 className="text-base font-bold text-[#FFD700]">เพิ่มยานรบในอู่ (New Dream Ride)</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddRideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">ชื่อรุ่นรถจักรยานยนต์:</label>
                <input
                  type="text"
                  required
                  value={newRideName}
                  onChange={(e) => setNewRideName(e.target.value)}
                  placeholder="เช่น Yamaha XMAX 300, Honda ADV350, Vespa GTS 300"
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">ป้ายทะเบียน:</label>
                  <input
                    type="text"
                    required
                    value={newRidePlate}
                    onChange={(e) => setNewRidePlate(e.target.value)}
                    placeholder="เช่น 2ขง 9988 กทม."
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">ขนาดกระบอกสูบ (cc):</label>
                  <input
                    type="text"
                    value={newRideDisplacement}
                    onChange={(e) => setNewRideDisplacement(e.target.value)}
                    placeholder="เช่น 292 cc"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">หมวดหมู่ยานรบ:</label>
                <select
                  value={newRideCategory}
                  onChange={(e) => {
                    const cat = e.target.value as any;
                    setNewRideCategory(cat);
                    if (cat === 'commuter') setNewRideType('Daily Commuter & Capillary Specialist');
                    else if (cat === 'touring') setNewRideType('Adventure Long-Distance Beast');
                    else if (cat === 'scooter') setNewRideType('VIP Super-Scooter First Class');
                    else if (cat === 'ev') setNewRideType('EV Clean Knight Fleet');
                    else setNewRideType('Sport Performance');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                >
                  <option value="scooter">สกู๊ตเตอร์พรีเมียม (Scooter / Maxi-Scooter)</option>
                  <option value="commuter">รถแม่บ้านคล่องตัวสูง (Daily Commuter 110-125cc)</option>
                  <option value="touring">ทัวร์ริ่ง / ลุยน้ำท่วมแอดเวนเจอร์ (Touring Adventure)</option>
                  <option value="ev">มอเตอร์ไซค์ไฟฟ้า 100% (Clean Energy EV)</option>
                  <option value="sport">สปอร์ตไบค์สมรรถนะสูง (Sport Performance)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">เลขไมล์สะสม (Mileage):</label>
                <input
                  type="text"
                  value={newRideMileage}
                  onChange={(e) => setNewRideMileage(e.target.value)}
                  placeholder="เช่น 12,500 km"
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                />
              </div>

              <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="setAsActive"
                  checked={newRideSetAsActive}
                  onChange={(e) => setNewRideSetAsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-400 bg-black/40 border-white/20 focus:ring-0"
                />
                <label htmlFor="setAsActive" className="text-xs text-cyan-200 cursor-pointer">
                  ตั้งเป็น <strong>"ยานรบรับงานหลักทันที"</strong> หลังบันทึก
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRideModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 font-semibold text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FFD700] hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
              >
                บันทึกลงสมุดทะเบียน
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
        currentLevel={driverLevel}
        audioEnabled={audioEnabled}
        onApplySimulatedLevel={(role, lvl) => {
          if (role === 'knight') {
            setDriverLevel(lvl);
            const req = calculateLevelMaxXp(lvl, 'knight');
            setDriverNextXp(req);
            setDriverXp(Math.round(req * 0.85));
          }
        }}
      />

      {/* 3D DENSITY RADAR OVERLAY MODAL (2.5 KM) FOR DRIVER */}
      {showDriverRadarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <DensityRadarOverlay
              targetPerspective="driver"
              radiusKm={2.5}
              audioEnabled={audioEnabled}
              onBackToHome={() => setShowDriverRadarModal(false)}
            />
          </div>
        </div>
      )}

      {/* DRIVER PROMPTPAY QR PAYMENT MODAL */}
      {showDriverQrModal && (
        <DriverPaymentQrCodeModal
          isOpen={showDriverQrModal}
          onClose={() => setShowDriverQrModal(false)}
          driverName="กิตติ อินทะสร้อย (อัศวิน Level 100)"
          driverCode="WIN-BKK-LV100"
          fareAmount={50}
          tipAmount={10}
          promptPayNumber="081-998-7766"
          audioEnabled={audioEnabled}
          onPaymentSuccess={(amt) => {
            setBalance(prev => prev + amt);
            handleGainDriverXp(50, `รับชำระเงินผ่าน QR สำเร็จ ฿${amt}`);
          }}
        />
      )}

      {/* FULL SHOWCASE MODAL FOR ARMOR LVL 1-70 (LVL 71-100 CLASSIFIED) */}
      <ArmorLevels1to70ShowcaseModal
        isOpen={showArmorShowcaseModal}
        onClose={() => setShowArmorShowcaseModal(false)}
        equippedSuitId={equippedSuitId}
        onEquipSuit={(suit) => {
          handleEquipSuit(suit);
          setShowArmorShowcaseModal(false);
        }}
        audioEnabled={audioEnabled}
      />

      {/* PROFILE CUSTOMIZER MODAL FOR KNIGHT DRIVER */}
      <ProfileCustomizerModal
        isOpen={showProfileCustomizerModal}
        onClose={() => setShowProfileCustomizerModal(false)}
        currentData={driverProfileData}
        role="driver"
        onSave={(updated) => setDriverProfileData(updated)}
        audioEnabled={audioEnabled}
      />
    </div>
  );
};
