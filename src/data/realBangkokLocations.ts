// Source: Google Maps Platform Code Assist
// Real Bangkok Places Database with Real GPS Coordinates & Google Maps Routing Generator

export interface RealBangkokLocation {
  id: string;
  name: string;
  thaiName: string;
  zone: 'siam_sukhumvit' | 'silom_sathorn' | 'thonburi_wongwian' | 'ratchada_rama9' | 'ari_chatuchak' | 'pinklao_siriraj' | 'bangna_samutprakan';
  zoneTitle: string;
  category: 'transit' | 'mall' | 'office' | 'hospital' | 'condo' | 'temple' | 'market';
  lat: number;
  lng: number;
  addressTh: string;
  landmarkNote: string;
}

export const REAL_BANGKOK_LOCATIONS: RealBangkokLocation[] = [
  // 1. SIAM & SUKHUMVIT
  {
    id: 'bkk-siam-paragon',
    name: 'Siam Paragon',
    thaiName: 'สยามพารากอน (ประตูหน้า ถ.พระราม 1)',
    zone: 'siam_sukhumvit',
    zoneTitle: 'สยาม - สุขุมวิท',
    category: 'mall',
    lat: 13.7466,
    lng: 100.5348,
    addressTh: '991 ถนนพระรามที่ 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ',
    landmarkNote: 'รอตรงทางเชื่อม BTS สยาม ประตู 3'
  },
  {
    id: 'bkk-bts-asok',
    name: 'BTS Asok / MRT Sukhumvit',
    thaiName: 'BTS อโศก / MRT สุขุมวิท (Exchange Tower)',
    zone: 'siam_sukhumvit',
    zoneTitle: 'สยาม - สุขุมวิท',
    category: 'transit',
    lat: 13.7369,
    lng: 100.5614,
    addressTh: 'แยกอโศกมนตรี ถนนสุขุมวิท 21 คลองเตยเหนือ วัฒนา กรุงเทพฯ',
    landmarkNote: 'รอหน้าบันไดเลื่อน BTS ทางออก 6'
  },
  {
    id: 'bkk-emquartier',
    name: 'The EmQuartier & EmSphere',
    thaiName: 'เอ็มควอเทียร์ / เอ็มสเฟียร์ (สุขุมวิท 35-39)',
    zone: 'siam_sukhumvit',
    zoneTitle: 'สยาม - สุขุมวิท',
    category: 'mall',
    lat: 13.7314,
    lng: 100.5698,
    addressTh: '693 ถนนสุขุมวิท แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ',
    landmarkNote: 'รอตรงจุด Drop-off ด้านหน้า Waterfall Quartier'
  },
  {
    id: 'bkk-thonglor-eight',
    name: 'Eight Thonglor',
    thaiName: 'เอท ทองหล่อ (ซอยสุขุมวิท 55)',
    zone: 'siam_sukhumvit',
    zoneTitle: 'สยาม - สุขุมวิท',
    category: 'condo',
    lat: 13.7319,
    lng: 100.5815,
    addressTh: '88/36 สุขุมวิท 55 (ทองหล่อ) แขวงคลองตันเหนือ วัฒนา กรุงเทพฯ',
    landmarkNote: 'รอหน้าทางเข้าสตาร์บัคส์ริมถนนทองหล่อ'
  },

  // 2. SILOM & SATHORN
  {
    id: 'bkk-sathorn-square',
    name: 'Sathorn Square Office Tower',
    thaiName: 'อาคารสาทรสแควร์ (BTS ช่องนนทรี)',
    zone: 'silom_sathorn',
    zoneTitle: 'สีลม - สาทร',
    category: 'office',
    lat: 13.7228,
    lng: 100.5292,
    addressTh: '98 ถนนสาทรเหนือ แขวงสีลม เขตบางรัก กรุงเทพฯ',
    landmarkNote: 'รอหน้าล็อบบี้เสาแดงทางออกเชื่อมสกายวอล์ค'
  },
  {
    id: 'bkk-silom-complex',
    name: 'Silom Complex',
    thaiName: 'สีลมคอมเพล็กซ์ (BTS ศาลาแดง / MRT สีลม)',
    zone: 'silom_sathorn',
    zoneTitle: 'สีลม - สาทร',
    category: 'mall',
    lat: 13.7282,
    lng: 100.5342,
    addressTh: '191 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ',
    landmarkNote: 'รอหน้าประตูทางเข้าฝั่งถนนสีลม'
  },
  {
    id: 'bkk-chula-hospital',
    name: 'King Chulalongkorn Memorial Hospital',
    thaiName: 'โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย (ตึก ภปร.)',
    zone: 'silom_sathorn',
    zoneTitle: 'สีลม - สาทร',
    category: 'hospital',
    lat: 13.7323,
    lng: 100.5359,
    addressTh: '1874 ถนนพระรามที่ 4 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ',
    landmarkNote: 'รอตรงจุดรับส่งผู้โดยสารหน้าอาคาร ภปร.'
  },

  // 3. THONBURI & WONGWIAN YAI
  {
    id: 'bkk-iconsiam',
    name: 'ICONSIAM & ICS Tower',
    thaiName: 'ไอคอนสยาม (ริมแม่น้ำเจ้าพระยา ถ.เจริญนคร)',
    zone: 'thonburi_wongwian',
    zoneTitle: 'ฝั่งธนบุรี - วงเวียนใหญ่ - ไอคอนสยาม',
    category: 'mall',
    lat: 13.7267,
    lng: 100.5107,
    addressTh: '299 ถนนเจริญนคร แขวงคลองต้นไทร เขตคลองสาน กรุงเทพฯ',
    landmarkNote: 'รอประตูทางออกลานริเวอร์พาร์ค ท่าเรือ 1'
  },
  {
    id: 'bkk-wongwian-yai-statue',
    name: 'King Taksin Monument (Wongwian Yai)',
    thaiName: 'วงเวียนใหญ่ (อนุสาวรีย์สมเด็จพระเจ้าตากสิน)',
    zone: 'thonburi_wongwian',
    zoneTitle: 'ฝั่งธนบุรี - วงเวียนใหญ่ - ไอคอนสยาม',
    category: 'transit',
    lat: 13.7258,
    lng: 100.4939,
    addressTh: 'ถนนประชาธิปก-ลาดหญ้า แขวงบางยี่เรือ เขตธนบุรี กรุงเทพฯ',
    landmarkNote: 'รอตรงวินปากซอยลาดหญ้า 2'
  },
  {
    id: 'bkk-wat-arun',
    name: 'Wat Arun (Temple of Dawn)',
    thaiName: 'วัดอรุณราชวรารามราชวรมหาวิหาร (พระปรางค์วัดอรุณ)',
    zone: 'thonburi_wongwian',
    zoneTitle: 'ฝั่งธนบุรี - วงเวียนใหญ่ - ไอคอนสยาม',
    category: 'temple',
    lat: 13.7437,
    lng: 100.4889,
    addressTh: '158 ถนนวังเดิม แขวงวัดอรุณ เขตบางกอกใหญ่ กรุงเทพฯ',
    landmarkNote: 'รอหน้าซุ้มประตูทางเข้าฝั่งถนนวังเดิม'
  },
  {
    id: 'bkk-wat-paknam',
    name: 'Wat Paknam Phasi Charoen (Big Buddha)',
    thaiName: 'วัดปากน้ำ ภาษีเจริญ (พระพุทธธรรมกายเทพมงคลองค์ใหญ่)',
    zone: 'thonburi_wongwian',
    zoneTitle: 'ฝั่งธนบุรี - วงเวียนใหญ่ - ไอคอนสยาม',
    category: 'temple',
    lat: 13.7169,
    lng: 100.4704,
    addressTh: '300 ซอยรัชมงคลประสาธน์ แขวงปากคลองภาษีเจริญ ภาษีเจริญ กรุงเทพฯ',
    landmarkNote: 'รอหน้าพระมหาเจดีย์มหารัชมงคล'
  },

  // 4. RATCHADA & RAMA 9
  {
    id: 'bkk-central-rama9',
    name: 'Central Rama 9 & G Tower',
    thaiName: 'เซ็นทรัล พระราม 9 / อาคาร จี ทาวเวอร์ (MRT พระราม 9)',
    zone: 'ratchada_rama9',
    zoneTitle: 'รัชดา - พระราม 9',
    category: 'mall',
    lat: 13.7578,
    lng: 100.5658,
    addressTh: '9/9 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ',
    landmarkNote: 'รอทางออก MRT พระราม 9 ประตู 2'
  },
  {
    id: 'bkk-the-one-ratchada',
    name: 'The One Ratchada Market',
    thaiName: 'ตลาดดิวัน รัชดา (เอสพลานาด รัชดา)',
    zone: 'ratchada_rama9',
    zoneTitle: 'รัชดา - พระราม 9',
    category: 'market',
    lat: 13.7661,
    lng: 100.5701,
    addressTh: 'ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ',
    landmarkNote: 'รอริมถนนหน้าเอสพลานาด รัชดา'
  },

  // 5. ARI & CHATUCHAK
  {
    id: 'bkk-chatuchak-market',
    name: 'Chatuchak Weekend Market',
    thaiName: 'ตลาดนัดจตุจักร (MRT สวนจตุจักร / BTS หมอชิต)',
    zone: 'ari_chatuchak',
    zoneTitle: 'อารีย์ - สะพานควาย - จตุจักร',
    category: 'market',
    lat: 13.7999,
    lng: 100.5504,
    addressTh: '587/10 ถนนกำแพงเพชร 2 แขวงจตุจักร เขตจตุจักร กรุงเทพฯ',
    landmarkNote: 'รอหน้าหอนาฬิกา ประตู 3 ทางออก MRT'
  },
  {
    id: 'bkk-la-villa-ari',
    name: 'La Villa Ari',
    thaiName: 'ลา วิลล่า อารีย์ (BTS อารีย์ ซอย 1)',
    zone: 'ari_chatuchak',
    zoneTitle: 'อารีย์ - สะพานควาย - จตุจักร',
    category: 'mall',
    lat: 13.7797,
    lng: 100.5447,
    addressTh: '356 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ',
    landmarkNote: 'รอหน้าวิลล่ามาร์เก็ตชั้น 1 ติดถนนพหลโยธิน'
  },

  // 6. PINKLAO & SIRIRAJ
  {
    id: 'bkk-siriraj-hospital',
    name: 'Siriraj Hospital',
    thaiName: 'โรงพยาบาลศิริราช (ตึกอุบัติเหตุ / วังหลัง)',
    zone: 'pinklao_siriraj',
    zoneTitle: 'ปิ่นเกล้า - ศิริราช - วังหลัง',
    category: 'hospital',
    lat: 13.7578,
    lng: 100.4851,
    addressTh: '2 ถนนวังหลัง แขวงศิริราช เขตบางกอกน้อย กรุงเทพฯ',
    landmarkNote: 'รอหน้าประตู 8 ทางเข้าตึกนวมินทรบพิตร ๘๔ พรรษา'
  },
  {
    id: 'bkk-central-pinklao',
    name: 'Central Pinklao',
    thaiName: 'เซ็นทรัล ปิ่นเกล้า (ถนนบรมราชชนนี)',
    zone: 'pinklao_siriraj',
    zoneTitle: 'ปิ่นเกล้า - ศิริราช - วังหลัง',
    category: 'mall',
    lat: 13.7781,
    lng: 100.4764,
    addressTh: '7/222 ถนนบรมราชชนนี แขวงอรุณอมรินทร์ เขตบางกอกน้อย กรุงเทพฯ',
    landmarkNote: 'รอป้ายรถเมล์หน้าเซ็นทรัล ปิ่นเกล้า'
  },

  // 7. BANGNA
  {
    id: 'bkk-mega-bangna',
    name: 'Mega Bangna & IKEA',
    thaiName: 'เมกาบางนา / อิเกีย (บางนา-ตราด กม.8)',
    zone: 'bangna_samutprakan',
    zoneTitle: 'บางนา - ศรีนครินทร์',
    category: 'mall',
    lat: 13.6467,
    lng: 100.6806,
    addressTh: '39 หมู่ 6 ถนนบางนา-ตราด แขวงบางแก้ว อำเภอบางพลี สมุทรปราการ',
    landmarkNote: 'รอหน้า Main Entrance ลานน้ำพุ'
  }
];

