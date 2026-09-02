export interface RouteWaypoint {
  id: string;
  name: string;
  nameEn: string;
  type: 'pickup' | 'turn_left' | 'turn_right' | 'straight' | 'bridge' | 'narrow_soi' | 'traffic_light' | 'destination';
  coord: { x: number; y: number }; // percentage 0 - 100 on map plane
  instructionThai: string;
  instructionEn: string;
  distanceFromPrevM: number;
  speedLimitKmH: number;
  landmarkNote: string;
  warningNote?: string;
}

export interface BangkokComplexRoute {
  id: string;
  name: string;
  category: 'ci_capillary' | 'main_avenue' | 'flood_safe';
  badge: string;
  distanceKm: number;
  estMinutes: number;
  trafficLevel: 'clear' | 'moderate' | 'heavy' | 'jammed';
  trafficAvoidancePercent: number;
  batteryCostPercent: number;
  co2SavedGrams: number;
  points: { x: number; y: number }[];
  svgPathD: string;
  color: string;
  glowColor: string;
  waypoints: RouteWaypoint[];
  description: string;
}

export interface MapLandmark3D {
  id: string;
  name: string;
  nameEn: string;
  type: 'mall' | 'office_tower' | 'condo' | 'win_hub' | 'ev_station' | 'bts_station' | 'hospital' | 'canal_pier';
  x: number; // percentage
  y: number; // percentage
  width: number;
  height: number;
  depth: number;
  floors: number;
  color: string;
  accentColor: string;
  hasHelipad?: boolean;
  hasLedBillboard?: boolean;
}

export interface MapInfrastructurePoint {
  id: string;
  type: 'win_station' | 'ev_swap' | 'traffic_light' | 'flood_sensor' | 'cctv_beacon' | 'speed_bump';
  name: string;
  x: number;
  y: number;
  status: 'active' | 'warning' | 'standby';
  detail: string;
}

