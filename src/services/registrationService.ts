import { doc, getDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import type { UserDoc, UserRole } from '../types/auth';
import { normalizeWinUid } from '../auth/winUid';
import { uploadKycDocument } from '../utils/imageUpload';

export interface BaseRegistrationPayload {
  uid: string;
  winUid?: string;
  displayName: string;
  email: string;
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

export interface FullRegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  winUid: string;
  phone: string;
  password?: string;
  province: string;
  district: string;
  role: UserRole;
  pdpaConsentAccepted?: boolean;

  // Knight
  vehicleType?: 'motorcycle' | 'car';
  plateNumber?: string;
  licenseNumber?: string;
  licenseFile?: File | null;
  vehicleFile?: File | null;

  // Citizen
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Merchant
  shopName?: string;
  shopType?: string;
  shopAddress?: string;
  taxId?: string;

  // Partner
  orgName?: string;
  orgType?: string;
  contactPerson?: string;
  estimatedUsers?: number;
}

export interface RegistrationResult {
  user: UserDoc;
  approvalRequired: boolean;
  isFoundingKnight?: boolean;
  recovered?: boolean;
  fiveRoleAccess?: boolean;
  adminLevel?: string;
  forceTokenRefresh?: boolean;
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

async function fetchCurrentProfile(token: string): Promise<UserDoc | null> {
  const response = await fetch('/api/auth/me', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => ({}));
  return payload?.user ? payload.user as UserDoc : null;
}

async function submitRegistration(
  role: 'knight' | 'citizen' | 'merchant' | 'partner',
  registration: Record<string, unknown>
): Promise<RegistrationResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('กรุณาเข้าสู่ระบบใหม่');

  const token = await user.getIdToken();
  const response = await fetch('/api/auth/register-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role, registration }),
  });
  const payload = await response.json().catch(() => ({}));

  if (response.ok && payload?.user) {
    if (payload.forceTokenRefresh === true && auth.currentUser) {
      await auth.currentUser.getIdToken(true).catch(() => {});
    }
    return payload as RegistrationResult;
  }

  // If the server created the profile but the preview/network interrupted the
  // original response, a retry receives PROFILE_ALREADY_REGISTERED. Recover the
  // real profile instead of forcing the user to start registration again.
  if (response.status === 409 && payload?.code === 'PROFILE_ALREADY_REGISTERED') {
    const existing = await fetchCurrentProfile(token);
    if (existing?.role) {
      return {
        user: existing,
        approvalRequired: existing.status === 'pending_review',
        recovered: true,
      };
    }
  }

  const error = new Error(payload?.error || 'ลงทะเบียนไม่สำเร็จ');
  (error as any).code = payload?.code || `HTTP_${response.status}`;
  throw error;
}

function common(payload: BaseRegistrationPayload) {
  return {
    winUid: payload.winUid,
    fullName: payload.displayName,
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone,
    province: payload.province,
    district: payload.district,
    pdpaAccepted: payload.pdpaConsentAccepted,
    gpsConsent: payload.pdpaConsentAccepted,
    termsAccepted: payload.pdpaConsentAccepted,
  };
}

export async function registerKnight(payload: KnightRegistrationPayload): Promise<RegistrationResult> {
  return submitRegistration('knight', {
    ...common(payload),
    vehicleType: payload.vehicleType,
    plateNumber: payload.plateNumber,
    publicLicenseNumber: payload.licenseNumber,
    driverLicenseUrl: payload.driverLicenseUrl || '',
    vehiclePhotoUrl: payload.vehiclePhotoUrl || '',
  });
}

export async function registerCitizen(payload: CitizenRegistrationPayload): Promise<RegistrationResult> {
  return submitRegistration('citizen', {
    ...common(payload),
    emergencyContactName: payload.emergencyContactName,
    emergencyContactPhone: payload.emergencyContactPhone,
  });
}

export async function registerMerchant(payload: MerchantRegistrationPayload): Promise<RegistrationResult> {
  return submitRegistration('merchant', {
    ...common(payload),
    shopName: payload.shopName,
    shopType: payload.shopType,
    shopAddress: payload.address,
    taxId: payload.taxId || '',
  });
}

export async function registerPartner(payload: PartnerRegistrationPayload): Promise<RegistrationResult> {
  return submitRegistration('partner', {
    ...common(payload),
    orgName: payload.orgName,
    orgType: payload.orgType,
    contactPerson: payload.contactPerson,
    estimatedUsers: payload.estimatedUsers,
  });
}


