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

const FRESH_PROGRESSION = {
  level: 1,
  xp: 0,
  points: 0,
  creditScore: 0,
  financialScore: 0,
  rideLaterCredit: 0,
  missionsCompleted: 0,
  missionStreak: 0,
  badges: [],
  achievements: [],
  dailyStats: {},
  weeklyStats: {},
  lifetimeStats: {},
  questSeason: '2026-S3',
  questState: {},
} as const;

export function subscribeFoundingKnightCounter(callback: (data: { count: number; limit: number; remaining: number }) => void) {
  const counterRef = doc(db, 'counters', 'foundingKnights');
  return onSnapshot(counterRef, (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      const count = Number(d.count || 0);
      const limit = Number(d.limit || 1000);
      callback({ count, limit, remaining: Math.max(0, limit - count) });
    } else {
      callback({ count: 0, limit: 1000, remaining: 1000 });
      setDoc(counterRef, { count: 0, limit: 1000 }).catch(() => {});
    }
  }, (err) => {
    console.warn('Counter snapshot notice:', err);
    callback({ count: 0, limit: 1000, remaining: 1000 });
  });
}

function persistLocalAndServerUser(uid: string, userDoc: any) {
  if (typeof window !== 'undefined' && uid) {
    try {
      localStorage.setItem(`WINRIDER_USER_DOC_${uid}`, JSON.stringify(userDoc));
    } catch {}
    fetch('/api/users/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userDoc),
    }).catch(() => {});
  }
}

