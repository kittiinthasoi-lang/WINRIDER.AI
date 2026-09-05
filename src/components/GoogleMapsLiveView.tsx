import React, { useState } from 'react';
import { 
  MapPin, 
  Layers, 
  Compass, 
  Navigation, 
  RotateCw, 
  ShieldCheck, 
  ExternalLink,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { GpsLocationState } from './GpsRealTimeTracker';
import { playTactileBlip } from '../utils/audio';

interface GoogleMapsLiveViewProps {
  gpsLocation: GpsLocationState;
  targetDestination?: string;
  driverLocation?: { lat: number; lng: number; name: string };
  zoom?: number;
  height?: string;
  showControls?: boolean;
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  audioEnabled?: boolean;
}

export const GoogleMapsLiveView: React.FC<GoogleMapsLiveViewProps> = ({
  gpsLocation,
  targetDestination,
  driverLocation,
  zoom = 16,
  height = '420px',
  showControls = true,
  mapType: initialMapType = 'roadmap',
  audioEnabled = true
}) => {
  const [currentMapType, setCurrentMapType] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>(initialMapType);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [isTrafficActive, setIsTrafficActive] = useState<boolean>(true);

  // Derive Google Maps Embed URL with actual coordinates or search queries
  const lat = gpsLocation.latitude || 13.7563;
  const lng = gpsLocation.longitude || 100.5018;

  // Google Maps embed URL with live coords
  const mapTypeParam = currentMapType === 'satellite' ? '&t=k' : currentMapType === 'terrain' ? '&t=p' : currentMapType === 'hybrid' ? '&t=h' : '';
  const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=th&z=${currentZoom}&output=embed${mapTypeParam}`;

  const openGoogleMapsExternal = () => {
    if (audioEnabled) playTactileBlip(900);
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-cyan-500/40 bg-[#070D1E] shadow-2xl flex flex-col">
      {/* Top Google Maps Bar */}
      <div className="px-4 py-2.5 bg-[#0A1633]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white p-1 flex items-center justify-center shadow-md">
            <img 
              src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" 
              alt="Google Maps" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <span>Google Maps Live GPS</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-[10px] text-cyan-300 flex items-center gap-1">
              <span>📍 {gpsLocation.addressLabel}</span>
            </div>
          </div>
        </div>

        {/* Live GPS Coordinates Badge */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse text-cyan-400" />
            <span>GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>

          {/* Map Type Switcher */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-[10px]">
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setCurrentMapType('roadmap');
              }}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                currentMapType === 'roadmap' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              แผนที่ถนน
            </button>
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setCurrentMapType('satellite');
              }}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                currentMapType === 'satellite' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              ดาวเทียม
            </button>
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setCurrentMapType('terrain');
              }}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                currentMapType === 'terrain' ? 'bg-emerald-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              ภูมิประเทศ
            </button>
          </div>

          {/* External Google Maps Button */}
          <button
            type="button"
            onClick={openGoogleMapsExternal}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[10px]"
            title="เปิดใน Google Maps แอปพลิเคชัน"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Embedded Google Maps Viewport */}
      <div className="relative w-full overflow-hidden bg-slate-900" style={{ height }}>
        <iframe
          title="Google Maps Realtime View"
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0, filter: currentMapType === 'roadmap' ? 'contrast(1.05) saturate(1.1)' : 'none' }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full"
        />

        {/* Floating Live GPS & Target Overlay */}
        <div className="absolute top-3 left-3 z-10 p-3 rounded-2xl bg-[#091530]/90 backdrop-blur-md border border-cyan-500/40 shadow-xl max-w-xs space-y-1.5 font-mono text-[11px] pointer-events-auto">
          <div className="flex items-center justify-between">
            <span className="text-cyan-300 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ตำแหน่งพิกัดดาวเทียมสด</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {gpsLocation.status === 'locked' ? 'GPS LOCKED 🛰️' : 'SIMULATED GPS 📍'}
            </span>
          </div>
          <p className="text-slate-200 text-xs font-bold leading-tight">
            {gpsLocation.addressLabel}
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
            <span>ความแม่นยำ: ±{gpsLocation.accuracy}m</span>
            <span>ความเร็ว: {gpsLocation.speed || 0} km/h</span>
          </div>
        </div>

        {/* Quick Zoom Controls Floating on Map */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setCurrentZoom(prev => Math.min(19, prev + 1));
            }}
            className="w-9 h-9 rounded-xl bg-black/80 hover:bg-black text-white border border-white/20 flex items-center justify-center font-bold text-base shadow-lg transition-all active:scale-95"
            title="ซูมเข้า"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setCurrentZoom(prev => Math.max(12, prev - 1));
            }}
            className="w-9 h-9 rounded-xl bg-black/80 hover:bg-black text-white border border-white/20 flex items-center justify-center font-bold text-base shadow-lg transition-all active:scale-95"
            title="ซูมออก"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
};
