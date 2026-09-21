import React, { useState } from 'react';
import { EIGHT_PILLARS } from '../data/bibleData';
import { PillarItem } from '../types';
import { playTactileBlip } from '../utils/audio';
import { 
  Globe2, 
  Bike, 
  Cat, 
  PackageCheck, 
  Sparkles, 
  ShoppingBag, 
  HeartPulse, 
  Users, 
  TrainTrack, 
  Store, 
  Scale, 
  ShieldAlert, 
  Share2, 
  FileCheck,
  CheckCircle,
  Clock,
  Plus
} from 'lucide-react';

interface Props {
  audioEnabled: boolean;
  onOpenMarket?: () => void;
}

export const EcosystemGovernanceSection: React.FC<Props> = ({ audioEnabled, onOpenMarket }) => {
  const [selectedPillar, setSelectedPillar] = useState<PillarItem>(EIGHT_PILLARS[0]);


  const getPillarIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bike': return <Bike className="w-5 h-5" />;
      case 'Cat': return <Cat className="w-5 h-5" />;
      case 'PackageCheck': return <PackageCheck className="w-5 h-5" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5" />;
      case 'ShoppingBag': return <ShoppingBag className="w-5 h-5" />;
      case 'HeartPulse': return <HeartPulse className="w-5 h-5" />;
      case 'Users': return <Users className="w-5 h-5" />;
      case 'TrainTrack': return <TrainTrack className="w-5 h-5" />;
      default: return <Bike className="w-5 h-5" />;
    }
  };

  return (
    <section className="space-y-10">
      {/* Title Header */}
      <div className="relative rounded-2xl overflow-hidden border border-[#00D2FF]/30 bg-gradient-to-br from-[#070D1E] via-[#0A1A3A] to-[#050A17] p-6 sm:p-10 shadow-[0_0_30px_rgba(0,210,255,0.15)]">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] text-xs font-bold tracking-wide">
            <Globe2 className="w-3.5 h-3.5" /> BIBLE CHAPTER 06 : ECOSYSTEM & GOVERNANCE
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            ระบบนิเวศ 8 เสาหลัก & ธรรมาภิบาลอธิปไตย <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] via-[#70E0FF] to-[#FFD700]">
              The 8 Pillars, C2C Commerce & Regulatory Shield
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
            โครงสร้างการให้บริการครอบคลุมทุกมิติชีวิตของคนเมือง 8 เสาหลัก พร้อมเปิดโอกาสให้อัศวินค้าขายสินค้าชุมชนในระบบ <strong>"Today I have something to sell"</strong> ภายใต้กฎเกณฑ์ธรรมาภิบาลที่เป็นธรรม
          </p>
        </div>
      </div>

      {/* 8 Pillars Interactive Matrix */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-cyan-400 font-mono uppercase">8 PILLARS OF EMPIRE</span>
            <h3 className="text-xl font-bold text-white">8 มหาเสาหลักบริการแห่ง WINRIDER.AI</h3>
          </div>
          <span className="text-xs text-slate-400">คลิกที่เสาหลักเพื่อดูรายละเอียดและประเภทยานพาหนะ</span>
        </div>

        {/* 8 Pillars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EIGHT_PILLARS.map((pillar) => {
            const isSelected = selectedPillar.id === pillar.id;
            return (
              <button
                key={pillar.id}
                id={`btn-pillar-${pillar.id}`}
                onClick={() => {
                  setSelectedPillar(pillar);
                  if (audioEnabled) playTactileBlip(700);
                }}
                className={`p-4 rounded-xl text-left transition-all border flex flex-col justify-between h-36 ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#0E2C60] to-[#070D1E] border-[#00D2FF] shadow-[0_0_20px_rgba(0,210,255,0.3)] ring-1 ring-cyan-400'
                    : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl overflow-hidden border ${isSelected ? 'border-cyan-400 shadow-[0_0_14px_rgba(0,210,255,0.7)]' : 'border-white/15'} bg-black/50 flex-shrink-0`}>
                    <img
                      src={pillar.imageUrl || '/images/app_logo.jpg'}
                      alt={pillar.name}
                      className="w-full h-full object-cover transition-transform hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">#{pillar.number}</span>
                </div>
                <div className="mt-2">
                  <h4 className="text-sm font-bold text-white truncate">{pillar.name}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{pillar.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Pillar Detailed Showcase */}
        <div className="p-6 rounded-xl bg-gradient-to-r from-[#07132B] via-[#091E44] to-[#070D1E] border border-cyan-500/40 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold">
              <span>PILLAR #{selectedPillar.number}</span>
              <span>•</span>
              <span>{selectedPillar.nameEn}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-cyan-400 shadow-[0_0_16px_rgba(0,210,255,0.5)] flex-shrink-0 bg-black/60">
                <img
                  src={selectedPillar.imageUrl || '/images/app_logo.jpg'}
                  alt={selectedPillar.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h4 className="text-2xl font-black text-white">{selectedPillar.name}</h4>
                <p className="text-sm text-cyan-200">{selectedPillar.tagline}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 pt-2 leading-relaxed">
              <strong className="text-white">กลุ่มเป้าหมาย:</strong> {selectedPillar.targetAudience}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">ยานพาหนะและอุปกรณ์ประจำเสา:</strong> {selectedPillar.vehicleType}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/50 border border-cyan-500/30 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">จุดเด่นยุทธศาสตร์</span>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">{selectedPillar.highlight}</p>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <CheckCircle className="w-3 h-3" /> Flat Fee 2 Baht Policy Active
            </div>
          </div>
        </div>
      </div>

      {/* Real customer marketplace entry */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1E] border border-[#FFD700]/30 space-y-4">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFD700] uppercase tracking-widest"><Store className="w-3.5 h-3.5" /> WIN STREET MARKET • วันนี้มีของมาขาย</div>
        <h3 className="text-xl font-bold text-white">วันนี้มีของมาขาย — ตลาดประชาชนจริง</h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">หน้านี้ใช้รายการสินค้าจริงจาก Firestore เท่านั้น ไม่มีสินค้า ตัวอย่าง หรือ QR ทดลอง รายการที่ลงขายจะผูกกับ WIN Wallet ID จริงของผู้ขาย</p>
        <button type="button" onClick={() => onOpenMarket?.()} className="px-4 py-3 rounded-xl text-xs font-black bg-[#FFD700] text-slate-950 hover:brightness-110 flex items-center gap-1.5"><ShoppingBag className="w-4 h-4" /> เปิด WIN Street Market / วันนี้มีของมาขาย</button>
      </div>

      {/* Governance, Succession Plan & Regulatory Shield */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Governance & XP Decay */}
        <div className="p-6 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-3">
          <div className="flex items-center gap-2.5 text-cyan-400 text-xs font-bold uppercase">
            <Scale className="w-4 h-4" /> XP Decay & Subtle Demotion
          </div>
          <h4 className="text-base font-bold text-white">ธรรมาภิบาลไร้ความรุนแรง</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            ไม่มีการแบนถาวรอย่างไร้เหตุผล บทลงโทษใช้ระบบ <strong>XP Decay</strong> ค่อยๆ ลดแต้มประสบการณ์ตามความผิดวินัย และ <strong>Subtle Demotion</strong> ลดยศแบบนุ่มนวลเพื่อเปิดโอกาสให้อัศวินปรับปรุงตัว
          </p>
        </div>

        {/* Succession Plan */}
        <div className="p-6 rounded-2xl bg-[#070D1E] border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-400 text-xs font-bold uppercase">
            <Share2 className="w-4 h-4" /> Succession Plan (มรดกอัศวิน)
          </div>
          <h4 className="text-base font-bold text-white">ส่งต่อเกียรติยศและกองทุนให้ทายาท</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            เมื่ออัศวินถึงวัยเกษียณ สามารถส่งต่อระดับเลเวลเกราะ สิทธิ์ในวินฮับ และกองทุนเงินสะสมให้แก่บุตรหลานหรือทายาทได้ตามกฎหมายอธิปไตย เพื่อสร้างความมั่งคั่งส่งต่อรุ่นสู่รุ่น
          </p>
        </div>

        {/* Regulatory Shield */}
        <div className="p-6 rounded-2xl bg-[#070D1E] border border-blue-500/30 space-y-3">
          <div className="flex items-center gap-2.5 text-blue-400 text-xs font-bold uppercase">
            <FileCheck className="w-4 h-4" /> Regulatory Shield (เกราะกฎหมาย)
          </div>
          <h4 className="text-base font-bold text-white">พันธมิตรผังเมืองกับภาครัฐ</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            นำข้อมูลแผนที่เส้นเลือดฝอย CI Map และสถิติการระบายน้ำท่วมไปช่วยเหลือกทม.และกระทรวงคมนาคมวางผังเมือง สร้างเกราะคุ้มกันทางกฎหมายและอำนาจต่อรองระดับชาติ
          </p>
        </div>
      </div>
    </section>
  );
};
