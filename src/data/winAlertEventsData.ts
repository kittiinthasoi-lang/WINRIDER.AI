export type WinAlertCategory = 'sale' | 'market' | 'concert' | 'sports' | 'festival' | 'community' | 'other';

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
