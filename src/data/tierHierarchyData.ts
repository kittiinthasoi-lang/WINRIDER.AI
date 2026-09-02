export interface TierRankDefinition {
  tierIndex: number; // 0 - 9 (10 ranks)
  levelRange: string;
  minLevel: number;
  maxLevel: number;
  xpRequired: number;
  levelMaxXpRange?: string;
  title: string;
  titleEn: string;
  badge: string;
  icon: string;
  colorTheme: string;
  glowColor: string;
  accentBorder: string;
  rarity: 'Common' | 'Tactical' | 'Imperial' | 'Legendary' | 'Godlike';
  description: string;
  keyPerks: string[];
  specialUnlockCondition?: string;
  exclusiveReward?: string;
}

// XP Difficulty Multipliers Config (Updated with reduced difficulty: Driver -1000%, Citizen -1000%, Merchant -3000%)
export const XP_DIFFICULTY_CONFIG = {
  knight: {
    multiplierLabel: 'อัตราปกติ x1.0 (ลดความยาก 1,000% สู่มาตรฐาน)',
    percentAdd: 0,
    multiplierFactor: 1.0,
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'อัตราสะสม XP มาตรฐาน x1.0 (ปรับลดความยากลง 1,000% สู่ระดับสมดุลมาตรฐาน) สำหรับอัศวินผู้พิทักษ์ (Standard Fair Knight Progression)'
  },
  citizen: {
    multiplierLabel: '+1,000% ความยาก (ลดลง 1,000% จากเดิม +2,000%)',
    percentAdd: 1000,
    multiplierFactor: 11.0,
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'อัตราทดความยาก +1,000% (x11.0) (ปรับลดลง 1,000% จากเดิม +2,000%) สำหรับพลเมืองอธิปไตย (Balanced Citizen Progression)'
  },
  merchant: {
    multiplierLabel: '+2,000% ความยาก (ลดลง 3,000% จากเดิม +5,000%)',
    percentAdd: 2000,
    multiplierFactor: 21.0,
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'อัตราทดความยาก +2,000% (x21.0) (ปรับลดลง 3,000% จากเดิม +5,000%) สำหรับร้านค้าพันธมิตร (Balanced Merchant Enterprise Scale)'
  }
};

/**
 * คำนวณคะแนนเต็ม XP สำหรับเลเวลที่กำหนด (Level 1 - 100)
 * ยิ่งเลเวลเยอะขึ้นยิ่งเก็บ XP ยากขึ้นตามสัดส่วน (Progressive Power Curve)
 * โดยใช้สมการความก้าวหน้าแบบโปรเกรสซีฟคูณด้วยตัวคูณความยากของบทบาท
 */
export const calculateLevelMaxXp = (level: number, role: 'knight' | 'citizen' | 'merchant' = 'knight'): number => {
  const safeLevel = Math.max(1, Math.min(100, Math.floor(level)));
  
  // Base XP curve for Knight (x1.0):
  // Lvl 1: 150 XP
  // Lvl 10: ~580 XP
  // Lvl 20: ~1,370 XP
  // Lvl 30: ~2,420 XP
  // Lvl 50: ~5,050 XP
  // Lvl 75: ~9,250 XP
  // Lvl 100: ~14,100 XP
  const baseCurve = Math.round(
    150 + 
    (safeLevel - 1) * 25 + 
    Math.pow((safeLevel - 1) * 0.72, 1.62) * 11.5
  );

  const multiplier = XP_DIFFICULTY_CONFIG[role]?.multiplierFactor || 1.0;
  return Math.round(baseCurve * multiplier);
};

/**
 * คำนวณ XP สะสมทั้งหมดจาก Level 1 จนถึง Level ที่กำหนด
 */
export const calculateCumulativeXpForLevel = (level: number, role: 'knight' | 'citizen' | 'merchant' = 'knight'): number => {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += calculateLevelMaxXp(l, role);
  }
  return total;
};

/**
 * คำนวณระดับดัชนีความยากและอัตราทดของแต่ละช่วงเลเวล
 */
export const getLevelDifficultyMetrics = (level: number) => {
  const safeLvl = Math.max(1, Math.min(100, Math.floor(level)));
  if (safeLvl <= 10) {
    return {
      tierName: 'ระดับเริ่มต้น (Initiate Phase)',
      difficultyLabel: 'เริ่มต้น (Easy)',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      difficultyIndex: '1.0x - 3.8x',
      growthRateText: 'คะแนนเต็มต่อเลเวล 150-580 XP • เก็บง่าย สะสมเร็ว เหมาะสำหรับสร้างพื้นฐาน',
      icon: '🌱'
    };
  }
  if (safeLvl <= 30) {
    return {
      tierName: 'ระดับก่อร่าง (Builder Phase)',
      difficultyLabel: 'ปานกลาง (Medium)',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      difficultyIndex: '4.0x - 9.5x',
      growthRateText: 'คะแนนเต็มต่อเลเวล 650-2,420 XP • สัดส่วนความยากเพิ่มขึ้นตามความชำนาญ',
      icon: '⚡'
    };
  }
  if (safeLvl <= 60) {
    return {
      tierName: 'ระดับเกียรติยศ (Veteran Phase)',
      difficultyLabel: 'เข้มข้น (Challenging)',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      difficultyIndex: '10.0x - 22.0x',
      growthRateText: 'คะแนนเต็มต่อเลเวล 2,540-6,600 XP • ต้องอาศัยภารกิจประจำวันและทริปคุณภาพสูง',
      icon: '🔥'
    };
  }
  if (safeLvl <= 85) {
    return {
      tierName: 'ระดับผู้พิชิตจักรวรรดิ (Conqueror Phase)',
      difficultyLabel: 'ระดับสูง (Expert)',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      difficultyIndex: '23.0x - 55.0x',
      growthRateText: 'คะแนนเต็มต่อเลเวล 6,780-11,200 XP • ท้าทายอัศวินผู้นำวิกและสมาชิกระดับพรีเมียม',
      icon: '⚔️'
    };
  }
  return {
    tierName: 'ระดับเทพเจ้าอธิปไตย (Godlike Sovereign Phase)',
    difficultyLabel: 'ไร้เทียมทาน (Godlike Mastery)',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
    difficultyIndex: '56.0x - 94.0x',
    growthRateText: 'คะแนนเต็มต่อเลเวล 11,500-14,100 XP • ระดับสูงสุดแห่งจักรวรรดิ กราฟ XP ไต่ระดับสมบูรณ์แบบ',
    icon: '👑'
  };
};

