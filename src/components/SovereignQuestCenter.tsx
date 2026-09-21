import React, { useState } from 'react';
import { auth } from '../firebase';
import { loadQuestState, claimQuest as persistClaimQuest } from '../services/questService';
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
  role: 'driver' | 'citizen' | 'merchant' | 'partner';
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
  metricKey?: string;
}

interface SovereignQuestCenterProps {
  initialRole?: 'driver' | 'citizen' | 'merchant' | 'partner';
  driverLevel?: number;
  citizenLevel?: number;
  merchantLevel?: number;
  partnerLevel?: number;
  audioEnabled: boolean;
  onGainDriverXp?: (amount: number, reason: string) => void;
  onGainCitizenXp?: (amount: number, reason: string) => void;
  onGainMerchantXp?: (amount: number, reason: string) => void;
  onGainPartnerXp?: (amount: number, reason: string) => void;
  onRewardBonusCash?: (amount: number) => void;
}

export const QUEST_SEASON_ID = '2026-S3';

const makeQuest = (
  id: string,
  role: QuestItem['role'],
  category: QuestItem['category'],
  title: string,
  desc: string,
  xpReward: number,
  totalRequired: number,
  iconEmoji: string,
  tag: string,
  metricKey: string,
  bonusReward?: string,
): QuestItem => ({
  id, role, category, title, desc, xpReward, bonusReward,
  progress: 0, totalRequired, isClaimed: false, iconEmoji, tag, metricKey,
});

/**
 * ภารกิจซีซันใหม่ 2026-S3
 * ทุกบัญชีใหม่เริ่มจาก 0 และชุดภารกิจไม่ใช้ข้อมูล/ความคืบหน้าจากซีซันเก่า
 * metricKey ถูกออกแบบให้ผูกกับ event จริงของแอปต่อไป
 */
