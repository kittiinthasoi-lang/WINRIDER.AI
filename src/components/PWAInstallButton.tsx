import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'prominent' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  // If already running inside standalone PWA, show installed badge or return null
  if (isInstalled) {
    if (variant === 'prominent') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>ติดตั้งเป็นแอป PWA แล้ว (Standalone Mode)</span>
        </div>
      );
    }
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <>
        <button
          onClick={install}
          className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:brightness-110 active:scale-95 transition-all ${className}`}
          title="ติดตั้ง WINRIDER ลงหน้าจอหลัก"
        >
          <Download className="w-3.5 h-3.5" />
          <span>ติดตั้งแอป (PWA)</span>
        </button>
      </>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl border border-cyan-500/50 bg-cyan-950/40 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/60 transition-all ${className}`}
          title="วิธีติดตั้งบน iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>เพิ่มลงหน้าจอ iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#0A1428] border-2 border-cyan-400 p-6 shadow-[0_0_30px_rgba(0,210,255,0.4)] text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">ติดตั้งบน iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold font-mono">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-white">กดปุ่มแชร์ (Share)</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">ไอคอนสี่เหลี่ยมลูกศรชี้ขึ้น <Share className="w-3.5 h-3.5 inline mx-0.5 text-cyan-400" /> ในแถบเมนู Safari ด้านล่าง</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-[#FFD700]/20 text-[#FFD700] flex items-center justify-center font-bold font-mono">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-white">เลือก "เพิ่มไปยังหน้าจอโฮม"</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">(Add to Home Screen) เพื่อเปิดใช้งานแบบเต็มจอไร้แถบเบราว์เซอร์</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-white">กด "เพิ่ม (Add)" มุมบนขวา</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">ไอคอน WINRIDER จะไปปรากฏบนหน้าจอหลักของคุณทันที</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110 transition-all"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback Guide for desktop/mobile browsers where prompt is not auto-triggered
  return (
    <>
      <button
        onClick={() => setShowManualGuide(true)}
        className={`flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/60 transition-all ${className}`}
        title="ติดตั้งแอป WINRIDER (PWA)"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400" />
        <span>ติดตั้งแอป PWA</span>
      </button>

      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#0A1428] border-2 border-cyan-400 p-6 shadow-[0_0_30px_rgba(0,210,255,0.4)] text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">ติดตั้งลงหน้าจอมือถือ/คอมพิวเตอร์</h3>
              </div>
              <button
                onClick={() => setShowManualGuide(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs text-slate-300">
              <p>
                แอป <strong>WINRIDER.AI</strong> รองรับเทคโนโลยี <strong>Progressive Web App (PWA)</strong> ทำงานเสมือนแอปเนทีฟเต็มจอ:
              </p>
              <ul className="space-y-2 pl-2">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>บน Chrome / Edge:</strong> คลิกไอคอนติดตั้ง (Install) ที่แถบ URL ด้านบนขวา</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>บนมือถือ Android:</strong> แตะเมนู 3 จุด (⋮) &gt; เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>บน iOS Safari:</strong> แตะปุ่ม Share &gt; เลือก "Add to Home Screen"</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowManualGuide(false)}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110 transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
};
