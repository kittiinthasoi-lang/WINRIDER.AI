import React, { useState } from 'react';
import { Bot, Target, Wallet, X, QrCode, ChevronRight, Sparkles } from 'lucide-react';
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
    { id: 'wallet' as const, label: 'WIN Wallet', sub: 'ฝาก-ถอน & ยอดเงินจริง', icon: Wallet, accent: 'from-blue-500/30 via-cyan-400/10 to-transparent', glow: 'shadow-[0_0_22px_rgba(0,190,255,0.22)]', border: 'border-cyan-400/45', iconBox: 'bg-cyan-400/10 border-cyan-300/30 text-cyan-200', arrow: 'text-cyan-300' },
    { id: 'payment' as const, label: 'ตั้งค่ารับเงิน', sub: 'ช่องทางรับเงิน & QR', icon: QrCode, accent: 'from-amber-400/30 via-yellow-300/10 to-transparent', glow: 'shadow-[0_0_22px_rgba(255,190,0,0.2)]', border: 'border-amber-300/45', iconBox: 'bg-amber-300/10 border-amber-200/30 text-amber-200', arrow: 'text-amber-200' },
    { id: 'assistant' as const, label: 'WIN-AI ผู้ช่วย', sub: 'ราคา สูตร คำแนะนำ', icon: Bot, accent: 'from-violet-500/30 via-fuchsia-400/10 to-transparent', glow: 'shadow-[0_0_22px_rgba(160,80,255,0.22)]', border: 'border-violet-400/45', iconBox: 'bg-violet-400/10 border-violet-300/30 text-violet-200', arrow: 'text-violet-300' },
    { id: 'quests' as const, label: 'ภารกิจ XP', sub: 'ดูภารกิจความคืบหน้า', icon: Target, accent: 'from-emerald-400/30 via-teal-300/10 to-transparent', glow: 'shadow-[0_0_22px_rgba(20,220,170,0.2)]', border: 'border-emerald-300/45', iconBox: 'bg-emerald-300/10 border-emerald-200/30 text-emerald-200', arrow: 'text-emerald-200' },
  ];

  return <>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="เครื่องมือโปรไฟล์">
      {actions.map(({ id, label, sub, icon: Icon, accent, glow, border, iconBox, arrow }) => (
        <button
          key={id}
          type="button"
          onClick={() => open(id)}
          className={`group relative min-h-20 overflow-hidden rounded-2xl border bg-[#071126]/95 p-2.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:brightness-125 active:scale-[0.98] ${border} ${glow}`}
        >
          <span className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
          <span className="pointer-events-none absolute -right-5 -top-6 h-16 w-16 rounded-full bg-white/5 blur-xl transition-transform duration-500 group-hover:scale-150" />
          <span className="pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <span className="relative flex items-center gap-2">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${iconBox}`}>
              <Icon className="h-5 w-5 drop-shadow-[0_0_8px_currentColor]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[11px] font-black leading-tight text-white sm:text-xs">
                {label}
                <Sparkles className="h-2.5 w-2.5 opacity-60" />
              </span>
              <span className="mt-1 hidden text-[9px] leading-tight text-slate-400 sm:block">{sub}</span>
            </span>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 ${arrow}`}>
              <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </span>
          <span className="pointer-events-none absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
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