export const INITIAL_QUESTS: QuestItem[] = [
  // KNIGHT — งานจริง, ความปลอดภัย, GPS, บริการพิเศษ
  makeQuest('S3-KN-D01','driver','daily','เช็กความพร้อมก่อนออกงาน','เปิด Garage ตรวจรถหลักและยืนยันว่ารถพร้อมรับงานก่อนเริ่มกะ',60,1,'🛵','Garage Ready','driver.preflight'),
  makeQuest('S3-KN-D02','driver','daily','เปิดโหมดพร้อมรับงาน','เปิดโหมดออนไลน์/พร้อมรับงานและอยู่ในพื้นที่ให้บริการ',80,1,'🟢','Ready to Ride','driver.online'),
  makeQuest('S3-KN-D03','driver','daily','ส่งผู้โดยสารถึงปลายทาง','ทำทริปผู้โดยสารที่จบสถานะ COMPLETED ผ่าน Dispatch Engine',180,3,'📍','Real Trip','driver.completed_trip'),
  makeQuest('S3-KN-D04','driver','daily','ส่งงานตรงตามเส้นทางจริง','จบทริปที่มี GPS/Route ETA ถูกบันทึกจากระบบนำทาง',140,2,'🧭','Live Navigation','driver.routed_trip'),
  makeQuest('S3-KN-W01','driver','weekly','รักษาความสม่ำเสมอ 5 วัน','เปิดงานและทำงานผ่านระบบอย่างน้อย 5 วันในสัปดาห์',500,5,'📅','5-Day Knight','driver.active_days'),
  makeQuest('S3-KN-W02','driver','weekly','ผู้พิทักษ์บริการเฉพาะทาง','จบทริป WIN Spirit, WIN Family, WIN Pet Care หรือ WIN Express ตามเงื่อนไขบริการ',700,3,'🛡️','Special Service','driver.special_service'),
  makeQuest('S3-KN-E01','driver','epic','Knight ที่ระบบไว้ใจ','สะสมทริปสำเร็จ 50 เที่ยว พร้อมไม่มีการยกเลิกจากฝั่ง Knight',1600,50,'🏆','Trusted Knight','driver.trusted_completed_trip'),

  // CITIZEN — เรียกรถ, Shop, Street Market, Win Alert, ความปลอดภัย
  makeQuest('S3-CT-D01','citizen','daily','เดินทางด้วย WINRIDER','จบทริปที่เรียกผ่านแอปอย่างน้อย 1 เที่ยว',100,1,'🛵','Ride with WIN','citizen.completed_trip'),
  makeQuest('S3-CT-D02','citizen','daily','ใช้ Win Alert','เปิด Win Alert แล้วดูเส้นทาง/ค่าโดยสารจริงก่อนจองอย่างน้อย 1 รายการ',80,1,'⚡','Win Alert','citizen.win_alert_preview'),
  makeQuest('S3-CT-D03','citizen','daily','ค้นหา WIN Shop','เข้า WIN Shop และเปิดดูร้านค้าหรือพาร์ทเนอร์อย่างน้อย 1 โปรไฟล์',60,1,'🛍️','Shop Explorer','citizen.shop_profile_view'),
  makeQuest('S3-CT-D04','citizen','daily','สนับสนุน WIN Street Market','เปิดดูสินค้าประชาชนหรือบันทึกรายการที่สนใจอย่างน้อย 1 รายการ',60,1,'🏘️','Street Market','citizen.street_market_view'),
  makeQuest('S3-CT-W01','citizen','weekly','ผู้ใช้บริการรอบด้าน','ใช้ฟีเจอร์หลัก 3 หมวด: เรียกรถ, WIN Shop/Street Market และแผนที่/สถานที่',350,3,'🧩','App Explorer','citizen.feature_categories'),
  makeQuest('S3-CT-W02','citizen','weekly','นักเดินทางมีวินัย','จบทริป 5 เที่ยวและให้คะแนนหลังการเดินทางครบ',450,5,'⭐','Ride & Rate','citizen.rated_completed_trip'),
  makeQuest('S3-CT-E01','citizen','epic','พลเมือง WINRIDER ตัวจริง','จบทริป 20 เที่ยว + ใช้ WIN Shop/Street Market อย่างน้อย 5 ครั้ง',1400,25,'🌟','WIN Citizen','citizen.engagement_score'),

  // MERCHANT — หน้าร้าน, สินค้า, โปรโมชั่น, Dispatch, ออเดอร์
  makeQuest('S3-ME-D01','merchant','daily','อัปเดตหน้าร้านให้พร้อมขาย','ตรวจ/อัปเดตโปรไฟล์ร้าน เวลาเปิด และข้อมูลติดต่อให้ครบ',80,1,'🏪','Store Ready','merchant.storefront_ready'),
  makeQuest('S3-ME-D02','merchant','daily','ลงสินค้าให้ลูกค้าเห็น','มีการเพิ่มหรืออัปเดตสินค้าอย่างน้อย 1 รายการใน WIN Shop',100,1,'📦','Catalog Active','merchant.catalog_update'),
  makeQuest('S3-ME-D03','merchant','daily','ทำโปรโมชันวันนี้','สร้างหรือเปิดใช้งานโปรโมชั่น 1 รายการ',100,1,'🏷️','Promotion','merchant.promotion_publish'),
  makeQuest('S3-ME-D04','merchant','daily','เตรียมออเดอร์ให้พี่วิน','ทำออเดอร์ผ่านสถานะพร้อมรับสินค้า/จัดส่งตามระบบ',140,3,'🛵','Dispatch Ready','merchant.dispatch_ready'),
  makeQuest('S3-ME-W01','merchant','weekly','ร้านค้าสม่ำเสมอ','อัปเดตหน้าร้านหรือสินค้าอย่างน้อย 5 วันในสัปดาห์',450,5,'📅','Store Streak','merchant.active_days'),
  makeQuest('S3-ME-W02','merchant','weekly','สร้างประสบการณ์ลูกค้า','ปิดออเดอร์สำเร็จ 20 รายการโดยไม่ยกเลิกจากฝั่งร้าน',650,20,'🤝','Customer Care','merchant.completed_orders'),
  makeQuest('S3-ME-E01','merchant','epic','ร้านค้าพร้อมเติบโตกับ WIN','มีหน้าร้านสมบูรณ์ + สินค้า 20 รายการ + ออเดอร์สำเร็จ 100 รายการ',1800,121,'👑','WIN Merchant','merchant.store_growth'),

  // PARTNER — บริการ, สิทธิประโยชน์, นัดหมาย, การเชื่อมต่อ WIN
  makeQuest('S3-PA-D01','partner','daily','เปิดโปรไฟล์พาร์ทเนอร์ให้พร้อม','ตรวจข้อมูลองค์กร บริการ ที่อยู่ และเวลาทำการให้ครบ',80,1,'🏢','Partner Ready','partner.profile_ready'),
  makeQuest('S3-PA-D02','partner','daily','เผยแพร่บริการ','เพิ่มหรืออัปเดตบริการอย่างน้อย 1 รายการในโปรไฟล์',100,1,'🤝','Service Active','partner.service_update'),
  makeQuest('S3-PA-D03','partner','daily','ประกาศสิทธิพิเศษ','สร้างหรืออัปเดตโปรโมชั่น/สิทธิพิเศษ 1 รายการ',100,1,'🎁','Partner Offer','partner.offer_publish'),
  makeQuest('S3-PA-D04','partner','daily','รับการเชื่อมต่อจากลูกค้า','มีการเปิดดูโปรไฟล์บริการหรือเริ่มคำขอจากลูกค้าอย่างน้อย 1 ครั้ง',120,1,'📲','Customer Connect','partner.customer_connect'),
  makeQuest('S3-PA-W01','partner','weekly','พาร์ทเนอร์พร้อมให้บริการ','อัปเดตข้อมูลบริการอย่างน้อย 5 วันในสัปดาห์',450,5,'📅','Partner Streak','partner.active_days'),
  makeQuest('S3-PA-W02','partner','weekly','สร้างเครือข่ายบริการ','ได้รับคำขอ/การจอง/การเชื่อมต่อสำเร็จ 15 ครั้งผ่าน WIN',650,15,'🌐','WIN Network','partner.completed_connections'),
  makeQuest('S3-PA-E01','partner','epic','Partner ที่เชื่อมต่อจริง','มีบริการที่เผยแพร่ + สิทธิพิเศษ + การเชื่อมต่อสำเร็จ 50 ครั้ง',1800,52,'🏆','WIN Partner','partner.network_growth'),
];


