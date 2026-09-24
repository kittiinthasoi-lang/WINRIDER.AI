import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playTactileBlip } from '../../utils/audio';

export const AuthModalOrView: React.FC = () => {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (entering) return;
    setEntering(true);
    setError('');
    playTactileBlip(900);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (cause: any) {
      const code = String(cause?.code || '');
      if (code.includes('INVALID_CREDENTIALS')) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (code.includes('ACCOUNT_SUSPENDED')) {
        setError('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      } else if (code.includes('WIN_AUTH_STORE') || code.includes('503')) {
        setError('ระบบบัญชียังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจ Firebase Admin/Service Account');
      } else {
        setError(cause instanceof Error ? cause.message : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
      }
    } finally {
      setEntering(false);
    }
  };

  return (
    <div className="min-h-[78vh] w-full flex items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-cyan-400/30 bg-[#081126] p-6 sm:p-8 text-slate-100 shadow-[0_0_55px_rgba(34,211,238,0.12)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/35 bg-gradient-to-br from-cyan-300/20 via-blue-500/10 to-amber-400/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              <ShieldCheck className="h-10 w-10 text-cyan-300" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black tracking-wide text-emerald-300">
              <LockKeyhole className="h-3.5 w-3.5" />
              SECURE SIGN-IN
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              <span className="text-cyan-300">WINRIDER</span><span className="text-amber-300">.AI</span>
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-300">เข้าสู่ระบบด้วยบัญชีที่ได้รับอนุญาต</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              ทางเข้า Super Admin แบบไม่ใช้รหัสถูกปิดแล้ว ระบบจะตรวจบัญชีจากฐานข้อมูลจริง
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-300">อีเมล</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-300">รหัสผ่าน</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-11 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              id="secure-sign-in"
              type="submit"
              disabled={entering || !email.trim() || password.length < 8}
              className="group w-full rounded-2xl border border-cyan-200/50 bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 px-5 py-4 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.28)] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-3">
                {entering ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                <span className="text-sm font-black">{entering ? 'กำลังตรวจสอบบัญชี...' : 'เข้าสู่ระบบ'}</span>
              </div>
            </button>
          </form>

          <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[11px] leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span>
              ระบบจะไม่แสดงหรือส่งค่า Service Account มาที่หน้าเว็บ หาก backend ยังไม่พร้อม หน้าเข้าสู่ระบบจะแจ้งข้อผิดพลาดแทนการเปิดสิทธิ์แอดมินชั่วคราว
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
