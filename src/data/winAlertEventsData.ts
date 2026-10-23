export type WinAlertCategory = 'concert' | 'sports' | 'sale' | 'market' | 'festival' | 'community' | 'other';

export interface WinAlertEvent {
  id: string;
  title: string;
  category: WinAlertCategory;
  venueName: string;
  venueArea: string;
  latitude: number;
  longitude: number;
  startAt: string;
  endAt?: string;
  description?: string;
  sourceName: string;
  source?: string;
  sourceUrl?: string;
  ticketUrl?: string;
  lastSourceSyncAt?: string;
  providerEventId: string;
  attendance?: number;
  rank?: number;
  distanceKm?: number;
  travelTip?: string;
  badgeText?: string;
  trafficLevel?: 'high' | 'medium' | 'normal';
  estimatedFare?: number;
}

export interface NearbyEventsResponse {
  events: WinAlertEvent[];
  source: string;
  sources?: string[];
  fetchedAt: string;
  eventDate: string;
  days?: number;
  country: string;
}
