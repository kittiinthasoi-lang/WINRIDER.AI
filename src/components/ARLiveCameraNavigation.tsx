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
  ChevronRight,
  Play,
  Pause,
  Flashlight
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
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [streamResolution, setStreamResolution] = useState<string>('1080p @ 60FPS');

  // AR Navigation Maneuver state
  const [currentManeuver, setCurrentManeuver] = useState<ARManeuverType>('turn_left');
  const [arDistanceM, setArDistanceM] = useState<number>(remainingDistM || 45);
  const [arStreetName, setArStreetName] = useState<string>('ซอยสุขุมวิท 39 (พร้อมพงษ์)');
  const [arLandmarkNotice, setArLandmarkNotice] = useState<string>('จุดสังเกต: ซอยข้างศูนย์การค้าเอ็มควอเทียร์');

  // AR Visual Filter modes & HUD switches
  const [arFilterMode, setArFilterMode] = useState<'cyber_neon' | 'standard' | 'night_vision' | 'thermal'>('cyber_neon');
  const [showArtificialHorizon, setShowArtificialHorizon] = useState<boolean>(true);
  const [showLaneGuidingBeams, setShowLaneGuidingBeams] = useState<boolean>(true);
  const [showSpeedometer, setShowSpeedometer] = useState<boolean>(true);
  const [soundMuted, setSoundMuted] = useState<boolean>(!voiceGuidanceEnabled);
  const [selectedPersona, setSelectedPersona] = useState<AIVoicePersona>(voicePersona);
  const [speechWaveActive, setSpeechWaveActive] = useState<boolean>(false);
  const [isImmersive, setIsImmersive] = useState<boolean>(false);

  // Real Gyroscope / Bike Tilt
  const [rollAngle, setRollAngle] = useState<number>(-4); // lean left for turn
  const [pitchAngle, setPitchAngle] = useState<number>(12); // camera horizon angle
  const [gyroSyncActive, setGyroSyncActive] = useState<boolean>(true);

  // Auto-approach Distance Simulation
  const [isApproachingAuto, setIsApproachingAuto] = useState<boolean>(false);

  // Listen to Mobile DeviceOrientation Event (Real Mobile Gyroscope)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!gyroSyncActive) return;
      if (e.gamma !== null && Math.abs(e.gamma) <= 80) {
        // gamma is left/right roll (-90 to 90 deg)
        const clampedRoll = Math.max(-20, Math.min(20, Math.round(e.gamma / 2.5)));
        setRollAngle(clampedRoll);
      }
      if (e.beta !== null && e.beta >= 10 && e.beta <= 85) {
        // beta is pitch angle (front to back)
        const clampedPitch = Math.max(-10, Math.min(25, Math.round((e.beta - 45) / 2)));
        setPitchAngle(clampedPitch);
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [gyroSyncActive]);

  // Initialize Real Mobile Camera on Mount & on Facing Flip
  useEffect(() => {
    startLiveCamera();
    return () => {
      stopLiveCamera();
    };
  }, [cameraFacing]);

  // Keep video element attached to stream whenever camera becomes active or element mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive, cameraFacing]);

  // Auto-approach Simulation Timer
  useEffect(() => {
    if (!isApproachingAuto) return;
    const interval = setInterval(() => {
      setArDistanceM(prev => {
        if (prev <= 5) {
          // Trigger arrived or turn now
          handleSpeakInstruction(`ถึงจุดเลี้ยว ${arStreetName} แล้ว เลี้ยวทันทีค่ะ!`);
          setIsApproachingAuto(false);
          if (onAdvanceTripStep) onAdvanceTripStep();
          return 0;
        }
        const nextDist = Math.max(0, prev - 5);
        if (nextDist === 15) {
          handleSpeakInstruction(`อีก 15 เมตร เตรียมเลี้ยว ชะลอความเร็วค่ะ`);
        }
        return nextDist;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [isApproachingAuto, arStreetName, onAdvanceTripStep]);

  const startLiveCamera = async () => {
    try {
      setCameraError(null);
      stopLiveCamera();

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream: MediaStream | null = null;
        try {
          // 1. Try ideal environment/user facing with 1080p target
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: cameraFacing },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          });
        } catch (_err1) {
          try {
            // 2. Fallback to basic facingMode constraint
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: cameraFacing },
              audio: false
            });
          } catch (_err2) {
            // 3. Fallback to any available video input
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          }
        }

        if (!stream) throw new Error('ไม่สามารถรับสัญญาณภาพจากกล้องได้');

        streamRef.current = stream;
        setCameraActive(true);
        setUseSimulationFeed(false);

        // Detect torch support
        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps = track.getCapabilities ? (track.getCapabilities() as any) : null;
          if (caps && caps.torch) {
            setTorchSupported(true);
          } else {
            setTorchSupported(false);
          }

          // Read resolution settings
          const settings = track.getSettings ? track.getSettings() : null;
          if (settings && settings.width && settings.height) {
            setStreamResolution(`${settings.width}x${settings.height} @ ${Math.round(settings.frameRate || 60)}FPS`);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (e) {
            console.log('Video play caught:', e);
          }
        }
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
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchActive(false);
  };

  // Toggle Flashlight / Torch
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchActive;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchActive(nextState);
        if (audioEnabled) playTactileBlip(nextState ? 950 : 700);
      } catch (err) {
        console.warn('Torch toggle error:', err);
      }
    }
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

    // Dynamic roll tilt for bike lean if gyro is not active
    if (!gyroSyncActive) {
      if (maneuver.includes('left')) setRollAngle(-7);
      else if (maneuver.includes('right')) setRollAngle(7);
      else setRollAngle(0);
    }

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

  // Proximity Alert State
  const isCloseToTurn = arDistanceM <= 20;
  const isTurnImmediate = arDistanceM <= 10;

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden bg-slate-950 border-2 border-[#00D2FF] shadow-[0_0_50px_rgba(0,210,255,0.4)] flex flex-col select-none font-sans transition-all duration-300 ${
      isImmersive ? 'fixed inset-0 z-50 rounded-none border-none' : ''
    }`}>
      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR: 3-WAY VIEW TOGGLES & PROMINENT CONTROLS */}
      {/* ========================================================================= */}
      <div className="relative z-30 px-3 py-2.5 bg-[#07132B]/95 backdrop-blur-md border-b border-[#00D2FF]/40 flex items-center justify-between flex-wrap gap-2 font-mono">
        <div className="flex items-center gap-2 flex-wrap">
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
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 shadow-[0_0_15px_#00D2FF] flex items-center gap-1.5 transition-all"
            >
              <Video className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>กล้องสด AR</span>
            </button>
          </div>

          {/* Camera live status badge with resolution */}
          <div className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] hidden md:flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{cameraActive ? `📷 กล้องสดมือถือ (${streamResolution})` : 'โหมดภาพเสมือน (Street POV Sim)'}</span>
          </div>
        </div>

        {/* Right action controls & Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Torch / Flashlight button for night driving */}
          {torchSupported && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                torchActive 
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_15px_#F59E0B]' 
                  : 'bg-black/60 text-slate-300 border-white/20 hover:text-white'
              }`}
              title="เปิด/ปิด ไฟฉายส่องทางสำหรับขับขี่กลางคืน"
            >
              <Zap className={`w-3.5 h-3.5 ${torchActive ? 'fill-slate-950' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">{torchActive ? 'ไฟฉาย: เปิด' : 'ไฟฉาย: ปิด'}</span>
            </button>
          )}

          {/* Gyro Sync Toggle */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setGyroSyncActive(prev => !prev);
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
              gyroSyncActive
                ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/60 shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                : 'bg-black/40 text-slate-500 border-white/10'
            }`}
            title="เปิด/ปิด การซิงค์การเอียงมือถือ (Device Gyro Tilt)"
          >
            <Compass className={`w-3.5 h-3.5 ${gyroSyncActive ? 'text-cyan-300 animate-spin' : 'text-slate-500'}`} style={{ animationDuration: '10s' }} />
            <span className="hidden sm:inline">{gyroSyncActive ? 'ไจโร: เปิด' : 'ไจโร: ปิด'}</span>
          </button>

          {/* AI Voice Mute / Unmute */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              const nextMuted = !soundMuted;
              setSoundMuted(nextMuted);
              if (!nextMuted) handleSpeakInstruction();
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
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

          {/* Immersive Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setIsImmersive(prev => !prev);
            }}
            className="p-1.5 rounded-xl bg-black/60 hover:bg-slate-800 text-cyan-300 border border-cyan-400/40 transition-colors"
            title={isImmersive ? 'ย่อหน้าจอ AR' : 'ขยายเต็มจอสำหรับขับขี่'}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* PROMINENT CLOSE BUTTON */}
          {onClose && (
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(900);
                stopLiveCamera();
                onClose();
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-110 text-white font-black text-xs shadow-[0_0_12px_rgba(244,63,94,0.5)] flex items-center gap-1 active:scale-95 transition-all"
              title="ปิดหน้าต่างแผนที่นำทาง"
            >
              <X className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">ปิด</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CAMERA & 3D AR VIEWPORT CONTAINER (ภาพกล้องมือถือสด + ซ้อนลูกศร AR 3D) */}
      {/* ========================================================================= */}
      <div className={`relative w-full overflow-hidden bg-black flex items-center justify-center transition-all ${
        isImmersive ? 'h-[85vh]' : 'h-[480px] sm:h-[560px]'
      }`}>
        
        {/* 1. REAL LIVE CAMERA VIDEO FEED (Mounted in DOM with full mobile compatibility) */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          // @ts-ignore
          webkit-playsinline="true"
          controls={false}
          disablePictureInPicture
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive ? 'z-0 opacity-100' : 'z-[-1] opacity-0 pointer-events-none'
          } ${getFilterStyle()}`}
        />

        {/* Real-time Camera status indicator & retry button */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-auto">
          {cameraActive ? (
            <div className="px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.4)] flex items-center gap-2 text-[11px] font-mono font-bold text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>📷 ภาพกล้องสดมือถือเรียลไทม์ (Live Mobile AR Active)</span>
            </div>
          ) : (
            <button
              onClick={() => startLiveCamera()}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>กดเปิดกล้องสดมือถือ (เชื่อมต่อกล้อง)</span>
            </button>
          )}
        </div>

        {/* 2. REALISTIC FALLBACK POV VIDEO / SIMULATION STREET FEED (shown if camera is off or denied) */}
        {(!cameraActive || useSimulationFeed) && (
          <div className={`absolute inset-0 w-full h-full z-0 overflow-hidden ${getFilterStyle()}`}>
            <div className="absolute inset-0 bg-gradient-to-b from-[#06142E] via-[#0B254E] to-[#040A18]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,210,255,0.25)_0,transparent_70%)]" />
            
            {/* Asphalt Road Surface Perspective */}
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
                  className="absolute left-0 bottom-10 w-48 h-32 bg-gradient-to-tr from-cyan-500/30 via-cyan-400/10 to-transparent border-l-2 border-cyan-400/60"
                  style={{ clipPath: 'polygon(0 0, 100% 40%, 80% 100%, 0% 100%)' }}
                >
                  <div className="p-2 text-[10px] font-mono text-cyan-300 font-bold">
                    ⬅ ปากซอยสุขุมวิท 39
                  </div>
                </div>
              )}

              {/* Alley turn opening visual cue (Right corner) */}
              {currentManeuver.includes('right') && (
                <div 
                  className="absolute right-0 bottom-10 w-48 h-32 bg-gradient-to-tl from-cyan-500/30 via-cyan-400/10 to-transparent border-r-2 border-cyan-400/60"
                  style={{ clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 20% 100%)' }}
                >
                  <div className="p-2 text-[10px] font-mono text-cyan-300 text-right font-bold">
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

            {/* Motorcycle Cockpit Dashboard Overlay */}
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
        {/* 4. 3D AR STREET WAYPOINT GUIDANCE (ลูกศรเสมือน AR 3D นีออนซ้อนทับภาพกล้องจริง) */}
        {/* ========================================================================= */}
        <div 
          className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center transition-transform duration-300"
          style={{
            transform: `rotate(${rollAngle}deg)`
          }}
        >
          {/* FLOATING AR WAYPOINT HOLOCARD (ลอยเหนือลูกศรตรงจุดเลี้ยว) */}
          <div className="animate-bounce" style={{ animationDuration: '2.4s' }}>
            <div className={`px-4 py-2 rounded-2xl backdrop-blur-md border-2 shadow-[0_0_35px_rgba(0,210,255,0.8)] text-center space-y-0.5 pointer-events-auto transition-all ${
              isTurnImmediate
                ? 'bg-rose-950/90 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.9)] animate-pulse'
                : isCloseToTurn
                ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.8)]'
                : 'bg-black/85 border-[#00D2FF]'
            }`}>
              <div className="flex items-center justify-center gap-1.5 text-xs font-black font-mono">
                <span className={`w-2.5 h-2.5 rounded-full animate-ping ${isTurnImmediate ? 'bg-rose-400' : isCloseToTurn ? 'bg-amber-400' : 'bg-[#00D2FF]'}`} />
                <span className={`uppercase tracking-wider ${isTurnImmediate ? 'text-rose-300' : isCloseToTurn ? 'text-amber-300' : 'text-[#00D2FF]'}`}>
                  {isTurnImmediate ? '🚨 เลี้ยวทันที (TURN NOW):' : isCloseToTurn ? '⚠️ ชะลอความเร็ว (SLOW DOWN):' : 'AR Waypoint:'}
                </span>
                <span className="text-white font-black">อีก {arDistanceM} เมตร</span>
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
            <div className={`w-0.5 h-10 mx-auto opacity-80 ${
              isTurnImmediate 
                ? 'bg-gradient-to-b from-rose-400 via-rose-500 to-transparent' 
                : 'bg-gradient-to-b from-[#00D2FF] via-cyan-400 to-transparent'
            }`} />
          </div>

          {/* 3D NEON BLUE AR TURN ARROW PROJECTED ONTO ROAD SURFACE OVER CAMERA FEED */}
          <div 
            className="relative flex flex-col items-center justify-center transition-all duration-500"
            style={{
              perspective: '600px',
              perspectiveOrigin: '50% 60%',
              transform: `perspective(600px) rotateX(${50 + pitchAngle}deg) scale(${isTurnImmediate ? 1.4 : isCloseToTurn ? 1.25 : 1.1})`
            }}
          >
            {/* Ground Pulsing Target Ring on Asphalt */}
            <div className={`absolute rounded-full border-2 animate-ping ${
              isTurnImmediate
                ? 'w-56 h-56 border-rose-400/80 shadow-[0_0_40px_rgba(244,63,94,0.9)]'
                : 'w-48 h-48 border-cyan-400/60 shadow-[0_0_35px_rgba(0,210,255,0.8)]'
            }`} style={{ animationDuration: isTurnImmediate ? '1s' : '2s' }} />
            
            <div className="absolute w-28 h-28 rounded-full border border-cyan-300/50 bg-cyan-400/15" />

            {/* AR NEON CHEVRONS / ARROW CHASE FLOWING ALONG THE ROAD */}
            <div className={`relative flex flex-col items-center transition-transform duration-500 ${
              currentManeuver === 'turn_left' ? '-rotate-45 translate-x-[-45px]' :
              currentManeuver === 'slight_left' ? '-rotate-25 translate-x-[-22px]' :
              currentManeuver === 'sharp_left' ? '-rotate-75 translate-x-[-65px]' :
              currentManeuver === 'turn_right' ? 'rotate-45 translate-x-[45px]' :
              currentManeuver === 'slight_right' ? 'rotate-25 translate-x-[22px]' :
              currentManeuver === 'sharp_right' ? 'rotate-75 translate-x-[65px]' :
              currentManeuver === 'u_turn' ? 'rotate-180' :
              'rotate-0'
            }`}>
              {/* Giant 3D Neon Arrow Head */}
              <div className="relative">
                <svg 
                  width="140" 
                  height="140" 
                  viewBox="0 0 100 100" 
                  className={`filter ${isTurnImmediate ? 'drop-shadow-[0_0_30px_#F43F5E]' : 'drop-shadow-[0_0_30px_#00D2FF]'}`}
                >
                  {/* Outer Neon Glow Arrow Path */}
                  <polygon 
                    points="50,5 95,65 65,65 65,95 35,95 35,65 5,65" 
                    fill={isTurnImmediate ? "url(#neonRoseGrad)" : "url(#neonBlueGrad)"} 
                    stroke="#FFFFFF" 
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    className="animate-pulse"
                  />
                  {/* Inner Highlight Chevron */}
                  <polygon 
                    points="50,22 80,60 60,60 60,85 40,85 40,60 20,60" 
                    fill={isTurnImmediate ? "#FDA4AF" : "#00E5FF"} 
                    opacity="0.9"
                  />
                  <defs>
                    <linearGradient id="neonBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="35%" stopColor="#00D2FF" />
                      <stop offset="100%" stopColor="#0066FF" />
                    </linearGradient>
                    <linearGradient id="neonRoseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="35%" stopColor="#F43F5E" />
                      <stop offset="100%" stopColor="#BE123C" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Pulsing light rings around arrow */}
                <div className={`absolute inset-0 rounded-full border-4 opacity-60 animate-ping ${
                  isTurnImmediate ? 'border-rose-400' : 'border-cyan-300'
                }`} style={{ animationDuration: '1.4s' }} />
              </div>

              {/* Streaming Chevrons behind main arrow (3 levels) */}
              <div className="flex flex-col items-center gap-1.5 -mt-2">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className={`w-20 h-3.5 bg-gradient-to-r from-transparent via-[#00D2FF] to-transparent shadow-[0_0_15px_#00D2FF] opacity-85 ${
                      isTurnImmediate ? 'via-rose-400 shadow-[0_0_15px_#F43F5E]' : ''
                    }`}
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
          <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-between px-6 opacity-70">
            <div 
              className="w-28 h-0.5 bg-gradient-to-r from-transparent via-[#00D2FF] to-white transition-transform duration-300 flex items-center"
              style={{ transform: `rotate(${rollAngle}deg)` }}
            >
              <span className="text-[9px] font-mono text-cyan-300 -top-3.5 relative font-bold">-10°</span>
            </div>
            <div 
              className="w-28 h-0.5 bg-gradient-to-l from-transparent via-[#00D2FF] to-white transition-transform duration-300 flex items-center justify-end"
              style={{ transform: `rotate(${rollAngle}deg)` }}
            >
              <span className="text-[9px] font-mono text-cyan-300 -top-3.5 relative font-bold">+10°</span>
            </div>
          </div>
        )}

        {/* Top Left: Live Maneuver & Distance HUD Banner */}
        <div className="absolute top-3 left-3 z-25 max-w-xs p-3 rounded-2xl bg-[#06132D]/90 border border-cyan-400/50 shadow-xl backdrop-blur-md space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl text-slate-950 flex items-center justify-center font-black shadow-lg ${
              isTurnImmediate ? 'bg-rose-400 shadow-[0_0_12px_#F43F5E]' : 'bg-[#00D2FF] shadow-[0_0_12px_#00D2FF]'
            }`}>
              {currentManeuver.includes('left') ? <CornerUpLeft className="w-5 h-5" /> : currentManeuver.includes('right') ? <CornerUpRight className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-300 block uppercase">
                คำสั่งเลี้ยวถัดไป (NEXT MANEUVER)
              </span>
              <h4 className="text-xs font-black text-white leading-tight">
                {currentManeuver === 'turn_left' ? 'เลี้ยวซ้ายเข้าซอย' : currentManeuver === 'turn_right' ? 'เลี้ยวขวาแยกหน้า' : currentManeuver === 'straight' ? 'ตรงไปตามแนวเลน' : 'ปฏิบัติตามลูกศร AR'}
              </h4>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono">
            <span className="text-slate-300">ระยะทางถึงจุดเลี้ยว:</span>
            <span className={`font-black text-xs ${isTurnImmediate ? 'text-rose-400 animate-pulse' : 'text-[#00D2FF]'}`}>{arDistanceM} ม.</span>
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

        {/* Bottom Right: Mini Map PIP & Real-time AI Voice Guidance Controller */}
        <div className="absolute bottom-16 right-3 z-25 flex flex-col items-end gap-2 font-mono">
          {/* Mini 3D Map PIP Radar (แสดงแผนที่ซ้อนคู่กับกล้องสด) */}
          {onSwitchToMap && (
            <div 
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                onSwitchToMap();
              }}
              className="group cursor-pointer w-28 h-24 sm:w-32 sm:h-28 rounded-2xl overflow-hidden bg-black/85 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(0,210,255,0.5)] relative transition-all hover:scale-105 active:scale-95"
              title="แตะเพื่อสลับกลับหน้าจอแผนที่ 3D หลัก"
            >
              <div className="absolute inset-0 bg-[#07132B]">
                <svg className="w-full h-full opacity-60" viewBox="0 0 100 100">
                  <path d="M 10 50 L 90 50" stroke="#00D2FF" strokeWidth="4" />
                  <path d="M 50 10 L 50 90" stroke="#00D2FF" strokeWidth="4" />
                  <path d="M 25 30 L 75 70" stroke="#FFD700" strokeWidth="3" strokeDasharray="4 2" />
                  <circle cx="50" cy="50" r="6" fill="#10B981" />
                </svg>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="absolute bottom-1 inset-x-1 px-1.5 py-0.5 rounded-lg bg-black/80 text-[8px] font-bold text-cyan-300 text-center flex items-center justify-center gap-1">
                <Layers className="w-2.5 h-2.5 text-[#00D2FF]" />
                <span>แผนที่ 3D (แตะขยาย)</span>
              </div>
            </div>
          )}

          <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-purple-950/90 via-[#07132B]/90 to-black/90 border border-purple-400/60 shadow-xl backdrop-blur-md flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSpeakInstruction()}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] sm:text-xs font-bold shadow-[0_0_12px_#A855F7] flex items-center gap-1.5 active:scale-95 transition-all"
              title="กดเพื่อให้ AI พูดนำทางทันที"
            >
              <Volume2 className={`w-3.5 h-3.5 text-purple-200 ${speechWaveActive ? 'animate-bounce' : ''}`} />
              <span>ฟังเสียง AI</span>
            </button>
            
            <div className="hidden sm:block text-[10px] text-purple-200">
              <span>เสียง: <strong>{AI_VOICE_PERSONAS.find(p => p.id === selectedPersona)?.name.split(' ')[0] || 'ฟ้าใส'}</strong></span>
            </div>
          </div>
        </div>

        {/* Center Bottom: Lane Clearance Laser Beams */}
        {showLaneGuidingBeams && (
          <div className="absolute bottom-4 inset-x-1/4 h-8 pointer-events-none z-15 flex items-center justify-between">
            <div className="w-24 h-0.5 bg-cyan-400 shadow-[0_0_15px_#00D2FF] -rotate-12" />
            <span className="text-[8px] font-mono text-cyan-300 bg-black/75 px-1.5 py-0.5 rounded border border-cyan-400/40">
              ช่องทางวิ่งมอเตอร์ไซค์ AR ชัดเจน
            </span>
            <div className="w-24 h-0.5 bg-cyan-400 shadow-[0_0_15px_#00D2FF] rotate-12" />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. INTERACTIVE AR CONTROLS & WAYPOINT CONTROLLER */}
      {/* ========================================================================= */}
      <div className="p-3 bg-[#061226] border-t border-cyan-500/40 space-y-2.5 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Distance Proximity Slider & Auto-drive simulation */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setIsApproachingAuto(prev => !prev);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isApproachingAuto
                  ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-[0_0_12px_#F59E0B] animate-pulse'
                  : 'bg-black/60 text-cyan-300 border-cyan-400/50 hover:bg-cyan-950/40'
              }`}
            >
              {isApproachingAuto ? <Pause className="w-3.5 h-3.5 fill-slate-950" /> : <Play className="w-3.5 h-3.5 fill-cyan-400" />}
              <span>{isApproachingAuto ? 'หยุดจำลองเข้าใกล้' : 'จำลองขี่เข้าใกล้จุดเลี้ยว'}</span>
            </button>

            <div className="flex items-center gap-2 flex-1 sm:w-48 text-[11px]">
              <span className="text-slate-400 whitespace-nowrap">ระยะ:</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={arDistanceM}
                onChange={(e) => setArDistanceM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
              />
              <span className="text-[#00D2FF] font-black w-10 text-right">{arDistanceM}ม.</span>
            </div>
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

        {/* Persona Voice selector & Audio prompt */}
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
            <span>AR Real-Time Mobile Camera Overlaid Guidance • WINRIDER.AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