// 1. KNIGHT TIERS (10 LEVELS) - XP REDUCED BY 1000% TO STANDARD FAIR (x1.0)
export const KNIGHT_10_TIERS: TierRankDefinition[] = [
  {
    tierIndex: 0,
    levelRange: 'Level 1–10',
    minLevel: 1,
    maxLevel: 10,
    xpRequired: 0,
    title: 'อัศวินพื้นฐาน (Standard Knight)',
    titleEn: 'Basic Sovereign Knight',
    badge: '🛡️ เกราะมาตรฐาน',
    icon: '🛵',
    colorTheme: 'from-slate-800 to-slate-900',
    glowColor: 'rgba(0, 210, 255, 0.4)',
    accentBorder: 'border-slate-600',
    rarity: 'Common',
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Standard (ชุดเริ่มต้น) ผ้าคอร์ดูร่าระบายความร้อน เสริมแถบนีออนบลู The Guardian Zipper',
    keyPerks: [
      'เข้าถึงระบบแผนที่ CI Map ขั้นพื้นฐาน',
      'สิทธิผ่อนชำระอุปกรณ์แบบ 1+1+1+1 (วันละ 80฿)',
      'ประกันภัยอุบัติเหตุคุ้มครอง 100,000 บาท'
    ],
    exclusiveReward: 'ชุดเริ่มต้น Standard Suit V1 + หมวก ECE 22.06'
  },
  {
    tierIndex: 1,
    levelRange: 'Level 11–20',
    minLevel: 11,
    maxLevel: 20,
    xpRequired: 2500, // 2,500 * 1.0 (ลดลง 1000%)
    title: 'อัศวินทองแดง (Bronze Knight)',
    titleEn: 'Bronze Edition Sovereign Knight',
    badge: '🥉 บรอนซ์เกียรติยศ',
    icon: '🥉',
    colorTheme: 'from-amber-950/80 via-slate-900 to-amber-900/60',
    glowColor: 'rgba(205, 127, 50, 0.5)',
    accentBorder: 'border-amber-700/60',
    rarity: 'Common',
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Bronze Edition เสริมการ์ดป้องกันจุดสำคัญ D3O และตราสัญลักษณ์ทองแดงขัดเงา',
    keyPerks: [
      'ปลดล็อก Safe Pass โอนงานด่วนระหว่างสถานี',
      'รับส่วนลดเปลี่ยนถ่ายน้ำมันเครื่อง 10% ที่ WIN-Hub',
      'เข้าถึงระบบวิทยุกลุ่มอัศวิน WIN-Comm Zone'
    ],
    exclusiveReward: 'ชุด Bronze Biker Armor + Bronze Shield Helmet'
  },
  {
    tierIndex: 2,
    levelRange: 'Level 21–30',
    minLevel: 21,
    maxLevel: 30,
    xpRequired: 7500, // 7,500 * 1.0 (ลดลง 1000%)
    title: 'อัศวินเงิน (Silver Knight)',
    titleEn: 'Silver Edition Knight',
    badge: '🥈 ซิลเวอร์ไซเบอร์',
    icon: '🥈',
    colorTheme: 'from-slate-700 via-slate-900 to-slate-800',
    glowColor: 'rgba(224, 230, 237, 0.6)',
    accentBorder: 'border-slate-400',
    rarity: 'Tactical',
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Silver Edition เสริมเกราะคอมโพสิตและแผ่นสะท้อนแสงซิลเวอร์เมทัลลิก ป้องกันแรงเฉือน',
    keyPerks: [
      'ปลดล็อกงาน VIP Express & แดชแคมความปลอดภัยสูง',
      'รับส่วนลดอะไหล่และอุปกรณ์ 15% ที่ WIN-Hub',
      'เปิดร้านค้า C2C ในโปรไฟล์พร้อมตรารับรองเงิน'
    ],
    exclusiveReward: 'ชุด Silver Cyber Armor + Silver HUD Visor'
  },
  {
    tierIndex: 3,
    levelRange: 'Level 31–40',
    minLevel: 31,
    maxLevel: 40,
    xpRequired: 15000, // 15,000 * 1.0 (ลดลง 1000%)
    title: 'อัศวินทองคำ (Gold Knight)',
    titleEn: 'Gold Edition Knight',
    badge: '🥇 โกลด์อิดิชัน',
    icon: '🥇',
    colorTheme: 'from-amber-900/90 via-[#0F1E3D] to-yellow-950',
    glowColor: 'rgba(255, 215, 0, 0.6)',
    accentBorder: 'border-amber-400',
    rarity: 'Tactical',
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Gold Edition สลักด้ายทองคำ 3% และกระจกหมวก Gold Mirrored HUD ป้องกันแสงแดดสะท้อน',
    keyPerks: [
      'ปลดล็อกภารกิจ Safe Escort & รับส่งผู้ป่วย/ผู้สูงอายุ VIP',
      'วงเงินกู้ฉุกเฉินดอกเบี้ย 0% เพิ่มเป็น ฿25,000',
      'รับสิทธิ์จอดช่องพิเศษหน้าร้านค้าพันธมิตร'
    ],
    exclusiveReward: 'ชุด Gold Quilted Armor (3% Gold Thread) + Gold Carbon Helmet'
  },
  {
    tierIndex: 4,
    levelRange: 'Level 41–50',
    minLevel: 41,
    maxLevel: 50,
    xpRequired: 25000, // 25,000 * 1.0 (ลดลง 1000%)
    title: 'อัศวินแพลตินัม (Platinum Knight)',
    titleEn: 'Platinum Edition Knight',
    badge: '✨ แพลตินัมไซเบอร์',
    icon: '✨',
    colorTheme: 'from-cyan-950 via-slate-900 to-blue-950',
    glowColor: 'rgba(160, 232, 255, 0.7)',
    accentBorder: 'border-cyan-300',
    rarity: 'Imperial',
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Platinum Edition คาร์บอนไฟเบอร์น้ำหนักเบาพิเศษ พร้อมระบบตรวจวัดแรงกระแทกอัตโนมัติ',
    keyPerks: [
      'เข้าถึง Elite Lounge ชั้น 2 ใน WIN-Hub ฟรี',
      'วงเงินหมุนเวียนฉุกเฉิน ฿50,000 เครดิตเกรด AAA',
      'รับส่วนแบ่งพิเศษจากค่าธรรมเนียมสถานี 10%'
    ],
    exclusiveReward: 'ชุด Platinum Kinetic Armor + Platinum AR HUD Helmet'
  },
  {
    tierIndex: 5,
    levelRange: 'Level 51–60',
    minLevel: 51,
    maxLevel: 60,
    xpRequired: 40000, // 40,000 * 1.0 (ลดลง 1000%)
    title: 'อัศวินเพชร (Diamond Knight)',
    titleEn: 'Diamond Edition Knight',
    badge: '💎 ไดมอนด์การ์เดียน',
    icon: '💎',
    colorTheme: 'from-blue-900 via-indigo-950 to-slate-950',
    glowColor: 'rgba(103, 232, 249, 0.8)',
    accentBorder: 'border-blue-400',
    rarity: 'Imperial',
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Diamond Edition ผ้า Gore-Tex Pro ผสานโครงสร้างรังผึ้งเพชรซับแรงกระแทกระดับสูง',
    keyPerks: [
      'สิทธิเสนอเส้นทางลัดบรรจุลงใน Master CI Map ของเมือง',
      'ปลดล็อกงานขบวนเกียรติยศและคุ้มกัน VIP พิเศษ',
      'รับเงินปันผลรายไตรมาสจากกองทุนสวัสดิการอัศวิน'
    ],
    exclusiveReward: 'ชุด Diamond Mesh Guardian + Diamond Prism Helmet'
  },
  {
    tierIndex: 6,
    levelRange: 'Level 61–70',
    minLevel: 61,
    maxLevel: 70,
    xpRequired: 60000, // 60,000 * 1.0 (ลดลง 1000%)
    title: 'อัศวินผู้พิชิต (Conqueror Knight)',
    titleEn: 'Conqueror Edition Knight',
    badge: '⚔️ วินไรเดอร์ผู้พิชิต (4 แบบ)',
    icon: '⚔️',
    colorTheme: 'from-red-950 via-slate-950 to-orange-950',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    accentBorder: 'border-red-500',
    rarity: 'Imperial',
    description: 'ชุดเกราะ: รุ่น "อัศวินวินไรเดอร์ผู้พิชิต" มี 4 แบบพิเศษให้สะสมตามซีซัน/ภารกิจ (Spring, Monsoon Storm, Cyber Neon, Iron Blood)',
    keyPerks: [
      'สิทธิ์สะสมเกราะผู้พิชิตทั้ง 4 แบบเพื่อปลดล็อกขั้นจักรพรรดิ',
      'โบนัสค่ารอบทริปยาว +20%',
      'สัญลักษณ์ดาบคู่ผู้พิชิตเรืองแสงในโปรไฟล์'
    ],
    exclusiveReward: 'ชุดเกราะผู้พิชิต 4 ลายซีซัน + Conqueror Dual Visor'
  },
  {
    tierIndex: 7,
    levelRange: 'Level 71–80',
    minLevel: 71,
    maxLevel: 80,
    xpRequired: 85000, // 85,000 * 1.0 (ลดลง 1000%)
    title: 'อัศวินจักรพรรดิ (Emperor Knight)',
    titleEn: 'Emperor Sovereign Knight',
    badge: '👑 จักรพรรดิผู้นำวิก',
    icon: '👑',
    colorTheme: 'from-amber-950 via-purple-950 to-[#070D1E]',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    accentBorder: 'border-amber-300',
    rarity: 'Legendary',
    specialUnlockCondition: '✦ เงื่อนไขพิเศษ: ต้องสะสมชุด "ผู้พิชิต" ครบทั้ง 4 แบบก่อน ถึงจะเริ่มปลดล็อกได้!',
    description: 'ชุดเกราะ: รุ่น "จักรพรรดิ" (เกราะระดับสูงบ่งบอกความเป็นผู้นำวิก) เสื้อเกราะทองคำ 3% สลักตราพระราชทานราชสีห์ทองคำ 24K',
    keyPerks: [
      'ตำแหน่งประธานสภาอัศวินและผู้นำเขตสถานีวิน',
      'สิทธิ์ตั้งโต๊ะที่ปรึกษาวินประจำเขต (Vesting Council)',
      'ได้รับสิทธิ์โหวตนโยบายส่วนแบ่งรายได้แพลตฟอร์ม'
    ],
    exclusiveReward: 'ชุด Emperor Sovereign Supreme + Emperor Crown Helmet'
  },
  {
    tierIndex: 8,
    levelRange: 'Level 81–90',
    minLevel: 81,
    maxLevel: 90,
    xpRequired: 115000, // 115,000 * 1.0 (ลดลง 1000%)
    title: 'อัศวินตำนาน (Legendary Knight)',
    titleEn: 'Legendary Sovereign Knight',
    badge: '🌟 อัศวินผู้เป็นตำนาน (3 แบบแรร์)',
    icon: '🌟',
    colorTheme: 'from-purple-950 via-blue-950 to-amber-950',
    glowColor: 'rgba(168, 85, 247, 0.85)',
    accentBorder: 'border-cyan-300',
    rarity: 'Legendary',
    description: 'ชุดเกราะ: รุ่น "อัศวินผู้เป็นตำนาน" มี 3 แบบระดับอภิมหาแรร์ให้สะสม (Dual Plasma, Thunder God, Sovereign Ghost) ผสานคาร์บอนไฟเบอร์เกรดอากาศยาน',
    keyPerks: [
      'เลือกสลับใส่ชุดเกราะย้อนหลังได้ทุกสไตล์อย่างอิสระ 100%',
      'รายได้ส่วนแบ่งจากการเป็น Master Trainer สอนอัศวินรุ่นใหม่',
      'ป้ายทะเบียนทองคำและฉายา Master of Bangkok Streets'
    ],
    exclusiveReward: 'ชุด Living Legend 3-Ultra Rare + Retinal AR HUD'
  },
  {
    tierIndex: 9,
    levelRange: 'Level 91–100',
    minLevel: 91,
    maxLevel: 100,
    xpRequired: 150000, // 150,000 * 1.0 (ลดลง 1000%)
    title: 'อัศวินเทพเจ้า (Godlike Knight)',
    titleEn: 'Godlike Custom Sovereign',
    badge: '🌌 GODLIKE SOVEREIGN (1 เดียวในโลก)',
    icon: '🌌',
    colorTheme: 'from-amber-950 via-blue-950 to-cyan-950',
    glowColor: 'rgba(255, 215, 0, 0.95)',
    accentBorder: 'border-amber-300 shadow-[0_0_30px_rgba(255,215,0,0.5)]',
    rarity: 'Godlike',
    specialUnlockCondition: '✦ เอกสิทธิ์ขั้นสุดยอด: สามารถร่วมออกแบบเองได้ และมีเพียงตัวเดียวในโลก!',
    description: 'ชุดเกราะ: รุ่น "Godlike Custom Edition" ส่วนกลางสนับสนุนงบตัดชุด 100,000฿ สลักชื่อถาวรลงในทำเนียบจักรวาล',
    keyPerks: [
      'งบตัดชุดคัสตอม 100,000 บาท ออกแบบร่วมกับดีไซเนอร์ระดับโลก',
      'สลักชื่อและรหัสประจำตัวถาวรลงในทำเนียบ Hall of Galactic Sovereigns',
      'สิทธิ์จองที่นั่งยานอวกาศในโครงการ WINRIDER Cosmic Space Project'
    ],
    exclusiveReward: 'ชุด Godlike 1-of-1 Custom Edition + Cosmic Aura 360°'
  }
];

