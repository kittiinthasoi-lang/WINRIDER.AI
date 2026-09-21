export interface PetHospitalClinic {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  phoneNumber: string;
  rating: number | null;
  reviewsCount: number;
  openNow: boolean | null;
  openHours: string[];
  is24Hours: boolean;
  googleMapsUri: string;
  routeSource: 'google_routes_api_live' | null;
}

export interface NearbyPetCareResponse {
  places: PetHospitalClinic[];
  source: string;
  origin: { latitude: number; longitude: number };
  fetchedAt: string;
  error?: string;
}

export const WIN_PET_CARE_REQUIREMENTS = {
  equipmentRequired: [
    'กล่องใส่สัตว์เลี้ยง WIN-Pet Climate Pod',
    'สายรัดนิรภัย Pet Safety Harness',
    'แผ่นรองซับและอุปกรณ์ทำความสะอาดปลอดภัยต่อสัตว์',
    'ผ่านการอบรมปฐมพยาบาลสัตว์เลี้ยงเบื้องต้น',
  ],
  serviceHighlights: [
    'พี่วินผู้รับงาน WIN-Pet Care ต้องผ่านการคัดเลือกและการอบรมโดยแอดมิน พร้อมใช้อุปกรณ์ขนส่งสัตว์เลี้ยงตามมาตรฐาน',
    'ต้องติดตั้งอุปกรณ์ขนส่งสัตว์เลี้ยงที่ผ่านการตรวจสอบ',
    'ระยะทางและเวลาเดินทางต้องมาจาก Google Routes ตาม GPS ปัจจุบัน',
  ],
};
