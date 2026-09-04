import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  Heart,
  QrCode,
  Share2,
  Star,
  Sparkles,
  Award,
  Wallet,
  ArrowRight,
  X,
  FileText,
  ThumbsUp,
  MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playTactileBlip, playLevelUpFanfare } from '../utils/audio';
import { completeLiveOrder, LiveRideOrder } from '../utils/dispatchSync';

interface TripSummaryReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LiveRideOrder | null;
  audioEnabled?: boolean;
}

export const TripSummaryReceiptModal: React.FC<TripSummaryReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  audioEnabled = false
}) => {
  const [tipAmount, setTipAmount] = useState<number>(10);
  const [rating, setRating] = useState<number>(5);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([
    'ขับขี่นุ่มนวล ปลอดภัย',
    'ชำนาญทางลัดตรอกซอย'
  ]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const grossFare = order.fare || 45;
  const welfareFund = order.welfareFund2Baht || 2.0;
  const knightBaseTakeHome = Math.max(0, grossFare - welfareFund);
  const knightTotalPayout = knightBaseTakeHome + tipAmount;
  const totalPassengerPaid = grossFare + tipAmount;

  const handleSelectTip = (amount: number) => {
    if (audioEnabled) playTactileBlip(950);
    setTipAmount(amount);
  };

  const handleToggleBadge = (badge: string) => {
    if (audioEnabled) playTactileBlip(850);
    if (selectedBadges.includes(badge)) {
      setSelectedBadges(selectedBadges.filter((b) => b !== badge));
    } else {
      setSelectedBadges([...selectedBadges, badge]);
    }
  };

  const handleFinish = async () => {
    if (audioEnabled) playLevelUpFanfare();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });

    setIsSubmitted(true);
    await completeLiveOrder(order.id, {
      tipAmount,
      ratingGiven: rating,
      reviewComment: selectedBadges.join(', ')
    });

    setTimeout(() => {
      onClose();
      setIsSubmitted(false);
    }, 1200);
  };

  const handleShareReceipt = () => {
    if (audioEnabled) playTactileBlip(1100);
    const receiptText = `🛵 WINRIDER.AI SOVEREIGN RECEIPT\nรหัสทริป: ${order.id}\nผู้โดยสาร: ${order.passengerName}\nอัศวิน: ${order.driverName || 'พี่สมศักดิ์ ไนท์สายฟ้า'}\nจุดรับ: ${order.pickupLocation}\nจุดส่ง: ${order.dropoffLocation}\nระยะทาง: ${order.distanceKm.toFixed(1)} กม.\nค่าโดยสารรวม: ฿${grossFare.toFixed(2)}\nหักกองทุนสวัสดิการ 2 บาท: -฿2.00 (สมทบกองทุนรักษาพยาบาลและน้ำมันเครื่อง)\nทิปอัศวิน (100%): ฿${tipAmount.toFixed(2)}\nยอดชำระสุทธิ: ฿${totalPassengerPaid.toFixed(2)}`;
    navigator.clipboard.writeText(receiptText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const complimentBadges = [
    'ขับขี่นุ่มนวล ปลอดภัย',
    'ชำนาญทางลัดตรอกซอย',
    'สุภาพ มารยาทดีเยี่ยม',
    'หมวกกันน็อกและเกราะสะอาด',
    'เลี่ยงจุดรถติดแม่นยำ'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#070D1E] rounded-3xl border-2 border-[#00D2FF] p-5 sm:p-6 shadow-[0_0_50px_rgba(0,210,255,0.4)] space-y-4 max-h-[92vh] overflow-y-auto text-slate-100 font-sans">
        
        {/* Header Ribbon */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00D2FF] via-blue-600 to-indigo-700 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(0,210,255,0.4)]">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 tracking-wider">
                  SOVEREIGN TRIP RECEIPT
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
                  2-BAHT VERIFIED
                </span>
              </div>
              <h3 className="text-base font-black text-white">สรุปเที่ยววิ่ง & ใบเสร็จกองทุนสวัสดิการ</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Meta & Knight Info */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A2246] to-[#040C1E] border border-cyan-400/50 flex items-center justify-center text-2xl">
              {order.driverAvatarEmoji || '🦁'}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{order.driverName || 'พี่สมศักดิ์ ไนท์สายฟ้า'}</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono text-[9px] font-bold">
                  Lvl {order.driverLevel || 100}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                ทะเบียน: {order.driverPlate || '1กข 7789 กทม.'} • {order.serviceTitle}
              </p>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400">รหัสออเดอร์</span>
            <div className="text-xs font-bold text-[#FFD700]">{order.id}</div>
          </div>
        </div>

        {/* Route Snapshot */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
          <div className="flex items-start gap-2 text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 mt-1 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-cyan-400 block font-mono">จุดรับ (Pickup):</span>
              <span className="text-white font-medium">{order.pickupLocation}</span>
            </div>
          </div>
          <div className="ml-1 border-l border-dashed border-white/20 h-2" />
          <div className="flex items-start gap-2 text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-emerald-400 block font-mono">จุดส่ง (Dropoff):</span>
              <span className="text-white font-medium">{order.dropoffLocation}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] font-mono text-slate-400">
            <span>ระยะทางจริง: {order.distanceKm.toFixed(1)} กม.</span>
            <span>เวลาเดินทาง: ~{order.estMinutes || 8} นาที</span>
          </div>
        </div>

        {/* 2-Baht Flat Sovereign Fund Breakdown (THE HERO FINANCIAL ENGINE) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0B1A38] via-[#08152E] to-[#040C1E] border-2 border-cyan-400/60 shadow-[0_0_20px_rgba(0,210,255,0.2)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
              <Shield className="w-4 h-4 text-[#FFD700]" />
              <span>การกระจายรายได้ & กองทุนสวัสดิการ 2 บาท</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">P'Win First Model</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>ค่าโดยสารตามระยะทาง (Gross Fare)</span>
              <span className="font-mono font-bold text-white">฿{grossFare.toFixed(2)}</span>
            </div>

            {/* Sovereign 2 Baht deduction */}
            <div className="p-2.5 rounded-xl bg-black/50 border border-amber-400/30 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold text-amber-300 font-mono">
                <span>หักสมทบ "กองทุนสวัสดิการอัศวิน 2 บาท"</span>
                <span>-฿2.00</span>
              </div>
              <div className="pl-2 space-y-0.5 text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>• ฿1.00: กองทุนรักษาพยาบาล & คุ้มครองอุบัติเหตุอัศวิน</span>
                  <span className="text-emerald-400 font-mono">✓ หักแล้ว</span>
                </div>
                <div className="flex justify-between">
                  <span>• ฿1.00: กองทุนน้ำมันเครื่อง ยาง และอะไหล่บำรุงรักษา</span>
                  <span className="text-emerald-400 font-mono">✓ หักแล้ว</span>
                </div>
              </div>
            </div>

            {/* Tip */}
            {tipAmount > 0 && (
              <div className="flex justify-between text-emerald-400 font-mono text-xs">
                <span>สินน้ำใจ / ทิปพี่วิน (อัศวินรับ 100% ไม่หักค่าธรรมเนียม)</span>
                <span className="font-bold">+฿{tipAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">รายได้สุทธิที่พี่วินได้รับเข้ากระเป๋า:</span>
                <span className="text-lg font-black text-emerald-400 font-mono">฿{knightTotalPayout.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono">ยอดที่ผู้โดยสารชำระ:</span>
                <span className="text-lg font-black text-[#00D2FF] font-mono">฿{totalPassengerPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Tip Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>ให้สินน้ำใจ (ทิป) พี่วินส่งต่อกำลังใจ:</span>
            </span>
            <span className="text-[10px] text-cyan-400">พี่วินรับเต็ม 100%</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 10, 20, 50].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleSelectTip(amount)}
                className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                  tipAmount === amount
                    ? 'bg-[#00D2FF] text-slate-950 border-[#00D2FF] shadow-[0_0_15px_rgba(0,210,255,0.4)] scale-102'
                    : 'bg-black/40 text-slate-300 border-white/10 hover:border-cyan-400/40'
                }`}
              >
                {amount === 0 ? 'ไม่ให้ทิป' : `+฿${amount}`}
              </button>
            ))}
          </div>
        </div>

        {/* PromptPay QR Code Payment Display */}
        <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-center gap-3 text-xs">
          <div className="w-24 h-24 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-lg">
            {/* SVG simulated PromptPay QR pattern */}
            <div className="w-full h-full border-2 border-slate-900 rounded p-1 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-4 h-4 bg-slate-950 border border-white" />
                <div className="w-4 h-4 bg-slate-950 border border-white" />
              </div>
              <div className="flex justify-center items-center font-mono font-black text-[7px] text-slate-950">
                PROMPTPAY
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 bg-slate-950 border border-white" />
                <div className="w-3 h-3 bg-cyan-600 rounded-full" />
              </div>
            </div>
          </div>
          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-1 text-cyan-300 font-bold">
              <QrCode className="w-4 h-4" />
              <span>สแกนจ่ายตรงสู่อัศวิน (PromptPay QR)</span>
            </div>
            <p className="text-[11px] text-slate-300">
              ยอดชำระอัตโนมัติ: <strong className="text-white font-mono text-sm">฿{totalPassengerPaid.toFixed(2)}</strong> (รวมทิป)
            </p>
            <p className="text-[10px] text-slate-400">
              เงินโอนเข้าบัญชีพี่วินโดยตรงแบบ Peer-to-Peer ไร้คนกลาง
            </p>
          </div>
        </div>

        {/* 5-Star Rating & Compliments */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 font-mono">ให้คะแนนความประทับใจอัศวิน:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800 + s * 100);
                    setRating(s);
                  }}
                  className="p-1 hover:scale-120 transition"
                >
                  <Star
                    className={`w-5 h-5 ${
                      s <= rating ? 'fill-[#FFD700] text-[#FFD700]' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {complimentBadges.map((badge) => {
              const isSelected = selectedBadges.includes(badge);
              return (
                <button
                  key={badge}
                  type="button"
                  onClick={() => handleToggleBadge(badge)}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-full transition-all border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                      : 'bg-black/40 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  {badge}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={handleShareReceipt}
            className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>{isCopied ? 'คัดลอกใบเสร็จแล้ว!' : 'แชร์ใบเสร็จ'}</span>
          </button>
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitted}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] via-blue-600 to-indigo-600 hover:brightness-110 active:scale-98 text-slate-950 font-black text-xs font-mono shadow-[0_0_25px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2 transition"
          >
            {isSubmitted ? (
              <span>กำลังบันทึกและส่งข้อมูล...</span>
            ) : (
              <>
                <span>เสร็จสิ้นภารกิจ (Finish Ride)</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
