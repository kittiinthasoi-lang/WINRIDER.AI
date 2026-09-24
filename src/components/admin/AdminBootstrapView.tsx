import React, { useState } from 'react';
import { Copy, Crown, Loader2, ShieldCheck, UserCog } from 'lucide-react';
import { bootstrapFirstAdmin } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

interface AdminBootstrapViewProps {
  onCompleted: () => void;
  onExit: () => void;
}

export const AdminBootstrapView: React.FC<AdminBootstrapViewProps> = ({ onCompleted, onExit }) => {
  const { firebaseUser, refreshUserData } = useAuth();
  const [uid, setUid] = useState(firebaseUser?.uid || '');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const copyUid = async () => {
    if (!firebaseUser?.uid) return;
    try {
      await navigator.clipboard.writeText(firebaseUser.uid);
    } catch {
      // Clipboard may be unavailable in embedded previews.
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firebaseUser || working) return;
    setError('');

    if (uid.trim() !== firebaseUser.uid) {
      setError('Admin คนแรกต้องใช้ UID ของบัญชีที่กำลังล็อกอินอยู่');
      return;
    }

    setWorking(true);
    try {
      await bootstrapFirstAdmin(uid.trim());
      await refreshUserData();
      onCompleted();
    } catch (cause: any) {
      setError(cause?.message || 'ตั้งค่า Super Admin คนแรกไม่สำเร็จ');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 bg-[#070D1E]">
      <div className="w-full max-w-xl rounded-[2rem] border border-amber-400/35 bg-[#0A1633] p-6 sm:p-8 shadow-[0_0_50px_rgba(251,191,36,0.12)]">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 h-20 w-20 rounded-3xl border border-amber-300/40 bg-amber-400/10 flex items-center justify-center">
            <Crown className="w-10 h-10 text-amber-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">ตั้งค่า Admin คนแรก</h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            ระบบยังไม่มีผู้ดูแล คุณสามารถใช้ UID ของบัญชีที่กำลังล็อกอินเพื่อตั้งตัวเองเป็น Super Admin ได้ครั้งเดียว
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-4">
          <div className="text-xs font-bold text-cyan-300 mb-2">UID ของบัญชีนี้</div>
          <div className="flex gap-2">
            <code className="flex-1 break-all rounded-xl bg-black/30 px-3 py-2.5 text-xs text-white border border-white/10">
              {firebaseUser?.uid || '-'}
            </code>
            <button type="button" onClick={copyUid} className="rounded-xl border border-cyan-400/30 px-3 text-cyan-300 hover:bg-cyan-400/10" aria-label="คัดลอก UID">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-bold text-slate-300 mb-1.5">กรอก UID ที่ต้องการตั้งเป็น Admin</span>
            <input
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-bold text-slate-300 mb-1.5">ระดับ Admin คนแรก</span>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Super Admin
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Admin คนแรกต้องเป็น Super Admin เพื่อให้สามารถแต่งตั้งผู้ช่วยระดับ Reviewer / Support / Super ได้ภายหลัง
            </p>
          </label>

          {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}

          <button
            type="submit"
            disabled={working || !uid.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-3.5 text-sm font-black text-slate-950 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {working ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCog className="w-5 h-5" />}
            {working ? 'กำลังตั้งค่า...' : 'ตั้งบัญชีนี้เป็น Super Admin'}
          </button>

          <button type="button" onClick={onExit} className="w-full rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800">
            กลับหน้าแอป
          </button>
        </form>
      </div>
    </div>
  );
};
