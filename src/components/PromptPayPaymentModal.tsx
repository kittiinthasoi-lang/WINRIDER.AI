import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  X, 
  CheckCircle2, 
  Copy, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  HeartHandshake, 
  Coins, 
  ExternalLink,
  Smartphone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { playTactileBlip, playLevelUpFanfare, speakThaiText } from '../utils/audio';

interface PromptPayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  payeeName?: string;
  promptPayId?: string;
  amount: number;
  tipAmount?: number;
  audioEnabled?: boolean;
  onPaymentConfirmed?: () => void;
}

export const PromptPayPaymentModal: React.FC<PromptPayPaymentModalProps> = ({
  isOpen,
  onClose,
  orderId = 'ORDER-' + Date.now().toString().slice(-4),
  payeeName = 'วินมอเตอร์ไซค์อัศวิน (พี่สมศักดิ์)',
  promptPayId = '0894451234',
  amount,
  tipAmount = 0,
  audioEnabled = true,
  onPaymentConfirmed,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [customTip, setCustomTip] = useState<number>(tipAmount);

  const totalAmount = amount + customTip;

  useEffect(() => {
    if (!isOpen) {
      setIsPaid(false);
      return;
    }

    setLoading(true);
    generatePromptPayQRDataUrl(promptPayId, totalAmount)
      .then((url) => {
        setQrDataUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to generate PromptPay QR:', err);
        setLoading(false);
      });
  }, [isOpen, promptPayId, totalAmount]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(promptPayId);
    setCopied(true);
    if (audioEnabled) playTactileBlip(1000);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `PromptPay-WINRIDER-${totalAmount}THB.png`;
    a.click();
    if (audioEnabled) playTactileBlip(900);
  };

  const handleConfirmPaid = () => {
    setIsPaid(true);
    if (audioEnabled) {
      playLevelUpFanfare();
      speakThaiText(`ได้รับชำระเงิน ${totalAmount} บาทเรียบร้อยแล้วค่ะ ขอบคุณที่สนับสนุนพี่วินและกองทุนสวัสดิการ 2 บาทค่ะ`);
    }
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#00D2FF', '#10B981', '#FFD700', '#FFFFFF'],
    });

    if (onPaymentConfirmed) {
      onPaymentConfirmed();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,210,255,0.25)] text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with PromptPay Thai Branding */}
        <div className="text-center pb-3 border-b border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-900/60 to-cyan-900/60 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold mb-2 shadow-inner">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>THAI PROMPTPAY EMVCo STANDARD</span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>สแกนจ่ายผ่านพร้อมเพย์</span>
            <span className="text-cyan-400">QR</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            โอนตรงเข้าบัญชีพี่วินทันที ไม่หักหัวคิว (เข้ากองทุน 2 บาทเต็มจำนวน)
          </p>
        </div>

        {/* QR Code Canvas Box */}
        <div className="my-4 flex flex-col items-center">
          <div className="relative p-4 bg-white rounded-2xl shadow-2xl border-4 border-cyan-400/30 flex flex-col items-center">
            {/* PromptPay Top Bar */}
            <div className="w-full text-center pb-2 mb-1 border-b border-slate-200">
              <span className="text-[11px] font-black tracking-widest text-[#002D62] font-mono uppercase">
                PROMPTPAY • พร้อมเพย์
              </span>
            </div>

            {loading ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="PromptPay QR Code"
                className="w-64 h-64 object-contain rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-xs text-slate-500">
                ไม่สามารถสร้าง QR Code ได้
              </div>
            )}

            {/* Total Amount Tag */}
            <div className="mt-2 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                ยอดชำระสุทธิ
              </div>
              <div className="text-2xl font-black text-[#002D62] font-mono">
                ฿{totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quick Tip Selection */}
          <div className="w-full mt-3 px-2">
            <div className="text-xs text-slate-400 flex items-center justify-between mb-1.5 font-medium">
              <span className="flex items-center gap-1 text-amber-300">
                <Coins className="w-3.5 h-3.5" />
                <span>เพิ่มทิปเป็นกำลังใจให้อัศวิน:</span>
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {customTip > 0 ? `+฿${customTip}` : 'ไม่เพิ่มทิป'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 10, 20, 50].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setCustomTip(t);
                    if (audioEnabled) playTactileBlip(800 + t * 5);
                  }}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                    customTip === t
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-102'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  {t === 0 ? '฿0' : `+฿${t}`}
                </button>
              ))}
            </div>
          </div>

          {/* Payee Info & Copy Button */}
          <div className="w-full mt-3 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-mono">ผู้รับเงิน / อัศวิน:</div>
              <div className="text-xs font-bold text-white">{payeeName}</div>
              <div className="text-xs font-mono text-cyan-300 font-semibold mt-0.5">
                {promptPayId.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyId}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-medium flex items-center gap-1 transition-all active:scale-95"
                title="คัดลอกเบอร์พร้อมเพย์"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadQr}
                className="p-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 transition-all active:scale-95"
                title="บันทึกรูป QR"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2-Baht Sovereign Fund Breakdown Reminder */}
          <div className="w-full mt-3 p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-400/25 flex items-start gap-2 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-slate-300 leading-snug">
              <span className="font-bold text-emerald-300">2-Baht Sovereign Fund Allocation:</span>{' '}
              ยอดนี้หักเพียง <span className="font-bold text-white">2.00 บาท</span> เข้า 3 กองทุนสวัสดิการชุมชน (พี่วินรับสุทธิ ฿{(totalAmount - 2).toFixed(2)})
            </div>
          </div>
        </div>

        {/* Action Confirmation Button */}
        <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
          {isPaid ? (
            <div className="w-full py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 animate-bounce">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>ยืนยันการชำระเงินสำเร็จแล้ว!</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition-all active:scale-98"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleConfirmPaid}
                className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ฉันโอนเงินเรียบร้อยแล้ว</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
