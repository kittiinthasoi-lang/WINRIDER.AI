import { getAuthHeaders } from '../utils/dispatchSync';
import { MatchedDriver } from '../types';

type UnknownRecord = Record<string, unknown>;
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * Loads real approved, online knights. Never falls back to invented people.
 * Goes through the server's /api/knights/available endpoint (Admin SDK) rather
 * than reading the `users`/`knights` collections directly with the client SDK:
 * firestore.rules only allows a client to read its own document (or admin),
 * so an unfiltered client-side getDocs(collection(...)) is denied for a
 * regular passenger.
 */
export async function fetchLiveDrivers(): Promise<MatchedDriver[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/knights/available', { headers });
  if (!res.ok) {
    throw new Error(`Unable to load live drivers (status ${res.status})`);
  }
  const data = await res.json() as { knights?: Array<{ uid: string; user: UnknownRecord; knight: UnknownRecord }> };
  const entries = Array.isArray(data.knights) ? data.knights : [];

  const drivers: MatchedDriver[] = [];
  for (const entry of entries) {
    const user = entry.user || {};
    const knight = entry.knight || {};
    const displayName = asString(user.displayName, 'พี่วิน');
    const gender: 'female' | 'male' = user.gender === 'female' ? 'female' : 'male';
    const level = asNumber(knight.level, asNumber(user.level, 1));
    drivers.push({
      id: entry.uid, name: displayName, nameEn: asString(user.displayNameEn, displayName), nickname: asString(user.nickname, displayName), gender,
      level, tierName: asString(knight.tierName, `Knight Level ${level}`), rating: asNumber(knight.rating, asNumber(user.rating, 5)), totalTrips: asNumber(knight.totalTrips),
      phone: asString(user.phone), avatarEmoji: asString(user.avatarEmoji, gender === 'female' ? '👩' : '🧑'), imageUrl: asString(user.avatarUrl) || undefined,
      vehicleModel: asString(knight.vehicleModel, asString(knight.vehicleType, 'มอเตอร์ไซค์รับจ้าง')), plateNumber: asString(knight.plateNumber), hasDeliveryBox: knight.hasDeliveryBox === true,
      certifications: asStringArray(knight.certifications), specialtyTags: asStringArray(knight.specialtyTags), distanceKm: asNumber(knight.distanceKm), etaMinutes: asNumber(knight.etaMinutes),
      bio: asString(knight.bio), serviceMatchScore: asNumber(knight.serviceMatchScore, 100),
    });
  }
  return drivers;
}