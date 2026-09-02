import React, { useState, useMemo } from 'react';
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
import { PET_HOSPITALS_AND_CLINICS, PetHospitalClinic, WIN_PET_CARE_REQUIREMENTS } from '../data/petHospitalData';
import { getCitizenTier, CITIZEN_10_TIERS, calculateLevelMaxXp, getLevelDifficultyMetrics } from '../data/tierHierarchyData';
import { DriverMatchingModal } from './DriverMatchingModal';
import { VoiceAssistantModal } from './VoiceAssistantModal';
import { SovereignQuestCenter } from './SovereignQuestCenter';
import { LIFESTYLE_PLACES } from '../data/lifestyleData';
import { REAL_BANGKOK_LOCATIONS, RealBangkokLocation } from '../data/realBangkokLocations';
import { playTactileBlip, playRadarScan, playEngineRev, speakThaiText } from '../utils/audio';
import { AIProductPhotoVerifier, AIVerificationResult } from './AIProductPhotoVerifier';
import { SpecializedServicePreMatchingModal, SpecializedPreMatchingData } from './SpecializedServicePreMatchingModal';
import { ServicePhotoVerificationModal } from './ServicePhotoVerificationModal';
import { CustomerPaymentQrCodeModal } from './CustomerPaymentQrCodeModal';
import confetti from 'canvas-confetti';
import { 
  Shield, 
  ShieldCheck,
  MapPin, 
  Search, 
  Bell, 
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
  Coins,
  Award,
  Mic,
  Package,
  UserCheck,
  QrCode
} from 'lucide-react';

interface PassengerAppViewProps {
  audioEnabled: boolean;
  onOpenWinBuddy?: () => void;
  onNavigateToMarket?: () => void;
  onAddNewCustomerItem?: (item: any) => void;
}

