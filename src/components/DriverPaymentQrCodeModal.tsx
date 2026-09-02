import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Copy, 
  CheckCircle2, 
  Download, 
  Share2, 
  Sparkles, 
  Coins, 
  ShieldCheck, 
  X, 
  Check, 
  Zap, 
  Wallet,
  DollarSign,
  ArrowDownToLine,
  RefreshCw,
  Home,
  ArrowLeft,
  ChevronLeft
} from 'lucide-react';
import { playTactileBlip, playLevelUpFanfare, speakThaiText } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Vehicle } from '../types';

interface DriverPaymentQrCodeModalProps {
  isOpen?: boolean;
  driverName?: string;
  driverLevel?: number;
  driverCode?: string;
  activeVehicle?: Vehicle;
  defaultAmount?: number;
  fareAmount?: number;
  tipAmount?: number;
  promptPayNumber?: string;
  audioEnabled?: boolean;
  onClose: () => void;
  onSimulatePaymentReceived?: (amount: number) => void;
  onPaymentSuccess?: (amount: number) => void;
}

export const DriverPaymentQrCodeModal: React.FC<DriverPaymentQrCodeModalProps> = ({
  isOpen = true,
  driverName = 'กิตติ อินทะสร้อย',
  driverLevel = 100,
  driverCode = 'WIN-BKK-LV100',
  activeVehicle,
  defaultAmount = 0,
  fareAmount,
  tipAmount,
  promptPayNumber = '089-445-XXXX (พร้อมเพย์ กสิกรไทย)',
  audioEnabled = true,
  onClose,
  onSimulatePaymentReceived,
  onPaymentSuccess
}) => {
  const initialAmount = fareAmount !== undefined ? fareAmount : defaultAmount;
  const [customAmount, setCustomAmount] = useState<number>(initialAmount);
  const [copied, setCopied] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [qrType, setQrType] = useState<'promptpay' | 'win_pay'>('promptpay');
  const [tipAdded, setTipAdded] = useState<number>(tipAmount || 0);

  const winWalletId = 'WIN-SOVEREIGN-9981-TH';
  const totalCharge = (customAmount > 0 ? customAmount : 0) + tipAdded;

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (audioEnabled) playTactileBlip(700);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, audioEnabled]);

  if (isOpen === false) return null;

  const handleCopy = () => {
    if (audioEnabled) playTactileBlip(900);
    const textToCopy = qrType === 'promptpay' ? (promptPayNumber.split(' ')[0] || '0894458899') : winWalletId;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulatePayment = () => {
    const amt = totalCharge > 0 ? totalCharge : 75;
    if (audioEnabled) {
      playLevelUpFanfare();
      speakThaiText(`ได้รับยอดเงิน ฿${amt} เข้ากระเป๋าเงินอัศวินเรียบร้อยแล้ว`);
    }
    setPaymentSuccess(true);
    confetti({
      particleCount: 80,
      spread: 75,
      colors: ['#00D2FF', '#FFD700', '#10B981', '#FFFFFF']
    });

    if (onSimulatePaymentReceived) {
      onSimulatePaymentReceived(amt);
    }
    if (onPaymentSuccess) {
      onPaymentSuccess(amt);
    }

    setTimeout(() => {
      setPaymentSuccess(false);
    }, 4000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (audioEnabled) playTactileBlip(700);
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md max-h-[95vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0F2248] via-[#091530] to-[#040C1A] border-2 border-[#00D2FF] shadow-[0_0_50px_rgba(0,210,255,0.35)] text-slate-100 p-5 space-y-4">
        
        {/* TOP MODAL HEADER WITH BACK & CLOSE BUTTON */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(700);
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-white/15 flex items-center gap-1 text-xs font-mono font-bold transition-all active:scale-95 shadow-sm"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับ</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_12px_#00D2FF]">
                <QrCode className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white flex items-center gap-1">
                  <span>QR CODE รับเงินอัศวิน</span>
                  <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-mono">
                    0% ค่าธรรมเนียม
                  </span>
                </h3>
                <p className="text-[9px] text-slate-400 font-mono truncate max-w-[180px]">
                  {driverName} • {driverCode}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/30 text-slate-300 hover:text-red-300 flex items-center justify-center transition-colors border border-white/10"
            title="ปิดหน้าต่าง QR"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PAYMENT SUCCESS OVERLAY */}
        {paymentSuccess && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs font-mono text-center shadow-2xl border-2 border-white animate-bounce flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-slate-950" />
            <span>🎉 ลูกค้าชำระเงินสำเร็จ! +฿{totalCharge > 0 ? totalCharge : 75} บาท (เข้าบัญชีทันที 0฿ ธรรมเนียม)</span>
          </div>
        )}

        {/* TOGGLE PROMPTPAY VS WIN WALLET */}
        <div className="grid grid-cols-2 gap-2 bg-black/50 p-1 rounded-2xl border border-white/10 font-mono text-xs">
          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setQrType('promptpay');
            }}
            className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              qrType === 'promptpay'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>พร้อมเพย์ (PromptPay)</span>
          </button>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setQrType('win_pay');
            }}
            className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              qrType === 'win_pay'
                ? 'bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 shadow-[0_0_12px_rgba(255,215,0,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>WIN Pay Sovereign</span>
          </button>
        </div>

        {/* QR CODE CARD BOX */}
        <div className="p-4 rounded-3xl bg-white text-slate-900 text-center space-y-3 shadow-2xl relative">
          <div className="flex items-center justify-between border-b pb-2 text-xs font-mono">
            <div className="text-left">
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                {qrType === 'promptpay' ? 'THAI QR PAYMENT' : 'WIN SOVEREIGN WALLET'}
              </span>
              <p className="font-black text-slate-900">{driverName}</p>
            </div>
            <div className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              ✓ ยืนยันตัวตน DLT
            </div>
          </div>

          {/* SVG QR CODE VISUAL */}
          <div className="relative mx-auto w-48 h-48 sm:w-52 sm:h-52 bg-slate-950 p-3 rounded-2xl shadow-inner flex items-center justify-center border-4 border-slate-900">
            <div className="relative w-full h-full bg-white p-2 rounded-xl flex items-center justify-center">
              {/* Synthetic Vector QR Code */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* QR Finder Corners */}
                <rect x="5" y="5" width="28" height="28" fill="#0A1835" rx="3" />
                <rect x="9" y="9" width="20" height="20" fill="#FFFFFF" rx="2" />
                <rect x="13" y="13" width="12" height="12" fill="#0A1835" rx="1.5" />

                <rect x="67" y="5" width="28" height="28" fill="#0A1835" rx="3" />
                <rect x="71" y="9" width="20" height="20" fill="#FFFFFF" rx="2" />
                <rect x="75" y="13" width="12" height="12" fill="#0A1835" rx="1.5" />

                <rect x="5" y="67" width="28" height="28" fill="#0A1835" rx="3" />
                <rect x="9" y="71" width="20" height="20" fill="#FFFFFF" rx="2" />
                <rect x="13" y="75" width="12" height="12" fill="#0A1835" rx="1.5" />

                {/* QR Patterns & Timing */}
                <rect x="38" y="8" width="6" height="6" fill="#0A1835" />
                <rect x="48" y="12" width="6" height="6" fill="#0A1835" />
                <rect x="58" y="8" width="6" height="6" fill="#0A1835" />

                <rect x="38" y="38" width="6" height="6" fill="#0A1835" />
                <rect x="48" y="48" width="6" height="6" fill="#0A1835" />
                <rect x="58" y="38" width="6" height="6" fill="#0A1835" />
                <rect x="48" y="28" width="6" height="6" fill="#0A1835" />
                <rect x="28" y="48" width="6" height="6" fill="#0A1835" />
                <rect x="68" y="48" width="6" height="6" fill="#0A1835" />

                <rect x="38" y="68" width="6" height="6" fill="#0A1835" />
                <rect x="48" y="78" width="6" height="6" fill="#0A1835" />
                <rect x="58" y="68" width="6" height="6" fill="#0A1835" />
                <rect x="68" y="78" width="6" height="6" fill="#0A1835" />
                <rect x="78" y="68" width="6" height="6" fill="#0A1835" />
                <rect x="88" y="88" width="6" height="6" fill="#0A1835" />
              </svg>

              {/* Center Logo Badge */}
              <div className="absolute inset-0 m-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-slate-950 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                🏍️
              </div>
            </div>
          </div>

          <div className="font-mono">
            {totalCharge > 0 ? (
              <div>
                <span className="text-[11px] text-slate-500">ยอดเงินที่ระบุ:</span>
                <p className="text-2xl font-black text-slate-950">฿{totalCharge}.00</p>
                {tipAdded > 0 && <span className="text-[10px] text-amber-600">(รวมทิปน้ำใจ ฿{tipAdded})</span>}
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold text-slate-700">สแกนระบุจำนวนเงินได้เองตามมิเตอร์</span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              {qrType === 'promptpay' ? promptPayNumber : `Wallet: ${winWalletId}`}
            </p>
          </div>
        </div>

        {/* CUSTOM AMOUNT INPUT (ช่องให้พี่วินระบุจำนวนเงินเอง) */}
        <div className="p-3.5 rounded-2xl bg-black/60 border border-cyan-500/40 space-y-2.5 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between">
            <label className="text-cyan-300 font-bold flex items-center gap-1.5 text-xs">
              <DollarSign className="w-4 h-4 text-[#FFD700]" />
              <span>ระบุจำนวนเงินค่าโดยสาร / ค่าบริการเอง (฿):</span>
            </label>
            <button 
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(750);
                setCustomAmount(0);
                setTipAdded(0);
              }}
              className="text-[10px] text-slate-400 hover:text-cyan-300 underline transition-colors"
            >
              ล้างค่า (เปิดสแกนอิสระ)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-black text-base">฿</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="ระบุจำนวนเงิน เช่น 50, 80, 150..."
                value={customAmount === 0 ? '' : customAmount}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                  setCustomAmount(val);
                }}
                className="w-full pl-8 pr-3 py-2 bg-slate-900/90 border-2 border-cyan-500/60 rounded-xl text-white font-mono font-black text-base focus:outline-none focus:border-[#00D2FF] focus:shadow-[0_0_15px_rgba(0,210,255,0.4)] placeholder:text-slate-600 transition-all"
              />
            </div>
            {/* Quick addition chips */}
            <div className="flex items-center gap-1">
              {[+10, +20, +50, +100].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setCustomAmount(prev => prev + inc);
                  }}
                  className="px-2 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-cyan-300 hover:border-cyan-400 text-xs font-bold transition-all"
                  title={`เพิ่มอีก ${inc} บาท`}
                >
                  +{inc}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-slate-400 block">ราคาตามระยะทางยอดนิยม:</span>
            <div className="grid grid-cols-6 gap-1 text-xs">
              {[35, 45, 65, 80, 120, 150].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(850);
                    setCustomAmount(amt);
                  }}
                  className={`py-1 rounded-xl border font-bold text-center transition-all ${
                    customAmount === amt
                      ? 'bg-cyan-500/30 text-[#00D2FF] border-cyan-400 shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                      : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/30'
                  }`}
                >
                  ฿{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Tip Addition */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
            <span className="text-amber-300 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFD700]" />
              <span>ทิปน้ำใจอัศวิน:</span>
            </span>
            <div className="flex items-center gap-1">
              {[10, 20, 50, 100].map((tip) => (
                <button
                  key={tip}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    setTipAdded(prev => prev === tip ? 0 : tip);
                  }}
                  className={`px-2 py-0.5 rounded-lg border font-bold ${
                    tipAdded === tip
                      ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-sm'
                      : 'bg-black/30 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  +{tip}฿
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS: COPY / SIMULATE PAYMENT / CLOSE */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 font-mono text-xs">
          <button
            onClick={handleCopy}
            className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกเลขบัญชี'}</span>
          </button>

          <button
            onClick={handleSimulatePayment}
            className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-1.5 transition-all"
          >
            <Coins className="w-4 h-4" />
            <span>จำลองรับเงิน ฿{totalCharge > 0 ? totalCharge : 75}</span>
          </button>
        </div>

        <div className="space-y-1.5 pt-1">
          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-cyan-300 hover:text-white text-xs font-mono font-bold border border-cyan-500/30 hover:border-cyan-400 transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← ย้อนกลับสู่หน้าโปรไฟล์ / ปิดหน้าจอ QR Code</span>
          </button>
          <p className="text-[10px] text-center text-slate-500 font-mono">
            แตะปุ่มกลับ, ปุ่ม ✕ กากบาท หรือแตะพื้นหลังสีดำเพื่อปิดหน้าต่าง
          </p>
        </div>
      </div>
    </div>
  );
};
