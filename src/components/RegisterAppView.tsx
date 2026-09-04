import React, { useState } from 'react';
import { playTactileBlip, playRadarScan, playNfcSyncSound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  XP_DIFFICULTY_CONFIG, 
  KNIGHT_10_TIERS, 
  CITIZEN_10_TIERS, 
  MERCHANT_10_TIERS 
} from '../data/tierHierarchyData';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  UserPlus, 
  Bike, 
  User, 
  Store, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  QrCode, 
  Fingerprint, 
  Check, 
  Coins, 
  Phone, 
  CreditCard, 
  MapPin, 
  Flame,
  Award,
  Zap,
  Info,
  Calendar,
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';

interface RegisterAppViewProps {
  audioEnabled: boolean;
  onOpenWinBuddy?: () => void;
  onNavigateToMode?: (mode: 'passenger' | 'driver' | 'merchant' | 'hospital') => void;
}

type RoleType = 'driver' | 'customer' | 'merchant' | 'partner';

export const RegisterAppView: React.FC<RegisterAppViewProps> = ({
  audioEnabled,
  onOpenWinBuddy,
  onNavigateToMode
}) => {
  const [selectedRole, setSelectedRole] = useState<RoleType>('driver');
  const [formStep, setFormStep] = useState<number>(1);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [issuedCitizenId, setIssuedCitizenId] = useState<string>('');

  // 1. Driver Form State
  const [driverForm, setDriverForm] = useState({
    fullName: 'สมชาย รักเกียรติ',
    idCard: '1-1002-39482-91-0',
    phone: '089-123-4567',
    winStation: 'วินทองหล่อ ซอย 10 (หน้าสถานีรถไฟฟ้า)',
    district: 'วัฒนา, กรุงเทพมหานคร',
    bikeModel: 'Honda Wave 125i (2024)',
    licensePlate: '1กข-9922 กทม.',
    helmetSize: 'L (59-60cm)',
    suitSize: 'XL (อก 44")',
    installmentSelected: true, // 1+1+1+1
    bloodType: 'O',
    emergencyContact: '081-998-8776 (สมศรี - ภรรยา)',
    acceptWelfareFund: true
  });

  // 2. Customer Form State
  const [customerForm, setCustomerForm] = useState({
    fullName: 'วิภาดา รัตนกุล',
    phone: '081-445-5667',
    emergencyContact: '089-776-5432 (คุณแม่)',
    district: 'คลองเตย, กรุงเทพมหานคร',
    preferredPayment: 'QR PromptPay / Wallet 2฿',
    needHygieneCap: true,
    applyRideLater: true,
    joinC2CMarket: true
  });

  // 3. Merchant Form State
  const [merchantForm, setMerchantForm] = useState({
    shopName: 'ก๋วยเตี๋ยวเรืออยุธยา สูตรโบราณ (สาขาทองหล่อ)',
    category: 'ร้านอาหาร & เครื่องดื่ม',
    ownerName: 'ธนวัฒน์ ศรีประเสริฐ',
    phone: '095-887-2211',
    address: '24/5 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา',
    needFastDispatch: true, // Standby 3 min
    requestWorkingCapital: true, // 0% Loan
    openHours: '09:00 - 22:00 น.'
  });

  // 4. Partner Form State
  const [partnerForm, setPartnerForm] = useState({
    companyName: 'บริษัท ไทย ไบค์เซอร์วิส จำกัด (สมาคมศูนย์ซ่อมบำรุงพระนคร)',
    partnerType: 'ศูนย์ซ่อมบำรุง & เปลี่ยนถ่ายน้ำมันเครื่อง WIN-Hub',
    contactPerson: 'วิศรุต อภิวัฒนานันท์',
    email: 'contact@thaibikeservice.co.th',
    phone: '02-712-9900',
    stationLocations: '5 สาขา (ทองหล่อ, เอกมัย, อโศก, พระโขนง, อ่อนนุช)',
    fleetSize: 'รองรับมอเตอร์ไซค์ 200 คัน/วัน'
  });

  const handleRoleChange = (role: RoleType) => {
    if (audioEnabled) playTactileBlip(800);
    setSelectedRole(role);
    setFormStep(1);
    setIsSubmitted(false);
  };

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (audioEnabled) playNfcSyncSound();
    
    // Generate sovereign digital id
    const prefix = selectedRole === 'driver' ? 'WIN-KGT' : selectedRole === 'customer' ? 'WIN-CTZ' : selectedRole === 'merchant' ? 'WIN-MCH' : 'WIN-PTN';
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const newId = `${prefix}-${randNum}`;
    setIssuedCitizenId(newId);
    setIsSubmitted(true);

    // Persist to Firebase Firestore
    try {
      const profileData = {
        id: newId,
        role: selectedRole,
        name: selectedRole === 'driver' ? driverForm.fullName : selectedRole === 'customer' ? customerForm.fullName : selectedRole === 'merchant' ? merchantForm.shopName : partnerForm.companyName,
        phone: selectedRole === 'driver' ? driverForm.phone : selectedRole === 'customer' ? customerForm.phone : selectedRole === 'merchant' ? merchantForm.phone : partnerForm.contactPhone,
        level: 1,
        xp: 100,
        rating: 5.0,
        armorTier: selectedRole === 'driver' ? 1 : 0,
        promptPayId: selectedRole === 'driver' ? driverForm.phone.replace(/[^0-9]/g, '') : '',
        updatedAt: new Date().toISOString(),
      };
      setDoc(doc(db, 'users', newId), profileData).catch((err) => console.warn('Firebase user save err:', err));
    } catch {}

    confetti({
      particleCount: 100,
      spread: 90,
      colors: ['#00D2FF', '#FFD700', '#10B981', '#F59E0B']
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* HEADER BANNER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0C1A38] via-[#081226] to-[#050B18] border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(0,210,255,0.2)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                SOVEREIGN REGISTRATION PORTAL
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono">
                เปิดรับ 4 บทบาท
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ศูนย์ลงทะเบียนอธิปไตยดิจิทัล (WINRIDER.AI)
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              เข้าร่วมเครือข่ายอธิปไตยแห่งแรกของพระนคร ไม่ว่าจะเป็น <strong>พี่วิน (อัศวิน)</strong>, <strong>ลูกค้า (พลเมือง)</strong>, <strong>ร้านค้าพันธมิตร</strong> หรือ <strong>พาร์ทเนอร์องค์กร</strong> พร้อมรับสวัสดิการ 2฿ และระบบ 10 ระดับยศ
            </p>
          </div>

          {/* Quick Stats Pillar */}
          <div className="grid grid-cols-2 gap-2.5 flex-shrink-0 bg-black/40 p-3.5 rounded-2xl border border-white/10 text-center font-mono">
            <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-500/30">
              <span className="text-[10px] text-slate-400 block">อัศวินในระบบ</span>
              <strong className="text-cyan-300 text-sm">48,500+ นาย</strong>
            </div>
            <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
              <span className="text-[10px] text-slate-400 block">ร้านค้า & ลูกค้า</span>
              <strong className="text-emerald-300 text-sm">1.2M+ บัญชี</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4-ROLE SELECTOR TABS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Driver Role */}
        <button
          onClick={() => handleRoleChange('driver')}
          className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-start gap-2.5 text-left relative overflow-hidden ${
            selectedRole === 'driver'
              ? 'bg-gradient-to-br from-[#0F234C] via-[#0A1633] to-[#070D1E] border-cyan-400 shadow-[0_0_25px_rgba(0,210,255,0.3)]'
              : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-xl">
            🛵
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white">1. พี่วิน (อัศวินผู้พิทักษ์)</span>
            </div>
            <span className="text-[11px] text-slate-400 block">Knight Driver Edition</span>
          </div>
          <div className="mt-auto w-full pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
            <span className="text-rose-300 font-bold">⚡ +1,000% ความยาก XP</span>
            <span className="text-cyan-300">ผ่อน 80฿/วัน</span>
          </div>
        </button>

        {/* 2. Customer Role */}
        <button
          onClick={() => handleRoleChange('customer')}
          className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-start gap-2.5 text-left relative overflow-hidden ${
            selectedRole === 'customer'
              ? 'bg-gradient-to-br from-[#0A2E28] via-[#081F1B] to-[#070D1E] border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
              : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl">
            🦥
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white">2. ลูกค้า (พลเมืองอธิปไตย)</span>
            </div>
            <span className="text-[11px] text-slate-400 block">Sovereign Citizen Passenger</span>
          </div>
          <div className="mt-auto w-full pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
            <span className="text-purple-300 font-bold">⚡ +2,000% ความยาก XP</span>
            <span className="text-emerald-300">คุ้มครอง 1 แสน</span>
          </div>
        </button>

        {/* 3. Merchant Role */}
        <button
          onClick={() => handleRoleChange('merchant')}
          className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-start gap-2.5 text-left relative overflow-hidden ${
            selectedRole === 'merchant'
              ? 'bg-gradient-to-br from-[#3D2507] via-[#241604] to-[#070D1E] border-amber-400 shadow-[0_0_25px_rgba(255,215,0,0.3)]'
              : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl">
            🏪
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white">3. ร้านค้า (พันธมิตรพาณิชย์)</span>
            </div>
            <span className="text-[11px] text-slate-400 block">Merchant & Store Partner</span>
          </div>
          <div className="mt-auto w-full pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
            <span className="text-amber-300 font-bold">⚡ +5,000% ความยาก XP</span>
            <span className="text-amber-400">ส่งด่วน 3 นาที</span>
          </div>
        </button>

        {/* 4. Partner Role */}
        <button
          onClick={() => handleRoleChange('partner')}
          className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-start gap-2.5 text-left relative overflow-hidden ${
            selectedRole === 'partner'
              ? 'bg-gradient-to-br from-[#2D0D3D] via-[#1A0824] to-[#070D1E] border-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.3)]'
              : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-xl">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white">4. พาร์ทเนอร์ (พันธมิตรองค์กร)</span>
            </div>
            <span className="text-[11px] text-slate-400 block">Ecosystem & Fleet Sponsor</span>
          </div>
          <div className="mt-auto w-full pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
            <span className="text-pink-300 font-bold">💎 Strategic B2B</span>
            <span className="text-pink-400">WIN-Hub Sponsor</span>
          </div>
        </button>
      </div>

      {/* XP DIFFICULTY NOTICE BOX */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black text-sm flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                นโยบายอัตราทดความยากเลเวล (Hardcore Leveling Economy):
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-200">
                10 Tiers • Level 1-100
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {selectedRole === 'driver' && 'พี่วิน: เพิ่มความยาก +1,000% (Hyper Hardcore Knight 11x) เพื่อความทรงเกียรติและคุณค่าของชุดเกราะ'}
              {selectedRole === 'customer' && 'ลูกค้า: เพิ่มความยาก +2,000% (Cosmic Hardcore Citizen 21x) สะท้อนความภักดีและการมีส่วนร่วมกับชุมชน'}
              {selectedRole === 'merchant' && 'ร้านค้า: เพิ่มความยาก +5,000% (Ultimate Commercial Scale 51x) ปลดล็อกวงเงินทุนหมุนเวียน 0% ตามยอดขายจริง'}
              {selectedRole === 'partner' && 'พาร์ทเนอร์องค์กร: เชื่อมต่อ API และระบบส่วนแบ่งผลประโยชน์ Ecosystem 8 เสาหลัก'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            {selectedRole === 'driver' ? '+1,000% XP Difficulty' : selectedRole === 'customer' ? '+2,000% XP Difficulty' : selectedRole === 'merchant' ? '+5,000% XP Difficulty' : 'B2B Level Sync'}
          </span>
        </div>
      </div>

      {/* REGISTRATION FORM CARD OR SUCCESS CARD */}
      {!isSubmitted ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0B1730] to-[#070D1E] border-2 border-white/15 shadow-2xl space-y-6">
          
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">
                  {selectedRole === 'driver' && 'แบบฟอร์มลงทะเบียน: อัศวินวินมอเตอร์ไซค์ (Knight Driver)'}
                  {selectedRole === 'customer' && 'แบบฟอร์มลงทะเบียน: พลเมืองผู้โดยสาร (Sovereign Citizen)'}
                  {selectedRole === 'merchant' && 'แบบฟอร์มลงทะเบียน: ร้านค้าพันธมิตร (Merchant Partner)'}
                  {selectedRole === 'partner' && 'แบบฟอร์มลงทะเบียน: พันธมิตรองค์กร & สถานีวินฮับ (Ecosystem Partner)'}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  กรอกข้อมูลเพื่อออกบัตรดิจิทัลอธิปไตย (Digital Sovereign Crest) และเปิดใช้งานทันที
                </span>
              </div>
            </div>

            <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30 hidden sm:inline-block">
              🔒 ความปลอดภัยระดับ SHA-256
            </span>
          </div>

          <form onSubmit={handleSubmitRegistration} className="space-y-6">

            {/* 1. DRIVER FORM FIELDS */}
            {selectedRole === 'driver' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ชื่อ-นามสกุล (ตรงตามบัตรประชาชน)
                    </label>
                    <input
                      type="text"
                      required
                      value={driverForm.fullName}
                      onChange={(e) => setDriverForm({ ...driverForm, fullName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      เลขประจำตัวประชาชน 13 หลัก
                    </label>
                    <input
                      type="text"
                      required
                      value={driverForm.idCard}
                      onChange={(e) => setDriverForm({ ...driverForm, idCard: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      เบอร์โทรศัพท์มือถือที่ใช้งาน
                    </label>
                    <input
                      type="tel"
                      required
                      value={driverForm.phone}
                      onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      สังกัดวิน & จุดตั้งสถานี
                    </label>
                    <input
                      type="text"
                      required
                      value={driverForm.winStation}
                      onChange={(e) => setDriverForm({ ...driverForm, winStation: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ยี่ห้อ & รุ่นรถจักรยานยนต์
                    </label>
                    <input
                      type="text"
                      required
                      value={driverForm.bikeModel}
                      onChange={(e) => setDriverForm({ ...driverForm, bikeModel: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      หมายเลขทะเบียนรถจักรยานยนต์
                    </label>
                    <input
                      type="text"
                      required
                      value={driverForm.licensePlate}
                      onChange={(e) => setDriverForm({ ...driverForm, licensePlate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Sizing & Armor Configuration */}
                <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-3">
                  <h4 className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>ขนาดเสื้อเกราะ & หมวกนิรภัย (Tactical Sizing)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">ไซส์เสื้อเกราะ</label>
                      <select 
                        value={driverForm.suitSize}
                        onChange={(e) => setDriverForm({ ...driverForm, suitSize: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-white text-xs"
                      >
                        <option value="M (อก 40&quot;)">M (รอบอก 40 นิ้ว)</option>
                        <option value="L (อก 42&quot;)">L (รอบอก 42 นิ้ว)</option>
                        <option value="XL (อก 44&quot;)">XL (รอบอก 44 นิ้ว)</option>
                        <option value="2XL (อก 46&quot;)">2XL (รอบอก 46 นิ้ว)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">ไซส์หมวกกันน็อก ECE 22.06</label>
                      <select 
                        value={driverForm.helmetSize}
                        onChange={(e) => setDriverForm({ ...driverForm, helmetSize: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-white text-xs"
                      >
                        <option value="M (57-58cm)">M (57-58 ซม.)</option>
                        <option value="L (59-60cm)">L (59-60 ซม.)</option>
                        <option value="XL (61-62cm)">XL (61-62 ซม.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">กรุ๊ปเลือด (ฉุกเฉิน)</label>
                      <select 
                        value={driverForm.bloodType}
                        onChange={(e) => setDriverForm({ ...driverForm, bloodType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-white text-xs"
                      >
                        <option value="O">O (พบมากที่สุด)</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1+1+1+1 Installment Checkbox */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/50 to-slate-900/50 border border-blue-500/30 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="driverInstallment"
                    checked={driverForm.installmentSelected}
                    onChange={(e) => setDriverForm({ ...driverForm, installmentSelected: e.target.checked })}
                    className="w-4 h-4 rounded mt-0.5 accent-cyan-400 cursor-pointer"
                  />
                  <label htmlFor="driverInstallment" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                    <strong className="text-cyan-300">สมัครโปรแกรมสวัสดิการผ่อนชุดเกราะ 1+1+1+1 (วันละ 80 บาท x 35 รอบ):</strong> รับเสื้อเกราะ V1 + หมวกกันน็อก + ขาจับมือถือชาร์จไร้สาย + กล้อง High-Safety Dashcam ไปใส่ทำงานได้ทันทีตั้งแต่วันแรก
                  </label>
                </div>
              </div>
            )}

            {/* 2. CUSTOMER FORM FIELDS */}
            {selectedRole === 'customer' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ชื่อ-นามสกุล (ผู้โดยสาร)
                    </label>
                    <input
                      type="text"
                      required
                      value={customerForm.fullName}
                      onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      เบอร์โทรศัพท์มือถือ (รับ OTP)
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      เบอร์ติดต่อฉุกเฉิน (SOS Emergency Contact)
                    </label>
                    <input
                      type="text"
                      required
                      value={customerForm.emergencyContact}
                      onChange={(e) => setCustomerForm({ ...customerForm, emergencyContact: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ย่าน / เขตที่อยู่อาศัยหลัก
                    </label>
                    <input
                      type="text"
                      required
                      value={customerForm.district}
                      onChange={(e) => setCustomerForm({ ...customerForm, district: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="custRideLater"
                      checked={customerForm.applyRideLater}
                      onChange={(e) => setCustomerForm({ ...customerForm, applyRideLater: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 accent-emerald-400 cursor-pointer"
                    />
                    <label htmlFor="custRideLater" className="text-xs text-slate-300 cursor-pointer">
                      <strong className="text-emerald-300">เปิดใช้งาน "นั่งก่อนจ่ายทีหลัง" (0% Pay Later):</strong> รับวงเงินเครดิตเริ่มต้น ฿1,500 ไม่ต้องเติมเงินก่อน
                    </label>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="custC2C"
                      checked={customerForm.joinC2CMarket}
                      onChange={(e) => setCustomerForm({ ...customerForm, joinC2CMarket: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 accent-emerald-400 cursor-pointer"
                    />
                    <label htmlFor="custC2C" className="text-xs text-slate-300 cursor-pointer">
                      <strong className="text-emerald-300">เปิดร้านค้า C2C ในโปรไฟล์:</strong> โพสต์ขายของมือสองหรือสินค้าชุมชนฟรีในแอป
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. MERCHANT FORM FIELDS */}
            {selectedRole === 'merchant' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ชื่อร้านค้า / แบรนด์
                    </label>
                    <input
                      type="text"
                      required
                      value={merchantForm.shopName}
                      onChange={(e) => setMerchantForm({ ...merchantForm, shopName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      หมวดหมู่ธุรกิจ
                    </label>
                    <select
                      value={merchantForm.category}
                      onChange={(e) => setMerchantForm({ ...merchantForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
                    >
                      <option value="ร้านอาหาร & เครื่องดื่ม">ร้านอาหาร & เครื่องดื่ม</option>
                      <option value="ร้านของชำ & มินิมาร์ทชุมชน">ร้านของชำ & มินิมาร์ทชุมชน</option>
                      <option value="อะไหล่ & อุปกรณ์มอเตอร์ไซค์">อะไหล่ & อุปกรณ์มอเตอร์ไซค์</option>
                      <option value="เสื้อผ้า & ยุทธภัณฑ์">เสื้อผ้า & ยุทธภัณฑ์</option>
                      <option value="ร้านยา & เวชภัณฑ์">ร้านยา & เวชภัณฑ์</option>
                      <option value="บริการซ่อม & คาร์แคร์">บริการซ่อม & คาร์แคร์</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ชื่อเจ้าของกิจการ / ผู้จัดการ
                    </label>
                    <input
                      type="text"
                      required
                      value={merchantForm.ownerName}
                      onChange={(e) => setMerchantForm({ ...merchantForm, ownerName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      เบอร์โทรติดต่อร้านค้า
                    </label>
                    <input
                      type="tel"
                      required
                      value={merchantForm.phone}
                      onChange={(e) => setMerchantForm({ ...merchantForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ที่ตั้งร้านค้า & พิกัดบนแผนที่ CI Map
                    </label>
                    <input
                      type="text"
                      required
                      value={merchantForm.address}
                      onChange={(e) => setMerchantForm({ ...merchantForm, address: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="merchantCapital"
                      checked={merchantForm.requestWorkingCapital}
                      onChange={(e) => setMerchantForm({ ...merchantForm, requestWorkingCapital: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 accent-amber-400 cursor-pointer"
                    />
                    <label htmlFor="merchantCapital" className="text-xs text-slate-300 cursor-pointer">
                      <strong className="text-amber-300">สมัครขอวงเงินสินเชื่อทุนหมุนเวียนคู่ค้า 0% ดอกเบี้ย:</strong> ปลดล็อกวงเงิน ฿50,000 - ฿500,000 ตามประวัติการส่งของ
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="merchantDispatch"
                      checked={merchantForm.needFastDispatch}
                      onChange={(e) => setMerchantForm({ ...merchantForm, needFastDispatch: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 accent-amber-400 cursor-pointer"
                    />
                    <label htmlFor="merchantDispatch" className="text-xs text-slate-300 cursor-pointer">
                      <strong className="text-amber-300">เชื่อมต่อระบบ Standby 3 นาที:</strong> ให้วินมอเตอร์ไซค์ในรัศมี 300 เมตรวิ่งมารับของทันทีเมื่อมีออเดอร์
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PARTNER FORM FIELDS */}
            {selectedRole === 'partner' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ชื่อองค์กร / นิติบุคคล / เครือข่าย
                    </label>
                    <input
                      type="text"
                      required
                      value={partnerForm.companyName}
                      onChange={(e) => setPartnerForm({ ...partnerForm, companyName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ประเภทความร่วมมือ (Partnership Category)
                    </label>
                    <select
                      value={partnerForm.partnerType}
                      onChange={(e) => setPartnerForm({ ...partnerForm, partnerType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                    >
                      <option value="ศูนย์ซ่อมบำรุง & เปลี่ยนถ่ายน้ำมันเครื่อง WIN-Hub">ศูนย์ซ่อมบำรุง & เปลี่ยนถ่ายน้ำมันเครื่อง WIN-Hub</option>
                      <option value="สถานีสลับแบตเตอรี่ EV & พลังงานสะอาด">สถานีสลับแบตเตอรี่ EV & พลังงานสะอาด</option>
                      <option value="โรงพยาบาล & ศูนย์กู้ชีพฉุกเฉิน 2฿">โรงพยาบาล & ศูนย์กู้ชีพฉุกเฉิน 2฿</option>
                      <option value="ผู้ให้บริการโทรคมนาคม & IoT แดชแคม">ผู้ให้บริการโทรคมนาคม & IoT แดชแคม</option>
                      <option value="สถาบันการเงิน & กองทุนสวัสดิการชุมชน">สถาบันการเงิน & กองทุนสวัสดิการชุมชน</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      ชื่อผู้ประสานงานหลัก
                    </label>
                    <input
                      type="text"
                      required
                      value={partnerForm.contactPerson}
                      onChange={(e) => setPartnerForm({ ...partnerForm, contactPerson: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      อีเมลสำหรับติดต่อธุรกิจ
                    </label>
                    <input
                      type="email"
                      required
                      value={partnerForm.email}
                      onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                      สาขาหรือพื้นที่ที่ต้องการร่วมสนับสนุน WIN-Hub Station
                    </label>
                    <input
                      type="text"
                      required
                      value={partnerForm.stationLocations}
                      onChange={(e) => setPartnerForm({ ...partnerForm, stationLocations: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 font-mono">
                ✦ ข้อมูลจะได้รับการเข้ารหัสและเชื่อมต่อเข้าสู่ฐานข้อมูลส่วนกลาง WINRIDER.AI
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-[#FFD700] hover:brightness-110 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                <span>ยืนยันการลงทะเบียน & ออกบัตรดิจิทัล</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* REGISTRATION COMPLETED CARD & DIGITAL PASS PREVIEW */
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#07132B] via-[#050E20] to-[#040814] border-2 border-emerald-400/60 shadow-[0_0_50px_rgba(16,185,129,0.3)] space-y-6 animate-fade-in">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shadow-lg">
                ✅
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white">ลงทะเบียนสำเร็จเรียบร้อย!</h3>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    STATUS: ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono">
                  ออกบัตรประจำตัวดิจิทัลอธิปไตย (Digital Sovereign Crest) ให้กับท่านแล้ว
                </p>
              </div>
            </div>

            <div className="text-left md:text-right font-mono">
              <span className="text-[10px] text-slate-400 block">รหัสประจำตัวอธิปไตย (SOVEREIGN ID)</span>
              <strong className="text-cyan-300 text-lg tracking-wider">{issuedCitizenId}</strong>
            </div>
          </div>

          {/* HOLOGRAPHIC DIGITAL CARD PREVIEW */}
          <div className="max-w-lg mx-auto p-6 rounded-3xl bg-gradient-to-br from-[#0F2248] via-[#0A1633] to-[#070D1E] border-2 border-cyan-400/60 shadow-2xl relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFD700]/20 border border-[#FFD700]/40 flex items-center justify-center text-sm">
                  👑
                </div>
                <div>
                  <h4 className="text-xs font-black text-white font-mono">WINRIDER SOVEREIGN CREST</h4>
                  <span className="text-[9px] text-cyan-300 font-mono block">KINGDOM OF BANGKOK • 2026</span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                LEVEL 1 • TIER 0
              </span>
            </div>

            {/* Card Identity Details */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">ชื่อผู้ถือบัตร:</span>
                <strong className="text-white">
                  {selectedRole === 'driver' ? driverForm.fullName : selectedRole === 'customer' ? customerForm.fullName : selectedRole === 'merchant' ? merchantForm.shopName : partnerForm.companyName}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">บทบาทในระบบ:</span>
                <span className="text-emerald-400 font-bold">
                  {selectedRole === 'driver' ? '🛵 อัศวินวินมอเตอร์ไซค์ (Knight)' : selectedRole === 'customer' ? '🦥 พลเมืองผู้โดยสาร (Citizen)' : selectedRole === 'merchant' ? '🏪 ร้านค้าพันธมิตร (Merchant)' : '🏢 พันธมิตรองค์กร (Partner)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">ความยาก XP:</span>
                <span className="text-amber-400 font-bold">
                  {selectedRole === 'driver' ? '+1,000% Hardcore' : selectedRole === 'customer' ? '+2,000% Hardcore' : selectedRole === 'merchant' ? '+5,000% Hardcore' : 'B2B Connected'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                <span className="text-slate-400">สิทธิประโยชน์:</span>
                <span className="text-cyan-300 text-[11px]">
                  {selectedRole === 'driver' ? 'ผ่อน 1+1+1+1 (80฿/วัน) + คุ้มครอง 1 แสน' : selectedRole === 'customer' ? 'นั่งก่อนจ่ายทีหลัง ฿1,500 + ส่วนลด 5%' : selectedRole === 'merchant' ? 'ส่งด่วน 3 นาที + วงเงินหมุนเวียน 0%' : 'WIN-Hub Network Integration'}
                </span>
              </div>
            </div>

            {/* Card Footer Barcode & QR */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-6 h-6 text-cyan-400" />
                <div className="text-[9px] text-slate-400 font-mono">
                  <span>NFC ENABLED</span>
                  <span className="block text-slate-500">2฿ WELFARE FUND VERIFIED</span>
                </div>
              </div>

              <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center">
                <QrCode className="w-full h-full text-slate-950" />
              </div>
            </div>
          </div>

          {/* Action Buttons after Registration */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setIsSubmitted(false);
              }}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono transition-all"
            >
              + ลงทะเบียนบทบาทอื่นเพิ่ม
            </button>

            {onNavigateToMode && (
              <button
                onClick={() => {
                  if (audioEnabled) playRadarScan();
                  if (selectedRole === 'driver') onNavigateToMode('driver');
                  else if (selectedRole === 'merchant') onNavigateToMode('merchant');
                  else if (selectedRole === 'partner') onNavigateToMode('hospital');
                  else onNavigateToMode('passenger');
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2 transition-all hover:brightness-110"
              >
                <span>เข้าสู่แอปพลิเคชัน ({selectedRole === 'driver' ? 'อู่อัศวิน' : selectedRole === 'merchant' ? 'ศูนย์ร้านค้า' : selectedRole === 'partner' ? 'ศูนย์พันธมิตร' : 'แอปผู้โดยสาร'})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4-ROLE COMPARISON SUMMARY */}
      <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>สรุปสิทธิประโยชน์และอัตราทดความยาก XP ของทั้ง 4 บทบาท</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">1. พี่วิน (อัศวิน)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">+1,000% XP</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>• สิทธิผ่อนชุดเกราะ 80฿/วัน</li>
              <li>• ประกันอุบัติเหตุ 100,000 บาท</li>
              <li>• เลเวล 1-100 ปลดล็อกเกราะเทพเจ้า</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">2. ลูกค้า (พลเมือง)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">+2,000% XP</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>• นั่งก่อนจ่ายทีหลัง 0% (฿1,500)</li>
              <li>• ส่วนลดค่าโดยสารตลอดชีพ</li>
              <li>• สิทธิเปิดร้านค้า C2C ในโปรไฟล์</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">3. ร้านค้า (พาณิชย์)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">+5,000% XP</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>• วิน Standby รับของด่วน 3 นาที</li>
              <li>• สินเชื่อหมุนเวียน 0% (฿50k - ฿1M)</li>
              <li>• ปักหมุดเด่นบนแผนที่ CI Map</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-pink-950/30 border border-pink-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-400">4. พาร์ทเนอร์ (องค์กร)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300">B2B Sync</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>• จุดสปอนเซอร์สถานี WIN-Hub</li>
              <li>• ระบบส่งตัวผู้ป่วยฉุกเฉิน 2฿</li>
              <li>• บริหารจัดการ Fleet มอเตอร์ไซค์</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};
