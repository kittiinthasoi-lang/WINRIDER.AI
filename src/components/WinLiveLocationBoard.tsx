import React, { useMemo } from 'react';
import { Crosshair, MapPin, Navigation } from 'lucide-react';

export interface WinLocationPoint {
  lat: number;
  lng: number;
  label: string;
  detail?: string;
}

interface Props {
  pointA?: WinLocationPoint | null;
  pointB?: WinLocationPoint | null;
  pointC?: WinLocationPoint | null;
  className?: string;
}

const isValid = (point?: WinLocationPoint | null) =>
  Boolean(point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180);

export const WinLiveLocationBoard: React.FC<Props> = ({ pointA, pointB, pointC, className = '' }) => {
  const projected = useMemo(() => {
    const entries = [['A', pointA, 'cyan'], ['B', pointB, 'emerald'], ['C', pointC, 'amber']] as const;
    const available = entries.filter(([, point]) => isValid(point));
    if (!available.length) return [];
    const lats = available.map(([, p]) => p!.lat);
    const lngs = available.map(([, p]) => p!.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latSpan = Math.max(0.0012, maxLat - minLat);
    const lngSpan = Math.max(0.0012, maxLng - minLng);
    const latMid = (minLat + maxLat) / 2;
    const lngMid = (minLng + maxLng) / 2;
    return available.map(([key, point, tone]) => ({
      key, point: point!, tone,
      x: 50 + ((point!.lng - lngMid) / lngSpan) * 72,
      y: 50 - ((point!.lat - latMid) / latSpan) * 72,
    }));
  }, [pointA, pointB, pointC]);

  const byKey = (key: string) => projected.find((item) => item.key === key);

  return <div className={`relative h-[310px] overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#071426] ${className}`}>
    <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(103,232,249,.10) 1px, transparent 1px),linear-gradient(90deg,rgba(103,232,249,.10) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.16),transparent_58%)]" />
    <div className="absolute left-3 top-3 z-20 rounded-xl border border-cyan-400/20 bg-black/45 px-2.5 py-1.5 text-[9px] font-black text-cyan-200">
      <Crosshair className="mr-1 inline h-3.5 w-3.5" /> WIN LIVE LOCATION • NO MAP API
    </div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      {byKey('A') && byKey('B') && <line x1={byKey('A')!.x} y1={byKey('A')!.y} x2={byKey('B')!.x} y2={byKey('B')!.y} stroke="rgba(34,211,238,.72)" strokeWidth="0.9" strokeDasharray="2 2" />}
      {byKey('B') && byKey('C') && <line x1={byKey('B')!.x} y1={byKey('B')!.y} x2={byKey('C')!.x} y2={byKey('C')!.y} stroke="rgba(251,191,36,.72)" strokeWidth="0.9" strokeDasharray="2 2" />}
    </svg>
    {projected.map(({ key, point, x, y, tone }) => {
      const toneClass = tone === 'cyan'
        ? 'border-cyan-300 bg-cyan-400 text-slate-950'
        : tone === 'emerald'
          ? 'border-emerald-300 bg-emerald-400 text-slate-950'
          : 'border-amber-300 bg-amber-400 text-slate-950';
      return <div key={key} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${Math.max(9, Math.min(91, x))}%`, top: `${Math.max(13, Math.min(87, y))}%` }}>
        <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black shadow-lg ${toneClass}`}>{key}</div>
        <div className="mt-1 max-w-[150px] rounded-xl border border-white/10 bg-slate-950/90 px-2 py-1 text-center shadow-xl">
          <div className="truncate text-[9px] font-black text-white">{point.label}</div>
          {point.detail && <div className="truncate text-[8px] text-slate-400">{point.detail}</div>}
          <div className="font-mono text-[7px] text-slate-500">{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</div>
        </div>
      </div>;
    })}
    {!projected.length && <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-slate-400"><div><Navigation className="mx-auto mb-2 h-7 w-7 text-cyan-300" />กำลังรอพิกัดจริง</div></div>}
    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[8px] text-slate-500">
      <span><Navigation className="mr-1 inline h-3 w-3" />A พี่วิน → B จุดรับ → C ปลายทาง</span>
      <span><MapPin className="mr-1 inline h-3 w-3" />จออ้างอิงพิกัดสด</span>
    </div>
  </div>;
};

export default WinLiveLocationBoard;
