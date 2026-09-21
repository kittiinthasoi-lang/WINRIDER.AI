import { db, auth } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc 
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { AppMode } from '../types';

export type UserRole = 'customer' | 'driver' | 'merchant' | 'partner';

export interface UserSession {
  id: string; // Firebase UID or Sovereign ID
  email?: string;
  name: string;
  phone: string;
  role: UserRole;
  primaryRole?: UserRole; // Original registered role (e.g. 'driver')
  activePersona?: 'driver' | 'customer'; // For drivers who switch to citizen role
  roleTitleTh: string;
  plateNumber?: string;
  shopName?: string;
  companyName?: string;
  level: number;
  xp: number;
  rating: number;
  avatarEmoji: string;
  avatarUrl?: string;
  registeredAt: string;
  faceImageUrl?: string;
  faceHash?: string;
  biometricVerified?: boolean;
  lineConnected?: boolean;
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  lineStatusMessage?: string;
  lineNotificationEnabled?: boolean;
  bio?: string;
  creditScore?: number;
  rideLaterCredit?: number;
}

const STORAGE_KEY = 'WINRIDER_ACTIVE_USER_SESSION';

export const PRESET_ACCOUNTS: UserSession[] = [];

// Read current user session from LocalStorage
export function getCurrentUserSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch (err) {
    console.error('[UserSession] Failed to parse session:', err);
    return null;
  }
}

// Save user session to LocalStorage and Firestore
export async function saveUserSession(session: UserSession): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('winrider:session_changed', { detail: session }));

    // Persist to Firestore asynchronously
    try {
      await setDoc(doc(db, 'users', session.id), {
        ...session,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('[UserSession] Firestore write warning:', e);
    }
  } catch (err) {
    console.error('[UserSession] Failed to save session:', err);
  }
}

// Clear user session (Sign Out)
export function clearUserSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('winrider:session_changed', { detail: null }));
  } catch (err) {
    console.error('[UserSession] Failed to clear session:', err);
  }
}

// Login by Phone number or Sovereign ID
export async function authenticateUser(identifier: string): Promise<UserSession | null> {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) return null;

  // 1. Authenticate against Firestore directly
  try {
    // Check by ID
    const docSnap = await getDoc(doc(db, 'users', identifier.trim()));
    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      const session: UserSession = {
        id: data.id || identifier.trim(),
        email: data.email,
        name: data.name || 'ผู้ใช้งานระบบ',
        phone: data.phone || identifier.trim(),
        role: data.role || 'customer',
        primaryRole: data.primaryRole,
        activePersona: data.activePersona,
        roleTitleTh: getRoleTitleTh(data.role),
        plateNumber: data.plateNumber,
        shopName: data.shopName,
        companyName: data.companyName,
        level: data.level ?? 1,
        xp: data.xp ?? 0,
        rating: data.rating ?? 5.0,
        avatarEmoji: data.avatarEmoji || getRoleAvatarEmoji(data.role),
        avatarUrl: data.avatarUrl,
        registeredAt: data.registeredAt || new Date().toISOString(),
        faceImageUrl: data.faceImageUrl,
        faceHash: data.faceHash,
        biometricVerified: data.biometricVerified,
        lineConnected: data.lineConnected,
        lineUserId: data.lineUserId,
        lineDisplayName: data.lineDisplayName,
        linePictureUrl: data.linePictureUrl,
        lineStatusMessage: data.lineStatusMessage,
        lineNotificationEnabled: data.lineNotificationEnabled,
        bio: data.bio,
        creditScore: data.creditScore,
        rideLaterCredit: data.rideLaterCredit,
      };
      await saveUserSession(session);
      return session;
    }

    // Check by Phone in Firestore
    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 9) {
      const q = query(collection(db, 'users'), where('phone', '==', identifier.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as any;
        const session: UserSession = {
          id: data.id || snap.docs[0].id,
          name: data.name || 'ผู้ใช้งานระบบ',
          phone: data.phone || identifier.trim(),
          role: data.role || 'customer',
          roleTitleTh: getRoleTitleTh(data.role),
          plateNumber: data.plateNumber,
          shopName: data.shopName,
          companyName: data.companyName,
          level: data.level || 1,
          xp: data.xp || 0,
          rating: data.rating || 5.0,
          avatarEmoji: getRoleAvatarEmoji(data.role),
          registeredAt: data.registeredAt || new Date().toISOString(),
        };
        await saveUserSession(session);
        return session;
      }
    }
  } catch (err) {
    console.warn('[UserSession] Firestore auth lookup error:', err);
  }

  return null;
}

