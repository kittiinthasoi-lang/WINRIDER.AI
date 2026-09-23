import { getAuthHeaders } from '../utils/dispatchSync';
import { MatchedDriver } from '../types';

type UnknownRecord = Record<string, unknown>;
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Loads real approved, online knights. Never falls back to invented people. */
export async function fetchLiveDrivers(origin?: { latitude: number; longitude: number }): Promise<MatchedDriver[]> {
  try {
    const query = origin ? `?latitude=${encodeURIComponent(origin.latitude)}&longitude=${encodeURIComponent(origin.longitude)}` : '';
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/knights/available${query}`, { headers });
    if (!response.ok) {
      console.warn(`Live drivers response: status ${response.status}`);
      return [];
    }
    const payload = await response.json() as { knights?: UnknownRecord[] };
    return (payload.knights || []).map((driver) => {
      const displayName = asString(driver.name, 'พี่วิน');
      const gender: 'female' | 'male' = driver.gender === 'female' ? 'female' : 'male';
      const level = asNumber(driver.level, 1);
      return {
        id: asString(driver.id), name: displayName, nameEn: asString(driver.nameEn, displayName), nickname: asString(driver.nickname, displayName), gender,
        level, tierName: asString(driver.tierName, `Knight Level ${level}`), rating: asNumber(driver.rating), totalTrips: asNumber(driver.totalTrips),
        phone: '', avatarEmoji: asString(driver.avatarEmoji, gender === 'female' ? '👩' : '🧑'), imageUrl: asString(driver.imageUrl) || undefined,
        vehicleModel: asString(driver.vehicleModel, 'มอเตอร์ไซค์รับจ้าง'), plateNumber: asString(driver.plateNumber), hasDeliveryBox: driver.hasDeliveryBox === true,
        certifications: asStringArray(driver.certifications), specialtyTags: asStringArray(driver.specialtyTags), distanceKm: asNumber(driver.distanceKm), etaMinutes: asNumber(driver.etaMinutes),
        bio: asString(driver.bio), serviceMatchScore: 100,
      };
    }).filter((driver) => driver.id);
  } catch (err) {
    console.warn('fetchLiveDrivers gracefully caught:', (err as Error)?.message || err);
    return [];
  }
}
