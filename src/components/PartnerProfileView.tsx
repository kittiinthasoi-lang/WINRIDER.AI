import React, { useState, useEffect, useMemo } from 'react';
import { 
  PartnerProfile, 
  PartnerCategory, 
  PartnerEvent, 
  PartnerPromotion,
  PartnerParkingInfo
} from '../types';
import { 
  Building2, 
  Wine, 
  Hotel, 
  Utensils, 
  Coffee, 
  Sparkles, 
  Star, 
  MapPin, 
  Users, 
  Bike, 
  Radio, 
  QrCode, 
  Award, 
  Calendar, 
  Percent, 
  ChevronRight, 
  ShieldCheck, 
  Activity, 
  Compass, 
  TrendingUp,
  Layers,
  Flame,
  CheckCircle2,
  Maximize2,
  Car,
  Clock,
  Phone,
  Navigation,
  Tag,
  Ticket,
  PlusCircle,
  Settings,
  Store,
  ShoppingBag,
  Eye,
  Check,
  Zap,
  Info,
  ExternalLink,
  Gift,
  ParkingSquare,
  Shield,
  X
} from 'lucide-react';
import { playTactileBlip, playLevelUpFanfare, playRadarScan } from '../utils/audio';
import { WinScanAndPayModal } from './WinScanAndPayModal';
import { DensityRadarOverlay } from './DensityRadarOverlay';
import { ProfileCustomizerModal, ProfileCustomizationData } from './ProfileCustomizerModal';
import { getCurrentUserSession } from '../utils/userSession';
import confetti from 'canvas-confetti';
import { loadProfileCustomization } from '../services/profileService';
import { WalletTopUpPanel } from './WalletTopUpPanel';
import { WinAiAssistantPanel } from './WinAiAssistantPanel';

interface PartnerProfileViewProps {
  audioEnabled?: boolean;
  onOpenWinBuddy?: () => void;
  onRideToPartner?: (partnerName: string, partnerAddress: string, distanceKm?: number) => void;
  initialPerspective?: 'owner' | 'customer';
  canEdit?: boolean;
}

const EMPTY_PARTNER_PROFILE: PartnerProfile = {
  id: 'current-partner',
  name: 'ยังไม่ได้ตั้งชื่อพาร์ทเนอร์',
  category: 'wellness',
  categoryLabel: 'พาร์ทเนอร์ในระบบ WINRIDER.AI',
  icon: '🤝',
  coverGradient: 'from-slate-900 via-[#070D1E] to-[#0A1A3F]',
  rating: 0,
  reviewCount: 0,
  level: 1,
  tierName: 'พาร์ทเนอร์ใหม่',
  xp: 0,
  nextXp: 100,
  address: '',
  distanceKm: 0,
  estimatedWinFare: 0,
  phone: '',
  openHours: 'ยังไม่ได้ระบุเวลาทำการ',
  todayCustomersArrivingViaWin: 0,
  activeWinDriversInZone: 0,
  description: 'กรุณาเพิ่มข้อมูลบริการของพาร์ทเนอร์',
  amenities: [],
  eventsToday: [],
  promotionsToday: [],
  specialHighlights: [],
  walletQrAddress: '',
};

export const SAMPLE_PARTNERS: PartnerProfile[] = [EMPTY_PARTNER_PROFILE];

