import React, { useEffect, useState } from 'react';
import { WIN_IMAGES } from '../../data/imageRegistry';
import { Check, ImageOff, Loader2, RefreshCw, X, Landmark, ArrowUpRight } from 'lucide-react';
import { auth } from '../../firebase';

async function readJsonSafely(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(response.ok ? 'เซิร์ฟเวอร์ส่งข้อมูลที่ไม่ใช่ JSON' : `เซิร์ฟเวอร์ไม่พร้อม (${response.status})`);
  }
}

async function getAdminToken() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('กรุณาเข้าสู่ระบบ Super Admin ใหม่');
  return token;
}

const SlipImage: React.FC<{ submissionId: string; hasProof: boolean }> = ({ submissionId, hasProof }) => {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(!hasProof);

  useEffect(() => {
    if (!hasProof) return;
    let objectUrl = '';
    let cancelled = false;

    void getAdminToken()
      .then(async (token) => {
        const response = await fetch(`/api/admin/topup-proof/${encodeURIComponent(submissionId)}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'image/*,application/json' },
        });
        if (!response.ok) throw new Error('โหลดภาพไม่สำเร็จ');
        const blob = await response.blob();
        if (blob.size === 0) throw new Error('ไฟล์ภาพสลิปว่าง');
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch {}
      }
    };
  }, [submissionId, hasProof]);

  if (failed) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 text-xs text-slate-500">
        <ImageOff className="mr-2 h-5 w-5" />ไม่มีภาพสลิป
      </div>
    );
  }
  if (!src) {
    return <div className="flex min-h-56 items-center justify-center rounded-2xl bg-black/30"><Loader2 className="h-6 w-6 animate-spin text-cyan-300" /></div>;
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" title="เปิดภาพสลิปขนาดเต็ม">
      <img src={src} alt="ภาพสลิปที่ผู้ใช้อัปโหลด" className="max-h-[520px] w-full rounded-2xl border border-white/10 bg-black/30 object-contain" />
    </a>
  );
};

export const AdminTopupReviewView: React.FC = () => {
  const [topups, setTopups] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bankRefs, setBankRefs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAdminToken();
      const [topupRes, withdrawalRes] = await Promise.all([
        fetch('/api/admin/topup-submissions', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }),
        fetch('/api/admin/withdrawal-requests', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }),
      ]);
      const [topupData, withdrawalData] = await Promise.all([
        readJsonSafely(topupRes),
        readJsonSafely(withdrawalRes),
      ]);
      if (!topupRes.ok) throw new Error(topupData.error || 'โหลดรายการเติมเงินไม่สำเร็จ');
      if (!withdrawalRes.ok) throw new Error(withdrawalData.error || 'โหลดรายการถอนเงินไม่สำเร็จ');
      setTopups(topupData.submissions || []);
      setWithdrawals(withdrawalData.withdrawals || []);
    } catch (e: any) {
      setError(String(e?.message || 'โหลดรายการไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const reviewTopup = async (submissionId: string, decision: 'APPROVE' | 'REJECT') => {
    const bankReference = (bankRefs[`topup:${submissionId}`] || '').trim();
    if (decision === 'APPROVE' && !bankReference) {
      setError('กรุณาใส่เลขอ้างอิงจากรายการเงินจริงในบัญชีธนาคารก่อนอนุมัติ');
      return;
    }
    if (!confirm(decision === 'APPROVE'
      ? 'ยืนยันว่าตรวจบัญชีธนาคารแล้ว และเงินจริงเข้าตรงกับสลิปนี้? ระบบจะเพิ่มยอด WIN Wallet ทันที'
      : 'ปฏิเสธรายการเติมเงินนี้?')) return;

    setBusyId(`topup:${submissionId}`);
    setError('');
    setNotice('');
    try {
      const token = await getAdminToken();
      const response = await fetch('/api/admin/topup-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submissionId, decision, bankReference }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok) throw new Error(data.error || 'ดำเนินการไม่สำเร็จ');
      setNotice(decision === 'APPROVE'
        ? 'ยืนยันเงินเข้าและเครดิต WIN Wallet เรียบร้อยแล้ว'
        : 'ปฏิเสธรายการเติมเงินแล้ว');
      await load();
    } catch (e: any) {
      setError(String(e?.message || 'ดำเนินการไม่สำเร็จ'));
    } finally {
      setBusyId('');
    }
  };

  const reviewWithdrawal = async (withdrawalId: string, decision: 'PAID' | 'REJECT') => {
    const bankReference = (bankRefs[`withdraw:${withdrawalId}`] || '').trim();
    if (decision === 'PAID' && !bankReference) {
      setError('กรุณาใส่เลขอ้างอิงการโอนเงินจริงก่อนยืนยันการถอน');
      return;
    }
    if (!confirm(decision === 'PAID'
      ? 'ยืนยันว่าได้โอนเงินจริงเข้าบัญชีผู้ใช้แล้ว? ระบบจะตัดยอดที่ล็อกไว้ออกจาก WIN Wallet'
      : 'ปฏิเสธคำขอถอนนี้และปลดล็อกยอดคืนให้ผู้ใช้?')) return;

    setBusyId(`withdraw:${withdrawalId}`);
    setError('');
    setNotice('');
    try {
      const token = await getAdminToken();
      const response = await fetch('/api/admin/withdrawal-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ withdrawalId, decision, bankReference }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok) throw new Error(data.error || 'ดำเนินการไม่สำเร็จ');
      setNotice(decision === 'PAID'
        ? 'ยืนยันการโอนเงินจริงและตัดยอด WIN Wallet เรียบร้อยแล้ว'
        : 'ปฏิเสธคำขอถอนและปลดล็อกยอดคืนแล้ว');
      await load();
    } catch (e: any) {
      setError(String(e?.message || 'ดำเนินการไม่สำเร็จ'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={WIN_IMAGES.admin.topupReview} alt="จัดการเงินเข้าออก" className="w-10 h-10 rounded-2xl object-cover ring-1 ring-emerald-400/50 shadow-sm" />
          <div>
            <h2 className="text-xl font-black text-white">เงินเข้า / ถอนเงิน WIN Wallet</h2>
            <p className="text-xs text-slate-400">ตรวจเงินจริงจากบัญชีธนาคารก่อนทุกครั้ง • ไม่มี Payment Gateway • ทุกการยืนยันลง Ledger</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-cyan-400/40 p-2 text-cyan-300 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-emerald-300" />
          <h3 className="font-black text-white">สลิปเติมเงินรอตรวจ ({topups.length})</h3>
        </div>
        {loading ? (
          <Loader2 className="mx-auto animate-spin text-cyan-300" />
        ) : topups.length === 0 ? (
          <p className="rounded-2xl bg-white/5 p-6 text-center text-slate-400">ไม่มีสลิปเติมเงินรอตรวจ</p>
        ) : topups.map((item) => (
          <article key={item.id} className="grid gap-4 rounded-2xl border border-white/10 bg-[#0A1633] p-4 lg:grid-cols-[minmax(260px,0.8fr)_1fr]">
            <SlipImage submissionId={item.id} hasProof={Boolean(item.proofStoragePath)} />
            <div className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>ผู้ใช้: <span className="font-mono text-slate-300">{item.userEmail || item.userId}</span></p>
                <p className="font-black text-emerald-300">ยอดที่แจ้ง ฿{(Number(item.amountSatang || 0) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                <p className="break-all sm:col-span-2">รหัสรายการ: <span className="font-mono text-xs text-slate-400">{item.id}</span></p>
              </div>
              <label className="block text-xs font-bold text-slate-300">
                เลขอ้างอิงจากรายการเงินจริงในบัญชีธนาคาร
                <input
                  value={bankRefs[`topup:${item.id}`] || ''}
                  onChange={(e) => setBankRefs((prev) => ({ ...prev, [`topup:${item.id}`]: e.target.value }))}
                  placeholder="เช่น เลขอ้างอิงจาก statement / แอปธนาคาร"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/50"
                />
              </label>
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                กดอนุมัติเฉพาะเมื่อเห็นเงินจริงเข้าในบัญชีบริษัทตรงกับยอดนี้ ระบบจะเครดิต WIN Wallet เพียงครั้งเดียวและกันเลขอ้างอิงซ้ำ
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void reviewTopup(item.id, 'APPROVE')}
                  disabled={!item.proofStoragePath || busyId === `topup:${item.id}`}
                  className="flex-1 rounded-xl bg-emerald-400 p-2 font-black text-slate-950 disabled:opacity-40"
                >
                  {busyId === `topup:${item.id}` ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Check className="mr-1 inline h-4 w-4" />}
                  ยืนยันเงินเข้า + เติม Wallet
                </button>
                <button onClick={() => void reviewTopup(item.id, 'REJECT')} className="rounded-xl bg-red-500/20 px-4 text-red-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-amber-300" />
          <h3 className="font-black text-white">คำขอถอนเงินรอโอน ({withdrawals.length})</h3>
        </div>
        {loading ? (
          <Loader2 className="mx-auto animate-spin text-cyan-300" />
        ) : withdrawals.length === 0 ? (
          <p className="rounded-2xl bg-white/5 p-6 text-center text-slate-400">ไม่มีคำขอถอนเงินรอดำเนินการ</p>
        ) : withdrawals.map((item) => (
          <article key={item.id} className="space-y-4 rounded-2xl border border-amber-400/20 bg-[#0A1633] p-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>ผู้ใช้: <span className="font-mono text-slate-300">{item.userEmail || item.userId}</span></p>
              <p className="font-black text-amber-300">ยอดถอน ฿{(Number(item.amountSatang || 0) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
              <p>ธนาคาร: <strong>{item.bankName || 'PromptPay'}</strong></p>
              <p>ชื่อบัญชี: <strong>{item.accountName || '-'}</strong></p>
              <p className="break-all sm:col-span-2">บัญชี/PromptPay: <strong className="font-mono">{item.promptPayOrAccount}</strong></p>
            </div>
            <label className="block text-xs font-bold text-slate-300">
              เลขอ้างอิงหลังโอนเงินจริง
              <input
                value={bankRefs[`withdraw:${item.id}`] || ''}
                onChange={(e) => setBankRefs((prev) => ({ ...prev, [`withdraw:${item.id}`]: e.target.value }))}
                placeholder="กรอกหลังจากโอนเงินจริงให้ผู้ใช้แล้ว"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => void reviewWithdrawal(item.id, 'PAID')}
                disabled={busyId === `withdraw:${item.id}`}
                className="flex-1 rounded-xl bg-amber-300 p-2 font-black text-slate-950 disabled:opacity-40"
              >
                {busyId === `withdraw:${item.id}` ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Check className="mr-1 inline h-4 w-4" />}
                โอนจริงแล้ว • ยืนยันถอน
              </button>
              <button onClick={() => void reviewWithdrawal(item.id, 'REJECT')} className="rounded-xl bg-red-500/20 px-4 text-red-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};
