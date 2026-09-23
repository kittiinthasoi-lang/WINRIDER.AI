import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RegistrationProfile, UserRole } from '../../types/auth';
import { playTactileBlip } from '../../utils/audio';
import {
  AlertCircle,
  Bike,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  UserPlus,
} from 'lucide-react';

const initialRegistration = (): RegistrationProfile => ({
  fullName: '',
  phone: '',
  province: 'กรุงเทพมหานคร',
  district: '',
  pdpaAccepted: false,
  gpsConsent: false,
  termsAccepted: false,
  emergencyContactName: '',
  emergencyContactPhone: '',
  winStation: '',
  vestNumber: '',
  plateNumber: '',
  publicLicenseNumber: '',
  vehicleModel: '',
  yellowPlateConfirmed: false,
  shopName: '',
  shopType: 'อาหาร / เครื่องดื่ม',
  shopAddress: '',
  taxId: '',
  orgName: '',
  orgType: 'บริษัท / องค์กรเอกชน',
  contactPerson: '',
  orgAddress: '',
  estimatedUsers: 1,
});

const roleLabels: Record<UserRole, string> = {
  citizen: '🛡️ พลเมือง / ผู้โดยสาร',
  knight: '🏍️ พี่วิน / Knight',
  merchant: '🏪 ร้านค้า / Merchant',
  partner: '🏢 พาร์ทเนอร์ / Partner',
};

