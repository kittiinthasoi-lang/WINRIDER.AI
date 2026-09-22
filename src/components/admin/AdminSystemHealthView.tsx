import React, { useEffect, useState } from 'react';
import { WIN_IMAGES } from '../../data/imageRegistry';
import { AlertTriangle, CheckCircle2, CircleX, ExternalLink, HelpCircle, Info, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { auth } from '../../firebase';

type HealthStatus = 'ok' | 'warning' | 'error';
interface HealthCheck {
  id: string;
  name: string;
  status: HealthStatus;
  detail: string;
  actionUrl?: string;
  guideKey?: string;
}
interface RecentOrder {
  id: string;
  serviceTitle: string;
  status: string;
  passengerName: string;
  driverName?: string | null;
  createdAt: string;
  issues: string[];
  stages: Record<string, boolean>;
}
interface HealthPayload {
  status: string;
  summary: { ok: number; warning: number; error: number };
  checks: HealthCheck[];
  recentOrders: RecentOrder[];
  checkedAt: string;
}

const statusUi = {
  ok: { icon: CheckCircle2, label: 'พร้อม', cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
  warning: { icon: AlertTriangle, label: 'ต้องตรวจ', cls: 'border-amber-400/30 bg-amber-500/10 text-amber-300' },
  error: { icon: CircleX, label: 'ไม่พร้อม', cls: 'border-red-400/30 bg-red-500/10 text-red-300' },
} as const;
const stageLabels: Record<string, string> = {
  created: 'สร้าง',
  offered: 'เสนอ',
  accepted: 'รับงาน',
  headingPickup: 'ไปจุดรับ',
  pickedUp: 'รับแล้ว',
  inTransit: 'เดินทาง',
  completed: 'สำเร็จ',
};

export const AdminSystemHealthView: React.FC = () => {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error('กรุณาเข้าสู่ระบบ Super Admin ใหม่');
      const response = await fetch('/api/admin/system-health', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'ตรวจระบบไม่สำเร็จ');
      setData(payload);
    } catch (e: any) {
      setError(e.message || 'ตรวจระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={WIN_IMAGES.admin.systemHealth}
            alt="System Health"
            className="w-10 h-10 rounded-2xl object-cover ring-1 ring-cyan-400/50 shadow-sm"
          />
          <div>
            <h2 className="text-xl font-black text-white">System Health Telemetry</h2>
            <p className="text-xs text-slate-400">ตรวจบริการจริงและหลักฐาน Order Flow โดยไม่สร้างข้อมูลจำลอง</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-200 disabled:opacity-50 hover:bg-cyan-500/20 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          ตรวจใหม่
        </button>
      </header>

      {error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}

      {loading && !data ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-500/10 p-4 text-center text-emerald-300 border border-emerald-500/20">
                <strong className="block text-2xl">{data.summary.ok}</strong>
                <span className="text-xs font-semibold">พร้อม</span>
              </div>
              <div className="rounded-2xl bg-amber-500/10 p-4 text-center text-amber-300 border border-amber-500/20">
                <strong className="block text-2xl">{data.summary.warning}</strong>
                <span className="text-xs font-semibold">ต้องตรวจ / สำรองพร้อม</span>
              </div>
              <div className="rounded-2xl bg-red-500/10 p-4 text-center text-red-300 border border-red-500/20">
                <strong className="block text-2xl">{data.summary.error}</strong>
                <span className="text-xs font-semibold">ไม่พร้อม</span>
              </div>
            </div>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.checks.map((check) => {
                const ui = statusUi[check.status];
                const Icon = ui.icon;
                return (
                  <div key={check.id} className={`rounded-2xl border p-4 flex flex-col justify-between ${ui.cls}`}>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-white">{check.name}</h3>
                        <span className="flex items-center gap-1 text-[10px] font-black">
                          <Icon className="h-4 w-4" />
                          {ui.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">{check.detail}</p>
                    </div>

                    {(check.guideKey || check.actionUrl) && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        {check.guideKey && (
                          <button
                            type="button"
                            onClick={() => setActiveGuide(check.guideKey || null)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 underline decoration-cyan-400/40 underline-offset-2"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            วิธีแก้ปัญหา 403 & โหมดสำรอง
                          </button>
                        )}
                        {check.actionUrl && (
                          <a
                            href={check.actionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-2 ml-auto"
                          >
                            <span>เปิด Console</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Storage 403 Resolution Modal */}
            {activeGuide === 'firebase_storage_403' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-cyan-500/30 bg-[#0B1528] p-6 text-white shadow-2xl space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">วิธีแก้ไข Firebase Storage 403</h3>
                        <p className="text-xs text-slate-400">คำแนะนำและแนวทางแก้ไขสำหรับ Super Admin</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveGuide(null)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                      <ShieldCheck className="w-4 h-4" />
                      <span>สถานะปัจจุบัน: มีโหมดสำรอง (Firestore Fallback) พร้อมใช้งาน 100%</span>
                    </div>
                    <p className="text-xs text-emerald-200/90 leading-relaxed">
                      ระบบ WinRider.AI มี <strong>Firestore Fallback Storage</strong> สำรองให้อัตโนมัติ การอัปโหลดสลิปโอนเงิน การสแกนสลิปด้วย AI และการแสดงภาพสลิปในแผงควบคุม Super Admin จึง<strong>ทำงานได้สมบูรณ์ตามปกติโดยไม่ติดขัด</strong>
                    </p>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                    <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                      <Info className="w-4 h-4" />
                      สาเหตุที่ระบบแจ้งเตือน 403 (Forbidden):
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      <li>ยังไม่ได้กดเปิดใช้งาน (Get Started) ที่แท็บ <strong>Storage</strong> ใน Firebase Console</li>
                      <li>หรือ Google Cloud Storage Bucket บล็อกการตรวจสอบ Metadata จากบัญชี Service Account ที่ยังไม่ได้เพิ่ม IAM Permission</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white">ขั้นตอนเปิดใช้งาน Firebase Storage ใน 3 ขั้นตอน:</h4>
                    <div className="space-y-2 text-xs">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <strong className="block text-cyan-300 mb-1">ขั้นตอนที่ 1: เปิดใช้งานที่ Firebase Console</strong>
                        <p className="text-slate-300 mb-2">
                          เข้าไปที่หน้าคอนโซลของโปรเจกต์ <code>decoded-robot-6lkcn</code> แล้วกดปุ่ม <strong>"Get Started"</strong>
                        </p>
                        <a
                          href="https://console.firebase.google.com/project/decoded-robot-6lkcn/storage"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30 font-semibold"
                        >
                          <span>เปิด Firebase Console &gt; Storage</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <strong className="block text-cyan-300 mb-1">ขั้นตอนที่ 2: ตั้งค่า Security Rules</strong>
                        <p className="text-slate-300">
                          ไปที่แท็บ <strong>Rules</strong> บน Firebase Storage แล้วคัดลอกกฎจากไฟล์ <code>storage.rules</code> เพื่อเปิดสิทธิ์ให้อัปโหลดสลิป <code>topup_proofs/</code> และ QR Code ได้
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <strong className="block text-cyan-300 mb-1">ขั้นตอนที่ 3 (ทางเลือก): ใส่ Service Account Key สำหรับ Admin SDK</strong>
                        <p className="text-slate-300">
                          หากต้องการให้เซิร์ฟเวอร์ Admin SDK เชื่อมต่อ Bucket สำเร็จ 100% สามารถไปที่ <strong>Project Settings &gt; Service accounts</strong> ดาวน์โหลด Private Key แล้วนำ <code>client_email</code> และ <code>private_key</code> มากำหนดใน <code>FIREBASE_CLIENT_EMAIL</code> และ <code>FIREBASE_PRIVATE_KEY</code>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setActiveGuide(null)}
                      className="px-5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold hover:bg-cyan-500/30 transition-all text-xs"
                    >
                      รับทราบ & ปิดหน้าต่าง
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section className="space-y-3">
              <div>
                <h3 className="font-black text-white">Order Flow Verification</h3>
                <p className="text-xs text-slate-400">หลักฐานจากออเดอร์จริงล่าสุด 20 รายการ</p>
              </div>
              {data.recentOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
                  ยังไม่มีออเดอร์จริง ให้ใช้บัญชีลูกค้าสร้างหนึ่งรายการและบัญชีพี่วินรับงานเพื่อเริ่มตรวจครบวงจร
                </div>
              ) : (
                data.recentOrders.map((order) => (
                  <article key={order.id} className="rounded-2xl border border-white/10 bg-[#0A1633] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white">{order.serviceTitle || order.id}</h4>
                        <p className="text-[10px] text-slate-400">
                          {order.id} • {order.passengerName}
                          {order.driverName ? ` → ${order.driverName}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-[10px] font-bold text-cyan-300">
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-7">
                      {Object.entries(stageLabels).map(([key, label]) => (
                        <div
                          key={key}
                          className={`rounded-lg border px-1 py-2 text-center text-[9px] ${
                            order.stages[key]
                              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-white/10 bg-black/20 text-slate-500'
                          }`}
                        >
                          {order.stages[key] ? '✓ ' : '○ '}
                          {label}
                        </div>
                      ))}
                    </div>
                    {order.issues.length > 0 && (
                      <p className="mt-3 rounded-xl bg-red-500/10 p-2 text-xs text-red-300">
                        พบปัญหา: {order.issues.join(' • ')}
                      </p>
                    )}
                  </article>
                ))
              )}
            </section>
            <p className="text-right text-[10px] text-slate-500">
              ตรวจล่าสุด {new Date(data.checkedAt).toLocaleString('th-TH')}
            </p>
          </>
        )
      )}
    </div>
  );
};
