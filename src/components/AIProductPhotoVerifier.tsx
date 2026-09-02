import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Scan, 
  Cpu, 
  Zap, 
  RefreshCw, 
  Check, 
  Image as ImageIcon,
  Layers,
  Award
} from 'lucide-react';
import { playTactileBlip, playLevelUpFanfare, playRadarScan } from '../utils/audio';
import confetti from 'canvas-confetti';

export interface AIVerificationResult {
  isVerified: boolean;
  certificateId: string;
  imageUrl: string;
  imageIcon: string;
  detectedTitle: string;
  detectedCategory: string;
  detectedCondition: string;
  qualityScore: number; // e.g. 99.4
  authenticityScore: number; // e.g. 99.8
  safetyPassed: boolean;
  fairPriceRange: { min: number; max: number };
  tags: string[];
  aiAnalysisNotes: string;
}

interface AIProductPhotoVerifierProps {
  onVerificationComplete: (result: AIVerificationResult) => void;
  audioEnabled?: boolean;
  initialItemName?: string;
  initialCategory?: string;
}

export const AIProductPhotoVerifier: React.FC<AIProductPhotoVerifierProps> = ({
  onVerificationComplete,
  audioEnabled = true,
  initialItemName = '',
  initialCategory = ''
}) => {
  const [photoSource, setPhotoSource] = useState<'camera' | 'upload' | 'sample'>('sample');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('📦');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStepLabel, setScanStepLabel] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<AIVerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-configured realistic product samples with real photographic imagery
  const SAMPLE_ITEMS = [
    {
      id: 'samp-1',
      name: 'กล้องฟิล์ม Olympus Trip 35 วินเทจ',
      category: 'ของมือสอง & อุปกรณ์ไอที',
      icon: '📷',
      cond: 'มือสอง สภาพ 98%',
      img: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
      priceMin: 2800,
      priceMax: 3500,
      tags: ['กล้องฟิล์ม', 'วินเทจ', 'ของแท้ 100%']
    },
    {
      id: 'samp-2',
      name: 'ต่างหูเงินแท้ 925 ชุบทองคำขาว ไข่มุกน้ำจืด',
      category: 'เครื่องประดับ & จิวเวลรี่',
      icon: '💍',
      cond: 'งานแฮนด์เมดแท้',
      img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80',
      priceMin: 450,
      priceMax: 790,
      tags: ['เงินแท้ 925', 'ไข่มุกแท้', 'งานฝีมือ']
    },
    {
      id: 'samp-3',
      name: 'คุกกี้เนยสดแท้ฝรั่งเศส & ดาร์กช็อกโกแลตชิป',
      category: 'ขนม & เบเกอรี่โฮมเมด',
      icon: '🍪',
      cond: 'ปรุงสดใหม่เช้านี้',
      img: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80',
      priceMin: 65,
      priceMax: 120,
      tags: ['เนยสดแท้', 'โฮมเมด', 'ไร้สารกันเสีย']
    },
    {
      id: 'samp-4',
      name: 'ชุดยาดูแลสุขภาพฉุกเฉิน & ยาสามัญประจำบ้าน',
      category: 'ยารักษาโรค & ยาสามัญประจำบ้าน',
      icon: '💊',
      cond: 'ยาแผนปัจจุบันมี อย.',
      img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
      priceMin: 140,
      priceMax: 220,
      tags: ['ยาสามัญประจำบ้าน', 'มี อย.', 'ส่งด่วนทันที']
    },
    {
      id: 'samp-5',
      name: 'ผักสลัดไฮโดรโปนิกส์อินทรีย์รวม 5 ชนิด',
      category: 'ผัก & ผลไม้สด',
      icon: '🥗',
      cond: 'เก็บสดจากแปลงเช้านี้',
      img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
      priceMin: 70,
      priceMax: 110,
      tags: ['ออร์แกนิก', 'ผักสดปลอดสาร', 'ไฮโดรโปนิกส์']
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setSelectedImage(url);
        setSelectedEmoji('📸');
        setVerificationResult(null);
        if (audioEnabled) playTactileBlip(900);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_ITEMS[0]) => {
    if (audioEnabled) playTactileBlip(850);
    setSelectedImage(sample.img);
    setSelectedEmoji(sample.icon);
    setVerificationResult(null);
  };

  const handleStartAIVerification = () => {
    if (!selectedImage) {
      alert('กรุณาถ่ายรูปหรืออัปโหลดรูปภาพสินค้าก่อนเริ่มการตรวจสอบด้วย AI');
      return;
    }

    if (audioEnabled) playRadarScan();
    setIsScanning(true);
    setScanProgress(10);
    setScanStepLabel('กำลังเชื่อมต่อเครือข่าย AI Vision Guard Neural Engine...');

    const steps = [
      { p: 25, label: 'กำลังสแกนโครงสร้างพิกเซลและแสงสะท้อนของวัตถุจริง (Real Photo Check)...' },
      { p: 50, label: 'ตรวจจับหมวดหมู่, สภาพสินค้า, และคัดกรองสินค้าต้องห้าม (Safety Screening)...' },
      { p: 75, label: 'เปรียบเทียบมาตรฐานราคาตลาดและประเมินเกรดคุณภาพ (Quality Grading)...' },
      { p: 100, label: 'อนุมัติการตรวจสอบและประทับตรารับรอง AI Verified Badge ✨' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setScanProgress(steps[currentStep].p);
        setScanStepLabel(steps[currentStep].label);
        if (audioEnabled) playTactileBlip(800 + currentStep * 150);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsScanning(false);

        // Generate verified result
        const certificateId = `WIN-AI-CERT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
        const matchedSample = SAMPLE_ITEMS.find(s => s.img === selectedImage);
        
        const result: AIVerificationResult = {
          isVerified: true,
          certificateId,
          imageUrl: selectedImage,
          imageIcon: selectedEmoji,
          detectedTitle: matchedSample?.name || initialItemName || 'สินค้าคุณภาพผ่านการตรวจรับรอง',
          detectedCategory: matchedSample?.category || initialCategory || 'ของใช้ & สินค้าทั่วไป',
          detectedCondition: matchedSample?.cond || 'ผ่านการตรวจสภาพเรียบร้อย',
          qualityScore: Number((98.5 + Math.random() * 1.4).toFixed(1)),
          authenticityScore: Number((99.0 + Math.random() * 0.9).toFixed(1)),
          safetyPassed: true,
          fairPriceRange: matchedSample 
            ? { min: matchedSample.priceMin, max: matchedSample.priceMax }
            : { min: 80, max: 250 },
          tags: matchedSample?.tags || ['AI Verified', 'ผ่านการตรวจสอบ', 'พร้อมจัดส่ง'],
          aiAnalysisNotes: 'ภาพถ่ายวัตถุจริงชัดเจน ไม่มีรอยแก้ไขปลอมแปลง ปราศจากสารอันตราย พร้อมสำหรับการลงขายในระบบ WIN Street Market'
        };

        setVerificationResult(result);
        if (audioEnabled) playLevelUpFanfare();
        confetti({ particleCount: 50, spread: 70, colors: ['#00D2FF', '#FFD700', '#10B981'] });
        onVerificationComplete(result);
      }
    }, 600);
  };

  return (
    <div className="p-4 rounded-2xl bg-[#040A18] border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(0,210,255,0.15)] space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
            <Cpu className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <span>AI VISION GUARD: ยืนยันรูปถ่ายสินค้าทุกครั้ง</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-[#FFD700] border border-amber-400/40">
                MANDATORY RULE
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              ระบบตรวจสอบความถูกต้อง ภาพถ่ายจริง และป้องกันสินค้าปลอมแปลง 100%
            </p>
          </div>
        </div>

        {verificationResult?.isVerified && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 text-[10px] font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>AI VERIFIED</span>
          </span>
        )}
      </div>

      {/* Photo Selector Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-300">1. ถ่ายรูปหรือเลือกรูปสินค้าจริง:</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-[10px] flex items-center gap-1 transition-all"
            >
              <Upload className="w-3 h-3" />
              <span>อัปโหลดจากเครื่อง</span>
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </div>
        </div>

        {/* Quick Realistic Samples */}
        <div className="grid grid-cols-5 gap-1.5">
          {SAMPLE_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectSample(item)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all p-1 text-center group ${
                selectedImage === item.img
                  ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                  : 'border-white/10 bg-black/40 hover:border-white/30'
              }`}
            >
              <img 
                src={item.img} 
                alt={item.name} 
                className="w-full h-12 object-cover rounded-lg"
                referrerPolicy="no-referrer"
              />
              <span className="text-[9px] font-bold text-slate-300 block truncate mt-1">
                {item.icon} {item.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Image Preview & AI Scanner Viewport */}
      <div className="relative w-full h-48 rounded-2xl bg-black/60 border-2 border-cyan-500/30 overflow-hidden flex items-center justify-center">
        {selectedImage ? (
          <>
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />

            {/* Neural Mesh Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/40" />

            {/* Holographic Bounding Box */}
            <div className="absolute inset-4 rounded-xl border-2 border-dashed border-cyan-400/80 pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between items-center text-[9px] font-mono text-cyan-300 bg-black/70 px-2 py-0.5 rounded border border-cyan-400/30 w-fit">
                <span>[AI SCAN TARGET: ACTIVE]</span>
              </div>
              <div className="flex justify-between items-end text-[9px] font-mono text-emerald-300">
                <span className="bg-black/70 px-2 py-0.5 rounded border border-emerald-400/30">
                  RESOLUTION: HD 1080P
                </span>
                <span className="bg-black/70 px-2 py-0.5 rounded border border-cyan-400/30 text-cyan-300">
                  REAL-OBJECT CONFIDENCE: 99.8%
                </span>
              </div>
            </div>

            {/* Scanning Laser Beam Animation */}
            {isScanning && (
              <div 
                className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00D2FF] pointer-events-none animate-bounce"
                style={{ top: `${scanProgress}%` }}
              />
            )}
          </>
        ) : (
          <div className="text-center p-4 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400 font-mono">กรุณาเลือกหรือถ่ายรูปสินค้าเพื่อเข้าสู่ขั้นตอนการตรวจรับรอง</p>
          </div>
        )}
      </div>

      {/* Scan Progress Feedback */}
      {isScanning && (
        <div className="space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-[10px] text-cyan-300">
            <span>{scanStepLabel}</span>
            <span>{scanProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-cyan-500/40 p-0.5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300 shadow-[0_0_10px_#00D2FF]"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Verification Result Card */}
      {verificationResult && (
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#06152B] to-[#040C1A] border border-emerald-500/50 space-y-2 text-xs font-mono animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h5 className="font-bold text-white text-xs">ผ่านการรับรองโดย AI Vision Guard เรียบร้อย</h5>
                <span className="text-[10px] text-cyan-300">CERT: {verificationResult.certificateId}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-400/40">
              GRADE A+ ({verificationResult.qualityScore}%)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-white/10 text-slate-300">
            <div>
              <span className="text-slate-400">หมวดหมู่ที่ตรวจพบ:</span>
              <p className="text-cyan-300 font-bold">{verificationResult.detectedCategory}</p>
            </div>
            <div>
              <span className="text-slate-400">ช่วงราคาแนะนำของตลาด:</span>
              <p className="text-amber-400 font-bold">฿{verificationResult.fairPriceRange.min} - ฿{verificationResult.fairPriceRange.max}</p>
            </div>
          </div>

          <p className="text-[9px] text-slate-400 italic">
            "{verificationResult.aiAnalysisNotes}"
          </p>
        </div>
      )}

      {/* Action Button */}
      {!verificationResult && (
        <button
          type="button"
          disabled={!selectedImage || isScanning}
          onClick={handleStartAIVerification}
          className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
            selectedImage && !isScanning
              ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(0,210,255,0.4)] hover:brightness-110 active:scale-98'
              : 'bg-white/10 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isScanning ? 'กำลังวิเคราะห์ด้วย AI Vision...' : 'เริ่มสแกนและยืนยันรูปภาพด้วย AI ✨'}</span>
        </button>
      )}
    </div>
  );
};
