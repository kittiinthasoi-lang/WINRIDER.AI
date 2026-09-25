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
  onRedirectHome,
}) => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<AdminClaims | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const checkAccess = async () => {
    setLoading(true);
    setClaims(null);
    setAccessDenied(false);

    try {
      const result = await getAdminClaims();
      if (result?.admin) {
        if (requiredLevel === 'super' && result.adminLevel !== 'super') {
          setAccessDenied(true);
          return;
        }
        setClaims(result);
        return;
      }

      // Ordinary registered users never enter Admin Console.
      // Admin access exists only after a Super Admin explicitly grants the user's Firebase UID.
      setAccessDenied(true);
    } catch (error) {
      console.warn('AdminRoute access check failed:', error);
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkAccess();
  }, [requiredLevel]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1633] text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center mb-4 relative">
          <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
          <KeyRound className="w-4 h-4 text-[#FFC93C] absolute" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">กำลังตรวจสอบสิทธิ์ Admin</h2>
        <p className="text-sm text-cyan-300/70 font-mono">Firebase Auth + WINRIDER Admin Role</p>
      </div>
    );
  }

  if (accessDenied || !claims) {
    return (
      <div className="min-h-screen bg-[#0A1633] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5">
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Admin Console ปิดสำหรับบัญชีนี้</h1>
        <p className="text-slate-300 max-w-md mb-6 text-sm leading-relaxed">
          บัญชีนี้ยังไม่ได้รับสิทธิ์ Admin ต้องให้ Super Admin เพิ่ม Firebase UID ของบัญชีนี้ก่อน
        </p>
        <button
          onClick={onRedirectHome}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-sm"
        >
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  return <>{children(claims)}</>;
};
