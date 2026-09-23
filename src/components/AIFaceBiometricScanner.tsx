import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, CheckCircle2, ShieldCheck, Sparkles, Scan, AlertCircle, Zap, UserCheck, X } from 'lucide-react';
import { playTactileBlip, playRadarScan, playNfcSyncSound } from '../utils/audio';
import { uploadProfileImage } from '../utils/imageUpload';
import { auth } from '../firebase';

export interface BiometricScanResult {
  faceImageUrl: string;
  biometricScore: number;
  faceHash: string;
  livenessPassed: boolean;
  scanTimestamp: string;
}

interface AIFaceBiometricScannerProps {
  onScanComplete: (result: BiometricScanResult) => void;
  onCancel?: () => void;
  role: 'driver' | 'customer' | 'merchant' | 'partner';
  audioEnabled?: boolean;
}

export const AIFaceBiometricScanner: React.FC<AIFaceBiometricScannerProps> = ({
  onScanComplete,
  onCancel,
  role,
  audioEnabled = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Scanning stages: 'idle' | 'aligning' | 'liveness' | 'analyzing' | 'completed'
  const [scanStage, setScanStage] = useState<'idle' | 'aligning' | 'liveness' | 'analyzing' | 'completed'>('idle');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [livenessPrompt, setLivenessPrompt] = useState<string>('มองตรงที่กล้องและจัดใบหน้าให้อยู่ในกรอบเซนเซอร์');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [biometricData, setBiometricData] = useState<{
    score: number;
    hash: string;
    symmetry: string;
    pupilDist: string;
  } | null>(null);

  // Initialize Camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 640 },
            facingMode: 'user'
          },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        throw new Error('อุปกรณ์ไม่รองรับการเปิดกล้องเว็บแคมโดยตรง');
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตกล้องเพื่อยืนยันตัวตน');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Real scan: capture camera frame -> WIN-AI Vision -> persist actual photo.
  const handleStartScan = async () => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) {
      setCameraError('ต้องเปิดกล้องจริงก่อนเริ่มตรวจใบหน้า');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setCameraError('กรุณาเข้าสู่ระบบก่อนตรวจใบหน้า');
      return;
    }
    if (audioEnabled) playRadarScan();
    setScanStage('analyzing');
    setScanProgress(30);
    setLivenessPrompt('กำลังส่งภาพจากกล้องจริงให้ WIN-AI Vision ตรวจสอบ…');
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoUrl = canvas.toDataURL('image/jpeg', 0.88);
      const response = await fetch('/api/ai/face-photo-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ imageDataUrl: photoUrl, role }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.result?.faceVisible) throw new Error(payload.error || 'ไม่พบใบหน้าที่ชัดเจนจากภาพจริง');
      setScanProgress(75);
      setLivenessPrompt('AI ตรวจภาพใบหน้าจริงสำเร็จ กำลังบันทึกรูปโปรไฟล์…');
      const blob = await (await fetch(photoUrl)).blob();
      const storedUrl = await uploadProfileImage(user.uid, role, new File([blob], `face-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      const face = payload.result;
      setCapturedPhoto(storedUrl);
      setBiometricData({
        score: Number(face.qualityScore) || 0,
        hash: String(face.faceHash || ''),
        symmetry: 'ไม่ประเมินจากภาพเดียว',
        pupilDist: 'ไม่ประเมินจากภาพเดียว'
      });
      setScanProgress(100);
      setScanStage('completed');
      setLivenessPrompt(face.livenessPassed ? 'ตรวจสอบสำเร็จ' : 'ตรวจภาพสำเร็จ • ยังไม่ได้ยืนยัน Liveness จากภาพเดียว');
      if (audioEnabled) playNfcSyncSound();
    } catch (error: any) {
      setScanStage('idle');
      setScanProgress(0);
      setLivenessPrompt(String(error?.message || 'ตรวจใบหน้าไม่สำเร็จ'));
      setCameraError(String(error?.message || 'ตรวจใบหน้าไม่สำเร็จ'));
    }
  };

  const handleConfirmResult = () => {
    if (!capturedPhoto || !biometricData) return;
    if (audioEnabled) playTactileBlip(1000);
    stopCamera();
    onScanComplete({
      faceImageUrl: capturedPhoto,
      biometricScore: biometricData.score,
      faceHash: biometricData.hash,
      livenessPassed: false,
      scanTimestamp: new Date().toISOString()
    });
  };

  const getRoleThemeColor = () => {
    switch (role) {
      case 'driver': return { hex: '#00D2FF', text: 'text-cyan-400', border: 'border-cyan-400', bg: 'bg-cyan-500/20' };
      case 'customer': return { hex: '#10B981', text: 'text-emerald-400', border: 'border-emerald-400', bg: 'bg-emerald-500/20' };
      case 'merchant': return { hex: '#FFD700', text: 'text-amber-400', border: 'border-amber-400', bg: 'bg-amber-500/20' };
      case 'partner': return { hex: '#EC4899', text: 'text-pink-400', border: 'border-pink-400', bg: 'bg-pink-500/20' };
    }
  };

  const theme = getRoleThemeColor();

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-[#0B1733] to-[#060D1E] border-2 border-cyan-500/40 shadow-2xl relative overflow-hidden space-y-5">
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Scan className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                AI FACE PHOTO CHECK
              </span>
              <span className="text-[10px] font-mono text-slate-400">PHOTO QUALITY CHECK</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              ตรวจภาพใบหน้าจริงด้วย AI
            </h3>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Scanner Stage */}
      <div className="relative max-w-sm mx-auto aspect-square rounded-3xl overflow-hidden bg-black/80 border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(0,210,255,0.2)] flex items-center justify-center">
        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Real camera feed only; biometric verification never uses a stand-in image. */}
        {cameraActive ? (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover transform -scale-x-100"
          />
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#0A1633] to-black">
            <p className="max-w-xs text-center text-sm text-slate-300">เปิดกล้องจริงเพื่อเริ่มยืนยันใบหน้า</p>
            {cameraError && (
              <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-amber-500/40 text-[10px] text-amber-300 font-mono text-center flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{cameraError}</span>
              </div>
            )}
          </div>
        )}

        {/* Futuristic Cyberpunk HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
          {/* Top HUD Markers */}
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>AI SCANNER: ACTIVE</span>
            </div>
            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/30">
              <span>FPS: 60 • 1080P</span>
            </div>
          </div>

          {/* Oval Biometric Target Mesh */}
          <div className="relative w-48 h-60 sm:w-56 sm:h-68 mx-auto my-auto border-2 border-dashed border-cyan-400/60 rounded-[45%] flex items-center justify-center">
            {/* Corner Brackets */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-300" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-cyan-300" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-cyan-300" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-300" />

            {/* Scanning Laser Line */}
            {(scanStage === 'aligning' || scanStage === 'liveness' || scanStage === 'analyzing') && (
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00D2FF] animate-pulse"
                style={{
                  top: `${(scanProgress * 0.9)}%`,
                  transition: 'top 0.3s ease-out'
                }}
              />
            )}

            {/* Landmark Crosshairs */}
            <div className="absolute top-1/3 left-1/4 w-3 h-3 border border-cyan-400/80 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-cyan-300 rounded-full" />
            </div>
            <div className="absolute top-1/3 right-1/4 w-3 h-3 border border-cyan-400/80 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-cyan-300 rounded-full" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-t border-b border-cyan-400/60" />
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-8 h-2 border-b-2 border-cyan-400/60 rounded-full" />

            {/* Completed Check Overlay */}
            {scanStage === 'completed' && (
              <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-300 space-y-2 rounded-[45%]">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 drop-shadow-[0_0_20px_#10B981]" />
                <span className="text-xs font-mono font-black">FACE PHOTO VERIFIED</span>
              </div>
            )}
          </div>

          {/* Bottom HUD Metrics */}
          <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300/80 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30">
            <span>SYMMETRY: NOT MEASURED</span>
            <span>LIVENESS: NOT VERIFIED</span>
            <span>AI: SERVER VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Progress & Prompt Banner */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-center">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            {livenessPrompt}
          </span>
          <span className="text-cyan-400 font-bold">{scanProgress}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 transition-all duration-300 shadow-[0_0_10px_#00D2FF]"
            style={{ width: `${scanProgress}%` }}
          />
        </div>
      </div>

      {/* Biometric Certificate Details (When completed) */}
      {scanStage === 'completed' && biometricData && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ผลตรวจภาพใบหน้าจริงโดย AI
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              คุณภาพภาพ {biometricData.score}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <span className="text-slate-400 block">รหัสแฮชใบหน้า:</span>
              <strong className="text-cyan-300 truncate block">{biometricData.hash}</strong>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <span className="text-slate-400 block">Liveness Test:</span>
              <strong className="text-emerald-300">ยังไม่ยืนยันจากภาพเดียว</strong>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <span className="text-slate-400 block">ความสมมาตร:</span>
              <strong className="text-white">{biometricData.symmetry}</strong>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <span className="text-slate-400 block">ระยะรูม่านตา:</span>
              <strong className="text-white">{biometricData.pupilDist}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        {scanStage === 'idle' && (
          <button
            type="button"
            onClick={handleStartScan}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>เริ่มกระบวนการแสกนใบหน้า (Start AI Scan)</span>
          </button>
        )}

        {(scanStage === 'aligning' || scanStage === 'liveness' || scanStage === 'analyzing') && (
          <button
            disabled
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 cursor-wait"
          >
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>AI กำลังประมวลผล กรุณารอสักครู่...</span>
          </button>
        )}

        {scanStage === 'completed' && (
          <>
            <button
              type="button"
              onClick={() => {
                setScanStage('idle');
                setScanProgress(0);
                setCapturedPhoto(null);
                setBiometricData(null);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono transition-all"
            >
              แสกนใหม่อีกครั้ง
            </button>

            <button
              type="button"
              onClick={handleConfirmResult}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-600 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>บันทึกผลแสกนหน้าและไปต่อ</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
