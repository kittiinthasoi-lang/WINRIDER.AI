import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Check, Loader2, QrCode, ShieldCheck, Wallet, X } from 'lucide-react';
import QRCode from 'qrcode';
import { playTactileBlip } from '../utils/audio';
import { getRecipientWallet, getWalletMe } from '../services/walletService';
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
  entityCategoryLabel = 'ผู้รับเงินใน WINRIDER',
  defaultAmount = 0,
  audioEnabled = true,
}) => {
  const [amount, setAmount] = useState(Math.max(0, defaultAmount));
  const [walletId, setWalletId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    const resolve = async () => {
      // merchant_main is the authenticated merchant dashboard, not a real user UID.
      if (!entityId || entityId.endsWith('_main')) {
        const self = await getWalletMe(entityType);
        return { walletId: self.walletId };
      }
      return await getRecipientWallet(entityId, entityType);
    };

    void resolve()
      .then((result) => {
        if (!cancelled) setWalletId(result.walletId || '');
      })
      .catch(() => {
        if (!cancelled) {
          setWalletId('');
          setError('ยังไม่พบ WIN Wallet จริงของผู้รับรายนี้ จึงไม่เปิดช่องทางชำระอื่นแทน');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, entityId, entityType]);

  useEffect(() => {
    if (!/^WIN-[CKMP]-[A-Z2-9]{8}$/.test(walletId)) {
      setQrDataUrl('');
      return;
    }
    const payload = JSON.stringify({
      type: 'WIN_WALLET_PAYMENT',
      walletId,
      ...(amount > 0 ? { amount } : {}),
      merchant: entityName,
    });
    void QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: 280 })
      .then(setQrDataUrl)
      .catch(() => setError('สร้าง WIN Wallet QR ไม่สำเร็จ'));
  }, [walletId, amount, entityName]);

  if (!isOpen) return null;

  const copyWalletId = async () => {
    if (!walletId || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(walletId);
      setCopied(true);
      if (audioEnabled) playTactileBlip(850);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('คัดลอก WIN Wallet ID ไม่สำเร็จ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
      <div className="relative w-full max-w-md space-y-4 overflow-y-auto rounded-3xl border-2 border-cyan-400 bg-[#070D1E] p-5 text-slate-100 shadow-[0_0_50px_rgba(0,210,255,0.3)] max-h-[95vh]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <button type="button" onClick={onClose} className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-cyan-300">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </button>
          <div className="text-center">
            <h3 className="text-sm font-black text-white">WIN Wallet Pay</h3>
            <p className="text-[10px] text-slate-400">{entityName} • {entityCategoryLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 text-slate-300"><X className="h-4 w-4" /></button>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs text-cyan-100">
          <ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-300" />
          ชำระผ่าน WIN Wallet เท่านั้น ถ้ายอดไม่พอให้เติมเงินเข้าบัญชีบริษัทก่อน
        </div>

        <button type="button" onClick={() => setShowQrScanner(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-2.5 text-xs font-black text-cyan-300">
          <QrCode className="h-4 w-4" /> เปิดกล้องสแกน WIN Wallet QR
        </button>

        <label className="block text-xs font-bold text-slate-300">
          จำนวนเงิน (บาท)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount || ''}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            placeholder="ระบุยอดที่ต้องการรับ"
            className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
          />
        </label>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div>
        ) : qrDataUrl ? (
          <div className="rounded-3xl bg-white p-4 text-center text-slate-900">
            <img src={qrDataUrl} alt="WIN Wallet QR" className="mx-auto h-52 w-52 object-contain" />
            <p className="mt-2 font-mono text-sm font-black">{walletId}</p>
            {amount > 0 && <p className="mt-1 text-2xl font-black">฿{amount.toFixed(2)}</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-center text-xs text-amber-200">
            ไม่มี WIN Wallet จริงของผู้รับ จึงไม่สามารถรับชำระในแอปได้
          </div>
        )}

        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}

        <button type="button" onClick={() => void copyWalletId()} disabled={!walletId} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-200 disabled:opacity-40">
          {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          {copied ? 'คัดลอกแล้ว' : 'คัดลอก WIN Wallet ID'}
        </button>

        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <Wallet className="h-3.5 w-3.5" /> ไม่มีเงินสดหรือ PromptPay Direct ภายในแอป
        </div>
      </div>

      {showQrScanner && (
        <WinQrScanner
          onClose={() => setShowQrScanner(false)}
          onVerified={() => {
            // Scanner itself executes only verified WIN Wallet payments.
          }}
        />
      )}
    </div>
  );
};
