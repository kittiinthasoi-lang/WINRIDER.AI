import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Phone, 
  CheckCircle2, 
  Package, 
  Navigation, 
  Radio, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  Compass, 
  Layers, 
  RefreshCw, 
  ArrowRight,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';
import { playTactileBlip, playRadarScan, playEngineRev, playLevelUpFanfare } from '../utils/audio';
import confetti from 'canvas-confetti';

interface ParcelItem {
  id: string;
  trackingNumber: string;
  recipientName: string;
  recipientPhone: string;
  destination: string;
  zone: string;
  weight: string;
  itemType: string;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered';
  assignedKnight: {
    name: string;
    id: string;
    phone: string;
    bikeModel: string;
    plateNumber: string;
    rating: number;
    etaMinutes: number;
    currentDistanceMeters: number;
    latOffset: number;
    lngOffset: number;
    avatarEmoji: string;
  };
}

interface MerchantParcelPickupMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioEnabled: boolean;
  onGainMerchantXp: (amount: number, reason: string) => void;
}

const INITIAL_PARCELS: ParcelItem[] = [
  {
    id: 'PKG-8801',
    trackingNumber: 'WIN-EXP-TH8801A',
    recipientName: 'คุณศิรินทิพย์ วรโชติ',
    recipientPhone: '081-445-9988',
    destination: 'อาคารสาทรสแควร์ BTS ช่องนนทรี',
    zone: 'สาทร CBD',
    weight: '1.2 kg',
    itemType: 'ชุดของขวัญออร่าเซนโก้ & ชาพรีเมียม',
    status: 'assigned',
    assignedKnight: {
      name: 'พี่วินเดชา ภักดี',
      id: 'KNIGHT-019',
      phone: '089-112-3344',
      bikeModel: 'Honda PCX 160 (กล่องท้าย 45L)',
      plateNumber: '1กข-8821 กทม.',
      rating: 4.98,
      etaMinutes: 2,
      currentDistanceMeters: 320,
      latOffset: -35,
      lngOffset: 45,
      avatarEmoji: '🛵'
    }
  },
  {
    id: 'PKG-8802',
    trackingNumber: 'WIN-EXP-TH8802B',
    recipientName: 'คุณธนกฤต มหาศาล',
    recipientPhone: '086-778-1122',
    destination: 'คอนโด The River ถ.เจริญนคร',
    zone: 'เจริญนคร-คลองสาน',
    weight: '2.5 kg',
    itemType: 'นาฬิกาสำริด Imperial Bronze Watch',
    status: 'assigned',
    assignedKnight: {
      name: 'พี่วินเอกชัย ชำนาญทาง',
      id: 'KNIGHT-042',
      phone: '083-990-7766',
      bikeModel: 'Yamaha XMAX 300 (กล่องคู่กันกระแทก)',
      plateNumber: '4กค-9912 กทม.',
      rating: 5.0,
      etaMinutes: 3,
      currentDistanceMeters: 550,
      latOffset: 40,
      lngOffset: -50,
      avatarEmoji: '🏍️'
    }
  },
  {
    id: 'PKG-8803',
    trackingNumber: 'WIN-EXP-TH8803C',
    recipientName: 'คุณกัญญาพร รัตนะ',
    recipientPhone: '095-223-4455',
    destination: 'ไอคอนสยาม โซนไอคอนลักซ์ ชั้น 2',
    zone: 'ริมแม่น้ำเจ้าพระยา',
    weight: '0.8 kg',
    itemType: 'เมล็ดกาแฟ Single Origin คั่วเข้ม',
    status: 'assigned',
    assignedKnight: {
      name: 'พี่วินสมชาย สปีดรัน',
      id: 'KNIGHT-088',
      phone: '084-556-9900',
      bikeModel: 'Honda Click 160 (ถุงความร้อน/กันน้ำ)',
      plateNumber: '2กง-4411 กทม.',
      rating: 4.92,
      etaMinutes: 4,
      currentDistanceMeters: 780,
      latOffset: 60,
      lngOffset: 55,
      avatarEmoji: '⚡'
    }
  }
];

