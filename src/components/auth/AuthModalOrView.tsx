import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  LockKeyhole, 
  LogIn, 
  ShieldCheck, 
  UserPlus, 
  BadgeCheck,
  Bike,
  User,
  Store,
  Building2,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Upload,
  Sparkles,
  Database,
  Phone,
  MapPin,
  Check,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playTactileBlip } from '../../utils/audio';
import { isValidWinUid, normalizeWinUid } from '../../auth/winUid';
import { 
  registerFullAccountWithFirestore, 
  subscribeFoundingKnightCounter 
} from '../../services/registrationService';
import { UserRole } from '../../types/auth';

type Mode = 'login' | 'register';
type RegisterStep = 1 | 2 | 3 | 4;

const PROVINCES = [
  'กรุงเทพมหานคร',
  'นนทบุรี',
  'ปทุมธานี',
  'สมุทรปราการ',
  'สมุทรสาคร',
  'นครปฐม',
  'ชลบุรี',
  'ระยอง',
  'เชียงใหม่',
  'เชียงราย',
  'นครราชสีมา',
  'ขอนแก่น',
  'อุดรธานี',
  'อุบลราชธานี',
  'สงขลา',
  'ภูเก็ต',
  'สุราษฎร์ธานี',
  'พิษณุโลก',
  'นครสวรรค์',
  'พระนครศรีอยุธยา'
];

function friendlyError(error: any) {
  const code = String(error?.code || error?.message || '');
  if (code.includes('unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return `โดเมน ${host || 'ปัจจุบัน'} ยังไม่ได้รับอนุญาตใน Firebase Authentication ของโปรเจกต์ decoded-robot-6lkcn`;
  }
  if (code.includes('operation-not-allowed')) {
    return 'Firebase Authentication Provider ที่เรียกใช้ยังไม่ได้เปิดในโปรเจกต์ decoded-robot-6lkcn';
  }
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'WIN UID หรือรหัสผ่านไม่ถูกต้อง';
  }
  if (code.includes('email-already-in-use')) return 'WIN UID นี้ถูกใช้งานแล้ว กรุณาตั้ง UID ใหม่';
  if (code.includes('weak-password')) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (code.includes('api-key-not-valid') || code.includes('invalid-api-key')) return 'Firebase Web API Key ยังไม่พร้อมใช้งาน';
  if (code.includes('Quota limit exceeded') || code.includes('resource-exhausted')) {
    return 'โควต้าการอ่าน/เขียนฐานข้อมูลชั่วคราวเต็ม กรุณาลองใหม่อีกครั้งในภายหลัง';
  }
  return error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่';
}

