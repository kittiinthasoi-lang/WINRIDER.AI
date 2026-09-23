import React, { useEffect, useState, useMemo } from 'react';
import { WIN_IMAGES } from '../data/imageRegistry';
import { auth, db } from '../firebase';
import { emitQuestMetric } from '../services/questService';
import { createSosIncident } from '../services/sosIncidentService';
import { WIN_SHOP_ITEMS, WinShopItem } from '../data/winShopItems';
import { DREAM_RIDES_FLEET } from '../data/dreamRidesData';
import { AMENITIES_CATALOG, calculateAmenitiesSummary, isHelmetAmenity } from '../data/amenitiesData';
import { DreamRideFleetView } from './DreamRideFleetView';
import { DreamRideVehicle, MatchedDriver, LifestylePlace } from '../types';
import { NeonProfileAvatar } from './NeonProfileAvatar';
import { SovereignTiersModal } from './SovereignTiersModal';
import { ThreeDimensionalRideMap } from './ThreeDimensionalRideMap';
import { PetCareHospitalSection } from './PetCareHospitalSection';
import { DensityRadarOverlay } from './DensityRadarOverlay';
import { WinAlertEventsCard } from './WinAlertEventsCard';
import { PublicDataDiscoveryCard } from './PublicDataDiscoveryCard';
import { PetHospitalClinic } from '../data/petHospitalData';
import { getCitizenTier, CITIZEN_10_TIERS, calculateLevelMaxXp, getLevelDifficultyMetrics } from '../data/tierHierarchyData';
import { DriverMatchingModal } from './DriverMatchingModal';
import { VoiceAssistantModal } from './VoiceAssistantModal';
import { SovereignQuestCenter } from './SovereignQuestCenter';
import { LIFESTYLE_PLACES } from '../data/lifestyleData';
import { REAL_BANGKOK_LOCATIONS, RealBangkokLocation } from '../data/realBangkokLocations';
import { POPULAR_BANGKOK_DESTINATIONS } from '../services/googleRoutesService';
import { BANGKOK_TRANSIT_STATIONS } from '../data/transitData';
import { playTactileBlip, playRadarScan, playEngineRev, playLevelUpFanfare, speakThaiText } from '../utils/audio';
import { AIProductPhotoVerifier, AIVerificationResult } from './AIProductPhotoVerifier';
import { SpecializedServicePreMatchingModal, SpecializedPreMatchingData } from './SpecializedServicePreMatchingModal';
import { ServicePhotoVerificationModal } from './ServicePhotoVerificationModal';
import { CustomerPaymentQrCodeModal } from './CustomerPaymentQrCodeModal';
import { createLiveOrder, cancelLiveOrder, subscribeToLiveOrders, getOrdersForPassenger, fetchFirestoreOrdersForUser, fetchMyPassengerOrders, getAuthHeaders, LiveRideOrder } from '../utils/dispatchSync';
import { TripSummaryReceiptModal } from './TripSummaryReceiptModal';
import { PromptPayPaymentModal } from './PromptPayPaymentModal';
import { InRideDirectChatModal } from './InRideDirectChatModal';
import { RealGpsMapModal } from './RealGpsMapModal';
import { PersonalNavigationScreen } from './PersonalNavigationScreen';
import { ProfileCustomizerModal, ProfileCustomizationData } from './ProfileCustomizerModal';
import { loadProfileCustomization } from '../services/profileService';
import { calculateAppFare } from '../core/serverFare';
import { ReligiousNotificationsModal } from './ReligiousNotificationsModal';
import { ProfileQuickActions } from './ProfileQuickActions';
import { CyberGraphic, DreamRideVehicleImage } from './CyberGraphic';
import { UserSession, isDriverAccount, isDriverInCitizenMode } from '../utils/userSession';
import confetti from 'canvas-confetti';
import { 
  Shield, 
  ShieldCheck,
  MapPin, 
  Search, 
  Dog, 
  Zap, 
  Sparkles, 
  Coffee, 
  Heart, 
  Users, 
  Share2, 
  AlertTriangle, 
  Phone, 
  MessageSquare, 
  Camera, 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  ChevronRight, 
  Flame, 
  Plus, 
  Layers, 
  Compass, 
  ShieldAlert, 
  Radio,
  Activity,
  Bike,
  Star,
  Volume2,
  VolumeX,
  Volume1,
  Bot,
  Play,
  ArrowRight,
  Headphones,
  Check,
  Sliders,
  Gauge,
  Info,
  CreditCard,
  TrendingUp,
  QrCode,
  Coins,
  Award,
  Mic,
  Package,
  UserCheck,
  User
} from 'lucide-react';

// 8 Core Services Color Palette Themes for Neon Contrast on Deep Navy
export interface ServiceThemeInfo {
  id: string;
  name: string;
  colorTitle: string; // e.g. 'Knight-Silver'
  colorName: string;  // e.g. 'Silver'
  hex: string;        // e.g. '#E2E8F0'
  glowRgba: string;   // e.g. 'rgba(226, 232, 240, 0.7)'
  darkRgba: string;   // e.g. 'rgba(226, 232, 240, 0.15)'
  accentTextClass: string;
  accentBorderClass: string;
  accentBgClass: string;
}

export const SERVICE_THEMES: Record<string, ServiceThemeInfo> = {
  knight: {
    id: 'knight',
    name: 'WIN KNIGHT',
    colorTitle: 'Knight-NeonBlue',
    colorName: 'Neon Blue',
    hex: '#00D2FF',
    glowRgba: 'rgba(0, 210, 255, 0.8)',
    darkRgba: 'rgba(0, 210, 255, 0.18)',
    accentTextClass: 'text-cyan-400',
    accentBorderClass: 'border-[#00D2FF]',
    accentBgClass: 'bg-[#00D2FF] text-slate-950',
  },
  express: {
    id: 'express',
    name: 'WIN Express',
    colorTitle: 'Express-Orange',
    colorName: 'Orange',
    hex: '#FF6B00',
    glowRgba: 'rgba(255, 107, 0, 0.8)',
    darkRgba: 'rgba(255, 107, 0, 0.18)',
    accentTextClass: 'text-orange-400',
    accentBorderClass: 'border-[#FF6B00]',
    accentBgClass: 'bg-[#FF6B00] text-slate-950',
  },
  pet: {
    id: 'pet',
    name: 'WIN-Pet Care',
    colorTitle: 'Pet-Green',
    colorName: 'Green',
    hex: '#10B981',
    glowRgba: 'rgba(16, 185, 129, 0.8)',
    darkRgba: 'rgba(16, 185, 129, 0.18)',
    accentTextClass: 'text-emerald-400',
    accentBorderClass: 'border-[#10B981]',
    accentBgClass: 'bg-[#10B981] text-slate-950',
  },
  mu: {
    id: 'mu',
    name: 'WIN MU BUDDY',
    colorTitle: 'MU-Purple',
    colorName: 'Purple',
    hex: '#A855F7',
    glowRgba: 'rgba(168, 85, 247, 0.8)',
    darkRgba: 'rgba(168, 85, 247, 0.18)',
    accentTextClass: 'text-purple-400',
    accentBorderClass: 'border-[#A855F7]',
    accentBgClass: 'bg-[#A855F7] text-slate-950',
  },
  lifestyle: {
    id: 'lifestyle',
    name: 'WIN Lifestyle',
    colorTitle: 'Lifestyle-Pink',
    colorName: 'Pink',
    hex: '#EC4899',
    glowRgba: 'rgba(236, 72, 153, 0.8)',
    darkRgba: 'rgba(236, 72, 153, 0.18)',
    accentTextClass: 'text-pink-400',
    accentBorderClass: 'border-[#EC4899]',
    accentBgClass: 'bg-[#EC4899] text-slate-950',
  },
  spirit: {
    id: 'spirit',
    name: 'WIN Spirit',
    colorTitle: 'Spirit-Yellow',
    colorName: 'Yellow',
    hex: '#FACC15',
    glowRgba: 'rgba(250, 204, 21, 0.8)',
    darkRgba: 'rgba(250, 204, 21, 0.18)',
    accentTextClass: 'text-yellow-400',
    accentBorderClass: 'border-[#FACC15]',
    accentBgClass: 'bg-[#FACC15] text-slate-950',
  },
  family: {
    id: 'family',
    name: 'WIN Family',
    colorTitle: 'Family-SkyBlue',
    colorName: 'SkyBlue',
    hex: '#38BDF8',
    glowRgba: 'rgba(56, 189, 248, 0.8)',
    darkRgba: 'rgba(56, 189, 248, 0.18)',
    accentTextClass: 'text-sky-400',
    accentBorderClass: 'border-[#38BDF8]',
    accentBgClass: 'bg-[#38BDF8] text-slate-950',
  },
  link: {
    id: 'link',
    name: 'WIN Link',
    colorTitle: 'Link-Lime',
    colorName: 'Lime',
    hex: '#84CC16',
    glowRgba: 'rgba(132, 204, 22, 0.8)',
    darkRgba: 'rgba(132, 204, 22, 0.18)',
    accentTextClass: 'text-lime-400',
    accentBorderClass: 'border-[#84CC16]',
    accentBgClass: 'bg-[#84CC16] text-slate-950',
  }
};

interface PassengerAppViewProps {
  audioEnabled: boolean;
  onOpenCustomerVoice?: () => void;
  onOpenWinBuddy?: () => void;
  onOpenEmergencyCenter?: () => void;
  onNavigateToMarket?: () => void;
  onAddNewCustomerItem?: (item: any) => void;
  activeTab?: 'home' | 'dreamRide' | 'petCare' | 'ride' | 'shop' | 'profile' | 'navigation';
  onTabChange?: (tab: 'home' | 'dreamRide' | 'petCare' | 'ride' | 'shop' | 'profile' | 'navigation') => void;
  currentUserSession?: UserSession | null;
  onToggleDriverPersona?: (targetPersona: 'driver' | 'customer') => void;
}