export const PassengerAppView: React.FC<PassengerAppViewProps> = ({ 
  audioEnabled, 
  onOpenWinBuddy,
  onNavigateToMarket,
  onAddNewCustomerItem
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'dreamRide' | 'petCare' | 'ride' | 'shop' | 'profile'>('home');
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
  const [isSosActive, setIsSosActive] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDriverMatchingModal, setShowDriverMatchingModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showCustomerRadarModal, setShowCustomerRadarModal] = useState(false);
  const [showFundDetails, setShowFundDetails] = useState(true);
  const [, setBookingConfirmed] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string | null>('อาคาร Exchange Tower อโศก');
  const [tripDistanceKm, setTripDistanceKm] = useState<number>(2.4);
  const [deviceFrameMode, setDeviceFrameMode] = useState(true);
  const [currentMatchedDriver, setCurrentMatchedDriver] = useState<MatchedDriver | null>(null);

  // --- Real-Time Active Ride & AI Voice Announcer System ---
  const [ridePhase, setRidePhase] = useState<'picking_up' | 'arrived_pickup' | 'in_transit' | 'arrived_destination'>('picking_up');
  const [pickupEtaMinutes, setPickupEtaMinutes] = useState<number>(2.2);
  const [destEtaMinutes, setDestEtaMinutes] = useState<number>(5.8);
  const [remainingDistMeters, setRemainingDistMeters] = useState<number>(650);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isAutoVoiceAnnounce, setIsAutoVoiceAnnounce] = useState<boolean>(true);
  const [aiSpeechText, setAiSpeechText] = useState<string>('พี่วินกิตติ (LV.100) กำลังเดินทางมารับคุณที่คอนโดสุขุมวิท 39 อีกประมาณ 2.2 นาทีถึงค่ะ');

  // AI Voice Announcement Dispatcher
  const speakRideAiAnnouncement = (phaseOverride?: 'picking_up' | 'arrived_pickup' | 'in_transit' | 'arrived_destination') => {
    const targetPhase = phaseOverride || ridePhase;
    const driverName = currentMatchedDriver?.name || 'กิตติ อินทะสร้อย';
    const driverLvl = currentMatchedDriver?.level || 100;
    const vehicle = selectedDreamRide?.thaiName || 'Honda ADV350 Custom Stealth';
    const pickupLoc = 'หน้าคอนโดสุขุมวิท 39 (พร้อมพงษ์)';
    const destLoc = selectedDestination || 'อาคาร Exchange Tower อโศก';

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

  // Switch phase handler with optional auto voice
  const handleSwitchRidePhase = (newPhase: 'picking_up' | 'arrived_pickup' | 'in_transit' | 'arrived_destination') => {
    if (audioEnabled) playTactileBlip(950);
    setRidePhase(newPhase);
    if (isAutoVoiceAnnounce) {
      speakRideAiAnnouncement(newPhase);
    }
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

  const currentCitizenTier = useMemo(() => getCitizenTier(citizenLevel), [citizenLevel]);
  const citizenDifficultyMetrics = useMemo(() => getLevelDifficultyMetrics(citizenLevel), [citizenLevel]);

  // --- Citizen Financial Credit Score System ---
  const [citizenCreditScore, setCitizenCreditScore] = useState<number>(815);
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

  const baseFare = 15.0; // คำนวณค่าโดยสารตามระยะทางเริ่มต้น 15 บาท
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
  const [showPhotoVerificationModal, setShowPhotoVerificationModal] = useState(false);
  const [photoVerificationType, setPhotoVerificationType] = useState<'express_delivery' | 'family_arrival'>('express_delivery');

  const totalCalculatedFare = useMemo(() => {
    const dreamRideAddon = selectedDreamRide.priceAddon;
    const amenitiesAddon = amenitiesSummary.totalPrice;
    const customerProtectionFund = 5.0; // กองทุนคุ้มครองผู้โดยสาร 5 บาท (4 รายการ)
    return baseFare + distanceFare + expressBoxFee + dreamRideAddon + amenitiesAddon + customerProtectionFund + serviceAddonFee;
  }, [baseFare, distanceFare, expressBoxFee, selectedDreamRide.priceAddon, amenitiesSummary.totalPrice, serviceAddonFee]);

  // C2C Marketplace state
  const [c2cItems, setC2cItems] = useState([
    { id: '1', name: 'น้ำพริกกรอบสูตรเด็ดคุณแม่ (Crispy Chili Snack)', price: 150, rating: 4.9, sales: 84, tag: 'Homemade Food', icon: '🌶️' },
    { id: '2', name: 'Sony WH-1000XM5 Wireless Headphones (สภาพ 99%)', price: 8500, rating: 5.0, sales: 1, tag: 'Electronics', icon: '🎧' },
    { id: '3', name: 'ผ้าไหมมัดหมี่สุรินทร์แท้ ทอมือ (Royal Silk Scarf)', price: 500, rating: 4.8, sales: 12, tag: 'Handcraft', icon: '🧣' },
    { id: '4', name: 'คุกกี้เนยสดดาร์กช็อกโกแลตโฮมเมด', price: 85, rating: 5.0, sales: 42, tag: 'Bakery', icon: '🍪' },
  ]);
  const [showAddC2cModal, setShowAddC2cModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemTag, setNewItemTag] = useState('อาหาร / สตรีทฟู้ด');
  const [newItemCondition, setNewItemCondition] = useState<'มือหนึ่ง' | 'มือสอง'>('มือสอง');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('📦');
  const [passengerAiVerified, setPassengerAiVerified] = useState<AIVerificationResult | null>(null);
  const [earnings, setEarnings] = useState(12750);

  // New Comprehensive Services Array based on User Specifications with clear Action vs Info separation
  const services = [
    {
      id: 'knight',
      name: 'WIN KNIGHT',
      nameEn: 'WIN KNIGHT (อัศวินขับขี่)',
      desc: 'อัศวินประจำตัวพร้อมพาหนะที่คุณเลือก ทั่วกรุงเทพฯ เริ่มต้น 15฿ ปลอดภัย 100%',
      icon: <Shield className="w-6 h-6 text-[#00D2FF]" />,
      badge: 'เริ่ม 15฿',
      bgGlow: 'from-[#00D2FF]/20 to-transparent',
      eta: '2-3 นาที',
      priceEstimate: '฿15 - ฿85',
      iconEmoji: '🛡️ 🏍️',
      actionText: '⚡ กดเรียกอัศวินทันที',
      actionGradient: 'from-cyan-400 via-blue-500 to-indigo-600',
      actionTextGlow: 'shadow-[0_0_12px_rgba(0,210,255,0.4)]',
      infoData: 'ℹ️ ข้อมูล: มาตรฐานความปลอดภัย 100% • เริ่ม 15฿'
    },
    {
      id: 'express',
      name: 'WIN Express',
      nameEn: 'WIN Express (พัสดุ/เอกสาร/อาหาร)',
      desc: 'ส่งด่วนใน 30 นาที ปรับลดค่ากล่องเหลือ 5฿ เพื่อประชาชน พี่วินเลเวล 10+ พร้อมกล่องควบคุมอุณหภูมิและกันกระแทก',
      icon: <Zap className="w-6 h-6 text-emerald-400" />,
      badge: '+5฿ ค่ากล่อง (LV.10+)',
      bgGlow: 'from-emerald-400/20 to-transparent',
      eta: '1-3 นาที',
      priceEstimate: '฿20 - ฿75',
      iconEmoji: '📦 ⚡',
      actionText: '📦 กดส่งพัสดุด่วน 30น.',
      actionGradient: 'from-emerald-400 to-teal-600',
      actionTextGlow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
      infoData: 'ℹ️ ข้อมูล: พี่วิน LV.10+ • ค่ากล่องคุมอุณหภูมิ 5฿'
    },
    {
      id: 'mu',
      name: 'WIN MU BUDDY',
      nameEn: 'WIN MU BUDDY (เพื่อนร่วมทริปสายมู)',
      desc: 'ระบบแนะนำและจับคู่พี่วินผู้หญิงที่เหมาะสม เลเวล 15+ พร้อมเส้นทางสายมูและบทสวด (ถ้าลูกค้าเป็นผู้ชายระบบจะแนะนำพี่วินผู้ชายให้ หรือเลือกเองพร้อมระบบขอความสมัครใจและคุยรายละเอียดก่อนเริ่มงาน)',
      icon: <Sparkles className="w-6 h-6 text-[#FFD700]" />,
      badge: 'พี่วินผู้หญิง LV.15+ (ชายจับคู่ชาย)',
      bgGlow: 'from-[#FFD700]/20 to-transparent',
      eta: '4-8 นาที',
      priceEstimate: '฿45 - ฿180',
      iconEmoji: '⛩️ 🪔',
      actionText: '⛩️ กดจับคู่ทริปสายมู',
      actionGradient: 'from-amber-400 to-yellow-500',
      actionTextGlow: 'shadow-[0_0_12px_rgba(255,215,0,0.4)]',
      infoData: 'ℹ️ ข้อมูล: คัดกรองพี่วินหญิง LV.15+ (ชายคู่ชาย) • พร้อมบทสวด'
    },
    {
      id: 'lifestyle',
      name: 'WIN Lifestyle',
      nameEn: 'WIN Lifestyle (กิน ดื่ม เที่ยว คาเฟ่)',
      desc: 'แนะนำร้านอาหารเด็ด คาเฟ่ ผับบาร์ ร้านนั่งชิว คาเฟ่หมาแมว และจุดเช็คอินยอดนิยม',
      icon: <Coffee className="w-6 h-6 text-purple-400" />,
      badge: 'CAFE & BAR GUIDE',
      bgGlow: 'from-purple-400/20 to-transparent',
      eta: '2-4 นาที',
      priceEstimate: '฿25 - ฿120',
      iconEmoji: '☕ ⭐',
      actionText: '☕ กดสำรวจร้าน & เรียกรถ',
      actionGradient: 'from-purple-400 to-pink-600',
      actionTextGlow: 'shadow-[0_0_12px_rgba(192,132,252,0.4)]',
      infoData: 'ℹ️ ข้อมูล: รวมพิกัดสตรีทฟู้ด คาเฟ่ และร้านนั่งชิว'
    },
    {
      id: 'spirit',
      name: 'WIN Spirit',
      nameEn: 'WIN Spirit (ดูแลผู้สูงอายุ & พาทำศาสนกิจทุกศาสนา)',
      desc: 'คัดกรองพี่วินเลเวล 20+ ที่ผ่านการอบรมดูแลผู้สูงอายุโดยเฉพาะ พร้อมบริการพาผู้สูงอายุไปทำศาสนกิจทุกศาสนา เช่น พาคุณตาไปละหมาดที่มัสยิด, พาคุณยายไปทำบุญตักบาตร, พาไปโบสถ์คริสต์ หรือศาลเจ้า พร้อมดูแลรอรับกลับ',
      icon: <Heart className="w-6 h-6 text-rose-400" />,
      badge: 'อบรมพิเศษ LV.20+ (ทุกศาสนา)',
      bgGlow: 'from-rose-400/20 to-transparent',
      eta: '3-5 นาที',
      priceEstimate: '฿35 - ฿110',
      iconEmoji: '👵 🤲',
      actionText: '👵 กดจองดูแลผู้สูงอายุ',
      actionGradient: 'from-rose-400 to-red-600',
      actionTextGlow: 'shadow-[0_0_12px_rgba(244,63,94,0.4)]',
      infoData: 'ℹ️ ข้อมูล: อบรมดูแลผู้สูงอายุ LV.20+ • ดูแลรอรับกลับ'
    },
    {
      id: 'family',
      name: 'WIN Family',
      nameEn: 'WIN Family (รับส่งเด็ก & ครอบครัว)',
      desc: 'พี่วินเลเวล 15+ ผ่านการอบรมดูแลเด็ก รับส่งไปโรงเรียน หมวกกันน็อกเด็ก พร้อมติดตาม GPS สด',
      icon: <Users className="w-6 h-6 text-blue-400" />,
      badge: 'อบรมดูแลเด็ก LV.15+',
      bgGlow: 'from-blue-400/20 to-transparent',
      eta: '3-5 นาที',
      priceEstimate: '฿30 - ฿95',
      iconEmoji: '👨‍👩‍👧 🤝',
      actionText: '👨‍👩‍👧 กดจองรับส่งเด็ก/ครอบครัว',
      actionGradient: 'from-blue-400 to-indigo-600',
      actionTextGlow: 'shadow-[0_0_12px_rgba(96,165,250,0.4)]',
      infoData: 'ℹ️ ข้อมูล: หมวกกันน็อกเด็ก • GPS สด • อบรม LV.15+'
    },
    {
      id: 'link',
      name: 'WIN Link',
      nameEn: 'WIN Link (เชื่อมต่อ BTS/MRT/รถไฟ/รถเมล์/เรือ/รถทัวร์)',
      desc: 'เชื่อมต่อสถานีรถไฟฟ้าทั้งหมด (BTS/MRT ทุกสาย), สถานีรถไฟ, ป้ายรถเมล์, รถทัวร์, ท่าเรือ และส่งด่วนระยะสั้น-กลาง',
      icon: <Share2 className="w-6 h-6 text-cyan-300" />,
      badge: 'BTS/MRT/รถไฟ/รถเมล์/เรือ/รถทัวร์',
      bgGlow: 'from-cyan-300/20 to-transparent',
      eta: '2-3 นาที',
      priceEstimate: '฿15 - ฿65',
      iconEmoji: '🚝 🚇',
      actionText: '🚝 กดจองต่อรถไฟฟ้า/เรือ/รถไฟ',
      actionGradient: 'from-cyan-400 to-teal-500',
      actionTextGlow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)]',
      infoData: 'ℹ️ ข้อมูล: ซิงค์รอบเวลา BTS/MRT/รถเมล์/เรือ/รถไฟ'
    },
    {
      id: 'pet',
      name: 'WIN-Pet Care',
      nameEn: 'WIN-Pet Care (รพ.สัตว์ & คลินิก 24 ชม.)',
      desc: 'เบาะนิรภัยสำหรับสัตว์เลี้ยง ส่งตรงโรงพยาบาลสัตว์และคลินิกฉุกเฉิน 24 ชม. ตลอดวัน',
      icon: <Dog className="w-6 h-6 text-amber-400" />,
      badge: '24H VET CARE',
      bgGlow: 'from-amber-400/20 to-transparent',
      eta: '4-7 นาที',
      priceEstimate: '฿35 - ฿120',
      iconEmoji: '🐾 🐶',
      actionText: '🐾 กดเข้าศูนย์ รพ.สัตว์ 24 ชม.',
      actionGradient: 'from-amber-400 via-orange-500 to-yellow-500',
      actionTextGlow: 'shadow-[0_0_12px_rgba(251,191,36,0.4)]',
      infoData: 'ℹ️ ข้อมูล: เบาะนิรภัยสัตว์เลี้ยง • ส่ง รพ.สัตว์ 24 ชม.'
    },
  ];

  const destinations = [
    { title: 'BTS สยาม / สยามพารากอน (Interchange)', sub: 'ปทุมวัน • 1.8 กม.', icon: '🚝', tag: 'WIN Link BTS' },
    { title: 'สถานีกลางกรุงเทพอภิวัฒน์ / รถไฟ SRT', sub: 'จตุจักร • 6.2 กม.', icon: '🚆', tag: 'WIN Link Train' },
    { title: 'ท่าเรือสาทร (Central Pier) / BTS ตากสิน', sub: 'สาทรใต้ • 1.9 กม.', icon: '🚢', tag: 'WIN Link Pier' },
    { title: 'ป้ายรถเมล์อนุสาวรีย์ชัยสมรภูมิ (เกาะพญาไท)', sub: 'ราชวิถี • 3.4 กม.', icon: '🚌', tag: 'WIN Link Bus' },
    { title: 'ร้านกาแฟ ซัมเมอร์เรน คาเฟ่ (Summer Rain Cafe)', sub: 'สุขุมวิท 39 • 2.4 กม.', icon: '☕', tag: 'Cafe & Chill' },
    { title: 'ร้านตามสั่งป้าสมร (Street Legend)', sub: 'ตลาดพลู • 1.1 กม.', icon: '🍲', tag: 'Michelin Local' },
    { title: 'หอพักนักศึกษาจุฬาฯ U-Center', sub: 'สามย่าน • 1.8 กม.', icon: '🏢', tag: 'WIN Link ส่งข้าว' },
    { title: 'วัดกัลยาณมิตร วรมหาวิหาร (หลวงพ่อโต)', sub: 'ริมแม่น้ำเจ้าพระยา • 3.5 กม.', icon: '⛩️', tag: 'Mu-Te-Lu' },
    { title: 'โรงพยาบาลสัตว์ทองหล่อ 24 ชม.', sub: 'พระราม 9 • 3.2 กม.', icon: '🏥', tag: '24H Pet Vet' },
  ];

  const handleSelectHospitalForBooking = (hospital: PetHospitalClinic) => {
    if (audioEnabled) {
      playTactileBlip(950);
      speakThaiText(`เตรียมเรียกรถ WIN-Pet Care ส่งไป ${hospital.name}`);
    }
    setActiveServiceId('pet');
    setSelectedService('WIN-Pet Care (รพ.สัตว์ & คลินิก 24 ชม.)');
    setSelectedDestination(hospital.name);
    setSelectedPetHospital(hospital);
    setTripDistanceKm(hospital.distanceKm || 3.0);
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

    // Specialized services pre-matching modal intercept
    if (['express', 'mu', 'lifestyle', 'spirit', 'family'].includes(svc.id)) {
      setPreMatchingServiceId(svc.id);
      setShowPreMatchingModal(true);
      if (audioEnabled) {
        speakThaiText(`กรุณากรอกข้อมูลเฉพาะสำหรับบริการ ${svc.name} ก่อนเริ่มค้นหาอัศวิน`);
      }
      return;
    }

    if (audioEnabled) {
      speakThaiText(`เลือกบริการ ${svc.name} ระบบกำลังค้นหาอัศวินที่ตรงตามมาตรฐาน`);
    }
    setShowDriverMatchingModal(true);
  };

  const handlePreMatchingSubmit = (data: SpecializedPreMatchingData, addonFee: number) => {
    setPreMatchingData(data);
    setServiceAddonFee(addonFee);
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

  const handleConfirmMatch = (driver: MatchedDriver) => {
    setCurrentMatchedDriver(driver);
    setShowDriverMatchingModal(false);
    setShowBookingModal(true);
    if (audioEnabled) {
      playRadarScan();
      speakThaiText(`จับคู่กับ ${driver.name} เลเวล ${driver.level} เรียบร้อย กรุณายืนยันการเดินทาง`);
    }
  };

  const handleSelectLifestylePlace = (place: LifestylePlace) => {
    setSelectedDestination(`${place.name} (${place.area})`);
    setTripDistanceKm(place.distanceKm);
    if (audioEnabled) {
      playTactileBlip(900);
      speakThaiText(`เลือกปลายทาง ${place.name} ห่าง ${place.distanceKm} กิโลเมตร`);
    }
  };

  const handleConfirmRide = () => {
    if (audioEnabled) {
      playRadarScan();
    }
    setShowBookingModal(false);
    setBookingConfirmed(true);
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00D2FF', '#FFD700', '#FFFFFF']
    });
    setTimeout(() => {
      setActiveTab('ride');
    }, 600);
  };

  const handleTriggerSos = () => {
    if (audioEnabled) {
      playTactileBlip(400);
      speakThaiText("สัญญาณฉุกเฉิน SOS ส่งถึงศูนย์บัญชาการ Cosmo-Ko และอัศวินรอบข้างในรัศมี 1 กิโลเมตรแล้ว");
    }
    setIsSosActive(true);
    alert("🚨 สัญญาณเตือนภัย SOS ฉุกเฉินถูกส่งไปยังศูนย์บัญชาการ Cosmo-Ko และอัศวินในพื้นที่เรียบร้อย!");
    confetti({ particleCount: 30, spread: 40, colors: ['#EF4444', '#F59E0B'] });
  };

  const handleAddC2c = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    if (!passengerAiVerified) {
      alert('⚠️ ข้อบังคับตลาด WIN Street Market: กรุณาถ่ายรูปสินค้าให้ AI Vision Guard ตรวจสอบยืนยันก่อนลงขายทุกครั้ง');
      return;
    }

    const priceNum = parseFloat(newItemPrice) || 100;
    const newItem = {
      id: Date.now().toString(),
      name: newItemName,
      price: priceNum,
      rating: 5.0,
      sales: 0,
      tag: newItemTag || 'General',
      icon: passengerAiVerified.imageIcon || newItemIcon || '📦',
      imageUrl: passengerAiVerified.imageUrl,
      isAiVerified: true
    };
    setC2cItems([newItem, ...c2cItems]);

    if (onAddNewCustomerItem) {
      onAddNewCustomerItem({
        id: `c2c-${Date.now()}`,
        title: newItemName,
        name: newItemName,
        price: priceNum,
        seller: 'คุณสลอต จิตใจ (พลเมือง CTZ-999)',
        sellerName: 'คุณสลอต จิตใจ (พลเมือง CTZ-999)',
        sellerType: 'citizen',
        sellerAvatar: '👤',
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
        distanceKm: 0.8,
        location: 'เขตคลองสาน-เจริญนคร • 0.8 กม.',
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

      {/* Floating Mode Toggle Bar */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0B1528] border border-cyan-500/30 text-xs">
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

      {/* Outer Mockup Wrapper */}
      <div className={`mx-auto transition-all ${deviceFrameMode ? 'max-w-md' : 'max-w-4xl'}`}>
        <div className="relative rounded-[40px] bg-gradient-to-b from-[#0B1528] via-[#070D1E] to-[#040813] border-4 border-slate-700/60 p-4 shadow-[0_0_50px_rgba(0,210,255,0.2)]">
          
          {/* Phone Speaker Notch in frame mode */}
          {deviceFrameMode && (
            <div className="w-36 h-4 bg-slate-900 mx-auto rounded-full mb-3 flex items-center justify-center gap-2">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
            </div>
          )}

          {/* Internal App Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00D2FF] to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(0,210,255,0.5)]">
                <span className="text-sm font-black text-slate-950">W</span>
              </div>
              <div>
                <span className="text-xs font-black tracking-wider text-white">WINRIDER<span className="text-[#00D2FF]">.AI</span></span>
                <span className="block text-[9px] text-cyan-400 font-mono">ระบบเรียกรถ & รถในฝัน</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1000);
                  alert("🔔 การแจ้งเตือน: อัศวิน กิตติ อินทะสร้อย (Level 100 Sovereign) ประจำสถานีใกล้คุณ, มีโปรโมชั่นคอนเสิร์ตลด 20%");
                }}
                className="relative p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              >
                <Bell className="w-4 h-4 text-cyan-400" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-[9px] text-white font-bold flex items-center justify-center">
                  3
                </span>
              </button>

              <button 
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-1.5 p-1 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/30 hover:bg-[#FFD700]/20"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center text-[10px] font-bold text-slate-950 shadow-[0_0_8px_#00D2FF]">
                  🦥
                </div>
                <span className="text-[11px] font-semibold text-cyan-300 pr-1 hidden xs:inline">สลอต จิตใจ</span>
              </button>
            </div>
          </div>

          {/* MAIN TAB CONTENT */}
          <div className="py-4 space-y-5">
            
            {/* 1. HOME TAB */}
            {activeTab === 'home' && (
              <div className="space-y-5">
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#00D2FF]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="📍 วันนี้ไปไหนดี? (แตะเพื่อปักหมุดปลายทางทริปของคุณ)"
                    className="w-full pl-9 pr-10 py-3 rounded-2xl bg-[#0F1D38] border border-[#00D2FF]/40 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00D2FF] focus:ring-2 focus:ring-[#00D2FF]/30 shadow-inner"
                  />
                  <button 
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(850);
                      if (searchQuery) {
                        setSelectedDestination(searchQuery);
                        setShowBookingModal(true);
                      }
                    }}
                    className="absolute inset-y-1.5 right-1.5 px-2.5 rounded-xl bg-[#00D2FF] hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1"
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
                    <div className="w-11 h-11 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {selectedDreamRide.iconEmoji.split(' ')[0]}
                    </div>
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
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-[#071E3D] via-[#092B54] to-[#051429] border-2 border-[#00D2FF] flex items-center justify-between cursor-pointer hover:border-cyan-300 transition-all shadow-[0_0_20px_rgba(0,210,255,0.3)] group active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_12px_#00D2FF] group-hover:scale-110 transition-transform">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/40">
                          HOLOGRAPHIC RADAR (2.5 KM)
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      </div>
                      <h4 className="text-xs font-black text-white leading-tight mt-1">
                        เรดาร์ 3D สแกนพี่วิน, ร้านค้า & พาร์ทเนอร์รอบตัว
                      </h4>
                      <p className="text-[10px] text-cyan-200 font-mono">
                        ตรวจจับแบบเรียลไทม์ 360° รัศมี 2.5 กม. ในพิกัดของคุณ
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs font-mono shadow-md group-hover:scale-105 transition-transform flex items-center gap-1 flex-shrink-0">
                    <span>เปิดเรดาร์</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* 8 CORE SERVICES ARCHITECTURE (Compact, Tidy & Neatly Organized with Clear Action vs Info Differentiation) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        8 บริการหลัก (CORE SERVICES)
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono">
                      <span className="text-cyan-400 font-bold">⚡ กดได้</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">ℹ️ ข้อมูล</span>
                    </div>
                  </div>

                  {/* COMPACT & TIDY 2x4 (OR 4x2 ON DESKTOP) GRID */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {services.map((svc) => (
                      <div
                        key={svc.id}
                        id={`service-card-${svc.id}`}
                        onClick={() => handleBookService(svc)}
                        className="group relative p-2.5 rounded-xl bg-[#0B1528] border border-white/10 hover:border-[#00D2FF]/80 hover:bg-[#0E1E3A] transition-all cursor-pointer shadow-sm overflow-hidden flex flex-col justify-between active:scale-[0.98]"
                      >
                        <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${svc.bgGlow} rounded-full blur-lg pointer-events-none`} />

                        <div>
                          {/* Top: Icon + Info Badge */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center group-hover:border-[#00D2FF]/50 transition-colors">
                              {svc.icon}
                            </div>
                            {/* [ข้อมูล/เงื่อนไข] - สไตล์เรียบ สะอาด สบายตา */}
                            <span 
                              title={svc.infoData}
                              className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700/60 truncate max-w-[90px]"
                            >
                              ℹ️ {svc.badge}
                            </span>
                          </div>

                          {/* Title & Short Details */}
                          <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors leading-tight truncate">
                            {svc.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                            {svc.desc}
                          </p>
                        </div>

                        {/* Bottom: Price/ETA + Compact Action Pill */}
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between gap-1">
                          <div className="text-[9px] font-mono">
                            <span className="text-emerald-400 font-bold">{svc.priceEstimate.split(' ')[0]}</span>
                            <span className="text-slate-500 text-[8px] ml-1">({svc.eta})</span>
                          </div>

                          {/* [ปุ่มกดเข้าได้] - ขนาดกะทัดรัด สีสดชัดเจน */}
                          <div 
                            className={`px-2 py-0.5 rounded-lg bg-gradient-to-r ${svc.actionGradient} text-slate-950 font-black text-[9px] font-mono shadow-sm flex items-center gap-0.5 group-hover:brightness-110`}
                          >
                            <span>เรียก</span>
                            <ChevronRight className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PROACTIVE WIN-ALERT EVENT CARDS (Mall Sales, Pop-up Markets, Concerts, Festivals) */}
                <WinAlertEventsCard
                  audioEnabled={audioEnabled}
                  onBookEventRide={(event) => {
                    if (audioEnabled) playTactileBlip(1000);
                    setSelectedService('WIN KNIGHT (Special Event Dispatch)');
                    setSelectedDestination(event.venueName);
                    setShowBookingModal(true);
                  }}
                />

                {/* DESTINATION CAROUSEL & GOOGLE MAPS REAL LOCATIONS RANDOMIZER */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                      ค้นพบไลฟ์สไตล์ & ปลายทางยอดนิยม
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(900);
                          const randomLoc = REAL_BANGKOK_LOCATIONS[Math.floor(Math.random() * REAL_BANGKOK_LOCATIONS.length)];
                          setSelectedDestination(`${randomLoc.name} (${randomLoc.zoneTitle})`);
                          setShowBookingModal(true);
                          if (audioEnabled) {
                            speakThaiText(`เลือกปลายทาง Google Maps ${randomLoc.name} แล้วค่ะ`);
                          }
                        }}
                        className="px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-400/40 transition-all flex items-center gap-1"
                      >
                        <span>🗺️ สุ่มพิกัดจริง</span>
                      </button>
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
                  </div>

                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                    {/* Google Maps Real Bangkok Locations Live Chips */}
                    {REAL_BANGKOK_LOCATIONS.slice(0, 6).map((realLoc, idx) => (
                      <div
                        key={'real-' + idx}
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setSelectedDestination(`${realLoc.name} (${realLoc.zoneTitle})`);
                          setShowBookingModal(true);
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
                          setSelectedDestination(dest.title);
                          setShowBookingModal(true);
                        }}
                        className="flex-shrink-0 w-44 p-3 rounded-2xl bg-[#0E1B36] border border-white/10 hover:border-cyan-400/50 transition-all cursor-pointer snap-start"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">{dest.icon}</span>
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
                    <span>🚨 ขอความช่วยเหลือด่วน (EMERGENCY SOS)</span>
                  </button>

                  <p className="text-[10px] text-slate-400">
                    {isSosActive 
                      ? "⚠️ กำลังส่งสัญญาณฉุกเฉินไปยังศูนย์บัญชาการ Cosmo-Ko และอัศวินใกล้เคียง" 
                      : "กดปุ่มนี้เพื่อส่งสัญญาณคลื่นวิทยุฉุกเฉินให้อัศวินในรัศมี 1 กม. และศูนย์บัญชาการ Cosmo-Ko ทันที"}
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
                {/* 3D Holographic Capillary Map Navigation Component */}
                <ThreeDimensionalRideMap
                  selectedDreamRide={selectedDreamRide}
                  pickupLocation="หน้าคอนโดสุขุมวิท 39 (พร้อมพงษ์)"
                  destinationLocation={selectedDestination || "อาคาร Exchange Tower อโศก"}
                  driverName={currentMatchedDriver?.name || "กิตติ อินทะสร้อย"}
                  driverLevel={currentMatchedDriver?.level || 100}
                  driverEmoji={currentMatchedDriver?.avatarEmoji || "🦁"}
                  etaMinutes={ridePhase === 'picking_up' ? pickupEtaMinutes : destEtaMinutes}
                  onEmergencyClick={handleTriggerSos}
                />

                {/* Knight Driver & Chosen Dream Ride Card (ข้อมูลโปรไฟล์พี่วิน & รถในฝัน) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0D1C38] via-[#09142B] to-[#070D1E] border border-[#FFD700]/50 space-y-3 shadow-[0_0_20px_rgba(255,215,0,0.15)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <NeonProfileAvatar 
                        level={currentMatchedDriver?.level || 100} 
                        emoji={currentMatchedDriver?.avatarEmoji || "🦁"} 
                        role="driver" 
                        size="md" 
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-white flex items-center gap-1">
                            <span>{currentMatchedDriver?.name || "กิตติ อินทะสร้อย"}</span>
                          </h3>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/50 font-black shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                            LV.{currentMatchedDriver?.level || 100} SOVEREIGN 👑
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
                        alert(`📞 กำลังโทรติดต่อ ${currentMatchedDriver?.name || 'พี่วิน'}...`);
                      }}
                      className="py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>โทรหาพี่วิน</span>
                    </button>
                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        alert(`💬 เปิดกล่องข้อความสนทนากับ ${currentMatchedDriver?.name || 'พี่วิน'}`);
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

                  {/* Live Interactive Phase Selector (Simulator) */}
                  <div className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>ขั้นตอนการเดินทางจำลอง (สลับดูสถานะ):</span>
                      <span className="text-amber-300">คลิกเพื่อเปลี่ยนสถานะ & ฟังเสียง</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleSwitchRidePhase('picking_up')}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          ridePhase === 'picking_up'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md font-bold'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="block text-[11px]">1. 🛵 พี่วินกำลังมา</span>
                        <span className="text-[9px] text-amber-300">อีก ~{pickupEtaMinutes} นาที</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchRidePhase('arrived_pickup')}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          ridePhase === 'arrived_pickup'
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md font-bold'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="block text-[11px]">2. 📍 ถึงจุดรับแล้ว</span>
                        <span className="text-[9px] text-emerald-300">รอขึ้นรถ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchRidePhase('in_transit')}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          ridePhase === 'in_transit'
                            ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-md font-bold'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="block text-[11px]">3. 🚀 มุ่งหน้าจุดหมาย</span>
                        <span className="text-[9px] text-purple-300">อีก ~{destEtaMinutes} นาที</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchRidePhase('arrived_destination')}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          ridePhase === 'arrived_destination'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md font-bold'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="block text-[11px]">4. 🏁 ถึงปลายทาง</span>
                        <span className="text-[9px] text-amber-300">เสร็จสิ้นทริป</span>
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
                    🛍️ WIN Official & Community Shop
                  </span>
                </div>

                {/* Shop Sub-tabs */}
                <div className="flex rounded-2xl bg-black/40 p-1 border border-white/10">
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
                  <button
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      setShopSubTab('c2c');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      shopSubTab === 'c2c'
                        ? 'bg-[#FFD700] text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎁 ตลาดชุมชน (P2P / C2C)
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
                            <div className="flex items-start justify-between">
                              <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                {item.iconEmoji}
                              </div>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
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
                            <div className="flex items-start justify-between">
                              <span className="text-2xl">{item.icon}</span>
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

            {/* 5. PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Profile Header Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0C1E40] via-[#091530] to-[#070D1E] border border-[#FFD700]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <NeonProfileAvatar 
                        level={citizenLevel} 
                        emoji="🦥" 
                        role="citizen" 
                        size="md" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">คุณสลอต จิตใจ</h3>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-bold">
                            {currentCitizenTier.badge} {currentCitizenTier.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                          ID: <strong className="text-cyan-300">CTZ-SLOTH-999</strong> • เขตคลองสาน-เจริญนคร
                        </p>
                      </div>
                    </div>

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

                    {/* Quick Citizen XP Action Buttons */}
                    <div className="pt-2 border-t border-white/5 space-y-1.5 font-mono">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="text-cyan-300 font-bold">ภารกิจพลเมืองเก็บ XP ด่วน:</span>
                        <span className="text-amber-300">กดรับ XP ได้ทันที</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleGainCitizenXp(150, "เดินทางด้วย WINRIDER 1 ทริป")}
                          className="p-1.5 rounded-xl bg-black/40 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-400 text-left transition-all flex items-center justify-between"
                        >
                          <span>🛵 นั่งวินไปทำงาน</span>
                          <span className="text-cyan-300 font-bold">+150 XP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGainCitizenXp(120, "สั่งการด้วยเสียง AI Assistant")}
                          className="p-1.5 rounded-xl bg-black/40 hover:bg-purple-950/60 border border-white/10 hover:border-purple-400 text-left transition-all flex items-center justify-between"
                        >
                          <span>🎙️ สั่งเสียง AI</span>
                          <span className="text-purple-300 font-bold">+120 XP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGainCitizenXp(250, "ทริปไหว้พระสายมู WIN MU BUDDY")}
                          className="p-1.5 rounded-xl bg-black/40 hover:bg-amber-950/60 border border-white/10 hover:border-amber-400 text-left transition-all flex items-center justify-between"
                        >
                          <span>🪷 ไหว้พระสายมู</span>
                          <span className="text-amber-300 font-bold">+250 XP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGainCitizenXp(300, "พาญาติผู้ใหญ่ทำศาสนกิจ WIN Spirit")}
                          className="p-1.5 rounded-xl bg-black/40 hover:bg-emerald-950/60 border border-white/10 hover:border-emerald-400 text-left transition-all flex items-center justify-between"
                        >
                          <span>👵 WIN Spirit</span>
                          <span className="text-emerald-300 font-bold">+300 XP</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🛍️ วันนี้มีของมาขาย (ใต้โปรไฟล์ลูกค้า C2C Market Action Card) */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-[#122442] via-[#0A1A33] to-[#070D1E] border-2 border-[#FFD700]/70 shadow-[0_0_25px_rgba(255,215,0,0.25)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        🛍️
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
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="btn-customer-sell-today"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(1000);
                          setShowAddC2cModal(true);
                        }}
                        className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#FFD700] via-amber-400 to-orange-400 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ ลงขายของวันนี้</span>
                      </button>

                      <button
                        type="button"
                        id="btn-customer-qr-code"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(950);
                          setCustomerQrAmount(150);
                          setCustomerQrTitle('สินค้าจาก วันนี้มีของมาขาย');
                          setShowCustomerQrModal(true);
                        }}
                        className="py-2.5 px-3 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 border-2 border-[#FFD700] text-amber-300 hover:text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                      >
                        <QrCode className="w-4 h-4 text-[#FFD700]" />
                        <span>📱 QR Code รับเงิน (ระบุยอดเอง)</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(900);
                        if (onNavigateToMarket) {
                          onNavigateToMarket();
                        } else {
                          setActiveTab('shop');
                          setShopSubTab('c2c');
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-2xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>เปิดตลาดนัดชุมชน WIN Street Market →</span>
                    </button>
                  </div>
                </div>

                {/* 🛵 ACTIVE RIDE SPOTLIGHT & AI VOICE NAVIGATOR BANNER (สถานะทริป & เสียง AI นำทาง วางต่อจาก วันนี้มีของมาขาย) */}
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
                      <span className="text-lg">{currentMatchedDriver?.avatarEmoji || '🦁'}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-white text-[11px]">{currentMatchedDriver?.name || 'กิตติ อินทะสร้อย'}</span>
                          <span className="text-[8px] px-1 rounded bg-amber-400/20 text-amber-300">LV.{currentMatchedDriver?.level || 100}</span>
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

                {/* Sovereign Quest Center for Citizen */}
                <SovereignQuestCenter
                  initialRole="citizen"
                  citizenLevel={citizenLevel}
                  audioEnabled={audioEnabled}
                  onGainCitizenXp={(amount, reason) => handleGainCitizenXp(amount, reason)}
                />

                {/* Citizen Credit Score Card */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0D2447] to-[#070E22] border-2 border-emerald-500/50 space-y-3">
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
                    className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold text-xs font-mono transition-all"
                  >
                    + ขอเพิ่มวงเงินเครดิตความน่าเชื่อถือ
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM NAVIGATION BAR (Replaced petCare with dreamRide) */}
          <div className="grid grid-cols-5 gap-1 p-1 bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 text-center font-mono text-[9px]">
            {[
              { id: 'home', label: 'หน้าหลัก', icon: <Compass className="w-4 h-4 mx-auto" /> },
              { id: 'dreamRide', label: 'รถในฝัน', icon: <Bike className="w-4 h-4 mx-auto text-[#00D2FF]" />, isHot: true },
              { id: 'ride', label: 'รอพี่วิน (3D)', icon: <Activity className="w-4 h-4 mx-auto" /> },
              { id: 'shop', label: 'WIN SHOP', icon: <ShoppingBag className="w-4 h-4 mx-auto" /> },
              { id: 'profile', label: 'โปรไฟล์', icon: <Users className="w-4 h-4 mx-auto" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                id={`passenger-tab-${tab.id}`}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setActiveTab(tab.id as any);
                }}
                className={`relative py-1.5 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'text-[#00D2FF] bg-[#00D2FF]/10 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.isHot && (
                  <span className="absolute -top-1 right-1 px-1 py-0.2 rounded-full bg-[#FFD700] text-slate-950 font-black text-[7px] leading-tight">
                    NEW
                  </span>
                )}
                {tab.icon}
                <span className="block text-[9px] mt-0.5">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Specialized Service Pre-Matching Modal for Express, MU, Lifestyle, Spirit, Family */}
      {showPreMatchingModal && (
        <SpecializedServicePreMatchingModal
          serviceId={preMatchingServiceId}
          serviceName={services.find(s => s.id === preMatchingServiceId)?.name || 'WIN Service'}
          destinationLocation={selectedDestination || 'อาคาร Exchange Tower อโศก'}
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
          driverName={currentMatchedDriver?.name || 'กิตติ อินทะสร้อย'}
          driverLevel={currentMatchedDriver?.level || 100}
          recipientOrPassengerName={
            photoVerificationType === 'express_delivery'
              ? (preMatchingData?.express?.recipientName || 'คุณสมศรี เจริญสุข')
              : (preMatchingData?.family?.contactPersonName || 'คุณวราภรณ์ (บุตรสาว)')
          }
          locationName={selectedDestination || 'อาคาร Exchange Tower อโศก'}
          audioEnabled={audioEnabled}
          onClose={() => setShowPhotoVerificationModal(false)}
        />
      )}

      {/* Driver Matching Modal */}
      {showDriverMatchingModal && (
        <DriverMatchingModal
          serviceId={activeServiceId}
          serviceName={selectedService || 'WIN KNIGHT'}
          selectedDestination={selectedDestination || 'อาคาร Exchange Tower อโศก'}
          selectedDreamRide={selectedDreamRide}
          totalCalculatedFare={totalCalculatedFare}
          audioEnabled={audioEnabled}
          customerGender={customerGender}
          isAutoSelectedVehicle={!userExplicitlyChoseVehicle}
          onClose={() => setShowDriverMatchingModal(false)}
          onConfirmMatch={handleConfirmMatch}
          onSelectLifestylePlace={handleSelectLifestylePlace}
          onSelectReligiousDestination={(dest) => {
            setSelectedDestination(dest);
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
                <span className="text-xl">🏍️</span>
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
                  <div className="w-10 h-10 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center text-xl">
                    {currentMatchedDriver.avatarEmoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{currentMatchedDriver.name}</span>
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                        LV.{currentMatchedDriver.level}
                      </span>
                    </div>
                    <p className="text-[10px] text-cyan-300 font-mono">
                      ⭐ {currentMatchedDriver.rating} • ขับ {currentMatchedDriver.vehicleModel}
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
                  {isExpressService ? 'อัศวินเลเวล 10+ พร้อมกล่อง' : 'อัศวินพร้อมออกปฏิบัติการ'}
                </span>
              </div>
              
              <div className="text-slate-300 flex items-center justify-between">
                <div>
                  ปลายทาง: <strong className="text-white">{selectedDestination || 'อาคาร Exchange Tower อโศก'}</strong>
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
                      <div>บริการถ่ายภาพ: <strong className="text-white">{preMatchingData.lifestyle.wantPhotoService ? 'ต้องการ (10 นาที)' : 'เที่ยวอย่างเดียว'}</strong></div>
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
                      <div>ผู้ติดต่อ: <strong className="text-white">{preMatchingData.family.contactPersonName} ({preMatchingData.family.contactPersonPhone})</strong></div>
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
                      <div className="text-lg">{ride.iconEmoji.split(' ')[0]}</div>
                      <div className="font-bold truncate text-[11px] mt-0.5">{ride.thaiName}</div>
                      <div className="text-[9px] text-[#FFD700] font-mono">
                        {ride.priceAddon === 0 ? 'ฟรี' : `+฿${ride.priceAddon}`}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-2xl">
                      {selectedDreamRide.iconEmoji.split(' ')[0]}
                    </div>
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

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmRide}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>ยืนยันเรียกรถ (฿{totalCalculatedFare.toFixed(2)})</span>
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

              {/* Quick Sample Presets */}
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">⚡ เลือกตัวอย่างด่วน:</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { name: 'ส้มโอทับทิมสยามหวานฉ่ำ', price: '120', tag: 'ผัก & ผลไม้สด', icon: '🍊', cond: 'มือหนึ่ง' },
                    { name: 'สร้อยข้อมือหินมงคลนำโชค', price: '290', tag: 'เครื่องประดับ & อัญมณี', icon: '💍', cond: 'มือหนึ่ง' },
                    { name: 'คุกกี้เนยสดแท้โฮมเมด', price: '65', tag: 'ขนม & เบเกอรี่', icon: '🍪', cond: 'มือหนึ่ง' },
                    { name: 'พัดลมไอเย็นพกพา (สภาพ 95%)', price: '350', tag: 'เครื่องใช้ไฟฟ้า & ไอที', icon: '💨', cond: 'มือสอง' },
                    { name: 'ชุดยาสามัญประจำบ้าน WIN Care', price: '140', tag: 'ยารักษาโรค & ยาสามัญ', icon: '💊', cond: 'มือหนึ่ง' }
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setNewItemName(preset.name);
                        setNewItemPrice(preset.price);
                        setNewItemTag(preset.tag);
                        setNewItemIcon(preset.icon);
                        setNewItemCondition(preset.cond as any);
                        if (audioEnabled) playTactileBlip(800);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-amber-400/20 text-[9px] text-slate-300 hover:text-amber-300 border border-white/10 font-mono"
                    >
                      {preset.icon} {preset.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

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
                <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/15 flex items-center justify-center text-2xl">
                  {selectedShopItem.iconEmoji}
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
        onApplySimulatedLevel={(role, lvl) => {
          if (role === 'citizen') {
            setCitizenLevel(lvl);
            const req = calculateLevelMaxXp(lvl, 'citizen');
            setCitizenNextXp(req);
            setCitizenXp(Math.round(req * 0.45));
          }
        }}
      />

      {/* 3D DENSITY RADAR OVERLAY MODAL (2.5 KM) FOR CUSTOMER */}
      {showCustomerRadarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <DensityRadarOverlay
              targetPerspective="passenger"
              radiusKm={2.5}
              audioEnabled={audioEnabled}
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
          destinationLocation={selectedDestination || 'อาคาร Exchange Tower อโศก'}
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
    </div>
  );
};
