import React, { useState, useEffect } from 'react';
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
import { loadProfileCustomization } from '../services/profileService';
import { auth } from '../firebase';
import { WalletTopUpPanel } from './WalletTopUpPanel';
import { WinAiAssistantPanel } from './WinAiAssistantPanel';
import { PaymentReceiverSettingsPanel } from './PaymentReceiverSettingsPanel';
import { getWalletMe } from '../services/walletService';
import { calculateLevelMaxXp, getLevelDifficultyMetrics } from '../data/tierHierarchyData';
import { UserSession, isDriverAccount, isDriverInCitizenMode } from '../utils/userSession';
import { 
  Shield, 
  Wrench, 
  Plus, 
  Coins, 
  Wallet,
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

const waveBikeImg = '/images/garage_wave.jpg';
const pcxBikeImg = '/images/garage_pcx.jpg';
const adventureBikeImg = '/images/garage_adventure.jpg';
const evBikeImg = '/images/garage_ev.jpg';

export type DriverTabType = 'profile' | 'garage' | 'cabinet' | 'armor' | 'armorLab' | 'calculator' | 'installment' | 'wallet' | 'mechanic' | 'jobs' | 'quests' | 'navigation';

interface KnightDriverAppViewProps {
  audioEnabled: boolean;
  onOpenWinBuddy?: () => void;
  activeDriverTab?: DriverTabType;
  onSelectDriverTab?: (tab: DriverTabType) => void;
  currentUserSession?: UserSession | null;
  onToggleDriverPersona?: (targetPersona: 'driver' | 'customer') => void;
}

export const KnightDriverAppView: React.FC<KnightDriverAppViewProps> = ({ 
  audioEnabled, 
  onOpenWinBuddy,
  activeDriverTab: propActiveDriverTab,
  onSelectDriverTab,
  currentUserSession,
  onToggleDriverPersona,
}) => {
  const [internalDriverTab, setInternalDriverTab] = useState<DriverTabType>('jobs');
  const activeDriverTab = propActiveDriverTab !== undefined ? propActiveDriverTab : internalDriverTab;
  const setActiveDriverTab = (tab: DriverTabType) => {
    setInternalDriverTab(tab);
    if (onSelectDriverTab) onSelectDriverTab(tab);
  };
  const [isOnDuty, setIsOnDuty] = useState<boolean>(false);
  const [deviceFrameMode, setDeviceFrameMode] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [ridesPaid, setRidesPaid] = useState(35);
  const totalRidesDebt = 35;

  useEffect(() => {
    getWalletMe().then((res) => {
      setBalance(res.balance || 0);
    }).catch(() => {});
  }, []);

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

  React.useEffect(() => {
    loadProfileCustomization('driver').then((saved) => {
      if (saved) {
        setDriverProfileData(saved);
      } else if (currentUserSession) {
        setDriverProfileData(prev => ({
          ...prev,
          displayName: currentUserSession.name || prev.displayName,
          avatarUrl: currentUserSession.avatarUrl || prev.avatarUrl,
          avatarEmoji: currentUserSession.avatarEmoji || prev.avatarEmoji,
          bioStatus: currentUserSession.bio || prev.bioStatus,
        }));
      }
    }).catch((error) => console.warn('Unable to load driver profile:', error));
  }, [currentUserSession?.id]);

  const equippedSuit = KNIGHT_ARMOR_SUITS.find(s => s.id === equippedSuitId) || KNIGHT_ARMOR_SUITS[9];

  // Active Vehicle & Registered Fleet State
  const [activeVehicleId, setActiveVehicleId] = useState<string>('wave-110i');
  const [showSwitchVehicleModal, setShowSwitchVehicleModal] = useState<boolean>(false);
  const [showPaymentReceiverSettings, setShowPaymentReceiverSettings] = useState<boolean>(false);
  const [switchSuccessToast, setSwitchSuccessToast] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const persistKnightSettings = React.useCallback(async (patch: {
    vehicles?: Vehicle[];
    activeVehicleId?: string;
    equippedSuitId?: string;
  }) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch('/api/knights/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        console.warn('Unable to persist Knight settings:', await response.text());
      }
    } catch (error) {
      console.warn('Unable to persist Knight settings:', error);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch('/api/knights/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const payload = await response.json() as {
          vehicles?: Vehicle[];
          activeVehicleId?: string | null;
          equippedSuitId?: string | null;
        };
        if (cancelled) return;
        if (Array.isArray(payload.vehicles)) setVehicles(payload.vehicles);
        if (payload.activeVehicleId) setActiveVehicleId(payload.activeVehicleId);
        if (payload.equippedSuitId) setEquippedSuitId(payload.equippedSuitId);
      } catch (error) {
        console.warn('Unable to load Knight settings:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUserSession?.id]);



  const emptyVehicle: Vehicle = {
    id: 'unregistered', brand: '', modelName: 'ยังไม่มีรถที่ลงทะเบียน', name: 'ยังไม่มีรถที่ลงทะเบียน',
    type: '', category: 'commuter', displacement: '', plateNumber: '', registrationNumber: '',
    insuranceStatus: 'ยังไม่ได้ตรวจสอบ', status: 'MAINTENANCE', isPrimary: false, mileage: '', fuel: 0,
    oil: 0, batteryHealth: 0, fuelEconomy: '', image: '', iconEmoji: '🛵', dailyRidesDone: 0,
    accent: 'border-slate-500/40 bg-slate-950/20', description: 'เพิ่มรถและส่งเอกสารให้ผ่านการอนุมัติก่อนเปิดรับงาน',
  };

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0] || emptyVehicle;

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
    const nextVehicles = vehicles.map(v => ({
      ...v,
      isPrimary: v.id === targetId,
      status: v.id === targetId ? 'READY' as const : v.status
    }));
    setVehicles(nextVehicles);
    void persistKnightSettings({ vehicles: nextVehicles, activeVehicleId: targetId });

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
    if (audioEnabled) playTactileBlip(500);
    setSwitchSuccessToast('การถอนเงินต้องผ่านคำขอ Payout ที่ยืนยันโดยระบบการโอนเงินจริง — ยังไม่มีการตัดยอดในหน้านี้');
    setTimeout(() => setSwitchSuccessToast(null), 4500);
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
      plateNumber: newRidePlate,
      registrationNumber: `REG-${Date.now()}`,
      insuranceStatus: 'พ.ร.บ. & ประกันภัยชั้น 1 คุ้มครองผู้โดยสาร (Active)',
      status: 'READY',
      isPrimary: newRideSetAsActive,
      mileage: newRideMileage || '0 km',
      fuel: 100,
      oil: 100,
      batteryHealth: 100,
      fuelEconomy: '50.0 กม./ลิตร',
      image: newRideCategory === 'ev' ? evBikeImg : newRideCategory === 'touring' ? adventureBikeImg : newRideCategory === 'scooter' ? pcxBikeImg : waveBikeImg,
      iconEmoji: newRideCategory === 'ev' ? '⚡' : newRideCategory === 'touring' ? '🏜️' : '🛵',
      accent: newRideCategory === 'ev' ? 'border-emerald-400/40 bg-emerald-950/20' : 'border-cyan-400/40 bg-cyan-900/20',
      description: 'ยานรบคันใหม่ บันทึกในสมุดทะเบียนอัศวินจักรวรรดิ WINRIDER พร้อมออกรับงานทันที',
      dailyRidesDone: 0
    };

    const nextVehicles = newRideSetAsActive
      ? [...vehicles.map(item => ({ ...item, isPrimary: false })), v]
      : [...vehicles, v];
    setVehicles(nextVehicles);
    if (newRideSetAsActive) setActiveVehicleId(newId);
    void persistKnightSettings({
      vehicles: nextVehicles,
      ...(newRideSetAsActive ? { activeVehicleId: newId } : {}),
    });

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
    void persistKnightSettings({ equippedSuitId: suit.id });
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
                        setShowPaymentReceiverSettings(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 hover:bg-cyan-500/30 transition-all cursor-pointer shadow-sm"
                    >
                      <QrCode className="w-3 h-3 text-cyan-400" />
                      <span>ตั้งค่ารับเงิน</span>
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

            {/* Dual-Role Switcher for Driver: Switch to Citizen on rest days */}
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-br from-[#0A1428] via-[#0B1830] to-[#08152A] border border-[#00D2FF]/40 shadow-lg">
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">🏍️</span>
                    <span className="text-xs sm:text-sm font-black text-white tracking-wide">KNIGHT'S GARAGE & DRIVER ARSENAL</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/35 font-mono font-bold">ARMOR SUITS & FLEET DISPATCH</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 leading-relaxed">
                    หน้าจออู่รถอัศวิน • สลับรถรับงานได้ตลอดเวลา ({vehicles.length} คัน) • คลังชุดเกราะปลดล็อคทุกอย่าง • ผ่อนชำระ {ridesPaid}/{totalRidesDebt} รอบ & WIN Wallet ฿{balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeviceFrameMode(!deviceFrameMode)}
                  className="hidden sm:flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 transition-all"
                >
                  <Layers className="w-3.5 h-3.5 text-[#00D2FF]" />
                  <span>{deviceFrameMode ? 'เต็มหน้าจอ' : 'กรอบมือถือ'}</span>
                </button>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#0A1A3A] to-slate-900/80 border border-cyan-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">🛵 ↔️ 🦥</span>
                  <span className="text-xs font-bold text-cyan-300">ระบบ 2 บทบาท (Dual-Persona Role): วันนี้ไม่อยากวิ่งงาน?</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-400/30">
                    LV.{driverLevel} เท่ากันทั้ง 2 บทบาท
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  พี่วินสามารถสลับไปใช้ชีวิตเป็น 'พลเมือง' ได้ทันที เพื่อซื้อของ สั่งอาหาร หรือเรียกรถ โดยเลเวล ยศ และเครดิตจะคงเดิม
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(850);
                  onToggleDriverPersona?.('customer');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)] active:scale-95 transition-all cursor-pointer flex-shrink-0"
              >
                <span>🦥 พักงาน: สลับเป็นพลเมือง</span>
              </button>
            </div>

            {/* TWO CRITICAL BANNERS: 1) ACTIVE DISPATCH VEHICLE & 2) EQUIPPED ARMOR SUIT */}
            <div className="mt-3 space-y-2">
              {/* ACTIVE DISPATCH BIKE BANNER (ALLOWS SWITCHING ANYTIME) */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-r from-[#081830] to-[#0D2447] border border-[#00D2FF]/60 flex items-center justify-between gap-2 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-cyan-400/80 bg-black/60 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(0,210,255,0.4)]">
                    <img 
                      src={activeVehicle.image || '/images/garage_wave.jpg'} 
                      alt={activeVehicle.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/garage_wave.jpg'; }}
                    />
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
                    title="ดูชุดเกราะอัศวิน"
                  >
                    <Eye className="w-3 h-3" />
                    <span>ชุดเกราะอัศวิน</span>
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
              { id: 'wallet' as const, label: 'WIN Wallet', icon: <Wallet className="w-4 h-4 mx-auto text-emerald-400" /> },
              { id: 'mechanic' as const, label: 'WIN-AI ช่างส่วนตัว', icon: <Wrench className="w-4 h-4 mx-auto text-cyan-300" /> },
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
                                <DriverStandbyAndIncomingJob
                  mode="navigation"
                  isOnDuty={isOnDuty}
                  onToggleDuty={(duty) => setIsOnDuty(duty)}
                  activeVehicle={activeVehicle}
                  driverLevel={driverLevel}
                  driverCreditScore={driverCreditScore}
                  audioEnabled={audioEnabled}
                  onAcceptJob={(job: IncomingJobData) => {
                    // Job accepted
                  }}
                  onExitNavigation={() => setActiveDriverTab('jobs')}
                  onGainXp={(amount, reason) => handleGainDriverXp(amount, reason)}
                  onAddEarnings={(amount) => {
                    setBalance(prev => prev + amount);
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
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-cyan-400 bg-black/60 shadow-[0_0_20px_rgba(0,210,255,0.4)] flex-shrink-0">
                        <img 
                          src={activeVehicle.image || '/images/garage_wave.jpg'} 
                          alt={activeVehicle.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/garage_wave.jpg'; }}
                        />
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
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-cyan-500/50 bg-black/60 flex-shrink-0 shadow-md">
                              <img 
                                src={v.image || '/images/garage_wave.jpg'} 
                                alt={v.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/garage_wave.jpg'; }}
                              />
                            </div>
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

            {/* 6. WALLET & EQUIPMENT TAB (WIN Wallet) */}
            {activeDriverTab === 'wallet' && (
              <div className="space-y-4">
                <WalletTopUpPanel
                  role="knight"
                  userId="knight-sovereign-01"
                  userName="กิตติ อินทะสร้อย"
                  onBalanceUpdate={(b) => setBalance(b)}
                />

                {/* Credit Toast Notification */}
                {creditToast && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-xs text-center shadow-xl border border-white/30 animate-bounce">
                    {creditToast}
                  </div>
                )}

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