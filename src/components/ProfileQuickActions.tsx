import React, { useState } from 'react';
import { Bot, Target, Wallet, X, QrCode } from 'lucide-react';
import { playTactileBlip } from '../utils/audio';
import { WalletTopUpPanel } from './WalletTopUpPanel';
import { WinAiAssistantPanel } from './WinAiAssistantPanel';
import { PaymentReceiverSettingsPanel } from './PaymentReceiverSettingsPanel';

type ProfileTool = 'wallet' | 'payment' | 'assistant' | 'quests';

interface ProfileQuickActionsProps {
  role?: 'knight' | 'citizen' | 'merchant' | 'partner';
  userId?: string;
  userName?: string;
  audioEnabled?: boolean;
  questContent?: React.ReactNode;
  questEmptyText?: string;
}

export const ProfileQuickActions: React.FC<ProfileQuickActionsProps> = ({
  role = 'citizen',
  userId,
  userName,
  audioEnabled = true,
  questContent,
  questEmptyText = 'ยังไม่มีภารกิจจริงสำหรับบัญชีนี้',
}) => {
  const [activeTool, setActiveTool] = useState<ProfileTool | null>(null);
  const open = (tool: ProfileTool) => {
    if (audioEnabled) playTactileBlip(900);
    setActiveTool(tool);
  };
  const actions = [
    { id: 'wallet' as const, label: 'WIN Wallet', sub: 'ฝาก-ถอน & ยอดเงินจริง', icon: Wallet, color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' },
    { id: 'payment' as const, label: 'ตั้งค่ารับเงิน', sub: 'PromptPay & QR ธนาคาร', icon: QrCode, color: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/10' },
    { id: 'assistant' as const, label: 'WIN-AI ผู้ช่วย', sub: 'ราคา สูตร คำแนะนำ', icon: Bot, color: 'text-blue-300 border-blue-400/40 bg-blue-500/10' },
    { id: 'quests' as const, label: 'ภารกิจ XP', sub: 'ดูภารกิจความคืบหน้า', icon: Target, color: 'text-amber-300 border-amber-400/40 bg-amber-500/10' },
  ];

  return <>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="เครื่องมือโปรไฟล์">
      {actions.map(({ id, label, sub, icon: Icon, color }) => <button key={id} type="button" onClick={() => open(id)}
        className={`min-h-20 rounded-2xl border p-2.5 text-left transition-all hover:brightness-125 active:scale-[0.98] ${color}`}>
        <Icon className="mb-1.5 h-5 w-5" />
        <span className="block text-xs font-black leading-tight">{label}</span>
        <span className="mt-1 hidden text-[9px] text-slate-400 sm:block">{sub}</span>
      </button>)}
    </div>

    {activeTool && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" onMouseDown={(e) => e.target === e.currentTarget && setActiveTool(null)}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-cyan-400/40 bg-[#060D1E] p-4 shadow-[0_0_40px_rgba(0,210,255,0.25)] sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-black text-white">{actions.find((item) => item.id === activeTool)?.label}</h2>
          <button type="button" onClick={() => setActiveTool(null)} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="ปิด"><X className="h-5 w-5" /></button>
        </div>
        {activeTool === 'wallet' && (
          <WalletTopUpPanel
            role={role}
            userId={userId}
            userName={userName}
          />
        )}
        {activeTool === 'payment' && (
          <PaymentReceiverSettingsPanel
            role={role}
            userId={userId}
            defaultName={userName}
            audioEnabled={audioEnabled}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'assistant' && <WinAiAssistantPanel mode="personal_commerce" />}
        {activeTool === 'quests' && (questContent || <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">{questEmptyText}</div>)}
      </div>
    </div>}
  </>;
};

