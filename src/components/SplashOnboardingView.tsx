import React from 'react';
import { motion } from 'motion/react';
import { 
  Bike, 
  UserCheck, 
  Store, 
  Building2, 
  Download, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import type { UserRole } from '../types/auth';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SplashOnboardingViewProps {
  selectedRole: UserRole | null;
  onSelectRole: (role: UserRole) => void;
  onProceed: () => void;
  onOpenAuth: () => void;
}

export const SplashOnboardingView: React.FC<SplashOnboardingViewProps> = ({
  selectedRole,
  onSelectRole,
  onProceed,
  onOpenAuth
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();

  const roles = [
    {
      id: 'knight' as UserRole,
      title: 'อัศวินไรเดอร์',
      subtitle: 'คนขับ / พี่วินสองล้อคู่เมือง',
      desc: 'รับภารกิจ 8 เสาหลัก กองทุนสวัสดิการ 5 ถัง ค่าธรรมเนียมโปร่งใส 100%',
      icon: Bike,
      accentBorder: 'hover:border-[#00D4FF]',
      selectedBorder: 'border-[#00D4FF] glow-neon-sm',
      badge: 'Level 1 - 100'
    },
    {
      id: 'citizen' as UserRole,
      title: 'พลเมืองอัศวิน',
      subtitle: 'ผู้ใช้บริการ & ประชาชน',
      desc: 'เดินทาง ส่งพัสดุ ดูแลสัตว์เลี้ยง พาผู้สูงอายุทำบุญ ปลอดภัยทุกเส้นเลือดฝอย',
      icon: UserCheck,
      accentBorder: 'hover:border-[#00D4FF]',
      selectedBorder: 'border-[#00D4FF] glow-neon-sm',
      badge: '8 เสาหลักบริการ'
    },
    {
      id: 'merchant' as UserRole,
      title: 'ร้านค้าพันธมิตร',
      subtitle: 'ร้านอาหาร & ร้านค้าชุมชน',
      desc: 'เรียกอัศวินส่งด่วน ค่า GP เป็นธรรม เริ่มต้นเพียง 5% แดชบอร์ดโปร่งใส',
      icon: Store,
      accentBorder: 'hover:border-[#00D4FF]',
      selectedBorder: 'border-[#00D4FF] glow-neon-sm',
      badge: 'GP เริ่มต้น 5%'
    },
    {
      id: 'partner' as UserRole,
      title: 'องค์กรพาร์ทเนอร์',
      subtitle: 'โรงพยาบาล / รร. / องค์กร B2B',
      desc: 'จองรถล่วงหน้าเป็นกลุ่ม ติดตามภารกิจพร้อมกัน สัญญา Retainer ประจำเดือน',
      icon: Building2,
      accentBorder: 'hover:border-[#00D4FF]',
      selectedBorder: 'border-[#00D4FF] glow-neon-sm',
      badge: 'B2B Retainer'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A1633] text-white flex flex-col justify-between px-4 py-6 sm:px-6 max-w-md mx-auto relative overflow-hidden font-thai">
      {/* Background Decorative Ambient Neon Gradients */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#00D4FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 bg-[#00D4FF]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-60 h-60 bg-[#FFC93C]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with PWA Install Prompt */}
      <header className="relative z-10 flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00D4FF] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#00D4FF] tracking-wider uppercase">
            Sovereign OS v2.6
          </span>
        </div>

        {/* PWA Install Button */}
        {(!isInstalled) && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00D4FF]/15 border border-[#00D4FF]/40 text-[#00D4FF] text-xs font-medium hover:bg-[#00D4FF]/25 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span>ติดตั้งแอป PWA</span>
          </button>
        )}
      </header>

      {/* Hero Brand & Slogan */}
      <div className="relative z-10 my-4 text-center">
        {/* Animated Neon Logo */}
        <motion.div 
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center justify-center p-4 rounded-2xl bg-[#0A1633]/90 border border-[#00D4FF]/30 glow-neon-lg mb-3 shadow-[0_0_30px_rgba(0,212,255,0.3)]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0A1633] p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-[#0A1633] rounded-[10px] flex items-center justify-center">
                <Bike className="w-6 h-6 text-[#00D4FF]" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-wider text-white leading-none">
                WINRIDER<span className="text-[#00D4FF]">.AI</span>
              </h1>
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                Sovereign Mobility
              </span>
            </div>
          </div>
        </motion.div>

        {/* Slogan */}
        <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
          Thailand is Home — เข้าถึงทุกเส้นเลือดฝอย
        </h2>
        <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">
          ระบบปฏิบัติการคมนาคมอัจฉริยะเพื่อคนไทยและพี่วินมอเตอร์ไซค์
        </p>
      </div>

      {/* 4 Role Selection Cards */}
      <div className="relative z-10 space-y-2.5 my-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-gray-400">เลือกบทบาทของคุณเพื่อเริ่มต้น</span>
          <span className="text-[11px] text-[#00D4FF] font-medium">4 บทบาทหลัก</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {roles.map((r) => {
            const Icon = r.icon;
            const isSelected = selectedRole === r.id;

            return (
              <motion.div
                key={r.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectRole(r.id)}
                className={`relative p-3.5 rounded-2xl cursor-pointer transition-all duration-200 backdrop-blur-md bg-[#0A1633]/85 border ${
                  isSelected
                    ? 'border-[#00D4FF] bg-[#0A1633] shadow-[0_0_20px_rgba(0,212,255,0.25)] ring-1 ring-[#00D4FF]'
                    : 'border-[#00D4FF]/20 hover:border-[#00D4FF]/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl border transition ${
                    isSelected 
                      ? 'bg-[#00D4FF]/20 border-[#00D4FF] text-[#00D4FF]' 
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {r.title}
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#00D4FF] inline" />
                        )}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#FFC93C] font-semibold border border-[#FFC93C]/20">
                        {r.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#00D4FF] font-medium">
                      {r.subtitle}
                    </p>
                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                      {r.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <footer className="relative z-10 pt-4 space-y-2.5">
        <button
          onClick={onProceed}
          disabled={!selectedRole}
          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            selectedRole
              ? 'bg-[#00D4FF] text-[#0A1633] shadow-[0_0_25px_rgba(0,212,255,0.45)] hover:bg-[#38E1FF] active:scale-[0.99]'
              : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
          }`}
        >
          <span>เข้าสู่ระบบในบทบาทที่เลือก</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between text-xs px-2 text-gray-400">
          <button 
            onClick={onOpenAuth}
            className="hover:text-[#00D4FF] transition"
          >
            เข้าสู่ระบบด้วย Email / Google
          </button>
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <ShieldAlert className="w-3 h-3 text-[#00D4FF]" />
            PDPA Verified
          </span>
        </div>
      </footer>
    </div>
  );
};
