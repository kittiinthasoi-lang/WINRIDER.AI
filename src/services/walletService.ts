import { auth } from '../firebase';

export interface WalletStateResponse {
  userId: string;
  walletId: string;
  role: 'citizen' | 'knight' | 'merchant' | 'partner';
  balanceSatang: number;
  balance: number;
  systemPromptPay: {
    configured: boolean;
    promptPayId: string;
    accountName: string;
  };
  submissions: Array<{
    id: string;
    amountSatang: number;
    reference: string;
    status: string;
    createdAt?: any;
  }>;
  withdrawals: Array<{
    id: string;
    amountSatang: number;
    amountBaht: number;
    promptPayOrAccount: string;
    status: string;
    createdAt?: any;
  }>;
}

const getToken = async (): Promise<string | null> => {
  return (await auth.currentUser?.getIdToken()) || null;
};

export async function getWalletMe(role?: string): Promise<WalletStateResponse> {
  const token = await getToken();
  if (!token) {
    return {
      userId: '',
      walletId: '',
      role: 'citizen',
      balanceSatang: 0,
      balance: 0.0,
      systemPromptPay: {
        configured: false,
        promptPayId: '',
        accountName: 'WINRIDER.AI SYSTEM WALLET',
      },
      submissions: [],
      withdrawals: [],
    };
  }

  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  const res = await fetch(`/api/wallet/me${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return {
      userId: auth.currentUser?.uid || '',
      walletId: '',
      role: (role as any) || 'citizen',
      balanceSatang: 0,
      balance: 0.0,
      systemPromptPay: {
        configured: false,
        promptPayId: '',
        accountName: '',
      },
      submissions: [],
      withdrawals: [],
    };
  }

  return await res.json();
}

export async function submitTopupProof(amount: number, imageDataUrl: string) {
  const token = await getToken();
  if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนทำรายการเติมเงิน');

  const res = await fetch('/api/wallet/topup-proof', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, imageDataUrl }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'ส่งสลิปไม่สำเร็จ');
  }
  return data;
}

export async function submitWithdrawal(params: {
  amount: number;
  promptPayOrAccount: string;
  accountName: string;
  bankName?: string;
}) {
  const token = await getToken();
  if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนทำรายการถอนเงิน');

  const res = await fetch('/api/wallet/withdraw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'ถอนเงินไม่สำเร็จ');
  }
  return data;
}