export const PassengerAppView: React.FC<PassengerAppViewProps> = ({ 
  audioEnabled, 
  onOpenCustomerVoice,
  onOpenWinBuddy,
  onOpenEmergencyCenter,
  onNavigateToMarket,
  onAddNewCustomerItem,
  activeTab: propActiveTab,
  onTabChange,
  currentUserSession,
  onToggleDriverPersona,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'home' | 'dreamRide' | 'petCare' | 'ride' | 'shop' | 'profile'>('home');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = (tab: 'home' | 'dreamRide' | 'petCare' | 'ride' | 'shop' | 'profile') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [selectedPetHospital, setSelectedPetHospital] = useState<PetHospitalClinic | null>(null);
  const [selectedPetType, setSelectedPetType] = useState<'dog' | 'cat' | 'exotic'>('dog');
  const [selectedDreamRide, setSelectedDreamRide] = useState<DreamRideVehicle>(DREAM_RIDES_FLEET[0]);
  const [userExplicitlyChoseVehicle, setUserExplicitlyChoseVehicle] = useState<boolean>(false);
  const [customerGender, setCustomerGender] = useState<'female' | 'male'>('female');
  const [selectedExperienceMode, setSelectedExperienceMode] = useState<string>(DREAM_RIDES_FLEET[0].experienceModes[0]);
  const [customAmenities, setCustomAmenities] = useState<string>('หมวกกันน็อก Smart HUD');
  const [amenityCategoryFilter, setAmenityCategoryFilter] = useState<'all' | 'safety' | 'care' | 'tech' | 'comfort' | 'special'>('all');
  const [isChangingRideInModal, setIsChangingRideInModal] = useState<boolean>(false);
  const [shopSubTab, setShopSubTab] = useState<'official' | 'c2c'>('official');
  const [shopCategory, setShopCategory] = useState<string>('All');
  const [shopSearchTerm, setShopSearchTerm] = useState<string>('');
  const [selectedShopItem, setSelectedShopItem] = useState<WinShopItem | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>('WIN KNIGHT');
  const [activeServiceId, setActiveServiceId] = useState<string>('knight');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDriverMatchingModal, setShowDriverMatchingModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showCustomerRadarModal, setShowCustomerRadarModal] = useState(false);
  const [showFundDetails, setShowFundDetails] = useState(true);
  const [, setBookingConfirmed] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [tripDistanceKm, setTripDistanceKm] = useState<number>(0);
  const [deviceFrameMode, setDeviceFrameMode] = useState(true);
  const [currentMatchedDriver, setCurrentMatchedDriver] = useState<MatchedDriver | null>(null);
  const [isCreatingRide, setIsCreatingRide] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isCalculatingDestination, setIsCalculatingDestination] = useState(false);
  const [destinationEtaMinutes, setDestinationEtaMinutes] = useState<number | null>(null);
  const [destinationFareEstimate, setDestinationFareEstimate] = useState<number | null>(null);

  // --- Real-Time Active Ride, AI Voice Announcer & Live Dispatch Sync ---
  const [activeLiveOrder, setActiveLiveOrder] = useState<LiveRideOrder | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showPromptPayModal, setShowPromptPayModal] = useState<boolean>(false);
  const [showInRideChatModal, setShowInRideChatModal] = useState<boolean>(false);
  const [showRealGpsModal, setShowRealGpsModal] = useState<boolean>(false);
  const [showProfileCustomizerModal, setShowProfileCustomizerModal] = useState<boolean>(false);
  const [showReligiousNotificationsModal, setShowReligiousNotificationsModal] = useState<boolean>(false);
  const [passengerProfileData, setPassengerProfileData] = useState<ProfileCustomizationData>({
    displayName: 'คุณ จิตใจ สล็อต',
    bioStatus: 'พลเมืองสายชิลล์ • เน้นปลอดภัย อุดหนุนร้านชุมชน 🦥✨',
    avatarEmoji: '🦥',
    themeColor: '#00D2FF',
    bannerGlow: 'from-[#0C1E40] via-[#091530] to-[#070D1E]'
  });
  const [ridePhase, setRidePhase] = useState<'picking_up' | 'arrived_pickup' | 'in_transit' | 'arrived_destination'>('picking_up');
  const [pickupEtaMinutes, setPickupEtaMinutes] = useState<number>(2.2);
  const [destEtaMinutes, setDestEtaMinutes] = useState<number>(5.8);
  const [remainingDistMeters, setRemainingDistMeters] = useState<number>(650);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isAutoVoiceAnnounce, setIsAutoVoiceAnnounce] = useState<boolean>(true);
  const [aiSpeechText, setAiSpeechText] = useState<string>('พี่วินกิตติ (LV.100) กำลังเดินทางมารับคุณที่คอนโดสุขุมวิท 39 อีกประมาณ 2.2 นาทีถึงค่ะ');

  const [userRideHistory, setUserRideHistory] = useState<LiveRideOrder[]>([]);

  // Sync profile data with authenticated user session
  React.useEffect(() => {
    if (currentUserSession) {
      setPassengerProfileData(prev => ({
        ...prev,
        displayName: currentUserSession.name || prev.displayName,
        avatarEmoji: currentUserSession.avatarEmoji || prev.avatarEmoji,
        avatarUrl: currentUserSession.avatarUrl || prev.avatarUrl,
        bioStatus: currentUserSession.bio || prev.bioStatus,
      }));
    }
  }, [currentUserSession]);

  // Load and subscribe to passenger's isolated personal order history
  React.useEffect(() => {
    if (!currentUserSession?.id) return;
    
    // 1. Initial cached history
    const cached = getOrdersForPassenger(currentUserSession.id);
    setUserRideHistory(cached);

    // 2. Fetch from Firestore for cloud persistence
    fetchFirestoreOrdersForUser(currentUserSession.id, 'customer')
      .then((orders) => {
        if (orders && orders.length > 0) {
          setUserRideHistory(orders);
        }
      })
      .catch((err) => console.warn('Firestore orders fetch error:', err));

    // 3. Live subscriptions
    const unsub = subscribeToLiveOrders(() => {
      const updated = getOrdersForPassenger(currentUserSession.id);
      setUserRideHistory(updated);
    });

    return () => unsub();
  }, [currentUserSession?.id]);

  // Cross-device synchronization: BroadcastChannel only covers tabs on one device,
  // so the active ride is also refreshed from the trusted server.
  React.useEffect(() => {
    if (!currentUserSession?.id) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const orders = await fetchMyPassengerOrders();
        if (cancelled) return;
        setUserRideHistory(orders);
        setActiveLiveOrder((previous) => {
          if (!previous) return previous;
          const latest = orders.find((order) => order.id === previous.id);
          return latest || previous;
        });
        const currentLatest = activeLiveOrder ? orders.find((order) => order.id === activeLiveOrder.id) : undefined;
        if (currentLatest?.status === 'completed') setRidePhase('arrived_destination');
          void emitQuestMetric('citizen.completed_trip', 1);;
        const active = orders.find((order) => !['completed', 'cancelled'].includes(order.status));
        if (active) {
          setActiveLiveOrder(active);
          if (active.status === 'heading_pickup' || active.status === 'accepted' || active.status === 'pending') setRidePhase('picking_up');
          if (active.status === 'picked_up') setRidePhase('arrived_pickup');
          if (active.status === 'in_transit') setRidePhase('in_transit');
          if (active.driverUserId && active.driverName) {
            setCurrentMatchedDriver((previous) => ({
              id: active.driverUserId || previous?.id || '', name: active.driverName || previous?.name || 'พี่วิน', nameEn: active.driverName || 'Knight', nickname: active.driverName || 'พี่วิน',
              gender: previous?.gender || 'male', level: active.driverLevel || previous?.level || 1, tierName: previous?.tierName || 'WIN Knight',
              rating: active.driverRating || previous?.rating || 0, totalTrips: previous?.totalTrips || 0, phone: active.driverPhone || '', avatarEmoji: active.driverAvatarEmoji || '🏍️',
              imageUrl: previous?.imageUrl, vehicleModel: active.driverVehicle || previous?.vehicleModel || 'มอเตอร์ไซค์รับจ้าง', plateNumber: active.driverPlate || '',
              hasDeliveryBox: previous?.hasDeliveryBox, certifications: previous?.certifications || [], specialtyTags: previous?.specialtyTags || [], distanceKm: previous?.distanceKm || 0,
              etaMinutes: previous?.etaMinutes || 0, bio: previous?.bio || '', serviceMatchScore: previous?.serviceMatchScore || 0,
            }));
          }
        }
      } catch (error) {
        console.warn('Passenger ride refresh failed:', error);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [currentUserSession?.id]);

  // Cross-tab Live Dispatch Listener: updates passenger UI when Knight accepts or advances trip
  React.useEffect(() => {
    const unsubscribe = subscribeToLiveOrders((order, type) => {
      if (type === 'accepted') {
        setActiveLiveOrder(order);
        if (order.driverName) {
          setCurrentMatchedDriver({
            id: order.driverUserId || '',
            name: order.driverName,
            nameEn: order.driverName,
            nickname: order.driverName,
            gender: 'male',
            level: order.driverLevel || 0,
            tierName: order.driverLevel ? `Knight Level ${order.driverLevel}` : 'Knight',
            rating: order.driverRating || 0,
            totalTrips: 0,
            phone: order.driverPhone || '',
            avatarEmoji: order.driverAvatarEmoji || '🛵',
            vehicleModel: order.driverVehicle || 'ยังไม่ระบุรถ',
            plateNumber: order.driverPlate || '',
            certifications: [],
            specialtyTags: [],
            distanceKm: 0,
            etaMinutes: 0,
            bio: '',
            serviceMatchScore: 0
          });
          setRidePhase('picking_up');
          if (audioEnabled) {
            playLevelUpFanfare();
            speakThaiText(`พี่วิน ${order.driverName} กดรับงานแล้วค่ะ กำลังเดินทางมารับคุณ`);
          }
          confetti({ particleCount: 50, spread: 70, colors: ['#00D2FF', '#10B981', '#FFD700'] });
        }
      } else if (type === 'step_changed') {
        setActiveLiveOrder(order);
        if (order.status === 'heading_pickup') setRidePhase('picking_up');
        if (order.status === 'picked_up') {
          setRidePhase('arrived_pickup');
          if (audioEnabled) {
            playTactileBlip(1000);
            speakThaiText("พี่วินเดินทางมาถึงจุดรับแล้วค่ะ กรุณาสวมหมวกนิรภัยเพื่อความปลอดภัย");
          }
        }
        if (order.status === 'in_transit') {
          setRidePhase('in_transit');
          if (audioEnabled) {
            playEngineRev();
            speakThaiText("กำลังออกเดินทางสู่จุดหมายปลายทาง ขับขี่ปลอดภัยด้วยเกราะและกองทุนวินค่ะ");
          }
        }
        if (order.status === 'completed') {
          setRidePhase('arrived_destination');
          setShowReceiptModal(true);
          if (audioEnabled) {
            playLevelUpFanfare();
            speakThaiText("เดินทางถึงจุดหมายปลายทางเรียบร้อยแล้วค่ะ ขอบคุณที่ร่วมเดินทางกับวินไรเดอร์นะคะ");
          }
        }
      } else if (type === 'completed') {
        setActiveLiveOrder(order);
        setRidePhase('arrived_destination');
        setShowReceiptModal(true);
      }
    });
    return () => unsubscribe();
  }, [audioEnabled]);

  // Destination listener for Shop / Partner Pinning ("ปักหมุดเรียกพี่วินมาที่ร้าน/พาร์ทเนอร์")
  React.useEffect(() => {
    const handleSetDest = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string; address?: string; distanceKm?: number }>;
      if (customEvent.detail?.name) {
        const destStr = customEvent.detail.name + (customEvent.detail.address ? ` (${customEvent.detail.address})` : '');
        setSelectedDestination(destStr);
        if (customEvent.detail.distanceKm) {
          setTripDistanceKm(customEvent.detail.distanceKm);
        }
        if (onTabChange) {
          onTabChange('ride');
        } else {
          setActiveTab('ride');
        }
        setShowBookingModal(true);
        if (audioEnabled) {
          playTactileBlip(1000);
        }
      }
    };
    window.addEventListener('winrider:set_destination', handleSetDest);
    return () => window.removeEventListener('winrider:set_destination', handleSetDest);
  }, [onTabChange, audioEnabled]);

  // AI Voice Announcement Dispatcher
  const speakRideAiAnnouncement = (phaseOverride?: 'picking_up' | 'arrived_pickup' | 'in_transit' | 'arrived_destination') => {
    const targetPhase = phaseOverride || ridePhase;
    const driverName = currentMatchedDriver?.name || 'กำลังรอพี่วิน';
    const driverLvl = currentMatchedDriver?.level || 0;
    const vehicle = selectedDreamRide?.thaiName || 'Honda ADV350 Custom Stealth';
    const pickupLoc = activeLiveOrder?.pickupLocation || preMatchingData?.family?.pickupSpecificPoint || 'กำลังรอระบุจุดรับ';
    const destLoc = selectedDestination || 'ยังไม่ได้เลือกปลายทาง';

    let textToSpeak = '';
    if (targetPhase === 'picking_up') {
      textToSpeak = `ระบบเอไอแจ้งเตือน: พี่วิน${driverName} เลเวล ${driverLvl} กำลังขับขี่${vehicle} มารับคุณที่ ${pickupLoc} คาดว่าจะถึงจุดรับในอีกประมาณ ${pickupEtaMinutes} นาที ระยะทางเหลืออีก ${remainingDistMeters} เมตรค่ะ`;
    } else if (targetPhase === 'arrived_pickup') {
      textToSpeak = `ระบบเอไอแจ้งเตือน: พี่วิน${driverName} เดินทางมาถึงจุดรับ ${pickupLoc} เรียบร้อยแล้วค่ะ กรุณาสวมหมวกกันน็อก Smart HUD เพื่อความปลอดภัยและพร้อมออกเดินทางค่ะ`;
    } else if (targetPhase === 'in_transit') {
      textToSpeak = `ระบบเอไอแจ้งเตือน: กำลังนำท่านมุ่งหน้าสู่ ${destLoc} คาดว่าจะถึงจุดหมายในอีกประมาณ ${destEtaMinutes} นาที ระยะทางอีก ${tripDistanceKm} กิโลเมตรค่ะ ขับขี่ปลอดภัยด้วยระบบตรวจจับอัจฉริยะค่ะ`;
    } else if (targetPhase === 'arrived_destination') {
      textToSpeak = `ระบบเอไอแจ้งเตือน: เดินทางถึงจุดหมายปลายทาง ${destLoc} เรียบร้อยแล้วค่ะ ขอบคุณที่ร่วมเดินทางกับวินไรเดอร์นะคะ ขอให้มีวันที่ยอดเยี่ยมค่ะ`;
    }

    setAiSpeechText(textToSpeak);
    setIsAiSpeaking(true);

    if (audioEnabled) {
      playRadarScan();
      speakThaiText(textToSpeak);
    }

    setTimeout(() => {
      setIsAiSpeaking(false);
    }, 4500);
  };

  const handleTriggerSos = () => {
    if (audioEnabled) playTactileBlip(500);
    const openCenter = () => onOpenEmergencyCenter?.();
    if (!navigator.geolocation) {
      void createSosIncident({ note: 'SOS จากอุปกรณ์ที่ไม่มี GPS' }).catch(() => undefined);
      openCenter();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void createSosIncident({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          note: 'ผู้ใช้กด Emergency SOS'
        }).catch(() => undefined);
        openCenter();
      },
      () => {
        void createSosIncident({ note: 'SOS แต่ไม่สามารถอ่าน GPS ได้' }).catch(() => undefined);
        openCenter();
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 15000 }
    );
  };

  // --- Citizen Level & XP System for Customer Profile (Progressive Proportional Scaling) ---
  const [citizenLevel, setCitizenLevel] = useState<number>(91);
  const [citizenNextXp, setCitizenNextXp] = useState<number>(() => calculateLevelMaxXp(91, 'citizen'));
  const [citizenXp, setCitizenXp] = useState<number>(() => Math.round(calculateLevelMaxXp(91, 'citizen') * 0.42));
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [showTiersModal, setShowTiersModal] = useState<boolean>(false);
  const [tiersModalInitialRole, setTiersModalInitialRole] = useState<'knight' | 'citizen' | 'merchant'>('citizen');

  // Customer Custom QR Code State (สำหรับ วันนี้มีของมาขาย)
  const [showCustomerQrModal, setShowCustomerQrModal] = useState<boolean>(false);
  const [customerQrAmount, setCustomerQrAmount] = useState<number>(150);
  const [customerQrTitle, setCustomerQrTitle] = useState<string>('สินค้าจาก วันนี้มีของมาขาย');

  const isDriver = isDriverAccount(currentUserSession);
  const isDriverCitizen = isDriverInCitizenMode(currentUserSession);

  // Sync citizen profile with currentUserSession (Equal levels & persistent persona)
  React.useEffect(() => {
    if (currentUserSession) {
      setCitizenLevel(currentUserSession.level);
      setCitizenNextXp(calculateLevelMaxXp(currentUserSession.level, 'citizen'));
      setCitizenXp(Math.round(calculateLevelMaxXp(currentUserSession.level, 'citizen') * 0.42));

      setPassengerProfileData(prev => ({
        ...prev,
        displayName: currentUserSession.name || prev.displayName,
        bioStatus: isDriverCitizen 
          ? 'พลเมือง (พี่วินพักงาน 1 วัน) • เลเวลและสถิติเชื่อมโยงกันสมบูรณ์ 🦥🛵'
          : (currentUserSession.bio || prev.bioStatus),
        avatarUrl: currentUserSession.avatarUrl || prev.avatarUrl || '/avatars/citizen.jpg',
        avatarEmoji: currentUserSession.avatarEmoji || prev.avatarEmoji
      }));
    }
  }, [currentUserSession, isDriverCitizen]);

  const currentCitizenTier = useMemo(() => getCitizenTier(citizenLevel), [citizenLevel]);
  const citizenDifficultyMetrics = useMemo(() => getLevelDifficultyMetrics(citizenLevel), [citizenLevel]);

  // --- Citizen Financial Credit Score System ---
  const [citizenCreditScore, setCitizenCreditScore] = useState<number>(0);
  const [citizenRideLaterCredit, setCitizenRideLaterCredit] = useState<number>(3500);
  const [citizenShopCredit, setCitizenShopCredit] = useState<number>(12000);

  const handleGainCitizenCredit = (points: number, reason: string) => {
    if (audioEnabled) playTactileBlip(1200);
    setCitizenCreditScore(prev => Math.min(850, prev + points));
    setXpToast(`💳 +${points} คะแนนเครดิตการเงิน: ${reason}! (รวม: ${Math.min(850, citizenCreditScore + points)}/850)`);
    confetti({ particleCount: 40, spread: 65, colors: ['#00D2FF', '#FFD700', '#10B981'] });
    setTimeout(() => setXpToast(null), 3500);
  };

  const handleExpandRideCredit = () => {
    if (audioEnabled) playRadarScan();
    setCitizenRideLaterCredit(prev => prev + 1000);
    setCitizenShopCredit(prev => prev + 2500);
    handleGainCitizenCredit(15, "ขอเพิ่มวงเงินเครดิตความน่าเชื่อถือสำเร็จ");
  };

  const handleGainCitizenXp = (amount: number, reason: string) => {
    if (audioEnabled) playTactileBlip(1000 + amount * 3);
    setCitizenXp(prev => {
      const newXp = prev + amount;
      if (newXp >= citizenNextXp) {
        const nextLvl = citizenLevel + 1;
        setCitizenLevel(nextLvl);
        const nextReq = calculateLevelMaxXp(nextLvl, 'citizen');
        setCitizenNextXp(nextReq);
        if (audioEnabled) playEngineRev();
        confetti({ particleCount: 70, spread: 80, colors: ['#00D2FF', '#FFD700', '#10B981'] });
        setXpToast(`🎉 LEVEL UP! พลเมืองอัปเกรดเป็น Level ${nextLvl}! (หลอดถัดไป: ${nextReq.toLocaleString()} XP)`);
        return Math.max(0, newXp - citizenNextXp);
      } else {
        setXpToast(`✨ +${amount} XP จาก ${reason}`);
        setTimeout(() => setXpToast(null), 3000);
        return newXp;
      }
    });
  };

  // Dynamic Amenities & Total Fare Calculation (Distance-based starting at 15 THB)
  const amenitiesSummary = useMemo(() => {
    return calculateAmenitiesSummary(customAmenities);
  }, [customAmenities]);

  const baseFare = 15.0;
  const distanceFare = useMemo(() => {
    if (tripDistanceKm <= 1.0) return 0;
    return Math.round((tripDistanceKm - 1.0) * 7.5);
  }, [tripDistanceKm]);

  const isExpressService = useMemo(() => {
    return activeServiceId === 'express' || (selectedService ? selectedService.toLowerCase().includes('express') : false);
  }, [activeServiceId, selectedService]);

  const expressBoxFee = isExpressService ? 5.0 : 0.0; // บังคับจ่ายค่ากล่องใส่ พัสดุ,เอกสาร,อาหาร ปรับลดเหลือ 5 บาท

  // Specialized Pre-matching modal states for Express, MU, Lifestyle, Spirit, Family
  const [showPreMatchingModal, setShowPreMatchingModal] = useState(false);
  const [preMatchingServiceId, setPreMatchingServiceId] = useState<string>('express');
  const [preMatchingData, setPreMatchingData] = useState<SpecializedPreMatchingData | null>(null);
  const [serviceAddonFee, setServiceAddonFee] = useState<number>(0);
  const [showExpressAiVerifier, setShowExpressAiVerifier] = useState(false);
  const [expressAiVerification, setExpressAiVerification] = useState<AIVerificationResult | null>(null);
  const [showPhotoVerificationModal, setShowPhotoVerificationModal] = useState(false);
  const [photoVerificationType, setPhotoVerificationType] = useState<'express_delivery' | 'family_arrival'>('express_delivery');

  const totalCalculatedFare = useMemo(() => {
    const dreamRideAddon = selectedDreamRide.priceAddon;
    const amenitiesAddon = amenitiesSummary.totalPrice;
    const quote = calculateAppFare(activeServiceId || 'knight', tripDistanceKm, {
      expressBoxBaht: expressBoxFee,
      dreamRideBaht: dreamRideAddon,
      amenitiesBaht: amenitiesAddon,
      serviceAddonBaht: serviceAddonFee,
    });
    return quote.fareBaht;
  }, [activeServiceId, tripDistanceKm, expressBoxFee, selectedDreamRide.priceAddon, amenitiesSummary.totalPrice, serviceAddonFee]);

  // C2C Marketplace state
  const [c2cItems, setC2cItems] = useState<Array<{ id: string; name: string; price: number; rating: number; sales: number; tag: string; icon: string; imageUrl?: string; condition?: string; description?: string; aiVerified?: boolean; sellerUid?: string }>>([]);
  const [showAddC2cModal, setShowAddC2cModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemTag, setNewItemTag] = useState('อาหาร / สตรีทฟู้ด');
  const [newItemCondition, setNewItemCondition] = useState<'มือหนึ่ง' | 'มือสอง'>('มือสอง');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('📦');
  const [passengerAiVerified, setPassengerAiVerified] = useState<AIVerificationResult | null>(null);
  const [earnings, setEarnings] = useState(0);

  // 8 Pillars Core Services Array with Neon Contrast Color IDs & Outer Glowing Icons
  const services = [
    {
      id: 'knight',
      name: 'WIN KNIGHT',
      nameEn: 'WIN KNIGHT (อัศวินขับขี่)',
      colorTitle: 'Knight-NeonBlue',
      colorName: 'Neon Blue',
      colorHex: '#00D2FF',
      colorGlow: 'rgba(0, 210, 255, 0.8)',
      desc: 'อัศวินประจำตัวพร้อมพาหนะที่คุณเลือก ทั่วกรุงเทพฯ เริ่มต้น 15฿ ปลอดภัย 100%',
      icon: <Shield className="w-6 h-6 text-[#00D2FF] drop-shadow-[0_0_10px_rgba(0,210,255,0.95)]" />,
      imageUrl: WIN_IMAGES.pillars.knight,
      badge: 'เริ่ม 15฿',
      bgGlow: 'from-[#00D2FF]/25 to-transparent',
      eta: '2-3 นาที',
      priceEstimate: '฿15 - ฿85',
      iconEmoji: '🛡️ 🏍️',
      actionText: '⚡ กดเรียกอัศวินทันที',
      actionGradient: 'from-[#00D2FF] to-blue-600',
      actionTextGlow: 'shadow-[0_0_14px_rgba(0,210,255,0.6)]',
      infoData: 'ℹ️ ข้อมูล: มาตรฐานความปลอดภัย 100% • เริ่ม 15฿'
    },
    {
      id: 'express',
      name: 'WIN Express',
      nameEn: 'WIN Express (พัสดุ/เอกสาร/อาหาร)',
      colorTitle: 'Express-Orange',
      colorName: 'Orange',
      colorHex: '#FF6B00',
      colorGlow: 'rgba(255, 107, 0, 0.8)',
      desc: 'ส่งด่วนใน 30 นาที ปรับลดค่ากล่องเหลือ 5฿ เพื่อประชาชน พี่วินพี่วินที่ผ่านการอนุมัติจากแอดมิน พร้อมกล่องควบคุมอุณหภูมิและกันกระแทก',
      icon: <Zap className="w-6 h-6 text-orange-400 drop-shadow-[0_0_10px_rgba(255,107,0,0.95)]" />,
      imageUrl: WIN_IMAGES.pillars.express,
      badge: '+5฿ ค่ากล่อง ()',
      bgGlow: 'from-orange-500/25 to-transparent',
      eta: '1-3 นาที',
      priceEstimate: '฿20 - ฿75',
      iconEmoji: '📦 ⚡',
      actionText: '📦 กดส่งพัสดุด่วน 30น.',
      actionGradient: 'from-[#FF6B00] to-amber-500',
      actionTextGlow: 'shadow-[0_0_14px_rgba(255,107,0,0.6)]',
      infoData: 'ℹ️ ข้อมูล: พี่วิน  • ค่ากล่องคุมอุณหภูมิ 5฿'
    },
    {
      id: 'pet',
      name: 'WIN-Pet Care',
      nameEn: 'WIN-Pet Care (รพ.สัตว์ & คลินิก 24 ชม.)',
      colorTitle: 'Pet-Green',
      colorName: 'Green',
      colorHex: '#10B981',
      colorGlow: 'rgba(16, 185, 129, 0.8)',
      desc: 'เบาะนิรภัยสำหรับสัตว์เลี้ยง ส่งตรงโรงพยาบาลสัตว์และคลินิกฉุกเฉิน 24 ชม. ตลอดวัน',
      icon: <Dog className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.95)]" />,
      imageUrl: WIN_IMAGES.pillars.petcare,
      badge: '24H VET CARE',
      bgGlow: 'from-emerald-400/25 to-transparent',
      eta: 'ประมาณการจาก GPS',
      priceEstimate: 'คำนวณจากระยะทางประมาณการ',
      iconEmoji: '🐾 🐶',
      actionText: '🐾 กดเข้าศูนย์ รพ.สัตว์ 24 ชม.',
      actionGradient: 'from-emerald-400 to-teal-500',
      actionTextGlow: 'shadow-[0_0_14px_rgba(16,185,129,0.6)]',
      infoData: 'ℹ️ ข้อมูล: เบาะนิรภัยสัตว์เลี้ยง • ส่ง รพ.สัตว์ 24 ชม.'
    },
    {
      id: 'mu',
      name: 'WIN MU BUDDY',
      nameEn: 'WIN MU BUDDY (เพื่อนร่วมทริปสายมู)',
      colorTitle: 'MU-Purple',
      colorName: 'Purple',
      colorHex: '#A855F7',
      colorGlow: 'rgba(168, 85, 247, 0.8)',
      desc: 'ระบบจับคู่งานจริงกับพี่วินที่ผ่านการอนุมัติจากแอดมิน พร้อมข้อมูลเส้นทางสายมูและบทสวด',
      icon: <Sparkles className="w-6 h-6 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.95)]" />,
      imageUrl: WIN_IMAGES.pillars.mubuddy,
      badge: 'พี่วินที่ผ่านการอนุมัติจากแอดมิน',
      bgGlow: 'from-purple-500/25 to-transparent',
      eta: '4-8 นาที',
      priceEstimate: '฿45 - ฿180',
      iconEmoji: '⛩️ 🪔',
      actionText: '⛩️ กดจับคู่ทริปสายมู',
      actionGradient: 'from-purple-400 to-fuchsia-600',
      actionTextGlow: 'shadow-[0_0_14px_rgba(168,85,247,0.6)]',
      infoData: 'ℹ️ ข้อมูล: คัดกรองพี่วินที่ผ่านการอนุมัติจากแอดมิน • พร้อมบทสวด'
    },
    {
      id: 'lifestyle',
      name: 'WIN Lifestyle',
      nameEn: 'WIN Lifestyle (กิน ดื่ม เที่ยว คาเฟ่)',
      colorTitle: 'Lifestyle-Pink',
      colorName: 'Pink',
      colorHex: '#EC4899',
      colorGlow: 'rgba(236, 72, 153, 0.8)',
      desc: 'แนะนำร้านอาหารเด็ด คาเฟ่ ผับบาร์ ร้านนั่งชิว คาเฟ่หมาแมว และจุดเช็คอินยอดนิยม พร้อมบริการถ่ายรูป',
      icon: <Coffee className="w-6 h-6 text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.95)]" />,
      imageUrl: WIN_IMAGES.pillars.lifestyle,
      badge: 'CAFE & BAR GUIDE',
      bgGlow: 'from-pink-500/25 to-transparent',
      eta: '2-4 นาที',
      priceEstimate: '฿25 - ฿120',
      iconEmoji: '☕ ⭐',
      actionText: '☕ กดสำรวจร้าน & เรียกรถ',
      actionGradient: 'from-pink-400 to-rose-600',
      actionTextGlow: 'shadow-[0_0_14px_rgba(236,72,153,0.6)]',
      infoData: 'ℹ️ ข้อมูล: รวมพิกัดสตรีทฟู้ด คาเฟ่ และร้านนั่งชิว'
    },
    {
      id: 'spirit',
      name: 'WIN Spirit',
      nameEn: 'WIN Spirit (ดูแลผู้สูงอายุ & พาทำศาสนกิจทุกศาสนา)',
      colorTitle: 'Spirit-Yellow',
      colorName: 'Yellow',
      colorHex: '#FACC15',
      colorGlow: 'rgba(250, 204, 21, 0.8)',
      desc: 'พี่วินที่ผ่านการอนุมัติและอบรมดูแลผู้สูงอายุ พาไปทำศาสนกิจทุกศาสนา (มัสยิด, วัด, โบสถ์, ศาลเจ้า) พร้อมรอรับกลับ',
      icon: <Heart className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.95)]" />,
      imageUrl: WIN_IMAGES.pillars.spirit,
      badge: 'อบรมพิเศษ • ทุกศาสนา',
      bgGlow: 'from-yellow-400/25 to-transparent',
      eta: '3-5 นาที',
      priceEstimate: '฿35 - ฿110',
      iconEmoji: '👵 🤲',
      actionText: '👵 กดจองดูแลผู้สูงอายุ',
      actionGradient: 'from-yellow-400 to-amber-500',
      actionTextGlow: 'shadow-[0_0_14px_rgba(250,204,21,0.6)]',
      infoData: 'ℹ️ ข้อมูล: อบรมดูแลผู้สูงอายุ • ดูแลรอรับกลับ'
    },
    {
      id: 'family',
      name: 'WIN Family',
      nameEn: 'WIN Family (รับส่งเด็ก & ครอบครัว)',
      colorTitle: 'Family-SkyBlue',
      colorName: 'SkyBlue',
      colorHex: '#38BDF8',
      colorGlow: 'rgba(56, 189, 248, 0.8)',
      desc: 'พี่วินที่ผ่านการอนุมัติและอบรมดูแลเด็ก รับส่งไปโรงเรียน หมวกกันน็อกเด็ก พร้อมติดตาม GPS สด',
      icon: <Users className="w-6 h-6 text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.95)]" />,
      imageUrl: WIN_IMAGES.pillars.family,
      badge: 'อบรมดูแลเด็ก',
      bgGlow: 'from-sky-400/25 to-transparent',
      eta: '3-5 นาที',
      priceEstimate: '฿30 - ฿95',
      iconEmoji: '👨‍👩‍👧 🤝',
      actionText: '👨‍👩‍👧 กดจองรับส่งเด็ก/ครอบครัว',
      actionGradient: 'from-sky-400 to-blue-600',
      actionTextGlow: 'shadow-[0_0_14px_rgba(56,189,248,0.6)]',
      infoData: 'ℹ️ ข้อมูล: หมวกกันน็อกเด็ก • GPS สด • อบรม '
    },
    {
      id: 'link',
      name: 'WIN Link',
      nameEn: 'WIN Link (จองตั๋วคอนเสิร์ต/กีฬา & เชื่อมต่อ BTS/MRT/รถไฟ)',
      colorTitle: 'Link-Lime',
      colorName: 'Lime',
      colorHex: '#84CC16',
      colorGlow: 'rgba(132, 204, 22, 0.8)',
      desc: 'พี่วินช่วยจองตั๋วคอนเสิร์ต กีฬา อีเวนต์ ต่อคิวรับบัตรจริง & เชื่อมต่อสถานีรถไฟฟ้า BTS/MRT ทุกสาย รถไฟ รถเมล์ เรือ ทั่วกรุงเทพฯ',
      icon: <Share2 className="w-6 h-6 text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.95)]" />,
      imageUrl: WIN_IMAGES.pillars.link,
      badge: 'จองตั๋วคอนเสิร์ต/กีฬา & BTS/MRT',
      bgGlow: 'from-lime-400/25 to-transparent',
      eta: '2-3 นาที',
      priceEstimate: '฿15 - ฿65',
      iconEmoji: '🎫 🚝',
      actionText: '🎫 จองตั๋วคอนเสิร์ต/กีฬา & รถไฟฟ้า',
      actionGradient: 'from-lime-400 to-emerald-500',
      actionTextGlow: 'shadow-[0_0_14px_rgba(132,204,22,0.6)]',
      infoData: 'ℹ️ ข้อมูล: ช่วยจองตั๋ว/กดบัตร/ต่อคิว • ซิงค์รอบเวลา BTS/MRT'
    }
  ];

  // Dynamic Theme state based on selected service's Color ID (Neon Contrast on Deep Navy)
  const currentTheme = useMemo(() => {
    return SERVICE_THEMES[activeServiceId] || SERVICE_THEMES['knight'];
  }, [activeServiceId]);

  const destinations = [
    { title: 'อิมแพ็ค อารีน่า เมืองทองธานี (IMPACT Arena)', sub: 'เมืองทองธานี • 14.5 กม.', icon: '🎤', tag: 'WIN Link คอนเสิร์ต' },
    { title: 'ราชมังคลากีฬาสถาน (Rajamangala Stadium)', sub: 'หัวหมาก • 8.9 กม.', icon: '⚽', tag: 'WIN Link ฟุตบอล/คอนเสิร์ต' },
    { title: 'UOB Live Bangkok (EMSUSPHERE)', sub: 'พร้อมพงษ์ • 3.2 กม.', icon: '🎵', tag: 'WIN Link ฮอลล์คอนเสิร์ต' },
    { title: 'สนามมวยเวทีลุมพินี (ONE Lumpinee)', sub: 'รามอินทรา • 12.0 กม.', icon: '🥊', tag: 'WIN Link ศึกมวยสด' },
    { title: 'BTS สยาม / สยามพารากอน (Interchange)', sub: 'ปทุมวัน • 1.8 กม.', icon: '🚝', tag: 'WIN Link BTS' },
    { title: 'สถานีกลางกรุงเทพอภิวัฒน์ / รถไฟ SRT', sub: 'จตุจักร • 6.2 กม.', icon: '🚆', tag: 'WIN Link Train' },
    { title: 'ท่าเรือสาทร (Central Pier) / BTS ตากสิน', sub: 'สาทรใต้ • 1.9 กม.', icon: '🚢', tag: 'WIN Link Pier' },
    { title: 'ศูนย์การประชุมแห่งชาติสิริกิติ์ (QSNCC)', sub: 'รัชดา-คลองเตย • 2.1 กม.', icon: '📚', tag: 'WIN Link แฟนมีต/งานหนังสือ' },
    { title: 'ร้านกาแฟ ซัมเมอร์เรน คาเฟ่ (Summer Rain Cafe)', sub: 'สุขุมวิท 39 • 2.4 กม.', icon: '☕', tag: 'Cafe & Chill' },
  ];

  const handleSelectHospitalForBooking = (hospital: PetHospitalClinic) => {
    if (hospital.distanceKm === null) {
      setBookingError('ยังไม่มีระยะทางประมาณการของสถานพยาบาลนี้ กรุณาลองค้นหาใหม่');
      return;
    }
    if (audioEnabled) {
      playTactileBlip(950);
      speakThaiText(`เตรียมเรียกรถ WIN-Pet Care ส่งไป ${hospital.name}`);
    }
    setActiveServiceId('pet');
    setSelectedService('WIN-Pet Care (รพ.สัตว์ & คลินิก 24 ชม.)');
    setSelectedDestination(`${hospital.name} (${hospital.address})`);
    setSelectedPetHospital(hospital);
    setTripDistanceKm(hospital.distanceKm);
    setShowDriverMatchingModal(true);
  };

  const handleBookService = (svc: typeof services[0]) => {
    if (audioEnabled) playTactileBlip(900);
    setActiveServiceId(svc.id);
    setSelectedService(svc.name);

    if (svc.id === 'pet') {
      if (audioEnabled) {
        speakThaiText("ยินดีต้อนรับสู่ฟีเจอร์ WIN-Pet Care โรงพยาบาลและคลินิกสัตว์เลี้ยง 24 ชั่วโมง");
      }
      setActiveTab('petCare');
      return;
    }

    // WIN Express is gated by a real package photo + WIN-AI Vision certificate before dispatch.
    if (svc.id === 'express') {
      setExpressAiVerification(null);
      setShowExpressAiVerifier(true);
      if (audioEnabled) speakThaiText('ก่อนเรียกพี่วิน WIN Express กรุณาถ่ายรูปพัสดุจริงให้ WIN-AI ตรวจสอบก่อนค่ะ');
      return;
    }

    // Specialized services pre-matching modal intercept (Mu, Lifestyle, Spirit, Family, Link)
    if (['mu', 'lifestyle', 'spirit', 'family', 'link'].includes(svc.id)) {
      setPreMatchingServiceId(svc.id);
      setShowPreMatchingModal(true);
      if (audioEnabled) {
        if (svc.id === 'link') {
          speakThaiText("ยินดีต้อนรับสู่ WIN Link บริการช่วยจองตั๋วคอนเสิร์ต แข่งกีฬา และต่อรถไฟฟ้า");
        } else {
          speakThaiText(`กรุณากรอกข้อมูลเฉพาะสำหรับบริการ ${svc.name} ก่อนเริ่มค้นหาอัศวิน`);
        }
      }
      return;
    }

    if (audioEnabled) {
      speakThaiText(`เลือกบริการ ${svc.name} ระบบกำลังค้นหาอัศวินที่ตรงตามมาตรฐาน`);
    }
    setShowDriverMatchingModal(true);
  };

  const handlePreMatchingSubmit = (data: SpecializedPreMatchingData, addonFee: number) => {
    if (data.serviceId === 'express' && !expressAiVerification?.isVerified) {
      setShowExpressAiVerifier(true);
      return;
    }
    if (data.serviceId === 'express' && expressAiVerification?.isVerified) {
      data = { ...data, express: { ...data.express!, packagePhotoUrl: expressAiVerification.imageUrl, aiCertificateId: expressAiVerification.certificateId } } as SpecializedPreMatchingData;
    }
    setPreMatchingData(data);
    setServiceAddonFee(addonFee);
    const submittedDestination = data.family?.destinationSpecificPoint || data.express?.destinationAddress;
    if (submittedDestination?.trim()) {
      setSelectedDestination(submittedDestination.trim());
    }
    setShowPreMatchingModal(false);
    setShowDriverMatchingModal(true);
  };

  const handleSelectDreamRide = (ride: DreamRideVehicle) => {
    if (audioEnabled) {
      playTactileBlip(1000);
      speakThaiText(`เลือกรถในฝัน ${ride.thaiName}`);
    }
    setSelectedDreamRide(ride);
    setUserExplicitlyChoseVehicle(true);
    setSelectedExperienceMode(ride.experienceModes[0]);
  };

  const handleBookWithDreamRide = (ride: DreamRideVehicle) => {
    if (audioEnabled) {
      playTactileBlip(950);
      speakThaiText(`เตรียมจองทริปด้วย ${ride.thaiName}`);
    }
    setSelectedDreamRide(ride);
    setUserExplicitlyChoseVehicle(true);
    setSelectedService(`WIN KNIGHT (${ride.thaiName})`);
    setActiveServiceId('knight');
    setSelectedExperienceMode(ride.experienceModes[0]);
    setShowDriverMatchingModal(true);
  };

  const handleConfirmMatch = (driver: MatchedDriver | null) => {
    setCurrentMatchedDriver(driver);
    setShowDriverMatchingModal(false);
    setShowBookingModal(true);
    if (audioEnabled) {
      playRadarScan();
      speakThaiText(driver
        ? `ระบบจะส่งคำขอถึง ${driver.name} ก่อน หากไม่ตอบรับจะส่งต่ออัตโนมัติ กรุณายืนยันการเดินทาง`
        : 'ระบบจะจับคู่พี่วินที่ใกล้ที่สุดและผ่านเงื่อนไขบริการ กรุณายืนยันการเดินทาง');
    }
  };

  const findReferencePlace = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const popular = POPULAR_BANGKOK_DESTINATIONS.find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()) || (p.address && p.address.toLowerCase().includes(q)));
    if (popular) return { lat: popular.lat, lng: popular.lng, address: popular.address || popular.name, name: popular.name, distanceKm: undefined };
    const real = REAL_BANGKOK_LOCATIONS.find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()) || (p.addressTh && p.addressTh.toLowerCase().includes(q)));
    if (real) return { lat: real.lat, lng: real.lng, address: real.addressTh || real.name, name: real.name, distanceKm: undefined };
    const transit = BANGKOK_TRANSIT_STATIONS.find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
    if (transit) return { lat: 13.7462, lng: 100.5348, address: transit.lineName || transit.name, name: transit.name, distanceKm: transit.distanceKm };
    return null;
  };


  const calculateDestinationRoute = async (destinationQuery: string, fallbackLabel: string, openMatchingAfterCalculation = false) => {
    setIsCalculatingDestination(true);
    setBookingError(null);
    setDestinationEtaMinutes(null);
    setDestinationFareEstimate(null);
    setTripDistanceKm(0);
    setSelectedDestination(fallbackLabel);
    try {
      if (!navigator.geolocation) {
        throw new Error('อุปกรณ์นี้ไม่รองรับ GPS จริง จึงยังคำนวณระยะทางและค่าโดยสารไม่ได้');
      }

      const currentPosition = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          (error) => reject(new Error(error.message || 'ไม่สามารถอ่าน GPS จริงได้')),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
        );
      });

      let resolvedAddress = fallbackLabel;
      let resolvedDistanceKm: number | null = null;
      let resolvedEta: number | null = null;

      // Public-data destinations provide the real place identity/coordinates.
      // Route distance/ETA must come from a real routing provider; never estimate with a multiplier.
      try {
        const publicResponse = await fetch('/api/public-data/places?kind=attractions&query=' + encodeURIComponent(destinationQuery) + '&limit=5', {
          headers: { Accept: 'application/json' }
        });
        if (publicResponse.ok) {
          const publicPayload = await publicResponse.json() as { records?: Array<{ name?: string; address?: string; district?: string; province?: string; latitude?: number; longitude?: number }> };
          const publicMatch = publicPayload.records?.[0];
          if (publicMatch) {
            resolvedAddress = [publicMatch.name, publicMatch.address, publicMatch.district, publicMatch.province].filter(Boolean).join(' ');
          }
        }
      } catch {
        // Destination identity remains usable even if the public-data index is temporarily unavailable.
      }

      // Route service uses the real server-side Google Places/Routes provider when configured.
      // Cost control is enforced by the shared cache/throttle guard; never fabricate distance, ETA, GPS fallback coordinates, or fare.
      try {
        const response = await fetch('/api/places/resolve-routes', {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            latitude: currentPosition.lat,
            longitude: currentPosition.lng,
            places: [{ key: 'destination-preview', query: destinationQuery + ' ประเทศไทย' }]
          }),
        });
        if (response.ok) {
          const payload = await response.json() as { routes?: Array<{ address?: string; distanceKm?: number; etaMinutes?: number | null }> };
          const route = payload.routes?.[0];
          if (route && Number.isFinite(route.distanceKm) && Number(route.distanceKm) > 0) {
            resolvedDistanceKm = Number(route.distanceKm);
            resolvedEta = route.etaMinutes ?? null;
            if (route.address) resolvedAddress = route.address;
          }
        }
      } catch {
        // No real routing result: keep distance/ETA/fare empty.
      }

      setSelectedDestination(resolvedAddress);
      if (resolvedDistanceKm !== null) {
        const fareQuote = calculateAppFare(activeServiceId || 'knight', resolvedDistanceKm, {
          expressBoxBaht: expressBoxFee,
          dreamRideBaht: selectedDreamRide.priceAddon,
          amenitiesBaht: amenitiesSummary.totalPrice,
          serviceAddonBaht: serviceAddonFee,
        });
        setTripDistanceKm(resolvedDistanceKm);
        setDestinationEtaMinutes(resolvedEta);
        setDestinationFareEstimate(fareQuote.fareBaht);
      } else {
        setDestinationEtaMinutes(null);
        setDestinationFareEstimate(null);
        setBookingError('พบปลายทางจริงแล้ว แต่ยังไม่มีข้อมูลเส้นทางจริงสำหรับคำนวณค่าโดยสาร จึงไม่แสดงตัวเลขประมาณการ');
      }

      if (openMatchingAfterCalculation && resolvedDistanceKm !== null) {
        setShowBookingModal(false);
        setShowDriverMatchingModal(true);
      } else {
        setShowBookingModal(true);
      }

      if (audioEnabled) {
        playTactileBlip(900);
        if (resolvedDistanceKm !== null) {
          const spokenFare = calculateAppFare(activeServiceId || 'knight', resolvedDistanceKm, {
            expressBoxBaht: expressBoxFee,
            dreamRideBaht: selectedDreamRide.priceAddon,
            amenitiesBaht: amenitiesSummary.totalPrice,
            serviceAddonBaht: serviceAddonFee,
          }).fareBaht;
          speakThaiText('พบปลายทางจริงและคำนวณค่าโดยสารจากข้อมูลเส้นทางจริงแล้ว ' + spokenFare + ' บาท');
        } else {
          speakThaiText('พบปลายทางแล้ว แต่ยังไม่มีข้อมูลเส้นทางจริง จึงยังไม่แสดงราคาโดยประมาณ');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถอ่าน GPS จริงได้';
      setBookingError(message);
      setShowBookingModal(true);
      if (audioEnabled) speakThaiText(message);
    } finally {
      setIsCalculatingDestination(false);
    }
  };

  const handleSelectRadarDestination = async (entity: { name: string; categoryLabel?: string; placeGroup?: string; address?: string }) => {
    const destinationQuery = [entity.name, entity.categoryLabel, entity.address].filter(Boolean).join(' ');
    const fallbackLabel = entity.address ? `${entity.name} (${entity.address})` : entity.name;
    setActiveServiceId('knight');
    setSelectedService('WIN KNIGHT');
    setCurrentMatchedDriver(null);
    setShowCustomerRadarModal(false);
    setShowBookingModal(false);
    await calculateDestinationRoute(destinationQuery, fallbackLabel, true);
  };

  const handleSelectLifestylePlace = (place: LifestylePlace) => {
    const destination = place.name + ' (' + place.area + ')';
    setActiveServiceId('lifestyle');
    setSelectedService('WIN Lifestyle');
    setSelectedDestination(destination);
    setShowBookingModal(false);
    setShowDriverMatchingModal(true);
    if (audioEnabled) {
      playTactileBlip(950);
      speakThaiText('เลือกสถานที่แล้ว กรุณากดเริ่มจับคู่เพื่อค้นหาพี่วินสำหรับปลายทางนี้');
    }
  };

  const handleSelectWinAlertEvent = (event: { title: string; venueName: string; venueArea?: string }) => {
    const destination = event.venueName + (event.venueArea ? ' ' + event.venueArea : '');
    setActiveServiceId('knight');
    setSelectedService('WIN KNIGHT • Win Alert');
    setSelectedDestination(destination);
    setShowBookingModal(false);
    setShowDriverMatchingModal(true);
    if (audioEnabled) {
      playTactileBlip(1000);
      speakThaiText('เลือกกิจกรรมแล้ว กรุณากดเริ่มจับคู่เพื่อค้นหาพี่วินไปยังสถานที่จริง');
    }
  };
  const handleConfirmRide = async () => {
    if (!currentUserSession?.id) {
      setBookingError('กรุณาเข้าสู่ระบบก่อนเรียกรถ เพื่อป้องกันการสร้างออเดอร์โดยไม่มีเจ้าของบัญชี');
      return;
    }
    if (!selectedDestination) {
      setBookingError('กรุณาเลือกปลายทางก่อนยืนยันการเดินทาง');
      return;
    }

    setIsCreatingRide(true);
    setBookingError(null);
    try {
      const familyPickupLocation = activeServiceId === 'family'
        ? preMatchingData?.family?.pickupSpecificPoint.trim()
        : '';
      const currentPosition = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          reject(new Error('GPS_UNAVAILABLE'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => reject(new Error('GPS_PERMISSION_OR_FIX_FAILED')),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
      });
      let pickupCoord = currentPosition;
      let pickupLocation = `GPS ${currentPosition.lat.toFixed(5)}, ${currentPosition.lng.toFixed(5)}`;
      if (familyPickupLocation) {
        const refPickup = findReferencePlace(familyPickupLocation);
        if (refPickup) {
          pickupCoord = { lat: refPickup.lat, lng: refPickup.lng };
          pickupLocation = refPickup.address || familyPickupLocation;
        } else {
          try {
            const response = await fetch('/api/places/resolve-routes', {
              method: 'POST', headers: await getAuthHeaders(),
              body: JSON.stringify({ latitude: currentPosition.lat, longitude: currentPosition.lng, places: [{ key: 'family-pickup', query: `${familyPickupLocation} ประเทศไทย` }] }),
            });
            if (response.ok) {
              const payload = await response.json() as { routes?: Array<{ latitude: number; longitude: number; address: string }> };
              const resolved = payload.routes?.[0];
              if (resolved) {
                pickupCoord = { lat: resolved.latitude, lng: resolved.longitude };
                pickupLocation = resolved.address || familyPickupLocation;
              }
            } else {
              pickupLocation = familyPickupLocation;
            }
          } catch {
            pickupLocation = familyPickupLocation;
          }
        }
      }

      let dropoffCoord: { lat: number; lng: number } | undefined = undefined;
      let dropoffLocation = selectedDestination || 'ปลายทางที่ระบุ';
      let resolvedDistanceKm: number | null = tripDistanceKm > 0 ? tripDistanceKm : null;

      // Check reference destinations first
      const refDropoff = findReferencePlace(selectedDestination);
      if (refDropoff && typeof refDropoff.lat === 'number' && typeof refDropoff.lng === 'number') {
        dropoffCoord = { lat: refDropoff.lat, lng: refDropoff.lng };
        dropoffLocation = refDropoff.address || refDropoff.name;
        if (!resolvedDistanceKm && typeof (refDropoff as any).distanceKm === 'number' && (refDropoff as any).distanceKm > 0) {
          resolvedDistanceKm = (refDropoff as any).distanceKm;
        }
      }

      if (resolvedDistanceKm === null || resolvedDistanceKm <= 0) {
        try {
          const destinationResponse = await fetch('/api/places/resolve-routes', {
            method: 'POST', headers: await getAuthHeaders(),
            body: JSON.stringify({ latitude: pickupCoord.lat, longitude: pickupCoord.lng, places: [{ key: 'ride-destination', query: `${selectedDestination} ประเทศไทย` }] }),
          });
          if (destinationResponse.ok) {
            const destinationPayload = await destinationResponse.json() as { routes?: Array<{ latitude: number; longitude: number; address: string; distanceKm: number; etaMinutes: number | null }> };
            const resolvedDestination = destinationPayload.routes?.[0];
            if (resolvedDestination) {
              dropoffCoord = { lat: resolvedDestination.latitude, lng: resolvedDestination.longitude };
              if (resolvedDestination.address) dropoffLocation = resolvedDestination.address;
              if (Number.isFinite(resolvedDestination.distanceKm)) resolvedDistanceKm = resolvedDestination.distanceKm;
            }
          }
        } catch {
          // No fallback to fake distance
        }
      }

      if (resolvedDistanceKm === null || resolvedDistanceKm <= 0) {
        throw new Error('ไม่สามารถคำนวณระยะทางจริงได้ กรุณาระบุสถานที่ปลายทางหรือเปิด GPS');
      }

      const resolvedFareQuote = calculateAppFare(activeServiceId || 'knight', resolvedDistanceKm, {
        expressBoxBaht: expressBoxFee,
        dreamRideBaht: selectedDreamRide.priceAddon,
        amenitiesBaht: amenitiesSummary.totalPrice,
        serviceAddonBaht: serviceAddonFee,
      });
      const resolvedFare = resolvedFareQuote.fareBaht;
      if (audioEnabled) playRadarScan();
      const pName = currentUserSession.name || passengerProfileData.displayName;
      const pPhone = currentUserSession.phone || '';
      const liveOrder = await createLiveOrder({
        serviceId: activeServiceId || 'knight',
        serviceTitle: selectedService ? `WIN ${selectedService.toUpperCase()}` : 'WIN KNIGHT',
        serviceIconEmoji: selectedDreamRide?.icon || '🛵',
        // createLiveOrder binds ownership to the verified Firebase UID.
        // This profile ID is informational only and is never trusted by the server.
        passengerUserId: currentUserSession.id,
        passengerName: `${pName} (${currentUserSession.level ? `LV.${currentUserSession.level}` : 'Citizen'})`,
        passengerPhone: pPhone,
        pickupLocation,
        dropoffLocation,
        distanceKm: resolvedDistanceKm,
        fare: resolvedFare,
        fareAddons: resolvedFareQuote.addons,
        pickupCoord,
        dropoffCoord,
        estMinutes: destinationEtaMinutes || Math.max(3, Math.ceil(resolvedDistanceKm * 3.5)),
        customerGender,
        preferredDriverId: currentMatchedDriver?.id,
        ...(activeServiceId === 'express' && expressAiVerification?.isVerified ? { expressPackagePhotoUrl: expressAiVerification.imageUrl, expressAiCertificateId: expressAiVerification.certificateId } : {}),
      });
      setActiveLiveOrder(liveOrder);
      setBookingConfirmed(true);
      setShowBookingModal(false);
      setActiveTab('ride');
      if (audioEnabled) speakThaiText('สร้างออเดอร์สำเร็จ กำลังรอพี่วินที่ผ่านเกณฑ์กดรับงานค่ะ');
    } catch (err) {
      console.error('Failed to create live order:', err);
      const reason = err instanceof Error ? err.message : '';
      const message = reason.startsWith('GPS_')
        ? 'ไม่สามารถอ่านตำแหน่ง GPS ได้ กรุณาอนุญาต Location แล้วลองใหม่'
        : reason === 'DESTINATION_NOT_RESOLVED'
          ? 'ค้นหาปลายทางไม่ได้จากข้อมูลสาธารณะ กรุณาระบุชื่อสถานที่หรือเลือกจุดที่มีพิกัด'
          : reason === 'PICKUP_LOCATION_NOT_RESOLVED'
            ? 'ค้นหาจุดรับจริงไม่ได้ กรุณาระบุชื่อสถานที่และพื้นที่ให้ชัดเจน'
            : reason.includes('ACTIVE_ORDER_EXISTS')
              ? 'บัญชีนี้มีออเดอร์ที่กำลังดำเนินการอยู่ กรุณาไปหน้าเดินทางเพื่อดูหรือยกเลิกออเดอร์เดิมก่อน'
              : reason.includes('AUTHENTICATED_PASSENGER_REQUIRED') || reason.includes('AUTH_REQUIRED')
                ? 'เซสชันเข้าสู่ระบบหมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่'
                : reason.includes('ORDER_STORE_UNAVAILABLE')
                  ? 'เชื่อมต่อฐานข้อมูลออเดอร์ไม่ได้ กรุณาตรวจ Firebase Admin และ FIRESTORE_DATABASE_ID ในระบบ Deploy'
                  : `สร้างออเดอร์ไม่สำเร็จ${reason ? ` (${reason.replace('ORDER_CREATE_FAILED:', '')})` : ''}`;
      setBookingError(message);
    } finally {
      setIsCreatingRide(false);
    }
  };

  const handleCancelActiveRide = async () => {
    if (!activeLiveOrder || ['completed', 'cancelled'].includes(activeLiveOrder.status)) return;
    if (!window.confirm('ยืนยันยกเลิกการเรียกรถรายการนี้?')) return;
    setBookingError(null);
    try {
      const cancelled = await cancelLiveOrder(activeLiveOrder.id);
      if (cancelled) setActiveLiveOrder(cancelled);
      setCurrentMatchedDriver(null);
      if (audioEnabled) speakThaiText('ยกเลิกการเรียกรถเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Cancel ride failed:', error);
      window.alert(`ยกเลิกการเรียกรถไม่สำเร็จ (${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'})`);
    }
  };

  useEffect(() => {
    let active = true;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    void loadProfileCustomization('customer').then((saved) => {
      if (active && saved) setPassengerProfileData(saved);
    }).catch((err) => console.warn('[Profile persistence] load failed:', err));

    const loadMyListings = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const response = await fetch('/api/shop/listings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { listings?: any[] };
        if (!active) return;
        const mine = (payload.listings || [])
          .filter(item => item.sellerUserId === uid)
          .map(item => ({
            id: String(item.id),
            name: String(item.title || ''),
            price: Number(item.price || 0),
            rating: Number(item.rating || 0),
            sales: Number(item.salesCount || 0),
            tag: String(item.category || 'second_hand'),
            icon: String(item.imageIcon || '📦'),
            imageUrl: item.imageUrl || undefined,
            condition: item.condition,
            description: item.description,
            aiVerified: item.isAiVerified === true,
            sellerUid: uid,
          }));
        setC2cItems(mine);
      } catch (err) {
        console.warn('[Marketplace persistence] load failed:', err);
      }
    };
    void loadMyListings();
    return () => { active = false; };
  }, []);

  const handleAddC2c = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    if (!passengerAiVerified) {
      alert('⚠️ ข้อบังคับตลาดประชาชน: กรุณาถ่ายรูปสินค้าให้ AI Vision Guard ตรวจสอบยืนยันก่อนลงขายทุกครั้ง');
      return;
    }

    const priceNum = parseFloat(newItemPrice) || 100;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert('กรุณาเข้าสู่ระบบก่อนลงขายสินค้า');
      return;
    }

    const listingId = `c2c-${uid}-${Date.now()}`;
    const newItem = {
      id: listingId,
      sellerUid: uid,
      name: newItemName,
      price: priceNum,
      rating: 5.0,
      sales: 0,
      tag: newItemTag || 'General',
      icon: passengerAiVerified.imageIcon || newItemIcon || '📦',
      imageUrl: passengerAiVerified.imageUrl,
      isAiVerified: true
    };
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      alert('เซสชันเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      return;
    }
    const listingResponse = await fetch('/api/shop/listings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: newItem.name,
        price: newItem.price,
        stock: 1,
        category: newItem.tag,
        categoryLabel: newItem.tag,
        condition: newItemCondition || 'used',
        conditionLabel: newItemCondition || 'มือสองสภาพดี',
        description: newItemDescription,
        imageIcon: newItem.icon,
        imageUrl: newItem.imageUrl,
        isAiVerified: true,
        aiCertificateId: passengerAiVerified.certificateId,
        aiQualityScore: passengerAiVerified.qualityScore,
        tags: ['AI Verified ✨', 'C2C พลเมืองขายเอง', newItem.tag],
      }),
    });
    if (!listingResponse.ok) {
      const payload = await listingResponse.json().catch(() => ({}));
      throw new Error(payload?.error || 'บันทึกสินค้าไม่สำเร็จ');
    }
    const savedPayload = await listingResponse.json() as { listing?: any };
    const savedListing = savedPayload.listing;
    const persistedItem = {
      ...newItem,
      id: String(savedListing?.id || newItem.id),
      sellerUid: uid,
    };
    setC2cItems(prev => [persistedItem, ...prev.filter(item => item.id !== persistedItem.id)]);

    if (onAddNewCustomerItem) {
      onAddNewCustomerItem({
        id: `c2c-${Date.now()}`,
        title: newItemName,
        name: newItemName,
        price: priceNum,
        seller: passengerProfileData.displayName || currentUserSession.name || 'พลเมือง WIN',
        sellerName: passengerProfileData.displayName || currentUserSession.name || 'พลเมือง WIN',
        sellerType: 'citizen',
        sellerAvatar: passengerProfileData.avatarEmoji || '👤',
        sellerAvatarUrl: passengerProfileData.avatarUrl || '',
        sellerUid: uid,
        sellerLocationLabel: passengerProfileData.locationLabel || '',
        sellerLatitude: Number.isFinite(passengerProfileData.latitude) ? passengerProfileData.latitude : undefined,
        sellerLongitude: Number.isFinite(passengerProfileData.longitude) ? passengerProfileData.longitude : undefined,
        sellerRole: 'customer',
        sellerLevel: citizenLevel,
        sellerRating: 5.0,
        category: (newItemTag as any) || 'second_hand',
        categoryLabel: newItemTag || 'ของมือสอง & ทั่วไป',
        condition: (newItemCondition as any) || 'used',
        conditionLabel: newItemCondition || 'มือสองสภาพดี',
        imageEmoji: passengerAiVerified.imageIcon || newItemIcon || '📦',
        imageIcon: passengerAiVerified.imageIcon || newItemIcon || '📦',
        imageUrl: passengerAiVerified.imageUrl,
        isAiVerified: true,
        aiCertificateId: passengerAiVerified.certificateId,
        aiQualityScore: passengerAiVerified.qualityScore,
        aiVerifiedDate: new Date().toLocaleDateString('th-TH'),
        rating: 5.0,
        reviewsCount: 1,
        salesCount: 0,
        stock: 1,
        distanceKm: undefined,
        location: passengerProfileData.locationLabel || 'ตำแหน่งที่ผู้ขายบันทึกไว้ในโปรไฟล์',
        description: newItemDescription || 'สินค้าคุณภาพจากพลเมืองพร้อมจัดส่งด่วนด้วย WIN Knight',
        tags: ['AI Verified ✨', 'C2C พลเมืองขายเอง', newItemTag || 'ของทั่วไป', 'พร้อมส่งด่วน'],
        inStock: 1,
        featured: true,
        isCustomerListed: true
      });
    }

    setNewItemName('');
    setNewItemPrice('');
    setNewItemDescription('');
    setPassengerAiVerified(null);
    setShowAddC2cModal(false);
    handleGainCitizenXp(150, "ลงขายสินค้า C2C ที่ผ่านการยืนยันโดย AI สำเร็จ");
    if (audioEnabled) playTactileBlip(1100);
    confetti({ particleCount: 45, spread: 65, colors: ['#00D2FF', '#FFD700', '#10B981'] });
  };

  return (
    <div className="space-y-6">
      {/* XP Toast Notification */}
      {xpToast && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 font-black text-xs text-center shadow-2xl border-2 border-white/40 animate-bounce">
          {xpToast}
        </div>
      )}

      {/* Desktop Mode Toggle Bar (hidden on mobile for native app feel) */}
      <div className="hidden sm:flex items-center justify-between p-3 rounded-2xl bg-[#0B1528] border border-cyan-500/30 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#00D2FF] font-mono font-bold">📱 โหมดหน้าจอ:</span>
          <button
            onClick={() => setDeviceFrameMode(!deviceFrameMode)}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono border transition-all ${
              deviceFrameMode 
                ? 'bg-[#00D2FF]/20 border-[#00D2FF] text-white font-bold' 
                : 'bg-black/40 border-white/10 text-slate-400'
            }`}
          >
            {deviceFrameMode ? 'กรอบมือถือเสมือน (Device Frame)' : 'โหมดเต็มหน้าจอ (Full Width)'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Thai Voice Assistant Trigger Button */}
          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(1100);
              setShowVoiceModal(true);
            }}
            className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-bold text-[11px] font-mono shadow-[0_0_12px_rgba(0,210,255,0.4)] flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Mic className="w-3.5 h-3.5 animate-pulse text-slate-950" />
            <span>🎙️ สั่งการด้วยเสียง AI</span>
          </button>

          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            อัตราค่าโดยสาร: เริ่มต้น 15฿ + กองทุน 5฿
          </span>
        </div>
      </div>

      {/* Outer Mobile App Container */}
      <div className={`mx-auto transition-all ${deviceFrameMode ? 'w-full sm:max-w-md' : 'w-full max-w-4xl'}`}>
        <div 
          className={`relative bg-gradient-to-b from-[#071126] via-[#050C1B] to-[#030710] transition-all duration-300 ${
            deviceFrameMode 
              ? 'rounded-2xl sm:rounded-[40px] border border-cyan-500/30 sm:border-4 sm:border-slate-700/60 p-2.5 sm:p-4' 
              : 'rounded-2xl sm:rounded-3xl border border-white/10 p-2.5 sm:p-6'
          }`}
          style={{ boxShadow: `0 0 50px ${currentTheme.glowRgba}` }}
        >
          
          {/* Phone Speaker Notch in frame mode (only on desktop preview) */}
          {deviceFrameMode && (
            <div className="hidden sm:flex w-36 h-4 bg-slate-900 mx-auto rounded-full mb-3 items-center justify-center gap-2">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
            </div>
          )}

          {/* Internal App Header with Dynamic Accent Glow */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 px-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 overflow-hidden"
                style={{ 
                  boxShadow: `0 0 15px ${currentTheme.glowRgba}` 
                }}
              >
                <img 
                  src="/app-logo.png" 
                  alt="WINRIDER.AI" 
                  className="w-full h-full object-cover rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-xs font-black tracking-wider text-white">
                  WINRIDER<span style={{ color: currentTheme.hex }}>.AI</span>
                </span>
                <span className="block text-[9px] font-mono text-slate-300">
                  ระบบเรียกรถ & รถในฝัน
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active Color ID Indicator Badge */}
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-mono font-bold transition-all duration-300 shadow-sm"
                style={{ 
                  borderColor: currentTheme.hex, 
                  backgroundColor: currentTheme.darkRgba, 
                  color: currentTheme.hex,
                  boxShadow: `0 0 12px ${currentTheme.glowRgba}`
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: currentTheme.hex }} />
                <span>{currentTheme.colorTitle}</span>
              </div>

              {/* Voice Command Button: Customer Voice Command */}
              <button 
                id="passenger-voice-command-btn"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1200);
                  if (onOpenCustomerVoice) onOpenCustomerVoice();
                }}
                className="relative p-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-[#00D2FF] border border-[#00D2FF]/40 cursor-pointer active:scale-95 transition-all shadow-[0_0_10px_rgba(0,210,255,0.25)] flex items-center justify-center overflow-hidden group"
                title="สั่งการด้วยเสียงลูกค้าเพื่อใช้งานแอป (Customer Voice AI)"
                aria-label="สั่งการด้วยเสียงลูกค้าเพื่อใช้งานแอป"
              >
                <img 
                  src={WIN_IMAGES.cyber.voice} 
                  alt="สั่งการด้วยเสียง AI" 
                  className="w-6 h-6 rounded-md object-cover animate-pulse group-hover:scale-110 transition-transform shadow-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = WIN_IMAGES.cyber.voiceHeader;
                  }}
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_#00D2FF]" />
              </button>

              {/* Faith & Sacred Calendar */}
              <button 
                id="passenger-faith-calendar-btn"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1000);
                  setShowReligiousNotificationsModal(true);
                }}
                className="relative p-1 rounded-lg bg-amber-300/10 hover:bg-amber-300/20 text-amber-200 border border-amber-300/25 cursor-pointer active:scale-95 transition-all flex items-center justify-center overflow-hidden group shadow-[0_0_10px_rgba(252,211,77,0.15)]"
                title="ศูนย์แจ้งเตือนศาสนาและวันสำคัญทางศาสนา (Faith & Sacred Calendar)"
                aria-label="เปิดศูนย์แจ้งเตือนศาสนาและวันสำคัญ"
              >
                <img 
                  src={WIN_IMAGES.faith.religion} 
                  alt="ศูนย์แจ้งเตือนศาสนาและวันสำคัญ" 
                  className="w-6 h-6 rounded-md object-cover group-hover:scale-110 transition-transform shadow-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = WIN_IMAGES.faith.header;
                  }}
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_7px_rgba(252,211,77,0.8)]" />
              </button>

              {/* Profile Icon */}
              <button 
                id="passenger-profile-btn"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setActiveTab('profile');
                }}
                className="relative p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#FFD700] border border-[#FFD700]/30 cursor-pointer active:scale-95 transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(255,215,0,0.15)]"
                title="โปรไฟล์พลเมือง (Citizen Profile)"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center text-[10px] font-bold text-slate-950 shadow-[0_0_4px_#00D2FF]">
                  🦥
                </div>
                <User className="w-3.5 h-3.5 text-[#FFD700]" />
              </button>
            </div>
          </div>

          {/* MAIN TAB CONTENT */}
          <div className="py-4 space-y-5">
            
            {/* 1. HOME TAB */}
            {activeTab === 'home' && (
              <div className="space-y-5">
                {/* Search Bar with Dynamic Accent Border & Glow */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none" style={{ color: currentTheme.hex }}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="📍 วันนี้ไปไหนดี? (แตะเพื่อปักหมุดปลายทางทริปของคุณ)"
                    style={{ 
                      borderColor: currentTheme.hex,
                      boxShadow: `0 0 16px ${currentTheme.darkRgba}`
                    }}
                    className="w-full pl-9 pr-10 py-3 rounded-2xl bg-[#061022] border text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-inner"
                  />
                  <button 
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(850);
                      if (searchQuery) {
                        setSelectedDestination(searchQuery);
                        setShowBookingModal(true);
                      }
                    }}
                    style={{ 
                      backgroundColor: currentTheme.hex, 
                      boxShadow: `0 0 14px ${currentTheme.glowRgba}` 
                    }}
                    className="absolute inset-y-1.5 right-1.5 px-2.5 rounded-xl text-slate-950 text-xs font-black flex items-center gap-1 hover:brightness-110 transition-all active:scale-95"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Selected Dream Ride Banner (Quick Showcase) */}
                <div 
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    setActiveTab('dreamRide');
                  }}
                  className="p-3 rounded-2xl bg-gradient-to-r from-[#0E2044] via-[#091530] to-[#070D1E] border border-[#FFD700]/50 flex items-center justify-between cursor-pointer hover:border-[#FFD700] transition-all shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <DreamRideVehicleImage 
                      vehicle={selectedDreamRide} 
                      size="lg" 
                      rounded="rounded-xl" 
                      className="group-hover:scale-110 transition-transform" 
                      glowColor="#FFD700" 
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#FFD700]/20 text-[#FFD700] font-bold">
                          รถในฝันที่คุณเลือก
                        </span>
                        <span className="text-[9px] text-cyan-300 font-mono">
                          {selectedDreamRide.category === 'standard' ? 'รถทั่วไป' : selectedDreamRide.category === 'sport' ? 'บิ๊กไบค์สปอร์ต' : 'คลาสสิค'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-tight mt-0.5">{selectedDreamRide.thaiName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        ความนุ่มสบาย {selectedDreamRide.specs.comfortScore}% • {selectedDreamRide.priceAddon === 0 ? 'ฟรีไม่บวกเพิ่ม' : `+฿${selectedDreamRide.priceAddon}`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-[#FFD700] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    <span>เลือกรถอื่น</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* 3D DENSITY RADAR (2.5 KM) CUSTOMER REAL-TIME DETECTION BANNER */}
                <div 
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(950);
                    setShowCustomerRadarModal(true);
                  }}
                  style={{ 
                    borderColor: currentTheme.hex,
                    boxShadow: `0 0 24px ${currentTheme.glowRgba}`
                  }}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-[#061429] via-[#081C38] to-[#040E1E] border-2 flex items-center justify-between cursor-pointer hover:brightness-110 transition-all group active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-950 font-black text-xl transition-transform group-hover:scale-110"
                      style={{ 
                        backgroundColor: currentTheme.hex,
                        boxShadow: `0 0 16px ${currentTheme.glowRgba}`
                      }}
                    >
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border"
                          style={{ 
                            backgroundColor: currentTheme.darkRgba, 
                            borderColor: currentTheme.hex, 
                            color: currentTheme.hex 
                          }}
                        >
                          HOLOGRAPHIC RADAR (2.5 KM)
                        </span>
                        <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: currentTheme.hex }} />
                      </div>
                      <h4 className="text-xs font-black text-white leading-tight mt-1">
                        เรดาร์ 3D สแกนพี่วิน, ร้านค้า & พาร์ทเนอร์รอบตัว
                      </h4>
                      <p className="text-[10px] text-slate-300 font-mono">
                        ตรวจจับแบบเรียลไทม์ 360° รัศมี 2.5 กม. ในพิกัดของคุณ
                      </p>
                    </div>
                  </div>

                  <span 
                    className="px-3 py-1.5 rounded-xl text-slate-950 font-black text-xs font-mono shadow-md group-hover:scale-105 transition-transform flex items-center gap-1 flex-shrink-0"
                    style={{ 
                      backgroundColor: currentTheme.hex,
                      boxShadow: `0 0 12px ${currentTheme.glowRgba}`
                    }}
                  >
                    <span>เปิดเรดาร์</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* 8 CORE SERVICES ARCHITECTURE (Neon Contrast on Deep Navy with Unique Color IDs & Outer Glow) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Compass className="w-4 h-4" style={{ color: currentTheme.hex }} />
                      <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        8 เสาหลัก WINRIDER (CORE SERVICES)
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono">
                      <span className="font-bold px-1.5 py-0.2 rounded" style={{ color: currentTheme.hex, backgroundColor: currentTheme.darkRgba }}>
                        {currentTheme.colorTitle}
                      </span>
                    </div>
                  </div>

                  {/* QUICK NEON COLOR ID SWITCHER STRIP (Instant Accent Change Across All 8 Pillars) */}
                  <div className="p-2 rounded-2xl bg-[#040C1A] border border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[9px] font-mono text-slate-400 font-bold whitespace-nowrap pl-1">
                      🎨 COLOR ID:
                    </span>
                    {services.map((svc) => (
                      <button
                        key={`chip-${svc.id}`}
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setActiveServiceId(svc.id);
                          setSelectedService(svc.name);
                        }}
                        style={{
                          borderColor: svc.colorHex,
                          backgroundColor: activeServiceId === svc.id ? svc.colorHex : 'rgba(255, 255, 255, 0.05)',
                          color: activeServiceId === svc.id ? '#050B17' : svc.colorHex,
                          boxShadow: activeServiceId === svc.id ? `0 0 12px ${svc.colorGlow}` : 'none'
                        }}
                        className="px-2 py-1 rounded-xl text-[9px] font-mono font-black border transition-all whitespace-nowrap active:scale-95"
                      >
                        {svc.colorTitle}
                      </button>
                    ))}
                  </div>

                  {/* 8 CORE SERVICES GRID (2x4 on Mobile, 4x2 on Large Screen) with Neon Glow & Glass Buttons */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {services.map((svc) => {
                      const isActive = svc.id === activeServiceId;
                      return (
                        <div
                          key={svc.id}
                          id={`service-card-${svc.id}`}
                          onClick={() => handleBookService(svc)}
                          style={{
                            borderColor: isActive ? svc.colorHex : `${svc.colorHex}45`,
                            borderWidth: isActive ? '2px' : '1px',
                            boxShadow: isActive ? `0 0 24px ${svc.colorGlow}` : `0 0 10px ${svc.colorGlow.replace('0.8', '0.15').replace('0.75', '0.12')}`,
                            background: isActive 
                              ? `linear-gradient(135deg, ${svc.colorHex}22 0%, #050E1F 100%)` 
                              : '#061022'
                          }}
                          className="group relative p-3 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <div 
                            className="absolute top-0 right-0 w-20 h-20 rounded-full blur-xl pointer-events-none transition-opacity"
                            style={{ 
                              background: `radial-gradient(circle, ${svc.colorHex}30 0%, transparent 70%)`,
                              opacity: isActive ? 1 : 0.6
                            }}
                          />

                          <div>
                            {/* Top: Outer Glowing Icon + Color ID Badge */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              {/* Glowing 3D Service Image Container */}
                              <div 
                                className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:scale-110 flex-shrink-0"
                                style={{
                                  backgroundColor: `${svc.colorHex}1A`,
                                  borderColor: `${svc.colorHex}90`,
                                  borderWidth: '1.5px',
                                  boxShadow: `0 0 16px ${svc.colorGlow}`
                                }}
                              >
                                <img 
                                  src={svc.imageUrl} 
                                  alt={svc.name} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              {/* Unique Color ID Pill */}
                              <span 
                                className="text-[8px] font-mono font-black px-2 py-0.5 rounded-full truncate max-w-[100px] transition-all"
                                style={{ 
                                  backgroundColor: `${svc.colorHex}20`, 
                                  color: svc.colorHex, 
                                  border: `1px solid ${svc.colorHex}60` 
                                }}
                              >
                                {svc.colorTitle}
                              </span>
                            </div>

                            {/* Service Title & Details */}
                            <h4 
                              className="text-xs font-black transition-colors leading-tight truncate text-white"
                              style={{ color: isActive ? svc.colorHex : '#FFFFFF' }}
                            >
                              {svc.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              {svc.desc}
                            </p>
                          </div>

                          {/* Bottom: Price/ETA + Semi-transparent Glass Button with Intense Colored Border */}
                          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-1">
                            <div className="text-[9px] font-mono">
                              <span className="font-black text-[10px]" style={{ color: svc.colorHex }}>
                                {svc.priceEstimate.split(' ')[0]}
                              </span>
                              <span className="text-slate-400 text-[8px] ml-1">({svc.eta})</span>
                            </div>

                            {/* Semi-transparent Glass Action Button (กระจกใส + ขอบสีนีออนเข้มข้น) */}
                            <div 
                              style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                borderColor: svc.colorHex,
                                borderWidth: '2px',
                                boxShadow: `0 0 12px ${svc.colorGlow}`
                              }}
                              className="px-2.5 py-1 rounded-xl backdrop-blur-md text-white font-black text-[9px] font-mono flex items-center gap-1 transition-all group-hover:brightness-125"
                            >
                              <span>{isActive ? '✓ ใช้งาน' : 'เลือก'}</span>
                              <ChevronRight className="w-2.5 h-2.5" style={{ color: svc.colorHex }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <PublicDataDiscoveryCard />

                {/* PROACTIVE WIN-ALERT EVENT CARDS (Mall Sales, Pop-up Markets, Concerts, Festivals) */}
                <WinAlertEventsCard
                  audioEnabled={audioEnabled}
                  onBookEventRide={handleSelectWinAlertEvent}
                />

                {/* DESTINATION CAROUSEL — PLACE DATA ONLY */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                      ค้นพบไลฟ์สไตล์ & ปลายทางยอดนิยม
                    </h3>
                    <button
                      onClick={() => {
                        setActiveServiceId('lifestyle');
                        setSelectedService('WIN Lifestyle');
                        setShowDriverMatchingModal(true);
                      }}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      ดูทั้งหมด
                    </button>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                    {/* Google Maps Real Bangkok Locations Live Chips */}
                    {REAL_BANGKOK_LOCATIONS.slice(0, 6).map((realLoc, idx) => (
                      <div
                        key={'real-' + idx}
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          void calculateDestinationRoute(
                            realLoc.name + ' ' + realLoc.addressTh,
                            realLoc.name + ' (' + realLoc.zoneTitle + ')'
                          );
                        }}
                        className="flex-shrink-0 w-44 p-3 rounded-2xl bg-gradient-to-br from-[#0B2347] to-[#07132B] border border-cyan-500/40 hover:border-[#00D2FF] transition-all cursor-pointer snap-start"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">
                            {realLoc.category === 'mall' ? '🛍️' : realLoc.category === 'temple' ? '🪷' : realLoc.category === 'hospital' ? '🏥' : '🏢'}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {realLoc.zoneTitle}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{realLoc.name}</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1 font-mono">📍 GPS: {realLoc.lat.toFixed(3)}, {realLoc.lng.toFixed(3)}</p>
                      </div>
                    ))}

                    {destinations.map((dest, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          void calculateDestinationRoute(dest.title, dest.title);
                        }}
                        className="flex-shrink-0 w-44 p-3 rounded-2xl bg-[#0E1B36] border border-white/10 hover:border-cyan-400/50 transition-all cursor-pointer snap-start"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <CyberGraphic emoji={dest.icon} size="sm" rounded="rounded-lg" />
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            {dest.tag}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{dest.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{dest.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MASSIVE GLOWING EMERGENCY SOS BUTTON */}
                <div className="p-4 rounded-3xl bg-gradient-to-b from-rose-950/40 via-red-900/30 to-[#070D1E] border-2 border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.3)] text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                      ระบบป้องกันภัยและแจ้งเหตุฉุกเฉิน
                    </span>
                  </div>

                  <button
                    id="emergency-sos-btn"
                    onClick={handleTriggerSos}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-base shadow-[0_0_25px_rgba(225,29,72,0.8)] active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-white/40"
                  >
                    <AlertTriangle className="w-6 h-6 animate-bounce" />
                    <span>🚨 ศูนย์พยาบาล & กู้ชีพฉุกเฉิน (EMERGENCY SOS)</span>
                  </button>

                  <p className="text-[10px] text-slate-400">
                    กดเพื่อเปิดศูนย์พยาบาล & กู้ชีพฉุกเฉิน พร้อมค้นหาโรงพยาบาล หน่วยดับเพลิง และสถานีตำรวจใกล้ตำแหน่งจริง
                  </p>
                </div>
              </div>
            )}

            {/* 2. DREAM RIDES FLEET SHOWROOM TAB (Replaces petCare in bottom bar) */}
            {activeTab === 'dreamRide' && (
              <DreamRideFleetView
                audioEnabled={audioEnabled}
                selectedDreamRide={selectedDreamRide}
                onSelectDreamRide={handleSelectDreamRide}
                onBookWithDreamRide={handleBookWithDreamRide}
                onBackToMain={() => setActiveTab('home')}
              />
            )}

            {/* 2.1 PET CARE HOSPITALS & CLINICS TAB (Accessed via service grid or deep links) */}
            {activeTab === 'petCare' && (
              <PetCareHospitalSection
                audioEnabled={audioEnabled}
                onSelectHospitalForBooking={handleSelectHospitalForBooking}
                onBackToMain={() => setActiveTab('home')}
              />
            )}

            {/* 3. RIDE TRACKING TAB */}
            {activeTab === 'ride' && (
              <div className="space-y-4">
                {/* "รอรถ 3D" is a tracking screen name, not a requirement to render 3D/WebGL.
                    Keep the screen safe and useful before a ride exists. The live map is mounted
                    only after a real active order exists. */}
                {activeLiveOrder && !['completed', 'cancelled'].includes(activeLiveOrder.status) ? (
                  <ThreeDimensionalRideMap
                    selectedDreamRide={selectedDreamRide}
                    pickupLocation={activeLiveOrder.pickupLocation || preMatchingData?.family?.pickupSpecificPoint || 'กำลังรอระบุจุดรับ'}
                    destinationLocation={selectedDestination || activeLiveOrder.dropoffLocation || "ยังไม่ได้เลือกปลายทาง"}
                    pickupCoords={activeLiveOrder.pickupCoord}
                    dropoffCoords={activeLiveOrder.dropoffCoord}
                    driverName={currentMatchedDriver?.name || "กำลังรอพี่วิน"}
                    driverLevel={currentMatchedDriver?.level || 0}
                    driverEmoji={currentMatchedDriver?.avatarEmoji || "🛵"}
                    etaMinutes={ridePhase === 'picking_up' ? pickupEtaMinutes : destEtaMinutes}
                    onEmergencyClick={handleTriggerSos}
                  />
                ) : (
                  <div className="rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-b from-[#0A1633] via-[#071126] to-[#030710] p-6 text-center shadow-[0_0_35px_rgba(0,210,255,0.12)]">
                    <div className="mx-auto w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_25px_rgba(0,210,255,0.18)]">
                      <Activity className="w-10 h-10 text-cyan-300" />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">รอรถ 3D</h3>
                    <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                      หน้านี้เปิดดูได้ตลอด แม้ยังไม่ได้เรียกรถ
                    </p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      เมื่อมีงานที่กำลังรอพี่วิน ระบบจะแสดงแผนที่ ตำแหน่ง และสถานะการเดินทางจริงที่นี่
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('home')}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_18px_rgba(0,210,255,0.35)] active:scale-95 transition-all"
                    >
                      <Bike className="w-4 h-4" />
                      ไปหน้าเรียกรถ
                    </button>
                  </div>
                )}

                {activeLiveOrder && !['completed', 'cancelled'].includes(activeLiveOrder.status) && (
                  <button
                    type="button"
                    onClick={handleCancelActiveRide}
                    className="w-full rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-200 hover:bg-rose-500/20"
                  >
                    ยกเลิกการเรียกรถรายการนี้
                  </button>
                )}

                {/* Knight Driver & Chosen Dream Ride Card (ข้อมูลโปรไฟล์พี่วิน & รถในฝัน) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0D1C38] via-[#09142B] to-[#070D1E] border border-[#FFD700]/50 space-y-3 shadow-[0_0_20px_rgba(255,215,0,0.15)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <NeonProfileAvatar 
                        level={currentMatchedDriver?.level || 0} 
                        emoji={currentMatchedDriver?.avatarEmoji || "🛵"} 
                        role="driver" 
                        size="md" 
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-white flex items-center gap-1">
                            <span>{currentMatchedDriver?.name || "กำลังรอพี่วิน"}</span>
                          </h3>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/50 font-black shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                            LV.{currentMatchedDriver?.level || 0} SOVEREIGN 👑
                          </span>
                        </div>
                        <p className="text-xs text-cyan-300 font-semibold mt-0.5">
                          🏍️ ยานยนต์ในฝัน: {selectedDreamRide.thaiName}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                          <span className="text-[#FFD700] font-bold">⭐ {currentMatchedDriver?.rating || 5.0} (ยอดเยี่ยม)</span>
                          <span className="text-emerald-400">• เครดิต 850/850 (AAA)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Dream Ride Telemetry & Comfort Status */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span>ดัชนีความนุ่มสบาย:</span>
                      </span>
                      <span className="text-cyan-300 font-bold">{selectedDreamRide.specs.comfortScore}% (Ultra Smooth)</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                        <span>โหมดประสบการณ์:</span>
                      </span>
                      <span className="text-[#FFD700] font-bold">{selectedExperienceMode}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        <span>สิ่งอำนวยความสะดวก:</span>
                      </span>
                      <span className="text-slate-200 truncate max-w-[180px]">{customAmenities || 'หมวกกันน็อก Smart HUD'}</span>
                    </div>

                    {isExpressService && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span>📦 กล่องพัสดุ WIN Express (คุมอุณหภูมิ & กันกระแทก):</span>
                          <span className="font-bold text-white">+฿5.00 (ปรับลดพิเศษเพื่อประชาชน)</span>
                        </div>
                        {preMatchingData?.express?.transparentPackagingAccepted && (
                          <div className="text-[9px] text-emerald-200 flex items-center gap-1">
                            <span>✓ บรรจุภัณฑ์โปร่งใสมองเห็นสินค้าด้านในเรียบร้อย</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (audioEnabled) playTactileBlip(900);
                            setPhotoVerificationType('express_delivery');
                            setShowPhotoVerificationModal(true);
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all mt-1"
                        >
                          <Camera className="w-3 h-3" />
                          <span>📸 ตรวจสอบรูปถ่ายยืนยันการส่งพัสดุ (POD Verification)</span>
                        </button>
                      </div>
                    )}

                    {activeServiceId === 'family' && (
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[10px] text-blue-300 font-mono space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span>👨‍👩‍👧 ดูแลพิเศษ WIN Family:</span>
                          <span className="font-bold text-white">
                            {preMatchingData?.family?.passengerType === 'disabled' ? '♿ ผู้พิการ' : preMatchingData?.family?.passengerType === 'elderly' ? '👵 ผู้สูงอายุ' : '🎒 นักเรียน'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (audioEnabled) playTactileBlip(900);
                            setPhotoVerificationType('family_arrival');
                            setShowPhotoVerificationModal(true);
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all mt-1"
                        >
                          <Camera className="w-3 h-3" />
                          <span>📸 ตรวจสอบรูปถ่ายยืนยันส่งถึงที่หมายปลอดภัย (Safe Arrival)</span>
                        </button>
                      </div>
                    )}

                    {activeServiceId === 'mu' && preMatchingData?.mu?.wantBuddy && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono flex items-center justify-between">
                        <span>⛩️ บัดดี้สายมู ({preMatchingData.mu.totalDurationMinutes} นาที):</span>
                        <span className="font-bold text-white">วัตถุประสงค์: {preMatchingData.mu.travelObjective.slice(0, 18)}...</span>
                      </div>
                    )}

                    {activeServiceId === 'lifestyle' && preMatchingData?.lifestyle?.wantPhotoService && (
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-[10px] text-purple-300 font-mono flex items-center justify-between">
                        <span>📸 บริการพี่วินถ่ายรูป (10 นาที):</span>
                        <span className="font-bold text-white">{preMatchingData.lifestyle.photoTheme.slice(0, 20)}...</span>
                      </div>
                    )}

                    {activeServiceId === 'spirit' && preMatchingData?.spirit?.wantStopBuyItems && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-300 font-mono flex items-center justify-between">
                        <span>🪷 แวะซื้อของไหว้ ({preMatchingData.spirit.selectedSacredItems?.length || 0} รายการ):</span>
                        <span className="font-bold text-white">{preMatchingData.spirit.stopMarketName || 'ร้านหน้าวัด'}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Chat & Call Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        if (currentMatchedDriver?.phone) window.location.href = `tel:${currentMatchedDriver.phone}`;
                      }}
                      className="py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>โทรหาพี่วิน</span>
                    </button>
                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setShowInRideChatModal(true);
                      }}
                      className="py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ส่งข้อความ</span>
                    </button>
                  </div>
                </div>

                {/* 🤖 AI VOICE ROUTE & DISPATCH ANNOUNCER (สถานะทริป & เสียง AI นำทาง - ต่อจากกรอบข้อมูลโปรไฟล์) */}
                <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0E2A54] via-[#091C3D] to-[#061126] border-2 border-cyan-400 shadow-[0_0_30px_rgba(0,210,255,0.35)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-lg transition-all ${
                        isAiSpeaking 
                          ? 'bg-cyan-400 text-slate-950 scale-110 shadow-[0_0_20px_#00D2FF] animate-pulse' 
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      }`}>
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>สถานะทริป & เสียง AI นำทาง</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          </h4>
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                            AI DISPATCH VOICE
                          </span>
                        </div>
                        <p className="text-[10px] text-cyan-200/90 font-mono mt-0.5">
                          บอกตำแหน่งพี่วิน & คำนวณเวลาถึงจุดหมายอัตโนมัติ
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="btn-toggle-auto-voice"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(850);
                        setIsAutoVoiceAnnounce(!isAutoVoiceAnnounce);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border transition-all flex items-center gap-1 ${
                        isAutoVoiceAnnounce
                          ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400'
                          : 'bg-black/40 text-slate-400 border-white/10'
                      }`}
                      title="เปิด/ปิดการพูดประกาศอัตโนมัติ"
                    >
                      {isAutoVoiceAnnounce ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                      <span>{isAutoVoiceAnnounce ? 'เสียง AI: เปิด' : 'เสียง AI: ปิด'}</span>
                    </button>
                  </div>

                  {/* AI Speech Bubble with Waveform */}
                  <div className="p-3 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-2">
                    <div className="flex items-start gap-2 text-xs text-slate-200">
                      <Volume1 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isAiSpeaking ? 'text-cyan-400 animate-bounce' : 'text-slate-400'}`} />
                      <p className="font-mono leading-relaxed text-[11px] text-cyan-100">
                        {aiSpeechText}
                      </p>
                    </div>

                    {/* Animated Audio Waveform */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        {[40, 70, 30, 90, 50, 80, 60, 100, 45, 85, 35, 75].map((height, i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full transition-all duration-150 ${
                              isAiSpeaking ? 'bg-cyan-400' : 'bg-slate-700'
                            }`}
                            style={{
                              height: isAiSpeaking ? `${Math.max(4, Math.round(height * 0.22))}px` : '4px',
                              animationDelay: `${i * 0.08}s`
                            }}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        id="btn-speak-ai-status"
                        onClick={() => speakRideAiAnnouncement()}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs font-mono shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-slate-950" />
                        <span>🔊 กดฟังเสียง AI ตอนนี้</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 font-mono">
                    {/* In-Ride Tactical Actions: Chat, PromptPay QR, Real GPS Navigation */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(880);
                          setShowInRideChatModal(true);
                        }}
                        className="p-2.5 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,210,255,0.15)]"
                      >
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        <span className="text-[11px] whitespace-nowrap">แชทกับพี่วิน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(920);
                          setShowPromptPayModal(true);
                        }}
                        className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-500/20 hover:from-blue-600/30 hover:to-cyan-500/30 border border-blue-400/40 text-blue-300 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                      >
                        <QrCode className="w-4 h-4 text-cyan-300" />
                        <span className="text-[11px] whitespace-nowrap">พร้อมเพย์ QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(950);
                          setShowRealGpsModal(true);
                        }}
                        className="p-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      >
                        <Compass className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] whitespace-nowrap">GPS จริง</span>
                      </button>
                    </div>

                    {/* Trip Summary & 2-Baht Fund Receipt Launcher */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(950);
                          setShowReceiptModal(true);
                        }}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#FFD700]/20 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/30 border border-[#FFD700]/40 text-[#FFD700] text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.15)] active:scale-98 transition-all"
                      >
                        <Sparkles className="w-4 h-4 text-[#FFD700]" />
                        <span>🧾 ดูใบเสร็จ & การจัดสรรเงินเข้ากองทุน 2 บาท (Receipt Breakdown)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. WIN SHOP TAB */}
            {activeTab === 'shop' && (
              <div className="space-y-4">
                {/* Top Back to Home Action Bar */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-black/40 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(900);
                      setActiveTab('home');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold font-mono flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <span>← กลับหน้าหลัก (Home)</span>
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono">
                    🛡️ WIN OFFICIAL SHOP
                  </span>
                </div>

                {/* WIN SHOP is reserved for official equipment. Community commerce has its own market. */}
                <div className="flex items-center gap-2 rounded-2xl bg-black/40 p-1 border border-white/10">
                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      setShopSubTab('official');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      shopSubTab === 'official'
                        ? 'bg-[#00D2FF] text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🛡️ อุปกรณ์ทางการ (WIN OFFICIAL)
                  </button>
                  <button onClick={onNavigateToMarket} className="flex-1 rounded-xl border border-amber-400/40 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/10">
                    🛍️ เปิด WIN Street Market
                  </button>
                </div>

                {/* Official Gear Catalog */}
                {shopSubTab === 'official' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {WIN_SHOP_ITEMS.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (audioEnabled) playTactileBlip(900);
                            setSelectedShopItem(item);
                          }}
                          className="p-3.5 rounded-2xl bg-[#09152C] border border-white/10 hover:border-[#00D2FF]/60 transition-all cursor-pointer space-y-2 flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="w-14 h-14 rounded-xl bg-black/60 border border-white/15 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = WIN_IMAGES.shop.commIntercom;
                                    }}
                                  />
                                ) : (
                                  <span className="text-2xl">{item.iconEmoji}</span>
                                )}
                              </div>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-right">
                                {item.category}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-2 leading-tight">{item.name}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between font-mono">
                            <div>
                              <span className="text-[9px] text-slate-400 block">ราคาทางการ</span>
                              <span className="text-xs font-bold text-amber-400">฿{item.price.toLocaleString()}</span>
                            </div>
                            <span className="text-[10px] text-[#00D2FF] font-bold">ดูรายละเอียด →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* C2C / P2P Marketplace */}
                {shopSubTab === 'c2c' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>ตลาดสินค้าชุมชน C2C</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">ซื้อขายตรงกับเพื่อนบ้านในพื้นที่</span>
                      </div>

                      <button
                        onClick={() => setShowAddC2cModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-[#FFD700] hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ลงขายของ +</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {c2cItems.map((item) => (
                        <div key={item.id} className="p-3.5 rounded-2xl bg-[#09152C] border border-white/10 space-y-2 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/15 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = WIN_IMAGES.cyber.coins;
                                    }}
                                  />
                                ) : (
                                  <CyberGraphic emoji={item.icon} size="md" />
                                )}
                              </div>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-amber-300">
                                {item.tag}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-1 leading-tight">{item.name}</h4>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between font-mono">
                            <span className="text-xs font-bold text-amber-400">฿{item.price.toLocaleString()}</span>
                            <button
                              onClick={() => {
                                if (audioEnabled) playTactileBlip(1000);
                                alert(`🛍️ สั่งซื้อ '${item.name}' สำเร็จ! อัศวินจะไปรับสินค้าจากผู้ขายมาส่งถึงมือท่าน`);
                                confetti({ particleCount: 30, spread: 50 });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#00D2FF] text-slate-950 text-[10px] font-bold"
                            >
                              สั่งซื้อด่วน
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Back to Home Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(900);
                      setActiveTab('home');
                    }}
                    className="w-full py-3 rounded-2xl bg-black/60 hover:bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
                  >
                    <span>← กลับสู่หน้าหลัก (Home)</span>
                  </button>
                </div>
              </div>
            )}

            {/* PERSONAL NAVIGATION TAB: usable without an order */}
            {activeTab === 'navigation' && (
              <PersonalNavigationScreen role="customer" audioEnabled={audioEnabled} />
            )}

            {/* 5. PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Profile Header Card */}
                <div 
                  className={`p-5 rounded-3xl bg-gradient-to-r ${passengerProfileData.bannerGlow || 'from-[#0C1E40] via-[#091530] to-[#070D1E]'} border border-[#FFD700]/40 space-y-3 shadow-xl transition-all`}
                  style={{ borderColor: passengerProfileData.themeColor }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {passengerProfileData.avatarUrl ? (
                        <div className="relative">
                          <img 
                            src={passengerProfileData.avatarUrl} 
                            alt={passengerProfileData.displayName}
                            className="w-14 h-14 rounded-2xl object-cover border-2 shadow-lg"
                            style={{ borderColor: passengerProfileData.themeColor }}
                          />
                          <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-black/80 rounded-full text-[9px] font-bold text-cyan-300 border border-cyan-400">
                            LV.{citizenLevel}
                          </div>
                        </div>
                      ) : (
                        <NeonProfileAvatar 
                          level={citizenLevel} 
                          emoji={passengerProfileData.avatarEmoji || "🦥"} 
                          role="citizen" 
                          size="md" 
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{passengerProfileData.displayName}</h3>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-bold">
                            {currentCitizenTier.badge} {currentCitizenTier.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-cyan-200/90 font-mono mt-0.5 line-clamp-1">
                          {passengerProfileData.bioStatus}
                        </p>
                        <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                          UID: <strong className="text-cyan-300">{auth.currentUser?.uid || currentUserSession?.id || '—'}</strong>
                        </p>
                        {passengerProfileData.locationEnabled && Number.isFinite(passengerProfileData.latitude) && Number.isFinite(passengerProfileData.longitude) && (
                          <p className="text-[10px] text-emerald-300 font-mono mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{passengerProfileData.locationLabel || 'ตำแหน่งปัจจุบัน'}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(950);
                          setShowProfileCustomizerModal(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-500/30 to-blue-600/30 text-cyan-300 border border-cyan-400/60 text-[10px] font-mono font-bold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-md"
                        title="แต่งรูปโปรไฟล์ & ธีมสี"
                      >
                        <Camera className="w-3 h-3 text-cyan-400" />
                        <span>แต่งโปรไฟล์</span>
                      </button>

                      <button
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(950);
                          setTiersModalInitialRole('citizen');
                          setShowTiersModal(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold"
                      >
                        ยศ 10 ระดับ
                      </button>
                    </div>
                  </div>

                  {/* Dual-Role Status Banner for Driver acting as Citizen */}
                  {isDriver && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-cyan-950/40 to-black/60 border border-emerald-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">🛵 ↔️ 🦥</span>
                          <span className="text-xs font-bold text-emerald-300">
                            {isDriverCitizen ? 'คุณกำลังอยู่ในบทบาท: พลเมือง (พักงาน 1 วัน)' : 'บทบาทอัศวินพี่วิน'}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-400/40">
                            LV.{currentUserSession?.level ?? citizenLevel} เท่ากันทั้ง 2 บทบาท
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300">
                          {isDriverCitizen
                            ? 'วันไหนพี่วินไม่อยากวิ่งงาน สามารถใช้ชีวิตเป็นพลเมือง ซื้อของ และเรียกรถได้ตามปกติ เมื่อต้องการรับงานกดสลับกลับได้ทันที'
                            : 'คุณสามารถสลับไปรับบทเป็นพลเมืองได้เมื่อต้องการพักงาน'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          onToggleDriverPersona?.(isDriverCitizen ? 'driver' : 'customer');
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,210,255,0.4)] active:scale-95 transition-all cursor-pointer flex-shrink-0"
                      >
                        <Bike className="w-4 h-4 text-slate-950" />
                        <span>{isDriverCitizen ? 'สลับกลับเป็นโหมดพี่วิน 🛵' : '🦥 พักงาน: สลับเป็นพลเมือง'}</span>
                      </button>
                    </div>
                  )}

                  {!isDriver && (
                    <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span>บทบาทพลเมือง (Citizen) • สงวนสิทธิ์ไม่สามารถเปลี่ยนเป็นพี่วินได้</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">✓ สิทธิพลเมืองสมบูรณ์</span>
                    </div>
                  )}

                  {/* Level Progress Bar */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 font-mono">
                    <div className="flex flex-wrap items-center justify-between text-xs gap-1">
                      <span className="text-amber-300 font-bold flex items-center gap-1.5">
                        <span>หลอดเลเวลพลเมือง (LV.{citizenLevel}):</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border ${citizenDifficultyMetrics.badgeColor}`}>
                          {citizenDifficultyMetrics.difficultyLabel} ({citizenDifficultyMetrics.difficultyIndex})
                        </span>
                      </span>
                      <span className="text-white font-bold">
                        {citizenXp.toLocaleString()} / {citizenNextXp.toLocaleString()} XP
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/10 p-[1px]">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-[#00D2FF] transition-all"
                        style={{ width: `${Math.min(100, Math.max(5, (citizenXp / citizenNextXp) * 100))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>ขาดอีก {(citizenNextXp - citizenXp).toLocaleString()} XP ถึงเลเวล {citizenLevel + 1}</span>
                      <span className="text-cyan-300 font-mono text-[9px]">อัตราทดความยาก x11.0</span>
                    </div>

                  </div>
                </div>

                <ProfileQuickActions
                  role="citizen"
                  userName={passengerProfileData.displayName}
                  audioEnabled={audioEnabled}
                  questContent={<SovereignQuestCenter
                    initialRole="citizen"
                    citizenLevel={citizenLevel}
                    audioEnabled={audioEnabled}
                    onGainCitizenXp={(amount, reason) => handleGainCitizenXp(amount, reason)}
                  />}
                />

                {/* วันนี้มีของมาขาย (ใต้โปรไฟล์ลูกค้า C2C Market Action Card) */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-[#122442] via-[#0A1A33] to-[#070D1E] border-2 border-[#FFD700]/70 shadow-[0_0_25px_rgba(255,215,0,0.25)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <ShoppingBag className="w-5 h-5 text-slate-950" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white">วันนี้มีของมาขาย</h4>
                          <span className="text-[8px] font-mono font-black px-2 py-0.5 rounded-full bg-[#FFD700] text-slate-950">
                            C2C & ชุมชน
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-200/90 mt-0.5">
                          ลงขายของมือหนึ่ง/มือสอง ขนม อาหาร ของแฮนด์เมด ยาสามัญ ให้พี่วินแวะรับ
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      id="btn-customer-sell-today"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(1000);
                        setShowAddC2cModal(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#FFD700] via-amber-400 to-orange-400 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ ลงขายของวันนี้</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(900);
                        if (onNavigateToMarket) {
                          onNavigateToMarket();
                        } else {
                          setActiveTab('shop');
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-2xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>เปิดตลาดนัดชุมชน WIN Street Market →</span>
                    </button>
                  </div>
                </div>

                {/* Citizen Credit Score Card (คะแนนเครดิตการเงินพลเมือง วางต่อจาก วันนี้มีของมาขาย) */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0D2447] to-[#070E22] border-2 border-emerald-500/50 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">คะแนนเครดิตการเงินพลเมือง</span>
                    </div>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      {citizenCreditScore}/850 (AAA)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-[10px] text-slate-400 block">วงเงินเดินทางก่อนจ่ายทีหลัง:</span>
                      <span className="text-xs font-bold text-amber-400">฿{citizenRideLaterCredit.toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-[10px] text-slate-400 block">วงเงินผ่อนของ WIN Shop:</span>
                      <span className="text-xs font-bold text-cyan-300">฿{citizenShopCredit.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleExpandRideCredit}
                    className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold text-xs font-mono transition-all hover:brightness-110 active:scale-98"
                  >
                    + ขอเพิ่มวงเงินเครดิตความน่าเชื่อถือ
                  </button>
                </div>

                {/* 🛵 ACTIVE RIDE SPOTLIGHT & AI VOICE NAVIGATOR BANNER (สถานะทริป & เสียง AI นำทาง) */}
                <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0C2B54] via-[#091C3D] to-[#08152B] border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(0,210,255,0.3)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-cyan-400 text-slate-950">
                        <Bot className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-white">สถานะทริป & เสียง AI นำทาง</h4>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        </div>
                        <span className="text-[9px] font-mono text-cyan-300">
                          {ridePhase === 'picking_up' && `🛵 พี่วินกำลังเดินทางมารับคุณ • อีก ~${pickupEtaMinutes} นาที`}
                          {ridePhase === 'arrived_pickup' && `📍 พี่วินถึงจุดรับแล้ว • รอขึ้นรถ`}
                          {ridePhase === 'in_transit' && `🚀 กำลังมุ่งหน้าสู่จุดหมาย • อีก ~${destEtaMinutes} นาที (${tripDistanceKm} กม.)`}
                          {ridePhase === 'arrived_destination' && `🏁 ถึงจุดหมายเรียบร้อยแล้ว`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="btn-customer-profile-ai-voice"
                      onClick={() => speakRideAiAnnouncement()}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs font-mono shadow-md flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>🔊 ฟังเสียง AI</span>
                    </button>
                  </div>

                  {/* Trip details strip */}
                  <div className="p-2.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{currentMatchedDriver?.avatarEmoji || '🛵'}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-white text-[11px]">{currentMatchedDriver?.name || 'กำลังรอพี่วิน'}</span>
                          <span className="text-[8px] px-1 rounded bg-amber-400/20 text-amber-300">LV.{currentMatchedDriver?.level || 0}</span>
                        </div>
                        <p className="text-[9px] text-slate-400">
                          {selectedDreamRide?.thaiName || 'Honda ADV350'} • ทะเบียน 9กก-9999
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(isExpressService || activeServiceId === 'family') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (audioEnabled) playTactileBlip(800);
                            setPhotoVerificationType(isExpressService ? 'express_delivery' : 'family_arrival');
                            setShowPhotoVerificationModal(true);
                          }}
                          className="px-2 py-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-400 text-emerald-300 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" />
                          <span>ดูรูปยืนยัน</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setActiveTab('ride');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400 text-cyan-300 text-[10px] font-bold flex items-center gap-1"
                      >
                        <span>ดูแผนที่ 3D</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal Ride & Delivery History Card (Data Isolation) */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0B1A38] to-[#060D1E] border-2 border-cyan-500/40 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300">
                        <Package className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>ประวัติการเดินทางและการจัดส่งส่วนบุคคล</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                            ISOLATED DATA
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ผูกกับบัญชี: <strong className="text-cyan-300">{currentUserSession?.id || 'CTZ-ANON'}</strong>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
                      รวม {userRideHistory.length} รายการ
                    </span>
                  </div>

                  {userRideHistory.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1.5">
                      <p className="text-xs text-slate-300">ยังไม่มีประวัติการเดินทางในบัญชีส่วนบุคคลนี้</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        เมื่อคุณกดเรียกรถหรือส่งพัสดุ ทริปทั้งหมดจะถูกบันทึกแยกอิสระใน Cloud Firestore สำหรับบัญชีของคุณเท่านั้น
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 font-mono text-xs">
                      {userRideHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-400/40 transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{item.serviceIconEmoji || '🛵'}</span>
                              <span className="font-bold text-white text-xs">{item.serviceTitle}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold">฿{item.fare}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                item.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : item.status === 'in_transit' || item.status === 'picked_up'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                {item.status === 'completed' ? 'สำเร็จ' : item.status === 'in_transit' ? 'กำลังเดินทาง' : item.status === 'picked_up' ? 'รับผู้โดยสารแล้ว' : 'รอพี่วิน'}
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 space-y-0.5 pl-6 border-l-2 border-cyan-500/30">
                            <div><span className="text-slate-500">ต้นทาง:</span> {item.pickupLocation}</div>
                            <div><span className="text-slate-500">ปลายทาง:</span> {item.dropoffLocation}</div>
                            {item.driverName && (
                              <div className="text-emerald-300">
                                พี่วินผู้ดูแล: {item.driverName}{item.driverPlate ? ` (${item.driverPlate})` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Specialized Service Pre-Matching Modal for Express, MU, Lifestyle, Spirit, Family */}
      {showPreMatchingModal && (
        <SpecializedServicePreMatchingModal
          serviceId={preMatchingServiceId}
          serviceName={services.find(s => s.id === preMatchingServiceId)?.name || 'WIN Service'}
          destinationLocation={selectedDestination || ''}
          audioEnabled={audioEnabled}
          onClose={() => setShowPreMatchingModal(false)}
          onSubmit={handlePreMatchingSubmit}
        />
      )}

      {/* Proof of Delivery / Safe Arrival Photo Verification Modal */}
      {showPhotoVerificationModal && (
        <ServicePhotoVerificationModal
          type={photoVerificationType}
          serviceName={selectedService || 'WIN Service'}
          driverName={currentMatchedDriver?.name || 'กำลังรอพี่วิน'}
          driverLevel={currentMatchedDriver?.level || 0}
          recipientOrPassengerName={
            photoVerificationType === 'express_delivery'
              ? (preMatchingData?.express?.recipientName || 'ผู้รับพัสดุ')
              : (preMatchingData?.family?.dropoffContactName || preMatchingData?.family?.pickupContactName || 'ผู้รับมอบที่ปลายทาง')
          }
          locationName={selectedDestination || 'ยังไม่ได้เลือกปลายทาง'}
          audioEnabled={audioEnabled}
          onClose={() => setShowPhotoVerificationModal(false)}
        />
      )}

      {/* Driver Matching Modal */}
      {showDriverMatchingModal && (
        <DriverMatchingModal
          serviceId={activeServiceId}
          serviceName={selectedService || 'WIN KNIGHT'}
          selectedDestination={selectedDestination || ''}
          selectedDreamRide={selectedDreamRide}
          totalCalculatedFare={totalCalculatedFare}
          audioEnabled={audioEnabled}
          customerGender={customerGender}
          isAutoSelectedVehicle={!userExplicitlyChoseVehicle}
          onClose={() => setShowDriverMatchingModal(false)}
          onDestinationChange={(destination) => setSelectedDestination(destination)}
          onConfirmMatch={handleConfirmMatch}
          onSelectLifestylePlace={handleSelectLifestylePlace}
          onSelectReligiousDestination={(dest, distanceKm) => {
            setSelectedDestination(dest);
            if (typeof distanceKm === 'number') setTripDistanceKm(distanceKm);
            if (audioEnabled) playTactileBlip(900);
          }}
          onChangeCustomerGender={(gender) => setCustomerGender(gender)}
        />
      )}

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={showVoiceModal}
        audioEnabled={audioEnabled}
        onClose={() => setShowVoiceModal(false)}
        onSelectServiceByVoice={(serviceId, serviceName) => {
          setActiveServiceId(serviceId);
          setSelectedService(serviceName);
          setShowVoiceModal(false);
          setShowDriverMatchingModal(true);
        }}
        onSelectDreamRideByVoice={(searchQ) => {
          const match = DREAM_RIDES_FLEET.find(r => 
            r.thaiName.toLowerCase().includes(searchQ.toLowerCase()) || 
            r.name.toLowerCase().includes(searchQ.toLowerCase()) ||
            r.specs.brand.toLowerCase().includes(searchQ.toLowerCase())
          );
          if (match) {
            handleSelectDreamRide(match);
          }
          setShowVoiceModal(false);
          setActiveTab('dreamRide');
        }}
        onSetDestinationByVoice={(dest) => {
          setSelectedDestination(dest);
          setShowVoiceModal(false);
          setShowBookingModal(true);
        }}
        onTriggerSosByVoice={() => {
          setShowVoiceModal(false);
          handleTriggerSos();
        }}
      />

      {/* Booking Confirmation Dialog Modal with Dream Ride Customizer & Distance Fare Calculation */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0A1428] rounded-3xl border-2 border-[#00D2FF] p-5 shadow-[0_0_40px_rgba(0,210,255,0.4)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ยืนยันการจองบริการ & รถในฝัน</h3>
                  <span className="text-[10px] text-cyan-300 font-mono">SOVEREIGN DISPATCH PROTOCOL</span>
                </div>
              </div>
              <button 
                onClick={() => setShowBookingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Matched Driver Banner if Available */}
            {currentMatchedDriver && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-400/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400 shadow-md flex-shrink-0 bg-black/60">
                    <img
                      src={currentMatchedDriver.avatarUrl || '/avatars/knight.jpg'}
                      alt={currentMatchedDriver.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{currentMatchedDriver.name}</span>
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                        LV.{currentMatchedDriver.level}
                      </span>
                    </div>
                    <p className="text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{currentMatchedDriver.rating} • ขับ {currentMatchedDriver.vehicleModel}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  จับคู่แล้ว ✓
                </span>
              </div>
            )}

            {/* Service & Destination */}
            <div className="p-3 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                  {selectedService?.includes('Pet') ? '🐾 ' : selectedService?.includes('Express') ? '📦 ' : '🏍️ '}
                  {selectedService || 'WIN KNIGHT'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {isExpressService ? 'อัศวินพี่วินที่ผ่านการอนุมัติจากแอดมิน พร้อมกล่อง' : 'อัศวินพร้อมออกปฏิบัติการ'}
                </span>
              </div>
              
              <div className="text-slate-300 flex items-center justify-between">
                <div>
                  ปลายทาง: <strong className="text-white">{selectedDestination || 'ยังไม่ได้เลือกปลายทาง'}</strong>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                  {tripDistanceKm} กม.
                </span>
              </div>

              {/* Express Mandatory Box Notice */}
              {isExpressService && (
                <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-emerald-400" />
                      <span>บริการ WIN Express ค่ากล่องพิเศษ</span>
                    </span>
                    <span className="font-mono text-white">+฿5.00</span>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    กล่องมาตรฐานใส่พัสดุ, เอกสาร, อาหาร พร้อมแผ่นกันกระแทกและฉนวนควบคุมอุณหภูมิ (ปรับลดเหลือ 5 บาท เพื่อประชาชน)
                  </p>
                  {preMatchingData?.express && (
                    <div className="pt-1 border-t border-emerald-500/20 text-[10px] text-slate-200 space-y-0.5 font-mono">
                      <div>ผู้รับ: <strong className="text-white">{preMatchingData.express.recipientName}</strong> ({preMatchingData.express.recipientPhone})</div>
                      <div>ประเภทพัสดุ: <strong className="text-emerald-200">{preMatchingData.express.packageType}</strong></div>
                      <div>ข้อกำหนดบรรจุภัณฑ์โปร่งใส: <span className="text-emerald-400 font-bold">✓ ยอมรับแล้ว</span></div>
                    </div>
                  )}
                </div>
              )}

              {/* Specialized Pre-matching Summary Card in Booking Modal */}
              {preMatchingData && activeServiceId !== 'express' && (
                <div className="p-2.5 rounded-xl bg-black/50 border border-cyan-500/30 text-[11px] font-mono space-y-1">
                  <div className="text-cyan-300 font-bold flex items-center justify-between">
                    <span>ข้อมูลบริการเฉพาะทาง (Pre-Matching Details):</span>
                    <span className="text-amber-300">+฿{serviceAddonFee.toFixed(2)}</span>
                  </div>
                  {activeServiceId === 'mu' && preMatchingData.mu && (
                    <div className="text-slate-300 text-[10px] space-y-0.5">
                      <div>บัดดี้ร่วมทาง: <strong className="text-white">{preMatchingData.mu.wantBuddy ? `ต้องการ (${preMatchingData.mu.totalDurationMinutes} นาที)` : 'ส่งอย่างเดียว'}</strong></div>
                      <div>วัตถุประสงค์: <strong className="text-amber-300">{preMatchingData.mu.travelObjective}</strong></div>
                    </div>
                  )}
                  {activeServiceId === 'lifestyle' && preMatchingData.lifestyle && (
                    <div className="text-slate-300 text-[10px] space-y-0.5">
                      <div>บริการถ่ายภาพ: <strong className="text-white">{preMatchingData.lifestyle.wantPhotoService ? 'ต้องการ (10 นาที)' : 'ส่งอย่างเดียว'}</strong></div>
                      <div>ธีมภาพถ่าย: <strong className="text-purple-300">{preMatchingData.lifestyle.photoTheme}</strong></div>
                    </div>
                  )}
                  {activeServiceId === 'spirit' && preMatchingData.spirit && (
                    <div className="text-slate-300 text-[10px] space-y-0.5">
                      <div>แวะซื้อของไหว้: <strong className="text-white">{preMatchingData.spirit.selectedSacredItems?.length || 0} รายการ</strong></div>
                      <div>จุดแวะ: <strong className="text-rose-300">{preMatchingData.spirit.stopMarketName}</strong></div>
                    </div>
                  )}
                  {activeServiceId === 'family' && preMatchingData.family && (
                    <div className="text-slate-300 text-[10px] space-y-0.5">
                      <div>ประเภทผู้โดยสาร: <strong className="text-blue-300">
                        {preMatchingData.family.passengerType === 'disabled' ? '♿ ผู้พิการ' : preMatchingData.family.passengerType === 'elderly' ? '👵 ผู้สูงอายุ' : '🎒 นักเรียน/เด็ก'}
                      </strong></div>
                      <div>จุดรับ: <strong className="text-white">{preMatchingData.family.pickupSpecificPoint}</strong></div>
                      <div>ผู้ส่งมอบ: <strong className="text-white">{preMatchingData.family.pickupContactName} ({preMatchingData.family.pickupContactPhone})</strong></div>
                      <div>จุดส่ง: <strong className="text-white">{preMatchingData.family.destinationSpecificPoint}</strong></div>
                      <div>ผู้รับมอบ: <strong className="text-white">{preMatchingData.family.dropoffContactName} ({preMatchingData.family.dropoffContactPhone})</strong></div>
                      <div>ระบบส่งภาพถ่ายยืนยัน: <span className="text-emerald-400 font-bold">✓ เปิดใช้งาน</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Dream Ride Card with Quick Changer */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0F224A] to-[#071124] border border-[#FFD700]/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#FFD700]" />
                  รถในฝันประจำทริปนี้ (YOUR SELECTED DREAM RIDE)
                </span>
                <button
                  onClick={() => setIsChangingRideInModal(!isChangingRideInModal)}
                  className="text-[10px] text-cyan-300 hover:underline font-mono"
                >
                  {isChangingRideInModal ? '▲ ปิดตัวเลือก' : '▼ เปลี่ยนรถในฝัน'}
                </button>
              </div>

              {/* Collapsible Fleet Chooser inside Modal */}
              {isChangingRideInModal ? (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-black/40 rounded-xl border border-white/10">
                  {DREAM_RIDES_FLEET.map((ride) => (
                    <button
                      key={ride.id}
                      onClick={() => {
                        handleSelectDreamRide(ride);
                        setIsChangingRideInModal(false);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all text-xs ${
                        selectedDreamRide.id === ride.id
                          ? 'bg-[#00D2FF]/20 border-[#00D2FF] text-white'
                          : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <DreamRideVehicleImage vehicle={ride} size="sm" rounded="rounded-lg" />
                      <div className="font-bold truncate text-[11px] mt-1">{ride.thaiName}</div>
                      <div className="text-[9px] text-[#FFD700] font-mono">
                        {ride.priceAddon === 0 ? 'ฟรี' : `+฿${ride.priceAddon}`}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <DreamRideVehicleImage vehicle={selectedDreamRide} size="md" rounded="rounded-xl" glowColor="#FFD700" />
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">{selectedDreamRide.thaiName}</h4>
                      <span className="text-[10px] text-cyan-300 font-mono">
                        ความนุ่มสบาย {selectedDreamRide.specs.comfortScore}% • {selectedDreamRide.specs.power.split('/')[0]}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-mono block">ค่าบริการเสริม</span>
                    <span className="text-xs font-bold text-[#FFD700] font-mono">
                      {selectedDreamRide.priceAddon === 0 ? 'ฟรี' : `+฿${selectedDreamRide.priceAddon}.00`}
                    </span>
                  </div>
                </div>
              )}

              {/* Experience Mode Selector in Modal */}
              <div className="space-y-1 pt-1 border-t border-white/5">
                <span className="text-[9px] font-mono text-slate-400 block">เลือกโหมดประสบการณ์ที่คุณต้องการ:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedDreamRide.experienceModes.map((mode, mIdx) => (
                    <button
                      key={mIdx}
                      onClick={() => setSelectedExperienceMode(mode)}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-mono transition-all ${
                        selectedExperienceMode === mode
                          ? 'bg-[#FFD700] text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amenities Input & Interactive Catalog Selector */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#FFD700] flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span>สามารถเลือกสิ่งอำนวยความสะดวก (Amenities):</span>
                  </label>
                  <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    หมวกฟรี 0฿ • อื่นๆ +10-50฿
                  </span>
                </div>

                {/* Amenity Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'safety', label: '🪖 ความปลอดภัย (ฟรี 0฿)' },
                    { id: 'care', label: '🧊 สดชื่น (+10-15฿)' },
                    { id: 'tech', label: '⚡ ชาร์จ & เทค (+15-25฿)' },
                    { id: 'comfort', label: '💺 ความสบาย (+20-45฿)' },
                    { id: 'special', label: '✨ พิเศษ (+30-50฿)' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setAmenityCategoryFilter(tab.id as any);
                      }}
                      className={`px-2 py-1 rounded-lg text-[9px] font-mono whitespace-nowrap transition-all ${
                        amenityCategoryFilter === tab.id
                          ? 'bg-[#00D2FF] text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Amenity Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {AMENITIES_CATALOG
                    .filter(item => amenityCategoryFilter === 'all' || item.category === amenityCategoryFilter)
                    .map((item) => {
                      const isSelected = customAmenities
                        .toLowerCase()
                        .includes(item.name.toLowerCase()) || 
                        customAmenities.toLowerCase().includes(item.id.replace(/_/g, ' '));
                      
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (audioEnabled) playTactileBlip(item.isHelmet ? 1000 : 850);
                            setCustomAmenities(prev => {
                              const currentList = prev.split(',').map(s => s.trim()).filter(Boolean);
                              const matchIndex = currentList.findIndex(s => 
                                s.toLowerCase() === item.name.toLowerCase() ||
                                item.name.toLowerCase().includes(s.toLowerCase()) ||
                                s.toLowerCase().includes(item.name.toLowerCase())
                              );

                              if (matchIndex >= 0) {
                                currentList.splice(matchIndex, 1);
                                return currentList.join(', ');
                              } else {
                                return [...currentList, item.name].join(', ');
                              }
                            });
                          }}
                          className={`p-2 rounded-xl text-left transition-all flex items-start justify-between gap-2 border ${
                            isSelected
                              ? 'bg-cyan-950/60 border-[#00D2FF] shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                              : 'bg-black/40 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                            <div>
                              <div className="text-[11px] font-bold text-white line-clamp-1">
                                {item.name.split('(')[0]}
                              </div>
                              <div className="text-[9px] text-slate-400 line-clamp-1">
                                {item.description}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                              item.isHelmet
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40'
                            }`}>
                              {item.isHelmet ? 'ฟรี 0฿' : `+฿${item.price}`}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] text-[#00D2FF] font-bold mt-1">
                                ✓ เลือกแล้ว
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Dynamic Price Breakdown Calculation (Distance Based Starting at 15 Baht) */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-2 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between text-slate-300 font-bold border-b border-white/10 pb-1.5">
                <span className="text-cyan-300 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  สรุปรายละเอียดค่าโดยสารตามระยะทาง (Fare Breakdown)
                </span>
                <span className="text-[10px] text-emerald-300">เริ่ม 15฿</span>
              </div>

              {/* Base Fare */}
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>ค่าบริการเริ่มต้น (1 กม. แรก):</span>
                <span className="font-bold text-white">฿{baseFare.toFixed(2)}</span>
              </div>

              {/* Distance Fare */}
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>ค่าระยะทางเพิ่มเติม ({tripDistanceKm} กม.):</span>
                <span className="font-bold text-white">+฿{distanceFare.toFixed(2)}</span>
              </div>

              {/* WIN Express Box Fee if Express */}
              {isExpressService && (
                <div className="flex justify-between text-emerald-300 text-[11px] font-bold bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/30">
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-emerald-400" />
                    <span>ค่ากล่องใส่พัสดุ/เอกสาร/อาหาร (WIN Express):</span>
                  </span>
                  <span>+฿{expressBoxFee.toFixed(2)}</span>
                </div>
              )}

              {/* Service Addon Fee if any */}
              {serviceAddonFee > 0 && (
                <div className="flex justify-between text-amber-300 text-[11px] font-bold bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/30">
                  <span>ค่าบริการเสริมเฉพาะทาง ({selectedService}):</span>
                  <span>+฿{serviceAddonFee.toFixed(2)}</span>
                </div>
              )}

              {/* Dream Ride Addon */}
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>ค่าบริการรถในฝัน ({selectedDreamRide.name}):</span>
                <span className="text-[#FFD700] font-bold">
                  {selectedDreamRide.priceAddon === 0 ? '฿0.00 (ฟรี)' : `+฿${selectedDreamRide.priceAddon}.00`}
                </span>
              </div>

              {/* Dynamic Amenities Subtotal & Itemized List */}
              <div className="space-y-1 pt-1 border-t border-white/5">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span>ค่าสิ่งอำนวยความสะดวก ({amenitiesSummary.items.length} รายการ):</span>
                  </span>
                  <span className={`font-bold ${amenitiesSummary.totalPrice > 0 ? 'text-[#FFD700]' : 'text-emerald-400'}`}>
                    {amenitiesSummary.totalPrice === 0 ? '฿0.00 (ฟรี)' : `+฿${amenitiesSummary.totalPrice}.00`}
                  </span>
                </div>

                {/* Itemized list of chosen amenities */}
                {amenitiesSummary.items.length > 0 && (
                  <div className="pl-2 space-y-1 border-l-2 border-cyan-500/40 my-1 py-0.5 text-[10px]">
                    {amenitiesSummary.items.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center justify-between text-slate-400">
                        <span className="truncate max-w-[200px] flex items-center gap-1 text-slate-300">
                          <span>{item.icon || (item.isHelmet ? '🪖' : '✨')}</span>
                          <span>{item.name}</span>
                        </span>
                        <span className={item.isHelmet ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                          {item.isHelmet ? 'ฟรี 0฿' : `+฿${item.price}.00`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4-Item Customer Protection Fund Breakdown */}
              <div className="space-y-1.5 pt-1.5 border-t border-white/10">
                <div 
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setShowFundDetails(prev => !prev);
                  }}
                  className="flex items-center justify-between text-slate-300 text-[11px] cursor-pointer hover:text-cyan-200 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span>กองทุนคุ้มครองลูกค้า 100% (แจกแจง 4 รายการ):</span>
                    <span className="text-[9px] text-cyan-400 font-mono underline ml-1">
                      {showFundDetails ? 'ซ่อน ▲' : 'ดูแจกแจง ▼'}
                    </span>
                  </span>
                  <span className="text-cyan-300 font-bold">+฿5.00</span>
                </div>

                {showFundDetails && (
                  <div className="pl-3 pr-2 py-2 space-y-1.5 bg-black/50 rounded-xl border border-cyan-500/30 text-[10px] my-1 font-mono">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span>🛡️</span>
                        <span>1. ค่าประกันอุบัติเหตุคุ้มครอง 100%:</span>
                      </span>
                      <span className="text-cyan-300 font-bold">+฿2.00</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span>🪖</span>
                        <span>2. ค่าประกันอุปกรณ์ที่ให้ยืมฟรี (หมวก/เซฟตี้):</span>
                      </span>
                      <span className="text-cyan-300 font-bold">+฿1.00</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span>🛵</span>
                        <span>3. ค่าระยะทางที่พี่วินต้องเดินทางไปรับ:</span>
                      </span>
                      <span className="text-amber-300 font-bold">+฿1.00</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span>⚙️</span>
                        <span>4. ค่าดูแลระบบ & ปัญญาประดิษฐ์:</span>
                      </span>
                      <span className="text-cyan-300 font-bold">+฿1.00</span>
                    </div>
                    <div className="text-[9px] text-emerald-300 pt-1 border-t border-white/10 flex justify-between font-bold">
                      <span>✓ กองทุนสวัสดิการผู้โดยสารโปร่งใส 100%</span>
                      <span>รวม ฿5.00</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Net Total Amount */}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-cyan-500/30 font-bold">
                <div className="flex flex-col">
                  <span className="text-white">ยอดรวมสุทธิ (Total Fare):</span>
                  <span className="text-[9px] text-slate-400 font-normal">
                    คำนวณตามระยะทาง {tripDistanceKm} กม. รวมความคุ้มครองครบถ้วน
                  </span>
                </div>
                <span className="text-[#FFD700] text-lg font-black tracking-wide">
                  ฿{totalCalculatedFare.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Safety & Pricing Policy Notice */}
            <div className="text-[10px] text-slate-300 bg-cyan-950/30 border border-cyan-500/20 p-2.5 rounded-xl space-y-1 font-mono">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>นโยบายความปลอดภัย: หมวกกันน็อกทุกรุ่นให้บริการฟรี 0฿ ไม่คิดค่าบริการเพิ่ม</span>
              </div>
              <p className="text-slate-400 text-[9px] leading-relaxed">
                คำนวณราคาเริ่มต้น 15 บาท {isExpressService ? 'พร้อมค่ากล่องมาตรฐาน 20 บาท ' : ''}และประกันอุบัติเหตุคุ้มครอง 100%
              </p>
            </div>

            {bookingError && (
              <div role="alert" className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                {bookingError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmRide}
                disabled={isCreatingRide}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all"
              >
                {isCreatingRide ? <Activity className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isCreatingRide ? 'กำลังสร้างออเดอร์...' : `ยืนยันเรียกรถ (฿${totalCalculatedFare.toFixed(2)})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add C2C Item Modal (วันนี้มีของมาขาย) */}
      {showAddC2cModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form onSubmit={handleAddC2c} className="relative w-full max-w-md bg-[#0A1428] rounded-3xl border-2 border-[#FFD700] p-5 shadow-[0_0_40px_rgba(255,215,0,0.3)] space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛍️</span>
                <div>
                  <h3 className="text-sm font-bold text-[#FFD700]">วันนี้มีของมาขาย (ลงขาย C2C & ชุมชน)</h3>
                  <span className="text-[9px] text-slate-400 font-mono">WIN STREET MARKET LISTING PROTOCOL</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddC2cModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Mandatory AI Photo Verification Section */}
              <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Vision Guard (ข้อบังคับการลงรูปขาย)</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                    Mandatory AI Scan
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  ถ่ายรูปสินค้าจริงเพื่อวิเคราะห์สภาพสินค้า ความปลอดภัย และออกใบรับรอง AI Guard Certificate
                </p>

                <AIProductPhotoVerifier
                  audioEnabled={audioEnabled}
                  onVerificationComplete={(result) => {
                    setPassengerAiVerified(result);
                    if (!newItemName) setNewItemName(result.suggestedTitle);
                    if (!newItemPrice) setNewItemPrice(result.estimatedPriceRange.min.toString());
                    if (!newItemDescription) setNewItemDescription(result.detectedFeatures.join(', '));
                  }}
                  onReset={() => setPassengerAiVerified(null)}
                />
              </div>

              {/* Product catalog is populated from real merchant data. */}

              {/* Item Name */}
              <div>
                <label className="block text-slate-300 mb-1 font-bold">ชื่อสินค้าที่ต้องการขาย *:</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="เช่น ขนมปังเนยสด, เครื่องประดับเงินแท้, ยาสามัญ, ผักสลัดออร์แกนิก"
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                />
              </div>

              {/* Condition Toggle (มือหนึ่ง / มือสอง) */}
              <div>
                <label className="block text-slate-300 mb-1 font-bold">สภาพสินค้า:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['มือหนึ่ง', 'มือสอง'] as const).map(cond => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => {
                        setNewItemCondition(cond);
                        if (audioEnabled) playTactileBlip(750);
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        newItemCondition === cond
                          ? 'bg-[#FFD700] text-slate-950 border-[#FFD700]'
                          : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      {cond === 'มือหนึ่ง' ? '✨ ของใหม่ มือหนึ่ง' : '🔄 ของมือสอง สภาพดี'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-slate-300 mb-1 font-bold">หมวดหมู่สินค้า:</label>
                <select
                  value={newItemTag}
                  onChange={(e) => setNewItemTag(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                >
                  <option value="อาหาร / สตรีทฟู้ด">🍲 อาหาร / สตรีทฟู้ด</option>
                  <option value="ขนม & เบเกอรี่">🍰 ขนม & เบเกอรี่</option>
                  <option value="ผัก & ผลไม้สด">🥬 ผัก & ผลไม้สด</option>
                  <option value="เครื่องประดับ & อัญมณี">💍 เครื่องประดับ & จิวเวลรี่</option>
                  <option value="ของแฮนด์เมด & งานฝีมือ">🧶 ของแฮนด์เมด & งานฝีมือ</option>
                  <option value="งานศิลปะ & ของสะสม">🎨 งานศิลปะ & ของสะสม</option>
                  <option value="ยารักษาโรค & ยาสามัญ">💊 ยารักษาโรค & ยาสามัญประจำบ้าน</option>
                  <option value="เสื้อผ้า & แฟชั่น">👗 เสื้อผ้า & แฟชั่น</option>
                  <option value="เครื่องใช้ไฟฟ้า & ไอที">📱 เครื่องใช้ไฟฟ้า & ไอที</option>
                  <option value="ของใช้ในบ้าน">🏡 ของใช้ในบ้าน</option>
                </select>
              </div>

              {/* Emoji Icon Selector */}
              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[10px]">เลือกไอคอนสื่อสินค้า:</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {['🌶️', '🍪', '💍', '🥬', '🎨', '🧶', '💊', '👗', '🎧', '📦', '🍞', '🥤', '🪴'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewItemIcon(emoji)}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border ${
                        newItemIcon === emoji ? 'bg-[#FFD700]/30 border-[#FFD700]' : 'bg-black/40 border-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 mb-1 font-bold">รายละเอียดสินค้าสั้นๆ:</label>
                <input
                  type="text"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="เช่น ทำสดใหม่ทุกเช้า, แถมซอสพริก, นัดรับได้"
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700]"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-slate-300 mb-1 font-bold">ราคาขาย (THB) *:</label>
                <input
                  type="number"
                  required
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="เช่น 150"
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FFD700] font-mono text-base font-bold text-amber-400"
                />
              </div>

              {/* Quick Customer QR Code Generation for this listing */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFD700]/20 text-[#FFD700]">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-300 block">QR Code รับเงินส่วนตัวสำหรับสินค้านี้</span>
                    <span className="text-[10px] text-slate-400">สร้าง QR Code พร้อมเพย์/วอลเล็ตให้ผู้ซื้อสแกนระบุยอดเอง</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    setCustomerQrAmount(Number(newItemPrice) || 150);
                    setCustomerQrTitle(newItemName || 'สินค้าจาก วันนี้มีของมาขาย');
                    setShowCustomerQrModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md active:scale-95 shrink-0"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>เปิด QR Code</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddC2cModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 font-semibold text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={!passengerAiVerified}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${
                  passengerAiVerified
                    ? 'bg-gradient-to-r from-[#FFD700] via-amber-400 to-orange-400 hover:brightness-110 text-slate-950 shadow-md active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
              >
                {passengerAiVerified ? '🚀 โพสต์ขายทันที (+150 XP)' : 'กรุณาถ่ายรูปให้ AI ยืนยันก่อน'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shop Item Detail Modal */}
      {selectedShopItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#0A1428] rounded-3xl border-2 border-cyan-500/60 p-6 shadow-[0_0_40px_rgba(0,210,255,0.4)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/15 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {selectedShopItem.imageUrl ? (
                    <img
                      src={selectedShopItem.imageUrl}
                      alt={selectedShopItem.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = WIN_IMAGES.shop.commIntercom;
                      }}
                    />
                  ) : (
                    <span className="text-2xl">{selectedShopItem.iconEmoji}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{selectedShopItem.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedShopItem.code}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedShopItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Product Image Spotlight Showcase */}
            {selectedShopItem.imageUrl && (
              <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-cyan-500/30 relative group shadow-lg">
                <img
                  src={selectedShopItem.imageUrl}
                  alt={selectedShopItem.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = WIN_IMAGES.shop.commIntercom;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1428] via-transparent to-black/20 pointer-events-none" />
                <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm border border-cyan-400/40 text-[10px] font-mono text-cyan-300 font-bold">
                  {selectedShopItem.category}
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">{selectedShopItem.description}</p>

              <div className="p-3 rounded-2xl bg-[#070D1E] border border-white/10 space-y-1.5">
                <h4 className="text-[10px] font-mono font-bold text-cyan-400 uppercase">คุณสมบัติเด่น (KEY SPECS)</h4>
                <ul className="space-y-1">
                  {selectedShopItem.keySpecs.map((spec, sIdx) => (
                    <li key={sIdx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                      <span className="text-cyan-400">•</span>
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                <strong>จุดเด่นทางยุทธวิธี:</strong> {selectedShopItem.tacticalAdvantage}
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400">ราคาทางการ</span>
                  <div className="text-base font-black text-amber-400">฿{selectedShopItem.price.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">สิทธิผ่อนชำระ</span>
                  <div className="text-xs font-bold text-cyan-300">{selectedShopItem.installment}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedShopItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 font-semibold text-xs"
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1100);
                  alert(`🛒 สั่งซื้อ '${selectedShopItem.name}' สำเร็จ!\nระบบได้ส่งคำสั่งซื้อไปยังคลังยุทธภัณฑ์กลางเรียบร้อย`);
                  setSelectedShopItem(null);
                  confetti({ particleCount: 35, spread: 55, colors: ['#00D2FF', '#FFD700'] });
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-bold text-xs shadow-md"
              >
                ยืนยันสั่งซื้อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10-TIER SOVEREIGN CODEX MODAL */}
      <SovereignTiersModal
        isOpen={showTiersModal}
        onClose={() => setShowTiersModal(false)}
        initialRole={tiersModalInitialRole}
        currentLevel={citizenLevel}
        audioEnabled={audioEnabled}
        
      />

      {/* 3D DENSITY RADAR OVERLAY MODAL (2.5 KM) FOR CUSTOMER */}
      {showCustomerRadarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <DensityRadarOverlay
              targetPerspective="passenger"
              radiusKm={2.5}
              audioEnabled={audioEnabled}
              onSelectDestinationForRide={handleSelectRadarDestination}
              onBackToHome={() => setShowCustomerRadarModal(false)}
            />
          </div>
        </div>
      )}

      {/* SPECIALIZED SERVICES PRE-MATCHING MODAL (WIN Express, WIN MU BUDDY, etc.) */}
      {showPreMatchingModal && (
        <SpecializedServicePreMatchingModal
          serviceId={preMatchingServiceId}
          serviceName={selectedService || 'บริการเฉพาะทาง'}
          destinationLocation={selectedDestination || ''}
          audioEnabled={audioEnabled}
          onClose={() => setShowPreMatchingModal(false)}
          onSubmit={(data, calculatedAddonFee) => {
            setPreMatchingData(data);
            setServiceAddonFee(calculatedAddonFee);
            setShowPreMatchingModal(false);
            if (audioEnabled) {
              playTactileBlip(1000);
              speakThaiText(`บันทึกข้อมูลบริการ ${selectedService} เรียบร้อยแล้ว ระบบเริ่มค้นหาพี่วินทันทีค่ะ`);
            }
            setShowDriverMatchingModal(true);
          }}
        />
      )}

      {showExpressAiVerifier && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto">
            <AIProductPhotoVerifier
              audioEnabled={audioEnabled}
              initialItemName="WIN Express พัสดุ"
              initialCategory="พัสดุ / สิ่งของสำหรับจัดส่ง"
              onVerificationComplete={(result) => {
                if (!result.isVerified) return;
                setExpressAiVerification(result);
                setShowExpressAiVerifier(false);
                setPreMatchingServiceId('express');
                setShowPreMatchingModal(true);
                if (audioEnabled) speakThaiText('ตรวจสอบพัสดุผ่านแล้ว กรุณากรอกข้อมูลผู้รับและปลายทางเพื่อเรียกพี่วินค่ะ');
              }}
            />
          </div>
        </div>
      )}

      {/* SERVICE PHOTO VERIFICATION MODAL (ตรวจรูปส่งพัสดุ / ส่งเด็กถึงที่หมาย) */}
      {showPhotoVerificationModal && (
        <ServicePhotoVerificationModal
          type={photoVerificationType}
          audioEnabled={audioEnabled}
          onClose={() => setShowPhotoVerificationModal(false)}
          onConfirm={(imgUrl) => {
            setShowPhotoVerificationModal(false);
            if (audioEnabled) {
              playTactileBlip(1100);
              speakThaiText("ยืนยันรูปถ่ายหลักฐานความปลอดภัยสำเร็จ บันทึกเข้าระบบเรียบร้อยแล้วค่ะ");
            }
            confetti({ particleCount: 50, spread: 70, colors: ['#00D2FF', '#10B981', '#FFD700'] });
          }}
        />
      )}

      {/* Customer Custom QR Code Modal for วันนี้มีของมาขาย (ระบุจำนวนเงินเองได้) */}
      <CustomerPaymentQrCodeModal
        isOpen={showCustomerQrModal}
        onClose={() => setShowCustomerQrModal(false)}
        customerName="คุณลูกค้า (ผู้ขายชุมชน C2C)"
        defaultItemTitle={customerQrTitle}
        defaultAmount={customerQrAmount}
        audioEnabled={audioEnabled}
      />

      {/* TRIP SUMMARY & 2-BAHT WELFARE FUND RECEIPT MODAL */}
      {activeLiveOrder && (
        <TripSummaryReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          order={activeLiveOrder}
          audioEnabled={audioEnabled}
        />
      )}

      {/* PROMPTPAY EMVCo PAYMENT MODAL */}
      <PromptPayPaymentModal
        isOpen={showPromptPayModal}
        onClose={() => setShowPromptPayModal(false)}
        orderId={activeLiveOrder?.id || 'RIDE-' + Date.now().toString().slice(-4)}
        payeeName={currentMatchedDriver?.name || 'ผู้รับเงินที่ระบบกำหนด'}
        promptPayId={activeLiveOrder?.driverPhone?.replace(/[^0-9]/g, '') || ''}
        amount={activeLiveOrder?.fare || totalCalculatedFare || 45}
        tipAmount={activeLiveOrder?.tipAmount || 0}
        audioEnabled={audioEnabled}
        onPaymentConfirmed={() => {
          setShowPromptPayModal(false);
          setShowReceiptModal(true);
        }}
      />

      {/* IN-RIDE DIRECT CHAT MODAL */}
      <InRideDirectChatModal
        isOpen={showInRideChatModal}
        onClose={() => setShowInRideChatModal(false)}
        orderId={activeLiveOrder?.id || 'ACTIVE-RIDE'}
        currentUserRole="passenger"
        currentUserName="คุณอารียา (ผู้โดยสาร)"
        otherPartyName={currentMatchedDriver?.name || 'พี่วินอัศวิน'}
        audioEnabled={audioEnabled}
      />

      {/* REAL GPS SATELLITE MAP MODAL */}
<RealGpsMapModal
  isOpen={showRealGpsModal}
  onClose={() => setShowRealGpsModal(false)}
  rideId={activeLiveOrder?.id}
  driverUserId={activeLiveOrder?.driverUserId}
  driverName={activeLiveOrder?.driverName || currentMatchedDriver?.name || 'พี่วิน'}
  passengerName={passengerProfileData.displayName || currentUserSession?.name || 'คุณ'}
  pickupAddress={activeLiveOrder?.pickupLocation || ''}
  pickupCoords={activeLiveOrder?.pickupCoord ? { latitude: activeLiveOrder.pickupCoord.lat, longitude: activeLiveOrder.pickupCoord.lng } : undefined}
  destinationTitle={activeLiveOrder?.dropoffLocation || selectedDestination || 'ยังไม่ได้เลือกปลายทาง'}
  destinationCoords={
    activeLiveOrder?.dropoffCoord
      ? { latitude: activeLiveOrder.dropoffCoord.lat, longitude: activeLiveOrder.dropoffCoord.lng }
      : undefined
  }
  audioEnabled={audioEnabled}
/>

      {/* PROFILE CUSTOMIZER MODAL */}
      <ProfileCustomizerModal
        isOpen={showProfileCustomizerModal}
        onClose={() => setShowProfileCustomizerModal(false)}
        currentData={passengerProfileData}
        role="customer"
        onSave={(updated) => setPassengerProfileData(updated)}
        audioEnabled={audioEnabled}
      />

      <ReligiousNotificationsModal
        isOpen={showReligiousNotificationsModal}
        onClose={() => setShowReligiousNotificationsModal(false)}
      />
    </div>
  );
};
