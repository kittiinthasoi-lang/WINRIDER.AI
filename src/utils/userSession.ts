import { AppMode } from '../types';

export type UserRole = 'customer' | 'driver' | 'merchant' | 'partner';

export interface UserSession {
  id: string;
  winUid?: string;
  email?: string;
  name: string;
  phone: string;
  role: UserRole;
  primaryRole?: UserRole;
  activePersona?: 'driver' | 'customer';
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

// Kept only as a local UI cache. Authentication and authorization always come
// from Firebase Authentication + server-verified Firebase ID tokens.
export function getCurrentUserSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as UserSession : null;
  } catch {
    return null;
  }
}

export async function saveUserSession(session: UserSession): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent('winrider:session_changed', { detail: session }));
}

export function clearUserSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('winrider:session_changed', { detail: null }));
}

export function getRoleTitleTh(role: UserRole): string {
  switch (role) {
    case 'driver': return 'อัศวินวินมอเตอร์ไซค์ (Knight Driver)';
    case 'customer': return 'พลเมืองผู้โดยสาร (Citizen Passenger)';
    case 'merchant': return 'ร้านค้าพันธมิตร (Merchant)';
    case 'partner': return 'พันธมิตรองค์กร & โรงพยาบาล (Partner)';
  }
}

export function getRoleAvatarEmoji(role: UserRole): string {
  switch (role) {
    case 'driver': return '🛵';
    case 'customer': return '🛡️';
    case 'merchant': return '🏪';
    case 'partner': return '🏢';
  }
}

export function getDefaultModeForRole(role: UserRole): AppMode {
  switch (role) {
    case 'driver': return 'driver';
    case 'merchant': return 'merchant';
    case 'partner': return 'partner';
    case 'customer':
    default:
      return 'passenger';
  }
}

export function isDriverAccount(session: UserSession | null): boolean {
  if (!session) return false;
  return session.primaryRole === 'driver' || session.role === 'driver' || Boolean(session.plateNumber);
}

export function isDriverInCitizenMode(session: UserSession | null): boolean {
  return Boolean(session && isDriverAccount(session) && (session.activePersona === 'customer' || session.role === 'customer'));
}

export function canUserSwitchToDriver(session: UserSession | null): boolean {
  return isDriverAccount(session);
}

export function switchDriverPersona(
  session: UserSession,
  targetPersona: 'driver' | 'customer'
): UserSession {
  const updated: UserSession = {
    ...session,
    primaryRole: 'driver',
    activePersona: targetPersona,
    role: targetPersona,
    roleTitleTh: targetPersona === 'driver'
      ? 'อัศวินวินมอเตอร์ไซค์ (Knight Driver)'
      : 'พลเมือง (พี่วินพักงาน/Off-Duty)',
    avatarEmoji: targetPersona === 'driver' ? '🛵' : '🛡️',
  };
  void saveUserSession(updated);
  return updated;
}
