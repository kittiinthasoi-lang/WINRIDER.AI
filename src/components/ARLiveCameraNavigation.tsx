import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Compass, LocateFixed, Volume2, VolumeX, X, RotateCw, Navigation2 } from 'lucide-react';
import { IncomingJobData } from './DriverStandbyAndIncomingJob';
import { AIVoicePersona, speakThaiText } from '../utils/audio';

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
  stepEndLocation?: { lat: number; lng: number };
  maneuver?: string;
  streetName?: string;
  landmark?: string;
}

const rad=(v:number)=>v*Math.PI/180;
const deg=(v:number)=>v*180/Math.PI;
const haversine=(a:{latitude:number;longitude:number},b:{lat:number;lng:number})=>{const R=6371000,dLat=rad(b.lat-a.latitude),dLng=rad(b.lng-a.longitude),la1=rad(a.latitude),la2=rad(b.lat);const x=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));};
const bearing=(a:{latitude:number;longitude:number},b:{lat:number;lng:number})=>(deg(Math.atan2(Math.sin(rad(b.lng-a.longitude))*Math.cos(rad(b.lat)),Math.cos(rad(a.latitude))*Math.sin(rad(b.lat))-Math.sin(rad(a.latitude))*Math.cos(rad(b.lat))*Math.cos(rad(b.lng-a.longitude))))+360)%360;

