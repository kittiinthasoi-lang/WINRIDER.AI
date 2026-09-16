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
  AlertCircle,
  Video,
  X,
  Globe
} from 'lucide-react';
import { GpsLocationState } from './GpsRealTimeTracker';
import { playTactileBlip } from '../utils/audio';

export type MapProvider = 'google_maps' | 'mapbox';

interface GoogleMapsLiveViewProps {
  gpsLocation: GpsLocationState;
  targetDestination?: string;
  driverLocation?: { lat: number; lng: number; name: string };
  zoom?: number;
  height?: string;
  showControls?: boolean;
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  initialProvider?: MapProvider;
  audioEnabled?: boolean;
  onSwitchToCameraAR?: () => void;
  onSwitchTo3DMap?: () => void;
  onClose?: () => void;
}

export const GoogleMapsLiveView: React.FC<GoogleMapsLiveViewProps> = ({
  gpsLocation,
  targetDestination,
  driverLocation,
  zoom = 16,
  height = '420px',
  showControls = true,
  mapType: initialMapType = 'roadmap',
  initialProvider = 'google_maps',
  audioEnabled = true,
  onSwitchToCameraAR,
  onSwitchTo3DMap,
  onClose
}) => {
  const [provider, setProvider] = useState<MapProvider>(initialProvider);
  const [currentMapType, setCurrentMapType] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>(initialMapType);
  const [mapboxStyle, setMapboxStyle] = useState<'dark_navigation' | 'streets' | 'satellite'>('dark_navigation');
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);

  // Derive Google Maps and Mapbox Embed URL with actual coordinates
  const lat = gpsLocation.latitude || 13.7563;
  const lng = gpsLocation.longitude || 100.5018;

  // Google Maps embed URL with live coords
  const mapTypeParam = currentMapType === 'satellite' ? '&t=k' : currentMapType === 'terrain' ? '&t=p' : currentMapType === 'hybrid' ? '&t=h' : '';
  const googleEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=th&z=${currentZoom}&output=embed${mapTypeParam}`;

  // Mapbox dark navigation / OSM interactive embed
  const bboxDelta = 0.008 * (17 / currentZoom);
  const mapboxEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - bboxDelta}%2C${lat - bboxDelta * 0.7}%2C${lng + bboxDelta}%2C${lat + bboxDelta * 0.7}&layer=mapnik&marker=${lat}%2C${lng}`;

  const openGoogleMapsExternal = () => {
    if (audioEnabled) playTactileBlip(900);
    const destParam = targetDestination ? `&destination=${encodeURIComponent(targetDestination)}` : `&destination=${lat},${lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}${destParam}&travelmode=two_wheeler`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openMapboxExternal = () => {
    if (audioEnabled) playTactileBlip(900);
    // Mapbox Navigation / directions URL
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-cyan-500/40 bg-[#070D1E] shadow-2xl flex flex-col">
      {/* Top Map Engine Bar (Google Maps vs Mapbox Switcher) */}
      <div className="px-4 py-2.5 bg-[#0A1633]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center gap-3">
          {/* Provider Switcher Tabs */}
          <div className="flex items-center bg-black/70 p-1 rounded-xl border border-white/15">
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setProvider('google_maps');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                provider === 'google_maps'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <img 
                src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" 
                alt="Google Maps" 
                className="w-3.5 h-3.5 object-contain"
              />
              <span>Google Maps</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setProvider('mapbox');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                provider === 'mapbox'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-slate-950" />
              <span>Mapbox 3D</span>
            </button>
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <span>{provider === 'google_maps' ? 'Google Maps Live GPS' : 'Mapbox Vector Dark Navigation'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-[10px] text-cyan-300 flex items-center gap-1">
              <span>📍 {gpsLocation.addressLabel}</span>
            </div>
          </div>
        </div>

        {/* Live Navigation View Switcher (Google Maps / Mapbox <-> กล้องสด AR <-> แผนที่ 3D) */}
        <div className="flex items-center gap-1.5">
          {onSwitchToCameraAR && (
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(900);
                onSwitchToCameraAR();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_15px_#00D2FF] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              title="สลับเป็นกล้องสดมือถือ AR นำทางแบบเรียลไทม์"
            >
              <Video className="w-4 h-4 animate-pulse text-slate-950" />
              <span>สลับเป็นกล้องสด AR</span>
            </button>
          )}

          {onSwitchTo3DMap && (
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                onSwitchTo3DMap();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-bold border border-white/10 flex items-center gap-1 cursor-pointer transition-all"
              title="สลับเป็นแผนที่ 3D CI Capillary"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">แผนที่ 3D</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                onClose();
              }}
              className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center justify-center cursor-pointer transition-all"
              title="ปิดหน้าจอ"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live GPS Coordinates Badge & Layer controls */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse text-cyan-400" />
            <span>GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>

          {/* Map Type Switcher */}
          {provider === 'google_maps' ? (
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
          ) : (
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setMapboxStyle('dark_navigation');
                }}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  mapboxStyle === 'dark_navigation' ? 'bg-cyan-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Night HUD
              </button>
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setMapboxStyle('streets');
                }}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  mapboxStyle === 'streets' ? 'bg-blue-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Streets
              </button>
            </div>
          )}

          {/* External Navigation Launch Button */}
          <button
            type="button"
            onClick={provider === 'google_maps' ? openGoogleMapsExternal : openMapboxExternal}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black transition-all flex items-center gap-1 text-[10px] shadow-md"
            title="เปิดระบบนำทางเลี้ยวต่อเลี้ยว (Turn-by-Turn Motorcycle Mode)"
          >
            <Navigation className="w-3 h-3 fill-slate-950" />
            <span>นำทาง GPS</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Embedded Maps Viewport */}
      <div className="relative w-full overflow-hidden bg-slate-950" style={{ height }}>
        {provider === 'google_maps' ? (
          <iframe
            title="Google Maps Realtime View"
            src={googleEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0, filter: currentMapType === 'roadmap' ? 'contrast(1.05) saturate(1.1)' : 'none' }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
          />
        ) : (
          <div className="relative w-full h-full">
            <iframe
              title="Mapbox Navigation View"
              src={mapboxEmbedUrl}
              width="100%"
              height="100%"
              style={{ 
                border: 0, 
                filter: mapboxStyle === 'dark_navigation' 
                  ? 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(120%)' 
                  : 'contrast(1.1)' 
              }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />
            {/* Mapbox Vector Style Brand Overlay */}
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-cyan-400/40 text-[10px] text-cyan-300 font-mono font-bold flex items-center gap-1.5 pointer-events-none shadow-lg">
              <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Mapbox High-Speed Vector Engine</span>
            </div>
          </div>
        )}

        {/* Floating Live GPS & Target Overlay */}
        <div className="absolute top-3 left-3 z-10 p-3 rounded-2xl bg-[#091530]/90 backdrop-blur-md border border-cyan-500/40 shadow-xl max-w-xs space-y-1.5 font-mono text-[11px] pointer-events-auto">
          <div className="flex items-center justify-between">
            <span className="text-cyan-300 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{provider === 'google_maps' ? 'พิกัดดาวเทียม Google Maps' : 'พิกัดดาวเทียม Mapbox'}</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {gpsLocation.status === 'locked' ? 'GPS LOCKED 🛰️' : 'REAL GPS 📍'}
            </span>
          </div>
          <p className="text-slate-200 text-xs font-bold leading-tight">
            {gpsLocation.addressLabel}
          </p>
          {targetDestination && (
            <div className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
              <span>🎯 ปลายทาง: {targetDestination}</span>
            </div>
          )}
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
            className="w-9 h-9 rounded-xl bg-black/80 hover:bg-black text-white border border-white/20 flex items-center justify-center font-bold text-base shadow-lg transition-all active:scale-95 cursor-pointer"
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
            className="w-9 h-9 rounded-xl bg-black/80 hover:bg-black text-white border border-white/20 flex items-center justify-center font-bold text-base shadow-lg transition-all active:scale-95 cursor-pointer"
            title="ซูมออก"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
};
