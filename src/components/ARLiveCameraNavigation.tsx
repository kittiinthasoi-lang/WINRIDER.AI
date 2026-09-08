import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Video,
  Navigation,
  Compass,
  Volume2,
  VolumeX,
  RotateCw,
  Zap,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Shield,
  Gauge,
  Sparkles,
  MapPin,
  Maximize2,
  Minimize2,
  X,
  Radio,
  Eye,
  Sliders,
  Sun,
  Moon,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Crosshair,
  Layers,
  ChevronRight
} from 'lucide-react';
import { IncomingJobData } from './DriverStandbyAndIncomingJob';
import { playTactileBlip, speakThaiText, AIVoicePersona, AI_VOICE_PERSONAS } from '../utils/audio';

export type ARManeuverType = 'straight' | 'slight_left' | 'turn_left' | 'sharp_left' | 'slight_right' | 'turn_right' | 'sharp_right' | 'u_turn' | 'arrived';

export interface ARLiveCameraNavigationProps {
  activeJob?: IncomingJobData | null;
  voiceInstruction?: string;
  remainingDistM?: number;
  remainingMinutes?: number;
  currentSpeed?: number;
  liveHeading?: number;
  audioEnabled?: boolean;
  voiceGuidanceEnabled?: boolean;
  voicePersona?: AIVoicePersona;
  onClose?: () => void;
  onSwitchToMap?: () => void;
  onSwitchToGoogleMaps?: () => void;
  onAdvanceTripStep?: () => void;
}

