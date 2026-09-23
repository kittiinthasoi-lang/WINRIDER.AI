import React, { useState } from 'react';
import { Crown, Loader2, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playTactileBlip } from '../../utils/audio';

export const AuthModalOrView: React.FC = () => {
  const { enterTemporaryAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const enterAdmin = async () => {
    setError('');
    setLoading(true);
    playTactileBlip(900);
    try {
      await enterTemporaryAdmin();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เข้าแอปไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 bg-[#061126]">
      <div className="w-full max-w-md relative overflow-hidden rounded-[30px] border border-[#FFC93C]/45 bg-[#0A1633] p-6 sm:p-8 text-slate-100 shadow-[0_0_45px_rgba(255,201,60,0.18)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#FFC93C]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[#00D4FF]/10 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#FFC93C]/50 bg-[#FFC93C]/10 shadow-[0_0_30px_rgba(255,201,60,0.18)]">
              <Crown className="h-10 w-10 text-[#FFC93C]" />
            </div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#FFC93C]/30 bg-[#FFC93C]/10 px-3 py-1 text-[11px] font-black text-[#FFC93C]">
              <Sparkles className="h-3.5 w-3.5" />
              TEMPORARY ADMIN ACCESS
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              <span className="text-[#00D4FF]">WINRIDER</span><span className="text-[#FFC93C]">.AI</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              ระบบล็อกอินและลงทะเบียนถูกพักไว้ชั่วคราว เพื่อให้เจ้าของระบบเข้าแอปและตรวจหน้าจอแอดมินก่อน
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void enterAdmin()}
            disabled={loading}
            className="group w-full rounded-2xl border border-[#FFE28A] bg-gradient-to-b from-[#FFD95A] via-[#FFC93C] to-[#D79B13] px-5 py-4 text-slate-950 shadow-[0_12px_32px_rgba(255,201,60,0.28)] transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-3 text-base font-black">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />}
              {loading ? 'กำลังเข้าแอป...' : 'เข้าแอปในฐานะแอดมิน'}
            </span>
            <span className="mt-1 block text-[11px] font-bold text-slate-800/80">
              กดครั้งเดียว • ไม่ใช้อีเมล • ไม่ใช้รหัสผ่าน
            </span>
          </button>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-[11px] leading-relaxed text-amber-100/80">
                โหมดนี้เป็นโหมดชั่วคราวและไม่มีการยืนยันตัวตน ผู้ที่เปิดหน้าเว็บนี้สามารถกดเข้าเป็นแอดมินได้ จึงควรเปิดไว้เฉพาะช่วงตรวจระบบเท่านั้น
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 border-t border-white/10 pt-4 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-[#00D4FF]" />
            <span>เมื่อพร้อมใช้งานจริง ค่อยเปิด WIN Auth กลับมาอีกครั้ง</span>
          </div>
        </div>
      </div>
    </div>
  );
};
