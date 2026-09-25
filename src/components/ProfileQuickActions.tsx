import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Mail, Phone, UserRound, X } from 'lucide-react';
import { playTactileBlip } from '../utils/audio';
import { WalletTopUpPanel } from './WalletTopUpPanel';
import { WinAiAssistantPanel } from './WinAiAssistantPanel';
import { PaymentReceiverSettingsPanel } from './PaymentReceiverSettingsPanel';
import { auth } from '../firebase';

type ProfileTool = 'wallet' | 'payment' | 'assistant' | 'quests' | 'contact';
interface ProfileQuickActionsProps { role?: 'knight' | 'citizen' | 'merchant' | 'partner'; userId?: string; userName?: string; audioEnabled?: boolean; questContent?: React.ReactNode; questEmptyText?: string; }

export const ProfileQuickActions: React.FC<ProfileQuickActionsProps> = ({ role = 'citizen', userId, userName, audioEnabled = true, questContent, questEmptyText = 'ยังไม่มีภารกิจจริงสำหรับบัญชีนี้' }) => {
  const [activeTool, setActiveTool] = useState<ProfileTool | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactData, setContactData] = useState<{ name: string; phone: string; email: string; emergencyName: string; emergencyPhone: string; shopOrOrg: string; contactPerson: string; vehicle: string; } | null>(null);
  const open = async (tool: ProfileTool) => {
    if (audioEnabled) playTactileBlip(900);
    setActiveTool(tool);
    if (tool !== 'contact' || contactData) return;
    setContactLoading(true);
    try {
      const authUser = auth.currentUser;
      const uid = userId || authUser?.uid;
      if (!uid) throw new Error('ไม่พบบัญชีผู้ใช้');
      const userSnap = await getDoc(doc(db, 'users', uid));
      const user = userSnap.exists() ? userSnap.data() as Record<string, any> : {};
      const collectionName = role === 'knight' ? 'knights' : role === 'citizen' ? 'citizens' : role === 'merchant' ? 'merchants' : 'partners';
      const roleSnap = await getDoc(doc(db, collectionName, uid));
      const roleData = roleSnap.exists() ? roleSnap.data() as Record<string, any> : {};
      const emergency = role === 'citizen' && roleData.emergencyContact ? roleData.emergencyContact : {};
      setContactData({ name: String(user.name || user.displayName || userName || ''), phone: String(user.phone || roleData.phone || ''), email: String(user.email || roleData.email || roleData.contactEmail || ''), emergencyName: String(emergency.name || ''), emergencyPhone: String(emergency.phone || ''), shopOrOrg: String(role === 'merchant' ? (roleData.shopName || roleData.name || '') : role === 'partner' ? (roleData.orgName || roleData.name || '') : ''), contactPerson: String(roleData.contactPerson || roleData.ownerName || ''), vehicle: String(role === 'knight' ? [roleData.vehicleType, roleData.plateNumber].filter(Boolean).join(' • ') : '') });
    } catch (error) {
      console.warn('[ProfileQuickActions] Contact data load failed:', error);
      setContactData({ name: userName || '', phone: '', email: '', emergencyName: '', emergencyPhone: '', shopOrOrg: '', contactPerson: '', vehicle: '' });
    } finally { setContactLoading(false); }
  };

  // Partner has no separate artwork set in the repository; reuse the merchant artwork purely as UI artwork.
  // This does not imply that partner data comes from merchants.
  const artworkRole = role === 'partner' ? 'merchant' : role;
  const actions = [
    { id: 'wallet' as const, label: 'WIN Wallet', image: `/ui/profile-actions/${artworkRole}-wallet.svg` },
    { id: 'payment' as const, label: 'บัญชีถอนเงิน', image: `/ui/profile-actions/${artworkRole}-payment.svg` },
    { id: 'assistant' as const, label: 'WIN-AI ผู้ช่วย', image: `/ui/profile-actions/${artworkRole}-assistant.svg` },
    { id: 'quests' as const, label: 'ภารกิจ XP', image: `/ui/profile-actions/${artworkRole}-quests.svg` },
    { id: 'contact' as const, label: 'ข้อมูลติดต่อ', image: '' },
  ];

  return <>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="เครื่องมือโปรไฟล์">
      {actions.map(({ id, label, image }) => <button key={id} type="button" onClick={() => open(id)} aria-label={label} className="group relative min-h-20 overflow-hidden rounded-2xl border-0 bg-transparent p-0 text-left transition-all duration-300 hover:-translate-y-0.5 hover:brightness-125 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80">
        {image ? <img src={image} alt="" aria-hidden="true" className="block h-20 w-full rounded-2xl object-fill transition-transform duration-300 group-hover:scale-[1.015]" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 text-slate-200"><UserRound className="h-6 w-6" /><span className="text-[10px] font-black">ข้อมูลติดต่อ</span></span>}
      </button>)}
    </div>

    {activeTool && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" onMouseDown={(e) => e.target === e.currentTarget && setActiveTool(null)}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-cyan-400/40 bg-[#060D1E] p-5 shadow-[0_0_40px_rgba(0,210,255,0.25)] sm:p-7">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3"><h2 className="font-black text-white">{actions.find((item) => item.id === activeTool)?.label}</h2><button type="button" onClick={() => setActiveTool(null)} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="ปิด"><X className="h-5 w-5" /></button></div>
        {activeTool === 'wallet' && <WalletTopUpPanel role={role} userId={userId} userName={userName} />}
        {activeTool === 'payment' && <PaymentReceiverSettingsPanel role={role} userId={userId} defaultName={userName} audioEnabled={audioEnabled} onClose={() => setActiveTool(null)} />}
        {activeTool === 'contact' && <div className="space-y-4">{contactLoading ? <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">กำลังโหลดข้อมูล…</div> : contactData && <div className="grid gap-3 sm:grid-cols-2">
          {contactData.shopOrOrg && <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] text-slate-500">{role === 'merchant' ? 'ชื่อร้านค้า' : 'ชื่อองค์กร/หน่วยงาน'}</p><p className="mt-1 font-black text-white">{contactData.shopOrOrg}</p></div>}
          {contactData.contactPerson && <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] text-slate-500">ผู้ประสานงาน</p><p className="mt-1 font-black text-white">{contactData.contactPerson}</p></div>}
          {contactData.name && <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] text-slate-500">ชื่อบัญชี</p><p className="mt-1 font-black text-white">{contactData.name}</p></div>}
          {contactData.phone && <a href={`tel:${contactData.phone.replace(/\D/g, '')}`} className="rounded-2xl border border-white/10 bg-white/5 p-4"><Phone className="h-4 w-4 text-slate-300" /><p className="mt-1 text-[10px] text-slate-500">โทรศัพท์</p><p className="font-black text-white">{contactData.phone}</p></a>}
          {contactData.email && <a href={`mailto:${contactData.email}`} className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4"><Mail className="h-4 w-4 text-cyan-300" /><p className="mt-1 text-[10px] text-slate-500">อีเมล</p><p className="truncate font-black text-white">{contactData.email}</p></a>}
          {contactData.vehicle && <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] text-slate-500">ข้อมูลรถ</p><p className="mt-1 font-black text-white">{contactData.vehicle}</p></div>}
          {contactData.emergencyName && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"><p className="text-[10px] text-slate-500">ผู้ติดต่อฉุกเฉิน</p><p className="mt-1 font-black text-white">{contactData.emergencyName}</p>{contactData.emergencyPhone && <a href={`tel:${contactData.emergencyPhone.replace(/\D/g, '')}`} className="mt-1 block text-sm font-black text-amber-300">{contactData.emergencyPhone}</a>}</div>}
        </div>}</div>}
        {activeTool === 'assistant' && <WinAiAssistantPanel mode="personal_commerce" />}
        {activeTool === 'quests' && (questContent || <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">{questEmptyText}</div>)}
      </div>
    </div>}
  </>;
};
