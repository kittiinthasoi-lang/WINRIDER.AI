import React, { useState } from 'react';
import { 
  KNIGHT_10_TIERS, 
  CITIZEN_10_TIERS, 
  MERCHANT_10_TIERS, 
  TierRankDefinition,
  XP_DIFFICULTY_CONFIG,
  getKnightTier,
  getCitizenTier,
  getMerchantTier,
  calculateLevelMaxXp,
  calculateCumulativeXpForLevel,
  getLevelDifficultyMetrics
} from '../data/tierHierarchyData';
import { playTactileBlip, playRadarScan } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sparkles, 
  Shield, 
  Award, 
  Store, 
  User, 
  Zap, 
  Gift, 
  Layers, 
  CheckCircle2, 
  ChevronRight,
  Crown,
  Lock,
  ArrowRight
} from 'lucide-react';

interface SovereignTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'knight' | 'citizen' | 'merchant';
  currentLevel?: number;
  audioEnabled?: boolean;
  onApplySimulatedLevel?: (role: 'knight' | 'citizen' | 'merchant', level: number) => void;
}

export const SovereignTiersModal: React.FC<SovereignTiersModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'citizen',
  currentLevel = 91,
  audioEnabled = true,
  onApplySimulatedLevel
}) => {
  const [activeRoleTab, setActiveRoleTab] = useState<'knight' | 'citizen' | 'merchant' | 'comparison'>(initialRole);
  const [selectedTierIndex, setSelectedTierIndex] = useState<number>(() => {
    if (currentLevel >= 91) return 9;
    if (currentLevel >= 81) return 8;
    if (currentLevel >= 71) return 7;
    if (currentLevel >= 61) return 6;
    if (currentLevel >= 51) return 5;
    if (currentLevel >= 41) return 4;
    if (currentLevel >= 31) return 3;
    if (currentLevel >= 21) return 2;
    if (currentLevel >= 11) return 1;
    return 0;
  });

  const [sliderLevel, setSliderLevel] = useState<number>(currentLevel);

  if (!isOpen) return null;

  const currentKnightTier = getKnightTier(sliderLevel);
  const currentCitizenTier = getCitizenTier(sliderLevel);
  const currentMerchantTier = getMerchantTier(sliderLevel);

  const getTiersForActiveRole = (): TierRankDefinition[] => {
    if (activeRoleTab === 'knight') return KNIGHT_10_TIERS;
    if (activeRoleTab === 'merchant') return MERCHANT_10_TIERS;
    return CITIZEN_10_TIERS;
  };

  const handleSelectTier = (idx: number) => {
    if (audioEnabled) playTactileBlip(800 + idx * 50);
    setSelectedTierIndex(idx);
    const midLvl = idx * 10 + 5;
    setSliderLevel(Math.min(100, Math.max(1, midLvl)));
  };

  const handleSliderChange = (newLevel: number) => {
    setSliderLevel(newLevel);
    if (newLevel >= 91) setSelectedTierIndex(9);
    else if (newLevel >= 81) setSelectedTierIndex(8);
    else if (newLevel >= 71) setSelectedTierIndex(7);
    else if (newLevel >= 61) setSelectedTierIndex(6);
    else if (newLevel >= 51) setSelectedTierIndex(5);
    else if (newLevel >= 41) setSelectedTierIndex(4);
    else if (newLevel >= 31) setSelectedTierIndex(3);
    else if (newLevel >= 21) setSelectedTierIndex(2);
    else if (newLevel >= 11) setSelectedTierIndex(1);
    else setSelectedTierIndex(0);
  };

  const handleApplyLevelToApp = (role: 'knight' | 'citizen' | 'merchant', lvl: number) => {
    if (audioEnabled) playRadarScan();
    confetti({ particleCount: 70, spread: 85, colors: ['#00D2FF', '#FFD700', '#10B981'] });
    if (onApplySimulatedLevel) {
      onApplySimulatedLevel(role, lvl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-gradient-to-b from-[#0A162D] via-[#081226] to-[#050B18] rounded-3xl border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(0,210,255,0.25)] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 pb-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-[#FFD700] p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-[#070E20] rounded-[14px] flex items-center justify-center text-xl sm:text-2xl">
                👑
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  ทำเนียบ 10 ระดับยศอธิปไตย (10-Tier Sovereign Codex)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  LEVEL 1–100
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                แบ่งระดับยศ พลเมือง และ ร้านค้า อ้างอิงคู่ขนานกับ เลเวลชุดเกราะพี่วิน
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(600);
              onClose();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ROLE NAVIGATION TABS & DYNAMIC LEVEL SLIDER */}
        <div className="p-4 sm:p-5 pb-3 bg-black/30 border-b border-white/10 space-y-4 flex-shrink-0">
          {/* 4 Tabs: Knight, Citizen, Merchant, 3-Pillar Comparison */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(900);
                setActiveRoleTab('knight');
              }}
              className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeRoleTab === 'knight'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>🛵</span>
              <span>1. พี่วิน (Knight Drivers)</span>
            </button>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(950);
                setActiveRoleTab('citizen');
              }}
              className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeRoleTab === 'citizen'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>🦥</span>
              <span>2. พลเมือง (Citizens)</span>
            </button>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(1000);
                setActiveRoleTab('merchant');
              }}
              className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeRoleTab === 'merchant'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>🏪</span>
              <span>3. ร้านค้า (Merchants)</span>
            </button>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(1100);
                setActiveRoleTab('comparison');
              }}
              className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeRoleTab === 'comparison'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>4. ตารางเทียบ 3 เสาหลัก</span>
            </button>
          </div>

          {/* DYNAMIC LEVEL SLIDER INTERACTIVE CONTROLLER */}
          <div className="p-3.5 rounded-2xl bg-[#09152E] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-sm font-black text-cyan-300 font-mono flex-shrink-0">
                LV.{sliderLevel}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span>ทดสอบเลื่อนระดับเลเวลจำลอง (Level Simulator):</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {sliderLevel >= 91 ? '🌌 ระดับอภิมหาเทพเจ้า (Godlike Tier 10)' : sliderLevel >= 61 ? '⚔️ ระดับสูงผู้พิชิต/จักรพรรดิ (Tier 7-9)' : '🛡️ ระดับปฏิบัติการ (Tier 1-6)'}
                </div>
              </div>
            </div>

            <div className="w-full sm:flex-1 max-w-md flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-400">LV.1</span>
              <input
                type="range"
                min="1"
                max="100"
                value={sliderLevel}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-800 accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-[#FFD700] font-bold">LV.100</span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {[10, 30, 50, 70, 100].map((quickLvl) => (
                <button
                  key={quickLvl}
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800 + quickLvl * 4);
                    handleSliderChange(quickLvl);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    sliderLevel === quickLvl
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {quickLvl === 100 ? '👑 100' : `L.${quickLvl}`}
                </button>
              ))}
            </div>
          </div>

          {/* PROPORTIONAL XP FORMULA METRICS BANNER FOR SLIDER LEVEL */}
          {(() => {
            const metrics = getLevelDifficultyMetrics(sliderLevel);
            const knightMaxXp = calculateLevelMaxXp(sliderLevel, 'knight');
            const citizenMaxXp = calculateLevelMaxXp(sliderLevel, 'citizen');
            const merchantMaxXp = calculateLevelMaxXp(sliderLevel, 'merchant');
            const knightCumul = calculateCumulativeXpForLevel(sliderLevel, 'knight');
            const citizenCumul = calculateCumulativeXpForLevel(sliderLevel, 'citizen');
            const merchantCumul = calculateCumulativeXpForLevel(sliderLevel, 'merchant');

            return (
              <div className="mt-2.5 p-3 rounded-2xl bg-black/60 border border-cyan-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${metrics.badgeColor}`}>
                    {metrics.icon} {metrics.difficultyLabel} ({metrics.difficultyIndex})
                  </span>
                  <span className="text-slate-300 text-[10px]">{metrics.growthRateText}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-2 py-1 rounded-xl bg-blue-950/40 border border-blue-500/30 text-[10px]">
                    <span className="text-cyan-400 font-bold">🛵 วิน LV.{sliderLevel}:</span>{' '}
                    <strong className="text-white">{knightMaxXp.toLocaleString()} XP</strong>
                    <span className="text-slate-400 text-[9px] ml-1">(สะสม {knightCumul.toLocaleString()})</span>
                  </div>
                  <div className="px-2 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[10px]">
                    <span className="text-emerald-400 font-bold">🦥 พลเมือง LV.{sliderLevel}:</span>{' '}
                    <strong className="text-white">{citizenMaxXp.toLocaleString()} XP</strong>
                    <span className="text-slate-400 text-[9px] ml-1">(สะสม {citizenCumul.toLocaleString()})</span>
                  </div>
                  <div className="px-2 py-1 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[10px]">
                    <span className="text-amber-400 font-bold">🏪 ร้านค้า LV.{sliderLevel}:</span>{' '}
                    <strong className="text-white">{merchantMaxXp.toLocaleString()} XP</strong>
                    <span className="text-slate-400 text-[9px] ml-1">(สะสม {merchantCumul.toLocaleString()})</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">

          {/* VIEW MODE 1: COMPARISON MODE (SIDE-BY-SIDE ALL 3 ROLES) */}
          {activeRoleTab === 'comparison' && (
            <div className="space-y-6">
              {/* Active Tier Snapshot for the Current Level Slider */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0D1C38] via-[#091530] to-[#070D1E] border-2 border-cyan-500/40 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white">
                        สิทธิประโยชน์พร้อมกันทั้ง 3 เสาหลัก ณ Level {sliderLevel}
                      </h3>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {currentKnightTier.levelRange} • หมวดหมู่ยศคู่ขนาน
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      🛵 วิน: x1.0 (ลด 1,000% สู่มาตรฐาน)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      🦥 พลเมือง: +1,000% XP (ลดลง 1,000%)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🏪 ร้านค้า: +2,000% XP (ลดลง 3,000%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Knight Column */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/30 space-y-2.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs pb-1 border-b border-white/10">
                      <span className="text-base">🛵</span>
                      <span>1. พี่วิน: {currentKnightTier.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {currentKnightTier.description}
                    </p>
                    <div className="space-y-1 text-[10px] text-slate-300 pt-1">
                      {currentKnightTier.keyPerks.map((p, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-500/20 text-[10px] text-cyan-300 font-mono">
                      🎁 <strong>ของรางวัล:</strong> {currentKnightTier.exclusiveReward}
                    </div>
                  </div>

                  {/* 2. Citizen Column */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs pb-1 border-b border-white/10">
                      <span className="text-base">🦥</span>
                      <span>2. พลเมือง: {currentCitizenTier.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {currentCitizenTier.description}
                    </p>
                    <div className="space-y-1 text-[10px] text-slate-300 pt-1">
                      {currentCitizenTier.keyPerks.map((p, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-[10px] text-emerald-300 font-mono">
                      🎁 <strong>ของรางวัล:</strong> {currentCitizenTier.exclusiveReward}
                    </div>
                  </div>

                  {/* 3. Merchant Column */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs pb-1 border-b border-white/10">
                      <span className="text-base">🏪</span>
                      <span>3. ร้านค้า: {currentMerchantTier.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {currentMerchantTier.description}
                    </p>
                    <div className="space-y-1 text-[10px] text-slate-300 pt-1">
                      {currentMerchantTier.keyPerks.map((p, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/20 text-[10px] text-amber-300 font-mono">
                      🎁 <strong>ของรางวัล:</strong> {currentMerchantTier.exclusiveReward}
                    </div>
                  </div>
                </div>
              </div>

              {/* Comprehensive 10-Tier Master Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>ตารางเทียบระดับยศ 10 ลำดับขั้นทั้ง 3 เสาหลัก (Master 10-Tier Comparison Matrix)</span>
                </h4>

                <div className="space-y-2.5">
                  {KNIGHT_10_TIERS.map((kt, idx) => {
                    const ct = CITIZEN_10_TIERS[idx];
                    const mt = MERCHANT_10_TIERS[idx];
                    const isSelected = selectedTierIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectTier(idx)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#0E1E40] via-[#0A1630] to-[#070D1E] border-cyan-400 shadow-md scale-[1.005]'
                            : 'bg-black/30 hover:bg-black/50 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-mono font-bold text-cyan-300">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-mono font-bold text-white">
                              {kt.levelRange}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-white/5 text-slate-300 border border-white/10">
                              {kt.rarity}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                            <span>ต้องการ {kt.xpRequired.toLocaleString()} XP</span>
                            <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="p-2 rounded-xl bg-blue-950/20 border border-blue-500/20">
                            <span className="text-[10px] font-mono text-cyan-400 block">🛵 วิน:</span>
                            <strong className="text-slate-200 text-[11px]">{kt.title}</strong>
                          </div>
                          <div className="p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                            <span className="text-[10px] font-mono text-emerald-400 block">🦥 พลเมือง:</span>
                            <strong className="text-slate-200 text-[11px]">{ct.title}</strong>
                          </div>
                          <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-500/20">
                            <span className="text-[10px] font-mono text-amber-400 block">🏪 ร้านค้า:</span>
                            <strong className="text-slate-200 text-[11px]">{mt.title}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PROGRESSIVE XP CURVE MATRIX & COMPARISON BREAKDOWN */}
              <div className="p-5 rounded-3xl bg-[#070E20] border-2 border-[#FFD700]/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📈</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">ตารางสัดส่วนคะแนนเต็ม XP รายเลเวล (Proportional XP Scaling Matrix)</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        สมการโปรเกรสซีฟ: ยิ่งเลเวลสูงยิ่งเก็บยากขึ้นตามสัดส่วน (Progressive Power Curve) พร้อมอัตราทดความยากที่ปรับลดลงแล้ว
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40">วิน x1.0</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">พลเมือง x11.0</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">ร้านค้า x21.0</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] text-slate-400">
                        <th className="py-2 px-2">ช่วงเลเวล (Level)</th>
                        <th className="py-2 px-2">ระดับความยาก (Difficulty)</th>
                        <th className="py-2 px-2 text-cyan-300">🛵 พี่วิน (Knight x1.0)</th>
                        <th className="py-2 px-2 text-emerald-300">🦥 พลเมือง (Citizen x11.0)</th>
                        <th className="py-2 px-2 text-amber-300">🏪 ร้านค้า (Merchant x21.0)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        { lvl: 1, label: 'Level 1 (เริ่มต้น)' },
                        { lvl: 5, label: 'Level 5 (อัศวินฝึกหัด)' },
                        { lvl: 10, label: 'Level 10 (ข้ามสู่ Tier 2)' },
                        { lvl: 20, label: 'Level 20 (อัศวินเงิน)' },
                        { lvl: 30, label: 'Level 30 (อัศวินทอง)' },
                        { lvl: 40, label: 'Level 40 (อัศวินแพลตินัม)' },
                        { lvl: 50, label: 'Level 50 (อัศวินเพชร)' },
                        { lvl: 70, label: 'Level 70 (ผู้นำวิกจักรพรรดิ)' },
                        { lvl: 85, label: 'Level 85 (อัศวินตำนาน)' },
                        { lvl: 100, label: 'Level 100 (เทพเจ้าอธิปไตย)' }
                      ].map((item) => {
                        const m = getLevelDifficultyMetrics(item.lvl);
                        const kXp = calculateLevelMaxXp(item.lvl, 'knight');
                        const cXp = calculateLevelMaxXp(item.lvl, 'citizen');
                        const mXp = calculateLevelMaxXp(item.lvl, 'merchant');
                        const isSelectedLvl = Math.abs(sliderLevel - item.lvl) <= 4;

                        return (
                          <tr 
                            key={item.lvl} 
                            onClick={() => handleSliderChange(item.lvl)}
                            className={`cursor-pointer transition-colors ${
                              isSelectedLvl ? 'bg-cyan-500/10 font-bold' : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="py-2.5 px-2 text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              <span>{item.label}</span>
                            </td>
                            <td className="py-2.5 px-2">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${m.badgeColor}`}>
                                {m.difficultyLabel} ({m.difficultyIndex})
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-cyan-300 font-bold">
                              {kXp.toLocaleString()} XP
                            </td>
                            <td className="py-2.5 px-2 text-emerald-300 font-bold">
                              {cXp.toLocaleString()} XP
                            </td>
                            <td className="py-2.5 px-2 text-amber-300 font-bold">
                              {mXp.toLocaleString()} XP
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-slate-300 text-[11px] font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FFD700]" />
                    <span>คลิกที่แถวของตารางเพื่อปรับตัวเลื่อน Simulator ไปยังเลเวลนั้นได้ทันที</span>
                  </div>
                  <span className="text-cyan-300 font-bold">สูตรคำนวณมาตรฐานสากล</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2, 3, 4: SINGLE ROLE DEEP-DIVE (KNIGHT, CITIZEN, MERCHANT) */}
          {activeRoleTab !== 'comparison' && (
            <div className="space-y-6">
              {/* Role Highlight Header */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0E1E42] via-[#091530] to-[#070D1E] border border-white/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">
                      {activeRoleTab === 'knight' ? '🛵' : activeRoleTab === 'citizen' ? '🦥' : '🏪'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">
                          {activeRoleTab === 'knight' && 'เส้นทางเลเวลชุดเกราะอัศวิน (Knight Driver 10 Tiers)'}
                          {activeRoleTab === 'citizen' && 'เส้นทางเลเวลพลเมืองผู้โดยสาร (Citizen 10 Tiers)'}
                          {activeRoleTab === 'merchant' && 'เส้นทางเลเวลร้านค้าพันธมิตร (Partner Store 10 Tiers)'}
                        </h3>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          XP_DIFFICULTY_CONFIG[activeRoleTab].tagColor
                        }`}>
                          ⚡ {XP_DIFFICULTY_CONFIG[activeRoleTab].multiplierLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">
                        {XP_DIFFICULTY_CONFIG[activeRoleTab].description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyLevelToApp(activeRoleTab, sliderLevel)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto"
                  >
                    <span>จำลองตั้งค่า LV.{sliderLevel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 10 Tier Cards List */}
              <div className="space-y-4">
                {getTiersForActiveRole().map((tier, idx) => {
                  const isCurrent = sliderLevel >= tier.minLevel && sliderLevel <= tier.maxLevel;
                  const isSelected = selectedTierIndex === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectTier(idx)}
                      className={`p-4 sm:p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                        isCurrent
                          ? 'bg-gradient-to-br from-[#0F2248] via-[#0A1633] to-[#070E20] border-cyan-400 shadow-[0_0_25px_rgba(0,210,255,0.25)]'
                          : isSelected
                          ? 'bg-black/50 border-white/30'
                          : 'bg-black/30 hover:bg-black/40 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Active Indicator Pin */}
                      {isCurrent && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-cyan-500 to-blue-600 text-slate-950 text-[10px] font-mono font-black rounded-bl-2xl shadow-md flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>CURRENT ACTIVE LEVEL</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                            {tier.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                                {tier.levelRange}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40">
                                {tier.badge}
                              </span>
                            </div>
                            <h4 className="text-sm sm:text-base font-black text-white mt-1">
                              {tier.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {tier.titleEn}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono text-xs">
                          <span className="text-[10px] text-slate-400 block">เกณฑ์สะสมขั้นต่ำ</span>
                          <strong className="text-amber-400">{tier.xpRequired.toLocaleString()} XP</strong>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {tier.description}
                      </p>

                      {tier.specialUnlockCondition && (
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-300 font-mono mb-3">
                          {tier.specialUnlockCondition}
                        </div>
                      )}

                      {/* Key Perks Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10">
                        {tier.keyPerks.map((perk, pIdx) => (
                          <div key={pIdx} className="p-2 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-300 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <span className="leading-snug">{perk}</span>
                          </div>
                        ))}
                      </div>

                      {/* Exclusive Reward Pill */}
                      {tier.exclusiveReward && (
                        <div className="mt-3 p-2.5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-purple-950/40 to-black/60 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between font-mono">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-[#FFD700]" />
                            <span><strong>เอกสิทธิ์พิเศษ:</strong> {tier.exclusiveReward}</span>
                          </div>
                          <span className="text-[10px] text-[#FFD700]">UNLOCKED</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/50 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-400 font-mono text-center sm:text-left">
            <span>🛡️ ระบบ 10 ระดับยศผูกเข้ากับกองทุนสวัสดิการ 2฿ และการเงินอธิปไตยแบบ 100%</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(600);
                onClose();
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={() => handleApplyLevelToApp(activeRoleTab === 'comparison' ? 'citizen' : activeRoleTab, sliderLevel)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg transition-all"
            >
              นำเลเวล {sliderLevel} ไปใช้งานในแอป
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
