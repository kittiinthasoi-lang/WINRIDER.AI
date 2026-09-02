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
  Tag,
  ShoppingBag,
  Store,
  ArrowLeft,
  RefreshCw,
  FileText
} from 'lucide-react';
import { playTactileBlip, playLevelUpFanfare, speakThaiText } from '../utils/audio';
import confetti from 'canvas-confetti';

interface CustomerPaymentQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  defaultItemTitle?: string;
  defaultAmount?: number;
  customerPromptPay?: string;
  customerWalletId?: string;
  audioEnabled?: boolean;
  onPaymentSuccess?: (amount: number, itemTitle: string) => void;
}

export const CustomerPaymentQrCodeModal: React.FC<CustomerPaymentQrCodeModalProps> = ({
  isOpen,
  onClose,
  customerName = 'คุณลูกค้า (ผู้ขายชุมชน C2C)',
  defaultItemTitle = 'สินค้าจาก วันนี้มีของมาขาย',
  defaultAmount = 150,
  customerPromptPay = '081-998-XXXX (พร้อมเพย์)',
  customerWalletId = 'WIN-CUST-7749-TH',
  audioEnabled = true,
  onPaymentSuccess
}) => {
  const [customAmount, setCustomAmount] = useState<number>(defaultAmount);
  const [itemNote, setItemNote] = useState<string>(defaultItemTitle);
  const [sellerName, setSellerName] = useState<string>(customerName);
  const [promptPayNumber, setPromptPayNumber] = useState<string>(customerPromptPay);
  const [copied, setCopied] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [qrType, setQrType] = useState<'promptpay' | 'win_pay'>('promptpay');
  const [itemEmoji, setItemEmoji] = useState<string>('🛍️');

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

  if (!isOpen) return null;

  const handleCopy = () => {
    if (audioEnabled) playTactileBlip(900);
    const textToCopy = qrType === 'promptpay' ? promptPayNumber : customerWalletId;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulatePayment = () => {
    const amt = customAmount > 0 ? customAmount : 150;
    if (audioEnabled) {
      playLevelUpFanfare();
      speakThaiText(`ได้รับยอดเงินค่าสินค้า ฿${amt} จากผู้ซื้อเรียบร้อยแล้ว`);
    }
    setPaymentSuccess(true);
    confetti({
      particleCount: 90,
      spread: 80,
      colors: ['#FFD700', '#00D2FF', '#10B981', '#FF6B6B']
    });

    if (onPaymentSuccess) {
      onPaymentSuccess(amt, itemNote);
    }

    setTimeout(() => {
      setPaymentSuccess(false);
    }, 4500);
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
      <div className="relative w-full max-w-md max-h-[95vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#1C1402] via-[#0F1424] to-[#060A14] border-2 border-[#FFD700] shadow-[0_0_50px_rgba(255,215,0,0.35)] text-slate-100 p-5 space-y-4">
        
        {/* TOP MODAL HEADER WITH BACK & CLOSE BUTTON */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(700);
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-white/15 flex items-center gap-1 text-xs font-mono font-bold transition-all active:scale-95 shadow-sm"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับ</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FFD700] to-amber-500 flex items-center justify-center text-slate-950 font-black shadow-[0_0_12px_#FFD700]">
                <QrCode className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white flex items-center gap-1">
                  <span>QR CODE ลูกค้า (วันนี้มีของมาขาย)</span>
                  <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-[#FFD700] border border-amber-400/40 font-mono">
                    C2C ตลาดนัด
                  </span>
                </h3>
                <p className="text-[9px] text-slate-400 font-mono truncate max-w-[180px]">
                  {sellerName} • 0% ค่าธรรมเนียม
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

        {/* PAYMENT SUCCESS BANNER */}
        {paymentSuccess && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 font-black text-xs font-mono text-center shadow-2xl border-2 border-white animate-bounce flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-slate-950" />
            <span>🎉 ได้รับเงินค่าสินค้า ฿{customAmount > 0 ? customAmount : 150} สำเร็จแล้ว! (เข้าบัญชีทันที)</span>
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
                ? 'bg-gradient-to-r from-[#FFD700] via-amber-400 to-orange-400 text-slate-950 shadow-[0_0_12px_rgba(255,215,0,0.5)]'
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
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>WIN Wallet ลูกค้า</span>
          </button>
        </div>

        {/* 🎛️ CUSTOM AMOUNT INPUT BOX (ช่องระบุจำนวนเงินเอง) */}
        <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-400/40 space-y-2.5 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between">
            <label className="text-amber-300 font-bold flex items-center gap-1.5 text-xs">
              <DollarSign className="w-4 h-4 text-[#FFD700]" />
              <span>ระบุจำนวนเงินที่ต้องการรับเอง (฿):</span>
            </label>
            <button 
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(750);
                setCustomAmount(0);
              }}
              className="text-[10px] text-slate-400 hover:text-amber-300 underline transition-colors"
            >
              ล้างค่า (สแกนระบุยอดอิสระ)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-black text-base">฿</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="ระบุจำนวนเงิน เช่น 50, 150, 300..."
                value={customAmount === 0 ? '' : customAmount}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                  setCustomAmount(val);
                }}
                className="w-full pl-8 pr-3 py-2 bg-slate-900/90 border-2 border-amber-400/60 rounded-xl text-white font-mono font-black text-base focus:outline-none focus:border-[#FFD700] focus:shadow-[0_0_15px_rgba(255,215,0,0.4)] placeholder:text-slate-600 transition-all"
              />
            </div>
            {/* Quick addition chips */}
            <div className="flex items-center gap-1">
              {[+10, +50, +100, +500].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setCustomAmount(prev => prev + inc);
                  }}
                  className="px-2 py-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 text-amber-300 hover:border-amber-400 text-xs font-bold transition-all"
                  title={`เพิ่มอีก ${inc} บาท`}
                >
                  +{inc}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Item Presets */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-slate-400 block">ราคาสินค้า C2C ยอดนิยม:</span>
            <div className="grid grid-cols-6 gap-1 text-xs">
              {[35, 60, 100, 150, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(850);
                    setCustomAmount(amt);
                  }}
                  className={`py-1 rounded-xl border font-bold text-center transition-all ${
                    customAmount === amt
                      ? 'bg-amber-500/30 text-[#FFD700] border-amber-400 shadow-[0_0_10px_rgba(255,215,0,0.3)]'
                      : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/30'
                  }`}
                >
                  ฿{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Item Note & Emoji Selection */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                <FileText className="w-3 h-3 text-cyan-400" />
                <span>บันทึกชื่อสินค้า / ข้อความช่วยจำ:</span>
              </label>
              <div className="flex gap-1">
                {['🛍️', '🍪', '📷', '👗', '🍊', '📚', '💊'].map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(750);
                      setItemEmoji(em);
                    }}
                    className={`w-6 h-6 rounded-md text-xs flex items-center justify-center transition-all ${
                      itemEmoji === em ? 'bg-amber-400 text-slate-950 scale-110 shadow-sm' : 'bg-black/40 text-white hover:bg-white/10'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <input 
              type="text"
              placeholder="เช่น คุกกี้อบสด, เสื้อยืดวินเทจ, ค่าขนส่งพัสดุ C2C..."
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* QR CODE CARD BOX */}
        <div className="p-4 rounded-3xl bg-white text-slate-900 text-center space-y-3 shadow-2xl relative">
          <div className="flex items-center justify-between border-b pb-2 text-xs font-mono">
            <div className="text-left">
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                {qrType === 'promptpay' ? 'THAI QR PAYMENT (PROMPTPAY)' : 'WIN CUSTOMER WALLET'}
              </span>
              <p className="font-black text-slate-900 truncate max-w-[180px]">{sellerName}</p>
            </div>
            <div className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
              ✓ วันนี้มีของมาขาย
            </div>
          </div>

          {/* SVG QR CODE VISUAL */}
          <div className="relative mx-auto w-48 h-48 sm:w-52 sm:h-52 bg-slate-950 p-3 rounded-2xl shadow-inner flex items-center justify-center border-4 border-amber-400">
            <div className="relative w-full h-full bg-white p-2 rounded-xl flex items-center justify-center">
              {/* Synthetic Vector QR Code */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* QR Finder Corners */}
                <rect x="5" y="5" width="28" height="28" fill="#1C1402" rx="3" />
                <rect x="9" y="9" width="20" height="20" fill="#FFFFFF" rx="2" />
                <rect x="13" y="13" width="12" height="12" fill="#1C1402" rx="1.5" />

                <rect x="67" y="5" width="28" height="28" fill="#1C1402" rx="3" />
                <rect x="71" y="9" width="20" height="20" fill="#FFFFFF" rx="2" />
                <rect x="75" y="13" width="12" height="12" fill="#1C1402" rx="1.5" />

                <rect x="5" y="67" width="28" height="28" fill="#1C1402" rx="3" />
                <rect x="9" y="71" width="20" height="20" fill="#FFFFFF" rx="2" />
                <rect x="13" y="75" width="12" height="12" fill="#1C1402" rx="1.5" />

                {/* QR Patterns & Timing */}
                <rect x="38" y="8" width="6" height="6" fill="#1C1402" />
                <rect x="48" y="12" width="6" height="6" fill="#1C1402" />
                <rect x="58" y="8" width="6" height="6" fill="#1C1402" />

                <rect x="38" y="38" width="6" height="6" fill="#1C1402" />
                <rect x="48" y="48" width="6" height="6" fill="#1C1402" />
                <rect x="58" y="38" width="6" height="6" fill="#1C1402" />
                <rect x="48" y="28" width="6" height="6" fill="#1C1402" />
                <rect x="28" y="48" width="6" height="6" fill="#1C1402" />
                <rect x="68" y="48" width="6" height="6" fill="#1C1402" />

                <rect x="38" y="68" width="6" height="6" fill="#1C1402" />
                <rect x="48" y="78" width="6" height="6" fill="#1C1402" />
                <rect x="58" y="68" width="6" height="6" fill="#1C1402" />
                <rect x="68" y="78" width="6" height="6" fill="#1C1402" />
                <rect x="78" y="68" width="6" height="6" fill="#1C1402" />
                <rect x="88" y="88" width="6" height="6" fill="#1C1402" />
              </svg>

              {/* Center Item Badge */}
              <div className="absolute inset-0 m-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 text-white font-black text-base flex items-center justify-center shadow-lg border-2 border-white">
                {itemEmoji}
              </div>
            </div>
          </div>

          <div className="font-mono">
            {customAmount > 0 ? (
              <div>
                <span className="text-[11px] text-slate-500">ยอดเงินที่ระบุ:</span>
                <p className="text-2xl font-black text-slate-950">฿{customAmount}.00</p>
                {itemNote && (
                  <p className="text-[10px] text-amber-700 font-bold truncate max-w-[240px] mx-auto">
                    📝 {itemNote}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold text-slate-700">สแกนระบุจำนวนเงินได้เองอย่างอิสระ</span>
                {itemNote && (
                  <p className="text-[10px] text-slate-500 truncate max-w-[240px] mx-auto mt-0.5">
                    📝 {itemNote}
                  </p>
                )}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              {qrType === 'promptpay' ? promptPayNumber : `Wallet: ${customerWalletId}`}
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS: COPY / SIMULATE PAYMENT */}
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
            className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#FFD700] via-amber-400 to-orange-400 hover:brightness-110 text-slate-950 font-black shadow-[0_0_15px_rgba(255,215,0,0.4)] flex items-center justify-center gap-1.5 transition-all"
          >
            <Coins className="w-4 h-4" />
            <span>จำลองรับเงิน ฿{customAmount > 0 ? customAmount : 150}</span>
          </button>
        </div>

        <div className="space-y-1.5 pt-1">
          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-amber-300 hover:text-white text-xs font-mono font-bold border border-amber-500/30 hover:border-amber-400 transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← ย้อนกลับสู่ตลาดนัด / ปิดหน้าจอ QR Code</span>
          </button>
          <p className="text-[10px] text-center text-slate-500 font-mono">
            แตะปุ่มกลับ, ปุ่ม ✕ หรือแตะพื้นหลังเพื่อปิดหน้าต่าง
          </p>
        </div>
      </div>
    </div>
  );
};