export const AuthModalOrView: React.FC = () => {
  const { signInWithWinUid, signInWithGoogle, googleOnboarding, adoptUserData } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  // Multi-step Registration: Step 1 (Info), Step 2 (Select Role), Step 3 (Role Details), Step 4 (Confirm & Save)
  const [regStep, setRegStep] = useState<RegisterStep>(1);

  // Common User Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [winUid, setWinUid] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('กรุงเทพมหานคร');
  const [district, setDistrict] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Selected Role
  const [selectedRole, setSelectedRole] = useState<UserRole>('knight');

  // Role: Knight Specific
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car'>('motorcycle');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string>('');
  const [vehiclePreview, setVehiclePreview] = useState<string>('');

  // Role: Citizen Specific
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Role: Merchant Specific
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('อาหารตามสั่ง/สตรีทฟู้ด');
  const [shopAddress, setShopAddress] = useState('');
  const [taxId, setTaxId] = useState('');

  // Role: Partner Specific
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('โรงเรียน/มหาวิทยาลัย');
  const [contactPerson, setContactPerson] = useState('');
  const [estimatedUsers, setEstimatedUsers] = useState<number>(100);

  // PDPA & Terms Consents
  const [pdpaConsent, setPdpaConsent] = useState(true);
  const [gpsConsent, setGpsConsent] = useState(true);
  const [termsConsent, setTermsConsent] = useState(true);

  // UI state
  const [working, setWorking] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');

  // Founding Knight Counter
  const [foundingRemaining, setFoundingRemaining] = useState<number>(1000);

  const licenseInputRef = useRef<HTMLInputElement>(null);
  const vehicleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'register') {
      const unsub = subscribeFoundingKnightCounter((data) => {
        setFoundingRemaining(data.remaining);
      });
      return () => unsub();
    }
  }, [mode]);

  useEffect(() => {
    if (!googleOnboarding) return;
    setMode('register');
    setRegStep(1);
    setError('');
    if (!firstName.trim() && googleOnboarding.firstName) setFirstName(googleOnboarding.firstName);
    if (!lastName.trim() && googleOnboarding.lastName) setLastName(googleOnboarding.lastName);
  }, [googleOnboarding]);

  const changeMode = (next: Mode) => {
    setMode(next);
    setError('');
    setRegStep(1);
    setPassword('');
    setConfirmPassword('');
  };

  const validatePhone = (num: string) => /^0[0-9]{9}$/.test(num.trim());

  // Step 1 Validation -> Next to Step 2 (Select Role)
  const handleProceedToRoleSelection = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    playTactileBlip(800);

    const normalizedUid = normalizeWinUid(winUid);
    if (!firstName.trim() || !lastName.trim()) {
      setError('กรุณากรอกชื่อและนามสกุลจริง');
      return;
    }
    if (!isValidWinUid(normalizedUid)) {
      setError('WIN UID ต้องมี 4-30 ตัวอักษร ใช้ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง');
      return;
    }
    if (!validatePhone(phone)) {
      setError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0 (เช่น 0812345678)');
      return;
    }
    if (!district.trim()) {
      setError('กรุณาระบุเขตหรืออำเภอ');
      return;
    }
    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setRegStep(2);
  };

  // Step 2 Validation -> Next to Step 3 (Role Details)
  const handleProceedToRoleDetails = () => {
    setError('');
    playTactileBlip(850);
    setRegStep(3);
  };

  // Step 3 Validation -> Next to Step 4 (Confirm)
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    playTactileBlip(900);

    if (selectedRole === 'knight') {
      if (!plateNumber.trim()) {
        setError('กรุณาระบุหมายเลขทะเบียนรถ (เช่น 1กข 9999 กทม.)');
        return;
      }
      if (!licenseNumber.trim()) {
        setError('กรุณาระบุเลขที่ใบอนุญาตขับขี่สาธารณะหรือใบขับขี่');
        return;
      }
    } else if (selectedRole === 'citizen') {
      if (!emergencyName.trim()) {
        setError('กรุณาระบุชื่อผู้ติดต่อฉุกเฉิน');
        return;
      }
      if (!validatePhone(emergencyPhone)) {
        setError('เบอร์โทรศัพท์ผู้ติดต่อฉุกเฉินต้องเป็นตัวเลข 10 หลัก (เช่น 0891234567)');
        return;
      }
    } else if (selectedRole === 'merchant') {
      if (!shopName.trim()) {
        setError('กรุณาระบุชื่อร้านค้า');
        return;
      }
      if (!shopAddress.trim()) {
        setError('กรุณาระบุที่ตั้งร้านค้า');
        return;
      }
    } else if (selectedRole === 'partner') {
      if (!orgName.trim()) {
        setError('กรุณาระบุชื่อองค์กรหรือหน่วยงาน');
        return;
      }
      if (!contactPerson.trim()) {
        setError('กรุณาระบุชื่อผู้ประสานงาน');
        return;
      }
    }

    setRegStep(4);
  };

  // Step 4 Final Submit -> Save to Cloud Firestore -> Enter App!
  const handleFinalSubmit = async () => {
    if (working) return;
    setError('');
    playTactileBlip(950);

    if (!pdpaConsent || !gpsConsent || !termsConsent) {
      setError('กรุณาทำเครื่องหมายยอมรับข้อตกลงและเงื่อนไข PDPA ให้ครบถ้วน');
      return;
    }

    setWorking(true);
    setProgressMsg('กำลังเตรียมบันทึกข้อมูล...');

    try {
      const normalizedUid = normalizeWinUid(winUid);

      const result = await registerFullAccountWithFirestore(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          winUid: normalizedUid,
          phone: phone.trim(),
          password,
          province,
          district: district.trim(),
          role: selectedRole,
          pdpaConsentAccepted: true,
          // Knight
          vehicleType,
          plateNumber: plateNumber.trim(),
          licenseNumber: licenseNumber.trim(),
          licenseFile,
          vehicleFile,
          // Citizen
          emergencyContactName: emergencyName.trim(),
          emergencyContactPhone: emergencyPhone.trim(),
          // Merchant
          shopName: shopName.trim(),
          shopType,
          shopAddress: shopAddress.trim(),
          taxId: taxId.trim(),
          // Partner
          orgName: orgName.trim(),
          orgType,
          contactPerson: contactPerson.trim(),
          estimatedUsers,
        },
        (msg) => setProgressMsg(msg)
      );

      if (result?.user) {
        setProgressMsg('บันทึกสำเร็จ! เข้าสู่ระบบ...');
        adoptUserData(result.user);
      } else {
        throw new Error('บันทึกข้อมูลเรียบร้อย แต่ไม่ได้รับโปรไฟล์กลับมา กรุณาลองใหม่');
      }
    } catch (cause: any) {
      console.error('Registration failed:', cause);
      setError(friendlyError(cause));
      setWorking(false);
      setProgressMsg('');
    }
  };

  const handleGoogleSignIn = async () => {
    if (working) return;
    setError('');
    setWorking(true);
    playTactileBlip(900);
    try {
      const result = await signInWithGoogle();
      if (!result) return;
      if (!result.existingProfile) {
        setMode('register');
        setRegStep(1);
        if (result.google.firstName) setFirstName(result.google.firstName);
        if (result.google.lastName) setLastName(result.google.lastName);
      }
    } catch (cause: any) {
      const code = String(cause?.code || cause?.message || '');
      if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        setError('ปิดหน้าต่าง Google ก่อนเลือกบัญชี กรุณากดปุ่ม Google แล้วเลือกบัญชีอีกครั้ง');
      } else if (code.includes('operation-not-allowed')) {
        setError('ยังไม่ได้เปิด Google Sign-In ใน Firebase Authentication');
      } else {
        setError(friendlyError(cause));
      }
    } finally {
      setWorking(false);
    }
  };

  // Sign In Submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (working) return;
    setError('');
    playTactileBlip(900);

    const normalizedUid = normalizeWinUid(winUid);
    if (!isValidWinUid(normalizedUid)) {
      setError('WIN UID ต้องมี 4-30 ตัว ใช้ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง');
      return;
    }
    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setWorking(true);
    try {
      await signInWithWinUid(normalizedUid, password);
    } catch (cause) {
      setError(friendlyError(cause));
      setWorking(false);
    }
  };

  // File Handlers for Knight
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'vehicle') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }
    setError('');
    const previewUrl = URL.createObjectURL(file);
    if (type === 'license') {
      setLicenseFile(file);
      setLicensePreview(previewUrl);
    } else {
      setVehicleFile(file);
      setVehiclePreview(previewUrl);
    }
  };



  return (
    <div className="min-h-[82vh] w-full flex items-center justify-center px-4 py-6">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-cyan-400/30 bg-[#081126] p-5 sm:p-8 text-slate-100 shadow-[0_0_65px_rgba(34,211,238,0.14)]">
        
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10">
              <ShieldCheck className="h-9 w-9 text-cyan-300" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              <span className="text-cyan-300">WINRIDER</span>
              <span className="text-amber-300">.AI</span>
            </h1>

            <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-300">
              ระบบขนส่งและเศรษฐกิจอธิปไตยแห่งแรกของไทย
            </p>

            {/* Mode Switcher Tabs */}
            <div className="mt-4 inline-flex p-1 rounded-xl bg-black/40 border border-white/10">
              <button
                type="button"
                onClick={() => changeMode('login')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => changeMode('register')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>สมัครสมาชิกใหม่</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-4 text-xs text-rose-200 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
              <div className="pt-1 text-[10px] font-mono text-slate-400">
                Firebase project: decoded-robot-6lkcn
              </div>
            </div>
          )}

          <div className="max-w-md mx-auto">
            {googleOnboarding ? (
              <div className="rounded-xl border border-[#dadce0] bg-white px-4 py-3 text-slate-900 shadow-sm">
                <div className="flex items-center gap-3">
                  {googleOnboarding.photoURL ? (
                    <img
                      src={googleOnboarding.photoURL}
                      alt=""
                      className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                        <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/>
                        <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/>
                        <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.55l3.35-2.62Z"/>
                        <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2 10 10 0 0 0 3.04 7.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/>
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-slate-500">Google Account</div>
                    <div className="truncate text-sm font-semibold text-slate-900">{googleOnboarding.displayName || 'Google Account'}</div>
                    {googleOnboarding.email && (
                      <div className="truncate text-xs text-slate-600">{googleOnboarding.email}</div>
                    )}
                  </div>
                  <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
                    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/>
                    <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/>
                    <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.55l3.35-2.62Z"/>
                    <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2 10 10 0 0 0 3.04 7.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/>
                  </svg>
                </div>
                <div className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
                  เชื่อม Google สำเร็จแล้ว • ตั้ง WIN UID และรหัสผ่านต่อด้านล่าง
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={working}
                className="w-full rounded-md border border-[#747775] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] shadow-sm transition hover:bg-[#f8fafd] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
                  <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/>
                  <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/>
                  <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.55l3.35-2.62Z"/>
                  <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2 10 10 0 0 0 3.04 7.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/>
                </svg>
                <span>{working ? 'กำลังเปิด Google...' : 'ลงชื่อเข้าใช้ด้วย Google Account'}</span>
              </button>
            )}
            <div className="my-4 flex items-center gap-3 text-[10px] font-bold text-slate-500">
              <div className="h-px flex-1 bg-white/10" />
              <span>{googleOnboarding ? 'ตั้ง WIN UID ต่อด้านล่าง' : 'หรือใช้ WIN UID'}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>

          {/* ======================================================== */}
          {/* LOGIN MODE */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4 max-w-md mx-auto">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">WIN UID</span>
                <input
                  value={winUid}
                  onChange={(e) => setWinUid(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  required
                  minLength={4}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="เช่น somchai01"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400/70"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">รหัสผ่าน</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-11 text-sm text-white outline-none focus:border-cyan-400/70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={working || !winUid.trim() || password.length < 8}
                className="w-full mt-2 rounded-xl border border-cyan-200/50 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 px-5 py-3.5 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                <span>{working ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => changeMode('register')}
                  className="text-xs text-amber-300 hover:underline"
                >
                  ยังไม่มีบัญชี? กดสมัครสมาชิกใหม่ที่นี่
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* REGISTRATION FLOW (4 STEPS) */}
          {/* ======================================================== */}
          {mode === 'register' && (
            <div className="space-y-6">
              {/* Step Indicator Header */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className={`p-2 rounded-xl border transition-all ${
                  regStep === 1 
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300 font-bold shadow-[0_0_10px_rgba(255,201,60,0.2)]'
                    : regStep > 1 
                    ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300' 
                    : 'border-white/5 bg-black/20 text-slate-500'
                }`}>
                  <span className="block font-mono text-[10px]">ขั้นที่ 1</span>
                  <span className="truncate block font-semibold">1. กรอกข้อมูล</span>
                </div>

                <div className={`p-2 rounded-xl border transition-all ${
                  regStep === 2 
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300 font-bold shadow-[0_0_10px_rgba(255,201,60,0.2)]'
                    : regStep > 2 
                    ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300' 
                    : 'border-white/5 bg-black/20 text-slate-500'
                }`}>
                  <span className="block font-mono text-[10px]">ขั้นที่ 2</span>
                  <span className="truncate block font-semibold">2. เลือกบทบาท</span>
                </div>

                <div className={`p-2 rounded-xl border transition-all ${
                  regStep === 3 
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300 font-bold shadow-[0_0_10px_rgba(255,201,60,0.2)]'
                    : regStep > 3 
                    ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300' 
                    : 'border-white/5 bg-black/20 text-slate-500'
                }`}>
                  <span className="block font-mono text-[10px]">ขั้นที่ 3</span>
                  <span className="truncate block font-semibold">3. ข้อมูลบทบาท</span>
                </div>

                <div className={`p-2 rounded-xl border transition-all ${
                  regStep === 4 
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300 font-bold shadow-[0_0_10px_rgba(255,201,60,0.2)]'
                    : 'border-white/5 bg-black/20 text-slate-500'
                }`}>
                  <span className="block font-mono text-[10px]">ขั้นที่ 4</span>
                  <span className="truncate block font-semibold">4. กดยืนยัน</span>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* STEP 1: กรอกข้อมูลส่วนตัวและบัญชี */}
              {/* ---------------------------------------------------- */}
              {regStep === 1 && (
                <form onSubmit={handleProceedToRoleSelection} className="space-y-4">
                  <div className="border-b border-white/10 pb-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-cyan-400" />
                      <span>ขั้นตอนที่ 1: กรอกข้อมูลบัญชีและข้อมูลส่วนตัว</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {googleOnboarding ? 'Google ช่วยยืนยันบัญชีและเติมชื่อให้ แต่ยังต้องตั้ง WIN UID + รหัสผ่าน' : 'กรอกข้อมูลพื้นฐานสำหรับสร้างบัญชีในระบบ'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-300">ชื่อจริง *</span>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        placeholder="สมชาย"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-300">นามสกุล *</span>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        placeholder="ใจดี"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-300">WIN UID (ชื่อผู้ใช้เข้าสู่ระบบ) *</span>
                      <input
                        value={winUid}
                        onChange={(e) => setWinUid(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        required
                        minLength={4}
                        maxLength={30}
                        placeholder="เช่น somchai01"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-sm text-cyan-300 outline-none focus:border-cyan-400/70"
                      />
                      <span className="mt-1 block text-[10px] text-slate-400">ภาษาอังกฤษตัวเล็ก ตัวเลข 4-30 ตัว</span>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-300">เบอร์โทรศัพท์ (10 หลัก) *</span>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                          required
                          placeholder="0812345678"
                          className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-400/70"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-300">จังหวัดที่พำนัก/ปฏิบัติงาน *</span>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <select
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#0d1b3a] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-400/70"
                        >
                          {PROVINCES.map((prov) => (
                            <option key={prov} value={prov} className="bg-[#081126] text-white">
                              {prov}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-300">อำเภอ / เขต *</span>
                      <input
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        required
                        placeholder="เช่น จตุจักร, บางรัก, เมือง"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-300">รหัสผ่าน (อย่างน้อย 8 ตัว) *</span>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cyan-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="รหัสผ่าน 8 ตัวขึ้นไป"
                          className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-10 text-sm text-white outline-none focus:border-cyan-400/70"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400"
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-300">ยืนยันรหัสผ่าน *</span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                      />
                    </label>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 py-3.5 px-4 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(255,201,60,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>ถัดไป: เลือกบทบาท</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 2: เลือกบทบาท */}
              {/* ---------------------------------------------------- */}
              {regStep === 2 && (
                <div className="space-y-4">
                  <div className="border-b border-white/10 pb-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>ขั้นตอนที่ 2: เลือกบทบาทของคุณใน WINRIDER.AI</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      แตะเลือกบทบาทที่คุณต้องการเปิดใช้งาน
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Role 1: Knight */}
                    <div
                      onClick={() => {
                        playTactileBlip(800);
                        setSelectedRole('knight');
                      }}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                        selectedRole === 'knight'
                          ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                          : 'border-white/10 bg-black/30 hover:border-cyan-400/50'
                      }`}
                    >
                      {selectedRole === 'knight' && (
                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-cyan-400/20 text-cyan-300">
                          <Bike className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">อัศวินไรเดอร์ (Knight)</h4>
                          <span className="text-[11px] text-amber-300 font-semibold">ล็อก 2 บ. โควตาเหลือ {foundingRemaining} ที่</span>
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                        พี่วินมอเตอร์ไซค์/ไรเดอร์รับงานอิสระ ค่าธรรมเนียม 2 บาท รับค่าโดยสารเต็ม
                      </p>
                    </div>

                    {/* Role 2: Citizen */}
                    <div
                      onClick={() => {
                        playTactileBlip(800);
                        setSelectedRole('citizen');
                      }}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                        selectedRole === 'citizen'
                          ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_20px_rgba(52,211,153,0.25)]'
                          : 'border-white/10 bg-black/30 hover:border-emerald-400/50'
                      }`}
                    >
                      {selectedRole === 'citizen' && (
                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-400/20 text-emerald-300">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">พลเมืองอัศวิน (Citizen)</h4>
                          <span className="text-[11px] text-emerald-400 font-semibold">ผู้โดยสาร · อนุมัติทันที</span>
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                        ประชาชนทั่วไป เรียกรถมอเตอร์ไซค์วิน สั่งซื้อสินค้า เดินทางปลอดภัย
                      </p>
                    </div>

                    {/* Role 3: Merchant */}
                    <div
                      onClick={() => {
                        playTactileBlip(800);
                        setSelectedRole('merchant');
                      }}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                        selectedRole === 'merchant'
                          ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                          : 'border-white/10 bg-black/30 hover:border-amber-400/50'
                      }`}
                    >
                      {selectedRole === 'merchant' && (
                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-300">
                          <Store className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">ร้านค้าพันธมิตร (Merchant)</h4>
                          <span className="text-[11px] text-amber-400 font-semibold">ร้านอาหาร & ร้านค้าชุมชน</span>
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                        ร้านอาหาร เครื่องดื่ม สินค้าชุมชน วินช่วยส่งถึงมือลูกค้า ค่า GP ยุติธรรม
                      </p>
                    </div>

                    {/* Role 4: Partner */}
                    <div
                      onClick={() => {
                        playTactileBlip(800);
                        setSelectedRole('partner');
                      }}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                        selectedRole === 'partner'
                          ? 'border-purple-400 bg-purple-500/15 shadow-[0_0_20px_rgba(192,132,252,0.25)]'
                          : 'border-white/10 bg-black/30 hover:border-purple-400/50'
                      }`}
                    >
                      {selectedRole === 'partner' && (
                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-purple-400 text-slate-950 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-400/20 text-purple-300">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">องค์กรพาร์ทเนอร์ (Partner)</h4>
                          <span className="text-[11px] text-purple-400 font-semibold">โรงพยาบาล สถาบัน องค์กร</span>
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                        หน่วยงาน องค์กร โรงเรียน โรงพยาบาล เชื่อมโยงระบบขนส่งและสวัสดิการ
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="px-4 py-3 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 text-slate-300 text-sm font-semibold flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>ย้อนกลับ</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToRoleDetails}
                      className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 py-3.5 px-4 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(255,201,60,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>ถัดไป: กรอกข้อมูลบทบาท</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 3: กรอกข้อมูลของแต่ละบทบาท */}
              {/* ---------------------------------------------------- */}
              {regStep === 3 && (
                <form onSubmit={handleProceedToConfirm} className="space-y-4">
                  <div className="border-b border-white/10 pb-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-cyan-400" />
                      <span>
                        ขั้นตอนที่ 3: กรอกข้อมูลสำหรับบทบาท{' '}
                        <strong className="text-amber-300">
                          {selectedRole === 'knight' ? 'อัศวินไรเดอร์'
                            : selectedRole === 'citizen' ? 'พลเมืองอัศวิน'
                            : selectedRole === 'merchant' ? 'ร้านค้าพันธมิตร'
                            : 'องค์กรพาร์ทเนอร์'}
                        </strong>
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ข้อมูลเฉพาะสำหรับบทบาทที่ท่านเลือก
                    </p>
                  </div>

                  {/* KNIGHT DETAILS */}
                  {selectedRole === 'knight' && (
                    <div className="space-y-3.5">
                      <div>
                        <span className="mb-1 block text-xs font-bold text-slate-300">ประเภทยานพาหนะ *</span>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setVehicleType('motorcycle')}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                              vehicleType === 'motorcycle'
                                ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                                : 'border-white/10 bg-black/20 text-slate-400'
                            }`}
                          >
                            <Bike className="w-4 h-4" />
                            <span>รถจักรยานยนต์</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVehicleType('car')}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                              vehicleType === 'car'
                                ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                                : 'border-white/10 bg-black/20 text-slate-400'
                            }`}
                          >
                            <span>🚗 รถยนต์</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">หมายเลขทะเบียนรถ *</span>
                          <input
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value)}
                            required
                            placeholder="เช่น 1กข 8998 กรุงเทพฯ"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">เลขที่ใบขับขี่ *</span>
                          <input
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            required
                            placeholder="เช่น 64001234 หรือเลขบัตร"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          />
                        </label>
                      </div>

                      {/* Photo Uploads */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <span className="mb-1 block text-xs font-bold text-slate-300">รูปถ่ายใบขับขี่ (ถ้ามี)</span>
                          <input
                            ref={licenseInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'license')}
                            className="hidden"
                          />
                          <div
                            onClick={() => licenseInputRef.current?.click()}
                            className="cursor-pointer border border-dashed border-white/20 rounded-xl p-3 text-center bg-black/20 hover:border-cyan-400/60 transition-all flex flex-col items-center justify-center min-h-[90px]"
                          >
                            {licensePreview ? (
                              <img src={licensePreview} alt="License" className="h-16 object-contain rounded" />
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-cyan-400 mb-1" />
                                <span className="text-xs text-slate-300">แตะเพื่อเลือกรูปใบขับขี่</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="mb-1 block text-xs font-bold text-slate-300">รูปถ่ายคู่กับรถ (ถ้ามี)</span>
                          <input
                            ref={vehicleInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'vehicle')}
                            className="hidden"
                          />
                          <div
                            onClick={() => vehicleInputRef.current?.click()}
                            className="cursor-pointer border border-dashed border-white/20 rounded-xl p-3 text-center bg-black/20 hover:border-cyan-400/60 transition-all flex flex-col items-center justify-center min-h-[90px]"
                          >
                            {vehiclePreview ? (
                              <img src={vehiclePreview} alt="Vehicle" className="h-16 object-contain rounded" />
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-amber-400 mb-1" />
                                <span className="text-xs text-slate-300">แตะเพื่อเลือกรูปรถ</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CITIZEN DETAILS */}
                  {selectedRole === 'citizen' && (
                    <div className="space-y-3.5">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                        🛡️ สิทธิพลเมืองอัศวิน: ได้รับการคุ้มครองความปลอดภัยและสิทธิเรียกรถมอเตอร์ไซค์วินในราคายุติธรรม
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">ชื่อผู้ติดต่อฉุกเฉิน *</span>
                          <input
                            value={emergencyName}
                            onChange={(e) => setEmergencyName(e.target.value)}
                            required
                            placeholder="เช่น คุณแม่, แฟน, พี่น้อง"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">เบอร์โทรศัพท์ผู้ติดต่อฉุกเฉิน (10 หลัก) *</span>
                          <input
                            type="tel"
                            value={emergencyPhone}
                            onChange={(e) => setEmergencyPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                            required
                            placeholder="0891234567"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* MERCHANT DETAILS */}
                  {selectedRole === 'merchant' && (
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">ชื่อร้านค้า *</span>
                          <input
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            required
                            placeholder="เช่น ครัวป้าสมบูรณ์ อาหารตามสั่ง"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">ประเภทสินค้า/อาหาร *</span>
                          <select
                            value={shopType}
                            onChange={(e) => setShopType(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#0d1b3a] px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          >
                            <option value="อาหารตามสั่ง/สตรีทฟู้ด">อาหารตามสั่ง/สตรีทฟู้ด</option>
                            <option value="ก๋วยเตี๋ยว/บะหมี่">ก๋วยเตี๋ยว/บะหมี่</option>
                            <option value="เครื่องดื่ม/กาแฟ/ชา">เครื่องดื่ม/กาแฟ/ชา</option>
                            <option value="ของหวาน/เบเกอรี่">ของหวาน/เบเกอรี่</option>
                            <option value="ร้านของชำ/มินิมาร์ท">ร้านของชำ/มินิมาร์ท</option>
                            <option value="สินค้าทั่วไป/ยา/สุขภาพ">สินค้าทั่วไป/ยา/สุขภาพ</option>
                          </select>
                        </label>
                      </div>

                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-slate-300">ที่ตั้งร้านค้า *</span>
                        <input
                          value={shopAddress}
                          onChange={(e) => setShopAddress(e.target.value)}
                          required
                          placeholder="เลขที่ ซอย ถนน แขวง/ตำบล"
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-slate-300">เลขประจำตัวผู้เสียภาษี / บัตรประชาชน (ถ้ามี)</span>
                        <input
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="ระบุหรือไม่ก็ได้"
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                        />
                      </label>
                    </div>
                  )}

                  {/* PARTNER DETAILS */}
                  {selectedRole === 'partner' && (
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">ชื่อองค์กร / สถาบัน *</span>
                          <input
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            required
                            placeholder="เช่น รพ.สต. คลองหนึ่ง, มหาวิทยาลัย"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">ประเภทองค์กร *</span>
                          <select
                            value={orgType}
                            onChange={(e) => setOrgType(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#0d1b3a] px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          >
                            <option value="โรงเรียน/มหาวิทยาลัย">โรงเรียน/มหาวิทยาลัย</option>
                            <option value="โรงพยาบาล/สาธารณสุข">โรงพยาบาล/สาธารณสุข</option>
                            <option value="นิติบุคคลคอนโด/หมู่บ้าน">นิติบุคคลคอนโด/หมู่บ้าน</option>
                            <option value="บริษัทเอกชน/ห้างร้าน">บริษัทเอกชน/ห้างร้าน</option>
                            <option value="ศูนย์ราชการ/ชุมชน">ศูนย์ราชการ/ชุมชน</option>
                          </select>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">ชื่อผู้ประสานงาน *</span>
                          <input
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                            required
                            placeholder="ชื่อและตำแหน่งผู้ติดต่อ"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-slate-300">ประมาณการผู้ใช้ (คน)</span>
                          <input
                            type="number"
                            min={1}
                            value={estimatedUsers}
                            onChange={(e) => setEstimatedUsers(Number(e.target.value) || 100)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRegStep(2)}
                      className="px-4 py-3 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 text-slate-300 text-sm font-semibold flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>ย้อนกลับ</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 py-3.5 px-4 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(255,201,60,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>ถัดไป: ตรวจสอบและยืนยัน</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 4: กดยืนยัน -> บันทึกลง Cloud Firestore -> เข้าใช้งานแอป */}
              {/* ---------------------------------------------------- */}
              {regStep === 4 && (
                <div className="space-y-4">
                  <div className="border-b border-white/10 pb-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>ขั้นตอนที่ 4: ยืนยันข้อมูลและบันทึกลง Cloud Firestore</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ตรวจสอบความถูกต้อง ข้อมูลจะถูกบันทึกลงฐานข้อมูลจริงและเปิดใช้งานแอปทันที
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="rounded-2xl border border-cyan-400/30 bg-black/40 p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-slate-400">บทบาทที่เลือก:</span>
                      <span className="font-bold text-cyan-300 text-sm flex items-center gap-1.5">
                        <BadgeCheck className="w-4 h-4 text-emerald-400" />
                        {selectedRole === 'knight' ? 'อัศวินไรเดอร์ (Knight)'
                          : selectedRole === 'citizen' ? 'พลเมืองอัศวิน (Citizen)'
                          : selectedRole === 'merchant' ? 'ร้านค้าพันธมิตร (Merchant)'
                          : 'องค์กรพาร์ทเนอร์ (Partner)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[11px]">ชื่อ-นามสกุล:</span>
                        <strong className="text-white">{firstName} {lastName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">WIN UID:</span>
                        <strong className="text-cyan-300 font-mono">{winUid}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">เบอร์โทรศัพท์:</span>
                        <strong className="text-white">{phone}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">พื้นที่:</span>
                        <strong className="text-white">{district}, {province}</strong>
                      </div>
                    </div>

                    {/* Role Specific Summary */}
                    <div className="pt-2 border-t border-white/10 text-slate-300">
                      {selectedRole === 'knight' && (
                        <div className="flex items-center justify-between">
                          <span>ยานพาหนะ: {vehicleType === 'motorcycle' ? 'รถจักรยานยนต์' : 'รถยนต์'} ({plateNumber})</span>
                          <span className="text-amber-300 font-bold">สิทธิ์อัศวินผู้ก่อตั้ง</span>
                        </div>
                      )}
                      {selectedRole === 'citizen' && (
                        <div>
                          <span>ผู้ติดต่อฉุกเฉิน: {emergencyName} ({emergencyPhone})</span>
                        </div>
                      )}
                      {selectedRole === 'merchant' && (
                        <div>
                          <span>ร้านค้า: {shopName} ({shopType}) - {shopAddress}</span>
                        </div>
                      )}
                      {selectedRole === 'partner' && (
                        <div>
                          <span>องค์กร: {orgName} ({orgType}) - ผู้ติดต่อ: {contactPerson}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PDPA Consents */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">ข้อตกลงและนโยบายความเป็นส่วนตัว (PDPA)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPdpaConsent(true);
                          setGpsConsent(true);
                          setTermsConsent(true);
                        }}
                        className="text-[11px] text-cyan-300 hover:underline cursor-pointer"
                      >
                        ยอมรับทั้งหมด
                      </button>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={pdpaConsent}
                        onChange={(e) => setPdpaConsent(e.target.checked)}
                        className="mt-0.5 accent-cyan-400"
                      />
                      <span>ยินยอมให้ประมวลผลข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={gpsConsent}
                        onChange={(e) => setGpsConsent(e.target.checked)}
                        className="mt-0.5 accent-cyan-400"
                      />
                      <span>ยินยอมการเปิดเผยตำแหน่งพิกัด GPS เพื่อความปลอดภัยและการจับคู่งาน</span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={termsConsent}
                        onChange={(e) => setTermsConsent(e.target.checked)}
                        className="mt-0.5 accent-cyan-400"
                      />
                      <span>ยอมรับระเบียบกองทุนอธิปไตยและการจัดสรรค่าธรรมเนียมที่เป็นธรรม</span>
                    </label>
                  </div>

                  {/* Progress feedback */}
                  {working && (
                    <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-3 text-xs text-cyan-200 flex items-center gap-3 animate-pulse">
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-400 shrink-0" />
                      <div className="flex-1 font-semibold">{progressMsg || 'กำลังดำเนินการ...'}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => setRegStep(3)}
                      className="px-4 py-3.5 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 text-slate-300 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>ย้อนกลับ</span>
                    </button>

                    <button
                      type="button"
                      disabled={working || !pdpaConsent || !gpsConsent || !termsConsent}
                      onClick={handleFinalSubmit}
                      className="flex-1 rounded-xl border border-emerald-300/40 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 py-4 px-5 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(52,211,153,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
                    >
                      {working ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Database className="w-5 h-5" />
                      )}
                      <span>
                        {working
                          ? 'กำลังบันทึกลง Cloud Firestore...'
                          : '⚡ กดยืนยัน บันทึกลง Cloud Firestore และเข้าใช้งานแอป'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Back to Login Link */}
              <div className="text-center pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => changeMode('login')}
                  className="text-xs text-slate-400 hover:text-cyan-300"
                >
                  มีบัญชีอยู่แล้ว? กดที่นี่เพื่อเข้าสู่ระบบ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
