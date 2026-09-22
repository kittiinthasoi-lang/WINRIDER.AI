export interface GoogleMapsCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Builds an external Google Maps URL. This is intentionally a normal web URL:
 * WINRIDER.AI does not embed a Google Maps/Mapbox map or expose a browser API key.
 */
export const buildGoogleMapsSearchUrl = (query: string, origin?: GoogleMapsCoordinate | null): string => {
  const trimmedQuery = query.trim();
  const locationQuery = origin && Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude)
    ? `${trimmedQuery}${trimmedQuery ? ' near ' : ''}${origin.latitude},${origin.longitude}`
    : trimmedQuery;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery || 'ประเทศไทย')}`;
};

export const buildGoogleMapsCoordinateUrl = (coordinate: GoogleMapsCoordinate): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${coordinate.latitude},${coordinate.longitude}`)}`;

export const openGoogleMapsExternal = (url: string): void => {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
};
