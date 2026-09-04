import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { AppMode } from '../types';

export type UserRole = 'customer' | 'driver' | 'merchant' | 'partner';

export interface UserSession {
  id: string; // e.g. "WIN-KGT-100234" or phone
  name: string;
  phone: string;
  role: UserRole;
  roleTitleTh: string;
  plateNumber?: string;
  shopName?: string;
  companyName?: string;
  level: number;
  xp: number;
  rating: number;
  avatarEmoji: string;
  registeredAt: string;
}

const STORAGE_KEY = 'WINRIDER_ACTIVE_USER_SESSION';

export const PRESET_ACCOUNTS: UserSession[] = [
  {
    id: 'WIN-KGT-100888',
    name: 'พี่กิตติ อินทะสร้อย',
    phone: '089-445-1234',
    role: 'driver',
    roleTitleTh: 'อัศวินวินมอเตอร์ไซค์ (Knight Driver)',
    plateNumber: '1กข 7789 กทม.',
    level: 100,
    xp: 99999,
    rating: 5.0,
    avatarEmoji: '🛵',
    registeredAt: '2026-01-15T08:30:00Z',
  },
  {
    id: 'WIN-CTZ-204551',
    name: 'คุณอารียา สุขสมบูรณ์',
    phone: '081-992-5678',
    role: 'customer',
    roleTitleTh: 'พลเมืองผู้โดยสาร (Citizen Passenger)',
    level: 12,
    xp: 2450,
    rating: 4.95,
    avatarEmoji: '🦥',
    registeredAt: '2026-02-10T11:20:00Z',
  },
  {
    id: 'WIN-MCH-309112',
    name: 'ร้านข้าวมันไก่เฮียชัย (เอกมัย ซอย 10)',
    phone: '085-331-9090',
    role: 'merchant',
    roleTitleTh: 'ร้านค้าพันธมิตร (Merchant)',
    shopName: 'ข้าวมันไก่ตอนสูตรไหหลำเฮียชัย',
    level: 8,
    xp: 1800,
    rating: 4.88,
    avatarEmoji: '🏪',
    registeredAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'WIN-PTN-401999',
    name: 'รพ.สมิติเวช สุขุมวิท (ศูนย์กู้ชีพ 2฿)',
    phone: '02-711-8000',
    role: 'partner',
    roleTitleTh: 'พันธมิตรองค์กร & โรงพยาบาล (Partner)',
    companyName: 'โรงพยาบาลสมิติเวช สุขุมวิท',
    level: 25,
    xp: 12000,
    rating: 5.0,
    avatarEmoji: '🏥',
    registeredAt: '2026-01-01T00:00:00Z',
  },
];

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

  // 1. Check presets first
  const preset = PRESET_ACCOUNTS.find(
    (p) =>
      p.id.toLowerCase() === cleanId ||
      p.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, '')
  );
  if (preset) {
    await saveUserSession(preset);
    return preset;
  }

  // 2. Check Firestore
  try {
    // Check by ID
    const docSnap = await getDoc(doc(db, 'users', identifier.trim()));
    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      const session: UserSession = {
        id: data.id || identifier.trim(),
        name: data.name || 'ผู้ใช้งานระบบ',
        phone: data.phone || identifier.trim(),
        role: data.role || 'customer',
        roleTitleTh: getRoleTitleTh(data.role),
        plateNumber: data.plateNumber,
        shopName: data.shopName,
        companyName: data.companyName,
        level: data.level || 1,
        xp: data.xp || 100,
        rating: data.rating || 5.0,
        avatarEmoji: getRoleAvatarEmoji(data.role),
        registeredAt: data.registeredAt || new Date().toISOString(),
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
          xp: data.xp || 100,
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
