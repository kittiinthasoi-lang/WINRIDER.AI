import { AmenityOption, SelectedAmenityItem } from '../types';

export const AMENITIES_CATALOG: AmenityOption[] = [
  // =========================================================================
  // 1. หมวดความปลอดภัย (Safety & Helmets) - หมวกกันน็อคฟรี 0฿ (Complimentary Free)
  // =========================================================================
  {
    id: 'helmet_standard_tis',
    name: 'หมวกกันน็อกมาตรฐาน มอก. (ฆ่าเชื้อ UV ทุกเที่ยว)',
    nameEn: 'TIS Standard Safety Helmet (UV-C Sterilized)',
    category: 'safety',
    categoryLabel: 'ความปลอดภัย (Safety)',
    categoryLabelEn: 'Safety & Helmets (Free 0฿)',
    icon: '🪖',
    price: 0,
    touristPrice: 0,
    isHelmet: true,
    popular: true,
    description: 'หมวกนิรภัยมาตรฐาน มอก. ล็อคคางแน่นหนา ผ่านการอบรังสี UV-C และเปลี่ยนซับในฆ่าเชื้อทุกเที่ยว (ฟรี 0฿)',
    descriptionEn: 'TIS-certified Thai safety helmet with secure chin strap, UV-C sterilized inner liner before every trip (100% Free 0฿).'
  },
  {
    id: 'helmet_full_face',
    name: 'หมวกกันน็อกเต็มใบ Real / Bilmola (พร้อมแว่นกันแดดในตัว)',
    nameEn: 'Full-Face / Modular Helmet (Real / Bilmola with Sun Visor)',
    category: 'safety',
    categoryLabel: 'ความปลอดภัย (Safety)',
    categoryLabelEn: 'Safety & Helmets (Free 0฿)',
    icon: '🛡️',
    price: 0,
    touristPrice: 0,
    isHelmet: true,
    popular: true,
    description: 'หมวกกันน็อกแบบ Full-Face หรือ Modular ยกคางได้ ป้องกันลมและเศษหิน 100% ฆ่าเชื้อสะอาด (ฟรี 0฿)',
    descriptionEn: 'Premium full-face modular helmet with built-in drop-down sun visor. Complete face shield against wind & road debris (Free 0฿).'
  },
  {
    id: 'helmet_smart_hud',
    name: 'หมวกกันน็อก Smart HUD Bluetooth (คุยสาย & ฟังเพลงในหมวก)',
    nameEn: 'Smart HUD Bluetooth Helmet (In-Helmet Audio & Mic)',
    category: 'safety',
    categoryLabel: 'ความปลอดภัย (Safety)',
    categoryLabelEn: 'Safety & Helmets (Free 0฿)',
    icon: '🎧',
    price: 0,
    touristPrice: 0,
    isHelmet: true,
    popular: true,
    description: 'หมวกกันน็อกไฮเทคเชื่อมต่อบลูทูธและไมโครโฟนตัดเสียงรบกวนในตัว (ฟรี 0฿)',
    descriptionEn: 'High-tech helmet with integrated Bluetooth 5.3 audio & noise-canceling mic for navigation & calls (Free 0฿).'
  },
  {
    id: 'helmet_kids',
    name: 'หมวกกันน็อกนิรภัยสำหรับเด็ก (ไซส์ S/M ปรับสายกระชับ)',
    nameEn: 'Children Safety Helmet (Ergonomic Size S/M)',
    category: 'safety',
    categoryLabel: 'ความปลอดภัย (Safety)',
    categoryLabelEn: 'Safety & Helmets (Free 0฿)',
    icon: '👶',
    price: 0,
    touristPrice: 0,
    isHelmet: true,
    description: 'หมวกนิรภัยขนาดพิเศษสำหรับเด็ก น้ำหนักเบา ปลอดภัยกระชับศีรษะ (ฟรี 0฿)',
    descriptionEn: 'Lightweight, ergonomic child safety helmet with adjustable quick-release buckle (Free 0฿).'
  },

  // =========================================================================
  // 2. หมวดสุขอนามัย ความสดชื่น และการดูแล (Care & Freshness: +10-15฿ / Tourist: +12-18฿)
  // =========================================================================
  {
    id: 'aroma_cold_towel',
    name: 'ผ้าเย็นอโรมาเปปเปอร์มินต์ฆ่าเชื้อ (Aroma Cold Towel)',
    nameEn: 'Chilled Peppermint Aroma Cold Towel',
    category: 'care',
    categoryLabel: 'ดูแล & สดชื่น (Care & Fresh)',
    categoryLabelEn: 'Care & Refreshment (+฿12-18)',
    icon: '🧊',
    price: 10,
    touristPrice: 12,
    isHelmet: false,
    popular: true,
    description: 'ผ้าเย็นกลิ่นน้ำมันหอมระเหยเปปเปอร์มินต์แท้ สดชื่น คลายร้อน บรรจุซองซีลปลอดเชื้อ 100%',
    descriptionEn: 'Instant cooling relief towel infused with natural Thai peppermint essential oil in a sealed hygienic pouch.'
  },
  {
    id: 'pure_mineral_water',
    name: 'น้ำดื่มบริสุทธิ์เย็นชื่นใจ (Pure Mineral Water 350ml)',
    nameEn: 'Chilled Pure Mineral Water (350ml)',
    category: 'care',
    categoryLabel: 'ดูแล & สดชื่น (Care & Fresh)',
    categoryLabelEn: 'Care & Refreshment (+฿12-18)',
    icon: '💧',
    price: 10,
    touristPrice: 12,
    isHelmet: false,
    popular: true,
    description: 'น้ำแร่ธรรมชาติขวดเย็นพร้อมดื่ม ดับกระหายคลายร้อนตลอดการเดินทาง',
    descriptionEn: 'Cold sealed natural mineral water bottle to stay refreshed in tropical Bangkok weather.'
  },
  {
    id: 'herbal_inhaler',
    name: 'ยาดมสมุนไพรไทยเกรดพรีเมียม & ลูกอมมิ้นต์สดชื่น',
    nameEn: 'Traditional Thai Herbal Inhaler & Mint Candies',
    category: 'care',
    categoryLabel: 'ดูแล & สดชื่น (Care & Fresh)',
    categoryLabelEn: 'Care & Refreshment (+฿12-18)',
    icon: '🌿',
    price: 10,
    touristPrice: 12,
    isHelmet: false,
    description: 'ยาดมสมุนไพรสูตรโบราณหอมสดชื่น แก้วิงเวียน แก้อาการเมารถ พร้อมลูกอมมิ้นต์เย็นสดชื่น',
    descriptionEn: 'Famous traditional Thai herbal aromatic inhaler (Ya Dom) for instant revitalization & motion relief.'
  },
  {
    id: 'n95_mask_spray',
    name: 'หน้ากากอนามัย N95 ป้องกันฝุ่น PM2.5 + สเปรย์แอลกอฮอล์',
    nameEn: 'N95 Anti-Pollution Mask + Alcohol Hand Mist',
    category: 'care',
    categoryLabel: 'ดูแล & สดชื่น (Care & Fresh)',
    categoryLabelEn: 'Care & Refreshment (+฿12-18)',
    icon: '😷',
    price: 15,
    touristPrice: 18,
    isHelmet: false,
    description: 'หน้ากากเกรดป้องกันฝุ่นพิษ PM2.5 ควันไอเสีย และไวรัสได้อย่างมีประสิทธิภาพ พร้อมสเปรย์ล้างมือ',
    descriptionEn: 'High-filtration N95 mask against Bangkok road dust & exhaust, paired with pocket sanitizer spray.'
  },
  {
    id: 'uv_sunglasses',
    name: 'แว่นตากันลม / แว่นกันแดด Polarized UV400 ป้องกันฝุ่น',
    nameEn: 'Polarized UV400 Windproof Riding Sunglasses',
    category: 'care',
    categoryLabel: 'ดูแล & สดชื่น (Care & Fresh)',
    categoryLabelEn: 'Care & Refreshment (+฿12-18)',
    icon: '🕶️',
    price: 15,
    touristPrice: 18,
    isHelmet: false,
    description: 'แว่นกันลมทรงสปอร์ต เลนส์ Polarized ตัดแสงสะท้อนและกันฝุ่นละอองเข้าตา 100%',
    descriptionEn: 'Sporty wraparound polarized sunglasses shielding against tropical glare, road wind, and dust.'
  },
  {
    id: 'premium_raincoat',
    name: 'เสื้อกันฝนเกรดพรีเมียมหนาพิเศษ หรือ ร่มพับกันฝน UV',
    nameEn: 'Heavy-Duty Rain Poncho or UV Windproof Umbrella',
    category: 'care',
    categoryLabel: 'ดูแล & สดชื่น (Care & Fresh)',
    categoryLabelEn: 'Care & Refreshment (+฿12-18)',
    icon: '🌧️',
    price: 15,
    touristPrice: 18,
    isHelmet: false,
    popular: true,
    description: 'เสื้อกันฝนคลุมทั้งตัวเนื้อหนากันน้ำซึม 100% หรือร่มพับกันลมแรง สำหรับวันฝนตกแดดจัด',
    descriptionEn: 'Full-coverage heavy-duty waterproof raincoat or reinforced windproof umbrella for monsoon showers.'
  },

  // =========================================================================
  // 3. หมวดอุปกรณ์อำนวยความสะดวก & ชาร์จเร็ว (Tech & Gadgets: +20-25฿ / Tourist: +24-30฿)
  // =========================================================================
  {
    id: 'fast_charger_65w',
    name: 'สายชาร์จเร็ว Multi-Port Fast Charge 65W (Type-C / Lightning)',
    nameEn: '65W Multi-Port Fast Charger (Type-C & Lightning)',
    category: 'tech',
    categoryLabel: 'เทคโนโลยี & ชาร์จ (Tech & Power)',
    categoryLabelEn: 'Tech & Connectivity (+฿24-30)',
    icon: '⚡',
    price: 20,
    touristPrice: 24,
    isHelmet: false,
    popular: true,
    description: 'สายชาร์จกำลังส่งสูง 65W พร้อมหัวชาร์จทุกรุ่น ชาร์จมือถือขึ้น 50% ภายใน 15 นาทีระหว่างเดินทาง',
    descriptionEn: 'High-speed 65W onboard charging cable compatible with iPhone Lightning, USB-C, and Android devices.'
  },
  {
    id: 'shoe_rain_cover',
    name: 'ผ้าคลุมรองเท้ากันเปียกกันฝน (Shoe Rain Shield)',
    nameEn: 'Waterproof Shoe Rain Covers (Elastic Slip-On)',
    category: 'comfort',
    categoryLabel: 'ความสบาย (Comfort)',
    categoryLabelEn: 'Comfort & Touring (+฿24-30)',
    icon: '👢',
    price: 20,
    touristPrice: 24,
    isHelmet: false,
    description: 'ถุงคลุมรองเท้ากันน้ำยางยืดกระชับ เดินลุยน้ำขังและละอองฝน รองเท้าไม่เลอะไม่เปียก',
    descriptionEn: 'Elastic silicone shoe protectors to keep your sneakers and shoes completely dry during road puddles.'
  },
  {
    id: 'luggage_cargo_strap',
    name: 'สายรัดกระเป๋าเดินทาง / ตะแกรงรัดสัมภาระนิรภัยกันหล่น',
    nameEn: 'Heavy Bungee Luggage & Backpack Cargo Net',
    category: 'comfort',
    categoryLabel: 'ความสบาย (Comfort)',
    categoryLabelEn: 'Comfort & Touring (+฿24-30)',
    icon: '🧳',
    price: 20,
    touristPrice: 24,
    isHelmet: false,
    description: 'สายรัด Bungee Cord เกรดแกร่ง พร้อมตาข่ายรัดสัมภาระ กระเป๋าเป้ หรือกล่องพัสดุแน่นหนา',
    descriptionEn: 'Reinforced industrial bungee cords & elastic net securing your luggage, shopping bags, or backpacks.'
  },
  {
    id: 'wireless_magsafe_holder',
    name: 'ที่ยึดมือถือกันสะเทือนพร้อมชาร์จไร้สาย Wireless MagSafe',
    nameEn: 'Anti-Vibration MagSafe Wireless Phone Mount',
    category: 'tech',
    categoryLabel: 'เทคโนโลยี & ชาร์จ (Tech & Power)',
    categoryLabelEn: 'Tech & Connectivity (+฿24-30)',
    icon: '📱',
    price: 25,
    touristPrice: 29,
    isHelmet: false,
    popular: true,
    description: 'ขาจับสมาร์ทโฟนระบบซับแรงสะเทือน Anti-Vibration พร้อมแท่นชาร์จไร้สาย MagSafe ชาร์จสะดวกตลอดทาง',
    descriptionEn: 'Shock-absorbing magnetic mount keeping your phone safely mounted for video capture and wireless charging.'
  },
  {
    id: 'gel_seat_cushion',
    name: 'เบาะรองนั่งเจลรังผึ้งระบายอากาศ ลดแรงกระแทกนุ่มสบาย',
    nameEn: '3D Honeycomb Silicone Gel Ergonomic Seat Cushion',
    category: 'comfort',
    categoryLabel: 'ความสบาย (Comfort)',
    categoryLabelEn: 'Comfort & Touring (+฿24-30)',
    icon: '💺',
    price: 25,
    touristPrice: 29,
    isHelmet: false,
    popular: true,
    description: 'แผ่นเจลซิลิโคนรังผึ้ง 3D นุ่ม กระจายน้ำหนัก นั่งนานไม่เมื่อย ไม่ร้อนก้น นุ่มสบายทุกรอยต่อถนน',
    descriptionEn: 'Pressure-relieving medical grade honeycomb gel pad smoothing out bumps and road vibrations.'
  },
  {
    id: 'intercom_bluetooth',
    name: 'ระบบหูฟังบลูทูธ Intercom คุยกับคนขับระหว่างทางชัดเจน',
    nameEn: 'Live Driver Intercom Headset (Noise-Free Chat)',
    category: 'tech',
    categoryLabel: 'เทคโนโลยี & ชาร์จ (Tech & Power)',
    categoryLabelEn: 'Tech & Connectivity (+฿24-30)',
    icon: '🎙️',
    price: 25,
    touristPrice: 29,
    isHelmet: false,
    description: 'ระบบสื่อสารไร้สาย Intercom สื่อสารบอกทางหรือพูดคุยกับอัศวินผู้ขับขี่ได้ยินชัดเจน ตัดเสียงลม 100%',
    descriptionEn: 'Crystal-clear two-way intercom allowing you to talk with your English-speaking Knight Driver in real-time.'
  },
  {
    id: 'personal_dj_music',
    name: 'เพลงเปิดส่วนตัวบลูทูธตามสั่ง (Personal DJ Playlist / Jazz / Pop)',
    nameEn: 'Custom Bluetooth DJ Playlist (Lo-Fi / Jazz / Pop)',
    category: 'tech',
    categoryLabel: 'เทคโนโลยี & ชาร์จ (Tech & Power)',
    categoryLabelEn: 'Tech & Connectivity (+฿24-30)',
    icon: '🎵',
    price: 15,
    touristPrice: 18,
    isHelmet: false,
    description: 'เลือกเปิดเพลงแนวโปรดผ่านลำโพงบลูทูธของตัวรถ เช่น Lo-Fi, Jazz นุ่มๆ หรือเพลงสากลตามสั่ง',
    descriptionEn: 'Stream your favorite Spotify playlist or enjoy curated Bangkok chill Lo-Fi jazz during your cruise.'
  },

  // =========================================================================
  // 4. หมวดความสบายขั้นสูง & พิเศษ (Premium & Special: +30-50฿ / Tourist: +35-58฿)
  // =========================================================================
  {
    id: 'vibration_massage_seat',
    name: 'เบาะนวดระบบไฟฟ้าสั่นผ่อนคลาย (Vibration Massage Cushion)',
    nameEn: 'Electric Vibration Lumbar Massage Cushion',
    category: 'comfort',
    categoryLabel: 'ความสบาย (Comfort)',
    categoryLabelEn: 'Comfort & Touring (+฿35-58)',
    icon: '💆',
    price: 30,
    touristPrice: 35,
    isHelmet: false,
    popular: true,
    description: 'เบาะนวดระบบสั่นไฟฟ้า 5 รูปแบบ นวดคลายกล้ามเนื้อหลังและสะโพกตลอดการเดินทาง',
    descriptionEn: '5-mode electric vibrating massage cushion soothing back and hip muscles while navigating the city.'
  },
  {
    id: 'cooler_box_15l',
    name: 'กล่องโฟมเก็บความเย็นรักษาอุณหภูมิ (Cooler Box 15L)',
    nameEn: 'Insulated 15L Chilled Cooler Box',
    category: 'special',
    categoryLabel: 'พิเศษ & เฉพาะทาง (Special)',
    categoryLabelEn: 'Special VIP Services (+฿35-58)',
    icon: '📦',
    price: 30,
    touristPrice: 35,
    isHelmet: false,
    description: 'กล่องเก็บอุณหภูมิสำหรับใส่เค้ก อาหารสด ยา หรือเครื่องดื่มเย็น รักษาความเย็นได้ยาวนานตลอดเส้นทาง',
    descriptionEn: 'Thermal cold-storage cooler chest for drinks, tropical fruit delicacies, or refrigerated medicines.'
  },
  {
    id: 'pet_safety_harness',
    name: 'ชุดเบาะเซฟตี้รัดสัตว์เลี้ยง (Pet Carrier Harness & Safety Bag)',
    nameEn: 'Pet Safety Travel Carrier & Restraint Harness',
    category: 'special',
    categoryLabel: 'พิเศษ & เฉพาะทาง (Special)',
    categoryLabelEn: 'Special VIP Services (+฿35-58)',
    icon: '🐶',
    price: 35,
    touristPrice: 40,
    isHelmet: false,
    popular: true,
    description: 'กระเป๋าและสายรัดนิรภัยสำหรับน้องหมาน้องแมว ระบายอากาศดี นุ่ม ปลอดภัย มีห่วงล็อคปลอกคอ',
    descriptionEn: 'Ventilated shock-absorbing pet travel harness and carrier bag keeping small pets safe and cozy.'
  },
  {
    id: 'side_pannier_45l',
    name: 'กระเป๋าข้าง Pannier กันน้ำความจุสูง 45 ลิตร (ใส่ของจุใจ)',
    nameEn: 'Dual 45L Waterproof Touring Side Panniers',
    category: 'special',
    categoryLabel: 'พิเศษ & เฉพาะทาง (Special)',
    categoryLabelEn: 'Special VIP Services (+฿35-58)',
    icon: '🎒',
    price: 35,
    touristPrice: 40,
    isHelmet: false,
    description: 'กระเป๋าข้าง Touring กันน้ำฝน 100% บรรจุเสื้อผ้า สัมภาระ หรือเอกสารสำคัญได้เต็มที่',
    descriptionEn: 'Spacious 45-liter waterproof motorcycle side saddlebags for heavy shopping or luggage transit.'
  },
  {
    id: 'armor_jacket_ce2',
    name: 'เสื้อเกราะการ์ดป้องกันพิเศษ CE Level 2 สำหรับผู้โดยสาร',
    nameEn: 'CE Level 2 Protective Armored Passenger Jacket',
    category: 'safety',
    categoryLabel: 'ความปลอดภัย (Safety)',
    categoryLabelEn: 'Safety & Helmets',
    icon: '🥋',
    price: 40,
    touristPrice: 46,
    isHelmet: false,
    description: 'เสื้อแจ็คเก็ตการ์ดป้องกันไหล่ ศอก และหลัง ระดับ CE Level 2 สำหรับผู้ที่ต้องการความปลอดภัยระดับซูเปอร์ไบค์',
    descriptionEn: 'Pro motorcycle jacket with CE Level 2 impact armor on shoulders, elbows, and spinal column.'
  },
  {
    id: 'heated_seat_warmer',
    name: 'เบาะอุ่นไฟฟ้าปรับระดับอุณหภูมิ (Heated Seat Warmer)',
    nameEn: 'Thermostat Heated Seat Warmer Cushion',
    category: 'comfort',
    categoryLabel: 'ความสบาย (Comfort)',
    categoryLabelEn: 'Comfort & Touring (+฿35-58)',
    icon: '🔥',
    price: 45,
    touristPrice: 52,
    isHelmet: false,
    description: 'ระบบทำความร้อนที่เบาะนั่ง ปรับอุณหภูมิอุ่นสบาย เหมาะสำหรับค่ำคืนที่อากาศเย็น หรือวันที่ฝนตกหนาว',
    descriptionEn: 'Heated seat pad providing gentle soothing warmth during cool evening rides or rainy spells.'
  },
  {
    id: 'action_cam_4k_recording',
    name: 'บริการบันทึกภาพ/วิดีโอมุมมอง Action Cam 4K ตลอดทริป',
    nameEn: '4K Action Cam Sightseeing Video Recording Service',
    category: 'special',
    categoryLabel: 'พิเศษ & เฉพาะทาง (Special)',
    categoryLabelEn: 'Special VIP Services (+฿35-58)',
    icon: '📹',
    price: 50,
    touristPrice: 58,
    isHelmet: false,
    popular: true,
    description: 'ติดตั้งกล้อง GoPro 4K บันทึกภาพความประทับใจ ท่องเที่ยว ชมวิวกรุงเทพฯ ส่งไฟล์วิดีโอให้ทันทีหลังจบทริป',
    descriptionEn: 'Mounted 4K GoPro camera filming your scenic ride through Bangkok landmarks, AirDropped directly to you.'
  }
];

