import { IMapProvider, Coordinates, RouteResult } from './IMapProvider';
import { IPaymentProvider, PromptPayQRRequest, PromptPayQRResult, PaymentVerificationResult } from './IPaymentProvider';
import { INotifyProvider, NotificationMessage } from './INotifyProvider';
import QRCode from 'qrcode';

// 1. Concrete Map Provider (Local Geo Calculation with fallback/API ready)
export class SovereignMapProvider implements IMapProvider {
  name = 'WINRIDER Sovereign Spatial Engine';

  async getCurrentPosition(): Promise<Coordinates> {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 13.736717, lng: 100.523186 }) // Default Bangkok Center (Siam/Samyan)
        );
      } else {
        resolve({ lat: 13.736717, lng: 100.523186 });
      }
    });
  }

  async reverseGeocode(coords: Coordinates): Promise<string> {
    // Spatial mapping for Bangkok zones
    if (Math.abs(coords.lat - 13.7367) < 0.05 && Math.abs(coords.lng - 100.5231) < 0.05) {
      return 'สยามสแควร์ - จุฬาลงกรณ์มหาวิทยาลัย ปทุมวัน กรุงเทพฯ';
    }
    return `พิกัด ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} กรุงเทพมหานคร`;
  }

  async calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    // Haversine formula calculation with urban traffic multiplier
    const R = 6371; // Earth radius in km
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLon = (destination.lng - origin.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;
    const urbanDistanceKm = Math.max(1.2, straightKm * 1.35); // 1.35 urban road winding factor
    const distanceMeters = Math.round(urbanDistanceKm * 1000);
    const estimatedMinutes = Math.max(4, Math.round(urbanDistanceKm * 2.8)); // motorcycle average speed ~22km/h in alleyways

    return {
      distanceMeters,
      distanceText: `${urbanDistanceKm.toFixed(1)} กม.`,
      durationSeconds: estimatedMinutes * 60,
      durationText: `${estimatedMinutes} นาที`,
      steps: [
        'มุ่งหน้าออกจากจุดเริ่มต้นตามซอยหลัก',
        'เลี้ยวซ้ายเข้าสู่ถนนสายหลัก',
        'ตรงไปตามเส้นทางเลี่ยงการจราจร',
        'เลี้ยวขวาถึงจุดหมายปลายทาง'
      ]
    };
  }
}

// 2. Concrete PromptPay Payment Provider
export class PromptPayPaymentProvider implements IPaymentProvider {
  name = 'PromptPay National e-Payment Adapter';

  async generatePromptPayQR(req: PromptPayQRRequest): Promise<PromptPayQRResult> {
    // PromptPay EMVCo Payload Simulator / Generator
    const cleanId = req.targetPhoneOrId.replace(/[^0-9]/g, '');
    const amountStr = req.amount.toFixed(2);
    const payload = `00020101021129370016A00000067701011101130066${cleanId.slice(-9)}5802TH540${amountStr.length}${amountStr}6304`;

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(payload, {
        margin: 1,
        color: {
          dark: '#0A1633',
          light: '#FFFFFF'
        }
      });
    } catch {
      qrDataUrl = '';
    }

    return {
      qrPayload: payload,
      qrDataUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerificationResult> {
    // A QR payload alone is not proof of settlement. Until a real bank/payment
    // provider is configured, fail closed instead of crediting the wallet.
    if (!transactionId.trim()) {
      return {
        success: false,
        transactionId,
        amount: 0,
        timestamp: new Date().toISOString()
      };
    }
    return {
      success: false,
      transactionId,
      amount: 0,
      timestamp: new Date().toISOString()
    };
  }
}

// 3. Concrete Audio & Notification Provider
export class WebNotificationProvider implements INotifyProvider {
  name = 'WINRIDER Audio & Web Alert Engine';

  async sendNotification(msg: NotificationMessage): Promise<{ success: boolean; messageId?: string }> {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(msg.title, {
          body: msg.body,
          icon: '/app-logo.png'
        });
      } catch {
        // Silently fallback if background notifications restricted
      }
    }
    if (msg.sound) {
      this.playAlertSound('mission_incoming');
    }
    return { success: true, messageId: `NOTIF-${Date.now()}` };
  }

  playAlertSound(type: 'mission_incoming' | 'mission_accepted' | 'success' | 'alert'): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      if (type === 'mission_incoming') {
        // High-tech dual-pulse chime (Neon Blue alert)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }
}

// Global Singleton Adapter Instances
export const defaultMapProvider: IMapProvider = new SovereignMapProvider();
export const defaultPaymentProvider: IPaymentProvider = new PromptPayPaymentProvider();
export const defaultNotifyProvider: INotifyProvider = new WebNotificationProvider();
