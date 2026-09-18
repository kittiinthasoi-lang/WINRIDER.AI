import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Shield, 
  ShieldAlert, 
  CheckCircle, 
  Ban, 
  Unlock, 
  Wallet, 
  Receipt, 
  Clock, 
  Phone, 
  Mail, 
  Bike, 
  Store, 
  UserCheck, 
  X, 
  RefreshCw,
  Loader2,
  Crown
} from 'lucide-react';
import { getAllUsers, getUserLedgerHistory, suspendUser, unsuspendUser, setAdminRole } from '../../services/adminService';
import { AdminUserSummary, AdminLevel, LedgerTransaction } from '../../types/admin';

interface AdminUsersViewProps {
  adminLevel: AdminLevel;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ adminLevel }) => {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'knight' | 'citizen' | 'merchant' | 'partner'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_review' | 'suspended'>('all');
  
  // Detail Drawer & Ledger
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [userLedger, setUserLedger] = useState<LedgerTransaction[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Suspend Dialog
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  
  // Set Role Dialog
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [targetAdminLevel, setTargetAdminLevel] = useState<'super' | 'reviewer' | 'support'>('reviewer');

  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await getAllUsers();
      setUsers(list);
    } catch (err) {
      console.error('fetchUsers error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

    const handleSelectUser = async (u: AdminUserSummary) => {
    // กันไว้ถ้าข้อมูลผู้ใช้ไม่มี UID
    if (!u || !u.uid) {
      console.error("User or UID is missing!");
      return;
    }
    
    setSelectedUser(u);
    setLedgerLoading(true);
    try {
      const history = await getUserLedgerHistory(u.uid);
      // เช็คให้แน่ใจว่าเป็น Array ก่อนเซ็ตค่าลง State
      setUserLedger(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error('getUserLedgerHistory error:', err);
      setUserLedger([]); 
    } finally {
      setLedgerLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = 
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm) ||
        u.uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleConfirmSuspend = async () => {
    if (!selectedUser || !suspendReason.trim()) return;
    setActionLoading(true);
    try {
      await suspendUser(selectedUser.uid, suspendReason.trim());
      alert(`ระงับบัญชีผู้ใช้ ${selectedUser.displayName} เรียบร้อยแล้ว`);
      setShowSuspendModal(false);
      setSuspendReason('');
      fetchUsers();
      setSelectedUser(prev => prev ? { ...prev, status: 'suspended', isOnline: false } : null);
    } catch (err: any) {
      alert(`ไม่สามารถระงับบัญชีได้: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmUnsuspend = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`ยืนยันการปลดการระงับบัญชี "${selectedUser.displayName}" ใช่หรือไม่?`)) return;
    setActionLoading(true);
    try {
      await unsuspendUser(selectedUser.uid, 'แอดมินตรวจสอบข้อเท็จจริงและอนุมัติให้กลับมาใช้งาน');
      alert(`ปลดระงับบัญชี ${selectedUser.displayName} เรียบร้อยแล้ว`);
      fetchUsers();
      setSelectedUser(prev => prev ? { ...prev, status: 'active' } : null);
    } catch (err: any) {
      alert(`ไม่สามารถปลดระงับได้: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSetAdminRole = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await setAdminRole(selectedUser.uid, targetAdminLevel, `แต่งตั้งสิทธิ์ระดับ ${targetAdminLevel}`);
      alert(`แต่งตั้งสิทธิ์ ${targetAdminLevel} ให้แก่ ${selectedUser.displayName} เรียบร้อยแล้ว`);
      setShowRoleModal(false);
      fetchUsers();
      setSelectedUser(prev => prev ? { ...prev, adminLevel: targetAdminLevel } : null);
    } catch (err: any) {
      alert(`แต่งตั้งสิทธิ์ไม่สำเร็จ: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A1633] p-5 rounded-2xl border border-[#00D4FF]/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold">
              CITIZEN & KNIGHT REGISTRY
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ผู้ใช้ทั้งหมด: <strong className="text-white">{users.length}</strong> บัญชี
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">
            จัดการบัญชีผู้ใช้งานและบทบาท
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            ค้นหา, ตรวจสอบสถานะ, ส่องประวัติ Ledger 50 รายการล่าสุด และควบคุมสิทธิ์
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชรายชื่อ</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#0A1633] p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรือ UID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-[#00D4FF] focus:outline-none"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">บทบาท:</span>
          <select
            value={roleFilter}
            onChange={(e: any) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#00D4FF]"
          >
            <option value="all">ทุกบทบาท</option>
            <option value="knight">🏍️ อัศวิน (Knight)</option>
            <option value="citizen">🛡️ พลเมือง (Citizen)</option>
            <option value="merchant">🏪 ร้านค้า (Merchant)</option>
            <option value="partner">🏢 พาร์ทเนอร์ (Partner)</option>
          </select>

          {/* Status Filter */}
          <span className="text-xs text-slate-400 font-mono hidden sm:inline ml-2">สถานะ:</span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#00D4FF]"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">Active (ใช้งานปกติ)</option>
            <option value="pending_review">Pending Review (รอตรวจ)</option>
            <option value="suspended">Suspended (ระงับบัญชี)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0A1633] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-900/80 text-slate-400 font-mono border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">ผู้ใช้งาน</th>
                <th className="py-3 px-4">บทบาท</th>
                <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-right">ยอดกระเป๋า</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-[#00D4FF] mx-auto mb-2" />
                    กำลังโหลดข้อมูลผู้ใช้...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUser?.uid === u.uid;
                  return (
                    <tr 
                      key={u.uid}
                      onClick={() => handleSelectUser(u)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#00D4FF]/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                            {u.displayName?.substring(0, 1) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.displayName}</span>
                              {u.adminLevel && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono">
                                  ADMIN:{u.adminLevel.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{u.uid}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                          u.role === 'knight' 
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : u.role === 'merchant'
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                            : u.role === 'partner'
                            ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                            : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {u.phone || '-'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border flex items-center gap-1 w-max ${
                          u.status === 'active'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : u.status === 'pending_review'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'active' ? 'bg-emerald-400' : u.status === 'pending_review' ? 'bg-amber-400' : 'bg-rose-400'
                          }`} />
                          {u.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        ฿{((u.walletBalanceSatang || 0) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectUser(u);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-[#00D4FF]/20 text-[#00D4FF] border border-slate-700 hover:border-[#00D4FF]/40 text-[11px] transition-all"
                        >
                          ดูประวัติ
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

      {/* Selected User Detail & Ledger History Drawer */}
      {selectedUser && (
        <div className="bg-[#0A1633] rounded-2xl border border-[#00D4FF]/30 p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-[#00D4FF]/40 flex items-center justify-center font-bold text-lg text-white">
                {selectedUser.displayName?.substring(0, 1)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedUser.displayName}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {selectedUser.role}
                  </span>
                </h2>
                <div className="text-xs text-slate-400 font-mono">UID: {selectedUser.uid}</div>
              </div>
            </div>

            {/* Action Bar for Selected User */}
            <div className="flex items-center gap-2">
              {adminLevel === 'super' && (
                <button
                  onClick={() => setShowRoleModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>สิทธิ์แอดมิน</span>
                </button>
              )}

              {selectedUser.status === 'suspended' ? (
                <button
                  onClick={handleConfirmUnsuspend}
                  disabled={actionLoading || adminLevel === 'support'}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>ปลดระงับบัญชี</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowSuspendModal(true)}
                  disabled={actionLoading || adminLevel !== 'super'}
                  title={adminLevel !== 'super' ? 'เฉพาะ Super Admin เท่านั้น' : ''}
                  className="px-4 py-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                  <span>ระงับบัญชี (Super)</span>
                </button>
              )}

              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Details & Wallet Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">เบอร์โทร & อีเมล</span>
              <div className="text-xs text-white font-mono font-bold">{selectedUser.phone || '-'}</div>
              <div className="text-[11px] text-slate-400 font-mono truncate">{selectedUser.email || '-'}</div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">ยอดเงินในกระเป๋า</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ฿{((selectedUser.walletBalanceSatang || 0) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{selectedUser.walletBalanceSatang || 0} สตางค์</span>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">ข้อมูลสถานะยานพาหนะ</span>
              <div className="text-xs text-amber-300 font-bold font-mono">
                {selectedUser.plateNumber || 'ยังไม่ลงทะเบียนรถ'}
              </div>
              <span className="text-[10px] text-slate-400">ออนไลน์: {selectedUser.isOnline ? '🟢 กำลังออนไลน์' : '⚪ ออฟไลน์'}</span>
            </div>
          </div>

          {/* Ledger History 50 Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold text-[#00D4FF] flex items-center gap-1.5">
                <Receipt className="w-4 h-4" />
                <span>ประวัติธุรกรรม Ledger 50 รายการล่าสุด (Audit Trail)</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {userLedger.length} รายการ
              </span>
            </div>

            <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden max-h-72 overflow-y-auto scrollbar-thin">
              {ledgerLoading ? (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-[#00D4FF] mx-auto mb-2" />
                  กำลังดึงข้อมูล Ledger...
                </div>
              ) : userLedger.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  ยังไม่มีประวัติการทำธุรกรรมในบัญชีนี้
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">วัน-เวลา</th>
                      <th className="py-2.5 px-3">ประเภท</th>
                      <th className="py-2.5 px-3">คำอธิบาย</th>
                      <th className="py-2.5 px-3 text-right">จำนวนเงิน</th>
                      <th className="py-2.5 px-3 text-right">ยอดคงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {userLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {tx.timestamp}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'EARNING' ? 'bg-emerald-500/20 text-emerald-300' :
                            tx.type === 'WELFARE_DEDUCT' ? 'bg-indigo-500/20 text-indigo-300' :
                            tx.type === 'WITHDRAWAL' ? 'bg-rose-500/20 text-rose-300' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300 text-[11px] font-sans truncate max-w-xs">
                          {tx.description}
                        </td>
                        <td className={`py-2 px-3 text-right font-bold ${
                          tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {tx.amount >= 0 ? `+฿${tx.amount.toFixed(2)}` : `-฿${Math.abs(tx.amount).toFixed(2)}`}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300 font-bold">
                          ฿{tx.balanceAfter.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal (Mandatory Reason) */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0A1633] border border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white font-sans">
                ระงับบัญชีผู้ใช้งาน
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              ผู้ใช้ <strong className="text-white font-sans">{selectedUser.displayName}</strong> จะถูกระงับทันที และหากเป็นอัศวินจะถูกปรับสถานะเป็นออฟไลน์
            </p>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                ระบุเหตุผลในการระงับบัญชี <span className="text-rose-400">* บังคับ</span>:
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="เช่น พบพฤติกรรมทุจริต หรือ ละเมิดข้อกำหนดความปลอดภัย..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={actionLoading || !suspendReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>ยืนยันระงับบัญชี</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Admin Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0A1633] border border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Crown className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white font-sans">
                แต่งตั้งสิทธิ์ผู้ดูแลระบบ (Admin Role)
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              แต่งตั้งสิทธิ์ให้แก่: <strong className="text-white font-sans">{selectedUser.displayName}</strong> ({selectedUser.email})
            </p>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                เลือกระดับสิทธิ์:
              </label>
              <select
                value={targetAdminLevel}
                onChange={(e: any) => setTargetAdminLevel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="super">👑 Super Admin (จัดการได้ทุกส่วน รวมถึงปรับกระเป๋าเงินและระงับบัญชี)</option>
                <option value="reviewer">🔍 Reviewer Admin (อนุมัติ/ปฏิเสธ KYC เท่านั้น)</option>
                <option value="support">🎧 Support Admin (อ่านข้อมูลอย่างเดียว Read-only)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmSetAdminRole}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>ยืนยันแต่งตั้ง</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
