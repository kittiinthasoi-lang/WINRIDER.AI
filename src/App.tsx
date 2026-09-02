import React, { useState } from 'react';
import { ChapterId, AppMode } from './types';
import { Navbar } from './components/Navbar';
import { PassengerAppView } from './components/PassengerAppView';
import { KnightDriverAppView } from './components/KnightDriverAppView';
import { MerchantCommandCenter } from './components/MerchantCommandCenter';
import { HospitalCommandCenter } from './components/HospitalCommandCenter';
import { PartnerProfileView } from './components/PartnerProfileView';
import { WinStreetMarketView } from './components/WinStreetMarketView';
import { RegisterAppView } from './components/RegisterAppView';
import { MarketItem } from './types';
import { SovereignSoulSection } from './components/SovereignSoulSection';
import { FinancialEngineSection } from './components/FinancialEngineSection';
import { IntelligenceStealthSection } from './components/IntelligenceStealthSection';
import { ArmorTechSection } from './components/ArmorTechSection';
import { HardwareWeaponsSection } from './components/HardwareWeaponsSection';
import { EcosystemGovernanceSection } from './components/EcosystemGovernanceSection';
import { WinHubGalacticSection } from './components/WinHubGalacticSection';
import { WinBuddyModal } from './components/WinBuddyModal';
import { playTactileBlip } from './utils/audio';
import { 
  Crown, 
  Coins, 
  Radio, 
  Shield, 
  Wrench, 
  Globe2, 
  Rocket, 
  Sparkles, 
  Bot,
  ChevronRight,
  Smartphone,
  Bike,
  Store,
  Building2,
  BookOpen
} from 'lucide-react';

