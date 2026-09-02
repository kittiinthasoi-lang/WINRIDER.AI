import React, { useState } from 'react';
import { playTactileBlip, playLevelUpFanfare, playRadarScan } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Shield,
  Zap,
  Target,
  Gift,
  Coins,
  Compass,
  Star,
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  Store,
  Bike,
  Heart,
  Truck
} from 'lucide-react';

export interface QuestItem {
  id: string;
  role: 'driver' | 'citizen' | 'merchant';
  category: 'daily' | 'weekly' | 'epic';
  title: string;
  desc: string;
  xpReward: number;
  bonusReward?: string;
  progress: number;
  totalRequired: number;
  isClaimed: boolean;
  iconEmoji: string;
  tag: string;
}

interface SovereignQuestCenterProps {
  initialRole?: 'driver' | 'citizen' | 'merchant';
  driverLevel?: number;
  citizenLevel?: number;
  merchantLevel?: number;
  audioEnabled: boolean;
  onGainDriverXp?: (amount: number, reason: string) => void;
  onGainCitizenXp?: (amount: number, reason: string) => void;
  onGainMerchantXp?: (amount: number, reason: string) => void;
  onRewardBonusCash?: (amount: number) => void;
}

export const INITIAL_QUESTS: QuestItem[] = [
  // --- DRIVER QUESTS (พี่วิน) ---
  {
    id: 'DQ-DRV-1',
    role: 'driver',
    category: 'daily',
    title: 'วิ่งส่งผู้โดยสารครบ 5 เที่ยว',
    desc: 'ให้บริการรับส่งผู้โดยสารในเขตพื้นที่ด้วยความสุภาพและปลอดภัย',
    xpReward: 250,
    bonusReward: '+฿30 โบนัสค่าน้ำมัน',
    progress: 3,
    totalRequired: 5,
    isClaimed: false,
    iconEmoji: '🛵',
    tag: 'Daily Rush'
  },
  {
    id: 'DQ-DRV-2',
    role: 'driver',
    category: 'daily',
    title: 'สวมชุดเกราะ & หมวก Smart HUD เต็มยศ',
    desc: 'เปิดระบบไฟส่องสว่างเรืองแสงและเชื่อมต่อระบบเสียงแจ้งเตือน HUD',
    xpReward: 200,
    bonusReward: 'ปลดล็อกสกินไฟนีออน',
    progress: 1,
    totalRequired: 1,
    isClaimed: false,
    iconEmoji: '🛡️',
    tag: 'Armor Ready'
  },
  {
    id: 'DQ-DRV-3',
    role: 'driver',
    category: 'daily',
    title: 'วิ่งช่วงเวลาเร่งด่วนเช้า-เย็น (Rush Hour)',
    desc: 'ช่วยระบายการจราจรติดขัดช่วง 07:00-09:00 หรือ 17:00-19:00',
    xpReward: 180,
    bonusReward: '+฿20 ค่ารอบพิเศษ',
    progress: 2,
    totalRequired: 2,
    isClaimed: false,
    iconEmoji: '⚡',
    tag: 'Rush Hour'
  },
  {
    id: 'DQ-DRV-4',
    role: 'driver',
    category: 'daily',
    title: 'ให้บริการพิเศษ (WIN Spirit / MU BUDDY / WIN-Pet)',
    desc: 'พาผู้สูงอายุไปทำศาสนกิจ, ทริปสายมู 9 วัด หรือพาสัตว์เลี้ยงไปหาหมอ',
    xpReward: 300,
    bonusReward: 'คะแนนเครดิต +10 แต้ม',
    progress: 1,
    totalRequired: 1,
    isClaimed: false,
    iconEmoji: '🪷',
    tag: 'Special Care'
  },
  {
    id: 'WQ-DRV-1',
    role: 'driver',
    category: 'weekly',
    title: 'สะสมเที่ยววิ่ง 35 เที่ยวต่อสัปดาห์',
    desc: 'สร้างรายได้มั่นคงและปลดหนี้ค่าชุดเกราะ 4 บาทต่อเที่ยวตามนโยบายอธิปไตย',
    xpReward: 1200,
    bonusReward: '+฿200 โบนัสสวัสดิการ',
    progress: 24,
    totalRequired: 35,
    isClaimed: false,
    iconEmoji: '🏆',
    tag: 'Weekly Master'
  },
  {
    id: 'WQ-DRV-2',
    role: 'driver',
    category: 'weekly',
    title: 'ได้รับคะแนนรีวิว 5 ดาวต่อเนื่อง 10 เที่ยว',
    desc: 'รักษามาตรฐานการขับขี่นุ่มนวลและไม่ปฏิเสธผู้โดยสาร',
    xpReward: 600,
    bonusReward: 'ตราสัญลักษณ์ 5-Star Knight',
    progress: 8,
    totalRequired: 10,
    isClaimed: false,
    iconEmoji: '⭐',
    tag: '5-Star Streak'
  },
  {
    id: 'EQ-DRV-1',
    role: 'driver',
    category: 'epic',
    title: 'ฮีโร่ลุยน้ำท่วม & ลุยฝน (Flood Hero)',
    desc: 'วิ่งงานช่วงฝนตกหนักด้วย Touring Adventure หรือรถที่พร้อมลุยน้ำท่วม',
    xpReward: 2000,
    bonusReward: 'ฉายา Sovereign Rain Conqueror',
    progress: 2,
    totalRequired: 3,
    isClaimed: false,
    iconEmoji: '🌧️',
    tag: 'Epic Challenge'
  },

  // --- CITIZEN QUESTS (ลูกค้า / ผู้โดยสาร) ---
  {
    id: 'DQ-CTZ-1',
    role: 'citizen',
    category: 'daily',
    title: 'เรียกใช้บริการ WINRIDER 1 ทริป',
    desc: 'เดินทางสะดวกรวดเร็ว ประหยัดเวลา หลบหลีกรถติดด้วยพี่วินมืออาชีพ',
    xpReward: 150,
    bonusReward: 'คูปองส่วนลด 10฿ ทริปถัดไป',
    progress: 1,
    totalRequired: 1,
    isClaimed: false,
    iconEmoji: '🛵',
    tag: 'Daily Commute'
  },
  {
    id: 'DQ-CTZ-2',
    role: 'citizen',
    category: 'daily',
    title: 'สั่งการเรียกรถด้วยเสียง AI Voice Assistant',
    desc: 'ทดลองสั่งงานภาษาไทย เช่น "เลือกรถประหยัดสุด" หรือ "พาคุณตาไปละหมาด"',
    xpReward: 120,
    bonusReward: 'เครดิตการเงินพลเมือง +5',
    progress: 1,
    totalRequired: 1,
    isClaimed: false,
    iconEmoji: '🎙️',
    tag: 'Voice AI'
  },
  {
    id: 'DQ-CTZ-3',
    role: 'citizen',
    category: 'daily',
    title: 'ให้คะแนนรีวิวและทิปพี่วิน',
    desc: 'ส่งเสริมกำลังใจพี่วินอัศวินผู้พิทักษ์ซอยแคบ',
    xpReward: 100,
    bonusReward: 'เหรียญสะสมเกียรติยศ',
    progress: 1,
    totalRequired: 1,
    isClaimed: false,
    iconEmoji: '💖',
    tag: 'Good Karma'
  },
  {
    id: 'WQ-CTZ-1',
    role: 'citizen',
    category: 'weekly',
    title: 'ใช้บริการ WIN Spirit พาญาติผู้ใหญ่ทำศาสนกิจ',
    desc: 'พาคุณตาไปละหมาดมัสยิด หรือพาคุณยายไปทำบุญตักบาตรที่วัด',
    xpReward: 400,
    bonusReward: 'ส่วนลด 20% ทริปครอบครัว',
    progress: 1,
    totalRequired: 1,
    isClaimed: false,
    iconEmoji: '🕌',
    tag: 'Family Spirit'
  },
  {
    id: 'WQ-CTZ-2',
    role: 'citizen',
    category: 'weekly',
    title: 'อุดหนุนสินค้าในตลาดชุมชน C2C ของพี่วิน',
    desc: 'สั่งอาหารโฮมเมด งานคราฟต์ หรือของดีประจำถิ่นฝั่งธนบุรี',
    xpReward: 350,
    bonusReward: 'แต้มสะสม WIN Coins 50 แต้ม',
    progress: 2,
    totalRequired: 3,
    isClaimed: false,
    iconEmoji: '🍱',
    tag: 'C2C Support'
  },
  {
    id: 'EQ-CTZ-1',
    role: 'citizen',
    category: 'epic',
    title: 'ทริปสายมู 9 วัดกับ WIN MU BUDDY',
    desc: 'เดินทางสักการะสิ่งศักดิ์สิทธิ์ครบ 9 แห่งพร้อมเปิดบทสวดมนต์ AI',
    xpReward: 1500,
    bonusReward: 'ผ้ายันต์ดิจิทัลคุ้มครองดวงชะตา',
    progress: 5,
    totalRequired: 9,
    isClaimed: false,
    iconEmoji: '🪷',
    tag: 'Sacred Explorer'
  },

  // --- MERCHANT QUESTS (ร้านค้าพันธมิตร) ---
  {
    id: 'DQ-MCH-1',
    role: 'merchant',
    category: 'daily',
    title: 'เตรียมออเดอร์เสร็จไวใน 10 นาที',
    desc: 'ช่วยให้พี่วินรับของได้ทันใจ ผู้โดยสารได้รับอาหารร้อนๆ ตรงเวลา',
    xpReward: 150,
    bonusReward: 'อันดับร้านแนะนำบนแผนที่ 3D',
    progress: 4,
    totalRequired: 5,
    isClaimed: false,
    iconEmoji: '⏱️',
    tag: 'Speed Chef'
  },
  {
    id: 'DQ-MCH-2',
    role: 'merchant',
    category: 'daily',
    title: 'จัดโปรโมชั่น Flash Sale ประจำวัน 1 รายการ',
    desc: 'กระตุ้นยอดขายช่วงบ่ายและดึงดูดลูกค้าละแวกใกล้เคียง',
    xpReward: 200,
    bonusReward: 'เพิ่มการมองเห็นร้าน +30%',
    progress: 1,
    totalRequired: 1,
    isClaimed: false,
    iconEmoji: '🔥',
    tag: 'Flash Promo'
  },
  {
    id: 'WQ-MCH-1',
    role: 'merchant',
    category: 'weekly',
    title: 'ยอดขายทะลุ 50 ออเดอร์ผ่าน WIN Hub',
    desc: 'ขยายธุรกิจร่วมกับเครือข่ายอัศวินจักรวรรดิ WINRIDER GP 0%',
    xpReward: 800,
    bonusReward: 'วงเงินหมุนเวียนดอกเบี้ย 0% +฿50,000',
    progress: 38,
    totalRequired: 50,
    isClaimed: false,
    iconEmoji: '📈',
    tag: 'Sales Champion'
  },
  {
    id: 'EQ-MCH-1',
    role: 'merchant',
    category: 'epic',
    title: 'ได้รับตราสัญลักษณ์ร้านอร่อย 5 ดาวมาตรฐานจักรวรรดิ',
    desc: 'รักษาคะแนนรีวิวความอร่อยและความสะอาดเกิน 4.9 ดาว 100 บิลต่อเนื่อง',
    xpReward: 1800,
    bonusReward: 'ป้าย Golden Sovereign Michelin บนแผนที่',
    progress: 78,
    totalRequired: 100,
    isClaimed: false,
    iconEmoji: '👑',
    tag: 'Empire Michelin'
  }
];

