/**
 * LINE integration is communication-only.
 * It must never create a WINRIDER identity or bypass Firebase Authentication.
 */

export function generateLineShareUrl(text: string): string {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}

export function generateLineContactUrl(lineId?: string): string {
  if (!lineId) return 'https://line.me/ti/p/~winrider_official';
  return `https://line.me/ti/p/~${encodeURIComponent(lineId.replace('@', ''))}`;
}

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
    `🛵 [WINRIDER.AI] งานรับส่ง #${order.id}`,
    `📋 บริการ: ${order.serviceTitle}`,
    `📍 จุดรับ: ${order.pickupLocation}`,
    `🏁 ปลายทาง: ${order.dropoffLocation}`,
    order.distanceKm ? `📏 ระยะทาง: ${order.distanceKm} กม.` : '',
    `💵 ค่าโดยสาร: ฿${order.fare}`,
    order.passengerName ? `👤 ผู้โดยสาร: ${order.passengerName} (${order.passengerPhone || '-'})` : '',
    order.driverName ? `🛵 คนขับ: ${order.driverName} (${order.driverPlate || '-'})` : '',
    order.googleMapsUrl ? `🗺️ เปิดนำทาง: ${order.googleMapsUrl}` : '',
  ].filter(Boolean).join('\n');
}

export function sendJobToLine(order: Parameters<typeof formatOrderForLineMessage>[0]): void {
  const lineUrl = generateLineShareUrl(formatOrderForLineMessage(order));
  window.open(lineUrl, '_blank', 'noopener,noreferrer');
}

export function chatWithPassengerOnLine(passengerName: string, passengerLineId?: string): void {
  if (passengerLineId) {
    window.open(generateLineContactUrl(passengerLineId), '_blank', 'noopener,noreferrer');
    return;
  }
  window.open(
    generateLineShareUrl(`สวัสดีครับคุณ ${passengerName} ผมเป็นคนขับจาก WINRIDER.AI กำลังเดินทางไปรับครับ`),
    '_blank',
    'noopener,noreferrer'
  );
}

export function chatWithDriverOnLine(driverName: string, driverLineId?: string): void {
  if (driverLineId) {
    window.open(generateLineContactUrl(driverLineId), '_blank', 'noopener,noreferrer');
    return;
  }
  window.open(
    generateLineShareUrl(`สวัสดีครับพี่ ${driverName} ผมเป็นผู้โดยสารจาก WINRIDER.AI ยืนรออยู่ที่จุดรับแล้วครับ`),
    '_blank',
    'noopener,noreferrer'
  );
}
