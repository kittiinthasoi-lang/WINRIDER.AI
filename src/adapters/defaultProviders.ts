import { IMapProvider, Coordinates, RouteResult } from './IMapProvider';
import { IPaymentProvider, PromptPayQRRequest, PromptPayQRResult, PaymentVerificationResult } from './IPaymentProvider';
import { INotifyProvider, NotificationMessage } from './INotifyProvider';
import QRCode from 'qrcode';

// External-navigation-only map provider.
// WINRIDER.AI does not calculate road routes, traffic, ETA, or turn-by-turn locally.
export class ExternalNavigationMapProvider implements IMapProvider {
  name = 'WINRIDER External Navigation Reference';

  async getCurrentPosition(): Promise<Coordinates> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('GPS is unavailable on this device');
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (error) => reject(new Error(`GPS unavailable: ${error.message}`)),
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
      );
    });
  }

  async reverseGeocode(coords: Coordinates): Promise<string> {
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      throw new Error('Invalid GPS coordinates');
    }
    return `พิกัด ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
  }

  async calculateRoute(_origin: Coordinates, _destination: Coordinates): Promise<RouteResult> {
    throw new Error('Road routing is handled by the external navigation app');
  }
}

export class PromptPayPaymentProvider implements IPaymentProvider {
  name = 'PromptPay National e-Payment Adapter';

  async generatePromptPayQR(req: PromptPayQRRequest): Promise<PromptPayQRResult> {
    const cleanId = req.targetPhoneOrId.replace(/[^0-9]/g, '');
    const amountStr = req.amount.toFixed(2);
    const payload = `00020101021129370016A00000067701011101130066${cleanId.slice(-9)}5802TH540${amountStr.length}${amountStr}6304`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(payload, {
        margin: 1,
        color: { dark: '#0A1633', light: '#FFFFFF' }
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
    return {
      success: false,
      transactionId,
      amount: 0,
      timestamp: new Date().toISOString()
    };
  }
}

export class WebNotificationProvider implements INotifyProvider {
  name = 'WINRIDER Audio & Web Alert Engine';

  async sendNotification(msg: NotificationMessage): Promise<{ success: boolean; messageId?: string }> {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(msg.title, { body: msg.body, icon: '/app-logo.png' });
      } catch {
        // Browser may restrict background notifications.
      }
    }
    if (msg.sound) this.playAlertSound('mission_incoming');
    return { success: true, messageId: `NOTIF-${Date.now()}` };
  }

  playAlertSound(type: 'mission_incoming' | 'mission_accepted' | 'success' | 'alert'): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (type === 'mission_incoming') {
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
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // Audio context might be restricted before a user gesture.
    }
  }
}

export const defaultMapProvider: IMapProvider = new ExternalNavigationMapProvider();
export const defaultPaymentProvider: IPaymentProvider = new PromptPayPaymentProvider();
export const defaultNotifyProvider: INotifyProvider = new WebNotificationProvider();
