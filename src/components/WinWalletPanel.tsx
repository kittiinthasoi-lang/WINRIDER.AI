import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building2,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import { getWalletMe, submitWithdrawal, WalletStateResponse } from '../services/walletService';
import { getPaymentProfile } from '../services/paymentProfileService';
import { playTactileBlip, playPaymentSuccessChime } from '../utils/audio';

const WIN_WALLET_TOPUP_ACCOUNT = {
  bankName: 'กสิกรไทย',
  accountNumber: '0931530151',
  accountName: 'กิตติอินทะสร้อย',
  lineContact: '0837583169',
} as const;

interface WinWalletPanelProps {
  role?: 'citizen' | 'knight' | 'merchant' | 'partner';
  userId?: string;
  userName?: string;
  audioEnabled?: boolean;
  onBalanceUpdate?: (balance: number) => void;
  onClose?: () => void;
}

export const WinWalletPanel: React.FC<WinWalletPanelProps> = ({
  role = 'citizen',
  userId,
  userName = '',
  audioEnabled = true,
  onBalanceUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [walletData, setWalletData] = useState<WalletStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [depositAmount, setDepositAmount] = useState<number>(200);
  const [depositMessage, setDepositMessage] = useState('');
  const [depositError, setDepositError] = useState('');

  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [withdrawDestination, setWithdrawDestination] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState(userName);
  const [withdrawBank, setWithdrawBank] = useState('PromptPay');
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  const roleLabelMap: Record<string, string> = {
    citizen: 'พลเมือง / ผู้โดยสาร',
    knight: 'อัศวินไรเดอร์',
    merchant: 'ร้านค้าพันธมิตร',
    partner: 'พาร์ทเนอร์ธุรกิจ',
  };

  const loadWallet = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getWalletMe(role);
      setWalletData(data);
      onBalanceUpdate?.(data.balance);
    } catch (err) {
      console.warn('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadWallet();

    if (userId) {
      getPaymentProfile(userId)
        .then((profile) => {
          if (!profile) return;
          if (profile.promptPayId) {
            setWithdrawDestination(profile.promptPayId);
            setWithdrawBank(profile.bankName || 'PromptPay');
          }
          if (profile.accountName) setWithdrawAccountName(profile.accountName);
        })
        .catch(() => {});
    }
  }, [userId]);

  const balance = walletData?.balance ?? 0;
  const availableBalance = walletData?.availableBalance ?? balance;
  const lockedBalance = (walletData?.lockedSatang ?? 0) / 100;

  const topupMessage = useMemo(() => {
    const amount = Number.isFinite(depositAmount) && depositAmount > 0 ? depositAmount.toFixed(2) : '0.00';
    return [
      'WINRIDER TOP-UP',
      `WIN Wallet ID: ${walletData?.walletId || '-'}`,
      `บทบาท: ${roleLabelMap[role] || role}`,
      `ยอดโอน: ฿${amount}`,
      `ธนาคาร: ${WIN_WALLET_TOPUP_ACCOUNT.bankName}`,
      `เลขบัญชี: ${WIN_WALLET_TOPUP_ACCOUNT.accountNumber}`,
      `ชื่อเจ้าของบัญชี: ${WIN_WALLET_TOPUP_ACCOUNT.accountName}`,
      `LINE ส่งสลิป: ${WIN_WALLET_TOPUP_ACCOUNT.lineContact}`,
      'ส่งสลิปพร้อม WIN Wallet ID เพื่อให้ Admin ตรวจเงินจริงก่อนเติมยอด',
    ].join('\n');
  }, [depositAmount, role, walletData?.walletId]);

  const copyText = async (text: string) => {
    if (!navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyTopupInstructions = async () => {
    setDepositError('');
    setDepositMessage('');

    if (!walletData?.walletId) {
      setDepositError('ยังไม่พบ WIN Wallet ID กรุณากดซิงค์ยอดแล้วลองใหม่');
      return;
    }
    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      setDepositError('กรุณาระบุยอดเงินที่ต้องการเติม');
      return;
    }

    const copied = await copyText(topupMessage);
    setDepositMessage(
      copied
        ? `คัดลอกข้อมูลแล้ว หลังโอนเงินให้ส่งสลิปทาง LINE: ${WIN_WALLET_TOPUP_ACCOUNT.lineContact}`
        : `หลังโอนเงินให้ส่งสลิปพร้อม WIN Wallet ID ทาง LINE: ${WIN_WALLET_TOPUP_ACCOUNT.lineContact}`
    );
    if (audioEnabled) playTactileBlip(950);
  };

  const handleWithdrawSubmit = async () => {
    setWithdrawError('');
    setWithdrawMessage('');

    if (availableBalance <= 0) {
      setWithdrawError('ยอดที่สามารถถอนได้ขณะนี้คือ ฿0.00 หรือเงินกำลังถูกล็อกไว้ในคำขอถอนก่อนหน้า');
      return;
    }
    if (withdrawAmount <= 0 || withdrawAmount > availableBalance) {
      setWithdrawError(`ยอดถอนต้องไม่เกินยอดที่ถอนได้ (฿${availableBalance.toFixed(2)})`);
      return;
    }
    if (withdrawAmount <= 0) {
      setWithdrawError('ยอดถอนต้องมากกว่า 0 บาท');
      return;
    }
    if (!withdrawDestination.trim()) {
      setWithdrawError('กรุณาระบุหมายเลข PromptPay หรือเลขบัญชีธนาคารปลายทาง');
      return;
    }

    setWithdrawBusy(true);
    if (audioEnabled) playTactileBlip(950);
    try {
      const res = await submitWithdrawal({
        amount: withdrawAmount,
        promptPayOrAccount: withdrawDestination.trim(),
        accountName: withdrawAccountName.trim() || userName || 'เจ้าของบัญชี',
        bankName: withdrawBank,
      });
      setWithdrawMessage(res.message || 'ส่งคำขอถอนแล้ว ระบบล็อกยอดจนกว่า Admin จะโอนเงินจริงและยืนยัน');
      if (audioEnabled) playPaymentSuccessChime();
      void loadWallet(true);
    } catch (err: any) {
      setWithdrawError(err?.message || 'ทำรายการถอนเงินไม่สำเร็จ');
    } finally {
      setWithdrawBusy(false);
    }
  };

  if (loading && !walletData) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-3xl border border-white/10 bg-[#07132B]">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-slate-100">
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#FFD700]/60 bg-gradient-to-br from-[#0B1A38] via-[#07132B] to-[#040B1A] p-5 shadow-[0_0_30px_rgba(255,215,0,0.18)]">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#FFD700]/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-[#FFD700] text-slate-950 shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">WIN Wallet</h3>
              <p className="text-[11px] text-slate-400">{roleLabelMap[role]}</p>
              {walletData?.walletId && (
                <p className="mt-1 font-mono text-[11px] font-black text-cyan-300">{walletData.walletId}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadWallet(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-300 ${refreshing ? 'animate-spin' : ''}`} />
            ซิงค์ยอด
          </button>
        </div>

        <div className="relative pt-4">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-200/80">ยอดรวมใน WIN Wallet</p>
          <p className="mt-1 text-4xl font-black tracking-tight text-[#FFD700]">
            ฿{balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2.5">
              <p className="text-[10px] text-emerald-200/70">ใช้/ถอนได้</p>
              <p className="font-mono font-black text-emerald-300">฿{availableBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5">
              <p className="text-[10px] text-amber-200/70">ล็อกรอถอน</p>
              <p className="font-mono font-black text-amber-300">฿{lockedBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/40 p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('deposit')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${
            activeTab === 'deposit' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" /> เติมเงิน
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('withdraw')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${
            activeTab === 'withdraw' ? 'bg-amber-300 text-slate-950' : 'text-slate-400'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" /> ถอนเงิน
        </button>
      </div>

      {activeTab === 'deposit' && (
        <div className="space-y-4 rounded-3xl border border-emerald-500/30 bg-[#07172B] p-5 shadow-xl">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-black text-white">
              <Building2 className="h-4 w-4 text-emerald-300" />
              เติมเงินเข้าบัญชีบริษัท
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              ทุกบทบาทใช้ขั้นตอนเดียวกัน: โอนเงินจริง → ส่งสลิปทาง LINE → Admin ตรวจเงินเข้าจริง → เติมยอด WIN Wallet ตามเงินจริง
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[100, 200, 500, 1000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setDepositAmount(amt)}
                className={`rounded-xl border py-2 text-xs font-black ${
                  depositAmount === amt
                    ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                    : 'border-white/10 bg-black/30 text-slate-300'
                }`}
              >
                ฿{amt.toLocaleString()}
              </button>
            ))}
          </div>

          <input
            type="number"
            min="1"
            max="1000000"
            step="0.01"
            value={depositAmount || ''}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
            placeholder="ยอดเงินที่ต้องการโอน"
            className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm font-mono font-bold text-white outline-none focus:border-emerald-400"
          />

          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4 space-y-2">
            <p className="text-sm font-black text-amber-200">ข้อมูลโอนเงินสำหรับเติม WIN Wallet</p>
            <p className="text-sm text-white">ชื่อธนาคาร: <strong>{WIN_WALLET_TOPUP_ACCOUNT.bankName}</strong></p>
            <p className="text-base font-mono font-black text-emerald-300">เลขบัญชี: {WIN_WALLET_TOPUP_ACCOUNT.accountNumber}</p>
            <p className="text-sm text-white">ชื่อเจ้าของบัญชี: <strong>{WIN_WALLET_TOPUP_ACCOUNT.accountName}</strong></p>
            <p className="text-sm text-white">
              LINE ส่งสลิป: <strong className="font-mono text-[#06C755]">{WIN_WALLET_TOPUP_ACCOUNT.lineContact}</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs text-slate-300">
            <p className="font-black text-cyan-200">ข้อมูลที่จะส่งให้ Admin</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans leading-relaxed text-slate-300">{topupMessage}</pre>
          </div>

          <button
            type="button"
            onClick={() => void handleCopyTopupInstructions()}
            disabled={!walletData?.walletId || depositAmount <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C755] py-3.5 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MessageCircle className="h-5 w-5" />
            คัดลอกข้อมูลสำหรับส่งสลิป LINE
          </button>
          {depositError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              {depositError}
            </div>
          )}
          {depositMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              {depositMessage}
            </div>
          )}
        </div>
      )}

      {activeTab === 'withdraw' && (
        <div className="space-y-4 rounded-3xl border border-[#FFD700]/30 bg-[#07172B] p-5 shadow-xl">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-black text-white">
              <ArrowUpRight className="h-4 w-4 text-[#FFD700]" />
              ถอนเงินออกจาก WIN Wallet
            </h4>
            <p className="mt-1 text-[11px] text-slate-400">ระบบล็อกยอดก่อน และตัดยอดจริงเมื่อ Admin โอนเงินจริงแล้ว</p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-3.5 text-xs">
            <span className="text-slate-400">ยอดที่ถอนได้:</span>
            <span className="font-mono text-lg font-black text-[#FFD700]">฿{availableBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs text-slate-300">
            ถอนเงินได้ทุกบทบาท ไม่มีขั้นต่ำ • วันนี้ใช้ไป <strong>{walletData?.withdrawalsToday ?? 0}/{walletData?.withdrawalLimitPerDay ?? 3}</strong> ครั้ง
            <span className="ml-1 text-cyan-300">เหลือ {walletData?.withdrawalsRemainingToday ?? 3} ครั้ง</span>
          </div>

          <div className="grid gap-3">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={withdrawAmount || ''}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              placeholder="จำนวนเงินที่ต้องการถอน"
              className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm text-white outline-none focus:border-amber-400"
            />
            <input
              value={withdrawBank}
              onChange={(e) => setWithdrawBank(e.target.value)}
              placeholder="ธนาคาร / PromptPay"
              className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm text-white outline-none focus:border-amber-400"
            />
            <input
              value={withdrawDestination}
              onChange={(e) => setWithdrawDestination(e.target.value)}
              placeholder="เลขบัญชีหรือ PromptPay"
              className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm text-white outline-none focus:border-amber-400"
            />
            <input
              value={withdrawAccountName}
              onChange={(e) => setWithdrawAccountName(e.target.value)}
              placeholder="ชื่อเจ้าของบัญชี"
              className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm text-white outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleWithdrawSubmit()}
            disabled={withdrawBusy || availableBalance <= 0 || (walletData?.withdrawalsRemainingToday ?? 3) <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 py-3.5 text-sm font-black text-slate-950 disabled:opacity-40"
          >
            {withdrawBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
            ส่งคำขอถอนเงิน
          </button>

          {withdrawError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              {withdrawError}
            </div>
          )}
          {withdrawMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs text-emerald-200">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              {withdrawMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