export const SovereignQuestCenter: React.FC<SovereignQuestCenterProps> = ({
  initialRole = 'driver',
  driverLevel = 1,
  citizenLevel = 1,
  merchantLevel = 1,
  partnerLevel = 1,
  audioEnabled,
  onGainDriverXp,
  onGainCitizenXp,
  onGainMerchantXp,
  onRewardBonusCash
}) => {
  const [activeRole, setActiveRole] = useState<'driver' | 'citizen' | 'merchant' | 'partner'>(initialRole);
  const [activeCategory, setActiveCategory] = useState<'all' | 'daily' | 'weekly' | 'epic'>('all');
  const [quests, setQuests] = useState<QuestItem[]>(() =>
    INITIAL_QUESTS.map(q => ({ ...q, progress: 0, isClaimed: false }))
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const state = await loadQuestState(user.uid);
        if (cancelled) return;
        const progress = (state.progress || {}) as Record<string, number>;
        const claimed = new Set<string>((state.claimed || []) as string[]);
        setQuests(INITIAL_QUESTS.map(q => ({
          ...q,
          progress: Math.min(q.totalRequired, Number(progress[q.metricKey || '']) || 0),
          isClaimed: claimed.has(q.id),
        })));
      } catch (error) {
        console.warn('Unable to load quest state:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [initialRole]);

  const updateQuestMetric = React.useCallback((metricKey: string, amount = 1) => {
    setQuests(prev => prev.map(q => {
      if (q.metricKey !== metricKey || q.isClaimed) return q;
      return { ...q, progress: Math.min(q.totalRequired, q.progress + Math.max(0, amount)) };
    }));
  }, []);

  React.useEffect(() => {
    const handleQuestMetric = (event: Event) => {
      const detail = (event as CustomEvent<{ metricKey?: string; amount?: number }>).detail;
      if (detail?.metricKey) updateQuestMetric(detail.metricKey, detail.amount ?? 1);
    };
    window.addEventListener('winrider:quest-metric', handleQuestMetric as EventListener);
    return () => window.removeEventListener('winrider:quest-metric', handleQuestMetric as EventListener);
  }, [updateQuestMetric]);

  const emitQuestMetric = React.useCallback((metricKey: string, amount = 1) => {
    window.dispatchEvent(new CustomEvent('winrider:quest-metric', {
      detail: { metricKey, amount }
    }));
  }, []);


  const [claimedToast, setClaimedToast] = useState<string | null>(null);

  const filteredQuests = quests.filter(q => {
    if (q.role !== activeRole) return false;
    if (activeCategory !== 'all' && q.category !== activeCategory) return false;
    return true;
  });

  const handleClaimQuest = (quest: QuestItem) => {
    if (quest.isClaimed) return;
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

    // The server is authoritative for claim validation and XP reward.
    void persistClaimQuest(quest.id).then((result) => {
      if (result?.alreadyClaimed) return;
      setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, isClaimed: true } : q));

      if (quest.role === 'driver' && onGainDriverXp) {
        onGainDriverXp(quest.xpReward, `สำเร็จภารกิจ: ${quest.title}`);
      } else if (quest.role === 'citizen' && onGainCitizenXp) {
        onGainCitizenXp(quest.xpReward, `สำเร็จภารกิจ: ${quest.title}`);
      } else if (quest.role === 'merchant' && onGainMerchantXp) {
        onGainMerchantXp(quest.xpReward, `สำเร็จภารกิจ: ${quest.title}`);
      } else if (quest.role === 'partner' && onGainPartnerXp) {
        onGainPartnerXp(quest.xpReward, `สำเร็จภารกิจ: ${quest.title}`);
      }

      if (quest.bonusReward && onRewardBonusCash && quest.bonusReward.includes('฿')) {
        const match = quest.bonusReward.match(/฿(\d+)/);
        if (match) onRewardBonusCash(parseInt(match[1], 10));
      }

      setClaimedToast(`🎉 รับรางวัลสำเร็จ! +${quest.xpReward} XP ${quest.bonusReward ? `(${quest.bonusReward})` : ''}`);
      setTimeout(() => setClaimedToast(null), 4000);
    }).catch(error => {
      console.warn('Quest claim persistence failed:', error);
      alert('รับรางวัลภารกิจไม่สำเร็จ กรุณาลองใหม่');
    });

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
            { id: 'merchant' as const, label: 'ภารกิจร้านค้า (STORE)', icon: '🏬', level: merchantLevel },
            { id: 'partner' as const, label: 'ภารกิจพาร์ทเนอร์ (PARTNER)', icon: '🏢', level: partnerLevel }
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
