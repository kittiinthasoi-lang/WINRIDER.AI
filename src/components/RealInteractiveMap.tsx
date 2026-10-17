import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass, Crosshair, ExternalLink, Maximize2, Navigation, Phone, RotateCcw,
} from 'lucide-react';
import { TacticalRadarItem } from './RealTacticalRadar';
import { playTactileBlip } from '../utils/audio';

interface RealInteractiveMapProps {
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
  height?: string;
}

export const RealInteractiveMap: React.FC<RealInteractiveMapProps> = ({
  userLatitude,
  userLongitude,
  accuracyMeters = 15,
  items,
  selectedId,
  onSelectItem,
  onActionClick,
  actionButtonLabel = 'เลือกเป้าหมาย',
  theme = 'pet',
  audioEnabled = true,
  height = '480px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const isEmergency = theme === 'emergency';
  const selectedItem = items.find((i) => i.id === selectedId) || null;

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLatitude, userLongitude],
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Invalidate size on load in case of container sizing delay
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Update User Marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLatitude, userLongitude]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-gps-marker',
        html: `
          <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="absolute h-9 w-9 rounded-full bg-cyan-400 opacity-60 animate-ping"></div>
            <div class="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-cyan-500 shadow-xl">
              <span class="h-2 w-2 rounded-full bg-white"></span>
            </div>
            <div class="mt-1 whitespace-nowrap rounded bg-slate-950/90 px-1.5 py-0.5 font-mono text-[9px] font-black text-cyan-300 shadow">
              ตำแหน่งคุณ
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      userMarkerRef.current = L.marker([userLatitude, userLongitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    }

    // Accuracy Circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng([userLatitude, userLongitude]);
      accuracyCircleRef.current.setRadius(Math.max(15, accuracyMeters));
    } else {
      accuracyCircleRef.current = L.circle([userLatitude, userLongitude], {
        radius: Math.max(15, accuracyMeters),
        color: '#06b6d4',
        weight: 1,
        fillColor: '#06b6d4',
        fillOpacity: 0.12,
      }).addTo(map);
    }

    // Clear old target markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add target markers
    items.forEach((item) => {
      const isSelected = item.id === selectedId;

      let badgeBg = 'bg-amber-500';
      let iconEmoji = '🏥';
      if (isEmergency) {
        if (item.typeIcon === 'fire_station' || /ดับเพลิง/i.test(item.name)) {
          badgeBg = 'bg-orange-600';
          iconEmoji = '🚒';
        } else if (item.typeIcon === 'police' || /ตำรวจ/i.test(item.name)) {
          badgeBg = 'bg-blue-600';
          iconEmoji = '🚓';
        } else if (item.typeIcon === 'rescue' || /กู้ภัย|มูลนิธิ/i.test(item.name)) {
          badgeBg = 'bg-amber-500';
          iconEmoji = '🚑';
        } else {
          badgeBg = 'bg-rose-600';
          iconEmoji = '🏥';
        }
      } else {
        if (item.typeIcon === 'hospital' || item.name.includes('โรงพยาบาล')) {
          badgeBg = 'bg-emerald-600';
          iconEmoji = '🏥';
        } else {
          badgeBg = 'bg-amber-500';
          iconEmoji = '🐾';
        }
      }

      const markerHtml = `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-110">
          <div class="relative flex h-8 w-8 items-center justify-center rounded-2xl ${badgeBg} border-2 ${
            isSelected ? 'border-white ring-4 ring-cyan-400 scale-125' : 'border-slate-900'
          } text-sm text-white shadow-xl">
            ${iconEmoji}
          </div>
          <div class="h-2 w-2 rotate-45 ${badgeBg} -mt-1 border-r border-b border-slate-900"></div>
          <div class="mt-0.5 whitespace-nowrap rounded-md bg-slate-950/90 px-1.5 py-0.5 font-bold text-[9px] text-white shadow max-w-[110px] truncate ${
            isSelected ? 'ring-1 ring-cyan-400 text-cyan-200' : ''
          }">
            ${item.name} (${item.distanceKm}k)
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: `target-marker-${item.id}`,
        html: markerHtml,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        if (audioEnabled) playTactileBlip(1100);
        onSelectItem(item);
      });

      markersRef.current.push(marker);
    });

    // Update Polyline to Selected Item
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (selectedItem) {
      polylineRef.current = L.polyline(
        [
          [userLatitude, userLongitude],
          [selectedItem.latitude, selectedItem.longitude],
        ],
        {
          color: isEmergency ? '#f43f5e' : '#f59e0b',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
        },
      ).addTo(map);
    }

    return () => {
      // Don't remove map instance completely here to avoid flash, but clean on unmount
    };
  }, [userLatitude, userLongitude, accuracyMeters, items, selectedId, isEmergency, audioEnabled, onSelectItem]);

  // Clean map on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Action: Recenter Map to User GPS
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (audioEnabled) playTactileBlip(1000);
    mapInstanceRef.current.setView([userLatitude, userLongitude], 14, { animate: true });
  };

  // Action: Fit All Markers
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    if (audioEnabled) playTactileBlip(1000);
    const allCoords: L.LatLngExpression[] = [[userLatitude, userLongitude], ...items.map((i) => [i.latitude, i.longitude] as [number, number])];
    if (allCoords.length > 1) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40], animate: true });
    }
  };

  return (
    <div className={`overflow-hidden rounded-3xl border-2 ${isEmergency ? 'border-rose-500/30 bg-[#070b14]' : 'border-amber-500/30 bg-[#090e1a]'} p-4 text-white shadow-2xl`}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isEmergency ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase text-cyan-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              INTERACTIVE OPENSTREETMAP LIVE
            </div>
            <p className="text-xs font-bold text-white">
              {isEmergency ? 'แผนที่พิกัดจริงศูนย์พยาบาลและกู้ภัย' : 'แผนที่พิกัดจริงสถานพยาบาลและคลินิกสัตว์'}
            </p>
          </div>
        </div>

        {/* Map Control Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRecenter}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-white/10 transition-colors"
            title="จัดกึ่งกลางที่ตำแหน่งฉัน"
          >
            <Crosshair className="h-3.5 w-3.5" /> ฉัน
          </button>
          <button
            type="button"
            onClick={handleFitAll}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors"
            title="ดูสถานีทั้งหมดบนแผนที่"
          >
            <Maximize2 className="h-3.5 w-3.5" /> ภาพรวม
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative my-3 overflow-hidden rounded-2xl border border-white/10 shadow-inner" style={{ height }}>
        <div ref={mapContainerRef} className="h-full w-full z-10" />

        {/* Float indicator badge */}
        <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 rounded-xl border border-black/40 bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono text-cyan-300 backdrop-blur-md shadow">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          GPS: {userLatitude.toFixed(4)}, {userLongitude.toFixed(4)}
        </div>
      </div>

      {/* Selected Station Tactical Detail Card */}
      {selectedItem ? (
        <div
          className={`mt-2 rounded-2xl border-2 ${
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
              <p className="mt-1 text-xs text-slate-300">{selectedItem.address || 'กรุงเทพมหานคร ประเทศไทย'}</p>
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

          {/* Quick Actions */}
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
                นำทาง Google Maps
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
        <div className="mt-2 rounded-xl border border-dashed border-white/10 bg-black/20 p-3 text-center text-xs text-slate-400">
          แตะที่หมุดสถานที่บนแผนที่เพื่อดูข้อมูล ทิศทาง และเรียกเดินทางทันที
        </div>
      )}
    </div>
  );
};