// Service Definitions
export const REAL_SERVICE_PRESETS = [
  {
    id: 'knight',
    title: 'WIN KNIGHT (รับส่งด่วนเลี่ยงรถติด)',
    iconEmoji: '🛵',
    notes: [
      'รีบไปสัมภาษณ์งาน ขอลัดเลาะซอยไวๆ ค่ะ',
      'รอตรงทางออกตึก ใส่เสื้อเชิ้ตขาว กางเกงดำครับ',
      'ขี่ปลอดภัย ไม่ต้องซิ่งมาก มีหมวกกันน็อกพร้อมค่ะ',
      'รอตรงป้ายรถเมล์หน้าห้างเลยครับ มีสัมภาระ 1 ชิ้น'
    ]
  },
  {
    id: 'express',
    title: 'WIN Express (ส่งพัสดุ/อาหารด่วน + กล่อง 20฿)',
    iconEmoji: '📦 ⚡',
    notes: [
      'ส่งเอกสารสัญญาสำคัญ มีซองกันน้ำล็อคแน่นหนาครับ',
      'ส่งกล่องขนมเค้กวันเกิด ระวังหน้าเค้กเอียง ขอบคุณครับ',
      'ส่งพัสดุด่วนลูกค้ารอรับหน้าร้านอาหาร โทรแจ้งก่อนถึง 3 นาทีครับ'
    ]
  },
  {
    id: 'spirit',
    title: 'WIN Spirit (พาผู้สูงอายุ/ผู้ป่วยทำธุระ)',
    iconEmoji: '🧓 💙',
    notes: [
      'พาคุณยายไปตรวจตาที่โรงพยาบาล ช่วยประคองขึ้นลงรถหน่อยนะคะ',
      'พาคุณตาไปละหมาดวันศุกร์ที่มัสยิด ขับนุ่มนวลปลอดภัยครับ',
      'ผู้โดยสารมีไม้เท้าช่วยเดิน ขอพี่วินใจเย็น ขอบคุณมากๆ ค่ะ'
    ]
  },
  {
    id: 'mu',
    title: 'WIN MU BUDDY (ทริปไหว้พระสายมู 9 วัด)',
    iconEmoji: '🪷 ✨',
    notes: [
      'พาไปกราบท้าวเวสสุวรรณและขอพรพระแม่ลักษมี มีบทสวดพร้อมค่ะ',
      'ทริปไหว้พระวัดระฆังและวัดอรุณ ขอพี่วินที่ชำนาญเส้นทางฝั่งธนฯ ค่ะ'
    ]
  },
  {
    id: 'pet',
    title: 'WIN-Pet Care (ส่งน้องหมาแมวหาหมอ)',
    iconEmoji: '🐾 🏥',
    notes: [
      'น้องแมวอยู่ในกระเป๋าเดินทางเรียบร้อย พาไปฉีดวัคซีนประจำปีค่ะ',
      'พาน้องปอมไปตัดขนที่คลินิก ขอเปิดพัดลมกล่องระบายอากาศด้วยนะคะ'
    ]
  }
];

