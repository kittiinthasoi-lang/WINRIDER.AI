import React, { useState } from 'react';
import { 
  UserSession, 
  PRESET_ACCOUNTS, 
  authenticateUser, 
  saveUserSession 
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
  QrCode,
  Fingerprint
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'quick' | 'phone'>('quick');
  const [phoneOrIdInput, setPhoneOrIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSuccess = (session: UserSession) => {
    if (typeof onLoginSuccess === 'function') {
      onLoginSuccess(session);
    } else if (typeof onAuthenticated === 'function') {
      onAuthenticated(session);
    }
  };

  const handleRegisterClick = () => {
    if (typeof onOpenRegister === 'function') {
      onOpenRegister();
    } else if (typeof onStartRegistration === 'function') {
      onStartRegistration();
    }
  };

  const handleSelectPreset = async (account: UserSession) => {
    if (audioEnabled) playLevelUpFanfare();
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00D2FF', '#FFD700', '#10B981'],
    });
    await saveUserSession(account);
    handleSuccess(account);
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOrIdInput.trim()) {
      setErrorMessage('กรุณากรอกเบอร์โทรศัพท์หรือรหัส Sovereign ID');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    if (audioEnabled) playTactileBlip(900);

    try {
      const session = await authenticateUser(phoneOrIdInput);
      if (session) {
        if (audioEnabled) playLevelUpFanfare();
        confetti({
          particleCount: 80,
          spread: 80,
          colors: ['#00D2FF', '#FFD700'],
        });
        onLoginSuccess(session);
      } else {
        // Fallback: If not found in DB, auto-provision temporary citizen passenger
        const cleanPhone = phoneOrIdInput.replace(/[^0-9]/g, '');
        const newCitizen: UserSession = {
          id: `WIN-CTZ-${Math.floor(100000 + Math.random() * 900000)}`,
          name: `คุณพลเมือง (${phoneOrIdInput.trim()})`,
          phone: phoneOrIdInput.trim(),
          role: 'customer',
          roleTitleTh: 'พลเมืองผู้โดยสาร (Citizen Passenger)',
          level: 1,
          xp: 100,
          rating: 5.0,
          avatarEmoji: '🦥',
          registeredAt: new Date().toISOString(),
        };
        await saveUserSession(newCitizen);
        if (audioEnabled) playLevelUpFanfare();
        onLoginSuccess(newCitizen);
      }
    } catch (err) {
      setErrorMessage('ไม่สามารถตรวจสอบข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-3 sm:px-6">
      <div className="w-full max-w-2xl bg-gradient-to-br from-[#0A1633] via-[#070D1E] to-[#040813] border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(0,210,255,0.25)] relative overflow-hidden space-y-6">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Security Crest Header */}
        <div className="text-center space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold shadow-[0_0_15px_rgba(0,210,255,0.2)]">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>ROLE-LOCKED SECURE GATEWAY</span>
            <Sparkles className="w-3 h-3 text-[#FFD700]" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>เข้าสู่ระบบอธิปไตย</span>
            <span className="text-[#00D2FF]">WINRIDER.AI</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            ระบบป้องกันการสวมบทบาท (Role-Lock): เมื่อเข้าสู่ระบบแล้วคุณจะเข้าถึงได้เฉพาะหน้าจอของบทบาทตนเอง เพื่อความปลอดภัยและการใช้งานจริง
          </p>
        </div>

        {/* Mode Selector Tabs (Quick Preset vs Phone Login) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-black/50 border border-white/10 relative z-10">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setActiveTab('quick');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              activeTab === 'quick'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>เลือกเข้าใช้งานด่วน (4 บทบาท)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setActiveTab('phone');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              activeTab === 'phone'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>เบอร์โทร / Sovereign ID</span>
          </button>
        </div>

        {/* TAB 1: QUICK ROLE PRESET CARDS */}
        {activeTab === 'quick' && (
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
              <span>เลือกบัญชีตัวแทนเพื่อทดสอบระบบล็อกบทบาท:</span>
              <span className="text-cyan-400">1-Click Direct Lock</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_ACCOUNTS.map((acc) => {
                const isDriver = acc.role === 'driver';
                const isCustomer = acc.role === 'customer';
                const isMerchant = acc.role === 'merchant';
                const isPartner = acc.role === 'partner';

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectPreset(acc)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start gap-2 text-left relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] ${
                      isDriver
                        ? 'bg-[#0F2248]/80 hover:bg-[#0F2248] border-cyan-400/50 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,210,255,0.3)]'
                        : isCustomer
                        ? 'bg-[#15281E]/80 hover:bg-[#15281E] border-emerald-400/50 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : isMerchant
                        ? 'bg-[#2A1D0F]/80 hover:bg-[#2A1D0F] border-amber-400/50 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                        : 'bg-[#26152B]/80 hover:bg-[#26152B] border-pink-400/50 hover:border-pink-400 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl p-1.5 rounded-xl bg-black/40 border border-white/10">
                          {acc.avatarEmoji}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                            {acc.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {acc.roleTitleTh}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-cyan-300 font-bold">
                        LV.{acc.level}
                      </span>
                    </div>

                    <div className="w-full pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">{acc.id}</span>
                      <span className="text-cyan-400 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                        <span>ล็อกอินหน้านี้</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PHONE OR ID LOGIN */}
        {activeTab === 'phone' && (
          <form onSubmit={handlePhoneLogin} className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>เบอร์โทรศัพท์มือถือ หรือ รหัส SOVEREIGN ID</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneOrIdInput}
                  onChange={(e) => setPhoneOrIdInput(e.target.value)}
                  placeholder="เช่น 089-445-1234 หรือ WIN-KGT-100888"
                  className="w-full px-4 py-3.5 rounded-2xl bg-black/60 border border-white/20 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <Fingerprint className="w-5 h-5 text-slate-500 absolute right-4 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400">
                หากเคยลงทะเบียนแล้ว ระบบจะดึงโปรไฟล์จาก Firebase และล็อกหน้าจอตามบทบาทเดิมของคุณอัตโนมัติ
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-slate-950 font-black text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <span>กำลังยืนยันตัวตน...</span>
              ) : (
                <>
                  <span>เข้าสู่ระบบและล็อกบทบาท</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FOOTER: NEW REGISTRATION LINK */}
        <div className="pt-4 border-t border-white/10 text-center relative z-10 space-y-2">
          <p className="text-xs text-slate-400">
            ยังไม่มีบัญชีอธิปไตยในระบบ?
          </p>
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playNfcSyncSound();
              onOpenRegister();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(255,215,0,0.15)] active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
            <span>ลงทะเบียน 4 บทบาทใหม่ (รับสวัสดิการ 2฿ & บัตรประชาชนดิจิทัล)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
