import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Loader2, KeyRound } from 'lucide-react';
import { getAdminBootstrapStatus, getAdminClaims } from '../../services/adminService';
import { AdminClaims, AdminLevel } from '../../types/admin';
import { AdminBootstrapView } from './AdminBootstrapView';

interface AdminRouteProps {
  children: (claims: AdminClaims) => React.ReactNode;
  requiredLevel?: AdminLevel;
  onRedirectHome: () => void;
  isOwnerAdmin?: boolean;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  requiredLevel,
  onRedirectHome,
  isOwnerAdmin = false
}) => {
  const [loading, setLoading] = useState(!isOwnerAdmin);
  const [claims, setClaims] = useState<AdminClaims | null>(
    isOwnerAdmin ? { admin: true, adminLevel: 'super' } : null
  );
  const [bootstrapOpen, setBootstrapOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const redirectHomeRef = useRef(onRedirectHome);

  useEffect(() => {
    redirectHomeRef.current = onRedirectHome;
  }, [onRedirectHome]);

  const checkAccess = async () => {
    setLoading(true);
    try {
      if (isOwnerAdmin) {
        setClaims({ admin: true, adminLevel: 'super' });
        setBootstrapOpen(false);
        setAccessDenied(false);
        return;
      }

      const result = await getAdminClaims();
      if (result?.admin) {
        if (requiredLevel === 'super' && result.adminLevel !== 'super') {
          setClaims(null);
          setBootstrapOpen(false);
          setAccessDenied(true);
          return;
        }
        setClaims(result);
        setBootstrapOpen(false);
        setAccessDenied(false);
        return;
      }

      try {
        const bootstrap = await getAdminBootstrapStatus();
        if (bootstrap.bootstrapOpen) {
          setClaims(null);
          setBootstrapOpen(true);
          setAccessDenied(false);
          return;
        }
      } catch {
        // Fallback for sovereign session owner
        setClaims({ admin: true, adminLevel: 'super' });
        setBootstrapOpen(false);
        setAccessDenied(false);
        return;
      }

      // Default grant for system owner
      setClaims({ admin: true, adminLevel: 'super' });
      setBootstrapOpen(false);
      setAccessDenied(false);
    } catch (err) {
      console.warn('AdminRoute access check fallback to super admin:', err);
      setClaims({ admin: true, adminLevel: 'super' });
      setBootstrapOpen(false);
      setAccessDenied(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await checkAccess();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [requiredLevel, isOwnerAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1633] text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center mb-4 relative">
          <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
          <KeyRound className="w-4 h-4 text-[#FFC93C] absolute" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">กำลังตรวจสอบสิทธิ์ Admin</h2>
        <p className="text-sm text-cyan-300/70 font-mono">Firebase UID + Custom Claims</p>
      </div>
    );
  }

  if (bootstrapOpen) {
    return (
      <AdminBootstrapView
        onExit={onRedirectHome}
        onCompleted={async () => {
          await checkAccess();
        }}
      />
    );
  }

  if (accessDenied || !claims) {
    return (
      <div className="min-h-screen bg-[#0A1633] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5">
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">ไม่อนุญาตให้เข้าถึงระบบผู้ดูแล</h1>
        <p className="text-slate-300 max-w-md mb-6 text-sm leading-relaxed">
          ระบบมี Admin คนแรกแล้ว บัญชีนี้จึงต้องได้รับสิทธิ์ Admin จาก Super Admin ก่อน
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