const FRESH_USER_PROGRESSION = {
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
  questSeason: '2026-S3',
  questState: {},
};

export function getRoleTitleTh(role: UserRole): string {
  switch (role) {
    case 'driver':
      return 'อัศวินวินมอเตอร์ไซค์ (Knight Driver)';
    case 'customer':
      return 'พลเมืองผู้โดยสาร (Citizen Passenger)';
    case 'merchant':
      return 'ร้านค้าพันธมิตร (Merchant)';
    case 'partner':
      return 'พันธมิตรองค์กร & โรงพยาบาล (Partner)';
    default:
      return 'ผู้ใช้งานระบบ';
  }
}

export function getRoleAvatarEmoji(role: UserRole): string {
  switch (role) {
    case 'driver':
      return '🛵';
    case 'customer':
      return '🦥';
    case 'merchant':
      return '🏪';
    case 'partner':
      return '🏥';
    default:
      return '👤';
  }
}

export function getDefaultModeForRole(role: UserRole): AppMode {
  switch (role) {
    case 'driver':
      return 'driver';
    case 'customer':
      return 'passenger';
    case 'merchant':
      return 'merchant';
    case 'partner':
      return 'partner';
    default:
      return 'passenger';
  }
}

// Check if the account has driver credentials (original role is driver)
export function isDriverAccount(session: UserSession | null): boolean {
  if (!session) return false;
  return (
    session.primaryRole === 'driver' ||
    session.role === 'driver' ||
    Boolean(session.plateNumber) ||
    session.id.startsWith('WIN-KGT')
  );
}

// Check if a driver is currently acting as a citizen/passenger
export function isDriverInCitizenMode(session: UserSession | null): boolean {
  if (!session) return false;
  const isDriver = isDriverAccount(session);
  return isDriver && (session.activePersona === 'customer' || session.role === 'customer');
}

// Check if a user is permitted to switch to driver mode (citizens are locked out)
export function canUserSwitchToDriver(session: UserSession | null): boolean {
  if (!session) return false;
  return isDriverAccount(session);
}

// Switch driver persona between driver (ready to drive) and customer (off-duty citizen)
// Preserves Level, XP, Rating, Points, ID and all credentials equally across both roles!
export function switchDriverPersona(
  session: UserSession,
  targetPersona: 'driver' | 'customer'
): UserSession {
  const updated: UserSession = {
    ...session,
    primaryRole: 'driver', // Ensure primary role is marked as driver
    activePersona: targetPersona,
    role: targetPersona,
    roleTitleTh:
      targetPersona === 'driver'
        ? 'อัศวินวินมอเตอร์ไซค์ (Knight Driver)'
        : 'พลเมือง (พี่วินพักงาน/Off-Duty)',
    avatarEmoji: targetPersona === 'driver' ? '🛵' : '🦥',
    // Note: level, xp, rating, id, name, phone, plateNumber remain 100% untouched and equal!
  };

  saveUserSession(updated).catch((err) => console.warn('[UserSession] Save persona error:', err));
  return updated;
}

/**
 * Register a new individual user with Email & Password via Firebase Authentication
 * Automatically creates their unique Firestore profile with Level 1 stats.
 */
