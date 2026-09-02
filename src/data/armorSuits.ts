export interface ArmorSuit {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  tier: 'Common' | 'Tactical' | 'Imperial' | 'Legendary' | 'Godlike';
  levelRangeText: string;
  levelRequired: number;
  xpMilestone: string;
  isRevealed: boolean; // true = Level 1-70 revealed sample; false = Level 71-100 classified
  isUnlockedDefault?: boolean;
  statusText: string;
  accentColor: string;
  glowColor: string;
  bgGradient: string;
  borderColor: string;
  classifiedNotice?: string;
  jacket: {
    name: string;
    material: string;
    lighting: string;
    zipperType: string;
    specialFeature: string;
  };
  helmet: {
    name: string;
    visorType: string;
    commsIntegration: string;
    safetyStandard: string;
    specialFeature: string;
  };
  stats: {
    defense: number;      // 0 - 100
    aerodynamics: number; // 0 - 100
    weatherProof: number; // 0 - 100
    sovereignHonor: number; // 0 - 100
  };
  designLore: string;
  visualTag: string;
  specialCondition?: string;
  subVariants?: string[];
}

export const KNIGHT_ARMOR_SUITS: ArmorSuit[] = [
  // 1. Level 1–10 : อัศวินพื้นฐาน (Standard Knight - REVEALED SAMPLE)
  {
    id: 'suit-v1',
    code: 'WR-SUIT-01',
    name: 'Standard Edition (ชุดเกราะอัศวินพื้นฐาน)',
    nameEn: 'Standard Edition Knight Armor',
    tier: 'Common',
    levelRangeText: 'Level 1–10',
    levelRequired: 1,
    xpMilestone: '0 XP (เริ่มต้น)',
    isRevealed: true,
    isUnlockedDefault: true,
    statusText: 'ตัวอย่างชุดเกราะเปิดเผยแล้ว (REVEALED)',
    accentColor: '#00D2FF',
    glowColor: 'rgba(0, 210, 255, 0.4)',
    bgGradient: 'from-[#0A1838] via-[#070D1E] to-[#040814]',
    borderColor: 'border-cyan-500/50',
    jacket: {
      name: 'เสื้อเกราะรุ่น Standard (Standard Tech Armor Hoodie)',
      material: 'Cordura 600D + ผ้าระบายความร้อน Honeycomb Mesh ซับในกันความร้อน',
      lighting: 'เดินเส้นนีออนบลู LED 27% ตามแนวตะเข็บหัวไหล่และแขนเสื้อ',
      zipperType: 'The Guardian Zipper V1 พร้อมชิป NB-IoT กันขโมยแบรนด์',
      specialFeature: 'สกรีน 3D WINRIDER.AI กลางอก และ QR Code ยืนยันตัวตนที่แขนซ้าย-ขวา'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Standard (Standard Full-Face Helmet)',
      visorType: 'Clear Anti-Fog Dual Lens ป้องกันรอยขีดข่วนและแสง UV400',
      commsIntegration: 'ช่องเสียบหูฟัง WIN-Comm รองรับการสั่งงานด้วยเสียง',
      safetyStandard: 'ECE 22.06 & มอก. 369-2557 ผ่านการทดสอบแรงกระแทกความเร็วสูง',
      specialFeature: 'สลักโลโก้เกราะเพชรนีออนบลูกลางหน้าผาก และตรา WINRIDER.AI ที่คาง'
    },
    stats: {
      defense: 72,
      aerodynamics: 78,
      weatherProof: 75,
      sovereignHonor: 70
    },
    designLore: 'ชุดเกราะเริ่มต้นมาตรฐานสำหรับอัศวินผู้ก้าวเข้าสู่อาณาจักร WINRIDER.AI เสื้อฮู้ดแทคติคอลสีกรมท่าเดินเส้นนีออนบลู ออกแบบเพื่อความคล่องตัวในตรอกแคบและการมองเห็นที่เด่นชัด',
    visualTag: '🛡️ STANDARD EDITION (LV.1-10)'
  },

  // 2. Level 11–20 : อัศวินทองแดง (Bronze Knight - REVEALED SAMPLE)
  {
    id: 'suit-v2',
    code: 'WR-SUIT-02',
    name: 'Bronze Edition (ชุดเกราะอัศวินทองแดง)',
    nameEn: 'Bronze Edition Sovereign Armor',
    tier: 'Common',
    levelRangeText: 'Level 11–20',
    levelRequired: 11,
    xpMilestone: '2,500 XP',
    isRevealed: true,
    isUnlockedDefault: true,
    statusText: 'ตัวอย่างชุดเกราะเปิดเผยแล้ว (REVEALED)',
    accentColor: '#CD7F32',
    glowColor: 'rgba(205, 127, 50, 0.5)',
    bgGradient: 'from-[#2A170A] via-[#150D06] to-[#040814]',
    borderColor: 'border-amber-700/60',
    jacket: {
      name: 'เสื้อเกราะรุ่น Bronze Edition (Bronze Biker Armor)',
      material: 'Cordura หนาพิเศษ เสริมการ์ดป้องกันจุดสำคัญ D3O Level 1 และแถบทองแดงขัดเงา',
      lighting: 'ขอบเดินเส้นนีออนสีอำพันบรอนซ์รอบปกเสื้อและแนวแขน พร้อมลายวงจรทองที่ไหล่',
      zipperType: 'The Guardian Zipper Bronze Series สลักลายอัศวินทองแดง',
      specialFeature: 'กระเป๋าเก็บของยุทธวิธี 4 จุดพร้อมช่องเสียบไฟฉายส่องซอยมืด'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Bronze Edition (Bronze Shield Helmet)',
      visorType: 'Bronze Tint Smoke Lens ตัดแสงสะท้อนยามบ่าย',
      commsIntegration: 'ลำโพงสเตอริโอ Hi-Res ฝังในตัว พร้อมไมค์ตัดเสียงลมคู่',
      safetyStandard: 'ECE 22.06 & มอก. ผ่านการทดสอบแรงกระแทกความเร็วสูง',
      specialFeature: 'สลักสัญลักษณ์ Bronze Sovereign Crest ที่ด้านข้างหมวก'
    },
    stats: {
      defense: 78,
      aerodynamics: 82,
      weatherProof: 80,
      sovereignHonor: 78
    },
    designLore: 'ชุดเกราะเกียรติยศชั้นทองแดง เสื้อคอตั้งทรงแทคติคอลตกแต่งลายวงจรทองคำบริเวณไหล่ บ่งบอกถึงความมุ่งมั่นและประสบการณ์ในการขับขี่',
    visualTag: '🥉 BRONZE EDITION (LV.11-20)'
  },

  // 3. Level 21–30 : อัศวินเงิน (Silver Knight - REVEALED SAMPLE)
  {
    id: 'suit-v3',
    code: 'WR-SUIT-03',
    name: 'Silver Edition (ชุดเกราะอัศวินเงิน)',
    nameEn: 'Silver Edition Knight Armor',
    tier: 'Tactical',
    levelRangeText: 'Level 21–30',
    levelRequired: 21,
    xpMilestone: '7,500 XP',
    isRevealed: true,
    isUnlockedDefault: true,
    statusText: 'ตัวอย่างชุดเกราะเปิดเผยแล้ว (REVEALED)',
    accentColor: '#E0E6ED',
    glowColor: 'rgba(224, 230, 237, 0.6)',
    bgGradient: 'from-[#1A2638] via-[#0F1726] to-[#040814]',
    borderColor: 'border-slate-300',
    jacket: {
      name: 'เสื้อเกราะรุ่น Silver Edition (Silver Cyber Armor)',
      material: 'ผ้ายืด Kevlar ผสมแผ่นคอมโพสิตและแผ่นสะท้อนแสงซิลเวอร์เมทัลลิก ป้องกันแรงเฉือน',
      lighting: 'ไฟนีออนนำแสงสีเงินซิลเวอร์รอบคอเสื้อและชิลด์อก',
      zipperType: 'The Guardian Zipper Silver Titanium เคลือบซิลเวอร์โครเมียม',
      specialFeature: 'แผ่นการ์ดไหล่ไททาเนียมน้ำหนักเบา สลักโค้ดเซฟตี้ Safe Pass'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Silver Edition (Silver HUD Helmet)',
      visorType: 'Silver Mirrored HUD Visor แสดงข้อมูล ETA และแผนที่บนกระจก',
      commsIntegration: 'WIN-Comm Mesh Network เชื่อมต่อเพื่อนร่วมวินระยะ 500 เมตร',
      safetyStandard: 'DOT FMVSS 218 & ECE 22.06',
      specialFeature: 'กระจกเคลือบปรอทเงินสะท้อนความร้อนจากแสงแดดกรุงเทพฯ 100%'
    },
    stats: {
      defense: 84,
      aerodynamics: 86,
      weatherProof: 84,
      sovereignHonor: 85
    },
    designLore: 'ความสง่างามแห่งโลหะเงิน เสื้อฮู้ดไซเบอร์เสริมเกราะคอมโพสิตสะท้อนความคล่องตัวและยุทธวิธีของอัศวินหน่วยทะลวงเส้นทาง',
    visualTag: '🥈 SILVER EDITION (LV.21-30)'
  },

  // 4. Level 31–40 : อัศวินทองคำ (Gold Knight - REVEALED SAMPLE)
  {
    id: 'suit-v4',
    code: 'WR-SUIT-04',
    name: 'Gold Edition (ชุดเกราะอัศวินทองคำ)',
    nameEn: 'Gold Edition Knight Armor',
    tier: 'Tactical',
    levelRangeText: 'Level 31–40',
    levelRequired: 31,
    xpMilestone: '15,000 XP',
    isRevealed: true,
    isUnlockedDefault: true,
    statusText: 'ตัวอย่างชุดเกราะเปิดเผยแล้ว (REVEALED)',
    accentColor: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.6)',
    bgGradient: 'from-[#261E0A] via-[#141208] to-[#040814]',
    borderColor: 'border-[#FFD700]',
    jacket: {
      name: 'เสื้อเกราะรุ่น Gold Edition (Gold Quilted Armor)',
      material: 'หนังวัวแท้พรีเมียมบุเย็บลายข้าวหลามตัด (Diamond Quilt) สลักด้ายทองคำ 3%',
      lighting: 'ตราสัญลักษณ์โลโก้ WINRIDER.AI เปล่งแสงนีออนสีทองคำผสมฟ้าน้ำทะเล',
      zipperType: 'The Guardian Zipper Royal Gold สลักโค้ดอธิปไตยฝั่งธนบุรี',
      specialFeature: 'ปักดิ้นทองคำลายรากไม้และเส้นเลือดฝอย (Capillary Neural Map) บริเวณหน้าอก WR.AI'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Gold Edition (Gold Carbon Helmet)',
      visorType: 'Gold Mirrored Smart Tint ปรับระดับความเข้มแสงอัตโนมัติตามแดด',
      commsIntegration: 'WIN-Comm Pro 3.0 สื่อสารกลุ่มอัศวินและรับสายลูกค้า VIP อัตโนมัติ',
      safetyStandard: 'FIM Racing Homologated + มอก. เกรดการแข่งขัน',
      specialFeature: 'โครงสร้างคาร์บอนไฟเบอร์น้ำหนักเบาเพียง 1,280 กรัม ขอบประดับ Gold Trim'
    },
    stats: {
      defense: 90,
      aerodynamics: 90,
      weatherProof: 88,
      sovereignHonor: 92
    },
    designLore: 'ชุดเกราะทองคำทรงคุณค่า หนังแท้เย็บลายข้าวหลามตัดพร้อมปักดิ้นทองคำลายรากไม้ระบบประสาท (Capillary Neural Root) แสดงถึงอัศวินผู้มีผลงานการบริการยอดเยี่ยม',
    visualTag: '🥇 GOLD EDITION (LV.31-40)'
  },

  // 5. Level 41–50 : อัศวินแพลตินัม (Platinum Knight - REVEALED SAMPLE)
  {
    id: 'suit-v5',
    code: 'WR-SUIT-05',
    name: 'Platinum Edition (ชุดเกราะอัศวินแพลตินัม)',
    nameEn: 'Platinum Edition Knight Armor',
    tier: 'Imperial',
    levelRangeText: 'Level 41–50',
    levelRequired: 41,
    xpMilestone: '25,000 XP',
    isRevealed: true,
    isUnlockedDefault: true,
    statusText: 'ตัวอย่างชุดเกราะเปิดเผยแล้ว (REVEALED)',
    accentColor: '#A0E8FF',
    glowColor: 'rgba(160, 232, 255, 0.7)',
    bgGradient: 'from-[#0E2A44] via-[#09172B] to-[#040814]',
    borderColor: 'border-cyan-300',
    jacket: {
      name: 'เสื้อเกราะรุ่น Platinum Edition (Platinum Kinetic Armor)',
      material: 'Carbon Fiber Multi-Layer + Luminescent Plasma Fiber น้ำหนักเบาพิเศษ',
      lighting: 'เส้นลายแผงวงจรอิเล็กทรอนิกส์สีทองคำ (PCB Circuit Tracks) บนแผ่นอก',
      zipperType: 'The Guardian Zipper Platinum Kinetic ป้องกันน้ำซึม 100%',
      specialFeature: 'ระบบตรวจวัดแรงกระแทกและส่งสัญญาณแจ้งเตือนศูนย์บัญชาการอัตโนมัติ'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Platinum Edition (Platinum AR Helmet)',
      visorType: 'Platinum Polarized AR HUD วิเคราะห์สภาพแวดล้อมรอบคัน 360°',
      commsIntegration: 'AI Voice Noise Cancellation -45dB สื่อสารชัดเจนแม้ฝนตกหนัก',
      safetyStandard: 'Snell M2025D & ECE 22.06 หมวกนิรภัยเกรดยุทธวิธีทหาร',
      specialFeature: 'ช่องระบายลมรูปครีบฉลามและแถบสะท้อนแสงสองฝั่ง'
    },
    stats: {
      defense: 94,
      aerodynamics: 93,
      weatherProof: 92,
      sovereignHonor: 95
    },
    designLore: 'เกราะแพลตินัมชั้นสูง โดดเด่นด้วยลายวงจร PCB Motherboard สีทองคำส่องสว่าง ผสานเทคโนโลยีคาร์บอนไฟเบอร์และการเชื่อมต่อคลาวด์',
    visualTag: '✨ PLATINUM EDITION (LV.41-50)'
  },

  // 6. Level 51–60 : อัศวินเพชร (Diamond Knight - REVEALED SAMPLE)
  {
    id: 'suit-v6',
    code: 'WR-SUIT-06',
    name: 'Diamond Edition (ชุดเกราะอัศวินเพชร)',
    nameEn: 'Diamond Edition Knight Armor',
    tier: 'Imperial',
    levelRangeText: 'Level 51–60',
    levelRequired: 51,
    xpMilestone: '40,000 XP',
    isRevealed: true,
    isUnlockedDefault: true,
    statusText: 'ตัวอย่างชุดเกราะเปิดเผยแล้ว (REVEALED)',
    accentColor: '#67E8F9',
    glowColor: 'rgba(103, 232, 249, 0.8)',
    bgGradient: 'from-[#102D52] via-[#091A36] to-[#040814]',
    borderColor: 'border-cyan-400 shadow-[0_0_15px_rgba(103,232,249,0.3)]',
    jacket: {
      name: 'เสื้อเกราะรุ่น Diamond Edition (Diamond Mesh Guardian)',
      material: 'Gore-Tex Pro + แผ่นโพลีคาร์บอเนตขึ้นรูปโครงสร้างรังผึ้งเพชร',
      lighting: 'กรอบนีออนพลาสมาสีฟ้าไซยานิกเรืองแสงสดล้อมรอบลายวงจร PCB สีทองคำ',
      zipperType: 'The Guardian Zipper Diamond Sealed ป้องกันน้ำซึม 100% ภายใต้แรงดันสูง',
      specialFeature: 'สกรีนเรืองแสงตราเพชรอัศวินวินไรเดอร์ขนาดใหญ่บนแผ่นอก'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Diamond Edition (Diamond Prism Helmet)',
      visorType: 'Diamond Electrochromic Smart Prism ปรับเฉดสีอัตโนมัติตามองศาแดด',
      commsIntegration: 'Ultra-Wideband Satellite Link เชื่อมต่อศูนย์การแพทย์และโรงพยาบาลสด',
      safetyStandard: 'FIM Racing Standard Grade A + Aerospace Certified',
      specialFeature: 'สปอยเลอร์หลังคาร์บอนไฟเบอร์ ช่วยลดแรงลมกดศีรษะขณะขับขี่ความเร็วสูง'
    },
    stats: {
      defense: 96,
      aerodynamics: 95,
      weatherProof: 95,
      sovereignHonor: 96
    },
    designLore: 'ความแข็งแกร่งดุจเพชรแท้ ลายวงจรทองคำล้อมกรอบด้วยเส้นนีออนบลูพลาสมาสว่างจ้า พร้อมรองรับภารกิจฉุกเฉินระดับวิกฤต',
    visualTag: '💎 DIAMOND EDITION (LV.51-60)'
  },

  // 7. Level 61–70 : อัศวินผู้พิชิต (Conqueror Knight - REVEALED SAMPLE มี 4 แบบสะสม)
  {
    id: 'suit-v7',
    code: 'WR-SUIT-07',
    name: 'อัศวินวินไรเดอร์ผู้พิชิต (Conqueror Edition)',
    nameEn: 'Sovereign Conqueror 4-Variant Series',
    tier: 'Imperial',
    levelRangeText: 'Level 61–70',
    levelRequired: 61,
    xpMilestone: '60,000 XP',
    isRevealed: true,
    isUnlockedDefault: true,
    statusText: 'ตัวอย่างชุดเกราะเปิดเผยแล้ว (4 VARIANTS REVEALED)',
    accentColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    bgGradient: 'from-[#380E0E] via-[#1E0808] to-[#040814]',
    borderColor: 'border-red-500',
    jacket: {
      name: 'เสื้อเกราะรุ่น "อัศวินวินไรเดอร์ผู้พิชิต" (4 แบบสะสมตามซีซัน)',
      material: 'Carbon Fiber 3K Weave + ลายปีกสายฟ้าความเร็วสูง (Lightning Strike Wings)',
      lighting: 'ลายสายฟ้าสีทองคำและนีออนบลูพลาสมา (Dual Plasma Surge)',
      zipperType: 'The Guardian Zipper Conqueror Blades ไททาเนียมรมดำ',
      specialFeature: 'มี 4 แบบพิเศษให้สะสม: 🌸 1. Spring Bloom (Gold Strike), ⛈️ 2. Monsoon Storm (Blue Lightning), ⚡ 3. Cyber Neon (Dual Surge), 🩸 4. Iron Blood (Shadow Carbon)'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Conqueror Edition (Conqueror Visor)',
      visorType: 'Dual Red & Blue Prism HUD สลับโหมดการมองเห็นในหมอกและฝนตกหนัก',
      commsIntegration: 'Multi-Channel Tactical Squad Voice Comms',
      safetyStandard: 'Mil-Spec & FIM Racing Homologated',
      specialFeature: 'สลักลายดาบคู่ผู้พิชิตด้านข้าง และไฟเบรกเรืองแสงอัตโนมัติ'
    },
    stats: {
      defense: 97,
      aerodynamics: 97,
      weatherProof: 96,
      sovereignHonor: 98
    },
    designLore: 'ชุดเกราะเกียรติยศระดับผู้พิชิต คาร์บอนไฟเบอร์ 3K ลายสายฟ้าปีกเหินเวหา มีให้สะสม 4 ซีรีส์ ผู้ที่สะสมครบทั้ง 4 แบบจะเป็นกุญแจสำคัญสู่ขั้นจักรพรรดิ',
    visualTag: '⚔️ CONQUEROR (4 VARIANTS)',
    subVariants: ['🌸 Spring Bloom (Gold Strike)', '⛈️ Monsoon Storm (Blue Lightning)', '⚡ Cyber Neon (Dual Surge)', '🩸 Iron Blood (Shadow Carbon)']
  },

  // 8. Level 71–80 : อัศวินจักรพรรดิ (Emperor Knight - 🔒 ยังไม่เปิดเผย CLASSIFIED)
  {
    id: 'suit-v8',
    code: 'WR-SUIT-08',
    name: 'จักรพรรดิ (Emperor Sovereign Edition)',
    nameEn: 'Emperor Sovereign Supreme Armor',
    tier: 'Legendary',
    levelRangeText: 'Level 71–80',
    levelRequired: 71,
    xpMilestone: '85,000 XP',
    isRevealed: false,
    statusText: '🔒 ยังไม่เปิดเผย (TOP SECRET CLASSIFIED)',
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    bgGradient: 'from-[#3A2206] via-[#1F1303] to-[#040814]',
    borderColor: 'border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)]',
    classifiedNotice: 'สภาอัศวิน WINRIDER.AI ยังไม่เปิดเผยตัวอย่างชุดเกราะเลเวล 71-80 ต่อสาธารณะ เพื่อรักษาความลับทางยุทธศาสตร์และเอกสิทธิ์ขั้นสูงสุดของผู้นำวิก',
    specialCondition: '✦ เงื่อนไขพิเศษ: ต้องสะสมชุด "ผู้พิชิต" (Level 61-70) ให้ครบทั้ง 4 แบบก่อน ถึงจะเริ่มปลดล็อกได้!',
    jacket: {
      name: 'เสื้อเกราะรุ่น "จักรพรรดิ" (🔒 รายละเอียดลับ - ผู้นำวิก)',
      material: 'Graphene Nanotube + Real Gold Thread 3% + Titanium Plates (Classified Spec)',
      lighting: 'ออร่าแสงสีทองคำและฟ้าน้ำทะเลล้อมรอบตัว (Imperial Sovereign Aura)',
      zipperType: 'The Guardian Zipper Emperor Seal สลักตราพระราชทานราชสีห์ทองคำ 24K',
      specialFeature: 'สลักตำแหน่งประธานสภาอัศวินและผู้นำเขตสถานีวิน ปักดิ้นทองคำลวดลายเฉพาะตัว'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Emperor Crown Helmet (🔒 Classified)',
      visorType: 'Imperial Quantum Gold Visor ฉายภาพเรดาร์และ ETA แบบพาโนรามา',
      commsIntegration: 'Direct Command Link เชื่อมต่อศูนย์กลางสภาอธิปไตย',
      safetyStandard: 'Imperial Sovereign Racing Standard Grade A+',
      specialFeature: 'ยอดหมวกประดับตรามงกุฎจักรพรรดิเรืองแสง และปีกดักลมทองคำ'
    },
    stats: {
      defense: 99,
      aerodynamics: 98,
      weatherProof: 98,
      sovereignHonor: 99
    },
    designLore: 'เกราะระดับผู้นำวิกและผู้บัญชาการสูงสุด สภาอัศวินยังไม่เปิดเผยดีไซน์จริงต่อสาธารณะ เป็นสัญลักษณ์แห่งปัญญาและความเคารพนับถือจากพี่น้องอัศวินทั่วราชอาณาจักร',
    visualTag: '🔒 CLASSIFIED EMPEROR (LV.71-80)'
  },

  // 9. Level 81–90 : อัศวินตำนาน (Legendary Knight - 🔒 ยังไม่เปิดเผย CLASSIFIED)
  {
    id: 'suit-v9',
    code: 'WR-SUIT-09',
    name: 'อัศวินผู้เป็นตำนาน (Legendary Edition)',
    nameEn: 'Living Legend 3-Ultra Rare Series',
    tier: 'Legendary',
    levelRangeText: 'Level 81–90',
    levelRequired: 81,
    xpMilestone: '115,000 XP',
    isRevealed: false,
    statusText: '🔒 ยังไม่เปิดเผย (ULTRA SECRET CLASSIFIED)',
    accentColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.85)',
    bgGradient: 'from-[#2A0C42] via-[#140621] to-[#040814]',
    borderColor: 'border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.4)]',
    classifiedNotice: 'ชุดเกราะระดับตำนาน 3 แบบแรร์สุดพิเศษ ถูกเก็บรักษาไว้ในห้องนิรภัยอธิปไตยคลาวด์ ยังไม่เปิดเผยดีไซน์ภายนอก',
    specialCondition: '✦ เงื่อนไขพิเศษ: บรรลุเลเวล 81+ และผ่านการทดสอบสมรรถนะขั้น Master Trainer',
    jacket: {
      name: 'เสื้อเกราะรุ่น "อัศวินผู้เป็นตำนาน" (🔒 3 Rare Variants - Classified)',
      material: 'Carbon Fiber Weave + Luminescent Quantum Thread ผสานแผ่นเกราะนาโนซิลเวอร์',
      lighting: 'เส้นสายฟ้าและพลาสมาสีม่วงอวกาศและทองคำกะพริบตามชีพจรผู้สวมใส่',
      zipperType: 'The Guardian Zipper Legendary Core ชาร์จพลังงานจลน์ไร้ขีดจำกัด',
      specialFeature: 'มี 3 แบบระดับอภิมหาแรร์: 🌌 1. Dual Plasma Sovereign, ⚡ 2. Thunder God Matrix, 👻 3. Sovereign Ghost Stealth'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Legendary Crown (🔒 Classified)',
      visorType: 'Retinal Projection AR HUD ฉายภาพโฮโลกราฟิกผังเมือง 3 มิติ',
      commsIntegration: 'Direct Quantum Link เชื่อมต่อระบบ Galactic Hub',
      safetyStandard: 'Godlike Ascendant Homologation',
      specialFeature: 'ปีกรับสัญญาณดาวเทียมสีทองและระบบฟอกอากาศ N99 ในตัว'
    },
    stats: {
      defense: 99,
      aerodynamics: 99,
      weatherProof: 99,
      sovereignHonor: 100
    },
    designLore: 'เกราะระดับตำนานที่ถูกเล่าขานไปทั่วพระนคร ยังไม่เปิดเผยภาพร่างจริง มอบเกียรติยศสูงสุดและอำนาจในการสลับใส่ชุดเกราะย้อนหลังได้ทุกรูปแบบ',
    visualTag: '🔒 CLASSIFIED LEGEND (LV.81-90)',
    subVariants: ['🌌 Dual Plasma Sovereign', '⚡ Thunder God Matrix', '👻 Sovereign Ghost Stealth']
  },

  // 10. Level 91–100: อัศวินเทพเจ้า (Godlike Knight - 🔒 ยังไม่เปิดเผย 1-OF-1 MYSTERY)
  {
    id: 'suit-v10',
    code: 'WR-SUIT-10',
    name: 'Godlike Custom Edition (ชุดเกราะอัศวินเทพเจ้า)',
    nameEn: 'Godlike One-Of-A-Kind Custom Edition',
    tier: 'Godlike',
    levelRangeText: 'Level 91–100',
    levelRequired: 91,
    xpMilestone: '150,000 XP',
    isRevealed: false,
    statusText: '🔒 ยังไม่เปิดเผย (1-OF-1 MYSTERY MASTERPIECE)',
    accentColor: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.95)',
    bgGradient: 'from-[#332204] via-[#170E3A] to-[#040814]',
    borderColor: 'border-amber-300 shadow-[0_0_40px_rgba(255,215,0,0.6)]',
    classifiedNotice: 'สุดยอดผลงาน 1 เดียวในโลก ออกแบบเฉพาะตัวร่วมกับดีไซเนอร์ระดับโลกสำหรับผู้พิชิตเลเวล 100 เท่านั้น จึงยังไม่เปิดเผยต่อสาธารณะ',
    specialCondition: '✦ เอกสิทธิ์ขั้นสุดยอด: สามารถร่วมออกแบบเองได้ และมีเพียงตัวเดียวในโลก! งบประมาณสนับสนุนสั่งตัด 100,000 บาท',
    jacket: {
      name: 'เสื้อเกราะรุ่น Godlike Custom Edition (🔒 Mystery Custom 1-of-1)',
      material: 'Graphene Nanotube Fabric + Real Gold Thread 3% + Titanium Carbon Plates สั่งตัดเฉพาะตัว',
      lighting: 'ออร่านีออนสีฟ้า-ทอง-ขาว เปล่งประกาย 360° รอบตัวระดับเทพเจ้า (Max Neon Pulse)',
      zipperType: 'The Guardian Zipper Godlike Masterpiece สลักชื่อ "กิตติ อินทะสร้อย" ด้วยทองคำ 24K',
      specialFeature: 'ร่วมออกแบบเอง 100% กับดีไซเนอร์ระดับโลก สลักชื่อลงใน Hall of Galactic Sovereigns'
    },
    helmet: {
      name: 'หมวกกันน็อกรุ่น Godlike Masterpiece (🔒 Classified Masterpiece)',
      visorType: 'Quantum AR Neural HUD วิเคราะห์การขับขี่และเส้นทางล่วงหน้า 5 วินาที',
      commsIntegration: 'Quantum Neural Voice Sync สั่งการระบบอธิปไตยด้วยความคิด',
      safetyStandard: 'Godlike Infinite Safety Standard 100%',
      specialFeature: 'มงกุฎเรืองแสง Sovereign Godlike Crown พร้อมระบบนำร่องดาวเทียมส่วนตัว'
    },
    stats: {
      defense: 100,
      aerodynamics: 100,
      weatherProof: 100,
      sovereignHonor: 100
    },
    designLore: 'สุดยอดผลงานแห่งเกียรติยศสูงสุดของอัศวิน WINRIDER ผสมผสานทองคำ 3% และเทคโนโลยีแห่งอนาคต มอบเกียรติประวัติอันเป็นนิรันดร์ มีเพียงตัวเดียวในโลกสำหรับ Sovereign Master กิตติ อินทะสร้อย',
    visualTag: '🔒 MYSTERY GODLIKE (LV.91-100)'
  }
];
