import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImageUp, Loader2, QrCode, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import {
  getMyPaymentProfile,
  PaymentReceiverProfile,
  saveMyPaymentProfile,
} from '../services/paymentProfileService';

const roleText = { citizen: 'ลูกค้า', knight: 'พี่วิน', merchant: 'ร้านค้า', partner: 'พาร์ทเนอร์' } as const;
const statusText: Record<string, { label: string; style: string }> = {
  not_configured: { label: 'ยังไม่ตั้งค่า', style: 'border-slate-500/30 bg-slate-500/10 text-slate-300' },
  pending: { label: 'รอ Super Admin ตรวจสอบ', style: 'border-amber-400/40 bg-amber-500/10 text-amber-300' },
  verified: { label: 'ยืนยันแล้ว • พร้อมรับเงิน', style: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' },
  rejected: { label: 'ต้องแก้ไขข้อมูล', style: 'border-red-400/40 bg-red-500/10 text-red-300' },
  suspended: { label: 'ระงับการรับเงิน', style: 'border-red-400/40 bg-red-500/10 text-red-300' },
};

export const PaymentReceiverSettingsPanel: React.FC = () => {
  const { userData } = useAuth();
  const [profile, setProfile] = useState<PaymentReceiverProfile | null>(null);
  const [receiverType, setReceiverType] = useState<'individual' | 'business'>('individual');
  const [accountName, setAccountName] = useState('');
  const [promptPayType, setPromptPayType] = useState<PaymentReceiverProfile['promptPayType']>('mobile');
  const [promptPayId, setPromptPayId] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const role = userData?.role || 'citizen';
  const status = statusText[profile?.verificationStatus || 'not_configured'];
  const generatedQrTarget = useMemo(() => promptPayId.replace(/\D/g, ''), [promptPayId]);

  useEffect(() => {
    getMyPaymentProfile().then((saved) => {
      setProfile(saved);
      if (saved) {
        setReceiverType(saved.receiverType);
        setAccountName(saved.accountName);
        setPromptPayType(saved.promptPayType);
        setPromptPayId(saved.promptPayId);
        setPreview(saved.qrImageUrl || '');
        setConsentAccepted(saved.consentAccepted);
      }
    }).catch((error) => setMessage(error instanceof Error ? error.message : 'โหลดข้อมูลรับเงินไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (qrFile) {
      const url = URL.createObjectURL(qrFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (!generatedQrTarget) return;
    generatePromptPayQRDataUrl(generatedQrTarget).then(setPreview).catch(() => undefined);
  }, [qrFile, generatedQrTarget]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await saveMyPaymentProfile({ role, receiverType, accountName, promptPayType, promptPayId, consentAccepted, qrFile });
      const saved = await getMyPaymentProfile();
      setProfile(saved);
      setMessage('บันทึกแล้ว ส่งให้ Super Admin ตรวจสอบเรียบร้อย');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />กำลังโหลดข้อมูลรับเงิน...</div>;

  return <form onSubmit={save} className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div><h3 className="font-black text-white">QR รับเงินจริงของ{roleText[role]}</h3><p className="mt-1 text-xs text-slate-400">ใช้รับค่าโดยสาร ค่าสินค้า หรือค่าบริการตามบทบาทบัญชีนี้</p></div>
      <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${status.style}`}>{status.label}</span>
    </div>

    {profile?.rejectionReason && <div className="flex gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200"><AlertTriangle className="h-4 w-4 shrink-0" />{profile.rejectionReason}</div>}

    <div className="grid gap-4 md:grid-cols-[1fr_220px]">
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-300">ประเภทผู้รับเงิน
          <select value={receiverType} onChange={(e) => setReceiverType(e.target.value as typeof receiverType)} className="mt-1 w-full rounded-xl border border-white/15 bg-[#071126] p-3 text-white">
            <option value="individual">บุคคล</option><option value="business">ร้านค้า/องค์กร/บริษัท</option>
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-300">ชื่อบัญชีผู้รับเงิน
          <input required value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="ต้องตรงกับชื่อที่ธนาคารแสดง" className="mt-1 w-full rounded-xl border border-white/15 bg-[#071126] p-3 text-white" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-300">ประเภท PromptPay
            <select value={promptPayType} onChange={(e) => setPromptPayType(e.target.value as typeof promptPayType)} className="mt-1 w-full rounded-xl border border-white/15 bg-[#071126] p-3 text-white">
              <option value="mobile">เบอร์โทรศัพท์</option><option value="national_id">เลขบัตรประชาชน</option><option value="tax_id">เลขผู้เสียภาษี</option><option value="e_wallet">e-Wallet ID</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-300">หมายเลข PromptPay
            <input required inputMode="numeric" value={promptPayId} onChange={(e) => setPromptPayId(e.target.value)} placeholder={promptPayType === 'mobile' ? '08XXXXXXXX' : 'กรอกตัวเลขเท่านั้น'} className="mt-1 w-full rounded-xl border border-white/15 bg-[#071126] p-3 text-white" />
          </label>
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/40 bg-cyan-500/5 p-3 text-xs font-bold text-cyan-300">
          <ImageUp className="h-4 w-4" />อัปโหลด QR จากแอปธนาคาร (ไม่บังคับ)
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setQrFile(e.target.files?.[0] || null)} />
        </label>
      </div>
      <div className="rounded-2xl border border-cyan-400/30 bg-white p-3 text-center text-slate-900">
        {preview ? <img src={preview} alt="QR รับเงิน" className="mx-auto aspect-square w-full max-w-[180px] object-contain" /> : <div className="flex aspect-square items-center justify-center"><QrCode className="h-20 w-20 text-slate-300" /></div>}
        <p className="mt-2 text-xs font-black">{accountName || 'ชื่อผู้รับเงิน'}</p><p className="mt-1 text-[10px] text-slate-500">ตัวอย่าง QR ไม่ใช่หลักฐานว่าได้รับเงินแล้ว</p>
      </div>
    </div>

    <label className="flex items-start gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300"><input type="checkbox" checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} className="mt-0.5 h-4 w-4" /><span>ฉันยืนยันว่าบัญชีนี้เป็นของฉันหรือองค์กรที่ฉันมีอำนาจจัดการ และยินยอมให้ Super Admin ตรวจสอบข้อมูลเพื่อเปิดรับเงิน</span></label>
    <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-[11px] text-amber-200"><ShieldCheck className="h-4 w-4 shrink-0" />เมื่อแก้ไขชื่อหรือหมายเลขรับเงิน สถานะจะกลับเป็น “รอตรวจสอบ” และหยุดรับเงินจนกว่าจะอนุมัติใหม่</div>
    {message && <p className={`text-center text-xs font-bold ${message.startsWith('บันทึกแล้ว') ? 'text-emerald-300' : 'text-red-300'}`}>{message}</p>}
    <button disabled={saving} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 font-black text-slate-950 disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : profile?.verificationStatus === 'verified' ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}{saving ? 'กำลังบันทึก...' : 'บันทึกและส่งตรวจสอบ'}</button>
  </form>;
};
