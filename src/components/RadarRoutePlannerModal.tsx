import React, { useState } from 'react';
import {
  Route,
  MapPin,
  LocateFixed,
  Navigation,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  Camera,
  Sparkles,
  CheckCircle2,
  X,
  ChevronRight,
  Zap,
  Leaf,
  Clock,
  ShieldCheck,
  Search,
  Crosshair
} from 'lucide-react';
import { 
  RadarNavRoute, 
  CAPILLARY_PRESET_ROUTES, 
  generateRouteToPing 
} from '../data/radarNavigationData';
import { Radar3DPing } from './ThreeDimensionalDriverRadar';
import { GpsLocationState } from './GpsRealTimeTracker';
import { playTactileBlip, playRadarScan } from '../utils/audio';

interface RadarRoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gpsState: GpsLocationState;
  onLocateMe: () => void;
  onStartNavigation: (route: RadarNavRoute) => void;
  onStartArCameraNav: (route: RadarNavRoute) => void;
  availablePings: Radar3DPing[];
  selectedPing?: Radar3DPing | null;
}

export const RadarRoutePlannerModal: React.FC<RadarRoutePlannerModalProps> = ({
  isOpen,
  onClose,
  gpsState,
  onLocateMe,
  onStartNavigation,
  onStartArCameraNav,
  availablePings,
  selectedPing
}) => {
  if (!isOpen) return null;

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    selectedPing ? `ping-${selectedPing.id}` : CAPILLARY_PRESET_ROUTES[0].id
  );
  const [activeTab, setActiveTab] = useState<'capillary_routes' | 'radar_pings'>('capillary_routes');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected route calculation
  let activeRoute: RadarNavRoute = CAPILLARY_PRESET_ROUTES[0];
  if (selectedRouteId.startsWith('ping-')) {
    const pingId = selectedRouteId.replace('ping-', '');
    const ping = availablePings.find(p => p.id === pingId) || availablePings[0];
    if (ping) {
      activeRoute = generateRouteToPing(ping, gpsState.latitude, gpsState.longitude);
    }
  } else {
    const found = CAPILLARY_PRESET_ROUTES.find(r => r.id === selectedRouteId);
    if (found) activeRoute = found;
  }

  const filteredPresetRoutes = CAPILLARY_PRESET_ROUTES.filter(r => 
    r.destinationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.destinationAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPings = availablePings.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getManeuverIcon = (maneuver: string) => {
    switch (maneuver) {
      case 'turn_left':
      case 'slight_left':
      case 'sharp_left':
        return <CornerUpLeft className="w-4 h-4 text-cyan-400" />;
      case 'turn_right':
      case 'slight_right':
      case 'sharp_right':
        return <CornerUpRight className="w-4 h-4 text-cyan-400" />;
      case 'arrived':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <ArrowUp className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5">
      <div 
        className="relative w-full max-w-xl bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(0,210,255,0.25)] flex flex-col max-h-[90vh] overflow-hidden text-slate-100 font-sans"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Route className="w-5 h-5 text-slate-950 font-black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>วางแผนเส้นทางนำทางเรียลไทม์</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI Capillary Routing
                </span>
              </h2>
              <p className="text-xs text-slate-400">คำนวณซอยลัดจักรยานสีขาว ปลอดมลพิษ 100% เชื่อมต่อกล้องสดและเสียง AI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTactileBlip(600);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 py-3 pr-1">
          {/* Origin: Current GPS Location */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-extrabold">จุดเริ่มต้น:</span>
                <span>ตำแหน่งปัจจุบัน (Current GPS)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTactileBlip(880);
                  onLocateMe();
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-all shadow-sm"
                title="อัปเดตพิกัดดาวเทียมจริงทันที"
              >
                <LocateFixed className="w-3.5 h-3.5 animate-spin" />
                <span>พิกัดฉัน (Locate Me)</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 font-mono">
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{gpsState.addressLabel}</span>
              </div>
              <div className="shrink-0 text-cyan-300 font-bold ml-2">
                {gpsState.latitude.toFixed(4)}°N, {gpsState.longitude.toFixed(4)}°E (±{gpsState.accuracy}ม.)
              </div>
            </div>
          </div>

          {/* Destination Selection Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>เลือกจุดหมายปลายทาง:</span>
              </span>
              <div className="flex bg-slate-900 p-0.5 rounded-xl border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    playTactileBlip(800);
                    setActiveTab('capillary_routes');
                  }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'capillary_routes'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ตรอกซอยลัด กทม.
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTactileBlip(800);
                    setActiveTab('radar_pings');
                  }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'radar_pings'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  จุดเรดาร์ 3D ({availablePings.length})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อสถานที่ หรือจุดหมายปลายทาง..."
                className="w-full bg-slate-900 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {activeTab === 'capillary_routes' ? (
                filteredPresetRoutes.map(route => {
                  const isSelected = selectedRouteId === route.id;
                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => {
                        playTactileBlip(750);
                        setSelectedRouteId(route.id);
                      }}
                      className={`text-left p-3 rounded-2xl border transition-all relative ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                          : 'bg-slate-900/60 border-white/10 hover:border-white/25 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="font-bold text-xs text-white truncate">{route.destinationName}</div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{route.destinationAddress}</div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-cyan-300 font-mono">
                        <span className="flex items-center gap-1 font-bold">
                          <Navigation className="w-3 h-3 text-emerald-400" />
                          {(route.totalDistanceMeters / 1000).toFixed(1)} กม.
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          ~{route.totalDurationMinutes} นาที
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                filteredPings.map(ping => {
                  const isSelected = selectedRouteId === `ping-${ping.id}`;
                  return (
                    <button
                      key={ping.id}
                      type="button"
                      onClick={() => {
                        playTactileBlip(750);
                        setSelectedRouteId(`ping-${ping.id}`);
                      }}
                      className={`text-left p-3 rounded-2xl border transition-all relative ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                          : 'bg-slate-900/60 border-white/10 hover:border-white/25 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-base">{ping.avatar}</span>
                          <span className="font-bold text-xs text-white truncate">{ping.name}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ping.location}</div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-cyan-300 font-mono">
                        <span className="text-emerald-400 font-bold">{ping.service}</span>
                        <span>•</span>
                        <span>ห่าง {ping.distanceMeters} ม.</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Capillary Calculated Route Summary */}
          {activeRoute && (
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                      {activeRoute.routeType}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Leaf className="w-2.5 h-2.5" />
                      {activeRoute.ecoScore}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white mt-1">{activeRoute.destinationName}</h3>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg font-black text-emerald-400">
                    {(activeRoute.totalDistanceMeters / 1000).toFixed(1)} <span className="text-xs text-slate-400">กม.</span>
                  </div>
                  <div className="text-[11px] text-amber-300 font-bold">~{activeRoute.totalDurationMinutes} นาที</div>
                </div>
              </div>

              {/* Step-by-Step Preview */}
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <span>ลำดับจุดเลี้ยวนำทาง (Turn-by-turn steps):</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activeRoute.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-200"
                    >
                      <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                        {getManeuverIcon(step.maneuver)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{step.instruction}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <span>{step.streetName}</span>
                          {step.distanceMeters > 0 && <span>• {step.distanceMeters} ม.</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">#{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playRadarScan();
              onStartNavigation(activeRoute);
              onClose();
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform active:scale-95"
          >
            <Navigation className="w-4 h-4 fill-slate-950" />
            <span>เริ่มการนำทางเรียลไทม์ (Live Turn-by-Turn)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playRadarScan();
              onStartArCameraNav(activeRoute);
              onClose();
            }}
            className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all transform active:scale-95"
            title="เปิดกล้องสดพร้อมลูกศร AR และเสียง AI นำทาง"
          >
            <Camera className="w-4 h-4 text-slate-950" />
            <span>กล้องสด AR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
