import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { AuthModalOrView } from './AuthModalOrView';
import { RoleSelectionAndRegistration } from './RoleSelectionAndRegistration';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { playTactileBlip } from '../../utils/audio';

interface Props {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  onRedirectToMyDashboard?: (role: UserRole) => void;
  /** Allow a role-locked area to render when it is explicitly being shown in customer/read-only mode. */
  allowCustomerView?: boolean;
}

export const ProtectedRoute: React.FC<Props> = ({ 
  allowedRoles, 
  children, 
  onRedirectToMyDashboard,
  allowCustomerView = false,
}) => {
  const { firebaseUser, userData, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
        <span className="text-xs font-mono tracking-wider text-slate-400">
          WINRIDER.AI VERIFYING CREDENTIALS...
        </span>
      </div>
    );
  }

  // 1. Not signed in to Firebase Authentication -> Show Auth
  if (!firebaseUser) {
    return <AuthModalOrView />;
  }

  const isOwnerAdmin =
    userData?.isAdmin === true &&
    userData?.adminLevel === 'super';

  // เจ้าของระบบใช้ Firebase UID เดียวเพื่อควบคุมแอปและเปิดทุกบทบาท
  if (isOwnerAdmin) return <>{children}</>;

  // 2. Compatibility guard for an incomplete legacy profile
  if (!userData || !userData.role) {
    return <RoleSelectionAndRegistration />;
  }

  // 4. Role mismatch check
  if (!allowedRoles.includes(userData.role) && !allowCustomerView) {
    const roleNames: Record<UserRole, string> = {
      knight: 'อัศวินไรเดอร์',
      citizen: 'พลเมืองอัศวิน',
      merchant: 'ร้านค้าพันธมิตร',
      partner: 'องค์กรพาร์ทเนอร์',
    };

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-[#0A1633] border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white font-thai">
            สงวนสิทธิ์เฉพาะบทบาท
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            หน้านี้สงวนสิทธิ์เฉพาะบทบาท <strong className="text-amber-400">{allowedRoles.map(r => roleNames[r]).join(', ')}</strong><br />
            บัญชีปัจจุบันของคุณคือ <strong className="text-[#00D4FF]">{roleNames[userData.role]}</strong>
          </p>
          <button
            onClick={() => {
              playTactileBlip(800);
              if (onRedirectToMyDashboard) {
                onRedirectToMyDashboard(userData.role);
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#00D4FF] hover:bg-[#00c0e8] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <span>ไปยังแดชบอร์ดบทบาทของคุณ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Authorized -> Render content
  return <>{children}</>;
};