export const ARLiveCameraNavigation: React.FC<ARLiveCameraNavigationProps> = ({
  activeJob,
  voiceInstruction = 'อีก 50 เมตร เลี้ยวซ้ายเข้าซอยสุขุมวิท 39',
  remainingDistM = 350,
  remainingMinutes = 4,
  currentSpeed = 38,
  liveHeading = 45,
  audioEnabled = true,
  voiceGuidanceEnabled = true,
  voicePersona = 'fah_sai',
  onClose,
  onSwitchToMap,
  onSwitchToGoogleMaps,
  onAdvanceTripStep
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera States
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useSimulationFeed, setUseSimulationFeed] = useState<boolean>(false);

  // AR Navigation Maneuver state (allows rider or user to interactively switch turn scenarios)
  const [currentManeuver, setCurrentManeuver] = useState<ARManeuverType>('turn_left');
  const [arDistanceM, setArDistanceM] = useState<number>(remainingDistM || 45);
  const [arStreetName, setArStreetName] = useState<string>('ซอยสุขุมวิท 39 (พร้อมพงษ์)');
  const [arLandmarkNotice, setArLandmarkNotice] = useState<string>('จุดสังเกต: ซอยข้างศูนย์การค้าเอ็มควอเทียร์');

  // AR Visual Filter modes
  const [arFilterMode, setArFilterMode] = useState<'cyber_neon' | 'standard' | 'night_vision' | 'thermal'>('cyber_neon');
  const [showArtificialHorizon, setShowArtificialHorizon] = useState<boolean>(true);
  const [showLaneGuidingBeams, setShowLaneGuidingBeams] = useState<boolean>(true);
  const [showSpeedometer, setShowSpeedometer] = useState<boolean>(true);
  const [soundMuted, setSoundMuted] = useState<boolean>(!voiceGuidanceEnabled);
  const [selectedPersona, setSelectedPersona] = useState<AIVoicePersona>(voicePersona);
  const [speechWaveActive, setSpeechWaveActive] = useState<boolean>(false);

  // Simulated bike gyro tilt
  const [rollAngle, setRollAngle] = useState<number>(-4); // slight lean left for turn
  const [pitchAngle, setPitchAngle] = useState<number>(12); // camera horizon angle

  // Initialize Real Mobile Camera
  useEffect(() => {
    startLiveCamera();
    return () => {
      stopLiveCamera();
    };
  }, [cameraFacing]);

  const startLiveCamera = async () => {
    try {
      setCameraError(null);
      stopLiveCamera();

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: cameraFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
        setUseSimulationFeed(false);
      } else {
        throw new Error('เบราว์เซอร์ไม่รองรับการเข้าถึงกล้อง');
      }
    } catch (err: any) {
      console.warn('Camera access unavailable, activating realistic simulation feed:', err);
      setCameraActive(false);
      setUseSimulationFeed(true);
      setCameraError('ไม่พบกล้องสด หรือยังไม่ได้รับสิทธิ์ — ระบบสลับเข้าโหมดภาพเสมือนถนนจริง (Street POV Simulator) อัตโนมัติ');
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Flip Camera Front / Back
  const handleToggleCameraFacing = () => {
    if (audioEnabled) playTactileBlip(850);
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Speak AI Voice instruction
  const handleSpeakInstruction = (textToSpeak?: string) => {
    if (soundMuted) return;
    const msg = textToSpeak || getManeuverThaiSpoken(currentManeuver, arDistanceM, arStreetName);
    setSpeechWaveActive(true);
    speakThaiText(msg, selectedPersona, 1.05);
    setTimeout(() => {
      setSpeechWaveActive(false);
    }, 3500);
  };

  // Update maneuver and speak
  const selectManeuver = (maneuver: ARManeuverType, dist: number, street: string, landmark: string) => {
    if (audioEnabled) playTactileBlip(950);
    setCurrentManeuver(maneuver);
    setArDistanceM(dist);
    setArStreetName(street);
    setArLandmarkNotice(landmark);

    // Dynamic roll tilt for bike lean
    if (maneuver.includes('left')) setRollAngle(-7);
    else if (maneuver.includes('right')) setRollAngle(7);
    else setRollAngle(0);

    const speechText = getManeuverThaiSpoken(maneuver, dist, street);
    handleSpeakInstruction(speechText);
  };

  // Helper to construct natural Thai speech
  const getManeuverThaiSpoken = (m: ARManeuverType, dist: number, street: string) => {
    switch (m) {
      case 'turn_left':
        return `อีก ${dist} เมตร เลี้ยวซ้ายเข้า ${street} ระวังมอเตอร์ไซค์ทางขวา`;
      case 'slight_left':
        return `อีก ${dist} เมตร เบี่ยงซ้ายตามแนวเลนเลี่ยงรถติด`;
      case 'sharp_left':
        return `อีก ${dist} เมตร เลี้ยวหักศอกซ้ายเข้าปากซอยแคบ ชะลอความเร็วค่ะ`;
      case 'turn_right':
        return `อีก ${dist} เมตร เลี้ยวขวาที่แยกข้างหน้า มุ่งหน้า ${street}`;
      case 'slight_right':
        return `อีก ${dist} เมตร เบี่ยงขวาขึ้นสะพานข้ามแยก`;
      case 'sharp_right':
        return `อีก ${dist} เมตร เลี้ยวหักศอกขวาเข้าซอย`;
      case 'u_turn':
        return `อีก ${dist} เมตร ชิดขวาเตรียมกลับรถใต้สะพาน`;
      case 'arrived':
        return `คุณได้เดินทางถึงจุดหมาย ${street} เรียบร้อยแล้ว ขอให้เดินทางปลอดภัยค่ะ`;
      default:
        return `ตรงไปตามถนน ${street} อีก ${dist} เมตร`;
    }
  };

  // Filter styles
  const getFilterStyle = () => {
    switch (arFilterMode) {
      case 'cyber_neon':
        return 'contrast-125 saturate-150 brightness-105';
      case 'night_vision':
        return 'hue-rotate-[90deg] saturate-200 contrast-150 brightness-110 sepia';
      case 'thermal':
        return 'hue-rotate-[180deg] saturate-200 contrast-150 invert';
      default:
        return '';
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-slate-950 border-2 border-[#00D2FF] shadow-[0_0_50px_rgba(0,210,255,0.4)] flex flex-col select-none font-sans">
      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR: 3-WAY VIEW TOGGLES & PROMINENT CLOSE BUTTON */}
      {/* ========================================================================= */}
      <div className="relative z-30 px-3 py-2.5 bg-[#07132B]/95 backdrop-blur-md border-b border-[#00D2FF]/40 flex items-center justify-between flex-wrap gap-2 font-mono">
        <div className="flex items-center gap-2">
          {/* 3-WAY VIEW MODE TOGGLE BUTTONS */}
          <div className="flex items-center bg-black/70 p-1 rounded-2xl border border-cyan-400/50 shadow-[0_0_15px_rgba(0,210,255,0.3)]">
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                if (onSwitchToMap) onSwitchToMap();
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">แผนที่ 3D</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                if (onSwitchToGoogleMaps) onSwitchToGoogleMaps();
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Google Maps</span>
            </button>

            <button
              type="button"
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 shadow-[0_0_12px_#00D2FF] flex items-center gap-1.5 transition-all scale-102"
            >
              <Video className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>กล้องสด AR</span>
            </button>
          </div>

          {/* Camera live status badge */}
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] hidden md:flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{cameraActive ? 'กล้องหลังมือถือ (Live Video)' : 'โหมดภาพเสมือน (Street POV Sim)'}</span>
          </span>
        </div>

        {/* Right action controls & Close button */}
        <div className="flex items-center gap-2">
          {/* AI Voice Mute / Unmute */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              const nextMuted = !soundMuted;
              setSoundMuted(nextMuted);
              if (!nextMuted) handleSpeakInstruction();
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              !soundMuted 
                ? 'bg-purple-600/30 text-purple-200 border-purple-400/60 shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
            }`}
            title={soundMuted ? 'เปิดเสียง AI นำทาง' : 'ปิดเสียง AI นำทาง'}
          >
            {!soundMuted ? <Volume2 className="w-3.5 h-3.5 text-purple-300 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span className="text-[10px] hidden sm:inline">{!soundMuted ? 'เสียง AI: เปิด' : 'เสียง AI: ปิด'}</span>
          </button>

          {/* Camera Flip (Front/Back) */}
          <button
            type="button"
            onClick={handleToggleCameraFacing}
            className="p-1.5 rounded-xl bg-black/60 hover:bg-slate-800 text-cyan-300 border border-cyan-400/40 transition-colors"
            title="สลับกล้องหน้า / กล้องหลัง"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* PROMINENT CLOSE BUTTON (ปิดหน้าแผนที่นำทาง) */}
          {onClose && (
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(900);
                stopLiveCamera();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-110 text-white font-black text-xs shadow-[0_0_12px_rgba(244,63,94,0.5)] flex items-center gap-1.5 active:scale-95 transition-all"
              title="ปิดหน้าจอแผนที่นำทาง"
            >
              <X className="w-4 h-4 text-white" />
              <span>ปิดหน้าต่าง</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CAMERA & 3D AR VIEWPORT CONTAINER */}
      {/* ========================================================================= */}
      <div className="relative w-full h-[460px] sm:h-[520px] overflow-hidden bg-black flex items-center justify-center">
        
        {/* 1. REAL LIVE CAMERA VIDEO FEED */}
        {cameraActive && (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-all ${getFilterStyle()}`}
          />
        )}

        {/* 2. REALISTIC FALLBACK POV VIDEO / SIMULATION STREET FEED */}
        {(!cameraActive || useSimulationFeed) && (
          <div className={`absolute inset-0 w-full h-full z-0 overflow-hidden ${getFilterStyle()}`}>
            {/* Animated Bangkok Street Background (Perspective Road & Cityscape) */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#06142E] via-[#0B254E] to-[#040A18]" />
            
            {/* Street perspective lines */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,210,255,0.25)_0,transparent_70%)]" />
            
            {/* Asphault Road Surface Perspective */}
            <div 
              className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-b from-[#111A2E] via-[#0E1524] to-[#080B14] border-t border-cyan-500/30"
              style={{
                clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)'
              }}
            >
              {/* Moving road dashed lane markings */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 flex flex-col justify-around items-center">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-2.5 h-12 bg-amber-400 rounded-sm shadow-[0_0_12px_#F59E0B] opacity-85 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>

              {/* Alley turn opening visual cue (Left corner) */}
              {currentManeuver.includes('left') && (
                <div 
                  className="absolute left-0 bottom-10 w-44 h-28 bg-gradient-to-tr from-cyan-500/30 via-cyan-400/10 to-transparent border-l-2 border-cyan-400/60"
                  style={{ clipPath: 'polygon(0 0, 100% 40%, 80% 100%, 0% 100%)' }}
                >
                  <div className="p-2 text-[9px] font-mono text-cyan-300">
                    ⬅ ปากซอยสุขุมวิท 39
                  </div>
                </div>
              )}

              {/* Alley turn opening visual cue (Right corner) */}
              {currentManeuver.includes('right') && (
                <div 
                  className="absolute right-0 bottom-10 w-44 h-28 bg-gradient-to-tl from-cyan-500/30 via-cyan-400/10 to-transparent border-r-2 border-cyan-400/60"
                  style={{ clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 20% 100%)' }}
                >
                  <div className="p-2 text-[9px] font-mono text-cyan-300 text-right">
                    ปากซอยแยกพร้อมพงษ์ ➡
                  </div>
                </div>
              )}
            </div>

            {/* Distant Cyber City Skyline Silhouette */}
            <div className="absolute top-16 inset-x-0 h-32 flex items-end justify-around opacity-40 pointer-events-none">
              <div className="w-10 h-28 bg-[#00D2FF]/20 border border-[#00D2FF]/40 rounded-t-sm" />
              <div className="w-16 h-36 bg-[#00D2FF]/30 border border-[#00D2FF]/50 rounded-t-sm" />
              <div className="w-12 h-20 bg-amber-400/20 border border-amber-400/40 rounded-t-sm" />
              <div className="w-20 h-32 bg-blue-500/30 border border-blue-400/50 rounded-t-sm" />
              <div className="w-14 h-24 bg-cyan-400/20 border border-cyan-400/40 rounded-t-sm" />
            </div>

            {/* Motorcycle Cockpit Dashboard Overlay at the bottom */}
            <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black via-slate-950/90 to-transparent pointer-events-none z-10 flex items-center justify-center">
              <div className="w-72 h-14 rounded-t-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t-2 border-cyan-500/50 flex items-center justify-around px-4 shadow-[0_-5px_25px_rgba(0,210,255,0.3)]">
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>ECO MODE</span>
                </div>
                <div className="text-center font-mono">
                  <span className="text-lg font-black text-cyan-300">{currentSpeed}</span>
                  <span className="text-[9px] text-slate-400 ml-1">KM/H</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                  <Zap className="w-3.5 h-3.5" />
                  <span>96% BATT</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. AR CYBER SCANLINES OVERLAY */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,210,255,0.06)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none z-10 opacity-70" />

        {/* ========================================================================= */}
        {/* 4. AR STREET WAYPOINT GUIDANCE (ลูกศรเสมือน AR สีน้ำเงินนีออน 3D ลอยชี้ทิศทางเลี้ยว) */}
        {/* ========================================================================= */}
        <div 
          className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center transition-transform duration-300"
          style={{
            transform: `rotate(${rollAngle}deg)`
          }}
        >
          {/* FLOATING AR WAYPOINT HOLOCARD (ลอยเหนือลูกศรตรงจุดเลี้ยว) */}
          <div className="animate-bounce" style={{ animationDuration: '2.4s' }}>
            <div className="px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-md border-2 border-[#00D2FF] shadow-[0_0_30px_rgba(0,210,255,0.8)] text-center space-y-0.5 pointer-events-auto">
              <div className="flex items-center justify-center gap-1.5 text-xs font-black text-white font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00D2FF] animate-ping" />
                <span className="text-[#00D2FF] uppercase tracking-wider">AR Street Waypoint:</span>
                <span className="text-amber-300">อีก {arDistanceM} เมตร</span>
              </div>
              <p className="text-sm font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {currentManeuver === 'turn_left' && '⬅ เลี้ยวซ้ายเข้า '}
                {currentManeuver === 'slight_left' && '↖ เบี่ยงซ้ายเข้า '}
                {currentManeuver === 'sharp_left' && '⮢ หักศอกซ้ายเข้า '}
                {currentManeuver === 'turn_right' && '➡ เลี้ยวขวาเข้า '}
                {currentManeuver === 'slight_right' && '↗ เบี่ยงขวาเข้า '}
                {currentManeuver === 'sharp_right' && '⮣ หักศอกขวาเข้า '}
                {currentManeuver === 'u_turn' && '↩ กลับรถที่ '}
                {currentManeuver === 'arrived' && '🏁 ถึงจุดหมาย '}
                {currentManeuver === 'straight' && '⬆ ตรงไปตามแนว '}
                {arStreetName}
              </p>
              <span className="text-[10px] text-cyan-200/90 font-mono block">
                {arLandmarkNotice}
              </span>
            </div>

            {/* Vertical holographic laser tether linking card to ground arrow */}
            <div className="w-0.5 h-10 bg-gradient-to-b from-[#00D2FF] via-cyan-400 to-transparent mx-auto opacity-80" />
          </div>

          {/* 3D NEON BLUE AR TURN ARROW PROJECTED ONTO ROAD SURFACE */}
          <div 
            className="relative flex flex-col items-center justify-center transition-all duration-500"
            style={{
              perspective: '600px',
              perspectiveOrigin: '50% 60%',
              transform: `perspective(600px) rotateX(${50 + pitchAngle}deg) scale(1.15)`
            }}
          >
            {/* Ground Pulsing Target Ring on Asphalt */}
            <div className="absolute w-44 h-44 rounded-full border-2 border-cyan-400/50 shadow-[0_0_35px_rgba(0,210,255,0.7)] animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute w-28 h-28 rounded-full border border-cyan-300/40 bg-cyan-400/10" />

            {/* AR NEON CHEVRONS / ARROW CHASE FLOWING ALONG THE ROAD */}
            <div className={`relative flex flex-col items-center transition-transform duration-500 ${
              currentManeuver === 'turn_left' ? '-rotate-45 translate-x-[-40px]' :
              currentManeuver === 'slight_left' ? '-rotate-25 translate-x-[-20px]' :
              currentManeuver === 'sharp_left' ? '-rotate-75 translate-x-[-60px]' :
              currentManeuver === 'turn_right' ? 'rotate-45 translate-x-[40px]' :
              currentManeuver === 'slight_right' ? 'rotate-25 translate-x-[20px]' :
              currentManeuver === 'sharp_right' ? 'rotate-75 translate-x-[60px]' :
              currentManeuver === 'u_turn' ? 'rotate-180' :
              'rotate-0'
            }`}>
              {/* Giant 3D Neon Arrow Head */}
              <div className="relative">
                <svg 
                  width="130" 
                  height="130" 
                  viewBox="0 0 100 100" 
                  className="filter drop-shadow-[0_0_25px_#00D2FF]"
                >
                  {/* Outer Neon Glow Arrow Path */}
                  <polygon 
                    points="50,5 95,65 65,65 65,95 35,95 35,65 5,65" 
                    fill="url(#neonBlueGrad)" 
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
                    <linearGradient id="neonBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="35%" stopColor="#00D2FF" />
                      <stop offset="100%" stopColor="#0066FF" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Pulsing light rings around arrow */}
                <div className="absolute inset-0 rounded-full border-4 border-cyan-300 opacity-60 animate-ping" style={{ animationDuration: '1.6s' }} />
              </div>

              {/* Streaming Chevrons behind main arrow */}
              <div className="flex flex-col items-center gap-1.5 -mt-2">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="w-16 h-3 bg-gradient-to-r from-transparent via-[#00D2FF] to-transparent shadow-[0_0_15px_#00D2FF] opacity-80"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 100%, 80% 100%, 50% 35%, 20% 100%, 0% 100%)',
                      animation: `pulse 1.2s infinite ease-in-out ${idx * 0.2}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. TACTICAL HUD OVERLAYS: SPEEDOMETER, HORIZON, COMPASS */}
        {/* ========================================================================= */}

        {/* Artificial Horizon Gyro Lines (Left & Right) */}
        {showArtificialHorizon && (
          <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-between px-6 opacity-60">
            <div 
              className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#00D2FF] to-white transition-transform duration-300 flex items-center"
              style={{ transform: `rotate(${rollAngle}deg)` }}
            >
              <span className="text-[8px] font-mono text-cyan-300 -top-3 relative">-10°</span>
            </div>
            <div 
              className="w-24 h-0.5 bg-gradient-to-l from-transparent via-[#00D2FF] to-white transition-transform duration-300 flex items-center justify-end"
              style={{ transform: `rotate(${rollAngle}deg)` }}
            >
              <span className="text-[8px] font-mono text-cyan-300 -top-3 relative">+10°</span>
            </div>
          </div>
        )}

        {/* Top Left: Live Maneuver & Distance HUD Banner */}
        <div className="absolute top-3 left-3 z-25 max-w-xs p-3 rounded-2xl bg-[#06132D]/90 border border-cyan-400/50 shadow-xl backdrop-blur-md space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00D2FF] text-slate-950 flex items-center justify-center font-black shadow-[0_0_12px_#00D2FF]">
              {currentManeuver.includes('left') ? <CornerUpLeft className="w-5 h-5" /> : currentManeuver.includes('right') ? <CornerUpRight className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-300 block uppercase">
                คำสั่งเลี้ยวถัดไป (NEXT MANEUVER)
              </span>
              <h4 className="text-xs font-black text-white leading-tight">
                {currentManeuver === 'turn_left' ? 'เลี้ยวซ้ายเข้าซอย' : currentManeuver === 'turn_right' ? 'เลี้ยวขวาแยกหน้า' : 'ตรงไปตามแนวเลน'}
              </h4>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono">
            <span className="text-slate-300">ระยะทางถึงจุดเลี้ยว:</span>
            <span className="text-[#00D2FF] font-black text-xs">{arDistanceM} ม.</span>
          </div>
        </div>

        {/* Top Right: Compass & Gyro Heading */}
        <div className="absolute top-3 right-3 z-25 p-2.5 rounded-2xl bg-[#06132D]/90 border border-cyan-400/50 shadow-xl backdrop-blur-md text-right font-mono space-y-1">
          <div className="flex items-center gap-2 justify-end">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '18s' }} />
            <span className="text-xs font-black text-white">{liveHeading}° ตะวันออกเฉียงเหนือ</span>
          </div>
          <div className="text-[10px] text-slate-300">
            <span>ความกว้างซอย: </span>
            <strong className="text-emerald-400 font-bold">2.4 ม. (ผ่านสบาย)</strong>
          </div>
          <div className="text-[10px] text-amber-300 flex items-center gap-1 justify-end">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>AI เลี่ยงตรอกตัน 100%</span>
          </div>
        </div>

        {/* Bottom Left: Speedometer Gauge */}
        {showSpeedometer && (
          <div className="absolute bottom-16 left-3 z-25 p-3 rounded-2xl bg-[#06132D]/90 border border-cyan-400/50 shadow-xl backdrop-blur-md flex items-center gap-3 font-mono">
            <div className="text-center">
              <span className="text-2xl sm:text-3xl font-black text-cyan-300 leading-none block drop-shadow-[0_0_10px_#00D2FF]">
                {currentSpeed}
              </span>
              <span className="text-[9px] text-slate-400 block uppercase tracking-wider">KM / H</span>
            </div>
            <div className="text-[10px] space-y-0.5 border-l border-white/10 pl-2.5">
              <div className="text-slate-300">จำกัดความเร็วซอย:</div>
              <div className="text-amber-400 font-bold">ไม่เกิน 40 km/h</div>
              <div className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>ปลอดภัย</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Right: Real-time AI Voice Guidance Controller Banner */}
        <div className="absolute bottom-16 right-3 z-25 p-2.5 rounded-2xl bg-gradient-to-r from-purple-950/90 via-[#07132B]/90 to-black/90 border border-purple-400/60 shadow-xl backdrop-blur-md flex items-center gap-2.5 font-mono">
          <button
            type="button"
            onClick={() => handleSpeakInstruction()}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-[0_0_12px_#A855F7] flex items-center gap-1.5 active:scale-95 transition-all"
            title="กดเพื่อให้ AI พูดนำทางทันที"
          >
            <Volume2 className={`w-4 h-4 text-purple-200 ${speechWaveActive ? 'animate-bounce' : ''}`} />
            <span>ฟังเสียง AI นำทาง</span>
          </button>
          
          <div className="hidden sm:block text-[10px] text-purple-200">
            <span>เสียง: <strong>{AI_VOICE_PERSONAS.find(p => p.id === selectedPersona)?.name.split(' ')[0] || 'ฟ้าใส'}</strong></span>
          </div>
        </div>

        {/* Center Bottom: Lane Clearance Laser Beams */}
        {showLaneGuidingBeams && (
          <div className="absolute bottom-4 inset-x-1/4 h-8 pointer-events-none z-15 flex items-center justify-between">
            <div className="w-20 h-0.5 bg-cyan-400 shadow-[0_0_12px_#00D2FF] -rotate-12" />
            <span className="text-[8px] font-mono text-cyan-300 bg-black/60 px-1 rounded border border-cyan-400/40">
              เลนวิ่งมอเตอร์ไซค์ชัดเจน
            </span>
            <div className="w-20 h-0.5 bg-cyan-400 shadow-[0_0_12px_#00D2FF] rotate-12" />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. INTERACTIVE AR WAYPOINT & MANEUVER TEST CONTROLS (สำหรับสายเทคโนโลยี) */}
      {/* ========================================================================= */}
      <div className="p-3 bg-[#061226] border-t border-cyan-500/40 space-y-2.5 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
            <Sparkles className="w-4 h-4 text-[#00D2FF]" />
            <span>สลับทดสอบมุมเลี้ยว AR (AR 3D Waypoint Simulator):</span>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            {/* Filter buttons */}
            <span className="text-slate-400">ฟิลเตอร์กล้อง:</span>
            {[
              { id: 'cyber_neon', label: 'นีออนไซเบอร์' },
              { id: 'standard', label: 'ภาพจริงสด' },
              { id: 'night_vision', label: 'Night Vision' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(750);
                  setArFilterMode(f.id as any);
                }}
                className={`px-2 py-0.5 rounded-lg border transition-all ${
                  arFilterMode === f.id
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
                    : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Maneuver Scenario Quick Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => selectManeuver('turn_left', 45, 'ซอยสุขุมวิท 39 (พร้อมพงษ์)', 'จุดสังเกต: ซอยข้างศูนย์การค้าเอ็มควอเทียร์')}
            className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
              currentManeuver === 'turn_left'
                ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 font-black border-white shadow-[0_0_12px_#00D2FF]'
                : 'bg-black/40 text-slate-300 border-white/10 hover:border-cyan-400/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CornerUpLeft className="w-4 h-4" />
              <span>เลี้ยวซ้ายเข้าซอย</span>
            </div>
            <span className="text-[10px] font-mono">45ม.</span>
          </button>

          <button
            type="button"
            onClick={() => selectManeuver('straight', 180, 'ถนนสุขุมวิทมุ่งหน้าอโศก', 'ตรงไปตามแนวรางรถไฟฟ้า BTS')}
            className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
              currentManeuver === 'straight'
                ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 font-black border-white shadow-[0_0_12px_#00D2FF]'
                : 'bg-black/40 text-slate-300 border-white/10 hover:border-cyan-400/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ArrowUp className="w-4 h-4" />
              <span>ตรงไปแนวเลน</span>
            </div>
            <span className="text-[10px] font-mono">180ม.</span>
          </button>

          <button
            type="button"
            onClick={() => selectManeuver('turn_right', 60, 'สี่แยกอโศกมนตรี', 'จุดสังเกต: อาคาร Exchange Tower')}
            className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
              currentManeuver === 'turn_right'
                ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 font-black border-white shadow-[0_0_12px_#00D2FF]'
                : 'bg-black/40 text-slate-300 border-white/10 hover:border-cyan-400/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CornerUpRight className="w-4 h-4" />
              <span>เลี้ยวขวาสี่แยก</span>
            </div>
            <span className="text-[10px] font-mono">60ม.</span>
          </button>

          <button
            type="button"
            onClick={() => selectManeuver('sharp_left', 20, 'ซอยลัดประสานมิตร (แคบ 1.8ม.)', 'ระวังเสาไฟและกระถางต้นไม้ปากซอย')}
            className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
              currentManeuver === 'sharp_left'
                ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 font-black border-white shadow-[0_0_12px_#00D2FF]'
                : 'bg-black/40 text-slate-300 border-white/10 hover:border-cyan-400/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CornerUpLeft className="w-4 h-4 text-amber-400" />
              <span>โค้งหักศอกแคบ</span>
            </div>
            <span className="text-[10px] font-mono text-amber-300">20ม.</span>
          </button>

          <button
            type="button"
            onClick={() => selectManeuver('arrived', 0, activeJob?.dropoffLocation || 'คอนโด เดอะ เบส สุขุมวิท', 'ถึงจุดหมายปลายทางเรียบร้อย')}
            className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
              currentManeuver === 'arrived'
                ? 'bg-gradient-to-r from-emerald-400 to-green-600 text-slate-950 font-black border-white shadow-[0_0_12px_#10B981]'
                : 'bg-black/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-950/40'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>ถึงจุดหมาย 🏁</span>
            </div>
            <span className="text-[10px] font-mono">0ม.</span>
          </button>
        </div>

        {/* Persona Voice selector & Audio speaker prompt */}
        <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">เลือกเสียง AI:</span>
            <div className="flex flex-wrap gap-1">
              {AI_VOICE_PERSONAS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setSelectedPersona(p.id);
                    speakThaiText(`เปลี่ยนเสียง AI นำทางเป็นคุณ ${p.name.split(' ')[0]} เรียบร้อยแล้วค่ะ`, p.id, 1.05);
                  }}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] transition-all ${
                    selectedPersona === p.id
                      ? 'bg-purple-600 text-white font-bold border-purple-300 shadow-md'
                      : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {p.icon} {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-cyan-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>AR Street Waypoint Guidance Active • WINRIDER.AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
