import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  Layers, 
  Users, 
  Bike, 
  TrendingUp, 
  Zap, 
  Sparkles, 
  Compass, 
  Flame, 
  Volume2, 
  VolumeX,
  RefreshCw,
  Navigation,
  MapPin,
  Store,
  CheckCircle2,
  Phone,
  ShieldCheck,
  ChevronRight,
  Home
} from 'lucide-react';
import { playTactileBlip, speakThaiText } from '../utils/audio';

export interface RadarEntity {
  id: string;
  type: 'rider' | 'customer' | 'merchant' | 'transit_hub';
  name: string;
  avatar: string;
  categoryLabel?: string;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  z: number; // altitude simulation
  speed: number;
  direction: number; // degrees
  status: string;
  etaMin?: number;
  level?: number;
  rating?: number;
  vehicleModel?: string;
  fareOrDeal?: string;
  demandIntensity: number; // 1 to 5
  specialBadge?: string;
}

interface DensityRadarOverlayProps {
  targetPerspective?: 'driver' | 'passenger' | 'merchant';
  venueName?: string;
  venueIcon?: string;
  venueCategory?: string;
  radiusKm?: number;
  audioEnabled?: boolean;
  onSelectEntity?: (entity: RadarEntity) => void;
  onBookRideWithRider?: (rider: RadarEntity) => void;
  isCompact?: boolean;
  className?: string;
  onBackToHome?: () => void;
}