export const ARLiveCameraNavigation: React.FC<ARLiveCameraNavigationProps> = ({
  activeJob, voiceInstruction='', remainingDistM=0, remainingMinutes=0, currentSpeed=0, liveHeading, audioEnabled=true,
  voiceGuidanceEnabled=true, voicePersona='fah_sai', onClose, onSwitchToMap, onSwitchToGoogleMaps, onAdvanceTripStep,
  stepEndLocation, maneuver='straight', streetName='', landmark=''
}) => {
  const videoRef=useRef<HTMLVideoElement|null>(null); const streamRef=useRef<MediaStream|null>(null); const advanced=useRef(false);
  const [cameraOn,setCameraOn]=useState(false),[cameraError,setCameraError]=useState('');
  const [position,setPosition]=useState<GeolocationPosition|null>(null),[gpsError,setGpsError]=useState('');
  const [heading,setHeading]=useState<number|null>(liveHeading ?? null),[muted,setMuted]=useState(!voiceGuidanceEnabled),[lastSpoken,setLastSpoken]=useState('');
  const target=stepEndLocation ?? (activeJob?.dropoffCoord ? {lat:activeJob.dropoffCoord.lat,lng:activeJob.dropoffCoord.lng}:undefined);

  useEffect(()=>{let alive=true;(async()=>{try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});if(!alive){s.getTracks().forEach(t=>t.stop());return;}streamRef.current=s;setCameraOn(true);if(videoRef.current){videoRef.current.srcObject=s;await videoRef.current.play().catch(()=>{});}}catch{if(alive)setCameraError('กรุณาอนุญาตกล้องเพื่อใช้ AR Navigation');}})();return()=>{alive=false;streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;};},[]);
  useEffect(()=>{if(!navigator.geolocation){setGpsError('อุปกรณ์ไม่รองรับ GPS');return;}const id=navigator.geolocation.watchPosition(setPosition,()=>setGpsError('ไม่สามารถอ่านตำแหน่ง GPS ได้'),{enableHighAccuracy:true,maximumAge:1000,timeout:10000});return()=>navigator.geolocation.clearWatch(id);},[]);
  useEffect(()=>{const onOrientation=(e:DeviceOrientationEvent & {webkitCompassHeading?:number})=>{const h=typeof e.webkitCompassHeading==='number'?e.webkitCompassHeading:typeof e.alpha==='number'?(360-e.alpha)%360:null;if(h!==null)setHeading(h);};window.addEventListener('deviceorientation',onOrientation as EventListener,true);return()=>window.removeEventListener('deviceorientation',onOrientation as EventListener,true);},[]);
  const liveDistance=useMemo(()=>position&&target?haversine(position.coords,target):null,[position,target?.lat,target?.lng]);
  const targetBearing=useMemo(()=>position&&target?bearing(position.coords,target):null,[position,target?.lat,target?.lng]);
  const rotation=targetBearing!==null&&heading!==null?((targetBearing-heading+540)%360)-180:0;
  useEffect(()=>{advanced.current=false;},[target?.lat,target?.lng,maneuver]);
  useEffect(()=>{if(liveDistance!==null&&liveDistance<=8&&!advanced.current&&onAdvanceTripStep){advanced.current=true;onAdvanceTripStep();}},[liveDistance,onAdvanceTripStep]);
  const speak=()=>{if(muted)return;const d=liveDistance===null?'':`อีกประมาณ ${Math.max(0,Math.round(liveDistance))} เมตร `;const text=`${d}${voiceInstruction||'เดินทางต่อไปตามเส้นทาง'}`;if(text===lastSpoken)return;setLastSpoken(text);speakThaiText(text,(voicePersona as AIVoicePersona)||'fah_sai',1.05);};
  const maneuverLabel=/u.?turn|กลับรถ/i.test(maneuver)?'กลับรถ':/left|ซ้าย/i.test(maneuver)?'เลี้ยวซ้าย':/right|ขวา/i.test(maneuver)?'เลี้ยวขวา':/arrived|ถึง/i.test(maneuver)?'ถึงจุดหมาย':'ตรงไป';

  return <div className="relative w-full min-h-[560px] overflow-hidden rounded-3xl border-2 border-cyan-400/60 bg-black shadow-[0_0_50px_rgba(0,210,255,0.3)]">
    {cameraOn?<video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 h-full w-full object-cover"/>:<div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-center text-slate-300"><div><Camera className="mx-auto mb-3 h-10 w-10 text-cyan-300"/><p>{cameraError||'กำลังเปิดกล้อง...'}</p></div></div>}
    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80"/>
    <div className="absolute left-3 right-3 top-3 flex items-center justify-between"><div className="rounded-2xl border border-cyan-300/30 bg-slate-950/75 px-3 py-2 backdrop-blur-md"><div className="flex items-center gap-2 text-[10px] font-black text-cyan-200"><LocateFixed className="h-3.5 w-3.5"/> LIVE GPS AR</div><div className="text-[9px] text-slate-300">{position?`GPS accuracy ${position.coords.accuracy.toFixed(0)} ม.`:gpsError||'กำลังหาตำแหน่ง...'}</div></div><button type="button" onClick={onClose} className="rounded-full border border-white/20 bg-black/60 p-2 text-white"><X className="h-5 w-5"/></button></div>
    <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center"><div className="mx-auto mb-2 flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/5 backdrop-blur-sm"><Navigation2 className="h-20 w-20 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,.9)] transition-transform duration-200" style={{transform:`rotate(${rotation}deg)`}}/></div><div className="rounded-2xl border border-cyan-300/30 bg-black/65 px-5 py-3 backdrop-blur-md"><div className="text-xl font-black text-white">{liveDistance===null?`${Math.max(0,Math.round(remainingDistM))} ม.`:`${Math.round(liveDistance)} ม.`}</div><div className="text-xs font-black text-cyan-200">{maneuverLabel}{streetName?` • ${streetName}`:''}</div>{landmark&&<div className="mt-1 text-[9px] text-amber-200">{landmark}</div>}</div></div>
    <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/15 bg-black/75 p-3 backdrop-blur-md"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="text-[9px] font-black uppercase text-cyan-300">ทิศทางจาก GPS ไปยังจุดหมาย</div><div className="mt-1 text-sm font-black text-white">{voiceInstruction||'กำลังคำนวณทิศทางจาก GPS'}</div><div className="mt-1 text-[9px] text-slate-300">เวลาโดยประมาณ {remainingMinutes} นาที • {Math.round(currentSpeed||0)} กม./ชม.</div></div><button type="button" onClick={()=>{setMuted(v=>!v);if(muted)speak();}} className="shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-2 text-cyan-200">{muted?<VolumeX className="h-4 w-4"/>:<Volume2 className="h-4 w-4"/>}</button></div><div className="mt-2 flex gap-2"><button type="button" onClick={onSwitchToMap} className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black text-white">แผนที่</button><button type="button" onClick={onSwitchToGoogleMaps} className="flex-1 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-[10px] font-black text-blue-200">Google Maps</button><button type="button" onClick={()=>{if(!muted)speak();}} className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[10px] font-black text-amber-200"><RotateCw className="mr-1 inline h-3 w-3"/>เสียง</button></div></div>
    <div className="absolute right-3 top-20 rounded-xl border border-white/15 bg-black/60 px-2 py-1 text-[9px] text-white"><Compass className="mr-1 inline h-3 w-3 text-cyan-300"/>{heading===null?'—':`${Math.round(heading)}°`}</div>
  </div>;
};