// 2. CITIZEN / PASSENGER TIERS (10 LEVELS) - XP REDUCED BY 1000% FROM +2000% TO +1000% (x11.0)
export const CITIZEN_10_TIERS: TierRankDefinition[] = [
  {
    tierIndex: 0,
    levelRange: 'Level 1–10',
    minLevel: 1,
    maxLevel: 10,
    xpRequired: 0,
    title: 'พลเมืองพื้นฐาน (Standard Citizen)',
    titleEn: 'Basic Sovereign Citizen',
    badge: '🦥 พลเมืองมาตรฐาน',
    icon: '🦥',
    colorTheme: 'from-slate-800 to-slate-900',
    glowColor: 'rgba(0, 210, 255, 0.4)',
    accentBorder: 'border-slate-600',
    rarity: 'Common',
    description: 'สถานะเริ่มต้นของพลเมืองผู้เดินทาง เข้าถึงบริการรับส่งด่วนทุกประเภทในระบบ WINRIDER.AI',
    keyPerks: [
      'เข้าถึงบริการเรียกวินอัศวิน WIN Knight และตรวจตราความปลอดภัยสด',
      'วงเงินฉุกเฉิน 2฿ คุ้มครองอุบัติเหตุทันที 100,000 บาท',
      'บัตรพลเมืองดิจิทัล Citizen Digital Pass V1'
    ],
    exclusiveReward: 'คูปองทริปแรกฟรี ฿45 + หมวกอนามัยพกพา'
  },
  {
    tierIndex: 1,
    levelRange: 'Level 11–20',
    minLevel: 11,
    maxLevel: 20,
    xpRequired: 27500, // 2,500 * 11.0 (+1000% - ลดลง 1000%)
    title: 'พลเมืองทองแดง (Bronze Citizen)',
    titleEn: 'Bronze Sovereign Citizen',
    badge: '🥉 บรอนซ์การ์เดียน',
    icon: '🥉',
    colorTheme: 'from-amber-950/80 via-slate-900 to-amber-900/60',
    glowColor: 'rgba(205, 127, 50, 0.5)',
    accentBorder: 'border-amber-700/60',
    rarity: 'Common',
    description: 'พลเมืองประจำย่านที่เดินทางสม่ำเสมอ เริ่มสะสมคะแนนเครดิตความน่าเชื่อถือทางการเงิน',
    keyPerks: [
      'สะสมคะแนนแลกส่วนลดค่าโดยสาร 5% ทุกทริป',
      'ปลดล็อกวงเงิน "นั่งก่อนจ่ายทีหลัง" (Ride Later 0%) ฿1,500',
      'สิทธิส่งด่วนสัมภาระและพัสดุขนาดเล็กราคาพิเศษ'
    ],
    exclusiveReward: 'ตราสัญลักษณ์ Bronze Citizen Crest ในแอป'
  },
  {
    tierIndex: 2,
    levelRange: 'Level 21–30',
    minLevel: 21,
    maxLevel: 30,
    xpRequired: 82500, // 7,500 * 11.0 (+1000% - ลดลง 1000%)
    title: 'พลเมืองเงิน (Silver Citizen)',
    titleEn: 'Silver Sovereign Citizen',
    badge: '🥈 ซิลเวอร์เมมเบอร์',
    icon: '🥈',
    colorTheme: 'from-slate-700 via-slate-900 to-slate-800',
    glowColor: 'rgba(224, 230, 237, 0.6)',
    accentBorder: 'border-slate-400',
    rarity: 'Tactical',
    description: 'พลเมืองระดับยุทธวิธีผู้เป็นทั้งผู้โดยสารและผู้ค้าในชุมชน สามารถเปิดร้านค้า C2C ในแอป',
    keyPerks: [
      'เปิดร้านค้า C2C (Slot Jitjai Marketplace) พร้อมตรารับรองเงิน',
      'วงเงินประกันภัยอุบัติเหตุเพิ่มเป็น ฿200,000',
      'สิทธิ์จับคู่อัศวินติดกล้องบันทึกเส้นทาง High-Safety Dashcam'
    ],
    exclusiveReward: 'หน้าร้านค้า C2C ในโปรไฟล์ + สิทธิ์ลงขายฟรี 10 รายการ'
  },
  {
    tierIndex: 3,
    levelRange: 'Level 31–40',
    minLevel: 31,
    maxLevel: 40,
    xpRequired: 165000, // 15,000 * 11.0 (+1000% - ลดลง 1000%)
    title: 'พลเมืองทองคำ (Gold Citizen)',
    titleEn: 'Gold Sovereign Citizen',
    badge: '🥇 โกลด์พรีเมียม',
    icon: '🥇',
    colorTheme: 'from-amber-900/90 via-[#0F1E3D] to-yellow-950',
    glowColor: 'rgba(255, 215, 0, 0.6)',
    accentBorder: 'border-amber-400',
    rarity: 'Tactical',
    description: 'พลเมืองชั้นพรีเมียม ได้รับความไว้วางใจสูงสุดและสิทธิ์เลือกสัมผัสประสบการณ์รถในฝัน Dream Ride',
    keyPerks: [
      'สิทธิ์จองคิวรถในฝัน Dream Ride (BigBike & Classic) ล่วงหน้า',
      'สิทธิ์เลือกอัศวินประจำตัวที่ถูกใจ (Preferred Knight Selection)',
      'ส่วนลด 10% ทุกการสั่งซื้อใน WIN SHOP และร้านค้าพันธมิตร'
    ],
    exclusiveReward: 'บัตร Gold Passenger VIP Card + หมวกพรีเมียม WIN Cap'
  },
  {
    tierIndex: 4,
    levelRange: 'Level 41–50',
    minLevel: 41,
    maxLevel: 50,
    xpRequired: 275000, // 25,000 * 11.0 (+1000% - ลดลง 1000%)
    title: 'พลเมืองแพลตินัม (Platinum Citizen)',
    titleEn: 'Platinum Sovereign Citizen',
    badge: '✨ แพลตินัมอีลิท',
    icon: '✨',
    colorTheme: 'from-cyan-950 via-slate-900 to-blue-950',
    glowColor: 'rgba(160, 232, 255, 0.7)',
    accentBorder: 'border-cyan-300',
    rarity: 'Imperial',
    description: 'พลเมืองกิตติมศักดิ์ผู้ใช้บริการอย่างต่อเนื่อง ได้รับการต้อนรับระดับ VIP ในทุกสถานี WIN-Hub',
    keyPerks: [
      'เข้าใช้บริการ Elite Lounge ชั้น 2 ใน WIN-Hub ฟรี พร้อมเครื่องดื่ม',
      'ส่วนลดค่าโดยสาร 15% ทุกทริปตลอดชีพ',
      'วงเงินผ่อนชำระยุทธภัณฑ์และสินค้า 0% สูงสุด ฿30,000'
    ],
    exclusiveReward: 'สิทธิพิเศษ Fast-Track Matching ไม่ต้องรอคิวชั่วโมงเร่งด่วน'
  },
  {
    tierIndex: 5,
    levelRange: 'Level 51–60',
    minLevel: 51,
    maxLevel: 60,
    xpRequired: 440000, // 40,000 * 11.0 (+1000% - ลดลง 1000%)
    title: 'พลเมืองเพชร (Diamond Citizen)',
    titleEn: 'Diamond Sovereign Citizen',
    badge: '💎 ไดมอนด์การ์เดียน',
    icon: '💎',
    colorTheme: 'from-blue-900 via-indigo-950 to-slate-950',
    glowColor: 'rgba(103, 232, 249, 0.8)',
    accentBorder: 'border-blue-400',
    rarity: 'Imperial',
    description: 'พลเมืองผู้มีความภักดีและเป็นเสาหลักของชุมชน ได้รับการคุ้มกันความปลอดภัยยามวิกาลระดับสูงสุด',
    keyPerks: [
      'Priority VIP Matching ทันทีใน 15 วินาที ด้วยระบบดาวเทียม',
      'บริการ Safe Escort คุ้มกันความปลอดภัยยามวิกาลพิเศษ',
      'วงเงินประกันภัยอุบัติเหตุครอบคลุมสูงสุด ฿500,000'
    ],
    exclusiveReward: 'กล่องของขวัญ Diamond Care Giftbox + สิทธิเชิญเพื่อนร่วมทริปฟรี'
  },
  {
    tierIndex: 6,
    levelRange: 'Level 61–70',
    minLevel: 61,
    maxLevel: 70,
    xpRequired: 660000, // 60,000 * 11.0 (+1000% - ลดลง 1000%)
    title: 'พลเมืองผู้พิชิต (Conqueror Citizen)',
    titleEn: 'Conqueror Sovereign Citizen',
    badge: '⚔️ นักเดินทางผู้พิชิต (4 ตรา)',
    icon: '⚔️',
    colorTheme: 'from-red-950 via-slate-950 to-orange-950',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    accentBorder: 'border-red-500',
    rarity: 'Imperial',
    description: 'นักเดินทางผู้เดินทางทะลุทั่วทุกตรอกซอยของพระนคร มี 4 ตราสัญลักษณ์ซีซันให้สะสม',
    keyPerks: [
      'ตราสัญลักษณ์ 4 ซีรีส์นักเดินทางผู้พิชิตในโปรไฟล์',
      'โค้ดเดินทางฟรีข้ามเขต 4 สิทธิ์/เดือน',
      'สิทธิ์สะสมตราครบ 4 แบบ เพื่อเลื่อนสู่ระดับจักรพรรดิ'
    ],
    exclusiveReward: 'เหรียญตราโลหะ 4 ซีซันส่งตรงถึงบ้าน + เสื้อแจ็กเก็ตผู้พิชิต'
  },
  {
    tierIndex: 7,
    levelRange: 'Level 71–80',
    minLevel: 71,
    maxLevel: 80,
    xpRequired: 935000, // 85,000 * 11.0 (+1000% - ลดลง 1000%)
    title: 'พลเมืองจักรพรรดิ (Emperor Citizen)',
    titleEn: 'Emperor Sovereign Citizen',
    badge: '👑 สภาพลเมืองอธิปไตย',
    icon: '👑',
    colorTheme: 'from-amber-950 via-purple-950 to-[#070D1E]',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    accentBorder: 'border-amber-300',
    rarity: 'Legendary',
    specialUnlockCondition: '✦ เงื่อนไขพิเศษ: ต้องสะสมตรา "นักเดินทางผู้พิชิต" ครบทั้ง 4 ซีซันก่อน!',
    description: 'สมาชิกสภาพลเมืองอธิปไตย (Citizen Council) มีสิทธิร่วมโหวตทิศทางการพัฒนาชุมชนและจุดตั้งวินใหม่',
    keyPerks: [
      'สมาชิกสภาพลเมืองอธิปไตย (Citizen Council Representative)',
      'มีสิทธิ์ร่วมโหวตนโยบายชุมชน จุดตั้งวินใหม่ และกองทุนสวัสดิการ',
      'คูปองเดินทางฟรีรายเดือน ฿2,000 + บริการรถนำขบวน VIP'
    ],
    exclusiveReward: 'แหวนทองคำสลักตรา Emperor Sovereign + บัตรสิทธิพิเศษตลอดชีพ'
  },
  {
    tierIndex: 8,
    levelRange: 'Level 81–90',
    minLevel: 81,
    maxLevel: 90,
    xpRequired: 1265000, // 115,000 * 11.0 (+1000% - ลดลง 1000%)
    title: 'พลเมืองตำนาน (Legendary Citizen)',
    titleEn: 'Legendary Sovereign Citizen',
    badge: '🌟 พลเมืองผู้เป็นตำนาน (3 ตราแรร์)',
    icon: '🌟',
    colorTheme: 'from-purple-950 via-blue-950 to-amber-950',
    glowColor: 'rgba(168, 85, 247, 0.85)',
    accentBorder: 'border-cyan-300',
    rarity: 'Legendary',
    description: 'พลเมืองระดับตำนานที่เคียงข้างระบบมาอย่างยาวนาน ได้รับเกียรติยศสูงสุดและสิทธิพิเศษระดับราชสำนัก',
    keyPerks: [
      'ป้ายชื่อโฮโลแกรมทองคำ Living Legend ในทุกระบบ',
      'สิทธิ์เชิญแขก VIP ร่วมเดินทางด้วยรถซูเปอร์ไบค์ฟรี 10 ทริป/ปี',
      'รับส่วนลด 30% ตลอดชีพในทุกร้านค้าพันธมิตรทั่วประเทศ'
    ],
    exclusiveReward: 'ป้ายชื่อทองคำในแอป + เชิญร่วมงานกาล่าอัศวินประจำปี'
  },
  {
    tierIndex: 9,
    levelRange: 'Level 91–100',
    minLevel: 91,
    maxLevel: 100,
    xpRequired: 1650000, // 150,000 * 11.0 (+1000% - ลดลง 1000%)
    title: 'พลเมืองเทพเจ้า (Godlike Sovereign Citizen)',
    titleEn: 'Godlike Supreme Citizen',
    badge: '🌌 GODLIKE SOVEREIGN (1 เดียวในโลก)',
    icon: '🌌',
    colorTheme: 'from-amber-950 via-blue-950 to-cyan-950',
    glowColor: 'rgba(255, 215, 0, 0.95)',
    accentBorder: 'border-amber-300 shadow-[0_0_30px_rgba(255,215,0,0.5)]',
    rarity: 'Godlike',
    specialUnlockCondition: '✦ เอกสิทธิ์ขั้นสูงสุด: สลักชื่อลงใน Hall of Galactic Sovereigns',
    description: 'ระดับสูงสุดแห่งอธิปไตยพลเมือง สิทธิ์เดินทางฟรีตลอดชีพ และได้รับความเคารพสูงสุดจากอัศวินทุกคน',
    keyPerks: [
      'เดินทางฟรีตลอดชีพ (Unlimited Lifetime Rides) ทุกประเภทยานพาหนะ',
      'ป้ายชื่อมงกุฎเรืองแสง 360° Cosmic Aura เรืองแสงสูงสุดในแอป',
      'สิทธิ์จองที่นั่งยานอวกาศในโครงการ WINRIDER Cosmic Space Project'
    ],
    exclusiveReward: 'สลักชื่อถาวรใน Hall of Galactic Sovereigns + ทริปฟรีไม่จำกัด'
  }
];

