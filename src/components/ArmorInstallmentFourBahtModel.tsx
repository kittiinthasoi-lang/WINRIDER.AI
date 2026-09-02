import React, { useState } from 'react';
import { playTactileBlip, playLevelUpFanfare } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Shield, 
  Shirt, 
  HardHat, 
  Hand, 
  Zap, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Coins, 
  Flame,
  Award,
  Clock,
  ArrowRight,
  Info,
  Sliders,
  Plus,
  Minus,
  TrendingUp,
  Target,
  Check,
  ChevronRight,
  RefreshCw,
  Lock,
  Compass,
  FileCheck
} from 'lucide-react';
import { KNIGHT_ARMOR_SUITS } from '../data/armorSuits';

interface ArmorInstallmentFourBahtModelProps {
  audioEnabled?: boolean;
}

export const ArmorInstallmentFourBahtModel: React.FC<ArmorInstallmentFourBahtModelProps> = ({ audioEnabled = true }) => {
  // Current armor suit tier being paid / owned
  const [currentSuitIndex, setCurrentSuitIndex] = useState<number>(0);
  const [isSuitFullyPaid, setIsSuitFullyPaid] = useState<boolean>(false);
  const [autoUpgradeToNextSuit, setAutoUpgradeToNextSuit] = useState<boolean>(true);

  // Optional gear addons selection (1 Baht each per ride OR One-Time Cash)
  const [addonIntercom, setAddonIntercom] = useState<boolean>(false); // +1฿ หูฟังติดหมวก Bluetooth Intercom (หรือสด 2,490฿)
  const [addonElbowGuards, setAddonElbowGuards] = useState<boolean>(false); // +1฿ สนับศอก D3O (หรือสด 1,490฿)
  const [addonPetBox, setAddonPetBox] = useState<boolean>(false); // +1฿ กล่องใส่สัตว์เลี้ยง Space Pod (หรือสด 3,990฿)
  const [addonDeliveryBox, setAddonDeliveryBox] = useState<boolean>(false); // +1฿ กล่องใส่อาหาร-พัสดุ Thermo Box (หรือสด 3,490฿)
  const [addonGloves, setAddonGloves] = useState<boolean>(false); // +1฿ ถุงมือการ์บอน (หรือสด 1,290฿)
  const [addonKneeGuards, setAddonKneeGuards] = useState<boolean>(false); // +1฿ สนับเข่า Guardian Plates (หรือสด 1,890฿)
  const [addonPhoneHolder, setAddonPhoneHolder] = useState<boolean>(false); // +1฿ ที่ยึดมือถือ CNC ชาร์จไร้สาย Qi2 (หรือสด 990฿)
  const [addonRainCover, setAddonRainCover] = useState<boolean>(false); // +1฿ ชุดคลุมกันฝน Storm Defender (หรือสด 2,890฿)

  // Driver purchase mode: 'installment' (+1฿/ride) or 'cash' (One-time buy)
  const [purchaseMode, setPurchaseMode] = useState<'installment' | 'cash'>('installment');
  const [cashPurchasedItems, setCashPurchasedItems] = useState<string[]>([]);

  const [currentDay, setCurrentDay] = useState<number>(20); // Day 1 to 45
  const [todayRides, setTodayRides] = useState<number>(24); // Rides done today (e.g., 24)
  const [extraRidesToDeduct, setExtraRidesToDeduct] = useState<number>(10); // Driver custom extra rides after base 20 rides

  const currentSuit = KNIGHT_ARMOR_SUITS[currentSuitIndex] || KNIGHT_ARMOR_SUITS[0];
  const nextSuit = KNIGHT_ARMOR_SUITS[currentSuitIndex + 1] || null;

  // --- PRICING BREAKDOWN ---
  // Mandatory base per ride:
  // 1. ค่ารอบแพลตฟอร์ม = 1฿ (ตายตัวทุกรอบ)
  // 2. ค่าประกันชีวิต/อุบัติเหตุคุ้มครองผู้โดยสารและพี่วิน = 1฿ (ตายตัวทุกรอบ)
  const MANDATORY_SYSTEM_FEE = 2; // 1฿ Platform + 1฿ Insurance (Fixed for every single ride)

  // Armor Core Installment (ถ้าผ่อนชุดเกราะอยู่ และยังไม่หมด หรือผ่อนต่อ):
  // 3. ค่าชุดเกราะ (เสื้อแจ็กเก็ต D3O) = 1฿
  // 4. ค่าหมวกกันน็อคอัจฉริยะ Smart Helmet = 1฿
  const isPayingArmorCore = !isSuitFullyPaid || autoUpgradeToNextSuit;
  const ARMOR_CORE_FEE = isPayingArmorCore ? 2 : 0; // 1฿ Jacket + 1฿ Helmet

  // Optional Addons (1฿ per selected item if in installment mode):
  const selectedInstallmentAddons = [
    addonIntercom && 'intercom',
    addonElbowGuards && 'elbow',
    addonPetBox && 'petBox',
    addonDeliveryBox && 'deliveryBox',
    addonGloves && 'gloves',
    addonKneeGuards && 'knee',
    addonPhoneHolder && 'phone',
    addonRainCover && 'rain'
  ].filter(Boolean);

  const addonCount = selectedInstallmentAddons.length;
  const ADDON_FEE = addonCount; // 1฿ per installment addon

  // Total rate per ride (Default 1+1+1+1 = 4฿, or 2฿ if armor done & no upgrade, +1฿ for each extra addon)
  const TOTAL_FEE_PER_RIDE = MANDATORY_SYSTEM_FEE + ARMOR_CORE_FEE + ADDON_FEE;
  const INSTALLMENT_ONLY_FEE_PER_RIDE = ARMOR_CORE_FEE + ADDON_FEE; // ส่วนที่เอาไปหักค่าของ

  // Values
  const TOTAL_BUNDLE_VALUE = 2700 + (addonCount * 500); // Base jacket (1,500) + helmet (1,200) = 2,700฿ + addons
  const BASE_DAILY_CAP_RIDES = 20; // First 20 rides capped per day
  const totalDeductibleRidesLimit = BASE_DAILY_CAP_RIDES + Math.max(0, extraRidesToDeduct);

  // Daily Max installment calculation
  const dailyTotalDeduction = totalDeductibleRidesLimit * TOTAL_FEE_PER_RIDE;
  const dailyInstallmentDeduction = totalDeductibleRidesLimit * INSTALLMENT_ONLY_FEE_PER_RIDE;

  // Days to finish contract based on current daily pace
  const daysToCompleteAtPace = INSTALLMENT_ONLY_FEE_PER_RIDE > 0 
    ? Math.max(1, Math.ceil(TOTAL_BUNDLE_VALUE / dailyInstallmentDeduction))
    : 0;
  const daysSaved = Math.max(0, 45 - daysToCompleteAtPace);

  // Today's ride breakdown
  const baseRidesToday = Math.min(todayRides, BASE_DAILY_CAP_RIDES);
  const extraRidesToday = Math.min(
    Math.max(0, todayRides - BASE_DAILY_CAP_RIDES), 
    Math.max(0, extraRidesToDeduct)
  );
  const totalDeductedRidesToday = baseRidesToday + extraRidesToday;
  const ridesBeyondCapToday = Math.max(0, todayRides - totalDeductibleRidesLimit);

  // Monetary calculations for today
  // 1. Mandatory 2฿ (1฿ Ride + 1฿ Insurance) is deducted on ALL rides run today
  const totalMandatoryPaidToday = todayRides * MANDATORY_SYSTEM_FEE;

  // 2. Installment portion (Jacket 1฿ + Helmet 1฿ + Addons) is deducted only up to totalDeductibleRidesLimit
  const totalInstallmentPaidToday = totalDeductedRidesToday * INSTALLMENT_ONLY_FEE_PER_RIDE;

  // Total paid today
  const grandTotalPaidToday = totalMandatoryPaidToday + totalInstallmentPaidToday;

  const isBaseCapReached = todayRides >= BASE_DAILY_CAP_RIDES;
  const isFullCapReached = todayRides >= totalDeductibleRidesLimit;

  // Cumulative calculation based on currentDay
  const accumulatedPaid = isSuitFullyPaid 
    ? TOTAL_BUNDLE_VALUE 
    : Math.min(TOTAL_BUNDLE_VALUE, (currentDay - 1) * dailyInstallmentDeduction + totalInstallmentPaidToday);
  const remainingDebt = Math.max(0, TOTAL_BUNDLE_VALUE - accumulatedPaid);
  const progressPercent = isSuitFullyPaid ? 100 : Math.min(100, Math.round((accumulatedPaid / TOTAL_BUNDLE_VALUE) * 100));

  const handleAddTodayRide = () => {
    if (audioEnabled) {
      if (todayRides + 1 === BASE_DAILY_CAP_RIDES || todayRides + 1 === totalDeductibleRidesLimit) {
        playLevelUpFanfare();
      } else {
        playTactileBlip(800 + (todayRides % 20) * 20);
      }
    }

    setTodayRides(prev => {
      const next = prev + 1;
      if (next === BASE_DAILY_CAP_RIDES || next === totalDeductibleRidesLimit) {
        confetti({
          particleCount: 45,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#00D2FF', '#FFD700', '#10B981']
        });
      }
      return next;
    });
  };

  const handleSetExtraRides = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    setExtraRidesToDeduct(safeVal);
    if (audioEnabled) playTactileBlip(750 + safeVal * 10);
  };

  const handleClaimOwnership = () => {
    setIsSuitFullyPaid(true);
    if (audioEnabled) playLevelUpFanfare();
    confetti({
      particleCount: 90,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#FFD700', '#00D2FF', '#FFFFFF', '#10B981']
    });
  };

  const handleUpgradeToNextSuit = () => {
    if (currentSuitIndex < KNIGHT_ARMOR_SUITS.length - 1) {
      setCurrentSuitIndex(prev => prev + 1);
      setIsSuitFullyPaid(false);
      setCurrentDay(1);
      if (audioEnabled) playLevelUpFanfare();
      confetti({
        particleCount: 70,
        spread: 80,
        colors: ['#00D2FF', '#FFD700', '#38BDF8']
      });
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0B1A3B] via-[#071128] to-[#040A18] border-2 border-cyan-400/60 shadow-[0_0_30px_rgba(0,210,255,0.2)] space-y-5">
      {/* Header with Title and Policy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-[#FFD700] flex items-center justify-center text-slate-950 font-black shadow-lg flex-shrink-0">
            <Shield className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">4฿ GEAR PAY : โมเดลผ่อนชุดเกราะอัศวิน</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 font-bold">
                หักเริ่มต้น 4 บาท/รอบ
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              บังคับหัก: ค่ารอบ 1฿ + ค่าประกัน 1฿ (ทุกรอบ) + ค่าเสื้อเกราะ 1฿ + ค่าหมวก 1฿ (ไม่เกิน 20 รอบแรก/วัน หรือตั้งเพิ่มได้)
            </p>
          </div>
        </div>

        {/* Current Active Armor Badge */}
        <div className="flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-xl bg-black/50 border border-cyan-400/30">
          <span className="text-[10px] font-mono text-slate-400">ชุดเกราะปัจจุบัน:</span>
          <span className="text-xs font-bold text-cyan-300">{currentSuit.code}</span>
        </div>
      </div>

      {/* 1. FEE BREAKDOWN & CUSTOM GEAR ADD-ON PICKER (แจกแจงโครงสร้าง 1+1+1+1 และอุปกรณ์เสริม) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0A1A3B] via-[#081530] to-[#050C1F] border-2 border-cyan-500/40 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-cyan-400 text-slate-950">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">โครงสร้างการหักต่อรอบ (FEE BREAKDOWN)</h4>
              <p className="text-[10px] text-slate-400">หักตามรอบวิ่งจริง • เลือกล็อตอุปกรณ์เสริมได้ตามต้องการ (+1฿ ต่อชิ้น)</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">อัตราหักรวมปัจจุบัน:</span>
            <span className="text-base sm:text-lg font-black text-amber-300 font-mono">฿{TOTAL_FEE_PER_RIDE}.00 <span className="text-xs text-slate-300">/รอบ</span></span>
          </div>
        </div>

        {/* Breakdown Items Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 font-mono text-xs">
          {/* Item 1: Mandatory Platform */}
          <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> 1฿ : ค่ารอบระบบ
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">ตายตัวทุกรอบ</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">ระบบจับคู่งาน AI + เซิร์ฟเวอร์ 0.02s ไม่จำกัดจำนวนรอบ</p>
          </div>

          {/* Item 2: Mandatory Insurance */}
          <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" /> 1฿ : ค่าประกันภัย
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">ตายตัวทุกรอบ</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">คุ้มครองอุบัติเหตุ พ.ร.บ. พี่วิน + ผู้โดยสาร วงเงิน 500,000฿</p>
          </div>

          {/* Item 3: Armor Jacket */}
          <div className={`p-3 rounded-xl border space-y-1 transition-all ${
            isPayingArmorCore 
              ? 'bg-[#0E244D]/80 border-cyan-400 shadow-[0_0_10px_rgba(0,210,255,0.2)]' 
              : 'bg-black/30 border-white/10 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 flex items-center gap-1">
                <Shirt className="w-3.5 h-3.5 text-cyan-400" /> {isPayingArmorCore ? '1฿ : เสื้อเกราะอัศวิน' : '0฿ : เสื้อเกราะ (ผ่อนหมด)'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-bold">
                {isSuitFullyPaid ? 'กรรมสิทธิ์ 100%' : 'สูงสุด 20 รอบ/วัน'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans truncate">{currentSuit.jacket.name}</p>
          </div>

          {/* Item 4: Smart Helmet */}
          <div className={`p-3 rounded-xl border space-y-1 transition-all ${
            isPayingArmorCore 
              ? 'bg-[#0E244D]/80 border-cyan-400 shadow-[0_0_10px_rgba(0,210,255,0.2)]' 
              : 'bg-black/30 border-white/10 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5 text-amber-400" /> {isPayingArmorCore ? '1฿ : หมวกกันน็อค' : '0฿ : หมวก (ผ่อนหมด)'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                {isSuitFullyPaid ? 'กรรมสิทธิ์ 100%' : 'สูงสุด 20 รอบ/วัน'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans truncate">{currentSuit.helmet.name}</p>
          </div>
        </div>

        {/* Optional Addon Checkboxes (+1฿ each or Cash Buy) */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#FFD700]" />
                <span>อุปกรณ์เสริมไม่บังคับ (Optional Gear Add-ons):</span>
              </span>
              <span className="text-[10px] text-slate-400">
                พี่วินเลือกผ่อนเพิ่มอย่างละ +1฿/รอบ (สูงสุด 20 รอบ/วัน) หรือเลือกซื้อเงินสดรอบเดียวจบ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                ผ่อน {addonCount} รายการ (+{addonCount}฿/รอบ)
              </span>
            </div>
          </div>

          {/* Policy Notice Box regarding Driver Cash/Installment vs Public WIN SHOP Cash-Only */}
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-[#0B1A3B] to-cyan-950/40 border border-[#FFD700]/40 text-[10px] space-y-1 font-mono">
            <div className="flex items-center gap-1.5 text-[#FFD700] font-bold">
              <span>📌</span>
              <span>หมายเหตุสิทธิ์การจัดซื้ออุปกรณ์เสริม (Gear Purchase Policy):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div className="p-1.5 rounded-lg bg-black/30 border border-cyan-500/20">
                <span className="text-cyan-300 font-bold block">🛵 สำหรับพี่วิน (Win Knights):</span>
                <span>สามารถเลือกซื้อได้ทั้ง <strong>"เงินสด (Cash)"</strong> และ <strong>"ผ่อน 4฿ GEAR PAY (+1฿/รอบ)"</strong></span>
              </div>
              <div className="p-1.5 rounded-lg bg-black/30 border border-amber-500/20">
                <span className="text-amber-300 font-bold block">👥 สำหรับคนทั่วไป (General Public / Passengers):</span>
                <span>สามารถซื้อได้ที่เมนู <strong>WIN SHOP</strong> โดยชำระเป็น <strong>"เงินสดเท่านั้น (Cash Only)"</strong></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {/* Addon 1: หูฟังบลูทูธ Intercom */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              addonIntercom ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-md' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addonIntercom} 
                    onChange={(e) => {
                      setAddonIntercom(e.target.checked);
                      if (audioEnabled) playTactileBlip(600);
                    }}
                    className="rounded accent-cyan-500 w-3.5 h-3.5" 
                  />
                  <div>
                    <div className="font-bold text-[11px] text-cyan-300">หูฟังติดหมวก Intercom BT-5.4</div>
                    <div className="text-[9px] text-slate-400">+1฿/รอบ (ผ่อน 2,490฿)</div>
                  </div>
                </label>
                <span className="text-base">🎧</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px]">
                <span className="text-slate-400">หรือซื้อสด: ฿2,490</span>
                <button 
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    alert("💸 พี่วินเลือกซื้อสด 'หูฟังติดหมวก Intercom BT-5.4' ราคา ฿2,490 เรียบร้อย! รับของที่ศูนย์และไม่ต้องหักค่ารอบ");
                    confetti({ particleCount: 25, spread: 45 });
                  }}
                  className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold transition-all"
                >
                  ซื้อสด
                </button>
              </div>
            </div>

            {/* Addon 2: สนับศอก D3O */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              addonElbowGuards ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-md' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addonElbowGuards} 
                    onChange={(e) => {
                      setAddonElbowGuards(e.target.checked);
                      if (audioEnabled) playTactileBlip(600);
                    }}
                    className="rounded accent-cyan-500 w-3.5 h-3.5" 
                  />
                  <div>
                    <div className="font-bold text-[11px] text-cyan-300">สนับศอกชีวกล D3O Bionic</div>
                    <div className="text-[9px] text-slate-400">+1฿/รอบ (ผ่อน 1,490฿)</div>
                  </div>
                </label>
                <span className="text-base">🦾</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px]">
                <span className="text-slate-400">หรือซื้อสด: ฿1,490</span>
                <button 
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    alert("💸 พี่วินเลือกซื้อสด 'สนับศอกชีวกล D3O Bionic' ราคา ฿1,490 เรียบร้อย! รับของทันที");
                    confetti({ particleCount: 25, spread: 45 });
                  }}
                  className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold transition-all"
                >
                  ซื้อสด
                </button>
              </div>
            </div>

            {/* Addon 3: กล่องใส่สัตว์เลี้ยง */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              addonPetBox ? 'bg-amber-950/40 border-amber-400 text-white shadow-md' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addonPetBox} 
                    onChange={(e) => {
                      setAddonPetBox(e.target.checked);
                      if (audioEnabled) playTactileBlip(600);
                    }}
                    className="rounded accent-amber-500 w-3.5 h-3.5" 
                  />
                  <div>
                    <div className="font-bold text-[11px] text-amber-300">กล่องใส่สัตว์เลี้ยง WIN-Pet Pod</div>
                    <div className="text-[9px] text-slate-400">+1฿/รอบ (ผ่อน 3,990฿)</div>
                  </div>
                </label>
                <span className="text-base">🐱</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px]">
                <span className="text-slate-400">หรือซื้อสด: ฿3,990</span>
                <button 
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    alert("💸 พี่วินเลือกซื้อสด 'กล่องใส่สัตว์เลี้ยง WIN-Pet Space Pod' ราคา ฿3,990 เรียบร้อย! ปลดล็อกงานสัตว์เลี้ยงทันที");
                    confetti({ particleCount: 25, spread: 45 });
                  }}
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold transition-all"
                >
                  ซื้อสด
                </button>
              </div>
            </div>

            {/* Addon 4: กล่องใส่อาหาร-พัสดุ */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              addonDeliveryBox ? 'bg-blue-950/40 border-blue-400 text-white shadow-md' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addonDeliveryBox} 
                    onChange={(e) => {
                      setAddonDeliveryBox(e.target.checked);
                      if (audioEnabled) playTactileBlip(600);
                    }}
                    className="rounded accent-blue-500 w-3.5 h-3.5" 
                  />
                  <div>
                    <div className="font-bold text-[11px] text-blue-300">กล่องส่งอาหาร-พัสดุ Thermo Box</div>
                    <div className="text-[9px] text-slate-400">+1฿/รอบ (ผ่อน 3,490฿)</div>
                  </div>
                </label>
                <span className="text-base">📦</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px]">
                <span className="text-slate-400">หรือซื้อสด: ฿3,490</span>
                <button 
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    alert("💸 พี่วินเลือกซื้อสด 'กล่องส่งของอัจฉริยะควบคุมความเย็น Thermo Box' ราคา ฿3,490 เรียบร้อย!");
                    confetti({ particleCount: 25, spread: 45 });
                  }}
                  className="px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-slate-950 font-bold transition-all"
                >
                  ซื้อสด
                </button>
              </div>
            </div>

            {/* Addon 5: ถุงมือหนังแท้การ์บอน */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              addonGloves ? 'bg-purple-950/40 border-purple-400 text-white shadow-md' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addonGloves} 
                    onChange={(e) => {
                      setAddonGloves(e.target.checked);
                      if (audioEnabled) playTactileBlip(600);
                    }}
                    className="rounded accent-purple-500 w-3.5 h-3.5" 
                  />
                  <div>
                    <div className="font-bold text-[11px] text-purple-300">ถุงมือหนังแท้การ์บอน</div>
                    <div className="text-[9px] text-slate-400">+1฿/รอบ (ผ่อน 1,290฿)</div>
                  </div>
                </label>
                <span className="text-base">🧤</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px]">
                <span className="text-slate-400">หรือซื้อสด: ฿1,290</span>
                <button 
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    alert("💸 พี่วินเลือกซื้อสด 'ถุงมือหนังแท้การ์ดคาร์บอน' ราคา ฿1,290 เรียบร้อย!");
                    confetti({ particleCount: 25, spread: 45 });
                  }}
                  className="px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-slate-950 font-bold transition-all"
                >
                  ซื้อสด
                </button>
              </div>
            </div>

            {/* Addon 6: สนับเข่า */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              addonKneeGuards ? 'bg-purple-950/40 border-purple-400 text-white shadow-md' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addonKneeGuards} 
                    onChange={(e) => {
                      setAddonKneeGuards(e.target.checked);
                      if (audioEnabled) playTactileBlip(600);
                    }}
                    className="rounded accent-purple-500 w-3.5 h-3.5" 
                  />
                  <div>
                    <div className="font-bold text-[11px] text-purple-300">สนับเข่า Guardian Plate</div>
                    <div className="text-[9px] text-slate-400">+1฿/รอบ (ผ่อน 1,890฿)</div>
                  </div>
                </label>
                <span className="text-base">🛡️</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px]">
                <span className="text-slate-400">หรือซื้อสด: ฿1,890</span>
                <button 
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    alert("💸 พี่วินเลือกซื้อสด 'สนับเข่า Guardian Plates' ราคา ฿1,890 เรียบร้อย!");
                    confetti({ particleCount: 25, spread: 45 });
                  }}
                  className="px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-slate-950 font-bold transition-all"
                >
                  ซื้อสด
                </button>
              </div>
            </div>

            {/* Addon 7: ที่ยึดมือถือ CNC */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              addonPhoneHolder ? 'bg-purple-950/40 border-purple-400 text-white shadow-md' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addonPhoneHolder} 
                    onChange={(e) => {
                      setAddonPhoneHolder(e.target.checked);
                      if (audioEnabled) playTactileBlip(600);
                    }}
                    className="rounded accent-purple-500 w-3.5 h-3.5" 
                  />
                  <div>
                    <div className="font-bold text-[11px] text-purple-300">ที่ยึดมือถือ CNC ชาร์จ Qi2</div>
                    <div className="text-[9px] text-slate-400">+1฿/รอบ (ผ่อน 990฿)</div>
                  </div>
                </label>
                <span className="text-base">📱</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px]">
                <span className="text-slate-400">หรือซื้อสด: ฿990</span>
                <button 
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    alert("💸 พี่วินเลือกซื้อสด 'ที่ยึดมือถือ CNC 7075 ชาร์จ Qi2' ราคา ฿990 เรียบร้อย!");
                    confetti({ particleCount: 25, spread: 45 });
                  }}
                  className="px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-slate-950 font-bold transition-all"
                >
                  ซื้อสด
                </button>
              </div>
            </div>

            {/* Addon 8: ชุดคลุมกันฝน */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              addonRainCover ? 'bg-purple-950/40 border-purple-400 text-white shadow-md' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addonRainCover} 
                    onChange={(e) => {
                      setAddonRainCover(e.target.checked);
                      if (audioEnabled) playTactileBlip(600);
                    }}
                    className="rounded accent-purple-500 w-3.5 h-3.5" 
                  />
                  <div>
                    <div className="font-bold text-[11px] text-purple-300">ชุดคลุมกันฝน Storm Defender</div>
                    <div className="text-[9px] text-slate-400">+1฿/รอบ (ผ่อน 2,890฿)</div>
                  </div>
                </label>
                <span className="text-base">⚡</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px]">
                <span className="text-slate-400">หรือซื้อสด: ฿2,890</span>
                <button 
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    alert("💸 พี่วินเลือกซื้อสด 'ชุดแจ็กเก็ตกันฝน Storm Shield Pro' ราคา ฿2,890 เรียบร้อย!");
                    confetti({ particleCount: 25, spread: 45 });
                  }}
                  className="px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-slate-950 font-bold transition-all"
                >
                  ซื้อสด
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. POST-PAYOFF & NEXT TIER UPGRADE DECISION BOX (เมื่อผ่อนหมดแล้ว) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#122852] via-[#0C1E42] to-[#08142E] border-2 border-[#FFD700]/70 shadow-[0_0_20px_rgba(255,215,0,0.2)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFD700] text-slate-950 flex items-center justify-center font-black">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">สิทธิ์ความเป็นเจ้าของ 100% และการอัปเกรดเลเวลถัดไป</h4>
                {isSuitFullyPaid && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                    ผ่อนหมดแล้วเป็นเจ้าของ 100%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                เมื่อผ่อนเสื้อและหมวกครบสัญญาแล้ว ชุดเกราะเป็นของพี่วิน 100% ทันที และสามารถเลือกความประสงค์ในการวิ่งงานต่อได้:
              </p>
            </div>
          </div>

          {!isSuitFullyPaid ? (
            <button
              onClick={handleClaimOwnership}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#FFD700] text-slate-950 text-xs font-black shadow-md hover:brightness-110 flex items-center gap-1 self-start sm:self-center"
            >
              <Award className="w-3.5 h-3.5" />
              <span>จำลองผ่อนครบสัญญา 100% 🏆</span>
            </button>
          ) : (
            <button
              onClick={() => setIsSuitFullyPaid(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium self-start sm:self-center"
            >
              รีเซ็ตสถานะ
            </button>
          )}
        </div>

        {/* Choice Radio / Toggles for Driver after Payoff */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Option A: ไม่ผ่อนต่อ -> เหลือหัก 2 บาท/รอบ */}
          <div 
            onClick={() => {
              setAutoUpgradeToNextSuit(false);
              if (audioEnabled) playTactileBlip(700);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
              !autoUpgradeToNextSuit
                ? 'bg-emerald-950/40 border-emerald-400 ring-1 ring-emerald-400 shadow-md'
                : 'bg-black/30 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  !autoUpgradeToNextSuit ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-slate-500'
                }`}>
                  {!autoUpgradeToNextSuit && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-bold text-white">ทางเลือกที่ 1: ไม่ต้องการผ่อนต่อ</span>
              </div>
              <span className="text-xs font-black font-mono text-emerald-400">เหลือ 2฿ /รอบ</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              ชุดเกราะตัวเดิมเป็นของพี่วิน 100% วิ่งรับงานสบายใจ หักเฉพาะค่ารอบ (1฿) + ค่าประกัน (1฿) <strong>รวมเหลือเพียง 2฿/รอบ</strong> เท่านั้น
            </p>
          </div>

          {/* Option B: ผ่อนชุดเกราะเลเวลถัดไปต่อ -> หัก 4 บาทเท่าเดิม */}
          <div 
            onClick={() => {
              setAutoUpgradeToNextSuit(true);
              if (audioEnabled) playTactileBlip(700);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
              autoUpgradeToNextSuit
                ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400 shadow-md'
                : 'bg-black/30 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  autoUpgradeToNextSuit ? 'border-cyan-400 bg-cyan-400 text-slate-950' : 'border-slate-500'
                }`}>
                  {autoUpgradeToNextSuit && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-bold text-white">ทางเลือกที่ 2: ผ่อนอัปเกรดเกราะ Tier ถัดไป</span>
              </div>
              <span className="text-xs font-black font-mono text-cyan-300">หัก 4฿ เท่าเดิม</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              นำชุดเกราะเดิมเก็บเข้าตู้ แล้วรับชุดเกราะ Tier สูงขึ้นตัวใหม่เอี่ยม 0 บาท ผ่อน 4฿/รอบเท่าเดิม (สูงสุด 20 รอบ/วัน)
            </p>
          </div>
        </div>

        {/* Next Tier Upgrade CTA (if Next Suit Available) */}
        {nextSuit && (
          <div className="p-3 rounded-xl bg-black/40 border border-[#FFD700]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
              <span className="text-slate-300">
                ชุดเกราะถัดไปที่พร้อมให้อัปเกรด: <strong className="text-white">{nextSuit.name}</strong> ({nextSuit.code})
              </span>
            </div>
            <button
              onClick={handleUpgradeToNextSuit}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs shadow-md hover:brightness-110 flex items-center justify-center gap-1 self-start sm:self-center"
            >
              <span>เปลี่ยนไปผ่อนชุด {nextSuit.code} ⚡</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. CUSTOM EXTRA RIDES SELECTOR (พี่วินตั้งค่าหักรอบเพิ่มเองหลังจากครบ 20 รอบแรก) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0E244D] via-[#091838] to-[#060F24] border-2 border-[#00D2FF] shadow-[0_0_20px_rgba(0,210,255,0.25)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-cyan-400 text-slate-950">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>กำหนดหักค่ารอบเพิ่มหลังจากครบ 20 รอบแรก</span>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                  เร่งปลดหนี้ไว ⚡
                </span>
              </h4>
              <p className="text-[11px] text-slate-300">
                เลือกจำนวนรอบที่ต้องการให้หักต่อ ({TOTAL_FEE_PER_RIDE}฿/รอบ) หลังจากครบ 20 รอบแรก เพื่อเป็นเจ้าของชุดเกราะ 100% เร็วยิ่งขึ้น
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center font-mono">
            <span className="text-xs text-slate-400">เป้าหมายรวม:</span>
            <span className="text-sm font-black text-cyan-300 bg-black/60 px-2.5 py-1 rounded-xl border border-cyan-500/40">
              {totalDeductibleRidesLimit} รอบ/วัน
            </span>
          </div>
        </div>

        {/* Input Controller with Stepper and Number Field */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
          {/* Stepper Input */}
          <div className="sm:col-span-7 flex items-center gap-2">
            <button
              onClick={() => handleSetExtraRides(extraRidesToDeduct - 1)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black text-base flex items-center justify-center border border-white/10 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex-1 relative">
              <input
                type="number"
                min="0"
                max="100"
                value={extraRidesToDeduct}
                onChange={(e) => handleSetExtraRides(parseInt(e.target.value) || 0)}
                className="w-full h-10 bg-black/70 border-2 border-cyan-400/80 rounded-xl text-center text-base font-mono font-black text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 pl-8 pr-16"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono font-bold">+</span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">รอบเพิ่ม</span>
            </div>

            <button
              onClick={() => handleSetExtraRides(extraRidesToDeduct + 1)}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-base flex items-center justify-center shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="sm:col-span-5 flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
            {[
              { label: '0 (20 รอบ)', val: 0 },
              { label: '+5 รอบ', val: 5 },
              { label: '+10 รอบ', val: 10 },
              { label: '+15 รอบ', val: 15 },
              { label: '+20 รอบ', val: 20 },
            ].map(preset => (
              <button
                key={preset.val}
                onClick={() => handleSetExtraRides(preset.val)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                  extraRidesToDeduct === preset.val
                    ? 'bg-[#FFD700] text-slate-950 shadow-[0_0_10px_rgba(255,215,0,0.5)]'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accelerated Result Metrics Card */}
        <div className="p-3 rounded-xl bg-black/50 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">
              ผ่อนรวมวันละ: <strong className="text-white font-mono">{totalDeductibleRidesLimit} รอบ</strong> (สูงสุด <strong className="text-amber-300 font-mono">฿{dailyTotalDeduction}฿/วัน</strong>)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
            <span className="text-slate-300">
              ระยะเวลาจบสัญญา: <strong className="text-emerald-400 font-mono font-bold">{daysToCompleteAtPace} วัน</strong>
              {daysSaved > 0 && (
                <span className="ml-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ⚡ เร็วกว่าเดิม {daysSaved} วัน!
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 4. TODAY'S LIVE RIDE STATUS TRACKER */}
      <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 font-mono">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>สถานะการวิ่งงานวันนี้ (TODAY'S RIDES TRACKER)</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
            isFullCapReached 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
              : isBaseCapReached
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}>
            {isFullCapReached 
              ? '✅ ครบโควตาผ่อนทั้งหมดของวันนี้แล้ว' 
              : isBaseCapReached
              ? `⚡ อยู่ในช่วงรอบสมัครใจเพิ่ม (${extraRidesToday}/${extraRidesToDeduct})`
              : `เหลืออีก ${BASE_DAILY_CAP_RIDES - todayRides} รอบ (20 รอบแรก)`}
          </span>
        </div>

        {/* 4-Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center font-mono">
          <div className="p-2.5 rounded-xl bg-[#09152B] border border-white/10">
            <span className="text-[9px] text-slate-400 block">วิ่งแล้ววันนี้</span>
            <span className="text-base font-black text-white">{todayRides} รอบ</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#09152B] border border-white/10">
            <span className="text-[9px] text-slate-400 block">20 รอบแรก ({TOTAL_FEE_PER_RIDE}฿/รอบ)</span>
            <span className="text-sm font-black text-cyan-300">฿{baseRidesToday * TOTAL_FEE_PER_RIDE} / ฿{20 * TOTAL_FEE_PER_RIDE}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#09152B] border border-white/10">
            <span className="text-[9px] text-slate-400 block">รอบสมัครใจเพิ่ม (+{extraRidesToDeduct} รอบ)</span>
            <span className="text-sm font-black text-amber-300">฿{extraRidesToday * TOTAL_FEE_PER_RIDE} / ฿{extraRidesToDeduct * TOTAL_FEE_PER_RIDE}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#09152B] border border-white/10">
            <span className="text-[9px] text-slate-400 block">รอบที่ {totalDeductibleRidesLimit + 1}+ (หักแค่ 2฿)</span>
            <span className="text-base font-black text-emerald-400">+{ridesBeyondCapToday} รอบ (ฟรีค่าเกราะ)</span>
          </div>
        </div>

        {/* Visual Dots */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>ผังรอบหักผ่อนวันนี้ ({BASE_DAILY_CAP_RIDES} รอบหลัก + {extraRidesToDeduct} รอบเพิ่ม = {totalDeductibleRidesLimit} รอบ):</span>
            <span className="text-cyan-300 font-bold">{totalDeductedRidesToday} / {totalDeductibleRidesLimit} รอบ (฿{grandTotalPaidToday})</span>
          </div>
          
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-black/30 rounded-xl">
            {Array.from({ length: BASE_DAILY_CAP_RIDES }).map((_, idx) => {
              const isFilled = idx < todayRides;
              return (
                <div
                  key={`base-${idx}`}
                  title={`รอบหลักที่ ${idx + 1}: ${isFilled ? `หักแล้ว ${TOTAL_FEE_PER_RIDE}฿` : 'ยังไม่ถึง'}`}
                  className={`w-6 h-5 rounded flex items-center justify-center text-[8px] font-mono font-bold transition-all ${
                    isFilled 
                      ? 'bg-cyan-400 text-slate-950 shadow-[0_0_6px_rgba(0,210,255,0.6)]' 
                      : 'bg-slate-800 text-slate-500 border border-white/5'
                  }`}
                >
                  {idx + 1}
                </div>
              );
            })}

            {extraRidesToDeduct > 0 && Array.from({ length: extraRidesToDeduct }).map((_, idx) => {
              const rideNum = BASE_DAILY_CAP_RIDES + idx + 1;
              const isFilled = rideNum <= todayRides;
              return (
                <div
                  key={`extra-${idx}`}
                  title={`รอบสมัครใจเพิ่มที่ ${idx + 1} (รอบที่ ${rideNum}): ${isFilled ? `หักแล้ว ${TOTAL_FEE_PER_RIDE}฿` : 'ยังไม่ถึง'}`}
                  className={`w-6 h-5 rounded flex items-center justify-center text-[8px] font-mono font-bold transition-all ${
                    isFilled 
                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_6px_rgba(255,215,0,0.6)]' 
                      : 'bg-amber-950/40 text-amber-500/70 border border-amber-500/20'
                  }`}
                >
                  +{idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleAddTodayRide}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4 text-slate-950" />
            <span>จำลองจบงาน +1 รอบวันนี้ ({todayRides + 1} รอบ)</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(500);
              setTodayRides(0);
            }}
            className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
          >
            รีเซ็ตวัน
          </button>
        </div>

        {isFullCapReached && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>ยินดีด้วย!</strong> ผ่อนชุดเกราะครบเพดาน {totalDeductibleRidesLimit} รอบของวันนี้แล้ว รอบถัดไปตั้งแต่รอบที่ {todayRides + 1} เป็นต้นไปจะ<strong>ไม่ถูกหักค่าเกราะอีก</strong> (หักแค่ 1฿ ค่ารอบ + 1฿ ค่าประกัน = 2฿ เท่านั้น)!
            </span>
          </div>
        )}
      </div>

      {/* 5. CUMULATIVE CONTRACT PROGRESS */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0D1C3D] via-[#09152F] to-[#070E22] border border-[#FFD700]/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFD700] font-mono">
            <Award className="w-4 h-4 text-[#FFD700]" />
            <span>ความคืบหน้ารวมสู่การเป็นเจ้าของ (100% OWNERSHIP PATH)</span>
          </div>
          <span className="text-xs font-black font-mono text-emerald-400">
            {progressPercent}% ผ่อนแล้ว
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-3.5 rounded-full bg-black/60 overflow-hidden border border-white/10 p-[2px]">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-[#FFD700] shadow-[0_0_15px_#00D2FF] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>ชำระสะสม: <strong className="text-white">฿{accumulatedPaid.toLocaleString()}</strong></span>
            <span>ยอดคงเหลือ: <strong className="text-amber-300">฿{remainingDebt.toLocaleString()}</strong> / ฿{TOTAL_BUNDLE_VALUE.toLocaleString()}</span>
          </div>
        </div>

        {/* Day Slider */}
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              จำลองวันที่ในสัญญา (Day 1 - {daysToCompleteAtPace || 45}):
            </span>
            <span className="font-mono font-black text-[#FFD700] bg-black/50 px-2 py-0.5 rounded-lg border border-[#FFD700]/30">
              วันที่ {currentDay} / {daysToCompleteAtPace || 45} วัน
            </span>
          </div>
          <input
            type="range"
            min="1"
            max={daysToCompleteAtPace || 45}
            step="1"
            value={Math.min(currentDay, daysToCompleteAtPace || 45)}
            onChange={(e) => {
              setCurrentDay(Number(e.target.value));
              if (audioEnabled) playTactileBlip(500 + Number(e.target.value) * 15);
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FFD700]"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>วันแรก (รับเกราะ 0฿)</span>
            <span>กึ่งกลางสัญญา (~50%)</span>
            <span>วันที่ {daysToCompleteAtPace || 45} (จบสัญญา รับกรรมสิทธิ์ 100%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

