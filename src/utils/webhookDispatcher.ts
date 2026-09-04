export interface WebhookDispatchEvent {
  id: string;
  event: 'order_created' | 'order_accepted' | 'order_status_updated' | 'order_completed' | 'test_ping';
  timestamp: string;
  orderId: string;
  passengerName: string;
  passengerPhone: string;
  serviceTitle: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fare: number;
  welfareFund2Baht: number; // Always 2.00 Baht
  driverPayout: number; // Fare - 2.00
  tipAmount?: number;
  status: 'pending' | 'accepted' | 'heading_pickup' | 'in_transit' | 'completed' | 'cancelled';
  driverName?: string;
  driverLevel?: number;
  driverPlate?: string;
  notes?: string;
  metadata?: Record<string, any>;
  // Google Sheets Optimized Row
  googleSheetsRow: Array<string | number>;
  // LINE Flex Message Optimized Payload
  lineFlexMessage: any;
}

export interface WebhookLogEntry {
  id: string;
  timestamp: string;
  event: string;
  url: string;
  status: 'success' | 'simulated' | 'error';
  httpCode?: number;
  latencyMs?: number;
  payload: WebhookDispatchEvent;
  responsePreview?: string;
}

const STORAGE_KEY_WEBHOOK_URL = 'winrider_webhook_url';
const STORAGE_KEY_AUTO_DISPATCH = 'winrider_auto_dispatch_enabled';
const STORAGE_KEY_DISPATCH_LOGS = 'winrider_dispatch_logs';

export function getSavedWebhookUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_WEBHOOK_URL) || '';
}

export function saveWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_WEBHOOK_URL, url.trim());
}

export function isAutoDispatchEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEY_AUTO_DISPATCH);
  return val === null ? true : val === 'true';
}

export function setAutoDispatchEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_AUTO_DISPATCH, String(enabled));
}

export function getDispatchLogs(): WebhookLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISPATCH_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addDispatchLog(entry: WebhookLogEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const logs = getDispatchLogs();
    logs.unshift(entry);
    if (logs.length > 50) logs.pop();
    localStorage.setItem(STORAGE_KEY_DISPATCH_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save webhook log:', e);
  }
}

export function clearDispatchLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_DISPATCH_LOGS);
}

/**
 * Creates structured webhook event payload ready for Make.com, Zapier, Google Sheets, LINE OA
 */
