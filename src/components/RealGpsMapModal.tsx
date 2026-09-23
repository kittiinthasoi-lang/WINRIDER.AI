import React from 'react';
import { X } from 'lucide-react';
import { GoogleMapsNavigationScreen } from './GoogleMapsNavigationScreen';

interface RealGpsMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId?: string;
  driverUserId?: string;
  driverName?: string;
  passengerName?: string;
  pickupAddress?: string;
  pickupCoords?: { latitude: number; longitude: number };
  destinationTitle?: string;
  destinationCoords?: { latitude: number; longitude: number };
  audioEnabled?: boolean;
}

export const RealGpsMapModal: React.FC<RealGpsMapModalProps> = ({
  isOpen, onClose, rideId, driverUserId, driverName, passengerName,
  pickupAddress = '', pickupCoords, destinationTitle = 'ปลายทาง', destinationCoords,
  audioEnabled = true,
}) => {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
    <div className="max-h-[96vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-cyan-400/30 bg-[#050B18] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 p-3">
        <div className="text-xs font-black text-cyan-300">WIN Live Location • A/B/C</div>
        <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-300"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-3">
        <GoogleMapsNavigationScreen
          role="customer"
          initialPhase="in_transit"
          rideId={rideId}
          driverUserId={driverUserId}
          driverName={driverName}
          passengerName={passengerName}
          pickupAddress={pickupAddress}
          pickupCoords={pickupCoords ? { lat: pickupCoords.latitude, lng: pickupCoords.longitude } : undefined}
          dropoffAddress={destinationTitle}
          dropoffCoords={destinationCoords ? { lat: destinationCoords.latitude, lng: destinationCoords.longitude } : undefined}
          audioEnabled={audioEnabled}
        />
      </div>
    </div>
  </div>;
};
