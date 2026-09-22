import React, { useState, useEffect } from 'react';
import { WIN_IMAGES } from '../../data/imageRegistry';
import { 
  QrCode, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  Clock, 
  User, 
  Building2, 
  Store, 
  Bike, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  FileText,
  Smartphone,
  CreditCard,
  Wallet,
  X,
  Loader2,
  Check
} from 'lucide-react';
import { 
  getAllPaymentProfiles, 
  updatePaymentProfileStatus, 
  PaymentProfile, 
  PaymentProfileStatus 
} from '../../services/paymentProfileService';
import { AdminLevel } from '../../types/admin';
import { playTactileBlip, playLevelUpFanfare } from '../../utils/audio';

interface AdminPaymentProfilesViewProps {
  adminLevel?: AdminLevel;
}

export const AdminPaymentProfilesView: React.FC<AdminPaymentProfilesViewProps> = ({
  adminLevel = 'super'
}) => {
  const isSuperAdmin = adminLevel === 'super';
  const [profiles, setProfiles] = useState<PaymentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  const [selectedProfile, setSelectedProfile] = useState<PaymentProfile | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionNotes, setActionNotes] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const list = await getAllPaymentProfiles();
      setProfiles(list);
    } catch (err) {
      console.warn('Error fetching payment profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleUpdateStatus = async (status: PaymentProfileStatus) => {
    if (!selectedProfile) return;
    if (status === 'needs_correction' && !actionNotes.trim()) {
      alert('กรุณาระบุหมายเหตุหรือข้อความชี้แจงจุดที่ต้องแก้ไข');
      return;
    }

    setActionLoading(true);
    try {
      playTactileBlip(900);
      await updatePaymentProfileStatus(
        selectedProfile.userId,
        status,
        actionNotes.trim() || (status === 'verified' ? 'อนุมัติเรียบร้อยโดย Super Admin' : '')
      );

      // Update in local list
      setProfiles(prev => prev.map(p => {
        if (p.userId === selectedProfile.userId) {
          return {
            ...p,
            status,
            reviewNotes: actionNotes.trim(),
            reviewedAt: new Date().toISOString()
          };
        }
        return p;
      }));

      // Update selected profile view
      setSelectedProfile(prev => prev ? {
        ...prev,
        status,
        reviewNotes: actionNotes.trim(),
        reviewedAt: new Date().toISOString()
      } : null);

      if (status === 'verified') {
        playLevelUpFanfare();
        setToastMessage(`อนุมัติช่องทางรับเงินของ ${selectedProfile.accountName} สำเร็จ`);
      } else if (status === 'needs_correction') {
        setToastMessage(`ส่งกลับให้แก้ไขช่องทางรับเงินของ ${selectedProfile.accountName} แล้ว`);
      } else {
        setToastMessage(`ระงับช่องทางรับเงินของ ${selectedProfile.accountName} แล้ว`);
      }

      setActionNotes('');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err: any) {
      alert(err?.message || 'ทำรายการไม่สำเร็จ');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = profiles.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterRole !== 'all' && p.role !== filterRole) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.accountName.toLowerCase().includes(q) ||
        p.promptPayId.includes(q) ||
        p.userId.toLowerCase().includes(q) ||
        (p.bankName && p.bankName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = profiles.filter(p => p.status === 'pending_review').length;
  const verifiedCount = profiles.filter(p => p.status === 'verified').length;
  const correctionCount = profiles.filter(p => p.status === 'needs_correction').length;
  const suspendedCount = profiles.filter(p => p.status === 'suspended').length;

  const roleBadge = (role: string) => {
    switch (role) {
      case 'knight':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 text-[10px] font-mono"><img src={WIN_IMAGES.profiles.knight} alt="พี่วิน" className="w-3.5 h-3.5 rounded-full object-cover" /> พี่วิน</span>;
      case 'citizen':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono"><img src={WIN_IMAGES.profiles.citizen} alt="ลูกค้า" className="w-3.5 h-3.5 rounded-full object-cover" /> ลูกค้า</span>;
      case 'merchant':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono"><img src={WIN_IMAGES.profiles.merchant} alt="ร้านค้า" className="w-3.5 h-3.5 rounded-full object-cover" /> ร้านค้า</span>;
      case 'partner':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono"><img src={WIN_IMAGES.profiles.partner} alt="พาร์ทเนอร์" className="w-3.5 h-3.5 rounded-full object-cover" /> พาร์ทเนอร์</span>;
      default:
        return <span className="text-[10px] text-slate-400">{role}</span>;
    }
  };

  const statusBadge = (status: PaymentProfileStatus) => {
    switch (status) {
      case 'verified':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold"><CheckCircle2 className="w-3 h-3"/> ยืนยันแล้ว</span>;
      case 'needs_correction':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold"><AlertTriangle className="w-3 h-3"/> ต้องแก้ไข</span>;
      case 'suspended':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold"><Ban className="w-3 h-3"/> ระงับ</span>;
      case 'pending_review':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold animate-pulse"><Clock className="w-3 h-3"/> รอตรวจสอบ</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <img 
              src={WIN_IMAGES.cyber.coins} 
              alt="PromptPay & Bank QR" 
              className="w-10 h-10 rounded-2xl object-cover ring-1 ring-cyan-400/50 shadow-[0_0_20px_rgba(0,210,255,0.4)]" 
            />
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>ตรวจช่องทางรับเงิน (PromptPay & Bank QR)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  SUPER ADMIN
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                อนุมัติและควบคุมช่องทางรับเงินจริงของพี่วิน ลูกค้า ร้านค้า และพาร์ทเนอร์
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchProfiles}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-white/10 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-xs text-center shadow-2xl border border-white/30 animate-fade-in flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => setFilterStatus('all')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'all' ? 'bg-cyan-500/15 border-cyan-400' : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-[11px] text-slate-400">ทั้งหมด</div>
          <div className="text-xl font-black text-white font-mono mt-1">{profiles.length}</div>
        </div>

        <div 
          onClick={() => setFilterStatus('pending_review')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'pending_review' ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> รอตรวจสอบ
          </div>
          <div className="text-xl font-black text-amber-300 font-mono mt-1">{pendingCount}</div>
        </div>

        <div 
          onClick={() => setFilterStatus('verified')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'verified' ? 'bg-emerald-500/20 border-emerald-400' : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> ยืนยันแล้ว
          </div>
          <div className="text-xl font-black text-emerald-300 font-mono mt-1">{verifiedCount}</div>
        </div>

        <div 
          onClick={() => setFilterStatus('needs_correction')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'needs_correction' ? 'bg-orange-500/20 border-orange-400' : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-[11px] text-orange-300 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> ต้องแก้ไข
          </div>
          <div className="text-xl font-black text-orange-300 font-mono mt-1">{correctionCount}</div>
        </div>

        <div 
          onClick={() => setFilterStatus('suspended')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'suspended' ? 'bg-rose-500/20 border-rose-400' : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-[11px] text-rose-300 font-bold flex items-center gap-1">
            <Ban className="w-3 h-3" /> ระงับ
          </div>
          <div className="text-xl font-black text-rose-300 font-mono mt-1">{suspendedCount}</div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามชื่อบัญชี, หมายเลข PromptPay, ธนาคาร หรือ UID..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="all">ทุกบทบาท (Role)</option>
            <option value="knight">พี่วิน (Knight)</option>
            <option value="citizen">ลูกค้า (Citizen)</option>
            <option value="merchant">ร้านค้า (Merchant)</option>
            <option value="partner">พาร์ทเนอร์ (Partner)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="pending_review">รอตรวจสอบ</option>
            <option value="verified">ยืนยันแล้ว</option>
            <option value="needs_correction">ต้องแก้ไข</option>
            <option value="suspended">ระงับ</option>
          </select>
        </div>
      </div>

      {/* Table & List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
          <p className="text-xs">กำลังโหลดข้อมูลช่องทางรับเงิน...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl border border-white/10 bg-black/20 text-center space-y-2">
          <QrCode className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">ไม่พบรายการช่องทางรับเงินตามเงื่อนไขที่ค้นหา</p>
          <p className="text-xs text-slate-500">
            {searchQuery || filterStatus !== 'all' || filterRole !== 'all' ? 'ลองปรับตัวกรองหรือล้างคำค้นหา' : 'ยังไม่มีผู้ใช้ลงทะเบียนช่องทางรับเงิน'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((profile) => (
            <div
              key={profile.userId}
              onClick={() => {
                playTactileBlip(800);
                setSelectedProfile(profile);
                setActionNotes(profile.reviewNotes || '');
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                selectedProfile?.userId === profile.userId
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.25)]'
                  : 'bg-[#0A1428]/80 border-white/10 hover:border-cyan-400/50 hover:bg-[#0E1A33]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow">
                  {profile.qrCodeDataUrl ? (
                    <img src={profile.qrCodeDataUrl} alt="QR" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode className="w-6 h-6 text-slate-900" />
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white">{profile.accountName}</span>
                    {roleBadge(profile.role)}
                    {statusBadge(profile.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="text-cyan-300">PromptPay: <strong>{profile.promptPayId}</strong></span>
                    {profile.bankName && <span>• {profile.bankName}</span>}
                    {profile.bankSlipQrUrl && (
                      <span className="text-emerald-400 font-bold">• มีรูป QR จากธนาคาร</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                  {new Date(profile.updatedAt).toLocaleDateString('th-TH')}
                </span>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 text-xs font-bold transition-all"
                >
                  ตรวจสอบ &gt;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details & Review Modal */}
      {selectedProfile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProfile(null);
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0E1E38] via-[#081226] to-[#040814] border-2 border-cyan-400/60 p-5 sm:p-6 text-white shadow-[0_0_50px_rgba(0,210,255,0.3)] space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-400 text-slate-950 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">ตรวจสอบช่องทางรับเงิน</h3>
                  <p className="text-[11px] text-slate-400 font-mono">UID: {selectedProfile.userId}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfile(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Summary Cards */}
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="text-[10px] text-slate-400 font-mono">ข้อมูลผู้รับเงิน:</div>
                <div className="space-y-1">
                  <div>ชื่อบัญชี: <strong className="text-white text-sm">{selectedProfile.accountName}</strong></div>
                  <div>บทบาท: {roleBadge(selectedProfile.role)}</div>
                  <div>ธนาคาร: <span className="text-cyan-300">{selectedProfile.bankName || 'ไม่ระบุ'}</span></div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="text-[10px] text-slate-400 font-mono">ข้อมูล PromptPay:</div>
                <div className="space-y-1">
                  <div>หมายเลข: <strong className="text-cyan-300 text-sm font-mono">{selectedProfile.promptPayId}</strong></div>
                  <div>ประเภท: <span className="text-slate-300">{selectedProfile.receiverType}</span></div>
                  <div>สถานะ: {statusBadge(selectedProfile.status)}</div>
                </div>
              </div>
            </div>

            {/* QR Comparison: System Generated Real EMVCo vs Uploaded Bank QR */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* EMVCo QR */}
              <div className="p-4 rounded-2xl bg-black/50 border border-cyan-400/30 text-center space-y-2">
                <div className="text-xs font-bold text-cyan-300 flex items-center justify-center gap-1">
                  <QrCode className="w-4 h-4" />
                  <span>QR พร้อมเพย์มาตรฐาน EMVCo จริง</span>
                </div>
                <p className="text-[10px] text-slate-400">สร้างจากหมายเลข {selectedProfile.promptPayId}</p>
                {selectedProfile.qrCodeDataUrl ? (
                  <div className="p-2.5 rounded-2xl bg-white shadow-xl mx-auto w-44 h-44 flex items-center justify-center">
                    <img src={selectedProfile.qrCodeDataUrl} alt="Real PromptPay QR" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-44 h-44 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-xs text-slate-500 mx-auto">
                    ไม่มีรูป QR
                  </div>
                )}
                <div className="text-[9px] text-slate-400 font-mono">
                  สามารถทดลองสแกนด้วยแอปธนาคารจริงเพื่อตรวจชื่อผู้รับ
                </div>
              </div>

              {/* Uploaded Bank QR */}
              <div className="p-4 rounded-2xl bg-black/50 border border-amber-400/30 text-center space-y-2">
                <div className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1">
                  <Smartphone className="w-4 h-4" />
                  <span>รูป QR จากแอปธนาคารที่แนบมา</span>
                </div>
                <p className="text-[10px] text-slate-400">อัปโหลดโดยผู้ใช้โดยตรง</p>
                {selectedProfile.bankSlipQrUrl ? (
                  <div className="p-2.5 rounded-2xl bg-white shadow-xl mx-auto w-44 h-44 flex items-center justify-center">
                    <img src={selectedProfile.bankSlipQrUrl} alt="Bank App QR" className="w-full h-full object-contain rounded-lg" />
                  </div>
                ) : (
                  <div className="w-44 h-44 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-xs text-slate-500 mx-auto">
                    ผู้ใช้ไม่ได้แนบรูป QR ธนาคาร (ใช้ QR มาตรฐานด้านซ้าย)
                  </div>
                )}
                <div className="text-[9px] text-slate-400 font-mono">
                  {selectedProfile.bankSlipQrUrl ? 'ตรวจสอบความคมชัดและชื่อบัญชี' : '—'}
                </div>
              </div>
            </div>

            {/* Review Notes Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>บันทึกหรือหมายเหตุจาก Super Admin (จะแสดงให้ผู้ใช้เห็นเมื่อส่งกลับแก้ไข):</span>
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="เช่น ชื่อบัญชีไม่ตรงกับชื่อที่ลงทะเบียน หรือ รูป QR จากธนาคารไม่ชัดเจน..."
                rows={2}
                className="w-full rounded-xl border border-white/15 bg-slate-900/90 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Action Buttons for Super Admin */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus('verified')}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>✅ อนุมัติ (ยืนยันแล้ว - แสดง QR ได้จริง)</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus('needs_correction')}
                className="py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                <span>⚠️ ส่งกลับให้แก้ไข</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus('suspended')}
                className="py-3 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                <span>⛔ ระงับช่องทางนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
