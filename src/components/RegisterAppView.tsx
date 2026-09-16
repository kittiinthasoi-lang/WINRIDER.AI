import React, { useState } from 'react';
import { playTactileBlip, playRadarScan, playNfcSyncSound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  UserSession, 
  saveUserSession, 
  resetEntireApplicationState,
  getRoleTitleTh, 
  getRoleAvatarEmoji,
  getDefaultModeForRole
} from '../utils/userSession';
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
  ArrowLeft,
  QrCode, 
  Fingerprint, 
  Phone, 
  CreditCard, 
  MapPin, 
  Zap, 
  Layers, 
  ChevronRight,
  Camera,
  Scan,
  Clock,
  HeartPulse,
  RefreshCw,
  FileText,
  Lock,
  Car,
  Check,
  Crown
} from 'lucide-react';
import { AIFaceBiometricScanner, BiometricScanResult } from './AIFaceBiometricScanner';
import { CyberGraphic } from './CyberGraphic';
import { MessageCircle } from 'lucide-react';
import { LineAuthModal } from './LineAuthModal';

interface RegisterAppViewProps {
  audioEnabled: boolean;
  onOpenWinBuddy?: () => void;
  onNavigateToMode?: (mode: 'passenger' | 'driver' | 'merchant' | 'partner' | 'hospital') => void;
  onRegisteredUserSession?: (session: UserSession) => void;
  onCancel?: () => void;
}

type RoleType = 'driver' | 'customer' | 'merchant' | 'partner';

