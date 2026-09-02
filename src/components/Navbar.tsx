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
  Fingerprint,
  Menu,
  X,
  Sparkles,
  Smartphone,
  Bike,
  Store,
  Building2,
  BookOpen,
  UserPlus,
  ShoppingBag,
  Flame
} from 'lucide-react';

interface NavbarProps {
  activeMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  activeChapter: ChapterId;
  onSelectChapter: (id: ChapterId) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenWinBuddy: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeMode,
  onSelectMode,
  activeChapter,
  onSelectChapter,
  audioEnabled,
  onToggleAudio,
  onOpenWinBuddy,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [nfcSynced, setNfcSynced] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

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
    { id: 'register', label: '📝 ลงทะเบียน 4 บทบาท', icon: <UserPlus className="w-3.5 h-3.5" />, badge: 'ใหม่' },
    { id: 'passenger', label: '📱 ผู้โดยสาร', icon: <Smartphone className="w-3.5 h-3.5" />, badge: 'แอปหลัก' },
    { id: 'driver', label: '🏍️ อู่อัศวิน', icon: <Bike className="w-3.5 h-3.5" />, badge: 'โรงรถ & แผนที่' },
    { id: 'merchant', label: '🏬 ศูนย์ร้านค้า', icon: <Store className="w-3.5 h-3.5" />, badge: 'รับพัสดุ & ดีล' },
    { id: 'partner', label: '👑 โปรไฟล์พาร์ทเนอร์', icon: <Building2 className="w-3.5 h-3.5" />, badge: 'โรงแรม/ผับบาร์/บุฟเฟต์' },
    { id: 'market', label: '🛍️ WIN Shop & WIN Street Market', icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />, badge: 'ร้านค้า & สินค้าชุมชน' },
    { id: 'hospital', label: '🏥 ศูนย์โรงพยาบาล', icon: <Building2 className="w-3.5 h-3.5" />, badge: 'หน่วยฉุกเฉิน' },
    { id: 'codex', label: '📜 คัมภีร์ 7 บท', icon: <BookOpen className="w-3.5 h-3.5" />, badge: 'คัมภีร์หลัก' },
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
    <header className="sticky top-0 z-50 bg-[#070D1E]/95 backdrop-blur-md border-b border-[#00D2FF]/20 shadow-2xl">
      {/* Top micro banner */}
      <div className="bg-gradient-to-r from-[#070D1E] via-[#0A1838] to-[#070D1E] border-b border-white/5 py-1 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30">
              <Sparkles className="w-3 h-3" /> คัมภีร์ยุทธศาสตร์ฉบับสมบูรณ์ & ชุดแอปพลิเคชัน
            </span>
            <span className="hidden md:inline text-slate-400">
              มหายุทธศาสตร์อาณาจักร WINRIDER.AI | ผู้นำ: <strong className="text-cyan-300">CEO Cosmo-Ko</strong> (🦁) & ที่ปรึกษา: <strong className="text-amber-300">จิตใจ</strong> (🦥)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="hidden sm:inline text-cyan-400/80">ระบบอธิปไตยเปิดทำงาน</span>
            <span className="text-slate-400">เวลา กทม.: <strong className="text-white">{currentTime}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div 
            id="brand-logo-btn"
            onClick={() => {
              if (audioEnabled) playTactileBlip(600);
              onSelectMode('passenger');
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D2FF] via-[#0052CC] to-[#070D1E] p-[1.5px] shadow-[0_0_15px_rgba(0,210,255,0.4)] group-hover:shadow-[0_0_25px_rgba(0,210,255,0.7)] transition-all">
              <div className="w-full h-full bg-[#070D1E] rounded-[10px] flex items-center justify-center relative overflow-hidden">
                <span className="text-xl">🦁</span>
                <div className="absolute inset-0 bg-gradient-to-t from-[#00D2FF]/20 to-transparent pointer-events-none" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-wider text-white">WINRIDER<span className="text-[#00D2FF]">.AI</span></span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 tracking-tight">คัมภีร์มหาอาณาจักรและแอปพลิเคชันมือถือ</p>
            </div>
          </div>

          {/* Mode Switcher on Desktop */}
          <nav className="hidden xl:flex items-center gap-1">
            {appModes.map((item) => {
              const isActive = activeMode === item.id;
              return (
                <button
                  key={item.id}
                  id={`mode-btn-${item.id}`}
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(isActive ? 700 : 900);
                    onSelectMode(item.id);
                  }}
                  className={`relative px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[#00D2FF] bg-[#00D2FF]/15 border border-[#00D2FF]/40 shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#00D2FF] rounded-full shadow-[0_0_8px_#00D2FF]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* NFC Quick Sync button */}
            <button
              id="nfc-quick-sync-btn"
              onClick={handleNfcQuickTap}
              title="แตะเพื่อจำลองการ Sync ข้อมูลอัศวินผ่าน Identity Badge NFC"
              className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                nfcSynced 
                  ? 'bg-[#FFD700] text-slate-950 border-[#FFD700] shadow-[0_0_15px_#FFD700]' 
                  : 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700]/20'
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              <span className="hidden sm:inline">{nfcSynced ? 'ซิงก์ข้อมูลสำเร็จ!' : 'แตะ NFC'}</span>
            </button>

            {/* WIN Buddy AI Copilot trigger */}
            <button
              id="open-buddy-top-btn"
              onClick={() => {
                if (audioEnabled) playTactileBlip(1200);
                onOpenWinBuddy();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#00D2FF] to-[#0070F3] text-slate-950 hover:brightness-110 shadow-[0_0_12px_rgba(0,210,255,0.4)] flex items-center gap-1.5 transition-all"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>WIN BUDDY AI</span>
            </button>

            {/* Audio SFX Toggle */}
            <button
              id="audio-toggle-btn"
              onClick={() => {
                if (!audioEnabled) playTactileBlip(800);
                onToggleAudio();
              }}
              title={audioEnabled ? 'ปิดเอฟเฟกต์เสียง' : 'เปิดเอฟเฟกต์เสียงยุทธวิธี'}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-[#00D2FF]" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Mobile menu trigger */}
            <button
              id="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-300 hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#070D1E]/98 border-b border-cyan-500/20 px-4 py-3 space-y-2">
          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1 pt-1">
            โหมดและหน้าจอการใช้งาน
          </div>
          {appModes.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                onSelectMode(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                activeMode === item.id
                  ? 'text-[#00D2FF] bg-[#00D2FF]/20 border border-[#00D2FF]/40'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <span className="text-[9px] font-mono text-amber-400">{item.badge}</span>
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