export const DensityRadarOverlay: React.FC<DensityRadarOverlayProps> = ({
  targetPerspective = 'driver',
  venueName,
  venueIcon,
  venueCategory,
  radiusKm = 2.5,
  audioEnabled = true,
  onSelectEntity,
  onBookRideWithRider,
  isCompact = false,
  className = '',
  onBackToHome
}) => {
  const [viewMode, setViewMode] = useState<'3d_isometric' | 'top_down' | 'hologram_wireframe'>('3d_isometric');
  const [elevation3D, setElevation3D] = useState<number>(50); // 0m to 150m (3D Floating Height / Altitude)
  const [pitch3D, setPitch3D] = useState<number>(55); // 20 to 80 deg
  const [filterType, setFilterType] = useState<'all' | 'riders_only' | 'customers_only' | 'merchants_only'>('all');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showPulseWaves, setShowPulseWaves] = useState<boolean>(true);
  const [selectedEntity, setSelectedEntity] = useState<RadarEntity | null>(null);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [scanPulse, setScanPulse] = useState<number>(0);

  // Entities tailored for perspective
  const defaultDriverEntities: RadarEntity[] = [
    { id: 'c-101', type: 'customer', name: 'คุณณิชา รัตนเวช (ไปสาทร)', avatar: '👩‍💼', x: 42, y: 38, z: 12, speed: 4, direction: 45, status: 'รอรถหน้าไอดีโอ', etaMin: 1.5, demandIntensity: 5, fareOrDeal: '฿74 (ทิป ฿10)', specialBadge: '🔥 งานด่วนอันดับ 1' },
    { id: 'c-102', type: 'customer', name: 'คุณธนภัทร (ส่งพัสดุด่วน)', avatar: '📦', x: 62, y: 55, z: 15, speed: 6, direction: 120, status: 'พัสดุรอหน้าร้าน', etaMin: 2.2, demandIntensity: 4, fareOrDeal: '฿85', specialBadge: 'WIN Express' },
    { id: 'c-103', type: 'customer', name: 'คุณศศิธร & น้องหมา (Pet)', avatar: '🐕', x: 28, y: 65, z: 8, speed: 3, direction: 210, status: 'ไปรพ.สัตว์ทองหล่อ', etaMin: 3.1, demandIntensity: 4, fareOrDeal: '฿120', specialBadge: 'WIN Pet Care' },
    { id: 'c-104', type: 'customer', name: 'คุณลุงฮาซัน (Spirit)', avatar: '🧓', x: 70, y: 28, z: 10, speed: 3, direction: 330, status: 'ไปมัสยิดบางหลวง', etaMin: 1.8, demandIntensity: 3, fareOrDeal: '฿99', specialBadge: 'WIN Spirit' },
    { id: 'c-105', type: 'customer', name: 'กลุ่มลูกค้าออฟฟิศ (4 คน)', avatar: '👥', x: 52, y: 78, z: 18, speed: 5, direction: 90, status: 'หาวิน 2 คันพร้อมกัน', etaMin: 4.0, demandIntensity: 5, fareOrDeal: '฿160', specialBadge: 'High Fare Zone' },
    { id: 'c-106', type: 'customer', name: 'ร้าน Aura Bake (ส่งขนม)', avatar: '🧁', x: 18, y: 42, z: 14, speed: 2, direction: 180, status: 'ขนมเค้ก 2 กล่อง', etaMin: 2.5, demandIntensity: 4, fareOrDeal: '฿80', specialBadge: 'Merchant Order' },
    { id: 'c-107', type: 'customer', name: 'Mr. David (Tourist VIP)', avatar: '👤', x: 80, y: 60, z: 6, speed: 8, direction: 260, status: 'ไปวัดอรุณฯ', etaMin: 3.5, demandIntensity: 5, fareOrDeal: '฿150 (ทิป ฿30)', specialBadge: 'Foreign Tourist VIP' },
  ];

  const defaultPassengerEntities: RadarEntity[] = [
    { id: 'r-201', type: 'rider', name: 'พี่วินสมชาย (LV.38)', avatar: '🛵', vehicleModel: 'Honda Forza 350', rating: 4.98, x: 45, y: 40, z: 12, speed: 38, direction: 45, status: 'พร้อมรับทันที', etaMin: 1.2, demandIntensity: 5, specialBadge: '⚡ ใกล้สุด 180 ม.' },
    { id: 'r-202', type: 'rider', name: 'พี่วินเอกชัย (LV.72 Sovereign)', avatar: '🏍️', vehicleModel: 'Yamaha XMAX 300', rating: 5.0, x: 62, y: 55, z: 15, speed: 42, direction: 120, status: 'สแตนด์บาย BTS กรุงธนฯ', etaMin: 2.5, demandIntensity: 5, specialBadge: '👑 อัศวินจักรพรรดิ' },
    { id: 'r-203', type: 'rider', name: 'พี่วินอนุชา (Clean Eco-EV)', avatar: '⚡', vehicleModel: 'DECO Super EV 4000W', rating: 4.95, x: 28, y: 65, z: 8, speed: 35, direction: 210, status: 'รถไฟฟ้า 100% ไร้เสียง', etaMin: 1.8, demandIntensity: 4, specialBadge: '🌿 รถรักษ์โลก Eco' },
    { id: 'm-301', type: 'merchant', name: 'ร้านป้าสมร ตามสั่ง (Michelin Local)', avatar: '🍲', categoryLabel: 'Street Food เด็ด', x: 35, y: 28, z: 6, speed: 0, direction: 0, status: 'เปิดอยู่ • สั่งล่วงหน้าลด 15%', demandIntensity: 5, fareOrDeal: 'ลด 15% ข้าวกล่อง', specialBadge: '⭐ พาร์ทเนอร์ 5 ดาว' },
    { id: 'm-302', type: 'merchant', name: 'The Jam Factory Market', avatar: '🎪', categoryLabel: 'Art & Craft Pop-up', x: 74, y: 35, z: 8, speed: 0, direction: 0, status: 'ตลาดวินเทจริมน้ำเปิดถึง 23:00', demandIntensity: 5, fareOrDeal: 'งานดนตรีสด', specialBadge: '🔥 WIN-ALERT Event' },
    { id: 'm-303', type: 'merchant', name: 'Summer Rain Cafe Specialty', avatar: '☕', categoryLabel: 'Cafe Roastery', x: 20, y: 50, z: 5, speed: 0, direction: 0, status: 'ส่วนลดกาแฟ Dirty Coffee', demandIntensity: 4, fareOrDeal: 'ลด 20฿ เมื่อนั่งวินมา', specialBadge: '☕ Cafe Partner' },
    { id: 't-401', type: 'transit_hub', name: 'BTS วงเวียนใหญ่ (จุดเชื่อมต่อ)', avatar: '🚊', categoryLabel: 'SkyTrain Hub', x: 50, y: 80, z: 10, speed: 0, direction: 0, status: 'วินสแตนด์บาย 12 คัน', demandIntensity: 5, specialBadge: '🚉 รถไฟฟ้า BTS' }
  ];

  const [entities, setEntities] = useState<RadarEntity[]>(() => 
    targetPerspective === 'driver' ? defaultDriverEntities : defaultPassengerEntities
  );

  // Sync when targetPerspective changes
  useEffect(() => {
    setEntities(targetPerspective === 'driver' ? defaultDriverEntities : defaultPassengerEntities);
  }, [targetPerspective]);

  // Real-time oscillation and movement
  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => {
      setScanPulse(p => (p + 1) % 360);
      setEntities(prev => prev.map(entity => {
        if (entity.speed === 0) return entity; // Static merchant/transit hub

        const radian = (entity.direction * Math.PI) / 180;
        const deltaX = (Math.cos(radian) * entity.speed * 0.025);
        const deltaY = (Math.sin(radian) * entity.speed * 0.025);

        let newX = entity.x + deltaX;
        let newY = entity.y + deltaY;
        let newDir = entity.direction;

        if (newX < 12 || newX > 88) {
          newDir = 180 - newDir;
          newX = Math.max(12, Math.min(88, newX));
        }
        if (newY < 12 || newY > 88) {
          newDir = 360 - newDir;
          newY = Math.max(12, Math.min(88, newY));
        }

        const newEta = entity.etaMin ? Math.max(0.5, entity.etaMin + (Math.random() * 0.2 - 0.1)) : 1.5;

        return {
          ...entity,
          x: newX,
          y: newY,
          direction: (newDir + (Math.random() * 20 - 10)) % 360,
          etaMin: Number(newEta.toFixed(1))
        };
      }));
    }, 1200);

    return () => clearInterval(interval);
  }, [isLiveActive]);

  const filteredEntities = useMemo(() => {
    if (filterType === 'riders_only') return entities.filter(e => e.type === 'rider');
    if (filterType === 'customers_only') return entities.filter(e => e.type === 'customer');
    if (filterType === 'merchants_only') return entities.filter(e => e.type === 'merchant' || e.type === 'transit_hub');
    return entities;
  }, [entities, filterType]);

  const handleEntityClick = (entity: RadarEntity) => {
    if (audioEnabled) {
      playTactileBlip(950);
      speakThaiText(`ตรวจพบ ${entity.name} สถานะ ${entity.status}`);
    }
    setSelectedEntity(entity);
    if (onSelectEntity) onSelectEntity(entity);
  };

  return (
    <div className={`relative rounded-3xl bg-gradient-to-br from-[#060D1E] via-[#040914] to-[#02050B] border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(0,210,255,0.25)] overflow-hidden text-slate-100 p-3 sm:p-4 space-y-3 font-sans ${className}`}>
      
      {/* TOP RADAR HEADER BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-cyan-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-700 flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_20px_#00D2FF]">
            <Radio className="w-5 h-5 text-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>3D HOLOGRAPHIC DENSITY RADAR</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-mono font-bold">
                  รัศมี {radiusKm} กม. (LIVE SCAN)
                </span>
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {targetPerspective === 'driver' 
                ? 'สแกนความหนาแน่นลูกค้า, ออเดอร์เรียกรถ และโซนงานชุกรอบตัวพี่วิน 2.5 กม.' 
                : 'สแกนฝูงบินอัศวิน WIN, ร้านค้าพาร์ทเนอร์ และจุดเชื่อมต่อรถไฟฟ้า 2.5 กม.'}
            </p>
          </div>
        </div>

        {/* Home button & View switchers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onBackToHome && (
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(750);
                onBackToHome();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 text-[11px] font-mono font-bold flex items-center gap-1 transition-all"
            >
              <Home className="w-3.5 h-3.5 text-cyan-400" />
              <span>กลับหน้าหลัก</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-[10px] font-mono">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(700);
                setViewMode('3d_isometric');
              }}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                viewMode === '3d_isometric'
                  ? 'bg-gradient-to-r from-[#00D2FF] to-blue-500 text-slate-950 shadow-[0_0_10px_#00D2FF]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D ไอโซ
            </button>
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(700);
                setViewMode('top_down');
              }}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'top_down'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_10px_#FFD700]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              เรดาร์ 2D
            </button>
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(700);
                setViewMode('hologram_wireframe');
              }}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'hologram_wireframe'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-[0_0_10px_#10B981]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              โฮโลแกรม
            </button>
          </div>

          {/* 3D Elevation / Altitude Control Bar */}
          <div className="flex items-center gap-1.5 bg-black/70 px-2.5 py-1 rounded-xl border border-cyan-500/40 text-[10px] font-mono">
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
                { val: 50, label: '50m' },
                { val: 100, label: '100m' },
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
        </div>
      </div>

      {/* FILTER BUTTONS ROW */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all ${
              filterType === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-md'
                : 'bg-black/40 text-slate-400 border-white/10'
            }`}
          >
            🔥 ทั้งหมด ({entities.length})
          </button>

          {targetPerspective === 'driver' ? (
            <>
              <button
                onClick={() => setFilterType('customers_only')}
                className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all ${
                  filterType === 'customers_only'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md'
                    : 'bg-black/40 text-slate-400 border-white/10'
                }`}
              >
                👥 ลูกค้า & ออเดอร์งาน ({entities.filter(e => e.type === 'customer').length})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setFilterType('riders_only')}
                className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all ${
                  filterType === 'riders_only'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md'
                    : 'bg-black/40 text-slate-400 border-white/10'
                }`}
              >
                🛵 อัศวิน WIN ({entities.filter(e => e.type === 'rider').length})
              </button>
              <button
                onClick={() => setFilterType('merchants_only')}
                className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all ${
                  filterType === 'merchants_only'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-md'
                    : 'bg-black/40 text-slate-400 border-white/10'
                }`}
              >
                🏬 ร้านค้า & จุดจอด ({entities.filter(e => e.type === 'merchant' || e.type === 'transit_hub').length})
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2 py-0.8 rounded-lg border font-bold ${
              showHeatmap ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-black/30 text-slate-500 border-white/10'
            }`}
          >
            🔥 ฮีตแมพ
          </button>
          <button
            onClick={() => setShowPulseWaves(!showPulseWaves)}
            className={`px-2 py-0.8 rounded-lg border font-bold ${
              showPulseWaves ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/30 text-slate-500 border-white/10'
            }`}
          >
            📡 คลื่นเรดาร์
          </button>
        </div>
      </div>

      {/* 3D HOLOGRAPHIC RADAR CANVAS VIEWPORT */}
      <div 
        className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden bg-gradient-to-b from-[#040E24] via-[#020712] to-[#00040A] border border-cyan-500/40 shadow-inner flex items-center justify-center select-none"
        style={{ perspective: viewMode === '3d_isometric' ? '900px' : 'none' }}
      >
        {/* RADAR SWEEP LINE */}
        {showPulseWaves && (
          <div 
            className="absolute inset-0 pointer-events-none z-10 origin-center"
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, rgba(0, 210, 255, 0.25) 0deg, transparent 60deg, transparent 360deg)',
              transform: `rotate(${scanPulse}deg)`
            }}
          />
        )}

        {/* CONCENTRIC RADAR RINGS (2.5 KM SCALE) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Ring 1: 0.8 km */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-cyan-400/30 flex items-start justify-center pt-1">
            <span className="text-[8px] font-mono text-cyan-400/70 bg-black/70 px-1 rounded">0.8 km</span>
          </div>
          {/* Ring 2: 1.6 km */}
          <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-cyan-400/25 flex items-start justify-center pt-1">
            <span className="text-[8px] font-mono text-cyan-400/70 bg-black/70 px-1 rounded">1.6 km</span>
          </div>
          {/* Ring 3: 2.5 km (Max Boundary) */}
          <div className="absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full border border-cyan-400/40 border-dashed flex items-start justify-center pt-1 animate-pulse">
            <span className="text-[8px] font-mono text-[#FFD700] bg-black/80 px-1.5 rounded font-bold">2.5 km (R-MAX)</span>
          </div>
          {/* Crosshair Axes */}
          <div className="absolute w-full h-[1px] bg-cyan-500/20" />
          <div className="absolute h-full w-[1px] bg-cyan-500/20" />
        </div>

        {/* 3D MAP TRANSFORM CONTAINER */}
        <div 
          className="relative w-full h-full transition-transform duration-300 ease-out flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: viewMode === '3d_isometric'
              ? `rotateX(${pitch3D}deg) rotateZ(-25deg) scale(0.9) translateZ(${elevation3D * 1.2}px)`
              : viewMode === 'hologram_wireframe'
              ? `rotateX(${Math.max(10, pitch3D - 15)}deg) rotateZ(15deg) scale(0.95) translateZ(${elevation3D * 1.2}px)`
              : `rotateX(0deg) rotateZ(0deg) scale(1) translateZ(${elevation3D * 0.5}px)`,
          }}
        >
          {/* Hologram Floor Grid */}
          <div 
            className="absolute w-[90%] h-[90%] rounded-full border border-cyan-500/30"
            style={{
              backgroundImage: `
                radial-gradient(circle, rgba(0, 210, 255, 0.15) 1px, transparent 1px),
                linear-gradient(to right, rgba(0, 210, 255, 0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0, 210, 255, 0.08) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px',
              backgroundColor: 'rgba(4, 15, 38, 0.7)'
            }}
          />

          {/* CENTER USER / DRIVER PIN */}
          <div 
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) translateZ(${Math.round(25 * (elevation3D / 50))}px)` }}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-950 border-2 border-white shadow-[0_0_25px_#00D2FF] flex items-center justify-center text-lg animate-pulse">
              {targetPerspective === 'driver' ? '🛵' : '📍'}
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.2 rounded bg-black/80 text-[8px] font-mono text-cyan-300 border border-cyan-400/50">
              {targetPerspective === 'driver' ? 'จุดของคุณ (Driver HQ)' : 'ตำแหน่งปัจจุบัน (You)'}
            </div>
          </div>

          {/* RADAR ENTITIES PINGS */}
          {filteredEntities.map((entity) => {
            const isSelected = selectedEntity?.id === entity.id;

            return (
              <div
                key={entity.id}
                onClick={() => handleEntityClick(entity)}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group hover:scale-125"
                style={{
                  left: `${entity.x}%`,
                  top: `${entity.y}%`,
                  transform: `translate(-50%, -50%) translateZ(${Math.round((entity.z * 2.2) * Math.max(0.2, elevation3D / 50))}px)`
                }}
              >
                {/* Demand Heat Glow */}
                {showHeatmap && entity.demandIntensity >= 4 && (
                  <div className="absolute -inset-3 rounded-full bg-rose-500/30 blur-sm animate-ping" />
                )}

                {/* Entity Pin Box */}
                <div className={`p-1.5 rounded-2xl border-2 transition-all flex items-center gap-1 shadow-2xl ${
                  isSelected
                    ? 'bg-gradient-to-tr from-amber-400 to-yellow-500 border-white text-slate-950 scale-110 shadow-[0_0_20px_#FFD700]'
                    : entity.type === 'rider'
                    ? 'bg-[#0A2246]/90 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                    : entity.type === 'customer'
                    ? 'bg-[#2A103D]/90 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-[#092B22]/90 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                }`}>
                  <span className="text-base">{entity.avatar}</span>
                  <span className="text-[9px] font-mono font-bold px-1 hidden sm:inline truncate max-w-[80px]">
                    {entity.name.split(' ')[0]}
                  </span>
                </div>

                {/* Status Float Tooltip on Hover / Select */}
                {(isSelected || entity.demandIntensity === 5) && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-lg bg-black/90 text-[9px] font-mono font-bold text-[#FFD700] border border-amber-400/60 shadow-xl pointer-events-none z-40">
                    {entity.fareOrDeal || entity.specialBadge || `${entity.etaMin} นาที`}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* VIEWPORT CORNER TELEMETRY STATS */}
        <div className="absolute top-3 left-3 z-20 bg-black/75 backdrop-blur-md p-2 rounded-2xl border border-cyan-500/30 font-mono text-[10px] space-y-0.5 pointer-events-none">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
            <Sparkles className="w-3 h-3 text-[#FFD700]" />
            <span>RADAR DENSITY TELEMETRY</span>
          </div>
          <p className="text-slate-300">
            วัตถุในรัศมี 2.5 กม.: <strong className="text-white">{filteredEntities.length} จุด</strong>
          </p>
          <p className="text-amber-400 font-bold">
            ความหนาแน่นเฉลี่ย: {targetPerspective === 'driver' ? '🔥 งานชุกระดับ 94%' : '⚡ อัศวินพร้อมวิ่ง 100%'}
          </p>
        </div>
      </div>

      {/* SELECTED ENTITY DETAIL DRAWER */}
      {selectedEntity && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0C1E40] via-[#09152F] to-[#060D1E] border-2 border-[#00D2FF] shadow-[0_0_20px_rgba(0,210,255,0.3)] space-y-2.5 animate-fadeIn font-mono text-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/20 flex items-center justify-center text-2xl">
                {selectedEntity.avatar}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-white">{selectedEntity.name}</h4>
                  {selectedEntity.specialBadge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                      {selectedEntity.specialBadge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-cyan-300 mt-0.5">
                  {selectedEntity.vehicleModel ? `ยานรบ: ${selectedEntity.vehicleModel}` : selectedEntity.status}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-black text-amber-400">
                {selectedEntity.fareOrDeal || `~${selectedEntity.etaMin} นาที`}
              </span>
              <p className="text-[10px] text-slate-400">ห่าง ~{(selectedEntity.x * 0.035).toFixed(1)} กม.</p>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="flex items-center gap-2 pt-1">
            {targetPerspective === 'passenger' && selectedEntity.type === 'rider' ? (
              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1000);
                  if (onBookRideWithRider) onBookRideWithRider(selectedEntity);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-[#00D2FF] to-blue-600 text-slate-950 font-black text-xs font-mono shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5 fill-slate-950" />
                <span>เรียกอัศวินท่านนี้ทันที (Book with {selectedEntity.name.split(' ')[0]})</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1000);
                  alert(`จับคู่ออเดอร์กับ ${selectedEntity.name} เรียบร้อย!`);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-black text-xs font-mono shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>รับงาน & นำทางไปจุดนี้ (Navigate)</span>
              </button>
            )}

            <button
              onClick={() => setSelectedEntity(null)}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
