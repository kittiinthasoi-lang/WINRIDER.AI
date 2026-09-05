import React, { useState } from 'react';
import { playTactileBlip } from '../utils/audio';
import { AppMode, ChapterId } from '../types';
import { 
  Compass, 
  Bike, 
  Activity, 
  ShoppingBag,
  Grid,
  Store,
  Building2,
  BookOpen,
  UserPlus,
  Sparkles,
  X,
  ChevronRight,
  Shield,
  Coins,
  Crown,
  Radio,
  Wrench,
  Globe2,
  Rocket,
  Bot,
  AudioWaveform,
  LogOut,
  Lock,
  User
} from 'lucide-react';
import { UserSession } from '../utils/userSession';

export type MainTabType = 'home' | 'dreamRide' | 'ride' | 'shop' | 'modes';

interface MobileBottomNavBarProps {
  activeMode: AppMode;
  activePassengerTab: 'home' | 'dreamRide' | 'petCare' | 'ride' | 'shop' | 'profile';
  onSelectPassengerTab: (tab: 'home' | 'dreamRide' | 'ride' | 'shop' | 'profile') => void;
  onSelectMode: (mode: AppMode) => void;
  audioEnabled: boolean;
  onOpenCustomerVoice?: () => void;
  onOpenWinBuddy: () => void;
  activeChapter: ChapterId;
  onSelectChapter: (id: ChapterId) => void;
  currentUserSession?: UserSession | null;
  onSignOut?: () => void;
}

