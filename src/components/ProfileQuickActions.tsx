import React, { useState } from 'react';
import { X } from 'lucide-react';
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
    { id: 'wallet' as const, label: 'WIN Wallet', image: '/ui/profile-actions/win-wallet.svg' },
    { id: 'payment' as const, label: 'ตั้งค่ารับเงิน', image: '/ui/profile-actions/payment.svg' },
    { id: 'assistant' as const, label: 'WIN-AI ผู้ช่วย', image: '/ui/profile-actions/win-ai.svg' },
    { id: 'quests' as const, label: 'ภารกิจ XP', image: '/ui/profile-actions/xp.svg' },
  ];

  return <>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="เครื่องมือโปรไฟล์">
      {actions.map(({ id, label, image }) => (
        <button
          key={id}
          type="button"
          onClick={() => open(id)}
          aria-label={label}
          className="group relative min-h-20 overflow-hidden rounded-2xl border-0 bg-transparent p-0 text-left transition-all duration-300 hover:-translate-y-0.5 hover:brightness-125 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
        >
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="block h-20 w-full rounded-2xl object-fill transition-transform duration-300 group-hover:scale-[1.015]"
          />
        </button>
      ))}
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

