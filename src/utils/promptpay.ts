import QRCode from 'qrcode';

/**
 * Calculates CRC16-CCITT checksum for EMVCo standard
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Format field tag, length, value helper for EMVCo
 */
function f(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Format target PromptPay identifier:
 * - 10-digit Mobile: 08XXXXXXXX -> 00668XXXXXXXX
 * - 13-digit National ID / Tax ID
 */
export function formatPromptPayTarget(target: string): { formatted: string; type: 'mobile' | 'national_id' | 'e_wallet' } {
  const cleaned = target.replace(/[^0-9]/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return {
      formatted: '0066' + cleaned.substring(1),
      type: 'mobile',
    };
  }
  if (cleaned.length === 13) {
    return {
      formatted: cleaned,
      type: 'national_id',
    };
  }
  if (cleaned.length === 15) {
    return {
      formatted: cleaned,
      type: 'e_wallet',
    };
  }
  // Fallback as mobile if 9-10 digits
  return {
    formatted: cleaned.startsWith('0') ? '0066' + cleaned.substring(1) : cleaned,
    type: 'mobile',
  };
}

/**
 * Generates official EMVCo PromptPay QR payload string
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  const { formatted, type } = formatPromptPayTarget(target);

  // AID for Thai PromptPay
  const aid = 'A000000677010111';
  let merchantAccountInfo = f('00', aid);

  if (type === 'mobile') {
    merchantAccountInfo += f('01', formatted);
  } else if (type === 'national_id') {
    merchantAccountInfo += f('02', formatted);
  } else {
    merchantAccountInfo += f('03', formatted);
  }

  // Tag 00: Format Indicator (01)
  // Tag 01: Point of Initiation (11 = static, 12 = dynamic with amount)
  const poi = amount && amount > 0 ? '12' : '11';

  let raw = f('00', '01') + f('01', poi) + f('29', merchantAccountInfo) + f('53', '764');

  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    raw += f('54', formattedAmount);
  }

  raw += f('58', 'TH');
  raw += '6304'; // Checksum Tag and length

  const checksum = crc16(raw);
  return raw + checksum;
}

/**
 * Generates Base64 Data URL for PromptPay QR image
 */
export async function generatePromptPayQRDataUrl(target: string, amount?: number): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 380,
    color: {
      dark: '#002D62', // PromptPay signature deep blue
      light: '#FFFFFF',
    },
  });
}