export async function registerWithEmailPassword(params: {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: UserRole;
  plateNumber?: string;
  shopName?: string;
  companyName?: string;
  district?: string;
}): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'กรุณากรอกอีเมลที่ถูกต้อง (Valid Email)' };
  }
  if (!params.password || params.password.length < 6) {
    return { success: false, error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' };
  }
  if (!params.name.trim()) {
    return { success: false, error: 'กรุณากรอกชื่อ-นามสกุล' };
  }
  if (!params.phone.trim()) {
    return { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์' };
  }

  try {
    // 1. Create Firebase Auth user
    let uid = '';
    try {
      const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
      uid = userCred.user.uid;
      try {
        await updateProfile(userCred.user, { displayName: params.name });
      } catch {}
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/email-already-in-use') {
        return { success: false, error: 'อีเมลนี้ถูกลงทะเบียนไว้แล้ว กรุณาเข้าสู่ระบบด้วยอีเมลนี้' };
      } else if (fbErr?.code === 'auth/invalid-email') {
        return { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
      } else if (fbErr?.code === 'auth/weak-password') {
        return { success: false, error: 'รหัสผ่านสั้นหรือคาดเดาง่ายเกินไป (ขั้นต่ำ 6 ตัวอักษร)' };
      } else {
        // In case Firebase Auth API is blocked by offline or quota, fallback to sovereign UID
        console.warn('[UserSession] Firebase Auth fallback to Sovereign UID:', fbErr);
        uid = `WIN-${params.role.toUpperCase().slice(0, 3)}-${Math.floor(100000 + Math.random() * 900000)}`;
      }
    }

    // 2. Create UserSession object
    const newSession: UserSession = {
      ...FRESH_USER_PROGRESSION,
      id: uid,
      email: cleanEmail,
      name: params.name.trim(),
      phone: params.phone.trim(),
      role: params.role,
      primaryRole: params.role,
      activePersona: params.role === 'driver' ? 'driver' : 'customer',
      roleTitleTh: getRoleTitleTh(params.role),
      plateNumber: params.plateNumber?.trim(),
      shopName: params.shopName?.trim(),
      companyName: params.companyName?.trim(),
      level: 1,
      xp: 0,
      rating: 5.0,
      avatarEmoji: getRoleAvatarEmoji(params.role),
      registeredAt: new Date().toISOString(),
      bio: params.district ? `ประจำพื้นที่ ${params.district}` : 'สมาชิก WINRIDER.AI บัญชีส่วนบุคคล',
      ...FRESH_USER_PROGRESSION,
    };

    // 3. Persist to Firestore & Local Storage
    await saveUserSession(newSession);
    return { success: true, session: newSession };
  } catch (err: any) {
    console.error('[UserSession] Registration error:', err);
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง' };
  }
}

/**
 * Sign In with Email & Password via Firebase Authentication
 * Loads user-specific data and history from Firestore.
 */
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, error: 'กรุณากรอกอีเมลและรหัสผ่าน' };
  }

  try {
    // 1. Authenticate with Firebase Auth
    let uid = '';
    try {
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      uid = userCred.user.uid;
    } catch (authErr: any) {
      if (authErr?.code === 'auth/user-not-found' || authErr?.code === 'auth/invalid-credential') {
        return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้สมัครสมาชิก' };
      } else if (authErr?.code === 'auth/wrong-password') {
        return { success: false, error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
      } else if (authErr?.code === 'auth/too-many-requests') {
        return { success: false, error: 'ลองเข้าสู่ระบบผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่' };
      }
      console.warn('[UserSession] Firebase Auth signIn error:', authErr);
    }

    // 2. Fetch User Profile from Firestore by UID or by Email
    if (uid) {
      try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          const session: UserSession = {
            id: data.id || uid,
            email: data.email || cleanEmail,
            name: data.name || 'ผู้ใช้งานระบบ',
            phone: data.phone || '',
            role: data.role || 'customer',
            primaryRole: data.primaryRole || data.role || 'customer',
            activePersona: data.activePersona || (data.role === 'driver' ? 'driver' : 'customer'),
            roleTitleTh: getRoleTitleTh(data.role),
            plateNumber: data.plateNumber,
            shopName: data.shopName,
            companyName: data.companyName,
            level: data.level ?? 1,
            xp: data.xp ?? 0,
            rating: data.rating ?? 5.0,
            avatarEmoji: getRoleAvatarEmoji(data.role),
            registeredAt: data.registeredAt || new Date().toISOString(),
            lineConnected: Boolean(data.lineConnected),
            lineUserId: data.lineUserId,
            lineDisplayName: data.lineDisplayName,
            bio: data.bio,
            creditScore: data.creditScore ?? 0,
            rideLaterCredit: data.rideLaterCredit ?? 0,
          };
          await saveUserSession(session);
          return { success: true, session };
        }
      } catch (dbErr) {
        console.warn('[UserSession] Firestore fetch error:', dbErr);
      }
    }

    // 3. Search Firestore by email field if UID match wasn't found
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as any;
        const session: UserSession = {
          id: data.id || snap.docs[0].id,
          email: data.email || cleanEmail,
          name: data.name || 'ผู้ใช้งานระบบ',
          phone: data.phone || '',
          role: data.role || 'customer',
          primaryRole: data.primaryRole || data.role || 'customer',
          activePersona: data.activePersona || (data.role === 'driver' ? 'driver' : 'customer'),
          roleTitleTh: getRoleTitleTh(data.role),
          plateNumber: data.plateNumber,
          shopName: data.shopName,
          companyName: data.companyName,
          level: data.level ?? 1,
          xp: data.xp ?? 0,
          rating: data.rating ?? 5.0,
          avatarEmoji: getRoleAvatarEmoji(data.role),
          registeredAt: data.registeredAt || new Date().toISOString(),
          lineConnected: Boolean(data.lineConnected),
          bio: data.bio,
        };
        await saveUserSession(session);
        return { success: true, session };
      }
    } catch {}

    // 4. If user was authenticated by Firebase Auth but had no profile doc, generate default
    if (uid) {
      const session: UserSession = {
        id: uid,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        phone: '',
        role: 'customer',
        primaryRole: 'customer',
        roleTitleTh: 'พลเมืองผู้โดยสาร (Citizen Passenger)',
        level: 1,
        xp: 0,
        rating: 5.0,
        avatarEmoji: '🦥',
        registeredAt: new Date().toISOString(),
      };
      await saveUserSession(session);
      return { success: true, session };
    }

    return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  } catch (err: any) {
    console.error('[UserSession] Email login error:', err);
    return { success: false, error: err?.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง' };
  }
}

