import React, { useEffect, useState } from 'react';
import { ShieldAlert, Loader2, KeyRound } from 'lucide-react';
import { getAdminClaims } from '../../services/adminService';
import { AdminClaims, AdminLevel } from '../../types/admin';

interface AdminRouteProps {
  children: (claims: AdminClaims) => React.ReactNode;
  requiredLevel?: AdminLevel;
  onRedirectHome: () => void;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  requiredLevel,
  onRedirectHome
}) => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<AdminClaims | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkClaims() {
      setLoading(true);
      try {
        const result = await getAdminClaims();
        if (!isMounted) return;

        if (!result || !result.admin) {
          // ถ้าไม่ใช่ admin ให้เด้งกลับหน้าแรกทันที ตามข้อกำหนดข้อ 1
          setAccessDenied(true);
          const timer = setTimeout(() => {
            if (isMounted) onRedirectHome();
          }, 1200);
          return () => clearTimeout(timer);
        }

        // ตรวจสอบ required level หากระบุ
        if (requiredLevel === 'super' && result.adminLevel !== 'super') {
          setAccessDenied(true);
          const timer = setTimeout(() => {
            if (isMounted) onRedirectHome();
          }, 1500);
          return () => clearTimeout(timer);
        }

        setClaims(result);
        setAccessDenied(false);
      } catch (err) {
        console.error('AdminRoute error checking claims:', err);
        setAccessDenied(true);
        onRedirectHome();
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkClaims();

    return () => {
      isMounted = false;
    };
  }, [requiredLevel, onRedirectHome]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1633] text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center mb-4 relative">
          <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
          <KeyRound className="w-4 h-4 text-[#FFC93C] absolute" />
        </div>
        <h2 className="text-xl font-bold font-mono text-white mb-1">กำลังตรวจสอบสิทธิ์ความปลอดภัย</h2>
        <p className="text-sm text-cyan-300/70 font-mono">Verifying Firebase Custom Claims...</p>
      </div>
    );
  }

  if (accessDenied || !claims) {
    return (
      <div className="min-h-screen bg-[#0A1633] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="w-10 h-10 text-red-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 tracking-wide font-sans">
          ไม่อนุญาตให้เข้าถึงระบบผู้ดูแล (Access Denied)
        </h1>
        <p className="text-slate-300 max-w-md mb-6 text-sm leading-relaxed">
          บัญชีของคุณไม่มีสิทธิ์ผู้ดูแลระบบ (<span className="font-mono text-red-400">admin: true</span>)
          หรือระดับสิทธิ์ไม่เพียงพอ ระบบจะนำคุณกลับสู่หน้าหลักโดยอัตโนมัติ...
        </p>
        <button
          onClick={onRedirectHome}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg transition-all active:scale-95"
        >
          กลับสู่หน้าหลักทันที
        </button>
      </div>
    );
  }

  return <>{children(claims)}</>;
};
