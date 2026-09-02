export interface PetHospitalClinic {
  id: string;
  name: string;
  nameEn: string;
  type: 'emergency_24h' | 'hospital' | 'clinic' | 'specialist';
  typeBadge: string;
  categoryLabel: string;
  address: string;
  area: string;
  distanceKm: number;
  etaMinutes: number;
  phoneNumber: string;
  rating: number;
  reviewsCount: number;
  openHours: string;
  is24Hours: boolean;
  highlight: string;
  specialties: string[];
  petTypesSupported: string[];
  estimatedFare: number;
  icon: string;
  imageUrl?: string;
}

export const PET_HOSPITALS_AND_CLINICS: PetHospitalClinic[] = [
  {
    id: 'thonglor_24h',
    name: 'โรงพยาบาลสัตว์ทองหล่อ (สำนักงานใหญ่ 24 ชม.)',
    nameEn: 'Thonglor Pet Hospital (24 Hours HQ)',
    type: 'emergency_24h',
    typeBadge: '🚨 ฉุกเฉิน 24 ชม.',
    categoryLabel: 'โรงพยาบาลสัตว์ 24 ชม.',
    address: 'ซอยสุขุมวิท 55 (ทองหล่อ) แขวงคลองตันเหนือ เขตวัฒนา',
    area: 'สุขุมวิท 55 • ทองหล่อ',
    distanceKm: 1.8,
    etaMinutes: 4,
    phoneNumber: '02-712-6301',
    rating: 4.9,
    reviewsCount: 1420,
    openHours: 'เปิดตลอด 24 ชั่วโมง ทุกวัน (ไม่มีวันหยุด)',
    is24Hours: true,
    highlight: 'ศูนย์ดูแลวิกฤตและฉุกเฉิน ICU น้องหมาน้องแมว มีธนาคารเลือดและห้องผ่าตัดปลอดเชื้อมาตรฐานสากล',
    specialties: ['ฉุกเฉิน & ICU สัตว์เลี้ยง', 'ผ่าตัดส่องกล้อง', 'เอ็กซเรย์ดิจิทัล & CT Scan', 'สระว่ายน้ำกายภาพบำบัด', 'ตรวจหัวใจสัตว์เลี้ยง'],
    petTypesSupported: ['สุนัขทุกสายพันธุ์', 'แมว', 'Exotic Pets (กระต่าย/นก/สัตว์พิเศษ)'],
    estimatedFare: 85,
    icon: '🏥'
  },
  {
    id: 'chula_small_animal',
    name: 'โรงพยาบาลสัตว์เล็ก จุฬาลงกรณ์มหาวิทยาลัย',
    nameEn: 'Chulalongkorn Small Animal Teaching Hospital',
    type: 'specialist',
    typeBadge: '🎓 ศูนย์การแพทย์เฉพาะทาง',
    categoryLabel: 'โรงพยาบาลมหาวิทยาลัย',
    address: 'ถนนอังรีดูนังต์ แขวงวังใหม่ เขตปทุมวัน กรุงเทพฯ',
    area: 'อังรีดูนังต์ • สยาม / ปทุมวัน',
    distanceKm: 3.4,
    etaMinutes: 7,
    phoneNumber: '02-218-9751',
    rating: 4.8,
    reviewsCount: 2310,
    openHours: '08:00 - 20:00 น. (มีคลินิกฉุกเฉินนอกเวลา)',
    is24Hours: false,
    highlight: 'ศูนย์รวมอาจารย์แพทย์สัตวแพทย์ผู้เชี่ยวชาญเฉพาะทางระดับประเทศ โรคซับซ้อน โรคมะเร็ง และโรคกระดูก',
    specialties: ['ศูนย์โรคหัวใจสัตว์เลี้ยง', 'ศูนย์รักษามะเร็งและเคมีบำบัด', 'ศูนย์จักษุและสายตาสัตว์', 'ทันตกรรมสัตว์เลี้ยง'],
    petTypesSupported: ['สุนัข', 'แมว', 'สัตว์เลี้ยงพิเศษ Exotic'],
    estimatedFare: 110,
    icon: '🏛️'
  },
  {
    id: 'phyathai7_pet_24h',
    name: 'โรงพยาบาลสัตว์พญาไท 7 (ฝั่งธนบุรี 24 ชม.)',
    nameEn: 'Phyathai 7 Pet Emergency Hospital',
    type: 'emergency_24h',
    typeBadge: '🚨 ฉุกเฉิน 24 ชม.',
    categoryLabel: 'โรงพยาบาลสัตว์ 24 ชม.',
    address: 'ถนนเพชรเกษม แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ',
    area: 'เพชรเกษม • ฝั่งธนบุรี / วงเวียนใหญ่',
    distanceKm: 2.1,
    etaMinutes: 5,
    phoneNumber: '02-868-7777',
    rating: 4.9,
    reviewsCount: 890,
    openHours: 'เปิดบริการ 24 ชั่วโมง ทุกวัน',
    is24Hours: true,
    highlight: 'มีหน่วยรถพยาบาลสัตว์เลี้ยงฉุกเฉิน ห้องผ่าตัดกระดูกและระบบประสาท และแผนกฟื้นฟูกายภาพบำบัด',
    specialties: ['ผ่าตัดระบบประสาทและกระดูก', 'ICU ตู้ออกซิเจนกู้ชีพ', 'ฝากดูแลสัตว์ป่วยวิกฤต', 'กายภาพบำบัดด้วยเลเซอร์'],
    petTypesSupported: ['สุนัข', 'แมว', 'สัตว์เลี้ยงขนาดเล็ก'],
    estimatedFare: 75,
    icon: '🚑'
  },
  {
    id: 'ivet_rama9_24h',
    name: 'โรงพยาบาลสัตว์ไอเว็ท พระราม 9 (iVET 24H)',
    nameEn: 'iVET Animal Hospital Rama 9',
    type: 'emergency_24h',
    typeBadge: '🚨 ฉุกเฉิน 24 ชม.',
    categoryLabel: 'โรงพยาบาลสัตว์ 24 ชม.',
    address: 'ถนนพระราม 9 แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ',
    area: 'พระราม 9 • เอกมัย / ห้วยขวาง',
    distanceKm: 2.9,
    etaMinutes: 6,
    phoneNumber: '02-641-5525',
    rating: 4.7,
    reviewsCount: 760,
    openHours: 'เปิดตลอด 24 ชั่วโมง',
    is24Hours: true,
    highlight: 'ล้ำหน้าด้วยเครื่อง MRI และ CT Scan สำหรับสัตว์เลี้ยง ศูนย์สเต็มเซลล์และศัลยกรรมระบบหลอดเลือด',
    specialties: ['สแกน MRI / CT Scan', 'ศูนย์โรคไตและฟอกเลือดสัตว์เลี้ยง', 'สเต็มเซลล์บำบัด', 'ตรวจอัลตราซาวด์ 4D'],
    petTypesSupported: ['สุนัข', 'แมว', 'สัตว์แปลก Exotic'],
    estimatedFare: 95,
    icon: '🔬'
  },
  {
    id: 'sukhumvit39_4legs_clinic',
    name: 'คลินิกสัตวแพทย์สี่ขา เพ็ทแคร์ (4-Legs Sukhumvit 39)',
    nameEn: '4-Legs Pet Clinic Sukhumvit 39',
    type: 'clinic',
    typeBadge: '🩺 คลินิกใกล้บ้าน',
    categoryLabel: 'คลินิกรักษาสัตว์',
    address: 'ซอยสุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา',
    area: 'สุขุมวิท 39 • พร้อมพงษ์',
    distanceKm: 0.9,
    etaMinutes: 2,
    phoneNumber: '02-258-4411',
    rating: 4.9,
    reviewsCount: 520,
    openHours: '09:00 - 21:00 น. ทุกวัน',
    is24Hours: false,
    highlight: 'คลินิกอบอุ่นใจกลางสุขุมวิท เชี่ยวชาญการตรวจสุขภาพ ฉีดวัคซีน กำจัดเห็บหมัด และบริการตัดขนกรูมมิ่งสัตว์เลี้ยง',
    specialties: ['ตรวจสุขภาพประจำปี', 'ฉีดวัคซีนครบวงจร', 'ทำหมันสุนัขและแมว', 'กรูมมิ่ง & สปาสัตว์เลี้ยง', 'ขูดหินปูน'],
    petTypesSupported: ['สุนัข', 'แมว'],
    estimatedFare: 55,
    icon: '🐾'
  },
  {
    id: 'pradipat_pet_24h',
    name: 'โรงพยาบาลสัตว์ประดิพัทธ์ (24 ชม. สะพานควาย)',
    nameEn: 'Pradipat Pet Hospital (24 Hours)',
    type: 'emergency_24h',
    typeBadge: '🚨 ฉุกเฉิน 24 ชม.',
    categoryLabel: 'โรงพยาบาลสัตว์ 24 ชม.',
    address: 'ถนนประดิพัทธ์ แขวงพญาไท เขตพญาไท กรุงเทพฯ',
    area: 'ประดิพัทธ์ • สะพานควาย / อารีย์',
    distanceKm: 4.2,
    etaMinutes: 9,
    phoneNumber: '02-278-5555',
    rating: 4.8,
    reviewsCount: 1150,
    openHours: 'เปิดตลอด 24 ชั่วโมง',
    is24Hours: true,
    highlight: 'ศูนย์ธนาคารเลือดสุนัขและแมวฉุกเฉิน ตู้อบปรับความดันออกซิเจนบำบัด และแผนกแยกโรคติดต่อสัตว์เลี้ยง',
    specialties: ['ธนาคารเลือดสัตว์เลี้ยง', 'ตู้อบปรับความดัน Hyperbaric', 'ศูนย์รักษาโรคผิวหนัง', 'แผนกแยกโรคติดเชื้อ'],
    petTypesSupported: ['สุนัข', 'แมว', 'กระต่าย'],
    estimatedFare: 125,
    icon: '🩸'
  },
  {
    id: 'thonburi_thaphra_pet',
    name: 'โรงพยาบาลสัตว์ธนบุรี-ท่าพระ',
    nameEn: 'Thonburi Thaphra Pet Hospital',
    type: 'hospital',
    typeBadge: '🏥 โรงพยาบาลสัตว์ครบวงจร',
    categoryLabel: 'โรงพยาบาลสัตว์',
    address: 'ถนนรัชดาภิเษก แขวงดาวคะนอง เขตธนบุรี กรุงเทพฯ',
    area: 'ท่าพระ • รัชดาภิเษก / ตลาดพลู',
    distanceKm: 1.6,
    etaMinutes: 3,
    phoneNumber: '02-457-3300',
    rating: 4.8,
    reviewsCount: 640,
    openHours: '08:30 - 22:00 น. ทุกวัน',
    is24Hours: false,
    highlight: 'ห้องปฏิบัติการตรวจเลือดรู้ผลใน 15 นาที แผนกฝากเลี้ยงปรับอากาศ และมีสัตวแพทย์ดูแลตลอดคืน',
    specialties: ['ตรวจเลือดด่วน 15 นาที', 'อัลตราซาวด์ช่องท้อง', 'โรงแรมสัตว์เลี้ยงติดแอร์', 'ผ่าตัดคลอดฉุกเฉิน'],
    petTypesSupported: ['สุนัข', 'แมว', 'นกและสัตว์ฟันแทะ'],
    estimatedFare: 65,
    icon: '🏨'
  }
];

