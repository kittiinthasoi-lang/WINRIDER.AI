import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { MatchedDriver } from '../types';

type UnknownRecord = Record<string, unknown>;
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Loads real approved, online knights. Never falls back to invented people. */
export async function fetchLiveDrivers(): Promise<MatchedDriver[]> {
  const [usersSnapshot, knightsSnapshot] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'knights')),
  ]);
  const users = new Map<string, UnknownRecord>();
  usersSnapshot.forEach((item) => users.set(item.id, item.data() as UnknownRecord));
  const drivers: MatchedDriver[] = [];

  knightsSnapshot.forEach((item) => {
    const knight = item.data() as UnknownRecord;
    const user = users.get(item.id);
    const kycStatus = asString(knight.kycStatus).toLowerCase();
    if (!user || user.role !== 'knight' || user.status !== 'active' || knight.isOnline !== true || !['approved', 'verified'].includes(kycStatus)) return;

    const displayName = asString(user.displayName, 'พี่วิน');
    const gender: 'female' | 'male' = user.gender === 'female' ? 'female' : 'male';
    const level = asNumber(knight.level, asNumber(user.level, 1));
    drivers.push({
      id: item.id, name: displayName, nameEn: asString(user.displayNameEn, displayName), nickname: asString(user.nickname, displayName), gender,
      level, tierName: asString(knight.tierName, `Knight Level ${level}`), rating: asNumber(knight.rating, asNumber(user.rating, 5)), totalTrips: asNumber(knight.totalTrips),
      phone: asString(user.phone), avatarEmoji: asString(user.avatarEmoji, gender === 'female' ? '👩' : '🧑'), imageUrl: asString(user.avatarUrl) || undefined,
      vehicleModel: asString(knight.vehicleModel, asString(knight.vehicleType, 'มอเตอร์ไซค์รับจ้าง')), plateNumber: asString(knight.plateNumber), hasDeliveryBox: knight.hasDeliveryBox === true,
      certifications: asStringArray(knight.certifications), specialtyTags: asStringArray(knight.specialtyTags), distanceKm: asNumber(knight.distanceKm), etaMinutes: asNumber(knight.etaMinutes),
      bio: asString(knight.bio), serviceMatchScore: asNumber(knight.serviceMatchScore, 100),
    });
  });
  return drivers;
}
