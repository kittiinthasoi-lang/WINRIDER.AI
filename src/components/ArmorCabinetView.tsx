import React, { useState } from 'react';
import { KNIGHT_ARMOR_SUITS, ArmorSuit } from '../data/armorSuits';
import { ArmorLevelTestingLab } from './ArmorLevelTestingLab';
import { ArmorLevels1to70ShowcaseModal } from './ArmorLevels1to70ShowcaseModal';
import { ArmorSuitVisualCard } from './ArmorSuitVisualCard';
import { playTactileBlip, playLevelUpFanfare, playRadarScan } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Shield,
  HardHat,
  Shirt,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  RotateCcw,
  Activity,
  Layers,
  ChevronRight,
  Eye,
  Award,
  Flame,
  Info,
  Radio,
  Sliders,
  BatteryCharging,
  Grid,
  AlertTriangle
} from 'lucide-react';

interface ArmorCabinetViewProps {
  equippedSuitId: string;
  onEquipSuit: (suit: ArmorSuit) => void;
  audioEnabled: boolean;
  initialCabinetSection?: 'pod' | 'suits' | 'lab';
}

export const ArmorCabinetView: React.FC<ArmorCabinetViewProps> = ({
  equippedSuitId,
  onEquipSuit,
  audioEnabled,
  initialCabinetSection = 'pod',
}) => {
  const [activeCabinetSection, setActiveCabinetSection] = useState<'pod' | 'suits' | 'lab'>(initialCabinetSection);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>(equippedSuitId || 'suit-v3');
  const [selectedPart, setSelectedPart] = useState<'all' | 'helmet' | 'jacket' | 'pads' | 'gloves' | 'core'>('all');
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishCount, setPolishCount] = useState(1);
  const [chamberLighting, setChamberLighting] = useState<'neon' | 'tactical' | 'stealth'>('neon');
  const [isShowcaseModalOpen, setIsShowcaseModalOpen] = useState<boolean>(false);
  const [conquerorVariantIdx, setConquerorVariantIdx] = useState<number>(0);

  const activeSuit = KNIGHT_ARMOR_SUITS.find((s) => s.id === selectedCabinetId) || KNIGHT_ARMOR_SUITS[2];
  const equippedSuit = KNIGHT_ARMOR_SUITS.find((s) => s.id === equippedSuitId) || KNIGHT_ARMOR_SUITS[2];
  const isCurrentEquipped = activeSuit.id === equippedSuitId;
  const isLocked = false; // Level 100 Sovereign: All suits fully unlocked

  const handlePolishSuit = () => {
    if (audioEnabled) playRadarScan();
    setIsPolishing(true);
    setTimeout(() => {
      setIsPolishing(false);
      setPolishCount((prev) => prev + 1);
      if (audioEnabled) playTactileBlip(1200);
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: [activeSuit.accentColor || '#00D2FF', '#FFD700', '#FFFFFF']
      });
    }, 1200);
  };

  const handleEquip = () => {
    if (isLocked) return;
    onEquipSuit(activeSuit);
    if (audioEnabled) playLevelUpFanfare();
    confetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.55 },
      colors: [activeSuit.accentColor || '#00D2FF', '#FFD700', '#10B981']
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Banner: Cyber Armor Armory Locker with Sub-Section Navigator */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0C1E42] via-[#091530] to-[#070D1E] border-2 border-cyan-400/60 shadow-[0_0_25px_rgba(0,210,255,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-[0_0_15px_rgba(0,210,255,0.4)]">
            🚪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1">
                <Shield className="w-4 h-4 text-[#00D2FF]" />
                KNIGHT ARMOR CABINET & WARDROBE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                ตู้ชุดเกราะอัศวินครบวงจร
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              รวมตู้จัดแสดง (Chamber Pod), นิทรรศการตัวอย่างเกราะเลเวล 1-70 (เกราะ 71-100 ยังไม่เปิดเผย) และศูนย์ทดสอบ
            </p>
          </div>
        </div>

        {/* Action Button & Sub-Tabs inside Armor Cabinet */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(1000);
              setIsShowcaseModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:brightness-110 flex items-center gap-1.5 transition-all border border-amber-300"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>ตัวอย่างเกราะ Lv.1-70 (71-100 ลับ 🔒)</span>
          </button>

          <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-2xl border border-white/10 w-full md:w-auto">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setActiveCabinetSection('pod');
              }}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeCabinetSection === 'pod'
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.4)] font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>🚪 ตู้เกราะ 3D</span>
            </button>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(900);
                setActiveCabinetSection('suits');
              }}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeCabinetSection === 'suits'
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.4)] font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>🛡️ คลังเกราะ 10 ยศ</span>
            </button>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(950);
                setActiveCabinetSection('lab');
              }}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeCabinetSection === 'lab'
                  ? 'bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 shadow-[0_0_12px_rgba(255,215,0,0.4)] font-black'
                  : 'text-[#FFD700] hover:text-yellow-200 hover:bg-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>🧪 ARMOR LAB</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: 3D CHAMBER & MANNEQUIN POD VIEW */}
      {activeCabinetSection === 'pod' && (
        <div className="space-y-4">
          {/* 10-Chamber Pod Selector Carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <span>ตู้เกราะประจำการ 10 ระดับยศ (Select Armor Chamber):</span>
                <span className="text-[10px] text-cyan-400">เลือกตู้เพื่อเปิดแสดง</span>
              </span>
              <span className="text-[10px] text-slate-400">
                สวมใส่อยู่: <strong className="text-cyan-300">{equippedSuit.code}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {KNIGHT_ARMOR_SUITS.map((suit, idx) => {
                const isSelected = suit.id === activeSuit.id;
                const isEquipped = suit.id === equippedSuitId;

                return (
                  <button
                    key={suit.id}
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(850 + idx * 40);
                      setSelectedCabinetId(suit.id);
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#00D2FF] bg-[#0E2248] ring-2 ring-[#00D2FF]/50 shadow-[0_0_15px_rgba(0,210,255,0.35)] scale-[1.02]'
                        : 'border-white/10 bg-[#070D1E] hover:border-cyan-500/40 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-cyan-300 border border-white/10">
                        POD-0{idx + 1}
                      </span>
                      {isEquipped ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="กำลังสวมใส่" />
                      ) : (
                        <span className="text-[9px] font-mono text-slate-400">LV.{suit.levelRequired}</span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-white line-clamp-1">
                      {suit.name.split('(')[0]}
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-slate-400">
                      <span>{suit.tier}</span>
                      {isEquipped ? (
                        <span className="text-emerald-400 font-bold">ใส่ใช้งาน</span>
                      ) : isSelected ? (
                        <span className="text-cyan-300 font-bold">กำลังดู</span>
                      ) : (
                        <span>พร้อม</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN ARMORED CABINET POD (CHAMBER INSPECTOR) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Glass Capsule Display & Mannequin (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="p-4 rounded-3xl bg-gradient-to-b from-[#0B1A38] via-[#071126] to-[#040814] border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(0,210,255,0.25)] relative overflow-hidden flex flex-col items-center justify-between min-h-[460px]">
                {/* Top Chamber Header & Atmospheric Vent Lights */}
                <div className="w-full flex items-center justify-between pb-2 border-b border-white/10 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-cyan-300 font-bold uppercase">{activeSuit.code} CHAMBER</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['neon', 'tactical', 'stealth'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(900);
                          setChamberLighting(mode);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border ${
                          chamberLighting === mode
                            ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                            : 'bg-black/40 text-slate-400 border-white/10'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glowing Capsule Background Aura */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-700"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${activeSuit.accentColor || '#00D2FF'}, transparent 70%)`
                  }}
                />

                {/* Interactive Mannequin Pod Display */}
                <div className="relative my-4 w-full flex flex-col items-center justify-center py-4">
                  {/* Top: Helmet Pod */}
                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(1000);
                      setSelectedPart(selectedPart === 'helmet' ? 'all' : 'helmet');
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative group ${
                      selectedPart === 'helmet'
                        ? 'border-[#00D2FF] bg-cyan-500/20 shadow-[0_0_20px_rgba(0,210,255,0.5)] scale-105'
                        : 'border-white/15 bg-black/40 hover:border-cyan-400/50'
                    }`}
                  >
                    <HardHat className="w-9 h-9 text-[#00D2FF]" />
                    <span className="text-[9px] font-mono font-bold text-white mt-1">🪖 HUD HELMET</span>
                    <span className="text-[8px] text-cyan-300 font-mono">{activeSuit.helmet.name.slice(0, 18)}...</span>
                  </button>

                  {/* Vertical Power Spine Beam */}
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-amber-400 my-1 animate-pulse" />

                  {/* Middle: Armor Jacket Torso */}
                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(900);
                      setSelectedPart(selectedPart === 'jacket' ? 'all' : 'jacket');
                    }}
                    className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center w-48 relative ${
                      selectedPart === 'jacket'
                        ? 'border-[#FFD700] bg-amber-500/20 shadow-[0_0_25px_rgba(255,215,0,0.5)] scale-105'
                        : 'border-white/15 bg-black/50 hover:border-amber-400/50'
                    }`}
                  >
                    <Shirt className="w-14 h-14 text-[#FFD700]" />
                    <span className="text-[10px] font-mono font-bold text-white mt-1">🧥 ARMOR JACKET</span>
                    <span className="text-[8px] text-amber-300 font-mono text-center line-clamp-1">{activeSuit.jacket.name}</span>
                  </button>

                  {/* Vertical Power Spine Beam */}
                  <div className="w-1 h-5 bg-gradient-to-b from-amber-400 to-cyan-400 my-1" />

                  {/* Bottom: Protective Gauntlets & Knee Pads */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setSelectedPart(selectedPart === 'gloves' ? 'all' : 'gloves');
                      }}
                      className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center justify-center text-center ${
                        selectedPart === 'gloves'
                          ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                          : 'border-white/10 bg-black/40 hover:border-white/20'
                      }`}
                    >
                      <span className="text-base">🧤</span>
                      <span className="text-[8px] font-mono text-slate-300 font-bold">ถุงมือคาร์บอน</span>
                    </button>

                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setSelectedPart(selectedPart === 'pads' ? 'all' : 'pads');
                      }}
                      className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center justify-center text-center ${
                        selectedPart === 'pads'
                          ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                          : 'border-white/10 bg-black/40 hover:border-white/20'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-[#FFD700]" />
                      <span className="text-[8px] font-mono text-slate-300 font-bold">สนับเข่า D3O</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Chamber Controls & Action Bar */}
                <div className="w-full pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={handlePolishSuit}
                    disabled={isPolishing}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all border border-white/10"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isPolishing ? 'animate-spin' : ''}`} />
                    <span>{isPolishing ? 'กำลังเคลือบแก้ว...' : `ขัดเงา & เคลือบแก้ว (x${polishCount})`}</span>
                  </button>

                  {isCurrentEquipped ? (
                    <div className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>สวมใส่อยู่ (ACTIVE)</span>
                    </div>
                  ) : isLocked ? (
                    <div className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>ปลดล็อกที่ LVL {activeSuit.levelRequired}</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleEquip}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-[#FFD700] text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:brightness-110 flex items-center gap-1.5 transition-all"
                    >
                      <Shirt className="w-4 h-4" />
                      <span>สวมใส่ชุดเกราะนี้</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Spec Deep Dive, Lore, Telemetry & Part Inspector (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Suit Hero Identity Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0D2147] via-[#091530] to-[#060D1E] border-2 border-cyan-400/50 shadow-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                        {activeSuit.code}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {activeSuit.tier}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {activeSuit.xpMilestone}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white mt-1.5 flex items-center gap-2">
                      <span>{activeSuit.name}</span>
                    </h3>
                  </div>

                  <span className="text-[11px] font-mono text-cyan-400 font-bold bg-black/40 px-2 py-1 rounded-xl border border-cyan-500/30">
                    {activeSuit.visualTag}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                  {activeSuit.designLore}
                </p>

                {/* Suit Combat & Defense Telemetry */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 block font-mono">🛡️ พลังป้องกัน (Defense)</span>
                    <span className="text-cyan-300 font-bold text-sm font-mono">{activeSuit.stats.defense}/100</span>
                    <div className="w-full bg-black/50 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-cyan-400 h-full" style={{ width: `${activeSuit.stats.defense}%` }} />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 block font-mono">💨 แอร์โรไดนามิก (Aero)</span>
                    <span className="text-blue-300 font-bold text-sm font-mono">{activeSuit.stats.aerodynamics}/100</span>
                    <div className="w-full bg-black/50 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-blue-400 h-full" style={{ width: `${activeSuit.stats.aerodynamics}%` }} />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 block font-mono">🌧️ กันสภาพอากาศ (Weather)</span>
                    <span className="text-emerald-300 font-bold text-sm font-mono">{activeSuit.stats.weatherProof}/100</span>
                    <div className="w-full bg-black/50 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-emerald-400 h-full" style={{ width: `${activeSuit.stats.weatherProof}%` }} />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 block font-mono">👑 เกียรติยศ (Honor Buff)</span>
                    <span className="text-amber-300 font-bold text-sm font-mono">{activeSuit.stats.sovereignHonor}/100</span>
                    <div className="w-full bg-black/50 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${activeSuit.stats.sovereignHonor}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Armor Components Breakdown */}
              <div className="space-y-2.5">
                <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                  <span>ชิ้นส่วนและสเปกในตู้เกราะ (Cabinet Components):</span>
                  <span className="text-cyan-400 text-[11px]">มาตรฐานความปลอดภัยระดับสากล</span>
                </div>

                {/* 1. Jacket Spec */}
                <div className="p-3 rounded-2xl bg-[#070E22] border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                      <Shirt className="w-4 h-4 text-cyan-400" />
                      <span>เสื้อแจ็กเก็ตเกราะ: {activeSuit.jacket.name}</span>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      CE Level 2
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div><strong>วัสดุเนื้อผ้า:</strong> {activeSuit.jacket.material}</div>
                    <div><strong>ระบบไฟเรืองแสง:</strong> {activeSuit.jacket.lighting}</div>
                    <div><strong>ซิปนิรภัย:</strong> {activeSuit.jacket.zipperType}</div>
                    <div><strong>ฟังก์ชันพิเศษ:</strong> {activeSuit.jacket.specialFeature}</div>
                  </div>
                </div>

                {/* 2. Helmet Spec */}
                <div className="p-3 rounded-2xl bg-[#070E22] border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <HardHat className="w-4 h-4 text-amber-400" />
                      <span>หมวกกันน็อค HUD: {activeSuit.helmet.name}</span>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {activeSuit.helmet.safetyStandard.split('&')[0]}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div><strong>ชิลด์หน้าหมวก:</strong> {activeSuit.helmet.visorType}</div>
                    <div><strong>ระบบการสื่อสาร:</strong> {activeSuit.helmet.commsIntegration}</div>
                    <div><strong>มาตรฐานความปลอดภัย:</strong> {activeSuit.helmet.safetyStandard}</div>
                    <div><strong>ฟังก์ชันพิเศษ:</strong> {activeSuit.helmet.specialFeature}</div>
                  </div>
                </div>

                {/* 3. Extra Protective Gear */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-2xl bg-black/40 border border-white/5 text-xs">
                    <div className="text-cyan-300 font-bold flex items-center gap-1 mb-1">
                      <span>🧤 ถุงมือข้อต่อคาร์บอน (Kevlar Gauntlets)</span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      รองรับ Touchscreen 100% สันมือเสริมแผ่นสไลเดอร์ดูดซับแรงไถล
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-black/40 border border-white/5 text-xs">
                    <div className="text-emerald-300 font-bold flex items-center gap-1 mb-1">
                      <span>🧰 กระเป๋า Trauma EDC Kit</span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      ชุดสายรัดห้ามเลือด Tourniquet + เจลเย็นฉุกเฉินประจำตัวอัศวิน
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: 10 ARMOR SUITS GALLERY & SPECS */}
      {activeCabinetSection === 'suits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              คลังชุดเกราะอัศวินครบ 10 ระดับยศ (10 KNIGHT ARMOR SUITS)
            </h4>
            <span className="text-[10px] font-mono text-amber-300">
              สวมใส่อยู่: {equippedSuit.code} ({equippedSuit.name.split('(')[0]})
            </span>
          </div>

          <div className="space-y-3">
            {KNIGHT_ARMOR_SUITS.map((suit) => {
              const isEquipped = equippedSuitId === suit.id;
              const isLocked = false; // กิตติ อินทะสร้อย Level 100 ปลดล็อกทุกชุดเกราะและคอสตูม 100%

              return (
                <div
                  key={suit.id}
                  className={`p-4 rounded-3xl bg-gradient-to-br ${suit.bgGradient} border-2 ${
                    isEquipped ? `${suit.borderColor} shadow-[0_0_20px_${suit.glowColor}]` : 'border-white/10 hover:border-cyan-500/40'
                  } transition-all space-y-3 relative overflow-hidden`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-black/50 text-cyan-300 border border-white/10">
                        {suit.code}
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        {suit.visualTag}
                      </span>
                    </div>

                    {isEquipped ? (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        สวมใส่อยู่ (EQUIPPED)
                      </span>
                    ) : isLocked ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        LVL {suit.levelRequired} REQUIRED
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onEquipSuit(suit);
                          if (audioEnabled) playLevelUpFanfare();
                        }}
                        className="text-[10px] font-bold px-3 py-1 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md transition-all flex items-center gap-1"
                      >
                        <Shirt className="w-3 h-3" />
                        <span>สวมใส่ชุดนี้</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{suit.name}</span>
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {suit.designLore}
                    </p>
                    {suit.specialCondition && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-[10px] text-amber-300 font-mono">
                        {suit.specialCondition}
                      </div>
                    )}
                    {suit.subVariants && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {suit.subVariants.map((variant, vIdx) => (
                          <span key={vIdx} className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-cyan-300 font-mono">
                            {variant}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dual Spec: Jacket & Helmet */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                        <Shirt className="w-3.5 h-3.5 text-cyan-400" />
                        <span>เสื้อเกราะ (Armor Jacket)</span>
                      </div>
                      <div className="text-xs font-bold text-white">{suit.jacket.name}</div>
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <div><strong>วัสดุ:</strong> {suit.jacket.material}</div>
                        <div><strong>แสงเรือง:</strong> {suit.jacket.lighting}</div>
                        <div><strong>ซิป:</strong> {suit.jacket.zipperType}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <HardHat className="w-3.5 h-3.5 text-amber-400" />
                        <span>หมวกกันน็อค (Smart Helmet)</span>
                      </div>
                      <div className="text-xs font-bold text-white">{suit.helmet.name}</div>
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <div><strong>ชิลด์หน้า:</strong> {suit.helmet.visorType}</div>
                        <div><strong>ระบบสื่อสาร:</strong> {suit.helmet.commsIntegration}</div>
                        <div><strong>มาตรฐาน:</strong> {suit.helmet.safetyStandard}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: INTEGRATED ARMOR LEVEL TESTING LAB (LV. 1 - 100) */}
      {activeCabinetSection === 'lab' && (
        <ArmorLevelTestingLab
          audioEnabled={audioEnabled}
          onEquipSuit={(suitId) => {
            const found = KNIGHT_ARMOR_SUITS.find(s => s.id === suitId);
            if (found) onEquipSuit(found);
          }}
        />
      )}

      {/* FULL SHOWCASE MODAL FOR ARMOR LVL 1-70 (LVL 71-100 CLASSIFIED) */}
      <ArmorLevels1to70ShowcaseModal
        isOpen={isShowcaseModalOpen}
        onClose={() => setIsShowcaseModalOpen(false)}
        equippedSuitId={equippedSuitId}
        onEquipSuit={(suit) => {
          onEquipSuit(suit);
          setIsShowcaseModalOpen(false);
        }}
        audioEnabled={audioEnabled}
      />
    </div>
  );
};
