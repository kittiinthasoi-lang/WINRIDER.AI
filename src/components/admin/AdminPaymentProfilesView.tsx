import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldX } from 'lucide-react';
import { listPaymentProfilesForAdmin, PaymentReceiverProfile, reviewPaymentProfile } from '../../services/paymentProfileService';

const roleLabel = { citizen: 'ลูกค้า', knight: 'พี่วิน', merchant: 'ร้านค้า', partner: 'พาร์ทเนอร์' } as const;

export const AdminPaymentProfilesView: React.FC = () => {
  const [items, setItems] = useState<PaymentReceiverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setItems(await listPaymentProfilesForAdmin()); }
    catch (err) { setError(err instanceof Error ? err.message : 'โหลดรายการรับเงินไม่สำเร็จ'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const review = async (item: PaymentReceiverProfile, status: 'verified' | 'rejected' | 'suspended') => {
    let reason = '';
    if (status !== 'verified') {
      reason = window.prompt(status === 'rejected' ? 'ระบุสิ่งที่ต้องแก้ไข' : 'ระบุเหตุผลการระงับ')?.trim() || '';
      if (!reason) return;
    }
    setWorkingId(item.userId); setError('');
    try { await reviewPaymentProfile(item.userId, status, reason); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'ตรวจสอบรายการไม่สำเร็จ'); }
    finally { setWorkingId(''); }
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-white">ช่องทางรับเงินแต่ละโปรไฟล์</h2><p className="text-xs text-slate-400">ตรวจชื่อบัญชีและ PromptPay ก่อนเปิดใช้งานจริง</p></div><button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300"><RefreshCw className="h-4 w-4" />รีเฟรช</button></div>
    <div className="flex gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />การอนุมัตินี้ยืนยันเฉพาะข้อมูลช่องทางรับเงิน ไม่ใช่หลักฐานว่าเงินจากออเดอร์ถูกชำระแล้ว</div>
    {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    {loading ? <div className="flex justify-center p-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div> : items.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-sm text-slate-400">ยังไม่มีผู้ใช้ส่งช่องทางรับเงินเข้ามาตรวจสอบ</div> : <div className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => <article key={item.userId} className="rounded-2xl border border-white/10 bg-[#0A1633] p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black text-cyan-300">{roleLabel[item.role]} • {item.receiverType === 'business' ? 'นิติบุคคล/องค์กร' : 'บุคคล'}</p><h3 className="mt-1 font-black text-white">{item.accountName}</h3><p className="mt-1 text-xs text-slate-400">PromptPay: {item.promptPayMasked}</p><p className="mt-1 break-all text-[9px] text-slate-600">UID: {item.userId}</p></div>{item.qrImageUrl && <img src={item.qrImageUrl} alt="QR ที่ผู้ใช้ส่ง" className="h-24 w-24 rounded-xl bg-white object-contain p-1" />}</div>
        {item.rejectionReason && <p className="mt-3 rounded-lg bg-red-500/10 p-2 text-[11px] text-red-300">เหตุผลล่าสุด: {item.rejectionReason}</p>}
        <div className="mt-4 grid grid-cols-3 gap-2"><button disabled={workingId === item.userId} onClick={() => void review(item, 'verified')} className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-emerald-500/15 text-[10px] font-black text-emerald-300 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />อนุมัติ</button><button disabled={workingId === item.userId} onClick={() => void review(item, 'rejected')} className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-amber-500/15 text-[10px] font-black text-amber-300 disabled:opacity-50"><AlertTriangle className="h-4 w-4" />ส่งแก้ไข</button><button disabled={workingId === item.userId} onClick={() => void review(item, 'suspended')} className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-red-500/15 text-[10px] font-black text-red-300 disabled:opacity-50"><ShieldX className="h-4 w-4" />ระงับ</button></div>
      </article>)}
    </div>}
  </div>;
};
