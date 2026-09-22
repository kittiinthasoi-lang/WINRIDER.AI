import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  CheckCircle2, 
  Copy, 
  ShieldCheck, 
  X, 
  DollarSign, 
  Store,
  Building2,
  Clock,
  AlertTriangle,
  Ban,
  Settings,
  Smartphone,
  Check,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { playTactileBlip } from '../utils/audio';
import { 
  getPaymentProfile, 
  generateDynamicPromptPayQR, 
  PaymentProfile 
} from '../services/paymentProfileService';
import { PaymentReceiverSettingsPanel } from './PaymentReceiverSettingsPanel';
import { WinQrScanner } from './WinQrScanner';

interface WinScanAndPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId?: string;
  entityName: string;
  entityType: 'merchant' | 'partner' | 'citizen';
  entityCategoryLabel?: string;
  defaultAmount?: number;
  audioEnabled?: boolean;
}

export const WinScanAndPayModal: React.FC<WinScanAndPayModalProps> = ({
  isOpen,
  onClose,
  entityId,
  entityName,
  entityType,
  entityCategoryLabel = 'ร้านค้า / บริการพันธมิตร',
  defaultAmount = 0,
  audioEnabled = true
}) => {
  const targetId = entityId || (entityType === 'merchant' ? 'merchant_main' : 'partner_main');
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentProfile, setPaymentProfile] = useState<PaymentProfile | null>(null);
  const [realQrDataUrl, setRealQrDataUrl] = useState<string>('');
  const [qrViewMode, setQrViewMode] = useState<'promptpay' | 'bank_slip'>('promptpay');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showQrScanner, setShowQrScanner] = useState(false);

  // Load verified payment profile for this merchant/partner
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const p = await getPaymentProfile(targetId);
        if (isMounted) {
          setPaymentProfile(p);
        }
      } catch (err) {
        console.warn('Error loading entity payment profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (isOpen) {
      load();
    }
    return () => { isMounted = false; };
  }, [isOpen, targetId]);

  // Generate real EMVCo PromptPay QR dynamically based on amount
  useEffect(() => {
    if (!paymentProfile || paymentProfile.status !== 'verified') {
      setRealQrDataUrl('');
      return;
    }
    const amt = amount > 0 ? amount : undefined;
    generateDynamicPromptPayQR(paymentProfile.promptPayId, amt)
      .then(url => setRealQrDataUrl(url))
      .catch(err => {
        console.warn('Error generating dynamic QR:', err);
        if (paymentProfile.qrCodeDataUrl) {
          setRealQrDataUrl(paymentProfile.qrCodeDataUrl);
        }
      });
  }, [paymentProfile, amount]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (audioEnabled) playTactileBlip(800);
    if (!paymentProfile?.promptPayId) return;
    navigator.clipboard?.writeText(paymentProfile.promptPayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVerified = paymentProfile && paymentProfile.status === 'verified';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#070D1E] border-2 border-cyan-400 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,210,255,0.3)] text-slate-100 space-y-4 max-h-[95vh] overflow-y-auto">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">สแกนจ่าย PromptPay</h3>
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
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowQrScanner(true)}
          className="w-full py-2.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-black text-xs flex items-center justify-center gap-2"
        >
          <QrCode className="w-4 h-4" />
          เปิดกล้องสแกน QR จริง
        </button>

        {/* LOADING STATE */}
        {loading && (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            <p className="text-xs">กำลังตรวจสอบสถานะช่องทางรับเงินจริง...</p>
          </div>
        )}

        {/* CASE 1: UNCONFIGURED OR NOT VERIFIED (STRICT RULE: NO FAKE QR) */}
        {!loading && !isVerified && (
          <div className="p-5 rounded-3xl bg-black/60 border border-amber-500/40 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-300">
              {!paymentProfile ? (
                <Store className="w-7 h-7" />
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
                  ? `${entityName} ยังไม่ได้ตั้งค่าช่องทางรับเงินจริง`
                  : paymentProfile.status === 'pending_review'
                  ? 'ช่องทางรับเงินอยู่ระหว่างรอ Super Admin ตรวจสอบ'
                  : paymentProfile.status === 'needs_correction'
                  ? 'Super Admin แจ้งให้แก้ไขข้อมูลรับเงิน'
                  : 'ช่องทางรับเงินถูกระงับการใช้งาน'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed px-2">
                {!paymentProfile
                  ? 'ระบบ WINRIDER.AI แสดงเฉพาะ PromptPay จริงที่ผ่านการตรวจสอบเท่านั้น ไม่สร้าง QR จำลองหรือบัญชีปลอม'
                  : paymentProfile.status === 'pending_review'
                  ? 'เมื่อได้รับการอนุมัติจาก Super Admin แล้ว QR จ่ายเงินจริงจะแสดงขึ้นทันที'
                  : paymentProfile.status === 'needs_correction'
                  ? paymentProfile.reviewNotes || 'กรุณาตรวจสอบชื่อบัญชีและหมายเลข PromptPay ให้ถูกต้อง'
                  : 'กรุณาติดต่อผู้ดูแลระบบเพื่อขอเปิดใช้งาน'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-400">
              💡 ในระหว่างนี้ ลูกค้าสามารถชำระเงินโดยตรงด้วย <strong>เงินสด</strong> หรือช่องทางอื่นตามที่ตกลงกับทางร้าน
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.4)] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>{!paymentProfile ? 'ตั้งค่ารับเงินสำหรับร้านนี้' : 'ดู / แก้ไขข้อมูลรับเงิน'}</span>
            </button>
          </div>
        )}

        {/* CASE 2: VERIFIED BY SUPER ADMIN (DISPLAYS REAL EMVCO PROMPTPAY QR) */}
        {!loading && isVerified && paymentProfile && (
          <div className="space-y-4">
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

            {/* Holographic QR Code Box */}
            <div className="relative p-4 rounded-3xl bg-white text-slate-950 mx-auto w-full max-w-[280px] shadow-2xl flex flex-col items-center justify-center space-y-2 text-center">
              <div className="flex items-center justify-between w-full border-b pb-1.5 text-xs font-mono">
                <div className="text-left">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">
                    {qrViewMode === 'promptpay' ? 'THAI QR PAYMENT' : 'BANK APP QR'}
                  </span>
                  <p className="font-black text-slate-900 text-xs truncate max-w-[150px]">
                    {paymentProfile.accountName}
                  </p>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-300 flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>อนุมัติจริง</span>
                </div>
              </div>

              {/* QR Image */}
              <div className="relative w-48 h-48 bg-slate-950 rounded-2xl p-2 flex items-center justify-center border-4 border-slate-900">
                <div className="relative w-full h-full bg-white p-1.5 rounded-xl flex items-center justify-center">
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

              <div className="text-center font-mono">
                {amount > 0 ? (
                  <div>
                    <span className="text-[10px] text-slate-500">ยอดที่ระบุใน QR:</span>
                    <p className="text-xl font-black text-slate-950">฿{amount.toLocaleString()}.00</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-[11px] font-bold text-slate-700">สแกนระบุจำนวนเงินได้เอง</span>
                  </div>
                )}
                <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                  PromptPay: {paymentProfile.promptPayId} {paymentProfile.bankName ? `(${paymentProfile.bankName})` : ''}
                </p>
              </div>
            </div>

            {/* Amount quick selector (สร้าง QR ตามยอดเงินจริง) */}
            <div className="p-3 rounded-2xl bg-black/50 border border-cyan-500/30 space-y-2 text-left font-mono">
              <div className="flex items-center justify-between">
                <label className="text-xs text-cyan-300 font-bold flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#FFD700]" />
                  <span>ระบุจำนวนเงินสร้าง QR (฿):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(0)}
                  className="text-[10px] text-slate-400 hover:text-cyan-300 underline"
                >
                  สแกนอิสระ
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-bold text-sm">฿</span>
                  <input 
                    type="number"
                    min="0"
                    placeholder="เช่น 150..."
                    value={amount === 0 ? '' : amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl py-2 pl-8 pr-3 text-white font-mono text-base font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>
                {[50, 100, 200, 500].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      setAmount(val);
                    }}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                      amount === val 
                        ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400' 
                        : 'bg-white/5 hover:bg-cyan-500/20 border-white/10 text-slate-300'
                    }`}
                  >
                    ฿{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-xs">
              <button
                type="button"
                onClick={handleCopy}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition-colors font-mono"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก PromptPay'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-colors font-mono"
              >
                <Settings className="w-4 h-4" />
                <span>ตั้งค่ารับเงิน</span>
              </button>
            </div>
          </div>
        )}

        {/* Back / Close button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-cyan-300 hover:text-white text-xs font-mono font-bold border border-cyan-500/30 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ปิดหน้าต่าง</span>
          </button>
        </div>
      </div>

      {showQrScanner && (
        <WinQrScanner
          onClose={() => setShowQrScanner(false)}
          onVerified={({ verification }) => {
            if (verification?.ok && verification?.owner?.accountName) {
              // Keep the display modal open; verified owner data is shown by the scanner.
            }
          }}
        />
      )}

      {/* NESTED SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <PaymentReceiverSettingsPanel
              userId={targetId}
              role={entityType === 'merchant' ? 'merchant' : 'partner'}
              defaultName={paymentProfile?.accountName || entityName}
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
