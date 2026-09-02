import React, { useState } from 'react';
import { playTactileBlip, playRadarScan, speakThaiText, playLevelUpFanfare } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Building2, 
  Video, 
  MapPin, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  Radio, 
  Activity, 
  Users, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  BarChart3, 
  Layers, 
  Maximize2,
  PhoneCall,
  Flame,
  LifeBuoy,
  Truck,
  HeartHandshake,
  Crosshair,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { EmergencyStation } from '../types';

interface HospitalCommandCenterProps {
  audioEnabled: boolean;
  onOpenWinBuddy?: () => void;
}

export const SAMPLE_EMERGENCY_STATIONS: EmergencyStation[] = [
  {
    id: 'em-hosp-01',
    name: 'โรงพยาบาลสมิติเวช สุขุมวิท (ศูนย์อุบัติเหตุฉุกเฉินระดับ 1)',
    type: 'hospital',
    typeLabel: 'โรงพยาบาล & การแพทย์ฉุกเฉิน',
    icon: '🏥',
    phone: '02-022-2222',
    address: 'สุขุมวิท 49 เขตวัฒนา กทม.',
    distanceKm: 0.8,
    activeVolunteers: 18,
    activeAmbulances: 6,
    avgResponseTimeMinutes: 2.1,
    status: 'ready',
    colorTheme: '#00D2FF',
    specialties: ['ศูนย์อุบัติเหตุ Golden Hour', 'คลังถุงเลือดสำรองฉุกเฉิน', 'ทีมแพทย์กู้ชีพมอเตอร์ไซค์']
  },
  {
    id: 'em-fire-02',
    name: 'สถานีดับเพลิงและกู้ภัยคลองเตย (BMA Fire Station)',
    type: 'fire_station',
    typeLabel: 'สถานีดับเพลิง & บรรเทาสาธารณภัย',
    icon: '🚒',
    phone: '199',
    address: 'ถนนพระราม 4 แขวงคลองเตย',
    distanceKm: 1.2,
    activeVolunteers: 24,
    activeAmbulances: 4,
    avgResponseTimeMinutes: 2.8,
    status: 'standby',
    colorTheme: '#EF4444',
    specialties: ['หน่วยดับเพลิงตรอกซอยแคบ (Mini-Fire Pumper Bike)', 'อุปกรณ์ตัดถ่างฉุกเฉิน', 'กู้ภัยอาคารสูง']
  },
  {
    id: 'em-rescue-03',
    name: 'มูลนิธิป่อเต็กตึ๊ง / ร่วมกตัญญู จุดประสานงานสุขุมวิท-อโศก',
    type: 'rescue_volunteer',
    typeLabel: 'หน่วยกู้ภัย & อาสาสมัครจิตอาสา',
    icon: '🚑',
    phone: '1418',
    address: 'จุดพักสายตรวจอโศก-ดินแดง',
    distanceKm: 0.6,
    activeVolunteers: 32,
    activeAmbulances: 8,
    avgResponseTimeMinutes: 1.6,
    status: 'ready',
    colorTheme: '#10B981',
    specialties: ['อาสาพี่วินปฐมพยาบาล CPR & AED', 'กู้ชีพจุดเกิดเหตุฉุกเฉิน 24 ชม.', 'นำทางรถพยาบาลฝ่ารถติด']
  }
];

