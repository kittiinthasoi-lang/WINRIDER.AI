import React, { useState, useEffect, useMemo } from 'react';
import { ChapterId, AppMode, MarketItem } from './types';
import { Navbar } from './components/Navbar';
import { PassengerAppView } from './components/PassengerAppView';
import { KnightDriverAppView, DriverTabType } from './components/KnightDriverAppView';
import { MerchantCommandCenter } from './components/MerchantCommandCenter';
import { HospitalCommandCenter } from './components/HospitalCommandCenter';
import { PartnerProfileView } from './components/PartnerProfileView';
import { WinShopHubView } from './components/WinShopHubView';
import { 
  UserSession,
  saveUserSession,
  isDriverAccount,
  isDriverInCitizenMode,
  switchDriverPersona
} from './utils/userSession';
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
import { PushNotificationManagerModal } from './components/PushNotificationManagerModal';
import { MobileBottomNavBar } from './components/MobileBottomNavBar';
import { playTactileBlip } from './utils/audio';
import { useAuth } from './context/AuthContext';
import { AuthModalOrView } from './components/auth/AuthModalOrView';
import { RoleSelectionAndRegistration } from './components/auth/RoleSelectionAndRegistration';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/admin/AdminRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { getAdminBootstrapStatus } from './services/adminService';
import { 
  Crown, 
  Coins, 
  Radio, 
  Shield, 
  Wrench, 
  Globe2, 
  Rocket, 
  ChevronRight,
  BookOpen,
  Loader2,
  Bike
} from 'lucide-react';

const CHAPTERS: { id: ChapterId; label: string; icon: React.ReactNode; num: string }[] = [
  { id: 'soul', label: 'จิตวิญญาณแห่งอธิปไตย', icon: <Crown className="w-4 h-4" />, num: '01' },
  { id: 'finance', label: 'เครื่องยนต์การเงิน 2 บาท', icon: <Coins className="w-4 h-4" />, num: '02' },
  { id: 'intelligence', label: 'ข่าวกรอง & แผนที่ CI', icon: <Radio className="w-4 h-4" />, num: '03' },
  { id: 'armor', label: 'เทคโนโลยีชุดเกราะ 70 ระดับ', icon: <Shield className="w-4 h-4" />, num: '04' },
  { id: 'weapons', label: '10 อาวุธยุทธวิธี', icon: <Wrench className="w-4 h-4" />, num: '05' },
  { id: 'ecosystem', label: 'ระบบนิเวศ & 8 เสาหลัก', icon: <Globe2 className="w-4 h-4" />, num: '06' },
  { id: 'hub_galactic', label: 'WinHub & แผนจักรวาล', icon: <Rocket className="w-4 h-4" />, num: '07' },
];

