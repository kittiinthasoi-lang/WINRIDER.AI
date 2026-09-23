import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, Loader2, QrCode, ShieldCheck, Wallet, X } from 'lucide-react';
import QRCode from 'qrcode';
import { playTactileBlip } from '../utils/audio';
import { getWalletMe } from '../services/walletService';

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
  customerName = 'ผู้ขายใน WINRIDER',
  defaultItemTitle = 'สินค้า',
  defaultAmount = 150,
  customerWalletId = '',
  audioEnabled = true,
}) => {
  const [amount, setAmount] = useState(Math.max(0, defaultAmount));
  const [itemTitle, setItemTitle] = useState(defaultItemTitle);
  const [resolvedWalletId, setResolvedWalletId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    void (async () => {
      try {
        const wallet = customerWalletId ? null : await getWalletMe('citizen');
        const walletId = customerWalletId || wallet?.walletId || '';
        if (!/^WIN-[CKMP]-[A-Z2-9]{8}$/.test(walletId)) throw new Error('NO_WALLET');
        if (!cancelled) setResolvedWalletId(walletId);
      } catch {
        if (!cancelled) {
          setResolvedWalletId('');
          setError('ยังไม่พบ WIN Wallet จริงของผู้ขาย');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, customerWalletId]);

  useEffect(() => {
    if (!resolvedWalletId) {
      setQrDataUrl('');
      return;
    }
    const payload = JSON.stringify({
      type: 'WIN_WALLET_PAYMENT',
      walletId: resolvedWalletId,
      ...(amount > 0 ? { amount } : {}),
      item: itemTitle,
    });
    void QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: 280 })
      .then(setQrDataUrl)
      .catch(() => setError('สร้าง WIN Wallet QR ไม่สำเร็จ'));
  }, [resolvedWalletId, amount, itemTitle]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!resolvedWalletId || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(resolvedWalletId);
      setCopied(true);
      if (audioEnabled) playTactileBlip(900);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('คัดลอก WIN Wallet ID ไม่สำเร็จ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md space-y-4 rounded-3xl border-2 border-[#FFD700] bg-gradient-to-b from-[#1C1402] via-[#0F1424] to-[#060A14] p-5 text-slate-100 shadow-[0_0_50px_rgba(255,215,0,0.35)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <button type="button" onClick={onClose} className="flex items-center gap-1 rounded-xl bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-amber-300">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </button>
          <div className="text-center">
            <h3 className="text-sm font-black text-white">รับเงินด้วย WIN Wallet</h3>
            <p className="text-[10px] text-slate-400">{customerName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 text-slate-300"><X className="h-4 w-4" /></button>
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">
          <ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-300" />
          ผู้ซื้อต้องเติมเงินเข้า WIN Wallet ก่อน จึงจะชำระสินค้าภายในแอปได้
        </div>

        <input
          value={itemTitle}
          onChange={(e) => setItemTitle(e.target.value)}
          placeholder="ชื่อสินค้า / รายการ"
          className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm text-white outline-none focus:border-amber-400"
        />

        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount || ''}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          placeholder="ยอดเงิน"
          className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm font-bold text-white outline-none focus:border-amber-400"
        />

        {loading ? (
          <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-300" /></div>
        ) : qrDataUrl ? (
          <div className="rounded-3xl bg-white p-4 text-center text-slate-900">
            <img src={qrDataUrl} alt="WIN Wallet QR" className="mx-auto h-52 w-52 object-contain" />
            <p className="mt-2 text-xs font-bold text-slate-500">WIN Wallet ผู้ขาย</p>
            <p className="font-mono text-sm font-black">{resolvedWalletId}</p>
            {amount > 0 && <p className="mt-1 text-2xl font-black">฿{amount.toFixed(2)}</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-center text-xs text-amber-200">
            ไม่มี WIN Wallet จริง จึงไม่เปิดช่องทางชำระอื่นแทน
          </div>
        )}

        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}

        <button type="button" onClick={() => void handleCopy()} disabled={!resolvedWalletId} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-200 disabled:opacity-40">
          {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          {copied ? 'คัดลอกแล้ว' : 'คัดลอก WIN Wallet ID'}
        </button>

        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <Wallet className="h-3.5 w-3.5" />
          WIN Wallet only • ไม่มีเงินสดหรือ PromptPay Direct
        </div>
      </div>
    </div>
  );
};
