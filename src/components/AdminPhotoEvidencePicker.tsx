import React, { useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { auth } from '../firebase';

export interface PhotoEvidenceResult {
  imageUrl: string;
  imageIcon: string;
}

interface AdminPhotoEvidencePickerProps {
  category: string;
  title?: string;
  description?: string;
  onPhotoReady: (result: PhotoEvidenceResult) => void;
  onReset?: () => void;
}

export const AdminPhotoEvidencePicker: React.FC<AdminPhotoEvidencePickerProps> = ({
  category,
  title = 'รูปหลักฐานจริง',
  description = 'ถ่ายหรือเลือกรูปจริง รูปจะถูกส่งให้แอดมินตรวจ ไม่ใช้ AI ตัดสิน',
  onPhotoReady,
  onReset,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [error, setError] = useState('');

  const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('อ่านรูปไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setUploadedUrl('');
    onReset?.();
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('กรุณาเข้าสู่ระบบใหม่');
      setUploading(true);
      const imageDataUrl = await toDataUrl(file);
      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ imageDataUrl, category }),
      });
      const payload = await response.json().catch(() => ({})) as { imageUrl?: string; error?: string };
      if (!response.ok || !payload.imageUrl) throw new Error(payload.error || 'อัปโหลดรูปไม่สำเร็จ');
      setUploadedUrl(payload.imageUrl);
      onPhotoReady({ imageUrl: payload.imageUrl, imageIcon: '📸' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-400/25 bg-slate-950/40 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className="w-5 h-5 text-cyan-300 shrink-0" />
        <div>
          <div className="text-sm font-black text-white">{title}</div>
          <p className="text-[11px] text-slate-400">{description}</p>
        </div>
      </div>

      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
          <img src={preview} alt="หลักฐานที่เลือก" className="h-52 w-full object-cover" />
          {uploadedUrl && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-950/80 px-2 py-1 text-[10px] font-bold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />พร้อมส่งให้แอดมินตรวจ
            </span>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600 bg-black/20 text-slate-400">
          <Camera className="mb-2 h-7 w-7 text-cyan-300" />
          <span className="text-xs font-bold">ถ่ายรูป / เลือกรูป</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-2.5 text-xs font-bold text-cyan-200 disabled:opacity-50">
        {uploading ? <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />กำลังอัปโหลด...</> : <><Upload className="mr-1 inline h-4 w-4" />{preview ? 'เปลี่ยนรูป' : 'ถ่ายหรือเลือกรูปจริง'}</>}
      </button>

      {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}
    </div>
  );
};
