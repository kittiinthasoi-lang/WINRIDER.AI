import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Compass, LocateFixed, Volume2, VolumeX, X, RotateCw, Navigation2 } from 'lucide-react';
import { IncomingJobData } from './DriverStandbyAndIncomingJob';
import { AIVoicePersona, speakThaiText } from '../utils/audio';

export type ARLiveCameraNavigationLiveProps = {
  activeJob?: IncomingJobData | null;
  voiceInstruction: string;
  remainingMinutes?: number;
  currentSpeed?: number;
  audioEnabled?: boolean;
  voiceGuidanceEnabled?: boolean;
  voicePersona?: AIVoicePersona;
  maneuver?: string;
  stepEndLocation?: { lat: number; lng: number };
  streetName?: string;
  landmark?: string;
  onClose?: () => void;
  onSwitchToMap?: () => void;
  onSwitchToGoogleMaps?: () => void;
  onAdvanceTripStep?: () => void;
};

const toRad = (v: number) => (v * Math.PI) / 180;
const toDeg = (v: number) => (v * 180) / Math.PI;
const distanceM = (a: GeolocationCoordinates | { latitude: number; longitude: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const dLat = toRad(b.lat - a.latitude);
  const dLng = toRad(b.lng - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
const bearingTo = (a: { latitude: number; longitude: number }, b: { lat: number; lng: number }) => {
  const lat1 = toRad(a.latitude), lat2 = toRad(b.lat), dLng = toRad(b.lng - a.longitude);
  return (toDeg(Math.atan2(Math.sin(dLng) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng))) + 360) % 360;
};

export const ARLiveCameraNavigationLive: React.FC<ARLiveCameraNavigationLiveProps> = ({
  activeJob,
  voiceInstruction,
  remainingMinutes = 0,
  currentSpeed = 0,
  audioEnabled = true,
  voiceGuidanceEnabled = true,
  voicePersona = 'fah_sai',
  maneuver = 'straight',
  stepEndLocation,
  streetName = '',
  landmark = '',
  onClose,
  onSwitchToMap,
  onSwitchToGoogleMaps,
  onAdvanceTripStep
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const advancedRef = useRef(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [heading, setHeading] = useState<number | null>(null);
  const [muted, setMuted] = useState(!voiceGuidanceEnabled);
  const [lastSpoken, setLastSpoken] = useState('');

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (!mounted) return;
        streamRef.current = stream;
        setCameraOn(true);
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      } catch { if (mounted) setCameraError('กรุณาอนุญาตกล้องเพื่อใช้ AR Navigation'); }
    };
    void start();
    return () => { mounted = false; streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsError('อุปกรณ์ไม่รองรับ GPS'); return; }
    const id = navigator.geolocation.watchPosition(setPosition, () => setGpsError('ไม่สามารถอ่านตำแหน่ง GPS ได้'), { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const h = typeof e.webkitCompassHeading === 'number' ? e.webkitCompassHeading : typeof e.alpha === 'number' ? (360 - e.alpha) % 360 : null;
      if (h !== null) setHeading(h);
    };
    window.addEventListener('deviceorientation', handler as EventListener, true);
    return () => window.removeEventListener('deviceorientation', handler as EventListener, true);
  }, []);

  const liveDistance = useMemo(() => position && stepEndLocation ? distanceM(position.coords, stepEndLocation) : null, [position, stepEndLocation]);
  const targetBearing = useMemo(() => position && stepEndLocation ? bearingTo(position.coords, stepEndLocation) : null, [position, stepEndLocation]);
  const arrowRotation = targetBearing !== null && heading !== null ? ((targetBearing - heading + 540) % 360) - 180 : 0;

  useEffect(() => {
    advancedRef.current = false;
  }, [stepEndLocation?.lat, stepEndLocation?.lng, maneuver]);

  useEffect(() => {
    if (liveDistance !== null && liveDistance <= 8 && !advancedRef.current && onAdvanceTripStep) {
      advancedRef.current = true;
      onAdvanceTripStep();
    }
  }, [liveDistance, onAdvanceTripStep]);

  const speak = () => {
    if (muted) return;
    const d = liveDistance === null ? '' : `อีกประมาณ ${Math.max(0, Math.round(liveDistance))} เมตร `;
    const text = `${d}${voiceInstruction}`;
    if (text === lastSpoken) return;
    setLastSpoken(text);
    speakThaiText(text, voicePersona, 1.05);
  };

  const maneuverLabel = /u.?turn|กลับรถ/i.test(maneuver) ? 'กลับรถ' : /left|ซ้าย/i.test(maneuver) ? 'เลี้ยวซ้าย' : /right|ขวา/i.test(maneuver) ? 'เลี้ยวขวา' : /arrived|ถึง/i.test(maneuver) ? 'ถึงจุดหมาย' : 'ตรงไป';

  return (
    <div className="relative w-full min-h-[560px] overflow-hidden rounded-3xl border-2 border-cyan-400/60 bg-black shadow-[0_0_50px_rgba(0,210,255,0.3)]">
      {cameraOn ? <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-center text-slate-300"><div><Camera className="mx-auto mb-3 h-10 w-10 text-cyan-300" /><p>{cameraError || 'กำลังเปิดกล้อง...'}</p></div></div>}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />

      <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
        <div className="rounded-2xl border border-cyan-300/30 bg-slate-950/75 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2 text-[10px] font-black text-cyan-200"><LocateFixed className="h-3.5 w-3.5" /> LIVE GPS AR</div>
          <div className="text-[9px] text-slate-300">{position ? `${position.coords.accuracy.toFixed(0)} ม. accuracy` : gpsError || 'กำลังหาตำแหน่ง...'}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-white/20 bg-black/60 p-2 text-white"><X className="h-5 w-5" /></button>
      </div>

      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="mx-auto mb-2 flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/5 backdrop-blur-sm">
          <Navigation2 className="h-20 w-20 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,.9)] transition-transform duration-200" style={{ transform: `rotate(${arrowRotation}deg)` }} />
        </div>
        <div className="rounded-2xl border border-cyan-300/30 bg-black/65 px-5 py-3 backdrop-blur-md">
          <div className="text-xl font-black text-white">{liveDistance === null ? '—' : `${Math.round(liveDistance)} ม.`}</div>
          <div className="text-xs font-black text-cyan-200">{maneuverLabel}{streetName ? ` • ${streetName}` : ''}</div>
          {landmark && <div className="mt-1 text-[9px] text-amber-200">{landmark}</div>}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/15 bg-black/75 p-3 backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><div className="text-[9px] font-black uppercase text-cyan-300">ขั้นตอนจากเส้นทางจริง</div><div className="mt-1 text-sm font-black text-white">{voiceInstruction}</div><div className="mt-1 text-[9px] text-slate-300">ETA {remainingMinutes} นาที • {Math.round(currentSpeed || 0)} กม./ชม.</div></div>
          <button type="button" onClick={() => { setMuted(v => !v); if (!muted) speak(); }} className="shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-2 text-cyan-200">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onSwitchToMap} className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black text-white">แผนที่</button>
          <button type="button" onClick={onSwitchToGoogleMaps} className="flex-1 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-[10px] font-black text-blue-200">Google Maps</button>
          <button type="button" onClick={() => { if (!muted) speak(); }} className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[10px] font-black text-amber-200"><RotateCw className="mr-1 inline h-3 w-3" />เสียง</button>
        </div>
      </div>
      <div className="absolute right-3 top-20 rounded-xl border border-white/15 bg-black/60 px-2 py-1 text-[9px] text-white"><Compass className="mr-1 inline h-3 w-3 text-cyan-300" /> {heading === null ? '—' : `${Math.round(heading)}°`}</div>
    </div>
  );
};