// 1. COMPLEX ROUTE OPTIONS (Sukhumvit 39 to Exchange Tower Asoke)
export const BANGKOK_COMPLEX_ROUTES: BangkokComplexRoute[] = [
  {
    id: 'route-ci-capillary',
    name: 'เส้นทางลัดเส้นเลือดฝอย CI Map (ซอยทะลุเลี่ยงรถติด)',
    category: 'ci_capillary',
    badge: '⚡ เร็วสุด • ลัด 94%',
    distanceKm: 2.1,
    estMinutes: 4.2,
    trafficLevel: 'clear',
    trafficAvoidancePercent: 94,
    batteryCostPercent: 4.5,
    co2SavedGrams: 320,
    color: '#00D2FF',
    glowColor: 'rgba(0, 210, 255, 0.8)',
    description: 'ลัดเข้าซอยพร้อมจิตต์ ข้ามสะพานคลองแสนแสบ ทะลุซอยสวัสดี (สุขุมวิท 31) และประสานมิตร (สุขุมวิท 23) สู่ตึก Exchange Tower โดยไม่ติดแยกอโศก',
    points: [
      { x: 14, y: 82 }, // Start: วิน BTS พร้อมพงษ์ ปากซอย 39
      { x: 22, y: 72 }, // เข้าซอยสุขุมวิท 39
      { x: 30, y: 68 }, // แยกซอยพร้อมจิตต์
      { x: 38, y: 58 }, // สะพานข้ามคลองแสนแสบ (ไม้/เหล็ก)
      { x: 44, y: 52 }, // ซอยสวัสดี (สุขุมวิท 31)
      { x: 54, y: 44 }, // ซอยประสานมิตร (สุขุมวิท 23)
      { x: 68, y: 34 }, // เลี่ยงแยกอโศกมนตรี
      { x: 78, y: 24 }, // ทางเชื่อมใต้ดินตึก Exchange
      { x: 86, y: 16 }  // Destination: Exchange Tower
    ],
    svgPathD: 'M 14 82 C 18 78, 22 72, 22 72 L 30 68 C 34 64, 38 58, 38 58 L 44 52 C 48 48, 54 44, 54 44 L 68 34 C 74 28, 78 24, 78 24 L 86 16',
    waypoints: [
      {
        id: 'wp-1',
        name: 'วินมอเตอร์ไซค์ BTS พร้อมพงษ์',
        nameEn: 'BTS Phrom Phong Win Stand',
        type: 'pickup',
        coord: { x: 14, y: 82 },
        instructionThai: 'ออกจากจุดรับผู้โดยสาร ปากซอยสุขุมวิท 39',
        instructionEn: 'Start from Phrom Phong Win Hub, enter Soi 39',
        distanceFromPrevM: 0,
        speedLimitKmH: 30,
        landmarkNote: 'หน้าศูนย์การค้า EmQuartier',
      },
      {
        id: 'wp-2',
        name: 'แยกเลี้ยวซ้าย ซอยพร้อมจิตต์',
        nameEn: 'Left Turn into Soi Phrom Chit',
        type: 'turn_left',
        coord: { x: 30, y: 68 },
        instructionThai: 'อีก 120 ม. เลี้ยวซ้ายเข้าซอยพร้อมจิตต์ (ช่องทางลัดมอเตอร์ไซค์)',
        instructionEn: 'Turn left into Soi Phrom Chit capillary alley',
        distanceFromPrevM: 350,
        speedLimitKmH: 35,
        landmarkNote: 'ซอยกว้าง 2.2 ม. รถยนต์ผ่านไม่ได้ มอเตอร์ไซค์คล่องตัว',
        warningNote: 'ระวังคนเดินเท้าในซอยแคบ'
      },
      {
        id: 'wp-3',
        name: 'สะพานเหล็กข้ามคลองแสนแสบ',
        nameEn: 'Khlong Saen Saep Motorbike Bridge',
        type: 'bridge',
        coord: { x: 38, y: 58 },
        instructionThai: 'ข้ามสะพานคลองแสนแสบ ชะลอความเร็วเข้าสู่ซอยสุขุมวิท 31',
        instructionEn: 'Cross Saen Saep canal bridge into Soi 31',
        distanceFromPrevM: 420,
        speedLimitKmH: 25,
        landmarkNote: 'ท่าเรือด่วนคลองแสนแสบ อโศก-พร้อมพงษ์',
        warningNote: 'สะพานต่างระดับ ชะลอความเร็ว'
      },
      {
        id: 'wp-4',
        name: 'ซอยสวัสดี ทะลุซอยประสานมิตร (สุขุมวิท 23)',
        nameEn: 'Soi Sawasdee to Prasanmit (Soi 23)',
        type: 'turn_right',
        coord: { x: 54, y: 44 },
        instructionThai: 'เลี้ยวขวาลัดทะลุ มศว. ประสานมิตร สู่ซอยสุขุมวิท 23',
        instructionEn: 'Turn right through SWU Prasanmit shortcut',
        distanceFromPrevM: 580,
        speedLimitKmH: 40,
        landmarkNote: 'ผ่านตึก Sino-Thai และโรงเรียนประสานมิตร'
      },
      {
        id: 'wp-5',
        name: 'ทางลัดหลังตึก Jasmine City',
        nameEn: 'Jasmine City Rear Access Lane',
        type: 'straight',
        coord: { x: 68, y: 34 },
        instructionThai: 'ตรงไปตามแนวหลังอาคาร Jasmine City เลี่ยงแยกไฟแดงอโศก',
        instructionEn: 'Straight along Jasmine City rear lane avoiding red light',
        distanceFromPrevM: 450,
        speedLimitKmH: 45,
        landmarkNote: 'จุดติดตั้งเซ็นเซอร์ 5G CI Beacon #08'
      },
      {
        id: 'wp-6',
        name: 'อาคาร Exchange Tower อโศก (จุดหมายปลายทาง)',
        nameEn: 'Exchange Tower Asoke (Destination)',
        type: 'destination',
        coord: { x: 86, y: 16 },
        instructionThai: 'ถึงจุดส่งผู้โดยสาร ลานจอดหน้า Exchange Tower',
        instructionEn: 'Arrived at Exchange Tower drop-off point',
        distanceFromPrevM: 300,
        speedLimitKmH: 20,
        landmarkNote: 'จุดเชื่อมต่อ Skywalk BTS อโศก / MRT สุขุมวิท'
      }
    ]
  },
  {
    id: 'route-main-avenue',
    name: 'ถนนใหญ่สายหลักสุขุมวิท-อโศกมนตรี',
    category: 'main_avenue',
    badge: '🛣️ ถนนใหญ่ • ติดไฟแดง 3 แยก',
    distanceKm: 3.4,
    estMinutes: 14.8,
    trafficLevel: 'heavy',
    trafficAvoidancePercent: 32,
    batteryCostPercent: 8.2,
    co2SavedGrams: 110,
    color: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.8)',
    description: 'วิ่งตรงตามถนนสุขุมวิท ผ่านสถานี BTS พร้อมพงษ์ เข้าสู่แยกอโศกมนตรี (รถติดสะสมไฟแดง 12 นาที)',
    points: [
      { x: 14, y: 82 },
      { x: 28, y: 82 },
      { x: 45, y: 82 },
      { x: 64, y: 82 }, // แยกอโศกมนตรี (ติดไฟแดง)
      { x: 64, y: 55 },
      { x: 64, y: 30 },
      { x: 76, y: 22 },
      { x: 86, y: 16 }
    ],
    svgPathD: 'M 14 82 L 64 82 L 64 26 L 86 16',
    waypoints: [
      {
        id: 'wp-m1',
        name: 'ถนนสุขุมวิทขาเข้า',
        nameEn: 'Sukhumvit Main Rd (Inbound)',
        type: 'pickup',
        coord: { x: 14, y: 82 },
        instructionThai: 'วิ่งตรงบนถนนสุขุมวิทมุ่งหน้าแยกอโศก',
        instructionEn: 'Head straight on Sukhumvit Road toward Asoke',
        distanceFromPrevM: 0,
        speedLimitKmH: 50,
        landmarkNote: 'ใต้แนวรางรถไฟฟ้า BTS สายสุขุมวิท'
      },
      {
        id: 'wp-m2',
        name: 'แยกอโศกมนตรี (จุดตัดสุขุมวิท 21)',
        nameEn: 'Asoke Montri Intersection',
        type: 'traffic_light',
        coord: { x: 64, y: 82 },
        instructionThai: 'รอสัญญาณไฟจราจรแยกอโศก เลี้ยวขวาเข้าถนนอโศกมนตรี',
        instructionEn: 'Wait at Asoke traffic light, turn right',
        distanceFromPrevM: 1600,
        speedLimitKmH: 15,
        landmarkNote: 'หน้าห้าง Terminal 21',
        warningNote: 'การจราจรติดขัดสะสม 8-12 นาที'
      },
      {
        id: 'wp-m3',
        name: 'อาคาร Exchange Tower อโศก',
        nameEn: 'Exchange Tower Dropoff',
        type: 'destination',
        coord: { x: 86, y: 16 },
        instructionThai: 'เลี้ยวซ้ายเข้าลานส่งผู้โดยสาร Exchange Tower',
        instructionEn: 'Turn left into Exchange Tower drop-off bay',
        distanceFromPrevM: 1800,
        speedLimitKmH: 20,
        landmarkNote: 'หน้าทางขึ้นบันไดเลื่อน BTS อโศก'
      }
    ]
  },
  {
    id: 'route-flood-safe',
    name: 'เส้นทางยกระดับเซฟตี้ (เลี่ยงน้ำท่วม & ฝนตกหนัก)',
    category: 'flood_safe',
    badge: '🌊 ปลอดภัย • ทางยกระดับ',
    distanceKm: 2.8,
    estMinutes: 6.5,
    trafficLevel: 'moderate',
    trafficAvoidancePercent: 82,
    batteryCostPercent: 5.6,
    co2SavedGrams: 260,
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    description: 'ใช้สะพานลอยยกระดับและแนวถนนดอนเมืองโทลล์เวย์เชื่อมต่อ ไม่ผ่านจุดต่ำน้ำขังในซอยต่ำ',
    points: [
      { x: 14, y: 82 },
      { x: 26, y: 70 },
      { x: 38, y: 48 },
      { x: 50, y: 32 },
      { x: 70, y: 20 },
      { x: 86, y: 16 }
    ],
    svgPathD: 'M 14 82 Q 30 55 50 32 T 86 16',
    waypoints: [
      {
        id: 'wp-f1',
        name: 'ทางลาดขึ้นสะพานยกระดับข้ามคลอง',
        nameEn: 'Elevated Flyover Ramp',
        type: 'bridge',
        coord: { x: 38, y: 48 },
        instructionThai: 'ขึ้นสะพานยกระดับ ระดับความสูง +4.5 ม. ปลอดน้ำท่วม 100%',
        instructionEn: 'Ascend elevated bridge +4.5m flood-free',
        distanceFromPrevM: 900,
        speedLimitKmH: 45,
        landmarkNote: 'ระบบเซ็นเซอร์ระดับน้ำ WIN Water Gauge ตรวจสอบแล้ว'
      },
      {
        id: 'wp-f2',
        name: 'อาคาร Exchange Tower อโศก',
        nameEn: 'Exchange Tower Asoke',
        type: 'destination',
        coord: { x: 86, y: 16 },
        instructionThai: 'ลงสะพานยกระดับเข้าสู่จุดหมายปลายทาง',
        instructionEn: 'Descend to destination',
        distanceFromPrevM: 1900,
        speedLimitKmH: 25,
        landmarkNote: 'ทางเข้าในร่ม'
      }
    ]
  }
];

