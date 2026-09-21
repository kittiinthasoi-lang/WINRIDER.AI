import React from 'react';
import { GoogleMapsRadarView, MapRadarEntity } from './GoogleMapsRadarView';

export interface RadarEntity {
  id: string;
  type: 'rider' | 'customer' | 'merchant' | 'transit_hub';
  name: string;
  avatar: string;
  categoryLabel?: string;
  x?: number;
  y?: number;
  z?: number;
  speed?: number;
  direction?: number;
  status?: string;
  etaMin?: number;
  level?: number;
  rating?: number;
  vehicleModel?: string;
  fareOrDeal?: string;
  demandIntensity?: number;
  specialBadge?: string;
}

interface DensityRadarOverlayProps {
  targetPerspective?: 'driver' | 'passenger' | 'merchant' | 'partner';
  venueName?: string;
  venueIcon?: string;
  venueCategory?: string;
  radiusKm?: number;
  audioEnabled?: boolean;
  onSelectEntity?: (entity: RadarEntity) => void;
  onBookRideWithRider?: (rider: RadarEntity) => void;
  onSelectDestinationForRide?: (entity: MapRadarEntity) => void | Promise<void>;
  isCompact?: boolean;
  className?: string;
  onBackToHome?: () => void;
}

/**
 * Google Maps Live Radar View
 * Strictly maintains real interactive Google Maps with real icons in the selected radius.
 * All 3D radar/meshes have been removed per user instruction.
 */
export const DensityRadarOverlay: React.FC<DensityRadarOverlayProps> = ({
  targetPerspective = 'driver',
  venueName,
  venueIcon,
  venueCategory,
  radiusKm = 2.5,
  audioEnabled = true,
  onSelectEntity,
  onBookRideWithRider,
  onSelectDestinationForRide,
  className = '',
  onBackToHome
}) => {
  // Map perspective to GoogleMapsRadarView perspective
  const mappedPerspective = targetPerspective === 'passenger' ? 'customer' : targetPerspective;

  return (
    <div className={`relative rounded-3xl overflow-hidden ${className}`}>
      <GoogleMapsRadarView
        targetPerspective={mappedPerspective as any}
        venueName={venueName}
        venueIcon={venueIcon}
        venueCategory={venueCategory}
        radiusKm={radiusKm}
        height="560px"
        audioEnabled={audioEnabled}
        onSelectEntity={(e: MapRadarEntity) => {
          if (onSelectEntity) {
            onSelectEntity(e as any);
          }
        }}
        onBookRideWithRider={(r: MapRadarEntity) => {
          if (onBookRideWithRider) {
            onBookRideWithRider(r as any);
          }
        }}
        onSelectDestinationForRide={onSelectDestinationForRide}
        onBackToHome={onBackToHome}
      />
    </div>
  );
};
