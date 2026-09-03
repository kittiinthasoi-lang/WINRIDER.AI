import React, { useState } from 'react';
import { 
  Package, 
  Sparkles, 
  Camera, 
  Heart, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Phone, 
  User, 
  Clock, 
  ShieldCheck, 
  HelpCircle,
  Plus,
  Minus,
  Check,
  Eye,
  Info,
  Ticket,
  Trophy,
  Flame,
  Radio,
  Share2
} from 'lucide-react';
import { playTactileBlip, speakThaiText } from '../utils/audio';

export interface SpecializedPreMatchingData {
  serviceId: 'knight' | 'express' | 'pet' | 'mu' | 'lifestyle' | 'spirit' | 'family' | 'link' | string;
  // Knight fields
  knight?: {
    expressHighway: boolean;
    highwayFee: number;
    goldHelmetVIP: boolean;
    quietEscortRide: boolean;
    specialBrief: string;
  };
  // Express fields
  express?: {
    recipientName: string;
    recipientPhone: string;
    destinationAddress: string;
    packageType: string;
    transparentPackagingAccepted: boolean;
    requirePhotoProof: boolean;
    boxFee: number;
  };
  // Pet Care fields
  pet?: {
    petType: 'dog' | 'cat' | 'exotic';
    petWeight: '<5kg' | '5-10kg' | '10-15kg';
    carrierType: 'carrier' | 'leash' | 'lap';
    petComfortKit: boolean;
    petComfortKitFee: number;
    vetClinicDestination: string;
    specialCareNote: string;
  };
  // MU Buddy fields
  mu?: {
    wantBuddy: boolean;
    baseBuddyFee: number; // 100
    extraTimeMinutes: number; // 0, 15, 30, 45, 60
    extraTimeFee: number; // 50 per 15 min
    totalBuddyFee: number;
    totalDurationMinutes: number;
    travelObjective: string;
    specificRitualOrTemple: string;
  };
  // Lifestyle fields
  lifestyle?: {
    wantPhotoService: boolean;
    photoServiceFee: number; // 20
    photoDurationMinutes: number; // 10
    photoTheme: string;
    cameraAnglePreference: string;
    customNote: string;
  };
  // Spirit fields
  spirit?: {
    wantStopBuyItems: boolean;
    selectedSacredItems: { id: string; name: string; price: number; count: number; icon: string }[];
    stopMarketName: string;
    totalItemsCost: number;
    careNote: string;
  };
  // Family fields
  family?: {
    passengerType: 'disabled' | 'elderly' | 'student';
    pickupSpecificPoint: string;
    destinationSpecificPoint: string;
    contactPersonName: string;
    contactPersonPhone: string;
    specialCareRequirements: string[];
    safeArrivalPhotoVerification: boolean;
    emergencyNote: string;
  };
  // WIN Link & Ticket Concierge fields
  link?: {
    ticketBookingCategory: 'concert' | 'sports' | 'transit' | 'festival' | 'expo' | 'other';
    eventOrVenueName: string;
    bookingType: 'book_ticket' | 'queue_stand' | 'collect_physical_ticket' | 'express_ride_only';
    ticketQuantity: number;
    seatZonePreference: string;
    ticketBudgetLimitThb: number;
    isUrgentQueue: boolean;
    ticketServiceFee: number;
    customInstructions: string;
  };
}

interface SpecializedServicePreMatchingModalProps {
  serviceId: string;
  serviceName: string;
  destinationLocation: string;
  audioEnabled: boolean;
  onClose: () => void;
  onSubmit: (data: SpecializedPreMatchingData, calculatedAddonFee: number) => void;
}

