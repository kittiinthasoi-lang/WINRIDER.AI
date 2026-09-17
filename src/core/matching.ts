/**
 * WINRIDER.AI Core Matching Engine
 * 
 * ค้นหาและจับคู่อัศวินที่ออนไลน์ พิกัดใกล้เคียงที่สุด
 * พร้อมตรวจสอบเงื่อนไขการผ่านการอบรม (Certifications) สำหรับเสาหลักเฉพาะทาง
 */

import { Coordinates } from '../adapters/IMapProvider';

export interface KnightProfile {
  uid: string;
  displayName: string;
  phone: string;
  level: number;
  xp: number;
  isOnline: boolean;
  vehicleType: string;
  plateNumber: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  isFoundingKnight: boolean;
  equipmentPaid: boolean;
  certifications: string[]; // e.g. ['CERT_PETCARE', 'CERT_ELDERLY_SPIRIT', 'CERT_FAMILY_CARE']
  rating: number; // 6-star scale (e.g. 5.9 / 6.0)
  currentLocation: Coordinates;
}

export interface MatchScore {
  knight: KnightProfile;
  distanceKm: number;
  estimatedArrivalMinutes: number;
  isCertifiedForPillar: boolean;
  score: number;
}

export class MatchingEngine {
  /**
   * คำนวณระยะห่างระหว่างจุด 2 จุด (km)
   */
  public static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371;
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * จับคู่อัศวินที่เหมาะสมที่สุดสำหรับภารกิจ
   */
  public static findBestKnights(
    pickupCoords: Coordinates,
    knights: KnightProfile[],
    pillar: string,
    radiusKm: number = 5.0
  ): MatchScore[] {
    const CERTIFIED_PILLARS: Record<string, string> = {
      WIN_PETCARE: 'CERT_PETCARE',
      WIN_MU_BUDDY: 'CERT_MU_BUDDY',
      WIN_SPIRIT: 'CERT_ELDERLY_SPIRIT',
      WIN_FAMILY: 'CERT_FAMILY_CARE'
    };

    const requiredCert = CERTIFIED_PILLARS[pillar];

    const scoredKnights: MatchScore[] = [];

    for (const k of knights) {
      if (!k.isOnline) continue;

      const dist = this.calculateDistance(pickupCoords, k.currentLocation);
      if (dist > radiusKm) continue;

      const hasCert = requiredCert ? k.certifications.includes(requiredCert) : true;

      // Score weight: distance (smaller is better) + certification priority + level bonus + rating
      let score = 100 - dist * 10;
      if (hasCert) score += 30;
      score += Math.min(20, k.level * 0.5);
      score += (k.rating || 5.0) * 4;

      scoredKnights.push({
        knight: k,
        distanceKm: dist,
        estimatedArrivalMinutes: Math.max(2, Math.round(dist * 2.5)),
        isCertifiedForPillar: hasCert,
        score
      });
    }

    return scoredKnights.sort((a, b) => b.score - a.score);
  }
}