// Customer Names Pool
const THAI_CUSTOMERS = [
  { name: 'คุณณิชา รัตนเวช', gender: 'female' as const, avatar: '👩‍💼', phone: '089-445-1234' },
  { name: 'คุณธนภัทร สุขสมบูรณ์', gender: 'male' as const, avatar: '👨‍💼', phone: '081-772-8899' },
  { name: 'คุณแพรวา สายบุญ', gender: 'female' as const, avatar: '🧘‍♀️', phone: '095-223-8899' },
  { name: 'คุณลุงฮาซัน & คุณตาอิบราฮิม', gender: 'male' as const, avatar: '🧓', phone: '081-998-3344' },
  { name: 'คุณหมอทราย (คลินิกรักษาสัตว์)', gender: 'female' as const, avatar: '👩‍⚕️', phone: '083-112-9900' },
  { name: 'คุณกวิน สตาร์ทอัพเทค', gender: 'male' as const, avatar: '🧑‍💻', phone: '092-334-5566' },
  { name: 'น้องพิมพ์ใจ นักศึกษาจุฬาฯ', gender: 'female' as const, avatar: '👩‍🎓', phone: '084-556-7890' },
  { name: 'เชฟมานะ ร้านอาหารโฮมเมด', gender: 'male' as const, avatar: '👨‍🍳', phone: '086-771-4567' }
];

