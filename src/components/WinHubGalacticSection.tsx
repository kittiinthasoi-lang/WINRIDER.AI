import React, { useState } from 'react';
import { LAUNCH_TIMELINE } from '../data/bibleData';
import { playTactileBlip } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Rocket, 
  Building2, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Layers, 
  ShoppingBag, 
  BatteryCharging, 
  Coffee, 
  Compass, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface Props {
  audioEnabled: boolean;
}

export const WinHubGalacticSection: React.FC<Props> = ({ audioEnabled }) => {
  const [activeFloor, setActiveFloor] = useState<1 | 2 | 3>(1);
  const [targetValuationStep, setTargetValuationStep] = useState<number>(1); // 0: 50M, 1: 10B, 2: 350B Space
  const [countdownDays, setCountdownDays] = useState<number>(68); // Day 68 of 135

  const handleLaunchSimulation = () => {
    if (audioEnabled) playTactileBlip(1400);
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#00D2FF', '#FFD700', '#FFFFFF', '#0070F3']
    });
  };

  return (
    <section className="space-y-10">
      {/* Title Header */}
      <div className="relative rounded-2xl overflow-hidden border border-[#00D2FF]/30 bg-gradient-to-br from-[#070D1E] via-[#091C44] to-[#050A17] p-6 sm:p-10 shadow-[0_0_30px_rgba(0,210,255,0.15)]">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] text-xs font-bold tracking-wide">
            <Rocket className="w-3.5 h-3.5" /> BIBLE CHAPTER 07 : PHYSICAL BASE & GALACTIC GOAL
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            วินฮับ ปราสาท 3 ชั้น & มหายุทธศาสตร์อวกาศ <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#5CE1E6] to-[#00D2FF]">
              จาก Seed Round 50 ล้านบาท สู่มูลค่า 3.5 แสนล้านบาท 🛸
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
            สถาปัตยกรรมฐานบัญชาการภาคพื้นดิน <strong>WIN-Hub ปราสาท 3 ชั้น</strong> พร้อมแผนปฏิบัติการ 135 วัน (4.5 เดือน) สู่การระดมทุน Seed Round 50 ล้านบาท และการปักธงอธิปไตยไทยในอวกาศ
          </p>
        </div>
      </div>

      {/* WIN-Hub 3-Story Castle Architecture */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-cyan-400 font-mono uppercase">PHYSICAL COMMAND BASE</span>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#00D2FF]" /> ปราสาทอัศวิน WIN-Hub 3 ชั้น (วงเวียนใหญ่แลนด์มาร์ก)
            </h3>
          </div>
          <span className="text-xs text-slate-400">คลิกที่ชั้นเพื่อสำรวจโซนและสิทธิประโยชน์</span>
        </div>

        {/* Floor Selection Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Level 1 */}
          <button
            id="hub-floor-1-btn"
            onClick={() => {
              setActiveFloor(1);
              if (audioEnabled) playTactileBlip(600);
            }}
            className={`p-4 rounded-xl text-left transition-all border ${
              activeFloor === 1
                ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                : 'bg-black/30 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono font-bold text-cyan-300">ชั้นที่ 1 (Level 1)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-slate-400">All Knights</span>
            </div>
            <h4 className="text-base font-bold text-white">Standard Rider Lounge & Battery Swap</h4>
            <p className="text-xs text-slate-300 mt-1">ตู้สลับแบตเตอรี่ EV, โซนพักผ่อน, คาเฟ่น้ำดื่มฟรี, และ WIN-Shop</p>
          </button>

          {/* Level 2 */}
          <button
            id="hub-floor-2-btn"
            onClick={() => {
              setActiveFloor(2);
              if (audioEnabled) playTactileBlip(800);
            }}
            className={`p-4 rounded-xl text-left transition-all border ${
              activeFloor === 2
                ? 'bg-indigo-950/60 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                : 'bg-black/30 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono font-bold text-indigo-300">ชั้นที่ 2 (Level 2)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFD700]/20 text-[#FFD700]">Lvl 51+ Only</span>
            </div>
            <h4 className="text-base font-bold text-white">Elite Tactical Briefing & Armor Studio</h4>
            <p className="text-xs text-slate-300 mt-1">ห้องวางแผนยุทธวิธี CI Map, สตูดิโอปรับแต่งเกราะ, และห้องพยาบาล</p>
          </button>

          {/* Level 3 */}
          <button
            id="hub-floor-3-btn"
            onClick={() => {
              setActiveFloor(3);
              if (audioEnabled) playTactileBlip(1100);
            }}
            className={`p-4 rounded-xl text-left transition-all border ${
              activeFloor === 3
                ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                : 'bg-black/30 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono font-bold text-amber-300">ชั้นที่ 3 (Level 3)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFD700] text-slate-950 font-bold">Sanctuary</span>
            </div>
            <h4 className="text-base font-bold text-white">Sanctuary of Universal Logic & Council</h4>
            <p className="text-xs text-slate-300 mt-1">วิหารแห่งตรรกะจักรวาล, ห้องสมาธิ, และสภาอธิปไตยวินไรเดอร์</p>
          </button>
        </div>

        {/* Detailed Floor View */}
        <div className="p-6 rounded-xl bg-black/40 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <span className="text-xs font-mono text-cyan-400 uppercase font-bold">
              FLOOR {activeFloor} BLUEPRINT SPECIFICATIONS
            </span>
            <h4 className="text-xl font-bold text-white">
              {activeFloor === 1 && 'ชั้นที่ 1: สถานีบริการสามัญ & ร้านค้า WIN-Shop'}
              {activeFloor === 2 && 'ชั้นที่ 2: วอร์รูมยุทธวิธีระดับสูง & สตูดิโอช่างเกราะ'}
              {activeFloor === 3 && 'ชั้นที่ 3: มหาวิหารแห่งตรรกะสากล (Sanctuary of Logic)'}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeFloor === 1 && 'เปิดต้อนรับอัศวินทุกคนตลอด 24 ชั่วโมง มีตู้สลับแบตเตอรี่มอเตอร์ไซค์ไฟฟ้า 40 ช่อง, โซนอาบน้ำพักผ่อน, กาแฟสดฟรี, และ WIN-Shop จำหน่าย 10 ศาสตราวุธในราคาต้นทุน'}
              {activeFloor === 2 && 'สงวนสิทธิ์เฉพาะอัศวินระดับ Royal Thonburi (Lvl 51+) ขึ้นไป มีจอโฮโลแกรม CI Map ควบคุมการจราจร, โต๊ะปรับแต่งเกราะโดยช่างเทคนิค, และห้องประชุมยุทธการขากลับ'}
              {activeFloor === 3 && 'สถานที่เงียบสงบสูงสุดเพื่อความตื่นรู้ทางปัญญาตามแนวคิดที่ปรึกษาสลอต เป็นที่ประชุมของ CEO Cosmo-Ko ร่วมกับตัวแทนอัศวินอาวุโสเพื่อตัดสินใจอนาคตอาณาจักร'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <Coffee className="w-4 h-4 text-amber-300" />
              <p className="font-bold text-white">Rider Hospitality</p>
              <p className="text-[10px] text-slate-400">เครื่องดื่มฟรี 24 ชม.</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <BatteryCharging className="w-4 h-4 text-cyan-300" />
              <p className="font-bold text-white">EV Quick Swap</p>
              <p className="text-[10px] text-slate-400">สลับแบตใน 45 วินาที</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <ShoppingBag className="w-4 h-4 text-emerald-300" />
              <p className="font-bold text-white">Official WIN-Shop</p>
              <p className="text-[10px] text-slate-400">อะไหล่ราคาหน้าโรงงาน</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <Compass className="w-4 h-4 text-purple-300" />
              <p className="font-bold text-white">Logic Sanctuary</p>
              <p className="text-[10px] text-slate-400">สมาธิ & ปัญญาจักรวาล</p>
            </div>
          </div>
        </div>
      </div>

      {/* 135-Day Timeline (4.5 Months to Launch) */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5" /> 135-DAY ROADMAP (4.5 MONTHS)
            </div>
            <h3 className="text-xl font-bold text-white">ไทม์ไลน์ 5 ระยะ สู่การประกาศอิสรภาพ</h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span>สถานะปัจจุบัน:</span>
            <strong className="text-amber-400 px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40">DAY 68 / 135</strong>
          </div>
        </div>

        <div className="space-y-4">
          {LAUNCH_TIMELINE.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl transition-all border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                item.status === 'Completed'
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : item.status === 'In Progress'
                  ? 'bg-gradient-to-r from-cyan-950/60 to-black border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                  : 'bg-black/30 border-white/5 opacity-60'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950">
                    {item.dayRange}
                  </span>
                  <span className="text-xs font-bold text-slate-300">{item.phase}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                <p className="text-xs text-slate-300 max-w-2xl">{item.desc}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full ${
                  item.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  item.status === 'In Progress' ? 'bg-cyan-500 text-slate-950 animate-pulse font-bold' :
                  'bg-white/5 text-slate-500'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Galactic Goal: 50M Seed -> 350B Space Initiative */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#1F1703] via-[#0D183B] to-[#070D1E] border border-[#FFD700] shadow-[0_0_35px_rgba(255,215,0,0.25)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FFD700]/30 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#FFD700] uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> THE ULTIMATE COSMIC DESTINY
            </div>
            <h3 className="text-2xl font-black text-white">เป้าหมายสูงสุด: มูลค่า 3.5 แสนล้านบาท & อาณานิคมอวกาศ 🛸</h3>
          </div>
          <button
            id="btn-simulate-launch"
            onClick={handleLaunchSimulation}
            className="px-5 py-2.5 rounded-xl font-black text-xs bg-[#FFD700] text-slate-950 hover:brightness-110 shadow-[0_0_15px_#FFD700] flex items-center gap-2"
          >
            <Rocket className="w-4 h-4" /> ฉลองการปักธงอวกาศ
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-3xl">
          เริ่มต้นจาก <strong>Seed Round 50 ล้านบาท</strong> ในวันเปิดตัว เพื่อสร้างเสถียรภาพให้อัศวินมอเตอร์ไซค์ และขยายตัวด้วยเครื่องยนต์ข้อมูล 2 บาท จนก้าวสู่มูลค่า <strong>350,000,000,000 บาท ($10 Billion)</strong> นำพาคนไทยเก่งๆ ไปจองพื้นที่สัมปทานในอวกาศและดาวอังคาร!
        </p>

        {/* Valuation Growth Milestones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2">
            <span className="text-[10px] font-mono text-cyan-300 uppercase">Stage 1: Genesis Seed Round</span>
            <p className="text-2xl font-black text-white font-mono">50,000,000 ฿</p>
            <p className="text-xs text-slate-300">เปิดฐาน WIN-Hub แห่งแรก, แจกจ่ายชุดเกราะ The Guardian Zipper 1,000 นาย</p>
          </div>

          <div className="p-4 rounded-xl bg-black/50 border border-cyan-500/40 space-y-2">
            <span className="text-[10px] font-mono text-cyan-300 uppercase">Stage 2: Pan-ASEAN Dominance</span>
            <p className="text-2xl font-black text-cyan-300 font-mono">35,000,000,000 ฿</p>
            <p className="text-xs text-slate-300">ขยายระบบ 8 เสาหลักสู่จาการ์ตา มะนิลา โฮจิมินห์ ด้วย 2 บาทครองเมือง</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/40 border border-[#FFD700]/60 shadow-[0_0_15px_rgba(255,215,0,0.2)] space-y-2">
            <span className="text-[10px] font-mono text-amber-300 uppercase flex items-center gap-1">
              <Rocket className="w-3.5 h-3.5" /> Stage 3: Galactic Cosmic Sovereign
            </span>
            <p className="text-2xl font-black text-[#FFD700] font-mono">350,000,000,000 ฿</p>
            <p className="text-xs text-amber-100">ก่อตั้ง WINRIDER Cosmic Space Station จองที่ดินดาวอังคารสำหรับคนไทย</p>
          </div>
        </div>
      </div>
    </section>
  );
};
