export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  steps: string[];
}

export interface IMapProvider {
  name: string;
  calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult>;
  reverseGeocode(coords: Coordinates): Promise<string>;
  getCurrentPosition(): Promise<Coordinates>;
}
