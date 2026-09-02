import React, { useState } from 'react';
import { EIGHT_PILLARS, C2C_SAMPLE_PRODUCTS } from '../data/bibleData';
import { PillarItem, C2CProduct } from '../types';
import { playTactileBlip } from '../utils/audio';
import confetti from 'canvas-confetti';
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
}

export const EcosystemGovernanceSection: React.FC<Props> = ({ audioEnabled }) => {
  const [selectedPillar, setSelectedPillar] = useState<PillarItem>(EIGHT_PILLARS[0]);
  const [c2cItems, setC2cItems] = useState<C2CProduct[]>(C2C_SAMPLE_PRODUCTS);
  const [orderedItemTitle, setOrderedItemTitle] = useState<string | null>(null);

  // New C2C listing form modal
  const [isListingOpen, setIsListingOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newCategory, setNewCategory] = useState<C2CProduct['category']>('Homemade Food');
  const [newDesc, setNewDesc] = useState<string>('');

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

  const handleOrderC2c = (item: C2CProduct) => {
    if (audioEnabled) playTactileBlip(1200);
    setOrderedItemTitle(item.title);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#00D2FF', '#FFD700']
    });
    setTimeout(() => setOrderedItemTitle(null), 3500);
  };

  const handleCreateC2cListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice) return;

    const newItem: C2CProduct = {
      id: `c2c-${Date.now()}`,
      riderName: 'ท่านอัศวิน (Knight You)',
      riderId: 'THN-7799',
      title: newTitle,
      price: Number(newPrice),
      category: newCategory,
      description: newDesc || 'สินค้าคุณภาพทำสดใหม่จากใจอัศวินเพื่อเพื่อนร่วมชาติ',
      location: 'ฝั่งธนบุรี - ทั่วกรุงเทพฯ',
      rating: 5.0
    };

    setC2cItems([newItem, ...c2cItems]);
    setIsListingOpen(false);
    setNewTitle('');
    setNewPrice('');
    setNewDesc('');
    if (audioEnabled) playTactileBlip(1300);
    confetti({
      particleCount: 30,
      spread: 50,
      colors: ['#00D2FF', '#FFD700']
    });
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
                className={`p-4 rounded-xl text-left transition-all border flex flex-col justify-between h-32 ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#0E2C60] to-[#070D1E] border-[#00D2FF] shadow-[0_0_20px_rgba(0,210,255,0.3)] ring-1 ring-cyan-400'
                    : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-400'}`}>
                    {getPillarIcon(pillar.icon)}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500">#{pillar.number}</span>
                </div>
                <div>
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
            <h4 className="text-2xl font-black text-white">{selectedPillar.name}</h4>
            <p className="text-sm text-cyan-200">{selectedPillar.tagline}</p>
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

      {/* "Today I Have Something to Sell" C2C Platform */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1E] border border-[#FFD700]/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFD700] uppercase tracking-widest">
              <Store className="w-3.5 h-3.5" /> SOVEREIGN C2C COMMERCE
            </div>
            <h3 className="text-xl font-bold text-white">ระบบ "วันนี้มีของมาขาย" (Today I Have Something to Sell)</h3>
          </div>
          <button
            id="open-c2c-modal-btn"
            onClick={() => setIsListingOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FFD700] text-slate-950 hover:brightness-110 flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,215,0,0.3)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> ลงขายสินค้าในโปรไฟล์อัศวิน
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          เปิดโอกาสให้อัศวินและพลเมืองนำสินค้าโฮมเมด, ของมือสอง, หรือของดีประจำถิ่นมาปักหมุดขายในโปรไฟล์ โดยระบบไม่คิดค่าส่วนแบ่ง GP 30% เหมือนแอปอื่น เงินถึงมือผู้ผลิตเต็มจำนวน 100%!
        </p>

        {orderedItemTitle && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-bounce">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>สั่งซื้อสินค้า "{orderedItemTitle}" สำเร็จ! ส่งการแจ้งเตือนให้อัศวินเตรียมจัดส่งเรียบร้อย</span>
          </div>
        )}

        {/* C2C Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {c2cItems.map((prod) => (
            <div
              key={prod.id}
              className="p-4 rounded-xl bg-black/40 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">{prod.category}</span>
                  <span className="text-amber-400 font-bold">★ {prod.rating}</span>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">{prod.title}</h4>
                <p className="text-[11px] text-slate-400">{prod.riderName}</p>
                <p className="text-xs text-slate-300 line-clamp-2">{prod.description}</p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400">ราคา</span>
                  <p className="text-base font-black text-[#FFD700] font-mono">{prod.price} ฿</p>
                </div>
                <button
                  id={`btn-order-c2c-${prod.id}`}
                  onClick={() => handleOrderC2c(prod)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
                >
                  สั่งซื้อ
                </button>
              </div>
            </div>
          ))}
        </div>
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

      {/* Modal for New C2C Listing */}
      {isListingOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#070D1E] border border-amber-500/50 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" /> ลงขายสินค้าในนามอัศวิน
              </h3>
              <button onClick={() => setIsListingOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateC2cListing} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">ชื่อสินค้า:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ขนมเปี๊ยะอบควันเทียน, หมวกกันน็อคมือสอง..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">ราคา (บาท):</label>
                  <input
                    type="number"
                    required
                    placeholder="เช่น 50"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">หมวดหมู่:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Homemade Food">Homemade Food</option>
                    <option value="Handcraft">Handcraft</option>
                    <option value="Vintage/2nd Hand">Vintage/2nd Hand</option>
                    <option value="Sacred Amulet">Sacred Amulet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">รายละเอียดสินค้า:</label>
                <textarea
                  rows={3}
                  placeholder="อธิบายรสชาติหรือสภาพสินค้า..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsListingOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FFD700] text-slate-950 font-bold hover:brightness-110"
                >
                  ยืนยันลงขาย (GP 0%)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
