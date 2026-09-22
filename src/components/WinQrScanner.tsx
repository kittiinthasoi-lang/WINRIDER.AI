import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, ImagePlus, Loader2, ScanLine, ShieldCheck, X } from 'lucide-react';
import { auth } from '../firebase';
import { parseQrPayload, ParsedQrPayload } from '../utils/qrPayload';

interface Props {
  onVerified?: (result: { payload: string; parsed: ParsedQrPayload; verification: any }) => void;
  onClose?: () => void;
}

export const WinQrScanner: React.FC<Props> = ({ onVerified, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [cameraError, setCameraError] = useState('');
  const [status, setStatus] = useState('กำลังเปิดกล้องจริง…');
  const [payload, setPayload] = useState('');
  const [parsed, setParsed] = useState<ParsedQrPayload | null>(null);
  const [verification, setVerification] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const verifyPayload = useCallback(async (raw: string) => {
    if (busy || !raw.trim()) return;
    setBusy(true);
    setPayload(raw);
    const parsedPayload = parseQrPayload(raw);
    setParsed(parsedPayload);
    setStatus('Server กำลังตรวจชนิด QR และตรวจเจ้าของ/ยอดเงิน…');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      if (!token) throw new Error('LOGIN_REQUIRED');
      const response = await fetch('/api/payments/qr/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payload: raw }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'QR_VERIFY_FAILED');
      setVerification(body);
      setStatus('ตรวจสอบ QR สำเร็จ — พร้อมดำเนินรายการตามชนิดช่องทาง');
      onVerified?.({ payload: raw, parsed: parsedPayload, verification: body });
    } catch (error) {
      setVerification({ ok: false, error: error instanceof Error ? error.message : 'QR_VERIFY_FAILED' });
      setStatus('QR ไม่ผ่านการตรวจสอบจาก Server');
    } finally {
      setBusy(false);
    }
  }, [busy, onVerified]);

  const scanCanvas = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || busy) return;
    const width = Math.min(video.videoWidth || 960, 960);
    const height = Math.min(video.videoHeight || 720, 720);
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const image = ctx.getImageData(0, 0, width, height);
    const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
    if (code?.data) void verifyPayload(code.data);
  }, [busy, verifyPayload]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('CAMERA_UNAVAILABLE');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setStatus('เล็ง QR ให้อยู่ในกรอบ — ระบบจะ decode จากภาพกล้องจริง');
        scanningRef.current = true;
        const loop = () => { if (!alive || !scanningRef.current) return; scanCanvas(); window.setTimeout(loop, 250); };
        loop();
      } catch {
        setCameraError('เปิดกล้องไม่ได้ กรุณาอนุญาตกล้อง หรือเลือกภาพ QR จากเครื่อง');
        setStatus('พร้อมสแกนจากรูปภาพ');
      }
    })();
    return () => { alive = false; scanningRef.current = false; streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  }, [scanCanvas]);

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
      if (!code?.data) { setStatus('ไม่พบ QR ที่ decode ได้จากรูปนี้'); return; }
      await verifyPayload(code.data);
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3">
      <div className="w-full max-w-lg rounded-3xl border border-cyan-400/40 bg-[#071225] p-4 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><ScanLine className="w-5 h-5 text-cyan-300" /><div><h3 className="font-black text-white">WIN QR Scanner</h3><p className="text-[10px] text-slate-400">กล้องจริง → decode → Server verify</p></div></div>
          {onClose && <button onClick={onClose} className="p-2 rounded-xl bg-white/5"><X className="w-4 h-4 text-slate-300" /></button>}
        </div>
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-cyan-400/30">
          <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
          <div className="absolute inset-[18%] border-2 border-cyan-300/70 rounded-2xl pointer-events-none" />
          <canvas ref={canvasRef} className="hidden" />
          {busy && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-300" /></div>}
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && void handleFile(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-2"><ImagePlus className="w-4 h-4" />เลือกรูป QR</button>
        </div>
        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs">
          <p className="text-slate-300">{status}</p>
          {parsed && <div className="mt-2 text-[11px] space-y-1"><p>ชนิด: <b className="text-cyan-300">{parsed.kind}</b></p>{parsed.amountBaht !== undefined && <p>ยอดใน QR: <b className="text-amber-300">฿{parsed.amountBaht.toFixed(2)}</b></p>}{parsed.promptPayId && <p>ปลายทาง: <b className="text-white">{parsed.promptPayId}</b></p>}</div>}
          {verification?.ok && <p className="mt-2 text-emerald-300 flex items-center gap-1"><ShieldCheck className="w-4 h-4" />Server ยืนยันเจ้าของ/ช่องทางแล้ว</p>}
          {verification?.error && <p className="mt-2 text-rose-300">{verification.error}</p>}
          {payload && <details className="mt-2"><summary className="text-slate-500 cursor-pointer">payload ที่ decode ได้</summary><pre className="text-[9px] text-slate-500 break-all whitespace-pre-wrap">{payload}</pre></details>}
        </div>
      </div>
    </div>
  );
};
