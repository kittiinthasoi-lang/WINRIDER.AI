import React, { useMemo, useState } from 'react';
import {
  Compass, Crosshair, ExternalLink, Flame, Hospital, MapPin,
  Navigation, Phone, ShieldAlert, Sparkles, ZoomIn, ZoomOut,
} from 'lucide-react';
import { playTactileBlip } from '../utils/audio';

export interface TacticalRadarItem {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  bearingDeg?: number;
  phone?: string;
  address?: string;
  openNow?: boolean | null;
  is24Hours?: boolean;
  mapsUrl?: string;
  etaMinutes?: number;
  typeIcon?: 'hospital' | 'clinic' | 'police' | 'fire_station' | 'rescue' | 'veterinary';
}

interface RealTacticalRadarProps {
  userLatitude: number;
  userLongitude: number;
  accuracyMeters?: number;
  items: TacticalRadarItem[];
  selectedId?: string | null;
  onSelectItem: (item: TacticalRadarItem) => void;
  onActionClick?: (item: TacticalRadarItem) => void;
  actionButtonLabel?: string;
  theme?: 'pet' | 'emergency';
  audioEnabled?: boolean;
}

export const RealTacticalRadar: React.FC<RealTacticalRadarProps> = ({
  userLatitude,
  userLongitude,
  accuracyMeters = 10,
  items,
  selectedId,
  onSelectItem,
  onActionClick,
  actionButtonLabel = 'เลือกเป้าหมาย',
  theme = 'pet',
  audioEnabled = true,
}) => {
  // Max range radius options in km
  const rangeOptions = [3, 5, 10, 15, 25];
  const [maxRangeKm, setMaxRangeKm] = useState<number>(15);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId],
  );

  // Compute normalized polar coordinates for each item
  const blips = useMemo(() => {
    return items.map((item) => {
      // Calculate bearing if missing
      let bearing = item.bearingDeg;
      if (bearing === undefined || Number.isNaN(bearing)) {
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const dLon = toRad(item.longitude - userLongitude);
        const y = Math.sin(dLon) * Math.cos(toRad(item.latitude));
        const x =
          Math.cos(toRad(userLatitude)) * Math.sin(toRad(item.latitude)) -
          Math.sin(toRad(userLatitude)) * Math.cos(toRad(item.latitude)) * Math.cos(dLon);
        bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      }

      // Convert bearing & distance to (x, y) percent within radar circle (-100 to 100)
      // Bearing: 0° is North (top, y = -1), 90° East (right, x = 1), 180° South, 270° West
      const distRatio = Math.min(1.0, Math.max(0.04, item.distanceKm / maxRangeKm));
      const rad = ((bearing - 90) * Math.PI) / 180; // 0 deg is North
      const xPercent = 50 + Math.cos(rad) * distRatio * 43; // leave 7% margin inside circle
      const yPercent = 50 + Math.sin(rad) * distRatio * 43;

      return {
        ...item,
        bearingDeg: Math.round(bearing),
        xPercent,
        yPercent,
        inRange: item.distanceKm <= maxRangeKm,
      };
    });
  }, [items, userLatitude, userLongitude, maxRangeKm]);

  const handleSelect = (item: TacticalRadarItem) => {
    if (audioEnabled) playTactileBlip(1200);
    onSelectItem(item);
  };

  const isEmergency = theme === 'emergency';
  const accentColor = isEmergency ? 'rose' : 'amber';

  // Get color for blip based on category/type
  const getBlipColor = (blip: (typeof blips)[0]) => {
    if (isEmergency) {
      if (blip.typeIcon === 'fire_station' || /ดับเพลิง/i.test(blip.name)) return 'bg-orange-500 text-orange-200 border-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.8)]';
      if (blip.typeIcon === 'police' || /ตำรวจ/i.test(blip.name)) return 'bg-blue-500 text-blue-200 border-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.8)]';
      if (blip.typeIcon === 'rescue' || /กู้ภัย|มูลนิธิ/i.test(blip.name)) return 'bg-amber-400 text-amber-950 border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.8)]';
      return 'bg-rose-500 text-rose-100 border-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.8)]';
    }
    // Pet care
    if (blip.typeIcon === 'hospital' || blip.name.includes('โรงพยาบาล')) {
      return 'bg-emerald-400 text-slate-950 border-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.8)]';
    }
    return 'bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.8)]';
  };

  const getBlipIcon = (blip: (typeof blips)[0]) => {
    if (isEmergency) {
      if (blip.typeIcon === 'fire_station' || /ดับเพลิง/i.test(blip.name)) return '🚒';
      if (blip.typeIcon === 'police' || /ตำรวจ/i.test(blip.name)) return '🚓';
      if (blip.typeIcon === 'rescue' || /กู้ภัย|มูลนิธิ/i.test(blip.name)) return '🚑';
      return '🏥';
    }
    return blip.typeIcon === 'hospital' || blip.name.includes('โรงพยาบาล') ? '🏥' : '🐾';
  };

  return (
    <div className={`overflow-hidden rounded-3xl border-2 ${isEmergency ? 'border-rose-500/30 bg-[#070b14]' : 'border-amber-500/30 bg-[#090e1a]'} p-4 text-white shadow-2xl`}>
      {/* Top Header & Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className={`relative flex h-8 w-8 items-center justify-center rounded-xl ${isEmergency ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
            <Compass className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase text-cyan-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE 360° TACTICAL RADAR
            </div>
            <p className="text-xs font-bold text-white">
              {isEmergency ? 'เรดาร์สแกนศูนย์พยาบาลและกู้ภัยรอบตัว' : 'เรดาร์สแกนสถานพยาบาลสัตว์รอบตัว'}
            </p>
          </div>
        </div>

        {/* Range zoom buttons */}
        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 text-[11px]">
          <span className="px-2 text-slate-400 font-bold">รัศมี:</span>
          {rangeOptions.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(1000);
                setMaxRangeKm(km);
              }}
              className={`rounded-xl px-2.5 py-1 font-mono font-black transition-all ${
                maxRangeKm === km
                  ? isEmergency
                    ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                    : 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {km} กม.
            </button>
          ))}
        </div>
      </div>

      {/* Main Radar Screen Canvas */}
      <div className="relative my-4 flex items-center justify-center">
        <div
          className={`relative aspect-square w-full max-w-[380px] rounded-full border-2 ${
            isEmergency ? 'border-rose-500/40' : 'border-amber-500/40'
          } bg-gradient-to-b from-[#030712] via-[#050e20] to-[#030612] shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] overflow-hidden`}
        >
          {/* Radar Background Polar Grid Lines */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Concentric rings */}
            {[0.25, 0.5, 0.75, 1.0].map((scale, idx) => (
              <div
                key={scale}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-500/20"
                style={{
                  width: `${scale * 86}%`,
                  height: `${scale * 86}%`,
                }}
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-black/60 px-1 font-mono text-[9px] text-cyan-400/80">
                  {Math.round(scale * maxRangeKm)} กม.
                </span>
              </div>
            ))}

            {/* Crosshairs & Cardinal axes */}
            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-cyan-500/20" />
            <div className="absolute bottom-0 top-0 left-1/2 w-[1px] bg-cyan-500/20" />
            <div className="absolute left-0 right-0 top-1/2 h-[1px] rotate-45 bg-cyan-500/10" />
            <div className="absolute left-0 right-0 top-1/2 h-[1px] -rotate-45 bg-cyan-500/10" />

            {/* Compass Cardinal Badges */}
            <span className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-[11px] font-black text-rose-400">N (0°)</span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-black text-cyan-400">E (90°)</span>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[10px] font-black text-cyan-400">S (180°)</span>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-black text-cyan-400">W (270°)</span>
          </div>

          {/* Sweeping Radar Beam Animation */}
          <div
            className="absolute inset-0 pointer-events-none origin-center animate-[spin_4s_linear_infinite]"
            style={{
              background: isEmergency
                ? 'conic-gradient(from 0deg at 50% 50%, rgba(244, 63, 94, 0.3) 0deg, rgba(244, 63, 94, 0) 65deg, transparent 65deg)'
                : 'conic-gradient(from 0deg at 50% 50%, rgba(34, 211, 238, 0.3) 0deg, rgba(34, 211, 238, 0) 65deg, transparent 65deg)',
            }}
          />

          {/* Center Marker (User GPS position) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-cyan-500 shadow-[0_0_14px_rgba(34,211,238,1)]" />
            </span>
            <span className="mt-0.5 rounded bg-black/80 px-1 font-mono text-[8px] font-black text-cyan-300">
              YOU
            </span>
          </div>

          {/* Real Target Blips */}
          {blips.map((blip) => {
            if (!blip.inRange) return null;
            const isSelected = blip.id === selectedId;

            return (
              <button
                key={blip.id}
                type="button"
                onClick={() => handleSelect(blip)}
                style={{
                  left: `${blip.xPercent}%`,
                  top: `${blip.yPercent}%`,
                }}
                className="group absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-transform hover:scale-125 focus:outline-none"
                title={`${blip.name} • ${blip.distanceKm} กม. (${blip.bearingDeg}°)`}
              >
                {/* Blip Dot & Halo */}
                <div className="relative flex items-center justify-center">
                  {isSelected && (
                    <div className="absolute -inset-2.5 rounded-full border-2 border-white animate-spin opacity-80" />
                  )}
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black transition-all ${getBlipColor(
                      blip,
                    )} ${isSelected ? 'scale-125 ring-2 ring-white' : ''}`}
                  >
                    {getBlipIcon(blip)}
                  </span>
                </div>

                {/* Blip Mini Tooltip Label */}
                <div
                  className={`pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 px-1.5 py-0.5 text-[9px] font-bold shadow-md transition-opacity ${
                    isSelected ? 'opacity-100 ring-1 ring-cyan-400 text-white' : 'opacity-0 group-hover:opacity-100 text-slate-300'
                  }`}
                >
                  <span className="max-w-[120px] truncate inline-block align-middle">{blip.name}</span>
                  <span className="ml-1 text-cyan-300">({blip.distanceKm}k)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Status Bar */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Crosshair className={`h-4 w-4 ${isEmergency ? 'text-rose-400' : 'text-amber-400'}`} />
          <span className="text-slate-300">
            ตรวจพบ <strong className="text-white">{blips.filter((b) => b.inRange).length}</strong> แห่ง ในรัศมี {maxRangeKm} กม.
          </span>
        </div>
        <div className="font-mono text-[10px] text-cyan-300">
          GPS: {userLatitude.toFixed(4)}, {userLongitude.toFixed(4)} (±{Math.round(accuracyMeters)}ม.)
        </div>
      </div>

      {/* Selected Station Tactical Detail Card */}
      {selectedItem ? (
        <div
          className={`mt-3 rounded-2xl border-2 ${
            isEmergency ? 'border-rose-500/60 bg-gradient-to-br from-rose-950/40 via-[#0e1628] to-[#080d1a]' : 'border-amber-500/60 bg-gradient-to-br from-amber-950/40 via-[#0e1628] to-[#080d1a]'
          } p-4 shadow-xl transition-all`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    isEmergency ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {selectedItem.categoryLabel}
                </span>
                {selectedItem.is24Hours && (
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-300">
                    บริการ 24 ชม.
                  </span>
                )}
                {selectedItem.openNow !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      selectedItem.openNow ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'
                    }`}
                  >
                    {selectedItem.openNow ? 'เปิดทำการ' : 'ปิดทำการ'}
                  </span>
                )}
              </div>
              <h4 className="mt-1 text-base font-black text-white">{selectedItem.name}</h4>
              <p className="mt-1 text-xs text-slate-300">
                <MapPin className="mr-1 inline h-3.5 w-3.5 text-amber-300" />
                {selectedItem.address || 'กรุงเทพมหานคร ประเทศไทย'}
              </p>
            </div>

            <div className="text-right sm:shrink-0">
              <div className="font-mono text-lg font-black text-cyan-300">
                {selectedItem.distanceKm} <span className="text-xs font-normal">กม.</span>
              </div>
              <div className="text-[11px] text-slate-400">
                ทิศ {selectedItem.bearingDeg !== undefined ? `${selectedItem.bearingDeg}°` : '—'} • ~{selectedItem.etaMinutes || Math.round(selectedItem.distanceKm * 2.8 + 2)} นาที
              </div>
            </div>
          </div>

          {/* Quick Tactical Action Buttons */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {selectedItem.phone ? (
              <a
                href={`tel:${selectedItem.phone.replace(/\D/g, '')}`}
                className="flex items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/20 py-2.5 text-xs font-black text-rose-200 hover:bg-rose-500/30 transition-colors"
              >
                <Phone className="mr-1.5 h-4 w-4 text-rose-300" />
                โทร {selectedItem.phone}
              </a>
            ) : (
              <span className="flex items-center justify-center rounded-xl border border-white/5 bg-white/5 py-2.5 text-xs text-slate-500">
                ไม่มีเบอร์โทร
              </span>
            )}

            {selectedItem.mapsUrl ? (
              <a
                href={selectedItem.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/20 py-2.5 text-xs font-black text-cyan-200 hover:bg-cyan-500/30 transition-colors"
              >
                <ExternalLink className="mr-1.5 h-4 w-4 text-cyan-300" />
                Google Maps
              </a>
            ) : (
              <span />
            )}

            {onActionClick && (
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1400);
                  onActionClick(selectedItem);
                }}
                className={`flex items-center justify-center rounded-xl py-2.5 text-xs font-black transition-all ${
                  isEmergency
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:brightness-110'
                    : 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:brightness-110'
                }`}
              >
                <Navigation className="mr-1.5 h-4 w-4" />
                {actionButtonLabel}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center text-xs text-slate-400">
          แตะที่จุดเป้าหมายบนหน้าจอเรดาร์เพื่อดูรายละเอียด ทิศทาง และเรียกเดินทางทันที
        </div>
      )}
    </div>
  );
};
