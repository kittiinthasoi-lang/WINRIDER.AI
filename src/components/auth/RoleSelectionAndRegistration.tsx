import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { 
  getFeeRules, 
  satangToBaht, 
  bpsToPercent, 
  FeeRuleItem,
  INITIAL_FEE_RULES
} from '../../services/feeRulesService';
import { 
  subscribeFoundingKnightCounter,
  registerKnight,
  registerCitizen,
  registerMerchant,
  registerPartner
} from '../../services/registrationService';
import { uploadKycDocument } from '../../utils/imageUpload';
import { playTactileBlip } from '../../utils/audio';
import { 
  Bike, 
  User, 
  Store, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight, 
  ArrowLeft, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LogOut,
  Info,
  Flame,
  FileCheck
} from 'lucide-react';

interface Props {
  onCompleted?: () => void;
}

export const RoleSelectionAndRegistration: React.FC<Props> = ({ onCompleted }) => {
  const { firebaseUser, refreshUserData, signOut } = useAuth();

  // State
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  // Registration must remain usable without spending Firestore reads just to render the form.
  const [feeRules, setFeeRules] = useState<FeeRuleItem[]>(INITIAL_FEE_RULES);
  const [foundingCounter, setFoundingCounter] = useState<{ count: number; limit: number; remaining: number }>({
    count: 0,
    limit: 1000,
    remaining: 1000,
  });

  // Form states - Common
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('กรุงเทพมหานคร');
  const [district, setDistrict] = useState('');

  // Knight fields
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car'>('motorcycle');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string>('');
  const [vehiclePreview, setVehiclePreview] = useState<string>('');

  // Citizen fields
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Merchant fields
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('อาหารตามสั่ง/สตรีทฟู้ด');
  const [shopAddress, setShopAddress] = useState('');
  const [taxId, setTaxId] = useState('');

  // Partner fields
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('โรงเรียน/มหาวิทยาลัย');
  const [contactPerson, setContactPerson] = useState('');
  const [estimatedUsers, setEstimatedUsers] = useState<number>(100);

  // PDPA Consents
  const [pdpaPersonalData, setPdpaPersonalData] = useState(false);
  const [pdpaGps, setPdpaGps] = useState(false);
  const [pdpaFeeTerms, setPdpaFeeTerms] = useState(false);

  // Submission & Validation UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const licenseInputRef = useRef<HTMLInputElement>(null);
  const vehicleInputRef = useRef<HTMLInputElement>(null);

  // Load remote pricing only after a role is selected. The founding counter is
  // observed only while the Knight form is open, rather than on every onboarding visit.
  useEffect(() => {
    if (!selectedRole) return;
    getFeeRules().then(setFeeRules);
    if (selectedRole !== 'knight') return;
    const unsubCounter = subscribeFoundingKnightCounter((data) => {
      setFoundingCounter(data);
    });
    return () => unsubCounter();
  }, [selectedRole]);

  // Rules from DB
  const knightStandardRule = feeRules.find(r => r.payerRole === 'knight' && r.tier === 'standard') || feeRules.find(r => r.payerRole === 'knight');
  const knightFoundingRule = feeRules.find(r => r.payerRole === 'knight' && r.tier === 'founding');
  const citizenRule = feeRules.find(r => r.payerRole === 'citizen');
  const merchantRule = feeRules.find(r => r.payerRole === 'merchant');
  const partnerRule = feeRules.find(r => r.payerRole === 'partner');

  // Handle file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'vehicle') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('ขนาดไฟล์ภาพต้องไม่เกิน 5MB');
      return;
    }

    setFormError(null);
    const url = URL.createObjectURL(file);
    if (type === 'license') {
      setLicenseFile(file);
      setLicensePreview(url);
    } else {
      setVehicleFile(file);
      setVehiclePreview(url);
    }
  };

  const validatePhone = (val: string) => /^0[0-9]{9}$/.test(val.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setFormError(null);

    // Common validations
    if (!displayName.trim()) {
      setFormError('กรุณาระบุชื่อ-นามสกุลจริง');
      return;
    }
    if (!validatePhone(phone)) {
      setFormError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0 (เช่น 0812345678)');
      return;
    }
    if (!district.trim()) {
      setFormError('กรุณาระบุเขตหรืออำเภอที่พำนัก/ปฏิบัติงาน');
      return;
    }

    // PDPA Check
    if (!pdpaPersonalData || !pdpaGps || !pdpaFeeTerms) {
      setFormError('กรุณาทำเครื่องหมายยินยอมข้อตกลง PDPA ทั้ง 3 ข้อให้ครบถ้วนก่อนยืนยัน');
      return;
    }

    setIsSubmitting(true);
    playTactileBlip(800);

    try {
      if (selectedRole === 'knight') {
        if (!plateNumber.trim()) {
          throw new Error('กรุณาระบุหมายเลขทะเบียนรถให้ถูกต้อง');
        }
        if (!licenseNumber.trim()) {
          throw new Error('กรุณาระบุเลขที่ใบอนุญาตขับขี่สาธารณะ');
        }

        let driverLicenseUrl = '';
        let vehiclePhotoUrl = '';

        if (licenseFile) {
          setUploadProgressText('กำลังบีบอัดและอัปโหลดรูปใบขับขี่...');
          driverLicenseUrl = await uploadKycDocument(firebaseUser.uid, 'driver_license', licenseFile);
        }

        if (vehicleFile) {
          setUploadProgressText('กำลังบีบอัดและอัปโหลดรูปคู่กับรถ...');
          vehiclePhotoUrl = await uploadKycDocument(firebaseUser.uid, 'vehicle_photo', vehicleFile);
        }

        setUploadProgressText('กำลังบันทึกข้อมูลและจองสิทธิ์อัศวินผู้ก่อตั้ง...');
        await registerKnight({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName,
          phone,
          province,
          district,
          pdpaConsentAccepted: true,
          vehicleType,
          plateNumber,
          licenseNumber,
          driverLicenseUrl,
          vehiclePhotoUrl,
        });
      } else if (selectedRole === 'citizen') {
        if (!emergencyName.trim() || !validatePhone(emergencyPhone)) {
          throw new Error('กรุณาระบุชื่อและเบอร์โทรศัพท์ผู้ติดต่อฉุกเฉิน 10 หลักให้ถูกต้อง');
        }

        setUploadProgressText('กำลังสร้างบัญชีพลเมืองอัศวิน...');
        await registerCitizen({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName,
          phone,
          province,
          district,
          pdpaConsentAccepted: true,
          emergencyContactName: emergencyName,
          emergencyContactPhone: emergencyPhone,
        });
      } else if (selectedRole === 'merchant') {
        if (!shopName.trim()) {
          throw new Error('กรุณาระบุชื่อร้านค้า');
        }
        if (!shopAddress.trim()) {
          throw new Error('กรุณาระบุที่อยู่ตั้งของร้านค้า');
        }

        setUploadProgressText('กำลังบันทึกข้อมูลร้านค้าพันธมิตร...');
        await registerMerchant({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName,
          phone,
          province,
          district,
          pdpaConsentAccepted: true,
          shopName,
          shopType,
          address: shopAddress,
          taxId,
        });
      } else if (selectedRole === 'partner') {
        if (!orgName.trim()) {
          throw new Error('กรุณาระบุชื่อองค์กร/หน่วยงาน');
        }
        if (!contactPerson.trim()) {
          throw new Error('กรุณาระบุชื่อผู้ประสานงาน');
        }

        setUploadProgressText('กำลังบันทึกข้อมูลองค์กรพาร์ทเนอร์...');
        await registerPartner({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName,
          phone,
          province,
          district,
          pdpaConsentAccepted: true,
          orgName,
          orgType,
          contactPerson,
          estimatedUsers,
        });
      }

      await refreshUserData();
      if (onCompleted) onCompleted();
    } catch (err: any) {
      console.error('Registration failed:', err);
      const message = String(err?.message || '');
      setFormError(
        message.includes('Quota limit exceeded') || message.includes('resource-exhausted')
          ? 'ฐานข้อมูล Firestore ใช้โควต้าอ่านรายวันครบแล้ว การสมัครยังไม่ถูกบันทึก กรุณารอรอบโควต้าใหม่หรือให้ผู้ดูแลเปิดฐานข้อมูลแบบชำระตามการใช้งาน'
          : message || 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 text-slate-100">
      {/* Top Bar with user info & sign out */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]" />
          <span className="text-xs tracking-wider uppercase text-slate-400 font-mono">
            WINRIDER.AI SOVEREIGN ONBOARDING
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">
            เข้าสู่ระบบด้วย: <strong className="text-slate-200">{firebaseUser?.email || firebaseUser?.displayName}</strong>
          </span>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* STEP 1: ROLE SELECTION CARDS */}
      {!selectedRole && (
        <div className="space-y-8 pt-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC93C]" />
              <span>ก้าวสู่อธิปไตยจักรวรรดิขนส่งไทย</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-thai">
              เลือกบทบาทของคุณใน <span className="text-[#00D4FF]">WINRIDER</span><span className="text-[#FFC93C]">.AI</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
              เริ่มต้นสร้างบัญชีจริง บันทึกลงฐานข้อมูลอธิปไตย เริ่มนับเลเวล 1 พร้อมระบบจัดสรรกองทุนสวัสดิการ
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
            {/* Card 1: Knight */}
            <div
              onClick={() => {
                playTactileBlip(900);
                setSelectedRole('knight');
              }}
              className="group cursor-pointer rounded-2xl bg-[#0A1633]/90 border border-[#00D4FF]/40 hover:border-[#00D4FF] p-6 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,212,255,0.3)] relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#00D4FF]/10 rounded-full blur-2xl group-hover:bg-[#00D4FF]/20 transition-all" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-xl bg-[#00D4FF]/15 border border-[#00D4FF]/40 text-[#00D4FF] group-hover:scale-110 transition-transform">
                    <Bike className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#FFC93C]/15 border border-[#FFC93C]/50 text-[#FFC93C] text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <Flame className="w-3.5 h-3.5 fill-[#FFC93C]" />
                    <span>ล็อก 2 บ. ตลอดชีพ</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#00D4FF] transition-colors font-thai">
                    อัศวินไรเดอร์ (Knight)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    พี่วินมอเตอร์ไซค์และไรเดอร์ผู้กล้าหาญ ปฏิบัติภารกิจรับ-ส่งผู้โดยสารและพัสดุด่วน รับค่าโดยสารเต็มเม็ดเต็มหน่วย
                  </p>
                </div>

                {/* Live Counter Badge */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-[#00D4FF]/20 text-xs text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">โควตาอัศวินผู้ก่อตั้ง:</span>
                  <span className="text-[#00D4FF] font-mono font-bold">
                    เหลือ {foundingCounter.remaining.toLocaleString()} / {foundingCounter.limit} ที่
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-[#00D4FF] font-semibold border-t border-slate-800/80 mt-4">
                <span>สมัครเป็นอัศวินไรเดอร์</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Citizen */}
            <div
              onClick={() => {
                playTactileBlip(900);
                setSelectedRole('citizen');
              }}
              className="group cursor-pointer rounded-2xl bg-[#0A1633]/90 border border-slate-800 hover:border-[#00D4FF]/60 p-6 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,212,255,0.2)] relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 group-hover:scale-110 transition-transform">
                    <User className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                    อนุมัติทันที
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#00D4FF] transition-colors font-thai">
                    พลเมืองอัศวิน (Citizen)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    ผู้โดยสารและลูกค้าผู้ใช้บริการ เรียกรถมอเตอร์ไซค์วิน สั่งซื้อสินค้า ขนส่งสัตว์เลี้ยง และระบบเดินทางในฝัน
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">ค่าบริการระบบ:</span>
                  <span className="text-emerald-400 font-bold">5 บาท / เที่ยว (สมัครฟรี)</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-slate-300 group-hover:text-[#00D4FF] font-semibold border-t border-slate-800/80 mt-4">
                <span>สมัครเป็นพลเมืองอัศวิน</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Merchant */}
            <div
              onClick={() => {
                playTactileBlip(900);
                setSelectedRole('merchant');
              }}
              className="group cursor-pointer rounded-2xl bg-[#0A1633]/90 border border-slate-800 hover:border-[#FFC93C]/60 p-6 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,201,60,0.2)] relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-xl bg-[#FFC93C]/15 border border-[#FFC93C]/40 text-[#FFC93C] group-hover:scale-110 transition-transform">
                    <Store className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#FFC93C]/15 border border-[#FFC93C]/40 text-[#FFC93C] text-xs font-semibold">
                    GP 10% โปร่งใส
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#FFC93C] transition-colors font-thai">
                    ร้านค้าพันธมิตร (Merchant)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    ร้านอาหาร เครื่องดื่ม และร้านค้าชุมชน วินสตรีทมาร์เก็ต เชื่อมโยงไรเดอร์ใกล้เคียงช่วยส่งสินค้าถึงมือลูกค้า
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">ค่าแรกเข้า:</span>
                  <span className="text-[#FFC93C] font-bold">ฟรี ไม่มีค่ารายเดือน</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-slate-300 group-hover:text-[#FFC93C] font-semibold border-t border-slate-800/80 mt-4">
                <span>เปิดร้านค้าพันธมิตร</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 4: Partner */}
            <div
              onClick={() => {
                playTactileBlip(900);
                setSelectedRole('partner');
              }}
              className="group cursor-pointer rounded-2xl bg-[#0A1633]/90 border border-slate-800 hover:border-[#00D4FF]/60 p-6 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,212,255,0.2)] relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-400 group-hover:scale-110 transition-transform">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-400 text-xs font-semibold">
                    องค์กรพันธมิตร
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#00D4FF] transition-colors font-thai">
                    องค์กรพาร์ทเนอร์ (Partner)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    โรงเรียน มหาวิทยาลัย โรงพยาบาล นิติบุคคลหมู่บ้าน และคอนโดมิเนียม เชื่อมต่อระบบคิวรับ-ส่งที่ปลอดภัย
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">โซลูชัน:</span>
                  <span className="text-purple-400 font-bold">จัดคิวอัจฉริยะ & สวัสดิการ</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-slate-300 group-hover:text-[#00D4FF] font-semibold border-t border-slate-800/80 mt-4">
                <span>ลงทะเบียนองค์กร</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ROLE-SPECIFIC REGISTRATION FORM */}
      {selectedRole && (
        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          {/* Back button */}
          <button
            type="button"
            onClick={() => {
              playTactileBlip(700);
              setSelectedRole(null);
              setFormError(null);
            }}
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-[#00D4FF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ย้อนกลับไปเปลี่ยนบทบาท</span>
          </button>

          {/* Role Header Banner */}
          <div className="rounded-2xl bg-[#0A1633] border border-[#00D4FF]/30 p-6 relative overflow-hidden shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-[#00D4FF] font-bold uppercase tracking-wider">
                  ฟอร์มลงทะเบียนจริง (Direct Firebase Integration)
                </div>
                <h2 className="text-2xl font-extrabold text-white mt-1 font-thai">
                  {selectedRole === 'knight' && 'สมัครเป็นอัศวินไรเดอร์ (Knight Rider)'}
                  {selectedRole === 'citizen' && 'สมัครเป็นพลเมืองอัศวิน (Citizen Passenger)'}
                  {selectedRole === 'merchant' && 'ลงทะเบียนร้านค้าพันธมิตร (Merchant Partner)'}
                  {selectedRole === 'partner' && 'ลงทะเบียนองค์กรพาร์ทเนอร์ (Institutional Partner)'}
                </h2>
              </div>

              {selectedRole === 'knight' && (
                <div className="px-4 py-2 rounded-xl bg-[#FFC93C]/10 border border-[#FFC93C]/40 text-[#FFC93C] text-xs font-bold flex items-center gap-2 shrink-0">
                  <Flame className="w-4 h-4 fill-[#FFC93C]" />
                  <span>เหลือสิทธิ์อัศวินผู้ก่อตั้งอีก {foundingCounter.remaining} ที่</span>
                </div>
              )}
            </div>

            {/* TRANSPARENT FEE MATRIX BANNER (Loaded from Firestore fee_rules) */}
            <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-[#00D4FF] font-bold">
                <Info className="w-4 h-4" />
                <span>ข้อกำหนดค่าธรรมเนียมโปร่งใส 100% (Transparent Fee Policy)</span>
              </div>

              {selectedRole === 'knight' && (
                <div className="space-y-1 text-slate-300">
                  <p>
                    • ค่าธรรมเนียมแพลตฟอร์ม <strong className="text-white">{satangToBaht(knightStandardRule?.amountSatang)} บาท</strong> ต่อภารกิจ 
                    (ค่าระบบ {satangToBaht(knightStandardRule?.buckets?.system)} + คุ้มครองอุบัติเหตุ {satangToBaht(knightStandardRule?.buckets?.insurance)} + เงินออมอนาคต {satangToBaht(knightStandardRule?.buckets?.pension)}) สมัครฟรี ไม่มีค่ารายเดือน
                  </p>
                  {knightFoundingRule && foundingCounter.remaining > 0 && (
                    <p className="text-[#FFC93C] font-semibold">
                      ⚡ สิทธิ์อัศวินผู้ก่อตั้ง: ล็อกค่าธรรมเนียมเพียง <strong className="underline">{satangToBaht(knightFoundingRule.amountSatang)} บาท</strong> ตลอดชีพ (ค่าระบบ {satangToBaht(knightFoundingRule.buckets.system)} + คุ้มครองอุบัติเหตุ {satangToBaht(knightFoundingRule.buckets.insurance)})
                    </p>
                  )}
                </div>
              )}

              {selectedRole === 'citizen' && (
                <p>
                  • ค่าบริการแพลตฟอร์ม <strong className="text-white">{satangToBaht(citizenRule?.amountSatang)} บาท</strong> ต่อการเดินทาง สมัครฟรี ไม่มีค่าใช้จ่ายแอบแฝง
                </p>
              )}

              {selectedRole === 'merchant' && (
                <p>
                  • ค่าธรรมเนียม <strong className="text-white">{bpsToPercent(merchantRule?.percentBps)}%</strong> ของยอดออเดอร์ สมัครฟรี ไม่มีค่าแรกเข้า
                </p>
              )}

              {selectedRole === 'partner' && (
                <p>
                  • ค่าธรรมเนียม <strong className="text-white">{bpsToPercent(partnerRule?.percentBps)}%</strong> ของยอดออเดอร์ สมัครฟรี ไม่มีค่าแรกเข้า
                </p>
              )}
            </div>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Common Fields */}
          <div className="bg-[#0A1633] rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF]" />
              <span>1. ข้อมูลประจำตัวและช่องทางติดต่อ</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ชื่อ-นามสกุล (ภาษาไทย) *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจกล้า"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  เบอร์โทรศัพท์ (10 หลักขึ้นต้นด้วย 0) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="เช่น 0812345678"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  จังหวัด *
                </label>
                <input
                  type="text"
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="กรุงเทพมหานคร"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  เขต / อำเภอ *
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="เช่น ธนบุรี / คลองสาน / จตุจักร"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                />
              </div>
            </div>
          </div>

          {/* ROLE SPECIFIC FIELDS */}
          {/* KNIGHT SPECIFIC */}
          {selectedRole === 'knight' && (
            <div className="bg-[#0A1633] rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FFC93C]" />
                <span>2. ข้อมูลยานพาหนะและใบอนุญาตขับขี่สาธารณะ</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ประเภทรถ *
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]"
                  >
                    <option value="motorcycle">รถจักรยานยนต์ (มอเตอร์ไซค์)</option>
                    <option value="car">รถยนต์สาธารณะ (แท็กซี่ / รถยนต์)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    หมายเลขทะเบียนรถ *
                  </label>
                  <input
                    type="text"
                    required
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="เช่น 1กข 9999 กทม."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    เลขที่ใบขับขี่สาธารณะ *
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="เช่น DL-67890123"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
              </div>

              {/* Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Driver License Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    รูปถ่ายใบขับขี่สาธารณะ (บีบอัดอัตโนมัติ ≤5MB)
                  </label>
                  <input
                    ref={licenseInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'license')}
                  />
                  <div
                    onClick={() => licenseInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-[#00D4FF] rounded-xl p-4 text-center transition-all bg-slate-900/60"
                  >
                    {licensePreview ? (
                      <div className="space-y-2">
                        <img src={licensePreview} alt="License Preview" className="h-28 mx-auto object-cover rounded-lg border border-slate-700" />
                        <span className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> เลือกไฟล์เรียบร้อย (คลิกเพื่อเปลี่ยน)
                        </span>
                      </div>
                    ) : (
                      <div className="py-4 space-y-1">
                        <Upload className="w-6 h-6 mx-auto text-[#00D4FF]" />
                        <div className="text-xs text-slate-300 font-medium">คลิกเพื่ออัปโหลดใบขับขี่</div>
                        <div className="text-[10px] text-slate-500">JPG, PNG ขนาดไม่เกิน 5MB</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Photo Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    รูปถ่ายคู่กับรถหรือป้ายทะเบียน (บีบอัดอัตโนมัติ ≤5MB)
                  </label>
                  <input
                    ref={vehicleInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'vehicle')}
                  />
                  <div
                    onClick={() => vehicleInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-[#00D4FF] rounded-xl p-4 text-center transition-all bg-slate-900/60"
                  >
                    {vehiclePreview ? (
                      <div className="space-y-2">
                        <img src={vehiclePreview} alt="Vehicle Preview" className="h-28 mx-auto object-cover rounded-lg border border-slate-700" />
                        <span className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> เลือกไฟล์เรียบร้อย (คลิกเพื่อเปลี่ยน)
                        </span>
                      </div>
                    ) : (
                      <div className="py-4 space-y-1">
                        <Upload className="w-6 h-6 mx-auto text-[#FFC93C]" />
                        <div className="text-xs text-slate-300 font-medium">คลิกเพื่ออัปโหลดรูปคู่กับรถ</div>
                        <div className="text-[10px] text-slate-500">JPG, PNG ขนาดไม่เกิน 5MB</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CITIZEN SPECIFIC */}
          {selectedRole === 'citizen' && (
            <div className="bg-[#0A1633] rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>2. ข้อมูลความปลอดภัยและผู้ติดต่อฉุกเฉิน (Emergency Contact)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ชื่อผู้ติดต่อฉุกเฉิน *
                  </label>
                  <input
                    type="text"
                    required
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="เช่น คุณแม่ / ญาติสนิท"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    เบอร์โทรศัพท์ผู้ติดต่อฉุกเฉิน (10 หลัก) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="เช่น 0899999999"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MERCHANT SPECIFIC */}
          {selectedRole === 'merchant' && (
            <div className="bg-[#0A1633] rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FFC93C]" />
                <span>2. ข้อมูลร้านค้าพันธมิตร (Merchant Profile)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ชื่อร้านค้า *
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="เช่น ครัวอัศวิน ธนบุรี"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ประเภทร้านค้า *
                  </label>
                  <input
                    type="text"
                    required
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value)}
                    placeholder="เช่น อาหารตามสั่ง, ชานมไข่มุก, ร้านของชำ"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ที่อยู่ตั้งของร้านค้า / จุดนัดรับสินค้า *
                  </label>
                  <input
                    type="text"
                    required
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    placeholder="เช่น 123/4 ซอยอิสรภาพ 21 แขวงวัดกัลยาณ์ เขตธนบุรี"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    เลขประจำตัวผู้เสียภาษี (ไม่บังคับ - Optional)
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="เช่น 0105559xxxxxx"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PARTNER SPECIFIC */}
          {selectedRole === 'partner' && (
            <div className="bg-[#0A1633] rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>2. ข้อมูลองค์กรและจำนวนผู้ใช้บริการ (Institutional Profile)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ชื่อองค์กร / สถาบัน *
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="เช่น มหาวิทยาลัยราชภัฏธนบุรี / รพ.ตากสิน"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ประเภทองค์กร *
                  </label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]"
                  >
                    <option value="โรงเรียน/มหาวิทยาลัย">โรงเรียน / มหาวิทยาลัย</option>
                    <option value="โรงพยาบาล/ศูนย์การแพทย์">โรงพยาบาล / ศูนย์การแพทย์</option>
                    <option value="บ้านพักผู้สูงอายุ/ศูนย์บริบาล">บ้านพักผู้สูงอายุ / ศูนย์บริบาล</option>
                    <option value="นิติบุคคลคอนโด/หมู่บ้าน">นิติบุคคลคอนโดมิเนียม / หมู่บ้าน</option>
                    <option value="องค์กรเอกชน/รัฐวิสาหกิจ">องค์กรเอกชน / รัฐวิสาหกิจ</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ชื่อ-นามสกุลผู้ประสานงาน *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="เช่น อาจารย์ประสิทธิ์ หรือ คุณผู้จัดการฝ่ายอาคาร"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    จำนวนผู้ใช้บริการโดยประมาณต่อวัน (คน) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={estimatedUsers}
                    onChange={(e) => setEstimatedUsers(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. PDPA CONSENT (MANDATORY) */}
          <div className="bg-[#0A1633] rounded-2xl border border-slate-800 p-6 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#00D4FF]" />
              <span>3. การให้ความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA Consent v1.0)</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300 pt-1">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={pdpaPersonalData}
                  onChange={(e) => setPdpaPersonalData(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-[#00D4FF] focus:ring-0"
                />
                <span>
                  <strong>การเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล:</strong> ข้าพเจ้ายินยอมให้ WINRIDER.AI จัดเก็บและประมวลผลข้อมูลชื่อ เบอร์โทร เอกสารยานพาหนะ หรือข้อมูลองค์กร เพื่อการยืนยันตัวตนและการให้บริการระบบขนส่งอย่างปลอดภัย
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={pdpaGps}
                  onChange={(e) => setPdpaGps(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-[#00D4FF] focus:ring-0"
                />
                <span>
                  <strong>การเข้าถึงตำแหน่งพิกัด GPS:</strong> ข้าพเจ้ายินยอมให้แอปพลิเคชันเข้าถึงตำแหน่งดาวเทียมแบบเรียลไทม์ระหว่างปฏิบัติงานหรือเดินทาง เพื่อความปลอดภัย การคำนวณระยะทาง และการจับคู่อัศวินที่ใกล้ที่สุด
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={pdpaFeeTerms}
                  onChange={(e) => setPdpaFeeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-[#00D4FF] focus:ring-0"
                />
                <span>
                  <strong>ข้อกำหนดและเงื่อนไขค่าธรรมเนียม:</strong> ข้าพเจ้าได้รับทราบและยอมรับโครงสร้างค่าบริการและค่าธรรมเนียมตามประกาศของแพลตฟอร์มอย่างโปร่งใส และยินยอมให้บันทึกสัญญารับรองทางอิเล็กทรอนิกส์
                </span>
              </label>
            </div>
          </div>

          {/* SUBMIT BUTTON WITH LOADING STATE */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-[#00D4FF] hover:bg-[#00c0e8] text-slate-950 font-extrabold text-base flex items-center justify-center gap-3 transition-all shadow-[0_0_25px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{uploadProgressText || 'กำลังประมวลผลข้อมูล...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ยืนยันการลงทะเบียนเข้าสู่ระบบ WINRIDER.AI</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
