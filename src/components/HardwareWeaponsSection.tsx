import React, { useState } from 'react';
import { TEN_WEAPONS } from '../data/bibleData';
import { WeaponItem } from '../types';
import { playTactileBlip, playNfcSyncSound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Wrench, 
  Sparkles, 
  Fingerprint, 
  Shield, 
  Headphones, 
  Smartphone, 
  CloudRain, 
  Cat, 
  Lock, 
  HeartHandshake, 
  Umbrella, 
  Award,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface Props {
  audioEnabled: boolean;
}

export const HardwareWeaponsSection: React.FC<Props> = ({ audioEnabled }) => {
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponItem>(TEN_WEAPONS[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [nfcTestSuccess, setNfcTestSuccess] = useState<boolean>(false);

  const categories = ['All', 'Combat & Control', 'Communication', 'Armor Defense', 'All-Weather Armor', 'Pet Logistics', 'High-Value Express', 'VIP Hospitality', 'Sovereign ID'];

  const filteredWeapons = categoryFilter === 'All' 
    ? TEN_WEAPONS 
    : TEN_WEAPONS.filter(w => w.category === categoryFilter || (categoryFilter === 'Combat & Control' && (w.category === 'Combat & Control' || w.category === 'Cockpit Tech' || w.category === 'Elder & Mobility Care')));

  const getWeaponIcon = (iconName: string) => {
    switch (iconName) {
      case 'Headphones': return <Headphones className="w-6 h-6" />;
      case 'ShieldAlert': return <Shield className="w-6 h-6" />;
      case 'Shield': return <Shield className="w-6 h-6" />;
      case 'Smartphone': return <Smartphone className="w-6 h-6" />;
      case 'CloudRain': return <CloudRain className="w-6 h-6" />;
      case 'Cat': return <Cat className="w-6 h-6" />;
      case 'Lock': return <Lock className="w-6 h-6" />;
      case 'HeartHandshake': return <HeartHandshake className="w-6 h-6" />;
      case 'Umbrella': return <Umbrella className="w-6 h-6" />;
      case 'Award': return <Award className="w-6 h-6" />;
      default: return <Wrench className="w-6 h-6" />;
    }
  };

  const handleTestNfcBadge = () => {
    if (audioEnabled) playNfcSyncSound();
    setNfcTestSuccess(true);
    confetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00D2FF', '#FFFFFF']
    });
    setTimeout(() => setNfcTestSuccess(false), 4000);
  };

  return (
    <section className="space-y-10">
      {/* Title Header */}
      <div className="relative rounded-2xl overflow-hidden border border-[#00D2FF]/30 bg-gradient-to-br from-[#070D1E] via-[#091B3E] to-[#050A17] p-6 sm:p-10 shadow-[0_0_30px_rgba(0,210,255,0.15)]">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] text-xs font-bold tracking-wide">
            <Wrench className="w-3.5 h-3.5" /> BIBLE CHAPTER 05 : THE 10 SACRED HARDWARE
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            10 มหาศาสตราวุธทางการ <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FFE380] to-[#00D2FF]">
              The Official Hardware of WINRIDER Knights
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
            อาวุธและอุปกรณ์ภาคสนาม 10 ชิ้นที่ผ่านการวิจัยและออกแบบพิเศษเพื่อยกระดับอัศวินมอเตอร์ไซค์ สลักลายทองคำ 3% ตามหลักปรัชญาจักรวาล ทนทาน ปลอดภัย และเชื่อมต่อกับระบบ AI ได้อย่างไร้รอยต่อ
          </p>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['All', 'Communication', 'Armor Defense', 'All-Weather Armor', 'Pet Logistics', 'High-Value Express', 'VIP Hospitality', 'Sovereign ID'].map((cat) => (
          <button
            key={cat}
            id={`filter-weapon-${cat}`}
            onClick={() => {
              setCategoryFilter(cat);
              if (audioEnabled) playTactileBlip(600);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
              categoryFilter === cat
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                : 'bg-[#070D1E] text-slate-300 border-white/10 hover:border-white/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of 10 Weapons Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWeapons.map((weapon) => {
          const isSelected = selectedWeapon.id === weapon.id;
          return (
            <div
              key={weapon.id}
              id={`weapon-card-${weapon.id}`}
              onClick={() => {
                setSelectedWeapon(weapon);
                if (audioEnabled) playTactileBlip(750);
              }}
              className={`p-6 rounded-2xl cursor-pointer transition-all border flex flex-col justify-between relative group ${
                isSelected
                  ? 'bg-gradient-to-b from-[#0C2454] to-[#070D1E] border-[#00D2FF] shadow-[0_0_25px_rgba(0,210,255,0.35)] ring-1 ring-cyan-400'
                  : 'bg-[#070D1E] border-white/10 hover:border-cyan-500/50 hover:bg-[#0A1633]'
              }`}
            >
              {/* Card Top Row */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                    isSelected 
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.4)]' 
                      : 'bg-white/5 text-slate-300 border-white/10 group-hover:text-cyan-300'
                  }`}>
                    {getWeaponIcon(weapon.iconName)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-slate-400 border border-white/10">
                      {weapon.code}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30 font-bold">
                      LVL {weapon.levelRequired}+
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{weapon.category}</span>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
                    {weapon.id}. {weapon.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{weapon.nameEn}</p>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {weapon.description}
                </p>
              </div>

              {/* 3% Gold Accent Feature Tag */}
              <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-start gap-1.5 text-[11px] text-[#FFD700] bg-[#FFD700]/5 p-2 rounded-lg border border-[#FFD700]/20">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{weapon.goldAccent}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Weapon Technical Dossier & Telemetry */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#070D1E] via-[#0A1838] to-[#070D1E] border border-cyan-500/40 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-bold text-xl shadow-[0_0_15px_rgba(0,210,255,0.4)]">
              {getWeaponIcon(selectedWeapon.iconName)}
            </div>
            <div>
              <span className="text-xs font-mono text-cyan-400 uppercase font-bold">SACRED HARDWARE DOSSIER</span>
              <h3 className="text-xl sm:text-2xl font-black text-white">{selectedWeapon.name} — {selectedWeapon.nameEn}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">ระดับที่ปลดล็อก:</span>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40">
              LEVEL {selectedWeapon.levelRequired} REQUIREMENT
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">คำอธิบายและมาตรฐานวิศวกรรม</h4>
            <p className="text-xs text-slate-200 leading-relaxed">{selectedWeapon.description}</p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">ประโยชน์ยุทธวิธีภาคสนาม</h4>
            <p className="text-xs text-emerald-300 leading-relaxed">{selectedWeapon.tacticalBenefit}</p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-2">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> เกียรติยศทองคำ 3% (3% Gold Spec)
            </h4>
            <p className="text-xs text-amber-200 leading-relaxed">{selectedWeapon.goldAccent}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 font-mono uppercase">SPECIFICATIONS MATRIX:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {selectedWeapon.specs.map((spec, sIdx) => (
              <div key={sIdx} className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="truncate">{spec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Special Highlight: Weapon #10 - Identity Badge NFC Test Station */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#201704] via-[#0E1B38] to-[#070D1E] border border-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.2)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#FFD700] uppercase tracking-widest">
            <Fingerprint className="w-4 h-4" /> WEAPON #10 : IMPERIAL NFC IDENTITY CORE
          </div>
          <h3 className="text-2xl font-black text-white">ทดสอบแตะตราสัญลักษณ์ Identity Badge (ทองคำแท้ 3%)</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            หัวใจหลักของการเชื่อมต่ออัศวินกับจักรวาล WINRIDER.AI: แตะเพื่อเปิดประตูปราสาท WIN-Hub, สลับตู้ชาร์จแบตเตอรี่, รับเงินทันที, และบันทึก XP บนสมุดบัญชีอธิปไตย
          </p>
        </div>

        <button
          id="test-nfc-badge-btn"
          onClick={handleTestNfcBadge}
          className={`px-8 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${
            nfcTestSuccess
              ? 'bg-[#FFD700] text-slate-950 shadow-[0_0_25px_#FFD700] scale-105'
              : 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(255,215,0,0.4)]'
          }`}
        >
          <Fingerprint className="w-5 h-5" />
          <span>{nfcTestSuccess ? '✓ SYNCED WITH SOVEREIGN CORE!' : 'แตะเพื่อทดสอบ NFC 3% GOLD'}</span>
        </button>
      </div>
    </section>
  );
};
