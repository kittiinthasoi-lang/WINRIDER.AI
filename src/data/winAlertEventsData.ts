export interface WinAlertEvent {
  id: string;
  title: string;
  category: 'mall_sale' | 'popup_market' | 'concert' | 'food_fest' | 'flash_deal' | 'traffic_alert';
  categoryLabel: string;
  categoryBadgeColor: string;
  categoryIcon: string;
  venueName: string;
  venueArea: string;
  distanceKm: number;
  bannerImage: string;
  emoji: string;
  startDate: string;
  endDate: string;
  timeRange: string;
  remainingTimeText: string;
  discountOrPerk: string;
  description: string;
  highlights: string[];
  expectedCrowdDensity: 'medium' | 'high' | 'very_high';
  winRiderPromoCode: string;
  suggestedPickupPoint: string;
  isTrending: boolean;
}

export const WIN_ALERT_EVENTS: WinAlertEvent[] = [
  {
    id: 'event-01',
    title: 'ICONSIAM Mega Mid-Year Luxury Sale 70% Off',
    category: 'mall_sale',
    categoryLabel: '🏬 มิดเยียร์เซลล์ห้างใหญ่',
    categoryBadgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    categoryIcon: '🏬',
    venueName: 'ไอคอนสยาม (ICONSIAM Riverside)',
    venueArea: 'ถนนเจริญนคร คลองสาน',
    distanceKm: 1.8,
    bannerImage: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80',
    emoji: '🛍️',
    startDate: 'วันนี้',
    endDate: '31 ส.ค. 2026',
    timeRange: '10:00 - 22:00 น.',
    remainingTimeText: 'เหลืออีก 3 วันสุดท้าย',
    discountOrPerk: 'ลดสูงสุด 70% + สมาชิก WIN รับคูปองกาแฟฟรี',
    description: 'มหกรรมลดราคาสินค้าแบรนด์เนมและไลฟ์สไตล์ริมแม่น้ำเจ้าพระยา พร้อมจุดจอดรับส่งพิเศษของ WIN Knight หน้าประตู 4',
    highlights: ['แบรนด์ชั้นนำลดทั้งศูนย์การค้า', 'จุดจอด WIN VIP Fast Lane หน้าห้าง', 'ส่วนลดค่าโดยสารขากลับ 20 บาท'],
    expectedCrowdDensity: 'very_high',
    winRiderPromoCode: 'ICONWIN20',
    suggestedPickupPoint: 'ประตูทางออก 4 (ริมแม่น้ำฝั่งเจริญนคร)',
    isTrending: true
  },
  {
    id: 'event-02',
    title: 'ตลาดนัดป๊อปอัพ คลองสานวินเทจ & สตรีทฟู้ดไนท์',
    category: 'popup_market',
    categoryLabel: '🎪 ตลาดป๊อปอัพ & วินเทจ',
    categoryBadgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    categoryIcon: '🎪',
    venueName: 'ลาน The Jam Factory & เจริญรัถ',
    venueArea: 'คลองสาน - แม่น้ำเจ้าพระยา',
    distanceKm: 2.2,
    bannerImage: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80',
    emoji: '🎨',
    startDate: 'วันนี้',
    endDate: 'คืนนี้',
    timeRange: '16:00 - 23:30 น.',
    remainingTimeText: 'กำลังจัดงาน (เปิดถึง 23:30 น.)',
    discountOrPerk: 'ช้อปครบ 300฿ รับแต้ม WIN XP x2',
    description: 'รวมร้านค้างานคราฟต์ งานศิลปะ เสื้อผ้ามือสองวินเทจ และอาหารสตรีทฟู้ดมากกว่า 80 บูธ ดนตรีสดริมน้ำ',
    highlights: ['ดนตรีสดแจ๊ส & อะคูสติกริมแม่น้ำ', 'สตรีทฟู้ดเจ้าดังฝั่งธนบุรี', 'ที่จอดรถเต็ม! แนะนำนั่งวินเข้าถึงหน้างาน'],
    expectedCrowdDensity: 'high',
    winRiderPromoCode: 'VINTAGEWIN',
    suggestedPickupPoint: 'หน้าปากซอยเจริญนคร 1',
    isTrending: true
  },
  {
    id: 'event-03',
    title: 'เทศกาลอาหารเยาวราช Street Food Extravaganza',
    category: 'food_fest',
    categoryLabel: '🍜 เทศกาลอาหารเยาวราช',
    categoryBadgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    categoryIcon: '🍜',
    venueName: 'ถนนเยาวราช (ปิดถนนคนเดิน)',
    venueArea: 'เยาวราช - สัมพันธวงศ์',
    distanceKm: 3.5,
    bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    emoji: '🥟',
    startDate: 'ทุกวันศุกร์-อาทิตย์',
    endDate: 'ตลอดเดือนนี้',
    timeRange: '18:00 - 01:00 น.',
    remainingTimeText: 'เริ่มค่ำนี้ 18:00 น.',
    discountOrPerk: 'ส่งอาหารถึงบ้านค่าส่งเริ่มต้น 15฿',
    description: 'รวมสตรีทฟู้ดระดับมิชลินไกด์ บะหมี่มังกรขาว ก๋วยจั๊บนายเอ็ก ขนมปังปิ้งเจ้าเด็ดเยาวราช นั่งวินฝ่ารถติดเข้าถึงหน้าร้านได้ทันใจ',
    highlights: ['มิชลินสตรีทฟู้ดกว่า 25 ร้าน', 'เลี่ยงรถติดเยาวราช 100% ด้วยมอเตอร์ไซค์', 'อัศวิน WIN รับหิ้วส่งด่วน'],
    expectedCrowdDensity: 'very_high',
    winRiderPromoCode: 'YAOWARATWIN',
    suggestedPickupPoint: 'MRT วัดมังกร ทางออก 1',
    isTrending: true
  },
  {
    id: 'event-04',
    title: 'Siam Square Flash Pop-up K-Pop & Sneaker Festival',
    category: 'flash_deal',
    categoryLabel: '⚡ ป๊อปอัพสยามสแควร์',
    categoryBadgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    categoryIcon: '⚡',
    venueName: 'Siam Square Walking Street',
    venueArea: 'ปทุมวัน - สยาม',
    distanceKm: 4.1,
    bannerImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
    emoji: '👟',
    startDate: 'สุดสัปดาห์นี้',
    endDate: 'วันอาทิตย์นี้',
    timeRange: '13:00 - 21:00 น.',
    remainingTimeText: 'งานสตรีทแฟชั่นแห่งปี',
    discountOrPerk: 'สุ่มแจกสนีกเกอร์รุ่นลิมิเต็ด + ทริปฟรี',
    description: 'งานรวมตัวคอมมูนิตี้สตรีทแวร์ บูธสินค้าแฟชั่น และการแสดง Random Dance ใจกลางสยามสแควร์',
    highlights: ['เปิดตัวรองเท้า Limited Edition', 'สตรีทแดนซ์โชว์', 'จุดเชื่อมต่อ BTS สยาม / สนามกีฬา'],
    expectedCrowdDensity: 'high',
    winRiderPromoCode: 'SIAMWIN15',
    suggestedPickupPoint: 'Siam Scape ลาน Drop-off ชั้น 1',
    isTrending: false
  },
  {
    id: 'event-05',
    title: 'คอนเสิร์ตใหญ่ Impact Super Arena (ขากลับไม่ติด)',
    category: 'concert',
    categoryLabel: '🎤 คอนเสิร์ต & ดนตรีสด',
    categoryBadgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    categoryIcon: '🎤',
    venueName: 'อิมแพ็ค อารีน่า เมืองทองธานี',
    venueArea: 'แจ้งวัฒนะ - ปากเกร็ด',
    distanceKm: 16.5,
    bannerImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    emoji: '🎸',
    startDate: 'เสาร์-อาทิตย์นี้',
    endDate: 'จบงาน 23:30 น.',
    timeRange: '17:00 - 23:30 น.',
    remainingTimeText: 'จองรถรับขากลับล่วงหน้าได้แล้ว',
    discountOrPerk: 'อัศวินสแตนด์บายขากลับ รับประกันมีรถ 100%',
    description: 'หมดปัญหาติดแหง็กในเมืองทองธานีหลังคอนเสิร์ตเลิก บริการฝูงบิน WIN Express & Knight สแตนด์บายรอรับออกถนนใหญ่ทันที',
    highlights: ['จุดรับเฉพาะอัศวิน WIN ไม่ติดในลานจอด', 'ออกสู่ทางด่วนรวดเร็ว', 'จองทริปคู่หูเดินทางปลอดภัย'],
    expectedCrowdDensity: 'very_high',
    winRiderPromoCode: 'CONCERTWIN',
    suggestedPickupPoint: 'อาคาร Impact Challenger อาคาร 2 ชั้น 1',
    isTrending: true
  }
];
