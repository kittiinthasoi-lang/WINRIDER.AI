import React from 'react';
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCw,
  Compass,
  Gauge,
  Sparkles,
  Camera,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { ARManeuverType } from './ARLiveCameraNavigation';

export interface VirtualArOverlayProps {
  currentManeuver: ARManeuverType;
  distanceM: number;
  streetName: string;
  landmarkNotice?: string;
  speedKmH?: number;
  cameraActive: boolean;
  cameraFacing?: 'environment' | 'user';
  onToggleCameraFacing?: () => void;
  onSelectManeuver?: (m: ARManeuverType, dist: number, street: string) => void;
  compact?: boolean;
}

export const VirtualArOverlay: React.FC<VirtualArOverlayProps> = ({
  currentManeuver,
  distanceM,
  streetName,
  landmarkNotice,
  speedKmH = 42,
  cameraActive,
  cameraFacing = 'environment',
  onToggleCameraFacing,
  onSelectManeuver,
  compact = false
}) => {
  // Maneuver rotation angle calculation for 3D arrow
  const getArrowRotation = () => {
    switch (currentManeuver) {
      case 'turn_left':
        return '-rotate-45 translate-x-[-35px]';
      case 'slight_left':
        return '-rotate-25 translate-x-[-18px]';
      case 'sharp_left':
        return '-rotate-75 translate-x-[-55px]';
      case 'turn_right':
        return 'rotate-45 translate-x-[35px]';
      case 'slight_right':
        return 'rotate-25 translate-x-[18px]';
      case 'sharp_right':
        return 'rotate-75 translate-x-[55px]';
      case 'u_turn':
        return 'rotate-180';
      case 'arrived':
        return 'rotate-0 scale-90';
      case 'straight':
      default:
        return 'rotate-0';
    }
  };

  const getManeuverThaiText = () => {
    switch (currentManeuver) {
      case 'turn_left':
        return 'เลี้ยวซ้ายเข้า';
      case 'slight_left':
        return 'เบี่ยงซ้ายเข้า';
      case 'sharp_left':
        return 'หักศอกซ้ายเข้า';
      case 'turn_right':
        return 'เลี้ยวขวาเข้า';
      case 'slight_right':
        return 'เบี่ยงขวาเข้า';
      case 'sharp_right':
        return 'หักศอกขวาเข้า';
      case 'u_turn':
        return 'กลับรถที่';
      case 'arrived':
        return 'ถึงจุดหมายปลายทาง';
      case 'straight':
      default:
        return 'ตรงไปตามแนว';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-25 flex flex-col justify-between p-3 select-none overflow-hidden">
      {/* Top Banner: Real-time Live Camera Status & Turn Guidance */}
      <div className="flex items-start justify-between gap-2 pointer-events-auto">
        <div className="space-y-1">
          {/* Live Mobile Camera AR Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-cyan-400/60 shadow-[0_0_15px_rgba(0,210,255,0.4)]">
            <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
            <span className="text-[10px] font-mono font-black text-white flex items-center gap-1">
              <Camera className="w-3 h-3 text-cyan-400" />
              <span>{cameraActive ? 'กล้องสดมือถือ (LIVE AR)' : 'ภาพจำลองถนนจริง (POV SIM)'}</span>
            </span>
            <span className="text-[9px] text-cyan-300 font-mono hidden sm:inline">
              ({cameraFacing === 'environment' ? 'กล้องหลัง' : 'กล้องหน้า'})
            </span>
          </div>

          {/* Floating Maneuver Instruction Card */}
          <div className="p-2.5 rounded-2xl bg-[#06132D]/90 backdrop-blur-md border border-[#00D2FF]/60 shadow-[0_0_20px_rgba(0,210,255,0.35)] space-y-0.5 max-w-xs">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-black text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-pulse" />
              <span>ลูกศรเสมือน AR (VIRTUAL AR GUIDANCE):</span>
              <span className="text-amber-300 font-black">อีก {distanceM} ม.</span>
            </div>
            <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 leading-tight">
              <span className="p-1 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs">
                {currentManeuver.includes('left') ? '⬅' : currentManeuver.includes('right') ? '➡' : currentManeuver === 'u_turn' ? '↩' : '⬆'}
              </span>
              <span>{getManeuverThaiText()} {streetName}</span>
            </div>
            {landmarkNotice && (
              <p className="text-[9px] text-cyan-200/80 font-mono">
                {landmarkNotice}
              </p>
            )}
          </div>
        </div>

        {/* Top Right: Flip Camera Facing Button & Speedometer HUD */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          {onToggleCameraFacing && (
            <button
              type="button"
              onClick={onToggleCameraFacing}
              className="px-2.5 py-1.5 rounded-xl bg-black/80 hover:bg-slate-900 border border-cyan-400/50 text-cyan-300 font-mono text-[10px] font-bold flex items-center gap-1 shadow-md transition-all active:scale-95"
              title="สลับกล้องหน้า / หลัง"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>สลับกล้อง</span>
            </button>
          )}

          {/* Mini Speed HUD */}
          <div className="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-right font-mono">
            <span className="text-xs sm:text-sm font-black text-emerald-400">{speedKmH}</span>
            <span className="text-[9px] text-slate-400 ml-1">KM/H</span>
          </div>
        </div>
      </div>

      {/* Center 3D Holographic AR Virtual Turn Arrow (ซ้อนกับภาพกล้องสด) */}
      <div className="relative flex flex-col items-center justify-center my-auto">
        {/* Holographic Laser Marker Ring on Road Surface */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Pulsing Ground Target Rings */}
          <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border-2 border-cyan-400/50 shadow-[0_0_35px_rgba(0,210,255,0.8)] animate-ping pointer-events-none" style={{ animationDuration: '2.2s' }} />
          <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-cyan-300/40 bg-cyan-400/15 pointer-events-none" />

          {/* 3D Tilted Perspective Arrow Container */}
          <div 
            className="relative flex flex-col items-center transition-all duration-500"
            style={{
              perspective: '600px',
              perspectiveOrigin: '50% 60%',
              transform: 'perspective(600px) rotateX(45deg) scale(1.05)'
            }}
          >
            {/* 3D Neon Arrow Head Tilted to Turn Maneuver */}
            <div className={`relative flex flex-col items-center transition-transform duration-500 ${getArrowRotation()}`}>
              <div className="relative">
                <svg 
                  width={compact ? "90" : "120"} 
                  height={compact ? "90" : "120"} 
                  viewBox="0 0 100 100" 
                  className="filter drop-shadow-[0_0_25px_#00D2FF]"
                >
                  {/* Outer Glowing Arrow Polygon */}
                  <polygon 
                    points="50,5 95,65 65,65 65,95 35,95 35,65 5,65" 
                    fill="url(#virtualArNeonBlue)" 
                    stroke="#FFFFFF" 
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    className="animate-pulse"
                  />
                  {/* Inner Highlight Chevron */}
                  <polygon 
                    points="50,22 80,60 60,60 60,85 40,85 40,60 20,60" 
                    fill="#00E5FF" 
                    opacity="0.9"
                  />
                  <defs>
                    <linearGradient id="virtualArNeonBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="35%" stopColor="#00D2FF" />
                      <stop offset="100%" stopColor="#0066FF" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Light ring */}
                <div className="absolute inset-0 rounded-full border-2 border-cyan-300 opacity-60 animate-ping" style={{ animationDuration: '1.6s' }} />
              </div>

              {/* Streaming Chevrons behind main arrow */}
              <div className="flex flex-col items-center gap-1 -mt-2">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="w-12 sm:w-16 h-2.5 bg-gradient-to-r from-transparent via-[#00D2FF] to-transparent shadow-[0_0_12px_#00D2FF] opacity-85"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 100%, 80% 100%, 50% 35%, 20% 100%, 0% 100%)',
                      animation: `pulse 1.2s infinite ease-in-out ${idx * 0.2}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Floating Waypoint Pin Label Tag */}
          <div className="mt-2 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md border border-cyan-400 text-[10px] font-mono font-bold text-white shadow-[0_0_15px_rgba(0,210,255,0.6)] flex items-center gap-1.5 animate-bounce">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D2FF]" />
            <span>จุดเลี้ยว AR: {streetName} ({distanceM}ม.)</span>
          </div>
        </div>
      </div>

      {/* Bottom AR Maneuver Test Selector Strip (ช่วยให้ผู้ใช้ทดสอบทิศทางลูกศร AR ได้ทันที) */}
      {onSelectManeuver && (
        <div className="pointer-events-auto p-1.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/10 flex items-center justify-between gap-1 overflow-x-auto text-[10px] font-mono">
          <span className="text-slate-400 font-bold px-1 hidden sm:inline">
            ทดสอบลูกศร AR:
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectManeuver('turn_left', 45, 'ซอยสุขุมวิท 39 (พร้อมพงษ์)')}
              className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                currentManeuver === 'turn_left'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_#00D2FF]'
                  : 'bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              <CornerUpLeft className="w-3 h-3" />
              <span>เลี้ยวซ้าย (45ม.)</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectManeuver('straight', 180, 'ถนนสุขุมวิทมุ่งหน้าอโศก')}
              className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                currentManeuver === 'straight'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_#00D2FF]'
                  : 'bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              <ArrowUp className="w-3 h-3" />
              <span>ตรงไป (180ม.)</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectManeuver('turn_right', 60, 'สี่แยกอโศกมนตรี')}
              className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                currentManeuver === 'turn_right'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_#00D2FF]'
                  : 'bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              <CornerUpRight className="w-3 h-3" />
              <span>เลี้ยวขวา (60ม.)</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectManeuver('u_turn', 120, 'จุดกลับรถหน้าเอ็มสเฟียร์')}
              className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                currentManeuver === 'u_turn'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_#00D2FF]'
                  : 'bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              <span>↩ กลับรถ (120ม.)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
