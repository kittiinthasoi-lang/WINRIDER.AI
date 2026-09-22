import React from 'react';
import { AlertCircle, Compass, ExternalLink, MapPin, Navigation, Satellite, X } from 'lucide-react';
import { useRealGeolocation, calculateHaversineDistanceKm } from '../hooks/useRealGeolocation';
import { playTactileBlip } from '../utils/audio';

interface RealGpsMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationTitle?: string;
  destinationCoords?: { latitude: number; longitude: number };
  audioEnabled?: boolean;
}

/**
 * External-navigation reference only.
 * No Google Maps, Mapbox, OpenStreetMap or other embedded map is rendered here.
 * WINRIDER.AI shows real GPS/destination details and hands navigation to an external app.
 */
export const RealGpsMapModal: React.FC<RealGpsMapModalProps> = ({
  isOpen,
  onClose,
  destinationTitle = 'ปลายทาง',
  destinationCoords,
  audioEnabled = true,
}) => {
  const geo = useRealGeolocation(true);
  if (!isOpen) return null;

  const hasRealPosition = geo.isRealGps && geo.latitude !== null && geo.longitude !== null;
  const hasDestination = Number.isFinite(destinationCoords?.latitude) && Number.isFinite(destinationCoords?.longitude);
  const distanceToDest = hasRealPosition && hasDestination
    ? calculateHaversineDistanceKm(geo.latitude!, geo.longitude!, destinationCoords!.latitude, destinationCoords!.longitude)
    : null;

  const googleMapsNavUrl = hasDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destinationCoords!.latitude},${destinationCoords!.longitude}${hasRealPosition ? `&origin=${geo.latitude},${geo.longitude}` : ''}&travelmode=two_wheeler`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationTitle)}`;

  const openExternalMaps = () => {
    if (audioEnabled) playTactileBlip(1000);
    window.open(googleMapsNavUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
      <div className="relative flex h-auto max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 shadow-[0_0_50px_rgba(0,210,255,0.2)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400 bg-cyan-500/20 text-cyan-300">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase text-cyan-400">
                <Satellite className="h-3.5 w-3.5" /> GPS REFERENCE
                {hasRealPosition ? <span className="text-emerald-300">REAL GPS LOCK</span> : <span className="text-amber-300">WAITING FOR GPS</span>}
              </div>
              <h3 className="mt-0.5 text-sm font-bold text-white">ข้อมูลตำแหน่งและปลายทาง</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-slate-500">ปลายทาง</p>
                <p className="mt-1 text-base font-black text-white">{destinationTitle}</p>
                {hasDestination && <p className="mt-1 font-mono text-[10px] text-slate-400">{destinationCoords!.latitude.toFixed(6)}, {destinationCoords!.longitude.toFixed(6)}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-[10px] text-slate-500">GPS ปัจจุบัน</p>
              <p className="mt-1 font-mono text-xs text-cyan-300">{hasRealPosition ? `${geo.latitude!.toFixed(6)}, ${geo.longitude!.toFixed(6)}` : 'ยังไม่มี GPS จริง'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-[10px] text-slate-500">ระยะเส้นตรงอ้างอิง</p>
              <p className="mt-1 text-xs font-bold text-amber-300">{distanceToDest !== null ? `${distanceToDest} กม.` : 'ไม่พร้อมใช้งาน'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-[10px] text-slate-500">การนำทาง</p>
              <p className="mt-1 text-xs font-bold text-emerald-300">ภายนอกแอป</p>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-slate-300">
            <p className="font-bold text-cyan-200">ไม่มีแผนที่ฝังใน WINRIDER.AI</p>
            <p className="mt-1">หน้านี้แสดงเฉพาะข้อมูลอ้างอิงจาก GPS จริงและรายละเอียดปลายทาง ส่วนเส้นทาง, Traffic, ETA และ turn-by-turn จะทำงานในแอปแผนที่ภายนอกเมื่อคุณกดนำทาง</p>
          </div>

          {!hasDestination && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" /> ไม่มีพิกัดปลายทาง จึงเปิด Google Maps ด้วยชื่อสถานที่แทน
            </div>
          )}

          <button type="button" onClick={openExternalMaps} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400">
            <Navigation className="mr-2 inline h-4 w-4" /> เปิดการนำทางภายนอก <ExternalLink className="ml-2 inline h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-slate-950 p-3">
          <span className="text-[10px] text-slate-500">ไม่ใช้ Google Routes / Traffic / Navigation API ในแอป</span>
          <button type="button" onClick={onClose} className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20">ปิด</button>
        </div>
      </div>
    </div>
  );
};
