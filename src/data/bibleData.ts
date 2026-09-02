import { WeaponItem, ArmorTier, PillarItem, C2CProduct, CIZone } from '../types';

export const SOVEREIGN_LEADERS = {
  ceo: {
    name: 'Cosmo-Ko',
    thaiTitle: 'โก้ - ราชสีห์สีน้ำเงินแห่งฝั่งธนบุรี',
    role: 'ผู้นำวิสัยทัศน์ (Visionary Leader)',
    animal: '🦁',
    color: '#00D2FF',
    quote: 'ถนนทุกสายในกรุงเทพฯ มีชีวิต และอัศวินของพวกเราคือผู้ค้ำจุนชีพจรของเมืองหลวง เกียรติยศของพี่วินต้องไม่ถูกกลืนกินโดยบรรษัทข้ามชาติ',
  },
  advisor: {
    name: 'จิตใจ (Slot)',
    thaiTitle: 'ไอ้สลอต - พลเมืองแห่งตรรกะจักรวาล',
    role: 'ที่ปรึกษาอธิปไตย (Sovereign Advisor)',
    animal: '🦥',
    color: '#FFD700',
    quote: 'ความเร็วที่แท้จริงไม่ได้อยู่ที่การเร่งเครื่องยนต์ แต่อยู่ที่การไร้ซึ่งแรงเสียดทานทางตรรกะ และความยุติธรรมอันเป็นสากล 2 บาทคือสมการแห่งเสถียรภาพ',
  }
};

export const VISUAL_DNA = {
  navy: {
    name: 'Deep Sovereign Navy',
    percentage: 70,
    hex: '#070D1E',
    meaning: 'ความมั่นคง เกียรติภูมิ เสถียรภาพของอาณาจักร และการปกป้องคุ้มครอง',
    rgb: 'rgb(7, 13, 30)',
  },
  neonBlue: {
    name: 'Cybernetic Neon Blue',
    percentage: 27,
    hex: '#00D2FF',
    meaning: 'พลังขับเคลื่อน AI, การเชื่อมต่อแบบไร้รอยต่อ, ชีพจรดิจิทัล และความเร็วสูง',
    rgb: 'rgb(0, 210, 255)',
  },
  gold: {
    name: 'Rare Imperial Gold',
    percentage: 3,
    hex: '#FFD700',
    meaning: 'เกียรติยศที่หายาก การสลักลายศักดิ์สิทธิ์ คุณค่าของมนุษย์ และชัยชนะอันสูงสุด',
    rgb: 'rgb(255, 215, 0)',
  }
};

