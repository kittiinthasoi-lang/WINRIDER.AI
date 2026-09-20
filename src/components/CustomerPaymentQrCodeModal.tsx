import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, QrCode, X } from 'lucide-react';
import { VerifiedReceiverQr } from './VerifiedReceiverQr';

interface CustomerPaymentQrCodeModalProps {
  isOpen: boolean; onClose: () => void; customerName?: string; defaultItemTitle?: string;
  defaultAmount?: number; customerPromptPay?: string; customerWalletId?: string;
  audioEnabled?: boolean; onPaymentSuccess?: (amount: number, itemTitle: string) => void;
}

export const CustomerPaymentQrCodeModal: React.FC<CustomerPaymentQrCodeModalProps> = ({
  isOpen, onClose, customerName = 'ผู้ขายชุมชน', defaultItemTitle = 'สินค้าจากตลาดประชาชน', defaultAmount = 0,
}) => {
  const [amount, setAmount] = useState(defaultAmount);
  const [note, setNote] = useState(defaultItemTitle);
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="max-h-[95vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl border-2 border-amber-400 bg-[#0B1020] p-5 text-white">
      <header className="flex items-center justify-between border-b border-white/10 pb-3"><div className="flex items-center gap-2"><QrCode className="h-6 w-6 text-amber-300" /><div><h3 className="font-black">QR รับเงินจริงของผู้ขาย</h3><p className="text-[10px] text-slate-400">{customerName}</p></div></div><button onClick={onClose} aria-label="ปิด"><X className="h-5 w-5" /></button></header>
      <div className="rounded-2xl bg-white p-4"><VerifiedReceiverQr amount={amount || undefined} />{amount > 0 && <p className="mt-2 text-center text-2xl font-black text-slate-950">฿{amount.toLocaleString()}</p>}{note && <p className="mt-1 text-center text-[10px] font-bold text-amber-700">{note}</p>}</div>
      <div className="space-y-3 rounded-2xl border border-amber-400/30 bg-black/30 p-3">
        <label className="block text-xs font-bold text-amber-200">จำนวนเงิน<input type="number" min="0" value={amount || ''} onChange={(event) => setAmount(Math.max(0, Number(event.target.value) || 0))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" /></label>
        <label className="block text-xs font-bold text-slate-300"><FileText className="mr-1 inline h-4 w-4" />สินค้า/รายละเอียด<input value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" /></label>
      </div>
      <p className="rounded-xl bg-amber-500/10 p-3 text-[11px] text-amber-200">ระบบไม่สร้างยอดสำเร็จจากการกดปุ่ม ผู้ขายต้องรอผลยืนยันจาก Payment Provider หรือกระบวนการตรวจสลิปจริง</p>
      <button onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-black text-amber-300"><ArrowLeft className="h-4 w-4" />กลับตลาดประชาชน</button>
    </div>
  </div>;
};
