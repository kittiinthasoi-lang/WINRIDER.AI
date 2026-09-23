import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  QrCode, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy, 
  RefreshCw,
  Building2,
  ShieldCheck,
  Clock,
  ExternalLink
} from 'lucide-react';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { getWalletMe, submitTopupProof, submitWithdrawal, WalletStateResponse } from '../services/walletService';
import { getPaymentProfile } from '../services/paymentProfileService';
import { playTactileBlip, playPaymentSuccessChime } from '../utils/audio';

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

  // Deposit State
  const [depositAmount, setDepositAmount] = useState<number>(200);
  const [depositQr, setDepositQr] = useState<string>('');
  const [proofFile, setProofFile] = useState<string>('');
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositMessage, setDepositMessage] = useState<string>('');
  const [depositError, setDepositError] = useState<string>('');
  const [copiedPromptPay, setCopiedPromptPay] = useState(false);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [withdrawDestination, setWithdrawDestination] = useState<string>('');
  const [withdrawAccountName, setWithdrawAccountName] = useState<string>(userName);
  const [withdrawBank, setWithdrawBank] = useState<string>('PromptPay');
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string>('');

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
      if (onBalanceUpdate) {
        onBalanceUpdate(data.balance);
      }
    } catch (err) {
      console.warn('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWallet();

    // Try pre-filling withdrawal details from existing payment receiver profile
    if (userId) {
      getPaymentProfile(userId).then((profile) => {
        if (profile) {
          if (profile.promptPayId) {
            setWithdrawDestination(profile.promptPayId);
            setWithdrawBank(profile.bankName || 'PromptPay');
          }
          if (profile.accountName) {
            setWithdrawAccountName(profile.accountName);
          }
        }
      }).catch(() => {});
    }
  }, [userId]);

  // Generate PromptPay QR for system deposit
  useEffect(() => {
    const promptPayId = walletData?.systemPromptPay?.promptPayId || '';
    if (!promptPayId || depositAmount <= 0) {
      setDepositQr('');
      return;
    }
    promptPayId ? generatePromptPayQRDataUrl(promptPayId, depositAmount) : Promise.resolve('')
      .then(setDepositQr)
      .catch(() => setDepositError('สร้าง QR โอนเงินของระบบไม่สำเร็จ'));
  }, [walletData?.systemPromptPay?.promptPayId, depositAmount]);

  const handleCopyPromptPay = () => {
    const id = walletData?.systemPromptPay?.promptPayId || '';
    if (id && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedPromptPay(true);
      if (audioEnabled) playTactileBlip(1000);
      setTimeout(() => setCopiedPromptPay(false), 2000);
    }
  };

  const handleReadProof = (file?: File) => {
    if (!file) return;
    setDepositError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setDepositError('กรุณาใช้สลิปรูปภาพ JPG / PNG / WEBP ขนาดไม่เกิน 4 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofFile(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleDepositSubmit = async () => {
    if (!walletData?.systemPromptPay?.configured) {
      setDepositError('ระบบยังไม่ได้ตั้งค่าบัญชีรับเงิน กรุณาติดต่อผู้ดูแล');
      return;
    }
    if (!proofFile || depositAmount <= 0) return;
    setDepositBusy(true);
    setDepositMessage('');
    setDepositError('');
    if (audioEnabled) playTactileBlip(900);

    try {
      const res = await submitTopupProof(depositAmount, proofFile);
      setDepositMessage(res.message || 'ส่งสลิปแล้ว รอ Admin ตรวจเงินจริงในบัญชีธนาคารและยืนยันยอด');
      setProofFile('');
      if (audioEnabled) playPaymentSuccessChime();
      loadWallet(true);
    } catch (err: any) {
      setDepositError(err?.message || 'ส่งสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setDepositBusy(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    const currentBalance = walletData?.availableBalance ?? walletData?.balance ?? 0;
    setWithdrawError('');
    setWithdrawMessage('');

    if (currentBalance <= 0) {
      setWithdrawError('ยอดเงินที่ถอนได้ใน WIN Wallet คือ ฿0.00 หรือกำลังถูกล็อกไว้ในคำขอถอนก่อนหน้า');
      return;
    }

    if (withdrawAmount <= 0 || withdrawAmount > currentBalance) {
      setWithdrawError(`ยอดเงินที่ต้องการถอนต้องไม่เกินยอดที่ถอนได้ (฿${currentBalance.toFixed(2)})`);
      return;
    }

    if (withdrawAmount < 20) {
      setWithdrawError('ยอดถอนขั้นต่ำคือ 20.00 บาท');
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

      setWithdrawMessage(res.message || 'ส่งคำขอถอนเงินแล้ว ระบบล็อกยอดไว้จนกว่า Admin จะโอนเงินจริงและยืนยัน');
      if (audioEnabled) playPaymentSuccessChime();
      loadWallet(true);
    } catch (err: any) {
      setWithdrawError(err?.message || 'ทำรายการถอนเงินไม่สำเร็จ');
    } finally {
      setWithdrawBusy(false);
    }
  };

  const balance = walletData?.balance ?? 0.0;
  const availableBalance = walletData?.availableBalance ?? balance;
  const lockedBalance = (walletData?.lockedSatang ?? 0) / 100;
  const promptPaySystemId = walletData?.systemPromptPay?.promptPayId || '';
  const systemBankName = walletData?.systemPromptPay?.bankName || '';
  const systemBankAccountNumber = walletData?.systemPromptPay?.bankAccountNumber || '';
  const systemAccountName = walletData?.systemPromptPay?.accountName || '';

  return (
    <div className="space-y-4 font-sans text-slate-100">
      {/* 1. Header & Real Balance Display Hero */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#FFD700]/60 bg-gradient-to-br from-[#0B1A38] via-[#07132B] to-[#040B1A] p-5 shadow-[0_0_30px_rgba(255,215,0,0.18)]">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#FFD700]/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-[#FFD700] text-slate-950 shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide">WIN Wallet</h3>
                <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-400/30">
                  {roleLabelMap[role] || role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                กระเป๋าเงินดิจิทัลกลาง • ยอดเงินจริงในระบบ Double-Entry
              </p>
              {walletData?.walletId && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-200">WIN Wallet ID</span>
                  <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-mono font-black text-cyan-300">
                    {walletData.walletId}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadWallet(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            title="รีเฟรชยอดเงินจริง"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-300 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-mono">ซิงค์ยอด</span>
          </button>
        </div>

        {/* Real Balance Number Display */}
        <div className="pt-4 pb-2">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-200/80">
            ยอดเงินคงเหลือจริงใน WIN Wallet
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#FFD700] drop-shadow-[0_0_20px_rgba(255,215,0,0.3)]">
              ฿{balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold text-slate-300">บาท</span>
          </div>
          {balance === 0 && (
            <p className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>แสดงยอดจริง 0.00 บาทตามฐานข้อมูลระบบ (ไม่มีการจำลองยอดปลอม)</span>
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2.5">
              <p className="text-[10px] text-emerald-200/70">ยอดที่ใช้/ถอนได้</p>
              <p className="font-mono font-black text-emerald-300">฿{availableBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5">
              <p className="text-[10px] text-amber-200/70">ยอดล็อกรอถอน</p>
              <p className="font-mono font-black text-amber-300">฿{lockedBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Action Tabs: ฝากเงิน vs ถอนเงิน */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/40 p-1.5 border border-white/10">
        <button
          type="button"
          onClick={() => {
            if (audioEnabled) playTactileBlip(800);
            setActiveTab('deposit');
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${
            activeTab === 'deposit'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          <span>ฝากเงิน (Deposit)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (audioEnabled) playTactileBlip(800);
            setActiveTab('withdraw');
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${
            activeTab === 'withdraw'
              ? 'bg-gradient-to-r from-amber-400 via-[#FFD700] to-orange-400 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.35)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>ถอนเงิน (Withdraw)</span>
        </button>
      </div>

      {/* 3. TAB 1: DEPOSIT (ฝากเงินผ่าน QR ระบบที่ตั้งไว้) */}
      {activeTab === 'deposit' && (
        <div className="space-y-4 rounded-3xl border border-emerald-500/30 bg-[#07172B] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <QrCode className="h-4 w-4 text-emerald-400" />
                <span>{systemBankAccountNumber ? 'โอนเข้าบัญชีธนาคารสำหรับเติม WIN Wallet' : 'สแกน QR PromptPay ของระบบเพื่อเติมเงิน'}</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ระบบจะให้แอดมินตรวจยอดเงินจริงจากบัญชีธนาคารก่อนเครดิตเข้า WIN Wallet • บันทึก Double-Entry Ledger
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
              SYSTEM QR
            </span>
          </div>

          {/* Quick Amount Pills */}
          <div>
            <label className="text-sm font-bold text-slate-300">เลือกจำนวนเงินที่ต้องการฝาก:</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[100, 200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(750);
                    setDepositAmount(amt);
                  }}
                  className={`rounded-xl py-2 text-xs font-black font-mono transition-all border ${
                    depositAmount === amt
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-md scale-[1.02]'
                      : 'bg-black/30 text-slate-300 border-white/10 hover:border-white/30'
                  }`}
                >
                  ฿{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Deposit Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300">หรือระบุยอดเงินเอง (บาท):</label>
            <input
              type="number"
              min="1"
              max="100000"
              value={depositAmount || ''}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              placeholder="ระบุจำนวนเงิน เช่น 150"
              className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm font-mono font-bold text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          {/* QR Code and Account Info Card */}
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4 space-y-1.5">
  <p className="text-sm font-black text-amber-200">บัญชีรับเงินสำหรับเติม WIN Wallet</p>
  {systemBankName && <p className="text-sm text-white">ธนาคาร: <strong>{systemBankName}</strong></p>}
  {systemBankAccountNumber && <p className="text-base font-mono font-black text-emerald-300">เลขบัญชี: {systemBankAccountNumber}</p>}
  {systemAccountName && <p className="text-sm text-white">ชื่อบัญชี: <strong>{systemAccountName}</strong></p>}
  {!systemBankAccountNumber && !promptPaySystemId && <p className="text-xs text-rose-300">ยังไม่ได้ตั้งค่าบัญชีรับเงินในระบบ กรุณาให้ Super Admin ตั้งค่าก่อนเติมเงิน</p>}
</div>

<div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center rounded-2xl bg-black/40 border border-white/10 p-4">
            {depositQr ? (
              <div className="flex flex-col items-center mx-auto">
                <div className="rounded-2xl bg-white p-2.5 shadow-lg">
                  <img
                    src={depositQr}
                    alt="PromptPay QR Code"
                    className="h-44 w-44 object-contain"
                  />
                </div>
                <span className="text-[10px] text-amber-300 font-mono mt-1.5">
                  สแกนด้วยแอปธนาคารใดก็ได้
                </span>
              </div>
            ) : (
              <div className="h-44 w-44 flex items-center justify-center rounded-2xl bg-black/60 text-slate-500 text-xs mx-auto">
                {depositAmount <= 0 ? 'กรุณาระบุยอดเงิน' : 'กำลังสร้าง QR...'}
              </div>
            )}

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-1">
                <div className="text-[10px] uppercase font-mono text-slate-400">บัญชีรับเงินของระบบ WINRIDER</div>
                <div className="font-bold text-white text-sm">{systemAccountName}</div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-emerald-300 font-bold">PromptPay: {promptPaySystemId}</span>
                  <button
                    type="button"
                    onClick={handleCopyPromptPay}
                    className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[10px] text-slate-200 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedPromptPay ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-2.5 text-[10px] text-cyan-100">
              ID นี้เป็นรหัสอ้างอิงสั้นของเจ้าของ WIN Wallet สำหรับค้นหา/ตรวจสอบในระบบ ไม่ใช่เลขบัตรประชาชนหรือข้อมูลลับ
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
                <p>• ยอดเงินใน QR: <strong className="text-[#FFD700] font-mono font-bold">฿{depositAmount.toLocaleString()}</strong></p>
                <p>• โอนเสร็จแล้วให้แนบรูปภาพสลิปด้านล่างเพื่ออัปเดตยอดเข้า WIN Wallet</p>
              </div>
            </div>
          </div>

          {/* Slip Upload & Submit */}
          <div className="space-y-3 pt-1">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400/50 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all">
              <Upload className="h-4 w-4" />
              <span>{proofFile ? 'เปลี่ยนรูปสลิปใหม่' : 'แนบสลิปการโอนเงิน (JPG / PNG)'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleReadProof(e.target.files?.[0])}
              />
            </label>

            {proofFile && (
              <div className="relative rounded-2xl border border-white/15 bg-black/40 p-2 text-center">
                <img
                  src={proofFile}
                  alt="สลิปที่เลือก"
                  className="mx-auto max-h-56 rounded-xl object-contain"
                />
                <span className="mt-1 block text-[10px] text-slate-400">รูปภาพสลิปที่แนบพร้อมส่ง</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleDepositSubmit}
              disabled={depositBusy || !walletData?.systemPromptPay?.configured || !proofFile || depositAmount <= 0}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 py-3.5 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {depositBusy ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังส่งสลิปให้ Admin ตรวจ...</span>
                </span>
              ) : (
                'ยืนยันส่งสลิปเติมเงินเข้า WIN Wallet'
              )}
            </button>
          </div>

          {depositError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{depositError}</span>
            </div>
          )}

          {depositMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{depositMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: WITHDRAW (ถอนเงินออกจาก WIN Wallet) */}
      {activeTab === 'withdraw' && (
        <div className="space-y-4 rounded-3xl border border-[#FFD700]/30 bg-[#07172B] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-[#FFD700]" />
                <span>ถอนเงินออกจาก WIN Wallet</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                โอนเงินเข้าบัญชีธนาคารหรือ PromptPay ของคุณโดยตรง
              </p>
            </div>
            <span className="rounded-full bg-[#FFD700]/20 border border-[#FFD700]/40 px-2 py-0.5 text-[10px] font-mono text-[#FFD700]">
              PAYOUT
            </span>
          </div>

          {/* Current Balance Notice */}
          <div className="flex items-center justify-between rounded-2xl bg-black/40 border border-white/10 p-3.5 text-xs">
            <span className="text-slate-400">ยอดที่สามารถถอนได้ปัจจุบัน:</span>
            <span className="font-mono font-black text-lg text-[#FFD700]">
              ฿{availableBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {availableBalance <= 0 && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 p-3.5 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="block font-bold">ยอดที่สามารถถอนได้ขณะนี้คือ ฿0.00</strong>
                <span>ไม่สามารถทำรายการถอนได้ในขณะนี้ กรุณาฝากเงินหรือรับงาน/ขายของเพื่อสะสมยอดก่อนทำการถอน</span>
              </div>
            </div>
          )}

          {/* Withdrawal Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">จำนวนเงินที่ต้องการถอน (บาท):</label>
              {balance > 0 && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(750);
                      setWithdrawAmount(Math.floor(balance / 2));
                    }}
                    className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] text-slate-300 hover:text-white"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(750);
                      setWithdrawAmount(Math.floor(balance));
                    }}
                    className="rounded-lg bg-[#FFD700]/20 text-[#FFD700] px-2 py-0.5 text-[10px] font-bold hover:bg-[#FFD700]/30"
                  >
                    ถอนทั้งหมด (MAX)
                  </button>
                </div>
              )}
            </div>

            <input
              type="number"
              min="20"
              max={balance > 0 ? balance : 100000}
              value={withdrawAmount || ''}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              placeholder="ระบุจำนวนเงิน เช่น 100"
              disabled={balance <= 0}
              className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm font-mono font-bold text-white focus:border-[#FFD700] focus:outline-none disabled:opacity-40"
            />
            <p className="text-[10px] text-slate-400">
              * ถอนขั้นต่ำ 20.00 บาท ไม่มีค่าธรรมเนียมถอนเงินสำหรับสมาชิก
            </p>
          </div>

          {/* Destination Details */}
          <div className="space-y-3 rounded-2xl bg-black/30 border border-white/10 p-3.5 text-xs">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>ข้อมูลบัญชีรับเงินปลายทางของคุณ:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400">ช่องทางโอน:</label>
                <select
                  value={withdrawBank}
                  onChange={(e) => setWithdrawBank(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-white/15 bg-black/50 p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="PromptPay">PromptPay (พร้อมเพย์)</option>
                  <option value="กสิกรไทย (KBANK)">กสิกรไทย (KBANK)</option>
                  <option value="ไทยพาณิชย์ (SCB)">ไทยพาณิชย์ (SCB)</option>
                  <option value="กรุงเทพ (BBL)">กรุงเทพ (BBL)</option>
                  <option value="กรุงไทย (KTB)">กรุงไทย (KTB)</option>
                  <option value="กรุงศรีอยุธยา (BAY)">กรุงศรีอยุธยา (BAY)</option>
                  <option value="ทหารไทยธนชาต (TTB)">ทหารไทยธนชาต (TTB)</option>
                  <option value="ออมสิน (GSB)">ออมสิน (GSB)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400">เบอร์พร้อมเพย์ / เลขบัญชี:</label>
                <input
                  type="text"
                  value={withdrawDestination}
                  onChange={(e) => setWithdrawDestination(e.target.value)}
                  placeholder="เช่น 0812345678 หรือเลขบัญชี"
                  className="w-full mt-1 rounded-xl border border-white/15 bg-black/50 p-2.5 text-xs font-mono text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400">ชื่อเจ้าของบัญชี (ตรงกับบัตรประชาชน):</label>
              <input
                type="text"
                value={withdrawAccountName}
                onChange={(e) => setWithdrawAccountName(e.target.value)}
                placeholder="ชื่อ-นามสกุล เจ้าของบัญชี"
                className="w-full mt-1 rounded-xl border border-white/15 bg-black/50 p-2.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleWithdrawSubmit}
            disabled={withdrawBusy || balance <= 0 || withdrawAmount <= 0 || withdrawAmount > balance}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-[#FFD700] to-orange-400 py-3.5 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(255,215,0,0.35)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {withdrawBusy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังส่งคำขอถอนเงิน...</span>
              </span>
            ) : (
              `ยืนยันส่งคำขอถอนเงิน ฿${withdrawAmount > 0 ? withdrawAmount.toLocaleString() : '0'}`
            )}
          </button>

          {withdrawError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{withdrawError}</span>
            </div>
          )}

          {withdrawMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{withdrawMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* 5. Recent Ledger / History */}
      {walletData && (walletData.submissions.length > 0 || walletData.withdrawals.length > 0) && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-300" />
              <span>ประวัติคำขอธุรกรรมล่าสุด</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">STATUS LEDGER</span>
          </div>

          <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
            {walletData.submissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between rounded-xl bg-white/5 p-2.5 border border-white/5">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-white">ฝากเงิน ฿{(sub.amountSatang / 100).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Ref: {sub.reference || sub.id.slice(0, 10)}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  sub.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                  sub.status === 'WAITING_ADMIN' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {sub.status === 'APPROVED' ? 'อนุมัติแล้ว' : sub.status === 'WAITING_ADMIN' ? 'รอ Super Admin ตรวจ' : 'ปฏิเสธ'}
                </span>
              </div>
            ))}

            {walletData.withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl bg-white/5 p-2.5 border border-white/5">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  <div>
                    <div className="font-bold text-white">ถอนเงิน ฿{(w.amountSatang / 100).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ปลายทาง: {w.promptPayOrAccount}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  w.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                  w.status === 'WAITING_ADMIN' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {w.status === 'APPROVED' ? 'โอนแล้ว' : w.status === 'WAITING_ADMIN' ? 'รอโอนเงิน' : 'ยกเลิก'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
