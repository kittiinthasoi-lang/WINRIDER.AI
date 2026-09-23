import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Check, Loader2, QrCode, ShieldCheck, Wallet, X } from 'lucide-react';
import QRCode from 'qrcode';
import { getWalletMe } from '../services/walletService';
import { playTactileBlip } from '../utils/audio';

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
  driverName = 'อัศวิน WINRIDER',
  driverLevel = 100,
  defaultAmount = 0,
  fareAmount,
  tipAmount,
  audioEnabled = true,
  onClose,
}) => {
  const initialAmount = fareAmount !== undefined ? fareAmount : defaultAmount;
  const [amount, setAmount] = useState(Math.max(0, initialAmount + Number(tipAmount || 0)));
  const [walletId, setWalletId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    void getWalletMe('knight')
      .then((wallet) => {
        if (!cancelled) setWalletId(wallet.walletId || '');
      })
      .catch(() => {
        if (!cancelled) setError('โหลด WIN Wallet ไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!walletId || !/^WIN-[CKMP]-[A-Z2-9]{8}$/.test(walletId)) {
      setQrDataUrl('');
      return;
    }
    const payload = JSON.stringify({
      type: 'WIN_WALLET_PAYMENT',
      walletId,
      ...(amount > 0 ? { amount } : {}),
      note: 'WINRIDER Knight payment',
    });
    void QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: 280 })
      .then(setQrDataUrl)
      .catch(() => setError('สร้าง WIN Wallet QR ไม่สำเร็จ'));
  }, [walletId, amount]);

  if (!isOpen) return null;

  const copyWalletId = async () => {
    if (!walletId || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(walletId);
      setCopied(true);
      if (audioEnabled) playTactileBlip(900);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('คัดลอก WIN Wallet ID ไม่สำเร็จ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md space-y-4 rounded-3xl border-2 border-cyan-400 bg-gradient-to-b from-[#0F2248] via-[#091530] to-[#040C1A] p-5 text-slate-100 shadow-[0_0_50px_rgba(0,210,255,0.35)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <button type="button" onClick={onClose} className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-cyan-300">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </button>
          <div className="text-center">
            <p className="text-sm font-black text-white">รับเงินผ่าน WIN Wallet</p>
            <p className="text-[10px] text-slate-400">{driverName} • LV.{driverLevel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs text-cyan-100">
          <ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-300" />
          การจ่ายใน WINRIDER ใช้ WIN Wallet เท่านั้น ผู้จ่ายต้องเติมเงินก่อน ระบบตัดยอดและบันทึก Ledger ภายในแอป
        </div>

        <label className="block text-xs font-bold text-slate-300">
          จำนวนเงิน (บาท)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount || ''}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            placeholder="ระบุยอดที่ต้องการรับ"
          />
        </label>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div>
        ) : qrDataUrl ? (
          <div className="rounded-3xl bg-white p-4 text-center text-slate-900">
            <img src={qrDataUrl} alt="WIN Wallet QR" className="mx-auto h-52 w-52 object-contain" />
            <p className="mt-2 text-xs font-bold text-slate-500">WIN Wallet ของผู้รับ</p>
            <p className="font-mono text-sm font-black">{walletId}</p>
            {amount > 0 && <p className="mt-1 text-2xl font-black">฿{amount.toFixed(2)}</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-center text-xs text-amber-200">
            ยังไม่พบ WIN Wallet ID จริงสำหรับบทบาทพี่วิน
          </div>
        )}

        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}

        <button type="button" onClick={() => void copyWalletId()} disabled={!walletId} className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-2.5 text-xs font-black text-cyan-200 disabled:opacity-40">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'คัดลอกแล้ว' : 'คัดลอก WIN Wallet ID'}
        </button>

        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <Wallet className="h-3.5 w-3.5" />
          ไม่มีเงินสด • ไม่มี PromptPay Direct • WIN Wallet only
        </div>
      </div>
    </div>
  );
};
