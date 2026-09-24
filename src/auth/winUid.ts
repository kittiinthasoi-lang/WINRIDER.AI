export const WIN_UID_MIN_LENGTH = 4;
export const WIN_UID_MAX_LENGTH = 30;

export function normalizeWinUid(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function isValidWinUid(value: string): boolean {
  const normalized = normalizeWinUid(value);
  return /^[a-z0-9][a-z0-9._-]{3,29}$/.test(normalized);
}

export function winUidToInternalEmail(value: string): string {
  const normalized = normalizeWinUid(value);
  if (!isValidWinUid(normalized)) {
    throw new Error('WIN UID ต้องมี 4-30 ตัว ใช้ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง และต้องขึ้นต้นด้วยตัวอักษรหรือตัวเลข');
  }
  return `${normalized}@auth.winrider.local`;
}

export function internalEmailToWinUid(value?: string | null): string {
  const email = String(value || '').trim().toLowerCase();
  return email.endsWith('@auth.winrider.local')
    ? email.slice(0, -'@auth.winrider.local'.length)
    : '';
}