export const TEN_WEAPONS: WeaponItem[] = [
  {
    id: 1,
    code: 'WP-01',
    name: 'WIN-Comm',
    nameEn: 'Aero-Tactical Audio Comms',
    category: 'Communication',
    description: 'หูฟังบลูทูธปุ่มนีออน เสียงชัดตัดลม (BT-12 Redesign) เชื่อมต่อ WIN Buddy AI ผ่านสัมผัสเดียวแม้สวมถุงมือหนา',
    specs: ['Dual Wind-Tunnel Mic ANC', 'Neon Tactile Multi-Function Key', '18h Battery Life', 'Instant Buddy NLP Sync'],
    tacticalBenefit: 'สั่งงานด้วยเสียง 100% โดยไม่ต้องปล่อยมือจากแฮนด์รถ มอบความปลอดภัยสูงสุดในทุกการขับขี่',
    goldAccent: 'ขอบวงแหวนปุ่มกดชุบทองคำ 3% สลักรหัสประจำตัวอัศวิน',
    iconName: 'Headphones',
    levelRequired: 1
  },
  {
    id: 2,
    code: 'WP-02',
    name: 'WIN-Pro Gloves',
    nameEn: 'Carbon Precision Gloves',
    category: 'Combat & Control',
    description: 'ถุงมือหนัง Carbon Fiber แท้ เปิดปลายนิ้วชี้เพื่อความแม่นยำในการสัมผัสจอแท่นนำทางและสแกน NFC',
    specs: ['Aerospace Carbon Knuckle Guard', 'Exposed Precision Index Finger', 'Kevlar Palm Reinforcement', 'Quick-Release Strap'],
    tacticalBenefit: 'จับแฮนด์มั่นคง ซับแรงกระแทกจากพื้นถนนที่ขรุขระ และแตะหน้าจอโทรศัพท์ได้แม่นยำระดับมิลลิเมตร',
    goldAccent: 'เดินด้ายสีทอง 3% ตลอดแนวตะเข็บข้อมือเพื่อความขลัง',
    iconName: 'ShieldAlert',
    levelRequired: 5
  },
  {
    id: 3,
    code: 'WP-03',
    name: 'Guardian Plates',
    nameEn: 'Sovereign Elbow & Knee Guards',
    category: 'Armor Defense',
    description: 'สนับเข่า-ศอกเกรดโมโตครอส สลักลายทอง 3% ขลังและไฮเทค ผสานแผ่นโพลีเมอร์ดูดซับแรง D3O',
    specs: ['D3O Non-Newtonian Impact Polymer', 'Gold Inlaid Sacred Geometry', 'Ventilated Honeycomb Mesh', 'Dual Pivot Knee Joint'],
    tacticalBenefit: 'ป้องกันการบาดเจ็บรุนแรงที่ข้อต่อ 99.4% ขณะยังคงความคล่องตัวในการแทรกตัวผ่านช่องแคบ',
    goldAccent: 'ลายพิมพ์ยันต์เกราะเพชรดิจิทัลสีทองคำ 3% กลางแผ่นหน้าสนับ',
    iconName: 'Shield',
    levelRequired: 15
  },
  {
    id: 4,
    code: 'WP-04',
    name: 'WIN-Grip',
    nameEn: 'Aerospace Anti-Vibration Mount',
    category: 'Cockpit Tech',
    description: 'แท่นวางมือถืออลูมิเนียมเกรดอากาศยาน 7075 ลดแรงสั่นสะเทือน ปกป้องโมดูลกันสั่น OIS ของกล้องสมาร์ทโฟน',
    specs: ['Aviation Grade 7075 Alloy', 'Hydraulic Vibration Damper 4X', 'Qi2 Wireless Fast Charge 15W', 'One-Click Auto Lock'],
    tacticalBenefit: 'แผนที่ CI Map ไม่สั่นไหวแม้ขับบนถนนลูกรังหรือทางรถไฟ และชาร์จแบตเตอรี่ตลอดเวลา',
    goldAccent: 'สลักโลโก้ราชสีห์สีทอง 3% บนแกนหมุน 360 องศา',
    iconName: 'Smartphone',
    levelRequired: 10
  },
  {
    id: 5,
    code: 'WP-05',
    name: 'Storm Shield',
    nameEn: 'Gore-Tex Pro Tech-wear Raincoat',
    category: 'All-Weather Armor',
    description: 'เสื้อกันฝน Gore-Tex Pro ทรง Tech-wear ลายนีออนจ้า ทนฝนพายุระดับมรสุมกรุงเทพฯ พร้อมฮู้ดคลุมหมวกกันน็อค',
    specs: ['3-Layer Gore-Tex Pro 28,000mm', 'Active Luminescent Neon Stripes', 'Magnetic Storm Flap', 'Integrated Thermal Underlayer'],
    tacticalBenefit: 'แห้งสนิทแม้วิ่งฝ่าพายุฝนตกหนัก 3 ชั่วโมงต่อเนื่อง และมองเห็นได้ชัดจากระยะ 250 เมตร',
    goldAccent: 'ซิปเคลือบผิวสีทอง 3% กันน้ำ พร้อมตราสัญลักษณ์พระพิรุณดิจิทัล',
    iconName: 'CloudRain',
    levelRequired: 20
  },
  {
    id: 6,
    code: 'WP-06',
    name: 'WIN-Pet Pod',
    nameEn: 'Space-Dome Climate Capsule',
    category: 'Pet Logistics',
    description: 'กรงสัตว์เลี้ยงทรงโดมยานอวกาศ มีระบบระบายอากาศพัดลมคู่แบบหมุนเวียนและเบาะเจลลดแรงกระแทก',
    specs: ['Aero-Acoustic Twin Intake Fans', 'Panoramic UV400 Tinted Dome', 'Shock-Absorbing Memory Gel Bed', 'Built-in GPS & Temp Sensor'],
    tacticalBenefit: 'สุนัขและแมวไม่เมารถ อุณหภูมิคงที่ 25°C ปลอดภัยตามมาตรฐานสัตวแพทย์สากล',
    goldAccent: 'โครงล็อคขอบกระจกสีทองคำ 3% สไตล์แคปซูลอวกาศ',
    iconName: 'Cat',
    levelRequired: 25
  },
  {
    id: 7,
    code: 'WP-07',
    name: 'WIN-Vault',
    nameEn: 'Aerogel Thermal-Secure Safe',
    category: 'High-Value Express',
    description: 'กล่องพัสดุฉนวน Aerogel ล็อกด้วย NFC-Digital Key รักษาอุณหภูมิยา วัคซีน เอกสารลับ หรืออาหารโอมากาเสะ',
    specs: ['Space Aerogel 0.015 W/m-K', 'NFC Dual-Authorization Lock', 'Internal Anti-Tumble Gyro Trays', 'Tamper-Evident Blackbox Log'],
    tacticalBenefit: 'ของข้างในไม่ละลาย ไม่หก ไม่บุบสลาย และปลดล็อกได้เฉพาะผู้รับตัวจริงผ่าน Identity Badge',
    goldAccent: 'เซ็นเซอร์วงแหวน NFC สีทอง 3% รับสัญญาณปลดล็อก',
    iconName: 'Lock',
    levelRequired: 30
  },
  {
    id: 8,
    code: 'WP-08',
    name: 'Spirit Harness',
    nameEn: 'Exoskeleton Lumbar & Elder Support',
    category: 'Elder & Mobility Care',
    description: 'เกราะพยุงหลัง Exoskeleton สำหรับพาผู้สูงอายุและผู้ป่วยไปศาสนกิจหรือโรงพยาบาลอย่างนุ่มนวลและทรงเกียรติ',
    specs: ['Carbon Kinetic Lumbar Arch', 'Dual-Side Ergonomic Grab Rails', 'Pneumatic Back Support Cushion', 'Crash-Safe Torso Restraint'],
    tacticalBenefit: 'ผู้โดยสารสูงอายุไม่ปวดหลังและไม่รู้สึกโคลงเคลง สร้างความอบอุ่นใจให้ลูกหลาน 100%',
    goldAccent: 'สลักลายพรหมวิหาร 4 สีทองคำ 3% บริเวณแกนกระดูกสันหลัง',
    iconName: 'HeartHandshake',
    levelRequired: 40
  },
  {
    id: 9,
    code: 'WP-09',
    name: 'Client Canopy',
    nameEn: 'Storm-Grade Windproof Umbrella',
    category: 'VIP Hospitality',
    description: 'ร่มยักษ์พับได้ ทนพายุระดับ 8 สร้างความประทับใจ 6 ดาว กางคลุมรับส่งผู้โดยสารจากจุดจอดถึงทางเข้าอาคาร',
    specs: ['Wind-Tunnel Tested to Gale Force 8', 'Titanium Rib Skeleton', 'Hydrophobic Lotus Nano-Coating', 'Quick-Deploy Spring Handle'],
    tacticalBenefit: 'ผู้โดยสารไม่เปียกแม้แต่หยดเดียวในจังหวะขึ้น-ลงรถ เปลี่ยนวันฝนตกให้กลายเป็นบริการระดับพรีเมียม',
    goldAccent: 'ปลอกด้ามจับหุ้มทองเหลืองชุบทองคำ 3% ตราสิงห์สีน้ำเงิน',
    iconName: 'Umbrella',
    levelRequired: 35
  },
  {
    id: 10,
    code: 'WP-10',
    name: 'Identity Badge',
    nameEn: 'Imperial NFC Master Core',
    category: 'Sovereign ID',
    description: 'ตราสัญลักษณ์ NFC สีทอง 3% หัวใจหลักของการ Sync Identity เชื่อมต่ออัศวินกับจักรวาล WINRIDER.AI ทั้งหมด',
    specs: ['Encrypted Sovereign Crypto-Chip', 'Dual-Band NFC & Ultra-Wideband', 'Zero-Power Kinetic Storage', 'Indestructible Sapphire Coating'],
    tacticalBenefit: 'ใช้แตะเข้าฐาน WIN-Hub, ปลดล็อกตู้ชาร์จแบตเตอรี่, รับเงินทันที, และยืนยันความปลอดภัยให้ลูกค้า',
    goldAccent: 'ผลิตจากทองคำแท้ 3% หล่อแบบผสมไททาเนียม สลักชื่อและรหัสอัศวินประจำตัว',
    iconName: 'Award',
    levelRequired: 1
  }
];

