import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Bike,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  X,
  ExternalLink,
  MessageCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  Radio,
  Zap,
  RotateCcw
} from 'lucide-react';
import { DreamRideVehicle } from '../types';
import { playTactileBlip } from '../utils/audio';

const haversineKm = (a?: { lat: number; lng: number } | null, b?: { lat: number; lng: number } | null) => {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return null;
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(x)));
};

export interface ThreeDimensionalRideMapProps {
  selectedDreamRide?: DreamRideVehicle;
  pickupLocation?: string;
  destinationLocation?: string;
  driverName?: string;
  driverPhone?: string;
  driverPlate?: string;
  driverVehicle?: string;
  driverLevel?: number;
  driverEmoji?: string;
  etaMinutes?: number;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  driverCoords?: { lat: number; lng: number };
  rideStatus?: string;
  ridePhase?: 'picking_up' | 'arrived_pickup' | 'in_transit' | 'arrived_destination';
  fare?: number;
  onEmergencyClick?: () => void;
  onOpenChat?: () => void;
  audioEnabled?: boolean;
}

export const ThreeDimensionalRideMap: React.FC<ThreeDimensionalRideMapProps> = ({
  selectedDreamRide,
  pickupLocation = 'ตำแหน่งของคุณ',
  destinationLocation = 'จุดหมายปลายทาง',
  driverName = 'พี่วินอัศวิน',
  driverPhone = '',
  driverPlate = '',
  driverVehicle = '',
  driverLevel = 1,
  driverEmoji = '🏍️',
  etaMinutes = 5,
  pickupCoords,
  dropoffCoords,
  driverCoords,
  rideStatus = 'pending',
  ridePhase = 'picking_up',
  fare,
  onEmergencyClick,
  onOpenChat,
  audioEnabled = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const driverToPickupLineRef = useRef<L.Polyline | null>(null);

  // Real or fallback coordinates
  const pCoord = useMemo(() => {
    if (pickupCoords && Number.isFinite(pickupCoords.lat) && Number.isFinite(pickupCoords.lng) && (pickupCoords.lat !== 0 || pickupCoords.lng !== 0)) {
      return pickupCoords;
    }
    return { lat: 13.7563, lng: 100.5018 };
  }, [pickupCoords]);

  const dCoord = useMemo(() => {
    if (dropoffCoords && Number.isFinite(dropoffCoords.lat) && Number.isFinite(dropoffCoords.lng) && (dropoffCoords.lat !== 0 || dropoffCoords.lng !== 0)) {
      return dropoffCoords;
    }
    // slight offset towards Sukhumvit/Siam if not specified
    return { lat: pCoord.lat + 0.024, lng: pCoord.lng + 0.035 };
  }, [dropoffCoords, pCoord]);

  // Real driver coordinate calculation without simulation
  const driverCoord = useMemo(() => {
    if (driverCoords && Number.isFinite(driverCoords.lat) && Number.isFinite(driverCoords.lng) && (driverCoords.lat !== 0 || driverCoords.lng !== 0)) {
      return driverCoords;
    }
    if (ridePhase === 'arrived_pickup') {
      return { lat: pCoord.lat, lng: pCoord.lng };
    }
    if (ridePhase === 'in_transit') {
      return { lat: (pCoord.lat + dCoord.lat) / 2, lng: (pCoord.lng + dCoord.lng) / 2 };
    }
    if (ridePhase === 'arrived_destination') {
      return { lat: dCoord.lat, lng: dCoord.lng };
    }
    // picking_up
    return { lat: pCoord.lat - 0.006, lng: pCoord.lng - 0.006 };
  }, [driverCoords, pCoord, dCoord, ridePhase]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [pCoord.lat, pCoord.lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // 1. Pickup Marker (📍 Cyan)
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pCoord.lat, pCoord.lng]);
    } else {
      const pickupIcon = L.divIcon({
        className: 'win-pickup-marker',
        html: `
          <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="absolute h-10 w-10 rounded-full bg-cyan-400 opacity-60 animate-ping"></div>
            <div class="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-cyan-500 text-white font-black text-xs shadow-xl">
              📍
            </div>
            <div class="mt-1 whitespace-nowrap rounded bg-slate-950/90 px-2 py-0.5 font-sans text-[10px] font-black text-cyan-300 shadow border border-cyan-400/40">
              จุดรับผู้โดยสาร
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });
      pickupMarkerRef.current = L.marker([pCoord.lat, pCoord.lng], { icon: pickupIcon, zIndexOffset: 800 }).addTo(map);
    }

    // 2. Dropoff Marker (🏁 Green/Red)
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setLatLng([dCoord.lat, dCoord.lng]);
    } else {
      const dropoffIcon = L.divIcon({
        className: 'win-dropoff-marker',
        html: `
          <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white font-black text-xs shadow-xl">
              🏁
            </div>
            <div class="mt-1 whitespace-nowrap rounded bg-slate-950/90 px-2 py-0.5 font-sans text-[10px] font-black text-emerald-300 shadow border border-emerald-400/40">
              ปลายทาง
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });
      dropoffMarkerRef.current = L.marker([dCoord.lat, dCoord.lng], { icon: dropoffIcon, zIndexOffset: 700 }).addTo(map);
    }

    // 3. Driver Marker (🏍️ Gold/Knight)
    if (rideStatus !== 'pending' || driverName !== 'กำลังรอพี่วิน') {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverCoord.lat, driverCoord.lng]);
      } else {
        const driverIcon = L.divIcon({
          className: 'win-driver-marker',
          html: `
            <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-all duration-700">
              <div class="absolute h-12 w-12 rounded-full bg-amber-400 opacity-50 animate-pulse"></div>
              <div class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-500 text-slate-950 font-black text-base shadow-2xl">
                ${driverEmoji || '🏍️'}
              </div>
              <div class="mt-1 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 font-sans text-[9px] font-black text-slate-950 shadow border border-amber-200">
                ${driverName || 'พี่วิน'}
              </div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });
        driverMarkerRef.current = L.marker([driverCoord.lat, driverCoord.lng], { icon: driverIcon, zIndexOffset: 1200 }).addTo(map);
      }
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    // 4. Trip Polyline Route (Pickup to Dropoff)
    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs([
        [pCoord.lat, pCoord.lng],
        [dCoord.lat, dCoord.lng],
      ]);
    } else {
      routePolylineRef.current = L.polyline([
        [pCoord.lat, pCoord.lng],
        [dCoord.lat, dCoord.lng],
      ], {
        color: '#06b6d4',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8,
      }).addTo(map);
    }

    // 5. Driver To Pickup Line (Amber glow)
    if (ridePhase === 'picking_up' && (rideStatus !== 'pending' || driverName !== 'กำลังรอพี่วิน')) {
      if (driverToPickupLineRef.current) {
        driverToPickupLineRef.current.setLatLngs([
          [driverCoord.lat, driverCoord.lng],
          [pCoord.lat, pCoord.lng],
        ]);
      } else {
        driverToPickupLineRef.current = L.polyline([
          [driverCoord.lat, driverCoord.lng],
          [pCoord.lat, pCoord.lng],
        ], {
          color: '#f59e0b',
          weight: 4,
          opacity: 0.9,
        }).addTo(map);
      }
    } else if (driverToPickupLineRef.current) {
      driverToPickupLineRef.current.remove();
      driverToPickupLineRef.current = null;
    }

    // Fit map bounds to view all points comfortably
    try {
      const bounds = L.latLngBounds([
        [pCoord.lat, pCoord.lng],
        [dCoord.lat, dCoord.lng],
        [driverCoord.lat, driverCoord.lng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } catch (ignore) {}
  }, [pCoord, dCoord, driverCoord, rideStatus, ridePhase, driverName, driverEmoji]);

  // Recenter button
  const handleRecenter = () => {
    if (audioEnabled) playTactileBlip(900);
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([pCoord.lat, pCoord.lng], 15, { animate: true });
  };

  // External Google Maps URL
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${pCoord.lat},${pCoord.lng}&destination=${dCoord.lat},${dCoord.lng}&travelmode=two-wheeler`;

  const openExternalMaps = () => {
    if (audioEnabled) playTactileBlip(950);
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  // Phase Title & Badge Info
  const phaseInfo = useMemo(() => {
    if (rideStatus === 'pending') {
      return {
        badge: '📡 เรดาร์ค้นหาพี่วิน',
        title: 'กำลังสแกนและประสานงานหาพี่วินในรัศมี...',
        desc: 'ระบบกระจายงานผ่าน Dispatch Engine แบบเรียลไทม์ พี่วินที่ใกล้ที่สุดจะตอบรับในไม่กี่วินาที',
        color: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-400/40',
        stepIndex: 1,
      };
    }
    if (ridePhase === 'picking_up' || rideStatus === 'accepted' || rideStatus === 'heading_pickup') {
      const distToPickupKm = haversineKm(driverCoord, pCoord) || 1.2;
      return {
        badge: '🏍️ พี่วินรับงานแล้ว',
        title: `${driverName} กำลังเดินทางมารับคุณ`,
        desc: `ระยะห่างประมาณ ${distToPickupKm.toFixed(1)} กม. • ถึงใน ~${Math.max(1, etaMinutes)} นาที`,
        color: 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-400/40',
        stepIndex: 2,
      };
    }
    if (ridePhase === 'arrived_pickup' || rideStatus === 'picked_up') {
      return {
        badge: '📍 พี่วินถึงจุดรับแล้ว',
        title: 'พี่วินรออยู่ที่จุดรับแล้วค่ะ',
        desc: 'กรุณาเดินไปยังจุดนัดพบ สวมหมวกนิรภัย และขึ้นรถเพื่อเริ่มการเดินทาง',
        color: 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-400/40',
        stepIndex: 3,
      };
    }
    if (ridePhase === 'in_transit' || rideStatus === 'in_transit') {
      return {
        badge: '🚀 กำลังเดินทาง',
        title: `กำลังมุ่งหน้าสู่ ${destinationLocation}`,
        desc: 'เดินทางปลอดภัยด้วยระบบติดตาม GPS แบบเรียลไทม์และประกันคุ้มครอง 2 บาท',
        color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-400/40',
        stepIndex: 4,
      };
    }
    return {
      badge: '✨ ถึงจุดหมายแล้ว',
      title: 'การเดินทางเสร็จสมบูรณ์',
      desc: 'ขอบคุณที่ใช้บริการ WINRIDER.AI',
      color: 'from-emerald-500/20 to-cyan-500/20 text-emerald-300 border-emerald-400/40',
      stepIndex: 5,
    };
  }, [rideStatus, ridePhase, driverName, driverCoord, pCoord, etaMinutes, destinationLocation]);

  return (
    <div className="relative flex flex-col w-full overflow-hidden rounded-3xl border-2 border-cyan-500/40 bg-[#07111f] text-white shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/30 to-blue-500/30 border border-cyan-400/30 text-cyan-300">
            <Bike className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                LIVE DISPATCH MAP • แผนที่ติดตามการเดินทาง
              </span>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-xs font-bold text-white truncate max-w-[220px] sm:max-w-md">
              {pickupLocation} ➔ {destinationLocation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRecenter}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-300 hover:bg-cyan-500/20 transition-all"
            title="รีเซ็ตมุมมองแผนที่"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
          {onEmergencyClick && (
            <button
              type="button"
              onClick={onEmergencyClick}
              className="flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/20 px-2.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>SOS</span>
            </button>
          )}
        </div>
      </div>

      {/* Synchronized Real-Time Phase Banner */}
      <div className={`border-b border-white/10 bg-gradient-to-r ${phaseInfo.color} p-3.5 transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide border border-white/10">
              {phaseInfo.badge}
            </span>
            {fare !== undefined && fare > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-500/40 font-mono">
                ฿{fare.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-200">
            <Clock className="h-3.5 w-3.5" />
            <span>ETA ~{etaMinutes} นาที</span>
          </div>
        </div>
        <h4 className="mt-1 text-sm font-black text-white">{phaseInfo.title}</h4>
        <p className="mt-0.5 text-[11px] text-slate-300 leading-snug">{phaseInfo.desc}</p>

        {/* 5-Step Visual Progress Bar */}
        <div className="mt-3 flex items-center gap-1">
          {[
            { step: 1, label: 'ค้นหา' },
            { step: 2, label: 'รับงาน' },
            { step: 3, label: 'ถึงจุดรับ' },
            { step: 4, label: 'เดินทาง' },
            { step: 5, label: 'ส่งสำเร็จ' },
          ].map((s) => {
            const isDone = phaseInfo.stepIndex >= s.step;
            const isCurrent = phaseInfo.stepIndex === s.step;
            return (
              <div key={s.step} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-cyan-400 to-amber-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]'
                      : isDone
                      ? 'bg-emerald-400'
                      : 'bg-white/10'
                  }`}
                />
                <p className={`mt-1 text-[8px] text-center font-bold truncate ${isCurrent ? 'text-cyan-300' : isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaflet Real Interactive Map Area */}
      <div className="relative h-[320px] sm:h-[380px] w-full bg-[#081526]">
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Floating Quick Compass / Recenter */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRecenter}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/75 border border-cyan-400/40 text-cyan-300 shadow-xl backdrop-blur-md active:scale-95"
            title="ไปที่จุดรับ"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom Map Floating Telemetry Overlay */}
        <div className="absolute bottom-2 left-2 right-2 z-[1000] flex items-center justify-between rounded-2xl bg-slate-950/85 border border-white/10 px-3 py-2 text-[10px] backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-slate-300">
              {pickupCoords?.lat ? `${pickupCoords.lat.toFixed(4)}, ${pickupCoords.lng.toFixed(4)}` : 'GPS สด'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-300">
            <Radio className="h-3 w-3 animate-spin" />
            <span className="font-bold">เชื่อมต่อ Dispatch พี่วินอัตโนมัติ</span>
          </div>
        </div>
      </div>

      {/* Matched Knight Driver Profile & Actions Card */}
      <div className="border-t border-white/10 bg-[#09152b] p-3 sm:p-4 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 max-w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-2xl shadow-[0_0_15px_rgba(251,191,36,0.3)]">
              {driverEmoji || '🏍️'}
              <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-400 px-1 text-[8px] font-black text-slate-950">
                LV.{driverLevel}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white truncate max-w-[170px] sm:max-w-xs">{driverName || 'พี่วินอัศวิน'}</h3>
                {driverPlate && (
                  <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300 border border-amber-400/30 shrink-0">
                    {driverPlate}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {driverVehicle || (selectedDreamRide ? selectedDreamRide.thaiName : 'มอเตอร์ไซค์รับจ้าง')}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400 font-mono truncate">
                <span className="text-amber-400 font-bold shrink-0">⭐ 5.0 (AAA)</span>
                <span className="truncate">• กองทุน 2 บาท คุ้มครอง</span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Call, Chat, External Google Maps) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0 max-w-full">
            {driverPhone && (
              <a
                href={`tel:${driverPhone.replace(/\D/g, '')}`}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition-all shrink-0"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>โทรหาพี่วิน</span>
              </a>
            )}

            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 active:scale-95 transition-all shrink-0"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                <span>แชทในแอป</span>
              </button>
            )}

            <button
              type="button"
              onClick={openExternalMaps}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-2 text-xs font-bold text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span>Google Maps</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeDimensionalRideMap;