export const MerchantParcelPickupMapModal: React.FC<MerchantParcelPickupMapModalProps> = ({
  isOpen,
  onClose,
  audioEnabled,
  onGainMerchantXp
}) => {
  const [parcels, setParcels] = useState<ParcelItem[]>(INITIAL_PARCELS);
  const [selectedParcelId, setSelectedParcelId] = useState<string>(INITIAL_PARCELS[0].id);
  const [currentStep, setCurrentStep] = useState<number>(3); // 1: Broadcast, 2: Matched, 3: En route, 4: Arrived & Handover
  const [mapMode, setMapMode] = useState<'3d_sat' | 'vector_radar' | 'capillary'>('3d_sat');
  const [elevation3D, setElevation3D] = useState<number>(40); // 0m to 150m (3D Floating Height / Altitude)
  const [pitch3D, setPitch3D] = useState<number>(48); // 20 to 75 deg
  const [scannedParcels, setScannedParcels] = useState<string[]>([]);
  const [isSimulatingLiveMove, setIsSimulatingLiveMove] = useState<boolean>(true);
  const [callToast, setCallToast] = useState<string | null>(null);

  const selectedParcel = parcels.find(p => p.id === selectedParcelId) || parcels[0];

  // Moving animation timer for approaching knights
  useEffect(() => {
    if (!isSimulatingLiveMove || currentStep >= 4) return;

    const interval = setInterval(() => {
      setParcels(prev => prev.map(pkg => {
        const currentDist = pkg.assignedKnight.currentDistanceMeters;
        if (currentDist <= 40) {
          return {
            ...pkg,
            assignedKnight: {
              ...pkg.assignedKnight,
              currentDistanceMeters: 0,
              etaMinutes: 0
            }
          };
        }
        const newDist = Math.max(0, currentDist - 25);
        const ratio = newDist / 600;
        return {
          ...pkg,
          assignedKnight: {
            ...pkg.assignedKnight,
            currentDistanceMeters: newDist,
            etaMinutes: Math.max(1, Math.ceil(newDist / 200)),
            latOffset: pkg.assignedKnight.latOffset * 0.95,
            lngOffset: pkg.assignedKnight.lngOffset * 0.95
          }
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulatingLiveMove, currentStep]);

  if (!isOpen) return null;

  const handleCallKnight = (phone: string, name: string) => {
    if (audioEnabled) playTactileBlip(1000);
    setCallToast(`📞 กำลังโทรประสานงานตรงกับ "${name}" เบอร์ ${phone}...`);
    setTimeout(() => setCallToast(null), 3500);
  };

  const handleScanBarcode = (pkgId: string) => {
    if (scannedParcels.includes(pkgId)) return;
    if (audioEnabled) playRadarScan();
    setScannedParcels(prev => [...prev, pkgId]);
    onGainMerchantXp(100, `สแกนส่งมอบพัสดุ ${pkgId} สำเร็จ`);
    confetti({ particleCount: 35, spread: 60, colors: ['#00D2FF', '#FFD700', '#10B981'] });
    
    if (scannedParcels.length + 1 >= parcels.length) {
      setCurrentStep(4);
      if (audioEnabled) playLevelUpFanfare();
    }
  };

  const handleCompleteAllHandover = () => {
    if (audioEnabled) playLevelUpFanfare();
    setScannedParcels(parcels.map(p => p.id));
    setCurrentStep(4);
    onGainMerchantXp(300, "อัศวินรับพัสดุครบทั้ง 3 รายการเรียบร้อย เดินทางสู่ปลายทางทันที!");
    confetti({ particleCount: 80, spread: 90, colors: ['#00D2FF', '#FFD700', '#10B981', '#FFFFFF'] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#070D1E] rounded-3xl border-2 border-[#00D2FF] shadow-[0_0_50px_rgba(0,210,255,0.35)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0C1E40] via-[#091530] to-[#070D1E] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00D2FF] to-blue-600 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(0,210,255,0.5)]">
              🚚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE FLEET DISPATCH RADAR
                </span>
                <span className="text-[10px] text-amber-300 font-mono">ร้านออร่าเซนโก้ (Aura Zenco)</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>แผนที่ติดตามพี่วินมารับพัสดุหน้าร้าน</span>
                <span className="text-xs font-mono text-[#00D2FF]">(3 อัศวินกำลังมุ่งหน้ามา)</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setMapMode('3d_sat')}
                className={`px-2.5 py-1 rounded-lg transition-all ${mapMode === '3d_sat' ? 'bg-[#00D2FF] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                🛰️ ดาวเทียม 3D
              </button>
              <button
                onClick={() => setMapMode('vector_radar')}
                className={`px-2.5 py-1 rounded-lg transition-all ${mapMode === 'vector_radar' ? 'bg-[#00D2FF] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                📡 เรดาร์นำทาง
              </button>
              <button
                onClick={() => setMapMode('capillary')}
                className={`px-2.5 py-1 rounded-lg transition-all ${mapMode === 'capillary' ? 'bg-[#00D2FF] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                🛣️ ซอยลัด CI Map
              </button>
            </div>

            {/* 3D Elevation Control Bar */}
            <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-xl border border-cyan-500/40 text-[10px] font-mono">
              <span className="text-cyan-300 font-bold">ลอยสูง 3D:</span>
              <input
                type="range"
                min="0"
                max="150"
                step="5"
                value={elevation3D}
                onChange={(e) => setElevation3D(Number(e.target.value))}
                className="w-14 sm:w-20 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-[#00D2FF]"
                title="ปรับระดับความลอยสูง 3 มิติ (0m - 150m)"
              />
              <span className="text-[#FFD700] font-black">{elevation3D}m</span>
              <div className="flex items-center gap-0.5">
                {[
                  { val: 0, label: '0m' },
                  { val: 40, label: '40m' },
                  { val: 90, label: '90m' },
                  { val: 150, label: '150m' }
                ].map(preset => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(750);
                      setElevation3D(preset.val);
                    }}
                    className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                      elevation3D === preset.val ? 'bg-[#00D2FF] text-slate-950' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {callToast && (
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs p-2.5 text-center font-mono animate-pulse">
            {callToast}
          </div>
        )}

        {/* Progress Stepper Banner */}
        <div className="p-3 bg-black/50 border-b border-white/10 px-4 sm:px-6">
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
            {[
              { num: 1, title: 'ส่งสัญญาณเรียกรถ', desc: 'Broadcasted to Fleet' },
              { num: 2, title: 'อัศวินตอบรับ 3 นาย', desc: '3 Knights Accepted' },
              { num: 3, title: 'กำลังเดินทางมาร้าน', desc: 'En Route (~2-3 min)' },
              { num: 4, title: 'สแกนรับของ & ส่งออก', desc: 'Barcode Handover' }
            ].map(step => (
              <div 
                key={step.num}
                className={`p-2 rounded-xl border transition-all ${
                  currentStep >= step.num 
                    ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,210,255,0.25)]' 
                    : 'bg-black/30 border-white/5 text-slate-500'
                }`}
              >
                <div className="font-bold flex items-center justify-center gap-1">
                  <span>{step.num <= currentStep ? '✓' : step.num}.</span>
                  <span>{step.title}</span>
                </div>
                <span className="text-[8px] opacity-75 hidden sm:block">{step.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: 3D Interactive Map Stage */}
          <div className="lg:col-span-7 space-y-4 flex flex-col">
            <div 
              className="relative flex-1 min-h-[360px] rounded-3xl bg-gradient-to-b from-[#060D1E] via-[#081735] to-[#040914] border border-cyan-500/40 overflow-hidden shadow-2xl p-4 flex flex-col justify-between"
              style={{ perspective: mapMode === '3d_sat' ? '850px' : 'none' }}
            >
              
              {/* Radar Grid Background */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 50% 50%, rgba(0, 210, 255, 0.15) 0%, transparent 60%),
                    linear-gradient(rgba(0, 210, 255, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 210, 255, 0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '100% 100%, 30px 30px, 30px 30px'
                }}
              />

              {/* Concentric Radar Rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border border-cyan-400/20 animate-ping opacity-30" />
                <div className="w-80 h-80 rounded-full border border-cyan-400/15" />
                <div className="w-[420px] h-[420px] rounded-full border border-cyan-400/10" />
              </div>

              {/* Top Map Status HUD */}
              <div className="relative z-10 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-xl border border-cyan-400/30 backdrop-blur-md">
                  <Compass className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                  <span className="text-white font-bold">พิกัดร้านค้า:</span>
                  <span className="text-amber-300">13.7241° N, 100.5012° E (เจริญรัถ-คลองสาน)</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/40 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>GPS แม่นยำระดับ 0.5 ม.</span>
                </div>
              </div>

              {/* Map Center: 3D Transformed Merchant Hub & Approach Stage */}
              <div 
                className="relative z-10 flex items-center justify-center my-auto transition-transform duration-300 ease-out"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: mapMode === '3d_sat'
                    ? `rotateX(${pitch3D}deg) rotateZ(-10deg) translateZ(${elevation3D * 1.1}px)`
                    : mapMode === 'vector_radar'
                    ? `rotateX(25deg) translateZ(${elevation3D * 0.6}px)`
                    : 'rotateX(0deg)',
                }}
              >
                <div className="relative flex flex-col items-center">
                  {/* Glowing Merchant Shop Marker */}
                  <div 
                    className="relative transition-transform duration-300"
                    style={{ transform: `translateZ(${Math.round(20 * (elevation3D / 40))}px)` }}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FFD700] via-amber-400 to-amber-600 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(255,215,0,0.8)] border-2 border-white animate-bounce">
                      🏪
                    </div>
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[9px]">
                      จุดรับพัสดุ
                    </span>
                  </div>
                  <div 
                    className="mt-2 px-3 py-1 rounded-xl bg-black/80 border border-amber-400 text-center backdrop-blur-md shadow-xl"
                    style={{ transform: `translateZ(${Math.round(15 * (elevation3D / 40))}px)` }}
                  >
                    <span className="text-xs font-black text-amber-300 block">ร้านออร่าเซนโก้ (Aura Zenco)</span>
                    <span className="text-[9px] text-slate-300 font-mono">3 กล่องรอส่งมอบ • ช่องรับงานด่วน A-1</span>
                  </div>

                  {/* Approaching Knight Markers (Dynamic Positions) */}
                  {parcels.map((pkg, idx) => {
                    const isSelected = pkg.id === selectedParcelId;
                    const lat = pkg.assignedKnight.latOffset;
                    const lng = pkg.assignedKnight.lngOffset;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setSelectedParcelId(pkg.id);
                        }}
                        style={{
                          transform: `translate(${lng * 1.8}px, ${lat * 1.8}px) translateZ(${Math.round(25 * (elevation3D / 40))}px)`,
                          transition: 'transform 1s linear'
                        }}
                        className={`absolute cursor-pointer group z-20 flex flex-col items-center ${
                          isSelected ? 'scale-110' : 'opacity-90'
                        }`}
                      >
                        {/* Connecting Line to Shop */}
                        <div className="w-0.5 h-12 bg-cyan-400/40 border-l border-dashed border-cyan-400" />
                        
                        {/* Knight Motorcycle Pin */}
                        <div className={`p-2 rounded-2xl border-2 flex items-center gap-1.5 shadow-2xl transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 border-white shadow-[0_0_20px_#00D2FF]'
                            : 'bg-[#0A1836] text-white border-cyan-400/60'
                        }`}>
                          <span className="text-base">{pkg.assignedKnight.avatarEmoji}</span>
                          <div className="text-left font-mono">
                            <span className="text-[10px] font-bold block leading-none">{pkg.assignedKnight.name.split(' ')[0]}</span>
                            <span className="text-[8px] opacity-80">{pkg.assignedKnight.currentDistanceMeters}ม. ({pkg.assignedKnight.etaMinutes}น.)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Telemetry Bar */}
              <div className="relative z-10 grid grid-cols-3 gap-2 text-center text-xs font-mono bg-black/70 p-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
                <div>
                  <span className="text-[9px] text-slate-400 block">อัศวินที่กำลังมา:</span>
                  <span className="text-white font-bold">3 นาย (พร้อมกล่องท้าย)</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">เวลาถึงเร็วสุด:</span>
                  <span className="text-cyan-300 font-bold">2 นาที (พี่วินเดชา)</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">สถานะสแกนบาร์โค้ด:</span>
                  <span className="text-amber-400 font-bold">{scannedParcels.length}/3 กล่อง</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Live Simulator Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#09152E] border border-white/10 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">แบบจำลองสด:</span>
                <button
                  onClick={() => setIsSimulatingLiveMove(!isSimulatingLiveMove)}
                  className={`px-3 py-1 rounded-xl border font-bold transition-all ${
                    isSimulatingLiveMove ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-400 border-white/10'
                  }`}
                >
                  {isSimulatingLiveMove ? '⏸️ หยุดเคลื่อนที่' : '▶️ เล่นต่อ'}
                </button>
              </div>

              <button
                onClick={handleCompleteAllHandover}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black shadow-md flex items-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ยืนยันส่งมอบพัสดุครบทั้งหมด (3 ชิ้น)</span>
              </button>
            </div>
          </div>

          {/* Right Column: Parcel Manifest & Assigned Knights Detail */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Package className="w-4 h-4 text-amber-400" />
                  รายการพัสดุที่เรียกพี่วิน ({parcels.length} ชิ้น)
                </h3>
                <span className="text-[10px] text-cyan-300 font-mono">คลิกเพื่อดูคนขับ</span>
              </div>

              {/* Parcels List */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {parcels.map(pkg => {
                  const isSelected = pkg.id === selectedParcelId;
                  const isScanned = scannedParcels.includes(pkg.id);
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(850);
                        setSelectedParcelId(pkg.id);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#0C2248] to-[#091834] border-[#00D2FF] shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                          : 'bg-black/40 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{pkg.id}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                              {pkg.trackingNumber}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-amber-300 mt-1 line-clamp-1">{pkg.itemType}</h4>
                        </div>

                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isScanned
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {isScanned ? '✅ ส่งมอบแล้ว' : '🛵 กำลังมารับ'}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span>{pkg.assignedKnight.avatarEmoji}</span>
                          <span className="font-bold text-white">{pkg.assignedKnight.name}</span>
                        </div>
                        <span className="text-cyan-300 font-bold">ถึงใน ~{pkg.assignedKnight.etaMinutes} นาที</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Card for Selected Parcel & Knight */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0B1E40] via-[#08152F] to-[#050B18] border-2 border-cyan-400/50 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-xl">
                    {selectedParcel.assignedKnight.avatarEmoji}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>{selectedParcel.assignedKnight.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40">
                        ★ {selectedParcel.assignedKnight.rating}
                      </span>
                    </h4>
                    <span className="text-[10px] font-mono text-cyan-300">{selectedParcel.assignedKnight.bikeModel} • {selectedParcel.assignedKnight.plateNumber}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleCallKnight(selectedParcel.assignedKnight.phone, selectedParcel.assignedKnight.name)}
                  className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md transition-all active:scale-95"
                  title="โทรติดต่ออัศวิน"
                >
                  <Phone className="w-4 h-4" />
                </button>
              </div>

              {/* Delivery Destination Specs */}
              <div className="space-y-1.5 text-xs font-mono bg-black/40 p-2.5 rounded-2xl border border-white/5">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">ผู้รับ:</span>
                  <span className="text-white font-bold">{selectedParcel.recipientName} ({selectedParcel.recipientPhone})</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">ปลายทาง:</span>
                  <span className="text-cyan-300 text-right truncate max-w-[200px]">{selectedParcel.destination}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">น้ำหนัก/ขนาด:</span>
                  <span className="text-amber-300">{selectedParcel.weight} (กล่องมาตรฐาน WIN)</span>
                </div>
              </div>

              {/* Scan Barcode Button */}
              <button
                onClick={() => handleScanBarcode(selectedParcel.id)}
                disabled={scannedParcels.includes(selectedParcel.id)}
                className={`w-full py-2.5 rounded-2xl font-black text-xs font-mono shadow-lg flex items-center justify-center gap-2 transition-all ${
                  scannedParcels.includes(selectedParcel.id)
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 cursor-default'
                    : 'bg-gradient-to-r from-[#FFD700] via-amber-400 to-amber-600 hover:brightness-110 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.4)] active:scale-95'
                }`}
              >
                {scannedParcels.includes(selectedParcel.id) ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>สแกนบาร์โค้ดส่งมอบสำเร็จแล้ว</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>สแกนบาร์โค้ดกล่องพัสดุ ({selectedParcel.id}) +100 XP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