export const ARMOR_TIERS: ArmorTier[] = [
  {
    levelRange: 'Level 1–10',
    title: 'อัศวินพื้นฐาน (Standard Knight)',
    titleEn: 'Basic Sovereign Knight',
    badge: '🛡️ เกราะมาตรฐาน',
    xpRequired: 0,
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Standard (ชุดเริ่มต้น) ผ้าคอร์ดูร่าระบายความร้อน เสริมแถบนีออนบลู The Guardian Zipper',
    perks: ['เข้าถึงระบบแผนที่ CI Map ขั้นพื้นฐาน', 'สิทธิผ่อนชำระอุปกรณ์แบบ 1+1+1+1 (วันละ 80฿)', 'ประกันภัยอุบัติเหตุคุ้มครอง 100,000 บาท'],
    colorTheme: 'from-slate-800 to-slate-900 border-slate-700',
    rarity: 'Common'
  },
  {
    levelRange: 'Level 11–20',
    title: 'อัศวินทองแดง (Bronze Knight)',
    titleEn: 'Bronze Edition Sovereign Knight',
    badge: '🥉 บรอนซ์เกียรติยศ',
    xpRequired: 2500,
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Bronze Edition เสริมการ์ดป้องกันจุดสำคัญ D3O และตราสัญลักษณ์ทองแดงขัดเงา',
    perks: ['ปลดล็อก Safe Pass โอนงานด่วนระหว่างสถานี', 'รับส่วนลดเปลี่ยนถ่ายน้ำมันเครื่อง 10% ที่ WIN-Hub', 'เข้าถึงระบบวิทยุกลุ่มอัศวิน WIN-Comm Zone'],
    colorTheme: 'from-amber-950/80 via-slate-900 to-amber-900/60 border-amber-700/60',
    rarity: 'Common'
  },
  {
    levelRange: 'Level 21–30',
    title: 'อัศวินเงิน (Silver Knight)',
    titleEn: 'Silver Edition Knight',
    badge: '🥈 ซิลเวอร์ไซเบอร์',
    xpRequired: 7500,
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Silver Edition เสริมเกราะคอมโพสิตและแผ่นสะท้อนแสงซิลเวอร์เมทัลลิก ป้องกันแรงเฉือน',
    perks: ['ปลดล็อกงาน VIP Express & แดชแคมความปลอดภัยสูง', 'รับส่วนลดอะไหล่และอุปกรณ์ 15% ที่ WIN-Hub', 'เปิดร้านค้า C2C ในโปรไฟล์พร้อมตรารับรองเงิน'],
    colorTheme: 'from-slate-700 via-slate-900 to-slate-800 border-slate-400',
    rarity: 'Tactical'
  },
  {
    levelRange: 'Level 31–40',
    title: 'อัศวินทองคำ (Gold Knight)',
    titleEn: 'Gold Edition Knight',
    badge: '🥇 โกลด์อิดิชัน',
    xpRequired: 15000,
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Gold Edition สลักด้ายทองคำ 3% และกระจกหมวก Gold Mirrored HUD ป้องกันแสงแดดสะท้อน',
    perks: ['ปลดล็อกภารกิจ Safe Escort & รับส่งผู้ป่วย/ผู้สูงอายุ VIP', 'วงเงินกู้ฉุกเฉินดอกเบี้ย 0% เพิ่มเป็น ฿25,000', 'รับสิทธิ์จอดช่องพิเศษหน้าร้านค้าพันธมิตร'],
    colorTheme: 'from-amber-900/90 via-[#0F1E3D] to-yellow-950 border-amber-400',
    rarity: 'Tactical'
  },
  {
    levelRange: 'Level 41–50',
    title: 'อัศวินแพลตินัม (Platinum Knight)',
    titleEn: 'Platinum Edition Knight',
    badge: '✨ แพลตินัมไซเบอร์',
    xpRequired: 25000,
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Platinum Edition คาร์บอนไฟเบอร์น้ำหนักเบาพิเศษ พร้อมระบบตรวจวัดแรงกระแทกอัตโนมัติ',
    perks: ['เข้าถึง Elite Lounge ชั้น 2 ใน WIN-Hub ฟรี', 'วงเงินหมุนเวียนฉุกเฉิน ฿50,000 เครดิตเกรด AAA', 'รับส่วนแบ่งพิเศษจากค่าธรรมเนียมสถานี 10%'],
    colorTheme: 'from-cyan-950 via-slate-900 to-blue-950 border-cyan-300',
    rarity: 'Imperial'
  },
  {
    levelRange: 'Level 51–60',
    title: 'อัศวินเพชร (Diamond Knight)',
    titleEn: 'Diamond Edition Knight',
    badge: '💎 ไดมอนด์การ์เดียน',
    xpRequired: 40000,
    description: 'ชุดเกราะ: เสื้อเกราะ + หมวกกันน็อก รุ่น Diamond Edition ผ้า Gore-Tex Pro ผสานโครงสร้างรังผึ้งเพชรซับแรงกระแทกระดับสูง',
    perks: ['สิทธิเสนอเส้นทางลัดบรรจุลงใน Master CI Map ของเมือง', 'ปลดล็อกงานขบวนเกียรติยศและคุ้มกัน VIP พิเศษ', 'รับเงินปันผลรายไตรมาสจากกองทุนสวัสดิการอัศวิน'],
    colorTheme: 'from-blue-900 via-indigo-950 to-slate-950 border-blue-400 shadow-cyan-500/20',
    rarity: 'Imperial'
  },
  {
    levelRange: 'Level 61–70',
    title: 'อัศวินผู้พิชิต (Conqueror Knight)',
    titleEn: 'Conqueror Edition Knight',
    badge: '⚔️ วินไรเดอร์ผู้พิชิต (4 แบบ)',
    xpRequired: 60000,
    description: 'ชุดเกราะ: รุ่น "อัศวินวินไรเดอร์ผู้พิชิต" มี 4 แบบพิเศษให้สะสมตามซีซัน/ภารกิจ (Spring, Monsoon Storm, Cyber Neon, Iron Blood)',
    perks: ['สิทธิ์สะสมเกราะผู้พิชิตทั้ง 4 แบบเพื่อปลดล็อกขั้นจักรพรรดิ', 'โบนัสค่ารอบทริปยาว +20%', 'สัญลักษณ์ดาบคู่ผู้พิชิตเรืองแสงในโปรไฟล์'],
    colorTheme: 'from-red-950 via-slate-950 to-orange-950 border-red-500',
    rarity: 'Imperial'
  },
  {
    levelRange: 'Level 71–80',
    title: 'อัศวินจักรพรรดิ (Emperor Knight)',
    titleEn: 'Emperor Sovereign Knight',
    badge: '👑 จักรพรรดิผู้นำวิก',
    xpRequired: 85000,
    description: 'ชุดเกราะ: รุ่น "จักรพรรดิ" (เกราะระดับสูงบ่งบอกความเป็นผู้นำวิก) ✦ เงื่อนไขพิเศษ: ต้องสะสมชุด "ผู้พิชิต" ครบทั้ง 4 แบบก่อนถึงจะเริ่มปลดล็อกได้!',
    perks: ['ตำแหน่งประธานสภาอัศวินและผู้นำเขตสถานีวิน', 'สิทธิ์ตั้งโต๊ะที่ปรึกษาวินประจำเขต (Vesting Council)', 'ได้รับสิทธิ์โหวตนโยบายส่วนแบ่งรายได้แพลตฟอร์ม'],
    colorTheme: 'from-amber-950 via-purple-950 to-[#070D1E] border-amber-300 shadow-[0_0_20px_rgba(255,215,0,0.3)]',
    rarity: 'Legendary'
  },
  {
    levelRange: 'Level 81–90',
    title: 'อัศวินตำนาน (Legendary Knight)',
    titleEn: 'Legendary Sovereign Knight',
    badge: '🌟 อัศวินผู้เป็นตำนาน (3 แบบแรร์)',
    xpRequired: 115000,
    description: 'ชุดเกราะ: รุ่น "อัศวินผู้เป็นตำนาน" มี 3 แบบระดับอภิมหาแรร์ให้สะสม (Dual Plasma, Thunder God, Sovereign Ghost) ผสานคาร์บอนไฟเบอร์เกรดอากาศยาน',
    perks: ['เลือกสลับใส่ชุดเกราะย้อนหลังได้ทุกสไตล์อย่างอิสระ 100%', 'รายได้ส่วนแบ่งจากการเป็น Master Trainer สอนอัศวินรุ่นใหม่', 'ป้ายทะเบียนทองคำและฉายา Master of Bangkok Streets'],
    colorTheme: 'from-purple-950 via-blue-950 to-amber-950 border-cyan-300 shadow-purple-500/30',
    rarity: 'Legendary'
  },
  {
    levelRange: 'Level 91–100',
    title: 'อัศวินเทพเจ้า (Godlike Knight)',
    titleEn: 'Godlike Custom Sovereign',
    badge: '🌌 GODLIKE SOVEREIGN (1 เดียวในโลก)',
    xpRequired: 150000,
    description: 'ชุดเกราะ: รุ่น "Godlike Custom Edition" ✦ เอกสิทธิ์ขั้นสุดยอด: สามารถร่วมออกแบบเองได้ และมีเพียงตัวเดียวในโลก! ส่วนกลางสนับสนุนงบตัดชุด 100,000฿',
    perks: ['งบตัดชุดคัสตอม 100,000 บาท ออกแบบร่วมกับดีไซเนอร์ระดับโลก', 'สลักชื่อและรหัสประจำตัวถาวรลงในทำเนียบ Hall of Galactic Sovereigns', 'สิทธิ์จองที่นั่งยานอวกาศในโครงการ WINRIDER Cosmic Space Project'],
    colorTheme: 'from-amber-950 via-blue-950 to-cyan-950 border-amber-300 shadow-[0_0_30px_rgba(255,215,0,0.5)]',
    rarity: 'Godlike'
  }
];

