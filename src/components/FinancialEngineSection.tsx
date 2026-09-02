import React, { useState } from 'react';
import { playTactileBlip } from '../utils/audio';
import { 
  Coins, 
  TrendingUp, 
  ShieldCheck, 
  PiggyBank, 
  Calculator, 
  CheckCircle, 
  Flame, 
  CreditCard,
  MapPin,
  Building,
  DollarSign
} from 'lucide-react';

interface Props {
  audioEnabled: boolean;
  onNavigateToChapter: (id: any) => void;
}

export const FinancialEngineSection: React.FC<Props> = ({ audioEnabled, onNavigateToChapter }) => {
  const [dailyRides, setDailyRides] = useState<number>(24);
  const [avgFare, setAvgFare] = useState<number>(55);
  const [competitorCutPercent, setCompetitorCutPercent] = useState<number>(25); // 20% to 30%
  const [activeDayOffset, setActiveDayOffset] = useState<number>(20); // 1 to 45 days

  // Calculations for 2 Baht Model vs Competitor
  const daysInMonth = 26; // Working days per month
  const totalDailyRevenue = dailyRides * avgFare;
  const competitorDailyCut = totalDailyRevenue * (competitorCutPercent / 100);
  const winRiderDailyCut = dailyRides * 2; // Exactly 2 Baht per ride
  const dailySavings = competitorDailyCut - winRiderDailyCut;
  const monthlySavings = dailySavings * daysInMonth;
  const annualSavings = monthlySavings * 12;

  // Split of 2 Baht
  const dailySystemRevenue = dailyRides * 1; // 1 Baht to Server/AI
  const dailyPensionFund = dailyRides * 1; // 1 Baht to Retirement/Insurance

  // 1+1+1+1 Model: 4 Baht for first 20 rides/day = 80 Baht/day
  // 80 Baht * 45 days = 3,600 Baht equipment bundle paid off completely!
  const equipmentTotalCost = 3600;
  const dailyEquipmentDeduction = Math.min(dailyRides, 20) * 4; // Max 80 THB/day
  const accumulatedPaid = Math.min(equipmentTotalCost, dailyEquipmentDeduction * activeDayOffset);
  const payoffProgressPercent = Math.min(100, Math.round((accumulatedPaid / equipmentTotalCost) * 100));

  return (
    <section className="space-y-10">
      {/* Chapter Title Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#00D2FF]/30 bg-gradient-to-br from-[#070D1E] via-[#0A183A] to-[#050A17] p-6 sm:p-10 shadow-[0_0_30px_rgba(0,210,255,0.15)]">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] text-xs font-bold tracking-wide">
            <Coins className="w-3.5 h-3.5" /> BIBLE CHAPTER 02 : THE $10B FINANCIAL ENGINE
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            เครื่องยนต์ทางการเงิน <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FFE57F] to-[#00D2FF]">
              "2 บาทครองเมือง" & โมเดลอัศวินมหาเศรษฐี
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
            ปลดแอกอัศวินมอเตอร์ไซค์จากระบบสัมปทานและค่าคอมมิชชั่น 20%-30% ด้วยกลยุทธ์ <strong>หัก Flat Fee 2 บาทตลอดกาล</strong> (1 บาทรันระบบ / 1 บาทประกัน-กองทุนเกษียณ) พร้อมระบบผ่อนอุปกรณ์ 1+1+1+1 ที่จบใน 45 วัน อัศวินเป็นเจ้าของ 100%
          </p>
        </div>
      </div>

      {/* 2 Baht Split Architecture & 5 Baht Customer Protection Fund Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#00D2FF]/20 border border-[#00D2FF]/40 flex items-center justify-center text-cyan-300 font-black text-xl">
              1 ฿
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase">System Maintenance</span>
              <h3 className="text-lg font-bold text-white">1 บาทแรก: พัฒนาระบบ & AI Cloud</h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            หล่อเลี้ยงเซิร์ฟเวอร์ความเร็วสูง, สถาปัตยกรรมแผนที่ CI Map, อัปเกรดระบบ WIN Buddy AI NLP Voice, และระบบประมวลผล Safe Pass Transfer อย่างต่อเนื่องโดยไม่มีวันสะดุด
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] text-cyan-300 font-mono">
            <CheckCircle className="w-3.5 h-3.5" /> 100% Transparent Sovereign Fund
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#070D1E] border border-amber-500/30 space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FFD700]/20 border border-[#FFD700]/40 flex items-center justify-center text-amber-300 font-black text-xl">
              1 ฿
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">Rider Wealth & Security</span>
              <h3 className="text-lg font-bold text-white">1 บาทหลัง: ประกันภัย & กองทุนเกษียณอัศวิน</h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            เปลี่ยนทุกรอบการขับขี่ให้เป็นสินทรัพย์! สะสมเป็นกองทุนเกษียณอายุ มีเงินปันผลทุกไตรมาส และคุ้มครองอุบัติเหตุวงเงินสูงสุด 100,000 บาท หมดกังวลเรื่องเจ็บป่วย
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] text-amber-300 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Direct Retirement Wealth Accumulator
          </div>
        </div>
      </div>

      {/* Customer Protection Fund (5 Baht) Transparency Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#071328] via-[#091E3D] to-[#071328] border-2 border-[#00D2FF]/40 shadow-[0_0_25px_rgba(0,210,255,0.15)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#00D2FF]/20 border border-[#00D2FF]/50 flex items-center justify-center text-[#00D2FF] font-black text-lg">
              5 ฿
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-[#FFD700] uppercase font-mono">Passenger Protection Fund Architecture</span>
              <h3 className="text-lg font-bold text-white">กองทุนคุ้มครองลูกค้า 5 บาท (แจกแจงโปร่งใส 2+1+1+1)</h3>
            </div>
          </div>
          <span className="text-xs text-emerald-300 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 self-start sm:self-auto">
            ✓ คุ้มครองผู้โดยสาร 100%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-lg">🛡️</span>
              <span className="text-sm font-black text-cyan-300 font-mono">+2.00 ฿</span>
            </div>
            <div className="text-xs font-bold text-white">ค่าประกันอุบัติเหตุ</div>
            <div className="text-[11px] text-slate-300 leading-snug">
              คุ้มครองค่ารักษาพยาบาลและอุบัติเหตุตลอดทริป 100% วงเงินสูงสุด 100,000 บาท
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-lg">🪖</span>
              <span className="text-sm font-black text-cyan-300 font-mono">+1.00 ฿</span>
            </div>
            <div className="text-xs font-bold text-white">ค่าประกันอุปกรณ์ที่ให้ยืมฟรี</div>
            <div className="text-[11px] text-slate-300 leading-snug">
              ประกันหมวกกันน็อก UV, แว่นกันลม, ร่ม, และอุปกรณ์เซฟตี้ที่ให้ยืมฟรีไม่คิดค่าบริการ
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-lg">🛵</span>
              <span className="text-sm font-black text-amber-300 font-mono">+1.00 ฿</span>
            </div>
            <div className="text-xs font-bold text-white">ค่าระยะทางพี่วินไปรับ</div>
            <div className="text-[11px] text-slate-300 leading-snug">
              ชดเชยค่าน้ำมันและระยะทางที่อัศวินผู้ขับขี่ต้องเดินทางไปรับผู้โดยสารถึงจุดนัดหมาย
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-lg">⚙️</span>
              <span className="text-sm font-black text-cyan-300 font-mono">+1.00 ฿</span>
            </div>
            <div className="text-xs font-bold text-white">ค่าดูแลระบบ</div>
            <div className="text-[11px] text-slate-300 leading-snug">
              บำรุงรักษาคลาวด์เซิร์ฟเวอร์, ระบบพิกัด GPS แม่นยำ และระบบโทร VoIP ฟรีปลอดภัย
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Financial Comparison Simulator */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#0B1736] to-[#070D1E] border border-cyan-500/40 shadow-2xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-widest">
              <Calculator className="w-3.5 h-3.5" /> REAL-TIME EARNINGS SIMULATOR
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">เครื่องคำนวณเปรียบเทียบผลประโยชน์ "2 บาทครองเมือง"</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">สูตรเปรียบเทียบมาตรฐาน กทม.</span>
        </div>

        {/* Sliders Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Rides Slider */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>จำนวนรอบวิ่งต่อวัน:</span>
              <strong className="text-cyan-400 font-mono text-sm">{dailyRides} รอบ</strong>
            </div>
            <input 
              id="slider-daily-rides"
              type="range" 
              min="5" 
              max="50" 
              value={dailyRides}
              onChange={(e) => {
                setDailyRides(Number(e.target.value));
                if (audioEnabled) playTactileBlip(500 + Number(e.target.value) * 10);
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5 รอบ</span>
              <span>25 รอบ (เฉลี่ย)</span>
              <span>50 รอบ</span>
            </div>
          </div>

          {/* Average Fare Slider */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>ค่าโดยสารเฉลี่ยต่อรอบ:</span>
              <strong className="text-amber-400 font-mono text-sm">{avgFare} บาท</strong>
            </div>
            <input 
              id="slider-avg-fare"
              type="range" 
              min="25" 
              max="150" 
              step="5"
              value={avgFare}
              onChange={(e) => {
                setAvgFare(Number(e.target.value));
                if (audioEnabled) playTactileBlip(600 + Number(e.target.value) * 4);
              }}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>25 บาท</span>
              <span>60 บาท</span>
              <span>150 บาท</span>
            </div>
          </div>

          {/* Competitor App Cut Slider */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>แอปต่างชาติหักคอมมิชชั่น:</span>
              <strong className="text-rose-400 font-mono text-sm">{competitorCutPercent}%</strong>
            </div>
            <input 
              id="slider-competitor-cut"
              type="range" 
              min="15" 
              max="35" 
              value={competitorCutPercent}
              onChange={(e) => {
                setCompetitorCutPercent(Number(e.target.value));
                if (audioEnabled) playTactileBlip(700);
              }}
              className="w-full accent-rose-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>15%</span>
              <span>25% (ทั่วไป)</span>
              <span>35%</span>
            </div>
          </div>
        </div>

        {/* Results Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Competitor Cut */}
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-600/30 space-y-1">
            <span className="text-[11px] font-bold text-rose-400 uppercase">แอปอื่นหักคุณต่อเดือน</span>
            <p className="text-2xl font-black text-rose-300 font-mono">
              -{(competitorDailyCut * daysInMonth).toLocaleString()} ฿
            </p>
            <p className="text-[11px] text-rose-400/80">หัก {competitorCutPercent}% จากรายได้ {((dailyRides * avgFare) * daysInMonth).toLocaleString()} ฿</p>
          </div>

          {/* WINRIDER Cut */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-400/40 space-y-1">
            <span className="text-[11px] font-bold text-cyan-300 uppercase">WINRIDER.AI หักคุณต่อเดือน</span>
            <p className="text-2xl font-black text-cyan-300 font-mono">
              -{(winRiderDailyCut * daysInMonth).toLocaleString()} ฿
            </p>
            <p className="text-[11px] text-cyan-400/80">เพียง 2 บาทคงที่ x {dailyRides * daysInMonth} เที่ยว</p>
          </div>

          {/* Extra Cash to Rider */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.2)] space-y-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 uppercase">
              <Flame className="w-3.5 h-3.5" /> เงินเหลือเพิ่มเข้ากระเป๋าพี่อัศวิน
            </div>
            <p className="text-2xl font-black text-emerald-300 font-mono">
              +{monthlySavings.toLocaleString()} ฿ <span className="text-xs font-normal text-slate-300">/ เดือน</span>
            </p>
            <p className="text-[11px] text-emerald-400/80">ประหยัดได้ปีละ +{annualSavings.toLocaleString()} บาท!</p>
          </div>

          {/* Pension Accumulator */}
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-400/50 space-y-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 uppercase">
              <PiggyBank className="w-3.5 h-3.5" /> เงินสะสมกองทุนเกษียณต่อเดือน
            </div>
            <p className="text-2xl font-black text-amber-300 font-mono">
              +{(dailyPensionFund * daysInMonth).toLocaleString()} ฿ <span className="text-xs font-normal text-slate-300">/ เดือน</span>
            </p>
            <p className="text-[11px] text-amber-400/80">พร้อมประกันอุบัติเหตุคุ้มครอง 100,000 บาท</p>
          </div>
        </div>
      </div>

      {/* 1+1+1+1 Model (Equipment Payoff in 45 Days) */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1E] border border-[#FFD700]/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFD700] uppercase tracking-widest">
              <CreditCard className="w-3.5 h-3.5" /> 1+1+1+1 EQUIPMENT MODEL
            </div>
            <h3 className="text-xl font-bold text-white">โมเดลผ่อนชุดเกราะ 4 บาทเฉพาะ 20 รอบแรก (จบใน 1.5 เดือน)</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30 font-semibold">
            อัศวินเป็นเจ้าของอุปกรณ์ 100%
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          ชุดเกราะและอุปกรณ์มหาศาสตราวุธครบเซ็ต (มูลค่า 3,600 บาท) ถูกผ่อนชำระอัตโนมัติ <strong>4 บาทต่อเที่ยว เฉพาะ 20 รอบแรกของวัน</strong> (สูงสุดไม่เกิน 80 บาท/วัน) 
          เมื่อครบ 45 วัน ระบบหยุดหักทันที อุปกรณ์เป็นกรรมสิทธิ์ของพี่อัศวินตลอดชีพ!
        </p>

        {/* Payoff Simulation Slider */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span>จำลองระยะเวลาทำงาน: <strong className="text-cyan-400">{activeDayOffset} วัน</strong> (จากเป้าหมาย 45 วัน)</span>
            <span className="text-amber-400 font-mono font-bold">{payoffProgressPercent}% สำเร็จ</span>
          </div>

          <input 
            id="slider-payoff-days"
            type="range" 
            min="1" 
            max="45" 
            value={activeDayOffset}
            onChange={(e) => {
              setActiveDayOffset(Number(e.target.value));
              if (audioEnabled) playTactileBlip(400 + Number(e.target.value) * 15);
            }}
            className="w-full accent-[#FFD700] cursor-pointer"
          />

          {/* Progress Bar */}
          <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div 
              style={{ width: `${payoffProgressPercent}%` }}
              className="h-full bg-gradient-to-r from-cyan-400 to-[#FFD700] rounded-full transition-all duration-300 shadow-[0_0_10px_#FFD700]"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>ผ่อนชำระแล้ว: <strong className="text-white">{accumulatedPaid.toLocaleString()} ฿</strong></span>
            <span>คงเหลือ: <strong className="text-cyan-400">{(equipmentTotalCost - accumulatedPaid).toLocaleString()} ฿</strong></span>
            <span>{activeDayOffset >= 45 ? '🎉 ปลดล็อกกรรมสิทธิ์ 100% แล้ว!' : `อีก ${45 - activeDayOffset} วันผ่อนหมด`}</span>
          </div>
        </div>
      </div>

      {/* 3 Secondary Sovereign Revenue Streams */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>3 สายธารรายได้มหาศาลสู่เป้าหมาย $10B</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            Infinite Scaling Engine
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stream 1: Data Licensing */}
          <div className="p-5 rounded-xl bg-[#070D1E] border border-cyan-500/30 hover:border-cyan-400 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">1. Data Licensing (CI Map)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              จำหน่ายข้อมูลแผนที่เส้นเลือดฝอยแบบ Real-time ให้หน่วยงานวางผังเมือง, บริษัทอีคอมเมิร์ซ, และบริการฉุกเฉิน สร้าง Recurring Revenue ต่อเนื่อง
            </p>
            <span className="inline-block text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded">
              High Margin • B2G / B2B
            </span>
          </div>

          {/* Stream 2: Mobile Billboards */}
          <div className="p-5 rounded-xl bg-[#070D1E] border border-amber-500/30 hover:border-amber-400 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Building className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">2. Mobile Billboards บนชุดเกราะ</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              พื้นที่โฆษณาดิจิทัลเรืองแสงบนชุดเกราะ Storm Shield และกล่อง WIN-Vault ขับเคลื่อนผ่านจุดสำคัญทั่วกรุงเทพฯ วันละหลายล้านสายตา
            </p>
            <span className="inline-block text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">
              Revenue Shared to Riders
            </span>
          </div>

          {/* Stream 3: Micro-loans Fintech */}
          <div className="p-5 rounded-xl bg-[#070D1E] border border-emerald-500/30 hover:border-emerald-400 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <DollarSign className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">3. Micro-Loans (Fintech)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              สินเชื่อหมุนเวียนดอกเบี้ยต่ำสำหรับอัศวินและพลเมือง โดยใช้ประวัติการขับขี่และ XP บนบล็อกเชนเป็นเครดิตสกอร์ ปราศจากหนี้นอกระบบ
            </p>
            <span className="inline-block text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
              0% Predatory Interest
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
