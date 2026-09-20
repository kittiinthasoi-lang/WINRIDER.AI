import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Coins, 
  AlertCircle, 
  RefreshCw, 
  Loader2, 
  X,
  History
} from 'lucide-react';
import { getActiveFeeRules, updateFeeRule } from '../../services/adminService';
import { FeeRule, AdminLevel } from '../../types/admin';

interface AdminFeeRulesViewProps {
  adminLevel: AdminLevel;
}

export const AdminFeeRulesView: React.FC<AdminFeeRulesViewProps> = ({ adminLevel }) => {
  const [feeRules, setFeeRules] = useState<FeeRule[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Edit Rule Modal
  const [editingRule, setEditingRule] = useState<FeeRule | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSystemSatang, setEditSystemSatang] = useState(100);
  const [editInsuranceSatang, setEditInsuranceSatang] = useState(100);
  const [editReason, setEditReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const list = await getActiveFeeRules();
      setFeeRules(list);
    } catch (err) {
      console.error('fetchRules error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenEdit = (rule: FeeRule) => {
    if (adminLevel === 'support') {
      alert('สิทธิ์ระดับ Support ไม่สามารถแก้ไขกฎค่าธรรมเนียมได้');
      return;
    }
    setEditingRule(rule);
    setEditTitle(rule.titleTh);
    setEditSystemSatang(rule.systemSatang);
    setEditInsuranceSatang(rule.insuranceSatang);
    setEditReason('');
  };

  const handleConfirmUpdate = async () => {
    if (!editingRule) return;
    if (!editReason.trim()) {
      alert('กรุณาระบุเหตุผลในการปรับปรุงกฎค่าธรรมเนียม');
      return;
    }

    setSubmitting(true);
    try {
      await updateFeeRule(
        editingRule.id,
        {
          titleTh: editTitle,
          systemSatang: Number(editSystemSatang),
          insuranceSatang: Number(editInsuranceSatang)
        },
        editReason.trim()
      );
      setSuccessMessage(`ปรับปรุงกฎและสร้างเวอร์ชันใหม่สำเร็จ (เก็บประวัติกฎเดิมเรียบร้อย)`);
      setEditingRule(null);
      fetchRules();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(`การปรับปรุงกฎล้มเหลว: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A1633] p-5 rounded-2xl border border-[#00D4FF]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <img 
            src="/images/armor_circuit.jpg" 
            alt="Fee Rules" 
            className="w-11 h-11 rounded-2xl object-cover ring-1 ring-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                FEE RULES MATRIX
              </span>
              <span className="text-xs text-slate-400 font-mono">
                IMMUTABLE SUPERSEDE PATTERN
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              กฎค่าธรรมเนียมบันไดอัศวิน & GP
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              อัตราค่าธรรมเนียมยุติธรรม 2 บาท (ระบบ 1 บ. + กองทุนคุ้มครอง 1 บ.) และบันไดกิโลเมตร
            </p>
          </div>
        </div>

        <button
          onClick={fetchRules}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชกฎ</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Notice about Immutability */}
      <div className="p-4 rounded-xl bg-[#0A1633] border border-amber-500/30 text-xs text-slate-300 flex items-start gap-3">
        <History className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-300 font-mono">มาตรฐานความปลอดภัยกฎหมายการเงิน:</strong>
          <span className="block mt-0.5">
            ห้ามลบกฎเดิมในฐานข้อมูล เมื่อมีการแก้ไข ระบบจะทำการปิดกฎเดิมด้วย <code>activeTo</code> และสร้างกฎใหม่พร้อม <code>supersedesRuleId</code> เสมอ เพื่อให้การตรวจสอบย้อนหลังทางบัญชีถูกต้อง 100%
          </span>
        </div>
      </div>

      {/* Fee Rules Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feeRules.map((rule) => {
          const totalFeeBaht = (rule.systemSatang + rule.insuranceSatang) / 100;
          return (
            <div 
              key={rule.id}
              className="bg-[#0A1633] p-5 rounded-2xl border border-slate-800 hover:border-[#00D4FF]/50 transition-all space-y-4 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <h2 className="text-sm font-bold text-white font-sans">{rule.titleTh}</h2>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                    {rule.id}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">ค่าบำรุงระบบ (System)</span>
                    <span className="text-sm font-bold text-[#00D4FF]">
                      ฿{(rule.systemSatang / 100).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">({rule.systemSatang} สตางค์)</span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">กองทุนคุ้มครอง (Insurance)</span>
                    <span className="text-sm font-bold text-emerald-400">
                      ฿{(rule.insuranceSatang / 100).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">({rule.insuranceSatang} สตางค์)</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono pt-2">
                  <span>ช่วงระยะค่าโดยสาร: {rule.minFareBaht} - {rule.maxFareBaht === 99999 ? 'ไม่จำกัด' : `${rule.maxFareBaht} บ.`}</span>
                  <span className="font-bold text-white">รวมหัก: ฿{totalFeeBaht.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  บังคับใช้ตั้งแต่: {new Date(rule.activeFrom).toLocaleDateString('th-TH')}
                </span>
                <button
                  onClick={() => handleOpenEdit(rule)}
                  disabled={adminLevel === 'support'}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-[#00D4FF]/20 text-[#00D4FF] border border-slate-700 hover:border-[#00D4FF]/40 font-mono font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>ปรับปรุงกฎ</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0A1633] border border-[#00D4FF]/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#00D4FF]" />
                <span>ปรับปรุงกฎค่าธรรมเนียม ({editingRule.id})</span>
              </h3>
              <button onClick={() => setEditingRule(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1 font-sans">ชื่อกฎ:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans focus:border-[#00D4FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-sans">ค่าระบบ (สตางค์):</label>
                  <input
                    type="number"
                    value={editSystemSatang}
                    onChange={(e) => setEditSystemSatang(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-[#00D4FF] focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">
                    = ฿{(editSystemSatang / 100).toFixed(2)} บาท
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-sans">คุ้มครอง (สตางค์):</label>
                  <input
                    type="number"
                    value={editInsuranceSatang}
                    onChange={(e) => setEditInsuranceSatang(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-[#00D4FF] focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">
                    = ฿{(editInsuranceSatang / 100).toFixed(2)} บาท
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-sans">
                  เหตุผลในการปรับปรุงกฎ <span className="text-rose-400">* บังคับ</span>:
                </label>
                <textarea
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="เช่น มติคณะกรรมการอธิปไตยปรับลดค่าบริการเพื่อส่งเสริมไรเดอร์..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 font-sans focus:border-[#00D4FF] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-sans"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdate}
                disabled={submitting || !editReason.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-lg font-sans"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>บันทึกและสร้างกฎใหม่</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