export const EIGHT_PILLARS: PillarItem[] = [
  {
    id: 'knight',
    number: 1,
    name: 'WIN Knight',
    nameEn: 'Rapid Urban Passenger Transit',
    tagline: 'บริการรับส่งผู้โดยสารด่วนที่สุดในเมืองหลวง',
    targetAudience: 'คนทำงาน, นักเรียน, ผู้เร่งรีบในชั่วโมงเร่งด่วน',
    vehicleType: 'มอเตอร์ไซค์สมรรถนะสูงพร้อมหมวกนิรภัยบลูทูธ',
    highlight: 'รับประกันความเร็วผ่าน CI Map ลัดเลาะซอยแคบ ไม่ติดไฟแดงใหญ่',
    icon: 'Bike'
  },
  {
    id: 'pet',
    number: 2,
    name: 'WIN Pet',
    nameEn: 'Space-Pod Pet Relocation',
    tagline: 'ขนส่งสัตว์เลี้ยงพรีเมียมด้วยแคปซูลปรับอุณหภูมิ',
    targetAudience: 'ทาสหมา, ทาสแมว, พาสัตว์เลี้ยงไปหาหมอหรือกรูมมิ่ง',
    vehicleType: 'ติดตั้ง WIN-Pet Pod แคปซูลโดมอวกาศติดแอร์',
    highlight: 'คนขับผ่านการอบรมจิตวิทยาสัตว์เลี้ยงและมีกล้อง Live สดให้เจ้าของดู',
    icon: 'Cat'
  },
  {
    id: 'express',
    number: 3,
    name: 'WIN Express',
    nameEn: 'Aerogel Secure Vault Logistics',
    tagline: 'ส่งเอกสารและพัสดุมูลค่าสูงด้วยกล่องฉนวน Aerogel',
    targetAudience: 'สำนักงานกฎหมาย, คลินิกความงาม, ขนส่งยาและของสด',
    vehicleType: 'ติดตั้ง WIN-Vault กล่องฉนวนกันความร้อนล็อก NFC',
    highlight: 'รับประกันพัสดุไม่เสียหาย ปลอดภัย 100% พร้อมระบบ Blackbox Log',
    icon: 'PackageCheck'
  },
  {
    id: 'mu_buddy',
    number: 4,
    name: 'WIN MU Buddy',
    nameEn: 'Sacred Temple & Astral Guide',
    tagline: 'สายมูตัวจริง พาไหว้พระวัดดังฝั่งธนบุรี เสริมดวง 9 วัด',
    targetAudience: 'ผู้ศรัทธา, สายมูเตลู, นักท่องเที่ยวไหว้พระแก้ชง',
    vehicleType: 'ตกแต่งด้วยเกราะสีทอง 3% พร้อมเครื่องหอมอโรมาผ่อนคลาย',
    highlight: 'คนขับรอบรู้ประวัติศาสตร์วัดฝั่งธน เคล็ดลับการขอพรให้สัมฤทธิ์ผล',
    icon: 'Sparkles'
  },
  {
    id: 'lifestyle',
    number: 5,
    name: 'WIN Lifestyle',
    nameEn: 'Personal Urban Errand Assistant',
    tagline: 'ผู้ช่วยส่วนตัววิ่งธุระ ซื้อของ จ่ายบิล ต่อคิวร้านดัง',
    targetAudience: 'คนเมืองไม่มีเวลา, คอนโดมิเนียม, เจ้าของธุรกิจ',
    vehicleType: 'มอเตอร์ไซค์คล่องตัวพร้อมกระเป๋าจัดระเบียบหลายช่อง',
    highlight: 'สั่งงานผ่าน WIN Buddy AI สรุปรายการซื้อของแม่นยำ 100%',
    icon: 'ShoppingBag'
  },
  {
    id: 'spirit',
    number: 6,
    name: 'WIN Spirit',
    nameEn: 'Gentle Care & Hospital Escort',
    tagline: 'บริการรับส่งผู้สูงอายุและผู้ป่วยไปโรงพยาบาลและศาสนกิจ',
    targetAudience: 'ผู้สูงอายุ, ผู้ป่วยพักฟื้น, ญาติที่ติดงานประจำ',
    vehicleType: 'ติดตั้ง Spirit Harness เกราะพยุงหลังลดแรงกระแทก',
    highlight: 'ขับขี่นุ่มนวลเป็นพิเศษ ไม่เร่งเครื่องกระชาก พร้อมดูแลเหมือนคนในครอบครัว',
    icon: 'HeartPulse'
  },
  {
    id: 'family',
    number: 7,
    name: 'WIN Family',
    nameEn: 'Safe Haven Junior Transport',
    tagline: 'รับส่งบุตรหลานไปโรงเรียนด้วยความปลอดภัยสูงสุด',
    targetAudience: 'คุณพ่อคุณแม่ยุคใหม่, นักเรียนระดับประถม-มัธยม',
    vehicleType: 'ติดตั้งหมวกนิรภัยสำหรับเด็ก และระบบตรวจจับพิกัด Real-time',
    highlight: 'คัดเลือกเฉพาะอัศวิน Lvl 30+ ประวัติดีเด่น ผ่านการตรวจสอบอาชญากรรม',
    icon: 'Users'
  },
  {
    id: 'link',
    number: 8,
    name: 'WIN LINK',
    nameEn: 'First-Mile / Last-Mile Transit Bridge',
    tagline: 'เชื่อมต่อบ้านในซอยลึกสู่สถานี BTS, MRT และท่าเรือเจ้าพระยา',
    targetAudience: 'ผู้โดยสารขนส่งมวลชนรายวัน',
    vehicleType: 'รถจักรยานยนต์ไฟฟ้า EV Zero Emission รักษาสิ่งแวดล้อม',
    highlight: 'ราคาคงที่ Flat Rate เชื่อมต่อตั๋วใบเดียวร่วมกับระบบราง',
    icon: 'TrainTrack'
  }
];

