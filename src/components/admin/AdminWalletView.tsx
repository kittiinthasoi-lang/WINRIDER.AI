import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  HeartHandshake, 
  HardHat, 
  Shield, 
  Scale, 
  PlusCircle, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  FileText,
  Lock
} from 'lucide-react';
import { getSystemWalletBreakdown, adjustWallet } from '../../services/adminService';
import { SystemBucketsBreakdown, AdminLevel } from '../../types/admin';

interface AdminWalletViewProps {
  adminLevel: AdminLevel;
}

export const AdminWalletView: React.FC<AdminWalletViewProps> = ({ adminLevel }) => {
  const [breakdown, setBreakdown] = useState<SystemBucketsBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  // Manual Adjustment Form
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [targetUid, setTargetUid] = useState('');
  const [amountBaht, setAmountBaht] = useState<string>('50.00');
  const [selectedBucket, setSelectedBucket] = useState<'system' | 'insurance' | 'pension' | 'helmet' | 'equipment'>('system');
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchBreakdown = async () => {
    setLoading(true);
    try {
      const data = await getSystemWalletBreakdown();
      setBreakdown(data);
    } catch (err) {
      console.error('fetchBreakdown error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakdown();
  }, []);

  const formatBaht = (satang: number) => {
    return (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleConfirmAdjustment = async () => {
    if (!targetUid.trim()) {
      alert('กรุณาระบุ UID ของผู้ใช้');
      return;
    }
    const bahtNum = parseFloat(amountBaht);
    if (isNaN(bahtNum) || bahtNum <= 0) {
      alert('กรุณาระบุจำนวนเงินที่ถูกต้อง (มากกว่า 0)');
      return;
    }
    const amountSatang = Math.round(bahtNum * 100);
    if (!Number.isInteger(amountSatang) || amountSatang <= 0) {
      alert('จำนวนเงินสตางค์ต้องเป็นจำนวนเต็มบวก');
      return;
    }
    if (!adjustReason.trim()) {
      alert('กรุณาระบุเหตุผลในการปรับปรุงยอดเงิน');
      return;
    }

    setSubmittingAdjust(true);
    try {
      await adjustWallet(targetUid.trim(), amountSatang, selectedBucket, adjustReason.trim(), direction);
      setSuccessNotice(`ปรับยอดเงิน ${direction} ฿${bahtNum.toFixed(2)} ในถัง ${selectedBucket} สำเร็จและลงบัญชี Double-Entry เรียบร้อย`);
      setShowAdjustModal(false);
      setTargetUid('');
      setAdjustReason('');
      fetchBreakdown();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(`การปรับยอดล้มเหลว: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A1633] p-5 rounded-2xl border border-[#00D4FF]/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
              SOVEREIGN FINANCIAL ENGINE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              DOUBLE-ENTRY INVARIANT ENFORCED
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">
            ตรวจสอบระบบการเงิน 5 ถัง & Double-Entry Ledger
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            ตรวจสอบความโปร่งใสของเงินกองทุนทุกบาททุกสตางค์ การันตีสมดุลเดบิตเท่ากับเครดิต 100%
          </p>
        </div>

        <div className="flex items-center gap-2">
          {adminLevel === 'super' && (
            <button
              onClick={() => setShowAdjustModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold shadow-lg transition-all active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>ปรับเงินด้วยมือ (Super)</span>
            </button>
          )}

          <button
            onClick={fetchBreakdown}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรชยอด</span>
          </button>
        </div>
      </div>

      {/* Success Notice */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        </div>
      )}

      {/* Big Red Warning IF Ledger is Not Balanced */}
      {breakdown && !breakdown.isBalanced && (
        <div className="p-6 rounded-2xl bg-rose-950/90 border-2 border-rose-500 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.4)] animate-bounce">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-10 h-10 text-rose-400 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-black text-white font-mono">
                ⚠️ คำเตือนความไม่สมดุลของบัญชีแยกประเภท (DOUBLE-ENTRY VIOLATION)
              </h2>
              <p className="text-xs text-rose-200 mt-1 font-mono">
                ผลรวมยอดเดบิต (Debit: {formatBaht(breakdown.totalDebitSatang)} บาท) ไม่เท่ากับ ผลรวมยอดเครดิต (Credit: {formatBaht(breakdown.totalCreditSatang)} บาท)
              </p>
              <p className="text-xs text-rose-300 mt-1">
                กรุณาระงับการโอนเงินชั่วคราวและตรวจสอบ Audit Log ทันที เพื่อค้นหา Transaction ที่ผิดปกติ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balanced Confirmation Badge */}
      {breakdown && breakdown.isBalanced && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2.5 font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>สมดุลสมบูรณ์: ยอดรวมเดบิต ฿{formatBaht(breakdown.totalDebitSatang)} = ยอดรวมเครดิต ฿{formatBaht(breakdown.totalCreditSatang)} (ผลต่าง 0 สตางค์)</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
            MATHEMATICALLY BALANCED
          </span>
        </div>
      )}

      {/* 5 Sovereign Fund Buckets Display */}
      {breakdown && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. System Bucket */}
          <div className="bg-[#0A1633] p-5 rounded-2xl border border-[#00D4FF]/40 hover:border-[#00D4FF] transition-all relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#00D4FF]">1. ถังค่าระบบ (System)</span>
              <img 
                src="/images/admin/wallet-ledger.svg" 
                alt="System Bucket" 
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-[#00D4FF]/40 shadow-sm" 
              />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-white font-mono">
                ฿{formatBaht(breakdown.system)}
              </div>
              <span className="text-[11px] text-slate-400 font-mono block mt-1">
                ({breakdown.system.toLocaleString()} สตางค์)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800">
              ค่าบำรุงระบบ 1 บาท/เที่ยว หรือตามบันได เพื่อเซิร์ฟเวอร์และ AI Capillary
            </p>
          </div>

          {/* 2. Insurance Bucket */}
          <div className="bg-[#0A1633] p-5 rounded-2xl border border-emerald-500/40 hover:border-emerald-500 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">2. ถังคุ้มครองอุบัติเหตุ (Insurance)</span>
              <img 
                src="/images/ambulance_vehicle.jpg" 
                alt="Insurance Bucket" 
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-emerald-500/40 shadow-sm" 
              />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-white font-mono">
                ฿{formatBaht(breakdown.insurance)}
              </div>
              <span className="text-[11px] text-slate-400 font-mono block mt-1">
                ({breakdown.insurance.toLocaleString()} สตางค์)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800">
              กองทุนคุ้มครองอุบัติเหตุฉุกเฉิน 1 บาท/เที่ยว เคลมสินไหมรวดเร็ว
            </p>
          </div>

          {/* 3. Pension Bucket */}
          <div className="bg-[#0A1633] p-5 rounded-2xl border border-[#FFC93C]/40 hover:border-[#FFC93C] transition-all relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#FFC93C]">3. ถังบำนาญอัศวิน (Pension)</span>
              <img 
                src="/images/admin/wallet-ledger.svg" 
                alt="Pension Bucket" 
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-[#FFC93C]/50 shadow-sm" 
              />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-[#FFC93C] font-mono">
                ฿{formatBaht(breakdown.pension)}
              </div>
              <span className="text-[11px] text-slate-400 font-mono block mt-1">
                ({breakdown.pension.toLocaleString()} สตางค์)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800">
              กองทุนสะสมบำนาญอัศวินผู้ร่วมสร้างเครือข่ายอธิปไตย
            </p>
          </div>

          {/* 4. Helmet Deposit Bucket */}
          <div className="bg-[#0A1633] p-5 rounded-2xl border border-indigo-500/40 hover:border-indigo-500 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-300">4. ถังมัดจำหมวกนิรภัย (Helmet)</span>
              <img 
                src="/images/cyber_armor.jpg" 
                alt="Helmet Bucket" 
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-indigo-400/50 shadow-sm" 
              />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-white font-mono">
                ฿{formatBaht(breakdown.helmet)}
              </div>
              <span className="text-[11px] text-slate-400 font-mono block mt-1">
                ({breakdown.helmet.toLocaleString()} สตางค์)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800">
              เงินมัดจำหมวกนิรภัยมาตรฐานสากล คืนเงินเมื่อส่งมอบอุปกรณ์ครบ
            </p>
          </div>

          {/* 5. Equipment Bucket */}
          <div className="bg-[#0A1633] p-5 rounded-2xl border border-purple-500/40 hover:border-purple-500 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-300">5. ถังอุปกรณ์ & เสื้อเกราะ (Equipment)</span>
              <img 
                src="/images/shop_armor_kneeguards.jpg" 
                alt="Equipment Bucket" 
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-purple-400/50 shadow-sm" 
              />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-white font-mono">
                ฿{formatBaht(breakdown.equipment)}
              </div>
              <span className="text-[11px] text-slate-400 font-mono block mt-1">
                ({breakdown.equipment.toLocaleString()} สตางค์)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800">
              กองทุนเสื้อเกราะ 70 เลเวล, ป้ายไฟแม่เหล็ก และกล่องอัจฉริยะ
            </p>
          </div>

          {/* Grand Total All Buckets */}
          <div className="bg-gradient-to-br from-[#0A1633] to-slate-900 p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white">ยอดรวมทั้ง 5 กองทุน</span>
                <Scale className="w-5 h-5 text-[#FFC93C]" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  ฿{formatBaht(
                    breakdown.system +
                    breakdown.insurance +
                    breakdown.pension +
                    breakdown.helmet +
                    breakdown.equipment
                  )}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-3 pt-3 border-t border-slate-800">
              อัปเดตล่าสุด: {breakdown.lastCalculatedAt || new Date().toLocaleTimeString('th-TH')}
            </div>
          </div>
        </div>
      )}

      {/* Manual Wallet Adjustment Modal (Strict Integer Satang + Double-Entry) */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0A1633] border border-[#00D4FF]/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-[#00D4FF]">
                <PlusCircle className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white font-sans">
                  ฟอร์มปรับยอดเงินด้วยมือ (Manual Ledger Adjustment)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                SUPER ADMIN ONLY
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
              ⚠️ การปรับยอดจะสร้าง Double-Entry Ledger Transaction เสมอ (เดบิตคู่เครดิต) และบันทึกลง Audit Log ทันที
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">UID ผู้ใช้งานเป้าหมาย <span className="text-rose-400">*</span>:</label>
                <input
                  type="text"
                  placeholder="เช่น knight_001 หรือ citizen_002"
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-[#00D4FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">ทิศทางการปรับเงิน:</label>
                  <select
                    value={direction}
                    onChange={(e: any) => setDirection(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-[#00D4FF] focus:outline-none"
                  >
                    <option value="CREDIT">🟢 CREDIT (+ เพิ่มเงินให้ผู้ใช้)</option>
                    <option value="DEBIT">🔴 DEBIT (- หักเงินจากผู้ใช้)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">จำนวนเงิน (บาท):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amountBaht}
                    onChange={(e) => setAmountBaht(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-[#00D4FF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">กองทุนที่เกี่ยวข้อง (ถังเงิน):</label>
                <select
                  value={selectedBucket}
                  onChange={(e: any) => setSelectedBucket(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-[#00D4FF] focus:outline-none"
                >
                  <option value="system">ถังค่าระบบ (System)</option>
                  <option value="insurance">ถังคุ้มครองอุบัติเหตุ (Insurance)</option>
                  <option value="pension">ถังบำนาญอัศวิน (Pension)</option>
                  <option value="helmet">ถังมัดจำหมวกนิรภัย (Helmet)</option>
                  <option value="equipment">ถังอุปกรณ์ & เสื้อเกราะ (Equipment)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-sans">
                  เหตุผลในการปรับปรุงยอดเงิน <span className="text-rose-400">* บังคับ</span>:
                </label>
                <textarea
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="เช่น ชดเชยค่าทริปเนื่องจากระบบขัดข้อง หรือ ปรับยอดส่วนลด..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 font-sans focus:border-[#00D4FF] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjustment}
                disabled={submittingAdjust || !targetUid.trim() || !adjustReason.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-lg"
              >
                {submittingAdjust && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>ยืนยันบันทึก Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
