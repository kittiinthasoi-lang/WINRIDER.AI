import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bike, CreditCard, Loader2, RefreshCw, RotateCcw, ShieldAlert, Siren, XCircle } from 'lucide-react';
import { auth } from '../../firebase';

type Ride = {
  id?: string; status?: string; serviceTitle?: string; passengerName?: string; driverName?: string;
  pickupLocation?: string; dropoffLocation?: string; createdAt?: string; offeredDriverId?: string | null;
};
type Sos = { id: string; status?: string; userId?: string; message?: string; createdAt?: string; latitude?: number; longitude?: number };
type Overview = {
  activeRides: number; pendingDispatch: number; onlineKnights: number; openSosIncidents: number; pendingTopups: number;
  recentRides: Ride[]; sosIncidents: Sos[]; generatedAt: string;
};

async function api(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('เซสชัน Super Admin หมดอายุ');
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'คำสั่ง Operations ล้มเหลว');
  return data;
}

export const AdminOperationsView: React.FC<{ onOpenTopups?: () => void }> = ({ onOpenTopups }) => {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await api('/api/admin/ops/overview')); }
    catch (e: any) { setError(String(e?.message || 'โหลด Operations ไม่สำเร็จ')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeRides = useMemo(() => (data?.recentRides || []).filter((r) => ['pending','accepted','heading_pickup','picked_up','in_transit'].includes(String(r.status))), [data]);

  const rideAction = async (rideId: string, action: 'REDISPATCH' | 'CANCEL') => {
    if (!rideId) return;
    if (!confirm(action === 'REDISPATCH' ? 'สั่ง re-dispatch งานนี้?' : 'ยืนยันยกเลิกงานนี้โดย Super Admin?')) return;
    setWorking(`ride:${rideId}`); setError('');
    try {
      await api('/api/admin/ops/ride-action', { method: 'POST', body: JSON.stringify({ rideId, action }) });
      await load();
    } catch (e: any) { setError(String(e?.message || 'คำสั่งงานไม่สำเร็จ')); }
    finally { setWorking(''); }
  };

  const sosAction = async (incidentId: string, action: 'ACKNOWLEDGE' | 'RESOLVE') => {
    setWorking(`sos:${incidentId}`); setError('');
    try {
      await api('/api/admin/ops/sos-action', { method: 'POST', body: JSON.stringify({ incidentId, action }) });
      await load();
    } catch (e: any) { setError(String(e?.message || 'คำสั่ง SOS ไม่สำเร็จ')); }
    finally { setWorking(''); }
  };

  const cards = [
    ['งานกำลังดำเนินการ', data?.activeRides ?? 0, Bike],
    ['รอ Dispatch', data?.pendingDispatch ?? 0, RotateCcw],
    ['SOS เปิดอยู่', data?.openSosIncidents ?? 0, Siren],
    ['Top-up รอตรวจ', data?.pendingTopups ?? 0, CreditCard],
  ] as const;

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-xl font-black text-white">Operations Command Center</h2><p className="text-xs text-slate-400">งานสด, Dispatch, SOS และคิวการเงินจากข้อมูลเซิร์ฟเวอร์จริง</p></div>
      <button onClick={() => void load()} disabled={loading} className="self-start rounded-xl border border-cyan-400/40 px-3 py-2 text-xs font-bold text-cyan-300 disabled:opacity-50"><RefreshCw className={`mr-1 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />รีเฟรช</button>
    </div>
    {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(([label,value,Icon]) => <div key={label} className="rounded-2xl border border-white/10 bg-[#0A1633] p-4"><Icon className="h-5 w-5 text-cyan-300" /><div className="mt-2 text-2xl font-black text-white">{value}</div><div className="text-[11px] text-slate-400">{label}</div></div>)}
    </div>
    <section className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-black text-white">Active rides / Dispatch</h3><span className="text-[10px] text-slate-500">{data?.generatedAt ? new Date(data.generatedAt).toLocaleString('th-TH') : ''}</span></div>
      {loading && !data ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-300" /> : activeRides.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-slate-400">ไม่มีงานกำลังดำเนินการ</div> :
        <div className="grid gap-3 lg:grid-cols-2">{activeRides.map((ride) => <article key={ride.id} className="rounded-2xl border border-white/10 bg-[#0A1633] p-4">
          <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-white">{ride.serviceTitle || 'Ride'} <span className="ml-1 rounded bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-300">{ride.status}</span></div><div className="mt-1 break-all text-[10px] text-slate-500">{ride.id}</div></div><Bike className="h-5 w-5 text-cyan-300" /></div>
          <div className="mt-3 grid gap-1 text-xs text-slate-300"><div>ลูกค้า: {ride.passengerName || '—'}</div><div>พี่วิน: {ride.driverName || ride.offeredDriverId || 'ยังไม่จับคู่'}</div><div className="truncate">รับ: {ride.pickupLocation || '—'}</div><div className="truncate">ส่ง: {ride.dropoffLocation || '—'}</div></div>
          <div className="mt-3 flex gap-2">{ride.status === 'pending' && <button disabled={working === `ride:${ride.id}`} onClick={() => void rideAction(String(ride.id), 'REDISPATCH')} className="flex-1 rounded-xl bg-cyan-400/15 px-3 py-2 text-xs font-black text-cyan-300 disabled:opacity-40"><RotateCcw className="mr-1 inline h-4 w-4" />Re-dispatch</button>}<button disabled={working === `ride:${ride.id}`} onClick={() => void rideAction(String(ride.id), 'CANCEL')} className="rounded-xl bg-red-500/15 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-40"><XCircle className="mr-1 inline h-4 w-4" />ยกเลิก</button></div>
        </article>)}</div>}
    </section>
    <section className="space-y-3"><h3 className="font-black text-white">SOS incident queue</h3>{(data?.sosIncidents || []).length === 0 ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-center text-sm text-emerald-300">ไม่มี SOS ที่ค้างอยู่</div> :
      <div className="grid gap-3 lg:grid-cols-2">{data?.sosIncidents.map((sos) => <article key={sos.id} className="rounded-2xl border border-red-400/25 bg-red-950/20 p-4"><div className="flex items-center gap-2 text-red-300"><ShieldAlert className="h-5 w-5" /><span className="font-black">SOS · {sos.status || 'open'}</span></div><div className="mt-2 text-xs text-slate-300">{sos.message || 'เหตุฉุกเฉินจากผู้ใช้'}</div><div className="mt-1 break-all text-[10px] text-slate-500">{sos.id}</div><div className="mt-3 flex gap-2">{sos.status === 'open' && <button disabled={working === `sos:${sos.id}`} onClick={() => void sosAction(sos.id, 'ACKNOWLEDGE')} className="flex-1 rounded-xl bg-amber-400/15 px-3 py-2 text-xs font-black text-amber-300 disabled:opacity-40"><AlertTriangle className="mr-1 inline h-4 w-4" />รับเหตุ</button>}<button disabled={working === `sos:${sos.id}`} onClick={() => void sosAction(sos.id, 'RESOLVE')} className="flex-1 rounded-xl bg-emerald-400/15 px-3 py-2 text-xs font-black text-emerald-300 disabled:opacity-40">ปิดเหตุ</button></div></article>)}</div>}
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#0A1633] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-black text-white">Payment / reconciliation queue</div><div className="text-xs text-slate-400">Top-up ที่ยังรอตรวจ: {data?.pendingTopups ?? 0}</div></div>{onOpenTopups && <button onClick={onOpenTopups} className="rounded-xl bg-emerald-400/15 px-3 py-2 text-xs font-black text-emerald-300">เปิดคิว Top-up</button>}</div></section>
  </div>;
};
