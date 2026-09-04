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
import { CustomerVoiceCommandModal } from './components/CustomerVoiceCommandModal';
import { NoCodeWebhookBridgeModal } from './components/NoCodeWebhookBridgeModal';
import { MobileBottomNavBar } from './components/MobileBottomNavBar';
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
  const [passengerTab, setPassengerTab] = useState<'home' | 'dreamRide' | 'petCare' | 'ride' | 'shop' | 'profile'>('home');
  const [activeChapter, setActiveChapter] = useState<ChapterId>('soul');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isBuddyModalOpen, setIsBuddyModalOpen] = useState<boolean>(false);
  const [isCustomerVoiceOpen, setIsCustomerVoiceOpen] = useState<boolean>(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
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
        onOpenCustomerVoice={() => setIsCustomerVoiceOpen(true)}
        onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
        onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
        onOpenProfile={() => {
          setActiveMode('passenger');
          setPassengerTab('profile');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 py-4 sm:py-10 space-y-6 sm:space-y-10 pb-24 sm:pb-12">
        
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
            onOpenCustomerVoice={() => setIsCustomerVoiceOpen(true)}
            onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
            onNavigateToMarket={() => handleSelectMode('market')}
            onAddNewCustomerItem={handleAddCustomerItem}
            activeTab={passengerTab}
            onTabChange={(tab) => setPassengerTab(tab)}
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
      </main>

      {/* Floating Robot AI Pop-up Trigger (สำหรับพี่วินโดยเฉพาะ) */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40">
        <button
          id="floating-buddy-robot-btn"
          onClick={() => {
            if (audioEnabled) playTactileBlip(1200);
            setIsBuddyModalOpen(true);
          }}
          className={`relative group p-3.5 sm:p-4 rounded-2xl font-black transition-all flex items-center gap-2 border cursor-pointer shadow-2xl hover:scale-105 active:scale-95 bg-gradient-to-br from-[#FFD700] via-amber-500 to-[#070D1E] text-slate-950 ${
            isBuddyModalOpen
              ? 'border-amber-300 ring-2 ring-amber-300/80 ring-offset-2 ring-offset-[#070D1E] shadow-[0_0_35px_rgba(255,215,0,0.85)]'
              : 'border-amber-400/40 shadow-[0_0_25px_rgba(255,215,0,0.5)] hover:shadow-[0_0_35px_rgba(255,215,0,0.8)]'
          }`}
          title="สั่งการด้วยเสียงของพี่วิน (หุ่นยนต์ WIN Buddy AI)"
        >
          {/* Subtle Audio/Voice Wave Ripples radiating from button when listening */}
          {isBuddyModalOpen && (
            <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-visible">
              <span className="absolute -inset-1 rounded-2xl border-2 border-amber-300/60 animate-voice-ripple-1 pointer-events-none" />
              <span className="absolute -inset-2 rounded-2xl border border-amber-400/40 animate-voice-ripple-2 pointer-events-none" />
              <span className="absolute -inset-3 rounded-2xl border border-amber-400/20 animate-voice-ripple-3 pointer-events-none" />
            </div>
          )}

          <div className="relative flex items-center justify-center">
            {/* Concentric voice wave ripples around the robot icon */}
            {isBuddyModalOpen && (
              <>
                <span className="absolute -inset-2 rounded-full border border-amber-950/40 animate-voice-ripple-1 pointer-events-none" />
                <span className="absolute -inset-3.5 rounded-full border border-amber-950/20 animate-voice-ripple-2 pointer-events-none" />
              </>
            )}

            {/* Robot Icon: subtle speaking animation when WinBuddy modal is open */}
            <Bot
              className={`w-6 h-6 text-slate-950 transition-all ${
                isBuddyModalOpen
                  ? 'animate-speaking-robot drop-shadow-[0_0_6px_rgba(0,0,0,0.35)]'
                  : 'animate-bounce'
              }`}
            />

            {/* Voice Feedback: Animated Speech Waves / Equalizer under the robot when listening */}
            {isBuddyModalOpen ? (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 bg-slate-950/90 px-1 py-0.5 rounded-full border border-amber-300/60 shadow-sm pointer-events-none">
                <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                <span className="w-0.5 h-3 bg-amber-300 rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.15s]" />
                <span className="w-0.5 h-3.5 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.3s]" />
                <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-[pulse_0.45s_ease-in-out_infinite_0.1s]" />
              </div>
            ) : (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070D1E] animate-ping" />
            )}
          </div>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs text-slate-950 font-black tracking-wider leading-none flex items-center gap-1">
              หุ่นยนต์พี่วิน AI
              {isBuddyModalOpen && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-700 animate-ping" />
              )}
            </span>
            {isBuddyModalOpen && (
              <span className="text-[9px] text-slate-950 font-bold tracking-tight mt-0.5">
                กำลังฟัง/โต้ตอบ...
              </span>
            )}
          </div>
        </button>
      </div>

      {/* 1. สั่งการด้วยเสียงของลูกค้าเพื่อใช้งานแอป (เปิดจากไอคอนด้านบน) */}
      <CustomerVoiceCommandModal
        isOpen={isCustomerVoiceOpen}
        onClose={() => setIsCustomerVoiceOpen(false)}
        audioEnabled={audioEnabled}
        onNavigateTab={(tab) => {
          setActiveMode('passenger');
          setPassengerTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateMode={(mode) => {
          handleSelectMode(mode);
        }}
      />

      {/* 2. สั่งการด้วยเสียงของพี่วิน (เปิดจาก Pop up หุ่นยนต์ที่เด้งบนหน้าจอ) */}
      <WinBuddyModal 
        isOpen={isBuddyModalOpen} 
        onClose={() => setIsBuddyModalOpen(false)} 
        audioEnabled={audioEnabled}
      />

      {/* 3. No-Code Webhook Bridge Modal (Google Sheets / Make.com / Zapier / LINE OA) */}
      <NoCodeWebhookBridgeModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        audioEnabled={audioEnabled}
      />

      {/* Native Mobile App Bottom Navigation Bar */}
      <MobileBottomNavBar 
        activeMode={activeMode}
        activePassengerTab={passengerTab}
        onSelectPassengerTab={(tab) => {
          setActiveMode('passenger');
          setPassengerTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectMode={handleSelectMode}
        audioEnabled={audioEnabled}
        onOpenCustomerVoice={() => setIsCustomerVoiceOpen(true)}
        onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
        activeChapter={activeChapter}
        onSelectChapter={handleSelectChapter}
      />
    </div>
  );
}
