import React, { useEffect, useState } from 'react';
import { Copy, Crown, Loader2, ShieldCheck, UserCog } from 'lucide-react';
import { bootstrapFirstAdmin, getAdminBootstrapStatus } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

interface AdminBootstrapViewProps {
  onCompleted: () => void;
  onExit: () => void;
}

export const AdminBootstrapView: React.FC<AdminBootstrapViewProps> = ({ onCompleted, onExit }) => {
  const { userData, refreshUserData } = useAuth();
  const [currentWinUid, setCurrentWinUid] = useState(userData?.winUid || '');
  const [winUid, setWinUid] = useState(userData?.winUid || '');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAdminBootstrapStatus()
      .then((status) => {
        if (!active) return;
        const suggested = String(status.currentWinUid || userData?.winUid || '').trim().toLowerCase();
        setCurrentWinUid(suggested);
        if (suggested) setWinUid((value) => value || suggested);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userData?.winUid]);

  const copyUid = async () => {
    if (!currentWinUid) return;
    try {
      await navigator.clipboard.writeText(currentWinUid);
    } catch {
      // Clipboard may be unavailable in embedded previews.
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (working) return;
    const normalized = winUid.trim().toLowerCase();
    if (!normalized) {
      setError('กรุณากรอก WIN UID');
      return;
    }
    setError('');

    if (currentWinUid && normalized !== currentWinUid.toLowerCase()) {
      setError('WIN UID ไม่ตรงกับบัญชีที่กำลังล็อกอิน');
      return;
    }

    setWorking(true);
    try {
      await bootstrapFirstAdmin(normalized);
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
            ระบบยังไม่มีผู้ดูแล ใช้ WIN UID ที่คุณตั้งตอนสมัครเพื่อแต่งตั้งบัญชีนี้เป็น Super Admin ครั้งแรก
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-4">
          <div className="text-xs font-bold text-cyan-300 mb-2">WIN UID ของบัญชีนี้</div>
          <div className="flex gap-2">
            <code className="flex-1 break-all rounded-xl bg-black/30 px-3 py-2.5 text-xs text-white border border-white/10">
              {currentWinUid || 'ยังไม่มี WIN UID — กรอกด้านล่างเพื่อสร้างพร้อม Admin'}
            </code>
            <button type="button" onClick={copyUid} className="rounded-xl border border-cyan-400/30 px-3 text-cyan-300 hover:bg-cyan-400/10" aria-label="คัดลอก WIN UID">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-bold text-slate-300 mb-1.5">กรอก WIN UID ที่ต้องการตั้งเป็น Admin</span>
            <input
              value={winUid}
              onChange={(event) => setWinUid(event.target.value.toLowerCase())}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-mono text-white outline-none focus:border-amber-400"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-bold text-slate-300 mb-1.5">ระดับ Admin คนแรก</span>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Super Admin
            </div>
          </label>

          {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}

          <button
            type="submit"
            disabled={working || !winUid.trim()}
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