/**
 * Calculates straight line distance (Haversine formula in KM)
 */
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  // Multiply by road tortuosity factor (~1.35x for Bangkok's dense soi network)
  return Math.max(1.1, Number((straightKm * 1.35).toFixed(1)));
}

/**
 * Generate a Google Maps Universal Directions URL
 */
export function getGoogleMapsNavigationUrl(
  origin: number | string,
  destination: number | string,
  dropoffCoordOrLng?: number | { lat: number; lng: number },
  dropoffLng?: number
): string {
  if (typeof origin === 'number' && typeof destination === 'number' && typeof dropoffCoordOrLng === 'number' && typeof dropoffLng === 'number') {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin},${destination}&destination=${dropoffCoordOrLng},${dropoffLng}&travelmode=two_wheeler`;
  }
  if (typeof origin === 'string' && typeof destination === 'string') {
    const originEnc = encodeURIComponent(origin);
    const destEnc = encodeURIComponent(destination);
    return `https://www.google.com/maps/dir/?api=1&origin=${originEnc}&destination=${destEnc}&travelmode=two_wheeler`;
  }
  return `https://www.google.com/maps`;
}

/**
 * Real Job Generation Options
 */
export interface RealJobGenerateOptions {
  zone?: string;
  serviceId?: string;
  driverLat?: number;
  driverLng?: number;
}

