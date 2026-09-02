import React, { useState, useMemo } from 'react';
import { DREAM_RIDES_FLEET } from '../data/dreamRidesData';
import { DreamRideVehicle, DreamRideCategory } from '../types';
import { getAmenityPrice, isHelmetAmenity } from '../data/amenitiesData';
import { playTactileBlip, speakThaiText } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  CheckCircle2, 
  Info, 
  Gauge, 
  ShieldCheck, 
  Heart, 
  Star, 
  Check, 
  Zap, 
  Award,
  Layers,
  Wrench,
  Fuel,
  Cpu,
  Search,
  SlidersHorizontal,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Minimize2,
  Maximize2,
  Home
} from 'lucide-react';

interface DreamRideFleetViewProps {
  audioEnabled: boolean;
  selectedDreamRide: DreamRideVehicle;
  onSelectDreamRide: (ride: DreamRideVehicle) => void;
  onBookWithDreamRide: (ride: DreamRideVehicle) => void;
  onBackToMain?: () => void;
}

export const DreamRideFleetView: React.FC<DreamRideFleetViewProps> = ({
  audioEnabled,
  selectedDreamRide,
  onSelectDreamRide,
  onBookWithDreamRide,
  onBackToMain,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DreamRideCategory>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [detailModalVehicle, setDetailModalVehicle] = useState<DreamRideVehicle | null>(null);
  const [activeExperienceMode, setActiveExperienceMode] = useState<{ [key: string]: string }>({});
  const [activeSpecTab, setActiveSpecTab] = useState<'powertrain' | 'chassis' | 'ergonomics' | 'tech'>('powertrain');
  
  // View mode: 'compact' (โหมดย่อ โชว์เฉพาะชื่อแบรนด์และชื่อรุ่น) or 'detailed' (โหมดละเอียด ขยายข้อมูลทุกอย่าง)
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  // Per-card expansion override
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCardExpand = (vehicleId: string) => {
    if (audioEnabled) playTactileBlip(850);
    setExpandedCards(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
  };

  const setAllExpanded = (expanded: boolean) => {
    if (audioEnabled) playTactileBlip(900);
    setViewMode(expanded ? 'detailed' : 'compact');
    const newState: Record<string, boolean> = {};
    DREAM_RIDES_FLEET.forEach(v => {
      newState[v.id] = expanded;
    });
    setExpandedCards(newState);
  };

  // The 3 Requested Main Categories + All
  const categories: { id: DreamRideCategory; label: string; icon: string; count: number; description: string }[] = [
    { 
      id: 'all', 
      label: 'ทั้งหมด (All Motorcycles)', 
      icon: '✨', 
      count: DREAM_RIDES_FLEET.length,
      description: 'รวมมอเตอร์ไซค์ทุกแบรนด์ ทุกประเภท ทุกขนาดความจุ' 
    },
    { 
      id: 'standard', 
      label: '1. รถทั่วไป Standard (ใช้งานทั่วไปในชีวิตประจำวัน)', 
      icon: '🛵', 
      count: DREAM_RIDES_FLEET.filter(v => v.category === 'standard').length,
      description: 'รถครอบครัว สกู๊ตเตอร์ในเมือง บิ๊กสกู๊ตเตอร์ ประหยัดน้ำมัน คล่องตัว ทนทาน (Wave, PCX, Grand Filano, Lead, Forza, XMAX, Smash, Drone)' 
    },
    { 
      id: 'sport', 
      label: '2. รถสายสปอร์ต Sport (ซูเปอร์ไบค์ & สปอร์ตบิ๊กไบค์)', 
      icon: '⚡', 
      count: DREAM_RIDES_FLEET.filter(v => v.category === 'sport').length,
      description: 'สุดยอดยานยนต์ความเร็วสูงระดับเวิลด์คลาส 190-240 แรงม้า (Ducati Panigale V4 S, BMW S1000RR, Yamaha R1M, Honda CBR1000RR-R, Kawasaki Ninja H2, Hayabusa 1340, RSV4)' 
    },
    { 
      id: 'classic', 
      label: '3. รถสายคลาสสิค Classic (ครุยเซอร์ ฮาเลย์ ชอปเปอร์)', 
      icon: '🦅', 
      count: DREAM_RIDES_FLEET.filter(v => v.category === 'classic').length,
      description: 'ตำนานเหนือกาลเวลา ครุยเซอร์ ชอปเปอร์ บ็อบเบอร์ วินเทจหรูหรา (Harley-Davidson Fat Boy 114, Breakout 117, Triumph Bonneville, Royal Enfield 350, Vespa 946, BMW R18, Rebel 1100)' 
    },
  ];

  // Extract all distinct brand names
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    DREAM_RIDES_FLEET.forEach(v => {
      if (v.specs.brand) brandsSet.add(v.specs.brand);
    });
    return Array.from(brandsSet);
  }, []);

  const filteredFleet = useMemo(() => {
    return DREAM_RIDES_FLEET.filter((vehicle) => {
      // Category Filter
      if (selectedCategory !== 'all' && vehicle.category !== selectedCategory) {
        return false;
      }
      // Brand Filter
      if (selectedBrand !== 'all' && vehicle.specs.brand !== selectedBrand) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = vehicle.name.toLowerCase().includes(query);
        const matchThai = vehicle.thaiName.toLowerCase().includes(query);
        const matchBrand = vehicle.specs.brand.toLowerCase().includes(query);
        const matchModel = vehicle.specs.brandAndModel.toLowerCase().includes(query);
        const matchEngine = vehicle.specs.engine.toLowerCase().includes(query);
        const matchDisplacement = vehicle.specs.displacement.toLowerCase().includes(query);
        return matchName || matchThai || matchBrand || matchModel || matchEngine || matchDisplacement;
      }
      return true;
    });
  }, [selectedCategory, selectedBrand, searchQuery]);

  const handleSetDefault = (vehicle: DreamRideVehicle) => {
    if (audioEnabled) {
      playTactileBlip(1100);
      speakThaiText(`ตั้ง ${vehicle.thaiName} เป็นรถในฝันประจำตัวเรียบร้อย`);
    }
    onSelectDreamRide(vehicle);
    confetti({
      particleCount: 45,
      spread: 60,
      colors: ['#00D2FF', '#FFD700', '#FFFFFF']
    });
  };

  const handleSelectMode = (vehicleId: string, mode: string) => {
    if (audioEnabled) playTactileBlip(900);
    setActiveExperienceMode(prev => ({
      ...prev,
      [vehicleId]: mode
    }));
  };

  return (
    <div className="space-y-5">
      {/* Top Navigation & Hero Banner */}
      <div className="relative rounded-3xl p-5 overflow-hidden border border-[#FFD700]/40 bg-gradient-to-br from-[#122044] via-[#091530] to-[#070D1E] shadow-[0_0_30px_rgba(255,215,0,0.15)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-500/20 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        {/* Top Back to Home Button Bar */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          {onBackToMain ? (
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                onBackToMain();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← กลับหน้าหลัก (Back to Main)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Home className="w-3.5 h-3.5 text-cyan-400" />
              <span>หน้าทำเนียบรถในฝัน</span>
            </div>
          )}

          {/* Compact vs Detailed Global View Mode Toggle */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setAllExpanded(false)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                viewMode === 'compact'
                  ? 'bg-[#00D2FF] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="ย่อข้อมูล โชว์เฉพาะชื่อแบรนด์และชื่อรุ่น"
            >
              <Minimize2 className="w-3 h-3" />
              <span>🔹 โหมดย่อ (ชื่อแบรนด์/รุ่น)</span>
            </button>
            <button
              onClick={() => setAllExpanded(true)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                viewMode === 'detailed'
                  ? 'bg-[#FFD700] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="ขยายดูรายละเอียดและสเปกเต็มทุกอย่าง"
            >
              <Maximize2 className="w-3 h-3" />
              <span>🔸 โหมดละเอียด (สเปกเต็ม)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 mb-2 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>SOVEREIGN MOTORCYCLE GARAGE • ทำเนียบมอเตอร์ไซค์ครบทุกรุ่นทุกยี่ห้อ (28 คัน 28 พี่วิน)</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white leading-tight">
              ทำเนียบยานยนต์สองล้อครบครัน (Motorcycle Fleet Blueprints)
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              สามารถกดย่อหรือขยายดูรายละเอียดรถได้ตามต้องการ แบ่งหมวดหมู่ 3 รูปแบบ: รถทั่วไป Standard, สปอร์ตบิ๊กไบค์ Superbike, และคลาสสิค ครุยเซอร์ พร้อมพี่วินประจำรถตรงรุ่น 1:1
            </p>
          </div>

          {/* Current Selected Active Dream Ride Badge */}
          <div className="p-3 rounded-2xl bg-black/60 border border-[#00D2FF]/40 flex items-center gap-3 flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00D2FF] to-blue-700 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(0,210,255,0.4)]">
              {selectedDreamRide.iconEmoji.split(' ')[0]}
            </div>
            <div>
              <span className="text-[9px] font-mono text-cyan-300 uppercase block">รถที่คุณเลือกใช้งานปัจจุบัน:</span>
              <span className="text-xs font-bold text-white block line-clamp-1">{selectedDreamRide.thaiName}</span>
              <span className="text-[10px] font-mono text-[#FFD700]">+{selectedDreamRide.priceAddon === 0 ? 'ฟรี (0฿)' : `฿${selectedDreamRide.priceAddon}`} / ทริป</span>
            </div>
          </div>
        </div>

        {/* Fleet Highlight Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-3 border-t border-white/10 text-center font-mono text-[10px]">
          <div className="p-2 rounded-xl bg-black/30 border border-white/5">
            <span className="text-slate-400 block">จำนวนรุ่นในระบบ</span>
            <span className="text-xs font-bold text-[#00D2FF]">{DREAM_RIDES_FLEET.length} รุ่นชั้นนำ</span>
          </div>
          <div className="p-2 rounded-xl bg-black/30 border border-white/5">
            <span className="text-slate-400 block">หมวดหมู่ยานยนต์</span>
            <span className="text-xs font-bold text-emerald-400">3 หมวดหมู่หลัก</span>
          </div>
          <div className="p-2 rounded-xl bg-black/30 border border-white/5">
            <span className="text-slate-400 block">แบรนด์ระดับโลก</span>
            <span className="text-xs font-bold text-[#FFD700]">{availableBrands.length} ยี่ห้อแท้</span>
          </div>
          <div className="p-2 rounded-xl bg-black/30 border border-white/5">
            <span className="text-slate-400 block">อัศวินประจำรถ</span>
            <span className="text-xs font-bold text-cyan-300">28 คน 1:1 ตรงรุ่น</span>
          </div>
        </div>
      </div>

      {/* 3 Main Requested Categories Selection Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cyan-400 font-mono flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            เลือกหมวดหมู่รถมอเตอร์ไซค์ (3 MAIN CATEGORIES):
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            แสดง {filteredFleet.length} จากทั้งหมด {DREAM_RIDES_FLEET.length} รุ่น
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {categories.map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`filter-dream-ride-${cat.id}`}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(850);
                  setSelectedCategory(cat.id);
                }}
                className={`p-3 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                  isCatActive
                    ? 'bg-gradient-to-br from-[#00D2FF]/20 via-blue-900/40 to-[#0A162C] border-[#00D2FF] text-white shadow-[0_0_20px_rgba(0,210,255,0.25)]'
                    : 'bg-[#0E1A33] text-slate-300 hover:bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-xs font-bold leading-tight">{cat.label.split('(')[0]}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isCatActive ? 'bg-[#00D2FF] text-slate-950' : 'bg-white/10 text-slate-400'
                  }`}>
                    {cat.count} รุ่น
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand Filter Pills & Search Input */}
      <div className="p-3.5 rounded-2xl bg-[#09152B] border border-white/10 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อรุ่น, แบรนด์ (เช่น Wave, PCX, Fat Boy, Panigale, CBR, S1000RR)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Clear Filter */}
          {(selectedBrand !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setSelectedBrand('all');
                setSearchQuery('');
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] text-slate-300 font-mono whitespace-nowrap"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        {/* Brand Selection Pills */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-slate-400 block">
            กรองตามยี่ห้อ (Brand Filter):
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setSelectedBrand('all');
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all ${
                selectedBrand === 'all'
                  ? 'bg-[#00D2FF] text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
              }`}
            >
              ทุกยี่ห้อ (All Brands)
            </button>
            {availableBrands.map((brand) => (
              <button
                key={brand}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(850);
                  setSelectedBrand(brand);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all ${
                  selectedBrand === brand
                    ? 'bg-[#00D2FF] text-slate-950 font-bold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* No Search Results */}
      {filteredFleet.length === 0 && (
        <div className="text-center py-10 p-6 rounded-3xl bg-[#09152B] border border-white/10 space-y-2">
          <span className="text-3xl">🔍</span>
          <h3 className="text-sm font-bold text-white">ไม่พบรถมอเตอร์ไซค์ที่ตรงกับเงื่อนไขค้นหา</h3>
          <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูรถมอเตอร์ไซค์ทั้งหมด</p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedBrand('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono mt-2"
          >
            แสดงรถทั้งหมดทุกรุ่นทุกยี่ห้อ
          </button>
        </div>
      )}

      {/* Motorcycle Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFleet.map((vehicle) => {
          const isSelected = selectedDreamRide.id === vehicle.id;
          const currentMode = activeExperienceMode[vehicle.id] || vehicle.experienceModes[0];
          // Per-card expanded state check (fallback to global viewMode)
          const isExpanded = expandedCards[vehicle.id] !== undefined 
            ? expandedCards[vehicle.id] 
            : (viewMode === 'detailed');

          return (
            <div
              key={vehicle.id}
              id={`dream-ride-card-${vehicle.id}`}
              className={`relative rounded-3xl p-4 sm:p-5 transition-all overflow-hidden border flex flex-col justify-between space-y-3.5 ${
                isSelected
                  ? 'bg-gradient-to-br from-[#0F224A] via-[#091530] to-[#070D1E] border-2 border-[#00D2FF] shadow-[0_0_25px_rgba(0,210,255,0.3)]'
                  : 'bg-gradient-to-br from-[#0A162C] via-[#071022] to-[#050B17] border-white/10 hover:border-cyan-500/50 hover:bg-[#0E1E3D]'
              }`}
            >
              {/* Background Glow */}
              <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-br ${vehicle.colorTheme} opacity-15 rounded-full blur-2xl pointer-events-none`} />

              {/* Card Header: Brand & Model Focus */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/15 flex items-center justify-center text-3xl shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
                      {vehicle.iconEmoji.split(' ')[0]}
                    </div>
                    <div>
                      {/* Brand & Model Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm">
                          {vehicle.specs.brand}
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                          {vehicle.categoryLabel}
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-bold">
                          {vehicle.badge}
                        </span>
                      </div>

                      {/* Thai Name & Brand/Model Name */}
                      <h3 className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">
                        {vehicle.thaiName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-amber-300 font-mono font-bold">
                          รุ่น: {vehicle.specs.brandAndModel}
                        </span>
                        <span className="text-slate-500 text-xs">•</span>
                        <span className="text-[11px] text-cyan-300 font-mono">
                          {vehicle.specs.displacement.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="px-2.5 py-1 rounded-full bg-[#00D2FF] text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md flex-shrink-0">
                      <Check className="w-3 h-3" />
                      <span>เลือกใช้งานอยู่</span>
                    </span>
                  )}
                </div>

                {/* Collapsible toggle banner */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => toggleCardExpand(vehicle.id)}
                    className="text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors py-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>▲ กดย่อข้อมูล (แสดงเฉพาะชื่อแบรนด์/รุ่น)</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>▼ กดดูรายละเอียดสเปกเต็ม & วิศวกรรม</span>
                      </>
                    )}
                  </button>

                  <span className="text-[10px] font-mono text-[#FFD700]">
                    {vehicle.priceAddon === 0 ? 'ฟรี (0฿)' : `+฿${vehicle.priceAddon}`} / ทริป
                  </span>
                </div>
              </div>

              {/* EXPANDED SECTION (Shown only when isExpanded is true) */}
              {isExpanded && (
                <div className="space-y-3.5 pt-2 border-t border-white/10 animate-fadeIn">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {vehicle.description}
                  </p>
                  <div className="text-[11px] text-amber-300 font-semibold italic">
                    &ldquo;{vehicle.tagline}&rdquo;
                  </div>

                  {/* COMPREHENSIVE MOTORCYCLE ENGINEERING SPECS (Card Deep Breakdown) */}
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5" />
                        รายละเอียดทางวิศวกรรมตัวรถ (ENGINEERING SPECS)
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">ความจุ {vehicle.specs.displacement.split(' ')[0]}</span>
                    </div>

                    {/* 6 Structured Specification Blocks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                      {/* Spec 1: Engine & Cylinders */}
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-cyan-400" />
                          เครื่องยนต์ / ความจุ:
                        </span>
                        <p className="text-white font-medium line-clamp-1">{vehicle.specs.engine}</p>
                      </div>

                      {/* Spec 2: Power & Torque */}
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#FFD700]" />
                          พละกำลัง & แรงบิด:
                        </span>
                        <p className="text-[#FFD700] font-bold line-clamp-1">{vehicle.specs.power.split('@')[0]} / {vehicle.specs.torque.split('@')[0]}</p>
                      </div>

                      {/* Spec 3: Transmission & Drive */}
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-emerald-400" />
                          เกียร์ & ระบบขับเคลื่อน:
                        </span>
                        <p className="text-slate-200 line-clamp-1">{vehicle.specs.transmission.split('พร้อม')[0]} • {vehicle.specs.driveSystem.split('(')[0]}</p>
                      </div>

                      {/* Spec 4: Passenger Seat & Comfort */}
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400" />
                          สรีระเบาะผู้โดยสาร:
                        </span>
                        <p className="text-emerald-300 font-medium line-clamp-1">{vehicle.specs.passengerSeatErgo}</p>
                      </div>

                      {/* Spec 5: Brakes & Safety */}
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-cyan-300" />
                          ระบบเบรกหน้า-หลัง:
                        </span>
                        <p className="text-cyan-200 line-clamp-1">{vehicle.specs.frontBrakes.split('พร้อม')[0]}</p>
                      </div>

                      {/* Spec 6: Fuel Tank & Weight */}
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                          <Fuel className="w-3 h-3 text-amber-400" />
                          ถังน้ำมัน / น้ำหนักรถ:
                        </span>
                        <p className="text-slate-200 line-clamp-1">{vehicle.specs.fuelCapacity.split('(')[0]} • หนัก {vehicle.specs.curbWeight.split('(')[0]}</p>
                      </div>
                    </div>

                    {/* Score Gauges */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-400" />
                            <span>ดัชนีความนุ่มสบาย</span>
                          </span>
                          <span className="font-bold text-cyan-300">{vehicle.specs.comfortScore}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                            style={{ width: `${vehicle.specs.comfortScore}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>ความปลอดภัยสูงสุด</span>
                          </span>
                          <span className="font-bold text-emerald-300">{vehicle.specs.safetyRating}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                            style={{ width: `${vehicle.specs.safetyRating}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Special Amenities Chips */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                        ✨ อุปกรณ์และความสะดวกสบายพิเศษ:
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        หมวกฟรี 0฿ • อย่างอื่น +10-50฿
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {vehicle.amenities.slice(0, 3).map((amenity, idx) => {
                        const isHelmet = isHelmetAmenity(amenity);
                        const itemPrice = getAmenityPrice(amenity);
                        return (
                          <span 
                            key={idx} 
                            className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className={`w-3 h-3 ${isHelmet ? 'text-emerald-400' : 'text-[#FFD700]'}`} />
                            <span>{amenity}</span>
                            <span className={`text-[9px] font-mono px-1 rounded ${
                              isHelmet 
                                ? 'bg-emerald-500/20 text-emerald-300 font-bold' 
                                : 'bg-[#FFD700]/20 text-[#FFD700] font-bold'
                            }`}>
                              {isHelmet ? 'ฟรี 0฿' : `+฿${itemPrice}`}
                            </span>
                          </span>
                        );
                      })}
                      {vehicle.amenities.length > 3 && (
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 text-[10px] font-mono">
                          +{vehicle.amenities.length - 3} รายการเพิ่มเติม
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Experience Mode Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 block">
                      โหมดประสบการณ์การเดินทางที่คุณเลือก:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {vehicle.experienceModes.map((mode, mIdx) => (
                        <button
                          key={mIdx}
                          onClick={() => handleSelectMode(vehicle.id, mode)}
                          className={`px-2 py-1 rounded-lg text-[10px] transition-all font-mono ${
                            currentMode === mode
                              ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/50 font-bold'
                              : 'bg-black/30 text-slate-400 hover:text-slate-200 border border-white/5'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing & Action Buttons Footer */}
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div>
                    <span className="text-[9px] text-slate-400 font-mono block">ค่าบริการเพิ่มเติม</span>
                    <div className="text-sm font-black text-[#FFD700] font-mono">
                      {vehicle.priceAddon === 0 ? 'ฟรี (฿0.00)' : `+฿${vehicle.priceAddon}.00`}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">/ ทริป</span>
                    </div>
                  </div>

                  {/* Blueprint View Button */}
                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(850);
                      setDetailModalVehicle(vehicle);
                      setActiveSpecTab('powertrain');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
                    title="ดูพิมพ์เขียวและรายละเอียดสเปกเต็ม 100%"
                  >
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ดูสเปกเต็ม</span>
                  </button>
                </div>

                {/* Main Action Buttons */}
                <div className="flex items-center gap-2">
                  {!isSelected ? (
                    <button
                      onClick={() => handleSetDefault(vehicle)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white/10 hover:bg-[#00D2FF]/20 text-slate-200 hover:text-[#00D2FF] text-xs font-bold border border-white/10 transition-all flex items-center justify-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5 text-[#FFD700]" />
                      <span>ตั้งเป็นรถประจำตัว</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onBookWithDreamRide(vehicle)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>กดเรียกคันนี้เลย</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Back to Main Bar */}
      {onBackToMain && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0E1F42] via-[#091530] to-[#070D1E] border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00D2FF]/20 border border-[#00D2FF]/40 flex items-center justify-center text-[#00D2FF]">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">ต้องการกลับไปหน้าหลัก WIN RIDER?</h4>
              <p className="text-[10px] text-slate-400 font-mono">สามารถเรียกรถด้วยรถในฝันที่คุณเลือกไว้ได้ทันที</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              onBackToMain();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs font-mono flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก (Back to Home)</span>
          </button>
        </div>
      )}

      {/* FULL 360° TECHNICAL BLUEPRINT & VEHICLE SPECIFICATIONS MODAL */}
      {detailModalVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#0A1428] rounded-3xl border-2 border-cyan-500/60 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,210,255,0.4)] space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                  {detailModalVehicle.iconEmoji.split(' ')[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-bold">
                      {detailModalVehicle.badge}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                      {detailModalVehicle.categoryLabel}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight mt-0.5">{detailModalVehicle.thaiName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-400 font-mono font-bold">{detailModalVehicle.specs.brand}</span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-xs text-[#00D2FF] font-mono font-semibold">{detailModalVehicle.specs.brandAndModel}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setDetailModalVehicle(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Overview Box */}
            <div className="p-3.5 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-1">
              <span className="text-[10px] font-mono text-cyan-300 uppercase block">ประวัติและเอกลักษณ์เฉพาะรุ่น:</span>
              <p className="text-xs text-slate-200 leading-relaxed">{detailModalVehicle.description}</p>
              <p className="text-xs text-amber-300 font-semibold italic pt-1">&ldquo;{detailModalVehicle.tagline}&rdquo;</p>
            </div>

            {/* Blueprint Section Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-black/50 rounded-2xl border border-white/10 text-center font-mono text-xs">
              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(900);
                  setActiveSpecTab('powertrain');
                }}
                className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 text-[11px] ${
                  activeSpecTab === 'powertrain'
                    ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>1. เครื่องยนต์ & กำลัง</span>
              </button>

              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(900);
                  setActiveSpecTab('chassis');
                }}
                className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 text-[11px] ${
                  activeSpecTab === 'chassis'
                    ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2. ช่วงล่าง & เบรก</span>
              </button>

              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(900);
                  setActiveSpecTab('ergonomics');
                }}
                className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 text-[11px] ${
                  activeSpecTab === 'ergonomics'
                    ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>3. เบาะ & สรีระ</span>
              </button>

              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(900);
                  setActiveSpecTab('tech');
                }}
                className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 text-[11px] ${
                  activeSpecTab === 'tech'
                    ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>4. อิเล็กทรอนิกส์</span>
              </button>
            </div>

            {/* TAB CONTENT 1: POWERTRAIN & MECHANICALS */}
            {activeSpecTab === 'powertrain' && (
              <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10">
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" />
                  ระบบขับเคลื่อนและสมรรถนะเครื่องยนต์ (POWERTRAIN & SPECS)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">แบรนด์ผู้ผลิต:</span>
                    <span className="text-amber-300 font-bold">{detailModalVehicle.specs.brand}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">รุ่นลิขสิทธิ์ทางการ:</span>
                    <span className="text-white font-bold">{detailModalVehicle.specs.brandAndModel}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">ความจุกระบอกสูบ:</span>
                    <span className="text-cyan-300 font-bold">{detailModalVehicle.specs.displacement}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">ความเร็วสูงสุด:</span>
                    <span className="text-emerald-300 font-bold">{detailModalVehicle.specs.topSpeed}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 sm:col-span-2">
                    <span className="text-slate-400 text-[10px] block">ประเภทเครื่องยนต์ / ระบบวาล์ว:</span>
                    <span className="text-white font-medium">{detailModalVehicle.specs.engine}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">พละกำลังสูงสุด:</span>
                    <span className="text-[#FFD700] font-bold">{detailModalVehicle.specs.power}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">แรงบิดสูงสุด:</span>
                    <span className="text-[#FFD700] font-bold">{detailModalVehicle.specs.torque}</span>
                  </div>
                  {detailModalVehicle.specs.boreAndStroke && (
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 sm:col-span-2">
                      <span className="text-slate-400 text-[10px] block">กระบอกสูบ x ระยะชัก / กำลังอัด:</span>
                      <span className="text-slate-200">{detailModalVehicle.specs.boreAndStroke}</span>
                    </div>
                  )}
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 sm:col-span-2">
                    <span className="text-slate-400 text-[10px] block">ระบบเกียร์ & การส่งกำลัง:</span>
                    <span className="text-slate-200">{detailModalVehicle.specs.transmission}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 sm:col-span-2">
                    <span className="text-slate-400 text-[10px] block">ระบบขับเคลื่อนล้อหลัง (Drive System):</span>
                    <span className="text-cyan-200">{detailModalVehicle.specs.driveSystem}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: CHASSIS, SUSPENSION & BRAKES */}
            {activeSpecTab === 'chassis' && (
              <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10">
                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  โครงสร้างแชสซี ช่วงล่าง และระบบเบรก (CHASSIS & BRAKING)
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">โครงสร้างตัวถังและเฟรม (Frame & Chassis):</span>
                    <span className="text-white font-medium">{detailModalVehicle.specs.frameAndChassis}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">ระบบกันสะเทือนหน้า (Front Suspension):</span>
                    <span className="text-cyan-300 font-medium">{detailModalVehicle.specs.frontSuspension}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">ระบบกันสะเทือนหลัง (Rear Suspension):</span>
                    <span className="text-cyan-300 font-medium">{detailModalVehicle.specs.rearSuspension}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">ระบบเบรกหน้า (Front Brakes & ABS):</span>
                    <span className="text-[#FFD700] font-medium">{detailModalVehicle.specs.frontBrakes}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">ระบบเบรกหลัง (Rear Brakes):</span>
                    <span className="text-[#FFD700] font-medium">{detailModalVehicle.specs.rearBrakes}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">ล้อและขนาดยาง (Wheels & Tires):</span>
                    <span className="text-slate-200">{detailModalVehicle.specs.wheelAndTires}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: ERGONOMICS & PASSENGER COMFORT */}
            {activeSpecTab === 'ergonomics' && (
              <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10">
                <h4 className="text-xs font-mono font-bold text-rose-400 uppercase flex items-center gap-1.5">
                  <Heart className="w-4 h-4" />
                  สรีระเบาะนั่งและความสะดวกสบายของผู้โดยสาร (PASSENGER ERGONOMICS)
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">รายละเอียดเบาะนั่งและพนักพิงหลังผู้โดยสาร:</span>
                    <span className="text-emerald-300 font-bold">{detailModalVehicle.specs.passengerSeatErgo}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-slate-400 text-[10px] block">ความสูงเบาะนั่ง (Seat Height):</span>
                      <span className="text-white font-bold">{detailModalVehicle.specs.seatHeight}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-slate-400 text-[10px] block">น้ำหนักตัวรถพร้อมขับขี่ (Curb Weight):</span>
                      <span className="text-cyan-300 font-bold">{detailModalVehicle.specs.curbWeight}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">มิติตัวรถ (Dimensions L x W x H):</span>
                    <span className="text-slate-200">{detailModalVehicle.specs.dimensions}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">ความจุถังน้ำมัน / แหล่งพลังงาน:</span>
                    <span className="text-amber-300 font-medium">{detailModalVehicle.specs.fuelCapacity}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">อัตราสิ้นเปลืองและระยะทาง:</span>
                    <span className="text-slate-200">{detailModalVehicle.specs.fuelOrRange}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: ELECTRONICS, SAFETY & AMENITIES */}
            {activeSpecTab === 'tech' && (
              <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10">
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  ระบบอิเล็กทรอนิกส์ ความปลอดภัย และของแต่งพิเศษ (TECH & AMENITIES)
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 font-mono">
                    <span className="text-slate-400 text-[10px] block">ระบบความปลอดภัยและตัวช่วยขับขี่:</span>
                    <span className="text-cyan-200">{detailModalVehicle.specs.electronicsAndSafety}</span>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#FFD700] uppercase block font-bold">
                        สิ่งอำนวยความสะดวกสำหรับผู้โดยสาร (All Amenities Pricing):
                      </span>
                      <span className="text-[9px] font-mono text-emerald-300">
                        🛡️ หมวกกันน็อคฟรี 0฿ (ไม่คิดเพิ่ม)
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-slate-200 text-xs">
                      {detailModalVehicle.amenities.map((item, aIdx) => {
                        const isHelmet = isHelmetAmenity(item);
                        const itemPrice = getAmenityPrice(item);
                        return (
                          <li key={aIdx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/30 border border-white/5">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={`w-3.5 h-3.5 ${isHelmet ? 'text-emerald-400' : 'text-[#00D2FF]'} flex-shrink-0`} />
                              <span>{item}</span>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                              isHelmet 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30'
                            }`}>
                              {isHelmet ? 'ฟรี 0฿ (ไม่บวกเพิ่ม)' : `+฿${itemPrice}.00`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-start gap-2 font-mono">
                    <Award className="w-4 h-4 text-[#FFD700] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-white">มาตรฐานอัศวินผู้ขับขี่:</strong>
                      <span>{detailModalVehicle.knightRankRequired}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-300 font-mono">
                    <strong className="text-white">แนะนำเหมาะสำหรับ: </strong>
                    <span>{detailModalVehicle.recommendedFor}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setDetailModalVehicle(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 font-semibold text-xs hover:bg-white/20 transition-all"
              >
                ปิดพิมพ์เขียว
              </button>
              <button
                onClick={() => {
                  handleSetDefault(detailModalVehicle);
                  setDetailModalVehicle(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Star className="w-3.5 h-3.5" />
                <span>เลือกเป็นรถประจำตัว</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
