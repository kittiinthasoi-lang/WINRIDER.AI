import { ARManeuverType } from '../components/ARLiveCameraNavigation';
import { Radar3DPing } from '../components/ThreeDimensionalDriverRadar';

export interface RadarNavStep {
  stepIndex: number;
  instruction: string;
  maneuver: ARManeuverType;
  distanceMeters: number;
  streetName: string;
  targetCoord: { lat: number; lng: number };
}

export interface RadarNavRoute {
  id: string;
  destinationName: string;
  destinationCategory: string;
  destinationAddress: string;
  targetCoord: { lat: number; lng: number; radarX: number; radarY: number };
  totalDistanceMeters: number;
  totalDurationMinutes: number;
  routeType: string;
  ecoScore: string;
  steps: RadarNavStep[];
  radarPolyline: { x: number; y: number }[];
}

/**
 * High-precision Haversine Distance Formula in Meters
 */
export function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Curated Capillary Alleyway Routes across Bangkok
 */
export const CAPILLARY_PRESET_ROUTES: RadarNavRoute[] = [
  {
    id: 'route-vanich-2',
    destinationName: 'ตรอกวานิช 2 (สำเพ็ง - สัมพันธวงศ์)',
    destinationCategory: 'ซอยลัดจักรยานสีขาว',
    destinationAddress: 'ตรอกวานิช 2 แขวงสัมพันธวงศ์ เขตสัมพันธวงศ์ กรุงเทพฯ',
    targetCoord: { lat: 13.7412, lng: 100.5054, radarX: -45, radarY: -65 },
    totalDistanceMeters: 1200,
    totalDurationMinutes: 4,
    routeType: 'เส้นทางซอยลัดจักรยานสีขาว (หลบเลี่ยงถนนใหญ่)',
    ecoScore: 'ปลอดมลพิษ 100% • ประหยัดเวลา 12 นาที',
    radarPolyline: [
      { x: 180, y: 180 },
      { x: 165, y: 155 },
      { x: 145, y: 125 },
      { x: 128, y: 95 },
      { x: 108, y: 76 }
    ],
    steps: [
      {
        stepIndex: 0,
        instruction: 'ตรงไปตามซอยเจริญนคร 14 อีก 150 ม.',
        maneuver: 'straight',
        distanceMeters: 150,
        streetName: 'ซอยเจริญนคร 14',
        targetCoord: { lat: 13.7245, lng: 100.4990 }
      },
      {
        stepIndex: 1,
        instruction: 'อีก 80 ม. เลี้ยวซ้ายเข้าตรอกวานิช 2',
        maneuver: 'turn_left',
        distanceMeters: 80,
        streetName: 'ตรอกวานิช 2',
        targetCoord: { lat: 13.7290, lng: 100.5015 }
      },
      {
        stepIndex: 2,
        instruction: 'ตรงไปตามตรอกวานิช 2 อีก 350 ม. (ทางเดินชุมชนริมน้ำ ระวังคนเดินเท้า)',
        maneuver: 'straight',
        distanceMeters: 350,
        streetName: 'ตรอกวานิช 2',
        targetCoord: { lat: 13.7350, lng: 100.5035 }
      },
      {
        stepIndex: 3,
        instruction: 'เลี้ยวขวาข้ามสะพานเข้าสู่ถนนสัมพันธวงศ์ อีก 120 ม.',
        maneuver: 'turn_right',
        distanceMeters: 120,
        streetName: 'ถนนทรงวาด - สัมพันธวงศ์',
        targetCoord: { lat: 13.7390, lng: 100.5048 }
      },
      {
        stepIndex: 4,
        instruction: 'คุณได้เดินทางถึงจุดหมาย ตรอกวานิช 2 สำเพ็ง เรียบร้อยแล้วค่ะ',
        maneuver: 'arrived',
        distanceMeters: 0,
        streetName: 'ตรอกวานิช 2 สำเพ็ง',
        targetCoord: { lat: 13.7412, lng: 100.5054 }
      }
    ]
  },
  {
    id: 'route-issaraphap-33',
    destinationName: 'ซอยอิสรภาพ 33 (ท่าพระ - ตลาดพลู)',
    destinationCategory: 'ซอยลัดฝั่งธนบุรี',
    destinationAddress: 'ซอยอิสรภาพ 33 แขวงวัดกัลยาณ์ เขตธนบุรี กรุงเทพฯ',
    targetCoord: { lat: 13.7228, lng: 100.4875, radarX: -60, radarY: 45 },
    totalDistanceMeters: 1850,
    totalDurationMinutes: 6,
    routeType: 'เส้นทางซอยลัดจักรยานสีขาว (ลัดเลาะตลาดพลู)',
    ecoScore: 'ปลอดมลพิษ 98% • เลี่ยงไฟแดง 3 จุด',
    radarPolyline: [
      { x: 180, y: 180 },
      { x: 155, y: 200 },
      { x: 125, y: 225 },
      { x: 95, y: 245 },
      { x: 84, y: 252 }
    ],
    steps: [
      {
        stepIndex: 0,
        instruction: 'ตรงไปตามถนนเจริญนคร มุ่งหน้าวงเวียนใหญ่ อีก 200 ม.',
        maneuver: 'straight',
        distanceMeters: 200,
        streetName: 'ถนนสมเด็จพระเจ้าตากสิน',
        targetCoord: { lat: 13.7240, lng: 100.4950 }
      },
      {
        stepIndex: 1,
        instruction: 'อีก 90 ม. เลี้ยวขวาเข้าซอยลาดหญ้า 12',
        maneuver: 'turn_right',
        distanceMeters: 90,
        streetName: 'ซอยลาดหญ้า 12',
        targetCoord: { lat: 13.7235, lng: 100.4920 }
      },
      {
        stepIndex: 2,
        instruction: 'เลี้ยวซ้ายเข้าตรอกวัดเวฬุราชิณ สู่ซอยอิสรภาพ 33 อีก 280 ม.',
        maneuver: 'turn_left',
        distanceMeters: 280,
        streetName: 'ซอยอิสรภาพ 33',
        targetCoord: { lat: 13.7230, lng: 100.4890 }
      },
      {
        stepIndex: 3,
        instruction: 'คุณได้เดินทางถึงจุดหมาย ซอยอิสรภาพ 33 ตลาดพลู เรียบร้อยแล้วค่ะ',
        maneuver: 'arrived',
        distanceMeters: 0,
        streetName: 'ซอยอิสรภาพ 33',
        targetCoord: { lat: 13.7228, lng: 100.4875 }
      }
    ]
  },
  {
    id: 'route-sukhumvit-39',
    destinationName: 'ซอยสุขุมวิท 39 (BTS พร้อมพงษ์)',
    destinationCategory: 'ซอยลัดเชื่อมต่อสุขุมวิท-ทองหล่อ',
    destinationAddress: 'ซอยสุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ',
    targetCoord: { lat: 13.7314, lng: 100.5700, radarX: 55, radarY: -50 },
    totalDistanceMeters: 3400,
    totalDurationMinutes: 11,
    routeType: 'เส้นทางซอยลัดทะลุสาทร-สุขุมวิท',
    ecoScore: 'ประหยัดเวลา 15 นาที • เลี่ยงรถติดอโศก',
    radarPolyline: [
      { x: 180, y: 180 },
      { x: 210, y: 155 },
      { x: 235, y: 130 },
      { x: 255, y: 110 },
      { x: 268, y: 100 }
    ],
    steps: [
      {
        stepIndex: 0,
        instruction: 'ข้ามสะพานสมเด็จพระเจ้าตากสิน มุ่งหน้าสาทร ตรงไป 500 ม.',
        maneuver: 'straight',
        distanceMeters: 500,
        streetName: 'สะพานตากสิน - สาทร',
        targetCoord: { lat: 13.7210, lng: 100.5150 }
      },
      {
        stepIndex: 1,
        instruction: 'ชิดซ้ายเข้าถนนวิทยุ สู่ซอยลัดสุขุมวิท อีก 250 ม.',
        maneuver: 'slight_left',
        distanceMeters: 250,
        streetName: 'ถนนวิทยุ',
        targetCoord: { lat: 13.7280, lng: 100.5450 }
      },
      {
        stepIndex: 2,
        instruction: 'อีก 100 ม. เลี้ยวขวาเข้าซอยสุขุมวิท 39 ข้างศูนย์การค้าเอ็มควอเทียร์',
        maneuver: 'turn_right',
        distanceMeters: 100,
        streetName: 'สุขุมวิท 39',
        targetCoord: { lat: 13.7310, lng: 100.5690 }
      },
      {
        stepIndex: 3,
        instruction: 'คุณได้เดินทางถึงจุดหมาย ซอยสุขุมวิท 39 (BTS พร้อมพงษ์) เรียบร้อยแล้วค่ะ',
        maneuver: 'arrived',
        distanceMeters: 0,
        streetName: 'สุขุมวิท 39 (พร้อมพงษ์)',
        targetCoord: { lat: 13.7314, lng: 100.5700 }
      }
    ]
  },
  {
    id: 'route-ideo-sathorn',
    destinationName: 'ไอดีโอ สาทร-วงเวียนใหญ่ (จุดรับลูกค้า)',
    destinationCategory: 'คอนโดมิเนียม & ขนส่งด่วน',
    destinationAddress: 'ถนนกรุงธนบุรี แขวงคลองต้นไทร เขตคลองสาน กรุงเทพฯ',
    targetCoord: { lat: 13.7225, lng: 100.4950, radarX: -36, radarY: -42 },
    totalDistanceMeters: 250,
    totalDurationMinutes: 2,
    routeType: 'เส้นทางรับลูกค้าใกล้สุด (250 ม.)',
    ecoScore: 'ประหยัดเวลา • รถไม่ติด',
    radarPolyline: [
      { x: 180, y: 180 },
      { x: 160, y: 160 },
      { x: 140, y: 135 },
      { x: 122, y: 113 }
    ],
    steps: [
      {
        stepIndex: 0,
        instruction: 'ตรงไปตามซอยเจริญนคร 14 อีก 100 ม.',
        maneuver: 'straight',
        distanceMeters: 100,
        streetName: 'ซอยเจริญนคร 14',
        targetCoord: { lat: 13.7230, lng: 100.4965 }
      },
      {
        stepIndex: 1,
        instruction: 'เลี้ยวซ้ายเข้าถนนกรุงธนบุรี มุ่งสู่หน้าคอนโด ไอดีโอ',
        maneuver: 'turn_left',
        distanceMeters: 80,
        streetName: 'ถนนกรุงธนบุรี',
        targetCoord: { lat: 13.7225, lng: 100.4950 }
      },
      {
        stepIndex: 2,
        instruction: 'ถึงจุดนัดพบลูกค้า ไอดีโอ สาทร-วงเวียนใหญ่ เรียบร้อยแล้วค่ะ',
        maneuver: 'arrived',
        distanceMeters: 0,
        streetName: 'ไอดีโอ สาทร-วงเวียนใหญ่',
        targetCoord: { lat: 13.7225, lng: 100.4950 }
      }
    ]
  },
  {
    id: 'route-mosque-bangluang',
    destinationName: 'มัสยิดบางหลวง (กุฎีขาว คลองสาน)',
    destinationCategory: 'WIN Spirit ศาสนกิจ',
    destinationAddress: 'ซอยกุฎีขาว ถนนอรุณอมรินทร์ เขตธนบุรี กรุงเทพฯ',
    targetCoord: { lat: 13.7360, lng: 100.4920, radarX: 48, radarY: 36 },
    totalDistanceMeters: 350,
    totalDurationMinutes: 2,
    routeType: 'เส้นทางซอยลัดวัฒนธรรมและศาสนกิจ',
    ecoScore: 'ขับนุ่มนวล • ซอยสงบ',
    radarPolyline: [
      { x: 180, y: 180 },
      { x: 200, y: 195 },
      { x: 228, y: 215 },
      { x: 257, y: 238 }
    ],
    steps: [
      {
        stepIndex: 0,
        instruction: 'มุ่งหน้าทางซอยกุฎีขาว ตรงไป 120 ม.',
        maneuver: 'straight',
        distanceMeters: 120,
        streetName: 'ซอยกุฎีขาว',
        targetCoord: { lat: 13.7300, lng: 100.4930 }
      },
      {
        stepIndex: 1,
        instruction: 'เลี้ยวขวาเข้าทางเดินริมคลองบางหลวง อีก 150 ม.',
        maneuver: 'turn_right',
        distanceMeters: 150,
        streetName: 'ทางเดินริมคลองบางหลวง',
        targetCoord: { lat: 13.7340, lng: 100.4925 }
      },
      {
        stepIndex: 2,
        instruction: 'ถึงมัสยิดบางหลวง (กุฎีขาว) เรียบร้อยแล้วค่ะ',
        maneuver: 'arrived',
        distanceMeters: 0,
        streetName: 'มัสยิดบางหลวง',
        targetCoord: { lat: 13.7360, lng: 100.4920 }
      }
    ]
  }
];