export const MobileBottomNavBar: React.FC<MobileBottomNavBarProps> = ({
  activeMode,
  activePassengerTab,
  onSelectPassengerTab,
  onSelectMode,
  audioEnabled,
  onOpenCustomerVoice,
  onOpenWinBuddy,
  activeChapter,
  onSelectChapter,
  currentUserSession,
  onSignOut,
}) => {
  const [isModesDrawerOpen, setIsModesDrawerOpen] = useState(false);

  // If user is not logged in, do not render bottom navigation
  if (!currentUserSession) {
    return null;
  }

  // Determine current active tab
  const getIsTabActive = (tabId: string) => {
    if (tabId === 'home') {
      return activeMode === 'passenger' && activePassengerTab === 'home';
    }
    if (tabId === 'dreamRide') {
      return (activeMode === 'passenger' && activePassengerTab === 'dreamRide') || activeMode === 'driver';
    }
    if (tabId === 'ride') {
      return activeMode === 'passenger' && activePassengerTab === 'ride';
    }
    if (tabId === 'shop') {
      return (activeMode === 'passenger' && activePassengerTab === 'shop') || activeMode === 'market';
    }
    if (tabId === 'modes') {
      return isModesDrawerOpen || ['merchant', 'partner', 'hospital', 'register', 'codex'].includes(activeMode) || (activeMode === 'passenger' && activePassengerTab === 'profile');
    }
    return false;
  };

  const mainTabs = [
    { 
      id: 'home', 
      label: 'หน้าหลัก', 
      icon: <Compass className="w-5 h-5" />,
      onClick: () => {
        setIsModesDrawerOpen(false);
        onSelectMode('passenger');
        onSelectPassengerTab('home');
      }
    },
    { 
      id: 'dreamRide', 
      label: 'รถในฝัน', 
      icon: <Bike className="w-5 h-5" />,
      badge: 'HOT',
      onClick: () => {
        setIsModesDrawerOpen(false);
        onSelectMode('passenger');
        onSelectPassengerTab('dreamRide');
      }
    },
    { 
      id: 'ride', 
      label: 'รอพี่วิน (3D)', 
      icon: <Activity className="w-5 h-5" />,
      onClick: () => {
        setIsModesDrawerOpen(false);
        onSelectMode('passenger');
        onSelectPassengerTab('ride');
      }
    },
    { 
      id: 'shop', 
      label: 'WIN SHOP', 
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: 'DEALS',
      onClick: () => {
        setIsModesDrawerOpen(false);
        onSelectMode('passenger');
        onSelectPassengerTab('shop');
      }
    },
    { 
      id: 'modes', 
      label: 'โหมด/หน้าจอ', 
      icon: <Grid className="w-5 h-5" />,
      badge: isModesDrawerOpen ? undefined : 'เมนู',
      onClick: () => {
        setIsModesDrawerOpen(!isModesDrawerOpen);
      }
    },
  ];

  const appModesList: { id: AppMode; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    { 
      id: 'register', 
      label: 'ลงทะเบียน 4 บทบาท', 
      desc: 'อัศวิน วินมอเตอร์ไซค์, ผู้โดยสาร, ร้านค้า, พาร์ทเนอร์', 
      icon: <UserPlus className="w-5 h-5" />,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300'
    },
    { 
      id: 'driver', 
      label: 'อู่อัศวิน (คนขับ)', 
      desc: 'ระบบสตรีมงาน, มิเตอร์อัจฉริยะ, แท่นแท็กซี่, แผนที่ลาดตระเวน', 
      icon: <Bike className="w-5 h-5" />,
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300'
    },
    { 
      id: 'merchant', 
      label: 'ศูนย์ร้านค้า & ภัตตาคาร', 
      desc: 'POS รับคำสั่งซื้อ, คลังสต็อก, โลจิสติกส์กระจายของ', 
      icon: <Store className="w-5 h-5" />,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300'
    },
    { 
      id: 'partner', 
      label: 'โปรไฟล์พาร์ทเนอร์สถาบัน', 
      desc: 'โรงแรม, ไนต์ไลฟ์, คอนโด, สหภาพแรงงาน, บุฟเฟต์', 
      icon: <Building2 className="w-5 h-5" />,
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/40 text-purple-300'
    },
    { 
      id: 'market', 
      label: 'ตลาด WIN Street Market', 
      desc: 'ศูนย์รวมสินค้าชุมชน มอเตอร์ไซค์มือสอง และของแต่งวิน', 
      icon: <ShoppingBag className="w-5 h-5" />,
      color: 'from-pink-500/20 to-rose-500/10 border-pink-500/40 text-pink-300'
    },
    { 
      id: 'hospital', 
      label: 'ศูนย์พยาบาล & กู้ชีพฉุกเฉิน', 
      desc: 'ระบบ SOS ฉุกเฉิน, สุนัข/แมว Pet Care, ประกันสุขภาพ', 
      icon: <Activity className="w-5 h-5" />,
      color: 'from-red-500/20 to-orange-500/10 border-red-500/40 text-red-300'
    },
    { 
      id: 'codex', 
      label: 'คัมภีร์มหาอาณาจักร 7 บท', 
      desc: 'จิตวิญญาณ, การเงิน $10B, CI Map, เกราะ, อาวุธ, นิเวศ, อวกาศ', 
      icon: <BookOpen className="w-5 h-5" />,
      color: 'from-[#FFD700]/20 to-amber-500/10 border-[#FFD700]/40 text-[#FFD700]'
    },
  ];

  // Role-based allowed modes:
  // 1. Driver & Customer: CANNOT see each other's profiles/screens.
  //    CAN access: Merchant, Partner, Hospital, and Market freely.
  // 2. Merchant & Partner: can ONLY see Merchant, Partner, and Hospital (and Codex).
  const allowedModesForRole = currentUserSession?.role === 'customer'
    ? ['passenger', 'market', 'merchant', 'partner', 'hospital', 'codex']
    : currentUserSession?.role === 'driver'
    ? ['driver', 'market', 'merchant', 'partner', 'hospital', 'codex']
    : currentUserSession?.role === 'merchant'
    ? ['merchant', 'partner', 'hospital', 'codex']
    : ['partner', 'merchant', 'hospital', 'codex'];

  const filteredAppModesList = appModesList.filter(mode => allowedModesForRole.includes(mode.id));

  const codexChapters = [
    { id: 'soul' as ChapterId, label: '01 จิตวิญญาณสลอต & สิงโต', icon: <Crown className="w-3.5 h-3.5" /> },
    { id: 'finance' as ChapterId, label: '02 การเงินอธิปไตย $10B', icon: <Coins className="w-3.5 h-3.5" /> },
    { id: 'intelligence' as ChapterId, label: '03 สมองกล CI Map', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'armor' as ChapterId, label: '04 คัมภีร์ชุดเกราะ', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'weapons' as ChapterId, label: '05 10 ศาสตราวุธวิน', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'ecosystem' as ChapterId, label: '06 ระบบนิเวศ 8 เสาหลัก', icon: <Globe2 className="w-3.5 h-3.5" /> },
    { id: 'hub_galactic' as ChapterId, label: '07 วินฮับ & การสำรวจอวกาศ', icon: <Rocket className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* Sliding Sheet for Modes & Screens */}
      {isModesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="flex-1" 
            onClick={() => {
              if (audioEnabled) playTactileBlip(500);
              setIsModesDrawerOpen(false);
            }} 
          />
          <div className="bg-[#070D1E] border-t border-[#00D2FF]/40 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-24 shadow-[0_-15px_40px_rgba(0,210,255,0.25)] space-y-6">
            
            {/* Header Drawer */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00D2FF]/20 border border-[#00D2FF]/50 flex items-center justify-center text-[#00D2FF]">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">ศูนย์สลับโหมดและหน้าจอการใช้งาน</h3>
                  <p className="text-xs text-slate-400">เลือกบทบาท หน้าจอ หรือคัมภีร์ยุทธศาสตร์ที่ต้องการเปิด</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(500);
                  setIsModesDrawerOpen(false);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Profile Feature Item */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FFD700]/15 via-amber-500/10 to-transparent border border-[#FFD700]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center text-lg font-bold text-slate-950 shadow-[0_0_10px_#00D2FF]">
                  {currentUserSession.avatarEmoji}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-white text-sm">{currentUserSession.name}</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 text-[9px] font-bold font-mono">
                      LV.{currentUserSession.level}
                    </span>
                  </div>
                  <p className="text-xs text-cyan-300">
                    🔒 {currentUserSession.roleTitleTh} • {currentUserSession.id}
                  </p>
                </div>
              </div>
              {onSignOut && (
                <button
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setIsModesDrawerOpen(false);
                    if (window.confirm(`ต้องการออกจากระบบบัญชี "${currentUserSession.name}" ใช่หรือไม่?`)) {
                      onSignOut();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออก</span>
                </button>
              )}
            </div>

            {/* Voice Assistant Section: Separated for Customer and Knight Driver */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>ระบบสั่งการด้วยเสียง (Voice AI Assistants)</span>
                <span className="text-[10px] text-cyan-400 font-bold">แยก 2 บทบาท</span>
              </div>

              {/* 1. สั่งการด้วยเสียงลูกค้า */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#00D2FF]/20 via-blue-600/10 to-transparent border border-[#00D2FF]/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_10px_#00D2FF]">
                    <AudioWaveform className="w-5 h-5 text-slate-950 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="font-black text-white text-sm">สั่งการด้วยเสียงลูกค้า (Customer Voice AI)</div>
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">ลูกค้า</span>
                    </div>
                    <p className="text-xs text-cyan-300">สั่งเรียกรถ เปิดรถในฝัน ช้อปปิ้ง WIN SHOP ตรวจสอบเครดิต</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(1200);
                    setIsModesDrawerOpen(false);
                    if (onOpenCustomerVoice) onOpenCustomerVoice();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-[#0070F3] text-slate-950 font-black text-xs hover:brightness-110 shadow-[0_0_12px_#00D2FF] cursor-pointer whitespace-nowrap"
                >
                  สั่งงานลูกค้า
                </button>
              </div>

              {/* 2. สั่งการด้วยเสียงของพี่วิน */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FFD700]/20 via-amber-600/10 to-transparent border border-[#FFD700]/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_10px_#FFD700]">
                    <Bot className="w-6 h-6 text-slate-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="font-black text-white text-sm">สั่งการด้วยเสียงของพี่วิน (หุ่นยนต์ AI)</div>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">พี่วิน</span>
                    </div>
                    <p className="text-xs text-amber-300">รับงานอัตโนมัติ คำนวณมิเตอร์ รายงานจราจร และยุทธวิธี</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(1200);
                    setIsModesDrawerOpen(false);
                    onOpenWinBuddy();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 font-black text-xs hover:brightness-110 shadow-[0_0_12px_#FFD700] cursor-pointer whitespace-nowrap"
                >
                  สั่งงานพี่วิน
                </button>
              </div>
            </div>

            {/* Role-Restricted Application Modes List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>หน้าจอที่ได้รับอนุญาต ({currentUserSession.roleTitleTh})</span>
                <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono normal-case">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Role-Locked</span>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {filteredAppModesList.map((modeItem) => {
                  const isCurrent = activeMode === modeItem.id;
                  return (
                    <button
                      key={modeItem.id}
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(isCurrent ? 600 : 900);
                        setIsModesDrawerOpen(false);
                        onSelectMode(modeItem.id);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer bg-gradient-to-r ${modeItem.color} ${
                        isCurrent ? 'ring-2 ring-white shadow-lg' : 'hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
                          {modeItem.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{modeItem.label}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-black">
                                ใช้งานอยู่
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-1">{modeItem.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Codex Chapters Quick Navigation */}
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">บทคัมภีร์ยุทธศาสตร์ 7 บท</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {codexChapters.map((ch) => {
                  const isChActive = activeMode === 'codex' && activeChapter === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setIsModesDrawerOpen(false);
                        onSelectChapter(ch.id);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        isChActive
                          ? 'bg-[#FFD700] text-slate-950 border-[#FFD700] shadow-[0_0_10px_#FFD700]'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {ch.icon}
                      <span className="truncate">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav 
        id="mobile-native-tabbar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#070D1E]/95 backdrop-blur-xl border-t border-[#00D2FF]/25 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] px-2 pt-1 pb-safe"
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          {mainTabs.map((tab) => {
            const isActive = getIsTabActive(tab.id);
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(isActive ? 600 : 900);
                  tab.onClick();
                }}
                className={`relative flex-1 py-2 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer select-none active:scale-90 ${
                  isActive 
                    ? 'text-[#00D2FF]' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Active Neon Aura Bar */}
                {isActive && (
                  <span className="absolute -top-1 w-10 h-1 rounded-full bg-[#00D2FF] shadow-[0_0_10px_#00D2FF]" />
                )}

                <div className="relative">
                  <div className={`transition-transform duration-200 ${isActive ? 'scale-115 drop-shadow-[0_0_10px_rgba(0,210,255,0.8)]' : ''}`}>
                    {tab.icon}
                  </div>
                  {tab.badge && (
                    <span className="absolute -top-1 -right-3.5 px-1 py-0.2 bg-[#FF6B00] text-[8px] font-black text-white rounded-full border border-black animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </div>

                <span className={`text-[10px] tracking-tight truncate max-w-[85px] ${
                  isActive ? 'font-black text-white drop-shadow-[0_0_6px_rgba(0,210,255,0.6)]' : 'font-medium'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