// 2. 3D DETAILED BUILDINGS & ARCHITECTURAL LANDMARKS
export const BANGKOK_3D_LANDMARKS: MapLandmark3D[] = [
  {
    id: 'emquartier',
    name: 'ดิ เอ็มควอเทียร์ (EmQuartier)',
    nameEn: 'EmQuartier Mega Mall',
    type: 'mall',
    x: 16,
    y: 75,
    width: 58,
    height: 48,
    depth: 55,
    floors: 12,
    color: '#00D2FF',
    accentColor: '#38BDF8',
    hasLedBillboard: true
  },
  {
    id: 'emporium',
    name: 'ดิ เอ็มโพเรียม (Emporium)',
    nameEn: 'The Emporium Luxury Mall',
    type: 'mall',
    x: 10,
    y: 88,
    width: 50,
    height: 42,
    depth: 45,
    floors: 9,
    color: '#F59E0B',
    accentColor: '#FCD34D'
  },
  {
    id: 'terminal21',
    name: 'เทอร์มินอล 21 อโศก (Terminal 21)',
    nameEn: 'Terminal 21 Asoke',
    type: 'mall',
    x: 60,
    y: 68,
    width: 62,
    height: 55,
    depth: 60,
    floors: 14,
    color: '#EC4899',
    accentColor: '#F472B6',
    hasHelipad: true,
    hasLedBillboard: true
  },
  {
    id: 'exchange-tower',
    name: 'อาคารเอ็กซ์เชนจ์ ทาวเวอร์ (Exchange Tower)',
    nameEn: 'Exchange Tower Prime Asoke',
    type: 'office_tower',
    x: 82,
    y: 18,
    width: 68,
    height: 60,
    depth: 85,
    floors: 24,
    color: '#FFD700',
    accentColor: '#FDE047',
    hasHelipad: true
  },
  {
    id: 'interchange21',
    name: 'อินเตอร์เชนจ์ 21 (Interchange 21)',
    nameEn: 'Interchange 21 Tower',
    type: 'office_tower',
    x: 74,
    y: 42,
    width: 52,
    height: 46,
    depth: 70,
    floors: 18,
    color: '#3B82F6',
    accentColor: '#60A5FA'
  },
  {
    id: 'jasmine-city',
    name: 'จัสมิน ซิตี้ อโศก (Jasmine City)',
    nameEn: 'Jasmine City Complex',
    type: 'office_tower',
    x: 62,
    y: 28,
    width: 44,
    height: 40,
    depth: 50,
    floors: 13,
    color: '#8B5CF6',
    accentColor: '#A78BFA'
  },
  {
    id: 'sino-thai',
    name: 'ซิโน-ไทย ทาวเวอร์ (Sino-Thai Tower)',
    nameEn: 'Sino-Thai Engineering Tower',
    type: 'office_tower',
    x: 48,
    y: 36,
    width: 42,
    height: 38,
    depth: 54,
    floors: 15,
    color: '#10B981',
    accentColor: '#34D399'
  },
  {
    id: 'condo-phromchit',
    name: 'พร้อมมิตร สวีทส์ (Phromchit Suites)',
    nameEn: 'Phromchit Luxury Suites',
    type: 'condo',
    x: 32,
    y: 56,
    width: 36,
    height: 32,
    depth: 42,
    floors: 10,
    color: '#06B6D4',
    accentColor: '#22D3EE'
  },
  {
    id: 'swu-prasanmit',
    name: 'มศว ประสานมิตร (SWU University)',
    nameEn: 'Srinakharinwirot University',
    type: 'office_tower',
    x: 45,
    y: 18,
    width: 58,
    height: 35,
    depth: 38,
    floors: 8,
    color: '#F97316',
    accentColor: '#FB923C'
  }
];

