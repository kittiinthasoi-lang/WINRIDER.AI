import React, { useState } from 'react';
import { ArmorSuit } from '../data/armorSuits';
import { Lock, Sparkles, Shield, Eye, AlertTriangle, Zap, Check, ChevronRight } from 'lucide-react';

interface ArmorSuitVisualCardProps {
  suit: ArmorSuit;
  isEquipped?: boolean;
  selectedVariantIndex?: number;
  onSelectVariant?: (idx: number) => void;
  onEquip?: () => void;
  audioEnabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ArmorSuitVisualCard: React.FC<ArmorSuitVisualCardProps> = ({
  suit,
  isEquipped = false,
  selectedVariantIndex = 0,
  onSelectVariant,
  onEquip,
  size = 'md'
}) => {
  const [activeTab, setActiveTab] = useState<'jacket' | 'helmet' | 'both'>('both');
  const [isHovered, setIsHovered] = useState(false);

  const isClassified = !suit.isRevealed;

  // Render Visual Graphic based on Suit Level and Theme
  const renderSuitVisual = () => {
    if (isClassified) {
      return (
        <div className="relative w-full h-64 sm:h-72 rounded-2xl bg-gradient-to-b from-[#0B1021] via-[#080B17] to-[#04060E] border-2 border-amber-500/40 flex flex-col items-center justify-center p-6 text-center overflow-hidden group">
          {/* Holographic Classified Watermark Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
          
          {/* Animated Laser Scanline */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse opacity-75 top-1/4" />
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse opacity-60 bottom-1/3" />

          {/* Warning Diagonal Hazard Stripe Frame */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-amber-400 bg-black/60 px-3 py-1 rounded-lg border border-amber-500/30">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400 animate-bounce" />
              SOVEREIGN CLASSIFIED ARCHIVE
            </span>
            <span className="text-red-400 font-black animate-pulse">TOP SECRET</span>
          </div>

          {/* Holographic Silhouette with Lock */}
          <div className="relative my-auto flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-dashed border-amber-400/50 flex items-center justify-center relative shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <div className="w-16 h-16 rounded-full bg-black/70 flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 text-base">🔒</span>
            </div>

            <div className="mt-4 space-y-1">
              <div className="inline-block px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-xs font-black tracking-wider">
                ยังไม่เปิดเผย (CLASSIFIED)
              </div>
              <h4 className="text-sm font-bold text-white mt-1">
                {suit.name}
              </h4>
              <p className="text-[11px] text-amber-200/80 font-mono max-w-xs px-2">
                {suit.classifiedNotice || 'สภาอัศวิน WINRIDER.AI ยังไม่เปิดเผยตัวอย่างชุดเกราะเลเวลนี้ เพื่อรักษาความลับสูงสุด'}
              </p>
            </div>
          </div>

          {/* Unlock Criteria Teaser */}
          <div className="w-full mt-2 pt-2 border-t border-amber-500/20 text-[10px] font-mono text-slate-300 bg-black/40 rounded-xl p-2">
            <span className="text-amber-400 font-bold">✦ เงื่อนไขเปิดเผย: </span>
            {suit.specialCondition || `บรรลุ Level ${suit.levelRequired} และสะสมชุดเกราะผู้พิชิตครบ 4 แบบ`}
          </div>
        </div>
      );
    }

    // LEVEL 1 - 70 REVEALED SUIT GRAPHICS
    return (
      <div 
        className="relative w-full h-72 sm:h-80 rounded-2xl bg-gradient-to-b from-[#091530] via-[#060D1E] to-[#03060E] border border-cyan-500/30 overflow-hidden flex flex-col justify-between p-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background Atmosphere Aura */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-25 transition-all duration-700"
          style={{
            background: `radial-gradient(circle at 50% 35%, ${suit.accentColor}, transparent 65%)`
          }}
        />

        {/* Top Floating Badge & Level Marker */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-lg bg-black/70 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
              {suit.code}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono">
              {suit.levelRangeText}
            </span>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10 font-mono">
            {suit.visualTag}
          </span>
        </div>

        {/* CENTER SUIT VISUAL CANVAS / GRAPHICAL DIAGRAM */}
        <div className="relative z-10 flex-1 flex items-center justify-center my-1">
          {/* LEVEL 1-10: STANDARD BLUE NEON HOODIE */}
          {suit.id === 'suit-v1' && (
            <div className="relative w-48 h-52 flex flex-col items-center justify-center">
              {/* Helmet on Stand */}
              <div className="w-20 h-16 rounded-t-full rounded-b-xl bg-slate-900 border-2 border-cyan-400 relative shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center justify-center">
                {/* Blue Glowing Crest */}
                <div className="absolute top-1.5 w-4 h-4 bg-cyan-400 rounded-sm clip-path-diamond flex items-center justify-center text-[7px] text-slate-950 font-black">
                  🛡️
                </div>
                {/* Clear Visor */}
                <div className="w-14 h-6 bg-cyan-950/80 rounded-md border border-cyan-300/60 mt-2 flex items-center justify-center">
                  <span className="text-[7px] text-cyan-300 font-mono">CLEAR UV400</span>
                </div>
              </div>
              {/* Hoodie Body */}
              <div className="w-40 h-32 -mt-2 bg-gradient-to-b from-[#0E1A33] to-[#0A1324] rounded-t-3xl rounded-b-2xl border-2 border-cyan-400/60 relative flex flex-col items-center pt-2 shadow-[0_0_20px_rgba(0,210,255,0.2)]">
                {/* Chest Logo */}
                <div className="text-[10px] font-black text-cyan-300 tracking-wider font-mono">
                  WINRIDER.AI
                </div>
                {/* Chest Glowing Badge */}
                <div className="mt-1 w-7 h-7 rounded-lg bg-cyan-500/30 border border-cyan-300 flex items-center justify-center shadow-[0_0_10px_#00D2FF]">
                  <Shield className="w-4 h-4 text-cyan-300" />
                </div>
                {/* Neon Zipper Line */}
                <div className="w-0.5 h-12 bg-cyan-400 shadow-[0_0_8px_#00D2FF] mt-1" />
                {/* Neon Side Piping */}
                <div className="absolute left-2 inset-y-4 w-0.5 bg-cyan-400/80 rounded-full" />
                <div className="absolute right-2 inset-y-4 w-0.5 bg-cyan-400/80 rounded-full" />
              </div>
            </div>
          )}

          {/* LEVEL 11-20: BRONZE HIGH-COLLAR JACKET WITH GOLD SHOULDER LINES */}
          {suit.id === 'suit-v2' && (
            <div className="relative w-48 h-52 flex flex-col items-center justify-center">
              {/* Helmet */}
              <div className="w-20 h-16 rounded-t-full rounded-b-xl bg-slate-900 border-2 border-amber-600 relative shadow-[0_0_15px_rgba(205,127,50,0.4)] flex items-center justify-center">
                <div className="w-14 h-6 bg-amber-950/80 rounded-md border border-amber-500/70 mt-2 flex items-center justify-center">
                  <span className="text-[7px] text-amber-300 font-mono">BRONZE TINT</span>
                </div>
              </div>
              {/* Jacket */}
              <div className="w-40 h-32 -mt-2 bg-gradient-to-b from-[#1E140C] to-[#120B06] rounded-t-2xl rounded-b-2xl border-2 border-amber-600/70 relative flex flex-col items-center pt-2">
                <div className="text-[10px] font-black text-amber-400 tracking-wider font-mono">
                  WINRIDER.AI
                </div>
                <div className="mt-1 w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-400" />
                </div>
                <div className="w-0.5 h-12 bg-amber-500 mt-1" />
                {/* Gold Circuit Lines on Shoulders */}
                <div className="absolute top-2 left-3 right-3 flex justify-between">
                  <span className="text-[8px] text-amber-400 font-mono font-bold">⚡---</span>
                  <span className="text-[8px] text-amber-400 font-mono font-bold">---⚡</span>
                </div>
              </div>
            </div>
          )}

          {/* LEVEL 21-30: SILVER HOODED TACTICAL CYBER JACKET */}
          {suit.id === 'suit-v3' && (
            <div className="relative w-48 h-52 flex flex-col items-center justify-center">
              {/* Helmet with Silver Mirrored Visor */}
              <div className="w-20 h-16 rounded-t-full rounded-b-xl bg-slate-800 border-2 border-slate-300 relative shadow-[0_0_18px_rgba(224,230,237,0.5)] flex items-center justify-center">
                <div className="w-14 h-6 bg-slate-300/40 rounded-md border border-white mt-2 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-[7px] text-slate-900 font-black font-mono">SILVER HUD</span>
                </div>
              </div>
              {/* Jacket */}
              <div className="w-40 h-32 -mt-2 bg-gradient-to-b from-[#1A2538] to-[#0F1724] rounded-t-3xl rounded-b-2xl border-2 border-slate-300/80 relative flex flex-col items-center pt-2">
                <div className="text-[10px] font-black text-slate-100 tracking-wider font-mono">
                  WINRIDER.AI
                </div>
                <div className="mt-1 w-7 h-7 rounded-lg bg-slate-300/30 border border-white flex items-center justify-center shadow-[0_0_12px_#FFF]">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="w-0.5 h-12 bg-cyan-300 shadow-[0_0_8px_#00D2FF] mt-1" />
                {/* Silver Arm Trim */}
                <div className="absolute left-2 top-6 text-[7px] font-mono text-cyan-300">WR.AI</div>
                <div className="absolute right-2 top-6 text-[7px] font-mono text-cyan-300">QR 🔲</div>
              </div>
            </div>
          )}

          {/* LEVEL 31-40: GOLD QUILTED LEATHER WITH CAPILLARY NEURAL ROOT MAP */}
          {suit.id === 'suit-v4' && (
            <div className="relative w-48 h-52 flex flex-col items-center justify-center">
              {/* Helmet */}
              <div className="w-20 h-16 rounded-t-full rounded-b-xl bg-slate-950 border-2 border-[#FFD700] relative shadow-[0_0_20px_rgba(255,215,0,0.5)] flex items-center justify-center">
                <div className="w-14 h-6 bg-amber-500/50 rounded-md border border-amber-300 mt-2 flex items-center justify-center">
                  <span className="text-[7px] text-slate-950 font-black font-mono">GOLD MIRROR</span>
                </div>
              </div>
              {/* Quilted Jacket with Root Map */}
              <div className="w-40 h-32 -mt-2 bg-gradient-to-b from-[#211A0E] to-[#120E06] rounded-t-2xl rounded-b-2xl border-2 border-[#FFD700] relative flex flex-col items-center pt-2 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                <div className="text-[10px] font-black text-[#FFD700] tracking-wider font-mono">
                  WR.AI WINRIDER.AI
                </div>
                {/* Diamond Quilt & Neural Root Lines */}
                <div className="my-0.5 text-[8px] text-[#FFD700] font-mono tracking-tighter opacity-90">
                  🌿 ≋ 🌿 ≋ 🌿
                </div>
                <div className="w-7 h-7 rounded-lg bg-amber-400/30 border border-[#FFD700] flex items-center justify-center shadow-[0_0_12px_#FFD700]">
                  <Shield className="w-4 h-4 text-[#FFD700]" />
                </div>
                <div className="w-0.5 h-10 bg-[#FFD700] mt-1 shadow-[0_0_8px_#FFD700]" />
                <div className="absolute bottom-2 text-[7px] font-mono text-amber-300/80">
                  3% REAL GOLD THREAD
                </div>
              </div>
            </div>
          )}

          {/* LEVEL 41-50: PLATINUM QUILTED WITH GOLD PCB ELECTRONIC CIRCUIT */}
          {suit.id === 'suit-v5' && (
            <div className="relative w-48 h-52 flex flex-col items-center justify-center">
              {/* Helmet */}
              <div className="w-20 h-16 rounded-t-full rounded-b-xl bg-slate-950 border-2 border-cyan-300 relative shadow-[0_0_20px_rgba(160,232,255,0.6)] flex items-center justify-center">
                <div className="w-14 h-6 bg-cyan-500/40 rounded-md border border-cyan-200 mt-2 flex items-center justify-center">
                  <span className="text-[7px] text-cyan-200 font-black font-mono">AR HUD 360°</span>
                </div>
              </div>
              {/* Jacket with PCB Tracks */}
              <div className="w-40 h-32 -mt-2 bg-gradient-to-b from-[#101D33] to-[#0A111F] rounded-t-2xl rounded-b-2xl border-2 border-cyan-300 relative flex flex-col items-center pt-2">
                <div className="text-[10px] font-black text-cyan-200 tracking-wider font-mono">
                  WINRIDER.AI
                </div>
                {/* PCB Motherboard Circuit Pattern */}
                <div className="text-[8px] text-amber-300 font-mono my-0.5 tracking-tighter">
                  ├─■─┤ PCB CIRCUIT ├─■─┤
                </div>
                <div className="w-7 h-7 rounded-lg bg-cyan-400/30 border border-cyan-300 flex items-center justify-center shadow-[0_0_12px_#00D2FF]">
                  <Shield className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="w-0.5 h-10 bg-cyan-300 shadow-[0_0_8px_#00D2FF] mt-1" />
                <div className="absolute bottom-2 text-[7px] font-mono text-cyan-300">
                  KINETIC CARBON FIBER
                </div>
              </div>
            </div>
          )}

          {/* LEVEL 51-60: DIAMOND QUILTED WITH BLUE NEON CONTOUR & GOLD PCB CIRCUIT */}
          {suit.id === 'suit-v6' && (
            <div className="relative w-48 h-52 flex flex-col items-center justify-center">
              {/* Helmet */}
              <div className="w-20 h-16 rounded-t-full rounded-b-xl bg-slate-950 border-2 border-cyan-400 relative shadow-[0_0_25px_rgba(103,232,249,0.8)] flex items-center justify-center">
                <div className="w-14 h-6 bg-cyan-400/60 rounded-md border border-white mt-2 flex items-center justify-center">
                  <span className="text-[7px] text-slate-950 font-black font-mono">DIAMOND PRISM</span>
                </div>
              </div>
              {/* Jacket with Bright Neon Contour Frame */}
              <div className="w-40 h-32 -mt-2 bg-gradient-to-b from-[#0E2548] to-[#071326] rounded-t-2xl rounded-b-2xl border-2 border-cyan-400 relative flex flex-col items-center pt-2 shadow-[0_0_30px_rgba(0,210,255,0.4)]">
                {/* Bright Cyan Outer Neon Contour */}
                <div className="absolute inset-1 rounded-xl border border-cyan-300 shadow-[0_0_12px_#00D2FF] pointer-events-none" />
                <div className="text-[10px] font-black text-white tracking-wider font-mono z-10">
                  WINRIDER.AI
                </div>
                <div className="text-[8px] text-amber-300 font-mono my-0.5 tracking-tighter z-10">
                  [ GOLD PCB + PLASMA NEON ]
                </div>
                <div className="w-7 h-7 rounded-lg bg-cyan-400/40 border border-white flex items-center justify-center shadow-[0_0_15px_#00D2FF] z-10">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="w-0.5 h-10 bg-cyan-400 shadow-[0_0_10px_#00D2FF] mt-1 z-10" />
                <div className="absolute bottom-2 text-[7px] font-mono text-cyan-200 z-10">
                  GORE-TEX PRO + DIAMOND MESH
                </div>
              </div>
            </div>
          )}

          {/* LEVEL 61-70: CONQUEROR 3K CARBON WITH LIGHTNING STRIKE WINGS (4 VARIANTS) */}
          {suit.id === 'suit-v7' && (
            <div className="relative w-48 h-52 flex flex-col items-center justify-center">
              {/* Helmet */}
              <div className={`w-20 h-16 rounded-t-full rounded-b-xl bg-slate-950 border-2 ${
                selectedVariantIndex === 1 ? 'border-cyan-400 shadow-[0_0_20px_#00D2FF]' :
                selectedVariantIndex === 2 ? 'border-amber-400 shadow-[0_0_20px_#FFD700]' :
                'border-red-500 shadow-[0_0_20px_#EF4444]'
              } relative flex items-center justify-center`}>
                <div className="w-14 h-6 bg-slate-900 rounded-md border border-amber-400 mt-2 flex items-center justify-center">
                  <span className="text-[7px] text-amber-300 font-black font-mono">CONQUEROR HUD</span>
                </div>
              </div>
              {/* Carbon Jacket with Lightning Wings */}
              <div className="w-42 h-32 -mt-2 bg-gradient-to-b from-[#1A1A1E] to-[#0D0D11] rounded-t-2xl rounded-b-2xl border-2 border-amber-400 relative flex flex-col items-center pt-2 shadow-[0_0_25px_rgba(255,215,0,0.3)]">
                {/* 3K Carbon Mesh Pattern simulation */}
                <div className="text-[10px] font-black text-[#FFD700] tracking-wider font-mono">
                  WINRIDER.AI
                </div>

                {/* Dynamic Lightning Strike Blades */}
                <div className="flex items-center justify-between w-36 px-2 my-1">
                  <span className={`text-xs font-black ${selectedVariantIndex === 1 ? 'text-cyan-400 animate-pulse' : 'text-amber-400'}`}>
                    ⚡◣
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-amber-400/30 border border-[#FFD700] flex items-center justify-center shadow-[0_0_12px_#FFD700]">
                    <Shield className="w-3.5 h-3.5 text-[#FFD700]" />
                  </div>
                  <span className={`text-xs font-black ${selectedVariantIndex === 1 ? 'text-cyan-400 animate-pulse' : 'text-amber-400'}`}>
                    ◢⚡
                  </span>
                </div>

                <div className="w-0.5 h-9 bg-cyan-400 shadow-[0_0_8px_#00D2FF]" />
                <div className="absolute bottom-1 text-[7px] font-mono text-amber-300">
                  {suit.subVariants?.[selectedVariantIndex] || '3K CARBON + LIGHTNING BLADES'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION & VARIANT SELECTOR */}
        <div className="relative z-10 space-y-1.5 pt-2 border-t border-white/10">
          {/* 4 Variants Selector for Level 61-70 */}
          {suit.subVariants && suit.subVariants.length > 0 && (
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
              {suit.subVariants.map((variantName, vIdx) => (
                <button
                  key={vIdx}
                  onClick={() => onSelectVariant?.(vIdx)}
                  className={`px-2 py-0.5 rounded-lg text-[8px] font-mono font-bold whitespace-nowrap transition-all border ${
                    selectedVariantIndex === vIdx
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                      : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {variantName}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-[10px] text-slate-300 font-mono">
              <strong>วัสดุ: </strong>
              <span className="text-white line-clamp-1">{suit.jacket.material.slice(0, 24)}...</span>
            </div>

            {isEquipped ? (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 flex items-center gap-1">
                <Check className="w-3 h-3" />
                กำลังสวมใส่
              </span>
            ) : (
              <button
                onClick={onEquip}
                className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1 shadow-sm transition-all"
              >
                <span>สวมใส่ชุดนี้</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderSuitVisual()}
    </div>
  );
};
