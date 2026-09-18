import React, { useState } from 'react';
import { 
  UserSession, 
  UserRole,
  registerWithEmailPassword,
  loginWithEmailPassword,
  loginWithPhone,
  loginWithLine,
  saveUserSession,
  getRoleTitleTh,
  getRoleAvatarEmoji
} from '../utils/userSession';
import { playTactileBlip, playLevelUpFanfare, playNfcSyncSound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Shield, 
  Bike, 
  User, 
  Store, 
  Building2, 
  Sparkles, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  UserPlus, 
  LogIn,
  Mail,
  Eye,
  EyeOff,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Car
} from 'lucide-react';
import { LineAuthModal } from './LineAuthModal';

interface SovereignAuthGatewayProps {
  onLoginSuccess?: (session: UserSession) => void;
  onAuthenticated?: (session: UserSession) => void;
  onOpenRegister?: () => void;
  onStartRegistration?: () => void;
  audioEnabled: boolean;
}

export const SovereignAuthGateway: React.FC<SovereignAuthGatewayProps> = ({
  onLoginSuccess,
  onAuthenticated,
  onOpenRegister,
  onStartRegistration,
  audioEnabled,
}) => {
  // Main mode: 'login' (เข้าสู่ระบบ) or 'register' (สมัครสมาชิกใหม่)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Auth method tab: 'email' | 'phone' | 'line'
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'line'>('email');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [plateNumber, setPlateNumber] = useState('');
  const [shopName, setShopName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [district, setDistrict] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);

  const handleSuccess = (session: UserSession) => {
    if (audioEnabled) playLevelUpFanfare();
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#00D2FF', '#FFD700', '#10B981'],
    });

    if (typeof onLoginSuccess === 'function') {
      onLoginSuccess(session);
    } else if (typeof onAuthenticated === 'function') {
      onAuthenticated(session);
    }
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (authMethod === 'email') {
      if (!email.trim() || !password) {
        setErrorMessage('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
        return;
      }
      setIsLoading(true);
      if (audioEnabled) playTactileBlip(800);

      const res = await loginWithEmailPassword(email, password);
      setIsLoading(false);

      if (res.success && res.session) {
        setSuccessMessage(`ยินดีต้อนรับคุณ ${res.session.name}!`);
        setTimeout(() => handleSuccess(res.session!), 400);
      } else {
        setErrorMessage(res.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } else if (authMethod === 'phone') {
      if (!phone.trim()) {
        setErrorMessage('กรุณากรอกเบอร์โทรศัพท์มือถือ');
        return;
      }
      setIsLoading(true);
      if (audioEnabled) playTactileBlip(800);

      const res = await loginWithPhone(phone, password);
      setIsLoading(false);

      if (res.success && res.session) {
        setSuccessMessage(`เข้าสู่ระบบสำเร็จด้วยเบอร์ ${res.session.phone}`);
        setTimeout(() => handleSuccess(res.session!), 400);
      } else {
        setErrorMessage(res.error || 'เข้าสู่ระบบด้วยเบอร์โทรไม่สำเร็จ');
      }
    }
  };

  // Submit Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (authMethod === 'email') {
      if (!email.trim() || !password) {
        setErrorMessage('กรุณากรอกอีเมลและรหัสผ่าน');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return;
      }
      if (confirmPassword && password !== confirmPassword) {
        setErrorMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
      if (!fullName.trim()) {
        setErrorMessage('กรุณากรอกชื่อ-นามสกุลจริง');
        return;
      }
      if (!phone.trim()) {
        setErrorMessage('กรุณากรอกเบอร์โทรศัพท์มือถือ');
        return;
      }
      if (role === 'driver' && !plateNumber.trim()) {
        setErrorMessage('กรุณากรอกทะเบียนรถจักรยานยนต์สำหรับพี่วิน');
        return;
      }

      setIsLoading(true);
      if (audioEnabled) playTactileBlip(900);

      const res = await registerWithEmailPassword({
        email,
        password,
        name: fullName,
        phone,
        role,
        plateNumber: role === 'driver' ? plateNumber : undefined,
        shopName: role === 'merchant' ? shopName : undefined,
        companyName: role === 'partner' ? companyName : undefined,
        district,
      });

      setIsLoading(false);

      if (res.success && res.session) {
        setSuccessMessage('สร้างบัญชีผู้ใช้ส่วนตัวสำเร็จ! กำลังเข้าสู่ระบบ...');
        setTimeout(() => handleSuccess(res.session!), 500);
      } else {
        setErrorMessage(res.error || 'การลงทะเบียนไม่สำเร็จ');
      }
    } else if (authMethod === 'phone') {
      if (!phone.trim()) {
        setErrorMessage('กรุณากรอกเบอร์โทรศัพท์');
        return;
      }
      setIsLoading(true);
      if (audioEnabled) playTactileBlip(900);

      const res = await loginWithPhone(phone);
      setIsLoading(false);

      if (res.success && res.session) {
        setSuccessMessage('สร้างบัญชีผู้ใช้ด้วยเบอร์โทรสำเร็จ!');
        setTimeout(() => handleSuccess(res.session!), 500);
      } else {
        setErrorMessage(res.error || 'เกิดข้อผิดพลาด');
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-3 sm:px-6">
      <div className="w-full max-w-xl bg-gradient-to-br from-[#0A1633] via-[#070D1E] to-[#040813] border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-9 shadow-[0_0_60px_rgba(0,210,255,0.25)] relative overflow-hidden space-y-6">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Security Crest Header & Official App Logo */}
        <div className="text-center space-y-3 relative z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl p-[2px] bg-gradient-to-br from-amber-400 via-cyan-400 to-blue-600 shadow-[0_0_30px_rgba(0,210,255,0.5)] relative overflow-hidden group">
            <img 
              src="/app-logo.png" 
              alt="WINRIDER.AI Official Logo" 
              className="w-full h-full object-cover rounded-[22px] transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold shadow-[0_0_15px_rgba(0,210,255,0.2)]">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>INDIVIDUAL SOVEREIGN AUTHENTICATION</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>{authMode === 'login' ? 'เข้าสู่ระบบส่วนบุคคล' : 'สมัครสมาชิกบัญชีใหม่'}</span>
            <span className="text-[#00D2FF]">WINRIDER</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {authMode === 'login'
              ? 'เข้าสู่ระบบด้วยบัญชีส่วนตัวของคุณ ข้อมูลประวัติการจัดส่งและการเรียกจะถูกแยกอิสระเฉพาะคุณ'
              : 'สร้างบัญชีส่วนบุคคลแยกเดี่ยว ข้อมูลการใช้งานทั้งหมดถูกบันทึกปลอดภัยใน Cloud Firestore'}
          </p>
        </div>

        {/* TOP TOGGLE: เข้าสู่ระบบ (Sign In) vs สมัครสมาชิก (Sign Up) */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-black/60 border border-white/10 relative z-10">
          <button
            type="button"
            id="auth-toggle-login-btn"
            onClick={() => {
              if (audioEnabled) playTactileBlip(600);
              setAuthMode('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-black font-mono transition-all flex items-center justify-center gap-2 ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_20px_rgba(0,210,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบ (Sign In)</span>
          </button>

          <button
            type="button"
            id="auth-toggle-register-btn"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setAuthMode('register');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-black font-mono transition-all flex items-center justify-center gap-2 ${
              authMode === 'register'
                ? 'bg-gradient-to-r from-[#FFD700] via-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_20px_rgba(255,215,0,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>สมัครสมาชิกใหม่ (Sign Up)</span>
          </button>
        </div>

        {/* AUTH METHOD SELECTOR TABS: Email | Phone | LINE */}
        <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 relative z-10">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              setAuthMethod('email');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'email'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>อีเมล & รหัสผ่าน</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              setAuthMethod('phone');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'phone'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>เบอร์โทรศัพท์</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              setAuthMethod('line');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'line'
                ? 'bg-[#06C755]/25 text-emerald-300 border border-[#06C755]/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#06C755]" />
            <span>บัญชี LINE</span>
          </button>
        </div>

        {/* FEEDBACK BANNERS */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in relative z-10">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in relative z-10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB CONTENT: 1. EMAIL & PASSWORD */}
        {authMethod === 'email' && (
          <form 
            onSubmit={authMode === 'login' ? handleLoginSubmit : handleRegisterSubmit} 
            className="space-y-4 relative z-10"
          >
            {/* Registration Additional Fields */}
            {authMode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                    ชื่อ-นามสกุลจริง (Full Name) *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="เช่น พี่กิตติ อินทะสร้อย หรือ คุณอารียา"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                    เบอร์โทรศัพท์มือถือ (Phone) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="เช่น 089-123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Role Picker */}
                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                    เลือกบทบาทการใช้งาน (Your Sovereign Role) *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('customer')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        role === 'customer'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xl">🦥</span>
                      <div>
                        <div className="text-xs font-bold">พลเมืองผู้โดยสาร</div>
                        <div className="text-[10px] text-slate-400">Citizen Passenger</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('driver')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        role === 'driver'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xl">🛵</span>
                      <div>
                        <div className="text-xs font-bold">อัศวินพี่วิน</div>
                        <div className="text-[10px] text-slate-400">Knight Driver</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('merchant')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        role === 'merchant'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xl">🏪</span>
                      <div>
                        <div className="text-xs font-bold">ร้านค้าพันธมิตร</div>
                        <div className="text-[10px] text-slate-400">Merchant Partner</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('partner')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        role === 'partner'
                          ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xl">🏥</span>
                      <div>
                        <div className="text-xs font-bold">องค์กร & โรงพยาบาล</div>
                        <div className="text-[10px] text-slate-400">Corporate & Hospital</div>
                      </div>
                    </button>
                  </div>
                </div>

                {role === 'driver' && (
                  <div>
                    <label className="text-xs font-mono font-bold text-amber-300 block mb-1.5">
                      ป้ายทะเบียนรถจักรยานยนต์ *
                    </label>
                    <div className="relative">
                      <Bike className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="เช่น 1กข 7789 กทม."
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-amber-400/40 text-white text-sm focus:border-amber-400 focus:outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                {role === 'merchant' && (
                  <div>
                    <label className="text-xs font-mono font-bold text-emerald-300 block mb-1.5">
                      ชื่อร้านค้า *
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="เช่น ข้าวมันไก่เจ๊หงส์ หรือ คาเฟ่ทองหล่อ"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-emerald-400/40 text-white text-sm focus:border-emerald-400 focus:outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Email field */}
            <div>
              <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                อีเมล (Email Address) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="yourname@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                รหัสผ่าน (Password) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password for Register */}
            {authMode === 'register' && (
              <div>
                <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                  ยืนยันรหัสผ่าน (Confirm Password) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="พิมพ์รหัสผ่านเดิมอีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-5 rounded-xl font-black text-sm font-mono flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-lg ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 hover:brightness-110 shadow-[0_0_25px_rgba(0,210,255,0.4)]'
                  : 'bg-gradient-to-r from-[#FFD700] via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 shadow-[0_0_25px_rgba(255,215,0,0.4)]'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </div>
              ) : authMode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบด้วยอีเมลส่วนตัว</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>ยืนยันการสมัครสมาชิก (เริ่มบัญชีใหม่)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB CONTENT: 2. PHONE NUMBER */}
        {authMethod === 'phone' && (
          <form 
            onSubmit={authMode === 'login' ? handleLoginSubmit : handleRegisterSubmit} 
            className="space-y-4 relative z-10"
          >
            <div>
              <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                เบอร์โทรศัพท์มือถือ (Phone Number) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="เช่น 089-123-4567 หรือ 0812345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5">
                รหัสผ่าน หรือ PIN ประจำตัว (ถ้ามี)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="กรอกรหัสผ่าน (เว้นว่างไว้สำหรับการเข้าใช้งานทันที)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 font-black text-sm font-mono flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] cursor-pointer shadow-[0_0_25px_rgba(0,210,255,0.4)]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังตรวจสอบ...</span>
                </div>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>เข้าใช้งานด้วยเบอร์โทรศัพท์</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB CONTENT: 3. LINE FAST CONNECT */}
        {authMethod === 'line' && (
          <div className="p-5 rounded-2xl bg-[#06C755]/15 border-2 border-[#06C755] space-y-4 text-center relative z-10">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#06C755] flex items-center justify-center text-white shadow-[0_0_25px_rgba(6,199,85,0.6)]">
              <MessageCircle className="w-8 h-8 fill-white text-[#06C755]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">
                เข้าสู่ระบบ / ลงทะเบียนด้วย LINE Official Account
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                เชื่อมต่อบัญชี LINE ของคุณโดยตรงเพื่อรับแจ้งเตือนงาน ติดต่อสื่อสารแบบเรียลไทม์ และไม่ต้องจำรหัสผ่าน
              </p>
            </div>

            <button
              type="button"
              id="gateway-line-direct-connect-btn"
              onClick={() => {
                if (audioEnabled) playNfcSyncSound();
                setIsLineModalOpen(true);
              }}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#06C755] to-emerald-400 hover:brightness-110 text-slate-950 font-black text-sm font-mono shadow-[0_0_25px_rgba(6,199,85,0.6)] flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950 text-[#06C755]" />
              <span>เปิดหน้าต่างเชื่อมต่อ LINE ทันที</span>
            </button>
          </div>
        )}

        {/* DATA ISOLATION NOTICE */}
        <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-slate-300 text-[11px] font-mono leading-relaxed flex items-start gap-2.5 relative z-10">
          <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-cyan-300">ระบบรักษาความปลอดภัยและการแยกข้อมูล (Data Isolation):</span>{' '}
            ทุกการลงทะเบียนใหม่จะสร้าง Unique UID ในระบบ Firebase Firestore ประวัติการเรียกรถ การส่งพัสดุ และคะแนนรีวิวของคุณจะแยกอิสระจากบัญชีอื่นโดยสิ้นเชิง
          </div>
        </div>
      </div>

      {/* LINE Connect Modal */}
      {isLineModalOpen && (
        <LineAuthModal
          isOpen={isLineModalOpen}
          onClose={() => setIsLineModalOpen(false)}
          currentSession={null}
          audioEnabled={audioEnabled}
          onConnected={async (lineProfile) => {
            setIsLineModalOpen(false);
            const res = await loginWithLine(lineProfile);
            if (res.success && res.session) {
              handleSuccess(res.session);
            }
          }}
        />
      )}
    </div>
  );
};
