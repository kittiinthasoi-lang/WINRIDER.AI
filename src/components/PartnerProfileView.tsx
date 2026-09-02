import React, { useState, useEffect } from 'react';
import { 
  PartnerProfile, 
  PartnerCategory, 
  PartnerEvent, 
  PartnerPromotion 
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
  Maximize2
} from 'lucide-react';
import { playTactileBlip, playLevelUpFanfare, playRadarScan } from '../utils/audio';
import { WinScanAndPayModal } from './WinScanAndPayModal';
import { DensityRadarOverlay } from './DensityRadarOverlay';
import confetti from 'canvas-confetti';

interface PartnerProfileViewProps {
  audioEnabled?: boolean;
  onOpenWinBuddy?: () => void;
}

export const SAMPLE_PARTNERS: PartnerProfile[] = [
  {
    id: 'partner-bar-01',
    name: 'THE KNIGHT ROOFTOP & SPEAKEASY BAR',
    category: 'pub_bar',
    categoryLabel: 'ผับ & บาร์ / ไนต์ไลฟ์',
    icon: '🍸',
    coverGradient: 'from-purple-900/60 via-[#070D1E] to-[#0A1A3F]',
    rating: 4.95,
    reviewCount: 380,
    level: 63,
    tierName: 'พาร์ทเนอร์ระดับผู้พิชิต (Conqueror Partner LV.63) ⚔️',
    xp: 36500,
    nextXp: 45000,
    address: 'ชั้น 42 อาคาร Exchange Tower อโศกมนตรี',
    distanceKm: 0.8,
    phone: '02-888-9999',
    openHours: '17:00 - 02:00 น.',
    todayCustomersArrivingViaWin: 42,
    activeWinDriversInZone: 18,
    description: 'บาร์รูฟท็อปวิวพาโนรามา 360 องศาใจกลางอโศก ค็อกเทลสูตรพิเศษ พร้อมดนตรีสดแจ๊ส & อะคูสติกทุกค่ำคืน เดินทางสะดวกด้วยพี่วินจอดเทียบถึงหน้าลิฟต์',
    amenities: ['วิวระฟ้า 360°', 'ดนตรีสดทุกวัน', 'บริการจอดเทียบพี่วิน VIP', 'บาร์เทนเดอร์ระดับรางวัล'],
    eventsToday: [
      {
        id: 'ev-1',
        title: 'Live Acoustic Session: วง The Blue Velvet',
        time: '20:30 - 22:30 น.',
        description: 'บทเพลงแจ๊สคลาสสิกและป๊อปอะคูสติกฟังสบาย',
        highlight: 'ศิลปินดังรับเชิญ: แป้งโกะ & คชา',
        artistOrChef: 'The Blue Velvet Band',
        tag: 'ดนตรีสดคืนนี้'
      },
      {
        id: 'ev-2',
        title: 'Midnight DJ Electro-Swing Set',
        time: '23:00 - 01:30 น.',
        description: 'ปาร์ตี้บีทสนุกยามดึกกับดีเจชื่อดัง',
        highlight: 'Special Guest: DJ COSMO',
        artistOrChef: 'DJ COSMO',
        tag: 'ปาร์ตี้ดึก'
      }
    ],
    promotionsToday: [
      {
        id: 'promo-1',
        title: 'Happy Hour 1 แถม 1 Signature Cocktail',
        discount: 'Buy 1 Get 1',
        condition: 'เมื่อเดินทางมาด้วยพี่วิน WINRIDER ก่อน 20:00 น.',
        validUntil: '20:00 น.',
        badge: 'WIN Special Deal'
      },
      {
        id: 'promo-2',
        title: 'เปิดเซ็ตไวน์พรีเมียม รับส่วนลด 20%',
        discount: 'ลด 20%',
        condition: 'แสดงบัตร Citizen หรือ Knight Badge ในแอป',
        validUntil: 'สิ้นสุดคืนนี้',
        badge: 'VIP Perk'
      }
    ],
    specialHighlights: [
      'เมนูค็อกเทลแนะนำ: "Sovereign Gold Lion 🦁" รสสัมผัสซิตรัสผสมทองคำเปลว 24K',
      'จุดรอรถพี่วินในร่ม VIP ชั้น B1 พร้อมหน้าจอเรดาร์แสดงสถานะการเดินทาง',
      'สิทธิประโยชน์สะสมแต้ม WIN Token คืนเงิน 5% ทุกบิล'
    ],
    walletQrAddress: 'WIN-PARTNER-ROOFTOP-7721'
  },
  {
    id: 'partner-hotel-02',
    name: 'GRAND SOVEREIGN SUITE & RESIDENCE',
    category: 'hotel',
    categoryLabel: 'โรงแรม & ที่พักหรู',
    icon: '🏨',
    coverGradient: 'from-amber-900/40 via-[#070D1E] to-[#0A1A3F]',
    rating: 4.92,
    reviewCount: 520,
    level: 82,
    tierName: 'โรงแรมระดับเพชรจักรพรรดิ (Diamond Hotel Partner) 💎',
    xp: 62000,
    nextXp: 70000,
    address: 'สุขุมวิท 24 แขวงคลองตัน เขตคลองเตย กทม.',
    distanceKm: 0.5,
    phone: '02-777-5555',
    openHours: 'เปิดบริการ 24 ชั่วโมง',
    todayCustomersArrivingViaWin: 68,
    activeWinDriversInZone: 24,
    description: 'โรงแรมระดับ 5 ดาวดีไซน์โมเดิร์นลักชัวรี พร้อมสระว่ายน้ำอินฟินิตี้พูล สปาสมุนไพรไทย และบริการรับส่งสนามบินด้วยเครือข่ายอัศวินมอเตอร์ไซค์ระดับพรีเมียม',
    amenities: ['สระว่ายน้ำ Infinity Pool', 'สปาพรีเมียม 24 ชม.', 'บริการพี่วิน Shuttle จุดต่อ BTS', 'อาหารเช้านานาชาติ'],
    eventsToday: [
      {
        id: 'ev-3',
        title: 'Sunset Wine Tasting & Jazz By The Pool',
        time: '17:30 - 19:30 น.',
        description: 'ชิมไวน์รสเลิศริมสระว่ายน้ำวิวพระอาทิตย์ตกดิน',
        highlight: 'Sommelier แนะนำไวน์ 6 ชนิด',
        artistOrChef: 'Chef Pierre & Sommelier Somchai',
        tag: 'อีเวนต์วันนี้'
      }
    ],
    promotionsToday: [
      {
        id: 'promo-3',
        title: 'Staycation Suite Room Upgrade ฟรี!',
        discount: 'Free Upgrade',
        condition: 'เมื่อจองตรงและเช็คอินผ่านแอป WINRIDER',
        validUntil: '31 ธ.ค. 2026',
        badge: 'Exclusive'
      },
      {
        id: 'promo-4',
        title: 'แพ็กเกจสปาอโรม่า 90 นาที ลด 35%',
        discount: 'ลด 35%',
        condition: 'สำหรับผู้โดยสารที่นั่งพี่วินมาใช้บริการ',
        validUntil: '22:00 น.',
        badge: 'Spa Deal'
      }
    ],
    specialHighlights: [
      'จุดรับส่งเฉพาะผู้โดยสาร WINRIDER พร้อมเลานจ์พักคอยเครื่องดื่มฟรี',
      'บริการ Fast Track Check-in สำหรับสมาชิกระดับอัศวิน',
      'เชื่อมต่อสถานี BTS พร้อมพงษ์เพียง 2 นาทีด้วย Dream Ride'
    ],
    walletQrAddress: 'WIN-PARTNER-HOTEL-5582'
  },
  {
    id: 'partner-buffet-03',
    name: 'WAGYU & SEAFOOD IMPERIAL BUFFET',
    category: 'buffet',
    categoryLabel: 'ร้านบุฟเฟต์ & อาหารนานาชาติ',
    icon: '🥩',
    coverGradient: 'from-red-950/60 via-[#070D1E] to-[#0A1A3F]',
    rating: 4.97,
    reviewCount: 890,
    level: 90,
    tierName: 'ภัตตาคารบุฟเฟต์ระดับมาสเตอร์การันตี 🌟',
    xp: 82000,
    nextXp: 90000,
    address: 'ซอยทองหล่อ 10 อาคาร The Grand Terrace',
    distanceKm: 1.4,
    phone: '02-999-1234',
    openHours: '11:00 - 23:00 น.',
    todayCustomersArrivingViaWin: 95,
    activeWinDriversInZone: 31,
    description: 'บุฟเฟต์เนื้อวากิว A5 นำเข้าจากญี่ปุ่น กุ้งแม่น้ำอยุธยาเผาผ่าหัวมันเยิ้ม ซาชิมิฮามาจิ & แซลมอนนอร์เวย์ไม่อั้น บริการรวดเร็วทันใจ',
    amenities: ['วากิว A5 ไม่อั้น', 'กุ้งแม่น้ำเผามันเยิ้ม', 'ฮาเก้นดาสไม่อั้น', 'ที่นั่ง VIP 150 ที่'],
    eventsToday: [
      {
        id: 'ev-4',
        title: 'โชว์แล่ปลามากุโร่ยักษ์สดๆ โดยเชฟญี่ปุ่น',
        time: '18:00 น. & 20:00 น.',
        description: 'ตื่นตากับการแล่ปลาบลูฟินทูน่า 100 กก. พร้อมเสิร์ฟโอโทโร่สดทันที',
        highlight: 'Chef Kenji จากโตเกียว',
        artistOrChef: 'Master Chef Kenji',
        tag: 'ไฮไลต์วันนี้'
      }
    ],
    promotionsToday: [
      {
        id: 'promo-5',
        title: 'มา 4 จ่าย 3 แพ็กเกจ Ultimate Wagyu A5',
        discount: 'มา 4 จ่าย 3',
        condition: 'เรียกรถพี่วินมาทั้งกลุ่ม รับสิทธิ์ทันที',
        validUntil: '22:30 น.',
        badge: 'Hot Group Deal'
      },
      {
        id: 'promo-6',
        title: 'ฟรี! ซุปเห็ดทรัฟเฟิลดำ & ฟัวกราส์ย่าง 1 จาน',
        discount: 'Free Special Dish',
        condition: 'เมื่อแสดงโค้ด WIN-BUFFET ในแอป',
        validUntil: 'สิ้นสุดวันนี้',
        badge: 'Bonus Dish'
      }
    ],
    specialHighlights: [
      'วัตถุดิบนำเข้าสดใหม่วันต่อวัน มาตรฐานสุขอนามัย SHA Extra Plus',
      'พี่วินจัดส่งเซ็ตเดลิเวอรีกล่องเก็บความร้อนพิเศษคงความฉ่ำ 100%',
      'สะสมแต้มแลกบัตรรับประทานอาหารฟรีทุก 10 ครั้ง'
    ],
    walletQrAddress: 'WIN-PARTNER-BUFFET-3391'
  }
];

