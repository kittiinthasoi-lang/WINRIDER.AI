import React, { useState } from 'react';
import { ArrowRight, Crown, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playTactileBlip } from '../../utils/audio';

export const AuthModalOrView: React.FC = () => {
  const { enterTemporaryAdminMode } = useAuth();
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState('');

  const handleTemporaryAdminEntry = async () => {
    setEntering(true);
    setError('');
    playTactileBlip(1000);
    try {
      await enterTemporaryAdminMode();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เข้าโหมดแอดมินไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setEntering(false);
    }
  };

  return (
    <div className="min-h-[78vh] w-full flex items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-400/40 bg-[#081126] p-6 sm:p-8 text-slate-100 shadow-[0_0_55px_rgba(251,191,36,0.14)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-300/25 via-amber-500/15 to-yellow-600/20 shadow-[0_0_30px_rgba(251,191,36,0.25)]">
              <Crown className="h-10 w-10 text-amber-300" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-black tracking-wide text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              TEMPORARY OWNER ACCESS
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              <span className="text-cyan-300">WINRIDER</span><span className="text-amber-300">.AI</span>
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-300">
              พักระบบล็อกอินชั่วคราว
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              กดปุ่มด้านล่างเพื่อเข้าแอปด้วยสิทธิ์ Super Admin ทันที
              ไม่ต้องกรอกอีเมลหรือรหัสผ่าน
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              {error}
            </div>
          )}

          <button
            id="temporary-admin-entry"
            type="button"
            onClick={() => void handleTemporaryAdminEntry()}
            disabled={entering}
            className="group w-full rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 px-5 py-4 text-slate-950 shadow-[0_0_30px_rgba(251,191,36,0.35)] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          >
            <div className="flex items-center justify-center gap-3">
              {entering ? <Loader2 className="h-6 w-6 animate-spin" /> : <Crown className="h-6 w-6" />}
              <div className="text-left">
                <div className="text-base font-black">เข้าโหมดแอดมินทันที</div>
                <div className="text-[10px] font-bold opacity-70">SUPER ADMIN • NO LOGIN</div>
              </div>
              {!entering && <ArrowRight className="ml-auto h-5 w-5 transition-transform group-hover:translate-x-1" />}
            </div>
          </button>

          <div className="flex items-start gap-2 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-3 py-3 text-[11px] leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <span>
              โหมดนี้เปิดไว้ชั่วคราวเพื่อให้เจ้าของระบบเข้าไปตรวจและตั้งค่าภายในแอปก่อน
              ระบบล็อกอินปกติถูกพักไว้ในหน้าจอนี้จนกว่าจะเปิดกลับอีกครั้ง
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
