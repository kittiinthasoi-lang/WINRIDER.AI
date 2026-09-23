import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Clock, RefreshCw, LogOut, CheckCircle2, FileText, PhoneCall, Sparkles } from 'lucide-react';
import { playTactileBlip } from '../../utils/audio';

export const PendingReviewView: React.FC = () => {
  const { userData, refreshUserData, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    playTactileBlip(800);
    setIsRefreshing(true);
    await refreshUserData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getRoleLabel = () => {
    switch (userData?.role) {
      case 'knight':
        return 'อัศวินไรเดอร์ (Knight Rider)';
      case 'merchant':
        return 'ร้านค้าพันธมิตร (Merchant Partner)';
      case 'partner':
        return 'องค์กรพาร์ทเนอร์ (Institutional Partner)';
      default:
        return 'สมาชิกจักรวรรดิ WINRIDER.AI';
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl bg-[#0A1633] border border-[#00D4FF]/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,212,255,0.15)] relative overflow-hidden text-slate-100">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00D4FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FFC93C]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.3)] animate-pulse">
              <Clock className="w-10 h-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-thai">
              บัญชีอยู่ระหว่างรออนุมัติ
            </h1>
            <p className="text-sm text-slate-300">
              ยินดีต้อนรับคุณ <span className="text-[#00D4FF] font-semibold">{userData?.displayName}</span> ในฐานะ <span className="text-[#FFC93C] font-semibold">{getRoleLabel()}</span>
            </p>
          </div>

          {/* Status Badge */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <div>
                <div className="text-xs text-slate-400">สถานะบัญชี (Status)</div>
                <div className="text-sm font-bold text-amber-400">รอแอดมินอนุมัติ (Pending Review)</div>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 font-semibold">
              รอ Super Admin ตรวจสอบและอนุมัติ
            </span>
          </div>

          {/* Checklist */}
          <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>รายการตรวจสอบสถานะข้อมูล</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>ข้อมูลบัญชีและบทบาทที่สมัคร</span>
                </div>
                <span className="text-emerald-400 font-medium">บันทึกสำเร็จ (v1.0)</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-200">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>การอนุมัติสิทธิ์เข้าใช้งานโดยแอดมิน</span>
                </div>
                <span className="text-amber-400 font-medium">รออนุมัติ (Pending)</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
                  <span>การจัดเตรียมกระเป๋าอัศวิน (Sovereign Wallet)</span>
                </div>
                <span className="text-[#00D4FF] font-medium">พร้อมใช้งาน (0.00 บาท)</span>
              </div>
            </div>
          </div>



          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#00D4FF] hover:bg-[#00c0e8] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,212,255,0.4)] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะอีกครั้ง'}</span>
            </button>

            <button
              onClick={() => signOut()}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
