import React, { useState } from 'react';
import { playTactileBlip, playLevelUpFanfare } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Coins, 
  TrendingUp, 
  ShieldCheck, 
  PiggyBank, 
  Calculator, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  HelpCircle,
  Percent,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface TwoBahtEmpireCalculatorProps {
  audioEnabled?: boolean;
}

export const TwoBahtEmpireCalculator: React.FC<TwoBahtEmpireCalculatorProps> = ({ audioEnabled = true }) => {
  const [dailyRides, setDailyRides] = useState<number>(25);
  const [avgFare, setAvgFare] = useState<number>(55);
  const [competitorCutPercent, setCompetitorCutPercent] = useState<number>(25); // 15% - 35%
  const [workDaysPerMonth, setWorkDaysPerMonth] = useState<number>(26); // 20 - 30 days

  // Calculations
  const dailyGrossIncome = dailyRides * avgFare;
  const competitorDailyCut = dailyGrossIncome * (competitorCutPercent / 100);
  const winRiderDailyCut = dailyRides * 2; // Flat 2 Baht per ride
  
  const dailyDriverNet_Competitor = dailyGrossIncome - competitorDailyCut;
  const dailyDriverNet_WinRider = dailyGrossIncome - winRiderDailyCut;

  const dailySavings = competitorDailyCut - winRiderDailyCut;
  const monthlySavings = dailySavings * workDaysPerMonth;
  const annualSavings = monthlySavings * 12;

  // Breakdown of 2 Baht
  const dailyCloudAiFee = dailyRides * 1; // 1 Baht to Server/AI
  const dailyPensionInsurance = dailyRides * 1; // 1 Baht to Pension/Insurance
  const monthlyPensionAccumulated = dailyPensionInsurance * workDaysPerMonth;

  const handleSimulateBonus = () => {
    if (audioEnabled) playLevelUpFanfare();
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00D2FF', '#10B981']
    });
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0B1736] via-[#070F26] to-[#040915] border-2 border-[#FFD700]/50 shadow-[0_0_30px_rgba(255,215,0,0.15)] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FFD700] via-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">เครื่องคำนวณ "2 บาทครองเมือง"</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-bold">
                FLAT FEE 2฿
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              เปรียบเทียบส่วนต่างรายได้จริง: หัก GP 20%-30% (ค่ายเดิม) VS หักคงที่ 2฿ ตลอดกาล (WINRIDER)
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Controls Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-black/40 p-3.5 rounded-2xl border border-white/10">
        {/* Slider 1: Daily Rides */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 flex items-center gap-1 font-semibold">
              <span className="text-cyan-400">🏍️</span> จำนวนรอบวิ่งต่อวัน:
            </span>
            <span className="font-mono font-black text-cyan-300 text-sm bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-500/30">
              {dailyRides} รอบ/วัน
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            step="1"
            value={dailyRides}
            onChange={(e) => {
              setDailyRides(Number(e.target.value));
              if (audioEnabled) playTactileBlip(600 + Number(e.target.value) * 10);
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>10 รอบ (พาร์ทไทม์)</span>
            <span>25 รอบ (เฉลี่ย)</span>
            <span>60 รอบ (สายลุย)</span>
          </div>
        </div>

        {/* Slider 2: Average Fare */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 flex items-center gap-1 font-semibold">
              <span className="text-[#FFD700]">💵</span> ค่าโดยสารเฉลี่ยต่อเที่ยว:
            </span>
            <span className="font-mono font-black text-[#FFD700] text-sm bg-amber-950/60 px-2 py-0.5 rounded-lg border border-[#FFD700]/30">
              ฿{avgFare}.00
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="150"
            step="5"
            value={avgFare}
            onChange={(e) => {
              setAvgFare(Number(e.target.value));
              if (audioEnabled) playTactileBlip(700 + Number(e.target.value) * 5);
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FFD700]"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>30฿ (ระยะใกล้)</span>
            <span>55฿ (ทั่วไป)</span>
            <span>150฿ (ระยะไกล)</span>
          </div>
        </div>

        {/* Slider 3: Competitor GP Cut */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 flex items-center gap-1 font-semibold">
              <span className="text-rose-400">📉</span> GP ค่ายเดิมที่เคยถูกหัก:
            </span>
            <span className="font-mono font-black text-rose-300 text-sm bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-500/30">
              {competitorCutPercent}% GP
            </span>
          </div>
          <input
            type="range"
            min="15"
            max="35"
            step="1"
            value={competitorCutPercent}
            onChange={(e) => {
              setCompetitorCutPercent(Number(e.target.value));
              if (audioEnabled) playTactileBlip(500 + Number(e.target.value) * 15);
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>15% (เก่า)</span>
            <span>25% (มาตรฐาน)</span>
            <span>35% (แฝงค่าส่ง)</span>
          </div>
        </div>

        {/* Slider 4: Working Days */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 flex items-center gap-1 font-semibold">
              <span className="text-emerald-400">📅</span> วันทำงานต่อเดือน:
            </span>
            <span className="font-mono font-black text-emerald-300 text-sm bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
              {workDaysPerMonth} วัน
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="30"
            step="1"
            value={workDaysPerMonth}
            onChange={(e) => {
              setWorkDaysPerMonth(Number(e.target.value));
              if (audioEnabled) playTactileBlip(600 + Number(e.target.value) * 10);
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>20 วัน (หยุดเสาร์-อาทิตย์)</span>
            <span>26 วัน (หยุด 4 วัน)</span>
            <span>30 วัน (ทุกวัน)</span>
          </div>
        </div>
      </div>

      {/* Big Impact Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Old Model Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-red-950/20 to-[#0A1020] border border-rose-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-rose-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              ระบบเก่า (หัก GP {competitorCutPercent}%)
            </span>
            <span className="text-[10px] font-mono text-rose-400">สัมปทานผูกขาด</span>
          </div>

          <div className="space-y-1 text-xs font-mono pt-1">
            <div className="flex justify-between text-slate-400">
              <span>ยอดวิ่งรวมต่อวัน:</span>
              <span className="text-white">฿{dailyGrossIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-rose-300">
              <span>โดนหักเข้าแพลตฟอร์ม/วัน:</span>
              <span className="font-bold">-฿{competitorDailyCut.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>โดนหักรวมต่อเดือน:</span>
              <span className="text-rose-400 font-bold">-฿{(competitorDailyCut * workDaysPerMonth).toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-rose-500/20 flex justify-between items-baseline">
            <span className="text-[11px] text-slate-300 font-semibold">รายได้สุทธิถึงมือ/วัน:</span>
            <span className="text-base font-black text-rose-200 font-mono">
              ฿{dailyDriverNet_Competitor.toFixed(0)}
            </span>
          </div>
        </div>

        {/* WINRIDER Flat Fee 2฿ Model Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/50 via-[#0C2248] to-[#081530] border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.25)] space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              WINRIDER.AI (Flat Fee 2฿)
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950">
              อธิปไตยอัศวิน
            </span>
          </div>

          <div className="space-y-1 text-xs font-mono pt-1">
            <div className="flex justify-between text-slate-400">
              <span>ยอดวิ่งรวมต่อวัน:</span>
              <span className="text-white">฿{dailyGrossIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-cyan-300">
              <span>หักคงที่ ({dailyRides} รอบ x 2฿):</span>
              <span className="font-bold text-emerald-400">-฿{winRiderDailyCut.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>หักรวมต่อเดือน:</span>
              <span className="text-cyan-300 font-bold">-฿{(winRiderDailyCut * workDaysPerMonth).toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-cyan-500/30 flex justify-between items-baseline">
            <span className="text-[11px] text-cyan-200 font-semibold">รายได้สุทธิถึงมือ/วัน:</span>
            <span className="text-base font-black text-cyan-300 font-mono">
              ฿{dailyDriverNet_WinRider.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly & Annual Driver Net Gain Highlight */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#0A261E] to-[#061B14] border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)] space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase font-mono">
              <TrendingUp className="w-4 h-4" />
              <span>เงินที่พี่วินได้เพิ่มขึ้นสุทธิ (NET DRIVER SURPLUS)</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              เงินส่วนต่างที่เปลี่ยนจากค่าหัวคิวสัมปทาน กลายมาเป็นเงินเก็บเข้ากระเป๋าพี่วินโดยตรง
            </p>
          </div>

          <button
            onClick={handleSimulateBonus}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-[#FFD700] text-slate-950 font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>คำนวณโบนัสอัศวิน</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
          <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/30">
            <span className="text-[9px] text-slate-400 block">ได้เพิ่มต่อวัน</span>
            <span className="text-sm sm:text-base font-black text-emerald-300">
              +฿{dailySavings.toFixed(0)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/30">
            <span className="text-[9px] text-slate-400 block">ได้เพิ่มต่อเดือน</span>
            <span className="text-sm sm:text-base font-black text-[#FFD700]">
              +฿{monthlySavings.toLocaleString()}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/30">
            <span className="text-[9px] text-slate-400 block">ได้เพิ่มต่อปี</span>
            <span className="text-sm sm:text-base font-black text-cyan-300">
              +฿{annualSavings.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2 Baht Split Anatomy (1฿ + 1฿) */}
      <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
        <h4 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-[#FFD700]" />
          <span>โครงสร้างแจกแจงค่าบริการ 2 บาท (100% TRANSPARENCY)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#09152C] border border-cyan-500/30 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-cyan-300">1 บาทแรก : AI & Cloud Server</span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">฿{dailyCloudAiFee}/วัน</span>
            </div>
            <p className="text-[10px] text-slate-400">
              ค่าบำรุงรักษาแผนที่ CI Map, AI สั่งงานด้วยเสียง WIN Buddy และระบบ Safe Pass Transfer
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#09152C] border border-amber-500/30 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-amber-300">1 บาทหลัง : ประกัน & กองทุนเกษียณ</span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">฿{dailyPensionInsurance}/วัน (฿{monthlyPensionAccumulated}/เดือน)</span>
            </div>
            <p className="text-[10px] text-slate-400">
              ประกันอุบัติเหตุคุ้มครอง 100% และเงินสะสมกองทุนบำนาญเกษียณอัศวินถอนได้จริง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
