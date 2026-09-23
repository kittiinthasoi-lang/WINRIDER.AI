import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { playTactileBlip } from '../../utils/audio';
import {
  ShieldCheck,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export const AuthModalOrView: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const translateAuthError = (code: string) => {
    switch (code) {
      case 'INVALID_CREDENTIALS':
      case 'WIN_AUTH_INVALID_CREDENTIALS':
        return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      case 'EMAIL_ALREADY_REGISTERED':
        return 'อีเมลนี้ลงทะเบียนแล้ว กรุณากดเข้าสู่ระบบ';
      case 'WIN_AUTH_STORE_NOT_CONFIGURED':
        return 'ระบบบัญชี WIN Auth ยังไม่ได้เชื่อมที่เก็บข้อมูลถาวร';
      case 'ADMIN_PASSWORD_NOT_CONFIGURED':
        return 'บัญชีเจ้าของระบบยังไม่ได้ตั้งรหัสแอดมินฝั่งเซิร์ฟเวอร์';
      case 'ACCOUNT_SUSPENDED':
        return 'บัญชีนี้ถูกระงับ กรุณาติดต่อแอดมิน';
      case 'INVALID_EMAIL':
        return 'รูปแบบอีเมลไม่ถูกต้อง';
      case 'WEAK_PASSWORD':
        return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
      case 'WIN_AUTH_ADMIN_RESET_REQUIRED':
        return 'การเปลี่ยนรหัสผ่านต้องให้แอดมินดำเนินการ';
      default:
        return 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่านให้ครบ');
      return;
    }

    if (authMode === 'signup') {
      if (password.length < 8) {
        setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
        return;
      }
      if (password !== confirmPass) {
        setErrorMsg('ยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
    }

    setIsLoading(true);
    playTactileBlip(800);
    try {
      if (authMode === 'signin') {
        await signInWithEmail(cleanEmail, password);
      } else {
        await signUpWithEmail(cleanEmail, password, role);
      }
    } catch (err: any) {
      setErrorMsg(translateAuthError(err?.code || err?.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (!email.trim()) {
      setErrorMsg('กรอกอีเมลก่อน แล้วกด “ลืมรหัสผ่าน”');
      return;
    }
    try {
      await resetPassword(email.trim());
    } catch {
      setInfoMsg('กรุณาติดต่อแอดมิน WINRIDER เพื่อยืนยันตัวตนและตั้งรหัสผ่านใหม่');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-[#0A1633] border border-[#00D4FF]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_35px_rgba(0,212,255,0.18)] relative overflow-hidden text-slate-100">
        <div className="absolute top-0 right-0 w-56 h-56 bg-[#00D4FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-[#FFC93C]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC93C]" />
              <span>WIN Auth • บัญชีของ WINRIDER.AI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-thai">
              <span className="text-[#00D4FF]">WINRIDER</span><span className="text-[#FFC93C]">.AI</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              เจ้าของระบบเข้าได้ทันที • ผู้สมัครใหม่รอแอดมินอนุมัติ
            </p>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button type="button" onClick={() => { setAuthMode('signin'); setErrorMsg(null); setInfoMsg(null); }}
              className={`py-2 rounded-lg font-bold transition-all ${authMode === 'signin' ? 'bg-[#00D4FF] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
              เข้าสู่ระบบ
            </button>
            <button type="button" onClick={() => { setAuthMode('signup'); setErrorMsg(null); setInfoMsg(null); }}
              className={`py-2 rounded-lg font-bold transition-all ${authMode === 'signup' ? 'bg-[#00D4FF] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
              ลงทะเบียนใหม่
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">อีเมล</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]" />
              </div>
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">สมัครในบทบาท</label>
                <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]">
                  <option value="citizen">🛡️ พลเมือง / ผู้โดยสาร</option>
                  <option value="knight">🏍️ พี่วิน / Knight</option>
                  <option value="merchant">🏪 ร้านค้า / Merchant</option>
                  <option value="partner">🏢 พาร์ทเนอร์ / Partner</option>
                </select>
                <p className="mt-1 text-[11px] text-amber-300">ทุกบทบาทต้องรอแอดมินอนุมัติก่อนเข้าใช้งานจริง</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" required minLength={8}
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]" />
              </div>
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">ยืนยันรหัสผ่าน</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="password" required minLength={8} autoComplete="new-password"
                    value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]" />
                </div>
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#00D4FF] hover:bg-[#00c0e8] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,212,255,0.3)] disabled:opacity-50">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>กำลังดำเนินการ...</span></>
                : authMode === 'signin' ? <><LogIn className="w-4 h-4" /><span>เข้าสู่ระบบ</span></>
                : <><UserPlus className="w-4 h-4" /><span>ส่งคำขอลงทะเบียน</span></>}
            </button>

            {authMode === 'signin' && (
              <button type="button" onClick={handleResetPassword} disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 hover:border-[#00D4FF]/50 disabled:opacity-50">
                <KeyRound className="w-4 h-4" />
                <span>ลืมรหัสผ่าน / ติดต่อแอดมิน</span>
              </button>
            )}
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
              <span>รหัสผ่านถูก hash ฝั่งเซิร์ฟเวอร์ • ไม่เก็บรหัสจริงในหน้าเว็บ</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              เจ้าของระบบใช้บัญชี Super Admin เดิม ส่วนบัญชีอื่นต้องผ่านการอนุมัติ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
