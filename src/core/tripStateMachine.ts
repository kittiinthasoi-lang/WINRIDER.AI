/**
 * WINRIDER.AI Trip State Machine
 * 
 * STRICT RULE 4: ทุก state ของ trip ต้องเปลี่ยนทางเดียว:
 * REQUESTED -> ACCEPTED -> ARRIVED -> IN_PROGRESS -> COMPLETED (หรือ CANCELLED)
 */

export type TripStatus = 'REQUESTED' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TripStateEvent {
  tripId: string;
  fromStatus: TripStatus;
  toStatus: TripStatus;
  timestamp: string;
  actorId: string;
  actorRole: 'knight' | 'citizen' | 'system';
  reason?: string;
}

export interface TripModel {
  id: string;
  pillar: 'WIN_KNIGHT' | 'WIN_EXPRESS' | 'WIN_PETCARE' | 'WIN_MU_BUDDY' | 'WIN_LIFESTYLE' | 'WIN_SPIRIT' | 'WIN_FAMILY' | 'WIN_LINK';
  citizenId: string;
  citizenName: string;
  citizenPhone: string;
  knightId?: string;
  knightName?: string;
  status: TripStatus;
  originName: string;
  destinationName: string;
  distanceKm: number;
  fare: number;
  feeBreakdown: {
    baseFare: number;
    platformFee: number;
    knightNet: number;
    deductionsTotal: number;
  };
  proofPhotos: {
    pickup?: string;     // รูปจุดรับ
    inTransit?: string;  // รูประหว่างทาง
    dropoff?: string;    // รูปส่งปลายทาง
  };
  history: TripStateEvent[];
  createdAt: string;
  updatedAt: string;
}

const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  REQUESTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  CANCELLED: []  // Terminal state
};

export class TripStateMachine {
  /**
   * ตรวจสอบว่าสามารถเปลี่ยนสถานะได้หรือไม่ตามกฎเปลี่ยนทางเดียว
   */
  public static canTransition(current: TripStatus, next: TripStatus): boolean {
    const validTargets = ALLOWED_TRANSITIONS[current] || [];
    return validTargets.includes(next);
  }

  /**
   * บังคับใช้การเปลี่ยนสถานะแบบ One-way transition
   */
  public static transition(
    trip: TripModel,
    nextStatus: TripStatus,
    actorId: string,
    actorRole: 'knight' | 'citizen' | 'system',
    reason?: string
  ): TripModel {
    if (!this.canTransition(trip.status, nextStatus)) {
      throw new Error(
        `ไม่สามารถเปลี่ยนสถานะภารกิจจาก ${trip.status} ไปเป็น ${nextStatus} ได้ตามกฎ One-Way Trip State Machine`
      );
    }

    const now = new Date().toISOString();
    const event: TripStateEvent = {
      tripId: trip.id,
      fromStatus: trip.status,
      toStatus: nextStatus,
      timestamp: now,
      actorId,
      actorRole,
      reason
    };

    return {
      ...trip,
      status: nextStatus,
      history: [...trip.history, event],
      updatedAt: now
    };
  }

  /**
   * สร้างภารกิจเริ่มต้น (REQUESTED)
   */
  public static createNewTrip(params: Omit<TripModel, 'status' | 'history' | 'createdAt' | 'updatedAt'>): TripModel {
    const now = new Date().toISOString();
    return {
      ...params,
      status: 'REQUESTED',
      proofPhotos: params.proofPhotos || {},
      history: [
        {
          tripId: params.id,
          fromStatus: 'REQUESTED',
          toStatus: 'REQUESTED',
          timestamp: now,
          actorId: params.citizenId,
          actorRole: 'citizen',
          reason: 'เริ่มต้นส่งคำขอภารกิจ'
        }
      ],
      createdAt: now,
      updatedAt: now
    };
  }
}
