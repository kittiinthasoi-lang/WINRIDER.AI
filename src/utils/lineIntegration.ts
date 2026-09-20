import { UserSession, saveUserSession, getCurrentUserSession, UserRole, getRoleTitleTh, getRoleAvatarEmoji } from './userSession';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  lineId?: string;
  phone?: string;
  role: UserRole;
  plateNumber?: string;
  connectedAt: string;
}

const LINE_PROFILE_STORAGE_KEY = 'WINRIDER_LINE_PROFILE';
const LINE_NOTIFY_ENABLED_KEY = 'WINRIDER_LINE_NOTIFY_ACTIVE';

/**
 * Get stored LINE profile
 */
export function getSavedLineProfile(): LineUserProfile | null {
  try {
    const raw = localStorage.getItem(LINE_PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to read LINE profile:', err);
    return null;
  }
}

/**
 * Save LINE profile locally and into Firestore
 */
export async function saveLineProfile(profile: LineUserProfile): Promise<void> {
  try {
    localStorage.setItem(LINE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(LINE_NOTIFY_ENABLED_KEY, 'true');

    // Also persist to Firestore
    try {
      await setDoc(doc(db, 'line_bindings', profile.userId), {
        ...profile,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore LINE binding write warning:', e);
    }
  } catch (err) {
    console.error('Failed to save LINE profile:', err);
  }
}

/**
 * Register or Login immediately using LINE Account
 */
export async function authenticateOrRegisterWithLine(params: {
  displayName: string;
  lineId?: string;
  phone?: string;
  role: UserRole;
  plateNumber?: string;
  avatarUrl?: string;
}): Promise<UserSession> {
  const cleanLineId = (params.lineId || '').trim() || `line_${Math.floor(100000 + Math.random() * 900000)}`;
  const userId = `LINE-${cleanLineId.replace(/[^a-zA-Z0-9_]/g, '')}`;
  const rolePrefix = params.role === 'driver' ? 'WIN-KGT' : params.role === 'customer' ? 'WIN-CTZ' : params.role === 'merchant' ? 'WIN-MCH' : 'WIN-PTN';
  const sovereignId = `${rolePrefix}-${Math.floor(100000 + Math.random() * 900000)}`;

  const lineProfile: LineUserProfile = {
    userId,
    displayName: params.displayName.trim() || 'ผู้ใช้ LINE',
    pictureUrl: params.avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg',
    statusMessage: 'ใช้งานผ่าน WINRIDER.AI Sovereign Platform',
    lineId: params.lineId?.trim() || cleanLineId,
    phone: params.phone?.trim() || '',
    role: params.role,
    plateNumber: params.plateNumber,
    connectedAt: new Date().toISOString()
  };

  await saveLineProfile(lineProfile);

  const newSession: UserSession = {
    id: sovereignId,
    name: lineProfile.displayName,
    phone: lineProfile.phone || '',
    role: params.role,
    roleTitleTh: getRoleTitleTh(params.role),
    plateNumber: params.plateNumber || undefined,
    level: 1,
    xp: 150,
    rating: 5.0,
    avatarEmoji: params.role === 'driver' ? '🛵' : '👤',
    registeredAt: new Date().toISOString(),
    faceImageUrl: lineProfile.pictureUrl,
    biometricVerified: true,
    lineConnected: true,
    lineUserId: lineProfile.userId,
    lineDisplayName: lineProfile.displayName,
    linePictureUrl: lineProfile.pictureUrl,
    lineStatusMessage: lineProfile.statusMessage,
    lineNotificationEnabled: true
  };

  await saveUserSession(newSession);

  // Store in users collection
  try {
    await setDoc(doc(db, 'users', sovereignId), {
      ...newSession,
      registeredVia: 'line_login',
      lineProfile,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore user write error:', e);
  }

  return newSession;
}

/**
 * Generate LINE Deep Link to open Chat with prefilled message
 */
export function generateLineShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  // line.me/R/msg/text/ opens the LINE app and asks where to share the text
  return `https://line.me/R/msg/text/?${encodedText}`;
}

/**
 * Generate LINE Contact URL to chat directly with a LINE ID or Add Friend
 */
export function generateLineContactUrl(lineId?: string): string {
  if (!lineId) {
    return 'https://line.me/ti/p/~winrider_official';
  }
  const clean = lineId.replace('@', '');
  return `https://line.me/ti/p/~${encodeURIComponent(clean)}`;
}

/**
 * Format ride order details into a clean LINE message format
 */
export function formatOrderForLineMessage(order: {
  id: string;
  serviceTitle: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  passengerName?: string;
  passengerPhone?: string;
  driverName?: string;
  driverPlate?: string;
  distanceKm?: number;
  estMinutes?: number;
  googleMapsUrl?: string;
}): string {
  return [
    `🛵 [WINRIDER.AI] งานรับส่งใหม่ #${order.id}`,
    `📋 บริการ: ${order.serviceTitle}`,
    `📍 จุดรับ: ${order.pickupLocation}`,
    `🏁 ปลายทาง: ${order.dropoffLocation}`,
    order.distanceKm ? `📏 ระยะทาง: ${order.distanceKm} กม. (~${order.estMinutes || 10} นาที)` : '',
    `💵 ค่าโดยสาร: ฿${order.fare}.00 (กองทุน 2฿ ในตัว)`,
    order.passengerName ? `👤 ผู้โดยสาร: ${order.passengerName} (${order.passengerPhone || '-'})` : '',
    order.driverName ? `🛵 คนขับ: ${order.driverName} (${order.driverPlate || '-'})` : '',
    order.googleMapsUrl ? `🗺️ เปิดนำทาง: ${order.googleMapsUrl}` : '🗺️ แผนที่นำทาง: https://maps.google.com/?q=Bangkok',
    `⚡ ดำเนินการโดยแพลตฟอร์มวินมอเตอร์ไซค์อธิปไตย`
  ].filter(Boolean).join('\n');
}

/**
 * Open LINE app directly with the formatted job message
 */
export function sendJobToLine(order: {
  id: string;
  serviceTitle: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  passengerName?: string;
  passengerPhone?: string;
  driverName?: string;
  driverPlate?: string;
  distanceKm?: number;
  estMinutes?: number;
  googleMapsUrl?: string;
}): void {
  const message = formatOrderForLineMessage(order);
  const lineUrl = generateLineShareUrl(message);
  window.open(lineUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Open LINE Chat with Passenger
 */
export function chatWithPassengerOnLine(passengerName: string, passengerLineId?: string): void {
  const introMessage = `สวัสดีครับคุณ ${passengerName} ผมเป็นคนขับจาก WINRIDER.AI กำลังเดินทางไปรับครับ`;
  if (passengerLineId) {
    const url = `https://line.me/ti/p/~${encodeURIComponent(passengerLineId.replace('@', ''))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.open(generateLineShareUrl(introMessage), '_blank', 'noopener,noreferrer');
  }
}

/**
 * Open LINE Chat with Driver
 */
export function chatWithDriverOnLine(driverName: string, driverLineId?: string): void {
  const introMessage = `สวัสดีครับพี่ ${driverName} ผมเป็นผู้โดยสารจาก WINRIDER.AI ยืนรออยู่ที่จุดรับแล้วครับ`;
  if (driverLineId) {
    const url = `https://line.me/ti/p/~${encodeURIComponent(driverLineId.replace('@', ''))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.open(generateLineShareUrl(introMessage), '_blank', 'noopener,noreferrer');
  }
}
