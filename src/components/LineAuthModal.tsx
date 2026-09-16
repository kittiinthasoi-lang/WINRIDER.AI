import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  Bike, 
  User, 
  Store, 
  Building2, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  QrCode, 
  Smartphone,
  ShieldCheck,
  Zap,
  Phone
} from 'lucide-react';
import { UserSession, UserRole } from '../utils/userSession';
import { authenticateOrRegisterWithLine, LineUserProfile } from '../utils/lineIntegration';
import { playTactileBlip, playLevelUpFanfare, playNfcSyncSound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface LineAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
  audioEnabled?: boolean;
}

export const LineAuthModal: React.FC<LineAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  audioEnabled = true,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'custom' | 'qr'>('quick');
  const [selectedRole, setSelectedRole] = useState<UserRole>('driver');
  const [lineDisplayName, setLineDisplayName] = useState('');
  const [lineId, setLineId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('1กข 7789 กทม.');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Preset Fast LINE Profiles
  const FAST_LINE_PROFILES = [
    {
      id: 'driver_kitti',
      role: 'driver' as UserRole,
      roleName: 'พี่วิน / ไรเดอร์ (Knight Driver)',
      icon: '🛵',
      displayName: 'พี่กิตติ วินสายฟ้า',
      lineId: '@kitti_winrider',
      phone: '089-445-1234',
      plateNumber: '1กข 7789 กทม.',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      description: 'เข้าใช้งานทันทีในฐานะคนขับ พร้อมเปิดเรดาร์รับงาน'
    },
    {
      id: 'passenger_jane',
      role: 'customer' as UserRole,
      roleName: 'ผู้โดยสาร (Passenger Citizen)',
      icon: '👩‍💼',
      displayName: 'คุณเจน เจนจิรา',
      lineId: '@janejira_bkk',
      phone: '081-889-4567',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      description: 'เข้าใช้งานทันทีในฐานะผู้โดยสาร เรียกรถเดินทางด่วน'
    },
    {
      id: 'merchant_somchai',
      role: 'merchant' as UserRole,
      roleName: 'ร้านค้าอาหาร & พัสดุ (Merchant)',
      icon: '🍜',
      displayName: 'เฮียชัย ข้าวมันไก่',
      lineId: '@chaichicken_rice',
      phone: '085-331-9090',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      description: 'เข้าใช้งานทันทีในฐานะร้านค้าพันธมิตร ส่งอาหารด่วน'
    }
  ];

  const handleQuickLogin = async (profile: typeof FAST_LINE_PROFILES[0]) => {
    setIsLoading(true);
    if (audioEnabled) playNfcSyncSound();

    try {
      const session = await authenticateOrRegisterWithLine({
        displayName: profile.displayName,
        lineId: profile.lineId,
        phone: profile.phone,
        role: profile.role,
        plateNumber: profile.plateNumber,
        avatarUrl: profile.avatarUrl
      });

      if (audioEnabled) playLevelUpFanfare();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06C755', '#00D2FF', '#FFD700']
      });

      onLoginSuccess(session);
      onClose();
    } catch (err) {
      console.error('LINE Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineDisplayName.trim()) {
      alert('กรุณากรอกชื่อที่แสดงบน LINE');
      return;
    }

    setIsLoading(true);
    if (audioEnabled) playTactileBlip(900);

    try {
      const session = await authenticateOrRegisterWithLine({
        displayName: lineDisplayName.trim(),
        lineId: lineId.trim() || undefined,
        phone: phoneNumber.trim() || undefined,
        role: selectedRole,
        plateNumber: selectedRole === 'driver' ? plateNumber.trim() : undefined,
        avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg'
      });

      if (audioEnabled) playLevelUpFanfare();
      confetti({
        particleCount: 90,
        spread: 80,
        colors: ['#06C755', '#00D2FF', '#FFD700']
      });

      onLoginSuccess(session);
      onClose();
    } catch (err) {
      console.error('LINE Custom Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-[#062413] via-[#04150B] to-[#020A05] rounded-[32px] border-2 border-[#06C755] p-6 shadow-[0_0_60px_rgba(6,199,85,0.4)] space-y-5 my-auto">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#06C755]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#06C755] flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,199,85,0.6)] animate-pulse">
              <MessageCircle className="w-7 h-7 fill-white text-[#06C755]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/40 text-[10px] font-black font-mono uppercase">
                  LINE CONNECT & LOGIN
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  เริ่มใช้งานทันที
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                เข้าสู่ระบบ & ผูกบัญชีกับ LINE
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              onClose();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/60 rounded-2xl border border-white/10 relative z-10 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setActiveTab('quick');
            }}
            className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'quick'
                ? 'bg-[#06C755] text-slate-950 shadow-[0_0_15px_rgba(6,199,85,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click ด่วน</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setActiveTab('custom');
            }}
            className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-[#06C755] text-slate-950 shadow-[0_0_15px_rgba(6,199,85,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>กรอกข้อมูล LINE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setActiveTab('qr');
            }}
            className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-[#06C755] text-slate-950 shadow-[0_0_15px_rgba(6,199,85,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>สแกน QR LINE</span>
          </button>
        </div>

        {/* Tab 1: Fast 1-Click LINE Profiles */}
        {activeTab === 'quick' && (
          <div className="space-y-3 relative z-10">
            <p className="text-xs text-slate-300">
              แตะเพื่อเลือกบัญชีและเริ่มใช้งานทันที ระบบจะเชื่อมต่อกับ LINE และพาเข้าหน้าจอทำงานจริงโดยอัตโนมัติ:
            </p>

            <div className="space-y-2.5">
              {FAST_LINE_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickLogin(p)}
                  disabled={isLoading}
                  className="w-full p-3.5 rounded-2xl bg-black/50 hover:bg-[#06C755]/15 border border-white/10 hover:border-[#06C755] text-left transition-all group flex items-center justify-between cursor-pointer active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img 
                        src={p.avatarUrl} 
                        alt={p.displayName} 
                        className="w-12 h-12 rounded-xl object-cover border border-[#06C755]/50 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#06C755] flex items-center justify-center text-[10px] text-white">
                        {p.icon}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-white group-hover:text-emerald-300">
                          {p.displayName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#06C755]/20 text-[#06C755] text-[9px] font-mono font-bold">
                          {p.lineId}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono font-semibold mt-0.5">
                        {p.roleName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.description}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-[#06C755] text-slate-950 font-black text-xs font-mono group-hover:brightness-110 flex items-center gap-1 shadow-md">
                    <span>เริ่มเลย</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Form with LINE ID */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCustomSubmit} className="space-y-4 relative z-10">
            {/* Choose Role */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-mono font-bold block">
                1. เลือกบทบาทของคุณในระบบ:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'driver' as UserRole, label: 'วินมอเตอร์ไซค์', icon: <Bike className="w-4 h-4" /> },
                  { role: 'customer' as UserRole, label: 'ผู้โดยสาร', icon: <User className="w-4 h-4" /> },
                  { role: 'merchant' as UserRole, label: 'ร้านค้า', icon: <Store className="w-4 h-4" /> }
                ].map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      setSelectedRole(r.role);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold font-mono flex flex-col items-center gap-1 transition-all ${
                      selectedRole === r.role
                        ? 'bg-[#06C755] text-slate-950 border-[#06C755] shadow-[0_0_15px_rgba(6,199,85,0.5)]'
                        : 'bg-black/50 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {r.icon}
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">
                  2. ชื่อที่แสดงบน LINE (Display Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น พี่กิตติ อินทะสร้อย"
                  value={lineDisplayName}
                  onChange={(e) => setLineDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#06C755]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs text-slate-300 font-mono block mb-1">
                    LINE ID (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น @kitti_win"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#06C755]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-mono block mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="tel"
                    placeholder="089-xxx-xxxx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#06C755]"
                  />
                </div>
              </div>

              {selectedRole === 'driver' && (
                <div>
                  <label className="text-xs text-slate-300 font-mono block mb-1">
                    ป้ายทะเบียนรถจักรยานยนต์
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 1กข 7789 กทม."
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#06C755]"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#06C755] to-emerald-500 hover:brightness-110 text-slate-950 font-black text-sm font-mono shadow-[0_0_20px_rgba(6,199,85,0.5)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              <span>ผูกบัญชี LINE & เริ่มใช้งานทันที</span>
            </button>
          </form>
        )}

        {/* Tab 3: LINE QR Code */}
        {activeTab === 'qr' && (
          <div className="space-y-4 text-center relative z-10 py-2">
            <div className="w-48 h-48 mx-auto bg-white rounded-2xl p-3 shadow-[0_0_30px_rgba(6,199,85,0.5)] border-4 border-[#06C755] flex flex-col items-center justify-center">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://line.me/R/ti/p/~winrider_official" 
                alt="LINE Official Account QR" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-white">
                สแกนผ่านแอป LINE บนโทรศัพท์มือถือ
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                เปิดกล้องหรือตัวสแกนในแอป LINE เพื่อเชื่อมต่อรับงาน ส่งแจ้งเตือน และแชทคุยกับผู้โดยสารได้ตลอดเวลา
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <a
                href="https://line.me/R/ti/p/~winrider_official"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#06C755] text-slate-950 font-black text-xs font-mono shadow-md flex items-center gap-1.5 hover:brightness-110"
              >
                <MessageCircle className="w-4 h-4 fill-slate-950" />
                <span>เปิดแอป LINE โดยตรง</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  handleQuickLogin(FAST_LINE_PROFILES[0]);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs font-mono"
              >
                เข้าสู่ระบบทันที (ไม่ต้องรอสแกน)
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono relative z-10">
          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>LINE Official Integration • กองทุน 2฿ อัตโนมัติ</span>
          </div>
          <span>WINRIDER v2.5</span>
        </div>
      </div>
    </div>
  );
};
