import React, { useState } from 'react';
import { KNIGHT_ARMOR_SUITS, ArmorSuit } from '../data/armorSuits';
import { ArmorSuitVisualCard } from './ArmorSuitVisualCard';
import {
  X,
  Shield,
  Sparkles,
  Lock,
  Eye,
  AlertTriangle,
  Award,
  Zap,
  CheckCircle2,
  HardHat,
  Shirt,
  Info,
  ChevronRight,
  Filter,
  Layers,
  HelpCircle
} from 'lucide-react';

interface ArmorLevels1to70ShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  equippedSuitId?: string;
  onEquipSuit?: (suit: ArmorSuit) => void;
  audioEnabled?: boolean;
}

export const ArmorLevels1to70ShowcaseModal: React.FC<ArmorLevels1to70ShowcaseModalProps> = ({
  isOpen,
  onClose,
  equippedSuitId = 'suit-v3',
  onEquipSuit,
  audioEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<'revealed' | 'classified' | 'comparison'>('revealed');
  const [selectedSuitId, setSelectedSuitId] = useState<string>('suit-v1');
  const [conquerorVariantIdx, setConquerorVariantIdx] = useState<number>(0);

  if (!isOpen) return null;

  const revealedSuits = KNIGHT_ARMOR_SUITS.filter((s) => s.isRevealed); // Level 1 - 70 (Suits 1 to 7)
  const classifiedSuits = KNIGHT_ARMOR_SUITS.filter((s) => !s.isRevealed); // Level 71 - 100 (Suits 8, 9, 10)

  const activeSuit = KNIGHT_ARMOR_SUITS.find((s) => s.id === selectedSuitId) || revealedSuits[0];

  const playBlip = () => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio context fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#070D1E] border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_50px_rgba(0,210,255,0.3)] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0C1B3A] via-[#09152E] to-[#060D1E] border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.4)]">
              <Shield className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-black border border-cyan-400/40">
                  OFFICIAL ARMOR ARCHIVE
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                  WINRIDER.AI
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2 mt-0.5">
                <span>ตัวอย่างชุดเกราะเลเวล 1–70</span>
                <span className="text-xs sm:text-sm font-normal text-amber-400 font-mono">
                  (เกราะเลเวล 71–100 ยังไม่เปิดเผย 🔒)
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
              <button
                onClick={() => {
                  playBlip();
                  setActiveTab('revealed');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'revealed'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ตัวอย่างชุดเกราะ (Lv.1-70)</span>
                <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px]">7 แบบ</span>
              </button>

              <button
                onClick={() => {
                  playBlip();
                  setActiveTab('classified');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'classified'
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'text-amber-300 hover:text-amber-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>ยังไม่เปิดเผย (Lv.71-100)</span>
                <span className="px-1.5 py-0.2 rounded bg-red-500/30 text-red-200 text-[10px] animate-pulse">🔒 3 แบบ</span>
              </button>

              <button
                onClick={() => {
                  playBlip();
                  setActiveTab('comparison');
                }}
                className={`hidden md:flex px-3 py-1.5 rounded-lg font-bold items-center gap-1.5 transition-all ${
                  activeTab === 'comparison'
                    ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ตารางเปรียบเทียบ</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all border border-white/10"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL CONTENT CONTAINER */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* NOTICE BANNER */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-[#0B1A38] to-amber-950/50 border border-cyan-500/40 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="text-slate-200 leading-relaxed font-mono">
                <strong className="text-cyan-300">ประกาศระเบียบสภาอัศวิน: </strong>
                เปิดเผยตัวอย่างชุดเกราะมาตรฐาน <strong>Level 1–70 (จำนวน 7 ระดับยศ และ 4 ลายซีซันของผู้พิชิต)</strong> เพื่อให้อัศวินนำไปใช้ปฏิบัติหน้าที่ สำหรับ <strong>Level 71–100</strong> ถูกเก็บรักษาเป็นความลับสุดยอด (Top Secret)
              </span>
            </div>
            <div className="text-[11px] font-mono font-bold text-amber-300 bg-black/50 px-2.5 py-1 rounded-lg border border-amber-500/30">
              สถานะ: เปิดเผย 1–70 / ซ่อน 71–100
            </div>
          </div>

          {/* TAB 1: REVEALED ARMOR SUITS (LEVEL 1 - 70) */}
          {activeTab === 'revealed' && (
            <div className="space-y-6">
              {/* Suit Selector Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {revealedSuits.map((suit) => {
                  const isSelected = suit.id === selectedSuitId;
                  const isEquipped = suit.id === equippedSuitId;

                  return (
                    <button
                      key={suit.id}
                      onClick={() => {
                        playBlip();
                        setSelectedSuitId(suit.id);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-cyan-400 bg-[#0E234A] ring-2 ring-cyan-400/60 shadow-[0_0_20px_rgba(0,210,255,0.4)] scale-[1.02]'
                          : 'border-white/10 bg-[#060C1B] hover:border-cyan-500/40 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                        <span className="font-bold px-1.5 py-0.5 rounded bg-black/50 text-cyan-300 border border-white/10">
                          {suit.code}
                        </span>
                        {isEquipped ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="สวมใส่อยู่" />
                        ) : (
                          <span className="text-slate-400 font-bold">{suit.levelRangeText}</span>
                        )}
                      </div>

                      <div className="text-xs font-bold text-white line-clamp-1 mt-1">
                        {suit.name.split('(')[0]}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span className="text-cyan-300">{suit.tier}</span>
                        <span className="text-[8px] bg-white/10 px-1 rounded text-slate-300">
                          {suit.id === 'suit-v7' ? '4 ลาย' : '1 แบบ'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* INSPECTOR & DEEP DIVE HERO PANEL */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0A1838] via-[#071024] to-[#040814] border-2 border-cyan-500/50 shadow-2xl">
                
                {/* Left: Visual Graphic Card Component (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <ArmorSuitVisualCard
                    suit={activeSuit}
                    isEquipped={equippedSuitId === activeSuit.id}
                    selectedVariantIndex={conquerorVariantIdx}
                    onSelectVariant={(idx) => {
                      playBlip();
                      setConquerorVariantIdx(idx);
                    }}
                    onEquip={() => {
                      if (onEquipSuit) onEquipSuit(activeSuit);
                    }}
                    audioEnabled={audioEnabled}
                    size="lg"
                  />

                  {/* Quick Specs Highlight */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-slate-400 block text-[9px]">⚡ ป้องกันแรงกระแทก:</span>
                      <strong className="text-cyan-300">{activeSuit.stats.defense}/100</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-slate-400 block text-[9px]">💨 แอโรไดนามิก:</span>
                      <strong className="text-blue-300">{activeSuit.stats.aerodynamics}/100</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Detailed Specification Deep Dive (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-400/40">
                        {activeSuit.code}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
                        {activeSuit.tier}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                        {activeSuit.levelRangeText}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-2xl font-black text-white mt-2">
                      {activeSuit.name}
                    </h3>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-black/30 p-3 rounded-2xl border border-white/5 font-sans">
                      {activeSuit.designLore}
                    </p>
                  </div>

                  {/* 4 Variants Highlight for Level 61-70 */}
                  {activeSuit.id === 'suit-v7' && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/60 via-[#1F0A0A] to-[#0F0505] border border-red-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-red-300">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>4 แบบพิเศษสะสม (4 Collectible Seasonal Variants):</span>
                        </span>
                        <span className="text-[10px] text-amber-300">กุญแจสู่ขั้นจักรพรรดิ</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className={`p-2 rounded-xl border ${conquerorVariantIdx === 0 ? 'border-amber-400 bg-amber-500/20' : 'border-white/10 bg-black/40'}`}>
                          <strong>🌸 1. Spring Bloom:</strong> ลายสายฟ้าสีทองคำบนผ้าคาร์บอน 3K
                        </div>
                        <div className={`p-2 rounded-xl border ${conquerorVariantIdx === 1 ? 'border-cyan-400 bg-cyan-500/20' : 'border-white/10 bg-black/40'}`}>
                          <strong>⛈️ 2. Monsoon Storm:</strong> ลายสายฟ้าสีฟ้าน้ำทะเลตัดคลื่นฝน
                        </div>
                        <div className={`p-2 rounded-xl border ${conquerorVariantIdx === 2 ? 'border-amber-400 bg-amber-500/20' : 'border-white/10 bg-black/40'}`}>
                          <strong>⚡ 3. Cyber Neon:</strong> สายฟ้าคู่ทองคำและพลาสมาบลู Overdrive
                        </div>
                        <div className={`p-2 rounded-xl border ${conquerorVariantIdx === 3 ? 'border-red-400 bg-red-500/20' : 'border-white/10 bg-black/40'}`}>
                          <strong>🩸 4. Iron Blood:</strong> คาร์บอนดำสนิทตัดขอบสายฟ้าสีทองสเตลธ์
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dual Component Blueprint Breakdown */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                      <span>สเปกชิ้นส่วนมาตรฐาน (Component Engineering):</span>
                      <span className="text-cyan-400 text-[10px]">ผ่านการรับรอง CE Level 2 & ECE 22.06</span>
                    </div>

                    {/* 1. Armor Jacket Spec */}
                    <div className="p-3 rounded-2xl bg-[#081226] border border-white/10 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-cyan-300">
                        <div className="flex items-center gap-1.5">
                          <Shirt className="w-4 h-4 text-cyan-400" />
                          <span>เสื้อแจ็กเก็ตเกราะ: {activeSuit.jacket.name}</span>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                          JACKET SPEC
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 space-y-0.5 pt-1 font-mono">
                        <div><strong className="text-slate-400">วัสดุ:</strong> {activeSuit.jacket.material}</div>
                        <div><strong className="text-slate-400">ระบบไฟ:</strong> {activeSuit.jacket.lighting}</div>
                        <div><strong className="text-slate-400">ซิป:</strong> {activeSuit.jacket.zipperType}</div>
                        <div><strong className="text-slate-400">ฟังก์ชัน:</strong> {activeSuit.jacket.specialFeature}</div>
                      </div>
                    </div>

                    {/* 2. Helmet Spec */}
                    <div className="p-3 rounded-2xl bg-[#081226] border border-white/10 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-amber-300">
                        <div className="flex items-center gap-1.5">
                          <HardHat className="w-4 h-4 text-amber-400" />
                          <span>หมวกกันน็อก HUD: {activeSuit.helmet.name}</span>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          HELMET SPEC
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 space-y-0.5 pt-1 font-mono">
                        <div><strong className="text-slate-400">ชิลด์หน้า:</strong> {activeSuit.helmet.visorType}</div>
                        <div><strong className="text-slate-400">การสื่อสาร:</strong> {activeSuit.helmet.commsIntegration}</div>
                        <div><strong className="text-slate-400">มาตรฐาน:</strong> {activeSuit.helmet.safetyStandard}</div>
                        <div><strong className="text-slate-400">ฟังก์ชัน:</strong> {activeSuit.helmet.specialFeature}</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Equip Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">
                      ระดับเลเวลที่ต้องการ: <strong className="text-cyan-300">Level {activeSuit.levelRequired}+</strong>
                    </span>

                    {equippedSuitId === activeSuit.id ? (
                      <div className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>กำลังสวมใส่อยู่ (EQUIPPED)</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (onEquipSuit) onEquipSuit(activeSuit);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-[#FFD700] text-slate-950 font-black text-xs shadow-[0_0_18px_rgba(0,210,255,0.4)] hover:brightness-110 flex items-center gap-1.5 transition-all"
                      >
                        <Shirt className="w-4 h-4" />
                        <span>สวมใส่ชุดเกราะนี้</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ALL 7 REVEALED SUITS GALLERY GRID */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>แกลเลอรีตัวอย่างชุดเกราะ เลเวล 1–70 ทั้ง 7 ระดับยศ</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    คลิกเพื่อเปิดดูแบบละเอียด
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {revealedSuits.map((suit) => (
                    <div
                      key={suit.id}
                      className={`cursor-pointer transition-all hover:scale-[1.01] ${
                        selectedSuitId === suit.id ? 'ring-2 ring-cyan-400 rounded-3xl' : ''
                      }`}
                      onClick={() => {
                        playBlip();
                        setSelectedSuitId(suit.id);
                      }}
                    >
                      <ArmorSuitVisualCard
                        suit={suit}
                        isEquipped={equippedSuitId === suit.id}
                        selectedVariantIndex={conquerorVariantIdx}
                        onSelectVariant={(idx) => {
                          playBlip();
                          setConquerorVariantIdx(idx);
                        }}
                        onEquip={() => {
                          if (onEquipSuit) onEquipSuit(suit);
                        }}
                        audioEnabled={audioEnabled}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLASSIFIED MYSTERY VAULT (LEVEL 71 - 100) */}
          {activeTab === 'classified' && (
            <div className="space-y-6">
              {/* Classified Hero Notice */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-red-950/80 via-[#260A0A] to-[#120404] border-2 border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.3)] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 border-2 border-red-400 flex items-center justify-center animate-pulse">
                    <Lock className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-red-500/30 text-red-200 font-mono text-[10px] font-black border border-red-400">
                        TOP SECRET SOVEREIGN COUNCIL
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/30 text-amber-200 font-mono text-[10px] font-bold border border-amber-400">
                        CLASSIFIED ARCHIVE
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                      🔒 ชุดเกราะเลเวล 71–100 ยังไม่เปิดเผยต่อสาธารณะ
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  เพื่อรักษาความลับทางยุทธศาสตร์ เอกสิทธิ์สูงสุดของผู้นำวิก และความสมดุลของระบบเศรษฐกิจอธิปไตย สภาอัศวิน WINRIDER.AI จึงจำกัดการเข้าชมตัวอย่างชุดเกราะเลเวล 71 ขึ้นไป เฉพาะอัศวินที่ผ่านเกณฑ์สะสมเกราะผู้พิชิตและไต่เต้าถึงเลเวลที่กำหนดเท่านั้น
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-black/60 border border-amber-500/30">
                    <div className="text-amber-400 font-bold mb-1">👑 อัศวินจักรพรรดิ (Lv.71-80)</div>
                    <div className="text-[11px] text-slate-300">
                      ต้องสะสมชุดเกราะผู้พิชิต (Lv.61-70) ครบทั้ง 4 แบบก่อน จึงจะปลดล็อกตัวอย่างและสิทธิ์สวมใส่
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/60 border border-purple-500/30">
                    <div className="text-purple-400 font-bold mb-1">🌟 อัศวินตำนาน (Lv.81-90)</div>
                    <div className="text-[11px] text-slate-300">
                      3 แบบแรร์ระดับตำนาน สลับใส่ย้อนหลังได้ทุกชุดเกราะ เก็บรักษาในห้องนิรภัยอธิปไตย
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/60 border border-yellow-500/30">
                    <div className="text-yellow-400 font-bold mb-1">👑🌌 เทพเจ้า (Lv.91-100)</div>
                    <div className="text-[11px] text-slate-300">
                      1 เดียวในโลก ออกแบบเฉพาะบุคคลร่วมกับดีไซเนอร์ระดับโลก งบประมาณ 100,000 บาท
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Classified Hologram Pods */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {classifiedSuits.map((suit) => (
                  <ArmorSuitVisualCard
                    key={suit.id}
                    suit={suit}
                    isEquipped={equippedSuitId === suit.id}
                    audioEnabled={audioEnabled}
                    size="md"
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: COMPARISON MATRIX */}
          {activeTab === 'comparison' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>ตารางเปรียบเทียบชุดเกราะทุกระดับยศ (Level 1–100 Full Specification Matrix)</span>
                </h4>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#060C1B]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0D1D3D] text-cyan-300 border-b border-white/10 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">รหัส / ชื่อรุ่น</th>
                      <th className="p-3">ช่วงเลเวล</th>
                      <th className="p-3">สถานะการเปิดเผย</th>
                      <th className="p-3">วัสดุเสื้อเกราะ</th>
                      <th className="p-3">หมวกกันน็อก HUD</th>
                      <th className="p-3">พลังป้องกัน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {KNIGHT_ARMOR_SUITS.map((suit) => (
                      <tr key={suit.id} className={suit.isRevealed ? 'hover:bg-white/5' : 'bg-red-950/20 text-slate-400'}>
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] text-cyan-300 border border-white/10">
                            {suit.code}
                          </span>
                          <span>{suit.name.split('(')[0]}</span>
                        </td>
                        <td className="p-3 text-cyan-300 font-bold">{suit.levelRangeText}</td>
                        <td className="p-3">
                          {suit.isRevealed ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                              🟢 เปิดเผยตัวอย่าง (Lv.1-70)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30 animate-pulse">
                              🔒 ยังไม่เปิดเผย (Lv.71-100)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] max-w-xs">{suit.jacket.material.slice(0, 45)}...</td>
                        <td className="p-3 text-[11px] max-w-xs">{suit.helmet.name.slice(0, 35)}...</td>
                        <td className="p-3 font-bold text-cyan-300">{suit.stats.defense}/100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#050A18] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="text-slate-400 flex items-center gap-2">
            <span>🛡️ นิทรรศการชุดเกราะทางการ WINRIDER.AI</span>
            <span className="text-cyan-400">• สวมใส่ปัจจุบัน: <strong>{equippedSuitId}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all border border-white/10"
            >
              ปิดหน้านิทรรศการ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
