import { 
  doc, 
  runTransaction, 
  serverTimestamp, 
  setDoc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole, UserStatus } from '../types/auth';

export interface BaseRegistrationPayload {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  province: string;
  district: string;
  pdpaConsentAccepted: boolean;
}

export interface KnightRegistrationPayload extends BaseRegistrationPayload {
  vehicleType: 'motorcycle' | 'car';
  plateNumber: string;
  licenseNumber: string;
  driverLicenseUrl?: string;
  vehiclePhotoUrl?: string;
}

export interface CitizenRegistrationPayload extends BaseRegistrationPayload {
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface MerchantRegistrationPayload extends BaseRegistrationPayload {
  shopName: string;
  shopType: string;
  address: string;
  taxId?: string;
}

export interface PartnerRegistrationPayload extends BaseRegistrationPayload {
  orgName: string;
  orgType: string;
  contactPerson: string;
  estimatedUsers: number;
}

/**
 * Subscribe to real-time founding knight counter
 */
export function subscribeFoundingKnightCounter(callback: (data: { count: number; limit: number; remaining: number }) => void) {
  const counterRef = doc(db, 'counters', 'foundingKnights');
  return onSnapshot(counterRef, (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      const count = Number(d.count || 0);
      const limit = Number(d.limit || 1000);
      callback({ count, limit, remaining: Math.max(0, limit - count) });
    } else {
      // Default initial state
      callback({ count: 0, limit: 1000, remaining: 1000 });
      // Initialize doc softly
      setDoc(counterRef, { count: 0, limit: 1000 }).catch(() => {});
    }
  }, (err) => {
    console.warn('Counter snapshot notice:', err);
    callback({ count: 0, limit: 1000, remaining: 1000 });
  });
}

/**
 * Register Knight with atomic Founding Knight transaction and initial Satang wallet
 */
export async function registerKnight(payload: KnightRegistrationPayload): Promise<boolean> {
  const counterRef = doc(db, 'counters', 'foundingKnights');
  const userRef = doc(db, 'users', payload.uid);
  const knightRef = doc(db, 'knights', payload.uid);

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let count = 0;
    let limit = 1000;
    if (counterDoc.exists()) {
      const cData = counterDoc.data();
      count = Number(cData.count || 0);
      limit = Number(cData.limit || 1000);
    } else {
      transaction.set(counterRef, { count: 0, limit: 1000 });
    }

    const isFoundingKnight = count < limit;
    if (isFoundingKnight) {
      transaction.update(counterRef, { count: count + 1 });
    }

    // 1. users/{uid}
    transaction.set(userRef, {
      uid: payload.uid,
      email: payload.email,
      role: 'knight' as UserRole,
      displayName: payload.displayName.trim(),
      phone: payload.phone.trim(),
      province: payload.province.trim(),
      district: payload.district.trim(),
      status: 'pending_review' as UserStatus,
      pdpaConsent: {
        version: '1.0',
        acceptedAt: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. knights/{uid}
    transaction.set(knightRef, {
      level: 1,
      xp: 0,
      isOnline: false,
      vehicleType: payload.vehicleType,
      plateNumber: payload.plateNumber.trim(),
      licenseNumber: payload.licenseNumber.trim(),
      kycStatus: 'pending',
      isFoundingKnight,
      equipmentPaidSatang: 0,
      dailyEquipmentCount: 0,
      certifications: [],
      documents: {
        driverLicenseUrl: payload.driverLicenseUrl || '',
        vehiclePhotoUrl: payload.vehiclePhotoUrl || '',
      },
      createdAt: serverTimestamp(),
    });

    // Note: wallets/{uid} is created securely by Admin SDK/Cloud Functions only

    return isFoundingKnight;
  });
}

/**
 * Register Citizen (Instant Active pass)
 */
export async function registerCitizen(payload: CitizenRegistrationPayload): Promise<void> {
  const userRef = doc(db, 'users', payload.uid);
  const citizenRef = doc(db, 'citizens', payload.uid);

  await runTransaction(db, async (transaction) => {
    transaction.set(userRef, {
      uid: payload.uid,
      email: payload.email,
      role: 'citizen' as UserRole,
      displayName: payload.displayName.trim(),
      phone: payload.phone.trim(),
      province: payload.province.trim(),
      district: payload.district.trim(),
      status: 'active' as UserStatus, // Citizen gets immediate active pass!
      pdpaConsent: {
        version: '1.0',
        acceptedAt: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(citizenRef, {
      savedAddresses: [],
      emergencyContact: {
        name: payload.emergencyContactName.trim(),
        phone: payload.emergencyContactPhone.trim(),
      },
      createdAt: serverTimestamp(),
    });

    // Note: wallets/{uid} is created securely by Admin SDK/Cloud Functions only
  });
}

/**
 * Register Merchant Partner
 */
export async function registerMerchant(payload: MerchantRegistrationPayload): Promise<void> {
  const userRef = doc(db, 'users', payload.uid);
  const merchantRef = doc(db, 'merchants', payload.uid);

  await runTransaction(db, async (transaction) => {
    transaction.set(userRef, {
      uid: payload.uid,
      email: payload.email,
      role: 'merchant' as UserRole,
      displayName: payload.displayName.trim(),
      phone: payload.phone.trim(),
      province: payload.province.trim(),
      district: payload.district.trim(),
      status: 'pending_review' as UserStatus,
      pdpaConsent: {
        version: '1.0',
        acceptedAt: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(merchantRef, {
      shopName: payload.shopName.trim(),
      shopType: payload.shopType.trim(),
      address: payload.address.trim(),
      gpRate: 10,
      taxId: payload.taxId?.trim() || '',
      createdAt: serverTimestamp(),
    });

    // Note: wallets/{uid} is created securely by Admin SDK/Cloud Functions only
  });
}

/**
 * Register Institutional Partner
 */
export async function registerPartner(payload: PartnerRegistrationPayload): Promise<void> {
  const userRef = doc(db, 'users', payload.uid);
  const partnerRef = doc(db, 'partners', payload.uid);

  await runTransaction(db, async (transaction) => {
    transaction.set(userRef, {
      uid: payload.uid,
      email: payload.email,
      role: 'partner' as UserRole,
      displayName: payload.displayName.trim(),
      phone: payload.phone.trim(),
      province: payload.province.trim(),
      district: payload.district.trim(),
      status: 'pending_review' as UserStatus,
      pdpaConsent: {
        version: '1.0',
        acceptedAt: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(partnerRef, {
      orgName: payload.orgName.trim(),
      orgType: payload.orgType.trim(),
      contactPerson: payload.contactPerson.trim(),
      estimatedUsers: Number(payload.estimatedUsers) || 0,
      gpRate: 10,
      createdAt: serverTimestamp(),
    });

    // Note: wallets/{uid} is created securely by Admin SDK/Cloud Functions only
  });
}