// 3. MERCHANT / STORE TIERS (10 LEVELS) - XP REDUCED BY 3000% FROM +5000% TO +2000% (x21.0)
export const MERCHANT_10_TIERS: TierRankDefinition[] = [
  {
    tierIndex: 0,
    levelRange: 'Level 1–10',
    minLevel: 1,
    maxLevel: 10,
    xpRequired: 0,
    title: 'ร้านค้าพื้นฐาน (Standard Merchant)',
    titleEn: 'Basic Partner Shop',
    badge: '🏪 ร้านค้ามาตรฐาน',
    icon: '🏪',
    colorTheme: 'from-slate-800 to-slate-900',
    glowColor: 'rgba(0, 210, 255, 0.4)',
    accentBorder: 'border-slate-600',
    rarity: 'Common',
    description: 'ร้านค้าพันธมิตรเริ่มต้น รับชำระเงินดิจิทัลและเชื่อมต่อการส่งสินค้าด่วนผ่านเครือข่ายอัศวิน',
    keyPerks: [
      'ปักหมุดร้านบนแผนที่ CI Map ในรัศมี 500 เมตร',
      'ระบบรับออเดอร์และเรียกอัศวินมารับพัสดุหน้าร้าน',
      'ระบบสแกน QR Payment และรายงานยอดขายรายวัน'
    ],
    exclusiveReward: 'ป้าย QR Code ตั้งหน้าร้าน + อัตราค่าส่งเริ่มต้นพิเศษ'
  },
  {
    tierIndex: 1,
    levelRange: 'Level 11–20',
    minLevel: 11,
    maxLevel: 20,
    xpRequired: 52500, // 2,500 * 21.0 (+2000% - ลดลง 3000%)
    title: 'ร้านค้าทองแดง (Bronze Merchant)',
    titleEn: 'Bronze Verified Shop',
    badge: '🥉 บรอนซ์พาร์ทเนอร์',
    icon: '🥉',
    colorTheme: 'from-amber-950/80 via-slate-900 to-amber-900/60',
    glowColor: 'rgba(205, 127, 50, 0.5)',
    accentBorder: 'border-amber-700/60',
    rarity: 'Common',
    description: 'ร้านค้าที่มีประวัติการจัดส่งสม่ำเสมอ เริ่มปลดล็อกสินเชื่อหมุนเวียนคู่ค้า B2B',
    keyPerks: [
      'ป้ายร้านค้าทองแดง Bronze Verified เพิ่มความน่าเชื่อถือ',
      'ขยายรัศมีการมองเห็นบนแผนที่เป็น 1.5 กิโลเมตร',
      'สินเชื่อหมุนเวียนคู่ค้า ฿50,000 ดอกเบี้ย 0% ระยะเวลา 15 วัน'
    ],
    exclusiveReward: 'ตราสัญลักษณ์ Bronze Merchant Badge หน้าร้าน'
  },
  {
    tierIndex: 2,
    levelRange: 'Level 21–30',
    minLevel: 21,
    maxLevel: 30,
    xpRequired: 157500, // 7,500 * 21.0 (+2000% - ลดลง 3000%)
    title: 'ร้านค้าเงิน (Silver Merchant)',
    titleEn: 'Silver Trust Merchant',
    badge: '🥈 ซิลเวอร์ทรัสต์',
    icon: '🥈',
    colorTheme: 'from-slate-700 via-slate-900 to-slate-800',
    glowColor: 'rgba(224, 230, 237, 0.6)',
    accentBorder: 'border-slate-400',
    rarity: 'Tactical',
    description: 'ร้านค้ายอดนิยมประจำย่าน ได้รับสิทธิ์จัดโปรโมชัน Flash Sale และขยายวงเงินสินเชื่อ',
    keyPerks: [
      'ตรารับรอง Silver Merchant Trust แสดงเด่นชัดในแอป',
      'สิทธิ์จัดโปรโมชัน Flash Sale สัปดาห์ละ 2 ครั้ง',
      'วงเงินทุนหมุนเวียน ฿150,000 ดอกเบี้ย 0% ระยะเวลา 30 วัน'
    ],
    exclusiveReward: 'เครื่องพิมพ์ใบเสร็จบลูทูธ WIN-POS + โควตาโปรโมตฟรี'
  },
  {
    tierIndex: 3,
    levelRange: 'Level 31–40',
    minLevel: 31,
    maxLevel: 40,
    xpRequired: 315000, // 15,000 * 21.0 (+2000% - ลดลง 3000%)
    title: 'ร้านค้าทองคำ (Gold Merchant)',
    titleEn: 'Gold Premier Merchant',
    badge: '🥇 โกลด์พาร์ทเนอร์',
    icon: '🥇',
    colorTheme: 'from-amber-900/90 via-[#0F1E3D] to-yellow-950',
    glowColor: 'rgba(255, 215, 0, 0.6)',
    accentBorder: 'border-amber-400',
    rarity: 'Tactical',
    description: 'ร้านค้าระดับพรีเมียม ได้รับการแนะนำบนหน้าแรกของแอปผู้โดยสารและฟังก์ชัน AI ช่วยขาย',
    keyPerks: [
      'แนะนำบนหน้าแรก Featured Merchant Carousel ในแอปผู้โดยสาร',
      'ฟังก์ชัน AI Dynamic Pricing & Smart Promotion Assistant',
      'วงเงินทุนหมุนเวียน ฿300,000 ดอกเบี้ย 0% อนุมัติทันที'
    ],
    exclusiveReward: 'ป้ายไฟนีออนหน้าร้าน WIN Gold Partner + กล้อง CCTV AI'
  },
  {
    tierIndex: 4,
    levelRange: 'Level 41–50',
    minLevel: 41,
    maxLevel: 50,
    xpRequired: 525000, // 25,000 * 21.0 (+2000% - ลดลง 3000%)
    title: 'ร้านค้าแพลตินัม (Platinum Merchant)',
    titleEn: 'Platinum Sovereign Merchant',
    badge: '✨ แพลตินัมมาสเตอร์',
    icon: '✨',
    colorTheme: 'from-cyan-950 via-slate-900 to-blue-950',
    glowColor: 'rgba(160, 232, 255, 0.7)',
    accentBorder: 'border-cyan-300',
    rarity: 'Imperial',
    description: 'ร้านค้าชั้นนำประจำเขต มีอัศวิน Standby หน้าร้านรับของด่วนพิเศษใน 3 นาที',
    keyPerks: [
      'ติดอันดับ 1 ในหมวดหมู่ประจำเขต (Top Recommended in District)',
      'อัศวิน Standby หน้าร้านรับของด่วนภายใน 3 นาที (Bulk Dispatch)',
      'วงเงินทุนหมุนเวียน ฿500,000 ดอกเบี้ย 0% เกรด AAA'
    ],
    exclusiveReward: 'แท็บเล็ตสั่งการร้านค้า Merchant Command Screen 10 นิ้ว'
  },
  {
    tierIndex: 5,
    levelRange: 'Level 51–60',
    minLevel: 51,
    maxLevel: 60,
    xpRequired: 840000, // 40,000 * 21.0 (+2000% - ลดลง 3000%)
    title: 'ร้านค้าเพชร (Diamond Merchant)',
    titleEn: 'Diamond Sovereign Merchant',
    badge: '💎 ไดมอนด์พาณิชย์',
    icon: '💎',
    colorTheme: 'from-blue-900 via-indigo-950 to-slate-950',
    glowColor: 'rgba(103, 232, 249, 0.8)',
    accentBorder: 'border-blue-400',
    rarity: 'Imperial',
    description: 'ร้านค้าเรือธง (Flagship Partner) ได้รับสิทธิ์เปิด Pop-up ใน WIN-Hub และค่าคอมมิชชั่น 0%',
    keyPerks: [
      'ได้รับสิทธิ์จัดทำ Exclusive Pop-up Store ในสถานี WIN-Hub',
      'ค่าคอมมิชชั่นขนส่ง 0% ทุกออเดอร์ตลอดชีพ',
      'วงเงินทุนหมุนเวียน ฿1,000,000 ดอกเบี้ย 0% ระยะเวลา 60 วัน'
    ],
    exclusiveReward: 'คีออสก์แสดงสินค้าอัตโนมัติใน WIN-Hub Station'
  },
  {
    tierIndex: 6,
    levelRange: 'Level 61–70',
    minLevel: 61,
    maxLevel: 70,
    xpRequired: 1260000, // 60,000 * 21.0 (+2000% - ลดลง 3000%)
    title: 'ร้านค้าผู้พิชิต (Conqueror Merchant)',
    titleEn: 'Conqueror Enterprise Merchant',
    badge: '⚔️ พาณิชย์ผู้พิชิต (4 ตรา)',
    icon: '⚔️',
    colorTheme: 'from-red-950 via-slate-950 to-orange-950',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    accentBorder: 'border-red-500',
    rarity: 'Imperial',
    description: 'ร้านค้าผู้มีสาขาและยอดขายระดับเมือง มี 4 ตราสัญลักษณ์ร่วมเทศกาลใหญ่ 4 ฤดูกาล',
    keyPerks: [
      'ตราร้านค้าผู้พิชิต 4 ซีรีส์ตามเทศกาลเมือง (Spring, Storm, Neon, Blood)',
      'สิทธิ์ร่วมแคมเปญ City-wide Festival โปรโมตทั่วทั้งกรุงเทพฯ',
      'วงเงินทุนหมุนเวียน ฿2,000,000 ดอกเบี้ย 0%'
    ],
    exclusiveReward: 'ชุดอุปกรณ์บรรจุภัณฑ์รักษ์โลก 10,000 ชิ้น + สื่อโฆษณา'
  },
  {
    tierIndex: 7,
    levelRange: 'Level 71–80',
    minLevel: 71,
    maxLevel: 80,
    xpRequired: 1785000, // 85,000 * 21.0 (+2000% - ลดลง 3000%)
    title: 'ร้านค้าจักรพรรดิ (Emperor Merchant)',
    titleEn: 'Emperor Commercial Giant',
    badge: '👑 สภาพาณิชย์จักรพรรดิ',
    icon: '👑',
    colorTheme: 'from-amber-950 via-purple-950 to-[#070D1E]',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    accentBorder: 'border-amber-300',
    rarity: 'Legendary',
    specialUnlockCondition: '✦ เงื่อนไขพิเศษ: ต้องสะสมตรา "พาณิชย์ผู้พิชิต" ครบทั้ง 4 ซีซันก่อน!',
    description: 'ที่นั่งในสภาพาณิชย์ WIN-Commerce Council มีสิทธิ์คัดเลือกสินค้าเข้าสู่ WIN SHOP ระดับประเทศ',
    keyPerks: [
      'ที่นั่งในสภาพาณิชย์ WIN-Commerce Council ร่วมกำหนดนโยบายค้าปลีก',
      'สิทธิ์คัดเลือกสินค้าของร้านเข้าสู่ WIN SHOP คลังส่วนกลางทั่วประเทศ',
      'วงเงินทุนขยายสาขา ฿3,500,000 ดอกเบี้ย 0%'
    ],
    exclusiveReward: 'สิทธิประโยชน์ภาษีชุมชน + ตราพระราชทานพาณิชย์ทองคำ'
  },
  {
    tierIndex: 8,
    levelRange: 'Level 81–90',
    minLevel: 81,
    maxLevel: 90,
    xpRequired: 2415000, // 115,000 * 21.0 (+2000% - ลดลง 3000%)
    title: 'ร้านค้าตำนาน (Legendary Merchant)',
    titleEn: 'Legendary Heritage Shop',
    badge: '🌟 มรดกพระนครในตำนาน',
    icon: '🌟',
    colorTheme: 'from-purple-950 via-blue-950 to-amber-950',
    glowColor: 'rgba(168, 85, 247, 0.85)',
    accentBorder: 'border-cyan-300',
    rarity: 'Legendary',
    description: 'ร้านค้าระดับตำนานที่เป็นสัญลักษณ์ทางวัฒนธรรมและเศรษฐกิจของเมืองหลวง (Heritage of Bangkok)',
    keyPerks: [
      'ป้ายร้านค้าในตำนานระดับ Heritage of Bangkok ได้รับการโปรโมตระดับสากล',
      'ฟีเจอร์ Live Showcase ฉายบนจอยักษ์ของสถานี WIN-Hub ทุกสาขา',
      'วงเงินสินเชื่อขยายธุรกิจ ฿5,000,000 ดอกเบี้ย 0%'
    ],
    exclusiveReward: 'สารคดีประวัติร้านค้าฉายบนสื่อของเมือง + โล่ทองคำตำนาน'
  },
  {
    tierIndex: 9,
    levelRange: 'Level 91–100',
    minLevel: 91,
    maxLevel: 100,
    xpRequired: 3150000, // 150,000 * 21.0 (+2000% - ลดลง 3000%)
    title: 'ร้านค้าเทพเจ้า (Godlike Sovereign Merchant)',
    titleEn: 'Godlike Supreme Commercial Hub',
    badge: '🌌 GODLIKE COMMERCE (1 เดียวในโลก)',
    icon: '🌌',
    colorTheme: 'from-amber-950 via-blue-950 to-cyan-950',
    glowColor: 'rgba(255, 215, 0, 0.95)',
    accentBorder: 'border-amber-300 shadow-[0_0_30px_rgba(255,215,0,0.5)]',
    rarity: 'Godlike',
    specialUnlockCondition: '✦ เอกสิทธิ์ขั้นสูงสุด: สลักชื่อร้านค้าใน Hall of Galactic Sovereigns',
    description: 'ศูนย์กลางพาณิชยกรรมระดับจักรวาล กระจายสินค้าผ่านโครงข่ายอธิปไตยสู่ทุกสถานีทั่วประเทศ',
    keyPerks: [
      'สถานะ Supreme Sovereign Commercial Hub เชื่อมต่ออัตโนมัติ 100%',
      'กระจายสินค้าไปยังทุกสาขา WIN-Hub และเครือข่ายโลจิสติกส์ทั่วราชอาณาจักร',
      'รับส่วนแบ่งปันผลรายปีจากกองทุนความมั่งคั่งเมือง (City Wealth Fund)'
    ],
    exclusiveReward: 'อนุสาวรีย์จำลองร้านค้าใน Hall of Galactic Sovereigns + วงเงินลงทุนไม่จำกัด'
  }
];

// Helper Functions
export const getTierIndexForLevel = (lvl: number): number => {
  if (lvl >= 91) return 9;
  if (lvl >= 81) return 8;
  if (lvl >= 71) return 7;
  if (lvl >= 61) return 6;
  if (lvl >= 51) return 5;
  if (lvl >= 41) return 4;
  if (lvl >= 31) return 3;
  if (lvl >= 21) return 2;
  if (lvl >= 11) return 1;
  return 0;
};

export const getKnightTier = (lvl: number): TierRankDefinition => {
  const idx = getTierIndexForLevel(lvl);
  return KNIGHT_10_TIERS[idx];
};

export const getCitizenTier = (lvl: number): TierRankDefinition => {
  const idx = getTierIndexForLevel(lvl);
  return CITIZEN_10_TIERS[idx];
};

export const getMerchantTier = (lvl: number): TierRankDefinition => {
  const idx = getTierIndexForLevel(lvl);
  return MERCHANT_10_TIERS[idx];
};