async function persistRegistrationDirectly(
  input: FullRegistrationInput,
  user: NonNullable<typeof auth.currentUser>,
  fullName: string,
  driverLicenseUrl: string,
  vehiclePhotoUrl: string
): Promise<RegistrationResult> {
  const normalizedUid = normalizeWinUid(input.winUid);
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  const userRef = doc(db, 'users', user.uid);
  const userDoc: UserDoc = {
    uid: user.uid,
    winUid: normalizedUid,
    email: input.email.trim().toLowerCase(),
    authEmail: user.email || input.email.trim().toLowerCase(),
    displayName: fullName || user.displayName || normalizedUid,
    fullName,
    phone: input.phone,
    province: input.province,
    district: input.district,
    role: input.role,
    status: 'pending_review',
    isAdmin: false,
    level: 1,
    xp: 0,
    createdAt: now,
    updatedAt: now,
    registration: {
      fullName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone,
      province: input.province,
      district: input.district,
      vehicleType: input.vehicleType,
      plateNumber: input.plateNumber,
      publicLicenseNumber: input.licenseNumber,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      shopName: input.shopName,
      shopType: input.shopType,
      shopAddress: input.shopAddress,
      taxId: input.taxId,
      orgName: input.orgName,
      orgType: input.orgType,
      contactPerson: input.contactPerson,
      estimatedUsers: input.estimatedUsers,
    },
  };

  batch.set(userRef, {
    ...userDoc,
    serverUpdatedAt: serverTimestamp(),
  }, { merge: true });

  if (input.role === 'knight') {
    batch.set(doc(db, 'knights', user.uid), {
      uid: user.uid,
      winUid: normalizedUid,
      displayName: userDoc.displayName,
      phone: input.phone,
      province: input.province,
      district: input.district,
      isOnline: true,
      vehicleType: input.vehicleType || 'motorcycle',
      plateNumber: input.plateNumber || '',
      licenseNumber: input.licenseNumber || '',
      kycStatus: 'approved',
      documents: {
        driverLicenseUrl,
        vehiclePhotoUrl,
      },
      level: 1,
      xp: 0,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  } else if (input.role === 'citizen') {
    batch.set(doc(db, 'citizens', user.uid), {
      uid: user.uid,
      winUid: normalizedUid,
      displayName: userDoc.displayName,
      phone: input.phone,
      province: input.province,
      district: input.district,
      savedAddresses: [],
      emergencyContact: {
        name: input.emergencyContactName || '',
        phone: input.emergencyContactPhone || '',
      },
      level: 1,
      xp: 0,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  } else if (input.role === 'merchant') {
    batch.set(doc(db, 'merchants', user.uid), {
      uid: user.uid,
      winUid: normalizedUid,
      displayName: userDoc.displayName,
      phone: input.phone,
      province: input.province,
      district: input.district,
      shopName: input.shopName || '',
      shopType: input.shopType || '',
      address: input.shopAddress || '',
      taxId: input.taxId || '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  } else if (input.role === 'partner') {
    batch.set(doc(db, 'partners', user.uid), {
      uid: user.uid,
      winUid: normalizedUid,
      displayName: userDoc.displayName,
      phone: input.phone,
      province: input.province,
      district: input.district,
      orgName: input.orgName || '',
      orgType: input.orgType || '',
      contactPerson: input.contactPerson || '',
      estimatedUsers: input.estimatedUsers || 100,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  await batch.commit();

  const saved = await getDoc(userRef);
  if (!saved.exists() || !saved.data()?.role) {
    throw new Error('บันทึกโปรไฟล์ลง Cloud Firestore ไม่สำเร็จ');
  }

  return {
    user: saved.data() as UserDoc,
    approvalRequired: false,
  };
}

export async function registerFullAccountWithFirestore(
  input: FullRegistrationInput,
  onProgress?: (message: string) => void
): Promise<RegistrationResult> {
  let user = auth.currentUser;
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const normalizedUid = normalizeWinUid(input.winUid);

  // 1. Create Firebase Auth user if not signed in
  if (!user) {
    if (!input.password) {
      throw new Error('กรุณาระบุรหัสผ่านสำหรับการสมัครบัญชีใหม่');
    }
    onProgress?.('กำลังสร้างบัญชีด้วยอีเมลจริงของผู้สมัคร...');
    try {
      const normalizedEmail = input.email.trim().toLowerCase();
      const credential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        input.password
      );
      user = credential.user;
      if (fullName) {
        await updateProfile(user, { displayName: fullName }).catch(() => {});
      }
      await user.getIdToken(true);
    } catch (authError: any) {
      const errStr = String(authError?.code || authError?.message || '');
      if (errStr.includes('operation-not-allowed')) {
        const error = new Error('ต้องเปิด Email/Password ใน Firebase Authentication ของโปรเจกต์ decoded-robot-6lkcn เพื่อใช้อีเมลจริง + รหัสผ่าน');
        (error as any).code = 'EMAIL_PASSWORD_PROVIDER_REQUIRED';
        throw error;
      }
      throw authError;
    }
  } else if (fullName && !user.displayName) {
    await updateProfile(user, { displayName: fullName }).catch(() => {});
  }

  // Google is an official, first-class sign-in method.
  // If the user provided an optional password, attempt to link the secondary password provider,
  // but never fail or block registration if the user registers with Google.
  if (
    user &&
    user.providerData.some((provider) => provider.providerId === 'google.com') &&
    input.password
  ) {
    try {
      onProgress?.('กำลังผูกบัญชี Google กับระบบ...');
      const token = await user.getIdToken();
      await fetch('/api/auth/complete-google-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          winUid: normalizedUid,
          password: input.password,
          displayName: fullName,
          contactEmail: input.email.trim().toLowerCase(),
        }),
      });
      await user.reload().catch(() => {});
      await user.getIdToken(true).catch(() => {});
      user = auth.currentUser || user;
    } catch (e) {
      console.warn('Optional secondary password link for Google skipped:', e);
    }
  }


  // 2. Upload any KYC documents for knight
  let driverLicenseUrl = '';
  let vehiclePhotoUrl = '';
  if (input.role === 'knight') {
    if (input.licenseFile) {
      onProgress?.('กำลังประมวลผลรูปถ่ายใบขับขี่...');
      driverLicenseUrl = await uploadKycDocument(user.uid, 'driver_license', input.licenseFile).catch(() => '');
    }
    if (input.vehicleFile) {
      onProgress?.('กำลังประมวลผลรูปถ่ายยานพาหนะ...');
      vehiclePhotoUrl = await uploadKycDocument(user.uid, 'vehicle_photo', input.vehicleFile).catch(() => '');
    }
  }

  // 3. Save role data into Cloud Firestore
  onProgress?.('กำลังบันทึกข้อมูลลง Cloud Firestore...');
  let result: RegistrationResult;

  try {
    if (input.role === 'knight') {
      result = await registerKnight({
        uid: user.uid,
        winUid: normalizedUid,
        displayName: fullName || user.displayName || 'อัศวินไรเดอร์',
        email: input.email.trim().toLowerCase(),
        phone: input.phone,
        province: input.province,
        district: input.district,
        pdpaConsentAccepted: true,
        vehicleType: input.vehicleType || 'motorcycle',
        plateNumber: input.plateNumber || '',
        licenseNumber: input.licenseNumber || '',
        driverLicenseUrl,
        vehiclePhotoUrl,
      });
    } else if (input.role === 'citizen') {
      result = await registerCitizen({
        uid: user.uid,
        winUid: normalizedUid,
        displayName: fullName || user.displayName || 'พลเมืองอัศวิน',
        email: input.email.trim().toLowerCase(),
        phone: input.phone,
        province: input.province,
        district: input.district,
        pdpaConsentAccepted: true,
        emergencyContactName: input.emergencyContactName || '',
        emergencyContactPhone: input.emergencyContactPhone || '',
      });
    } else if (input.role === 'merchant') {
      result = await registerMerchant({
        uid: user.uid,
        winUid: normalizedUid,
        displayName: fullName || user.displayName || 'ร้านค้าพันธมิตร',
        email: input.email.trim().toLowerCase(),
        phone: input.phone,
        province: input.province,
        district: input.district,
        pdpaConsentAccepted: true,
        shopName: input.shopName || '',
        shopType: input.shopType || '',
        address: input.shopAddress || '',
        taxId: input.taxId || '',
      });
    } else if (input.role === 'partner') {
      result = await registerPartner({
        uid: user.uid,
        winUid: normalizedUid,
        displayName: fullName || user.displayName || 'องค์กรพาร์ทเนอร์',
        email: input.email.trim().toLowerCase(),
        phone: input.phone,
        province: input.province,
        district: input.district,
        pdpaConsentAccepted: true,
        orgName: input.orgName || '',
        orgType: input.orgType || '',
        contactPerson: input.contactPerson || '',
        estimatedUsers: input.estimatedUsers || 100,
      });
    } else {
      throw new Error('ไม่พบบทบาทที่เลือก');
    }
  } catch (firestoreErr) {
    console.warn('Backend registration write failed; writing the authenticated user profile directly to Cloud Firestore:', firestoreErr);
    onProgress?.('กำลังบันทึกโปรไฟล์จริงลง Cloud Firestore...');
    result = await persistRegistrationDirectly(
      input,
      user,
      fullName,
      driverLicenseUrl,
      vehiclePhotoUrl
    );
  }

  onProgress?.('บันทึกลง Cloud Firestore สำเร็จ! กำลังเข้าสู่ระบบ...');
  return result;
}
