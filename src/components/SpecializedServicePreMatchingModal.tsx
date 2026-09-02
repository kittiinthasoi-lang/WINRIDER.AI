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
  Info
} from 'lucide-react';
import { playTactileBlip, speakThaiText } from '../utils/audio';

export interface SpecializedPreMatchingData {
  serviceId: 'express' | 'mu' | 'lifestyle' | 'spirit' | 'family' | string;
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
  // 1. EXPRESS STATE
  const [expressRecipientName, setExpressRecipientName] = useState('คุณสมศรี เจริญสุข');
  const [expressRecipientPhone, setExpressRecipientPhone] = useState('089-123-4567');
  const [expressDestination, setExpressDestination] = useState(destinationLocation || 'อาคาร Exchange Tower อโศก');
  const [expressPackageType, setExpressPackageType] = useState('เอกสาร & แฟ้มสัญญาสำคัญ');
  const [expressTransparentAgreed, setExpressTransparentAgreed] = useState(true);
  const [expressRequirePhotoProof, setExpressRequirePhotoProof] = useState(true);

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

  // Calculate dynamic fees
  const calculateTotalAddon = (): number => {
    if (serviceId === 'express') {
      return 5; // Express box fee (ลดเหลือ 5 บาท เพื่อประชาชน)
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
      express: serviceId === 'express' ? {
        recipientName: expressRecipientName,
        recipientPhone: expressRecipientPhone,
        destinationAddress: expressDestination,
        packageType: expressPackageType,
        transparentPackagingAccepted: expressTransparentAgreed,
        requirePhotoProof: expressRequirePhotoProof,
        boxFee: 5
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
      case 'express':
        return {
          title: 'ข้อมูลจัดส่งพัสดุด่วน (WIN Express)',
          sub: 'ระบุข้อมูลผู้รับ • ข้อกำหนดบรรจุภัณฑ์โปร่งใส • ตรวจสอบรูปถ่ายปลายทาง',
          badge: 'EXPRESS DISPATCH PROTOCOL',
          icon: <Package className="w-6 h-6 text-emerald-400" />,
          borderColor: 'border-emerald-500/60',
          glow: 'shadow-[0_0_35px_rgba(16,185,129,0.35)]',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
      case 'mu':
        return {
          title: 'บริการบัดดี้สายมู (WIN MU BUDDY)',
          sub: 'เลือกพี่วินเป็นเพื่อนร่วมทาง • ดูแล 30 นาที (+100฿) • เพิ่มเวลาได้',
          badge: 'SACRED BUDDY ESCORT',
          icon: <Sparkles className="w-6 h-6 text-amber-400" />,
          borderColor: 'border-amber-500/60',
          glow: 'shadow-[0_0_35px_rgba(245,158,11,0.35)]',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        };
      case 'lifestyle':
        return {
          title: 'บริการพี่วินถ่ายรูป (WIN Lifestyle)',
          sub: 'ให้พี่วินถ่ายรูป & ถ่ายคลิป (+20฿ ไม่เกิน 10 นาที) • ระบุธีมภาพถ่าย',
          badge: 'PHOTOGRAPHY ASSIST',
          icon: <Camera className="w-6 h-6 text-purple-400" />,
          borderColor: 'border-purple-500/60',
          glow: 'shadow-[0_0_35px_rgba(168,85,247,0.35)]',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
        };
      case 'spirit':
        return {
          title: 'บริการแวะซื้อของไหว้ & สิ่งของจำเป็น (WIN Spirit)',
          sub: 'เลือกรายการของไหว้ & สังฆทาน • พี่วินแวะซื้อก่อนถึงจุดหมาย',
          badge: 'SACRED OFFERINGS & SPIRIT CARE',
          icon: <Heart className="w-6 h-6 text-rose-400" />,
          borderColor: 'border-rose-500/60',
          glow: 'shadow-[0_0_35px_rgba(244,63,94,0.35)]',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        };
      case 'family':
        return {
          title: 'บริการส่งผู้สูงอายุ / ผู้พิการ / นักเรียน (WIN Family)',
          sub: 'เลือกประเภทผู้โดยสาร • ระบุจุดรับส่ง • ส่งภาพถ่ายยืนยันถึงที่หมาย',
          badge: 'FAMILY & SPECIAL CARE PROTOCOL',
          icon: <Users className="w-6 h-6 text-blue-400" />,
          borderColor: 'border-blue-500/60',
          glow: 'shadow-[0_0_35px_rgba(59,130,246,0.35)]',
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        };
      default:
        return {
          title: `เตรียมข้อมูลบริการ ${serviceName}`,
          sub: 'กรอกรายละเอียดเพิ่มเติมก่อนเริ่มค้นหาพี่วิน',
          badge: 'PRE-MATCHING SETUP',
          icon: <ShieldCheck className="w-6 h-6 text-cyan-400" />,
          borderColor: 'border-cyan-500/60',
          glow: 'shadow-[0_0_35px_rgba(0,210,255,0.35)]',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
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
              1. WIN EXPRESS: FORM & PACKAGING RULES & PHOTO VERIFICATION
             ========================================================================= */}
          {serviceId === 'express' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Mandatory Transparent Packaging Rule Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#06241B] to-[#041611] border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mt-0.5">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <span>ข้อกำหนดความปลอดภัยของบรรจุภัณฑ์ (MANDATORY RULE)</span>
                    </h4>
                    <p className="text-[11px] text-white font-bold leading-relaxed mt-1 bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-500/30">
                      "บรรจุภัณฑ์ที่ใส่ต้องใสมองเห็นสินค้าด้านใน ถ้าเป็นกล่องทึบต้องเจาะรูให้เห็นสินค้าด้านในชัดเจน"
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1">
                      เพื่อความปลอดภัยของผู้ขับขี่ ป้องกันสิ่งผิดกฎหมาย และปฏิบัติตามมาตรฐานสากล WIN Express
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/50 border border-emerald-500/30 cursor-pointer hover:bg-emerald-950/40 transition-all">
                  <input
                    type="checkbox"
                    required
                    checked={expressTransparentAgreed}
                    onChange={(e) => setExpressTransparentAgreed(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 rounded border-emerald-400 focus:ring-emerald-500 bg-black/60 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-emerald-200">
                    ข้าพเจ้ารับทราบและปฏิบัติตามข้อกำหนดบรรจุภัณฑ์โปร่งใส/เจาะรูมองเห็นสินค้าด้านในเรียบร้อยแล้ว ✓
                  </span>
                </label>
              </div>

              {/* Recipient & Destination Details */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h4 className="text-[11px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
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
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-emerald-400 text-xs"
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
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-emerald-400 text-xs font-mono"
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
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-emerald-400 text-xs"
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
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-sm'
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
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-black/50 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h5 className="text-[11px] font-bold text-white">ระบบตรวจสอบรูปถ่ายยืนยันการส่งของพี่วินเมื่อจบงาน</h5>
                      <span className="text-[9px] text-emerald-300 font-mono">Proof of Delivery (POD) Photo Verification</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                    เปิดใช้งาน ✓
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  เมื่อพี่วินส่งมอบพัสดุถึงมือผู้รับ ระบบจะบังคับให้พี่วินถ่ายภาพหลักฐานการส่งมอบ พร้อมบันทึกพิกัด GPS และเวลา Timestamp ส่งตรงให้ผู้ส่งตรวจสอบได้ทันที 100%
                </p>
              </div>

              {/* Surcharge breakdown banner */}
              <div className="p-2.5 rounded-xl bg-black/60 border border-emerald-500/30 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Package className="w-3.5 h-3.5" />
                  <span>ค่ากล่องใส่พัสดุคุมอุณหภูมิ (ปรับลดพิเศษเพื่อประชาชน):</span>
                </div>
                <span className="font-bold text-white">+฿5.00</span>
              </div>
            </div>
          )}

          {/* =========================================================================
              2. WIN MU BUDDY: CHOOSE BUDDY & DURATION (+100B / 30m, +50B / 15m) & OBJECTIVE
             ========================================================================= */}
          {serviceId === 'mu' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Want Buddy Toggle */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#241A05] to-[#120E04] border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-300">ต้องการให้พี่วินเป็นบัดดี้ (เพื่อนร่วมทาง/ผู้นำสวด)?</h4>
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
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
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
                  <div className="pt-2 border-t border-amber-500/20 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-200">ราคามาตรฐานบัดดี้ (ดูแล 30 นาที):</span>
                      <span className="text-amber-400 font-bold">+฿100.00</span>
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
                                ? 'bg-amber-400 text-slate-950 font-black border-amber-400 shadow-md'
                                : 'bg-black/40 border-white/10 text-slate-300 hover:border-amber-400/50'
                            }`}
                          >
                            <div className="text-[11px]">{tier.label}</div>
                            <div className="text-[10px] text-amber-500 font-bold">{tier.price}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/60 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">รวมเวลาดูแล: {30 + muExtraTime} นาที</span>
                      <span className="text-amber-400 font-black text-sm">
                        ค่าบริการบัดดี้: +฿{(100 + (muExtraTime / 15) * 50).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Travel Objective Selector */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                <label className="block text-[11px] font-mono font-bold text-amber-300 uppercase">
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
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
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
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              3. WIN LIFESTYLE: CHOOSE PHOTO SERVICE (+20B / 10m) & THEMES
             ========================================================================= */}
          {serviceId === 'lifestyle' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Want Photo Service Toggle */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#200B33] to-[#10051B] border-2 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-purple-300">บริการพี่วินถ่ายรูป (Photography Assistant)</h4>
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
                          ? 'bg-purple-400 text-slate-950 font-black shadow-sm'
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
                  <div className="pt-2 border-t border-purple-500/20 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-purple-200">
                      <span>ค่าบริการพี่วินถ่ายภาพ (ระยะเวลาไม่เกิน 10 นาที):</span>
                      <span className="text-purple-400 font-bold">+฿20.00</span>
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
                  <label className="block text-[11px] font-mono font-bold text-purple-300 uppercase">
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
                            ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
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
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-purple-400 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              4. WIN SPIRIT: CHOOSE TO STOP BUY SACRED OFFERINGS & ITEMS
             ========================================================================= */}
          {serviceId === 'spirit' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Want Stop Buy Toggle */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#290B12] to-[#140508] border-2 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-rose-300">ต้องการแวะซื้อสิ่งของจำเป็น & ของไหว้?</h4>
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
                          ? 'bg-rose-500 text-white font-black shadow-sm'
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
                  <div className="pt-2 border-t border-rose-500/20 space-y-2.5">
                    <div>
                      <label className="block text-slate-300 mb-1 font-bold">ระบุร้านค้า / ตลาดที่ต้องการให้แวะ:</label>
                      <input
                        type="text"
                        value={spiritMarketName}
                        onChange={(e) => setSpiritMarketName(e.target.value)}
                        placeholder="เช่น แผงดอกไม้หน้าวัด หรือตลาดสดข้างทาง"
                        className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-rose-400 text-xs"
                      />
                    </div>

                    {/* Items Checklist */}
                    <div>
                      <label className="block text-[11px] font-bold text-rose-300 mb-1.5">
                        เลือกรายการของไหว้ & สิ่งของที่ต้องการให้ซื้อ:
                      </label>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {spiritItems.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                              item.count > 0
                                ? 'bg-rose-950/40 border-rose-500/60 text-white'
                                : 'bg-black/40 border-white/5 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{item.icon}</span>
                              <div>
                                <div className="font-bold text-slate-200">{item.name}</div>
                                <div className="text-[10px] text-amber-300 font-mono">฿{item.price} / หน่วย</div>
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
                                className="w-6 h-6 rounded-lg bg-rose-500/40 hover:bg-rose-500/60 border border-rose-500/60 flex items-center justify-center text-white font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/60 border border-rose-500/30 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">ประมาณการค่าของไหว้รวม:</span>
                      <span className="text-rose-400 font-black text-sm">
                        +฿{spiritItems.reduce((sum, it) => sum + it.price * it.count, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              5. WIN FAMILY: PASSENGER TYPE (ELDERLY, DISABLED, STUDENT) & SAFE ARRIVAL PHOTO
             ========================================================================= */}
          {serviceId === 'family' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Passenger Type Selector */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0B1A36] to-[#050D1C] border-2 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-black text-blue-300">เลือกประเภทผู้โดยสารที่ต้องการการดูแลพิเศษ:</h4>
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
                          ? 'bg-blue-500/25 border-blue-400 text-white shadow-md font-bold'
                          : 'bg-black/40 border-white/10 text-slate-300 hover:border-blue-400/40'
                      }`}
                    >
                      <div className="text-xs font-bold text-blue-200">{pType.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{pType.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Pickup & Dropoff Location + Contact */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h5 className="text-[11px] font-mono font-bold text-cyan-400 uppercase">
                  จุดรับ-ส่ง อย่างละเอียด & ผู้ติดต่อฉุกเฉิน
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
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-blue-400 text-xs"
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
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-blue-400 text-xs"
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
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-blue-400 text-xs"
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
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-blue-400 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Safe Arrival Photo Verification System */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black/50 border border-blue-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h5 className="text-[11px] font-bold text-white">ระบบส่งภาพถ่ายยืนยันเมื่อส่งถึงที่หมายอย่างปลอดภัย</h5>
                      <span className="text-[9px] text-cyan-300 font-mono">Safe Arrival Photo Notification & Parent Alert</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={familySafePhoto}
                      onChange={(e) => setFamilySafePhoto(e.target.checked)}
                      className="w-4 h-4 text-blue-500 rounded border-white/20 focus:ring-blue-400 bg-black/60"
                    />
                    <span className="text-[10px] text-blue-200 font-bold">เปิดระบบ</span>
                  </label>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  เมื่อส่งผู้โดยสารถึงที่หมาย พี่วินจะถ่ายภาพยืนยันว่าส่งถึงมือครู/ญาติ/เจ้าหน้าที่ พร้อมส่งแจ้งเตือนเข้าสมาร์ตโฟนของผู้ปกครองทันที
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
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] via-blue-500 to-indigo-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
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
