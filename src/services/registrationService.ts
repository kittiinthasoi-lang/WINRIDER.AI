import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface BaseRegistrationPayload {
  uid: string;
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

export function subscribeFoundingKnightCounter(callback: (data: { count: number; limit: number; remaining: number }) => void) {
  const counterRef = doc(db, 'counters', 'foundingKnights');
  return onSnapshot(counterRef, (snap) => {
    if (!snap.exists()) {
      callback({ count: 0, limit: 1000, remaining: 1000 });
      return;
    }
    const data = snap.data();
    const count = Number(data.count || 0);
    const limit = Number(data.limit || 1000);
    callback({ count, limit, remaining: Math.max(0, limit - count) });
  }, (error) => {
    console.warn('Founding Knight counter unavailable:', error);
    callback({ count: 0, limit: 1000, remaining: 1000 });
  });
}

async function submitRegistration(role: 'knight' | 'citizen' | 'merchant' | 'partner', registration: Record<string, unknown>) {
  const user = auth.currentUser;
  if (!user) throw new Error('กรุณาเข้าสู่ระบบใหม่');
  const token = await user.getIdToken();
  const response = await fetch('/api/auth/register-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role, registration }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || 'ลงทะเบียนไม่สำเร็จ');
    (error as any).code = payload?.code || `HTTP_${response.status}`;
    throw error;
  }
  return payload;
}

function common(payload: BaseRegistrationPayload) {
  return {
    fullName: payload.displayName,
    phone: payload.phone,
    province: payload.province,
    district: payload.district,
    pdpaAccepted: payload.pdpaConsentAccepted,
    gpsConsent: payload.pdpaConsentAccepted,
    termsAccepted: payload.pdpaConsentAccepted,
  };
}

export async function registerKnight(payload: KnightRegistrationPayload): Promise<boolean> {
  const result = await submitRegistration('knight', {
    ...common(payload),
    vehicleType: payload.vehicleType,
    plateNumber: payload.plateNumber,
    publicLicenseNumber: payload.licenseNumber,
    driverLicenseUrl: payload.driverLicenseUrl || '',
    vehiclePhotoUrl: payload.vehiclePhotoUrl || '',
  });
  return result?.isFoundingKnight === true;
}

export async function registerCitizen(payload: CitizenRegistrationPayload): Promise<void> {
  await submitRegistration('citizen', {
    ...common(payload),
    emergencyContactName: payload.emergencyContactName,
    emergencyContactPhone: payload.emergencyContactPhone,
  });
}

export async function registerMerchant(payload: MerchantRegistrationPayload): Promise<void> {
  await submitRegistration('merchant', {
    ...common(payload),
    shopName: payload.shopName,
    shopType: payload.shopType,
    shopAddress: payload.address,
    taxId: payload.taxId || '',
  });
}

export async function registerPartner(payload: PartnerRegistrationPayload): Promise<void> {
  await submitRegistration('partner', {
    ...common(payload),
    orgName: payload.orgName,
    orgType: payload.orgType,
    contactPerson: payload.contactPerson,
    estimatedUsers: payload.estimatedUsers,
  });
}