/**
 * Login or Quick Register with Phone Number & optional PIN
 */
export async function loginWithPhone(
  phone: string,
  pin?: string
): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 9) {
    return { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (อย่างน้อย 9-10 หลัก)' };
  }

  try {
    // 1. Search in Firestore users collection
    const q = query(collection(db, 'users'), where('phone', '==', phone.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data() as any;
      const session: UserSession = {
        id: data.id || snap.docs[0].id,
        email: data.email,
        name: data.name || `คุณผู้ใช้ (${phone.trim()})`,
        phone: data.phone || phone.trim(),
        role: data.role || 'customer',
        primaryRole: data.primaryRole || data.role || 'customer',
        activePersona: data.activePersona || (data.role === 'driver' ? 'driver' : 'customer'),
        roleTitleTh: getRoleTitleTh(data.role),
        plateNumber: data.plateNumber,
        shopName: data.shopName,
        companyName: data.companyName,
        level: data.level ?? 1,
        xp: data.xp ?? 0,
        rating: data.rating ?? 5.0,
        avatarEmoji: getRoleAvatarEmoji(data.role),
        registeredAt: data.registeredAt || new Date().toISOString(),
        lineConnected: Boolean(data.lineConnected),
        bio: data.bio,
      };
      await saveUserSession(session);
      return { success: true, session };
    }

    // 2. If phone not found in DB, auto-provision personal citizen profile
    const newCitizen: UserSession = {
      ...FRESH_USER_PROGRESSION,
      id: `WIN-CTZ-${cleanPhone.slice(-6) || Math.floor(100000 + Math.random() * 900000)}`,
      name: `คุณพลเมือง (${phone.trim()})`,
      phone: phone.trim(),
      role: 'customer',
      primaryRole: 'customer',
      activePersona: 'customer',
      roleTitleTh: 'พลเมืองผู้โดยสาร (Citizen Passenger)',
      level: 1,
      xp: 0,
      rating: 5.0,
      avatarEmoji: '🦥',
      registeredAt: new Date().toISOString(),
      bio: 'สมาชิกบุคคลใหม่ เข้าสู่ระบบด้วยเบอร์โทรศัพท์',
      ...FRESH_USER_PROGRESSION,
    };
    await saveUserSession(newCitizen);
    return { success: true, session: newCitizen };
  } catch (err: any) {
    console.error('[UserSession] Phone login error:', err);
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการตรวจสอบเบอร์โทรศัพท์' };
  }
}

/**
 * Log In / Register using LINE Official Account
 */
export async function loginWithLine(lineProfile: {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  role?: UserRole;
}): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  if (!lineProfile.userId) {
    return { success: false, error: 'ข้อมูลบัญชี LINE ไม่ถูกต้อง' };
  }

  const lineDocId = `LINE_${lineProfile.userId}`;
  const targetRole = lineProfile.role || 'customer';

  try {
    // Check if LINE user document exists
    const docSnap = await getDoc(doc(db, 'users', lineDocId));
    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      const session: UserSession = {
        id: data.id || lineDocId,
        email: data.email,
        name: data.name || lineProfile.displayName,
        phone: data.phone || '',
        role: data.role || targetRole,
        primaryRole: data.primaryRole || data.role || targetRole,
        activePersona: data.activePersona || (data.role === 'driver' ? 'driver' : 'customer'),
        roleTitleTh: getRoleTitleTh(data.role || targetRole),
        plateNumber: data.plateNumber,
        shopName: data.shopName,
        companyName: data.companyName,
        level: data.level ?? 1,
        xp: data.xp ?? 0,
        rating: data.rating ?? 5.0,
        avatarEmoji: getRoleAvatarEmoji(data.role || targetRole),
        registeredAt: data.registeredAt || new Date().toISOString(),
        lineConnected: true,
        lineUserId: lineProfile.userId,
        lineDisplayName: lineProfile.displayName,
        linePictureUrl: lineProfile.pictureUrl,
        lineStatusMessage: lineProfile.statusMessage,
        lineNotificationEnabled: true,
        bio: data.bio || `เข้าใช้งานผ่าน LINE: ${lineProfile.displayName}`,
      };
      await saveUserSession(session);
      return { success: true, session };
    }

    // Otherwise create a fresh Level 1 session for this LINE account
    const newSession: UserSession = {
      ...FRESH_USER_PROGRESSION,
      id: lineDocId,
      name: lineProfile.displayName || 'สมาชิก LINE WINRIDER',
      phone: '',
      role: targetRole,
      primaryRole: targetRole,
      activePersona: targetRole === 'driver' ? 'driver' : 'customer',
      roleTitleTh: getRoleTitleTh(targetRole),
      level: 1,
      xp: 0,
      rating: 5.0,
      avatarEmoji: getRoleAvatarEmoji(targetRole),
      registeredAt: new Date().toISOString(),
      lineConnected: true,
      lineUserId: lineProfile.userId,
      lineDisplayName: lineProfile.displayName,
      linePictureUrl: lineProfile.pictureUrl,
      lineStatusMessage: lineProfile.statusMessage,
      lineNotificationEnabled: true,
      bio: `เข้าใช้งานผ่าน LINE: ${lineProfile.displayName}`,
      creditScore: 750,
      rideLaterCredit: 500,
    };
    await saveUserSession(newSession);
    return { success: true, session: newSession };
  } catch (err: any) {
    console.error('[UserSession] LINE login error:', err);
    return { success: false, error: 'ไม่สามารถเชื่อมต่อบัญชี LINE ได้ กรุณาลองใหม่อีกครั้ง' };
  }
}

/**
 * Sign out current user completely (Firebase Auth + LocalStorage)
 */
export async function logoutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn('[UserSession] Firebase signOut warning:', e);
  }
  clearUserSession();
}

// Full application state reset: clears old orders, dispatch queues, chats, and initializes fresh session
export async function resetEntireApplicationState(newSession: UserSession): Promise<void> {
  try {
    // Clear all existing storage keys (order histories, chats, market caches)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== STORAGE_KEY) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });

    // Save newly registered user session as fresh Level 1 sovereign profile
    await saveUserSession(newSession);

    // Notify application of full reset
    window.dispatchEvent(new CustomEvent('winrider:full_reset', { detail: newSession }));
    window.dispatchEvent(new CustomEvent('winrider:session_changed', { detail: newSession }));
  } catch (err) {
    console.error('[UserSession] Full reset error:', err);
  }
}