/**
 * Check if an amenity string is a helmet (always 0฿ free).
 */
export function isHelmetAmenity(nameOrDesc: string): boolean {
  if (!nameOrDesc) return false;
  const lower = nameOrDesc.toLowerCase();
  return lower.includes('หมวก') || lower.includes('helmet') || lower.includes('มอก.') || lower.includes('tis');
}

/**
 * Calculate the exact price of an amenity item.
 * - Helmet is strictly 0฿ (ฟรี ไม่บวกเพิ่ม) for both local and tourist mode.
 * - Other items range from 10฿ to 50฿ (or tourist markup +10% to +20%).
 */
export function getAmenityPrice(nameOrDesc: string, isTourist: boolean = false): number {
  if (!nameOrDesc) return 0;
  if (isHelmetAmenity(nameOrDesc)) {
    return 0; // Helmets are always FREE
  }

  // 1. Direct Catalog Match
  const catalogMatch = AMENITIES_CATALOG.find(item => 
    item.name.toLowerCase() === nameOrDesc.toLowerCase() ||
    (item.nameEn && item.nameEn.toLowerCase() === nameOrDesc.toLowerCase()) ||
    nameOrDesc.toLowerCase().includes(item.name.toLowerCase()) ||
    item.name.toLowerCase().includes(nameOrDesc.toLowerCase()) ||
    (item.nameEn && item.nameEn.toLowerCase().includes(nameOrDesc.toLowerCase())) ||
    (item.nameEn && nameOrDesc.toLowerCase().includes(item.nameEn.toLowerCase()))
  );

  if (catalogMatch) {
    return isTourist ? (catalogMatch.touristPrice ?? Math.round(catalogMatch.price * 1.15)) : catalogMatch.price;
  }

  // 2. Keyword-based matching for custom user entries (10฿ - 50฿ base)
  const text = nameOrDesc.toLowerCase();
  let basePrice = 20;

  if (text.includes('กล้อง') || text.includes('ถ่ายวิดีโอ') || text.includes('4k') || text.includes('action cam') || text.includes('video') || text.includes('gopro')) {
    basePrice = 50;
  } else if (text.includes('เบาะอุ่น') || text.includes('ความร้อน') || text.includes('heated') || text.includes('warm')) {
    basePrice = 45;
  } else if (text.includes('เสื้อการ์ด') || text.includes('เสื้อเกราะ') || text.includes('armor') || text.includes('ce level') || text.includes('jacket')) {
    basePrice = 40;
  } else if (text.includes('สัตว์เลี้ยง') || text.includes('หมา') || text.includes('แมว') || text.includes('pet') || text.includes('กระเป๋าข้าง') || text.includes('pannier') || text.includes('bag')) {
    basePrice = 35;
  } else if (text.includes('นวด') || text.includes('massage') || text.includes('กล่องโฟม') || text.includes('ความเย็น') || text.includes('cooler')) {
    basePrice = 30;
  } else if (text.includes('ชาร์จไร้สาย') || text.includes('magsafe') || text.includes('เจล') || text.includes('intercom') || text.includes('คุยกับคนขับ') || text.includes('wireless') || text.includes('cushion')) {
    basePrice = 25;
  } else if (text.includes('ชาร์จ') || text.includes('สายชาร์จ') || text.includes('รองเท้า') || text.includes('สายรัด') || text.includes('สัมภาระ') || text.includes('u-box') || text.includes('charger') || text.includes('cable') || text.includes('strap')) {
    basePrice = 20;
  } else if (text.includes('เพลง') || text.includes('dj') || text.includes('ฝน') || text.includes('ร่ม') || text.includes('แว่น') || text.includes('n95') || text.includes('หน้ากาก') || text.includes('music') || text.includes('rain') || text.includes('umbrella') || text.includes('glasses') || text.includes('mask')) {
    basePrice = 15;
  } else if (text.includes('ผ้าเย็น') || text.includes('น้ำดื่ม') || text.includes('น้ำ') || text.includes('ยาดม') || text.includes('ที่พักเท้า') || text.includes('ขอแขวน') || text.includes('towel') || text.includes('water') || text.includes('inhaler') || text.includes('fresh')) {
    basePrice = 10;
  }

  return isTourist ? Math.round(basePrice * 1.16) : basePrice;
}