export const SovereignQuestCenter: React.FC<SovereignQuestCenterProps> = ({
  initialRole = 'driver',
  driverLevel = 100,
  citizenLevel = 91,
  merchantLevel = 75,
  audioEnabled,
  onGainDriverXp,
  onGainCitizenXp,
  onGainMerchantXp,
  onRewardBonusCash
}) => {
  const [activeRole, setActiveRole] = useState<'driver' | 'citizen' | 'merchant'>(initialRole);
  const [activeCategory, setActiveCategory] = useState<'all' | 'daily' | 'weekly' | 'epic'>('all');
  const [quests, setQuests] = useState<QuestItem[]>(INITIAL_QUESTS);
  const [claimedToast, setClaimedToast] = useState<string | null>(null);

  const filteredQuests = quests.filter(q => {
    if (q.role !== activeRole) return false;
    if (activeCategory !== 'all' && q.category !== activeCategory) return false;
    return true;
  });

  const handleClaimQuest = (quest: QuestItem) => {
    if (quest.progress < quest.totalRequired) {
      if (audioEnabled) playTactileBlip(400);
      alert(`⚠️ ภารกิจ "${quest.title}" ยังไม่เสร็จสิ้น (ความคืบหน้า: ${quest.progress}/${quest.totalRequired})`);
      return;
    }

    if (audioEnabled) {
      playLevelUpFanfare();
    }
    confetti({
      particleCount: 80,
      spread: 85,
      colors: ['#FFD700', '#00D2FF', '#10B981', '#FFFFFF']
    });

    // Update quest state
    setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, isClaimed: true } : q));

    // Award XP based on role
    if (quest.role === 'driver' && onGainDriverXp) {
      onGainDriverXp(quest.xpReward, `สำเร็จภารกิจ: ${quest.title}`);
    } else if (quest.role === 'citizen' && onGainCitizenXp) {
      onGainCitizenXp(quest.xpReward, `สำเร็จภารกิจ: ${quest.title}`);
    } else if (quest.role === 'merchant' && onGainMerchantXp) {
      onGainMerchantXp(quest.xpReward, `สำเร็จภารกิจ: ${quest.title}`);
    }

    if (quest.bonusReward && onRewardBonusCash && quest.bonusReward.includes('฿')) {
      const match = quest.bonusReward.match(/฿(\d+)/);
      if (match) {
        onRewardBonusCash(parseInt(match[1], 10));
      }
    }

    setClaimedToast(`🎉 รับรางวัลสำเร็จ! +${quest.xpReward} XP ${quest.bonusReward ? `(${quest.bonusReward})` : ''}`);
    setTimeout(() => setClaimedToast(null), 4000);
  };

  const handleSimulateProgress = (questId: string) => {
    if (audioEnabled) playTactileBlip(950);
    setQuests(prev => prev.map(q => {
      if (q.id === questId && q.progress < q.totalRequired) {
        const nextProg = Math.min(q.totalRequired, q.progress + 1);
        return { ...q, progress: nextProg };
      }
      return q;
    }));
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0B1733] via-[#081226] to-[#040914] border-2 border-[#FFD700]/50 shadow-[0_0_35px_rgba(255,215,0,0.2)] space-y-4 font-mono">
      {/* Header Toast */}
      {claimedToast && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-[#00D2FF] text-slate-950 font-black text-xs text-center shadow-2xl border-2 border-white/40 animate-bounce">
          {claimedToast}
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FFD700] to-amber-500 flex items-center justify-center text-2xl text-slate-950 font-black shadow-[0_0_20px_rgba(255,215,0,0.5)]">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 text-[10px] font-bold uppercase">
                SOVEREIGN XP QUEST CENTER
              </span>
              <span className="text-[10px] text-cyan-300 font-bold">
                (สะสม XP ปลดล็อก 10 ระดับยศ)
              </span>
            </div>
            <h3 className="text-base font-black text-white mt-0.5">
              ศูนย์ภารกิจเก็บ XP รวม (พี่วิน • ลูกค้า • ร้านค้า)
            </h3>
          </div>
        </div>

        {/* Role Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-2xl border border-white/10 w-full sm:w-auto">
          {[
            { id: 'driver' as const, label: 'ภารกิจพี่วิน (KNIGHT)', icon: '🛵', level: driverLevel },
            { id: 'citizen' as const, label: 'ภารกิจลูกค้า (CITIZEN)', icon: '🦥', level: citizenLevel },
            { id: 'merchant' as const, label: 'ภารกิจร้านค้า (STORE)', icon: '🏬', level: merchantLevel }
          ].map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(850);
                setActiveRole(r.id);
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeRole === r.id
                  ? 'bg-gradient-to-r from-[#00D2FF] to-blue-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{r.icon}</span>
              <span className="hidden xs:inline">{r.label.split(' ')[0]}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-amber-300 font-mono">
                LV.{r.level}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all' as const, label: 'ทั้งหมด (All Quests)' },
            { id: 'daily' as const, label: '⚡ รายวัน (Daily Quests)' },
            { id: 'weekly' as const, label: '🏆 รายสัปดาห์ (Weekly Streaks)' },
            { id: 'epic' as const, label: '👑 มหากาพย์ (Epic Challenges)' }
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (audioEnabled) playTactileBlip(750);
                setActiveCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-amber-400/20 text-[#FFD700] border border-[#FFD700]'
                  : 'bg-black/40 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-slate-400 whitespace-nowrap hidden sm:inline">
          {filteredQuests.length} ภารกิจพร้อมทำ
        </span>
      </div>

      {/* Quests List */}
      <div className="space-y-3">
        {filteredQuests.map((quest) => {
          const isComplete = quest.progress >= quest.totalRequired;
          const percent = Math.min(100, Math.round((quest.progress / quest.totalRequired) * 100));

          return (
            <div
              key={quest.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5 ${
                quest.isClaimed
                  ? 'bg-black/30 border-white/10 opacity-70'
                  : isComplete
                  ? 'bg-gradient-to-r from-[#0C294F] via-[#091C38] to-[#061226] border-emerald-400 ring-2 ring-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                  : 'bg-[#071124] border-white/10 hover:border-cyan-500/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                    isComplete ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'bg-black/50 text-white'
                  }`}>
                    {quest.iconEmoji}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {quest.tag}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        #{quest.id}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white mt-0.5">
                      {quest.title}
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      {quest.desc}
                    </p>
                  </div>
                </div>

                {/* Reward Badges */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black text-[#FFD700] font-mono flex items-center gap-1 justify-end">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span>+{quest.xpReward} XP</span>
                  </div>
                  {quest.bonusReward && (
                    <span className="text-[9px] text-emerald-300 font-bold block mt-0.5">
                      {quest.bonusReward}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar & Actions */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>ความคืบหน้า: <strong className="text-white">{quest.progress} / {quest.totalRequired}</strong></span>
                    <span className={isComplete ? 'text-emerald-400 font-bold' : 'text-cyan-300'}>{percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10 p-[1px]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isComplete
                          ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_10px_#10B981]'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {!isComplete && !quest.isClaimed && (
                    <button
                      type="button"
                      onClick={() => handleSimulateProgress(quest.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[10px] font-mono transition-all"
                      title="กดเพื่อจำลองทำภารกิจเพิ่ม 1 สเต็ป"
                    >
                      + ทำภารกิจ (+1)
                    </button>
                  )}

                  {quest.isClaimed ? (
                    <span className="px-3 py-1.5 rounded-xl bg-white/10 text-slate-400 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>รับแล้ว</span>
                    </span>
                  ) : isComplete ? (
                    <button
                      type="button"
                      onClick={() => handleClaimQuest(quest)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-[#00D2FF] to-blue-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.5)] flex items-center gap-1.5 transition-all active:scale-95 animate-pulse"
                    >
                      <Gift className="w-3.5 h-3.5 text-slate-950" />
                      <span>กดรับรางวัล (+{quest.xpReward} XP)</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold">
                      กำลังดำเนินการ
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