export const PartnerProfileView: React.FC<PartnerProfileViewProps> = ({
  audioEnabled = true,
  onOpenWinBuddy,
  onRideToPartner,
  initialPerspective,
  canEdit = false
}) => {
  const [selectedPartner, setSelectedPartner] = useState<PartnerProfile>(SAMPLE_PARTNERS[0]);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'discounts' | 'parking' | 'hours' | 'events' | 'radar3d' | 'overview'>('discounts');
  const [showProfileCustomizerModal, setShowProfileCustomizerModal] = useState<boolean>(false);
  
  // Perspective state: แบบที่ 1 (ของพาร์ทเนอร์เอง) หรือ แบบที่ 2 (หน้าร้านสำหรับลูกค้า)
  const [perspective, setPerspective] = useState<'owner' | 'customer'>(() => {
    if (!canEdit) return 'customer';
    if (initialPerspective) return initialPerspective;
    const session = getCurrentUserSession();
    return session?.role === 'partner' ? 'owner' : 'customer';
  });

  useEffect(() => {
    setPerspective(canEdit && initialPerspective === 'owner' ? 'owner' : 'customer');
  }, [canEdit, initialPerspective]);

  // Modal for Customer claiming a promotion QR voucher
  const [selectedClaimPromo, setSelectedClaimPromo] = useState<PartnerPromotion | null>(null);

  // Modal for Ride Pinning Confirmation
  const [showRideConfirmModal, setShowRideConfirmModal] = useState<boolean>(false);

  // Owner management state: Adding new promotions
  const [ownerPromotions, setOwnerPromotions] = useState<Record<string, PartnerPromotion[]>>({});
  const [showAddPromoModal, setShowAddPromoModal] = useState<boolean>(false);
  const [newPromoTitle, setNewPromoTitle] = useState<string>('');
  const [newPromoDiscount, setNewPromoDiscount] = useState<string>('');
  const [newPromoCondition, setNewPromoCondition] = useState<string>('');
  const [newPromoBadge, setNewPromoBadge] = useState<string>('Exclusive Deal');

  // Customization profiles
  const [partnerCustomizations, setPartnerCustomizations] = useState<Record<string, ProfileCustomizationData>>({
    'partner-bar-01': {
      displayName: 'THE KNIGHT ROOFTOP & SPEAKEASY BAR',
      bioStatus: 'บาร์รูฟท็อปวิวพาโนรามา 360 องศา • ค็อกเทลสูตรพิเศษ • พี่วินจอดส่งถึงลิฟต์ 🍸🌃',
      avatarEmoji: '🍸',
      themeColor: '#00D2FF',
      bannerGlow: 'from-purple-900/60 via-[#070D1E] to-[#0A1A3F]'
    }
  });

  useEffect(() => {
    if (!canEdit) return;
    loadProfileCustomization('partner').then((saved) => {
      if (saved) setPartnerCustomizations(prev => ({ ...prev, [selectedPartner.id]: saved }));
    }).catch((error) => console.warn('Unable to load partner profile:', error));
  }, [canEdit, selectedPartner.id]);
  
  const [incomingCustomers] = useState<{ id: string; name: string; riderName: string; etaMin: number; x: number; y: number; vehicle: string }[]>([]);

  // Combined promotions list (sample + owner created)
  const currentPromotions = useMemo(() => {
    const extra = ownerPromotions[selectedPartner.id] || [];
    return [...extra, ...selectedPartner.promotionsToday];
  }, [selectedPartner, ownerPromotions]);

  const handleSelectPartner = (p: PartnerProfile) => {
    if (audioEnabled) playTactileBlip(800);
    setSelectedPartner(p);
  };

  const handleTogglePerspective = (newMode: 'owner' | 'customer') => {
    if (newMode === 'owner' && !canEdit) return;
    if (audioEnabled) playTactileBlip(1000);
    setPerspective(newMode);
    if (newMode === 'customer') {
      setActiveTab('discounts');
    } else {
      setActiveTab('radar3d');
    }
  };

  const handleRideToHere = () => {
    if (audioEnabled) playRadarScan();
    setShowRideConfirmModal(true);
  };

  const handleConfirmRideDispatch = () => {
    setShowRideConfirmModal(false);
    confetti({ particleCount: 60, spread: 70, colors: ['#00D2FF', '#FFD700', '#10B981'] });
    if (onRideToPartner) {
      onRideToPartner(selectedPartner.name, selectedPartner.address, selectedPartner.distanceKm);
    } else {
      window.dispatchEvent(new CustomEvent('winrider:set_destination', {
        detail: {
          name: selectedPartner.name,
          address: selectedPartner.address,
          distanceKm: selectedPartner.distanceKm
        }
      }));
    }
  };

  const handleClaimPromotion = (promo: PartnerPromotion) => {
    if (audioEnabled) playLevelUpFanfare();
    setSelectedClaimPromo(promo);
    confetti({ particleCount: 45, spread: 60, colors: ['#FFD700', '#00D2FF'] });
  };

  const handleAddOwnerPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoTitle || !newPromoDiscount) return;
    const newPr: PartnerPromotion = {
      id: 'promo-custom-' + Date.now(),
      title: newPromoTitle,
      discount: newPromoDiscount,
      condition: newPromoCondition || 'แสดงบัตร WINRIDER ในแอปเพื่อรับสิทธิ์',
      validUntil: 'ตลอด 30 วัน',
      badge: newPromoBadge || 'Special Perk'
    };
    setOwnerPromotions(prev => ({
      ...prev,
      [selectedPartner.id]: [newPr, ...(prev[selectedPartner.id] || [])]
    }));
    setNewPromoTitle('');
    setNewPromoDiscount('');
    setNewPromoCondition('');
    setShowAddPromoModal(false);
    if (audioEnabled) playTactileBlip(1200);
    confetti({ particleCount: 40, spread: 70, colors: ['#00D2FF', '#FFD700'] });
  };

  const custom = partnerCustomizations[selectedPartner.id] || {
    displayName: selectedPartner.name,
    bioStatus: selectedPartner.description,
    avatarEmoji: selectedPartner.icon,
    themeColor: '#00D2FF',
    bannerGlow: selectedPartner.coverGradient
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {canEdit && perspective === 'owner' && <><WalletTopUpPanel /><WinAiAssistantPanel mode="personal_commerce" /></>}
      {/* PERSPECTIVE SWITCHER BAR (แบบที่ 1 vs แบบที่ 2) */}
      <section className="p-4 rounded-3xl bg-gradient-to-r from-[#060E20] via-[#09152E] to-[#060E20] border-2 border-cyan-500/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">ระบบหน้าจอโปรไฟล์พาร์ทเนอร์ (Partner Space)</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border ${
                perspective === 'customer' 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/50'
              }`}>
                {perspective === 'customer' ? '🛍️ แบบที่ 2: มุมมองลูกค้า' : '🏢 แบบที่ 1: มุมมองพาร์ทเนอร์เอง'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {perspective === 'customer' 
                ? 'มุมมองสำหรับลูกค้า: ดูส่วนลด สิทธิพิเศษ ข้อมูลที่จอดรถ เวลาทำการ และปักหมุดเรียกพี่วินมาที่นี่'
                : 'มุมมองสำหรับพาร์ทเนอร์: จัดการสิทธิประโยชน์ ข้อมูลที่จอดรถ เวลาทำการ และสถิติงานหลังร้าน'}
            </p>
          </div>
        </div>

        {/* Mode Switch Toggle Button */}
        <div className="flex items-center gap-1.5 p-1.5 bg-black/60 rounded-2xl border border-white/10 w-full md:w-auto justify-center">
          <button
            disabled={!canEdit}
            title={canEdit ? 'เปิดมุมมองจัดการพาร์ทเนอร์' : 'สงวนสิทธิ์เฉพาะเจ้าของพาร์ทเนอร์'}
            onClick={() => handleTogglePerspective('owner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              perspective === 'owner'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                : canEdit ? 'text-slate-400 hover:text-white' : 'text-slate-600 cursor-not-allowed opacity-60'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>แบบที่ 1: พาร์ทเนอร์เอง (หลังร้าน)</span>
          </button>
          <button
            onClick={() => handleTogglePerspective('customer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              perspective === 'customer'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>แบบที่ 2: ลูกค้าดู (Storefront)</span>
          </button>
        </div>
      </section>

      {/* Partner Selector Pills */}
      <section className="p-3 rounded-2xl bg-[#070D1E]/90 border border-white/10 flex items-center justify-between gap-3 overflow-x-auto">
        <span className="text-xs font-mono text-slate-400 font-bold whitespace-nowrap pl-2">
          เลือกพาร์ทเนอร์:
        </span>
        <div className="flex items-center gap-2">
          {SAMPLE_PARTNERS.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPartner(p)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                selectedPartner.id === p.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/25 hover:bg-white/5'
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Profile Header Banner */}
      <section 
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${custom.bannerGlow || selectedPartner.coverGradient} border-2 border-cyan-500/30 p-6 sm:p-8 shadow-2xl space-y-6 transition-all`}
        style={{ borderColor: custom.themeColor }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {custom.avatarUrl ? (
              <div className="relative flex-shrink-0">
                <img 
                  src={custom.avatarUrl} 
                  alt={custom.displayName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl object-cover border-2 shadow-[0_0_20px_rgba(0,210,255,0.4)]"
                  style={{ borderColor: custom.themeColor }}
                />
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-black/80 rounded-full text-[9px] font-bold text-amber-400 border border-amber-400">
                  LV.{selectedPartner.level}
                </div>
              </div>
            ) : (
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden bg-black/60 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(0,210,255,0.4)] flex-shrink-0"
                style={{ borderColor: custom.themeColor }}
              >
                <img 
                  src="/avatars/partner.jpg" 
                  alt="Partner Avatar" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                  {selectedPartner.categoryLabel}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 text-[10px] font-mono font-bold">
                  LEVEL {selectedPartner.level} • {selectedPartner.tierName}
                </span>
                {perspective === 'owner' && (
                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(950);
                      setShowProfileCustomizerModal(true);
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 text-[10px] font-mono font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                  >
                    <span>🎨 แต่งโปรไฟล์พาร์ทเนอร์</span>
                  </button>
                )}
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-white tracking-wide">
                {custom.displayName}
              </h1>

              <p className="text-xs text-cyan-200/90 font-mono line-clamp-2 max-w-2xl">
                {custom.bioStatus}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono pt-1">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" /> {selectedPartner.rating} ({selectedPartner.reviewCount} รีวิว)
                </span>
                <span className="flex items-center gap-1 text-cyan-300">
                  <MapPin className="w-3.5 h-3.5" /> {selectedPartner.address}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Clock className="w-3.5 h-3.5" /> {selectedPartner.openHours}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* BIG ACTION BUTTON: "ปักหมุดเรียกพี่วินพาไปที่ร้านนี้" for Customer */}
            {perspective === 'customer' ? (
              <button
                onClick={handleRideToHere}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(0,210,255,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2.5 border border-white/40"
              >
                <Bike className="w-5 h-5 text-slate-950" />
                <div className="text-left">
                  <div className="leading-tight">📍 ปักหมุดเรียกพี่วินพาไปที่นี่</div>
                  <div className="text-[10px] font-mono text-slate-900/80 font-bold">
                    ห่าง {selectedPartner.distanceKm} กม. • ~฿{selectedPartner.estimatedWinFare || 35} (5 นาที)
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddPromoModal(true)}
                  className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(255,215,0,0.4)] flex items-center gap-2 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>➕ เพิ่มสิทธิพิเศษให้ลูกค้า</span>
                </button>
                <button
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(1100);
                    setIsQrModalOpen(true);
                  }}
                  className="px-4 py-3 rounded-2xl bg-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center gap-2 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR รับเงิน</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Highlights / Stats strip */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono">
              {perspective === 'customer' ? 'ระยะทางจากตำแหน่งคุณ' : 'ลูกค้ามาด้วยพี่วินวันนี้'}
            </span>
            <p className="text-xl font-black text-cyan-400 font-mono">
              {perspective === 'customer' ? `${selectedPartner.distanceKm} กม.` : `${selectedPartner.todayCustomersArrivingViaWin} คน`}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono">
              {perspective === 'customer' ? 'ค่าโดยสารพี่วินประมาณ' : 'พี่วินสแตนด์บายรอบพาร์ทเนอร์'}
            </span>
            <p className="text-xl font-black text-emerald-400 font-mono">
              {perspective === 'customer' ? `฿${selectedPartner.estimatedWinFare || 35}` : `${selectedPartner.activeWinDriversInZone} คัน`}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono">ที่จอดรถยนต์ / มอเตอร์ไซค์</span>
            <p className="text-xl font-black text-amber-400 font-mono">
              {selectedPartner.parkingInfo?.carSpots || 120} / {selectedPartner.parkingInfo?.motorcycleSpots || 50} คัน
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono">เลนเทียบด่วนพี่วิน VIP</span>
            <p className="text-xl font-black text-blue-400 font-mono">READY IN-DOOR</p>
          </div>
        </div>
      </section>

      {/* VIEW MODE TABS NAVIGATION */}
      <section className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/50 border border-white/10 overflow-x-auto text-xs">
        {perspective === 'customer' ? (
          <>
            <button
              onClick={() => { if (audioEnabled) playTactileBlip(750); setActiveTab('discounts'); }}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'discounts'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>🎁 ส่วนลด & สิทธิพิเศษ ({currentPromotions.length})</span>
            </button>
            <button
              onClick={() => { if (audioEnabled) playTactileBlip(750); setActiveTab('parking'); }}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'parking'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>🚗 ข้อมูลที่จอดรถ & การเดินทาง</span>
            </button>
            <button
              onClick={() => { if (audioEnabled) playTactileBlip(750); setActiveTab('hours'); }}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'hours'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>⏰ เวลาทำการ & รายละเอียดร้าน</span>
            </button>
            <button
              onClick={() => { if (audioEnabled) playTactileBlip(750); setActiveTab('events'); }}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>🎶 อีเวนต์ & ดนตรีสด ({selectedPartner.eventsToday.length})</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { if (audioEnabled) playTactileBlip(750); setActiveTab('radar3d'); }}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'radar3d'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>📡 เรดาร์สด 3D ลูกค้ากำลังเดินทางมา</span>
            </button>
            <button
              onClick={() => { if (audioEnabled) playTactileBlip(750); setActiveTab('discounts'); }}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'discounts'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>⚙️ จัดการดีล & สิทธิประโยชน์ ({currentPromotions.length})</span>
            </button>
            <button
              onClick={() => { if (audioEnabled) playTactileBlip(750); setActiveTab('parking'); }}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'parking'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ParkingSquare className="w-4 h-4" />
              <span>🏢 จัดการที่จอดรถ & เวลาทำการ</span>
            </button>
            <button
              onClick={() => { if (audioEnabled) playTactileBlip(750); setActiveTab('events'); }}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>🎉 ตารางอีเวนต์หลังร้าน</span>
            </button>
          </>
        )}
      </section>

      {/* ========================================================================= */}
      {/* TAB: DISCOUNTS & PROMOTIONS (ส่วนลด & สิทธิพิเศษ) */}
      {/* ========================================================================= */}
      {activeTab === 'discounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#070D1E] border border-cyan-500/30">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-400" />
                <span>
                  {perspective === 'customer' 
                    ? 'สิทธิพิเศษ & คูปองส่วนลดสำหรับลูกค้า WINRIDER' 
                    : 'จัดการโปรโมชั่นและสิทธิพิเศษที่มอบให้ลูกค้า'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {perspective === 'customer'
                  ? 'กดปุ่ม "รับสิทธิ์ & แสดง QR" เพื่อยื่นให้พนักงานหน้าร้านสแกนรับส่วนลดทันที'
                  : 'สร้างส่วนลดจูงใจให้ผู้โดยสารและพี่วินเดินทางมาใช้บริการที่ร้านของคุณ'}
              </p>
            </div>
            {perspective === 'owner' && (
              <button
                onClick={() => setShowAddPromoModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all flex-shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>เพิ่มดีลส่วนลดใหม่</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentPromotions.map(pr => (
              <div 
                key={pr.id}
                className="p-5 rounded-3xl bg-gradient-to-br from-[#0B1838] to-[#070D1E] border-2 border-[#FFD700]/30 hover:border-[#FFD700] space-y-4 shadow-xl transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    {pr.badge}
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold">
                    ถึง {pr.validUntil}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                    {pr.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    เงื่อนไข: {pr.condition}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <span className="text-xs text-slate-400">ส่วนลดที่ได้รับ:</span>
                  <span className="text-lg font-mono font-black text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
                    {pr.discount}
                  </span>
                </div>

                {perspective === 'customer' ? (
                  <button
                    onClick={() => handleClaimPromotion(pr)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.4)] active:scale-95 transition-all"
                  >
                    <Gift className="w-4 h-4" />
                    <span>กดรับสิทธิ์ & แสดง QR ส่วนลด</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-mono pt-1 border-t border-white/5">
                    <span>สถานะ: กำลังแจกให้ลูกค้า</span>
                    <span className="text-slate-400">ใช้สิทธิ์แล้ว: 18 ครั้ง</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PARKING & ARRIVAL INFO (ข้อมูลที่จอดรถ & การเดินทาง) */}
      {/* ========================================================================= */}
      {activeTab === 'parking' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#070D1E] border border-cyan-500/30 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Car className="w-5 h-5 text-cyan-400" />
                  <span>ข้อมูลที่จอดรถและจุดจอดเทียบพี่วิน ({selectedPartner.name})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {perspective === 'customer' 
                    ? 'รายละเอียดการนำรถมาเอง หรือนั่งพี่วินมาเทียบถึงหน้าประตูทางเข้า' 
                    : 'อัปเดตข้อมูลสถานที่และจุดจอดเพื่ออำนวยความสะดวกลูกค้า'}
                </p>
              </div>

              {/* Ride to partner button */}
              {perspective === 'customer' && (
                <button
                  onClick={handleRideToHere}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.4)] flex-shrink-0"
                >
                  <Navigation className="w-4 h-4" />
                  <span>ปักหมุดเรียกพี่วินพามาที่นี่</span>
                </button>
              )}
            </div>

            {/* Parking Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Bike className="w-5 h-5" />
                  <span className="text-xs font-bold font-mono">ที่จอดมอเตอร์ไซค์</span>
                </div>
                <p className="text-2xl font-black text-white font-mono">
                  {selectedPartner.parkingInfo?.motorcycleSpots || 60} ช่อง
                </p>
                <p className="text-[11px] text-slate-400">
                  มีช่องจอด VIP กว้างพิเศษสำหรับ BigBike พร้อมกล้อง CCTV 24 ชม.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <Car className="w-5 h-5" />
                  <span className="text-xs font-bold font-mono">ที่จอดรถยนต์</span>
                </div>
                <p className="text-2xl font-black text-white font-mono">
                  {selectedPartner.parkingInfo?.carSpots || 250} คัน
                </p>
                <p className="text-[11px] text-slate-400">
                  อาคารจอดรถในร่ม มีระบบนำทางอัจฉริยะไฟเขียว-แดงบอกช่องว่าง
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs font-bold font-mono">บริการ Valet & EV</span>
                </div>
                <div className="space-y-1 text-xs text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Valet Parking พร้อมรับรถ</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>สถานีชาร์จรถยนต์ไฟฟ้า EV</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <Zap className="w-5 h-5" />
                  <span className="text-xs font-bold font-mono">เลนเทียบรถด่วนพี่วิน VIP</span>
                </div>
                <p className="text-sm font-bold text-cyan-300">
                  READY IN-DOOR
                </p>
                <p className="text-[11px] text-slate-400">
                  จอดเทียบหน้าลิฟต์โดยตรง ไม่ต้องเดินตากแดดหรือเปียกฝน
                </p>
              </div>
            </div>

            {/* Detailed Policies */}
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black/40 border border-cyan-500/30 space-y-2">
                <span className="text-xs font-mono text-cyan-300 font-bold uppercase flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  จุดจอดเทียบด่วนพี่วิน (Dedicated Drop-Off Zone)
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {selectedPartner.parkingInfo?.winDropoffLane}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-yellow-950/20 to-black/40 border border-amber-500/30 space-y-2">
                <span className="text-xs font-mono text-amber-300 font-bold uppercase flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  นโยบายค่าบริการที่จอดรถ & สิทธิ์จอดฟรี
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {selectedPartner.parkingInfo?.parkingFeePolicy}
                </p>
              </div>
            </div>

            {/* Quick Travel Advice */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">แนะนำการเดินทางด้วย WINRIDER</h4>
                  <p className="text-[11px] text-slate-400">
                    หลีกเลี่ยงรถติดย่านอโศก/ทองหล่อด้วยพี่วิน ถึงเร็วกว่า 3 เท่า พร้อมส่งเทียบหน้าประตูทางเข้าทันที
                  </p>
                </div>
              </div>
              {perspective === 'customer' && (
                <button
                  onClick={handleRideToHere}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.4)] flex-shrink-0"
                >
                  <span>เรียกรถพี่วิน (฿{selectedPartner.estimatedWinFare || 35})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: HOURS & DETAILS (เวลาทำการ & รายละเอียดร้าน) */}
      {/* ========================================================================= */}
      {activeTab === 'hours' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-[#070D1E] border border-white/10 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>เกี่ยวกับ {selectedPartner.name} ({selectedPartner.categoryLabel})</span>
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mt-2">
                {selectedPartner.description}
              </p>
            </div>

            {/* Operating Hours card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  เวลาเปิด-ปิดทำการ (Operating Hours)
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  เปิดบริการปกติ
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 space-y-1">
                  <span className="text-slate-400">วันจันทร์ - วันศุกร์:</span>
                  <p className="text-white font-mono font-bold">{selectedPartner.openHours}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 space-y-1">
                  <span className="text-slate-400">วันเสาร์ - วันอาทิตย์:</span>
                  <p className="text-white font-mono font-bold">{selectedPartner.openHours}</p>
                </div>
              </div>
            </div>

            {/* Amenities Grid */}
            <div className="space-y-3">
              <span className="text-xs font-mono text-cyan-400 uppercase font-bold">
                สิ่งอำนวยความสะดวก & ไฮไลต์พาร์ทเนอร์
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedPartner.amenities.map((am, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{am}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights for WINRIDER */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-amber-400 uppercase font-bold">
                คำแนะนำพิเศษสำหรับลูกค้า WINRIDER
              </span>
              <div className="space-y-2">
                {selectedPartner.specialHighlights.map((hl, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                    <span className="text-amber-400 font-bold">★</span>
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact and Ride Sidebar */}
          <div className="p-6 rounded-3xl bg-[#070D1E] border border-cyan-500/30 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Phone className="w-4 h-4 text-cyan-400" />
                <span>ติดต่อ & สำรองที่นั่ง</span>
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400">เบอร์โทรติดต่อ:</span>
                  <p className="text-white font-mono font-bold text-sm">{selectedPartner.phone}</p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400">พิกัดสถานที่:</span>
                  <p className="text-cyan-300 leading-snug">{selectedPartner.address}</p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400">เวลาทำการวันนี้:</span>
                  <p className="text-emerald-400 font-mono font-bold">{selectedPartner.openHours}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              {perspective === 'customer' ? (
                <button
                  onClick={handleRideToHere}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(0,210,255,0.5)] flex items-center justify-center gap-2"
                >
                  <Bike className="w-4 h-4" />
                  <span>ปักหมุดเรียกพี่วินพาไปที่ร้าน</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-[#0066FF] text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>เปิด QR สแกนจ่ายเงิน (WIN Scan & Pay)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: EVENTS & LIVE MUSIC (อีเวนต์ & ดนตรีสดวันนี้) */}
      {/* ========================================================================= */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#070D1E] border border-cyan-500/30">
            <div>
              <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>ตารางกิจกรรมพิเศษและการแสดงสดวันนี้ ({selectedPartner.name})</span>
              </h3>
              <p className="text-xs text-slate-400">อัปเดตแบบเรียลไทม์จากระบบจัดตารางพาร์ทเนอร์</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/30">
              Live Today
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPartner.eventsToday.map(ev => (
              <div 
                key={ev.id}
                className="p-5 rounded-3xl bg-[#070D1E] border border-cyan-500/30 hover:border-cyan-400 space-y-3 shadow-xl transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                    {ev.tag}
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {ev.time}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-black text-white">{ev.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ev.description}</p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-cyan-300 font-mono flex items-center justify-between">
                  <span>ศิลปิน/เชฟ: <strong>{ev.artistOrChef}</strong></span>
                  <span className="text-emerald-400 font-bold">{ev.highlight}</span>
                </div>

                {perspective === 'customer' && (
                  <button
                    onClick={handleRideToHere}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-white/10 hover:border-cyan-400/50 flex items-center justify-center gap-2 transition-all"
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>เรียกพี่วินไปฟังดนตรีสดรอบนี้</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: 3D RADAR (เรดาร์ลูกค้าหลังร้านสำหรับพาร์ทเนอร์) */}
      {/* ========================================================================= */}
      {activeTab === 'radar3d' && (
        <div className="space-y-4">
          <DensityRadarOverlay
            targetPerspective="partner"
            venueName={selectedPartner.name}
            venueIcon={selectedPartner.icon}
            venueCategory={selectedPartner.categoryLabel}
            radiusKm={3.0}
            audioEnabled={audioEnabled}
          />

          {/* Incoming Queue List */}
          <div className="p-5 rounded-3xl bg-[#061022] border border-cyan-500/30 space-y-4 font-mono">
            <div className="flex items-center justify-between text-xs text-white">
              <span className="font-bold flex items-center gap-2 text-cyan-300 text-sm">
                <Users className="w-4 h-4" />
                <span>คิวลูกค้าที่กำลังเดินทางมุ่งหน้ามายัง {selectedPartner.name} (Live Telemetry)</span>
              </span>
              <span className="text-[10px] text-emerald-400">ระบบอัปเดตอัตโนมัติทุก 2 วินาที</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {incomingCustomers.map(cust => (
                <div key={cust.id} className="p-3.5 rounded-2xl bg-[#070D1E] border border-white/10 flex items-center justify-between text-xs font-mono hover:border-cyan-400/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-lg">
                      {cust.vehicle}
                    </div>
                    <div>
                      <h5 className="font-bold text-white">{cust.name}</h5>
                      <p className="text-[10px] text-slate-400">{cust.riderName}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    ~{cust.etaMin.toFixed(0)} นาที
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLAIM PROMOTION QR VOUCHER (สำหรับลูกค้ากดรับสิทธิ์) */}
      {/* ========================================================================= */}
      {selectedClaimPromo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#0C1E40] via-[#070D1E] to-[#040814] border-2 border-amber-400/60 p-6 shadow-[0_0_50px_rgba(255,215,0,0.3)] space-y-5 text-center relative animate-scaleIn">
            <button
              onClick={() => setSelectedClaimPromo(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(255,215,0,0.5)]">
              🎁
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-bold uppercase">
                {selectedClaimPromo.badge}
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                {selectedClaimPromo.title}
              </h3>
              <p className="text-2xl font-black text-[#FFD700] font-mono mt-1 drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]">
                {selectedClaimPromo.discount}
              </p>
              <p className="text-xs text-slate-300 mt-2 font-mono">
                {selectedClaimPromo.condition}
              </p>
            </div>

            {/* Luminous QR Code Box */}
            <div className="p-4 rounded-2xl bg-white p-4 mx-auto max-w-[200px] shadow-2xl flex flex-col items-center justify-center">
              <QrCode className="w-36 h-36 text-slate-950" />
              <span className="text-[10px] font-mono text-slate-600 font-bold mt-1">
                WIN-PARTNER-{selectedPartner.id.toUpperCase()}-VOUCHER
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 font-mono text-left space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <CheckCircle2 className="w-4 h-4" />
                วิธีใช้งาน:
              </p>
              <p className="text-[11px] text-slate-300">
                ยื่นหน้าจอนี้ให้พนักงานร้าน {selectedPartner.name} สแกนก่อนสั่งอาหารหรือชำระเงินเพื่อรับส่วนลดทันที
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedClaimPromo(null);
                  handleRideToHere();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
              >
                <Bike className="w-4 h-4" />
                <span>เรียกรถพี่วินพาไปร้าน</span>
              </button>
              <button
                onClick={() => setSelectedClaimPromo(null)}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RIDE PINNING CONFIRMATION (ปักหมุดเรียกพี่วินพามาที่พาร์ทเนอร์) */}
      {/* ========================================================================= */}
      {showRideConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#0C1E40] via-[#070D1E] to-[#040814] border-2 border-cyan-400/60 p-6 shadow-[0_0_50px_rgba(0,210,255,0.3)] space-y-5 text-center relative animate-scaleIn">
            <button
              onClick={() => setShowRideConfirmModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(0,210,255,0.5)]">
              🛵
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono font-bold">
                WIN RIDE DISPATCH
              </span>
              <h3 className="text-lg font-black text-white mt-2">
                ปักหมุดเรียกพี่วินพาไปที่ {selectedPartner.name}
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-mono">
                {selectedPartner.address}
              </p>
            </div>

            {/* Trip estimate breakdown */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/50 border border-white/10 font-mono text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400">ระยะทาง</span>
                <p className="text-sm font-black text-cyan-400">{selectedPartner.distanceKm} กม.</p>
              </div>
              <div className="space-y-0.5 border-x border-white/10">
                <span className="text-[10px] text-slate-400">เวลาประมาณ</span>
                <p className="text-sm font-black text-amber-400">~5 นาที</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400">ค่าโดยสาร</span>
                <p className="text-sm font-black text-emerald-400">฿{selectedPartner.estimatedWinFare || 35}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-left text-xs text-cyan-200 font-mono space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                จุดจอดเทียบด่วน VIP ในร่ม:
              </p>
              <p className="text-[11px] text-slate-300">
                {selectedPartner.parkingInfo?.winDropoffLane}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirmRideDispatch}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.5)]"
              >
                <Bike className="w-4 h-4" />
                <span>ยืนยันเรียกพี่วินทันที</span>
              </button>
              <button
                onClick={() => setShowRideConfirmModal(false)}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD PROMOTION FOR PARTNER OWNER (พาร์ทเนอร์เพิ่มสิทธิพิเศษใหม่) */}
      {/* ========================================================================= */}
      {showAddPromoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-[#070D1E] border-2 border-amber-400/60 p-6 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <span>เพิ่มสิทธิพิเศษ / ส่วนลดใหม่สำหรับลูกค้า</span>
              </h3>
              <button onClick={() => setShowAddPromoModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOwnerPromo} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">ชื่อโปรโมชั่น / สิทธิพิเศษ:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ลด 15% ค่าอาหาร, แถมเครื่องดื่มฟรี 1 แก้ว"
                  value={newPromoTitle}
                  onChange={(e) => setNewPromoTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-mono focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">ข้อความส่วนลด (% หรือจำนวนเงิน):</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ลด 20%, ฟรี 1 จาน, 1 แถม 1"
                  value={newPromoDiscount}
                  onChange={(e) => setNewPromoDiscount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-mono focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">เงื่อนไขการรับสิทธิ์:</label>
                <input
                  type="text"
                  placeholder="เช่น เมื่อนั่งพี่วินมาที่ร้าน, เมื่อแสดงบัตรสมาชิกในแอป"
                  value={newPromoCondition}
                  onChange={(e) => setNewPromoCondition(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-mono focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">ป้ายกำกับ (Badge):</label>
                <select
                  value={newPromoBadge}
                  onChange={(e) => setNewPromoBadge(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-mono focus:border-amber-400 outline-none"
                >
                  <option value="Exclusive Deal">Exclusive Deal 🌟</option>
                  <option value="Happy Hour">Happy Hour 🍸</option>
                  <option value="WIN Rider Special">WIN Rider Special 🛵</option>
                  <option value="VIP Perk">VIP Perk 👑</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg"
                >
                  บันทึกและเริ่มแจกสิทธิ์ทันที
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPromoModal(false)}
                  className="px-4 py-3 rounded-xl bg-white/10 text-white font-mono text-xs font-bold"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL FOR PAYMENT */}
      <WinScanAndPayModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        entityName={selectedPartner.name}
        entityType="partner"
        entityCategoryLabel={selectedPartner.categoryLabel}
        defaultAmount={250}
        qrWalletAddress={selectedPartner.walletQrAddress}
        audioEnabled={audioEnabled}
      />

      {/* PROFILE CUSTOMIZER MODAL FOR PARTNER */}
      <ProfileCustomizerModal
        isOpen={showProfileCustomizerModal}
        onClose={() => setShowProfileCustomizerModal(false)}
        currentData={partnerCustomizations[selectedPartner.id] || {
          displayName: selectedPartner.name,
          bioStatus: selectedPartner.description,
          avatarEmoji: selectedPartner.icon,
          themeColor: '#00D2FF',
          bannerGlow: selectedPartner.coverGradient
        }}
        role="partner"
        onSave={(updated) => {
          setPartnerCustomizations(prev => ({
            ...prev,
            [selectedPartner.id]: updated
          }));
        }}
        audioEnabled={audioEnabled}
      />
    </div>
  );
};