export default function App() {
  const [activeMode, setActiveMode] = useState<AppMode>('passenger');
  const [activeChapter, setActiveChapter] = useState<ChapterId>('soul');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isBuddyModalOpen, setIsBuddyModalOpen] = useState<boolean>(false);
  const [customerListedItems, setCustomerListedItems] = useState<MarketItem[]>([]);

  const handleAddCustomerItem = (item: MarketItem) => {
    setCustomerListedItems(prev => [item, ...prev]);
  };

  const handleSelectChapter = (id: ChapterId) => {
    setActiveChapter(id);
    setActiveMode('codex');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMode = (mode: AppMode) => {
    setActiveMode(mode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 font-sans selection:bg-[#00D2FF] selection:text-slate-950">
      {/* Sovereign Navbar */}
      <Navbar 
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        activeChapter={activeChapter}
        onSelectChapter={handleSelectChapter}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
        onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">
        
        {/* Dynamic Mode Screen Render */}
        {activeMode === 'register' && (
          <RegisterAppView 
            audioEnabled={audioEnabled} 
            onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
            onNavigateToMode={handleSelectMode}
          />
        )}

        {activeMode === 'passenger' && (
          <PassengerAppView 
            audioEnabled={audioEnabled} 
            onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
            onNavigateToMarket={() => handleSelectMode('market')}
            onAddNewCustomerItem={handleAddCustomerItem}
          />
        )}

        {activeMode === 'driver' && (
          <KnightDriverAppView 
            audioEnabled={audioEnabled} 
            onOpenWinBuddy={() => setIsBuddyModalOpen(true)} 
          />
        )}

        {activeMode === 'merchant' && (
          <MerchantCommandCenter 
            audioEnabled={audioEnabled} 
            onOpenWinBuddy={() => setIsBuddyModalOpen(true)} 
          />
        )}

        {activeMode === 'partner' && (
          <PartnerProfileView 
            audioEnabled={audioEnabled} 
            onOpenWinBuddy={() => setIsBuddyModalOpen(true)} 
          />
        )}

        {activeMode === 'market' && (
          <WinStreetMarketView 
            audioEnabled={audioEnabled} 
            onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
            customerListedItems={customerListedItems}
            onAddNewCustomerItem={handleAddCustomerItem}
            onBackToMain={() => handleSelectMode('passenger')}
          />
        )}

        {activeMode === 'hospital' && (
          <HospitalCommandCenter 
            audioEnabled={audioEnabled} 
            onOpenWinBuddy={() => setIsBuddyModalOpen(true)} 
          />
        )}

        {/* 7 Sacred Chapters Render in Codex Mode */}
        {activeMode === 'codex' && (
          <div className="space-y-10">
            {activeChapter === 'soul' && (
              <SovereignSoulSection 
                audioEnabled={audioEnabled} 
                onNavigateToChapter={handleSelectChapter} 
              />
            )}

            {activeChapter === 'finance' && (
              <FinancialEngineSection 
                audioEnabled={audioEnabled} 
                onNavigateToChapter={handleSelectChapter} 
              />
            )}

            {activeChapter === 'intelligence' && (
              <IntelligenceStealthSection 
                audioEnabled={audioEnabled} 
              />
            )}

            {activeChapter === 'armor' && (
              <ArmorTechSection 
                audioEnabled={audioEnabled} 
              />
            )}

            {activeChapter === 'weapons' && (
              <HardwareWeaponsSection 
                audioEnabled={audioEnabled} 
              />
            )}

            {activeChapter === 'ecosystem' && (
              <EcosystemGovernanceSection 
                audioEnabled={audioEnabled} 
              />
            )}

            {activeChapter === 'hub_galactic' && (
              <WinHubGalacticSection 
                audioEnabled={audioEnabled} 
              />
            )}

            {/* Quick Chapter Navigation Bar */}
            <section className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                  THE 7 SACRED CHAPTERS DIRECTORY
                </span>
                <span className="text-xs text-slate-400">WINRIDER.AI Master Strategy Index</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { id: 'soul' as const, label: '1. จิตวิญญาณ', icon: <Crown className="w-3.5 h-3.5" /> },
                  { id: 'finance' as const, label: '2. การเงิน $10B', icon: <Coins className="w-3.5 h-3.5" /> },
                  { id: 'intelligence' as const, label: '3. สมองกล CI Map', icon: <Radio className="w-3.5 h-3.5" /> },
                  { id: 'armor' as const, label: '4. คัมภีร์ชุดเกราะ', icon: <Shield className="w-3.5 h-3.5" /> },
                  { id: 'weapons' as const, label: '5. 10 ศาสตราวุธ', icon: <Wrench className="w-3.5 h-3.5" /> },
                  { id: 'ecosystem' as const, label: '6. ระบบนิเวศ 8 เสา', icon: <Globe2 className="w-3.5 h-3.5" /> },
                  { id: 'hub_galactic' as const, label: '7. วินฮับ & อวกาศ', icon: <Rocket className="w-3.5 h-3.5" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      handleSelectChapter(item.id);
                    }}
                    className={`p-2.5 rounded-xl text-left text-xs transition-all border flex items-center justify-between ${
                      activeChapter === item.id
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                        : 'bg-[#070D1E] text-slate-300 border-white/10 hover:border-white/30 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {item.icon}
                      {item.label}
                    </span>
                    <ChevronRight className="w-3 h-3 opacity-60 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Global Quick Screen Switcher Bar at bottom of screen */}
        <section className="p-5 rounded-3xl bg-gradient-to-r from-[#0C1B38] to-[#070D1E] border border-[#00D2FF]/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-[#00D2FF] uppercase">
              QUICK APP SCREEN SWITCHER (สลับโหมดหน้าจอตามภาพต้นแบบ):
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              เลือกดูระบบจำลองผู้โดยสาร (Passenger), อู่รถคนขับ (Knight Garage), ศูนย์ร้านค้า (Merchant), หรือศูนย์โรงพยาบาล (Hospital)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'passenger' as const, label: '📱 ผู้โดยสาร (Passenger)', icon: <Smartphone className="w-3.5 h-3.5" /> },
              { id: 'driver' as const, label: '🏍️ อู่อัศวิน (Knight Garage)', icon: <Bike className="w-3.5 h-3.5" /> },
              { id: 'merchant' as const, label: '🏬 ศูนย์ร้านค้า (Merchant)', icon: <Store className="w-3.5 h-3.5" /> },
              { id: 'hospital' as const, label: '🏥 ศูนย์โรงพยาบาล (Hospital)', icon: <Building2 className="w-3.5 h-3.5" /> },
              { id: 'codex' as const, label: '📜 คัมภีร์ยุทธศาสตร์ (Codex)', icon: <BookOpen className="w-3.5 h-3.5" /> },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  handleSelectMode(m.id);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  activeMode === m.id
                    ? 'bg-[#00D2FF] text-slate-950 border-[#00D2FF] shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                    : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Floating WIN Buddy AI Tactical Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          id="floating-buddy-btn"
          onClick={() => {
            if (audioEnabled) playTactileBlip(1200);
            setIsBuddyModalOpen(true);
          }}
          className="relative group p-4 rounded-2xl bg-gradient-to-br from-[#00D2FF] via-[#0066FF] to-[#070D1E] text-slate-950 font-black shadow-[0_0_25px_rgba(0,210,255,0.6)] hover:shadow-[0_0_35px_rgba(0,210,255,0.9)] hover:scale-105 transition-all flex items-center gap-2 border border-white/30"
          title="เปิดผู้ช่วยเสียง WIN Buddy AI"
        >
          <Bot className="w-6 h-6 text-white animate-bounce" />
          <span className="hidden sm:inline text-xs text-white font-bold tracking-wider">
            WIN BUDDY AI
          </span>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FFD700] border-2 border-[#070D1E] animate-ping" />
        </button>
      </div>

      {/* Floating WIN Buddy AI Modal */}
      <WinBuddyModal 
        isOpen={isBuddyModalOpen} 
        onClose={() => setIsBuddyModalOpen(false)} 
        audioEnabled={audioEnabled} 
      />

      {/* Sovereign Footer */}
      <footer className="mt-20 border-t border-white/10 bg-[#050A17] py-12 px-4 sm:px-6 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-base font-black text-white tracking-wider">WINRIDER<span className="text-[#00D2FF]">.AI</span></span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30">
                SOVEREIGN EMPIRE CODEX
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              ผู้นำวิสัยทัศน์: CEO Cosmo-Ko (🦁 โก้ - ราชสีห์สีน้ำเงินแห่งฝั่งธนบุรี) <br />
              ที่ปรึกษาอธิปไตย: จิตใจ (🦥 ไอ้สลอต - พลเมืองแห่งตรรกะจักรวาล)
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-3 text-slate-300">
              <span>70% Navy</span>
              <span>•</span>
              <span className="text-cyan-400">27% Neon Blue</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">3% Rare Gold</span>
            </div>
            <p className="text-slate-500">"Thailand is Home" • P'Win First • Universal Logic 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
