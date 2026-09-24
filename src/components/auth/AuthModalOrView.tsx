import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, ShieldCheck, UserPlus, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playTactileBlip } from '../../utils/audio';
import { isValidWinUid, normalizeWinUid } from '../../auth/winUid';

type Mode = 'login' | 'register';

function friendlyError(error: any) {
  const code = String(error?.code || error?.message || '');
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'WIN UID หรือรหัสผ่านไม่ถูกต้อง';
  }
  if (code.includes('email-already-in-use')) return 'WIN UID นี้ถูกใช้งานแล้ว กรุณาตั้ง UID ใหม่';
  if (code.includes('weak-password')) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (code.includes('api-key-not-valid') || code.includes('invalid-api-key')) return 'Firebase Web API Key ยังไม่พร้อมใช้งาน';
  return error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่';
}

export const AuthModalOrView: React.FC = () => {
  const { signInWithWinUid, signUpWithWinUid } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [winUid, setWinUid] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const changeMode = (next: Mode) => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (working) return;
    setError('');
    playTactileBlip(900);

    const normalizedUid = normalizeWinUid(winUid);
    if (!isValidWinUid(normalizedUid)) {
      setError('WIN UID ต้องมี 4-30 ตัว ใช้ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง');
      return;
    }
    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) {
        setError('กรุณากรอกชื่อและนามสกุล');
        return;
      }
      if (password !== confirmPassword) {
        setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
    }

    setWorking(true);
    try {
      if (mode === 'register') {
        await signUpWithWinUid({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          winUid: normalizedUid,
          password,
        });
      } else {
        await signInWithWinUid(normalizedUid, password);
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
              <BadgeCheck className="h-3.5 w-3.5" /> WIN UID ACCOUNT
            </div>
            <h1 className="mt-3 text-3xl font-black text-white"><span className="text-cyan-300">WINRIDER</span><span className="text-amber-300">.AI</span></h1>
            <p className="mt-2 text-sm font-semibold text-slate-300">
              {mode === 'register' ? 'สมัครบัญชีใหม่' : 'เข้าสู่ระบบ'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              ไม่ต้องใช้อีเมล ตั้ง WIN UID และรหัสผ่านของคุณเอง
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-300">ชื่อ</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400/60"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-300">นามสกุล</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400/60"
                  />
                </label>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-300">WIN UID</span>
              <input
                value={winUid}
                onChange={(e) => setWinUid(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                required
                minLength={4}
                maxLength={30}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="เช่น kitti001"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400/60"
              />
              <span className="mt-1 block text-[10px] text-slate-500">ใช้ a-z, 0-9, จุด (.), ขีดกลาง (-), ขีดล่าง (_)</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-300">รหัสผ่าน</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-11 text-sm text-white outline-none focus:border-cyan-400/60"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {mode === 'register' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">ยืนยันรหัสผ่าน</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60"
                />
              </label>
            )}

            {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}

            <button
              type="submit"
              disabled={working || !winUid.trim() || password.length < 8}
              className="w-full rounded-2xl border border-cyan-200/50 bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 px-5 py-4 text-slate-950 disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-3">
                {working ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'register' ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                <span className="text-sm font-black">
                  {working ? 'กำลังดำเนินการ...' : mode === 'register' ? 'ตกลงและไปเลือกบทบาท' : 'เข้าสู่ระบบ'}
                </span>
              </div>
            </button>
          </form>

          <div className="flex justify-center text-xs font-semibold">
            {mode === 'register' ? (
              <button type="button" onClick={() => changeMode('login')} className="text-cyan-300">มีบัญชีแล้ว · เข้าสู่ระบบ</button>
            ) : (
              <button type="button" onClick={() => changeMode('register')} className="text-amber-300">สมัครใหม่</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
