import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  RefreshCw, 
  Loader2, 
  ArrowRight,
  Shield,
  Activity
} from 'lucide-react';
import { getAuditLogs } from '../../services/adminService';
import { AdminAuditLog, AdminLevel } from '../../types/admin';

interface AdminAuditLogsViewProps {
  adminLevel: AdminLevel;
}

export const AdminAuditLogsView: React.FC<AdminAuditLogsViewProps> = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const list = await getAuditLogs();
      setLogs(list);
    } catch (err) {
      console.error('fetchLogs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchSearch = 
        l.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.targetUid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.action?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchAction = actionFilter === 'ALL' || l.action === actionFilter;

      return matchSearch && matchAction;
    });
  }, [logs, searchTerm, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A1633] p-5 rounded-2xl border border-[#00D4FF]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <img 
            src="/images/armor_lightning.jpg" 
            alt="Audit Logs" 
            className="w-11 h-11 rounded-2xl object-cover ring-1 ring-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]" 
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold">
                IMMUTABLE AUDIT TRAIL
              </span>
              <span className="text-xs text-slate-400 font-mono">
                บันทึกการกระทำทั้งหมด: <strong className="text-white">{logs.length}</strong> รายการ
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              บันทึกการทำงานของผู้ดูแล (Audit Logs)
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              เรียงลำดับใหม่สุดก่อน ทุกการอนุมัติ, ปฏิเสธ, ระงับบัญชี, และปรับยอดเงิน จะถูกบันทึกถาวร
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรช Log</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0A1633] p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาด้วยอีเมลแอดมิน, Target UID, หรือเหตุผล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-[#00D4FF] focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">ประเภทคำสั่ง:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#00D4FF] font-mono"
          >
            <option value="ALL">ทุกคำสั่ง (ALL ACTIONS)</option>
            <option value="APPROVE_KYC">APPROVE_KYC (อนุมัติ)</option>
            <option value="REJECT_KYC">REJECT_KYC (ปฏิเสธ)</option>
            <option value="SUSPEND_USER">SUSPEND_USER (ระงับ)</option>
            <option value="UNSUSPEND_USER">UNSUSPEND_USER (ปลดระงับ)</option>
            <option value="ADJUST_WALLET">ADJUST_WALLET (ปรับเงิน)</option>
            <option value="UPDATE_FEE_RULE">UPDATE_FEE_RULE (แก้กฎ)</option>
            <option value="SET_ADMIN_ROLE">SET_ADMIN_ROLE (ตั้งสิทธิ์)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0A1633] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">วัน-เวลา (TIMESTAMP)</th>
                <th className="py-3 px-4">คำสั่ง (ACTION)</th>
                <th className="py-3 px-4">ผู้ดำเนินการ (ADMIN)</th>
                <th className="py-3 px-4">เป้าหมาย (TARGET UID)</th>
                <th className="py-3 px-4">เหตุผล & คำอธิบาย (REASON)</th>
                <th className="py-3 px-4 text-center">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-[#00D4FF] mx-auto mb-2" />
                    กำลังดึงข้อมูล Audit Logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ไม่พบบันทึก Audit Logs ที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => {
                  const isSelected = selectedLog?.id === l.id;
                  return (
                    <tr 
                      key={l.id}
                      onClick={() => setSelectedLog(l)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#00D4FF]/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-300 text-[11px] whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString('th-TH')}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          l.action === 'APPROVE_KYC' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' :
                          l.action === 'REJECT_KYC' ? 'bg-rose-500/15 border-rose-500/40 text-rose-300' :
                          l.action === 'SUSPEND_USER' ? 'bg-rose-500/15 border-rose-500/40 text-rose-300' :
                          l.action === 'ADJUST_WALLET' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' :
                          l.action === 'UPDATE_FEE_RULE' ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' :
                          'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        }`}>
                          {l.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-200">
                        <div className="font-bold truncate max-w-[160px]">{l.adminEmail}</div>
                        <div className="text-[10px] text-slate-500">{l.adminUid}</div>
                      </td>

                      <td className="py-3 px-4 text-[#00D4FF] font-bold">
                        {l.targetUid}
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-sans max-w-xs truncate text-[11px]">
                        {l.reason}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(l);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px]"
                        >
                          ดู Snapshot
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Snapshot Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0A1633] border border-[#00D4FF]/40 rounded-2xl p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400">AUDIT ENTRY ID:</span>
                <h3 className="text-base font-bold text-white text-[#00D4FF]">
                  {selectedLog.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">ผู้ดำเนินการ:</span>
                <span className="text-white font-bold">{selectedLog.adminEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">เป้าหมาย (TARGET):</span>
                <span className="text-[#FFC93C] font-bold">{selectedLog.targetUid} ({selectedLog.targetCollection})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">คำสั่ง:</span>
                <span className="text-emerald-400 font-bold">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">IP Address & เวลา:</span>
                <span className="text-slate-300">{selectedLog.ip || '127.0.0.1'} | {new Date(selectedLog.createdAt).toLocaleString('th-TH')}</span>
              </div>
              <div className="col-span-2 font-sans">
                <span className="text-slate-400 block text-[10px] font-mono">เหตุผลที่ระบุ (Reason):</span>
                <span className="text-white font-bold">{selectedLog.reason}</span>
              </div>
            </div>

            {/* Before and After State Diff */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px] mb-1">สถานะก่อนหน้า (BEFORE):</span>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-rose-300 text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.before || {}, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">สถานะหลังดำเนินการ (AFTER):</span>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-emerald-300 text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.after || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
