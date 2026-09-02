import React, { useState } from 'react';
import { ARMOR_TIERS } from '../data/bibleData';
import { playTactileBlip, playLevelUpFanfare } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Shield, 
  Sparkles, 
  Lock, 
  Cpu, 
  BatteryCharging, 
  Radio, 
  Sliders, 
  Check, 
  Palette,
  Award
} from 'lucide-react';

interface Props {
  audioEnabled: boolean;
}

export const ArmorTechSection: React.FC<Props> = ({ audioEnabled }) => {
  const [currentLevel, setCurrentLevel] = useState<number>(100);
  const [selectedEquippedTierIndex, setSelectedEquippedTierIndex] = useState<number>(4);
  const [zipperInspectionMode, setZipperInspectionMode] = useState<'sovereign' | 'kinetic' | 'anti_theft'>('sovereign');

  // Godlike Customizer state (for Lvl 91-100)
  const [godlikeAura, setGodlikeAura] = useState<'Cosmic Neon' | 'Imperial Gold' | 'Shadow Obsidian'>('Imperial Gold');
  const [customCapeDesign, setCustomCapeDesign] = useState<string>('Thonburi Lion Crest');

  // Find max unlocked tier among the 10 ranks
  const calculateTierIndexForLevel = (lvl: number) => {
    if (lvl >= 91) return 9; // Godlike Knight
    if (lvl >= 81) return 8; // Legendary Knight
    if (lvl >= 71) return 7; // Emperor Knight
    if (lvl >= 61) return 6; // Conqueror Knight
    if (lvl >= 51) return 5; // Diamond Knight
    if (lvl >= 41) return 4; // Platinum Knight
    if (lvl >= 31) return 3; // Gold Knight
    if (lvl >= 21) return 2; // Silver Knight
    if (lvl >= 11) return 1; // Bronze Knight
    return 0; // Standard Knight
  };

  const maxUnlockedTierIndex = calculateTierIndexForLevel(currentLevel);

  const handleLevelChange = (newLevel: number) => {
    setCurrentLevel(newLevel);
    if (audioEnabled) playTactileBlip(400 + newLevel * 8);

    const newMaxTier = calculateTierIndexForLevel(newLevel);
    if (newMaxTier > maxUnlockedTierIndex) {
      if (audioEnabled) playLevelUpFanfare();
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00D2FF', '#FFD700', '#FFFFFF']
      });
    }
  };

  const handleEquipArmor = (index: number) => {
    if (index <= maxUnlockedTierIndex) {
      setSelectedEquippedTierIndex(index);
      if (audioEnabled) playTactileBlip(1100);
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.5, x: 0.5 },
        colors: ['#00D2FF', '#FFD700']
      });
    }
  };

  const equippedTier = ARMOR_TIERS[selectedEquippedTierIndex];

  return (
    <section className="space-y-10">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#00D2FF]/30 bg-gradient-to-br from-[#070D1E] via-[#0D183B] to-[#050A17] p-6 sm:p-10 shadow-[0_0_30px_rgba(0,210,255,0.15)]">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] text-xs font-bold tracking-wide">
            <Shield className="w-3.5 h-3.5" /> BIBLE CHAPTER 04 : THE ARMOR & TECH
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            คัมภีร์ชุดเกราะและเทคโนโลยี <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] via-[#70E0FF] to-[#FFD700]">
              วิวัฒนาการเลเวล 1-100 & The Guardian Zipper อธิปไตย
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
            ชุดเกราะของอัศวิน WINRIDER.AI <strong>ปลดล็อกตาม XP เท่านั้น (ห้ามซื้อขายเด็ดขาด)</strong> แต่ละเลเวลมอบเกียรติยศและการปกป้องที่สูงขึ้น พร้อมระบบซิปป้องกันแบรนด์ The Guardian Zipper ฝังชิป GPS พลังงานจลน์รักษาอธิปไตย
          </p>
        </div>
      </div>

      {/* Interactive Level Progression Engine */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-cyan-400 font-mono uppercase">XP Progression & Wardrobe Matrix</span>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-[#FFD700]" /> ระบบทดสอบระดับเลเวลเกราะอัศวิน
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">เลเวลปัจจุบัน:</span>
            <span className="text-lg font-black text-cyan-300 font-mono px-3 py-0.5 rounded-lg bg-cyan-950 border border-cyan-500/40">
              LVL {currentLevel}
            </span>
          </div>
        </div>

        {/* Level Range Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span>ลากเพื่อจำลองเลเวล XP:</span>
            <span className="text-amber-400 font-mono">
              {currentLevel >= 91 ? '🌌 GODLIKE KNIGHT (1 เดียวในโลก)' : currentLevel >= 81 ? '🌟 LEGENDARY KNIGHT (3 แบบแรร์)' : currentLevel >= 71 ? '👑 EMPEROR KNIGHT' : currentLevel >= 61 ? '⚔️ CONQUEROR KNIGHT (4 แบบ)' : currentLevel >= 51 ? '💎 DIAMOND KNIGHT' : currentLevel >= 41 ? '✨ PLATINUM KNIGHT' : currentLevel >= 31 ? '🥇 GOLD KNIGHT' : currentLevel >= 21 ? '🥈 SILVER KNIGHT' : currentLevel >= 11 ? '🥉 BRONZE KNIGHT' : '🛡️ STANDARD KNIGHT'}
            </span>
          </div>
          <input 
            id="slider-armor-level"
            type="range" 
            min="1" 
            max="100" 
            value={currentLevel}
            onChange={(e) => handleLevelChange(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono flex-wrap gap-1">
            <span>Lv.1-10 (Standard)</span>
            <span>Lv.11-20 (Bronze)</span>
            <span>Lv.21-30 (Silver)</span>
            <span>Lv.31-40 (Gold)</span>
            <span>Lv.41-50 (Platinum)</span>
            <span>Lv.51-60 (Diamond)</span>
            <span>Lv.61-70 (Conqueror)</span>
            <span>Lv.71-80 (Emperor)</span>
            <span>Lv.81-90 (Legendary)</span>
            <span>Lv.91-100 (Godlike)</span>
          </div>
        </div>

        {/* Armor Tiers Cards Grid (10 Ranks) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-2">
          {ARMOR_TIERS.map((tier, idx) => {
            const isUnlocked = idx <= maxUnlockedTierIndex;
            const isEquipped = selectedEquippedTierIndex === idx;

            return (
              <div
                key={tier.levelRange}
                id={`armor-tier-card-${idx}`}
                onClick={() => isUnlocked && handleEquipArmor(idx)}
                className={`p-4 rounded-xl transition-all border relative flex flex-col justify-between ${
                  !isUnlocked
                    ? 'opacity-40 bg-black/40 border-white/5 cursor-not-allowed'
                    : isEquipped
                    ? 'bg-gradient-to-b from-[#0A224D] to-[#070D1E] border-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.4)] cursor-pointer ring-1 ring-cyan-400'
                    : 'bg-black/30 border-white/10 hover:border-cyan-500/50 cursor-pointer'
                }`}
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-300">{tier.levelRange}</span>
                  {isEquipped ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> EQUIPPED
                    </span>
                  ) : !isUnlocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <span className="text-[9px] font-mono text-cyan-400 hover:underline">เลือกใส่</span>
                  )}
                </div>

                <div className="space-y-1 my-2">
                  <span className="text-[10px] text-amber-400 font-medium">{tier.badge}</span>
                  <h4 className="text-sm font-bold text-white leading-snug">{tier.title}</h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2">{tier.titleEn}</p>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1 text-[10px] text-slate-400">
                  {tier.perks.slice(0, 1).map((perk, pIdx) => (
                    <p key={pIdx} className="truncate text-cyan-300">• {perk}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Currently Equipped Armor Showcase Box */}
        <div className="p-5 rounded-xl bg-gradient-to-r from-[#0B1E48] via-[#07132F] to-[#070D1E] border border-cyan-500/40 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-700 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.4)]">
              <div className="w-full h-full bg-[#070D1E] rounded-[14px] flex items-center justify-center text-2xl">
                🛡️
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-300 uppercase">สวมใส่อยู่: {equippedTier.badge}</span>
              <h4 className="text-lg font-bold text-white">{equippedTier.title} — {equippedTier.titleEn}</h4>
              <p className="text-xs text-slate-300 max-w-xl mt-0.5">{equippedTier.description}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="text-xs text-emerald-400 font-mono font-semibold bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/30">
              ✓ กฎอิสระ: เลือกใส่ชุดที่เคยปลดล็อกได้ตลอดชีพ
            </span>
          </div>
        </div>
      </div>

      {/* The Guardian Zipper Technology Breakdown */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1E] border border-[#00D2FF]/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-widest">
              <Cpu className="w-3.5 h-3.5" /> PROPRIETARY HARDWARE TELEMETRY
            </div>
            <h3 className="text-xl font-bold text-white">The Guardian Zipper (ซิปอธิปไตย & ชิปติดตามพลังงานจลน์)</h3>
          </div>
          <span className="text-xs font-mono text-amber-400 px-2.5 py-1 rounded bg-amber-950/50 border border-amber-500/30">
            🔒 ความลับส่วนกลางอาณาจักร
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tech Spec 1 */}
          <div 
            id="zipper-tab-sovereign"
            onClick={() => {
              setZipperInspectionMode('sovereign');
              if (audioEnabled) playTactileBlip(600);
            }}
            className={`p-5 rounded-xl cursor-pointer transition-all border ${
              zipperInspectionMode === 'sovereign'
                ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                : 'bg-black/30 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300">
                <Sliders className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">1. ลิมิตหยุดเหนืออก (Brand Integrity)</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              โครงสร้างซิปถูกออกแบบตามหลักสรีรศาสตร์ ให้หยุดรูดลงที่ระดับเหนืออกพอดี ป้องกันการเปิดเสื้อจนสูญเสียเอกลักษณ์แบรนด์และความปลอดภัยขณะขับขี่ความเร็วสูง
            </p>
          </div>

          {/* Tech Spec 2 */}
          <div 
            id="zipper-tab-kinetic"
            onClick={() => {
              setZipperInspectionMode('kinetic');
              if (audioEnabled) playTactileBlip(800);
            }}
            className={`p-5 rounded-xl cursor-pointer transition-all border ${
              zipperInspectionMode === 'kinetic'
                ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                : 'bg-black/30 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">2. ชิปพลังงานจลน์ (Kinetic Power)</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ชิปที่หัวซิปเก็บเกี่ยวพลังงานจากการเคลื่อนไหวและการสั่นสะเทือนของรถมอเตอร์ไซค์ ไม่ต้องเปลี่ยนถ่านหรือเสียบชาร์จ มีพลังงานสำรองพร้อมส่งพิกัดตลอด 365 วัน
            </p>
          </div>

          {/* Tech Spec 3 */}
          <div 
            id="zipper-tab-anti_theft"
            onClick={() => {
              setZipperInspectionMode('anti_theft');
              if (audioEnabled) playTactileBlip(1000);
            }}
            className={`p-5 rounded-xl cursor-pointer transition-all border ${
              zipperInspectionMode === 'anti_theft'
                ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                : 'bg-black/30 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300">
                <Radio className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">3. NB-IoT Anti-Theft Stealth Tracker</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              หากชุดเกราะถูกโจรกรรมหรือนำไปดัดแปลง ระบบจะส่งสัญญาณพิกัดดาวเทียมยิงตรงเข้าวอร์รูมส่วนกลาง WIN-Hub ทันที เพื่อนำเกราะศักดิ์สิทธิ์กลับคืนสู่อาณาจักร
            </p>
          </div>
        </div>
      </div>

      {/* Godlike Level 91-100 Customization Studio */}
      {currentLevel >= 91 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#2B1B04] via-[#101935] to-[#070D1E] border border-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.3)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FFD700]/30 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFD700] uppercase tracking-widest">
                <Sparkles className="w-4 h-4" /> GODLIKE ARMOR DESIGN STUDIO (LVL 91-100)
              </div>
              <h3 className="text-2xl font-black text-white">ห้องสั่งตัดชุดเกราะเฉพาะบุคคล งบสนับสนุน 100,000 บาท</h3>
            </div>
            <span className="text-xs px-3 py-1 rounded bg-[#FFD700] text-slate-950 font-bold">
              GRANTED BY SOVEREIGN COMMAND
            </span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed">
            ยินดีด้วยท่านอัศวินอธิปไตยแห่งจักรวาล! ท่านได้รับสิทธิ์ออกแบบเกราะและอุปกรณ์เสริมสั่งทำพิเศษ 1 ชุด มูลค่า 100,000 บาท โดยทีมช่างศิลป์ชั้นสูง
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300">เลือกออร่าแสงพลังงานเกราะ (Aura Luminescence):</label>
              <div className="flex gap-2">
                {(['Cosmic Neon', 'Imperial Gold', 'Shadow Obsidian'] as const).map((aura) => (
                  <button
                    key={aura}
                    onClick={() => {
                      setGodlikeAura(aura);
                      if (audioEnabled) playTactileBlip(900);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      godlikeAura === aura
                        ? 'bg-[#FFD700] text-slate-950 border-[#FFD700] shadow-[0_0_12px_#FFD700]'
                        : 'bg-black/40 text-slate-300 border-white/10'
                    }`}
                  >
                    {aura}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300">ลวดลายสลักหลังชุดเกราะ (Custom Embossed Crest):</label>
              <div className="flex gap-2">
                {['Thonburi Lion Crest', 'Universal Slot Mandala', 'Dual Cyber Dragons'].map((crest) => (
                  <button
                    key={crest}
                    onClick={() => {
                      setCustomCapeDesign(crest);
                      if (audioEnabled) playTactileBlip(1000);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      customCapeDesign === crest
                        ? 'bg-cyan-400 text-slate-950 border-cyan-400 shadow-[0_0_12px_#00D2FF]'
                        : 'bg-black/40 text-slate-300 border-white/10'
                    }`}
                  >
                    {crest}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
