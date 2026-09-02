import React, { useState } from 'react';
import { SOVEREIGN_LEADERS, VISUAL_DNA } from '../data/bibleData';
import { playTactileBlip, speakThaiText } from '../utils/audio';
import { 
  Crown, 
  Sparkles, 
  Scale, 
  Compass, 
  Quote, 
  Volume2, 
  CheckCircle2, 
  Layers,
  Heart
} from 'lucide-react';

interface Props {
  audioEnabled: boolean;
  onNavigateToChapter: (chapterId: any) => void;
}

export const SovereignSoulSection: React.FC<Props> = ({ audioEnabled, onNavigateToChapter }) => {
  const [activeLeader, setActiveLeader] = useState<'ceo' | 'advisor'>('ceo');
  const [pledgeTaken, setPledgeTaken] = useState(false);
  const [selectedColorDna, setSelectedColorDna] = useState<'navy' | 'neonBlue' | 'gold'>('neonBlue');

  const handleSpeak = (text: string) => {
    if (audioEnabled) {
      speakThaiText(text);
    }
  };

  return (
    <section className="space-y-10">
      {/* Hero Banner with Cosmic Thonburi Aesthetic */}
      <div className="relative rounded-2xl overflow-hidden border border-[#00D2FF]/30 bg-gradient-to-br from-[#070D1E] via-[#0D1C3D] to-[#050A17] p-6 sm:p-10 shadow-[0_0_35px_rgba(0,210,255,0.15)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00D2FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#FFD700]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] text-xs font-bold tracking-wide">
            <Crown className="w-3.5 h-3.5" /> BIBLE CHAPTER 01 : THE SOVEREIGN SOUL
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            จิตวิญญาณและอัตลักษณ์ <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] via-[#70E0FF] to-[#FFD700]">
              มหายุทธศาสตร์อาณาจักร WINRIDER.AI
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl">
            เราไม่ได้สร้างเพียงแค่แพลตฟอร์มรับส่งผู้โดยสาร แต่เรากำลังสถาปนา <strong>"อาณาจักรอธิปไตยแห่งแรกของคนไทย"</strong> ที่ยืนหยัดบนหลักการ 
            <span className="text-cyan-300 font-semibold"> "Thailand is Home"</span> เข้าถึงทุกเส้นเลือดฝอย และยกย่องให้ 
            <span className="text-amber-300 font-semibold"> "P'Win First"</span> อัศวินต้องมีเกียรติยศและเสถียรภาพทางการเงินอย่างแท้จริง
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-colors">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Heart className="w-4 h-4" /> Philosophy
              </div>
              <p className="text-sm font-semibold text-white">"Thailand is Home"</p>
              <p className="text-xs text-slate-400 mt-1">เข้าถึงทุกเส้นเลือดฝอยในกรุงเทพฯ และเมืองไทย P'Win First อัศวินต้องมีเกียรติ</p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Scale className="w-4 h-4" /> Religion & Law
              </div>
              <p className="text-sm font-semibold text-white">Universal Wisdom & Logic</p>
              <p className="text-xs text-slate-400 mt-1">ความยุติธรรม ⚖️ ปราศจากค่าคอมมิชชั่นขูดรีด และความตื่นรู้ระดับจักรวาล 🌌</p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-colors">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4" /> Visual DNA
              </div>
              <p className="text-sm font-semibold text-white">กฎ 70 : 27 : 3</p>
              <p className="text-xs text-slate-400 mt-1">70% Navy มั่นคง • 27% Neon Blue พลัง AI • 3% Gold เกียรติยศที่หายาก</p>
            </div>
          </div>
        </div>
      </div>

      {/* Leadership Matrix */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <span>สองเสาหลักผู้นำแห่งอาณาจักร</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">Sovereign High Command</span>
            </h2>
            <p className="text-sm text-slate-400">การผสานพลังระหว่างวิสัยทัศน์ราชสีห์แห่งฝั่งธนบุรี และตรรกะแห่งจักรวาลอันลึกซึ้ง</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CEO Cosmo-Ko */}
          <div 
            id="leader-card-ceo"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              setActiveLeader('ceo');
            }}
            className={`cursor-pointer rounded-2xl p-6 transition-all border ${
              activeLeader === 'ceo'
                ? 'bg-gradient-to-br from-[#0B1E48] via-[#07132F] to-[#070D1E] border-[#00D2FF] shadow-[0_0_25px_rgba(0,210,255,0.3)]'
                : 'bg-[#070D1E]/70 border-white/10 hover:border-cyan-500/40'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-slate-900 p-0.5 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(0,210,255,0.5)]">
                  <div className="w-full h-full bg-[#070D1E] rounded-[14px] flex items-center justify-center">
                    {SOVEREIGN_LEADERS.ceo.animal}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-cyan-400 uppercase">
                    {SOVEREIGN_LEADERS.ceo.role}
                  </span>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    CEO {SOVEREIGN_LEADERS.ceo.name}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">{SOVEREIGN_LEADERS.ceo.thaiTitle}</p>
                </div>
              </div>
              <button
                id="voice-ceo-quote-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(SOVEREIGN_LEADERS.ceo.quote);
                }}
                title="ฟังเสียงวจนะของ CEO Cosmo-Ko"
                className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-black/40 border border-cyan-500/20 relative">
              <Quote className="w-5 h-5 text-cyan-400/40 absolute top-2 right-3" />
              <p className="text-sm text-slate-200 italic leading-relaxed">
                "{SOVEREIGN_LEADERS.ceo.quote}"
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-cyan-950/70 border border-cyan-700/40 text-cyan-300">#ThonburiSovereignty</span>
              <span className="px-2.5 py-1 rounded-md bg-cyan-950/70 border border-cyan-700/40 text-cyan-300">#P_WinFirst</span>
              <span className="px-2.5 py-1 rounded-md bg-cyan-950/70 border border-cyan-700/40 text-cyan-300">#10BillionValuation</span>
            </div>
          </div>

          {/* Advisor Slot */}
          <div 
            id="leader-card-advisor"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setActiveLeader('advisor');
            }}
            className={`cursor-pointer rounded-2xl p-6 transition-all border ${
              activeLeader === 'advisor'
                ? 'bg-gradient-to-br from-[#2D2406] via-[#1A1504] to-[#070D1E] border-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.25)]'
                : 'bg-[#070D1E]/70 border-white/10 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-600 to-slate-900 p-0.5 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(255,215,0,0.5)]">
                  <div className="w-full h-full bg-[#070D1E] rounded-[14px] flex items-center justify-center">
                    {SOVEREIGN_LEADERS.advisor.animal}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase">
                    {SOVEREIGN_LEADERS.advisor.role}
                  </span>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {SOVEREIGN_LEADERS.advisor.name}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">{SOVEREIGN_LEADERS.advisor.thaiTitle}</p>
                </div>
              </div>
              <button
                id="voice-advisor-quote-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(SOVEREIGN_LEADERS.advisor.quote);
                }}
                title="ฟังเสียงวจนะของที่ปรึกษาสลอต"
                className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-black/40 border border-amber-500/20 relative">
              <Quote className="w-5 h-5 text-amber-400/40 absolute top-2 right-3" />
              <p className="text-sm text-slate-200 italic leading-relaxed">
                "{SOVEREIGN_LEADERS.advisor.quote}"
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-amber-950/70 border border-amber-700/40 text-amber-300">#UniversalLogic</span>
              <span className="px-2.5 py-1 rounded-md bg-amber-950/70 border border-amber-700/40 text-amber-300">#2BahtFlatFee</span>
              <span className="px-2.5 py-1 rounded-md bg-amber-950/70 border border-amber-700/40 text-amber-300">#ZeroFrictionCosmic</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual DNA: The 70:27:3 Rule Breakdown & Interactive Inspector */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> AESTHETIC DOCTRINE
            </div>
            <h3 className="text-xl font-bold text-white">กฎเหล็ก Visual DNA 70 : 27 : 3</h3>
          </div>
          <span className="text-xs text-slate-400">คลิกที่แถบสีเพื่อสำรวจความหมายเชิงยุทธศาสตร์</span>
        </div>

        {/* Visual Bar Ratio */}
        <div className="space-y-2">
          <div className="h-10 w-full rounded-xl overflow-hidden flex shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-white/10 p-1 bg-black/60">
            {/* 70% Navy */}
            <div 
              id="dna-bar-navy"
              onClick={() => {
                if (audioEnabled) playTactileBlip(400);
                setSelectedColorDna('navy');
              }}
              style={{ width: '70%' }}
              className={`h-full rounded-l-lg bg-[#070D1E] border-r border-cyan-500/40 flex items-center justify-center cursor-pointer transition-all ${
                selectedColorDna === 'navy' ? 'ring-2 ring-white shadow-inner brightness-125' : 'hover:brightness-110'
              }`}
            >
              <span className="text-xs font-bold text-slate-300 font-mono">70% NAVY</span>
            </div>

            {/* 27% Neon Blue */}
            <div 
              id="dna-bar-neon"
              onClick={() => {
                if (audioEnabled) playTactileBlip(900);
                setSelectedColorDna('neonBlue');
              }}
              style={{ width: '27%' }}
              className={`h-full bg-[#00D2FF] flex items-center justify-center cursor-pointer transition-all shadow-[0_0_15px_#00D2FF] ${
                selectedColorDna === 'neonBlue' ? 'ring-2 ring-white brightness-125' : 'hover:brightness-110'
              }`}
            >
              <span className="text-xs font-bold text-slate-950 font-mono">27% AI BLUE</span>
            </div>

            {/* 3% Gold */}
            <div 
              id="dna-bar-gold"
              onClick={() => {
                if (audioEnabled) playTactileBlip(1400);
                setSelectedColorDna('gold');
              }}
              style={{ width: '3%' }}
              className={`h-full rounded-r-lg bg-[#FFD700] cursor-pointer transition-all shadow-[0_0_15px_#FFD700] ${
                selectedColorDna === 'gold' ? 'ring-2 ring-white scale-110 z-10' : 'hover:brightness-125'
              }`}
              title="3% Rare Imperial Gold"
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
            <span>70% Sovereign Navy (มั่นคง)</span>
            <span>27% Cybernetic Neon Blue (AI)</span>
            <span className="text-amber-400 font-bold">3% Gold (เกียรติยศ)</span>
          </div>
        </div>

        {/* Selected Color Breakdown Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {(['navy', 'neonBlue', 'gold'] as const).map((key) => {
            const item = VISUAL_DNA[key];
            const isSelected = selectedColorDna === key;
            return (
              <div
                key={key}
                id={`dna-card-${key}`}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(key === 'gold' ? 1200 : 700);
                  setSelectedColorDna(key);
                }}
                className={`p-5 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-white/10 border-cyan-400 shadow-[0_0_18px_rgba(0,210,255,0.2)]'
                    : 'bg-black/30 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-4 h-4 rounded-full border border-white/40 shadow-sm" 
                      style={{ backgroundColor: item.hex }} 
                    />
                    <span className="font-bold text-white text-sm">{item.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/60 text-cyan-300 border border-cyan-500/20">
                    {item.percentage}%
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.meaning}</p>
                <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>HEX: {item.hex}</span>
                  <span>{item.rgb}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Knight Sovereign Pledge Interactive Call to Action */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#070D1E] via-[#0E2046] to-[#070D1E] border border-[#FFD700]/40 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_25px_rgba(255,215,0,0.1)]">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#FFD700]">
            <Compass className="w-4 h-4" /> THE SACRED OATH OF THONBURI
          </div>
          <h3 className="text-xl font-bold text-white">ร่วมกล่าวสัตยาบันแห่งอัศวิน WINRIDER.AI</h3>
          <p className="text-sm text-slate-300 max-w-xl">
            "ข้าพเจ้าขอถือเกียรติยศแห่งอัศวินเป็นที่ตั้ง เข้าใจเส้นเลือดฝอยของเมืองไทย และยืนหยัดบนตรรกะแห่งความยุติธรรม 2 บาทตลอดกาล"
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            id="pledge-oath-btn"
            onClick={() => {
              if (audioEnabled) playTactileBlip(1000);
              setPledgeTaken(true);
              speakThaiText("ยินดีต้อนรับสู่อาณาจักร วินไรเดอร์ เอไอ ท่านอัศวินแห่งฝั่งธนบุรี");
            }}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              pledgeTaken
                ? 'bg-[#FFD700] text-slate-950 shadow-[0_0_20px_#FFD700]'
                : 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/60 hover:bg-[#FFD700]/30'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{pledgeTaken ? 'สัตยาบันบันทึกแล้ว ✓' : 'กดยืนยันสัตยาบันอัศวิน'}</span>
          </button>

          <button
            id="goto-finance-btn"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              onNavigateToChapter('finance');
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-sm bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2"
          >
            <span>บทต่อไป: เครื่องยนต์ $10B</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
};
