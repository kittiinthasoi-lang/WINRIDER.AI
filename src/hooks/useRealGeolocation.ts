import { useState, useEffect, useCallback } from 'react';

export interface GeolocationPositionState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  isRealGps: boolean;
  error: string | null;
  isSupported: boolean;
}

// Default central Bangkok coordinates (Asoke / Sukhumvit 39)
export const DEFAULT_BANGKOK_COORDS = {
  latitude: 13.736717,
  longitude: 100.560417,
};

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

export function useRealGeolocation(enableHighAccuracy = true) {
  const [position, setPosition] = useState<GeolocationPositionState>({
    latitude: DEFAULT_BANGKOK_COORDS.latitude,
    longitude: DEFAULT_BANGKOK_COORDS.longitude,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: Date.now(),
    isRealGps: false,
    error: null,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });

  const [isWatching, setIsWatching] = useState<boolean>(false);

  const requestCurrentLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPosition((prev) => ({
        ...prev,
        error: 'เบราว์เซอร์ไม่รองรับ GPS Geolocation',
        isSupported: false,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
          isRealGps: true,
          error: null,
          isSupported: true,
        });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setPosition((prev) => ({
          ...prev,
          error: `ไม่สามารถดึงตำแหน่งจริงได้ (${err.message}) - สลับใช้พิกัดจำลองกรุงเทพฯ`,
          isRealGps: false,
        }));
      },
      {
        enableHighAccuracy,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, [enableHighAccuracy]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    let watchId: number | null = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp,
            isRealGps: true,
            error: null,
            isSupported: true,
          });
          setIsWatching(true);
        },
        (err) => {
          console.warn('WatchPosition error:', err.message);
          setPosition((prev) => ({
            ...prev,
            error: err.message,
          }));
        },
        {
          enableHighAccuracy,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
    } catch (e: any) {
      console.warn('Failed to start watchPosition:', e);
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enableHighAccuracy]);

  return {
    ...position,
    isWatching,
    refreshLocation: requestCurrentLocation,
  };
}