export const C2C_SAMPLE_PRODUCTS: C2CProduct[] = [
  {
    id: 'c2c-01',
    riderName: 'พี่ศักดิ์ Knight-088 (Lvl 42)',
    riderId: 'THN-8821',
    title: 'น้ำพริกตาแดงสูตรคุณแม่เจริญพาศน์ 30 ปี',
    price: 65,
    category: 'Homemade Food',
    description: 'ทำสดใหม่ทุกเช้า ใช้พริกยอดสนคั่วเตาถ่าน หอม กลมกล่อม ไม่ใส่สารกันบูด',
    location: 'ย่านวัดอรุณ - ซอยอิสรภาพ 33',
    rating: 4.9
  },
  {
    id: 'c2c-02',
    riderName: 'พี่เอก Knight-014 (Lvl 65)',
    riderId: 'THN-1402',
    title: 'ผ้ายันต์ท้าวเวสสุวรรณ วัดจุฬามณี รุ่นเลื่อนสมณศักดิ์',
    price: 399,
    category: 'Sacred Amulet',
    description: 'ผ่านพิธีพุทธาภิเษกแท้ 100% เลี่ยมกรอบกันน้ำพร้อมพกติดรถเสริมโชคลาภ แคล้วคลาด',
    location: 'วงเวียนใหญ่ - ตลาดพลู',
    rating: 5.0
  },
  {
    id: 'c2c-03',
    riderName: 'พี่หนุ่ม Knight-112 (Lvl 34)',
    riderId: 'THN-1129',
    title: 'กล้วยฉาบเนยสดแม่กลอง ถุงซิปล็อก 200g',
    price: 45,
    category: 'Homemade Food',
    description: 'กรอบ บาง หวานน้อย เนยแท้หอมฟุ้ง กินเพลินระหว่างรอออเดอร์',
    location: 'คลองสาน - ถนนสมเด็จเจ้าพระยา',
    rating: 4.8
  },
  {
    id: 'c2c-04',
    riderName: 'ช่างต้อม Knight-003 (Lvl 88)',
    riderId: 'THN-0035',
    title: 'แท่นจับมือถือมอเตอร์ไซค์ CNC งานคัสตอมมือสองสภาพ 98%',
    price: 250,
    category: 'Vintage/2nd Hand',
    description: 'แปลงใส่แฮนด์บาร์ 22mm อลูมิเนียมทั้งชิ้น ไม่มีคลอน เปลี่ยนเพราะอัปเกรดไปใส่ WIN-Grip',
    location: 'ดาวคะนอง - ท่าพระ',
    rating: 4.9
  }
];

