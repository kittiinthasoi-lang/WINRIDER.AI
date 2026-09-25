import React, { useEffect, useState } from 'react';
import { WIN_IMAGES } from '../../data/imageRegistry';
import { AlertTriangle, CheckCircle2, CircleX, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { auth } from '../../firebase';
import { getAdminAuthHeaders } from '../../services/adminService';

type HealthStatus = 'ok' | 'warning' | 'error';
interface HealthCheck { id: string; name: string; status: HealthStatus; detail: string; actionUrl?: string; guideKey?: string; }
interface RecentOrder { id: string; serviceTitle: string; status: string; passengerName: string; driverName?: string | null; createdAt: string; issues: string[]; stages: Record<string, boolean>; }
interface HealthPayload { status: string; summary: { ok: number; warning: number; error: number }; checks: HealthCheck[]; recentOrders: RecentOrder[]; checkedAt: string; }

const stageLabels: Record<string, string> = { created: 'สร้าง', offered: 'เสนอ', accepted: 'รับงาน', headingPickup: 'ไปจุดรับ', pickedUp: 'รับแล้ว', inTransit: 'เดินทาง', completed: 'สำเร็จ' };
const statusUi = {
  ok: { icon: CheckCircle2, label: 'พร้อม', cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
  warning: { icon: AlertTriangle, label: 'ต้องตรวจ', cls: 'border-amber-400/30 bg-amber-500/10 text-amber-300' },
  error: { icon: CircleX, label: 'ไม่พร้อม', cls: 'border-red-400/30 bg-red-500/10 text-red-300' },
} as const;

async function readJsonSafely(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch {
    throw new Error(response.ok ? 'เซิร์ฟเวอร์ส่งข้อมูลที่ไม่ใช่ JSON' : `เซิร์ฟเวอร์ไม่พร้อม (${response.status})`);
  }
}
function safeHttpUrl(value?: string): string | null {
  if (!value) return null;
  try { const url = new URL(value, window.location.origin); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; } catch { return null; }
}

export const AdminSystemHealthView: React.FC = () => {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const headers = await getAdminAuthHeaders();
      const response = await fetch('/api/admin/system-health', { headers, cache: 'no-store' });
      const payload = await readJsonSafely(response);
      if (!response.ok) throw new Error(String(payload?.error || 'ตรวจระบบไม่สำเร็จ'));
      if (!payload?.summary || !Array.isArray(payload?.checks)) throw new Error('ข้อมูล System Health ไม่ครบถ้วน');
      setData(payload as HealthPayload);
    } catch (e: any) {
      const message = String(e?.message || 'ตรวจระบบไม่สำเร็จ');
      setError(message === 'The string did not match the expected pattern.' ? 'เซิร์ฟเวอร์ส่งข้อมูลไม่ถูกต้องหรือไม่ได้ส่ง JSON — ระบบถูกปรับให้ตรวจรูปแบบข้อมูลก่อนแสดงผลแล้ว กรุณากดตรวจใหม่' : message);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><img src={WIN_IMAGES.admin.systemHealth} alt="System Health" className="w-10 h-10 rounded-2xl object-cover ring-1 ring-cyan-400/50 shadow-sm" /><div><h2 className="text-xl font-black text-white">System Health Telemetry</h2><p className="text-xs text-slate-400">ตรวจบริการจริงและหลักฐาน Order Flow โดยไม่สร้างข้อมูลจำลอง</p></div></div>
      <button onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />ตรวจใหม่</button>
    </header>
    {error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
    {loading && !data ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" /> : data && <>
      <div className="grid grid-cols-3 gap-3"><div className="rounded-2xl bg-emerald-500/10 p-4 text-center text-emerald-300 border border-emerald-500/20"><strong className="block text-2xl">{data.summary.ok}</strong><span className="text-xs">พร้อม</span></div><div className="rounded-2xl bg-amber-500/10 p-4 text-center text-amber-300 border border-amber-500/20"><strong className="block text-2xl">{data.summary.warning}</strong><span className="text-xs">ต้องตรวจ</span></div><div className="rounded-2xl bg-red-500/10 p-4 text-center text-red-300 border border-red-500/20"><strong className="block text-2xl">{data.summary.error}</strong><span className="text-xs">ไม่พร้อม</span></div></div>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.checks.map((check) => { const ui = statusUi[check.status]; const Icon = ui.icon; const url = safeHttpUrl(check.actionUrl); return <div key={check.id} className={`rounded-2xl border p-4 ${ui.cls}`}><div className="flex items-center justify-between gap-2"><h3 className="font-bold text-white">{check.name}</h3><span className="flex items-center gap-1 text-[10px] font-black"><Icon className="h-4 w-4" />{ui.label}</span></div><p className="mt-2 text-xs leading-relaxed text-slate-300">{check.detail}</p>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 underline">เปิด Console <ExternalLink className="h-3 w-3" /></a>}</div>; })}</section>
      <section className="space-y-3"><div><h3 className="font-black text-white">Order Flow Verification</h3><p className="text-xs text-slate-400">หลักฐานจากออเดอร์จริงล่าสุด 20 รายการ</p></div>{data.recentOrders.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">ยังไม่มีออเดอร์จริง</div> : data.recentOrders.map((order) => <article key={order.id} className="rounded-2xl border border-white/10 bg-[#0A1633] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-bold text-white">{order.serviceTitle || order.id}</h4><p className="text-[10px] text-slate-400">{order.id} • {order.passengerName}{order.driverName ? ` → ${order.driverName}` : ''}</p></div><span className="rounded-full bg-cyan-500/15 px-3 py-1 text-[10px] font-bold text-cyan-300">{order.status}</span></div><div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-7">{Object.entries(stageLabels).map(([key, label]) => <div key={key} className={`rounded-lg border px-1 py-2 text-center text-[9px] ${order.stages[key] ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-black/20 text-slate-500'}`}>{order.stages[key] ? '✓ ' : '○ '}{label}</div>)}</div>{order.issues.length > 0 && <p className="mt-3 rounded-xl bg-red-500/10 p-2 text-xs text-red-300">พบปัญหา: {order.issues.join(' • ')}</p>}</article>)}</section>
      <p className="text-right text-[10px] text-slate-500">ตรวจล่าสุด {new Date(data.checkedAt).toLocaleString('th-TH')}</p>
    </>}
  </div>;
};