/**
 * Generate a dynamic navigation route to any floating 3D radar ping
 */
export function generateRouteToPing(ping: Radar3DPing, currentLat: number, currentLng: number): RadarNavRoute {
  // Convert ping x (-100..100) and y (-100..100) to SVG canvas coordinate (360x360, center at 180,180)
  const targetSvgX = 180 + (ping.x / 100) * 160;
  const targetSvgY = 180 + (ping.y / 100) * 160;

  // Intermediate waypoint for organic alley turn
  const midX = (180 + targetSvgX) / 2 + (ping.x > 0 ? -15 : 15);
  const midY = (180 + targetSvgY) / 2 + (ping.y > 0 ? -15 : 15);

  const approxLat = currentLat + (ping.y * 0.0001);
  const approxLng = currentLng + (ping.x * 0.0001);

  return {
    id: `route-${ping.id}`,
    destinationName: `${ping.name} (${ping.location})`,
    destinationCategory: ping.categoryLabel,
    destinationAddress: `${ping.location} (ห่าง ${ping.distanceMeters} ม.)`,
    targetCoord: { lat: approxLat, lng: approxLng, radarX: ping.x, radarY: ping.y },
    totalDistanceMeters: ping.distanceMeters,
    totalDurationMinutes: Math.max(2, Math.round(ping.distanceMeters / 300)),
    routeType: `เส้นทางตรงสู่เป้าหมาย (${ping.service})`,
    ecoScore: 'ซอยลัดจักรยานสีขาว ปลอดมลพิษ',
    radarPolyline: [
      { x: 180, y: 180 },
      { x: midX, y: midY },
      { x: targetSvgX, y: targetSvgY }
    ],
    steps: [
      {
        stepIndex: 0,
        instruction: `มุ่งหน้าไปตามซอยลัดตรงไป ${Math.round(ping.distanceMeters * 0.4)} ม.`,
        maneuver: 'straight',
        distanceMeters: Math.round(ping.distanceMeters * 0.4),
        streetName: 'ซอยลัดเชื่อมต่อ',
        targetCoord: { lat: currentLat + (ping.y * 0.00004), lng: currentLng + (ping.x * 0.00004) }
      },
      {
        stepIndex: 1,
        instruction: ping.x < 0 
          ? `อีก ${Math.round(ping.distanceMeters * 0.3)} ม. เลี้ยวซ้ายเข้าซอยปลายทาง`
          : `อีก ${Math.round(ping.distanceMeters * 0.3)} ม. เลี้ยวขวาเข้าซอยปลายทาง`,
        maneuver: ping.x < 0 ? 'turn_left' : 'turn_right',
        distanceMeters: Math.round(ping.distanceMeters * 0.3),
        streetName: ping.location,
        targetCoord: { lat: currentLat + (ping.y * 0.00007), lng: currentLng + (ping.x * 0.00007) }
      },
      {
        stepIndex: 2,
        instruction: `ถึงจุดหมายปลายทาง ${ping.name} เรียบร้อยแล้วค่ะ`,
        maneuver: 'arrived',
        distanceMeters: 0,
        streetName: ping.location,
        targetCoord: { lat: approxLat, lng: approxLng }
      }
    ]
  };
}
