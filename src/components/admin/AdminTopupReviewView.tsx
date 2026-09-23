import React, { useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, X, Landmark, ArrowUpRight, MessageCircle, WalletCards } from 'lucide-react';
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

export const AdminTopupReviewView: React.FC = () => {
  const [walletId, setWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [note, setNote] = useState('');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawBankRefs, setWithdrawBankRefs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadWithdrawals = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAdminToken();
      const response = await fetch('/api/admin/withdrawal-requests', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await readJsonSafely(response);
      if (!response.ok) throw new Error(data.error || 'โหลดรายการถอนเงินไม่สำเร็จ');
      setWithdrawals(data.withdrawals || []);
    } catch (e: any) {
      setError(String(e?.message || 'โหลดรายการไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadWithdrawals(); }, []);

  const confirmManualTopup = async () => {
    const cleanWalletId = walletId.trim().toUpperCase();
    const amountNumber = Number(amount);
    const cleanReference = bankReference.trim();

    setError('');
    setNotice('');

    if (!/^WIN-[CKMP]-[A-Z2-9]{8}$/.test(cleanWalletId)) {
      setError('WIN Wallet ID ไม่ถูกต้อง ตัวอย่าง WIN-C-ABCDEFGH');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('กรุณาใส่จำนวนเงินจริงที่ตรวจพบในบัญชีบริษัท');
      return;
    }
    if (!cleanReference) {
      setError('กรุณาใส่เลขอ้างอิงจากรายการเงินจริงในบัญชีธนาคาร');
      return;
    }

    if (!confirm(
      `ยืนยันเงินจริงเข้าแล้ว\n\nWIN Wallet: ${cleanWalletId}\nยอด: ฿${amountNumber.toFixed(2)}\nเลขอ้างอิง: ${cleanReference}\n\nระบบจะเพิ่มยอด Wallet ทันทีและลง Ledger`
    )) return;

    setBusyId('manual-topup');
    try {
      const token = await getAdminToken();
      const response = await fetch('/api/admin/manual-topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          walletId: cleanWalletId,
          amount: amountNumber,
          bankReference: cleanReference,
          note: note.trim(),
        }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok) throw new Error(data.error || 'เติมยอด WIN Wallet ไม่สำเร็จ');

      setNotice(
        `เติมยอด ฿${(Number(data.amountSatang || 0) / 100).toFixed(2)} ให้ ${data.walletId} สำเร็จ • ยอดใหม่ ฿${(Number(data.newBalanceSatang || 0) / 100).toFixed(2)}`
      );
      setWalletId('');
      setAmount('');
      setBankReference('');
      setNote('');
    } catch (e: any) {
      setError(String(e?.message || 'เติมยอด WIN Wallet ไม่สำเร็จ'));
    } finally {
      setBusyId('');
    }
  };

  const reviewWithdrawal = async (withdrawalId: string, decision: 'PAID' | 'REJECT') => {
    const bankRef = (withdrawBankRefs[withdrawalId] || '').trim();
    if (decision === 'PAID' && !bankRef) {
      setError('กรุณาใส่เลขอ้างอิงการโอนเงินจริงก่อนยืนยันการถอน');
      return;
    }
    if (!confirm(decision === 'PAID'
      ? 'ยืนยันว่าได้โอนเงินจริงเข้าบัญชีผู้ใช้แล้ว? ระบบจะตัดยอดที่ล็อกไว้จาก WIN Wallet'
      : 'ปฏิเสธคำขอถอนและปลดล็อกยอดคืนให้ผู้ใช้?')) return;

    setBusyId(withdrawalId);
    setError('');
    setNotice('');
    try {
      const token = await getAdminToken();
      const response = await fetch('/api/admin/withdrawal-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ withdrawalId, decision, bankReference: bankRef }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok) throw new Error(data.error || 'ดำเนินการไม่สำเร็จ');
      setNotice(decision === 'PAID'
        ? 'ยืนยันการโอนเงินจริงและตัดยอด WIN Wallet เรียบร้อยแล้ว'
        : 'ปฏิเสธคำขอถอนและปลดล็อกยอดคืนแล้ว');
      await loadWithdrawals();
    } catch (e: any) {
      setError(String(e?.message || 'ดำเนินการไม่สำเร็จ'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#06C755]" />
          <h2 className="text-xl font-black text-white">เติมเงินจากสลิป LINE / ถอนเงิน</h2>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          ผู้ใช้โอนเข้าบัญชีบริษัทและส่งสลิปทาง LINE • Admin ตรวจเงินจริงในแอปธนาคารก่อนปรับยอดทุกครั้ง
        </p>
      </div>

      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}

      <section className="rounded-3xl border border-emerald-400/25 bg-[#0A1633] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-400/10 p-2.5 text-emerald-300">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black text-white">เติมยอด WIN Wallet จากเงินจริง</h3>
            <p className="mt-1 text-xs text-slate-400">
              คัดลอก WIN Wallet ID จากข้อความใน LINE แล้วใส่ยอดที่เห็นว่าเข้าบัญชีบริษัทจริง ไม่ต้องอัปโหลดสลิปเข้าระบบ
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-300">
            WIN Wallet ID
            <input
              value={walletId}
              onChange={(e) => setWalletId(e.target.value.toUpperCase())}
              placeholder="WIN-C-ABCDEFGH"
              autoCapitalize="characters"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-emerald-400/50"
            />
          </label>

          <label className="text-xs font-bold text-slate-300">
            จำนวนเงินจริงที่เข้า (บาท)
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="เช่น 500.00"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/50"
            />
          </label>

          <label className="text-xs font-bold text-slate-300 sm:col-span-2">
            เลขอ้างอิงจากรายการเงินจริงในธนาคาร
            <input
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="ใช้เลขอ้างอิง/Transaction ID จากแอปธนาคาร"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/50"
            />
          </label>

          <label className="text-xs font-bold text-slate-300 sm:col-span-2">
            หมายเหตุ (ไม่บังคับ)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ชื่อลูกค้า / เวลาโอน / รายละเอียดเพิ่มเติม"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/50"
            />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
          ตรวจเงินจริงในบัญชีบริษัทก่อนกดทุกครั้ง • เลขอ้างอิงธนาคารหนึ่งรายการใช้เติม Wallet ได้ครั้งเดียว ป้องกันการเติมซ้ำ
        </div>

        <button
          type="button"
          onClick={() => void confirmManualTopup()}
          disabled={busyId === 'manual-topup'}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50 sm:w-auto"
        >
          {busyId === 'manual-topup' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          ยืนยันเงินจริงเข้า • เติมยอด Wallet
        </button>
      </section>

      <section className="space-y-3 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-amber-300" />
            <h3 className="font-black text-white">คำขอถอนเงินรอโอน ({withdrawals.length})</h3>
          </div>
          <button
            type="button"
            onClick={() => void loadWithdrawals()}
            disabled={loading}
            className="rounded-xl border border-cyan-400/40 p-2 text-cyan-300 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
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

            <input
              value={withdrawBankRefs[item.id] || ''}
              onChange={(e) => setWithdrawBankRefs((prev) => ({ ...prev, [item.id]: e.target.value }))}
              placeholder="เลขอ้างอิงหลัง Admin โอนเงินจริง"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void reviewWithdrawal(item.id, 'PAID')}
                disabled={busyId === item.id}
                className="flex-1 rounded-xl bg-amber-300 p-2 font-black text-slate-950 disabled:opacity-40"
              >
                {busyId === item.id ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Check className="mr-1 inline h-4 w-4" />}
                โอนจริงแล้ว • ยืนยันถอน
              </button>
              <button
                type="button"
                onClick={() => void reviewWithdrawal(item.id, 'REJECT')}
                className="rounded-xl bg-red-500/20 px-4 text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </section>

      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-xs text-slate-400">
        <Landmark className="mr-1 inline h-4 w-4 text-cyan-300" />
        เงินเข้าและเงินออกทุกครั้งต้องอ้างอิงธุรกรรมธนาคารจริง และระบบบันทึก Double-Entry Ledger / Audit Log
      </div>
    </div>
  );
};