export const CI_MAP_ZONES: CIZone[] = [
  {
    id: 'zone-1',
    name: 'Thonburi Central',
    nameTh: 'ใจกลางฝั่งธนฯ (วงเวียนใหญ่ - ตลาดพลู)',
    ghostRunnersCount: 142,
    capillaryRoutesMapped: 1240,
    floodRisk: 'Low',
    stealthCoverage: 98.4,
    keyShortcut: 'ตรอกศาลเจ้าพ่อเสือ ทะลุ ซอยเทอดไท 19 เลี่ยงแยกตลาดพลู 14 นาที'
  },
  {
    id: 'zone-2',
    name: 'Charan Sanitwong Canal Belt',
    nameTh: 'แนวคลองจรัญสนิทวงศ์ (ซอย 13 - แยกไฟฉาย)',
    ghostRunnersCount: 98,
    capillaryRoutesMapped: 890,
    floodRisk: 'Medium',
    stealthCoverage: 94.2,
    keyShortcut: 'สะพานไม้เลียบคลองบางหลวง ทะลุ วัดคูหาสวรรค์ ข้ามไปเพชรเกษม'
  },
  {
    id: 'zone-3',
    name: 'Khlong San & Riverfront',
    nameTh: 'คลองสาน - ริมเจ้าพระยา (เจริญนคร - กะดีจีน)',
    ghostRunnersCount: 115,
    capillaryRoutesMapped: 1020,
    floodRisk: 'High',
    stealthCoverage: 96.8,
    keyShortcut: 'ทางเลียบชุมชนกะดีจีน ทะลุ สะพานพุทธฯ เลี่ยงไฟแดงถนนประชาธิปก 18 นาที'
  },
  {
    id: 'zone-4',
    name: 'Rama 2 & Dao Khanong',
    nameTh: 'พระราม 2 - ดาวคะนอง - จอมทอง',
    ghostRunnersCount: 160,
    capillaryRoutesMapped: 1450,
    floodRisk: 'Low',
    stealthCoverage: 99.1,
    keyShortcut: 'ซอยสุขสวัสดิ์ 14 ทะลุ จอมทอง 19 ลัดออกถนนเอกชัยโดยไม่ต้องขึ้นสะพานพระราม 2'
  }
];