export const AuthModalOrView: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [registration, setRegistration] = useState<RegistrationProfile>(initialRegistration);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const patchRegistration = <K extends keyof RegistrationProfile>(key: K, value: RegistrationProfile[K]) => {
    setRegistration((current) => ({ ...current, [key]: value }));
  };

  const translateAuthError = (code: string) => {
    switch (code) {
      case 'INVALID_CREDENTIALS':
      case 'WIN_AUTH_INVALID_CREDENTIALS':
        return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      case 'EMAIL_ALREADY_REGISTERED':
        return 'อีเมลนี้ลงทะเบียนแล้ว กรุณากดเข้าสู่ระบบ';
      case 'WIN_AUTH_STORE_NOT_CONFIGURED':
        return 'ระบบบัญชี WIN Auth ยังเชื่อมฐานข้อมูลถาวรไม่ได้';
      case 'ADMIN_PASSWORD_NOT_CONFIGURED':
        return 'บัญชีเจ้าของระบบยังไม่ได้ตั้งรหัสแอดมินครั้งแรก';
      case 'ACCOUNT_SUSPENDED':
        return 'บัญชีนี้ถูกระงับ กรุณาติดต่อแอดมิน';
      case 'INVALID_EMAIL':
        return 'รูปแบบอีเมลไม่ถูกต้อง';
      case 'WEAK_PASSWORD':
        return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
      case 'REGISTRATION_FULL_NAME_REQUIRED':
        return 'กรุณากรอกชื่อ-นามสกุลจริง';
      case 'REGISTRATION_PHONE_INVALID':
        return 'กรุณากรอกเบอร์โทรศัพท์ไทย 10 หลัก';
      case 'REGISTRATION_AREA_REQUIRED':
        return 'กรุณากรอกจังหวัดและเขต/อำเภอ';
      case 'REGISTRATION_CONSENT_REQUIRED':
        return 'กรุณายอมรับข้อตกลง ข้อมูลส่วนบุคคล และการใช้ GPS ให้ครบ';
      case 'REGISTRATION_EMERGENCY_CONTACT_REQUIRED':
        return 'กรุณากรอกชื่อและเบอร์ผู้ติดต่อฉุกเฉินให้ครบ';
      case 'REGISTRATION_KNIGHT_DETAILS_REQUIRED':
        return 'กรุณากรอกข้อมูลวิน รถ ทะเบียน และใบอนุญาตให้ครบ';
      case 'REGISTRATION_YELLOW_PLATE_REQUIRED':
        return 'พี่วินต้องยืนยันว่าใช้รถป้ายเหลืองที่จดทะเบียนถูกกฎหมาย';
      case 'REGISTRATION_MERCHANT_DETAILS_REQUIRED':
        return 'กรุณากรอกชื่อร้าน ประเภทร้าน และที่อยู่ร้านให้ครบ';
      case 'REGISTRATION_PARTNER_DETAILS_REQUIRED':
        return 'กรุณากรอกข้อมูลองค์กร ผู้ประสานงาน และที่อยู่องค์กรให้ครบ';
      case 'WIN_AUTH_ADMIN_RESET_REQUIRED':
        return 'การเปลี่ยนรหัสผ่านต้องให้แอดมินดำเนินการ';
      default:
        return 'ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่อีกครั้ง';
    }
  };

  const validateSignup = () => {
    if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    if (password !== confirmPass) return 'ยืนยันรหัสผ่านไม่ตรงกัน';
    if (registration.fullName.trim().length < 2) return 'กรุณากรอกชื่อ-นามสกุลจริง';
    if (!/^0\d{9}$/.test(registration.phone.replace(/\s+/g, ''))) return 'กรุณากรอกเบอร์โทรศัพท์ 10 หลัก';
    if (!registration.province.trim() || !registration.district.trim()) return 'กรุณากรอกจังหวัดและเขต/อำเภอ';
    if (!registration.pdpaAccepted || !registration.gpsConsent || !registration.termsAccepted) return 'กรุณายอมรับข้อตกลงทั้ง 3 ข้อ';

    if (role === 'citizen') {
      if (!registration.emergencyContactName?.trim() || !/^0\d{9}$/.test(String(registration.emergencyContactPhone || '').replace(/\s+/g, ''))) {
        return 'กรุณากรอกชื่อและเบอร์ผู้ติดต่อฉุกเฉิน';
      }
    }
    if (role === 'knight') {
      if (!registration.winStation?.trim() || !registration.vestNumber?.trim() || !registration.plateNumber?.trim()
        || !registration.publicLicenseNumber?.trim() || !registration.vehicleModel?.trim()) {
        return 'กรุณากรอกข้อมูลวิน รถ ทะเบียน และใบอนุญาตให้ครบ';
      }
      if (!registration.yellowPlateConfirmed) return 'ต้องยืนยันรถป้ายเหลืองที่จดทะเบียนถูกกฎหมาย';
    }
    if (role === 'merchant') {
      if (!registration.shopName?.trim() || !registration.shopType?.trim() || !registration.shopAddress?.trim()) {
        return 'กรุณากรอกข้อมูลร้านค้าให้ครบ';
      }
    }
    if (role === 'partner') {
      if (!registration.orgName?.trim() || !registration.orgType?.trim() || !registration.contactPerson?.trim() || !registration.orgAddress?.trim()) {
        return 'กรุณากรอกข้อมูลองค์กรให้ครบ';
      }
    }
    return null;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่านให้ครบ');
      return;
    }

    if (authMode === 'signup') {
      const validation = validateSignup();
      if (validation) {
        setErrorMsg(validation);
        return;
      }
    }

    setIsLoading(true);
    playTactileBlip(800);
    try {
      if (authMode === 'signin') {
        await signInWithEmail(cleanEmail, password);
      } else {
        await signUpWithEmail(cleanEmail, password, role, {
          ...registration,
          fullName: registration.fullName.trim(),
          phone: registration.phone.replace(/\s+/g, ''),
          province: registration.province.trim(),
          district: registration.district.trim(),
        });
      }
    } catch (err: any) {
      setErrorMsg(translateAuthError(err?.code || err?.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (!email.trim()) {
      setErrorMsg('กรอกอีเมลก่อน แล้วกด “ลืมรหัสผ่าน”');
      return;
    }
    try {
      await resetPassword(email.trim());
    } catch {
      setInfoMsg('กรุณาติดต่อแอดมิน WINRIDER เพื่อยืนยันตัวตนและตั้งรหัสผ่านใหม่');
    }
  };

  const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]';

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className={`w-full ${authMode === 'signup' ? 'max-w-2xl' : 'max-w-md'} bg-[#0A1633] border border-[#00D4FF]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_35px_rgba(0,212,255,0.18)] relative overflow-hidden text-slate-100`}>
        <div className="absolute top-0 right-0 w-56 h-56 bg-[#00D4FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC93C]" />
              <span>WIN Auth • บัญชีของ WINRIDER.AI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              <span className="text-[#00D4FF]">WINRIDER</span><span className="text-[#FFC93C]">.AI</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">เจ้าของระบบเข้าได้ทันที • ผู้สมัครใหม่ทุกบทบาทรอแอดมินอนุมัติ</p>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button type="button" onClick={() => { setAuthMode('signin'); setErrorMsg(null); setInfoMsg(null); }}
              className={`py-2 rounded-lg font-bold ${authMode === 'signin' ? 'bg-[#00D4FF] text-slate-950' : 'text-slate-400'}`}>เข้าสู่ระบบ</button>
            <button type="button" onClick={() => { setAuthMode('signup'); setErrorMsg(null); setInfoMsg(null); }}
              className={`py-2 rounded-lg font-bold ${authMode === 'signup' ? 'bg-[#00D4FF] text-slate-950' : 'text-slate-400'}`}>ลงทะเบียนใหม่</button>
          </div>

          {errorMsg && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}</div>}
          {infoMsg && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{infoMsg}</div>}

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">บทบาทที่สมัคร</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputClass}>
                    {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <p className="mt-1 text-[11px] text-amber-300">ข้อมูลด้านล่างจะให้ Super Admin ตรวจสอบก่อนเปิดบัญชี</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs text-slate-300"><span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />ชื่อ-นามสกุลจริง *</span>
                    <input className={inputClass} value={registration.fullName} onChange={(e) => patchRegistration('fullName', e.target.value)} /></label>
                  <label className="space-y-1 text-xs text-slate-300"><span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />เบอร์โทรศัพท์ *</span>
                    <input className={inputClass} inputMode="tel" placeholder="0812345678" value={registration.phone} onChange={(e) => patchRegistration('phone', e.target.value)} /></label>
                  <label className="space-y-1 text-xs text-slate-300"><span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />จังหวัด *</span>
                    <input className={inputClass} value={registration.province} onChange={(e) => patchRegistration('province', e.target.value)} /></label>
                  <label className="space-y-1 text-xs text-slate-300"><span>เขต / อำเภอ *</span>
                    <input className={inputClass} value={registration.district} onChange={(e) => patchRegistration('district', e.target.value)} /></label>
                </div>

                {role === 'citizen' && (
                  <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/30 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-cyan-200 flex items-center gap-2"><User className="w-4 h-4" />ข้อมูลผู้โดยสาร</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input className={inputClass} placeholder="ชื่อผู้ติดต่อฉุกเฉิน *" value={registration.emergencyContactName || ''} onChange={(e) => patchRegistration('emergencyContactName', e.target.value)} />
                      <input className={inputClass} inputMode="tel" placeholder="เบอร์ผู้ติดต่อฉุกเฉิน *" value={registration.emergencyContactPhone || ''} onChange={(e) => patchRegistration('emergencyContactPhone', e.target.value)} />
                    </div>
                  </div>
                )}

                {role === 'knight' && (
                  <div className="rounded-2xl border border-amber-400/25 bg-slate-950/30 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2"><Bike className="w-4 h-4" />ข้อมูลพี่วินและรถ</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input className={inputClass} placeholder="ชื่อวิน / จุดตั้งวิน *" value={registration.winStation || ''} onChange={(e) => patchRegistration('winStation', e.target.value)} />
                      <input className={inputClass} placeholder="หมายเลขเสื้อวิน *" value={registration.vestNumber || ''} onChange={(e) => patchRegistration('vestNumber', e.target.value)} />
                      <input className={inputClass} placeholder="ทะเบียนรถป้ายเหลือง *" value={registration.plateNumber || ''} onChange={(e) => patchRegistration('plateNumber', e.target.value)} />
                      <input className={inputClass} placeholder="เลขใบอนุญาตขับขี่สาธารณะ *" value={registration.publicLicenseNumber || ''} onChange={(e) => patchRegistration('publicLicenseNumber', e.target.value)} />
                      <input className={`${inputClass} sm:col-span-2`} placeholder="ยี่ห้อ / รุ่นรถ *" value={registration.vehicleModel || ''} onChange={(e) => patchRegistration('vehicleModel', e.target.value)} />
                    </div>
                    <label className="flex items-start gap-2 text-xs text-amber-100 cursor-pointer">
                      <input type="checkbox" checked={registration.yellowPlateConfirmed === true} onChange={(e) => patchRegistration('yellowPlateConfirmed', e.target.checked)} className="mt-0.5" />
                      <span>ยืนยันว่ารถคันนี้เป็นรถป้ายเหลืองที่จดทะเบียนถูกกฎหมาย และยินยอมให้แอดมินตรวจข้อมูลก่อนเปิดรับงาน *</span>
                    </label>
                  </div>
                )}

                {role === 'merchant' && (
                  <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/30 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-emerald-200 flex items-center gap-2"><Store className="w-4 h-4" />ข้อมูลร้านค้า</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input className={inputClass} placeholder="ชื่อร้านค้า *" value={registration.shopName || ''} onChange={(e) => patchRegistration('shopName', e.target.value)} />
                      <input className={inputClass} placeholder="ประเภทร้าน *" value={registration.shopType || ''} onChange={(e) => patchRegistration('shopType', e.target.value)} />
                      <input className={`${inputClass} sm:col-span-2`} placeholder="ที่อยู่ร้าน / จุดรับสินค้า *" value={registration.shopAddress || ''} onChange={(e) => patchRegistration('shopAddress', e.target.value)} />
                      <input className={`${inputClass} sm:col-span-2`} placeholder="เลขประจำตัวผู้เสียภาษี (ถ้ามี)" value={registration.taxId || ''} onChange={(e) => patchRegistration('taxId', e.target.value)} />
                    </div>
                  </div>
                )}

                {role === 'partner' && (
                  <div className="rounded-2xl border border-violet-400/20 bg-slate-950/30 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-violet-200 flex items-center gap-2"><Building2 className="w-4 h-4" />ข้อมูลองค์กร</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input className={inputClass} placeholder="ชื่อองค์กร / หน่วยงาน *" value={registration.orgName || ''} onChange={(e) => patchRegistration('orgName', e.target.value)} />
                      <input className={inputClass} placeholder="ประเภทองค์กร *" value={registration.orgType || ''} onChange={(e) => patchRegistration('orgType', e.target.value)} />
                      <input className={inputClass} placeholder="ชื่อผู้ประสานงาน *" value={registration.contactPerson || ''} onChange={(e) => patchRegistration('contactPerson', e.target.value)} />
                      <input className={inputClass} type="number" min={1} placeholder="ผู้ใช้โดยประมาณ/วัน" value={registration.estimatedUsers || 1} onChange={(e) => patchRegistration('estimatedUsers', Number(e.target.value) || 1)} />
                      <input className={`${inputClass} sm:col-span-2`} placeholder="ที่อยู่องค์กร *" value={registration.orgAddress || ''} onChange={(e) => patchRegistration('orgAddress', e.target.value)} />
                    </div>
                  </div>
                )}
              </>
            )}

            <label className="space-y-1 text-xs text-slate-300 block"><span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />อีเมล *</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputClass} /></label>

            <div className={authMode === 'signup' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
              <label className="space-y-1 text-xs text-slate-300 block"><span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" />รหัสผ่าน *</span>
                <input type="password" required minLength={8} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" className={inputClass} /></label>
              {authMode === 'signup' && <label className="space-y-1 text-xs text-slate-300 block"><span>ยืนยันรหัสผ่าน *</span>
                <input type="password" required minLength={8} autoComplete="new-password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" className={inputClass} /></label>}
            </div>

            {authMode === 'signup' && (
              <div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                <label className="flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={registration.pdpaAccepted} onChange={(e) => patchRegistration('pdpaAccepted', e.target.checked)} className="mt-0.5" /><span>ยินยอมให้เก็บข้อมูลที่จำเป็นสำหรับบัญชี การอนุมัติ และการให้บริการ *</span></label>
                <label className="flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={registration.gpsConsent} onChange={(e) => patchRegistration('gpsConsent', e.target.checked)} className="mt-0.5" /><span>ยินยอมให้ใช้ GPS ขณะใช้บริการเพื่อจุดรับ การจับคู่ เรดาร์ และความปลอดภัย *</span></label>
                <label className="flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={registration.termsAccepted} onChange={(e) => patchRegistration('termsAccepted', e.target.checked)} className="mt-0.5" /><span>ยอมรับเงื่อนไข WIN Wallet ค่าบริการ และการตรวจอนุมัติโดยแอดมิน *</span></label>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="w-full py-3 px-4 rounded-xl bg-[#00D4FF] hover:bg-[#00c0e8] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />กำลังดำเนินการ...</> : authMode === 'signin' ? <><LogIn className="w-4 h-4" />เข้าสู่ระบบ</> : <><UserPlus className="w-4 h-4" />ส่งคำขอลงทะเบียนให้แอดมินตรวจ</>}
            </button>

            {authMode === 'signin' && (
              <button type="button" onClick={handleResetPassword} disabled={isLoading} className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2">
                <KeyRound className="w-4 h-4" />ลืมรหัสผ่าน / ติดต่อแอดมิน
              </button>
            )}
          </form>

          <div className="pt-4 border-t border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="w-4 h-4 text-[#00D4FF]" />รหัสผ่านเก็บเป็น hash ฝั่งเซิร์ฟเวอร์ • บัญชีเก็บถาวรใน Firestore</div>
          </div>
        </div>
      </div>
    </div>
  );
};