export async function registerKnight(payload: KnightRegistrationPayload): Promise<boolean> {
  const counterRef = doc(db, 'counters', 'foundingKnights');
  const userRef = doc(db, 'users', payload.uid);
  const knightRef = doc(db, 'knights', payload.uid);

  let isFoundingKnight = false;

  try {
    isFoundingKnight = await runTransaction(db, async (transaction) => {
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
      const founding = count < limit;
      if (founding) transaction.update(counterRef, { count: count + 1 });

      const userDoc = {
        uid: payload.uid, email: payload.email, role: 'knight' as UserRole,
        displayName: payload.displayName.trim(), name: payload.displayName.trim(),
        phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
        status: 'pending_review' as UserStatus,
        level: 1, xp: 0, points: 0, creditScore: 0, financialScore: 0, rideLaterCredit: 0,
        missionsCompleted: 0, missionStreak: 0, badges: [], achievements: [], questSeason: '2026-S3', questState: {},
        pdpaConsent: { version: '1.0', acceptedAt: serverTimestamp() }, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      transaction.set(userRef, userDoc);

      transaction.set(knightRef, {
        ...FRESH_PROGRESSION,
        displayName: payload.displayName.trim(), name: payload.displayName.trim(), email: payload.email.trim(),
        phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
        isOnline: false, vehicleType: payload.vehicleType, plateNumber: payload.plateNumber.trim(),
        licenseNumber: payload.licenseNumber.trim(), kycStatus: 'pending', isFoundingKnight: founding,
        equipmentPaidSatang: 0, dailyEquipmentCount: 0, certifications: [],
        documents: { driverLicenseUrl: payload.driverLicenseUrl || '', vehiclePhotoUrl: payload.vehiclePhotoUrl || '' },
        createdAt: serverTimestamp(),
      });
      return founding;
    });
  } catch (txErr) {
    console.warn('Knight transaction fallback to direct setDoc:', txErr);
    const userDoc = {
      uid: payload.uid, email: payload.email, role: 'knight' as UserRole,
      displayName: payload.displayName.trim(), name: payload.displayName.trim(),
      phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
      status: 'pending_review' as UserStatus,
      level: 1, xp: 0, points: 0, creditScore: 0, financialScore: 0, rideLaterCredit: 0,
      missionsCompleted: 0, missionStreak: 0, badges: [], achievements: [], questSeason: '2026-S3', questState: {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, userDoc, { merge: true });
    await setDoc(knightRef, {
      ...FRESH_PROGRESSION,
      displayName: payload.displayName.trim(), name: payload.displayName.trim(), email: payload.email.trim(),
      phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
      isOnline: false, vehicleType: payload.vehicleType, plateNumber: payload.plateNumber.trim(),
      licenseNumber: payload.licenseNumber.trim(), kycStatus: 'pending', isFoundingKnight: false,
      equipmentPaidSatang: 0, dailyEquipmentCount: 0, certifications: [],
      documents: { driverLicenseUrl: payload.driverLicenseUrl || '', vehiclePhotoUrl: payload.vehiclePhotoUrl || '' },
      createdAt: new Date().toISOString(),
    }, { merge: true });
  }

  persistLocalAndServerUser(payload.uid, {
    uid: payload.uid, email: payload.email, role: 'knight',
    displayName: payload.displayName.trim(), phone: payload.phone.trim(),
    province: payload.province.trim(), district: payload.district.trim(),
    status: 'pending_review', level: 1, xp: 0, points: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  return isFoundingKnight;
}

export async function registerCitizen(payload: CitizenRegistrationPayload): Promise<void> {
  const userRef = doc(db, 'users', payload.uid);
  const citizenRef = doc(db, 'citizens', payload.uid);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(userRef, {
        uid: payload.uid, email: payload.email, role: 'citizen' as UserRole,
        displayName: payload.displayName.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
        status: 'active' as UserStatus, level: 1, xp: 0, points: 0, creditScore: 0, financialScore: 0, rideLaterCredit: 0,
        missionsCompleted: 0, missionStreak: 0, badges: [], achievements: [], questSeason: '2026-S3', questState: {},
        pdpaConsent: { version: '1.0', acceptedAt: serverTimestamp() }, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      transaction.set(citizenRef, {
        ...FRESH_PROGRESSION,
        displayName: payload.displayName.trim(), name: payload.displayName.trim(), email: payload.email.trim(),
        phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(), savedAddresses: [],
        emergencyContact: { name: payload.emergencyContactName.trim(), phone: payload.emergencyContactPhone.trim() }, createdAt: serverTimestamp(),
      });
    });
  } catch (err) {
    console.warn('registerCitizen transaction notice, using direct setDoc:', err);
    await setDoc(userRef, {
      uid: payload.uid, email: payload.email, role: 'citizen' as UserRole,
      displayName: payload.displayName.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
      status: 'active' as UserStatus, level: 1, xp: 0, points: 0, creditScore: 0, financialScore: 0, rideLaterCredit: 0,
      missionsCompleted: 0, missionStreak: 0, badges: [], achievements: [], questSeason: '2026-S3', questState: {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }, { merge: true });
    await setDoc(citizenRef, {
      ...FRESH_PROGRESSION,
      displayName: payload.displayName.trim(), name: payload.displayName.trim(), email: payload.email.trim(),
      phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(), savedAddresses: [],
      emergencyContact: { name: payload.emergencyContactName.trim(), phone: payload.emergencyContactPhone.trim() },
      createdAt: new Date().toISOString(),
    }, { merge: true });
  }

  persistLocalAndServerUser(payload.uid, {
    uid: payload.uid, email: payload.email, role: 'citizen',
    displayName: payload.displayName.trim(), phone: payload.phone.trim(),
    province: payload.province.trim(), district: payload.district.trim(),
    status: 'active', level: 1, xp: 0, points: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
}

export async function registerMerchant(payload: MerchantRegistrationPayload): Promise<void> {
  const userRef = doc(db, 'users', payload.uid);
  const merchantRef = doc(db, 'merchants', payload.uid);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(userRef, {
        uid: payload.uid, email: payload.email, role: 'merchant' as UserRole,
        displayName: payload.displayName.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
        status: 'pending_review' as UserStatus, level: 1, xp: 0, points: 0, creditScore: 0, financialScore: 0, rideLaterCredit: 0,
        missionsCompleted: 0, missionStreak: 0, badges: [], achievements: [], questSeason: '2026-S3', questState: {},
        pdpaConsent: { version: '1.0', acceptedAt: serverTimestamp() }, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      transaction.set(merchantRef, {
        ...FRESH_PROGRESSION,
        displayName: payload.displayName.trim(), name: payload.shopName.trim(), ownerName: payload.displayName.trim(),
        email: payload.email.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
        shopName: payload.shopName.trim(), shopType: payload.shopType.trim(), address: payload.address.trim(), gpRate: 10,
        taxId: payload.taxId?.trim() || '', createdAt: serverTimestamp(),
      });
    });
  } catch (err) {
    console.warn('registerMerchant transaction notice, using direct setDoc:', err);
    await setDoc(userRef, {
      uid: payload.uid, email: payload.email, role: 'merchant' as UserRole,
      displayName: payload.displayName.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
      status: 'pending_review' as UserStatus, level: 1, xp: 0, points: 0, creditScore: 0, financialScore: 0, rideLaterCredit: 0,
      missionsCompleted: 0, missionStreak: 0, badges: [], achievements: [], questSeason: '2026-S3', questState: {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }, { merge: true });
    await setDoc(merchantRef, {
      ...FRESH_PROGRESSION,
      displayName: payload.displayName.trim(), name: payload.shopName.trim(), ownerName: payload.displayName.trim(),
      email: payload.email.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
      shopName: payload.shopName.trim(), shopType: payload.shopType.trim(), address: payload.address.trim(), gpRate: 10,
      taxId: payload.taxId?.trim() || '', createdAt: new Date().toISOString(),
    }, { merge: true });
  }

  persistLocalAndServerUser(payload.uid, {
    uid: payload.uid, email: payload.email, role: 'merchant',
    displayName: payload.displayName.trim(), phone: payload.phone.trim(),
    province: payload.province.trim(), district: payload.district.trim(),
    status: 'pending_review', level: 1, xp: 0, points: 0,
    shopName: payload.shopName.trim(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
}

export async function registerPartner(payload: PartnerRegistrationPayload): Promise<void> {
  const userRef = doc(db, 'users', payload.uid);
  const partnerRef = doc(db, 'partners', payload.uid);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(userRef, {
        uid: payload.uid, email: payload.email, role: 'partner' as UserRole,
        displayName: payload.displayName.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
        status: 'pending_review' as UserStatus, level: 1, xp: 0, points: 0, creditScore: 0, financialScore: 0, rideLaterCredit: 0,
        missionsCompleted: 0, missionStreak: 0, badges: [], achievements: [], questSeason: '2026-S3', questState: {},
        pdpaConsent: { version: '1.0', acceptedAt: serverTimestamp() }, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      transaction.set(partnerRef, {
        ...FRESH_PROGRESSION,
        displayName: payload.orgName.trim(), name: payload.orgName.trim(), contactPerson: payload.contactPerson.trim(),
        contactEmail: payload.email.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
        orgName: payload.orgName.trim(), orgType: payload.orgType.trim(), estimatedUsers: Number(payload.estimatedUsers) || 0,
        gpRate: 10, createdAt: serverTimestamp(),
      });
    });
  } catch (err) {
    console.warn('registerPartner transaction notice, using direct setDoc:', err);
    await setDoc(userRef, {
      uid: payload.uid, email: payload.email, role: 'partner' as UserRole,
      displayName: payload.displayName.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
      status: 'pending_review' as UserStatus, level: 1, xp: 0, points: 0, creditScore: 0, financialScore: 0, rideLaterCredit: 0,
      missionsCompleted: 0, missionStreak: 0, badges: [], achievements: [], questSeason: '2026-S3', questState: {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }, { merge: true });
    await setDoc(partnerRef, {
      ...FRESH_PROGRESSION,
      displayName: payload.orgName.trim(), name: payload.orgName.trim(), contactPerson: payload.contactPerson.trim(),
      contactEmail: payload.email.trim(), phone: payload.phone.trim(), province: payload.province.trim(), district: payload.district.trim(),
      orgName: payload.orgName.trim(), orgType: payload.orgType.trim(), estimatedUsers: Number(payload.estimatedUsers) || 0,
      gpRate: 10, createdAt: new Date().toISOString(),
    }, { merge: true });
  }

  persistLocalAndServerUser(payload.uid, {
    uid: payload.uid, email: payload.email, role: 'partner',
    displayName: payload.displayName.trim(), phone: payload.phone.trim(),
    province: payload.province.trim(), district: payload.district.trim(),
    status: 'pending_review', level: 1, xp: 0, points: 0,
    orgName: payload.orgName.trim(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
}
