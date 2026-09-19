import React, { useState } from 'react';
import { 
  ShieldAlert, 
  FileCheck2, 
  Users, 
  Coins, 
  Layers, 
  FileText, 
  ArrowLeft, 
  Crown, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  LogOut,
  Sparkles,
  BarChart3,
  BadgeAlert
} from 'lucide-react';
import { AdminLevel } from '../../types/admin';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminKycView } from './AdminKycView';
import { AdminUsersView } from './AdminUsersView';
import { AdminWalletView } from './AdminWalletView';
import { AdminFeeRulesView } from './AdminFeeRulesView';
import { AdminAuditLogsView } from './AdminAuditLogsView';

interface AdminLayoutProps {
  adminLevel: AdminLevel;
  adminEmail: string;
  onExitAdmin: () => void;
  onSwitchAdminLevel?: (lvl: AdminLevel) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  adminLevel,
  adminEmail,
  onExitAdmin,
  onSwitchAdminLevel
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kyc' | 'users' | 'wallet' | 'fees' | 'audit'>('dashboard');

  const tabs: { id: 'dashboard' | 'kyc' | 'users' | 'wallet' | 'fees' | 'audit'; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'ภาพรวมระบบ', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'kyc', label: 'ตรวจเอกสาร KYC', icon: <FileCheck2 className="w-4 h-4" />, badge: '5 รอตรวจ' },
    { id: 'users', label: 'จัดการผู้ใช้งาน', icon: <Users className="w-4 h-4" /> },
    { id: 'wallet', label: 'กองทุน 5 ถัง & Ledger', icon: <Coins className="w-4 h-4" /> },
    { id: 'fees', label: 'กฎค่าธรรมเนียม & GP', icon: <Layers className="w-4 h-4" /> },
    { id: 'audit', label: 'บันทึก Audit Logs', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans pb-16">
      {/* Admin Top Navigation Bar */}
      <header className="bg-[#0A1633] border-b border-[#00D4FF]/20 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00D4FF] to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.4)]">
              <Crown className="w-5 h-5 text-slate-950 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-white tracking-wider">
                  WINRIDER<span className="text-[#00D4FF]">.AI</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#00D4FF]/20 border border-[#00D4FF]/40 text-[#00D4FF] text-[10px] font-mono font-bold">
                  ADMIN CONSOLE
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                <span>ผู้ดูแล: <strong className="text-slate-200">{adminEmail}</strong></span>
              </div>
            </div>
          </div>

          {/* Role badge & Admin level switcher for testing + Exit button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Admin Level Badge & Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-700 text-xs font-mono">
              <span className="text-slate-400 text-[10px] hidden sm:inline">สิทธิ์:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                adminLevel === 'super' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                adminLevel === 'reviewer' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                'bg-slate-700 text-slate-300'
              }`}>
                {adminLevel === 'super' ? 'SUPER ADMIN' : adminLevel.toUpperCase()}
              </span>

              {onSwitchAdminLevel && (
                <select
                  value={adminLevel}
                  onChange={(e: any) => onSwitchAdminLevel(e.target.value)}
                  className="bg-transparent text-[10px] text-slate-400 hover:text-white cursor-pointer focus:outline-none"
                  title="ทดสอบสลับระดับสิทธิ์แอดมิน"
                >
                  <option value="super">Super</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="support">Support</option>
                </select>
              )}
            </div>

            {/* Back to App User Experience */}
            <button
              onClick={onExitAdmin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00D4FF]/15 hover:bg-[#00D4FF]/25 border border-[#00D4FF]/40 text-[#00D4FF] text-xs font-mono font-bold transition-all active:scale-95 shadow-[0_0_12px_rgba(0,212,255,0.2)] cursor-pointer"
              title="กลับสู่หน้าจอผู้ใช้งานปกติ"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับสู่หน้าแอป</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none border-t border-slate-800/80">
          <div className="flex items-center gap-1 py-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00D4FF] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,212,255,0.35)]'
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-slate-950 text-[#00D4FF]' : 'bg-[#FFC93C]/20 text-[#FFC93C] border border-[#FFC93C]/40'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Admin Content Viewport */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 flex-1">
        {activeTab === 'dashboard' && (
          <AdminDashboardView onNavigateTab={(t) => setActiveTab(t)} />
        )}
        {activeTab === 'kyc' && (
          <AdminKycView adminLevel={adminLevel} />
        )}
        {activeTab === 'users' && (
          <AdminUsersView adminLevel={adminLevel} />
        )}
        {activeTab === 'wallet' && (
          <AdminWalletView adminLevel={adminLevel} />
        )}
        {activeTab === 'fees' && (
          <AdminFeeRulesView adminLevel={adminLevel} />
        )}
        {activeTab === 'audit' && (
          <AdminAuditLogsView adminLevel={adminLevel} />
        )}
      </main>
    </div>
  );
};
