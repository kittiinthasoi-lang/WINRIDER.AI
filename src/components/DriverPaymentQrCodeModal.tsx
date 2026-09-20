import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  X, 
  Check, 
  DollarSign, 
  ArrowLeft,
  AlertTriangle,
  Clock,
  Ban,
  Settings,
  Sparkles,
  Smartphone,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { auth } from '../firebase';
import { playTactileBlip } from '../utils/audio';
import { 
  getPaymentProfile, 
  generateDynamicPromptPayQR, 
  PaymentProfile 
} from '../services/paymentProfileService';
import { PaymentReceiverSettingsPanel } from './PaymentReceiverSettingsPanel';

interface DriverPaymentQrCodeModalProps {
  isOpen?: boolean;
  driverUserId?: string;
  driverName?: string;
  driverLevel?: number;
  driverCode?: string;
  defaultAmount?: number;
  fareAmount?: number;
  tipAmount?: number;
  audioEnabled?: boolean;
  onClose: () => void;
  onPaymentSuccess?: (amount: number) => void;
}

export const DriverPaymentQrCodeModal: React.FC<DriverPaymentQrCodeModalProps> = ({
  isOpen = true,
  driverUserId,
  driverName = 'อัศวิน WINRIDER',
  driverLevel = 100,
  driverCode = 'WIN-KNIGHT',
  defaultAmount = 0,
  fareAmount,
  tipAmount,
  audioEnabled = true,
  onClose,
  onPaymentSuccess
}) => {
  const currentUid = driverUserId || auth.currentUser?.uid || 'driver_current';
  const initialAmount = fareAmount !== undefined ? fareAmount : defaultAmount;
  const [customAmount, setCustomAmount] = useState<number>(initialAmount);
  const [tipAdded, setTipAdded] = useState<number>(tipAmount || 0);
  const [copied, setCopied] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [paymentProfile, setPaymentProfile] = useState<PaymentProfile | null>(null);
  const [realQrDataUrl, setRealQrDataUrl] = useState<string>('');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [qrViewMode, setQrViewMode] = useState<'promptpay' | 'bank_slip'>('promptpay');

  const totalCharge = (customAmount > 0 ? customAmount : 0) + tipAdded;

  // Load verified payment profile
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const p = await getPaymentProfile(currentUid);
        if (isMounted) {
          setPaymentProfile(p);
        }
      } catch (err) {
        console.warn('Error loading driver payment profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (isOpen) {
      load();
    }
    return () => { isMounted = false; };
  }, [isOpen, currentUid]);

  // Dynamically generate real EMVCo PromptPay QR when amount or profile changes
  useEffect(() => {
    if (!paymentProfile || paymentProfile.status !== 'verified') {
      setRealQrDataUrl('');
      return;
    }
    const amt = totalCharge > 0 ? totalCharge : undefined;
    generateDynamicPromptPayQR(paymentProfile.promptPayId, amt)
      .then(url => setRealQrDataUrl(url))
      .catch(err => {
        console.warn('Error generating dynamic QR:', err);
        if (paymentProfile.qrCodeDataUrl) {
          setRealQrDataUrl(paymentProfile.qrCodeDataUrl);
        }
      });
  }, [paymentProfile, totalCharge]);

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
    if (!paymentProfile?.promptPayId) return;
    navigator.clipboard?.writeText(paymentProfile.promptPayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isVerified = paymentProfile && paymentProfile.status === 'verified';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (audioEnabled) playTactileBlip(700);
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md max-h-[95vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0F2248] via-[#091530] to-[#040C1A] border-2 border-cyan-400 shadow-[0_0_50px_rgba(0,210,255,0.35)] text-slate-100 p-5 space-y-4">
        
        {/* TOP MODAL HEADER */}
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
                  <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    0% GP Direct P2P
                  </span>
                </h3>
                <p className="text-[9px] text-slate-400 font-mono truncate max-w-[180px]">
                  {paymentProfile?.accountName || driverName}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-500/30 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-colors border border-white/10"
            title="ปิดหน้าต่าง QR"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            <p className="text-xs">กำลังตรวจสอบสถานะช่องทางรับเงินจริง...</p>
          </div>
        )}

        {/* CASE 1: UNCONFIGURED OR NOT VERIFIED BY SUPER ADMIN (STRICT RULE: NO FAKE QR) */}
        {!loading && !isVerified && (
          <div className="p-5 rounded-3xl bg-black/60 border border-amber-500/40 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-300">
              {!paymentProfile ? (
                <QrCode className="w-7 h-7" />
              ) : paymentProfile.status === 'pending_review' ? (
                <Clock className="w-7 h-7 animate-pulse" />
              ) : paymentProfile.status === 'needs_correction' ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <Ban className="w-7 h-7 text-rose-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <h4 className="text-sm font-black text-white">
                {!paymentProfile
                  ? 'ยังไม่ได้ตั้งค่าช่องทางรับเงิน PromptPay'
                  : paymentProfile.status === 'pending_review'
                  ? 'ช่องทางรับเงินอยู่ระหว่างรอ Super Admin ตรวจสอบ'
                  : paymentProfile.status === 'needs_correction'
                  ? 'Super Admin แจ้งให้แก้ไขข้อมูลรับเงิน'
                  : 'ช่องทางรับเงินถูกระงับการใช้งาน'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed px-2">
                {!paymentProfile
                  ? 'ระบบ WINRIDER.AI ยึดหลักความปลอดภัย ไม่แสดง QR จำลองหรือบัญชีปลอม กรุณาตั้งค่า PromptPay จริงเพื่อเปิดรับเงิน'
                  : paymentProfile.status === 'pending_review'
                  ? 'เมื่อได้รับการตรวจสอบและอนุมัติจาก Super Admin แล้ว QR จ่ายเงินจริงจะแสดงขึ้นโดยอัตโนมัติ'
                  : paymentProfile.status === 'needs_correction'
                  ? paymentProfile.reviewNotes || 'กรุณาตรวจสอบชื่อบัญชีและหมายเลข PromptPay ให้ถูกต้อง'
                  : 'กรุณาติดต่อผู้ดูแลระบบเพื่อขอเปิดใช้งาน'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-400">
              💡 ในระหว่างนี้ ผู้โดยสารสามารถชำระเงินค่าโดยสารด้วย <strong>เงินสด</strong> แก่พี่วินได้โดยตรง
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.4)] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>{!paymentProfile ? 'ตั้งค่าช่องทางรับเงินตอนนี้' : 'ดู / แก้ไขข้อมูลช่องทางรับเงิน'}</span>
            </button>
          </div>
        )}

        {/* CASE 2: VERIFIED BY SUPER ADMIN (DISPLAYS REAL EMVCO PROMPTPAY QR) */}
        {!loading && isVerified && paymentProfile && (
          <>
            {/* TOGGLE PROMPTPAY QR VS BANK APP SLIP (IF UPLOADED) */}
            {paymentProfile.bankSlipQrUrl && (
              <div className="grid grid-cols-2 gap-2 bg-black/50 p-1 rounded-2xl border border-white/10 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setQrViewMode('promptpay');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                    qrViewMode === 'promptpay'
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>PromptPay EMVCo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setQrViewMode('bank_slip');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                    qrViewMode === 'bank_slip'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_12px_rgba(255,215,0,0.5)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>QR แอปธนาคาร</span>
                </button>
              </div>
            )}

            {/* REAL QR CODE DISPLAY CARD */}
            <div className="p-4 rounded-3xl bg-white text-slate-900 text-center space-y-3 shadow-2xl relative">
              <div className="flex items-center justify-between border-b pb-2 text-xs font-mono">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    {qrViewMode === 'promptpay' ? 'THAI QR PAYMENT (EMVCo)' : 'BANK APP QR'}
                  </span>
                  <p className="font-black text-slate-900 text-sm">{paymentProfile.accountName}</p>
                </div>
                <div className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>อนุมัติโดย Super Admin</span>
                </div>
              </div>

              {/* QR Image Box */}
              <div className="relative mx-auto w-52 h-52 bg-slate-950 p-2.5 rounded-2xl shadow-inner flex items-center justify-center border-4 border-slate-900">
                <div className="relative w-full h-full bg-white p-2 rounded-xl flex items-center justify-center">
                  {qrViewMode === 'promptpay' ? (
                    realQrDataUrl ? (
                      <img 
                        src={realQrDataUrl} 
                        alt="PromptPay QR จริง" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs text-slate-400">กำลังสร้าง QR...</div>
                    )
                  ) : (
                    <img 
                      src={paymentProfile.bankSlipQrUrl!} 
                      alt="Bank QR จากแอปธนาคาร" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* Amount and PromptPay Display */}
              <div className="font-mono">
                {totalCharge > 0 ? (
                  <div>
                    <span className="text-[11px] text-slate-500">ยอดเงินที่ระบุใน QR:</span>
                    <p className="text-2xl font-black text-slate-950">฿{totalCharge}.00</p>
                    {tipAdded > 0 && <span className="text-[10px] text-amber-600">(รวมทิปน้ำใจ ฿{tipAdded})</span>}
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-slate-700">สแกนระบุจำนวนเงินได้เอง</span>
                  </div>
                )}
                <p className="text-xs text-slate-600 font-bold mt-1">
                  PromptPay: {paymentProfile.promptPayId} {paymentProfile.bankName ? `(${paymentProfile.bankName})` : ''}
                </p>
              </div>
            </div>

            {/* DYNAMIC AMOUNT CUSTOMIZATION (สร้าง QR ตามยอดเงินจริง) */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-cyan-500/40 space-y-2.5 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between">
                <label className="text-cyan-300 font-bold flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-4 h-4 text-[#FFD700]" />
                  <span>ระบุจำนวนเงินเพื่อสร้าง QR ตามยอดจริง (฿):</span>
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

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 font-mono text-xs">
              <button
                type="button"
                onClick={handleCopy}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก PromptPay'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>ตั้งค่ารับเงิน</span>
              </button>
            </div>
          </>
        )}

        {/* CLOSE BUTTON */}
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(700);
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-cyan-300 hover:text-white text-xs font-mono font-bold border border-cyan-500/30 hover:border-cyan-400 transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← ย้อนกลับ / ปิดหน้าต่าง QR Code</span>
          </button>
        </div>
      </div>

      {/* NESTED SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <PaymentReceiverSettingsPanel
              userId={currentUid}
              role="knight"
              defaultName={paymentProfile?.accountName || driverName}
              audioEnabled={audioEnabled}
              onClose={() => setShowSettingsModal(false)}
              onSaved={(p) => {
                setPaymentProfile(p);
                setShowSettingsModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
