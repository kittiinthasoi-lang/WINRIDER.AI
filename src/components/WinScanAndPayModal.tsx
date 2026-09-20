import React, { useState } from 'react';
import { Building2, QrCode, Store, X } from 'lucide-react';
import { VerifiedReceiverQr } from './VerifiedReceiverQr';

interface WinScanAndPayModalProps {
  isOpen: boolean; onClose: () => void; entityName: string; entityType: 'merchant' | 'partner';
  entityCategoryLabel?: string; defaultAmount?: number; qrWalletAddress?: string; audioEnabled?: boolean;
}

export const WinScanAndPayModal: React.FC<WinScanAndPayModalProps> = ({
  isOpen, onClose, entityName, entityType, entityCategoryLabel = 'ร้านค้า/พาร์ทเนอร์', defaultAmount = 0,
}) => {
  const [amount, setAmount] = useState(defaultAmount);
  const [note, setNote] = useState('ชำระค่าสินค้า/บริการ WINRIDER');
  if (!isOpen) return null;
  const Icon = entityType === 'merchant' ? Store : Building2;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="max-h-[95vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl border border-cyan-400/40 bg-[#071126] p-5 text-white">
      <header className="flex items-center justify-between border-b border-white/10 pb-3"><div className="flex items-center gap-2"><Icon className="h-6 w-6 text-cyan-300" /><div><h3 className="font-black">WIN Scan & Pay</h3><p className="text-[10px] text-slate-400">{entityName} • {entityCategoryLabel}</p></div></div><button onClick={onClose} aria-label="ปิด"><X className="h-5 w-5" /></button></header>
      <div className="rounded-2xl bg-white p-4"><VerifiedReceiverQr amount={amount || undefined} />{amount > 0 && <p className="mt-2 text-center text-2xl font-black text-slate-950">฿{amount.toLocaleString()}</p>}</div>
      <div className="space-y-3 rounded-2xl border border-cyan-400/30 bg-black/30 p-3">
        <label className="block text-xs font-bold text-cyan-200">จำนวนเงิน<input type="number" min="0" value={amount || ''} onChange={(event) => setAmount(Math.max(0, Number(event.target.value) || 0))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" /></label>
        <label className="block text-xs font-bold text-slate-300">รายละเอียด<input value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" /></label>
      </div>
      <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-[11px] text-amber-200"><QrCode className="h-4 w-4 shrink-0" />แสดงเฉพาะ QR PromptPay จริงที่ผ่าน Super Admin แล้ว ไม่มี QR หรือตัวเลขกระเป๋าจำลอง</div>
      <button onClick={onClose} className="w-full rounded-xl bg-slate-800 py-3 text-xs font-black text-cyan-300">ปิด</button>
    </div>
  </div>;
};
