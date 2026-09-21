import React, { useEffect, useState } from 'react';
import { Check, ImageOff, Loader2, RefreshCw, X } from 'lucide-react';
import { auth } from '../../firebase';

const SlipImage: React.FC<{ submissionId: string; hasProof: boolean }> = ({ submissionId, hasProof }) => {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(!hasProof);
  useEffect(() => {
    if (!hasProof) return;
    let objectUrl = '';
    let cancelled = false;
    auth.currentUser?.getIdToken().then(async (token) => {
      const response = await fetch(`/api/admin/topup-proof/${encodeURIComponent(submissionId)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('โหลดภาพไม่สำเร็จ');
      objectUrl = URL.createObjectURL(await response.blob());
      if (!cancelled) setSrc(objectUrl);
    }).catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [submissionId, hasProof]);
  if (failed) return <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 text-xs text-slate-500"><ImageOff className="mr-2 h-5 w-5" />รายการเดิมไม่มีภาพสลิปที่จัดเก็บไว้</div>;
  if (!src) return <div className="flex min-h-56 items-center justify-center rounded-2xl bg-black/30"><Loader2 className="h-6 w-6 animate-spin text-cyan-300" /></div>;
  return <a href={src} target="_blank" rel="noreferrer" title="เปิดภาพสลิปขนาดเต็ม"><img src={src} alt="ภาพสลิปที่ผู้ใช้อัปโหลด" className="max-h-[520px] w-full rounded-2xl border border-white/10 bg-black/30 object-contain" /></a>;
};

export const AdminTopupReviewView: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/topup-submissions', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.submissions || []);
    } catch (e: any) { setError(e.message || 'โหลดรายการไม่สำเร็จ'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const review = async (submissionId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!confirm(decision === 'APPROVE' ? 'ยืนยันว่าเทียบภาพสลิปและตรวจเงินเข้าบัญชีธนาคารแล้ว?' : 'ปฏิเสธรายการนี้?')) return;
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/admin/topup-review', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ submissionId, decision }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'ดำเนินการไม่สำเร็จ'); else load();
  };
  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img 
          src="/images/admin/topup-review.svg" 
          alt="ตรวจสลิปเติมเงิน" 
          className="w-10 h-10 rounded-2xl object-cover ring-1 ring-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
        />
        <div>
          <h2 className="text-xl font-black text-white">ตรวจสลิปเติมเงิน</h2>
          <p className="text-xs text-amber-200">เทียบภาพสลิปกับข้อมูล AI และตรวจเงินเข้าบัญชีธนาคารก่อนอนุมัติ</p>
        </div>
      </div>
      <button onClick={load} className="rounded-xl border border-cyan-400/40 p-2 text-cyan-300"><RefreshCw className="h-4 w-4" /></button>
    </div>
    {error && <p className="rounded-xl bg-red-500/10 p-3 text-red-300">{error}</p>}
    {loading ? <Loader2 className="mx-auto animate-spin" /> : items.length === 0 ? <p className="rounded-2xl bg-white/5 p-6 text-center text-slate-400">ไม่มีสลิปรอตรวจ</p> : items.map((item) => <article key={item.id} className="grid gap-4 rounded-2xl border border-white/10 bg-[#0A1633] p-4 lg:grid-cols-[minmax(260px,0.8fr)_1fr]">
      <SlipImage submissionId={item.id} hasProof={Boolean(item.proofStoragePath)} />
      <div className="space-y-4"><div className="grid gap-2 text-sm sm:grid-cols-2"><p>ผู้ใช้: {item.userEmail || item.userId}</p><p className="font-black text-emerald-300">ยอดที่แจ้ง ฿{(item.amountSatang / 100).toLocaleString()}</p><p>ยอดที่ AI อ่าน: ฿{Number(item.extracted?.amount || 0).toLocaleString()}</p><p>ความมั่นใจ AI: {Math.round(Number(item.extracted?.confidence || 0) * 100)}%</p><p className="break-all">เลขอ้างอิง: {item.reference}</p><p>ผู้รับที่ AI อ่าน: {item.extracted?.recipientName}</p><p>บัญชีปลายทาง: {item.extracted?.recipientAccountHint || 'ไม่พบ'}</p><p>วันเวลาโอน: {item.extracted?.transferDateTime || 'ไม่พบ'}</p></div>
        <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">ภาพและ AI ไม่ยืนยันว่าเงินเข้าจริง ต้องตรวจรายการเดินบัญชีธนาคารก่อนกดอนุมัติ</p>
        <div className="flex gap-2"><button onClick={() => review(item.id, 'APPROVE')} disabled={!item.proofStoragePath} className="flex-1 rounded-xl bg-emerald-400 p-2 font-black text-slate-950 disabled:opacity-40"><Check className="mr-1 inline h-4 w-4" />เงินเข้าแล้ว อนุมัติ</button><button onClick={() => review(item.id, 'REJECT')} className="rounded-xl bg-red-500/20 px-4 text-red-300"><X className="h-4 w-4" /></button></div>
      </div>
    </article>)}
  </div>;
};