export const SpecializedServicePreMatchingModal: React.FC<SpecializedServicePreMatchingModalProps> = ({
  serviceId,
  serviceName,
  destinationLocation,
  audioEnabled,
  onClose,
  onSubmit
}) => {
  // 0. KNIGHT STATE
  const [knightExpressHighway, setKnightExpressHighway] = useState(false);
  const [knightGoldHelmetVIP, setKnightGoldHelmetVIP] = useState(true);
  const [knightQuietRide, setKnightQuietRide] = useState(false);
  const [knightLuggageBrief, setKnightLuggageBrief] = useState('มีกระเป๋าเป้ 1 ใบ');

  // 1. EXPRESS STATE
  const [expressRecipientName, setExpressRecipientName] = useState('คุณสมศรี เจริญสุข');
  const [expressRecipientPhone, setExpressRecipientPhone] = useState('089-123-4567');
  const [expressDestination, setExpressDestination] = useState(destinationLocation || 'อาคาร Exchange Tower อโศก');
  const [expressPackageType, setExpressPackageType] = useState('เอกสาร & แฟ้มสัญญาสำคัญ');
  const [expressTransparentAgreed, setExpressTransparentAgreed] = useState(true);
  const [expressRequirePhotoProof, setExpressRequirePhotoProof] = useState(true);

  // 1.5 PET CARE STATE
  const [petType, setPetType] = useState<'dog' | 'cat' | 'exotic'>('cat');
  const [petWeight, setPetWeight] = useState<'<5kg' | '5-10kg' | '10-15kg'>('<5kg');
  const [petCarrierType, setPetCarrierType] = useState<'carrier' | 'leash' | 'lap'>('carrier');
  const [petComfortKit, setPetComfortKit] = useState(true);
  const [petVetDestination, setPetVetDestination] = useState(destinationLocation || 'โรงพยาบาลสัตว์ทองหล่อ (24 ชม.)');
  const [petSpecialInstructions, setPetSpecialInstructions] = useState('น้องแมวตกใจง่าย ขอพี่วินขับขี่นุ่มนวลและไม่บีบแตร');

  // 2. MU BUDDY STATE
  const [muWantBuddy, setMuWantBuddy] = useState(true);
  const [muExtraTime, setMuExtraTime] = useState<number>(0); // 0, 15, 30, 45, 60
  const [muTravelObjective, setMuTravelObjective] = useState('⛩️ ไหว้พระ 9 วัด เสริมสิริมงคล');
  const [muSpecificRitual, setMuSpecificRitual] = useState('ขอพรเรื่องความรัก & ความสำเร็จในหน้าที่การงาน');

  // 3. LIFESTYLE STATE
  const [lifestyleWantPhoto, setLifestyleWantPhoto] = useState(true);
  const [lifestyleTheme, setLifestyleTheme] = useState('📸 ถ่ายรูปคาเฟ่ชิคๆ & มินิมอล (Cafe Hopping)');
  const [lifestyleCameraAngle, setLifestyleCameraAngle] = useState('มุมมองกว้าง Ultra-Wide ถ่ายคู่กับรถและบรรยากาศ');
  const [lifestyleNote, setLifestyleNote] = useState('ช่วยถ่ายรูปสวยๆ ลง IG Story / TikTok');

  // 4. SPIRIT STATE
  const [spiritWantStop, setSpiritWantStop] = useState(true);
  const [spiritMarketName, setSpiritMarketName] = useState('แผงพวงมาลัยและดอกไม้สดหน้าวัด');
  const [spiritItems, setSpiritItems] = useState([
    { id: '1', name: 'พวงมาลัยดาวเรืองสด 2 ชาย', price: 30, count: 2, icon: '🌸' },
    { id: '2', name: 'ชุดธูป เทียน ทองคำเปลว & ไม้ขีด', price: 20, count: 1, icon: '🕯️' },
    { id: '3', name: 'ดอกบัวหลวงสดพับกลีบ (กำละ 3 ดอก)', price: 35, count: 1, icon: '🪷' },
    { id: '4', name: 'ไข่ต้มแก้บน (10 ฟอง พร้อมน้ำปลา)', price: 80, count: 0, icon: '🥚' },
    { id: '5', name: 'ผลไม้มงคล 5 อย่าง (ส้ม, แอปเปิ้ล, กล้วย)', price: 150, count: 0, icon: '🍎' },
    { id: '6', name: 'ชุดสังฆทานยา & น้ำดื่มขวดแก้ว', price: 120, count: 0, icon: '🧴' },
    { id: '7', name: 'น้ำแดงเฮลบลูบอย & ของเซ่นไหว้ศาล', price: 25, count: 0, icon: '🥤' },
  ]);

  // 5. FAMILY STATE
  const [familyPassengerType, setFamilyPassengerType] = useState<'disabled' | 'elderly' | 'student'>('elderly');
  const [familyPickupPoint, setFamilyPickupPoint] = useState('หน้าล็อบบี้คอนโด ชั้น 1 มีทางลาด');
  const [familyDropPoint, setFamilyDropPoint] = useState(destinationLocation || 'หน้าอาคารผู้ป่วยนอก รพ.จุฬาฯ');
  const [familyContactName, setFamilyContactName] = useState('คุณวราภรณ์ (บุตรสาว)');
  const [familyContactPhone, setFamilyContactPhone] = useState('081-987-6543');
  const [familySafePhoto, setFamilySafePhoto] = useState(true);
  const [familyCareReqs, setFamilyCareReqs] = useState<string[]>([
    'ช่วยประคองขึ้น-ลงรถอย่างนุ่มนวล',
    'จำกัดความเร็วไม่เกิน 40 กม./ชม.'
  ]);

  // 6. WIN LINK (CONCERT & SPORTS TICKET CONCIERGE & TRANSIT)
  const [linkCategory, setLinkCategory] = useState<'concert' | 'sports' | 'transit' | 'festival' | 'expo' | 'other'>('concert');
  const [linkEventOrVenue, setLinkEventOrVenue] = useState(destinationLocation || 'อิมแพ็ค อารีน่า เมืองทองธานี (IMPACT Arena)');
  const [linkBookingType, setLinkBookingType] = useState<'book_ticket' | 'queue_stand' | 'collect_physical_ticket' | 'express_ride_only'>('book_ticket');
  const [linkTicketQuantity, setLinkTicketQuantity] = useState<number>(2);
  const [linkSeatZone, setLinkSeatZone] = useState('โซนบัตรยืน VIP / หรือบัตรนั่งแถวหน้า');
  const [linkBudgetLimit, setLinkBudgetLimit] = useState<number>(2500);
  const [linkUrgentQueue, setLinkUrgentQueue] = useState<boolean>(true);
  const [linkCustomInstructions, setLinkCustomInstructions] = useState('ช่วยกดบัตรคอนเสิร์ตรอบพรีเซลล์ / ไปต่อคิวรับสายรัดข้อมือหน้าฮอลล์ล่วงหน้า');

  // Calculate dynamic fees
  const calculateTotalAddon = (): number => {
    if (serviceId === 'knight') {
      return knightExpressHighway ? 25 : 0; // ค่าผ่านทางด่วนยกระดับพิเศษ
    }
    if (serviceId === 'express') {
      return 5; // Express box fee (ลดเหลือ 5 บาท เพื่อประชาชน)
    }
    if (serviceId === 'pet') {
      return petComfortKit ? 15 : 0; // ชุดเบาะกันเปื้อน & ขนมสัตว์เลี้ยง
    }
    if (serviceId === 'mu') {
      if (!muWantBuddy) return 0;
      return 100 + (muExtraTime / 15) * 50;
    }
    if (serviceId === 'lifestyle') {
      if (!lifestyleWantPhoto) return 0;
      return 20; // 20 THB for 10 min photo service
    }
    if (serviceId === 'spirit') {
      if (!spiritWantStop) return 0;
      return spiritItems.reduce((sum, it) => sum + it.price * it.count, 0);
    }
    if (serviceId === 'family') {
      return 0; // Family special care free of extra charge or included in base fund
    }
    if (serviceId === 'link') {
      // WIN Link Concierge fee: 0 for ride only, 35 for ticket concierge service, +20 if urgent queue
      if (linkBookingType === 'express_ride_only') return 0;
      let fee = 35; // ค่าบริการช่วยกดตั๋ว/ต่อคิวรับตั๋วตัวจริง
      if (linkUrgentQueue) fee += 20; // เร่งด่วนต่อคิวก่อนเวลา
      return fee;
    }
    return 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (serviceId === 'express' && !expressTransparentAgreed) {
      alert('⚠️ กรุณากดยอมรับข้อกำหนดบรรจุภัณฑ์โปร่งใส/เจาะรู เพื่อความปลอดภัยตามกฎหมายก่อนส่งพัสดุ');
      return;
    }

    const addonFee = calculateTotalAddon();

    const data: SpecializedPreMatchingData = {
      serviceId,
      knight: serviceId === 'knight' ? {
        expressHighway: knightExpressHighway,
        highwayFee: knightExpressHighway ? 25 : 0,
        goldHelmetVIP: knightGoldHelmetVIP,
        quietEscortRide: knightQuietRide,
        specialBrief: knightLuggageBrief
      } : undefined,
      express: serviceId === 'express' ? {
        recipientName: expressRecipientName,
        recipientPhone: expressRecipientPhone,
        destinationAddress: expressDestination,
        packageType: expressPackageType,
        transparentPackagingAccepted: expressTransparentAgreed,
        requirePhotoProof: expressRequirePhotoProof,
        boxFee: 5
      } : undefined,
      pet: serviceId === 'pet' ? {
        petType,
        petWeight,
        carrierType: petCarrierType,
        petComfortKit,
        petComfortKitFee: petComfortKit ? 15 : 0,
        vetClinicDestination: petVetDestination,
        specialCareNote: petSpecialInstructions
      } : undefined,
      mu: serviceId === 'mu' ? {
        wantBuddy: muWantBuddy,
        baseBuddyFee: 100,
        extraTimeMinutes: muExtraTime,
        extraTimeFee: (muExtraTime / 15) * 50,
        totalBuddyFee: muWantBuddy ? 100 + (muExtraTime / 15) * 50 : 0,
        totalDurationMinutes: 30 + muExtraTime,
        travelObjective: muTravelObjective,
        specificRitualOrTemple: muSpecificRitual
      } : undefined,
      lifestyle: serviceId === 'lifestyle' ? {
        wantPhotoService: lifestyleWantPhoto,
        photoServiceFee: lifestyleWantPhoto ? 20 : 0,
        photoDurationMinutes: 10,
        photoTheme: lifestyleTheme,
        cameraAnglePreference: lifestyleCameraAngle,
        customNote: lifestyleNote
      } : undefined,
      spirit: serviceId === 'spirit' ? {
        wantStopBuyItems: spiritWantStop,
        selectedSacredItems: spiritItems.filter(it => it.count > 0),
        stopMarketName: spiritMarketName,
        totalItemsCost: spiritItems.reduce((sum, it) => sum + it.price * it.count, 0),
        careNote: 'พี่วินช่วยแวะซื้อของไหว้และดูแลระหว่างทำศาสนกิจ'
      } : undefined,
      family: serviceId === 'family' ? {
        passengerType: familyPassengerType,
        pickupSpecificPoint: familyPickupPoint,
        destinationSpecificPoint: familyDropPoint,
        contactPersonName: familyContactName,
        contactPersonPhone: familyContactPhone,
        specialCareRequirements: familyCareReqs,
        safeArrivalPhotoVerification: familySafePhoto,
        emergencyNote: `ผู้ติดต่อฉุกเฉิน: ${familyContactName} (${familyContactPhone})`
      } : undefined,
      link: serviceId === 'link' ? {
        ticketBookingCategory: linkCategory,
        eventOrVenueName: linkEventOrVenue,
        bookingType: linkBookingType,
        ticketQuantity: linkTicketQuantity,
        seatZonePreference: linkSeatZone,
        ticketBudgetLimitThb: linkBudgetLimit,
        isUrgentQueue: linkUrgentQueue,
        ticketServiceFee: addonFee,
        customInstructions: linkCustomInstructions
      } : undefined
    };

    if (audioEnabled) {
      playTactileBlip(950);
      speakThaiText("บันทึกข้อมูลบริการเรียบร้อย กำลังค้นหาอัศวินที่ตรงตามเงื่อนไข");
    }

    onSubmit(data, addonFee);
  };

  const renderServiceHeader = () => {
    switch (serviceId) {
      case 'knight':
        return {
          title: 'ข้อมูลการเดินทาง (WIN KNIGHT)',
          sub: 'อัศวินประจำตัวพร้อมพาหนะที่คุณเลือก ทั่วกรุงเทพฯ เริ่มต้น 15฿ ปลอดภัย 100%',
          badge: 'KNIGHT ESCORT PROTOCOL',
          icon: <ShieldCheck className="w-6 h-6 text-[#00D2FF]" />,
          borderColor: 'border-[#00D2FF]/70',
          glow: 'shadow-[0_0_35px_rgba(0,210,255,0.4)]',
          badgeBg: 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/40',
          hex: '#00D2FF',
          btnGradient: 'from-[#00D2FF] via-cyan-500 to-blue-600',
          btnText: 'text-slate-950'
        };
      case 'express':
        return {
          title: 'ข้อมูลจัดส่งพัสดุด่วน (WIN Express)',
          sub: 'ระบุข้อมูลผู้รับ • ข้อกำหนดบรรจุภัณฑ์โปร่งใส • ตรวจสอบรูปถ่ายปลายทาง',
          badge: 'EXPRESS DISPATCH PROTOCOL',
          icon: <Package className="w-6 h-6 text-[#FF6B00]" />,
          borderColor: 'border-[#FF6B00]/70',
          glow: 'shadow-[0_0_35px_rgba(255,107,0,0.4)]',
          badgeBg: 'bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/40',
          hex: '#FF6B00',
          btnGradient: 'from-[#FF6B00] via-orange-500 to-amber-600',
          btnText: 'text-slate-950'
        };
      case 'pet':
        return {
          title: 'บริการรับ-ส่งสัตว์เลี้ยง & รพ.สัตว์ 24 ชม. (WIN-Pet Care)',
          sub: 'ระบุข้อมูลสัตว์เลี้ยง • สายพันธุ์ • คลินิก/รพ.สัตว์ • ถ่ายรูปยืนยันถึงมือหมอ',
          badge: 'PET CARE & VET DISPATCH',
          icon: <Heart className="w-6 h-6 text-[#10B981]" />,
          borderColor: 'border-[#10B981]/70',
          glow: 'shadow-[0_0_35px_rgba(16,185,129,0.4)]',
          badgeBg: 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40',
          hex: '#10B981',
          btnGradient: 'from-[#10B981] via-emerald-500 to-teal-600',
          btnText: 'text-slate-950'
        };
      case 'mu':
        return {
          title: 'บริการบัดดี้สายมู (WIN MU BUDDY)',
          sub: 'เลือกพี่วินเป็นเพื่อนร่วมทาง • ดูแล 30 นาที (+100฿) • เพิ่มเวลาได้',
          badge: 'SACRED BUDDY ESCORT',
          icon: <Sparkles className="w-6 h-6 text-[#A855F7]" />,
          borderColor: 'border-[#A855F7]/70',
          glow: 'shadow-[0_0_35px_rgba(168,85,247,0.4)]',
          badgeBg: 'bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/40',
          hex: '#A855F7',
          btnGradient: 'from-[#A855F7] via-purple-500 to-indigo-600',
          btnText: 'text-white'
        };
      case 'lifestyle':
        return {
          title: 'บริการพี่วินถ่ายรูป & คาเฟ่ (WIN Lifestyle)',
          sub: 'ให้พี่วินถ่ายรูป & ถ่ายคลิป (+20฿ ไม่เกิน 10 นาที) • ระบุธีมภาพถ่าย',
          badge: 'PHOTOGRAPHY ASSIST',
          icon: <Camera className="w-6 h-6 text-[#EC4899]" />,
          borderColor: 'border-[#EC4899]/70',
          glow: 'shadow-[0_0_35px_rgba(236,72,153,0.4)]',
          badgeBg: 'bg-[#EC4899]/20 text-[#EC4899] border-[#EC4899]/40',
          hex: '#EC4899',
          btnGradient: 'from-[#EC4899] via-pink-500 to-rose-600',
          btnText: 'text-white'
        };
      case 'spirit':
        return {
          title: 'บริการแวะซื้อของไหว้ & สิ่งของจำเป็น (WIN Spirit)',
          sub: 'เลือกรายการของไหว้ & สังฆทาน • พี่วินแวะซื้อก่อนถึงจุดหมาย',
          badge: 'SACRED OFFERINGS & SPIRIT CARE',
          icon: <Flame className="w-6 h-6 text-[#FACC15]" />,
          borderColor: 'border-[#FACC15]/70',
          glow: 'shadow-[0_0_35px_rgba(250,204,21,0.4)]',
          badgeBg: 'bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/40',
          hex: '#FACC15',
          btnGradient: 'from-[#FACC15] via-amber-400 to-yellow-500',
          btnText: 'text-slate-950'
        };
      case 'family':
        return {
          title: 'บริการส่งผู้สูงอายุ / ผู้พิการ / นักเรียน (WIN Family)',
          sub: 'เลือกประเภทผู้โดยสาร • ระบุจุดรับส่ง • ส่งภาพถ่ายยืนยันถึงที่หมาย',
          badge: 'FAMILY & SPECIAL CARE PROTOCOL',
          icon: <Users className="w-6 h-6 text-[#38BDF8]" />,
          borderColor: 'border-[#38BDF8]/70',
          glow: 'shadow-[0_0_35px_rgba(56,189,248,0.4)]',
          badgeBg: 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/40',
          hex: '#38BDF8',
          btnGradient: 'from-[#38BDF8] via-sky-500 to-blue-600',
          btnText: 'text-slate-950'
        };
      case 'link':
        return {
          title: 'บริการ WIN Link (จองตั๋วคอนเสิร์ต • กีฬา • เชื่อมต่อทุกระบบ)',
          sub: 'ให้พี่วินช่วยจองตั๋ว/กดบัตร/ต่อคิวรับตั๋วตัวจริง/ส่งถึงฮอลล์ & เชื่อมต่อ BTS/MRT',
          badge: 'CONCERT & SPORTS TICKET CONCIERGE',
          icon: <Ticket className="w-6 h-6 text-[#84CC16]" />,
          borderColor: 'border-[#84CC16]/70',
          glow: 'shadow-[0_0_35px_rgba(132,204,22,0.4)]',
          badgeBg: 'bg-[#84CC16]/20 text-[#84CC16] border-[#84CC16]/40',
          hex: '#84CC16',
          btnGradient: 'from-[#84CC16] via-lime-500 to-emerald-600',
          btnText: 'text-slate-950'
        };
      default:
        return {
          title: `เตรียมข้อมูลบริการ ${serviceName}`,
          sub: 'กรอกรายละเอียดเพิ่มเติมก่อนเริ่มค้นหาพี่วิน',
          badge: 'PRE-MATCHING SETUP',
          icon: <ShieldCheck className="w-6 h-6 text-[#00D2FF]" />,
          borderColor: 'border-[#00D2FF]/70',
          glow: 'shadow-[0_0_35px_rgba(0,210,255,0.4)]',
          badgeBg: 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/40',
          hex: '#00D2FF',
          btnGradient: 'from-[#00D2FF] via-cyan-500 to-blue-600',
          btnText: 'text-slate-950'
        };
    }
  };

  const header = renderServiceHeader();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className={`relative w-full max-w-xl bg-[#091122] rounded-3xl border-2 ${header.borderColor} p-5 sm:p-6 ${header.glow} space-y-4 max-h-[92vh] overflow-y-auto`}>
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/60 border border-white/15 flex items-center justify-center text-2xl shadow-inner">
              {header.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{header.title}</h3>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${header.badgeBg}`}>
                  {header.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">{header.sub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* =========================================================================
              0. WIN KNIGHT: ESCORT & HIGHWAY OPTION & VIP HELMET (NEON BLUE #00D2FF)
             ========================================================================= */}
          {serviceId === 'knight' && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* Escort Features Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#061A30] via-[#041224] to-[#020A14] border-2 border-[#00D2FF]/60 shadow-[0_0_25px_rgba(0,210,255,0.25)] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/40 shadow-[0_0_12px_rgba(0,210,255,0.4)]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#00D2FF]">ระบบมาตรฐานการเดินทางระดับอัศวิน (KNIGHT ESCORT)</h4>
                    <p className="text-[10px] text-slate-300">อัศวินผ่านการตรวจประวัติ 100% พร้อมกล้องบันทึกเส้นทางตลอดการเดินทาง</p>
                  </div>
                </div>

                {/* Option Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      setKnightExpressHighway(!knightExpressHighway);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      knightExpressHighway
                        ? 'bg-[#00D2FF]/20 border-[#00D2FF] text-white shadow-[0_0_15px_rgba(0,210,255,0.3)] font-bold'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:border-[#00D2FF]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#00D2FF] font-bold">🛣️ ขึ้นทางด่วนพิเศษยกระดับ</span>
                      <span className="text-[10px] font-mono text-[#FACC15] font-bold">+฿25.00</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">หลีกเลี่ยงรถติดชั่วโมงเร่งด่วน ประหยัดเวลา 50%</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playTactileBlip(800);
                      setKnightGoldHelmetVIP(!knightGoldHelmetVIP);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      knightGoldHelmetVIP
                        ? 'bg-[#00D2FF]/20 border-[#00D2FF] text-white shadow-[0_0_15px_rgba(0,210,255,0.3)] font-bold'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:border-[#00D2FF]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#00D2FF] font-bold">👑 หมวกกันน็อกทอง VIP UV</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">ฟรี (FREE)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">ฆ่าเชื้อ UV-C และเปลี่ยนหมวกคลุมผมอนามัยใหม่ทุกเที่ยว</p>
                  </button>
                </div>
              </div>

              {/* Ride Preferences */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h5 className="text-[11px] font-mono font-bold text-[#00D2FF] uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00D2FF]" />
                  <span>ความต้องการพิเศษ & สัมภาระ</span>
                </h5>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">ระบุสัมภาระที่พกพา:</label>
                  <input
                    type="text"
                    value={knightLuggageBrief}
                    onChange={(e) => setKnightLuggageBrief(e.target.value)}
                    placeholder="เช่น กระเป๋าเป้ 1 ใบ, ถุงช็อปปิ้ง 2 ใบ"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#00D2FF] text-xs"
                  />
                </div>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#070D1E] border border-white/10 cursor-pointer hover:border-[#00D2FF]/40 transition-all">
                  <input
                    type="checkbox"
                    checked={knightQuietRide}
                    onChange={(e) => setKnightQuietRide(e.target.checked)}
                    className="w-4 h-4 text-[#00D2FF] rounded border-white/20 focus:ring-[#00D2FF] bg-black/60 cursor-pointer accent-[#00D2FF]"
                  />
                  <div>
                    <span className="text-[11px] font-bold text-white">🤫 โหมดเงียบสงบ (Quiet Escort Ride)</span>
                    <p className="text-[10px] text-slate-400">พี่วินจะไม่ชวนสนทนาเพื่อความเป็นส่วนตัวและสมาธิของผู้โดยสาร</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* =========================================================================
              1. WIN EXPRESS: FORM & PACKAGING RULES & PHOTO VERIFICATION (ORANGE #FF6B00)
             ========================================================================= */}
          {serviceId === 'express' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Mandatory Transparent Packaging Rule Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2A1202] via-[#1A0A01] to-[#0D0501] border-2 border-[#FF6B00]/60 shadow-[0_0_20px_rgba(255,107,0,0.25)] space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 mt-0.5">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#FF6B00] flex items-center gap-1.5">
                      <span>ข้อกำหนดความปลอดภัยของบรรจุภัณฑ์ (MANDATORY RULE)</span>
                    </h4>
                    <p className="text-[11px] text-white font-bold leading-relaxed mt-1 bg-[#FF6B00]/15 p-2.5 rounded-xl border border-[#FF6B00]/30">
                      "บรรจุภัณฑ์ที่ใส่ต้องใสมองเห็นสินค้าด้านใน ถ้าเป็นกล่องทึบต้องเจาะรูให้เห็นสินค้าด้านในชัดเจน"
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1">
                      เพื่อความปลอดภัยของผู้ขับขี่ ป้องกันสิ่งผิดกฎหมาย และปฏิบัติตามมาตรฐานสากล WIN Express
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/50 border border-[#FF6B00]/30 cursor-pointer hover:bg-[#FF6B00]/10 transition-all">
                  <input
                    type="checkbox"
                    required
                    checked={expressTransparentAgreed}
                    onChange={(e) => setExpressTransparentAgreed(e.target.checked)}
                    className="w-4 h-4 text-[#FF6B00] rounded border-[#FF6B00]/60 focus:ring-[#FF6B00] bg-black/60 cursor-pointer accent-[#FF6B00]"
                  />
                  <span className="text-[11px] font-bold text-[#FFA055]">
                    ข้าพเจ้ารับทราบและปฏิบัติตามข้อกำหนดบรรจุภัณฑ์โปร่งใส/เจาะรูมองเห็นสินค้าด้านในเรียบร้อยแล้ว ✓
                  </span>
                </label>
              </div>

              {/* Recipient & Destination Details */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h4 className="text-[11px] font-mono font-bold text-[#FF6B00] uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>ข้อมูลจุดส่ง & ผู้รับปลายทาง</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">ชื่อ-นามสกุล ผู้รับพัสดุ *:</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={expressRecipientName}
                        onChange={(e) => setExpressRecipientName(e.target.value)}
                        placeholder="เช่น คุณสมศรี เจริญสุข"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FF6B00] text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">เบอร์โทรศัพท์ผู้รับ *:</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        value={expressRecipientPhone}
                        onChange={(e) => setExpressRecipientPhone(e.target.value)}
                        placeholder="เช่น 089-123-4567"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FF6B00] text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">ที่อยู่ / พิกัดปลายทางส่งพัสดุ *:</label>
                  <input
                    type="text"
                    required
                    value={expressDestination}
                    onChange={(e) => setExpressDestination(e.target.value)}
                    placeholder="เช่น อาคาร Exchange Tower ชั้น 15 หรือ ซอยสุขุมวิท 23 บ้านเลขที่ 88"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FF6B00] text-xs"
                  />
                </div>

                {/* Package Type Selector */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">ประเภทพัสดุ / สิ่งของที่จัดส่ง:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      '📄 เอกสาร & สัญญาสำคัญ',
                      '🍱 อาหาร / ขนม / เครื่องดื่ม',
                      '📦 กล่องพัสดุ / ของใช้ทั่วไป',
                      '👗 เสื้อผ้า & แฟชั่น',
                      '📱 สมาร์ตโฟน & อุปกรณ์ไอที',
                      '🪴 ดอกไม้ / ของขวัญ / ของแต่งบ้าน',
                      '💊 ยารักษาโรค / เวชภัณฑ์',
                      '⚠️ พัสดุแตกหักง่าย (Fragile)'
                    ].map((pkg) => (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setExpressPackageType(pkg);
                        }}
                        className={`p-2 rounded-xl text-left border transition-all text-[11px] ${
                          expressPackageType === pkg
                            ? 'bg-[#FF6B00]/25 border-[#FF6B00] text-white font-bold shadow-sm'
                            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {pkg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Completion Photo Verification System Notice */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#2A1202]/60 via-[#1A0A01]/40 to-black/50 border border-[#FF6B00]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#FF6B00]" />
                    <div>
                      <h5 className="text-[11px] font-bold text-white">ระบบตรวจสอบรูปถ่ายยืนยันการส่งของพี่วินเมื่อจบงาน</h5>
                      <span className="text-[9px] text-[#FFA055] font-mono">Proof of Delivery (POD) Photo Verification</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] font-bold border border-[#FF6B00]/40">
                    เปิดใช้งาน ✓
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  เมื่อพี่วินส่งมอบพัสดุถึงมือผู้รับ ระบบจะบังคับให้พี่วินถ่ายภาพหลักฐานการส่งมอบ พร้อมบันทึกพิกัด GPS และเวลา Timestamp ส่งตรงให้ผู้ส่งตรวจสอบได้ทันที 100%
                </p>
              </div>

              {/* Surcharge breakdown banner */}
              <div className="p-2.5 rounded-xl bg-black/60 border border-[#FF6B00]/30 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-1.5 text-[#FFA055]">
                  <Package className="w-3.5 h-3.5" />
                  <span>ค่ากล่องใส่พัสดุคุมอุณหภูมิ (ปรับลดพิเศษเพื่อประชาชน):</span>
                </div>
                <span className="font-bold text-[#FF6B00]">+฿5.00</span>
              </div>
            </div>
          )}

          {/* =========================================================================
              1.5 WIN PET CARE: PET TYPE & CARRIER & COMFORT KIT (GREEN #10B981)
             ========================================================================= */}
          {serviceId === 'pet' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Pet Type & Weight Selector */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#062419] via-[#041911] to-[#020F0A] border-2 border-[#10B981]/60 shadow-[0_0_25px_rgba(16,185,129,0.25)] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#10B981]">บริการรับ-ส่งสัตว์เลี้ยง & รพ.สัตว์ 24 ชม. (WIN PET CARE)</h4>
                    <p className="text-[10px] text-slate-300">อัศวินรักสัตว์ ผ่านการอบรมการประคองสัตว์เลี้ยงอย่างปลอดภัยและใจเย็น</p>
                  </div>
                </div>

                {/* Pet Kind */}
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">ชนิดของสัตว์เลี้ยง:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cat', title: '🐱 น้องแมว', sub: 'ไม่เกิน 7 กก.' },
                      { id: 'dog', title: '🐶 น้องสุนัข', sub: 'พันธุ์เล็ก/กลาง' },
                      { id: 'exotic', title: '🐰 สัตว์เล็ก / นก', sub: 'กระต่าย/นก/แฮมสเตอร์' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setPetType(p.id as any);
                        }}
                        className={`p-2.5 rounded-2xl text-left border transition-all ${
                          petType === p.id
                            ? 'bg-[#10B981]/25 border-[#10B981] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:border-[#10B981]/40'
                        }`}
                      >
                        <div className="text-xs font-bold text-[#6EE7B7]">{p.title}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{p.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Carrier / Leash mode */}
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">ลักษณะการพาสัตว์เลี้ยงเดินทาง:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'carrier', title: '🎒 ใส่กระเป๋า / กรง', sub: 'แนะนำสูงสุด ปลอดภัย 100%' },
                      { id: 'leash', title: '🦮 ใส่สายจูง & สายนิรภัย', sub: 'ผู้โดยสารอุ้มกระชับ' },
                      { id: 'lap', title: '🐾 อุ้มตักมีผ้าห่อหุ้ม', sub: 'ระยะทางสั้นในซอย' }
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setPetCarrierType(c.id as any);
                        }}
                        className={`p-2.5 rounded-2xl text-left border transition-all ${
                          petCarrierType === c.id
                            ? 'bg-[#10B981]/25 border-[#10B981] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:border-[#10B981]/40'
                        }`}
                      >
                        <div className="text-xs font-bold text-[#A7F3D0]">{c.title}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{c.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Destination Vet / Hospital & Custom Care */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h5 className="text-[11px] font-mono font-bold text-[#10B981] uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>ข้อมูลคลินิก / โรงพยาบาลสัตว์ & ข้อควรระวัง</span>
                </h5>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">ชื่อคลินิก / โรงพยาบาลสัตว์ปลายทาง *:</label>
                  <input
                    type="text"
                    required
                    value={petVetDestination}
                    onChange={(e) => setPetVetDestination(e.target.value)}
                    placeholder="เช่น รพ.สัตว์ทองหล่อ, คลินิกสัตว์แพทย์เกษตร"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#10B981] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">ข้อควรระวัง / คำสั่งพิเศษ:</label>
                  <input
                    type="text"
                    value={petSpecialInstructions}
                    onChange={(e) => setPetSpecialInstructions(e.target.value)}
                    placeholder="เช่น น้องมีแผลผ่าตัด ขอขับขี่นุ่มนวลมาก หรือ น้องกลัวเสียงบีบแตร"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#10B981] text-xs"
                  />
                </div>

                {/* Pet Comfort & Sanitization Kit */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#070D1E] border border-[#10B981]/30 cursor-pointer hover:border-[#10B981]/60 transition-all">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={petComfortKit}
                      onChange={(e) => setPetComfortKit(e.target.checked)}
                      className="w-4 h-4 text-[#10B981] rounded border-white/20 focus:ring-[#10B981] bg-black/60 cursor-pointer accent-[#10B981]"
                    />
                    <div>
                      <span className="text-[11px] font-bold text-white">✨ เบาะรองกันเปื้อนฆ่าเชื้อ + ขนมปลอบประโลม</span>
                      <p className="text-[10px] text-slate-400">ผ้ารองกันขนร่วง & แผ่นซับกลิ่นอนามัยสำหรับสัตว์เลี้ยง</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#10B981]">+฿15.00</span>
                </label>
              </div>
            </div>
          )}

          {/* =========================================================================
              2. WIN MU BUDDY: CHOOSE BUDDY & DURATION (+100B / 30m, +50B / 15m) & OBJECTIVE (PURPLE #A855F7)
             ========================================================================= */}
          {serviceId === 'mu' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Want Buddy Toggle */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#230C36] via-[#160624] to-[#0A0212] border-2 border-[#A855F7]/60 shadow-[0_0_20px_rgba(168,85,247,0.25)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/40">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#C084FC]">ต้องการให้พี่วินเป็นบัดดี้ (เพื่อนร่วมทาง/ผู้นำสวด)?</h4>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        พี่วินเลเวล 15+ คอยดูแล พาเดินไหว้ แนะนำบทสวด และรอรับกลับ
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setMuWantBuddy(true);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        muWantBuddy
                          ? 'bg-[#A855F7] text-white font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ต้องการ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(750);
                        setMuWantBuddy(false);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        !muWantBuddy
                          ? 'bg-slate-700 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ส่งอย่างเดียว
                    </button>
                  </div>
                </div>

                {muWantBuddy && (
                  <div className="pt-2 border-t border-[#A855F7]/20 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#E9D5FF]">ราคามาตรฐานบัดดี้ (ดูแล 30 นาที):</span>
                      <span className="text-[#C084FC] font-bold">+฿100.00</span>
                    </div>

                    {/* Extra Time Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                        เลือกเพิ่มเวลาดูแล (+50 บาท / 15 นาที):
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono">
                        {[
                          { min: 0, label: '30 นาที', price: '+0฿' },
                          { min: 15, label: '45 นาที (+15น.)', price: '+50฿' },
                          { min: 30, label: '60 นาที (+30น.)', price: '+100฿' },
                          { min: 45, label: '75 นาที (+45น.)', price: '+150฿' },
                          { min: 60, label: '90 นาที (+60น.)', price: '+200฿' },
                        ].map((tier) => (
                          <button
                            key={tier.min}
                            type="button"
                            onClick={() => {
                              if (audioEnabled) playTactileBlip(850);
                              setMuExtraTime(tier.min);
                            }}
                            className={`p-2 rounded-xl text-center border transition-all text-xs ${
                              muExtraTime === tier.min
                                ? 'bg-[#A855F7] text-white font-black border-[#A855F7] shadow-md'
                                : 'bg-black/40 border-white/10 text-slate-300 hover:border-[#A855F7]/50'
                            }`}
                          >
                            <div className="text-[11px]">{tier.label}</div>
                            <div className="text-[10px] text-[#E9D5FF] font-bold">{tier.price}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/60 border border-[#A855F7]/30 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">รวมเวลาดูแล: {30 + muExtraTime} นาที</span>
                      <span className="text-[#C084FC] font-black text-sm">
                        ค่าบริการบัดดี้: +฿{(100 + (muExtraTime / 15) * 50).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Travel Objective Selector */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                <label className="block text-[11px] font-mono font-bold text-[#C084FC] uppercase">
                  จุดประสงค์การเดินทางสายมู (TRAVEL OBJECTIVE):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    '⛩️ ไหว้พระ 9 วัด เสริมสิริมงคล',
                    '💖 ขอพรความรัก & คู่ครอง (พระตรีมูรติ/พระแม่ลักษมี)',
                    '💼 เสริมดวงการงาน & โชคลาภ (ท้าวเวสสุวรรณ)',
                    '🛡️ สะเดาะเคราะห์ ต่อชะตา & เสริมบารมี (วัดมังกร)',
                    '🐟 ถวายสังฆทาน ปล่อยปลา & ทำบุญตักบาตร',
                    '🪔 คัดกรองบทสวดเฉพาะทาง & ปรึกษาพิธีกรรม'
                  ].map((obj) => (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setMuTravelObjective(obj);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all text-[11px] ${
                        muTravelObjective === obj
                          ? 'bg-[#A855F7]/25 border-[#A855F7] text-white font-bold'
                          : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {obj}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">ระบุสิ่งศักดิ์สิทธิ์ / วัด / เรื่องที่ต้องการเน้น:</label>
                  <input
                    type="text"
                    value={muSpecificRitual}
                    onChange={(e) => setMuSpecificRitual(e.target.value)}
                    placeholder="เช่น ขอพรความรักที่ตึกเกษร หรือแก้บนหลวงพ่อโสธร"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#A855F7] text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              3. WIN LIFESTYLE: CHOOSE PHOTO SERVICE (+20B / 10m) & THEMES (PINK #EC4899)
             ========================================================================= */}
          {serviceId === 'lifestyle' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Want Photo Service Toggle */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#300B22] via-[#1E0615] to-[#0D0209] border-2 border-[#EC4899]/60 shadow-[0_0_20px_rgba(236,72,153,0.25)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#F472B6]">บริการพี่วินถ่ายรูป (Photography Assistant)</h4>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        ถ่ายรูปสวยๆ ไม่เกิน 10 นาที จัดมุมมอง & โพสท่า (+20 บาท)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setLifestyleWantPhoto(true);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        lifestyleWantPhoto
                          ? 'bg-[#EC4899] text-white font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ต้องการ (+20฿)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(750);
                        setLifestyleWantPhoto(false);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        !lifestyleWantPhoto
                          ? 'bg-slate-700 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      เที่ยวอย่างเดียว
                    </button>
                  </div>
                </div>

                {lifestyleWantPhoto && (
                  <div className="pt-2 border-t border-[#EC4899]/20 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-[#FBCFE8]">
                      <span>ค่าบริการพี่วินถ่ายภาพ (ระยะเวลาไม่เกิน 10 นาที):</span>
                      <span className="text-[#F472B6] font-bold">+฿20.00</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      * อัศวินได้รับการอบรมเทคนิคการถ่ายภาพด้วยสมาร์ตโฟน จัดแสง ถ่ายมุมมองกว้าง และมุมเสยขาเรียว
                    </p>
                  </div>
                )}
              </div>

              {/* Theme Selector */}
              {lifestyleWantPhoto && (
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                  <label className="block text-[11px] font-mono font-bold text-[#F472B6] uppercase">
                    เลือกธีมภาพถ่ายที่ต้องการ (PHOTO THEMES):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {[
                      '📸 คาเฟ่ชิคๆ & มินิมอล (Cafe Hopping)',
                      '🎨 สตรีทอาร์ต & วินเทจ คลาสสิก (Street Art)',
                      '🍜 สตรีทฟู้ด ตะลุยกินยามค่ำคืน (Night Gourmet)',
                      '🏛️ แลนด์มาร์คสำคัญ & สถาปัตยกรรม (Iconic Landmark)',
                      '🎓 รับปริญญา / นอกรอบ / วันพิเศษ',
                      '🎬 ถ่ายคอนเทนต์สั้น Reel / TikTok / IG Story'
                    ].map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          setLifestyleTheme(theme);
                        }}
                        className={`p-2 rounded-xl text-left border transition-all text-[11px] ${
                          lifestyleTheme === theme
                            ? 'bg-[#EC4899]/25 border-[#EC4899] text-white font-bold'
                            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">มุมกล้องหรือบรีฟเพิ่มเติม:</label>
                    <input
                      type="text"
                      value={lifestyleCameraAngle}
                      onChange={(e) => setLifestyleCameraAngle(e.target.value)}
                      placeholder="เช่น ถ่ายมุมกว้างเห็นวิวตึก, ถ่ายครึ่งตัวหน้าชัดหลังเบลอ"
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#EC4899] text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              4. WIN SPIRIT: CHOOSE TO STOP BUY SACRED OFFERINGS & ITEMS (YELLOW #FACC15)
             ========================================================================= */}
          {serviceId === 'spirit' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Want Stop Buy Toggle */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2B2304] via-[#1A1502] to-[#0D0B01] border-2 border-[#FACC15]/60 shadow-[0_0_20px_rgba(250,204,21,0.25)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/40">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#FDE047]">ต้องการแวะซื้อสิ่งของจำเป็น & ของไหว้?</h4>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        พี่วินแวะซื้อพวงมาลัย ดอกไม้ ธูปเทียน สังฆทาน หรือสิ่งของจำเป็นให้ก่อนถึงที่หมาย
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setSpiritWantStop(true);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        spiritWantStop
                          ? 'bg-[#FACC15] text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ต้องการแวะซื้อ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(750);
                        setSpiritWantStop(false);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        !spiritWantStop
                          ? 'bg-slate-700 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ตรงไปจุดหมาย
                    </button>
                  </div>
                </div>

                {spiritWantStop && (
                  <div className="pt-2 border-t border-[#FACC15]/20 space-y-2.5">
                    <div>
                      <label className="block text-slate-300 mb-1 font-bold">ระบุร้านค้า / ตลาดที่ต้องการให้แวะ:</label>
                      <input
                        type="text"
                        value={spiritMarketName}
                        onChange={(e) => setSpiritMarketName(e.target.value)}
                        placeholder="เช่น แผงดอกไม้หน้าวัด หรือตลาดสดข้างทาง"
                        className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#FACC15] text-xs"
                      />
                    </div>

                    {/* Items Checklist */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#FDE047] mb-1.5">
                        เลือกรายการของไหว้ & สิ่งของที่ต้องการให้ซื้อ:
                      </label>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {spiritItems.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                              item.count > 0
                                ? 'bg-[#FACC15]/15 border-[#FACC15]/60 text-white'
                                : 'bg-black/40 border-white/5 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{item.icon}</span>
                              <div>
                                <div className="font-bold text-slate-200">{item.name}</div>
                                <div className="text-[10px] text-[#FACC15] font-mono">฿{item.price} / หน่วย</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (audioEnabled) playTactileBlip(700);
                                  setSpiritItems(prev => prev.map(it => it.id === item.id ? { ...it, count: Math.max(0, it.count - 1) } : it));
                                }}
                                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-mono font-bold text-white">{item.count}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (audioEnabled) playTactileBlip(800);
                                  setSpiritItems(prev => prev.map(it => it.id === item.id ? { ...it, count: it.count + 1 } : it));
                                }}
                                className="w-6 h-6 rounded-lg bg-[#FACC15]/30 hover:bg-[#FACC15]/50 border border-[#FACC15]/60 flex items-center justify-center text-[#FACC15] font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/60 border border-[#FACC15]/30 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">ประมาณการค่าของไหว้รวม:</span>
                      <span className="text-[#FACC15] font-black text-sm">
                        +฿{spiritItems.reduce((sum, it) => sum + it.price * it.count, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              5. WIN FAMILY: PASSENGER TYPE (ELDERLY, DISABLED, STUDENT) & SAFE ARRIVAL PHOTO (SKY BLUE #38BDF8)
             ========================================================================= */}
          {serviceId === 'family' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Passenger Type Selector */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#061F36] via-[#041628] to-[#020D1A] border-2 border-[#38BDF8]/60 shadow-[0_0_25px_rgba(56,189,248,0.25)] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.4)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#38BDF8]">เลือกประเภทผู้โดยสารที่ต้องการการดูแลพิเศษ:</h4>
                    <p className="text-[10px] text-slate-300">อัศวินวินมอเตอร์ไซค์ใจดี ขับขี่นุ่มนวลสูงสุด และดูแลประคองขึ้นลง</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'disabled', title: '♿ ผู้พิการ', sub: 'ช่วยพยุง • พับวีลแชร์ • ทางลาด' },
                    { id: 'elderly', title: '👵 ผู้สูงอายุ', sub: 'คอยประคอง • ขับขี่นุ่มนวลสูงสุด' },
                    { id: 'student', title: '🎒 นักเรียน / เด็ก', sub: 'หมวกกันน็อกเด็ก • GPS สด' }
                  ].map((pType) => (
                    <button
                      key={pType.id}
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(850);
                        setFamilyPassengerType(pType.id as any);
                      }}
                      className={`p-3 rounded-2xl text-left border transition-all ${
                        familyPassengerType === pType.id
                          ? 'bg-[#38BDF8]/25 border-[#38BDF8] text-white shadow-[0_0_15px_rgba(56,189,248,0.3)] font-bold'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:border-[#38BDF8]/40'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#7DD3FC]">{pType.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{pType.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Pickup & Dropoff Location + Contact */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h5 className="text-[11px] font-mono font-bold text-[#38BDF8] uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>จุดรับ-ส่ง อย่างละเอียด & ผู้ติดต่อฉุกเฉิน</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">ระบุจุดรับอย่างละเอียด *:</label>
                    <input
                      type="text"
                      required
                      value={familyPickupPoint}
                      onChange={(e) => setFamilyPickupPoint(e.target.value)}
                      placeholder="เช่น หน้าตึก 4 มีทางลาดคนพิการ"
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#38BDF8] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">ระบุจุดส่งอย่างละเอียด *:</label>
                    <input
                      type="text"
                      required
                      value={familyDropPoint}
                      onChange={(e) => setFamilyDropPoint(e.target.value)}
                      placeholder="เช่น ประตูหน้าโรงเรียน หรือ ล็อบบี้โรงพยาบาล"
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#38BDF8] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">ชื่อผู้ติดต่อ / ผู้ปกครอง / ญาติ *:</label>
                    <input
                      type="text"
                      required
                      value={familyContactName}
                      onChange={(e) => setFamilyContactName(e.target.value)}
                      placeholder="เช่น คุณวราภรณ์ (มารดา)"
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#38BDF8] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">เบอร์โทรศัพท์ผู้ติดต่อ *:</label>
                    <input
                      type="tel"
                      required
                      value={familyContactPhone}
                      onChange={(e) => setFamilyContactPhone(e.target.value)}
                      placeholder="เช่น 081-987-6543"
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#38BDF8] text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Safe Arrival Photo Verification System */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#072440]/60 via-[#05182C]/60 to-black/50 border border-[#38BDF8]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#38BDF8]" />
                    <div>
                      <h5 className="text-[11px] font-bold text-white">ระบบส่งภาพถ่ายยืนยันเมื่อส่งถึงที่หมายอย่างปลอดภัย</h5>
                      <span className="text-[9px] text-[#7DD3FC] font-mono">Safe Arrival Photo Notification & Parent Alert</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={familySafePhoto}
                      onChange={(e) => setFamilySafePhoto(e.target.checked)}
                      className="w-4 h-4 text-[#38BDF8] rounded border-white/20 focus:ring-[#38BDF8] bg-black/60 cursor-pointer accent-[#38BDF8]"
                    />
                    <span className="text-[10px] text-[#7DD3FC] font-bold">เปิดระบบ</span>
                  </label>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  เมื่อส่งผู้โดยสารถึงที่หมาย พี่วินจะถ่ายภาพยืนยันว่าส่งถึงมือครู/ญาติ/เจ้าหน้าที่ พร้อมส่งแจ้งเตือนเข้าสมาร์ตโฟนของผู้ปกครองทันที
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              6. WIN LINK: CONCERT TICKET, SPORTS MATCH & TRANSIT CONCIERGE (LIME #84CC16)
             ========================================================================= */}
          {serviceId === 'link' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Category Selector */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#162704] via-[#0E1B02] to-[#060D01] border-2 border-[#84CC16]/60 shadow-[0_0_25px_rgba(132,204,22,0.25)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#84CC16]/20 text-[#84CC16] border border-[#84CC16]/40 shadow-[0_0_12px_rgba(132,204,22,0.4)]">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#84CC16]">ประเภทบริการตั๋ว & อีเวนต์ (Ticket & Event Hub):</h4>
                      <p className="text-[10px] text-slate-300">เชื่อมต่อคอนเสิร์ต กีฬา รถไฟฟ้า ทัวร์ และทุกงานอีเวนต์</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#84CC16]/20 text-[#84CC16] border border-[#84CC16]/40 font-bold">
                    WIN CONCIERGE
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'concert', title: '🎤 คอนเสิร์ต / K-POP', sub: 'Impact / UOB Live / ราชมังฯ', icon: '🎵' },
                    { id: 'sports', title: '⚽ กีฬา / มวย / บอล', sub: 'ฟุตบอลทีมชาติ / ONE ลุมพินี', icon: '🥊' },
                    { id: 'transit', title: '🚝 รถไฟฟ้า / รถไฟ / ทัวร์', sub: 'BTS / MRT / SRT / บขส. / เรือ', icon: '🚆' },
                    { id: 'festival', title: '🎆 เฟสติวัล / EDM', sub: 'เทศกาลดนตรี / งานเคาต์ดาวน์', icon: '🎪' },
                    { id: 'expo', title: '📚 มอเตอร์โชว์ / สัปดาห์หนังสือ', sub: 'ไบเทค / สิริกิติ์ / ชาเลนเจอร์', icon: '🏛️' },
                    { id: 'other', title: '🎟️ ตั๋วอีเวนต์อื่นๆ ทั้งหมด', sub: 'การแสดงสด / แฟนมีตติ้ง', icon: '✨' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(850);
                        setLinkCategory(cat.id as any);
                      }}
                      className={`p-2.5 rounded-2xl text-left border transition-all ${
                        linkCategory === cat.id
                          ? 'bg-[#84CC16]/25 border-[#84CC16] text-white shadow-[0_0_15px_rgba(132,204,22,0.3)] font-bold'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:border-[#84CC16]/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span className="text-xs font-bold text-[#BEF264]">{cat.title}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1 truncate">{cat.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Action Mode */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                <label className="block text-[11px] font-bold text-[#84CC16]">
                  สิ่งที่ต้องการให้พี่วินช่วยเหลือ (Concierge Action):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'book_ticket', title: '🎫 จองตั๋ว & กดบัตรออนไลน์แทน', fee: '+฿35', sub: 'พี่วินช่วยกดบัตรรอบพรีเซลล์/ต่อคิวเว็บ' },
                    { id: 'queue_stand', title: '🏃 ต่อคิวรับบัตรจริง & สายรัดข้อมือ', fee: '+฿35', sub: 'ไปเข้าแถวล่วงหน้าหน้าฮอลล์/เคาน์เตอร์' },
                    { id: 'collect_physical_ticket', title: '📦 วิ่งไปรับบัตรกระดาษ/ของที่ระลึก', fee: '+฿35', sub: 'รับบัตรจากเคาน์เตอร์ ThaiTicket / จุดขาย' },
                    { id: 'express_ride_only', title: '🏍️ รับ-ส่งด่วนหลบรถติดไปงาน', fee: '฿0', sub: 'ขับขี่ส่งถึงประตูทางเข้างานทันเวลา' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(800);
                        setLinkBookingType(mode.id as any);
                      }}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        linkBookingType === mode.id
                          ? 'bg-[#84CC16]/20 border-[#84CC16] text-white shadow-md font-bold'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#A3E635]">{mode.title}</span>
                        <span className="text-[10px] font-mono text-amber-300 font-bold">{mode.fee}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5">{mode.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Event / Stadium / Arena & Booking Details */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h5 className="text-[11px] font-mono font-bold text-[#84CC16] uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#84CC16]" />
                  <span>รายละเอียดสถานที่จัดงาน & ตั๋วที่ต้องการ</span>
                </h5>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-slate-300 mb-1 font-bold text-xs">ชื่อสถานที่จัดงาน / สเตเดียม / คอนเสิร์ต / รถไฟฟ้า *:</label>
                    <input
                      type="text"
                      required
                      value={linkEventOrVenue}
                      onChange={(e) => setLinkEventOrVenue(e.target.value)}
                      placeholder="เช่น อิมแพ็ค อารีน่า เมืองทองธานี, ราชมังคลากีฬาสถาน, UOB Live Emsphere, BTS สยาม"
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#84CC16] text-xs"
                    />
                  </div>

                  {linkBookingType !== 'express_ride_only' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-300 mb-1 font-bold text-xs">โซนที่นั่ง / ระดับราคาที่ต้องการ:</label>
                        <input
                          type="text"
                          value={linkSeatZone}
                          onChange={(e) => setLinkSeatZone(e.target.value)}
                          placeholder="เช่น โซน A1 แถวหน้า, บัตรยืน VIP, อัฒจันทร์ W1"
                          className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#84CC16] text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#070D1E] border border-white/10">
                        <span className="text-xs text-slate-300 font-bold">จำนวนตั๋ว (ใบ):</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (audioEnabled) playTactileBlip(700);
                              setLinkTicketQuantity(Math.max(1, linkTicketQuantity - 1));
                            }}
                            className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-[#84CC16]">{linkTicketQuantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (audioEnabled) playTactileBlip(800);
                              setLinkTicketQuantity(Math.min(10, linkTicketQuantity + 1));
                            }}
                            className="w-6 h-6 rounded-lg bg-[#84CC16]/40 hover:bg-[#84CC16]/60 border border-[#84CC16]/60 flex items-center justify-center text-white font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {linkBookingType !== 'express_ride_only' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-300 mb-1 font-bold text-xs">งบประมาณตั๋วสูงสุดต่อใบ (บาท):</label>
                        <input
                          type="number"
                          value={linkBudgetLimit}
                          onChange={(e) => setLinkBudgetLimit(Number(e.target.value))}
                          placeholder="2500"
                          className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#84CC16] text-xs font-mono"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070D1E] border border-white/10">
                        <div>
                          <div className="text-xs font-bold text-amber-300">⚡ ต่อคิวด่วนพิเศษ</div>
                          <div className="text-[9px] text-slate-400">ไปเฝ้าหน้างานก่อนเวลา (+฿20)</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={linkUrgentQueue}
                          onChange={(e) => setLinkUrgentQueue(e.target.checked)}
                          className="w-4 h-4 text-[#84CC16] rounded border-white/20 focus:ring-[#84CC16] bg-black/60 cursor-pointer accent-[#84CC16]"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold text-xs">คำสั่งเฉพาะเจาะจง / ลิงก์งานอีเวนต์:</label>
                    <input
                      type="text"
                      value={linkCustomInstructions}
                      onChange={(e) => setLinkCustomInstructions(e.target.value)}
                      placeholder="เช่น คอนเสิร์ตรอบ 19:00 น. ขอสายรัดข้อมือโซนยืน หรือนัดรับบัตรหน้าประตู 1"
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-[#84CC16] text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Safety & Real-Time Photo Update */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#162704]/60 via-[#0E1B02]/60 to-black/50 border border-[#84CC16]/40 space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#84CC16]" />
                  <h5 className="text-[11px] font-bold text-white">ระบบอัศวินพิทักษ์ตั๋ว & ส่งภาพถ่ายหลักฐาน</h5>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  พี่วินจะส่งภาพถ่ายตั๋วตัวจริง/สายรัดข้อมือ/คิวหน้างาน ผ่านระบบแชตสดแบบเรียลไทม์ พร้อมประกันตั๋วสูญหาย 100% ผ่านกองทุนเสรี 5 บาท
                </p>
              </div>
            </div>
          )}

          {/* TOTAL & SUBMIT BUTTONS */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">ค่าบริการเพิ่มเติมสำหรับออปชันนี้:</span>
              <span className="text-amber-400 font-black text-sm">
                +฿{calculateTotalAddon().toFixed(2)}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className={`flex-2 py-3 rounded-2xl bg-gradient-to-r ${header.btnGradient} ${header.btnText} hover:brightness-110 font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-white/20`}
                style={{
                  boxShadow: `0 0 20px ${header.hex}40`
                }}
              >
                <Sparkles className="w-4 h-4" />
                <span>ยืนยันข้อมูล & เริ่มค้นหาพี่วิน →</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