export const HospitalCommandCenter: React.FC<HospitalCommandCenterProps> = ({ audioEnabled, onOpenWinBuddy }) => {
  const [selectedStationType, setSelectedStationType] = useState<'all' | 'hospital' | 'fire_station' | 'rescue_volunteer'>('all');
  const [selectedStation, setSelectedStation] = useState<EmergencyStation>(SAMPLE_EMERGENCY_STATIONS[0]);
  
  const [activeDispatchList, setActiveDispatchList] = useState([
    { id: 'DSP-091', target: 'หน่วยกู้ชีพฉุกเฉิน 1 (Golden Hour)', knight: 'อัศวิน-104 (Africa Twin)', status: 'กำลังเดินทาง', eta: '2.5 นาที', icon: '🏥' },
    { id: 'DSP-092', target: 'จัดส่งถุงเลือดและออกซิเจนด่วน', knight: 'อัศวิน-042 (Wave 110i)', status: 'ส่งมอบสำเร็จ', eta: 'ถึงที่หมายแล้ว', icon: '💉' },
    { id: 'DSP-093', target: 'หน่วยดับเพลิงซอยแคบ สุขุมวิท 39', knight: 'ทีมอาสาดับเพลิง 08', status: 'ประจำจุดแล้ว', eta: 'ควบคุมสถานการณ์ได้', icon: '🚒' },
    { id: 'DSP-094', target: 'หน่วยกู้ชีพ CPR ฉุกเฉินแยกอโศก', knight: 'พี่วินอาสากู้ภัย-55', status: 'กำลังปฐมพยาบาล', eta: '1 นาที', icon: '🚑' },
  ]);

  const securityFeeds = [
    { id: 1, name: 'ทางเข้าห้องฉุกเฉิน ร.พ. สมิติเวช', status: 'สด (LIVE)', ping: '12ms', icon: '🏥', count: '18 คน', type: 'hospital' },
    { id: 2, name: 'โรงจอดรถดับเพลิง & มอเตอร์ไซค์สปริงเกลอร์', status: 'สด (LIVE)', ping: '14ms', icon: '🚒', count: '12 นาย', type: 'fire_station' },
    { id: 3, name: 'จุดรวมพลกู้ภัยอาสาป่อเต็กตึ๊ง-อโศก', status: 'สด (LIVE)', ping: '16ms', icon: '🚑', count: '15 นาย', type: 'rescue_volunteer' },
    { id: 4, name: 'ศูนย์ส่งต่อเวชภัณฑ์ & ถุงเลือดด่วน', status: 'สด (LIVE)', ping: '18ms', icon: '📦', count: '6 คัน', type: 'hospital' },
  ];

  const filteredStations = SAMPLE_EMERGENCY_STATIONS.filter(
    st => selectedStationType === 'all' || st.type === selectedStationType
  );

  const handleEmergencyDispatch = (targetType: string) => {
    if (audioEnabled) {
      playRadarScan();
      playTactileBlip(400);
    }
    speakThaiText(`สั่งการฉุกเฉิน ${targetType} สั่งการอัศวินและอาสากู้ชีพเข้าพื้นที่ทันที`);
    
    const newDsp = {
      id: `DSP-${Math.floor(Math.random() * 800 + 100)}`,
      target: targetType,
      knight: 'อัศวินกู้ชีพระดับจักรพรรดิ (LV.100)',
      status: 'สั่งการฉุกเฉินด่วนที่สุด',
      eta: '1.5 นาที',
      icon: targetType.includes('ดับเพลิง') ? '🚒' : targetType.includes('กู้ภัย') ? '🚑' : '🏥'
    };
    setActiveDispatchList([newDsp, ...activeDispatchList]);
    confetti({ particleCount: 50, spread: 60, colors: ['#EF4444', '#00D2FF', '#FFD700'] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner with 3 Centers */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0C1B38] via-[#081226] to-[#070D1E] border border-[#00D2FF]/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-amber-500 to-cyan-500 p-0.5 shadow-xl">
              <div className="w-full h-full bg-[#070D1E] rounded-[14px] flex items-center justify-center text-3xl">
                🛡️
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">ศูนย์บัญชาการการแพทย์ • ดับเพลิง • กู้ภัยพันธมิตร</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                  EMERGENCY TRI-FORCES COMMAND
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                เครือข่ายอัศวินช่วยชีวิต 24 ชม. • <strong>โรงพยาบาล • สถานีดับเพลิง • หน่วยกู้ภัยจิตอาสา</strong>
              </p>
            </div>
          </div>

          {/* Quick Dispatch Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleEmergencyDispatch('หน่วยกู้ชีพ ร.พ. & ส่งถุงเลือด')}
              className="px-3.5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg border border-rose-400"
            >
              <span>🏥 กู้ชีพ ร.พ.</span>
            </button>
            <button
              onClick={() => handleEmergencyDispatch('หน่วยดับเพลิงซอยแคบ & ตัดถ่าง')}
              className="px-3.5 py-2.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg border border-amber-400"
            >
              <span>🚒 สั่งการดับเพลิง</span>
            </button>
            <button
              onClick={() => handleEmergencyDispatch('อาสาสมัครกู้ภัย CPR & AED')}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg border border-emerald-400"
            >
              <span>🚑 เรียกรถกู้ภัย</span>
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Station Categories Filter */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto text-xs">
        {[
          { id: 'all' as const, label: '🛡️ รวมศูนย์ฉุกเฉินทั้งหมด (3 ศูนย์)', icon: '🛡️' },
          { id: 'hospital' as const, label: '🏥 โรงพยาบาล & เวชศาสตร์ฉุกเฉิน', icon: '🏥' },
          { id: 'fire_station' as const, label: '🚒 สถานีดับเพลิง & บรรเทาสาธารณภัย', icon: '🚒' },
          { id: 'rescue_volunteer' as const, label: '🚑 หน่วยกู้ภัย & อาสาสมัครจิตอาสา', icon: '🚑' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              setSelectedStationType(cat.id);
            }}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedStationType === cat.id
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: 3D Map + Stations List + Live CCTV */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1 & 2: 3D Emergency Map & Stations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 3D Capillary & Beacon Map */}
          <div className="p-5 rounded-3xl bg-[#09142A] border border-[#00D2FF]/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                แผนที่สามมิติเครือข่ายศูนย์ฉุกเฉิน (โรงพยาบาล, ดับเพลิง, กู้ภัย)
              </h3>
              <span className="text-[10px] font-mono text-emerald-400">● เชื่อมต่อศูนย์สั่งการ 191/1669/199</span>
            </div>

            {/* 3D Map Visual Canvas */}
            <div className="relative h-72 rounded-2xl bg-[#030712] border border-white/10 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#00D2FF_1px,transparent_1px)] [background-size:20px_20px] opacity-25" />
              
              {/* Radar Sweepers */}
              <div className="absolute w-80 h-80 rounded-full border border-cyan-500/20 animate-spin duration-10000" />
              <div className="absolute w-56 h-56 rounded-full border border-rose-500/30" />

              {/* Station Markers on Map */}
              {SAMPLE_EMERGENCY_STATIONS.map((station, idx) => {
                const positions = [
                  { top: '35%', left: '30%' },
                  { top: '65%', left: '60%' },
                  { top: '45%', left: '75%' },
                ];
                const pos = positions[idx % positions.length];

                return (
                  <div
                    key={station.id}
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      setSelectedStation(station);
                    }}
                    className="absolute cursor-pointer group transition-all duration-300 flex flex-col items-center"
                    style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
                  >
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-lg border-2 transition-transform group-hover:scale-125"
                      style={{ 
                        backgroundColor: station.colorTheme + '33', 
                        borderColor: station.colorTheme,
                        boxShadow: `0 0 20px ${station.colorTheme}`
                      }}
                    >
                      {station.icon}
                    </div>
                    <span className="text-[9px] font-bold text-white bg-black/80 px-2 py-0.5 rounded mt-1 border font-mono whitespace-nowrap" style={{ borderColor: station.colorTheme }}>
                      {station.name.split(' ')[0]}
                    </span>
                  </div>
                );
              })}

              {/* Active Knight Dispatch blips */}
              <div className="absolute top-8 left-10 flex items-center gap-1 bg-black/80 px-2 py-1 rounded-lg border border-cyan-500/30 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-cyan-300 font-mono">อัศวินกู้ชีพ-042 (ห่าง 250 ม.)</span>
              </div>

              <div className="absolute bottom-6 left-12 flex items-center gap-1 bg-black/80 px-2 py-1 rounded-lg border border-amber-500/30 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-300 font-mono">มอเตอร์ไซค์ดับเพลิง-08</span>
              </div>
            </div>

            {/* Emergency Stations List Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {filteredStations.map(st => (
                <div
                  key={st.id}
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setSelectedStation(st);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    selectedStation.id === st.id
                      ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                      : 'bg-black/40 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{st.icon}</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                      {st.distanceKm} กม.
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{st.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ตอบสนอง: ~{st.avgResponseTimeMinutes} นาที</p>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300 flex items-center gap-1 pt-1 border-t border-white/5">
                    <span>📞 {st.phone}</span>
                    <span className="text-emerald-400 ml-auto">● {st.activeVolunteers} อาสา</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Real-time Dispatches */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">
                สถานะการสั่งการช่วยเหลือแบบเรียลไทม์:
              </span>
              <div className="space-y-1.5">
                {activeDispatchList.map((dsp) => (
                  <div key={dsp.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span>{dsp.icon}</span>
                      <span className="font-mono font-bold text-cyan-300">{dsp.id}</span>
                      <span className="text-white">{dsp.target}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({dsp.knight})</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      dsp.status.includes('ฉุกเฉิน') || dsp.status.includes('URGENT') ? 'bg-rose-500/20 text-rose-300 border border-rose-500' : 'bg-cyan-500/20 text-cyan-300'
                    }`}>
                      {dsp.status} • {dsp.eta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4 SECURITY & EMERGENCY LIVE VIDEO FEEDS */}
          <div className="p-5 rounded-3xl bg-[#09142A] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Video className="w-4 h-4 text-cyan-400" />
                กล้องวงจรปิดความปลอดภัยสด (CCTV 4 จุดศูนย์ฉุกเฉิน)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">สัญญาณดาวเทียมความเร็วสูง</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {securityFeeds.map((feed) => (
                <div key={feed.id} className="p-3 rounded-2xl bg-[#050C1A] border border-white/10 relative overflow-hidden space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-300 font-bold truncate pr-2">{feed.name}</span>
                    <span className="text-emerald-400 flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {feed.status}
                    </span>
                  </div>

                  <div className="h-28 rounded-xl bg-slate-950 border border-white/5 flex flex-col items-center justify-center relative group">
                    <div className="text-3xl opacity-80 group-hover:scale-110 transition-transform">
                      {feed.icon}
                    </div>
                    <div className="absolute bottom-2 left-2 text-[9px] font-mono text-cyan-400 bg-black/70 px-1.5 py-0.5 rounded">
                      กำลังพลพร้อม: {feed.count}
                    </div>
                    <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-500">
                      ความเร็ว: {feed.ping}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Selected Station Details & Emergency Response Metrics */}
        <div className="space-y-6">
          
          {/* Selected Station Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0F2248] via-[#091530] to-[#070D1E] border border-cyan-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-300 font-bold uppercase">ข้อมูลศูนย์ฉุกเฉินที่เลือก</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                สถานะ: {selectedStation.status.toUpperCase()}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black/50 border border-cyan-400 flex items-center justify-center text-2xl">
                {selectedStation.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{selectedStation.name}</h4>
                <p className="text-xs text-slate-300 font-mono mt-0.5">{selectedStation.address}</p>
                <p className="text-xs text-amber-400 font-mono font-bold mt-1">สายด่วน: {selectedStation.phone}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2">
              <span className="text-[11px] font-mono text-cyan-400 uppercase font-bold">ขีดความสามารถพิเศษ:</span>
              <div className="space-y-1">
                {selectedStation.specialties.map((sp, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-black/40 text-xs text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>{sp}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleEmergencyDispatch(selectedStation.name)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>สั่งการด่วนไปยัง {selectedStation.name.split(' ')[0]}</span>
            </button>
          </div>

          {/* Golden Hour Speed Metric */}
          <div className="p-6 rounded-3xl bg-[#091428] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                สถิติการตอบสนองช่วงเวลาทอง (Golden Hour)
              </h4>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">เวลาเฉลี่ยเข้าถึงผู้ประสบเหตุ:</span>
                <strong className="text-emerald-400 font-mono">1.8 นาที</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">อัตราความสำเร็จช่วงเวลาทอง:</span>
                <strong className="text-cyan-400 font-mono">99.8%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">จำนวนอัศวินกู้ชีพสแตนด์บาย:</span>
                <strong className="text-amber-400 font-mono">140+ นายทั่วกรุงเทพฯ</strong>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-[11px] text-slate-400 leading-relaxed">
              💡 มอเตอร์ไซค์กู้ชีพฝ่าการจราจรติดขัดเข้าถึงจุดเกิดเหตุและตรอกซอกซอยได้ไวกว่ารถพยาบาลขนาดใหญ่กว่า 4 เท่า พร้อมกระเป๋าปฐมพยาบาล AED กู้ชีพ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
