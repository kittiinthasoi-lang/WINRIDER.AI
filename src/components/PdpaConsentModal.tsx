import React, { useState } from 'react';
import { ShieldCheck, Check, AlertCircle, FileText } from 'lucide-react';

interface PdpaConsentModalProps {
  isOpen: boolean;
  userName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const PdpaConsentModal: React.FC<PdpaConsentModalProps> = ({
  isOpen,
  userName,
  onAccept,
  onDecline
}) => {
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [agreedDataShare, setAgreedDataShare] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-thai">
      <div className="w-full max-w-md bg-[#0A1633] border border-[#00D4FF]/40 rounded-2xl p-5 shadow-[0_0_35px_rgba(0,212,255,0.25)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#00D4FF]/20">
          <div className="p-2 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">ความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)</h3>
            <p className="text-[11px] text-[#00D4FF]">WINRIDER.AI Data Privacy Sovereign Version 2.1</p>
          </div>
        </div>

        {/* Scrollable Terms Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs text-gray-300 pr-1 my-2">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <p className="font-semibold text-white">เรียนคุณ {userName || 'ผู้ใช้งาน'}</p>
            <p className="text-[11px] leading-relaxed text-gray-300">
              เพื่อความปลอดภัยในการเดินทาง การยืนยันตัวตนอัศวิน และการบริหารจัดการกองทุนสวัสดิการ 5 ถัง 
              WINRIDER.AI มีความจำเป็นต้องประมวลผลข้อมูลตำแหน่งพิกัด GPS, บัญชีผู้ใช้, 
              และประวัติภารกิจของท่านภายใต้มาตรฐานความปลอดภัยระดับสากล
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0A1633] border border-[#00D4FF]/20 cursor-pointer hover:border-[#00D4FF]/50 transition">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 accent-[#00D4FF] w-4 h-4 rounded"
              />
              <span className="text-[11px] leading-tight text-gray-200">
                ฉันได้อ่านและยอมรับข้อกำหนดการให้บริการ และนโยบายความเป็นส่วนตัวของ WINRIDER.AI
              </span>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0A1633] border border-[#00D4FF]/20 cursor-pointer hover:border-[#00D4FF]/50 transition">
              <input
                type="checkbox"
                checked={agreedDataShare}
                onChange={(e) => setAgreedDataShare(e.target.checked)}
                className="mt-0.5 accent-[#00D4FF] w-4 h-4 rounded"
              />
              <span className="text-[11px] leading-tight text-gray-200">
                ยินยอมให้ใช้ข้อมูลพิกัด GPS แบบเรียลไทม์เพื่อการนำทางและจัดสรรคิวงานอัศวิน
              </span>
            </label>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FFC93C]/10 border border-[#FFC93C]/30 flex items-start gap-2 text-[11px] text-amber-200">
            <AlertCircle className="w-4 h-4 text-[#FFC93C] shrink-0 mt-0.5" />
            <span>การยินยอมจะถูกบันทึกรหัส Timestamp และ Version อย่างโปร่งใสลงในระบบ Firestore</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/10 flex gap-2">
          <button
            onClick={onDecline}
            className="flex-1 py-2.5 px-3 rounded-xl border border-white/15 text-gray-400 text-xs font-semibold hover:bg-white/5 transition"
          >
            ปฏิเสธ
          </button>
          <button
            onClick={onAccept}
            disabled={!agreedTerms || !agreedDataShare}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              agreedTerms && agreedDataShare
                ? 'bg-[#00D4FF] text-[#0A1633] shadow-[0_0_15px_rgba(0,212,255,0.4)] hover:bg-[#38E1FF]'
                : 'bg-white/10 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>ยอมรับและดำเนินการต่อ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
