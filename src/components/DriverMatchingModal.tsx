import React, { useState, useEffect, useMemo } from 'react';
import { MatchedDriver, DreamRideVehicle, LifestylePlace } from '../types';
import { KNIGHT_DRIVERS_POOL } from '../data/driversData';
import { LIFESTYLE_PLACES } from '../data/lifestyleData';
import { 
  RELIGIOUS_SERVICES_DATA, 
  SACRED_MU_PRAYERS, 
  ReligiousActivityOption, 
  SacredPrayerItem 
} from '../data/religiousData';
import { 
  BANGKOK_TRANSIT_STATIONS, 
  TRANSIT_CATEGORIES, 
  TransitStation 
} from '../data/transitData';
import { playTactileBlip, playRadarScan, speakThaiText } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  Sparkles, 
  MapPin, 
  Clock, 
  Star, 
  CheckCircle2, 
  UserCheck, 
  Package, 
  Heart, 
  Users, 
  Coffee, 
  Share2, 
  Zap, 
  Flame,
  X,
  Phone,
  Bike,
  MessageSquare,
  Send,
  AlertCircle,
  HelpCircle,
  Volume2,
  BookOpen,
  Check,
  Compass,
  Smile,
  CheckSquare
} from 'lucide-react';

// Helper function: Distance-based pickup surcharge
// "กรณีที่พี่วินอยู่ไกลจากจุดที่ลูกค้าให้ไปรับเกิน1กิโลเมตร จะบวกเพิ่มตามความไกลยิ่งไกลยิ่งบวกเยอะเริ่มต้น20บาท"
export const calculatePickupDistanceSurcharge = (distanceKm: number): number => {
  if (distanceKm <= 1.0) return 0;
  return 20 + Math.round((distanceKm - 1.0) * 8);
};

// Helper function: Dream Ride Vehicle Matching
export const checkDreamRideMatch = (driverVehicleModel: string, dreamRide: DreamRideVehicle) => {
  const dv = driverVehicleModel.toLowerCase();
  const dName = dreamRide.name.toLowerCase();
  const dBrand = (dreamRide.specs.brand || '').toLowerCase();
  const dModel = (dreamRide.specs.brandAndModel || '').toLowerCase();

  const isExact = dv.includes(dName) || dName.includes(dv) || dv.includes(dModel) || (dModel && dv.includes(dModel.slice(0, 8)));
  const isBrand = dBrand ? dv.includes(dBrand.split(' ')[0]) : false;

  return {
    isExact,
    isBrand,
    label: isExact 
      ? `🎯 ตรงรุ่นรถในฝัน 100% (${dreamRide.name})`
      : isBrand 
      ? `✨ แบรนด์เดียวกัน (${dreamRide.specs.brand})`
      : null
  };
};

interface DriverMatchingModalProps {
  serviceId: string;
  serviceName: string;
  selectedDestination: string;
  selectedDreamRide: DreamRideVehicle;
  totalCalculatedFare: number;
  audioEnabled: boolean;
  customerGender?: 'female' | 'male';
  isAutoSelectedVehicle?: boolean;
  onClose: () => void;
  onConfirmMatch: (driver: MatchedDriver) => void;
  onSelectLifestylePlace?: (place: LifestylePlace) => void;
  onSelectReligiousDestination?: (placeName: string) => void;
  onChangeCustomerGender?: (gender: 'female' | 'male') => void;
}

