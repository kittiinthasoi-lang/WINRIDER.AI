export interface WinShopItem {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  category: 'Communication' | 'Combat & Control' | 'Armor Defense' | 'Pet Logistics' | 'All-Weather' | 'Cockpit Tech' | 'VIP Hospitality' | 'Health & Support' | 'Express Logistics';
  categoryTh: string;
  price: number;
  originalPrice: number;
  pointsCost: number;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  badge: string;
  badgeColor: string;
  inStock: boolean;
  stockCount: number;
  description: string;
  keySpecs: string[];
  tacticalAdvantage: string;
  goldAccentDetail: string;
  iconEmoji: string;
  glowTheme: string;
  installment: string;
}

export const WIN_SHOP_ITEMS: WinShopItem[] = [
  {
    id: 'shop-01',
    code: 'WIN-COMM-PRO-3',
    name: 'WIN-Comm Pro Mesh Intercom BT-5.4 (หูฟังติดหมวกสื่อสารอัจฉริยะ)',
    nameEn: 'WIN-Comm Pro 3.0 Halo Mesh Intercom',
    category: 'Communication',
    categoryTh: 'อุปกรณ์สื่อสาร & หมวก',
    price: 2490,
    originalPrice: 3290,
    pointsCost: 2490,
    rating: 4.98,
    reviewsCount: 520,
    salesCount: 1420,
    badge: 'BESTSELLER #1',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400',
    inStock: true,
    stockCount: 45,
    description: 'ชุดหูฟังบลูทูธและอินเตอร์คอมแบบ Halo Ring เรืองแสงสีฟ้า ติดตั้งข้างหมวกกันน็อคทุกรุ่น เชื่อมต่อสื่อสารแบบกลุ่ม Mesh สูงสุด 16 คัน พร้อมไมค์ตัดเสียงลมความเร็ว 120 กม./ชม. และสั่งงาน WIN Buddy AI ด้วยเสียง',
    keySpecs: [
      'Halo Cyan LED วงแหวนเรืองแสงและปุ่มหมุน Jog-Dial สีทอง 3%',
      'Bluetooth 5.4 + Dynamic Mesh 3.0 ระยะส่ง 1.6 กิโลเมตร',
      'Dual Wind-Tunnel Mic ANC ตัดเสียงลมและท่อไอเสีย -45dB',
      'แบตเตอรี่อึด 24 ชั่วโมง สนทนาต่อเนื่อง พร้อม Fast Charge USB-C'
    ],
    tacticalAdvantage: 'คุยกับศูนย์และเพื่อนร่วมวินได้ทันทีโดยไม่ต้องละสายตาจากถนน สั่ง AI เปิดเส้นทางลัดด้วยเสียง 100%',
    goldAccentDetail: 'ขอบวงแหวนคอนโทรลเลอร์ชุบทองคำ 3% สลักโลโก้ WINRIDER.AI',
    iconEmoji: '🎧',
    glowTheme: 'from-[#00D2FF]/20 to-transparent',
    installment: 'ผ่อนชำระ 1+1+1+1 (วันละ 25 บาท)'
  },
  {
    id: 'shop-02',
    code: 'WIN-GLOVES-CARBON',
    name: 'WIN-Pro Tactile Racing Gloves (ถุงมือหนังแท้การ์ดคาร์บอนไฟเบอร์)',
    nameEn: 'WIN-Pro Tactile Carbon Racing Gloves',
    category: 'Combat & Control',
    categoryTh: 'ถุงมือ & การควบคุม',
    price: 1290,
    originalPrice: 1690,
    pointsCost: 1290,
    rating: 4.95,
    reviewsCount: 380,
    salesCount: 980,
    badge: 'POPULAR CHOICE',
    badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400',
    inStock: true,
    stockCount: 62,
    description: 'ถุงมือหนังวัวแท้ผสมเส้นใยเคฟลาร์ เสริมการ์ดข้อนิ้วคาร์บอนไฟเบอร์แท้ เดินเส้นนำแสงนีออนบลู LED Trims ปลายนิ้วชี้และนิ้วโป้งเคลือบสารนำไฟฟ้า Touchscreen แม่นยำระดับ 0.1 มม.',
    keySpecs: [
      'Aerospace Molded Carbon Fiber Knuckle & Palm Sliders',
      'Blue Fiber-Optic Trim แถบเรืองแสงเพิ่มทัศนวิสัยเวลากลางคืน',
      'Smart Touchscreen Tips แตะจอและสแกน QR ได้โดยไม่ต้องถอดถุงมือ',
      'ชิป NFC สลักตราพระพิรุณดิจิทัลสีทองที่สายรัดข้อมือ'
    ],
    tacticalAdvantage: 'จับแฮนด์แน่นกระชับ ไม่ลื่นแม้ฝนตก และรับงานบนสมาร์ทโฟนได้รวดเร็วทันใจ',
    goldAccentDetail: 'เดินด้ายสีทองคำ 3% คู่ขนานตลอดแนวข้อมือเพื่อเสริมสิริมงคลและความเหนียวแน่น',
    iconEmoji: '🧤',
    glowTheme: 'from-cyan-400/20 to-transparent',
    installment: 'ผ่อนชำระ 4 งวด (งวดละ 322 บาท)'
  },
  {
    id: 'shop-03',
    code: 'WIN-ARMOR-PLATES',
    name: 'Guardian Plates Bionic Gold & PCB (สนับเข่า-แข้งลายวงจรทองคำ)',
    nameEn: 'Guardian Plates Gold PCB Armored Knee Guards',
    category: 'Armor Defense',
    categoryTh: 'ชุดป้องกัน & สนับ',
    price: 1890,
    originalPrice: 2450,
    pointsCost: 1890,
    rating: 5.0,
    reviewsCount: 215,
    salesCount: 640,
    badge: 'MAX PROTECTION',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400',
    inStock: true,
    stockCount: 28,
    description: 'สนับเข่าและหน้าแข้งเกรดยุทธวิธีโมโตครอส สลักลายแผงวงจรทองคำ 3% ผสานแผ่นซับแรงกระแทก D3O Non-Newtonian Polymer แข็งตัวทันทีที่ถูกชน พร้อมระบบข้อต่อคู่ Pivot สวมใส่สบาย งอเข่าได้ 120 องศา',
    keySpecs: [
      'D3O Non-Newtonian Impact Polymer ซับแรงกระแทก 99.4%',
      'แผ่นเกราะคาร์บอนไฟเบอร์สลักลาย PCB Gold Microchip',
      'ไฟ LED Cyan ส่องสว่างด้านข้างบอกสถานะการเคลื่อนไหว',
      'สายรัด Quick-Release แบบแม่เหล็กถอด-ใส่ได้ใน 3 วินาที'
    ],
    tacticalAdvantage: 'ปกป้องหัวเข่าและข้อเท้าจากการเฉี่ยวชนขณะมุดแทรกตามช่องแคบระหว่างรถยนต์',
    goldAccentDetail: 'ลายพิมพ์ยันต์เกราะเพชรดิจิทัลสีทองคำ 3% สลักลงบนแผ่นกลางหัวเข่า',
    iconEmoji: '🛡️',
    glowTheme: 'from-emerald-400/20 to-transparent',
    installment: 'ผ่อนชำระ 1+1+1+1 (วันละ 19 บาท)'
  },
  {
    id: 'shop-04',
    code: 'WIN-PET-POD-SPACE',
    name: 'WIN-Pet Climate Space Pod (แคปซูลสัตว์เลี้ยงติดมอเตอร์ไซค์ทรงโดม)',
    nameEn: 'WIN-Pet Climate Space Dome Pod',
    category: 'Pet Logistics',
    categoryTh: 'สัตว์เลี้ยง & ขนส่งพิเศษ',
    price: 3990,
    originalPrice: 5200,
    pointsCost: 3990,
    rating: 4.97,
    reviewsCount: 142,
    salesCount: 310,
    badge: 'PET LOVER CHOICE',
    badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400',
    inStock: true,
    stockCount: 19,
    description: 'แคปซูลสัตว์เลี้ยงระดับเฟิร์สคลาสทรงโดมยานอวกาศ สำหรับติดตั้งบนแร็คท้ายรถมอเตอร์ไซค์ มีพัดลมหมุนเวียนอากาศคู่รักษาอุณหภูมิ 25°C โดมกระจกใสแบบพาโนรามาเคลือบ UV400 พร้อมเบาะเจลลดแรงสั่นสะเทือน',
    keySpecs: [
      'Aero-Acoustic Twin Fans พัดลมเงียบพิเศษควบคุมอุณหภูมิอัตโนมัติ',
      'โดมอะคริลิกใส Panoramic UV400 น้องหมาน้องแมวชมวิวได้รอบทิศ',
      'เบาะเมมโมรี่เจลซับแรงกระแทกนุ่มสบาย กันลื่น ถอดซักได้',
      'ระบบ Quick-Lock ติดตั้งและปลดล็อกแร็คท้ายรถใน 5 วินาที'
    ],
    tacticalAdvantage: 'เปิดรับงาน WIN-Pet Care เพิ่มรายได้ต่อทริป 2.5 เท่า สัตว์เลี้ยงไม่อึดอัดและไม่เมารถ',
    goldAccentDetail: 'ขอบวงแหวนยึดโดมชุบทองคำ 3% สไตล์แคปซูลอวกาศหรูหรา',
    iconEmoji: '🐱',
    glowTheme: 'from-amber-400/20 to-transparent',
    installment: 'ผ่อนชำระ 6 เดือน (เดือนละ 665 บาท)'
  },
  {
    id: 'shop-05',
    code: 'WIN-STORM-JACKET',
    name: 'Storm Shield Pro Gore-Tex Powerline (แจ็กเก็ตกันฝนไฮเทคพาวเวอร์ไลน์)',
    nameEn: 'Storm Shield Pro 3-Layer All-Weather Armor',
    category: 'All-Weather',
    categoryTh: 'ชุดเกราะ & เสื้อกันฝน',
    price: 2890,
    originalPrice: 3890,
    pointsCost: 2890,
    rating: 4.99,
    reviewsCount: 410,
    salesCount: 890,
    badge: 'MONSOON READY',
    badgeColor: 'bg-blue-500/20 text-cyan-300 border-cyan-400',
    inStock: true,
    stockCount: 34,
    description: 'เสื้อแจ็กเก็ตกันฝนผ้า 3 ชั้น Gore-Tex Pro กันน้ำระดับ 28,000 มม. ดีไซน์ Tech-wear ลายเส้นวงจรหกเหลี่ยมเรืองแสง Cyan Powerlines ซิปกันน้ำ YKK Aquaguard และฮู้ดทรงพิเศษคลุมหมวกกันน็อคได้มิดชิด',
    keySpecs: [
      'Gore-Tex Pro 3-Layer 28,000mm Breathable & 100% Stormproof',
      'Active Cyan Powerline Strips ลายเรืองแสงเห็นชัดจากระยะ 300 เมตร',
      'แถบแม่เหล็กปิดหน้าซิป Magnetic Storm Flap ลมแรงแค่ไหนก็ไม่เปิด',
      'ช่องกระเป๋าซีลสูญญากาศสำหรับโทรศัพท์และแบตเตอรี่สำรอง'
    ],
    tacticalAdvantage: 'วิ่งรับงานฝ่าพายุฝนได้ตลอดวันโดยตัวไม่เปียกชื้น ปลอดภัยจากอุบัติเหตุด้วยแถบไฟเด่นชัด',
    goldAccentDetail: 'หัวซิป The Guardian Zipper โลหะสีทอง 3% กันน้ำพร้อมซีลยางแท้',
    iconEmoji: '⚡',
    glowTheme: 'from-cyan-500/20 to-transparent',
    installment: 'ผ่อนชำระ 1+1+1+1 (วันละ 29 บาท)'
  },
  {
    id: 'shop-06',
    code: 'WIN-GRIP-7075',
    name: 'WIN-Grip CNC 7075 Vibration Mount (แท่นวางมือถือแฮนด์กันสะเทือน OIS)',
    nameEn: 'WIN-Grip Aerospace Anti-Vibration Cockpit Mount',
    category: 'Cockpit Tech',
    categoryTh: 'อุปกรณ์แฮนด์ & ค็อกพิท',
    price: 990,
    originalPrice: 1450,
    pointsCost: 990,
    rating: 4.96,
    reviewsCount: 680,
    salesCount: 2150,
    badge: 'TOP SELLER',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400',
    inStock: true,
    stockCount: 88,
    description: 'แท่นจับโทรศัพท์มือถืออะลูมิเนียม CNC 7075 เกรดอากาศยาน มีระบบโช้คลดแรงสั่นสะเทือนไฮดรอลิก 4 มุม ปกป้องโมดูลกล้อง OIS ของ iPhone และ Android 100% พร้อมระบบชาร์จเร็วไร้สาย Qi2 15W',
    keySpecs: [
      'CNC Aviation Aluminum 7075 แข็งแกร่ง ไม่แตกหัก ทนแดดเมืองไทย',
      'Quad-Hydraulic Damper ลดแรงสั่นความถี่สูงจากเครื่องยนต์มอเตอร์ไซค์',
      'Qi2 15W Fast Wireless Charging จ่ายไฟสม่ำเสมอ แบตไม่หมดกลางทาง',
      'One-Click Mechanical Auto Lock ล็อกและปลดล็อกโทรศัพท์ด้วยมือเดียว'
    ],
    tacticalAdvantage: 'หน้าจอแผนที่ CI Capillary นิ่งสนิท มองง่าย สบายตา และกล้องมือถือไม่พัง',
    goldAccentDetail: 'สลักโลโก้ราชสีห์สีทอง 3% บนแกนหมุนบอลจอยต์ 360 องศา',
    iconEmoji: '📱',
    glowTheme: 'from-blue-500/20 to-transparent',
    installment: 'ซื้อสดหรือตัดแต้มอัศวิน 990 แต้ม'
  },
  {
    id: 'shop-07',
    code: 'WIN-CANOPY-LED',
    name: 'Client Canopy Cyber Storm Umbrella (ร่มกันพายุไฟ LED ก้านนีออน)',
    nameEn: 'Client Canopy Gale-Force 8 Cyber Umbrella',
    category: 'VIP Hospitality',
    categoryTh: 'บริการผู้โดยสาร & VIP',
    price: 790,
    originalPrice: 1190,
    pointsCost: 790,
    rating: 4.92,
    reviewsCount: 190,
    salesCount: 520,
    badge: 'VIP HOSPITALITY',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400',
    inStock: true,
    stockCount: 42,
    description: 'ร่มขนาดยักษ์สำหรับบริการรับส่งผู้โดยสารในวันฝนตก ก้านโครงสร้างไททาเนียมทนลมพายุระดับ 8 พร้อมหลอดไฟ LED นีออนสีฟ้าฝังในแนวก้านร่มส่องสว่างทางเดิน และผ้าเคลือบสารนาโน Hydrophobic น้ำไม่เกาะ',
    keySpecs: [
      'Gale-Force 8 Windproof Skeleton โครงกระดูกงูไททาเนียมไม่หักงอ',
      'Neon Blue Light-Guide Ribs หลอดไฟนีออนส่องสว่างใต้ร่มและพื้นทางเดิน',
      'Nano Lotus Effect Hydrophobic สะบัดครั้งเดียวแห้งสนิททันที',
      'ปุ่มกดสปริงกาง-หุบอัตโนมัติ กางได้รวดเร็วเพียงเสี้ยววินาที'
    ],
    tacticalAdvantage: 'สร้างความประทับใจระดับ 6 ดาวให้ผู้โดยสาร รับทิปและคะแนน 5 ดาวเต็มทุกเที่ยว',
    goldAccentDetail: 'ปลอกด้ามจับหุ้มทองเหลืองขัดลายชุบทองคำ 3% สลัก WR.AI',
    iconEmoji: '☂️',
    glowTheme: 'from-purple-500/20 to-transparent',
    installment: 'ซื้อสดหรือใช้สวัสดิการกองทุน 2 บาท'
  },
  {
    id: 'shop-08',
    code: 'WIN-SPIRIT-HARNESS',
    name: 'WIN-Spirit Spinal Exoskeleton (เกราะพยุงหลังและกระดูกสันหลัง)',
    nameEn: 'WIN-Spirit Bionic Spinal Exoskeleton Harness',
    category: 'Health & Support',
    categoryTh: 'การยศาสตร์ & สุขภาพ',
    price: 2590,
    originalPrice: 3490,
    pointsCost: 2590,
    rating: 4.98,
    reviewsCount: 175,
    salesCount: 430,
    badge: 'DOCTOR APPROVED',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400',
    inStock: true,
    stockCount: 22,
    description: 'ชุดเกราะพยุงหลังและแกนกระดูกสันหลังชีวกล (Bionic Spine) ผลิตจากคาร์บอนคอมโพสิต ช่วยกระจายน้ำหนัก ลดอาการปวดหลังจากการขับขี่นาน พร้อมสายรัดจับด้านข้างสำหรับผู้โดยสารสูงอายุหรือผู้ป่วย',
    keySpecs: [
      'Bionic Carbon Spine Arch แกนกระดูกพยุงเอวและหลังตรงตามสรีรศาสตร์',
      'Dual Ergonomic Side Grab Rails มือจับสำหรับคนซ้อนยึดเกาะมั่นใจ 100%',
      'แผ่นรองหลังตาข่ายระบายเหงื่อ 3D Mesh นุ่ม สบาย ไม่อับชื้น',
      'หัวเข็มขัดนิรภัยปลดไวแบบ Aerospace Quick-Release'
    ],
    tacticalAdvantage: 'ขับขี่ต่อเนื่อง 8-10 ชั่วโมงโดยไม่ปวดเมื่อยหลัง และรองรับบริการ WIN Spirit อย่างมืออาชีพ',
    goldAccentDetail: 'สลักลายพรหมวิหาร 4 สีทองคำ 3% บริเวณแกนกระดูกสันหลัง',
    iconEmoji: '🦾',
    glowTheme: 'from-rose-500/20 to-transparent',
    installment: 'ผ่อนชำระ 1+1+1+1 (วันละ 26 บาท)'
  },
  {
    id: 'shop-09',
    code: 'WIN-VAULT-BOX',
    name: 'Smart Temperature-Controlled Top Box (กล่องส่งของอัจฉริยะควบคุมความเย็น)',
    nameEn: 'Smart Thermo-Electric Logistics Top Box',
    category: 'Express Logistics',
    categoryTh: 'กล่องพัสดุ & ขนส่งด่วน',
    price: 3490,
    originalPrice: 4500,
    pointsCost: 3490,
    rating: 4.94,
    reviewsCount: 130,
    salesCount: 390,
    badge: 'HIGH-TECH BOX',
    badgeColor: 'bg-cyan-400/20 text-cyan-300 border-cyan-400',
    inStock: true,
    stockCount: 15,
    description: 'กล่องติดท้ายมอเตอร์ไซค์ควบคุมอุณหภูมิด้วยระบบแผ่นเทอร์โมอิเล็กทริก ปรับความเย็น 4°C หรือรักษาความร้อน 60°C ได้ตามสั่ง มีไฟ Dual Cyan LED Halo สองวงรอบตัวกล่อง และล็อกด้วย NFC Smart Key',
    keySpecs: [
      'Dual Halo LED Cyber Rings วงแหวนเรืองแสงนีออนบลูเด่นชัดรอบทิศทาง',
      'Thermo-Electric System ควบคุมอุณหภูมิ 4°C - 60°C ผ่านแอปพลิเคชัน',
      'Digital LED Screen จอแสดงอุณหภูมิและสถานะแบตเตอรี่บนฝากล่อง',
      'ระบบล็อกอัจฉริยะ NFC Dual Key ป้องกันพัสดุสูญหายหรือถูกโจรกรรม'
    ],
    tacticalAdvantage: 'รับส่งอาหารระดับภัตตาคาร ยา วัคซีน และเวชภัณฑ์ทางการแพทย์ได้อย่างปลอดภัย 100%',
    goldAccentDetail: 'ตราสัญลักษณ์ราชสีห์สีทองคำ 3% กลางฝากล่องพัสดุ',
    iconEmoji: '📦',
    glowTheme: 'from-blue-600/20 to-transparent',
    installment: 'พี่วินเลือกซื้อสดหรือผ่อน +1฿/รอบ | คนทั่วไปเงินสดเท่านั้น'
  },
  {
    id: 'shop-10',
    code: 'WIN-ELBOW-D3O',
    name: 'Bionic D3O Ergonomic Elbow Guards (สนับศอกชีวกลคาร์บอนแท้)',
    nameEn: 'Bionic D3O Impact Protection Elbow Guards',
    category: 'Armor Defense',
    categoryTh: 'ชุดป้องกัน & สนับศอก',
    price: 1490,
    originalPrice: 1990,
    pointsCost: 1490,
    rating: 4.97,
    reviewsCount: 165,
    salesCount: 480,
    badge: 'NEW ARRIVAL',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400',
    inStock: true,
    stockCount: 36,
    description: 'สนับศอกเกรดยุทธวิธี เสริมแผ่นซับแรงกระแทก D3O และการ์ดคาร์บอนไฟเบอร์แท้ ป้องกันข้อศอกจากการกระแทกหรือไถลลื่น 100% สายรัด Neoprene กระชับระบายอากาศดีเยี่ยม',
    keySpecs: [
      'D3O Non-Newtonian Polymer แข็งตัวทันทีเมื่อเกิดแรงกระแทก',
      'การ์ดด้านนอกผลิตจาก Molded Real Carbon Fiber ทนการเสียดสี',
      'สายรัด Dual Elastic Straps พร้อมแถบกันลื่นซิลิโคนด้านใน',
      'น้ำหนักเบาเพียง 280 กรัม สวมใส่สบายใต้หรือทับเสื้อแจ็กเก็ตได้'
    ],
    tacticalAdvantage: 'ปกป้องข้อศอกขณะเลี้ยวโค้งหรือกรณีเกิดอุบัติเหตุไม่คาดฝัน',
    goldAccentDetail: 'เดินเส้นด้ายสีทองคำ 3% พร้อมปักตรา WINRIDER BIONIC',
    iconEmoji: '🦾',
    glowTheme: 'from-emerald-500/20 to-transparent',
    installment: 'พี่วินเลือกซื้อสดหรือผ่อน +1฿/รอบ | คนทั่วไปเงินสดเท่านั้น'
  }
];
