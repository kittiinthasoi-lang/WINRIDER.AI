import React, { useState, useEffect } from 'react';
import { ChapterId, AppMode } from '../types';
import { playTactileBlip, playNfcSyncSound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Crown, 
  Coins, 
  Radio, 
  Shield, 
  Wrench, 
  Globe2, 
  Rocket, 
  Volume2, 
  VolumeX, 
  AudioWaveform,
  User,
  UserCheck,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Smartphone,
  Bike,
  Store,
  Building2,
  BookOpen,
  UserPlus,
  ShoppingBag,
  Flame,
  Bell,
  Zap,
  Compass,
  LogOut,
  Lock,
  CheckCircle2,
  Box
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { UserSession, isDriverAccount, isDriverInCitizenMode } from '../utils/userSession';

interface NavbarProps {
  activeMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  activeChapter: ChapterId;
  onSelectChapter: (id: ChapterId) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenCustomerVoice: () => void;
  onOpenWinBuddy?: () => void;
  onOpenProfile?: () => void;
  onOpenWebhookModal?: () => void;
  onOpenNotificationModal?: () => void;
  onOpenGpsModal?: () => void;
  currentUserSession?: UserSession | null;
  onSignOut?: () => void;
  onToggleDriverPersona?: (target: 'driver' | 'customer') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeMode,
  onSelectMode,
  activeChapter,
  onSelectChapter,
  audioEnabled,
  onToggleAudio,
  onOpenCustomerVoice,
  onOpenWinBuddy,
  onOpenProfile,
  onOpenWebhookModal,
  onOpenNotificationModal,
  onOpenGpsModal,
  currentUserSession,
  onSignOut,
  onToggleDriverPersona,
}) => {
  const [nfcSynced, setNfcSynced] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showRoleInfoModal, setShowRoleInfoModal] = useState(false);

  const isDriver = isDriverAccount(currentUserSession || null);
  const isDriverCitizen = isDriverInCitizenMode(currentUserSession || null);
  const isPureCustomer = currentUserSession?.role === 'customer' && !isDriver;
  const isMerchant = currentUserSession?.role === 'merchant';
  const isPartner = currentUserSession?.role === 'partner';

  // Role details for profile avatar, icon, and label
  const profileInfo = (() => {
    if (!currentUserSession) {
      return {
        name: 'พลเมือง',
        title: 'โปรไฟล์พลเมือง',
        roleLabel: 'พลเมือง',
        avatar: '/avatars/citizen.jpg',
        badgeBorder: 'border-amber-400/50 shadow-[0_0_10px_rgba(255,215,0,0.2)]',
        buttonClass: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-400/40 shadow-[0_0_12px_rgba(255,215,0,0.2)]',
        icon: <User className="w-3.5 h-3.5 text-amber-300" />
      };
    }
    if (isDriverCitizen) {
      return {
        name: currentUserSession.name,
        title: `โปรไฟล์พลเมือง (พี่วินพักงาน/Off-Duty) - เลเวล ${currentUserSession.level} คงเดิม`,
        roleLabel: `พลเมือง (พี่วิน) Lv.${currentUserSession.level}`,
        avatar: '/avatars/citizen.jpg',
        badgeBorder: 'border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]',
        buttonClass: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/60 shadow-[0_0_14px_rgba(16,185,129,0.35)]',
        icon: <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
      };
    }
    if (currentUserSession.role === 'driver') {
      return {
        name: currentUserSession.name,
        title: `โปรไฟล์พี่วินอัศวิน: ${currentUserSession.name} (Lv.${currentUserSession.level})`,
        roleLabel: `พี่วิน Lv.${currentUserSession.level}`,
        avatar: '/avatars/knight.jpg',
        badgeBorder: 'border-cyan-400 shadow-[0_0_10px_rgba(0,210,255,0.5)]',
        buttonClass: 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-400/60 shadow-[0_0_14px_rgba(0,210,255,0.35)]',
        icon: <Bike className="w-3.5 h-3.5 text-cyan-300" />
      };
    }
    if (isMerchant) {
      return {
        name: currentUserSession.name,
        title: `โปรไฟล์ร้านค้าพันธมิตร: ${currentUserSession.name} (Lv.${currentUserSession.level})`,
        roleLabel: `ร้านค้า Lv.${currentUserSession.level}`,
        avatar: '/avatars/merchant.jpg',
        badgeBorder: 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
        buttonClass: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
        icon: <Store className="w-3.5 h-3.5 text-amber-400" />
      };
    }
    if (isPartner) {
      return {
        name: currentUserSession.name,
        title: `โปรไฟล์พาร์ทเนอร์องค์กร & โรงพยาบาล: ${currentUserSession.name} (Lv.${currentUserSession.level})`,
        roleLabel: `พาร์ทเนอร์ Lv.${currentUserSession.level}`,
        avatar: '/avatars/partner.jpg',
        badgeBorder: 'border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]',
        buttonClass: 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border-pink-500/60 shadow-[0_0_12px_rgba(236,72,153,0.3)]',
        icon: <Building2 className="w-3.5 h-3.5 text-pink-400" />
      };
    }
    // Citizen Passenger
    return {
      name: currentUserSession.name,
      title: `โปรไฟล์พลเมืองผู้โดยสาร: ${currentUserSession.name} (Lv.${currentUserSession.level})`,
      roleLabel: `พลเมือง Lv.${currentUserSession.level}`,
      avatar: '/avatars/citizen.jpg',
      badgeBorder: 'border-amber-400/60 shadow-[0_0_10px_rgba(255,215,0,0.25)]',
      buttonClass: 'bg-amber-500/15 hover:bg-amber-500/25 text-[#FFD700] border-[#FFD700]/40 shadow-[0_0_12px_rgba(255,215,0,0.2)]',
      icon: <User className="w-3.5 h-3.5 text-[#FFD700]" />
    };
  })();

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNfcQuickTap = () => {
    if (audioEnabled) {
      playNfcSyncSound();
    }
    setNfcSynced(true);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.1, x: 0.85 },
      colors: ['#00D2FF', '#FFD700', '#FFFFFF']
    });
    setTimeout(() => setNfcSynced(false), 3000);
  };

  const appModes: { id: AppMode; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'register', label: 'ลงทะเบียน 4 บทบาท', icon: <UserPlus className="w-3.5 h-3.5" />, badge: 'ใหม่' },
    { id: 'passenger', label: 'ผู้โดยสาร', icon: <Smartphone className="w-3.5 h-3.5" />, badge: 'แอปหลัก' },
    { id: 'driver', label: 'อู่อัศวิน', icon: <Bike className="w-3.5 h-3.5" />, badge: 'โรงรถ & แผนที่' },
    { id: 'merchant', label: 'ศูนย์ร้านค้า', icon: <Store className="w-3.5 h-3.5" />, badge: 'รับพัสดุ & ดีล' },
    { id: 'partner', label: 'โปรไฟล์พาร์ทเนอร์', icon: <Building2 className="w-3.5 h-3.5" />, badge: 'โรงแรม/ผับบาร์/บุฟเฟต์' },
    { id: 'market', label: 'WIN Shop & Market', icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />, badge: 'ร้านค้า & สินค้าชุมชน' },
    { id: 'hospital', label: 'ศูนย์โรงพยาบาล', icon: <Building2 className="w-3.5 h-3.5" />, badge: 'หน่วยฉุกเฉิน' },
    { id: 'codex', label: 'คัมภีร์ 7 บท', icon: <BookOpen className="w-3.5 h-3.5" />, badge: 'คัมภีร์หลัก' },
  ];

  const codexChapters: { id: ChapterId; label: string; icon: React.ReactNode; num: string }[] = [
    { id: 'soul', label: '1. จิตวิญญาณ', icon: <Crown className="w-3.5 h-3.5" />, num: '01' },
    { id: 'finance', label: '2. การเงิน $10B', icon: <Coins className="w-3.5 h-3.5" />, num: '02' },
    { id: 'intelligence', label: '3. สมองกล CI Map', icon: <Radio className="w-3.5 h-3.5" />, num: '03' },
    { id: 'armor', label: '4. คัมภีร์ชุดเกราะ', icon: <Shield className="w-3.5 h-3.5" />, num: '04' },
    { id: 'weapons', label: '5. 10 ศาสตราวุธ', icon: <Wrench className="w-3.5 h-3.5" />, num: '05' },
    { id: 'ecosystem', label: '6. ระบบนิเวศ 8 เสา', icon: <Globe2 className="w-3.5 h-3.5" />, num: '06' },
    { id: 'hub_galactic', label: '7. วินฮับ & อวกาศ', icon: <Rocket className="w-3.5 h-3.5" />, num: '07' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#070D1E]/95 backdrop-blur-xl border-b border-[#00D2FF]/25 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
      {/* Top micro telemetry banner */}
      <div className="bg-gradient-to-r from-[#070D1E] via-[#0A1B40] to-[#070D1E] border-b border-cyan-500/20 py-1 px-3 sm:px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/40 shadow-[0_0_10px_rgba(255,215,0,0.2)]">
              <Sparkles className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '6s' }} /> SOVEREIGN OS v4.5
            </span>
            <span className="hidden md:inline text-slate-300 text-[11px]">
              จักรวรรดิ <strong className="text-cyan-300 font-mono">WINRIDER.AI</strong> | ซีอีโอ: <strong className="text-cyan-200">Cosmo-Ko</strong> (🦁) & ที่ปรึกษา: <strong className="text-amber-200">จิตใจ</strong> (🦥)
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] font-mono">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10B981]" />
              <span className="hidden sm:inline">QUANTUM GPS:</span> 100% LOCK (14ms)
            </div>
            <span className="text-slate-400">เวลา กทม.: <strong className="text-cyan-200 font-mono">{currentTime}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div 
            id="brand-logo-btn"
            onClick={() => {
              if (audioEnabled) playTactileBlip(600);
              onSelectMode('passenger');
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] via-[#00D2FF] to-[#0A1B40] p-[1.5px] shadow-[0_0_20px_rgba(0,210,255,0.6)] group-hover:shadow-[0_0_30px_rgba(0,210,255,0.9)] transition-all overflow-hidden flex-shrink-0">
              <img 
                src="/app-logo.png" 
                alt="WINRIDER.AI Official Logo" 
                className="w-full h-full object-cover rounded-[9px]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-wider text-white font-sans">
                  WINRIDER<span className="text-[#00D2FF] drop-shadow-[0_0_10px_rgba(0,210,255,0.8)]">.AI</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hidden sm:inline">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-300 -mt-0.5 tracking-tight font-medium">Next-Gen Sovereign Mobility & City AI OS</p>
            </div>
          </div>

          {/* Role-Locked Navigation on Desktop */}
          {currentUserSession ? (
            <div className="hidden lg:flex items-center gap-3">
              {/* Role Badge and Identification */}
              <div 
                onClick={() => setShowRoleInfoModal(true)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#0B1736] border ${profileInfo.badgeBorder} font-mono cursor-pointer hover:brightness-110 transition-all`}
                title="คลิกเพื่อดูรายละเอียดบทบาทหรือสลับบทบาท"
              >
                <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                  <img 
                    src={profileInfo.avatar}
                    alt={currentUserSession.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isDriver && (
                    <div className="absolute -bottom-0.5 -right-0.5 px-1 py-0.2 bg-black/80 rounded text-[9px]">
                      {isDriverCitizen ? '🦥' : '🛵'}
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-tight">
                      {currentUserSession.name}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      LV.{currentUserSession.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-cyan-300">
                    <Lock className="w-2.5 h-2.5 text-cyan-400" />
                    <span>{currentUserSession.roleTitleTh}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-mono">{currentUserSession.id}</span>
                  </div>
                </div>
              </div>

              {/* Dual-Role Switcher for Drivers (Prominently next to user card) */}
              {isDriver && (
                <div className="flex items-center gap-1.5">
                  {isDriverCitizen ? (
                    <button
                      type="button"
                      id="navbar-switch-to-driver-btn"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        onToggleDriverPersona?.('driver');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/25 to-blue-600/25 hover:from-cyan-500/35 hover:to-blue-600/35 text-cyan-300 border border-cyan-400/60 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,210,255,0.3)] active:scale-95 transition-all cursor-pointer animate-pulse"
                      title="สลับกลับเป็นพี่วิน พร้อมรับงานและเปิดระบบเรดาร์"
                    >
                      <Bike className="w-3.5 h-3.5 text-cyan-400" />
                      <span>สลับกลับเป็นพี่วิน 🛵</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="navbar-switch-to-citizen-btn"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        onToggleDriverPersona?.('customer');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-400/50 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)] active:scale-95 transition-all cursor-pointer"
                      title="วันไหนไม่อยากวิ่งงาน พี่วินสามารถเลือกเป็นบทบาทพลเมืองได้ โดยเลเวลและข้อมูลเท่ากัน"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>🦥 วันนี้พักงาน: สลับเป็นพลเมือง</span>
                    </button>
                  )}
                </div>
              )}

              {/* Role-allowed Navigation links */}
              {(currentUserSession.role === 'customer' || isDriverCitizen) && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(700);
                      onSelectMode('passenger');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeMode === 'passenger'
                        ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>เรียกรถ / สั่งของ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(700);
                      onSelectMode('market');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeMode === 'market'
                        ? 'text-pink-300 bg-pink-500/20 border border-pink-400/40 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>WIN Street Market</span>
                  </button>
                </div>
              )}

              {currentUserSession.role === 'driver' && !isDriverCitizen && (
                <div className="flex items-center gap-1">
                  <div className="px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-400/40 flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5" />
                    <span>อู่อัศวิน 3D เรดาร์ & แผนที่</span>
                  </div>
                </div>
              )}

              {currentUserSession.role === 'merchant' && (
                <div className="flex items-center gap-1">
                  <div className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-400/40 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    <span>ศูนย์ร้านค้า & รับออเดอร์</span>
                  </div>
                </div>
              )}

              {currentUserSession.role === 'partner' && (
                <div className="flex items-center gap-1">
                  <div className="px-3 py-1.5 rounded-xl text-xs font-bold text-pink-300 bg-pink-500/15 border border-pink-400/40 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>ศูนย์พาร์ทเนอร์ & โรงพยาบาล</span>
                  </div>
                </div>
              )}

              {/* Sign Out Button */}
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    if (window.confirm(`ต้องการออกจากระบบบัญชี "${currentUserSession.name}" ใช่หรือไม่?`)) {
                      onSignOut();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(244,63,94,0.15)] active:scale-95 cursor-pointer"
                  title="ออกจากระบบ เพื่อสลับบัญชีหรือบทบาท"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>ออกจากระบบ</span>
                </button>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>โหมดความปลอดภัย: กรุณาลงทะเบียนหรือเข้าสู่ระบบ</span>
            </div>
          )}

          {/* Action Buttons: Voice Command, Notification, Profile (Side-by-side) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 1. ไอคอนสั่งการด้วยเสียงของลูกค้าเพื่อใช้งานแอป (Customer Voice Command) */}
            <button
              id="navbar-voice-command-btn"
              onClick={() => {
                if (audioEnabled) playTactileBlip(1200);
                onOpenCustomerVoice();
              }}
              className="relative p-2 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 text-[#00D2FF] border border-[#00D2FF]/40 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,210,255,0.3)] active:scale-95 flex items-center justify-center group"
              title="สั่งการด้วยเสียงลูกค้าเพื่อใช้งานแอป (Customer Voice AI)"
            >
              <AudioWaveform className="w-4 h-4 animate-pulse text-[#00D2FF] group-hover:scale-110 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00D2FF]" />
            </button>

            {/* 2. ไอคอนแจ้งเตือน (Notifications) */}
            <button
              id="navbar-notification-btn"
              onClick={() => {
                if (audioEnabled) playTactileBlip(1000);
                alert("🔔 การแจ้งเตือน: อัศวิน กิตติ อินทะสร้อย (Level 100 Sovereign) ประจำสถานีใกล้คุณ, มีโปรโมชั่นคอนเสิร์ตลด 20%");
              }}
              className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer active:scale-95"
              title="การแจ้งเตือน"
            >
              <Bell className="w-4 h-4 text-[#00D2FF]" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-[9px] text-white font-bold flex items-center justify-center">
                3
              </span>
            </button>

            {/* 3. ไอคอนโปรไฟล์ตามแต่ละบทบาทที่เลือก (Profile icon matches active role/persona) */}
            <button
              id="navbar-profile-btn"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                if (onOpenProfile) {
                  onOpenProfile();
                } else {
                  onSelectMode(isDriverCitizen || currentUserSession?.role === 'customer' ? 'passenger' : 'driver');
                }
              }}
              className={`relative p-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${profileInfo.buttonClass}`}
              title={profileInfo.title}
            >
              <div className={`w-5 h-5 rounded-full overflow-hidden border ${profileInfo.badgeBorder} flex-shrink-0`}>
                <img 
                  src={profileInfo.avatar}
                  alt={profileInfo.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {profileInfo.icon}
              <span className="hidden xl:inline text-[11px] font-mono font-bold whitespace-nowrap">
                {profileInfo.roleLabel}
              </span>
            </button>

            {/* Mobile Sign Out Button */}
            {currentUserSession && onSignOut && (
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  if (window.confirm(`ต้องการออกจากระบบบัญชี "${currentUserSession.name}" ใช่หรือไม่?`)) {
                    onSignOut();
                  }
                }}
                className="lg:hidden p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition-all cursor-pointer active:scale-95"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
              </button>
            )}

            {/* No-Code Webhook Bridge Button */}
            {onOpenWebhookModal && (
              <button
                id="navbar-webhook-btn"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(900);
                  onOpenWebhookModal();
                }}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-600/15 hover:from-cyan-500/25 hover:to-blue-600/25 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(0,210,255,0.2)] active:scale-95"
                title="เชื่อมต่อ Low-Code Webhook (Google Sheets, Make.com, Zapier, LINE OA)"
              >
                <Zap className="w-3.5 h-3.5 text-[#00D2FF]" />
                <span>Webhook</span>
              </button>
            )}

            {/* Real GPS Satellite Map Launcher */}
            {onOpenGpsModal && (
              <button
                type="button"
                id="gps-map-btn"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(950);
                  onOpenGpsModal();
                }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-mono font-semibold transition-all active:scale-95"
                title="เปิดแผนที่พิกัดดาวเทียม GPS จริง & นำทาง Google Maps"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>GPS จริง</span>
              </button>
            )}

            {/* Web Push & LINE Notify Launcher */}
            {onOpenNotificationModal && (
              <button
                type="button"
                id="push-notif-btn"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(900);
                  onOpenNotificationModal();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-semibold transition-all active:scale-95"
                title="ตั้งค่าการแจ้งเตือน Web Push & LINE Notify"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">แจ้งเตือน</span>
              </button>
            )}

            {/* PWA Install Button */}
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>

            {/* Audio SFX Toggle */}
            <button
              id="audio-toggle-btn"
              onClick={() => {
                if (!audioEnabled) playTactileBlip(800);
                onToggleAudio();
              }}
              title={audioEnabled ? 'ปิดเอฟเฟกต์เสียง' : 'เปิดเอฟเฟกต์เสียงยุทธวิธี'}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-[#00D2FF]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-bar for Codex Chapters if Codex Mode is Active */}
      {activeMode === 'codex' && (
        <div className="bg-[#050B1A] border-t border-cyan-500/20 px-4 py-2 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase mr-2 flex-shrink-0">
              บทคัมภีร์ยุทธศาสตร์:
            </span>
            <div className="flex items-center gap-1 flex-nowrap">
              {codexChapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    onSelectChapter(ch.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeChapter === ch.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {ch.icon}
                  <span>{ch.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Dual-Role Status Sub-bar for Drivers (Works seamlessly on Mobile & Desktop) */}
      {currentUserSession && isDriver && (
        <div className="bg-gradient-to-r from-[#061224] via-[#091D3E] to-[#061224] border-t border-cyan-500/25 px-3 sm:px-6 py-1.5 text-xs font-mono">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {isDriverCitizen ? (
                <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>โหมดพลเมือง (พี่วินพักงาน) • เลเวล {currentUserSession.level} คงเดิม</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <Bike className="w-3.5 h-3.5 text-cyan-400" />
                  <span>โหมดพี่วินอัศวิน (พร้อมรับงาน) • เลเวล {currentUserSession.level}</span>
                </span>
              )}
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="hidden sm:inline text-slate-400 text-[11px]">
                {isDriverCitizen ? 'วันไหนไม่อยากวิ่งงาน พี่วินสามารถเลือกเป็นบทบาทพลเมืองได้' : 'เปิดระบบรับงาน เรดาร์ และนำทาง'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                onToggleDriverPersona?.(isDriverCitizen ? 'driver' : 'customer');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                isDriverCitizen
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 shadow-[0_0_12px_rgba(0,210,255,0.25)]'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              }`}
            >
              {isDriverCitizen ? (
                <>
                  <Bike className="w-3.5 h-3.5 text-cyan-400" />
                  <span>สลับกลับเป็นพี่วิน 🛵</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🦥 วันนี้พักงาน: สลับเป็นพลเมือง</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Role Info & Dual-Role Switcher Modal */}
      {showRoleInfoModal && currentUserSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0A1633] border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_40px_rgba(0,210,255,0.3)] relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 ${profileInfo.badgeBorder} shadow-lg relative flex-shrink-0`}>
                  <img 
                    src={profileInfo.avatar}
                    alt={currentUserSession.name}
                    className="w-full h-full object-cover"
                  />
                  {isDriver && (
                    <div className="absolute bottom-0 right-0 px-1.5 py-0.5 bg-black/90 rounded-tl text-[10px]">
                      {isDriverCitizen ? '🦥' : '🛵'}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{currentUserSession.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30">
                      LV.{currentUserSession.level} (XP เท่ากันทุกบทบาท)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    ID: {currentUserSession.id} • {currentUserSession.phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRoleInfoModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">บทบาทปัจจุบัน:</span>
                  <span className="font-bold text-cyan-300 flex items-center gap-1">
                    {profileInfo.icon}
                    <span>{currentUserSession.roleTitleTh}</span>
                  </span>
                </div>
              </div>

              {/* Driver Dual-Role Section */}
              {isDriver ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0D2447] to-[#08152B] border border-cyan-400/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>ระบบสองบทบาท (Dual-Persona for Driver)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    วันไหนพี่วินไม่อยากวิ่งงาน สามารถเลือกเป็นบทบาทพลเมืองได้ โดยที่เลเวลและข้อมูลทั้งหมดจะเท่ากันทั้งสองบทบาท
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        onToggleDriverPersona?.('driver');
                        setShowRoleInfoModal(false);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        !isDriverCitizen
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Bike className="w-4 h-4" />
                      <span>โหมดพี่วิน (รับงาน)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        onToggleDriverPersona?.('customer');
                        setShowRoleInfoModal(false);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        isDriverCitizen
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>โหมดพลเมือง (พักงาน)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200/90 leading-relaxed font-mono">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>ระบบรักษาความปลอดภัยบทบาท (Role Lock)</span>
                  </div>
                  พลเมืองไม่สามารถเปลี่ยนบทบาทเป็นพี่วินได้โดยตรง เนื่องจากต้องผ่านการตรวจสอบประวัติและมีใบอนุญาตขับขี่สาธารณะ
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleInfoModal(false);
                    onOpenProfile?.();
                  }}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,210,255,0.4)] cursor-pointer"
                >
                  ดูโปรไฟล์และค่าสถานะเต็ม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