export function buildWebhookPayload(params: {
  event: WebhookDispatchEvent['event'];
  orderId: string;
  passengerName: string;
  passengerPhone?: string;
  serviceTitle: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fare: number;
  tipAmount?: number;
  status: WebhookDispatchEvent['status'];
  driverName?: string;
  driverLevel?: number;
  driverPlate?: string;
  notes?: string;
}): WebhookDispatchEvent {
  const timestamp = new Date().toISOString();
  const fare = Number(params.fare || 40);
  const welfareFund2Baht = 2.0;
  const driverPayout = Math.max(0, fare - welfareFund2Baht + (params.tipAmount || 0));

  // Google Sheets Array Layout:
  // [A: รหัสงาน, B: วันที่เวลา, C: บริการ, D: ผู้โดยสาร, E: เบอร์โทร, F: จุดรับ, G: จุดส่ง, H: ระยะทาง กม., I: ค่าโดยสาร ฿, J: กองทุนสวัสดิการ 2฿, K: รายได้อัศวิน ฿, L: ทิป ฿, M: สถานะ, N: อัศวินผู้รับงาน, O: ทะเบียนรถ]
  const googleSheetsRow = [
    params.orderId,
    new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    params.serviceTitle,
    params.passengerName,
    params.passengerPhone || '08X-XXX-XXXX',
    params.pickupLocation,
    params.dropoffLocation,
    params.distanceKm.toFixed(1),
    fare.toFixed(2),
    welfareFund2Baht.toFixed(2),
    driverPayout.toFixed(2),
    (params.tipAmount || 0).toFixed(2),
    params.status.toUpperCase(),
    params.driverName || 'รออัศวินรับงาน',
    params.driverPlate || '-'
  ];

  // LINE OA Flex Message Bubble
  const lineFlexMessage = {
    type: 'flex',
    altText: `⚡ [WINRIDER] แจ้งเตือนออเดอร์ ${params.orderId} (${params.status})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#070D1E',
        contents: [
          {
            type: 'text',
            text: '🦁 WINRIDER.AI SOVEREIGN DISPATCH',
            weight: 'bold',
            color: '#00D2FF',
            size: 'xs',
            letterSpacing: '1px'
          },
          {
            type: 'text',
            text: params.event === 'order_created' ? '🚨 มีงานใหม่เข้ามา!' : `สถานะ: ${params.status.toUpperCase()}`,
            weight: 'bold',
            color: '#FFFFFF',
            size: 'lg',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0A1428',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'รหัสงาน:', size: 'xs', color: '#94A3B8', flex: 3 },
              { type: 'text', text: params.orderId, size: 'xs', color: '#FFD700', weight: 'bold', flex: 7 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              { type: 'text', text: 'ผู้โดยสาร:', size: 'xs', color: '#94A3B8', flex: 3 },
              { type: 'text', text: params.passengerName, size: 'xs', color: '#FFFFFF', weight: 'bold', flex: 7 }
            ]
          },
          {
            type: 'separator',
            margin: 'md',
            color: '#1E293B'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: [
              { type: 'text', text: `📍 จุดรับ: ${params.pickupLocation}`, size: 'xs', color: '#38BDF8', wrap: true },
              { type: 'text', text: `🏁 จุดส่ง: ${params.dropoffLocation}`, size: 'xs', color: '#A7F3D0', wrap: true, margin: 'xs' },
              { type: 'text', text: `📏 ระยะทาง: ${params.distanceKm.toFixed(1)} กม.`, size: 'xs', color: '#94A3B8', margin: 'xs' }
            ]
          },
          {
            type: 'separator',
            margin: 'md',
            color: '#1E293B'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'ค่าโดยสาร:', size: 'xs', color: '#94A3B8' },
              { type: 'text', text: `฿${fare.toFixed(2)}`, size: 'sm', color: '#00D2FF', weight: 'bold', align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'หักกองทุนสวัสดิการ:', size: 'xxs', color: '#94A3B8' },
              { type: 'text', text: '-฿2.00', size: 'xxs', color: '#F59E0B', weight: 'bold', align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'รายได้สุทธิอัศวิน:', size: 'xs', color: '#FFFFFF', weight: 'bold' },
              { type: 'text', text: `฿${driverPayout.toFixed(2)}`, size: 'sm', color: '#10B981', weight: 'bold', align: 'end' }
            ]
          }
        ]
      }
    }
  };

  return {
    id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    event: params.event,
    timestamp,
    orderId: params.orderId,
    passengerName: params.passengerName,
    passengerPhone: params.passengerPhone || '089-123-4567',
    serviceTitle: params.serviceTitle,
    pickupLocation: params.pickupLocation,
    dropoffLocation: params.dropoffLocation,
    distanceKm: params.distanceKm,
    fare,
    welfareFund2Baht,
    driverPayout,
    tipAmount: params.tipAmount || 0,
    status: params.status,
    driverName: params.driverName,
    driverLevel: params.driverLevel,
    driverPlate: params.driverPlate,
    notes: params.notes,
    googleSheetsRow,
    lineFlexMessage
  };
}

/**
 * Dispatches event to configured webhook endpoint (Make.com, Zapier, Google Sheets Apps Script)
 */
export async function dispatchToWebhook(payload: WebhookDispatchEvent): Promise<{
  success: boolean;
  status: 'success' | 'simulated' | 'error';
  httpCode?: number;
  latencyMs: number;
  message: string;
}> {
  const url = getSavedWebhookUrl();
  const startTime = Date.now();

  // If no URL is configured, record simulated success
  if (!url) {
    const latencyMs = 85;
    const logEntry: WebhookLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: payload.event,
      url: '(จำลองในระบบ / ยังไม่ได้ระบุ Webhook URL)',
      status: 'simulated',
      httpCode: 200,
      latencyMs,
      payload,
      responsePreview: '{"status":"simulated_ok","message":"บันทึกข้อมูลจำลองเรียบร้อย พร้อมเชื่อมต่อ Webhook จริง"}'
    };
    addDispatchLog(logEntry);
    return {
      success: true,
      status: 'simulated',
      httpCode: 200,
      latencyMs,
      message: 'จำลองการส่งข้อมูลเรียบร้อย (ยังไม่ได้ตั้งค่า Webhook URL)'
    };
  }

  try {
    // Dispatch via server proxy to bypass browser CORS restrictions
    const response = await fetch('/api/webhooks/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: url,
        event: payload.event,
        payload
      })
    });

    const latencyMs = Date.now() - startTime;
    const result = await response.json();

    const isSuccess = response.ok && result.success !== false;
    const logEntry: WebhookLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: payload.event,
      url,
      status: isSuccess ? 'success' : 'error',
      httpCode: result.statusCode || response.status,
      latencyMs,
      payload,
      responsePreview: typeof result.responseData === 'string' ? result.responseData : JSON.stringify(result.responseData || result)
    };
    addDispatchLog(logEntry);

    return {
      success: isSuccess,
      status: isSuccess ? 'success' : 'error',
      httpCode: result.statusCode || response.status,
      latencyMs,
      message: isSuccess ? 'ยิงข้อมูลสู่ Webhook สำเร็จ 100%' : `ส่งไม่สำเร็จ: ${result.error || response.statusText}`
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const logEntry: WebhookLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: payload.event,
      url,
      status: 'error',
      httpCode: 500,
      latencyMs,
      payload,
      responsePreview: `Network error: ${err.message}`
    };
    addDispatchLog(logEntry);

    return {
      success: false,
      status: 'error',
      httpCode: 500,
      latencyMs,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`
    };
  }
}