/**
 * Resolves an amenity description/string to a structured SelectedAmenityItem
 */
export function parseAmenityItem(rawText: string, isTourist: boolean = false): SelectedAmenityItem {
  const trimmed = rawText.trim();
  const isHelmet = isHelmetAmenity(trimmed);
  const price = getAmenityPrice(trimmed, isTourist);
  
  // Find matching catalog entry
  const catalogMatch = AMENITIES_CATALOG.find(item => 
    trimmed.toLowerCase().includes(item.name.toLowerCase()) || 
    item.name.toLowerCase().includes(trimmed.toLowerCase()) ||
    (item.nameEn && trimmed.toLowerCase().includes(item.nameEn.toLowerCase())) ||
    (item.nameEn && item.nameEn.toLowerCase().includes(trimmed.toLowerCase()))
  );

  return {
    id: catalogMatch ? catalogMatch.id : `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: isTourist && catalogMatch?.nameEn ? catalogMatch.nameEn : trimmed,
    nameEn: catalogMatch?.nameEn,
    price: price,
    touristPrice: isTourist ? price : (catalogMatch?.touristPrice ?? Math.round(price * 1.15)),
    isHelmet: isHelmet,
    icon: catalogMatch ? catalogMatch.icon : (isHelmet ? '🪖' : '✨')
  };
}

/**
 * Calculate total amenities cost and provide parsed item breakdown from comma-separated string or array
 */
export function calculateAmenitiesSummary(input: string | string[], isTourist: boolean = false): {
  totalPrice: number;
  items: SelectedAmenityItem[];
  helmetCount: number;
  paidCount: number;
} {
  let list: string[] = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string' && input.trim()) {
    list = input.split(',').map(s => s.trim()).filter(Boolean);
  }

  const items: SelectedAmenityItem[] = [];
  let totalPrice = 0;
  let helmetCount = 0;
  let paidCount = 0;

  list.forEach(str => {
    if (!str) return;
    const parsed = parseAmenityItem(str, isTourist);
    items.push(parsed);
    totalPrice += parsed.price;
    if (parsed.isHelmet) {
      helmetCount++;
    } else {
      paidCount++;
    }
  });

  return {
    totalPrice,
    items,
    helmetCount,
    paidCount
  };
}