export const WIN_PET_CARE_REQUIREMENTS = {
  minDriverLevel: 10,
  minDriverRank: 'Bronze Knight (อัศวินทองแดง) ขึ้นไป',
  equipmentRequired: [
    'กล่องใส่สัตว์เลี้ยง WIN-Pet Climate Pod (แคปซูลปรับอากาศทรงโดม)',
    'สายรัดนิรภัยดูดซับแรงกระแทก Pet Safety Harness',
    'ชุดแผ่นรองซับอนามัยและสเปรย์ฆ่าเชื้อออร์แกนิก ปลอดภัยต่อน้อง',
    'ผ่านการอบรม First-Aid ปฐมพยาบาลสัตว์เลี้ยงเบื้องต้น'
  ],
  serviceHighlights: [
    'พี่วินทุกคนต้องผ่านเกณฑ์ Level 10+ เท่านั้น เพื่อรับประกันความใจเย็นและชำนาญเส้นทาง',
    'มีม่านกันลมและช่องระบายอากาศปรับอุณหภูมิ ไม่ทำให้สัตว์เลี้ยงเมารถหรือตื่นตกใจ',
    'ระบบ CI Map ช่วยเลี่ยงถนนลูกรังและทางขรุขระ เพื่อการขับขี่ที่นุ่มนวลที่สุด'
  ]
};
