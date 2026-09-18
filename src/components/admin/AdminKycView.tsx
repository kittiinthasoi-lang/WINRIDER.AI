import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Clock, 
  User, 
  Phone, 
  Bike, 
  Store, 
  MapPin, 
  AlertCircle, 
  ZoomIn, 
  X, 
  RefreshCw,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { getPendingKycList, approveKyc, rejectKyc } from '../../services/adminService';
import { AdminKycCandidate, AdminLevel } from '../../types/admin';

interface AdminKycViewProps {
  adminLevel: AdminLevel;
}

export const AdminKycView: React.FC<AdminKycViewProps> = ({ adminLevel }) => {
  const [candidates, setCandidates] = useState<AdminKycCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<AdminKycCandidate | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  
  // Reject Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>('รูปไม่ชัด');
  const [rejectDetail, setRejectDetail] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchKycQueue = async () => {
    setLoading(true);
    try {
      const list = await getPendingKycList();
      setCandidates(list);
      if (list.length > 0 && !selectedCandidate) {
        setSelectedCandidate(list[0]);
      } else if (list.length === 0) {
        setSelectedCandidate(null);
      }
    } catch (err) {
      console.error('fetchKycQueue error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycQueue();
  }, []);

  const handleApprove = async () => {
    if (!selectedCandidate) return;
    if (adminLevel === 'support') {
      alert('สิทธิ์ระดับ Support เป็นแบบอ่านอย่างเดียว (Read-only) ไม่สามารถอนุมัติได้');
      return;
    }

    if (!window.confirm(`ยืนยันการอนุมัติเอกสาร KYC ของ "${selectedCandidate.displayName}" ใช่หรือไม่?`)) {
      return;
    }

    setSubmittingAction(true);
    try {
      await approveKyc(selectedCandidate.uid, 'ตรวจสอบเอกสารผ่านเกณฑ์มาตรฐานความปลอดภัยอธิปไตย');
      setActionSuccessMessage(`อนุมัติ KYC ของคุณ "${selectedCandidate.displayName}" สำเร็จแล้ว`);
      
      // นำออกจากคิว
      setCandidates(prev => prev.filter(c => c.uid !== selectedCandidate.uid));
      const remaining = candidates.filter(c => c.uid !== selectedCandidate.uid);
      setSelectedCandidate(remaining.length > 0 ? remaining[0] : null);
      
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`การอนุมัติล้มเหลว: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenRejectDialog = () => {
    if (adminLevel === 'support') {
      alert('สิทธิ์ระดับ Support เป็นแบบอ่านอย่างเดียว (Read-only) ไม่สามารถปฏิเสธได้');
      return;
    }
    setRejectReason('รูปไม่ชัด');
    setRejectDetail('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedCandidate) return;
    if (!rejectDetail.trim()) {
      alert('กรุณาระบุรายละเอียดเหตุผลการปฏิเสธ เพื่อแจ้งให้ผู้สมัครแก้ไขได้ถูกต้อง');
      return;
    }

    setSubmittingAction(true);
    try {
      await rejectKyc(selectedCandidate.uid, rejectReason, rejectDetail.trim());
      setActionSuccessMessage(`ปฏิเสธ KYC ของคุณ "${selectedCandidate.displayName}" เรียบร้อยแล้ว`);
      setShowRejectModal(false);

      // นำออกจากคิว
      setCandidates(prev => prev.filter(c => c.uid !== selectedCandidate.uid));
      const remaining = candidates.filter(c => c.uid !== selectedCandidate.uid);
      setSelectedCandidate(remaining.length > 0 ? remaining[0] : null);

      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`การปฏิเสธล้มเหลว: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A1633] p-5 rounded-2xl border border-[#00D4FF]/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFC93C]/15 border border-[#FFC93C]/40 text-[#FFC93C] text-xs font-mono font-bold">
              VERIFICATION DISPATCH
            </span>
            <span className="text-xs text-slate-400 font-mono">
              คิวรอตรวจสอบ: <strong className="text-white font-mono">{candidates.length}</strong> รายการ
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
            ตรวจสอบและอนุมัติเอกสาร KYC
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            พิจารณาตามลำดับวันสมัครเก่าสุดก่อน (FIFO) เพื่อความโปร่งใสและรวดเร็ว
          </p>
        </div>

        <button
          onClick={fetchKycQueue}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชคิว</span>
        </button>
      </div>

      {/* Success Banner */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Candidates Table (5 cols on large screens) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-[#0A1633] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300">
                รายชื่อรอตรวจสอบ (เก่าสุดก่อน)
              </span>
              <span className="text-[11px] font-mono text-[#00D4FF]">
                {candidates.length} ค้างตรวจ
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#00D4FF] mb-2" />
                กำลังโหลดรายการผู้สมัคร...
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-mono text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                ไม่มีคิว KYC ค้างตรวจในขณะนี้ ระบบเรียบร้อยดี
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 max-h-[650px] overflow-y-auto scrollbar-thin">
                {candidates.map((cand, idx) => {
                  const isSelected = selectedCandidate?.uid === cand.uid;
                  return (
                    <div
                      key={cand.uid}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`p-4 transition-all cursor-pointer flex items-start gap-3 hover:bg-slate-800/40 ${
                        isSelected 
                          ? 'bg-[#00D4FF]/10 border-l-4 border-l-[#00D4FF]' 
                          : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-400 flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h2 className="text-sm font-bold text-white truncate font-sans">
                            {cand.displayName}
                          </h2>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex-shrink-0 ${
                            cand.role === 'knight'
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                          }`}>
                            {cand.role === 'knight' ? '🏍️ อัศวิน' : '🏪 ร้านค้า'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{cand.phone || 'ไม่ระบุเบอร์'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>สมัครเมื่อ: {cand.registeredAtFormatted || 'ไม่ระบุ'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Candidate Details & Documents Drawer (7 cols) */}
        <div className="lg:col-span-7">
          {selectedCandidate ? (
            <div className="bg-[#0A1633] rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
              {/* Candidate Quick Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800 border-2 border-[#00D4FF]/30 flex-shrink-0 relative">
                    <img 
                      src={selectedCandidate.documents?.portraitPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80'} 
                      alt={selectedCandidate.displayName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white">{selectedCandidate.displayName}</h2>
                      <span className="px-2 py-0.5 rounded bg-[#FFC93C]/20 border border-[#FFC93C]/40 text-[#FFC93C] text-[10px] font-mono font-bold">
                        PENDING REVIEW
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1 flex flex-wrap items-center gap-3">
                      <span>UID: <strong className="text-slate-300">{selectedCandidate.uid}</strong></span>
                      <span>เบอร์โทร: <strong className="text-cyan-300">{selectedCandidate.phone}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Role badge */}
                <div className="text-right">
                  <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200">
                    {selectedCandidate.role === 'knight' ? '🏍️ หมวดอัศวินไรเดอร์' : '🏪 หมวดร้านค้าพันธมิตร'}
                  </span>
                </div>
              </div>

              {/* Verified Information Grid */}
              <div>
                <h3 className="text-xs font-mono font-bold text-[#00D4FF] mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>ข้อมูลระบุตัวตนและยานพาหนะ</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-400 block text-[11px]">เลขประจำตัวประชาชน:</span>
                    <span className="text-white font-bold">{selectedCandidate.idCardNumber || '1-1004-99823-11-2'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">เลขที่ใบอนุญาตขับขี่:</span>
                    <span className="text-white font-bold">{selectedCandidate.licenseNumber || 'DL-55241098'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">ป้ายทะเบียนรถ:</span>
                    <span className="text-[#FFC93C] font-bold">{selectedCandidate.plateNumber || '1กข-9999 กทม.'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">รุ่นรถ / ประเภทยานพาหนะ:</span>
                    <span className="text-white font-bold">{selectedCandidate.vehicleModel || 'Honda Wave 125i (2024)'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">พื้นที่ปฏิบัติการ / ที่อยู่:</span>
                    <span className="text-slate-200">{selectedCandidate.district || 'คลองเตย'}, {selectedCandidate.province || 'กรุงเทพมหานคร'}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Showcase (Zoomable on click) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono font-bold text-[#00D4FF] flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>เอกสารหลักฐานแนบ (คลิกเพื่อขยายดูภาพชัดเจน)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">4 เอกสาร</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* 1. บัตรประชาชน */}
                  <div 
                    onClick={() => setZoomImageUrl(selectedCandidate.documents?.idCardUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80')}
                    className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer aspect-video sm:aspect-square flex flex-col justify-end p-2 hover:border-[#00D4FF] transition-all"
                  >
                    <img 
                      src={selectedCandidate.documents?.idCardUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80'} 
                      alt="บัตรประชาชน"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform opacity-80 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 bg-black/75 backdrop-blur-sm p-1.5 rounded-lg text-center">
                      <span className="text-[10px] font-bold text-white block truncate">บัตรประชาชน</span>
                      <span className="text-[9px] text-[#00D4FF] flex items-center justify-center gap-0.5 mt-0.5">
                        <ZoomIn className="w-2.5 h-2.5" /> ซูมตรวจ
                      </span>
                    </div>
                  </div>

                  {/* 2. ใบขับขี่ */}
                  <div 
                    onClick={() => setZoomImageUrl(selectedCandidate.documents?.driverLicenseUrl || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&auto=format&fit=crop&q=80')}
                    className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer aspect-video sm:aspect-square flex flex-col justify-end p-2 hover:border-[#00D4FF] transition-all"
                  >
                    <img 
                      src={selectedCandidate.documents?.driverLicenseUrl || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80'} 
                      alt="ใบขับขี่"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform opacity-80 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 bg-black/75 backdrop-blur-sm p-1.5 rounded-lg text-center">
                      <span className="text-[10px] font-bold text-white block truncate">ใบอนุญาตขับขี่</span>
                      <span className="text-[9px] text-[#00D4FF] flex items-center justify-center gap-0.5 mt-0.5">
                        <ZoomIn className="w-2.5 h-2.5" /> ซูมตรวจ
                      </span>
                    </div>
                  </div>

                  {/* 3. รูปถ่ายรถ / ป้ายทะเบียน */}
                  <div 
                    onClick={() => setZoomImageUrl(selectedCandidate.documents?.vehiclePhotoUrl || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&auto=format&fit=crop&q=80')}
                    className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer aspect-video sm:aspect-square flex flex-col justify-end p-2 hover:border-[#00D4FF] transition-all"
                  >
                    <img 
                      src={selectedCandidate.documents?.vehiclePhotoUrl || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80'} 
                      alt="รูปรถและทะเบียน"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform opacity-80 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 bg-black/75 backdrop-blur-sm p-1.5 rounded-lg text-center">
                      <span className="text-[10px] font-bold text-white block truncate">รถ & ป้ายทะเบียน</span>
                      <span className="text-[9px] text-[#00D4FF] flex items-center justify-center gap-0.5 mt-0.5">
                        <ZoomIn className="w-2.5 h-2.5" /> ซูมตรวจ
                      </span>
                    </div>
                  </div>

                  {/* 4. รูปหน้าตรง */}
                  <div 
                    onClick={() => setZoomImageUrl(selectedCandidate.documents?.portraitPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80')}
                    className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer aspect-video sm:aspect-square flex flex-col justify-end p-2 hover:border-[#00D4FF] transition-all"
                  >
                    <img 
                      src={selectedCandidate.documents?.portraitPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'} 
                      alt="รูปถ่ายหน้าตรง"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform opacity-80 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 bg-black/75 backdrop-blur-sm p-1.5 rounded-lg text-center">
                      <span className="text-[10px] font-bold text-white block truncate">รูปหน้าตรง</span>
                      <span className="text-[9px] text-[#00D4FF] flex items-center justify-center gap-0.5 mt-0.5">
                        <ZoomIn className="w-2.5 h-2.5" /> ซูมตรวจ
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Approve (Green) & Reject (Red) */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={handleOpenRejectDialog}
                  disabled={submittingAction || adminLevel === 'support'}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/50 text-rose-300 hover:text-rose-200 text-sm font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>ปฏิเสธเอกสาร</span>
                </button>

                <button
                  onClick={handleApprove}
                  disabled={submittingAction || adminLevel === 'support'}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {submittingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  <span>อนุมัติ KYC ทันที</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#0A1633] rounded-2xl border border-slate-800 p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center min-h-[400px]">
              <User className="w-10 h-10 text-slate-600 mb-3" />
              <span>เลือกผู้สมัครจากรายการทางด้านซ้ายเพื่อดูรายละเอียดและเอกสาร</span>
            </div>
          )}
        </div>
      </div>

      {/* Document Fullscreen Zoom Modal */}
      {zoomImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-white">
            <span className="text-xs font-mono font-bold text-[#00D4FF]">
              เอกสารตรวจสอบความคมชัดและรายละเอียด
            </span>
            <button
              onClick={() => setZoomImageUrl(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-4xl max-h-[85vh] overflow-auto rounded-2xl border border-[#00D4FF]/30 bg-black flex items-center justify-center shadow-2xl">
            <img 
              src={zoomImageUrl} 
              alt="Zoomed Document"
              className="max-h-[80vh] w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Reject KYC Mandatory Reason Dialog */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0A1633] border border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white font-sans">
                ปฏิเสธการยืนยันตัวตน KYC
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              กรุณาระบุเหตุผลและคำอธิบายอย่างชัดเจน เพื่อส่งแจ้งเตือนให้ผู้สมัครแก้ไขได้อย่างถูกต้อง
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  หัวข้อเหตุผล (เลือกหนึ่งข้อ):
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="รูปไม่ชัด">รูปไม่ชัด (แสงสะท้อน มัว ไม่เห็นตัวอักษร)</option>
                  <option value="เอกสารหมดอายุ">เอกสารหมดอายุ (บัตร ปชช. หรือ ใบขับขี่ขาดอายุ)</option>
                  <option value="ข้อมูลไม่ตรง">ข้อมูลไม่ตรง (ชื่อ หรือ เลข ปชช. ไม่ตรงกับเอกสาร)</option>
                  <option value="อื่นๆ">อื่นๆ (ระบุในช่องรายละเอียด)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  รายละเอียดเหตุผล <span className="text-rose-400">* บังคับ</span>:
                </label>
                <textarea
                  rows={3}
                  value={rejectDetail}
                  onChange={(e) => setRejectDetail(e.target.value)}
                  placeholder="เช่น ถ่ายภาพบัตรประชาชนใหม่โดยนำพลาสติกหุ้มออก และถ่ายในที่สว่าง..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={submittingAction || !rejectDetail.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-lg"
              >
                {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>ยืนยันปฏิเสธ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
