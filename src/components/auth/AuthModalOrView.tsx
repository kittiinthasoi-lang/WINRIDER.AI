import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playTactileBlip } from '../../utils/audio';
import { 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  AlertCircle, 
  Loader2, 
  Sparkles
} from 'lucide-react';

export const AuthModalOrView: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    playTactileBlip(800);
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(translateAuthError(err?.code || err?.message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (authMode === 'signup') {
      if (password.length < 6) {
        setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return;
      }
      if (password !== confirmPass) {
        setErrorMsg('รหัสผ่านยืนยันไม่ตรงกัน');
        return;
      }
    }

    setIsLoading(true);
    playTactileBlip(800);

    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err: any) {
      setErrorMsg(translateAuthError(err?.code || err?.message));
    } finally {
      setIsLoading(false);
    }
  };

  const translateAuthError = (code: string) => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      case 'auth/email-already-in-use':
        return 'อีเมลนี้มีผู้ใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบด้วยอีเมลเดิม';
      case 'auth/weak-password':
        return 'รหัสผ่านสั้นหรือคาดเดาง่ายเกินไป (ขั้นต่ำ 6 ตัวอักษร)';
      case 'auth/invalid-email':
        return 'รูปแบบที่อยู่อีเมลไม่ถูกต้อง';
      case 'auth/popup-blocked':
        return 'เบราว์เซอร์บล็อกหน้าต่าง Pop-up กรุณาอนุญาตป๊อปอัปเพื่อลงชื่อเข้าใช้ด้วย Google';
      case 'auth/invalid-api-key':
        return 'Firebase Web API key ไม่ถูกต้องหรือถูกลบ กรุณาใส่ VITE_FIREBASE_API_KEY ตัวใหม่ของโปรเจกต์ก่อนเข้าสู่ระบบ';
      case 'auth/unauthorized-domain':
        return 'โดเมนที่เปิด WINRIDER ยังไม่ได้อยู่ใน Firebase Authentication > Authorized domains';
      case 'auth/operation-not-allowed':
        return 'ยังไม่ได้เปิด Google หรือ Email/Password provider ใน Firebase Authentication';
      case 'auth/network-request-failed':
        return 'เชื่อมต่อ Firebase ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่';
      default:
        return 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ กรุณาลองใหม่อีกครั้ง';
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-[#0A1633] border border-[#00D4FF]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_35px_rgba(0,212,255,0.18)] relative overflow-hidden text-slate-100">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-[#00D4FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-[#FFC93C]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC93C]" />
              <span>ระบบยืนยันตัวตนจริง Firebase Auth</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-thai">
              เข้าสู่ระบบ <span className="text-[#00D4FF]">WINRIDER</span><span className="text-[#FFC93C]">.AI</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              เข้าสู่ระบบเพื่อเข้าสู่แดชบอร์ดตามบทบาท หรือลงทะเบียนบัญชีใหม่
            </p>
          </div>

          {/* Google Sign-in Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-[#00D4FF]/50 text-white text-sm font-semibold flex items-center justify-center gap-3 transition-all duration-200 shadow-md disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>ลงชื่อเข้าใช้ด้วย Google Account</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">หรือใช้อีเมล</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Tab switch between Sign In & Sign Up */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg font-bold transition-all ${
                authMode === 'signin'
                  ? 'bg-[#00D4FF] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg font-bold transition-all ${
                authMode === 'signup'
                  ? 'bg-[#00D4FF] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ลงทะเบียนใหม่
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                อีเมล (Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                />
              </div>
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ยืนยันรหัสผ่าน (Confirm Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#00D4FF] hover:bg-[#00c0e8] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,212,255,0.3)] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : authMode === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>ลงทะเบียนบัญชี</span>
                </>
              )}
            </button>
          </form>

          {/* Security & Authentication Notice */}
          <div className="pt-4 border-t border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
              <span>การยืนยันตัวตนระดับอธิปไตยดิจิทัล ฐานข้อมูลจริง Firebase</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              บัญชีใหม่ทุกบทบาทจะเริ่มนับเลเวลและสถิติการใช้งานจริงตามการทำรายการ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
