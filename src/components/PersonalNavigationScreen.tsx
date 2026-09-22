import React, { useState } from 'react';
import { Navigation, Search, MapPin, LocateFixed, Loader2, X } from 'lucide-react';
import { useRealtimeGps } from './GpsRealTimeTracker';
import { GoogleMapsNavigationScreen } from './GoogleMapsNavigationScreen';
import { POPULAR_BANGKOK_DESTINATIONS, RouteDestination, searchDestinationsFromGps } from '../services/googleRoutesService';

interface PersonalNavigationScreenProps {
  role: 'customer' | 'driver';
  audioEnabled?: boolean;
  onClose?: () => void;
}

/**
 * Personal/free destination lookup shared by customers and Knights.
 * Uses GPS + Google Places for destination resolution; road routing is unavailable while Routes API is disabled.
 */
export const PersonalNavigationScreen: React.FC<PersonalNavigationScreenProps> = ({
  role,
  audioEnabled = true,
  onClose
}) => {
  const { gpsState, acquireCurrentGps } = useRealtimeGps(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RouteDestination[]>([]);
  const [destination, setDestination] = useState<RouteDestination | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const searchDestination = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setError('กรุณาพิมพ์ชื่อสถานที่หรือที่อยู่อย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (!gpsState.isRealGps) {
      setError('กำลังรอ GPS จริง กรุณาเปิดสิทธิ์ Location แล้วลองใหม่');
      acquireCurrentGps();
      return;
    }
    setSearching(true);
    setError('');
    try {
      const found = await searchDestinationsFromGps({
        latitude: gpsState.latitude,
        longitude: gpsState.longitude,
        query: q
      });
      setResults(found);
      if (!found.length) setError('ไม่พบสถานที่จริง ลองค้นชื่อหรือที่อยู่อีกครั้ง');
    } catch (e) {
      console.warn('[PersonalNavigation]', e);
      setResults([]);
      setError('ค้นหาปลายทางจริงไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSearching(false);
    }
  };

  const choose = (place: RouteDestination) => {
    setDestination(place);
    setResults([]);
    setError('');
  };

  const clearDestination = () => {
    setDestination(null);
    setResults([]);
    setError('');
  };

  return (
    <div className="w-full space-y-3 font-mono">
      <div className="rounded-2xl border-2 border-cyan-400/40 bg-[#07132B]/95 p-3 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30">
              <Navigation className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm font-black text-white">นำทางส่วนตัว</div>
              <div className="text-[10px] text-cyan-300">
                {role === 'driver' ? 'พี่วิน • ใช้ได้แม้ไม่มีงาน' : 'ลูกค้า • ใช้ได้แม้ยังไม่ได้เรียกรถ'}
              </div>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-black/30 border border-white/10 px-2.5 py-2 mb-2">
          <LocateFixed className="w-4 h-4 text-emerald-300 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[9px] text-slate-500">ตำแหน่งปัจจุบัน</div>
            <div className="text-[10px] text-white truncate">
              {gpsState.isRealGps
                ? `GPS จริง • ${gpsState.latitude.toFixed(5)}, ${gpsState.longitude.toFixed(5)}`
                : gpsState.addressLabel}
            </div>
          </div>
          {!gpsState.isRealGps && <Loader2 className="w-4 h-4 text-cyan-300 animate-spin" />}
        </div>

        <div className="flex gap-1.5">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void searchDestination();
            }}
            placeholder="🔍 ค้นหาปลายทาง เช่น สยามพารากอน, สุวรรณภูมิ"
            className="min-w-0 flex-1 rounded-xl bg-black/70 border border-cyan-400/40 px-3 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-300"
            aria-label="ค้นหาปลายทาง"
          />
          <button
            type="button"
            onClick={() => void searchDestination()}
            disabled={searching}
            className="shrink-0 px-3 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {error && <div className="mt-2 text-[10px] text-rose-300 font-semibold">⚠️ {error}</div>}

        {results.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {results.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => choose(place)}
                className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-cyan-500/10 p-2.5 text-left"
              >
                <div className="flex gap-2 items-start">
                  <MapPin className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">{place.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{place.address}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!destination && results.length === 0 && (
          <div className="mt-3">
            <div className="text-[9px] text-amber-300 font-black mb-1.5">⭐ ปลายทางแนะนำ</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {POPULAR_BANGKOK_DESTINATIONS.slice(0, 6).map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => choose(place)}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-amber-400/10 p-2 text-left"
                >
                  <div className="text-[10px] font-black text-white truncate">{place.name}</div>
                  <div className="text-[9px] text-slate-500 truncate">{place.address}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {destination && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
            <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-white truncate">{destination.name}</div>
              <div className="text-[9px] text-slate-400 truncate">{destination.address}</div>
            </div>
            <button type="button" onClick={clearDestination} className="p-1 rounded-lg bg-white/5 text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {destination && gpsState.isRealGps ? (
        <GoogleMapsNavigationScreen
          role={role}
          initialPhase="in_transit"
          pickupAddress={gpsState.addressLabel}
          pickupCoords={{ lat: gpsState.latitude, lng: gpsState.longitude }}
          dropoffAddress={destination.address || destination.name}
          dropoffCoords={{ lat: destination.lat, lng: destination.lng }}
          audioEnabled={audioEnabled}
          onArrivedAtDropoff={() => setError('ถึงปลายทางแล้ว')}
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-center text-xs text-slate-400">
          <Navigation className="w-7 h-7 mx-auto mb-2 text-cyan-300" />
          {destination ? 'GPS พร้อมแล้ว • เปิด Google Maps เพื่อรับเส้นทางถนนจริง' : 'เลือกปลายทางเพื่อค้นหาพิกัดจริง'}
        </div>
      )}
    </div>
  );
};
