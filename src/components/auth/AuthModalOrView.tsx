import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, LockKeyhole, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playTactileBlip } from '../../utils/audio';

type Mode = 'login' | 'register' | 'reset';

function friendlyError(error: any) {
  const code = String(error?.code || error?.message || '');
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (code.includes('email-already-in-use')) return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ';
  if (code.includes('weak-password')) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (code.includes('invalid-email')) return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (code.includes('api-key-not-valid') || code.includes('invalid-api-key')) return 'Firebase Web API Key ยังไม่ได้ตั้งค่า';
  return error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่';
}

export const AuthModalOrView: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const changeMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setError('');
    setNotice('');
    playTactileBlip(900);

    try {
      if (mode === 'register') {
        await signUpWithEmail(email.trim(), password);
        setPassword('');
        setMode('login');
        setNotice('สร้างบัญชีแล้ว เข้าสู่ระบบเรียบร้อย กรุณาเลือกบทบาทเพื่อเริ่มใช้งาน');
      } else if (mode === 'reset') {
        await resetPassword(email.trim());
        setMode('login');
        setNotice('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว');
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-[78vh] w-full flex items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-cyan-400/30 bg-[#081126] p-6 sm:p-8 text-slate-100 shadow-[0_0_55px_rgba(34,211,238,0.12)]">
        <div className="relative z-10 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/35 bg-cyan-300/10">
              <ShieldCheck className="h-10 w-10 text-cyan-300" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black text-emerald-300">
              <LockKeyhole className="h-3.5 w-3.5" /> FIREBASE AUTHENTICATION
            </div>
            <h1 className="mt-3 text-3xl font-black text-white"><span className="text-cyan-300">WINRIDER</span><span className="text-amber-300">.AI</span></h1>
            <p className="mt-2 text-sm font-semibold text-slate-300">
              {mode === 'register' ? 'สมัครบัญชีใหม่' : mode === 'reset' ? 'ตั้งรหัสผ่านใหม่' : 'เข้าสู่ระบบ'}
            </p>
            <p className="mt-1 text-xs text-slate-500">สมัครแล้วเข้าใช้งานได้ทันที รหัสผ่านจัดการโดย Firebase Authentication</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-300">อีเมล</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" />
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-cyan-400/60" />
              </div>
            </label>

            {mode !== 'reset' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">รหัสผ่าน</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                  <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-11 text-sm text-white outline-none focus:border-cyan-400/60" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            )}

            {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
            {notice && <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">{notice}</div>}

            <button type="submit" disabled={working || !email.trim() || (mode !== 'reset' && password.length < 8)}
              className="w-full rounded-2xl border border-cyan-200/50 bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 px-5 py-4 text-slate-950 disabled:opacity-50">
              <div className="flex items-center justify-center gap-3">
                {working ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'register' ? <UserPlus className="h-5 w-5" /> : mode === 'reset' ? <KeyRound className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                <span className="text-sm font-black">{working ? 'กำลังดำเนินการ...' : mode === 'register' ? 'สร้างบัญชี' : mode === 'reset' ? 'ส่งลิงก์รีเซ็ต' : 'เข้าสู่ระบบ'}</span>
              </div>
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold">
            {mode !== 'login' && <button type="button" onClick={() => changeMode('login')} className="text-cyan-300">เข้าสู่ระบบ</button>}
            {mode !== 'register' && <button type="button" onClick={() => changeMode('register')} className="text-amber-300">สมัครใหม่</button>}
            {mode !== 'reset' && <button type="button" onClick={() => changeMode('reset')} className="text-slate-300">ลืมรหัสผ่าน</button>}
          </div>
        </div>
      </div>
    </div>
  );
};