export const RegisterAppView: React.FC<RegisterAppViewProps> = ({
  audioEnabled,
  onOpenWinBuddy,
  onNavigateToMode,
  onRegisteredUserSession,
  onCancel,
}) => {
  const [selectedRole, setSelectedRole] = useState<RoleType>('driver');
  // Current registration step: 1 = Choose Role, 2 = Form Details, 3 = AI Face Scan, 4 = Sovereign Crest & Fresh Reset
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [issuedCitizenId, setIssuedCitizenId] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetCompleted, setResetCompleted] = useState<boolean>(false);
  const [isLineModalOpen, setIsLineModalOpen] = useState<boolean>(false);

  // AI Biometric Scan state
  const [biometricResult, setBiometricResult] = useState<BiometricScanResult | null>(null);

  // 1. Driver Form State (Knight)
  const [driverForm, setDriverForm] = useState({
    title: 'นาย',
    fullName: 'สมชาย รักเกียรติ',
    idCard: '1-1002-39482-91-0',
    dob: '1988-05-14',
    bloodType: 'O',
    phone: '089-123-4567',
    emergencyContact: 'สมศรี รักเกียรติ (ภรรยา)',
    emergencyPhone: '081-998-8776',
    winStation: 'วินทองหล่อ ซอย 10 (สุขุมวิท 55)',
    vestNumber: '28',
    district: 'วัฒนา, กรุงเทพมหานคร',
    publicLicenseNo: 'บข-884912 กทม.',
    bikeModel: 'Honda Wave 125i (2024)',
    licensePlate: '1กข-9922 กทม.',
    taxExpiryDate: '2027-03-31',
    helmetSize: 'L (59-60cm)',
    suitSize: 'XL (อก 44")',
    specialSkills: {
      petCare: true,
      muBuddy: true,
      expressParcel: true,
      familySchool: false,
      spiritElderly: true,
      femaleFriendly: false,
    },
    bankName: 'ธนาคารกสิกรไทย',
    promptPayId: '0891234567',
    installmentSelected: true, // ผ่อน 80฿/วัน
    acceptWelfareFund: true, // กองทุน 2฿
  });

  // 2. Customer Form State (Citizen Passenger)
  const [customerForm, setCustomerForm] = useState({
    fullName: 'คุณ จิตใจ สล็อต',
    nickname: 'แอนนา',
    phone: '081-445-5667',
    email: 'anna.slot@winrider.ai',
    homeAddress: 'คอนโด มาร์ค สุขุมวิท 39 แขวงคลองตันเหนือ',
    district: 'วัฒนา, กรุงเทพมหานคร',
    frequentDestinations: 'BTS พร้อมพงษ์, เอ็มควอเทียร์, ตึกเอ็มไพร์สาทร',
    emergencyContact: 'คุณแม่ มณีวรรณ',
    emergencyPhone: '089-776-5432',
    emergencyRelation: 'มารดา',
    medicalOrAllergies: 'ไม่มีโรคประจำตัว (ไม่มีประวัติแพ้ขนสัตว์)',
    preferredPayment: 'QR PromptPay / Wallet 2฿',
    riderPreference: 'คนขับขับขี่นุ่มนวล พร้อมบริการหมวกอนามัย',
    needHygieneCap: true,
    applyRideLater: true, // วงเงิน ฿1,500 ดอกเบี้ย 0%
    joinC2CMarket: true,
  });

  // 3. Merchant Form State (Commercial Partner)
  const [merchantForm, setMerchantForm] = useState({
    shopName: 'ก๋วยเตี๋ยวเรืออยุธยา สูตรโบราณ (สาขาทองหล่อ)',
    category: 'ร้านอาหาร & เครื่องดื่ม',
    subCategory: 'ก๋วยเตี๋ยวเรือ & สตรีทฟู้ดต้นตำรับ',
    ownerName: 'ธนวัฒน์ ศรีประเสริฐ',
    phone: '095-887-2211',
    email: 'boatnoodle.thonglor@gmail.com',
    address: '24/5 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110',
    district: 'วัฒนา, กรุงเทพมหานคร',
    taxId: '0-1055-62044-88-1',
    bankName: 'ธนาคารไทยพาณิชย์',
    bankAccountNumber: '408-982144-2',
    openHours: '09:00 - 22:00 น.',
    needFastDispatch: true, // Standby 3 นาที
    requestWorkingCapital: true, // สินเชื่อ 0% กองทุน 2฿
    discountForRiders: 'ลดทันที 10% สำหรับพี่วินและลูกค้าที่ปักหมุดมา',
  });

  // 4. Partner Form State (Ecosystem Partner & Venues)
  const [partnerForm, setPartnerForm] = useState({
    companyName: 'โรงแรม แกรนด์ พาราดิโซ แอนด์ รูฟท็อป สกายบาร์',
    partnerCategory: 'โรงแรม & รูฟท็อปบาร์ (Hotel & Premium Lifestyle)',
    contactPerson: 'วิศรุต อภิวัฒนานันท์',
    contactPosition: 'ผู้อำนวยการฝ่ายปฏิบัติการ (Operations Director)',
    email: 'partnerships@grandparadiso.co.th',
    phone: '02-712-9900',
    venueAddress: '88 ถนนสุขุมวิท ซอย 24 แขวงคลองตัน เขตคลองเตย กรุงเทพมหานคร 10110',
    businessRegistrationNo: '0-1055-58019-33-4',
    carParkingCapacity: '120 คัน (Valet Parking มีระบบบัตรจอดรถ)',
    bikeParkingCapacity: '40 คัน (จุดจอดเฉพาะพี่วิน WIN-Station ฟรี)',
    operatingHours: 'เปิดบริการ 24 ชั่วโมง (รูฟท็อป 17:00 - 02:00 น.)',
    partnerPerks: 'จอดรถฟรี 2 ชม. + คูปองส่วนลดเครื่องดื่ม 15% สำหรับผู้โดยสาร WINRIDER',
    sponsorWinHubStation: true,
  });

  const handleRoleChange = (role: RoleType) => {
    if (audioEnabled) playTactileBlip(800);
    setSelectedRole(role);
    setCurrentStep(1);
    setBiometricResult(null);
  };

  const handleProceedToDetails = () => {
    if (audioEnabled) playTactileBlip(900);
    setCurrentStep(2);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleProceedToFaceScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (audioEnabled) playTactileBlip(1000);
    setCurrentStep(3);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleBiometricScanComplete = (result: BiometricScanResult) => {
    setBiometricResult(result);
    if (audioEnabled) playNfcSyncSound();
    
    // Generate sovereign digital id
    const prefix = selectedRole === 'driver' ? 'WIN-KGT' : selectedRole === 'customer' ? 'WIN-CTZ' : selectedRole === 'merchant' ? 'WIN-MCH' : 'WIN-PTN';
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const newId = `${prefix}-${randNum}`;
    setIssuedCitizenId(newId);

    // Transition to step 4 (Sovereign Crest & Fresh Reset)
    setCurrentStep(4);
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#00D2FF', '#FFD700', '#10B981', '#F59E0B', '#EC4899']
    });
  };

  // Perform full system reset and launch freshly registered account
  const handleExecuteFullResetAndStart = async () => {
    if (audioEnabled) playRadarScan();
    setIsResetting(true);

    const activeId = issuedCitizenId || `WIN-${selectedRole === 'driver' ? 'KGT' : selectedRole === 'customer' ? 'CTZ' : selectedRole === 'merchant' ? 'MCH' : 'PTN'}-${Math.floor(100000 + Math.random() * 900000)}`;
    const roleName = selectedRole === 'driver' ? driverForm.fullName : selectedRole === 'customer' ? customerForm.fullName : selectedRole === 'merchant' ? merchantForm.shopName : partnerForm.companyName;
    const phone = selectedRole === 'driver' ? driverForm.phone : selectedRole === 'customer' ? customerForm.phone : selectedRole === 'merchant' ? merchantForm.phone : partnerForm.phone;

    const freshSession: UserSession = {
      id: activeId,
      role: selectedRole,
      name: roleName,
      phone: phone,
      roleTitleTh: getRoleTitleTh(selectedRole),
      level: 1,
      xp: 100,
      rating: 5.0,
      avatarEmoji: getRoleAvatarEmoji(selectedRole),
      registeredAt: new Date().toISOString(),
      plateNumber: selectedRole === 'driver' ? driverForm.licensePlate : undefined,
      shopName: selectedRole === 'merchant' ? merchantForm.shopName : undefined,
      companyName: selectedRole === 'partner' ? partnerForm.companyName : undefined,
      faceImageUrl: biometricResult?.faceImageUrl,
      faceHash: biometricResult?.faceHash,
      biometricVerified: true,
    };

    // Save user document in Firestore
    try {
      await setDoc(doc(db, 'users', activeId), {
        ...freshSession,
        registeredAt: new Date().toISOString(),
        biometricScore: biometricResult?.biometricScore || 99.7,
        details: selectedRole === 'driver' ? driverForm : selectedRole === 'customer' ? customerForm : selectedRole === 'merchant' ? merchantForm : partnerForm,
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore user registration error:', err);
    }

    // Execute complete system wipe of demo caches and initialize fresh Level 1 session
    await resetEntireApplicationState(freshSession);

    setTimeout(() => {
      setIsResetting(false);
      setResetCompleted(true);
      if (audioEnabled) playNfcSyncSound();

      setTimeout(() => {
        if (onRegisteredUserSession) {
          onRegisteredUserSession(freshSession);
        } else if (onNavigateToMode) {
          const targetMode = getDefaultModeForRole(selectedRole);
          onNavigateToMode(targetMode);
        }
      }, 1000);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      
      {/* HEADER BANNER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0C1A38] via-[#081226] to-[#050B18] border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(0,210,255,0.2)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl p-[2px] bg-gradient-to-br from-amber-400 via-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(0,210,255,0.4)] overflow-hidden flex-shrink-0">
                <img 
                  src="/app-logo.png" 
                  alt="WINRIDER.AI Official Logo" 
                  className="w-full h-full object-cover rounded-[14px]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                    SOVEREIGN REGISTRATION & RESET
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono">
                    AI FACE SCAN 2.0
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  ลงทะเบียนครอบคลุม 4 บทบาท & แสกนหน้า AI
                </h1>
              </div>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              รองรับทั้ง <strong>พี่วิน (อัศวินผู้พิทักษ์)</strong>, <strong>ลูกค้า (พลเมือง)</strong>, <strong>ร้านค้าพันธมิตร</strong> และ <strong>พาร์ทเนอร์องค์กร</strong> พร้อมระบบแสกนใบหน้ายืนยันตัวตนด้วย AI และระบบ <strong>รีเซ็ตทุกอย่างเริ่มต้นใหม่หมดทันที</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-shrink-0">
            {onCancel && (
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(700);
                  onCancel();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>← ย้อนกลับ</span>
              </button>
            )}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-center font-mono">
              <span className="text-[10px] text-slate-400 block">สถาปัตยกรรมอธิปไตย</span>
              <strong className="text-cyan-300 text-xs">2฿ WELFARE NETWORK</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4-STEP PROGRESS BAR */}
      <div className="p-4 rounded-3xl bg-black/40 border border-white/10">
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
              currentStep === 1
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                : currentStep > 1
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1">
              {currentStep > 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span>1</span>}
              <span className="hidden sm:inline">. เลือกบทบาท</span>
            </div>
            <span className="text-[10px] text-slate-400 sm:block hidden">4 Roles</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
              currentStep === 2
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                : currentStep > 2
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1">
              {currentStep > 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span>2</span>}
              <span className="hidden sm:inline">. ข้อมูลเชิงลึก</span>
            </div>
            <span className="text-[10px] text-slate-400 sm:block hidden">Credentials</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentStep >= 2) setCurrentStep(3);
            }}
            className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
              currentStep === 3
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                : currentStep > 3
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1">
              {currentStep > 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span>3</span>}
              <span className="hidden sm:inline">. แสกนหน้า AI</span>
            </div>
            <span className="text-[10px] text-slate-400 sm:block hidden">Biometric</span>
          </button>

          <div
            className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
              currentStep === 4
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1">
              <span>4</span>
              <span className="hidden sm:inline">. รีเซ็ตเริ่มใหม่</span>
            </div>
            <span className="text-[10px] text-slate-400 sm:block hidden">Reset All</span>
          </div>
        </div>
      </div>

      {/* STEP 1: ROLE SELECTOR TABS */}
      {currentStep <= 2 && (
        <div className="space-y-4">
          {/* FAST LINE REGISTRATION BANNER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#06C755]/25 via-emerald-950/40 to-[#06C755]/15 border-2 border-[#06C755] shadow-[0_0_30px_rgba(6,199,85,0.35)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#06C755] flex items-center justify-center text-white flex-shrink-0 shadow-[0_0_20px_rgba(6,199,85,0.6)] animate-pulse">
                <MessageCircle className="w-7 h-7 fill-white text-[#06C755]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#06C755] text-slate-950 font-black">
                    LINE FAST REGISTRATION
                  </span>
                  <span className="text-xs text-emerald-300 font-mono font-bold">
                    ผูกบัญชี & เริ่มต้นใหม่ทันที
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                  ลงทะเบียนด่วนผูกกับ LINE (1-Click Start)
                </h3>
                <p className="text-[11px] text-slate-300 font-mono">
                  ไม่ต้องกรอกแบบฟอร์มยาว เชื่อมต่อ LINE ID เพื่อรับส่งงานและติดต่อกันได้ทันที
                </p>
              </div>
            </div>

            <button
              type="button"
              id="register-line-instant-btn"
              onClick={() => {
                if (audioEnabled) playNfcSyncSound();
                setIsLineModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-[#06C755] to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs font-mono shadow-[0_0_20px_rgba(6,199,85,0.6)] flex items-center justify-center gap-2 transition-all transform active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950 text-[#06C755]" />
              <span>ลงทะเบียนผูกกับ LINE ทันที</span>
              <ChevronRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>ขั้นตอนที่ 1: เลือกบทบาทของท่านในระบบ (Select Your Sovereign Role)</span>
            </h3>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              บทบาทที่เลือก: {getRoleTitleTh(selectedRole)}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Driver Role */}
            <button
              type="button"
              onClick={() => handleRoleChange('driver')}
              className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-start gap-2.5 text-left relative overflow-hidden ${
                selectedRole === 'driver'
                  ? 'bg-gradient-to-br from-[#0F234C] via-[#0A1633] to-[#070D1E] border-cyan-400 shadow-[0_0_25px_rgba(0,210,255,0.3)]'
                  : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-blue-500/20 border border-blue-400/40 shadow-inner flex-shrink-0">
                <img 
                  src="/avatars/knight.jpg" 
                  alt="Knight Driver" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-sm font-black text-white block">1. พี่วิน (อัศวินผู้พิทักษ์)</span>
                <span className="text-[11px] text-slate-400 block">Knight Driver Edition</span>
              </div>
              <div className="mt-auto w-full pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyan-300 font-bold">ผ่อนเกราะ 80฿/วัน</span>
                <span className="text-amber-300">สวัสดิการ 2฿</span>
              </div>
            </button>

            {/* 2. Customer Role */}
            <button
              type="button"
              onClick={() => handleRoleChange('customer')}
              className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-start gap-2.5 text-left relative overflow-hidden ${
                selectedRole === 'customer'
                  ? 'bg-gradient-to-br from-[#0A2E28] via-[#081F1B] to-[#070D1E] border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                  : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-emerald-500/20 border border-emerald-400/40 shadow-inner flex-shrink-0">
                <img 
                  src="/avatars/citizen.jpg" 
                  alt="Citizen Passenger" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-sm font-black text-white block">2. ลูกค้า (พลเมือง)</span>
                <span className="text-[11px] text-slate-400 block">Citizen Passenger</span>
              </div>
              <div className="mt-auto w-full pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                <span className="text-emerald-300 font-bold">นั่งก่อนจ่ายทีหลัง 0%</span>
                <span className="text-purple-300">คุ้มครอง 1 แสน</span>
              </div>
            </button>

            {/* 3. Merchant Role */}
            <button
              type="button"
              onClick={() => handleRoleChange('merchant')}
              className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-start gap-2.5 text-left relative overflow-hidden ${
                selectedRole === 'merchant'
                  ? 'bg-gradient-to-br from-[#3D2507] via-[#241604] to-[#070D1E] border-amber-400 shadow-[0_0_25px_rgba(255,215,0,0.3)]'
                  : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-amber-500/20 border border-amber-400/40 shadow-inner flex-shrink-0">
                <img 
                  src="/avatars/merchant.jpg" 
                  alt="Merchant Partner" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-sm font-black text-white block">3. ร้านค้า (ผู้ประกอบการ)</span>
                <span className="text-[11px] text-slate-400 block">Merchant Partner</span>
              </div>
              <div className="mt-auto w-full pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                <span className="text-amber-300 font-bold">Standby 3 นาที</span>
                <span className="text-cyan-300">ทุนหมุนเวียน 0%</span>
              </div>
            </button>

            {/* 4. Partner Role */}
            <button
              type="button"
              onClick={() => handleRoleChange('partner')}
              className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-start gap-2.5 text-left relative overflow-hidden ${
                selectedRole === 'partner'
                  ? 'bg-gradient-to-br from-[#2D0D3D] via-[#1A0824] to-[#070D1E] border-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.3)]'
                  : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-pink-500/20 border border-pink-400/40 shadow-inner flex-shrink-0">
                <img 
                  src="/avatars/partner.jpg" 
                  alt="Ecosystem Partner" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-sm font-black text-white block">4. พาร์ทเนอร์ (สถานที่/องค์กร)</span>
                <span className="text-[11px] text-slate-400 block">Venue & B2B Partner</span>
              </div>
              <div className="mt-auto w-full pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                <span className="text-pink-300 font-bold">จุด Drop-off & จอดรถ</span>
                <span className="text-emerald-300">ส่วนลด 15%</span>
              </div>
            </button>
          </div>

          {/* STEP 1 ACTION CARD: CONFIRM ROLE & PROCEED */}
          {currentStep === 1 && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0C1F45] via-[#091530] to-[#050B18] border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(0,210,255,0.25)] flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black/50 border-2 border-cyan-400/60 flex-shrink-0 shadow-lg">
                  <img 
                    src={
                      selectedRole === 'driver' ? '/avatars/knight.jpg' :
                      selectedRole === 'merchant' ? '/avatars/merchant.jpg' :
                      selectedRole === 'partner' ? '/avatars/partner.jpg' :
                      '/avatars/citizen.jpg'
                    } 
                    alt="Selected Role Avatar" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-bold">
                      บทบาทที่เลือก
                    </span>
                    <span className="text-xs text-amber-300 font-mono font-bold">
                      สิทธิการเป็นเจ้าของยูเซอร์ใหม่ 100%
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white mt-0.5">
                    {getRoleTitleTh(selectedRole)}
                  </h4>
                  <p className="text-xs text-slate-300">
                    ระบบจะเริ่มนับเลเวล 1 และผูกสิทธิ์อธิปไตยเฉพาะของบทบาทนี้ทันที
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  id="confirm-role-instant-start-btn"
                  onClick={handleExecuteFullResetAndStart}
                  disabled={isResetting}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs font-mono shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-slate-950" />
                  <span>เป็นเจ้าของยูเซอร์ & เข้าใช้งานทันที (Level 1)</span>
                </button>

                <button
                  type="button"
                  id="step1-proceed-to-step2-btn"
                  onClick={handleProceedToDetails}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-xs font-mono shadow-[0_0_20px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span>กรอกข้อมูลละเอียด (ขั้นตอนที่ 2)</span>
                  <ChevronRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: COMPREHENSIVE REGISTRATION FORM */}
      {currentStep === 2 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0B1730] to-[#070D1E] border-2 border-white/15 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">
                  {selectedRole === 'driver' && 'แบบฟอร์มลงทะเบียน: อัศวินวินมอเตอร์ไซค์ (Knight Driver)'}
                  {selectedRole === 'customer' && 'แบบฟอร์มลงทะเบียน: พลเมืองผู้โดยสาร (Sovereign Citizen)'}
                  {selectedRole === 'merchant' && 'แบบฟอร์มลงทะเบียน: ร้านค้าพันธมิตร (Merchant Partner)'}
                  {selectedRole === 'partner' && 'แบบฟอร์มลงทะเบียน: สถานที่พันธมิตร & องค์กร (Ecosystem Partner)'}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  ขั้นตอนที่ 2: กรอกข้อมูลให้ครบถ้วนเพื่อเตรียมส่งต่อไปยังการแสกนหน้าด้วย AI
                </span>
              </div>
            </div>

            <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30">
              🔒 ความปลอดภัยระดับ SHA-256
            </span>
          </div>

          <form onSubmit={handleProceedToFaceScan} className="space-y-6">

            {/* 1. DRIVER FORM: COMPREHENSIVE */}
            {selectedRole === 'driver' && (
              <div className="space-y-6">
                {/* Section A: ข้อมูลส่วนตัว */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>ส่วนที่ 1: ข้อมูลส่วนบุคคลและเอกสารราชการ</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        คำนำหน้า & ชื่อ-นามสกุล
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        เบอร์โทรศัพท์มือถือ (ผูก PromptPay)
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        วัน/เดือน/ปีเกิด
                      </label>
                      <input
                        type="date"
                        required
                        value={driverForm.dob}
                        onChange={(e) => setDriverForm({ ...driverForm, dob: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        กรุ๊ปเลือด (กรณีฉุกเฉิน)
                      </label>
                      <select
                        value={driverForm.bloodType}
                        onChange={(e) => setDriverForm({ ...driverForm, bloodType: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="O">O</option>
                        <option value="AB">AB</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ผู้ติดต่อกรณีฉุกเฉิน (ชื่อ & เบอร์โทร)
                      </label>
                      <input
                        type="text"
                        required
                        value={driverForm.emergencyContact}
                        onChange={(e) => setDriverForm({ ...driverForm, emergencyContact: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: ข้อมูลวินและยานพาหนะ */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
                    <Bike className="w-4 h-4 text-cyan-400" />
                    <span>ส่วนที่ 2: วินสังกัด ข้อมูลรถมอเตอร์ไซค์ และใบอนุญาต</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        หมายเลขเสื้อวินประจำตัว
                      </label>
                      <input
                        type="text"
                        required
                        value={driverForm.vestNumber}
                        onChange={(e) => setDriverForm({ ...driverForm, vestNumber: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        เลขที่ใบขับขี่รถจักรยานยนต์สาธารณะ
                      </label>
                      <input
                        type="text"
                        required
                        value={driverForm.publicLicenseNo}
                        onChange={(e) => setDriverForm({ ...driverForm, publicLicenseNo: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ยี่ห้อ & รุ่นมอเตอร์ไซค์
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        หมายเลขทะเบียนรถ
                      </label>
                      <input
                        type="text"
                        required
                        value={driverForm.licensePlate}
                        onChange={(e) => setDriverForm({ ...driverForm, licensePlate: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        วันหมดอายุ พ.ร.บ. / ภาษีรถ
                      </label>
                      <input
                        type="date"
                        required
                        value={driverForm.taxExpiryDate}
                        onChange={(e) => setDriverForm({ ...driverForm, taxExpiryDate: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: บริการพิเศษที่ต้องการรับ */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span>ส่วนที่ 3: เลือกบริการพิเศษที่พร้อมรับงาน (Special Mission Capabilities)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <label className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={driverForm.specialSkills.petCare}
                        onChange={(e) => setDriverForm({
                          ...driverForm,
                          specialSkills: { ...driverForm.specialSkills, petCare: e.target.checked }
                        })}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-xs text-slate-200">🐾 WIN-Pet Care (ส่งสัตว์เลี้ยง)</span>
                    </label>

                    <label className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={driverForm.specialSkills.muBuddy}
                        onChange={(e) => setDriverForm({
                          ...driverForm,
                          specialSkills: { ...driverForm.specialSkills, muBuddy: e.target.checked }
                        })}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-xs text-slate-200">🔮 WIN-MU BUDDY (สายมู)</span>
                    </label>

                    <label className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={driverForm.specialSkills.expressParcel}
                        onChange={(e) => setDriverForm({
                          ...driverForm,
                          specialSkills: { ...driverForm.specialSkills, expressParcel: e.target.checked }
                        })}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-xs text-slate-200">📦 WIN-Express (พัสดุด่วน)</span>
                    </label>

                    <label className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={driverForm.specialSkills.spiritElderly}
                        onChange={(e) => setDriverForm({
                          ...driverForm,
                          specialSkills: { ...driverForm.specialSkills, spiritElderly: e.target.checked }
                        })}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-xs text-slate-200">🛕 WIN-Spirit (ผู้สูงอายุ)</span>
                    </label>

                    <label className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={driverForm.specialSkills.familySchool}
                        onChange={(e) => setDriverForm({
                          ...driverForm,
                          specialSkills: { ...driverForm.specialSkills, familySchool: e.target.checked }
                        })}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-xs text-slate-200">🎒 WIN-Family (รับส่งเด็ก)</span>
                    </label>

                    <label className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={driverForm.specialSkills.femaleFriendly}
                        onChange={(e) => setDriverForm({
                          ...driverForm,
                          specialSkills: { ...driverForm.specialSkills, femaleFriendly: e.target.checked }
                        })}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-xs text-slate-200">👩 สุภาพสตรี & หมวกอนามัย</span>
                    </label>
                  </div>
                </div>

                {/* Section D: การเงินและสวัสดิการ */}
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="driverInstallment"
                      checked={driverForm.installmentSelected}
                      onChange={(e) => setDriverForm({ ...driverForm, installmentSelected: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 accent-cyan-400 cursor-pointer"
                    />
                    <label htmlFor="driverInstallment" className="text-xs text-slate-300 cursor-pointer">
                      <strong className="text-cyan-300">สิทธิผ่อนชุดเกราะและสมาร์ทโฟน 80฿/วัน:</strong> รับชุดเกราะอัศวินเลเวล 1 พร้อมหมวกกันน็อก Bluetooth และระบบ HUD แผนที่ 3D
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="driverWelfare"
                      checked={driverForm.acceptWelfareFund}
                      onChange={(e) => setDriverForm({ ...driverForm, acceptWelfareFund: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 accent-cyan-400 cursor-pointer"
                    />
                    <label htmlFor="driverWelfare" className="text-xs text-slate-300 cursor-pointer">
                      <strong className="text-amber-300">เข้าร่วมกองทุนสวัสดิการ 2 บาทเพื่อประชาชน:</strong> รับความคุ้มครองอุบัติเหตุ 100,000 บาท และเงินชดเชยรายได้ยามพักรักษาตัว
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CUSTOMER FORM: COMPREHENSIVE */}
            {selectedRole === 'customer' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>ส่วนที่ 1: ข้อมูลพลเมืองและช่องทางติดต่อ</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ชื่อเล่น (ให้พี่วินเรียกอย่างสุภาพ)
                      </label>
                      <input
                        type="text"
                        required
                        value={customerForm.nickname}
                        onChange={(e) => setCustomerForm({ ...customerForm, nickname: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        เบอร์โทรศัพท์มือถือ (รับรหัส OTP)
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        อีเมล (รับใบเสร็จ e-Receipt & สรุปทริป)
                      </label>
                      <input
                        type="email"
                        required
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: ที่อยู่และพิกัดเดินทาง */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>ส่วนที่ 2: ที่อยู่อาศัยประจำ & จุดหมายเดินทางบ่อย</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ที่อยู่หลัก / คอนโด / บ้าน (จุดรับส่งประจำ)
                      </label>
                      <input
                        type="text"
                        required
                        value={customerForm.homeAddress}
                        onChange={(e) => setCustomerForm({ ...customerForm, homeAddress: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        จุดหมายปลายทางที่เดินทางบ่อย (เช่น สถานี BTS, ออฟฟิศ)
                      </label>
                      <input
                        type="text"
                        required
                        value={customerForm.frequentDestinations}
                        onChange={(e) => setCustomerForm({ ...customerForm, frequentDestinations: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: กรณีฉุกเฉินและข้อควรระวัง */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-emerald-400" />
                    <span>ส่วนที่ 3: ความปลอดภัย & ผู้ติดต่อฉุกเฉิน SOS</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ชื่อผู้ติดต่อฉุกเฉิน
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        เบอร์โทรติดต่อฉุกเฉิน
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerForm.emergencyPhone}
                        onChange={(e) => setCustomerForm({ ...customerForm, emergencyPhone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        โรคประจำตัว / การแพ้ (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        value={customerForm.medicalOrAllergies}
                        onChange={(e) => setCustomerForm({ ...customerForm, medicalOrAllergies: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section D: ตัวเลือกความสะดวก */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="custRideLater"
                      checked={customerForm.applyRideLater}
                      onChange={(e) => setCustomerForm({ ...customerForm, applyRideLater: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 accent-emerald-400 cursor-pointer"
                    />
                    <label htmlFor="custRideLater" className="text-xs text-slate-300 cursor-pointer">
                      <strong className="text-emerald-300">เปิดใช้งาน "นั่งก่อนจ่ายทีหลัง" (0% Pay Later):</strong> รับวงเงินเครดิตเริ่มต้น ฿1,500 ชำระรอบบิลสิ้นเดือน
                    </label>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="custCap"
                      checked={customerForm.needHygieneCap}
                      onChange={(e) => setCustomerForm({ ...customerForm, needHygieneCap: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 accent-emerald-400 cursor-pointer"
                    />
                    <label htmlFor="custCap" className="text-xs text-slate-300 cursor-pointer">
                      <strong className="text-emerald-300">ขอรับหมวกอนามัยซับในฟรี:</strong> พี่วินจะเตรียมหมวกคลุมผมอนามัยแบบใช้แล้วทิ้งให้ทุกทริป
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. MERCHANT FORM: COMPREHENSIVE */}
            {selectedRole === 'merchant' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-400" />
                    <span>ส่วนที่ 1: ข้อมูลกิจการร้านค้า & ทะเบียนพาณิชย์</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ชื่อร้านค้า / ชื่อแบรนด์
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        หมวดหมู่ธุรกิจหลัก
                      </label>
                      <select
                        value={merchantForm.category}
                        onChange={(e) => setMerchantForm({ ...merchantForm, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
                      >
                        <option value="ร้านอาหาร & เครื่องดื่ม">ร้านอาหาร & เครื่องดื่ม</option>
                        <option value="คาเฟ่ & เบเกอรี่">คาเฟ่ & เบเกอรี่</option>
                        <option value="ของชำ & มินิมาร์ทชุมชน">ของชำ & มินิมาร์ทชุมชน</option>
                        <option value="เสื้อผ้า & สินค้าแฟชั่น">เสื้อผ้า & สินค้าแฟชั่น</option>
                        <option value="งานฝีมือ คราฟต์ & ของสะสม">งานฝีมือ คราฟต์ & ของสะสม</option>
                        <option value="สินค้ามือสอง & แรร์ไอเทม">สินค้ามือสอง & แรร์ไอเทม</option>
                        <option value="ร้านยา & เวชภัณฑ์">ร้านยา & เวชภัณฑ์</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        เลขประจำตัวผู้เสียภาษี / ทะเบียนพาณิชย์
                      </label>
                      <input
                        type="text"
                        required
                        value={merchantForm.taxId}
                        onChange={(e) => setMerchantForm({ ...merchantForm, taxId: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <span>ส่วนที่ 2: เจ้าของกิจการ พิกัดหน้าร้าน และเวลาทำการ</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        เบอร์โทรศัพท์ติดต่อรับออเดอร์
                      </label>
                      <input
                        type="tel"
                        required
                        value={merchantForm.phone}
                        onChange={(e) => setMerchantForm({ ...merchantForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        เวลาเปิด-ปิดร้าน
                      </label>
                      <input
                        type="text"
                        required
                        value={merchantForm.openHours}
                        onChange={(e) => setMerchantForm({ ...merchantForm, openHours: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ที่ตั้งร้านค้า & พิกัดบนแผนที่ 3D Bangkok
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
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="merchantCapital"
                      checked={merchantForm.requestWorkingCapital}
                      onChange={(e) => setMerchantForm({ ...merchantForm, requestWorkingCapital: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 accent-amber-400 cursor-pointer"
                    />
                    <label htmlFor="merchantCapital" className="text-xs text-slate-300 cursor-pointer">
                      <strong className="text-amber-300">สมัครขอวงเงินสินเชื่อทุนหมุนเวียนคู่ค้า 0% ดอกเบี้ย:</strong> รับสิทธิเบิกวงเงินหมุนเวียน ฿50,000 - ฿500,000 จากกองทุน 2฿
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
                      <strong className="text-amber-300">เปิดระบบวิน Standby รับของด่วน 3 นาที:</strong> มอเตอร์ไซค์ในรัศมี 300 เมตรเข้ารับออเดอร์ทันทีหลังปรุงเสร็จ
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PARTNER FORM: COMPREHENSIVE */}
            {selectedRole === 'partner' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-pink-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-pink-400" />
                    <span>ส่วนที่ 1: ข้อมูลองค์กร สถานประกอบการ และนิติบุคคล</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ชื่อองค์กร / โรงแรม / สถานประกอบการ
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
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ประเภทสถานประกอบการ (Category)
                      </label>
                      <select
                        value={partnerForm.partnerCategory}
                        onChange={(e) => setPartnerForm({ ...partnerForm, partnerCategory: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                      >
                        <option value="โรงแรม & รูฟท็อปบาร์ (Hotel & Premium Lifestyle)">โรงแรม & รูฟท็อปบาร์ (Hotel & Premium Lifestyle)</option>
                        <option value="โรงพยาบาล & ศูนย์การแพทย์ฉุกเฉิน 2฿">โรงพยาบาล & ศูนย์การแพทย์ฉุกเฉิน 2฿</option>
                        <option value="โรงพยาบาลสัตว์ & คลินิกสัตว์เลี้ยง 24 ชม.">โรงพยาบาลสัตว์ & คลินิกสัตว์เลี้ยง 24 ชม.</option>
                        <option value="ศูนย์ซ่อมบำรุง & เปลี่ยนถ่ายน้ำมันเครื่อง WIN-Hub">ศูนย์ซ่อมบำรุง & เปลี่ยนถ่ายน้ำมันเครื่อง WIN-Hub</option>
                        <option value="ศูนย์การค้า & สถานที่จัดงานคอนเสิร์ต">ศูนย์การค้า & สถานที่จัดงานคอนเสิร์ต</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        เลขทะเบียนนิติบุคคล 13 หลัก
                      </label>
                      <input
                        type="text"
                        required
                        value={partnerForm.businessRegistrationNo}
                        onChange={(e) => setPartnerForm({ ...partnerForm, businessRegistrationNo: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-mono font-bold text-pink-300 flex items-center gap-2">
                    <Car className="w-4 h-4 text-pink-400" />
                    <span>ส่วนที่ 2: โครงสร้างพื้นฐาน ที่จอดรถ และเวลาทำการ</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ความจุที่จอดรถยนต์ (คัน)
                      </label>
                      <input
                        type="text"
                        required
                        value={partnerForm.carParkingCapacity}
                        onChange={(e) => setPartnerForm({ ...partnerForm, carParkingCapacity: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ความจุที่จอดรถมอเตอร์ไซค์พี่วิน (คัน)
                      </label>
                      <input
                        type="text"
                        required
                        value={partnerForm.bikeParkingCapacity}
                        onChange={(e) => setPartnerForm({ ...partnerForm, bikeParkingCapacity: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        เวลาทำการของสถานที่
                      </label>
                      <input
                        type="text"
                        required
                        value={partnerForm.operatingHours}
                        onChange={(e) => setPartnerForm({ ...partnerForm, operatingHours: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                        ที่ตั้งสถานประกอบการ & จุด Drop-off เฉพาะสำหรับพี่วินและลูกค้า
                      </label>
                      <input
                        type="text"
                        required
                        value={partnerForm.venueAddress}
                        onChange={(e) => setPartnerForm({ ...partnerForm, venueAddress: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-pink-950/30 border border-pink-500/30 space-y-2">
                  <label className="text-xs font-mono font-bold text-pink-300 block mb-1">
                    สิทธิประโยชน์ที่มอบให้ผู้ใช้และพี่วิน WINRIDER:
                  </label>
                  <input
                    type="text"
                    required
                    value={partnerForm.partnerPerks}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partnerPerks: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-pink-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ACTION BUTTONS: STEP 2 */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>เปลี่ยนบทบาท</span>
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  id="step2-instant-start-btn"
                  onClick={handleExecuteFullResetAndStart}
                  disabled={isResetting}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-slate-950" />
                  <span>บันทึก & เป็นเจ้าของยูเซอร์ทันที (Level 1)</span>
                </button>

                <button
                  type="submit"
                  id="step2-proceed-to-facescan-btn"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-[#FFD700] hover:brightness-110 text-slate-950 font-black text-xs font-mono shadow-[0_0_20px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
                >
                  <span>ไปแสกนหน้า AI ยืนยันตัวตน (ขั้นตอนที่ 3)</span>
                  <Camera className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: AI FACE SCANNER */}
      {currentStep === 3 && (
        <AIFaceBiometricScanner
          role={selectedRole}
          audioEnabled={audioEnabled}
          onScanComplete={handleBiometricScanComplete}
          onCancel={() => setCurrentStep(2)}
        />
      )}

      {/* STEP 4: SOVEREIGN DIGITAL CREST ISSUED & FRESH RESET */}
      {currentStep === 4 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#07132B] via-[#050E20] to-[#040814] border-2 border-emerald-400/60 shadow-[0_0_50px_rgba(16,185,129,0.3)] space-y-6 animate-fade-in">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white">ลงทะเบียนและยืนยันตัวตนด้วย AI สำเร็จ!</h3>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    AI VERIFIED: 99.8%
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono">
                  ออกบัตรประจำตัวดิจิทัลอธิปไตย (Digital Sovereign Crest) พร้อมโครงข่ายชีวมิติเรียบร้อย
                </p>
              </div>
            </div>

            <div className="text-left md:text-right font-mono">
              <span className="text-[10px] text-slate-400 block">รหัสประจำตัวอธิปไตย (SOVEREIGN ID)</span>
              <strong className="text-cyan-300 text-lg tracking-wider">{issuedCitizenId}</strong>
            </div>
          </div>

          {/* HOLOGRAPHIC DIGITAL CARD PREVIEW WITH CAPTURED FACE */}
          <div className="max-w-md mx-auto p-6 rounded-3xl bg-gradient-to-br from-[#0F2248] via-[#0A1633] to-[#070D1E] border-2 border-cyan-400/60 shadow-2xl relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFD700]/20 border border-[#FFD700]/40 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-[#FFD700]" />
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

            {/* Photo and Identity */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/60 border border-white/10">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-md flex-shrink-0 relative">
                <img
                  src={biometricResult?.faceImageUrl || (selectedRole === 'driver' ? '/avatars/knight.jpg' : selectedRole === 'customer' ? '/avatars/citizen.jpg' : selectedRole === 'merchant' ? '/avatars/merchant.jpg' : '/avatars/partner.jpg')}
                  alt="Biometric Verified Face"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-0 inset-x-0 bg-emerald-500/80 text-[8px] font-mono text-center text-slate-950 font-black">
                  AI SCAN OK
                </div>
              </div>

              <div className="space-y-1 font-mono min-w-0">
                <h5 className="text-sm font-bold text-white truncate">
                  {selectedRole === 'driver' ? driverForm.fullName : selectedRole === 'customer' ? customerForm.fullName : selectedRole === 'merchant' ? merchantForm.shopName : partnerForm.companyName}
                </h5>
                <span className="text-xs text-cyan-300 block truncate">
                  {getRoleTitleTh(selectedRole)}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  HASH: {biometricResult?.faceHash || 'SOV-FACE-AI99'}
                </span>
              </div>
            </div>

            {/* Card Specific Details */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">บทบาทในระบบ:</span>
                <strong className="text-emerald-400">{getRoleTitleTh(selectedRole)}</strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">เบอร์โทรศัพท์:</span>
                <span className="text-white">{selectedRole === 'driver' ? driverForm.phone : selectedRole === 'customer' ? customerForm.phone : selectedRole === 'merchant' ? merchantForm.phone : partnerForm.phone}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">สถานะเริ่มต้น:</span>
                <span className="text-amber-400 font-bold">เลเวล 1 • เริ่มต้นใหม่หมด</span>
              </div>
            </div>

            {/* Card Footer Barcode & QR */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-cyan-400" />
                <div className="text-[9px] text-slate-400 font-mono">
                  <span>BIOMETRIC LIVENESS 100%</span>
                  <span className="block text-slate-500">2฿ SOVEREIGN PASS</span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center">
                <QrCode className="w-full h-full text-slate-950" />
              </div>
            </div>
          </div>

          {/* FRESH RESET NOTIFICATION BANNER */}
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 flex-shrink-0">
                <RefreshCw className={`w-5 h-5 ${isResetting ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <strong className="text-xs font-bold text-white block">
                  นโยบายรีเซ็ตทุกอย่างเริ่มใหม่หมด (Clean Slate Protocol):
                </strong>
                <span className="text-xs text-slate-300 font-mono">
                  เมื่อกดปุ่มด้านล่าง ระบบจะล้างข้อมูลเก่า คิวงานจำลอง และประวัติการเดินทางเดิมทั้งหมด แล้วเริ่มระบบใหม่สะอาด 100% ในฐานะบัญชีที่ลงทะเบียนใหม่นี้
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Full Reset & Launch */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setBiometricResult(null);
              }}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono transition-all"
            >
              แก้ไขข้อมูลการลงทะเบียน
            </button>

            <button
              type="button"
              disabled={isResetting}
              onClick={handleExecuteFullResetAndStart}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FFD700] via-amber-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-[0_0_30px_rgba(255,215,0,0.5)] flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                  <span>กำลังรีเซ็ตระบบและเตรียมบัญชีใหม่...</span>
                </>
              ) : resetCompleted ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-slate-950" />
                  <span>รีเซ็ตสำเร็จ! กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>รีเซ็ตทุกอย่างและเริ่มต้นใหม่หมดทันที (Reset All & Start Fresh)</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 4-ROLE COMPARISON SUMMARY */}
      <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>โครงสร้างสิทธิประโยชน์และระบบเศรษฐกิจ 4 บทบาทแห่งจักรวรรดิ WINRIDER.AI</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">1. พี่วิน (อัศวิน)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">Knight</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>• สิทธิผ่อนชุดเกราะ 80฿/วัน</li>
              <li>• ประกันอุบัติเหตุ 100,000 บาท</li>
              <li>• เลเวล 1-100 ปลดล็อกเกราะเทพเจ้า</li>
              <li>• รับงานพิเศษ Pet Care & สายมู</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">2. ลูกค้า (พลเมือง)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Citizen</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>• นั่งก่อนจ่ายทีหลัง 0% (฿1,500)</li>
              <li>• แจกหมวกอนามัยซับในฟรีทุกทริป</li>
              <li>• เลือกรองรับสัตว์เลี้ยง / สุภาพสตรี</li>
              <li>• กองทุนชดเชยทริปปลอดภัย 2฿</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">3. ร้านค้า (พาณิชย์)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Merchant</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>• วิน Standby รับของด่วน 3 นาที</li>
              <li>• สินเชื่อหมุนเวียน 0% กองทุน 2฿</li>
              <li>• ปักหมุดเด่นบนแผนที่ CI 3D Map</li>
              <li>• ระบบหลังร้านจัดการสินค้าเรียลไทม์</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-pink-950/30 border border-pink-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-400">4. พาร์ทเนอร์ (สถานที่)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300">Partner</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>• จุด Drop-off & จอดรถพี่วินฟรี</li>
              <li>• โชว์เวลาทำการและส่วนลดพิเศษ</li>
              <li>• ศูนย์ส่งต่อผู้ป่วยฉุกเฉินและสัตว์เลี้ยง</li>
              <li>• เชื่อมต่อ API สถานี WIN-Hub</li>
            </ul>
          </div>
        </div>
      </div>

      {/* LINE AUTH & REGISTRATION MODAL */}
      <LineAuthModal
        isOpen={isLineModalOpen}
        onClose={() => setIsLineModalOpen(false)}
        audioEnabled={audioEnabled}
        onLoginSuccess={(session) => {
          setIsLineModalOpen(false);
          if (onRegisteredUserSession) {
            onRegisteredUserSession(session);
          }
        }}
      />
    </div>
  );
};
