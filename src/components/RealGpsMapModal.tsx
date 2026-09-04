import React, { useState } from 'react';
import { 
  Compass, 
  Navigation, 
  MapPin, 
  Crosshair, 
  ExternalLink, 
  X, 
  Gauge, 
  Satellite, 
  Layers, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useRealGeolocation, calculateHaversineDistanceKm, DEFAULT_BANGKOK_COORDS } from '../hooks/useRealGeolocation';
import { playTactileBlip } from '../utils/audio';

interface RealGpsMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationTitle?: string;
  destinationCoords?: { latitude: number; longitude: number };
  audioEnabled?: boolean;
}

export const RealGpsMapModal: React.FC<RealGpsMapModalProps> = ({
  isOpen,
  onClose,
  destinationTitle = 'อาคาร Exchange Tower อโศก',
  destinationCoords = { latitude: 13.7360, longitude: 100.5608 },
  audioEnabled = true,
}) => {
  const geo = useRealGeolocation(true);
  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>('dark');

  if (!isOpen) return null;

  const currentLat = geo.latitude;
  const currentLon = geo.longitude;
  const distanceToDest = calculateHaversineDistanceKm(
    currentLat,
    currentLon,
    destinationCoords.latitude,
    destinationCoords.longitude
  );

  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLon}&destination=${destinationCoords.latitude},${destinationCoords.longitude}&travelmode=two_wheeler`;

  // OpenStreetMap embed coordinates bounding box
  const delta = 0.008;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${currentLon - delta}%2C${currentLat - delta}%2C${currentLon + delta}%2C${currentLat + delta}&layer=mapnik&marker=${currentLat}%2C${currentLon}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,210,255,0.25)] text-slate-100 flex flex-col h-[88vh] max-h-[720px] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                  GPS LIVE SATELLITE TELEMETRY
                </span>
                {geo.isRealGps ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono">
                    <Satellite className="w-3 h-3 text-emerald-400" />
                    <span>REAL GPS LOCK (±{geo.accuracy ? Math.round(geo.accuracy) : 5}m)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-mono">
                    <AlertCircle className="w-3 h-3" />
                    <span>BANGKOK SIMULATION GPS</span>
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                พิกัดตำแหน่งจริง & นำทางเลี้ยวต่อเลี้ยว
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                geo.refreshLocation();
                if (audioEnabled) playTactileBlip(900);
              }}
              className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-mono flex items-center gap-1 transition-all active:scale-95"
              title="ดึงพิกัดปัจจุบันอีกครั้ง"
            >
              <Crosshair className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh GPS</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry Dashboard Strip */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3 bg-slate-950/70 border-b border-white/10 text-center font-mono">
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="text-[10px] text-slate-400">LATITUDE</div>
            <div className="text-xs font-bold text-cyan-300">{currentLat.toFixed(6)}</div>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="text-[10px] text-slate-400">LONGITUDE</div>
            <div className="text-xs font-bold text-cyan-300">{currentLon.toFixed(6)}</div>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="text-[10px] text-slate-400">DISTANCE TO DEST</div>
            <div className="text-xs font-bold text-amber-300">{distanceToDest} km</div>
          </div>
          <div className="hidden sm:block p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="text-[10px] text-slate-400">CURRENT SPEED</div>
            <div className="text-xs font-bold text-emerald-300">
              {geo.speed ? `${(geo.speed * 3.6).toFixed(1)} km/h` : '0.0 km/h'}
            </div>
          </div>
        </div>

        {/* Live Map Frame Container */}
        <div className="relative flex-1 bg-slate-900 overflow-hidden">
          <iframe
            title="Real Time GPS Map"
            src={osmUrl}
            className="w-full h-full border-none filter invert-90 contrast-125 hue-rotate-180 brightness-95"
          />

          {/* Overlay Coordinates Marker Pin HUD */}
          <div className="absolute top-4 left-4 p-3 rounded-2xl bg-black/85 backdrop-blur-md border border-cyan-400/40 shadow-xl max-w-[280px]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 mb-1">
              <MapPin className="w-4 h-4 text-cyan-400 animate-bounce" />
              <span>ตำแหน่งปัจจุบันของคุณ</span>
            </div>
            <div className="text-[11px] text-slate-300">
              {geo.isRealGps ? 'สัญญาณดาวเทียมตรวจพบตำแหน่งจริง' : 'ซอยสุขุมวิท 39 / พร้อมพงษ์'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              จุดหมาย: <span className="text-amber-300 font-bold">{destinationTitle}</span>
            </div>
          </div>

          {/* Quick External Navigation Floating Action Button */}
          <div className="absolute bottom-4 right-4">
            <a
              href={googleMapsNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (audioEnabled) playTactileBlip(1000);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center gap-2 transition-all active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              <span>เปิด Google Maps สองล้อ นำทางทันที</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-white/10 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            ระบบอัปเดตตำแหน่งอัตโนมัติแบบความแม่นยำสูง (High-Accuracy GPS)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-all active:scale-95"
          >
            ปิดแผนที่
          </button>
        </div>
      </div>
    </div>
  );
};
