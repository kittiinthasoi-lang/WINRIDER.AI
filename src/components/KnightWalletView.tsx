import React, { useState } from 'react';
import { 
  Wallet, 
  Shield, 
  PiggyBank, 
  HardHat, 
  Wrench, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { globalLedgerEngine, KnightWalletState, LedgerEntry } from '../core/ledger';
import { WalletTopUpPanel } from './WalletTopUpPanel';

interface KnightWalletViewProps {
  onBack?: () => void;
}

export const KnightWalletView: React.FC<KnightWalletViewProps> = () => {
  const [wallet, setWallet] = useState<KnightWalletState>(globalLedgerEngine.getWallet());
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(globalLedgerEngine.getLedgerEntries());

  const bucketsInfo = [
    {
      id: 'system',
      title: 'ค่าระบบปฏิบัติการ',
      amount: wallet.buckets.system,
      icon: TrendingUp,
      color: 'text-[#00D4FF]',
      border: 'border-[#00D4FF]/30',
      bg: 'bg-[#00D4FF]/10',
      desc: 'เซิร์ฟเวอร์, AI Dispatch, แผนที่ดาวเทียม'
    },
    {
      id: 'insurance',
      title: 'คุ้มครองอุบัติเหตุ',
      amount: wallet.buckets.insurance,
      icon: Shield,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      desc: 'กองทุนรักษาพยาบาลฉุกเฉินและอุบัติเหตุ'
    },
    {
      id: 'pension',
      title: 'เงินออมเพื่ออนาคต',
      amount: wallet.buckets.pension,
      icon: PiggyBank,
      color: 'text-[#FFC93C]',
      border: 'border-[#FFC93C]/30',
      bg: 'bg-[#FFC93C]/10',
      desc: 'เงินสะสมบำเหน็จอัศวิน ถอนได้ตามเกณฑ์'
    },
    {
      id: 'helmet',
      title: 'มัดจำหมวกกันน็อก',
      amount: wallet.buckets.helmet,
      icon: HardHat,
      color: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      desc: 'หลักประกันหมวกนิรภัยมาตรฐานสากล'
    },
    {
      id: 'equipment',
      title: 'ผ่อนชำระชุดเกราะ',
      amount: wallet.buckets.equipment,
      icon: Wrench,
      color: 'text-cyan-300',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
      desc: 'เสื้อกั๊กอัจฉริยะ กล่องท้ายอัศวิน'
    }
  ];

  const installmentPercent = Math.min(
    100, 
    Math.round((wallet.equipmentInstallment.paidAmount / wallet.equipmentInstallment.totalGoal) * 100)
  );

  return (
    <div className="space-y-4 pb-20 font-thai">
      {/* Gold Total Balance Hero (Strict 3% Gold rule applied) */}
      <div className="relative p-5 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#FFC93C]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-300 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-[#00D4FF]" />
            ยอดเงินกระเป๋าอัศวิน (พร้อมถอน)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30 font-mono font-medium">
            REAL-TIME LEDGER
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-2">
          {/* Main Gold Total Text */}
          <span className="text-3xl sm:text-4xl font-black text-[#FFC93C] tracking-tight">
            ฿{wallet.balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-gray-400">บาท</span>
        </div>

      </div>

      <WalletTopUpPanel />

      {/* Equipment Installment Progress Bar */}
      <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/25 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-300">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">ความคืบหน้าผ่อนชำระชุดเกราะ</h4>
              <p className="text-[10px] text-gray-400">หักอัตโนมัติรอบละ 1 บาท (สูงสุด 20 รอบ/วัน)</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#00D4FF] font-mono">
            {installmentPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden my-2 border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#00D4FF] to-[#38E1FF] rounded-full transition-all duration-500"
            style={{ width: `${installmentPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-gray-300">
            ผ่อนแล้ว <strong className="text-white font-mono">{wallet.equipmentInstallment.paidAmount.toLocaleString()}</strong> / {wallet.equipmentInstallment.totalGoal.toLocaleString()} บาท
          </span>
          <span className="text-[#FFC93C] font-medium">
            วันนี้หักไปแล้ว <strong className="font-mono">{wallet.equipmentInstallment.todayDeductionsCount}</strong>/20 รอบ
          </span>
        </div>
      </div>

      {/* 5 Buckets Breakdown Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            แยกแสดง 5 ถังสวัสดิการอัศวิน (โปร่งใส 100%)
          </h3>
          <span className="text-[10px] text-[#00D4FF]">กฎ Double-Entry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bucketsInfo.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className={`p-3 rounded-2xl bg-[#0A1633] border ${b.border} flex items-center justify-between hover:bg-[#0A1633]/90 transition`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${b.bg} ${b.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white leading-tight">{b.title}</h5>
                    <p className="text-[10px] text-gray-400 line-clamp-1">{b.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black font-mono ${b.color}`}>
                    ฿{b.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Double-Entry Ledger History */}
      <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/25 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00D4FF]" />
            <h4 className="text-xs font-bold text-white">ประวัติธุรกรรม Double-Entry</h4>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">
            {ledgerEntries.length} รายการ
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {ledgerEntries.map((tx) => {
            const isCredit = tx.creditAccount === 'WALLET_KNIGHT';
            return (
              <div
                key={tx.id}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start justify-between text-xs hover:border-[#00D4FF]/30 transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">{tx.description}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400 font-mono">
                      {tx.txId}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-2 font-mono">
                    <span>DR: {tx.debitAccount}</span>
                    <span>→</span>
                    <span>CR: {tx.creditAccount}</span>
                  </div>
                  <span className="text-[9px] text-gray-500 block">
                    {new Date(tx.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} • {new Date(tx.createdAt).toLocaleDateString('th-TH')}
                  </span>
                </div>

                <div className="text-right">
                  <span className={`font-bold font-mono text-xs ${isCredit ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isCredit ? '+' : '-'}฿{tx.amount.toFixed(2)}
                  </span>
                  <span className="block text-[9px] uppercase tracking-wider text-gray-400">
                    {tx.bucket}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
