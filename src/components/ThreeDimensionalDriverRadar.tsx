import React from 'react';
import { Vehicle } from '../types';
import { GoogleMapsRadarView, MapRadarEntity } from './GoogleMapsRadarView';
import { RadarPlaceGroup } from '../utils/radarPlaces';

export type RadarCategory = 'all' | 'customer' | 'shop' | 'partner' | 'driver';

export interface Radar3DPing {
  id: string;
  name: string;
  avatar: string;
  imageUrl?: string;
  category: 'customer' | 'shop' | 'partner' | 'driver';
  categoryLabel: string;
  placeGroup: Exclude<RadarPlaceGroup, 'all'>;
  service: string;
  serviceEmoji: string;
  serviceType: 'knight' | 'express' | 'pet' | 'mu' | 'spirit';
  fare: number;
  distanceMeters: number;
  location: string;
  x: number;
  y: number;
  elevation: number;
  urgency: 'normal' | 'high' | 'urgent';
  specialNote?: string;
  badge: string;
  details?: string;
}

export interface ThreeDimensionalDriverRadarProps {
  activeVehicle?: Vehicle;
  isOnDuty?: boolean;
  driverLevel?: number;
  audioEnabled?: boolean;
  onTriggerJob?: (serviceType: 'knight' | 'express' | 'pet' | 'mu' | 'spirit') => void;
  onSelectPing?: (ping: Radar3DPing) => void;
}

/**
 * ThreeDimensionalDriverRadar:
 * Directly renders the clean GoogleMapsRadarView real interactive map.
 * In Radar mode, there is only the real map displaying all stations,
 * win riders, waiting passengers, shops, and partners.
 */
export const ThreeDimensionalDriverRadar: React.FC<ThreeDimensionalDriverRadarProps> = ({
  activeVehicle,
  isOnDuty = true,
  driverLevel = 1,
  audioEnabled = true,
  onTriggerJob,
  onSelectPing,
}) => {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-[#07111f] shadow-2xl">
      <GoogleMapsRadarView
        targetPerspective="driver"
        venueName={activeVehicle ? `แผนที่เรดาร์รับงานจริง: ${activeVehicle.name} (${activeVehicle.plateNumber})` : 'แผนที่เรดาร์รับงานจริงพี่วิน'}
        radiusKm={2.5}
        height="520px"
        audioEnabled={audioEnabled}
        onAcceptJobFromCustomer={(customer) => {
          if (onTriggerJob) onTriggerJob('knight');
        }}
        onSelectEntity={(entity: MapRadarEntity) => {
          if (onSelectPing) {
            onSelectPing({
              id: entity.id,
              name: entity.name,
              avatar: entity.avatar,
              category: entity.type === 'rider' ? 'driver' : entity.type === 'customer' ? 'customer' : 'partner',
              categoryLabel: entity.categoryLabel,
              placeGroup: 'driver',
              service: 'WIN KNIGHT',
              serviceEmoji: '🏍️',
              serviceType: 'knight',
              fare: 50,
              distanceMeters: Math.round(entity.distanceKm * 1000),
              location: entity.address || entity.name,
              x: 0,
              y: 0,
              elevation: 0,
              urgency: 'normal',
              badge: 'LIVE GPS',
              details: entity.status,
            });
          }
        }}
      />
    </div>
  );
};

export default ThreeDimensionalDriverRadar;
