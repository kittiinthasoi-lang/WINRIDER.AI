import React, { useState } from 'react';
import { 
  QrCode, 
  Wallet, 
  CheckCircle2, 
  Copy, 
  ShieldCheck, 
  Sparkles, 
  X, 
  ArrowDownRight, 
  DollarSign, 
  Receipt,
  Store,
  Building2,
  RefreshCw
} from 'lucide-react';
import { playTactileBlip, playLevelUpFanfare } from '../utils/audio';
import confetti from 'canvas-confetti';

interface WinScanAndPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  entityType: 'merchant' | 'partner';
  entityCategoryLabel?: string;
  defaultAmount?: number;
  qrWalletAddress?: string;
  audioEnabled?: boolean;
}

export const WinScanAndPayModal: React.FC<WinScanAndPayModalProps> = ({
  isOpen,
  onClose,
  entityName,
  entityType,
  entityCategoryLabel = 'ร้านค้าพันธมิตร',
  defaultAmount = 150,
  qrWalletAddress = 'WIN-PAY-TH-9842-8819',
  audioEnabled = true
}) => {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [note, setNote] = useState<string>('ชำระค่าสินค้า/บริการ WINRIDER');
  const [copied, setCopied] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [userWalletBalance, setUserWalletBalance] = useState<number>(2450);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'simulate'>('qr');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (audioEnabled) playTactileBlip(800);
    navigator.clipboard?.writeText?.(qrWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = () => {
    if (userWalletBalance < amount) {
      alert('⚠️ ยอดเงินในกระเป๋า WIN Wallet ไม่เพียงพอ');
      return;
    }
    if (audioEnabled) playTactileBlip(1000);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setUserWalletBalance(prev => prev - amount);
      setPaymentSuccess(true);
      if (audioEnabled) playLevelUpFanfare();
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00D2FF', '#FFD700', '#10B981']
      });
    }, 1200);
  };

  const handleReset = () => {
    setPaymentSuccess(false);
    setActiveTab('qr');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#070D1E] border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_40px_rgba(0,210,255,0.25)] text-slate-100 space-y-5 overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">WIN Scan & Pay</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {entityType === 'merchant' ? '🏬 ร้านค้า' : '🤝 พาร์ทเนอร์'}
                </span>
              </div>
              <p className="text-xs text-slate-400">{entityName} ({entityCategoryLabel})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Modes */}
        {!paymentSuccess ? (
          <>
            {/* Tab switch */}
            <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'qr'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code รับเงิน</span>
              </button>
              <button
                onClick={() => setActiveTab('simulate')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'simulate'
                    ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(255,215,0,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>จำลองการจ่ายเงิน</span>
              </button>
            </div>

            {activeTab === 'qr' ? (
              <div className="space-y-4 text-center">
                {/* Holographic QR Code Box */}
                <div className="relative p-5 rounded-2xl bg-white text-slate-950 mx-auto w-64 shadow-2xl flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-slate-900 mb-2">
                    <span>🦁 WINRIDER<strong className="text-cyan-600">.PAY</strong></span>
                  </div>

                  {/* Synthetic Stylized QR Matrix */}
                  <div className="relative w-44 h-44 bg-slate-900 rounded-xl p-2.5 flex items-center justify-center border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(0,210,255,0.4)]">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                      {/* Corners */}
                      <rect x="5" y="5" width="25" height="25" fill="#00D2FF" rx="2" />
                      <rect x="10" y="10" width="15" height="15" fill="#070D1E" rx="1" />
                      <rect x="13" y="13" width="9" height="9" fill="#00D2FF" />

                      <rect x="70" y="5" width="25" height="25" fill="#00D2FF" rx="2" />
                      <rect x="75" y="10" width="15" height="15" fill="#070D1E" rx="1" />
                      <rect x="78" y="13" width="9" height="9" fill="#00D2FF" />

                      <rect x="5" y="70" width="25" height="25" fill="#00D2FF" rx="2" />
                      <rect x="10" y="75" width="15" height="15" fill="#070D1E" rx="1" />
                      <rect x="13" y="78" width="9" height="9" fill="#00D2FF" />

                      {/* Random Tech Data Matrix Pixels */}
                      <rect x="35" y="8" width="8" height="8" fill="#FFF" />
                      <rect x="48" y="8" width="6" height="6" fill="#00D2FF" />
                      <rect x="58" y="8" width="7" height="7" fill="#FFF" />
                      
                      <rect x="35" y="20" width="12" height="6" fill="#FFF" />
                      <rect x="52" y="18" width="8" height="8" fill="#FFD700" />
                      <rect x="8" y="35" width="12" height="6" fill="#FFF" />
                      <rect x="25" y="35" width="8" height="8" fill="#00D2FF" />
                      
                      <rect x="38" y="38" width="24" height="24" fill="#00D2FF" rx="4" />
                      <rect x="42" y="42" width="16" height="16" fill="#070D1E" rx="2" />
                      {/* Lion Center Badge */}
                      <text x="50" y="54" fontSize="11" textAnchor="middle" fill="#FFD700">🦁</text>

                      <rect x="70" y="35" width="10" height="6" fill="#FFF" />
                      <rect x="84" y="38" width="8" height="12" fill="#00D2FF" />
                      <rect x="8" y="48" width="8" height="14" fill="#FFF" />
                      <rect x="20" y="52" width="12" height="8" fill="#00D2FF" />

                      <rect x="35" y="70" width="14" height="8" fill="#FFF" />
                      <rect x="54" y="68" width="8" height="12" fill="#00D2FF" />
                      <rect x="68" y="72" width="12" height="8" fill="#FFD700" />
                      <rect x="85" y="70" width="8" height="8" fill="#FFF" />
                      <rect x="35" y="84" width="8" height="8" fill="#00D2FF" />
                      <rect x="48" y="85" width="16" height="7" fill="#FFF" />
                      <rect x="70" y="86" width="22" height="7" fill="#00D2FF" />
                    </svg>
                  </div>

                  <div className="mt-2 text-center">
                    <span className="text-[11px] font-bold text-slate-700">PromptPay / WIN Wallet NFC</span>
                    <p className="text-[9px] text-slate-500 font-mono">{qrWalletAddress}</p>
                  </div>
                </div>

                {/* Amount quick selector */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs text-slate-300 font-medium">ระบุจำนวนเงินที่ต้องการรับ (บาท):</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-bold text-sm">฿</span>
                      <input 
                        type="number"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value) || 0)}
                        className="w-full bg-black/40 border border-cyan-500/30 rounded-xl py-2 pl-8 pr-3 text-white font-mono text-base font-bold focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    {[50, 100, 200, 500].map(val => (
                      <button
                        key={val}
                        onClick={() => setAmount(val)}
                        className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-xs font-mono font-bold text-cyan-300"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ปลอดภัยมาตรฐาน PCI-DSS
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-cyan-400 hover:underline text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ดกระเป๋า'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Balance Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/30 border border-cyan-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">ยอดเงินใน WIN Wallet ของฉัน</span>
                      <p className="text-base font-mono font-black text-white">฿{userWalletBalance.toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    พร้อมใช้งาน
                  </span>
                </div>

                {/* Bill Summary */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>ผู้รับเงิน:</span>
                    <strong className="text-white">{entityName}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ประเภท:</span>
                    <span className="text-cyan-300">{entityCategoryLabel}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ค่าธรรมเนียมระบบ:</span>
                    <span className="text-emerald-400 font-bold">ฟรี (0%)</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-slate-200">ยอดชำระสุทธิ:</span>
                    <span className="text-amber-400 font-mono text-base">฿{amount.toLocaleString()} บาท</span>
                  </div>
                </div>

                {/* Pay Button */}
                <button
                  onClick={handleSimulatePayment}
                  disabled={isProcessing || amount <= 0}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-[#0066FF] text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(0,210,255,0.5)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังประมวลผลธุรกรรม...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>ยืนยันสแกนจ่ายทันที (฿{amount})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Receipt Screen */
          <div className="space-y-4 text-center py-2 animate-scaleIn">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-black text-white">ชำระเงินสำเร็จเรียบร้อย!</h4>
              <p className="text-xs text-slate-400">รหัสสลิป: #WINPAY-{Date.now().toString().slice(-6)}</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/30 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>ผู้รับชำระ:</span>
                <span className="text-white font-sans">{entityName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>จำนวนเงิน:</span>
                <span className="text-amber-400 font-bold">฿{amount.toLocaleString()} THB</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ยอดเงินคงเหลือ:</span>
                <span className="text-cyan-300">฿{userWalletBalance.toLocaleString()} THB</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>เวลาทำรายการ:</span>
                <span className="text-slate-300">{new Date().toLocaleTimeString('th-TH')} น.</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all"
              >
                ทำรายการใหม่
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black hover:brightness-110 shadow-[0_0_12px_rgba(0,210,255,0.4)] transition-all"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