// 3. MICRO-INFRASTRUCTURE BEACONS & STATIONS
export const BANGKOK_MAP_INFRASTRUCTURE: MapInfrastructurePoint[] = [
  {
    id: 'win-phromphong',
    type: 'win_station',
    name: 'ซุ้มวินอัศวิน BTS พร้อมพงษ์ (Hub 01)',
    x: 15,
    y: 84,
    status: 'active',
    detail: 'มีอัศวินสแตนด์บาย 14 คัน • EV Fast-Charge พร้อม'
  },
  {
    id: 'win-prasanmit',
    type: 'win_station',
    name: 'ซุ้มวิน มศว ประสานมิตร (Hub 04)',
    x: 52,
    y: 42,
    status: 'active',
    detail: 'จุดเชื่อมต่อสายลัดคลองแสนแสบ'
  },
  {
    id: 'ev-swap-soi39',
    type: 'ev_swap',
    name: 'ตู้สลับแบตเตอรี่ WIN EV Swap #09',
    x: 26,
    y: 74,
    status: 'active',
    detail: 'แบตเตอรี่พร้อมใช้งาน 8/8 ก้อน (สลับใน 60 วินาที)'
  },
  {
    id: 'ev-swap-asoke',
    type: 'ev_swap',
    name: 'ตู้สลับแบตเตอรี่ Exchange Tower #02',
    x: 84,
    y: 22,
    status: 'active',
    detail: 'สแตนด์บาย 10/10 ก้อน • แผงโซลาร์เซลล์ 100%'
  },
  {
    id: 'traffic-light-asoke',
    type: 'traffic_light',
    name: 'สัญญาณไฟแยกอโศกมนตรี',
    x: 64,
    y: 82,
    status: 'warning',
    detail: 'ไฟแดงเหลือ 85 วินาที • รถติดสะสมหนาแน่น'
  },
  {
    id: 'flood-gauge-saensaep',
    type: 'flood_sensor',
    name: 'เซ็นเซอร์ตรวจวัดระดับน้ำ คลองแสนแสบ',
    x: 39,
    y: 56,
    status: 'active',
    detail: 'ระดับน้ำปกติ: -1.2 ม. จากตลิ่ง • ทางลัดแห้งสนิท'
  },
  {
    id: 'cctv-5g-beacon-23',
    type: 'cctv_beacon',
    name: 'เสา 5G Smart CCTV ซอยสุขุมวิท 23',
    x: 66,
    y: 36,
    status: 'active',
    detail: 'AI สแกนสภาพถนน 4K Real-time • ความปลอดภัย 100%'
  }
];
