import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileCheck2, 
  Bike, 
  CheckCircle, 
  Coins, 
  Crown, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowUpRight, 
  Clock, 
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';
import { getAdminDashboardMetrics, getSystemWalletBreakdown } from '../../services/adminService';
import { SystemBucketsBreakdown } from '../../types/admin';

interface AdminDashboardViewProps {
  onNavigateTab: (tab: 'kyc' | 'users' | 'wallet' | 'fees' | 'audit') => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigateTab }) => {
  const [metrics, setMetrics] = useState({
    newUsersToday: 0,
    pendingKycCount: 0,
    knightsOnline: 0,
    tripsCompletedToday: 0,
    systemRevenueTodaySatang: 0,
    foundingQuotaRemaining: 10000
  });
  const [breakdown, setBreakdown] = useState<SystemBucketsBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [m, b] = await Promise.all([
        getAdminDashboardMetrics(),
        getSystemWalletBreakdown()
      ]);
      setMetrics(m);
      setBreakdown(b);
    } catch (err) {
      console.error('fetchStats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatBaht = (satang: number) => {
    return (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A1633] p-5 rounded-2xl border border-[#00D4FF]/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#00D4FF]/15 border border-[#00D4FF]/30 text-[#00D4FF] text-xs font-mono font-bold">
              SOVEREIGN OVERVIEW
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE SYSTEM SYNC
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
            ศูนย์บัญชาการระบบหลังบ้าน WINRIDER.AI
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            ภาพรวมการทำงานทุกมิติ: การยืนยันตัวตน, สถานะอัศวิน, กองทุน 5 ถัง และความสมดุล Double-Entry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Double-Entry Ledger Invariant Status Banner */}
      {breakdown && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
          breakdown.isBalanced 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
            : 'bg-rose-950/70 border-rose-500/60 text-rose-200 animate-pulse'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${breakdown.isBalanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/30 text-rose-400'}`}>
              {breakdown.isBalanced ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2 font-mono">
                <span>DOUBLE-ENTRY LEDGER: {breakdown.isBalanced ? 'BALANCED 100%' : 'สมดุลการเงินคลาดเคลื่อน!'}</span>
                {breakdown.isBalanced && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    DEBIT = CREDIT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                ผลรวมเดบิต: {formatBaht(breakdown.totalDebitSatang)} บาท | ผลรวมเครดิต: {formatBaht(breakdown.totalCreditSatang)} บาท
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('wallet')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-mono font-bold text-[#00D4FF] hover:underline"
          >
            <span>ตรวจสอบ 5 ถัง</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary Metrics Grid (6 Key Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. สมัครใหม่วันนี้ */}
        <div className="bg-[#0A1633] p-5 rounded-2xl border border-slate-800 hover:border-[#00D4FF]/40 transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400">ผู้สมัครใหม่วันนี้</span>
            <div className="p-2 rounded-xl bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{metrics.newUsersToday.toLocaleString()}</span>
            <span className="text-xs text-slate-400">บัญชี</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span className="text-[#00D4FF] flex items-center gap-1 font-mono">
              <Sparkles className="w-3.5 h-3.5" /> ซิงก์ข้อมูลสด Firestore
            </span>
            <button onClick={() => onNavigateTab('users')} className="hover:text-white transition-colors">
              ดูสมาชิกทั้งหมด &rarr;
            </button>
          </div>
        </div>

        {/* 2. รออนุมัติ KYC (Alert Highlight / Clean State) */}
        <div 
          onClick={() => onNavigateTab('kyc')}
          className={`bg-[#0A1633] p-5 rounded-2xl border transition-all group relative overflow-hidden cursor-pointer ${
            metrics.pendingKycCount > 0 
              ? 'border-[#FFC93C]/60 hover:border-[#FFC93C] shadow-[0_0_20px_rgba(255,201,60,0.15)]' 
              : 'border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          {metrics.pendingKycCount > 0 && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFC93C]/10 rounded-full blur-xl pointer-events-none" />
          )}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-mono font-bold flex items-center gap-1.5 ${
              metrics.pendingKycCount > 0 ? 'text-[#FFC93C]' : 'text-slate-400'
            }`}>
              {metrics.pendingKycCount > 0 && <span className="w-2 h-2 rounded-full bg-[#FFC93C] animate-ping" />}
              {metrics.pendingKycCount > 0 ? 'รอตรวจสอบ KYC ด่วน' : 'สถานะคิวตรวจสอบ KYC'}
            </span>
            <div className={`p-2 rounded-xl border ${
              metrics.pendingKycCount > 0 
                ? 'bg-[#FFC93C]/20 text-[#FFC93C] border-[#FFC93C]/40 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-4xl font-black font-mono ${
              metrics.pendingKycCount > 0 ? 'text-[#FFC93C]' : 'text-slate-200'
            }`}>{metrics.pendingKycCount}</span>
            <span className="text-xs text-slate-400">รายการค้างตรวจ</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
            <span className={metrics.pendingKycCount > 0 ? 'text-amber-300 font-medium' : 'text-emerald-400 font-mono'}>
              {metrics.pendingKycCount > 0 ? 'คิวสมัครตามลำดับเวลา' : 'เอกสารทุกรายการเป็นปัจจุบัน'}
            </span>
            <span className="text-[#00D4FF] font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              {metrics.pendingKycCount > 0 ? 'ตรวจเอกสารทันที \u2192' : 'เปิดดูคลัง KYC \u2192'}
            </span>
          </div>
        </div>

        {/* 3. อัศวินออนไลน์ตอนนี้ */}
        <div className="bg-[#0A1633] p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400">อัศวินออนไลน์สแตนด์บาย</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bike className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">{metrics.knightsOnline}</span>
            <span className="text-xs text-slate-400">คันพร้อมรับงาน</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> สถานะเรียลไทม์
            </span>
            <button onClick={() => onNavigateTab('users')} className="hover:text-white transition-colors">
              ดูรายชื่อ &rarr;
            </button>
          </div>
        </div>

        {/* 4. ทริปสำเร็จวันนี้ */}
        <div className="bg-[#0A1633] p-5 rounded-2xl border border-slate-800 hover:border-[#00D4FF]/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400">ทริปสำเร็จวันนี้</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{metrics.tripsCompletedToday}</span>
            <span className="text-xs text-slate-400">เที่ยววิ่ง</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span className="text-cyan-400 font-mono">ฐานข้อมูลการเดินทางจริง</span>
            <span className="text-slate-400 font-mono">นับจากทริปเสร็จสิ้น</span>
          </div>
        </div>

        {/* 5. รายได้ค่าระบบวันนี้ (ถัง System) */}
        <div className="bg-[#0A1633] p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400">รายได้เข้าถังระบบวันนี้</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              ฿{formatBaht(metrics.systemRevenueTodaySatang)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span className="text-indigo-300">หักตามขั้นบันได 1-3 บ.</span>
            <button onClick={() => onNavigateTab('wallet')} className="hover:text-white transition-colors">
              ดูยอด 5 ถัง &rarr;
            </button>
          </div>
        </div>

        {/* 6. สิทธิ์ Founding Knight คงเหลือ */}
        <div className="bg-[#0A1633] p-5 rounded-2xl border border-[#FFC93C]/30 hover:border-[#FFC93C]/60 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400">สิทธิ์ Founding Knight คงเหลือ</span>
            <div className="p-2 rounded-xl bg-[#FFC93C]/10 text-[#FFC93C] border border-[#FFC93C]/20">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#FFC93C] font-mono">
              {metrics.foundingQuotaRemaining.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">/ 10,000 สิทธิ์</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span className="text-amber-300">สวัสดิการตลอดชีพ</span>
            <span className="font-mono text-emerald-400">จองแล้ว {(10000 - metrics.foundingQuotaRemaining).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Quick Access Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateTab('kyc')}
          className="p-4 rounded-xl bg-[#0A1633] border border-slate-800 hover:border-[#00D4FF] text-left transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white group-hover:text-[#00D4FF] transition-colors">
            1. ตรวจสอบเอกสาร KYC
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ตรวจบัตรประชาชน, ใบขับขี่, ทะเบียนรถ และอนุมัติ/ปฏิเสธด้วยเหตุผล
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('users')}
          className="p-4 rounded-xl bg-[#0A1633] border border-slate-800 hover:border-[#00D4FF] text-left transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
            2. จัดการผู้ใช้งานทุกบทบาท
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ค้นหาผู้ใช้, ตรวจสอบ Ledger 50 รายการ, ระงับหรือปลดระงับบัญชี
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('wallet')}
          className="p-4 rounded-xl bg-[#0A1633] border border-slate-800 hover:border-[#00D4FF] text-left transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Coins className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
            3. ตรวจกองทุน 5 ถัง & Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ดูยอดเงินทั้งระบบ, ความสมดุลเดบิต-เครดิต และปรับยอดด้วยมือ (Super)
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('fees')}
          className="p-4 rounded-xl bg-[#0A1633] border border-slate-800 hover:border-[#00D4FF] text-left transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
            4. กฎค่าธรรมเนียมบันไดอัศวิน
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ปรับปรุงกฎบันได 0-30, 31-60, 61-120 บ. และ GP ร้านค้าอย่างปลอดภัย
          </p>
        </button>
      </div>
    </div>
  );
};
