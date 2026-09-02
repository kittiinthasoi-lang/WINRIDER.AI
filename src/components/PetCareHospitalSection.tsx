import React, { useState } from 'react';
import { 
  PET_HOSPITALS_AND_CLINICS, 
  PetHospitalClinic, 
  WIN_PET_CARE_REQUIREMENTS 
} from '../data/petHospitalData';
import { 
  Dog, 
  Heart, 
  Phone, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  Star, 
  CheckCircle2, 
  Sparkles, 
  Navigation,
  ChevronRight,
  Stethoscope,
  Building,
  Activity
} from 'lucide-react';
import { playTactileBlip } from '../utils/audio';

interface PetCareHospitalSectionProps {
  audioEnabled: boolean;
  onSelectHospitalForBooking: (hospital: PetHospitalClinic) => void;
  onBackToMain?: () => void;
}

export const PetCareHospitalSection: React.FC<PetCareHospitalSectionProps> = ({
  audioEnabled,
  onSelectHospitalForBooking,
  onBackToMain
}) => {
  const [filterType, setFilterType] = useState<'all' | 'emergency_24h' | 'hospital' | 'clinic'>('all');
  const [selectedHospitalDetail, setSelectedHospitalDetail] = useState<PetHospitalClinic | null>(null);
  const [showEmergencyTips, setShowEmergencyTips] = useState<boolean>(false);

  const filteredHospitals = PET_HOSPITALS_AND_CLINICS.filter(h => {
    if (filterType === 'all') return true;
    if (filterType === 'emergency_24h') return h.is24Hours;
    if (filterType === 'hospital') return h.type === 'hospital' || h.type === 'specialist';
    if (filterType === 'clinic') return h.type === 'clinic';
    return true;
  });

  return (
    <div className="space-y-3.5">
      {/* TOP NAVIGATION / BACK TO MAIN BAR */}
      {onBackToMain && (
        <div className="flex items-center justify-between p-2 rounded-2xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(900);
              onBackToMain();
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <span>← กลับหน้าหลัก (Home)</span>
          </button>
          <span className="text-[10px] text-slate-400 font-mono">
            🐾 WIN-Pet Care Logistics
          </span>
        </div>
      )}

      {/* HEADER WITH PET CARE ACCENT */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1C160C] via-[#120E08] to-[#0A0D18] border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                🐾
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                    WIN-Pet Care Logistics
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    พร้อมสแตนด์บาย 24 ชม.
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <span>โรงพยาบาล & คลินิกรักษาสัตว์เลี้ยงใกล้เคียง</span>
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setShowEmergencyTips(!showEmergencyTips);
              }}
              className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-[10px] font-mono flex items-center gap-1 transition-all"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{showEmergencyTips ? 'ปิดคู่มือ' : 'คู่มือสัตว์ป่วยฉุกเฉิน'}</span>
            </button>
          </div>

          <p className="text-xs text-amber-200/90 leading-relaxed">
            ค้นหาโรงพยาบาลสัตว์และคลินิกชั้นนำในรัศมีใกล้คุณ พร้อมเรียกพี่วิน <strong>WIN-Pet Care</strong> นำส่งน้องหมา น้องแมว ถึงมือคุณหมออย่างปลอดภัยและรวดเร็ว
          </p>

          {/* DRIVER ELIGIBILITY LEVEL 10+ MANDATE BADGE */}
          <div className="p-3 rounded-2xl bg-black/60 border border-amber-400/40 flex items-start gap-2.5 text-xs">
            <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">
                  🛡️ มาตรฐานอัศวิน Level 10+ (Bronze Knight ขึ้นไปเท่านั้น)
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  VERIFIED
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                พี่วินที่ได้รับอนุญาตให้รับงาน <strong>WIN-Pet Care</strong> ต้องมีระดับเลเวล <strong>Level 10 ขึ้นไป</strong> เท่านั้น ผ่านการทดสอบขับขี่นุ่มนวล และติดตั้งอุปกรณ์ <strong>กล่องปรับอากาศ WIN-Pet Pod + สายรัดเซฟตี้</strong> เพื่อป้องกันสัตว์เลี้ยงตกใจหรือเมารถ 100%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* EMERGENCY TRIAGE TIPS ACCORDION */}
      {showEmergencyTips && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 to-[#0C1528] border border-rose-500/40 text-xs space-y-2.5 animate-fade-in">
          <div className="flex items-center gap-2 text-rose-300 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>สัญญาณเตือนสัตว์เลี้ยงต้องส่งโรงพยาบาล 24 ชม. ด่วนที่สุด!</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-black/40 border border-rose-500/20 text-slate-200">
              <strong className="text-rose-400 block mb-0.5">☀️ ฮีทสโตรก (Heatstroke)</strong>
              หอบรุนแรง ลิ้นม่วง น้ำลายฟูม อุณหภูมิร่างกายสูง
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-rose-500/20 text-slate-200">
              <strong className="text-rose-400 block mb-0.5">🩸 อุบัติเหตุ / กระแทก</strong>
              ขาหัก เลือดออกมาก ซึมไม่ตอบสนอง
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-rose-500/20 text-slate-200">
              <strong className="text-rose-400 block mb-0.5">🦴 กลืนสิ่งแปลกปลอม</strong>
              อาเจียนไม่หยุด ท้องกาง หายใจติดขัด
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-rose-500/20 text-slate-200">
              <strong className="text-rose-400 block mb-0.5">⚡ ชักเกร็ง / หมดสติ</strong>
              กล้ามเนื้อกระตุก ไม่รู้ตัว ปัสสาวะราด
            </div>
          </div>
          <div className="text-[10px] text-slate-400 text-right">
            *ระหว่างเดินทางใน WIN-Pet Pod มีช่องให้ออกซิเจนและม่านกันแดดช่วยประคองอาการ
          </div>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'ทั้งหมด (7)', icon: <Building className="w-3.5 h-3.5" /> },
          { id: 'emergency_24h', label: '🚨 ฉุกเฉิน 24 ชม. (4)', icon: <Activity className="w-3.5 h-3.5" /> },
          { id: 'hospital', label: '🏥 โรงพยาบาลใหญ่ (2)', icon: <Stethoscope className="w-3.5 h-3.5" /> },
          { id: 'clinic', label: '🩺 คลินิกใกล้บ้าน (1)', icon: <Heart className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setFilterType(tab.id as any);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filterType === tab.id
                ? 'bg-amber-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-[#0E1B36] text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* HOSPITALS & CLINICS CARDS LIST */}
      <div className="space-y-3">
        {filteredHospitals.map((hospital) => (
          <div
            key={hospital.id}
            className="p-4 rounded-2xl bg-gradient-to-br from-[#0F1B33] via-[#0B1528] to-[#070D1E] border border-amber-400/30 hover:border-amber-400/80 transition-all shadow-md space-y-3 group"
          >
            {/* Top header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform">
                  {hospital.icon}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      hospital.is24Hours 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' 
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {hospital.typeBadge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {hospital.area}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors mt-0.5">
                    {hospital.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {hospital.nameEn}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="flex items-center justify-end gap-1 text-amber-400 text-xs font-bold font-mono">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{hospital.rating}</span>
                  <span className="text-[10px] text-slate-400">({hospital.reviewsCount})</span>
                </div>
                <div className="text-[10px] text-cyan-300 font-mono mt-0.5">
                  ห่าง {hospital.distanceKm} กม. • ETA {hospital.etaMinutes} นาที
                </div>
              </div>
            </div>

            {/* Highlights description */}
            <p className="text-xs text-slate-300 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5">
              {hospital.highlight}
            </p>

            {/* Specialties Badges */}
            <div className="flex flex-wrap gap-1">
              {hospital.specialties.map((spec, sIdx) => (
                <span
                  key={sIdx}
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300 font-sans"
                >
                  ✓ {spec}
                </span>
              ))}
            </div>

            {/* Footer row with Call & Book Button */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <a
                  href={`tel:${hospital.phoneNumber.replace(/-/g, '')}`}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{hospital.phoneNumber}</span>
                </a>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  <Clock className="w-3 h-3 inline mr-1 text-amber-400" />
                  {hospital.openHours.split('(')[0]}
                </span>
              </div>

              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(1000);
                  onSelectHospitalForBooking(hospital);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Dog className="w-3.5 h-3.5" />
                <span>เรียกพี่วินส่งน้องด่วน (฿{hospital.estimatedFare})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* BOTTOM BACK TO MAIN BUTTON */}
      {onBackToMain && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(900);
              onBackToMain();
            }}
            className="w-full py-3 rounded-2xl bg-black/60 hover:bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
          >
            <span>← กลับสู่หน้าหลัก (Home)</span>
          </button>
        </div>
      )}
    </div>
  );
};
