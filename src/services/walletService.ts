import { auth } from '../firebase';

export interface WalletStateResponse {
  userId: string;
  walletId: string;
  role: 'citizen' | 'knight' | 'merchant' | 'partner';
  balanceSatang: number;
  lockedSatang: number;
  availableSatang: number;
  balance: number;
  availableBalance: number;
  withdrawalLimitPerDay: number;
  withdrawalsToday: number;
  withdrawalsRemainingToday: number;
  systemPromptPay: {
    configured: boolean;
    promptPayId: string;
    accountName: string;
    bankName?: string;
    bankAccountNumber?: string;
    lineUrl?: string;
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
    accountName?: string;
    bankName?: string;
    status: string;
    createdAt?: any;
  }>;
}

const emptyWallet = (role?: string): WalletStateResponse => ({
  userId: auth.currentUser?.uid || '',
  walletId: '',
  role: (role as WalletStateResponse['role']) || 'citizen',
  balanceSatang: 0,
  lockedSatang: 0,
  availableSatang: 0,
  balance: 0,
  availableBalance: 0,
  withdrawalLimitPerDay: 3,
  withdrawalsToday: 0,
  withdrawalsRemainingToday: 3,
  systemPromptPay: {
    configured: false,
    promptPayId: '',
    accountName: '',
    bankName: '',
    bankAccountNumber: '',
  },
  submissions: [],
  withdrawals: [],
});

const getToken = async (): Promise<string | null> => {
  return (await auth.currentUser?.getIdToken()) || null;
};

export async function getWalletMe(role?: string): Promise<WalletStateResponse> {
  const token = await getToken();
  if (!token) return emptyWallet(role);

  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  const res = await fetch(`/api/wallet/me${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return emptyWallet(role);
  return await res.json();
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
  if (!res.ok) throw new Error(data.error || 'ถอนเงินไม่สำเร็จ');
  return data;
}