export default function App() {
  const { firebaseUser, userData, loading: authLoading, signOut } = useAuth();

  // Mode & Tabs
  const [activeMode, setActiveMode] = useState<AppMode>('passenger');
  const [selectedShopProfile, setSelectedShopProfile] = useState<{ id: string; role: 'merchant' | 'partner'; name: string; description: string; avatarUrl: string; avatarEmoji: string; address: string; phone: string; category: string; products: Array<Record<string, unknown>>; services: Array<Record<string, unknown>>; promotions: Array<Record<string, unknown>>; highlights: string[]; openHours?: string } | null>(null);
  const [passengerTab, setPassengerTab] = useState<'home' | 'dreamRide' | 'petCare' | 'ride' | 'shop' | 'profile' | 'navigation'>('home');
  const [driverTab, setDriverTab] = useState<DriverTabType>('jobs');
  const [activeChapter, setActiveChapter] = useState<ChapterId>('soul');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isBuddyModalOpen, setIsBuddyModalOpen] = useState<boolean>(false);
  const [isCustomerVoiceOpen, setIsCustomerVoiceOpen] = useState<boolean>(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [customerListedItems, setCustomerListedItems] = useState<MarketItem[]>([]);
  const [driverCitizenPersona, setDriverCitizenPersona] = useState<'driver' | 'customer'>('driver');
  const [ownerPersona, setOwnerPersona] = useState<'customer' | 'driver' | 'merchant' | 'partner'>('driver');
  const [adminBootstrapOpen, setAdminBootstrapOpen] = useState(false);

  // บัญชีเจ้าของระบบหนึ่งบัญชีสามารถเปิดได้ครบทั้ง 5 บทบาท
  // (ลูกค้า พี่วิน ร้านค้า พาร์ทเนอร์ และ Super Admin)
  // โดยใช้ Firebase UID เดียวเสมอ ไม่สร้างบัญชีผู้ใช้จำลองเพิ่ม
  const isOwnerAdmin = Boolean(
    firebaseUser &&
    userData?.isAdmin === true &&
    userData?.adminLevel === 'super'
  );

  // Convert Firebase profile data to a local UI UserSession
  const currentUserSession: UserSession | null = useMemo(() => {
    if (isOwnerAdmin && firebaseUser) {
      const mappedRole = ownerPersona;
      const roleTitle = mappedRole === 'driver' ? 'บัญชีเจ้าของ • อัศวินไรเดอร์'
        : mappedRole === 'customer' ? 'บัญชีเจ้าของ • พลเมืองอัศวิน'
        : mappedRole === 'merchant' ? 'บัญชีเจ้าของ • ร้านค้าพันธมิตร'
        : 'บัญชีเจ้าของ • องค์กรพาร์ทเนอร์';
      const avatar = mappedRole === 'driver' ? '🏍️'
        : mappedRole === 'customer' ? '🛡️'
        : mappedRole === 'merchant' ? '🏪'
        : '🏢';

      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: userData?.displayName || firebaseUser.displayName || 'เจ้าของระบบ',
        phone: userData?.phone || '',
        role: mappedRole,
        primaryRole: mappedRole,
        activePersona: mappedRole === 'driver' ? driverCitizenPersona : 'customer',
        roleTitleTh: roleTitle,
        level: 100,
        xp: userData?.xp ?? 0,
        rating: userData?.rating ?? 5,
        avatarEmoji: userData?.avatarEmoji || avatar,
        avatarUrl: userData?.avatarUrl || firebaseUser.photoURL || undefined,
        bio: userData?.bioStatus || undefined,
        registeredAt: userData?.createdAt || firebaseUser.metadata.creationTime || new Date().toISOString(),
      };
    }

    if (!userData || !userData.role) return null;

    const registeredRole = userData.role === 'knight' ? 'driver' 
      : userData.role === 'citizen' ? 'customer'
      : userData.role === 'merchant' ? 'merchant' 
      : 'partner';

    const mappedRole = isOwnerAdmin ? ownerPersona : registeredRole;

    const roleTitle = mappedRole === 'driver' ? 'บัญชีเจ้าของ • อัศวินไรเดอร์'
      : mappedRole === 'customer' ? 'บัญชีเจ้าของ • พลเมืองอัศวิน'
      : mappedRole === 'merchant' ? 'บัญชีเจ้าของ • ร้านค้าพันธมิตร'
      : 'บัญชีเจ้าของ • องค์กรพาร์ทเนอร์';

    const avatar = mappedRole === 'driver' ? '🏍️'
      : mappedRole === 'customer' ? '🛡️'
      : mappedRole === 'merchant' ? '🏪'
      : '🏢';

    return {
      id: userData.uid,
      email: userData.email,
      name: isOwnerAdmin ? 'กิตติ อินทะสร้อย' : (userData.displayName || 'อัศวินผู้กล้า'),
      phone: userData.phone || '',
      role: mappedRole,
      primaryRole: mappedRole,
      activePersona: mappedRole === 'driver' ? driverCitizenPersona : 'customer',
      roleTitleTh: roleTitle,
      level: isOwnerAdmin ? 100 : (userData.level !== undefined ? userData.level : 1),
      xp: userData.xp !== undefined ? userData.xp : 0,
      rating: userData.rating !== undefined ? userData.rating : 5.0,
      avatarEmoji: userData.avatarEmoji || avatar,
      avatarUrl: userData.avatarUrl || undefined,
      bio: userData.bioStatus || undefined,
      registeredAt: userData.createdAt || new Date().toISOString(),
    };
  }, [firebaseUser, userData, driverCitizenPersona, isOwnerAdmin, ownerPersona]);

  useEffect(() => {
    if (currentUserSession) void saveUserSession(currentUserSession);
  }, [currentUserSession]);

  const isSuperAdminUser = isOwnerAdmin;

  useEffect(() => {
    let active = true;
    if (!firebaseUser || !userData?.uid || userData?.isAdmin === true) {
      setAdminBootstrapOpen(false);
      return;
    }

    getAdminBootstrapStatus()
      .then((state) => {
        if (active) setAdminBootstrapOpen(state.bootstrapOpen === true);
      })
      .catch(() => {
        if (active) setAdminBootstrapOpen(false);
      });

    return () => {
      active = false;
    };
  }, [firebaseUser?.uid, userData?.uid, userData?.isAdmin]);

  // Set default active mode according to registered role or super admin
  useEffect(() => {
    if (isOwnerAdmin) {
      setOwnerPersona('driver');
      setDriverCitizenPersona('driver');
      // บัญชีเจ้าของเข้าศูนย์ควบคุมโดยตรง ไม่ต้องสร้างทะเบียนผู้ใช้งานใหม่
      setActiveMode('admin');
      return;
    }
    if (userData?.role) {
      if (userData.role === 'knight') setActiveMode('driver');
      else if (userData.role === 'citizen') setActiveMode('passenger');
      else if (userData.role === 'merchant') setActiveMode('merchant');
      else if (userData.role === 'partner') setActiveMode('partner');
    }
  }, [userData?.role, userData?.uid, firebaseUser?.email, userData?.isAdmin, isOwnerAdmin]);

  const handleAddCustomerItem = (item: MarketItem) => {
    setCustomerListedItems(prev => [item, ...prev]);
  };

  const handleOpenRideBooking = () => {
    setActiveMode('passenger');
    setPassengerTab('ride');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRideToDestination = (name: string, address?: string, distanceKm?: number) => {
    setActiveMode('passenger');
    setPassengerTab('ride');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('winrider:set_destination', {
        detail: { name, address, distanceKm: typeof distanceKm === 'number' ? distanceKm : undefined }
      }));
    }, 150);
  };

  const handleSelectChapter = (id: ChapterId) => {
    setActiveChapter(id);
    setActiveMode('codex');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleDriverPersona = (targetPersona?: 'driver' | 'customer') => {
    if (!currentUserSession) return;
    if (isOwnerAdmin) {
      const newPersona = targetPersona || (ownerPersona === 'driver' ? 'customer' : 'driver');
      setOwnerPersona(newPersona);
      setDriverCitizenPersona(newPersona);
      setActiveMode(newPersona === 'customer' ? 'passenger' : 'driver');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (userData?.role !== 'knight') return;
    const newPersona = targetPersona || (driverCitizenPersona === 'driver' ? 'customer' : 'driver');
    setDriverCitizenPersona(newPersona);
    if (newPersona === 'customer') {
      setActiveMode('passenger');
    } else {
      setActiveMode('driver');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMode = (mode: AppMode) => {
    if (isOwnerAdmin) {
      if (mode === 'passenger' || mode === 'market') setOwnerPersona('customer');
      else if (mode === 'driver') setOwnerPersona('driver');
      setActiveMode(mode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (mode === 'admin') {
      setActiveMode('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!currentUserSession) {
      setActiveMode(mode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const isDriver = userData?.role === 'knight';

    if (isDriver) {
      if (mode === 'passenger') {
        setDriverCitizenPersona('customer');
        setActiveMode('passenger');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (mode === 'driver') {
        setDriverCitizenPersona('driver');
        setActiveMode('driver');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (!isDriver && mode === 'driver') {
      alert("🔒 ระบบความปลอดภัย Role-Locked: พลเมืองไม่สามารถเปลี่ยนบทบาทเป็นพี่วินได้ (สงวนสิทธิ์เฉพาะพี่วินที่ผ่านการตรวจสอบประวัติและมีใบอนุญาตขับขี่สาธารณะ)");
      return;
    }

    setActiveMode(mode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectOwnerPersona = (persona: 'customer' | 'driver' | 'merchant' | 'partner') => {
    if (!isOwnerAdmin) return;
    setOwnerPersona(persona);
    setDriverCitizenPersona(persona === 'driver' ? 'driver' : 'customer');
    setActiveMode(
      persona === 'customer' ? 'passenger' :
      persona === 'driver' ? 'driver' :
      persona
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitAdmin = () => {
    if (isOwnerAdmin) {
      setActiveMode(
        ownerPersona === 'customer' ? 'passenger' :
        ownerPersona === 'driver' ? 'driver' :
        ownerPersona
      );
      return;
    }
    if (userData?.role === 'knight') setActiveMode('driver');
    else if (userData?.role === 'merchant') setActiveMode('merchant');
    else if (userData?.role === 'partner') setActiveMode('partner');
    else setActiveMode('passenger');
  };

  const handleSignOut = async () => {
    playTactileBlip(700);
    await signOut();
  };

  // 1. Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070D1E] flex flex-col items-center justify-center gap-4 text-slate-100 font-sans">
        <div className="p-4 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] shadow-[0_0_25px_rgba(0,212,255,0.3)] animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
        <div className="text-sm font-bold tracking-wider text-slate-200">
          WINRIDER.AI กำลังเชื่อมต่อระบบความปลอดภัยอธิปไตย...
        </div>
      </div>
    );
  }

  // 2. Not logged in to Firebase -> Show Google & Email login
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#070D1E] text-slate-100 font-sans flex flex-col">
        <Navbar
          activeMode="passenger"
          onSelectMode={() => {}}
          activeChapter={activeChapter}
          onSelectChapter={handleSelectChapter}
          audioEnabled={audioEnabled}
          onToggleAudio={() => setAudioEnabled(prev => !prev)}
          onOpenCustomerVoice={() => setIsCustomerVoiceOpen(true)}
          onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
          onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
          currentUserSession={null}
          onSignOut={() => {}}
          onToggleDriverPersona={() => {}}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <AuthModalOrView />
        </main>
      </div>
    );
  }

  // 3. Logged in, but hasn't selected role yet -> Show 4-card role selection & registration
  if ((!userData || !userData.role) && !isOwnerAdmin && activeMode !== 'admin') {
    return (
      <div className="min-h-screen bg-[#070D1E] text-slate-100 font-sans flex flex-col">
        {/* Super Admin Floating / Header Bar */}
        {isSuperAdminUser && (
          <div className="bg-gradient-to-r from-amber-500/25 via-amber-600/30 to-amber-500/25 border-b border-amber-400/50 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
              <span className="font-bold">ระบบตรวจพบสิทธิ์ผู้ดูแลระบบสูงสุด (SUPER ADMIN):</span>
              <span className="text-white font-mono bg-black/40 px-2 py-0.5 rounded border border-amber-400/40">
                {firebaseUser?.email || currentUserSession?.email || 'Super Admin'}
              </span>
            </div>
            <button
              type="button"
              id="role-selection-admin-btn"
              onClick={() => {
                playTactileBlip(1000);
                setActiveMode('admin');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(255,201,60,0.5)] cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-slate-950" />
              <span>👑 เปิดหน้าจอคุมระบบ ADMIN CONSOLE</span>
            </button>
          </div>
        )}
        <Navbar
          activeMode={activeMode}
          onSelectMode={handleSelectMode}
          activeChapter={activeChapter}
          onSelectChapter={handleSelectChapter}
          audioEnabled={audioEnabled}
          onToggleAudio={() => setAudioEnabled(prev => !prev)}
          onOpenCustomerVoice={() => setIsCustomerVoiceOpen(true)}
          onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
          onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
          currentUserSession={currentUserSession}
          onSignOut={handleSignOut}
          onToggleDriverPersona={() => {}}
        />
        <main className="flex-1">
          <RoleSelectionAndRegistration />
        </main>
      </div>
    );
  }

  // 4. Active User Dashboard / Admin View
  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans pb-24 md:pb-0">
      {/* Sovereign Navigation Bar */}
      <Navbar
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        activeChapter={activeChapter}
        onSelectChapter={handleSelectChapter}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(prev => !prev)}
        onOpenCustomerVoice={() => setIsCustomerVoiceOpen(true)}
        onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
        onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
        onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
        currentUserSession={currentUserSession}
        onSignOut={handleSignOut}
        onToggleDriverPersona={handleToggleDriverPersona}
        onSelectOwnerPersona={isOwnerAdmin ? handleSelectOwnerPersona : undefined}
      />

      {/* Main Viewport Content with ProtectedRoute */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4">
        {activeMode === 'passenger' && (
          <ProtectedRoute 
            allowedRoles={['citizen', 'knight', 'merchant', 'partner']}
            onRedirectToMyDashboard={(r) => {
              if (r === 'knight') setActiveMode('driver');
              else if (r === 'merchant') setActiveMode('merchant');
              else if (r === 'partner') setActiveMode('partner');
            }}
          >
            <PassengerAppView
              audioEnabled={audioEnabled}
              onOpenCustomerVoice={() => setIsCustomerVoiceOpen(true)}
              onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
              onOpenEmergencyCenter={() => {
                if (audioEnabled) playTactileBlip(500);
                setActiveMode('hospital');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigateToMarket={() => setActiveMode('market')}
              onAddNewCustomerItem={handleAddCustomerItem}
              activeTab={passengerTab}
              onTabChange={setPassengerTab}
              currentUserSession={currentUserSession}
              onToggleDriverPersona={handleToggleDriverPersona}
            />
          </ProtectedRoute>
        )}

        {activeMode === 'driver' && (
          <ProtectedRoute 
            allowedRoles={['knight']}
            onRedirectToMyDashboard={(r) => {
              if (r === 'citizen') setActiveMode('passenger');
              else if (r === 'merchant') setActiveMode('merchant');
              else if (r === 'partner') setActiveMode('partner');
            }}
          >
            <KnightDriverAppView
              audioEnabled={audioEnabled}
              onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
              activeDriverTab={driverTab}
              onSelectDriverTab={setDriverTab}
              currentUserSession={currentUserSession}
              onToggleDriverPersona={handleToggleDriverPersona}
            />
          </ProtectedRoute>
        )}

        {activeMode === 'merchant' && (
          <ProtectedRoute 
            allowedRoles={['merchant']}
            allowCustomerView={selectedShopProfile?.role === 'merchant'}
            onRedirectToMyDashboard={(r) => {
              if (r === 'knight') setActiveMode('driver');
              else if (r === 'citizen') setActiveMode('passenger');
              else if (r === 'partner') setActiveMode('partner');
            }}
          >
            <MerchantCommandCenter
              customerProfile={selectedShopProfile?.role === 'merchant' ? selectedShopProfile : undefined}
              audioEnabled={audioEnabled}
              onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
              onRideToStore={handleRideToDestination}
              initialPerspective={ownerPersona === 'merchant' ? 'owner' : 'customer'}
              canEdit={ownerPersona === 'merchant'}
            />
          </ProtectedRoute>
        )}

        {activeMode === 'partner' && (
          <ProtectedRoute 
            allowedRoles={['partner']}
            allowCustomerView={selectedShopProfile?.role === 'partner'}
            onRedirectToMyDashboard={(r) => {
              if (r === 'knight') setActiveMode('driver');
              else if (r === 'citizen') setActiveMode('passenger');
              else if (r === 'merchant') setActiveMode('merchant');
            }}
          >
            <PartnerProfileView
              customerProfile={selectedShopProfile?.role === 'partner' ? selectedShopProfile : undefined}
              audioEnabled={audioEnabled}
              onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
              onRideToPartner={handleRideToDestination}
              initialPerspective={ownerPersona === 'partner' ? 'owner' : 'customer'}
              canEdit={ownerPersona === 'partner'}
            />
          </ProtectedRoute>
        )}

        {activeMode === 'hospital' && (
          <ProtectedRoute 
            allowedRoles={['citizen', 'knight', 'merchant', 'partner']}
            onRedirectToMyDashboard={(role) => {
              if (role === 'knight') setActiveMode('driver');
              else if (role === 'merchant') setActiveMode('merchant');
              else if (role === 'partner') setActiveMode('partner');
              else setActiveMode('passenger');
            }}
          >
            <HospitalCommandCenter
              audioEnabled={audioEnabled}
              onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
              onRideToDestination={handleRideToDestination}
            />
          </ProtectedRoute>
        )}

        {activeMode === 'market' && (
          <WinShopHubView
            audioEnabled={audioEnabled}
            customerListedItems={customerListedItems}
            onAddNewCustomerItem={handleAddCustomerItem}
            onBackToMain={() => setActiveMode('passenger')}
            onOpenBusinessProfile={(profile) => {
              setSelectedShopProfile(profile);
              setActiveMode(profile.role === 'merchant' ? 'merchant' : 'partner');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRideToDestination={handleRideToDestination}
          />
        )}

        {activeMode === 'codex' && (
          <div className="space-y-6">
            {/* Codex Chapter Switcher Bar */}
            <div className="bg-[#0A1633]/90 backdrop-blur-md p-2 rounded-2xl border border-[#00D2FF]/20 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-lg">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#00D2FF] whitespace-nowrap">
                <BookOpen className="w-4 h-4" />
                <span>EMPIRE CODEX</span>
              </div>
              {CHAPTERS.map((chap) => {
                const isActive = activeChapter === chap.id;
                return (
                  <button
                    key={chap.id}
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      setActiveChapter(chap.id);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#00D2FF] text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {chap.icon}
                    <span>{chap.num}. {chap.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>

            {/* Chapter Section View */}
            <div className="transition-all duration-300">
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
                <IntelligenceStealthSection audioEnabled={audioEnabled} />
              )}
              {activeChapter === 'armor' && (
                <ArmorTechSection audioEnabled={audioEnabled} />
              )}
              {activeChapter === 'weapons' && (
                <HardwareWeaponsSection audioEnabled={audioEnabled} />
              )}
              {activeChapter === 'ecosystem' && (
                <EcosystemGovernanceSection audioEnabled={audioEnabled} onOpenMarket={() => { setActiveMode('market'); setPassengerTab('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              )}
              {activeChapter === 'hub_galactic' && (
                <WinHubGalacticSection audioEnabled={audioEnabled} />
              )}
            </div>
          </div>
        )}

        {activeMode === 'admin' && (
          <AdminRoute
            isOwnerAdmin={isOwnerAdmin}
            onRedirectHome={handleExitAdmin}
          >
            {(claims) => (
              <AdminLayout
                adminLevel={isOwnerAdmin ? 'super' : claims.adminLevel}
                adminEmail={firebaseUser?.email || currentUserSession?.email || 'Admin'}
                onExitAdmin={handleExitAdmin}
                onSelectOwnerPersona={handleSelectOwnerPersona}
              />
            )}
          </AdminRoute>
        )}
      </main>

      {adminBootstrapOpen && activeMode !== 'admin' && (
        <button
          type="button"
          onClick={() => {
            playTactileBlip(1000);
            setActiveMode('admin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed top-20 right-3 z-[60] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_12px_35px_rgba(245,158,11,0.35)] active:scale-95"
        >
          👑 ตั้งค่า Super Admin คนแรกด้วย UID
        </button>
      )}

      {/* Sovereign Mobile Bottom Navigation Bar */}
      <MobileBottomNavBar
        activeMode={activeMode}
        activePassengerTab={passengerTab}
        onSelectPassengerTab={(tab) => {
          setPassengerTab(tab);
          if (activeMode !== 'passenger') setActiveMode('passenger');
        }}
        activeDriverTab={driverTab}
        onSelectDriverTab={(tab) => {
          setDriverTab(tab);
          if (activeMode !== 'driver') setActiveMode('driver');
        }}
        onSelectMode={handleSelectMode}
        audioEnabled={audioEnabled}
        onOpenCustomerVoice={() => setIsCustomerVoiceOpen(true)}
        onOpenWinBuddy={() => setIsBuddyModalOpen(true)}
        activeChapter={activeChapter}
        onSelectChapter={handleSelectChapter}
        currentUserSession={currentUserSession}
        onSignOut={handleSignOut}
        onToggleDriverPersona={handleToggleDriverPersona}
      />

      {currentUserSession && activeMode !== 'admin' && !(activeMode === 'passenger' && passengerTab === 'ride') && (
        <button
          type="button"
          onClick={() => {
            if (audioEnabled) playTactileBlip(900);
            handleOpenRideBooking();
          }}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_12px_35px_rgba(0,210,255,0.35)] transition-transform active:scale-95 md:bottom-6 md:right-6"
          aria-label="เปิดบริการเรียกพี่วิน"
          title="เรียกพี่วินได้จากทุกบริการ"
        >
          <Bike className="h-4 w-4" />
          <span>เรียกพี่วิน</span>
        </button>
      )}

      {/* Global Modals */}
      <WinBuddyModal
        isOpen={isBuddyModalOpen}
        onClose={() => setIsBuddyModalOpen(false)}
        audioEnabled={audioEnabled}
      />

      <CustomerVoiceCommandModal
        isOpen={isCustomerVoiceOpen}
        onClose={() => setIsCustomerVoiceOpen(false)}
        audioEnabled={audioEnabled}
        onNavigateTab={(tab) => {
          setActiveMode('passenger');
          setPassengerTab(tab);
        }}
        onNavigateMode={(mode) => setActiveMode(mode)}
      />

      <NoCodeWebhookBridgeModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        audioEnabled={audioEnabled}
      />

      <PushNotificationManagerModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </div>
  );
}
