import React, { useRef, useState } from 'react';
import { Camera, CheckCircle2, MapPin, Upload, X, Loader2 } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { uploadServiceCompletionPhoto } from '../utils/imageUpload';
import { playTactileBlip } from '../utils/audio';

interface ServicePhotoVerificationModalProps {
  type: 'express_delivery' | 'family_arrival';
  serviceName?: string;
  driverName?: string;
  driverLevel?: number;
  recipientOrPassengerName?: string;
  locationName?: string;
  audioEnabled: boolean;
  orderId?: string;
  onClose: () => void;
  onConfirm?: (imageUrl: string) => void;
}

export const ServicePhotoVerificationModal: React.FC<ServicePhotoVerificationModalProps> = ({
  type, serviceName = 'WIN Service', driverName = 'พี่วิน', driverLevel = 0,
  recipientOrPassengerName = 'ผู้รับบริการ', locationName = 'ปลายทาง',
  audioEnabled, orderId, onClose, onConfirm
}) => {
  const isExpress = type === 'express_delivery';
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [gps, setGps] = useState<{lat:number;lng:number} | null>(null);
  const [error, setError] = useState('');

  const capture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(selected.type) || selected.size > 8 * 1024 * 1024) {
      setError('กรุณาใช้รูป JPG, PNG หรือ WEBP ขนาดไม่เกิน 8 MB');
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGps(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  };

  const confirm = async () => {
    if (!file) { setError('ต้องถ่ายหรือเลือกรูปหลักฐานก่อนยืนยันจบงาน'); return; }
    const user = getAuth().currentUser;
    if (!user) { setError('ต้องเข้าสู่ระบบก่อนบันทึกหลักฐาน'); return; }
    if (!orderId) { setError('ไม่พบเลขออเดอร์จริง จึงยังบันทึกหลักฐานไม่ได้'); return; }
    setSaving(true); setError('');
    try {
      const imageUrl = await uploadServiceCompletionPhoto(user.uid, orderId, file);
      const token = await user.getIdToken();
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/completion-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ proofUrl: imageUrl, latitude: gps?.lat, longitude: gps?.lng })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'บันทึกหลักฐานไม่สำเร็จ');
      if (audioEnabled) playTactileBlip(1100);
      onConfirm?.(imageUrl);
      onClose();
    } catch (e: any) {
      setError(String(e?.message || 'บันทึกหลักฐานไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-cyan-400/40 bg-[#071126] p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-black tracking-widest text-cyan-300">WINRIDER COMPLETION PROOF</div>
            <h3 className="mt-1 text-base font-black text-white">{isExpress ? 'ถ่ายรูปยืนยันการส่งพัสดุ' : 'ถ่ายรูปยืนยันถึงที่หมายปลอดภัย'}</h3>
            <p className="text-[10px] text-slate-400 mt-1">{serviceName} • ออเดอร์จริง {orderId || 'ยังไม่ระบุ'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-cyan-400/30 bg-black">
          {preview ? <img src={preview} alt="หลักฐานการส่งมอบ" className="h-full w-full object-cover" /> : (
            <button type="button" onClick={() => inputRef.current?.click()} className="h-full w-full flex flex-col items-center justify-center gap-3 text-cyan-300">
              <Camera className="h-12 w-12" />
              <span className="font-black">แตะเพื่อถ่ายรูปหลักฐานจริง</span>
              <span className="text-[10px] text-slate-500">ไม่ใช้ภาพจำลอง/อิโมจิ</span>
            </button>
          )}
          <div className="absolute left-2 right-2 bottom-2 flex justify-between gap-2 rounded-xl bg-black/75 p-2 text-[9px] font-mono">
            <span className="flex items-center gap-1 text-cyan-300"><MapPin className="h-3 w-3" />{gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : 'กำลังรอ GPS'}</span>
            <span className="text-slate-300">{driverName} • LV.{driverLevel}</span>
          </div>
        </div>

        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={capture} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 py-3 text-xs font-black text-cyan-200 flex items-center justify-center gap-2"><Camera className="h-4 w-4" /> ถ่าย/เลือกใหม่</button>
          <button type="button" disabled={!file || saving} onClick={confirm} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 py-3 text-xs font-black text-slate-950 disabled:opacity-40 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} ยืนยันหลักฐาน
          </button>
        </div>
        {error && <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-200">{error}</div>}
        <p className="text-[10px] leading-relaxed text-slate-500">หลักฐานถูกอัปโหลดเข้า Firebase Storage และผูกกับออเดอร์จริงก่อนจบงาน ระบบไม่สร้างข้อความว่า AI ตรวจผ่านจนกว่าจะมีภาพจริง</p>
      </div>
    </div>
  );
};