export const PartnerProfileView: React.FC<PartnerProfileViewProps> = ({
  audioEnabled = true,
  onOpenWinBuddy
}) => {
  const [selectedPartner, setSelectedPartner] = useState<PartnerProfile>(SAMPLE_PARTNERS[0]);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'promotions' | 'radar3d'>('overview');
  
  // 3D Live Customer Radar Simulation
  const [incomingCustomers, setIncomingCustomers] = useState<{ id: string; name: string; riderName: string; etaMin: number; x: number; y: number; vehicle: string }[]>([
    { id: 'c1', name: 'คุณนภัสสร (โต๊ะจอง 4 ท่าน)', riderName: 'พี่วินสมชาย (XMAX 300)', etaMin: 3, x: 30, y: 40, vehicle: '🏍️' },
    { id: 'c2', name: 'คุณธนภัทร & เพื่อน', riderName: 'พี่วินวิชัย (Forza 350)', etaMin: 6, x: 65, y: 25, vehicle: '🏍️' },
    { id: 'c3', name: 'Mr. David (Tourist VIP)', riderName: 'พี่วินประเสริฐ (CB650R)', etaMin: 9, x: 75, y: 70, vehicle: '🏍️' },
    { id: 'c4', name: 'คุณกิตติ (Diamond Member)', riderName: 'พี่วินธีรพงษ์ (Vespa GTS)', etaMin: 12, x: 20, y: 80, vehicle: '🏍️' }
  ]);

  // Periodic simulated radar movement
  useEffect(() => {
    const interval = setInterval(() => {
      setIncomingCustomers(prev => prev.map(c => ({
        ...c,
        etaMin: Math.max(1, c.etaMin - 0.2),
        x: c.x + (50 - c.x) * 0.05,
        y: c.y + (50 - c.y) * 0.05
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPartner = (p: PartnerProfile) => {
    if (audioEnabled) playTactileBlip(800);
    setSelectedPartner(p);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Partner Selector Top Bar */}
      <section className="p-4 rounded-3xl bg-[#070D1E]/90 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">หน้าจอโปรไฟล์ พาร์ทเนอร์ (WIN Partner Network)</h2>
            <p className="text-xs text-slate-400">เลือกดูโปรไฟล์พาร์ทเนอร์แต่ละประเภท พร้อมแผนที่ 3 มิติติดตามลูกค้า</p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {SAMPLE_PARTNERS.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPartner(p)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
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

      {/* Main Profile Header Card */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${selectedPartner.coverGradient} border border-cyan-500/30 p-6 sm:p-8 shadow-2xl space-y-6`}>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-black/60 border-2 border-cyan-400/80 p-1 flex items-center justify-center text-3xl sm:text-4xl shadow-[0_0_20px_rgba(0,210,255,0.4)] flex-shrink-0">
              {selectedPartner.icon}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                  {selectedPartner.categoryLabel}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 text-[10px] font-mono font-bold">
                  LEVEL {selectedPartner.level} • {selectedPartner.tierName}
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-white tracking-wide">
                {selectedPartner.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" /> {selectedPartner.rating} ({selectedPartner.reviewCount} รีวิว)
                </span>
                <span className="flex items-center gap-1 text-cyan-300">
                  <MapPin className="w-3.5 h-3.5" /> {selectedPartner.address} ({selectedPartner.distanceKm} กม.)
                </span>
                <span className="text-slate-400">🕒 {selectedPartner.openHours}</span>
              </div>
            </div>
          </div>

          {/* Partner Action Stats */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(1100);
                setIsQrModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(0,210,255,0.5)] active:scale-95 transition-all flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>WIN Scan & Pay (สร้าง QR รับเงิน)</span>
            </button>
          </div>
        </div>

        {/* Level & XP Progress Bar for Partner */}
        <div className="relative z-10 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>Partner Prestige Level & Experience</span>
            </span>
            <span className="text-amber-400 font-bold">
              {selectedPartner.xp.toLocaleString()} / {selectedPartner.nextXp.toLocaleString()} XP ({Math.round((selectedPartner.xp / selectedPartner.nextXp) * 100)}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-[#FFD700] rounded-full transition-all duration-500"
              style={{ width: `${(selectedPartner.xp / selectedPartner.nextXp) * 100}%` }}
            />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono">ลูกค้าเดินทางมาด้วยพี่วินวันนี้</span>
            <p className="text-xl font-black text-cyan-400 font-mono">{selectedPartner.todayCustomersArrivingViaWin} คน</p>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono">พี่วินสแตนด์บายรอบร้าน</span>
            <p className="text-xl font-black text-emerald-400 font-mono">{selectedPartner.activeWinDriversInZone} คัน</p>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono">คะแนนความพึงพอใจ</span>
            <p className="text-xl font-black text-amber-400 font-mono">99.4%</p>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono">สถานะจุดเทียบรถ VIP</span>
            <p className="text-xl font-black text-blue-400 font-mono">READY</p>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <section className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto text-xs">
        {[
          { id: 'overview' as const, label: '📋 ข้อมูลและจุดเด่นร้าน', icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: 'events' as const, label: `🎉 กิจกรรมวันนี้ (${selectedPartner.eventsToday.length})`, icon: <Calendar className="w-3.5 h-3.5" /> },
          { id: 'promotions' as const, label: `🏷️ โปรโมชั่นพิเศษ (${selectedPartner.promotionsToday.length})`, icon: <Percent className="w-3.5 h-3.5" /> },
          { id: 'radar3d' as const, label: '📡 เรดาร์ 3D ลูกค้ากำลังเดินทางมา', icon: <Radio className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              setActiveTab(tab.id);
            }}
            className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </section>

      {/* Tab 1: Overview & Specific Highlights */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-[#070D1E] border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>เกี่ยวกับพาร์ทเนอร์ ({selectedPartner.categoryLabel})</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedPartner.description}
            </p>

            <div className="pt-3 border-t border-white/10 space-y-3">
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

            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="text-xs font-mono text-amber-400 uppercase font-bold">
                คำแนะนำพิเศษสำหรับลูกค้า WINRIDER
              </span>
              <div className="space-y-1.5">
                {selectedPartner.specialHighlights.map((hl, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                    <span className="text-amber-400 font-bold">★</span>
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Contact & Action card */}
          <div className="p-6 rounded-3xl bg-[#070D1E] border border-cyan-500/30 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white font-mono">ข้อมูลการติดต่อพาร์ทเนอร์</h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400">เบอร์โทรติดต่อ:</span>
                  <p className="text-white font-mono font-bold">{selectedPartner.phone}</p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400">พิกัดสถานที่:</span>
                  <p className="text-cyan-300">{selectedPartner.address}</p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400">เวลาทำการ:</span>
                  <p className="text-emerald-400 font-mono">{selectedPartner.openHours}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsQrModalOpen(true)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-[#0066FF] text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>เปิด QR สแกนจ่ายเงิน (WIN Scan & Pay)</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Events Today */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white font-mono">
              ตารางกิจกรรมพิเศษและศิลปินวันนี้ ({selectedPartner.name})
            </span>
            <span className="text-xs text-cyan-400">อัปเดตแบบเรียลไทม์</span>
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
                  <span className="text-xs font-mono text-amber-400 font-bold">🕒 {ev.time}</span>
                </div>

                <div>
                  <h4 className="text-base font-black text-white">{ev.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ev.description}</p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-cyan-300 font-mono flex items-center justify-between">
                  <span>ศิลปิน/เชฟ: <strong>{ev.artistOrChef}</strong></span>
                  <span className="text-emerald-400 font-bold">{ev.highlight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Promotions Today */}
      {activeTab === 'promotions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white font-mono">
              โปรโมชั่นพิเศษสำหรับผู้โดยสาร WINRIDER
            </span>
            <span className="text-xs text-amber-400">แสดงแอปเพื่อรับสิทธิ์</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPartner.promotionsToday.map(pr => (
              <div 
                key={pr.id}
                className="p-5 rounded-3xl bg-gradient-to-br from-[#0B1838] to-[#070D1E] border border-[#FFD700]/30 hover:border-[#FFD700] space-y-3 shadow-xl transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    {pr.badge}
                  </span>
                  <span className="text-xs font-mono text-cyan-300">ใช้ได้ถึง {pr.validUntil}</span>
                </div>

                <div>
                  <h4 className="text-base font-black text-white">{pr.title}</h4>
                  <p className="text-xs text-slate-300 mt-1">เงื่อนไข: {pr.condition}</p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <span className="text-xs text-slate-400">ส่วนลดที่ได้รับ:</span>
                  <span className="text-base font-mono font-black text-[#FFD700]">{pr.discount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: 3D Customer Radar */}
      {activeTab === 'radar3d' && (
        <div className="space-y-4">
          <DensityRadarOverlay
            venueName={selectedPartner.name}
            venueIcon={selectedPartner.icon}
            venueCategory={selectedPartner.categoryLabel}
            radiusKm={3.0}
            audioEnabled={audioEnabled}
          />

          {/* Incoming Queue List */}
          <div className="p-4 rounded-2xl bg-[#061022] border border-cyan-500/30 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs text-white">
              <span className="font-bold flex items-center gap-2 text-cyan-300">
                <Users className="w-4 h-4" />
                <span>คิวลูกค้าที่กำลังเดินทางมุ่งหน้ามายัง {selectedPartner.name} (Live Telemetry)</span>
              </span>
              <span className="text-[10px] text-emerald-400">ระบบอัปเดตอัตโนมัติทุก 1.5 วินาที</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {incomingCustomers.map(cust => (
                <div key={cust.id} className="p-3 rounded-2xl bg-[#070D1E] border border-white/10 flex items-center justify-between text-xs font-mono hover:border-cyan-400/40 transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-base">
                      {cust.vehicle}
                    </div>
                    <div>
                      <h5 className="font-bold text-white">{cust.name}</h5>
                      <p className="text-[10px] text-slate-400">{cust.riderName}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    ~{cust.etaMin.toFixed(0)} นาที
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
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
    </div>
  );
};
