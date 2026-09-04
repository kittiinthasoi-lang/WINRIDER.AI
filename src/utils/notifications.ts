/**
 * Web Push & Browser Notification + LINE Alert Utility
 */

const STORAGE_KEY_LINE_TOKEN = 'winrider_line_notify_token';
const STORAGE_KEY_NOTIF_ENABLED = 'winrider_browser_notif_enabled';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    const granted = perm === 'granted';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_NOTIF_ENABLED, granted ? 'true' : 'false');
    }
    return granted;
  } catch (err) {
    console.error('Notification permission error:', err);
    return false;
  }
}

export function isBrowserNotificationEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  return Notification.permission === 'granted';
}

export function getSavedLineToken(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_LINE_TOKEN) || '';
}

export function saveLineToken(token: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_LINE_TOKEN, token.trim());
}

/**
 * Trigger local browser notification with sound/vibration
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notif = new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/icon.svg',
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn('Failed to display browser notification:', err);
    return null;
  }
}

/**
 * Send alert to LINE Notify via server endpoint
 */
export async function sendLineNotifyAlert(message: string, tokenOverride?: string): Promise<{ success: boolean; message: string }> {
  const token = tokenOverride || getSavedLineToken();
  if (!token) {
    return { success: false, message: 'ไม่มี LINE Token ที่ตั้งค่าไว้' };
  }

  try {
    const res = await fetch('/api/notifications/line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, token }),
    });

    const data = await res.json();
    return {
      success: res.ok && data.status === 'ok',
      message: data.message || (res.ok ? 'ส่งการแจ้งเตือนเข้า LINE สำเร็จ' : 'ส่งการแจ้งเตือนไม่สำเร็จ'),
    };
  } catch (err: any) {
    console.error('LINE notification error:', err);
    return { success: false, message: err.message || 'เครือข่ายขัดข้อง' };
  }
}

/**
 * High level notification triggers
 */
export function notifyNewJobForKnight(customerName: string, pickupLocation: string, fare: number) {
  sendBrowserNotification('🚨 งานใหม่เข้ามา! (WINRIDER)', {
    body: `คุณ ${customerName} รอที่: ${pickupLocation} (ค่าโดยสาร ฿${fare})`,
    tag: 'new-job',
  });
}

export function notifyDriverAcceptedForPassenger(driverName: string, plate: string) {
  sendBrowserNotification('🛵 พี่วินรับงานแล้ว! (WINRIDER)', {
    body: `พี่วิน ${driverName} (${plate}) กำลังเดินทางมารับคุณ`,
    tag: 'driver-accepted',
  });
}

export function notifyDriverArrivedForPassenger(driverName: string) {
  sendBrowserNotification('📍 พี่วินถึงจุดรับแล้ว! (WINRIDER)', {
    body: `${driverName} มาถึงจุดนัดพบแล้ว กรุณาสวมหมวกนิรภัยเพื่อความปลอดภัย`,
    tag: 'driver-arrived',
  });
}

export function notifyNewChatMessage(senderName: string, text: string) {
  sendBrowserNotification(`💬 ข้อความจาก ${senderName}`, {
    body: text,
    tag: 'chat-message',
  });
}
