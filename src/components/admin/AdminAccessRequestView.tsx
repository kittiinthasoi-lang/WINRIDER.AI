import React, { useState } from 'react';
import { ShieldCheck, Send, ArrowLeft, Clock3 } from 'lucide-react';
import { requestAdminAccess } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

interface Props {
  requestStatus?: string | null;
  onExit: () => void;
}

export const AdminAccessRequestView: React.FC<Props> = ({ requestStatus, onExit }) => {
  const { userData } = useAuth();
  const [note, setNote] = useState('');
  const [status, setStatus] = useState(requestStatus || null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (working || status === 'pending') return;
    setWorking(true);
    setError('');
    try {
      const result = await requestAdminAccess(note.trim());
      setStatus(result.requestStatus || 'pending');
    } catch (cause: any) {
      setError(cause?.message || 'ส่งคำขอ Admin ไม่สำเร็จ');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-[72vh] flex items-center justify-center p-4 bg-[#070D1E]">
      <div className="w-full max-w-xl rounded-[2rem] border border-cyan-400/30 bg-[#0A1633] p-6 sm:p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-cyan-300" />
          </div>
          <h1 className="text-2xl font-black text-white">สมัครขอสิทธิ์ Admin</h1>
          <p className="mt-2 text-sm text-slate-300">
            Super Admin เปิดรับคำขออยู่ หน้านี้ใช้ส่งคำขอเท่านั้น ยังไม่สามารถเข้าถึงเครื่องมือ Admin ได้จนกว่าจะได้รับการแต่งตั้ง
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
          <div className="text-xs text-slate-400">บัญชี</div>
          <div className="mt-1 font-black text-cyan-300">WIN UID: {userData?.winUid || '-'}</div>
          <div className="text-slate-300">{userData?.displayName || '-'}</div>
        </div>

        {status === 'pending' ? (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-200 flex gap-3">
            <Clock3 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-black">ส่งคำขอแล้ว</div>
              <div className="text-xs mt-1 text-amber-100/80">รอ Super Admin ตั้งระดับสิทธิ์ให้บัญชีนี้จากหน้า “จัดการผู้ใช้งาน”</div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="block text-xs font-bold text-slate-300 mb-1.5">หมายเหตุถึง Super Admin (ไม่บังคับ)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="เช่น ขอสิทธิ์ช่วยตรวจเอกสาร / ซัพพอร์ตผู้ใช้งาน"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </label>
            {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}
            <button
              type="button"
              onClick={submit}
              disabled={working}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {working ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเป็น Admin'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onExit}
          className="mt-4 w-full rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าแอป
        </button>
      </div>
    </div>
  );
};