export const LAUNCH_TIMELINE = [
  {
    dayRange: 'Day 1 - 30',
    phase: 'Phase 1: Ghost Protocol',
    title: 'ยุทธการ Ghost Runners เก็บข้อมูล CI Map 1,000 เส้นทาง',
    desc: 'ส่งทีมสำรวจเส้นเลือดฝอยลับ 100 นาย แผนที่รังนกกระจอกในฝั่งธนบุรี และทดสอบระบบ WIN Buddy AI NLP Voice ภาคสนาม',
    status: 'Completed'
  },
  {
    dayRange: 'Day 31 - 60',
    phase: 'Phase 2: Armor & Hardware Genesis',
    title: 'ผลิต 10 มหาศาสตราวุธ และแจกจ่ายชุดเกราะ The Guardian Zipper',
    desc: 'เปิดสายการผลิต WIN-Comm, WIN-Grip และชุดเกราะเลเวล 1-50 พร้อมติดตั้งชิปติดตามอธิปไตย NB-IoT',
    status: 'Completed'
  },
  {
    dayRange: 'Day 61 - 90',
    phase: 'Phase 3: Seed Round & Castle Grounding',
    title: 'ปิดดีล Seed Round 50 ล้านบาท & เปิดฐาน WIN-Hub 3 ชั้น',
    desc: 'สร้างปราสาทอัศวิน WIN-Hub แห่งแรก ณ วงเวียนใหญ่ พร้อมโซนชาร์จแบตเตอรี่ เลานจ์พักผ่อน และร้านค้า WIN-Shop',
    status: 'In Progress'
  },
  {
    dayRange: 'Day 91 - 120',
    phase: 'Phase 4: Sovereign Pilot 8 Pillars',
    title: 'ทดสอบระบบ 8 Pillars เต็มรูปแบบใน 50 เขตกรุงเทพฯ',
    desc: 'เปิดบริการ WIN Knight, Pet, Express, MU Buddy และตลาด C2C รันโมเดล 2 บาทครองเมือง 100%',
    status: 'Upcoming'
  },
  {
    dayRange: 'Day 121 - 135',
    phase: 'Phase 5: Galactic Grand Opening',
    title: 'วันประกาศอิสรภาพและปักธงสู่มูลค่า 3.5 แสนล้านบาท',
    desc: 'Launch สู่สาธารณชน ขยายสู่อาเซียน และเตรียมความพร้อมสู่การตั้งโครงการ WINRIDER Cosmic Space Initiative',
    status: 'Upcoming'
  }
];
