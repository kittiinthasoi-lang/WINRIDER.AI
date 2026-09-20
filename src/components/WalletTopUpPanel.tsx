import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, QrCode, Upload, Wallet } from 'lucide-react';
import { auth } from '../firebase';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';

export const WalletTopUpPanel: React.FC = () => {
  const [amount, setAmount] = useState(200);
  const [config, setConfig] = useState<{ configured: boolean; promptPayId: string; promptPayMasked: string; accountName: string; source?: string; error?: string } | null>(null);
  const [qr, setQr] = useState('');
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const token = () => auth.currentUser?.getIdToken();
  useEffect(() => {
    token().then(async (idToken) => {
      if (!idToken) return;
      const response = await fetch('/api/wallet/topup-config', { headers: { Authorization: `Bearer ${idToken}` } });
      if (!response.ok) throw new Error('โหลดบัญชีรับเงินจริงไม่สำเร็จ');
      setConfig(await response.json());
    }).catch(() => setMessage('โหลดข้อมูลบัญชีรับเงินไม่สำเร็จ'));
  }, []);
  useEffect(() => {
    if (!config?.configured || amount <= 0) return setQr('');
    generatePromptPayQRDataUrl(config.promptPayId, amount).then(setQr).catch(() => setMessage('สร้าง QR ไม่สำเร็จ'));
  }, [config, amount]);

  const readProof = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setMessage('กรุณาใช้สลิป JPG/PNG/WEBP ขนาดไม่เกิน 4 MB'); return;
    }
    const reader = new FileReader();
    reader.onload = () => setProof(String(reader.result || ''));
    reader.readAsDataURL(file);
  };
  const submit = async () => {
    if (!proof || amount <= 0) return;
    setBusy(true); setMessage('');
    try {
      const idToken = await token();
      if (!idToken) throw new Error('กรุณาเข้าสู่ระบบ');
      const response = await fetch('/api/wallet/topup-proof', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ amount, imageDataUrl: proof }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ส่งสลิปไม่สำเร็จ');
      setMessage(data.message); setProof('');
    } catch (error: any) { setMessage(error?.message || 'ส่งสลิปไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-3xl border border-emerald-400/40 bg-[#07172B] p-5 space-y-4">
    <div className="flex items-center gap-3"><Wallet className="w-6 h-6 text-emerald-300"/><div><h3 className="font-black text-white">เติมเงินกระเป๋า WIN</h3><p className="text-xs text-slate-400">โอนจริง • AI อ่านสลิป • Super Admin ยืนยันก่อนเพิ่มยอด</p></div></div>
    {!config?.configured ? <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">{config?.error || 'ยังไม่ได้ตั้งค่า ADMIN_PROMPTPAY_ID และ ADMIN_BANK_ACCOUNT_NAME ที่เป็นบัญชีจริง'} ระบบจะไม่สร้าง QR จำลองแทน</p> : <>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3"><label className="text-xs text-slate-300">ยอดที่ต้องการเติม (บาท)</label><input type="number" min="1" max="100000" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-white"/><div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-slate-200"><span className="text-[10px] font-black text-emerald-300">บัญชีแอดมินจริงจากระบบ Deploy</span><p className="mt-1">ผู้รับ: <strong className="text-white">{config.accountName}</strong></p><p>PromptPay: <strong className="font-mono text-emerald-300">{config.promptPayMasked}</strong></p></div></div>
        {qr && <div className="rounded-2xl bg-white p-2"><img src={qr} alt="QR PromptPay ของผู้ดูแล" className="h-40 w-40"/></div>}
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/50 p-3 text-xs font-bold text-cyan-200"><Upload className="w-4 h-4"/>{proof ? 'เปลี่ยนรูปสลิป' : 'อัปโหลดสลิปหลังโอน'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => readProof(e.target.files?.[0])}/></label>
      {proof && <img src={proof} alt="สลิปที่เลือก" className="mx-auto max-h-52 rounded-xl object-contain"/>}
      <button onClick={submit} disabled={busy || !proof || amount <= 0} className="w-full rounded-xl bg-emerald-400 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{busy ? <Loader2 className="mx-auto w-5 h-5 animate-spin"/> : 'ส่งสลิปให้ AI ตรวจ'}</button>
    </>}
    {message && <p className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-xs text-slate-200"><CheckCircle2 className="w-4 h-4 text-emerald-300"/>{message}</p>}
    <p className="text-[10px] text-slate-500"><QrCode className="mr-1 inline w-3 h-3"/>QR สร้างจาก Environment ฝั่งเซิร์ฟเวอร์เท่านั้น ไม่มีหมายเลขสำรองหรือบัญชีจำลอง กรุณาตรวจชื่อผู้รับในแอปธนาคารก่อนโอนทุกครั้ง</p>
  </section>;
};