/**
 * Generates a realistic dispatch job mapped directly to real Bangkok coordinates & Google Maps
 */
export function generateRealGoogleMapsJob(options?: RealJobGenerateOptions) {
  // 1. Pick locations
  let pool = REAL_BANGKOK_LOCATIONS;
  if (options?.zone && options.zone !== 'all') {
    const filtered = pool.filter(l => l.zone === options.zone);
    if (filtered.length >= 2) {
      pool = filtered;
    }
  }

  // Random pickup
  const pickupIdx = Math.floor(Math.random() * pool.length);
  const pickupLoc = pool[pickupIdx];

  // Random dropoff distinct from pickup
  const dropoffCandidates = REAL_BANGKOK_LOCATIONS.filter(l => l.id !== pickupLoc.id);
  const dropoffLoc = dropoffCandidates[Math.floor(Math.random() * dropoffCandidates.length)];

  // Calculate distance based on real GPS
  const distanceKm = calculateHaversineKm(pickupLoc.lat, pickupLoc.lng, dropoffLoc.lat, dropoffLoc.lng);

  // Driver proximity to pickup (0.15 - 0.55 km)
  const driverDistanceToPickupKm = Number((Math.random() * 0.35 + 0.15).toFixed(2));

  // Service Preset
  let service = REAL_SERVICE_PRESETS[0];
  if (options?.serviceId) {
    service = REAL_SERVICE_PRESETS.find(s => s.id === options.serviceId) || REAL_SERVICE_PRESETS[0];
  } else {
    service = REAL_SERVICE_PRESETS[Math.floor(Math.random() * REAL_SERVICE_PRESETS.length)];
  }

  // Customer
  const customer = THAI_CUSTOMERS[Math.floor(Math.random() * THAI_CUSTOMERS.length)];
  const note = `${pickupLoc.landmarkNote} • ${service.notes[Math.floor(Math.random() * service.notes.length)]}`;

  // Fare calculations (Bangkok Moto Win fair rates: ~35 base + 12/km, flat 1฿ platform fee)
  const baseRate = service.id === 'mu' ? 80 : service.id === 'pet' ? 70 : service.id === 'spirit' ? 65 : 35;
  const calculatedFare = Math.round(baseRate + distanceKm * 11);
  const tips = Math.random() > 0.4 ? [10, 15, 20, 30][Math.floor(Math.random() * 4)] : 0;
  const platformFee = 1; // Flat 1 THB platform fee
  const netFare = calculatedFare + tips - platformFee;
  const estMinutes = Math.max(5, Math.round(distanceKm * 2.6));
  const xpReward = Math.round(distanceKm * 35 + (service.id === 'spirit' || service.id === 'mu' ? 150 : 100));

  const googleMapsUrl = getGoogleMapsNavigationUrl(
    pickupLoc.lat,
    pickupLoc.lng,
    dropoffLoc.lat,
    dropoffLoc.lng
  );

  const jobId = `JOB-GMP-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    id: jobId,
    serviceId: service.id as any,
    serviceTitle: service.title,
    serviceIconEmoji: service.iconEmoji,
    customerName: customer.name,
    customerGender: customer.gender,
    customerRating: Number((4.85 + Math.random() * 0.15).toFixed(2)),
    customerPhone: customer.phone,
    customerAvatarEmoji: customer.avatar,
    customerNote: note,
    pickupLocation: pickupLoc.thaiName,
    dropoffLocation: dropoffLoc.thaiName,
    distanceKm,
    driverDistanceToPickupKm,
    fairDispatchQueueRank: 1,
    totalCandidatesInRadius: Math.floor(Math.random() * 5) + 3,
    estMinutes,
    baseFare: calculatedFare,
    tips,
    netFare,
    platformFee,
    xpReward,
    specialBadges: [
      `🗺️ Google Maps พิกัดจริง (${pickupLoc.zoneTitle})`,
      `📍 ห่างจากพี่วิน ${Math.round(driverDistanceToPickupKm * 1000)} ม.`,
      `⭐ อัตราค่าโดยสารเป็นธรรม (หักระบบแค่ ${platformFee}฿)`
    ],
    urgency: distanceKm > 6 ? 'normal' : 'high' as const,
    // Google Maps extra data
    pickupCoord: { lat: pickupLoc.lat, lng: pickupLoc.lng },
    dropoffCoord: { lat: dropoffLoc.lat, lng: dropoffLoc.lng },
    pickupAddressTh: pickupLoc.addressTh,
    dropoffAddressTh: dropoffLoc.addressTh,
    googleMapsUrl,
    zoneTitle: pickupLoc.zoneTitle
  };
}
