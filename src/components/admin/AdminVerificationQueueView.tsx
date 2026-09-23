import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, Loader2, MapPin, RefreshCw, XCircle } from 'lucide-react';
import { auth } from '../../firebase';

type VerificationRecord = {
  id: string;
  status: 'pending_review' | 'approved' | 'rejected';
  category?: string;
  subjectType?: string;
  subjectId?: string;
  submittedBy?: string;
  submittedRole?: string;
  imageUrl?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  reviewReason?: string;
};

export const AdminVerificationQueueView: React.FC = () => {
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState('');
  const [message, setMessage] = useState('');

  const request = async (path: string, init: RequestInit = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error('กรุณาเข้าสู่ระบบ Super Admin ใหม่');
    const headers = new Headers(init.headers || {});
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
    const response = await fetch(path, { ...init, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  };

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const payload = await request('/api/admin/verifications?status=pending_review');
      setRecords(Array.isArray(payload.records) ? payload.records : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดคิวตรวจไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const review = async (record: VerificationRecord, approved: boolean) => {
    const defaultReason = approved ? 'ตรวจหลักฐานแล้ว อนุมัติ' : '';
    const reason = approved ? defaultReason : window.prompt('เหตุผลที่ไม่อนุมัติ', '')?.trim();
    if (!approved && !reason) return;

    setActionId(record.id);
    setMessage('');
    try {
      await request(`/api/admin/verifications/${encodeURIComponent(record.id)}/review`, {
        method: 'POST',
        body: JSON.stringify({ approved, reason }),
      });
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setMessage(approved ? 'อนุมัติหลักฐานเรียบร้อย' : 'ปฏิเสธหลักฐานเรียบร้อย');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกผลตรวจไม่สำเร็จ');
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-[#0A1633] p-5 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-cyan-300" />
              <h1 className="text-xl font-black text-white">Admin Verification Queue</h1>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">{records.length} รอตรวจ</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">คิวเดียวสำหรับรูปสินค้า พัสดุ ส่งงาน และหลักฐานจากบริการต่าง ๆ • ไม่มี AI ตัดสินแทนแอดมิน</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200">
            <RefreshCw className={`mr-1 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />รีเฟรช
          </button>
        </div>
        {message && <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">{message}</div>}
      </section>

      {loading && records.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0A1633] p-10 text-center text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />กำลังโหลดคิว...</div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0A1633] p-10 text-center text-sm text-slate-500">ไม่มีหลักฐานรอตรวจ</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {records.map((record) => (
            <article key={record.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0A1633]">
              <div className="h-56 bg-black">
                {record.imageUrl ? <img src={record.imageUrl} alt="หลักฐาน" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-slate-600">ไม่มีรูป</div>}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <div className="text-sm font-black text-white">{record.category || 'หลักฐานทั่วไป'}</div>
                  <div className="mt-1 text-[10px] font-mono text-slate-500">{record.subjectType || '-'} • {record.subjectId || '-'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div>ผู้ส่ง: <span className="font-mono text-cyan-300">{record.submittedBy || '-'}</span></div>
                  <div>บทบาท: <span className="text-white">{record.submittedRole || '-'}</span></div>
                  <div className="col-span-2">เวลา: {record.createdAt ? new Date(record.createdAt).toLocaleString('th-TH') : '-'}</div>
                  {Number.isFinite(record.latitude) && Number.isFinite(record.longitude) && (
                    <div className="col-span-2 flex items-center gap-1 text-emerald-300"><MapPin className="h-3.5 w-3.5" />GPS {Number(record.latitude).toFixed(5)}, {Number(record.longitude).toFixed(5)}</div>
                  )}
                </div>
                {record.note && <div className="rounded-xl bg-slate-950/50 px-3 py-2 text-xs text-slate-300">{record.note}</div>}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={actionId === record.id} onClick={() => void review(record, false)} className="rounded-xl border border-rose-400/30 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-300 disabled:opacity-50">
                    <XCircle className="mr-1 inline h-4 w-4" />ไม่อนุมัติ
                  </button>
                  <button type="button" disabled={actionId === record.id} onClick={() => void review(record, true)} className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 py-2.5 text-xs font-black text-emerald-300 disabled:opacity-50">
                    {actionId === record.id ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 inline h-4 w-4" />}อนุมัติ
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
