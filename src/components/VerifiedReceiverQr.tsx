import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { getMyPaymentProfile, PaymentReceiverProfile } from '../services/paymentProfileService';

interface VerifiedReceiverQrProps {
  amount?: number;
  compact?: boolean;
}

export const VerifiedReceiverQr: React.FC<VerifiedReceiverQrProps> = ({ amount, compact = false }) => {
  const [profile, setProfile] = useState<PaymentReceiverProfile | null>(null);
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyPaymentProfile().then(async (saved) => {
      if (cancelled) return;
      setProfile(saved);
      if (!saved || saved.verificationStatus !== 'verified' || !saved.payoutsEnabled) return;
      const image = await generatePromptPayQRDataUrl(saved.promptPayId, amount && amount > 0 ? amount : undefined);
      if (!cancelled) setQr(image);
    }).catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'สร้าง QR ไม่สำเร็จ'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [amount]);

  if (loading) return <div className="flex min-h-40 items-center justify-center gap-2 text-xs text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />กำลังตรวจช่องทางรับเงิน...</div>;
  if (error) return <div className="flex min-h-32 items-center justify-center gap-2 rounded-xl bg-red-50 p-4 text-xs text-red-700"><AlertTriangle className="h-5 w-5" />{error}</div>;
  if (!profile || profile.verificationStatus !== 'verified' || !profile.payoutsEnabled) return <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-5 text-center text-amber-900"><QrCode className="h-10 w-10" /><p className="text-sm font-black">ยังไม่มี QR รับเงินจริงที่ผ่านการตรวจสอบ</p><p className="text-[11px]">ไปที่โปรไฟล์ → ตั้งค่ารับเงิน แล้วรอ Super Admin อนุมัติ</p></div>;

  return <div className="text-center">
    <div className="mb-2 flex items-center justify-center gap-1 text-[10px] font-black text-emerald-700"><CheckCircle2 className="h-4 w-4" />ช่องทางรับเงินผ่านการตรวจสอบแล้ว</div>
    <img src={qr} alt={`QR PromptPay จริงของ ${profile.accountName}`} className={`mx-auto aspect-square object-contain ${compact ? 'w-24' : 'w-48 sm:w-52'}`} />
    <p className="mt-2 text-xs font-black text-slate-900">{profile.accountName}</p>
    <p className="text-[10px] text-slate-500">PromptPay {profile.promptPayMasked}</p>
  </div>;
};
