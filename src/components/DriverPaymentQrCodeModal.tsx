import React, { useEffect, useState } from 'react';
import { ArrowLeft, DollarSign, QrCode, Sparkles, X } from 'lucide-react';
import { Vehicle } from '../types';
import { playTactileBlip } from '../utils/audio';
import { VerifiedReceiverQr } from './VerifiedReceiverQr';

interface DriverPaymentQrCodeModalProps {
  isOpen?: boolean; driverName?: string; driverLevel?: number; driverCode?: string;
  activeVehicle?: Vehicle; defaultAmount?: number; fareAmount?: number; tipAmount?: number;
  promptPayNumber?: string; audioEnabled?: boolean; onClose: () => void;
  onSimulatePaymentReceived?: (amount: number) => void; onPaymentSuccess?: (amount: number) => void;
}

export const DriverPaymentQrCodeModal: React.FC<DriverPaymentQrCodeModalProps> = ({
  isOpen = true, driverName = 'พี่วิน', driverCode = '', defaultAmount = 0,
  fareAmount, tipAmount = 0, audioEnabled = true, onClose,
}) => {
  const [amount, setAmount] = useState(fareAmount ?? defaultAmount);
  const [tip, setTip] = useState(tipAmount);
  const total = Math.max(0, amount) + Math.max(0, tip);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="max-h-[95vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl border-2 border-cyan-400 bg-[#071126] p-5 text-white">
      <header className="flex items-center justify-between border-b border-white/10 pb-3"><div className="flex items-center gap-2"><QrCode className="h-6 w-6 text-cyan-300" /><div><h3 className="font-black">QR รับเงินจริงของพี่วิน</h3><p className="text-[10px] text-slate-400">{driverName}{driverCode ? ` • ${driverCode}` : ''}</p></div></div><button onClick={onClose} aria-label="ปิด"><X className="h-5 w-5" /></button></header>
      <div className="rounded-2xl bg-white p-4"><VerifiedReceiverQr amount={total || undefined} />{total > 0 && <p className="mt-2 text-center text-2xl font-black text-slate-950">฿{total.toLocaleString()}</p>}</div>
      <div className="space-y-3 rounded-2xl border border-cyan-400/30 bg-black/30 p-3">
        <label className="block text-xs font-bold text-cyan-200"><DollarSign className="mr-1 inline h-4 w-4" />ค่าโดยสาร/ค่าบริการ<input type="number" min="0" value={amount || ''} onChange={(event) => setAmount(Math.max(0, Number(event.target.value) || 0))} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" /></label>
        <div><p className="mb-2 flex items-center gap-1 text-xs font-bold text-amber-300"><Sparkles className="h-4 w-4" />ทิป</p><div className="grid grid-cols-5 gap-1">{[0, 10, 20, 50, 100].map((value) => <button key={value} onClick={() => { if (audioEnabled) playTactileBlip(850); setTip(value); }} className={`rounded-lg border py-2 text-xs font-bold ${tip === value ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-white/10 bg-white/5 text-slate-300'}`}>{value ? `+${value}` : 'ไม่มี'}</button>)}</div></div>
      </div>
      <p className="rounded-xl bg-amber-500/10 p-3 text-[11px] text-amber-200">QR เป็นช่องทางรับเงินจริง แต่ระบบจะไม่ขึ้นว่า “ชำระสำเร็จ” จนกว่าจะได้รับการยืนยันจาก Payment Provider</p>
      <button onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-black text-cyan-300"><ArrowLeft className="h-4 w-4" />กลับหน้าโปรไฟล์</button>
    </div>
  </div>;
};