export const DriverMatchingModal: React.FC<DriverMatchingModalProps> = ({
  serviceId,
  serviceName,
  selectedDestination,
  selectedDreamRide,
  totalCalculatedFare,
  audioEnabled,
  customerGender = 'female',
  isAutoSelectedVehicle = false,
  onClose,
  onConfirmMatch,
  onSelectLifestylePlace,
  onSelectReligiousDestination,
  onChangeCustomerGender
}) => {
  const [matchingStep, setMatchingStep] = useState<'scanning' | 'results'>('scanning');
  const [selectedDriver, setSelectedDriver] = useState<MatchedDriver | null>(null);
  const [activeLifestyleCategory, setActiveLifestyleCategory] = useState<'all' | 'restaurant' | 'cafe' | 'pub' | 'chill' | 'pet_cafe' | 'temple'>('all');
  const [matchingProgress, setMatchingProgress] = useState(15);
  
  // Local gender state for reactive switching
  const [currentGender, setCurrentGender] = useState<'female' | 'male'>(customerGender);

  // Religious Activities & Mu Tab States
  const [activeReligiousCategory, setActiveReligiousCategory] = useState<string>('all');
  const [selectedReligiousActivity, setSelectedReligiousActivity] = useState<ReligiousActivityOption | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<SacredPrayerItem | null>(null);
  
  // Transit Hubs (WIN Link) State
  const [activeTransitCategory, setActiveTransitCategory] = useState<string>('all');
  const [transitSearchQuery, setTransitSearchQuery] = useState<string>('');
  const [selectedTransitStation, setSelectedTransitStation] = useState<TransitStation | null>(null);

  const [activeTab, setActiveTab] = useState<'drivers' | 'sacred_mu' | 'religion_spirit' | 'transit_hub'>(
    serviceId === 'link' ? 'transit_hub' : 'drivers'
  );

  // Mutual Consent & Pre-Ride Detail Chat Dialog
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [consentDriver, setConsentDriver] = useState<MatchedDriver | null>(null);
  const [preTripNote, setPreTripNote] = useState<string>('');
  const [consentAgreed, setConsentAgreed] = useState<boolean>(false);
  const [consentMessages, setConsentMessages] = useState<{ sender: 'user' | 'driver'; text: string; time: string }[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  // Sync prop gender
  useEffect(() => {
    setCurrentGender(customerGender);
  }, [customerGender]);

  // Criteria rules based on service and gender
  const serviceCriteria = useMemo(() => {
    switch (serviceId) {
      case 'express':
        return {
          title: 'เกณฑ์จับคู่อัศวิน WIN Express',
          badge: 'กล่องพัสดุ/อาหาร (ลดเหลือ 5฿) + เลเวล 10+',
          rules: [
            'ค่ากล่องใส่พัสดุ/เอกสาร/อาหาร ปรับลดพิเศษเหลือ +฿5.00 รวมในใบเสร็จแล้วเพื่อประชาชน',
            'คัดกรองเฉพาะพี่วินระดับ Level 10 ขึ้นไปเท่านั้น (ผ่านการตรวจสอบประวัติ)',
            'ต้องมีกล่องเก็บสัมภาระนิรภัยกันกระแทก ซีลกันน้ำ และฉนวนรักษาอุณหภูมิ'
          ],
          color: 'text-emerald-400',
          borderColor: 'border-emerald-500/40',
          bgGlow: 'from-emerald-500/20 to-transparent'
        };
      case 'mu':
        return {
          title: 'เกณฑ์จับคู่อัศวิน WIN MU BUDDY',
          badge: currentGender === 'female' 
            ? 'ลูกค้าผู้หญิง 👩 ➔ แนะนำพี่วินผู้หญิง (Lady Knight) เลเวล 15+' 
            : 'ลูกค้าผู้ชาย 👨 ➔ แนะนำพี่วินผู้ชาย เลเวล 15+',
          rules: [
            currentGender === 'female'
              ? 'ระบบแนะนำและจับคู่พี่วินผู้หญิงที่เหมาะสม เลเวล 15 ขึ้นไป (Lady Knight) เพื่อความสบายใจ 100%'
              : 'ระบบแนะนำและจับคู่พี่วินผู้ชายที่เชี่ยวชาญสายมู เลเวล 15 ขึ้นไป',
            'หากลูกค้าต้องการเลือกพี่วินเอง (หรือข้ามเพศ) ระบบจะเปิดขั้นตอนขอความสมัครใจพี่วินและคุยรายละเอียดก่อนเริ่มงาน',
            'ผ่านการอบรมเส้นทางไหว้พระ 9 วัด, มนต์พิธี, จุดเช็คอินสายมู, และมีบทสวดมนต์ศักดิ์สิทธิ์ประจำตัว'
          ],
          color: 'text-[#FFD700]',
          borderColor: 'border-[#FFD700]/40',
          bgGlow: 'from-[#FFD700]/20 to-transparent'
        };
      case 'spirit':
        return {
          title: 'เกณฑ์จับคู่อัศวิน WIN Spirit (ดูแลผู้สูงอายุ & พาทำศาสนกิจทุกศาสนา)',
          badge: 'อบรมดูแลผู้สูงอายุ + เลเวล 20+ (ศาสนาพุทธ/อิสลาม/คริสต์/ฮินดู/ซิกข์/จีน)',
          rules: [
            'พี่วินต้องมีระดับ Level 20 ขึ้นไป (Platinum Sovereign) ผ่านการตรวจสอบประวัติสูงสุด',
            'ผ่านการอบรมหลักสูตรการดูแลและประคองผู้สูงอายุจากสถานพยาบาลชั้นนำ',
            'บริการพาคุณตา/คุณยายไปทำศาสนกิจทุกศาสนา เช่น พาคุณตาไปละหมาดที่มัสยิด, พาคุณยายไปทำบุญตักบาตร, พาไปโบสถ์คริสต์, หรือศาลเจ้า',
            'ขับขี่ด้วยความเร็วคงที่นุ่มนวลสูงสุด (Gentle & Safe Escort) พร้อมบริการรอรับกลับ'
          ],
          color: 'text-rose-400',
          borderColor: 'border-rose-500/40',
          bgGlow: 'from-rose-500/20 to-transparent'
        };
      case 'family':
        return {
          title: 'เกณฑ์จับคู่อัศวิน WIN Family',
          badge: 'อบรมดูแลเด็ก & หมวกกันน็อกเด็ก + เลเวล 15+',
          rules: [
            'พี่วินต้องมีระดับ Level 15 ขึ้นไป (Gold Sovereign)',
            'ผ่านการอบรมการดูแลความปลอดภัยเด็กและเยาวชน (Child Care Safety)',
            'มียานพาหนะพร้อมหมวกกันน็อกเด็กมาตรฐาน มอก. ทุกขนาด'
          ],
          color: 'text-blue-400',
          borderColor: 'border-blue-500/40',
          bgGlow: 'from-blue-500/20 to-transparent'
        };
      case 'link':
        return {
          title: 'เกณฑ์จับคู่อัศวิน WIN Link (เชื่อมต่อทุกระบบขนส่งมวลชน & ส่งด่วน)',
          badge: 'เชื่อมต่อ BTS, MRT, รถไฟ, ป้ายรถเมล์, รถทัวร์, ท่าเรือ และสนามบิน',
          rules: [
            'เชื่อมต่อสถานีรถไฟฟ้าทั้งหมด (BTS ทุกสาย, MRT น้ำเงิน/ม่วง/เหลือง/ชมพู, ARL, SRT สีแดง)',
            'เชื่อมต่อสถานีรถไฟ (สถานีกลางกรุงเทพอภิวัฒน์, หัวลำโพง, ธนบุรี, วงเวียนใหญ่)',
            'เชื่อมต่อป้ายรถเมล์หลัก (อนุสาวรีย์ชัยฯ, สยาม, ไอคอนสยาม, จตุจักร, ตลาดพลู)',
            'เชื่อมต่อสถานีรถทัวร์/บขส. (หมอชิต 2, เอกมัย, สายใต้ใหม่)',
            'เชื่อมต่อท่าเรือแม่น้ำเจ้าพระยาและคลองแสนแสบ (สาทร, ไอคอนสยาม, คลองสาน, วังหลัง, ประตูน้ำ)',
            'บริการส่งด่วนสายสัมพันธ์ระยะสั้น-กลาง (แม่ส่งข้าวกล่อง/เอกสารลืมไว้/ส่งสนามบิน)'
          ],
          color: 'text-cyan-300',
          borderColor: 'border-cyan-500/40',
          bgGlow: 'from-cyan-500/20 to-transparent'
        };
      case 'lifestyle':
        return {
          title: 'เกณฑ์จับคู่อัศวิน WIN Lifestyle',
          badge: 'กูรูร้านอาหาร คาเฟ่ ผับบาร์ คาเฟ่สัตว์เลี้ยง',
          rules: [
            'แนะนำร้านอาหาร คาเฟ่ ผับบาร์ ร้านนั่งชิว และคาเฟ่สัตว์เลี้ยง Pet Cafe',
            'พี่วินเชี่ยวชาญจุดจอดและทางลัดไปส่งถึงหน้าร้านโดยไม่ต้องหาที่จอด',
            'สามารถปักหมุดเลือกสถานที่แนะนำด้านล่างเพื่อไปส่งได้ทันที'
          ],
          color: 'text-purple-400',
          borderColor: 'border-purple-500/40',
          bgGlow: 'from-purple-500/20 to-transparent'
        };
      default:
        return {
          title: `เกณฑ์จับคู่อัศวิน ${serviceName}`,
          badge: `จับคู่ตรงตามพาหนะ (${selectedDreamRide.thaiName})`,
          rules: [
            `จับคู่อัศวินที่มียานพาหนะตรงตามรุ่น ${selectedDreamRide.thaiName}`,
            'ประกันอุบัติเหตุคุ้มครอง 100% ผ่านกองทุนคุ้มครองลูกค้า 5 บาท',
            'หมวกกันน็อกทุกรุ่นให้บริการฟรี 0 บาท'
          ],
          color: 'text-[#00D2FF]',
          borderColor: 'border-[#00D2FF]/40',
          bgGlow: 'from-[#00D2FF]/20 to-transparent'
        };
    }
  }, [serviceId, serviceName, selectedDreamRide, currentGender]);

  // Filter available drivers according to service and gender rules, plus Dream Ride vehicle matching
  const candidateDrivers = useMemo(() => {
    return KNIGHT_DRIVERS_POOL.filter(driver => {
      if (serviceId === 'express') {
        return driver.level >= 10 && driver.hasDeliveryBox;
      }
      if (serviceId === 'mu') {
        // MU BUDDY: Recommend matching gender with level 15+
        // If passenger is female, recommend female driver (Level 15+)
        // If passenger is male, recommend male driver (Level 15+)
        if (currentGender === 'female') {
          return driver.gender === 'female' && driver.level >= 15;
        } else {
          return driver.gender === 'male' && driver.level >= 15;
        }
      }
      if (serviceId === 'spirit') {
        return driver.level >= 20;
      }
      if (serviceId === 'family') {
        return driver.level >= 15;
      }
      if (serviceId === 'lifestyle') {
        return driver.specialtyTags.some(t => t.includes('Lifestyle') || t.includes('คาเฟ่') || t.includes('สตรีทฟู้ด'));
      }
      if (serviceId === 'link') {
        return driver.specialtyTags.some(t => t.includes('Link') || t.includes('Express') || t.includes('ส่ง'));
      }
      return true;
    }).sort((a, b) => {
      const matchA = checkDreamRideMatch(a.vehicleModel, selectedDreamRide);
      const matchB = checkDreamRideMatch(b.vehicleModel, selectedDreamRide);
      const scoreA = a.serviceMatchScore + (matchA.isExact ? 40 : matchA.isBrand ? 20 : 0);
      const scoreB = b.serviceMatchScore + (matchB.isExact ? 40 : matchB.isBrand ? 20 : 0);
      return scoreB - scoreA;
    });
  }, [serviceId, currentGender, selectedDreamRide]);

  // Alternative drivers (for manual choice / opposite gender / other specialties)
  const allOtherDrivers = useMemo(() => {
    return KNIGHT_DRIVERS_POOL.filter(d => !candidateDrivers.some(cd => cd.id === d.id));
  }, [candidateDrivers]);

  // Lifestyle recommendations filtered list
  const filteredLifestylePlaces = useMemo(() => {
    if (activeLifestyleCategory === 'all') return LIFESTYLE_PLACES;
    return LIFESTYLE_PLACES.filter(p => p.category === activeLifestyleCategory);
  }, [activeLifestyleCategory]);

  // Religious activities filtered list
  const filteredReligiousActivities = useMemo(() => {
    if (activeReligiousCategory === 'all') return RELIGIOUS_SERVICES_DATA;
    return RELIGIOUS_SERVICES_DATA.filter(r => r.religion === activeReligiousCategory);
  }, [activeReligiousCategory]);

  // Simulated AI Radar Matching
  useEffect(() => {
    if (audioEnabled) playRadarScan();
    setMatchingProgress(15);
    setMatchingStep('scanning');
    
    const timer1 = setTimeout(() => setMatchingProgress(45), 350);
    const timer2 = setTimeout(() => setMatchingProgress(85), 750);
    const timer3 = setTimeout(() => {
      setMatchingProgress(100);
      setMatchingStep('results');
      if (candidateDrivers.length > 0) {
        setSelectedDriver(candidateDrivers[0]);
        if (audioEnabled) {
          playTactileBlip(1200);
          speakThaiText(`พบอัศวินที่ตรงตามเงื่อนไขของ ${serviceName} แล้ว: ${candidateDrivers[0].name} ระดับเลเวล ${candidateDrivers[0].level}`);
        }
      }
    }, 1100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [candidateDrivers, serviceName, audioEnabled, currentGender]);

  const handleGenderToggle = (newGender: 'female' | 'male') => {
    if (audioEnabled) playTactileBlip(1000);
    setCurrentGender(newGender);
    if (onChangeCustomerGender) {
      onChangeCustomerGender(newGender);
    }
  };

  // Open consent dialog when custom choosing a driver
  const handleInitiateConsent = (driver: MatchedDriver) => {
    if (audioEnabled) playTactileBlip(1100);
    setConsentDriver(driver);
    setShowConsentModal(true);
    setConsentAgreed(false);
    
    const defaultNote = serviceId === 'mu' 
      ? 'ขอให้พาไหว้พระขอพรและแนะนำบทสวดมนต์ที่ถูกต้อง พร้อมช่วยถือของไหว้'
      : serviceId === 'spirit'
      ? 'ขอให้ช่วยประคองคุณตา/คุณยายขึ้นลงรถอย่างระมัดระวัง และรอรับกลับหลังเสร็จสิ้นศาสนกิจ'
      : 'ยินดีปฏิบัติตามมาตรฐานความปลอดภัยและการบริการอย่างสุภาพ';
    
    setPreTripNote(defaultNote);
    
    // Seed initial message exchange
    setConsentMessages([
      {
        sender: 'driver',
        text: `สวัสดีครับ/ค่ะ ผม/ดิฉัน ${driver.nickname} (เลเวล ${driver.level}) ยินดีให้บริการครับ/ค่ะ กรุณาระบุรายละเอียดที่ต้องการให้ดูแลเพิ่มเติม หรือสอบถามเงื่อนไขได้เลยครับ/ค่ะ`,
        time: 'เมื่อสักครู่'
      }
    ]);
  };

  const handleSendConsentMessage = () => {
    if (!preTripNote.trim() || !consentDriver) return;
    if (audioEnabled) playTactileBlip(1300);
    
    const userMsg = preTripNote.trim();
    const newMessages = [
      ...consentMessages,
      { sender: 'user' as const, text: userMsg, time: 'ตอนนี้' }
    ];
    setConsentMessages(newMessages);
    setIsSendingMessage(true);
    
    setTimeout(() => {
      setIsSendingMessage(false);
      const replyMsg = serviceId === 'mu'
        ? `ยินดีรับงานและเข้าใจรายละเอียดเรียบร้อยแล้วครับ/ค่ะ พร้อมพาไหว้ตามเส้นทางและมีบทสวดมนต์จัดเตรียมไว้ให้เรียบร้อยครับ`
        : serviceId === 'spirit'
        ? `เข้าใจและพร้อมดูแลผู้สูงอายุอย่างนุ่มนวล ปลอดภัย และจะคอยรอรับกลับตามเวลาที่กำหนดแน่นอนครับ/ค่ะ`
        : `รับทราบรายละเอียดเรียบร้อยครับ/ค่ะ ยินดีรับงานและออกเดินทางทันทีครับ`;
      
      setConsentMessages([
        ...newMessages,
        { sender: 'driver' as const, text: replyMsg, time: 'ตอนนี้' }
      ]);
      setConsentAgreed(true);
      if (audioEnabled) {
        playTactileBlip(1500);
        speakThaiText(`พี่วิน ${consentDriver.nickname} ให้ความยินยอมและตอบรับข้อตกลงเรียบร้อยแล้ว`);
      }
    }, 900);
  };

  const handleConfirmConsent = () => {
    if (!consentDriver) return;
    setSelectedDriver(consentDriver);
    setShowConsentModal(false);
    if (audioEnabled) playTactileBlip(1200);
  };

  const handleConfirm = () => {
    if (!selectedDriver) return;
    if (audioEnabled) {
      playRadarScan();
      speakThaiText(`ยืนยันเรียกรถ ${selectedDriver.nickname} มารับเรียบร้อยแล้ว`);
    }
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#00D2FF', '#FFD700', '#10B981']
    });
    onConfirmMatch(selectedDriver);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#09152C] rounded-3xl border-2 border-cyan-500/60 p-4 sm:p-5 shadow-[0_0_50px_rgba(0,210,255,0.4)] space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00D2FF] to-blue-600 flex items-center justify-center text-xl shadow-lg">
              🎯
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>ระบบจับคู่อัศวินอัจฉริยะ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  {serviceName}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-mono flex items-center gap-1">
                <span>ปลายทาง:</span>
                <strong className="text-white truncate max-w-[200px] sm:max-w-xs">{selectedDestination}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Gender Switcher (Crucial for WIN MU BUDDY & personalized matching) */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/60 via-[#0B1A38] to-purple-950/60 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-[#00D2FF]" />
            <div>
              <span className="text-xs font-bold text-white block">เพศของผู้โดยสาร (Passenger Gender)</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {serviceId === 'mu' 
                  ? 'ระบบจะจับคู่อัศวินเพศเดียวกันเลเวล 15+ ให้อัตโนมัติเพื่อความสบายใจ'
                  : 'คัดกรองและปรับสเปกความปลอดภัยตามสรีระผู้โดยสาร'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10 w-full sm:w-auto justify-center">
            <button
              onClick={() => handleGenderToggle('female')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                currentGender === 'female'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👩</span>
              <span>ผู้หญิง (Female)</span>
            </button>
            <button
              onClick={() => handleGenderToggle('male')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                currentGender === 'male'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👨</span>
              <span>ผู้ชาย (Male)</span>
            </button>
          </div>
        </div>

        {/* Auto Economical Base Vehicle Indicator if user didn't choose dream ride manually */}
        {isAutoSelectedVehicle && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🛵 💰</span>
              <div>
                <span className="font-bold text-emerald-300">ระบบเลือกรถพื้นฐานประหยัดที่สุดให้อัตโนมัติ (Honda Wave 125i • เพิ่ม ฿0)</span>
                <p className="text-[10px] text-slate-300 font-mono">อัตราเริ่มต้นประหยัดสุด 15.00 บาท หรือแตะเพื่อเลือกรถในฝันในแท็บหลักได้ทุกเมื่อ</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
              ประหยัดสุด ฿0 Addon
            </span>
          </div>
        )}

        {/* Service Specific Criteria Banner */}
        <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${serviceCriteria.bgGlow} bg-[#060D1E] border ${serviceCriteria.borderColor} space-y-2`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className={`text-xs font-mono font-bold ${serviceCriteria.color} uppercase flex items-center gap-1.5`}>
              <ShieldCheck className="w-4 h-4" />
              {serviceCriteria.title}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-bold max-w-fit">
              {serviceCriteria.badge}
            </span>
          </div>

          <ul className="space-y-1 text-xs text-slate-200">
            {serviceCriteria.rules.map((rule, rIdx) => (
              <li key={rIdx} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="leading-tight text-[11px]">{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Feature Sub-Navigation Tabs (Drivers / Sacred Mu Prayers / Religious Spirit Escort) */}
        <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              setActiveTab('drivers');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'drivers'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>รายชื่ออัศวิน ({candidateDrivers.length})</span>
          </button>

          {serviceId === 'mu' && (
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setActiveTab('sacred_mu');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'sacred_mu'
                  ? 'bg-[#FFD700] text-slate-950 shadow-md'
                  : 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 hover:bg-[#FFD700]/20'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>บทสวดมนต์ & เส้นทางสายมู (5 บทสวด)</span>
            </button>
          )}

          {serviceId === 'spirit' && (
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setActiveTab('religion_spirit');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'religion_spirit'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>พาผู้สูงอายุทำศาสนกิจทุกศาสนา (6 ศาสนา)</span>
            </button>
          )}

          {/* Transit Hubs Tab */}
          <button
            onClick={() => {
              if (audioEnabled) playTactileBlip(850);
              setActiveTab('transit_hub');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'transit_hub'
                ? 'bg-gradient-to-r from-[#00D2FF] to-blue-500 text-slate-950 font-black shadow-md'
                : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>🚝 เชื่อมต่อสถานี (BTS/MRT/รถไฟ/รถเมล์/เรือ/รถทัวร์)</span>
          </button>
        </div>

        {/* TAB 1: DRIVERS MATCHING */}
        {activeTab === 'drivers' && (
          <div>
            {matchingStep === 'scanning' ? (
              <div className="py-8 text-center space-y-4">
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-40" />
                  <div className="absolute inset-2 rounded-full border border-cyan-500/60 animate-spin" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#00D2FF] to-blue-600 flex items-center justify-center text-2xl shadow-[0_0_20px_#00D2FF]">
                    🏍️
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">กำลังสแกนหาพี่วินที่ผ่านเกณฑ์คุณสมบัติ...</h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {serviceId === 'mu' 
                      ? `ค้นหาพี่วิน${currentGender === 'female' ? 'สุภาพสตรี' : 'สุภาพบุรุษ'} เลเวล 15+ ชำนาญสายมูและบทสวดมนต์...`
                      : serviceId === 'spirit'
                      ? 'ค้นหาพี่วินเลเวล 20+ ที่ผ่านการอบรมดูแลผู้สูงอายุและบริการพาทำศาสนกิจ...'
                      : 'ตรวจสอบระดับเลเวล, ใบรับรองการอบรม, และตำแหน่งดาวเทียม CI Capillary Map'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/60 rounded-full h-2.5 overflow-hidden border border-white/10 max-w-xs mx-auto">
                  <div 
                    className="bg-gradient-to-r from-[#00D2FF] to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${matchingProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Matching Results Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>
                      {serviceId === 'mu' 
                        ? `แนะนำพี่วิน${currentGender === 'female' ? 'ผู้หญิง' : 'ผู้ชาย'} เลเวล 15+ (${candidateDrivers.length} นาย):`
                        : `พบพี่วินตรงตามเงื่อนไข ${candidateDrivers.length} นาย:`}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    100% ตรวจประวัติแล้ว
                  </span>
                </div>

                {/* Recommended Candidate Drivers List */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {candidateDrivers.map((driver) => {
                    const isSelected = selectedDriver?.id === driver.id;
                    const dreamMatch = checkDreamRideMatch(driver.vehicleModel, selectedDreamRide);
                    const pickupSurcharge = calculatePickupDistanceSurcharge(driver.distanceKm);

                    return (
                      <div
                        key={driver.id}
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(900);
                          setSelectedDriver(driver);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-gradient-to-br from-[#0F2248] to-[#081329] border-[#00D2FF] shadow-[0_0_20px_rgba(0,210,255,0.3)]'
                            : 'bg-black/40 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-slate-900 p-0.5 shadow-md flex-shrink-0">
                              <div className="w-full h-full bg-[#070D1E] rounded-[14px] flex items-center justify-center text-xl">
                                {driver.avatarEmoji}
                              </div>
                              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full bg-[#FFD700] text-slate-950 font-black text-[8px] font-mono">
                                LV.{driver.level}
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-white">{driver.name}</h4>
                                <span className="text-[10px] font-mono text-cyan-300">({driver.nickname})</span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-bold">
                                  {driver.gender === 'female' ? '👩 หญิง' : '👨 ชาย'} • {driver.tierName}
                                </span>
                                {dreamMatch.label && (
                                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                                    dreamMatch.isExact 
                                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  }`}>
                                    {dreamMatch.label}
                                  </span>
                                )}
                              </div>

                              <p className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1">
                                <Bike className="w-3 h-3 text-cyan-400" />
                                <span className="font-semibold text-white">{driver.vehicleModel}</span>
                                <span className="text-slate-400 font-mono">({driver.plateNumber})</span>
                              </p>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mt-0.5 font-mono">
                                <span className="text-[#FFD700] font-bold flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {driver.rating.toFixed(2)}
                                </span>
                                <span>• {driver.totalTrips.toLocaleString()} เที่ยว</span>
                                <span className="text-emerald-400">• ห่าง {driver.distanceKm} กม. ({driver.etaMinutes} นาที)</span>
                                {pickupSurcharge > 0 && (
                                  <span className="text-amber-300 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/30">
                                    +฿{pickupSurcharge} ค่าเดินทางรับเกิน 1 กม.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              แมตช์ {driver.serviceMatchScore}%
                            </span>
                            
                            {/* Ask Driver Consent & Pre-trip Chat Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInitiateConsent(driver);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[9px] text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-mono transition-all"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>ถามรายละเอียด/ขอความยินยอม</span>
                            </button>
                          </div>
                        </div>

                        {/* Certifications Badge Pills */}
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                          {driver.certifications.slice(0, 3).map((cert, cIdx) => (
                            <span 
                              key={cIdx} 
                              className="px-2 py-0.5 rounded-lg bg-white/5 text-[9px] text-slate-300 flex items-center gap-1 border border-white/5"
                            >
                              <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{cert}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Section for Selecting Other Drivers Manually (Requires Driver Consent & Chat) */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>ต้องการเลือกพี่วินคนอื่น หรือเจาะจงบุคคล?</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      (ต้องถามความสมัครใจและคุยรายละเอียดก่อนเริ่มงาน)
                    </span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {allOtherDrivers.slice(0, 4).map((othDriver) => (
                      <div
                        key={othDriver.id}
                        onClick={() => handleInitiateConsent(othDriver)}
                        className="flex-shrink-0 w-44 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/60 hover:bg-amber-950/20 transition-all cursor-pointer space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{othDriver.avatarEmoji}</span>
                          <div className="truncate">
                            <h5 className="text-[11px] font-bold text-white truncate">{othDriver.name}</h5>
                            <span className="text-[9px] text-slate-400 font-mono">
                              LV.{othDriver.level} • {othDriver.gender === 'female' ? '👩 หญิง' : '👨 ชาย'}
                            </span>
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-300 line-clamp-1">{othDriver.vehicleModel}</p>
                        <button className="w-full py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold flex items-center justify-center gap-1">
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>ขอความยินยอม & แชต</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Section: WIN Lifestyle Recommendations */}
                {serviceId === 'lifestyle' && (
                  <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Coffee className="w-4 h-4 text-purple-400" />
                        <span>แนะนำร้านอาหาร คาเฟ่ ผับบาร์ & จุดเช็คอิน (เลือกเพื่อปักหมุด):</span>
                      </span>
                      <span className="text-[10px] text-purple-300 font-mono">
                        {LIFESTYLE_PLACES.length} สถานที่
                      </span>
                    </div>

                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: 'all', label: 'ทั้งหมด' },
                        { id: 'restaurant', label: '🍲 ร้านอาหาร' },
                        { id: 'cafe', label: '☕ คาเฟ่' },
                        { id: 'pub', label: '🍸 ผับบาร์' },
                        { id: 'chill', label: '🎶 นั่งชิว' },
                        { id: 'pet_cafe', label: '🐱 คาเฟ่สัตว์' },
                        { id: 'temple', label: '⛩️ สายมู 9 วัด' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            if (audioEnabled) playTactileBlip(800);
                            setActiveLifestyleCategory(tab.id as any);
                          }}
                          className={`px-2 py-1 rounded-lg text-[9px] font-mono whitespace-nowrap transition-all ${
                            activeLifestyleCategory === tab.id
                              ? 'bg-purple-500 text-white font-bold'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {filteredLifestylePlaces.map((place) => (
                        <div
                          key={place.id}
                          onClick={() => {
                            if (audioEnabled) playTactileBlip(950);
                            if (onSelectLifestylePlace) {
                              onSelectLifestylePlace(place);
                            }
                          }}
                          className="p-2 rounded-xl bg-black/40 border border-white/10 hover:border-purple-400 hover:bg-purple-900/20 transition-all cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-white">
                            <span className="flex items-center gap-1 truncate">
                              <span>{place.icon}</span>
                              <span className="truncate">{place.name}</span>
                            </span>
                            <span className="text-[9px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded">
                              {place.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{place.highlight}</p>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span>📍 {place.area}</span>
                            <span className="text-[#FFD700]">★ {place.rating} • {place.distanceKm} กม.</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SACRED MU PRAYERS & ROUTES (WIN MU BUDDY) */}
        {activeTab === 'sacred_mu' && (
          <div className="space-y-3 animate-fade-in">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#1A1202] to-amber-900/20 border border-[#FFD700]/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⛩️ 🪔</span>
                <div>
                  <h4 className="text-xs font-bold text-[#FFD700]">คลังบทสวดมนต์ & เส้นทางสายมู 9 วัด</h4>
                  <p className="text-[10px] text-slate-300 font-mono">เลือกเพื่อเปิดดูบทสวดมนต์ ฟังเสียงสวด หรือปักหมุดเป็นปลายทางทริป</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 font-bold">
                MU BUDDY EXCLUSIVE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {SACRED_MU_PRAYERS.map((prayer) => (
                <div
                  key={prayer.id}
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(1000);
                    setSelectedPrayer(prayer);
                  }}
                  className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-[#FFD700] hover:bg-[#FFD700]/10 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{prayer.icon}</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] font-bold">
                      {prayer.blessingType}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-white line-clamp-1">{prayer.titleTh}</h5>
                  <p className="text-[10px] text-slate-300 line-clamp-2">{prayer.thaiTranslation}</p>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1 border-t border-white/5">
                    <span>📍 {prayer.location}</span>
                    <span className="text-[#FFD700] font-bold">แตะเพื่ออ่านบทสวด ➔</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Prayer Reader Popout */}
            {selectedPrayer && (
              <div className="p-4 rounded-2xl bg-[#0D182E] border-2 border-[#FFD700] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedPrayer.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{selectedPrayer.titleTh}</h4>
                      <span className="text-[10px] text-[#FFD700] font-mono">ณ {selectedPrayer.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (audioEnabled) {
                          speakThaiText(`${selectedPrayer.titleTh}. ${selectedPrayer.baliChant}`);
                        }
                      }}
                      className="px-2.5 py-1 rounded-xl bg-[#FFD700] text-slate-950 text-[10px] font-mono font-bold flex items-center gap-1 hover:brightness-110"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>ฟังสวด AI</span>
                    </button>
                    <button
                      onClick={() => setSelectedPrayer(null)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-[#FFD700] block">บทสวดภาษาบาลี/คาถาบูชา:</span>
                  <p className="text-xs text-amber-200 font-mono whitespace-pre-line leading-relaxed">
                    {selectedPrayer.baliChant}
                  </p>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <strong className="text-white text-[11px] block">คำแปลและอานุภาพ:</strong>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{selectedPrayer.thaiTranslation}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                  <strong>วิธีสักการะ:</strong> {selectedPrayer.howToWorship}
                </div>

                <button
                  onClick={() => {
                    if (onSelectReligiousDestination) {
                      onSelectReligiousDestination(selectedPrayer.location);
                    }
                    if (audioEnabled) playTactileBlip(1200);
                  }}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>ปักหมุดสถานที่นี้เป็นปลายทางทริป</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TRANSIT HUBS & CONNECTIVITY (WIN LINK) */}
        {activeTab === 'transit_hub' && (
          <div className="space-y-3 animate-fade-in">
            {/* Header Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#071E3D] via-[#0A2647] to-[#07132B] border border-cyan-400/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🚝 🚇 🚆 🚌 🚢</span>
                <div>
                  <h4 className="text-xs font-bold text-cyan-300">บริการ WIN Link เชื่อมต่อทุกระบบขนส่งมวลชน</h4>
                  <p className="text-[10px] text-slate-300 font-mono">
                    เชื่อมต่อสถานีรถไฟฟ้าทั้งหมด (BTS/MRT ทุกสาย), สถานีรถไฟ, ป้ายรถเมล์, รถทัวร์, ท่าเรือ และสนามบิน
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold whitespace-nowrap">
                WIN LINK HUB
              </span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                value={transitSearchQuery}
                onChange={(e) => setTransitSearchQuery(e.target.value)}
                placeholder="🔍 ค้นหาสถานี เช่น BTS สยาม, MRT พระราม 9, หมอชิต 2, ท่าเรือสาทร, หัวลำโพง..."
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00D2FF]"
              />
              {transitSearchQuery && (
                <button
                  onClick={() => setTransitSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {TRANSIT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setActiveTransitCategory(cat.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono whitespace-nowrap transition-all flex items-center gap-1 ${
                    activeTransitCategory === cat.id
                      ? 'bg-[#00D2FF] text-slate-950 font-bold shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Filtered Transit Stations Grid */}
            {(() => {
              const filteredStations = BANGKOK_TRANSIT_STATIONS.filter(station => {
                const matchesCategory = 
                  activeTransitCategory === 'all' ||
                  (activeTransitCategory === 'concert_event' && (station.category === 'concert_arena' || station.category === 'sports_stadium' || station.category === 'entertainment_event' || station.ticketServiceAvailable)) ||
                  (activeTransitCategory === 'bts' && station.category === 'bts') ||
                  (activeTransitCategory === 'mrt' && station.category === 'mrt') ||
                  (activeTransitCategory === 'train_srt' && (station.category === 'train_srt' || station.category === 'train' || station.category === 'srt_red' || station.category === 'arl')) ||
                  (activeTransitCategory === 'bus_stop' && station.category === 'bus_stop') ||
                  (activeTransitCategory === 'bus_terminal' && station.category === 'bus_terminal') ||
                  (activeTransitCategory === 'pier' && station.category === 'pier') ||
                  (activeTransitCategory === 'airport' && (station.category === 'airport' || station.category === 'other'));

                const q = transitSearchQuery.toLowerCase().trim();
                const matchesQuery = !q || 
                  station.name.toLowerCase().includes(q) ||
                  station.nameEn.toLowerCase().includes(q) ||
                  station.lineName.toLowerCase().includes(q) ||
                  station.highlight.toLowerCase().includes(q) ||
                  station.popularConnections.some(c => c.toLowerCase().includes(q)) ||
                  (station.upcomingEvents && station.upcomingEvents.some(ev => ev.title.toLowerCase().includes(q) || ev.tag.toLowerCase().includes(q)));

                return matchesCategory && matchesQuery;
              });

              if (filteredStations.length === 0) {
                return (
                  <div className="py-8 text-center bg-black/40 rounded-2xl border border-white/10 space-y-2">
                    <span className="text-3xl">🔍</span>
                    <p className="text-xs text-slate-300 font-mono">ไม่พบสถานี/ฮอลล์ที่ตรงกับคำค้นหา "{transitSearchQuery}"</p>
                    <button
                      onClick={() => { setTransitSearchQuery(''); setActiveTransitCategory('all'); }}
                      className="px-3 py-1 rounded-xl bg-white/10 text-[10px] text-cyan-300 hover:bg-white/20 font-mono"
                    >
                      ล้างการค้นหา
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredStations.map((st) => (
                    <div
                      key={st.id}
                      className={`p-3 rounded-2xl bg-black/40 border transition-all space-y-2 ${
                        st.ticketServiceAvailable 
                          ? 'border-cyan-500/40 bg-gradient-to-br from-cyan-950/20 to-black/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                          : 'border-white/10 hover:border-cyan-400/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/30 flex items-center justify-center text-xl flex-shrink-0">
                            {st.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="text-xs font-bold text-white">{st.name}</h5>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                {st.badge}
                              </span>
                              {st.ticketServiceAvailable && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                                  🎫 จองตั๋ว & ต่อคิวได้
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {st.lineName}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono flex-shrink-0">
                          <span className="text-xs font-bold text-[#FFD700] block">~฿{st.estimatedFareThb}</span>
                          <span className="text-[9px] text-emerald-400">{st.distanceKm} กม.</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-tight">{st.highlight}</p>

                      {/* Upcoming Events for Concerts and Sports */}
                      {st.upcomingEvents && st.upcomingEvents.length > 0 && (
                        <div className="p-2 rounded-xl bg-[#06182B] border border-cyan-500/30 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-cyan-300 flex items-center gap-1">
                              <span>🔥</span> อีเวนต์ & การแข่งขันเร็วๆ นี้ (พี่วินช่วยกดตั๋ว/ต่อคิวได้):
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {st.upcomingEvents.map((ev, eIdx) => (
                              <div key={eIdx} className="p-1.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between gap-1 text-[9px]">
                                <div className="truncate">
                                  <span className="font-bold text-white block truncate">{ev.icon} {ev.title}</span>
                                  <span className="text-slate-400 font-mono text-[8px]">{ev.date} • {ev.tag}</span>
                                </div>
                                <span className="text-amber-300 font-mono font-bold flex-shrink-0">
                                  {ev.priceThb > 0 ? `฿${ev.priceThb}` : 'เข้าฟรี'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transfer and Popular Connections Chips */}
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                        {st.transferLines.map((tLine, tIdx) => (
                          <span key={tIdx} className="text-[9px] font-mono bg-white/5 text-slate-300 px-1.5 py-0.5 rounded border border-white/10">
                            🔗 {tLine}
                          </span>
                        ))}
                      </div>

                      {/* One-Click Destination Button */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-[9px] text-slate-400 font-mono">
                          🛵 วินพร้อมบริการ: <strong className="text-cyan-300">{st.winStandCount} คัน</strong>
                        </span>

                        <button
                          onClick={() => {
                            if (audioEnabled) {
                              playTactileBlip(1200);
                              speakThaiText(`ปักหมุดปลายทางไปยัง ${st.name}`);
                            }
                            if (onSelectReligiousDestination) {
                              onSelectReligiousDestination(st.name);
                            }
                            setActiveTab('drivers');
                          }}
                          className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-[10px] font-mono flex items-center gap-1 shadow-md transition-all"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>ปักหมุดไปสถานที่นี้ & จับคู่วิน</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Total Fare & Confirmation Button */}
        {(() => {
          const driverPickupSurcharge = selectedDriver ? calculatePickupDistanceSurcharge(selectedDriver.distanceKm) : 0;
          const finalFareWithPickup = totalCalculatedFare + driverPickupSurcharge;

          return (
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">
                  ยอดรวมค่าโดยสาร (คิดตามระยะทางเริ่ม 15฿ + กองทุนคุ้มครอง 5฿):
                </span>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-lg font-black text-[#FFD700] font-mono">
                    ฿{finalFareWithPickup.toFixed(2)}
                  </span>
                  {selectedDreamRide.priceAddon === 0 ? (
                    <span className="text-[10px] text-emerald-400 font-mono">(รถประหยัดสุด +฿0)</span>
                  ) : (
                    <span className="text-[10px] text-cyan-300 font-mono">(รวมค่ารถในฝัน +฿{selectedDreamRide.priceAddon})</span>
                  )}
                  {driverPickupSurcharge > 0 && (
                    <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                      (+฿{driverPickupSurcharge} ระยะรับเกิน 1 กม.)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedDriver}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ยืนยันให้อัศวินออกมารับทันที</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* DIALOG: DRIVER CONSENT & PRE-TRIP DETAIL CONFIRMATION MODAL */}
        {showConsentModal && consentDriver && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in">
            <div className="relative w-full max-w-lg bg-[#0C1B38] rounded-3xl border-2 border-amber-400/80 p-5 shadow-[0_0_50px_rgba(245,158,11,0.5)] space-y-4 max-h-[90vh] overflow-y-auto">
              
              {/* Consent Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-xl font-bold shadow-lg">
                    🤝
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <span>ขอความสมัครใจ & ตกลงรายละเอียดก่อนเริ่มงาน</span>
                    </h3>
                    <p className="text-[10px] text-amber-300 font-mono">
                      ระบบให้ความยินยอมสองฝ่าย (Mutual Consent & Pre-Ride Agreement)
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConsentModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Driver Info Card */}
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-2xl">
                    {consentDriver.avatarEmoji}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{consentDriver.name} ({consentDriver.nickname})</h4>
                    <span className="text-[10px] font-mono text-[#FFD700]">
                      LV.{consentDriver.level} • {consentDriver.gender === 'female' ? 'สุภาพสตรี 👩' : 'สุภาพบุรุษ 👨'} • {consentDriver.tierName}
                    </span>
                    <p className="text-[10px] text-slate-300 mt-0.5">{consentDriver.vehicleModel}</p>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px]">
                  <span className="text-emerald-400 font-bold block">★ {consentDriver.rating.toFixed(2)}</span>
                  <span className="text-slate-400">{consentDriver.totalTrips} เที่ยว</span>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>เงื่อนไขการให้บริการด้วยความสมัครใจ:</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed pl-4">
                  เพื่อความปลอดภัยและความสบายใจสูงสุดของทั้งผู้โดยสารและพี่วิน 
                  {currentGender !== consentDriver.gender && ' (กรณีเลือกผู้ให้บริการต่างเพศ)'} 
                  ระบบเปิดให้ส่งข้อความระบุขอบเขตงานและความต้องการพิเศษ โดยพี่วินต้องกดให้ความยินยอมก่อนเริ่มการเดินทาง
                </p>
              </div>

              {/* Simulated Chat Feed */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 font-bold block">
                  บทสนทนาตกลงเงื่อนไข (Pre-Trip Chat):
                </span>
                <div className="p-3 rounded-2xl bg-black/60 border border-white/10 min-h-32 max-h-44 overflow-y-auto space-y-2">
                  {consentMessages.map((msg, mIdx) => (
                    <div
                      key={mIdx}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-cyan-600 text-white rounded-br-none'
                            : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/10'
                        }`}
                      >
                        <span className="text-[9px] font-mono text-white/70 block mb-0.5">
                          {msg.sender === 'user' ? 'ผู้โดยสาร' : `${consentDriver.nickname} (พี่วิน)`} • {msg.time}
                        </span>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isSendingMessage && (
                    <div className="text-[10px] text-cyan-300 font-mono animate-pulse">
                      พี่วินกำลังอ่านรายละเอียดและพิมพ์ตอบกลับ...
                    </div>
                  )}
                </div>
              </div>

              {/* Message Input / Special Detail Form */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-300 font-bold block">
                  ระบุรายละเอียดที่ต้องการสอบถามหรือให้ดูแลเป็นพิเศษ:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={preTripNote}
                    onChange={(e) => setPreTripNote(e.target.value)}
                    placeholder="เช่น ช่วยพาไหว้พระ 3 วัด, ช่วยพยุงคุณตาขึ้นมัสยิด, หรือเดินทางเวลากลางคืน..."
                    className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleSendConsentMessage}
                    disabled={!preTripNote.trim() || isSendingMessage}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่ง</span>
                  </button>
                </div>
              </div>

              {/* Consent Agreement Box */}
              <div className="p-3 rounded-2xl bg-[#091224] border border-cyan-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${consentAgreed ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-slate-500'}`}>
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {consentAgreed ? 'พี่วินตกลงและยินดีรับงานแล้ว 100%' : 'รอการตกลงรายละเอียดและยินยอม'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {consentAgreed ? 'ทั้งสองฝ่ายเห็นพ้องในเงื่อนไขการเดินทาง' : 'กดส่งรายละเอียดด้านบนเพื่อรับการตอบรับ'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmConsent}
                  disabled={!consentAgreed}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg disabled:opacity-40 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>เลือกพี่วินคนนี้</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
