export type QrKind = 'win_wallet' | 'promptpay' | 'bank_account' | 'unknown';

export interface ParsedQrPayload {
  kind: QrKind;
  raw: string;
  walletId?: string;
  amountBaht?: number;
  promptPayId?: string;
  merchantName?: string;
  merchantCity?: string;
  currency?: string;
  tags?: Record<string, string>;
}

function parseTlv(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (!Number.isInteger(len) || len < 0 || i + 4 + len > payload.length) break;
    out[id] = payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

function parseAmount(value?: string): number | undefined {
  if (!value) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 10_000_000 ? amount : undefined;
}

export function parseQrPayload(rawInput: string): ParsedQrPayload {
  const raw = String(rawInput || '').trim();
  if (!raw) return { kind: 'unknown', raw: '' };

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'WIN_WALLET_PAYMENT' && typeof parsed.walletId === 'string') {
      return {
        kind: 'win_wallet',
        raw,
        walletId: parsed.walletId.trim(),
        amountBaht: parseAmount(parsed.amount),
        merchantName: typeof parsed.item === 'string' ? parsed.item : undefined,
      };
    }
  } catch {
    // Not a WIN Wallet JSON payload; continue with EMVCo parsing.
  }

  const root = parseTlv(raw);
  const currency = root['53'] || undefined;
  const amountBaht = parseAmount(root['54']);
  const merchantName = root['59'] || undefined;
  const merchantCity = root['60'] || undefined;
  const tags: Record<string, string> = { ...root };

  let promptPayId: string | undefined;
  for (const accountTag of ['29', '30']) {
    const account = parseTlv(root[accountTag] || '');
    const aid = account['00'];
    const keys = Object.keys(account);
    if (aid === 'A000000677010111' || aid === 'A000000677010112' || keys.length > 1) {
      const candidates = keys.filter(k => k !== '00').map(k => account[k]).filter(Boolean);
      const candidate = candidates.find(v => /^0066\d{8,13}$/.test(v)) || candidates.find(v => /^\d{9,15}$/.test(v));
      if (candidate) {
        promptPayId = candidate.replace(/^0066/, '0');
        break;
      }
    }
  }

  if (promptPayId || root['01'] === '12' || root['26'] || root['29'] || root['30']) {
    return { kind: 'promptpay', raw, promptPayId, amountBaht, merchantName, merchantCity, currency, tags };
  }

  if (root['53'] === '764' && (root['59'] || root['60'])) {
    return { kind: 'bank_account', raw, amountBaht, merchantName, merchantCity, currency, tags };
  }

  return { kind: 'unknown', raw, amountBaht, merchantName, merchantCity, currency, tags };
}
