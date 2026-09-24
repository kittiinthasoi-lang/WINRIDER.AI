import React, { useState, useEffect } from 'react';
import { ChapterId, AppMode } from '../types';
import { playTactileBlip, playNfcSyncSound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Crown, 
  Coins, 
  Radio, 
  Shield, 
  Globe2, 
  Rocket, 
  Volume2, 
  VolumeX, 
  Bot,
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
  Zap,
  Compass,
  LogOut,
  Lock,
  CheckCircle2,
  Box,
  SlidersHorizontal
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { UserSession, isDriverAccount, isDriverInCitizenMode } from '../utils/userSession';
import { useAuth } from '../context/AuthContext';

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
  onSelectOwnerPersona?: (persona: 'customer' | 'driver' | 'merchant' | 'partner') => void;
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
  onSelectOwnerPersona,
}) => {
  const [nfcSynced, setNfcSynced] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showRoleInfoModal, setShowRoleInfoModal] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'customer' | 'knight'>('customer');
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  const { firebaseUser, userData } = useAuth();

  const isDriver = isDriverAccount(currentUserSession || null);
  const isDriverCitizen = isDriverInCitizenMode(currentUserSession || null);
  const isPureCustomer = currentUserSession?.role === 'customer' && !isDriver;
  const isMerchant = currentUserSession?.role === 'merchant';
  const isPartner = currentUserSession?.role === 'partner';
  const isAdminSession = userData?.isAdmin === true;

  // Role details for profile avatar, icon, and label
  const profileInfo = (() => {
    if (isAdminSession) {
      return {
        name: currentUserSession?.name || userData?.displayName || 'Super Admin',
        title: `ผู้ดูแลระบบ (${userData?.adminLevel || 'support'}): ${firebaseUser?.email || currentUserSession?.email || 'Admin'}`,
        roleLabel: userData?.adminLevel === 'super' ? 'Super Admin' : userData?.adminLevel === 'reviewer' ? 'Reviewer Admin' : 'Support Admin',
        avatar: '/avatars/partner.jpg',
        badgeBorder: 'border-amber-400 shadow-[0_0_12px_rgba(255,201,60,0.6)]',
        buttonClass: 'bg-gradient-to-r from-amber-500/25 to-yellow-500/25 hover:from-amber-500/35 hover:to-yellow-500/35 text-amber-300 border-amber-400/70 shadow-[0_0_15px_rgba(255,201,60,0.35)]',
        icon: <Crown className="w-3.5 h-3.5 text-amber-300" />
      };
    }
    if (!currentUserSession) {
      return {
        name: firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'พลเมือง',
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
    { id: 'market', label: 'WIN Shop • WIN Street Market', icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />, badge: 'ร้านค้า • พาร์ทเนอร์ • ตลาดประชาชน' },
    { id: 'hospital', label: 'ศูนย์โรงพยาบาล', icon: <Building2 className="w-3.5 h-3.5" />, badge: 'หน่วยฉุกเฉิน' },
    { id: 'codex', label: 'คัมภีร์ 7 บท', icon: <BookOpen className="w-3.5 h-3.5" />, badge: 'คัมภีร์หลัก' },
  ];

  const codexChapters: { id: ChapterId; label: string; icon: React.ReactNode; num: string }[] = [
    { id: 'soul', label: '1. จิตวิญญาณ', icon: <Crown className="w-3.5 h-3.5" />, num: '01' },
    { id: 'finance', label: '2. การเงิน $10B', icon: <Coins className="w-3.5 h-3.5" />, num: '02' },
    { id: 'intelligence', label: '3. สมองกล CI Map', icon: <Radio className="w-3.5 h-3.5" />, num: '03' },
    { id: 'armor', label: '4. คัมภีร์ชุดเกราะ', icon: <Shield className="w-3.5 h-3.5" />, num: '04' },
    { id: 'weapons', label: '5. 10 ศาสตราวุธ', icon: <Flame className="w-3.5 h-3.5" />, num: '05' },
    { id: 'ecosystem', label: '6. ระบบนิเวศ 8 เสา', icon: <Globe2 className="w-3.5 h-3.5" />, num: '06' },
    { id: 'hub_galactic', label: '7. วินฮับ & อวกาศ', icon: <Rocket className="w-3.5 h-3.5" />, num: '07' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#060D1E]/95 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.7)] w-full max-w-full overflow-x-clip select-none">
      {/* Top micro telemetry & Sovereign status bar */}
      <div className="bg-[#040816]/90 border-b border-white/[0.06] py-1 px-3 sm:px-4 text-xs select-none overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-slate-300 gap-2 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/40 shadow-[0_0_10px_rgba(255,215,0,0.2)] flex-shrink-0">
              <Sparkles className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '6s' }} /> SOVEREIGN OS v4.5
            </span>

            {isAdminSession ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-mono text-[11px] truncate">
                <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span className="font-bold">ADMIN:</span>
                <span className="text-white/90 truncate">{currentUserSession?.email || 'kittiinthasoi@gmail.com'}</span>
              </span>
            ) : (
              <span className="hidden md:inline text-slate-300 text-[11px] truncate">
                จักรวรรดิ <strong className="text-cyan-300 font-mono">WINRIDER.AI</strong> | ซีอีโอ: <strong className="text-cyan-200">Cosmo-Ko</strong> (🦁) & ที่ปรึกษา: <strong className="text-amber-200">จิตใจ</strong> (🦥)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10B981]" />
              <span className="hidden md:inline">QUANTUM GPS:</span> 100% LOCK
            </div>
            <span className="text-slate-400">
              กทม.: <strong className="text-cyan-200 font-mono">{currentTime}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 w-full">
        <div className="flex items-center justify-between h-15 sm:h-16 gap-2 sm:gap-4">
          {/* Brand Logo & Sovereign Emblem */}
          <div 
            id="brand-logo-btn"
            onClick={() => {
              if (audioEnabled) playTactileBlip(600);
              onSelectMode('passenger');
            }}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group select-none flex-shrink-0"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#FFD700] via-[#00D2FF] to-[#0A1B40] p-[1.5px] shadow-[0_0_15px_rgba(0,210,255,0.4)] group-hover:shadow-[0_0_25px_rgba(0,210,255,0.7)] transition-all overflow-hidden flex-shrink-0">
              <img 
                src="/app-logo.png" 
                alt="WINRIDER.AI Official Logo" 
                className="w-full h-full object-cover rounded-[9px]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-wider text-white font-sans whitespace-nowrap">
                  WINRIDER<span className="text-[#00D2FF] drop-shadow-[0_0_8px_rgba(0,210,255,0.7)]">.AI</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 tracking-tight font-medium hidden xl:block truncate">
                Next-Gen Sovereign Mobility & City AI OS
              </p>
            </div>
          </div>

          {/* Center: Desktop Navigation & Persona Status Capsule */}
          {currentUserSession ? (
            <div className="hidden lg:flex items-center gap-1.5 flex-shrink min-w-0 overflow-hidden">
              {/* Dual-Persona Switcher Capsule for Drivers */}
              {isDriver && (
                <div className="flex items-center flex-shrink-0">
                  {isDriverCitizen ? (
                    <button
                      type="button"
                      id="navbar-switch-to-driver-btn"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        onToggleDriverPersona?.('driver');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-400/50 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,210,255,0.25)] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
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
                      className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                      title="วันไหนไม่อยากวิ่งงาน พี่วินสามารถเลือกเป็นบทบาทพลเมืองได้ โดยเลเวลและข้อมูลเท่ากัน"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>🦥 วันนี้พักงาน: สลับเป็นพลเมือง</span>
                    </button>
                  )}
                </div>
              )}

              {/* Mode Links */}
              {(currentUserSession.role === 'customer' || isDriverCitizen) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(700);
                      onSelectMode('passenger');
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeMode === 'passenger'
                        ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_10px_rgba(0,210,255,0.25)]'
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
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeMode === 'market'
                        ? 'text-pink-300 bg-pink-500/20 border border-pink-400/40 shadow-[0_0_10px_rgba(236,72,153,0.25)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>WIN Market</span>
                  </button>
                </div>
              )}

              {currentUserSession.role === 'driver' && !isDriverCitizen && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-400/40 flex items-center gap-1.5 whitespace-nowrap">
                    <Bike className="w-3.5 h-3.5" />
                    <span>อู่อัศวิน & เรดาร์</span>
                  </div>
                </div>
              )}

              {currentUserSession.role === 'merchant' && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-400/40 flex items-center gap-1.5 whitespace-nowrap">
                    <Store className="w-3.5 h-3.5" />
                    <span>ศูนย์ร้านค้า</span>
                  </div>
                </div>
              )}

              {currentUserSession.role === 'partner' && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-pink-300 bg-pink-500/15 border border-pink-400/40 flex items-center gap-1.5 whitespace-nowrap">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>ศูนย์พาร์ทเนอร์</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Right Action Suite (Strictly Contained, Zero Overflow) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* 1. Voice AI Command Center */}
            <div className="flex items-center bg-[#081126]/90 rounded-xl border border-cyan-500/30 p-0.5 shadow-[0_0_10px_rgba(0,210,255,0.15)] flex-shrink-0">
              <button
                id="navbar-voice-command-btn"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1200);
                  if (voiceTarget === 'customer') {
                    onOpenCustomerVoice();
                  } else {
                    if (onOpenWinBuddy) onOpenWinBuddy();
                    else onOpenCustomerVoice();
                  }
                }}
                className={`p-1.5 sm:px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center group active:scale-95 ${
                  voiceTarget === 'customer'
                    ? 'text-[#00D2FF] hover:bg-cyan-500/20'
                    : 'text-amber-300 hover:bg-amber-500/20'
                }`}
                title={
                  voiceTarget === 'customer'
                    ? "สั่งการด้วยเสียงลูกค้า (Customer Voice AI)"
                    : "สั่งการด้วยเสียงพี่วิน/WinBuddy"
                }
              >
                <Bot className={`w-4 h-4 animate-pulse group-hover:scale-110 transition-transform ${
                  voiceTarget === 'customer' ? 'text-[#00D2FF]' : 'text-amber-300'
                }`} />
              </button>

              <button
                id="navbar-voice-switcher-btn"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  const next = voiceTarget === 'customer' ? 'knight' : 'customer';
                  setVoiceTarget(next);
                }}
                className={`px-1.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                  voiceTarget === 'customer'
                    ? 'bg-cyan-500/20 text-[#00D2FF] border-cyan-500/40 hover:bg-cyan-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
                title="คลิกเพื่อสลับระหว่างเสียงลูกค้ากับเสียงพี่วิน"
              >
                {voiceTarget === 'customer' ? '👤 ลูกค้า' : '🏍️ วิน'}
              </button>
            </div>

            {/* Profile & Role Capsule Button */}
            <button
              id="navbar-profile-btn"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                if (onOpenProfile) {
                  onOpenProfile();
                } else {
                  setShowRoleInfoModal(true);
                }
              }}
              className={`p-1 sm:px-2 sm:py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 flex-shrink-0 ${profileInfo.buttonClass}`}
              title={profileInfo.title}
            >
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden border ${profileInfo.badgeBorder} flex-shrink-0 relative`}>
                <img 
                  src={profileInfo.avatar}
                  alt={profileInfo.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="hidden sm:inline text-xs font-bold text-white max-w-[75px] truncate">
                {profileInfo.name}
              </span>
              <span className="hidden md:inline text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-cyan-300 border border-white/10">
                Lv.{currentUserSession?.level || 1}
              </span>
            </button>

            {/* 4. Luxury Secondary Tools Dropdown (Replaces 4 wide individual buttons) */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                id="navbar-tools-menu-btn"
                onClick={() => setShowToolsMenu(prev => !prev)}
                className={`p-2 rounded-xl transition-all cursor-pointer border flex items-center justify-center flex-shrink-0 active:scale-95 ${
                  showToolsMenu
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
                title="เครื่องมือและเมนูเพิ่มเติม (Tools, GPS, Webhook, PWA, Logout)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Tools Dropdown Menu */}
              {showToolsMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#09152C]/95 backdrop-blur-xl border border-cyan-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.8)] py-2 z-50 text-xs animate-fade-in font-sans">
                  {/* Admin Console (Only for Admin) */}
                  {isAdminSession && (
                    <button
                      type="button"
                      id="tools-admin-console-btn"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(1000);
                        setShowToolsMenu(false);
                        onSelectMode('admin');
                      }}
                      className="w-full px-3.5 py-2.5 text-left bg-amber-500/15 hover:bg-amber-500/25 flex items-center gap-2.5 text-amber-300 transition-colors border-b border-amber-500/30"
                    >
                      <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>หน้าจอแอดมิน (Admin Console)</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono">ADMIN</span>
                        </div>
                        <div className="text-[10px] text-amber-300/70">คุมระบบหลังบ้าน & ข้อมูลจริง Firebase</div>
                      </div>
                    </button>
                  )}

                  {/* Webhook */}
                  {onOpenWebhookModal && (
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(900);
                        setShowToolsMenu(false);
                        onOpenWebhookModal();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-cyan-500/15 flex items-center gap-2.5 text-slate-200 hover:text-cyan-300 transition-colors"
                    >
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-bold">เชื่อมต่อ Webhook</div>
                        <div className="text-[10px] text-slate-400">Google Sheets / LINE OA / Zapier</div>
                      </div>
                    </button>
                  )}

                  {/* GPS Satellite Map */}
                  {onOpenGpsModal && (
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(950);
                        setShowToolsMenu(false);
                        onOpenGpsModal();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-cyan-500/15 flex items-center gap-2.5 text-slate-200 hover:text-cyan-300 transition-colors"
                    >
                      <Compass className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-bold">แผนที่ดาวเทียม GPS จริง</div>
                        <div className="text-[10px] text-slate-400">นำทาง Google Maps Real-time</div>
                      </div>
                    </button>
                  )}

                  {/* PWA Install */}
                  <div className="px-3.5 py-1.5 border-t border-white/10">
                    <PWAInstallButton />
                  </div>

                  {/* Sign Out */}
                  {currentUserSession && onSignOut && (
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setShowToolsMenu(false);
                        if (window.confirm(`ต้องการออกจากระบบบัญชี "${currentUserSession.name}" ใช่หรือไม่?`)) {
                          onSignOut();
                        }
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-rose-500/20 flex items-center gap-2.5 text-rose-300 transition-colors border-t border-white/10 mt-1"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span className="font-bold">ออกจากระบบ</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 5. Sound SFX Toggle */}
            <button
              id="audio-toggle-btn"
              onClick={() => {
                if (!audioEnabled) playTactileBlip(800);
                onToggleAudio();
              }}
              title={audioEnabled ? 'ปิดเอฟเฟกต์เสียง' : 'เปิดเอฟเฟกต์เสียงยุทธวิธี'}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors flex-shrink-0"
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#00D2FF]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
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

              {/* Owner account: four operational personas plus Super Admin, one Firebase UID */}
              {isAdminSession ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 to-[#08152B] border border-amber-400/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>บัญชีเจ้าของระบบ • เลือกดูทั้ง 5 บทบาท</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    ลูกค้า พี่วิน ร้านค้า พาร์ทเนอร์ และ Super Admin ใช้บัญชีและ Firebase UID เดียวกัน ไม่มีการสร้างผู้ใช้จำลองเพิ่ม
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { onSelectOwnerPersona?.('customer'); setShowRoleInfoModal(false); }} className="p-2.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-500/25">
                      <Smartphone className="w-4 h-4" /> ผู้โดยสาร
                    </button>
                    <button type="button" onClick={() => { onSelectOwnerPersona?.('driver'); setShowRoleInfoModal(false); }} className="p-2.5 rounded-xl border border-blue-400/40 bg-blue-500/15 text-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-500/25">
                      <Bike className="w-4 h-4" /> พี่วิน
                    </button>
                    <button type="button" onClick={() => { onSelectOwnerPersona?.('merchant'); setShowRoleInfoModal(false); }} className="p-2.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-500/25">
                      <Store className="w-4 h-4" /> ร้านค้า
                    </button>
                    <button type="button" onClick={() => { onSelectOwnerPersona?.('partner'); setShowRoleInfoModal(false); }} className="p-2.5 rounded-xl border border-pink-400/40 bg-pink-500/15 text-pink-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-pink-500/25">
                      <Building2 className="w-4 h-4" /> พาร์ทเนอร์
                    </button>
                    <button type="button" onClick={() => { onSelectMode('admin'); setShowRoleInfoModal(false); }} className="col-span-2 p-2.5 rounded-xl border border-amber-400/50 bg-amber-500/20 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-500/30">
                      <Crown className="w-4 h-4" /> Super Admin
                    </button>
                  </div>
                </div>
              ) : isDriver ? (
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

              {/* สำหรับผู้ดูแลระบบ: ปุ่มเข้าสู่หน้าจอคุมระบบหลังบ้านแอป */}
              {isAdminSession && (
                <div className="pt-3 border-t border-amber-500/30 space-y-1.5">
                  <button
                    type="button"
                    id="profile-open-admin-btn"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(1000);
                      setShowRoleInfoModal(false);
                      onSelectMode('admin');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-[0_0_20px_rgba(255,201,60,0.5)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Crown className="w-4 h-4 text-slate-950 flex-shrink-0" />
                    <span>👑 เปิดหน้าจอคุมระบบหลังบ้าน (ADMIN CONSOLE)</span>
                  </button>
                  <p className="text-[10px] text-center text-amber-300/80 font-mono">
                    สิทธิ์ Super Admin ({firebaseUser?.email || currentUserSession?.email || 'kittiinthasoi@gmail.com'})
                  </p>
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
