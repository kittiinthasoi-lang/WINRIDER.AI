import { MatchedDriver } from '../types';

/**
 * 28 Dedicated Sovereign Knight Drivers
 * 1:1 Direct Mapping with 28 Dream Ride Motorcycle Models
 * Every driver has a unique brand and model, certifications, and specialized skills!
 */
export const KNIGHT_DRIVERS_POOL: MatchedDriver[] = [
  // 1. DUCATI PANIGALE V4 S
  {
    id: 'kitti_100',
    name: 'กิตติ อินทะสร้อย',
    nameEn: 'Kitti Inthasoi',
    nickname: 'พี่กิตติ',
    gender: 'male',
    level: 100,
    tierName: 'GODLIKE SOVEREIGN 👑',
    rating: 5.00,
    totalTrips: 18450,
    phone: '081-999-8888',
    avatarEmoji: '🦁',
    vehicleModel: 'Ducati Panigale V4 S',
    plateNumber: '1กข 8888 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'อบรมการขับขี่ขั้นสูงระดับจักรพรรดิ (Godlike Pilot)',
      'อบรมการดูแลผู้สูงอายุและปฐมพยาบาล CPR (Elderly Care Master)',
      'อบรมความปลอดภัยเด็กและเยาวชน (Child Safety Certified)',
      'อบรมการดูแลผู้พิการทุกประเภท (Special Needs Care)',
      'กล่องเก็บความร้อน-เย็นนิรภัย Express Thermal Box',
      'เชี่ยวชาญเส้นทางตรอกซอกซอย CI Capillary Map 100%'
    ],
    specialtyTags: ['ทุกบริการ', 'รถในฝันสปอร์ต', 'ฉุกเฉินระดับ 1', 'VIP Chauffeur', 'WIN Express'],
    distanceKm: 0.3,
    etaMinutes: 2,
    bio: 'อัศวินระดับสูงสุด ผู้พิทักษ์เครือข่ายตรอกซอย ขับขี่นุ่มนวล มารยาทสุภาพ ปลอดภัยสูงสุด 100%',
    serviceMatchScore: 99
  },

  // 2. YAMAHA GRAND FILANO HYBRID
  {
    id: 'ploy_lady_18',
    name: 'ณิชาภัทร วรเดชสกุล (พลอย)',
    nameEn: 'Nichapat Voradejsakul (Ploy)',
    nickname: 'พี่พลอย',
    gender: 'female',
    level: 18,
    tierName: 'Gold Knight Sovereign 🌟',
    rating: 4.98,
    totalTrips: 3420,
    phone: '089-771-4545',
    avatarEmoji: '👩‍🦰',
    vehicleModel: 'Yamaha Grand Filano Hybrid Connected',
    plateNumber: '9กฮ 1234 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'พี่วินสุภาพสตรีผ่านการตรวจสอบประวัติอาชญากรรม 100%',
      'ผู้เชี่ยวชาญเส้นทางไหว้พระ 9 วัด & สายมู (Mu-Te-Lu Specialist)',
      'ไกด์แนะนำร้านอาหาร คาเฟ่ และถ่ายรูปเช็กอิน (Lifestyle Curator)',
      'กล่องนิรภัยใส่พัสดุ/อาหาร Win Express Box',
      'หมวกกันน็อกสุภาพสตรีสะอาด พร้อมหมวกคลุมผมอนามัยฟรี'
    ],
    specialtyTags: ['WIN MU BUDDY', 'WIN Lifestyle', 'WIN Express', 'ผู้โดยสารหญิง', 'สายมูวัดดัง'],
    distanceKm: 0.5,
    etaMinutes: 3,
    bio: 'พี่วินผู้หญิงใจดี ชำนาญเส้นทางไหว้พระขอพร คาเฟ่สวยๆ และร้านลับฝั่งธนบุรี เดินทางปลอดภัยสบายใจ',
    serviceMatchScore: 98
  },

  // 3. HONDA WAVE 125i
  {
    id: 'orn_lady_16',
    name: 'อรทัย รัตนโชติ (อร)',
    nameEn: 'Orathai Rattanachot (Orn)',
    nickname: 'พี่อร',
    gender: 'female',
    level: 16,
    tierName: 'Gold Knight 🌟',
    rating: 4.97,
    totalTrips: 2950,
    phone: '083-221-8899',
    avatarEmoji: '👩',
    vehicleModel: 'Honda Wave 125i',
    plateNumber: '6กข 7788 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'สุภาพสตรี เลเวล 16 ผ่านการอบรมมรรยาทและจิตบริการ',
      'เชี่ยวชาญการพาไปไหว้พระ ไหว้เจ้าแม่กวนอิม และขอพรพระแม่ลักษมี',
      'กล่องพัสดุด่วน Win Express สภาพสะอาดมาตรฐาน',
      'หมวกกันน็อกสุภาพสตรีฆ่าเชื้อ UV ทุกเช้า'
    ],
    specialtyTags: ['WIN MU BUDDY', 'WIN Spirit', 'WIN Express', 'ผู้โดยสารหญิง', 'สายมู'],
    distanceKm: 0.7,
    etaMinutes: 4,
    bio: 'สุภาพ เรียบร้อย ชำนาญการพาไปไหว้พระและศาลเจ้าชื่อดัง พร้อมช่วยจัดเตรียมของไหว้และบทสวด',
    serviceMatchScore: 97
  },

  // 4. HONDA PCX 160
  {
    id: 'fah_lady_22',
    name: 'ศิริพร สุวรรณรัตน์ (ฟ้า)',
    nameEn: 'Siriporn Suwanrat (Fah)',
    nickname: 'พี่ฟ้า',
    gender: 'female',
    level: 22,
    tierName: 'Platinum Sovereign 🛡️',
    rating: 5.00,
    totalTrips: 4900,
    phone: '086-444-9911',
    avatarEmoji: '👩‍⚕️',
    vehicleModel: 'Honda PCX 160',
    plateNumber: '4ขม 5566 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'พี่วินสุภาพสตรีระดับ Platinum เลเวล 22',
      'ผ่านการอบรมดูแลผู้สูงอายุและผู้พิการทุกประเภท (Special Care Certified)',
      'ผ่านการอบรมรับส่งเด็กนักเรียน (Child Care Safety)',
      'กล่องนิรภัย Win Express Thermal Box',
      'ที่ชาร์จโทรศัพท์ Fast Charge 65W บนรถ'
    ],
    specialtyTags: ['WIN Family', 'WIN Spirit', 'WIN Express', 'ดูแลผู้พิการ', 'รับส่งนักเรียน'],
    distanceKm: 0.4,
    etaMinutes: 2,
    bio: 'อัศวินหญิงเลเวล 22 ดูแลคุณแม่ น้องๆ นักเรียน และผู้พิการด้วยความอ่อนโยน ขับขี่ใจเย็น นุ่มนวล ไม่เร่งกระชาก',
    serviceMatchScore: 98
  },

  // 5. HONDA FORZA 350
  {
    id: 'santi_spirit_25',
    name: 'สันติ มหาวงศ์ (ลุงสันต์)',
    nameEn: 'Santi Mahawong (Uncle Sant)',
    nickname: 'ลุงสันต์',
    gender: 'male',
    level: 25,
    tierName: 'Platinum Sovereign 👴',
    rating: 5.00,
    totalTrips: 6200,
    phone: '081-333-7744',
    avatarEmoji: '🧔',
    vehicleModel: 'Honda Forza 350',
    plateNumber: '1กค 9900 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'ผ่านการอบรมหลักสูตรการดูแลและประคองผู้สูงอายุและผู้พิการ',
      'ผ่านการรับรองปฐมพยาบาลเบื้องต้น CPR & First Aid',
      'ขับขี่ด้วยความเร็วคงที่ปลอดภัย (Gentle & Smooth Ride Protocol)',
      'เบาะนั่งกว้างขวาง สเต็ปขึ้น-ลงต่ำ พร้อมราวจับขนาดใหญ่',
      'บริการพาไปทำบุญ ฟังเทศน์ และส่งโรงพยาบาลตรงเวลา',
      'เลเวล 25 (Platinum Sovereign)'
    ],
    specialtyTags: ['WIN Spirit', 'WIN Family', 'ดูแลผู้สูงอายุ', 'ดูแลผู้พิการ', 'ทำบุญวัดพุทธ'],
    distanceKm: 0.5,
    etaMinutes: 3,
    bio: 'ประสบการณ์ขับขี่กว่า 15 ปี ใจเย็น มีมารยาท ประคองขึ้นลงรถทุกครั้ง พาคุณตาคุณยายและผู้มีบุตรหลานเดินทางปลอดภัย',
    serviceMatchScore: 99
  },

  // 6. YAMAHA XMAX 300
  {
    id: 'wat_xmax_20',
    name: 'วรวัฒน์ เจริญผล (วัฒน์)',
    nameEn: 'Worawat Charoenphol (Wat)',
    nickname: 'พี่วัฒน์',
    gender: 'male',
    level: 20,
    tierName: 'Platinum Knight 🚀',
    rating: 4.98,
    totalTrips: 4600,
    phone: '089-223-1144',
    avatarEmoji: '🕶️',
    vehicleModel: 'Yamaha XMAX 300',
    plateNumber: '2กบ 3344 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'อบรมการขับขี่สปอร์ตสกู๊ตเตอร์ความเร็วคงที่ปลอดภัย',
      'ติดตั้งกล่องสัมภาระนิรภัยและสายรัดพัสดุแข็งแรง',
      'เบาะหลังคัสตอมนุ่มสบายพร้อมที่ชาร์จไฟมือถือ',
      'ชำนาญเส้นทางทางด่วนและทางลัดทั่วกรุงเทพฯ'
    ],
    specialtyTags: ['WIN Express', 'WIN Link', 'ทางด่วน', 'เดินทางข้ามเขต'],
    distanceKm: 0.6,
    etaMinutes: 3,
    bio: 'บิ๊กสกู๊ตเตอร์ทรงพลัง ขี่นิ่ง ทรงตัวเยี่ยม เดินทางไกลหรือเร่งด่วนถึงที่หมายฉับไว',
    serviceMatchScore: 97
  },

  // 7. HONDA LEAD 125
  {
    id: 'fon_lead_15',
    name: 'น้ำฝน รักษ์ดี (ฝน)',
    nameEn: 'Namfon Rakdee (Fon)',
    nickname: 'พี่ฝน',
    gender: 'female',
    level: 15,
    tierName: 'Gold Knight 🌸',
    rating: 4.96,
    totalTrips: 3100,
    phone: '084-332-9988',
    avatarEmoji: '👩‍💼',
    vehicleModel: 'Honda Lead 125',
    plateNumber: '7กง 6655 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'ช่องเก็บของใต้เบาะยักษ์ 37 ลิตร ขนสัมภาระได้จุใจ',
      'รับส่งพัสดุและอาหารกล่องถึงมือแบบไร้รอยต่อ',
      'ผ่านการอบรมรับส่งนักเรียนและผู้โดยสารสุภาพสตรี',
      'ขับขี่ใจเย็น นุ่มนวล ประหยัดน้ำมัน'
    ],
    specialtyTags: ['WIN Express', 'WIN Family', 'WIN Link', 'สัมภาระเยอะ', 'ผู้โดยสารหญิง'],
    distanceKm: 0.4,
    etaMinutes: 2,
    bio: 'รถพื้นที่เก็บของกว้างขวาง รับส่งของได้เยอะ ขี่นุ่มนวล บริการเป็นกันเอง',
    serviceMatchScore: 96
  },

  // 8. GPX DRONE 150
  {
    id: 'arm_drone_14',
    name: 'อานนท์ มั่นคง (อาร์ม)',
    nameEn: 'Arnon Mankong (Arm)',
    nickname: 'พี่อาร์ม',
    gender: 'male',
    level: 14,
    tierName: 'Silver Knight ⚡',
    rating: 4.95,
    totalTrips: 2700,
    phone: '085-778-2233',
    avatarEmoji: '😎',
    vehicleModel: 'GPX Drone 150',
    plateNumber: '5ขจ 4411 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'เครื่องยนต์ร่วมพัฒนา SYM เทคโนโลยี 4 วาล์ว คล่องตัวสูง',
      'ระบบไฟ Full LED ทัศนวิสัยสว่างชัดเจนกลางคืน',
      'กล่องเก็บของนิรภัย Win Express',
      'เชี่ยวชาญตรอกซอกซอยชานเมือง'
    ],
    specialtyTags: ['WIN Express', 'WIN Lifestyle', 'ส่งของไว', 'ซอยแคบ'],
    distanceKm: 0.5,
    etaMinutes: 3,
    bio: 'ดีไซน์โฉบเฉี่ยว คล่องตัว ลัดเลาะซอยไว ส่งของและส่งผู้โดยสารถึงเป้าหมายตรงเวลา',
    serviceMatchScore: 95
  },

  // 9. SUZUKI SMASH 115 FI
  {
    id: 'man_smash_12',
    name: 'สมาน ใจซื่อ (พี่หมาน)',
    nameEn: 'Saman Jaisue (Man)',
    nickname: 'พี่หมาน',
    gender: 'male',
    level: 12,
    tierName: 'Silver Knight 🛠️',
    rating: 4.94,
    totalTrips: 2300,
    phone: '086-112-4455',
    avatarEmoji: '👨‍🔧',
    vehicleModel: 'Suzuki Smash 115 FI',
    plateNumber: '8กม 1122 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'เครื่องยนต์ทนทาน ประหยัดน้ำมัน LEaP Technology',
      'ผู้เชี่ยวชาญการส่งพัสดุและอาหารตามสั่งชุมชน',
      'ค่าบริการเข้าถึงง่าย เป็นมิตรกับทุกคน',
      'ประสบการณ์ขับขี่กว่า 10 ปี'
    ],
    specialtyTags: ['WIN Express', 'WIN Link', 'ประหยัดคุ้มค่า', 'ส่งกับข้าว'],
    distanceKm: 0.3,
    etaMinutes: 2,
    bio: 'ซูซูกิทนทาน ประหยัดจริงใจ พร้อมวิ่งรับส่งเอกสารและของกินราคาประหยัดทุกเมื่อ',
    serviceMatchScore: 94
  },

  // 10. HONDA ADV 350
  {
    id: 'jack_adv_23',
    name: 'จักรพันธ์ ธนาธิป (แจ็ค)',
    nameEn: 'Jakkaphan Thanathip (Jack)',
    nickname: 'พี่แจ็ค',
    gender: 'male',
    level: 23,
    tierName: 'Platinum Knight 🏔️',
    rating: 4.99,
    totalTrips: 5100,
    phone: '081-778-9900',
    avatarEmoji: '🤠',
    vehicleModel: 'Honda ADV 350',
    plateNumber: '3กม 9988 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'โช้กอัพ Showa ซับแทงค์คู่ นุ่มนวลสูงสุด ซับหลุมถนนกรุงเทพฯ ไร้แรงสะเทือน',
      'ผ่านการอบรมรับส่งผู้สูงอายุและผู้พิการ',
      'ชิลด์บังลมหน้าปรับระดับได้ ลดลมปะทะตัวผู้โดยสาร',
      'กล่องเก็บของใต้เบาะยักษ์ 48 ลิตร'
    ],
    specialtyTags: ['WIN Family', 'WIN Spirit', 'นุ่มสบายสูงสุด', 'ลุยหลุมนุ่มนวล', 'WIN Express'],
    distanceKm: 0.4,
    etaMinutes: 2,
    bio: 'ช่วงล่าง Showa ซับแทงค์แท้ นุ่มสบายหลังที่สุดในเมือง ไม่สะเทือนแม้เจอฝาท่อหรือทางขรุขระ',
    serviceMatchScore: 98
  },

  // 11. YAMAHA AEROX 155
  {
    id: 'tong_aerox_16',
    name: 'วิชัย ชนะภัย (โต้ง)',
    nameEn: 'Wichai Chanaphai (Tong)',
    nickname: 'พี่โต้ง',
    gender: 'male',
    level: 16,
    tierName: 'Gold Knight 🚀',
    rating: 4.96,
    totalTrips: 3500,
    phone: '084-556-7890',
    avatarEmoji: '🛵',
    vehicleModel: 'Yamaha Aerox 155 Connected',
    plateNumber: '5กจ 4512 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'เครื่องยนต์บลูคอร์ VVA 155 ซีซี อัตราเร่งตอบสนองทันใจ',
      'เชี่ยวชาญการส่งของระยะสั้น-กลางและทางลัดซอยไว',
      'กล่องเก็บความร้อน-เย็นสำหรับส่งอาหารและห่อข้าวแม่',
      'รับประกันส่งถึงภายใน 20-30 นาที'
    ],
    specialtyTags: ['WIN Link', 'WIN Express', 'ส่งข้าวกล่องแม่', 'ชั่วโมงเร่งด่วน'],
    distanceKm: 0.3,
    etaMinutes: 2,
    bio: 'วิ่งลัดเลาะชั่วโมงเร่งด่วนคล่องตัว ส่งข้าวกล่อง ส่งพัสดุด่วน ถึงมือไวทันใจ',
    serviceMatchScore: 96
  },

  // 12. BMW S1000RR
  {
    id: 'art_bmw_s1000rr_35',
    name: 'อรรถพล เยอรมันสปีด (อาร์ต)',
    nameEn: 'Attapol Germanspeed (Art)',
    nickname: 'พี่อาร์ต',
    gender: 'male',
    level: 35,
    tierName: 'Imperial Master ⚡',
    rating: 5.00,
    totalTrips: 7800,
    phone: '082-111-9988',
    avatarEmoji: '🏎️',
    vehicleModel: 'BMW S1000RR',
    plateNumber: '1กพ 1000 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'นักขับขี่ซูเปอร์ไบค์ 207 แรงม้า ผ่านการอบรมสนามแข่งระดับสากล',
      'ระบบควบคุม Dynamic Traction Control (DTC) และ ABS Pro ปลอดภัยสูงสุด',
      'หมวกกันน็อกคาร์บอน BMW M-Performance สำหรับผู้โดยสาร',
      'บริการ VIP Escort รับส่งด่วนพิเศษ'
    ],
    specialtyTags: ['รถสายสปอร์ต', 'ซูเปอร์ไบค์', 'VIP Chauffeur', 'ทางด่วนพิเศษ'],
    distanceKm: 0.6,
    etaMinutes: 3,
    bio: 'ซูเปอร์ไบค์สัญชาติเยอรมัน 207 แรงม้า ทรงตัวมั่นคง ปลอดภัย แม่นยำ ดุจขับขี่บนสนามแข่ง',
    serviceMatchScore: 98
  },

  // 13. YAMAHA YZF-R1M
  {
    id: 'ken_r1m_32',
    name: 'เคนจิ มัตสึดะ (เคน)',
    nameEn: 'Kenji Matsuda (Ken)',
    nickname: 'พี่เคน',
    gender: 'male',
    level: 32,
    tierName: 'Imperial Master 🔵',
    rating: 4.99,
    totalTrips: 7100,
    phone: '089-887-1234',
    avatarEmoji: '🏁',
    vehicleModel: 'Yamaha YZF-R1M',
    plateNumber: '9กข 9999 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'ช่วงล่างไฟฟ้า Öhlins ERS (Electronic Racing Suspension) นุ่มหนึบอัจฉริยะ',
      'เครื่องยนต์ Crossplane CP4 ให้เสียงเอกลักษณ์ดุดันทรงพลัง',
      'ผ่านการอบรมความปลอดภัยการโดยสารความเร็วสูง',
      'ชุดแฟริ่งคาร์บอนแท้ทั้งคัน น้ำหนักเบา'
    ],
    specialtyTags: ['รถสายสปอร์ต', 'Crossplane CP4', 'Öhlins Electronic', 'VIP Ride'],
    distanceKm: 0.5,
    etaMinutes: 3,
    bio: 'เสียงคำราม Crossplane อันเป็นเอกลักษณ์ ช่วงล่างไฟฟ้าปรับอัตโนมัติ นุ่มหนึบปลอดภัย',
    serviceMatchScore: 97
  },

  // 14. HONDA CBR1000RR-R FIREBLADE SP
  {
    id: 'boss_cbr1000_30',
    name: 'บวรรัชต์ ธนบดี (บอส)',
    nameEn: 'Bowonrat Thanabodee (Boss)',
    nickname: 'พี่บอส',
    gender: 'male',
    level: 30,
    tierName: 'Imperial Knight 🔴',
    rating: 4.99,
    totalTrips: 6800,
    phone: '083-445-7788',
    avatarEmoji: '🔥',
    vehicleModel: 'Honda CBR1000RR-R Fireblade SP',
    plateNumber: '8กฮ 8888 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'ขุมพลัง 215 แรงม้า ถอดแบบเทคโนโลยีจากรถแข่ง MotoGP RC213V',
      'ปีกวิงเล็ตคาร์บอนสร้างแรงกด Downforce มั่นคงขณะเดินทาง',
      'ระบบเบรก Brembo Stylema พร้อม Cornering ABS',
      'หมวกกันน็อกเรซซิ่ง Arai Rx-7V สะอาดใหม่'
    ],
    specialtyTags: ['รถสายสปอร์ต', 'MotoGP Tech', 'Brembo Stylema', 'ทางด่วน'],
    distanceKm: 0.7,
    etaMinutes: 4,
    bio: 'สัมผัสความเร้าใจของเทคโนโลยี MotoGP และระบบอากาศพลศาสตร์ระดับโลก',
    serviceMatchScore: 96
  },

  // 15. KAWASAKI NINJA H2 CARBON
  {
    id: 'korn_ninjah2_40',
    name: 'ปกรณ์ ซูเปอร์ชาร์จ (พี่กร)',
    nameEn: 'Pakorn Supercharged (Korn)',
    nickname: 'พี่กร',
    gender: 'male',
    level: 40,
    tierName: 'Legend Sovereign 🟢',
    rating: 5.00,
    totalTrips: 9200,
    phone: '081-222-3333',
    avatarEmoji: '⚡',
    vehicleModel: 'Kawasaki Ninja H2 Carbon',
    plateNumber: '1กง 9999 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'เครื่องยนต์ Supercharged 231 แรงม้า สิทธิบัตรเฉพาะของ Kawasaki',
      'แฟริ่งคาร์บอนไฟเบอร์และสีพ่นเคลือบกระจกเงา Mirror Coated Matte Spark Black',
      'ระบบเบรก Brembo Stylema และโช้กอัพหลัง Öhlins TTX36',
      'นักขับผ่านการรับรอง Master Superbike Pilot'
    ],
    specialtyTags: ['รถสายสปอร์ต', 'Supercharged 231HP', 'Carbon Hyperbike', 'ประสบการณ์พิเศษ'],
    distanceKm: 0.8,
    etaMinutes: 4,
    bio: 'สุดยอดยานยนต์ซูเปอร์ชาร์จหนึ่งเดียวในโลก อัตราเร่งและเสียงดูดอากาศระดับไฮเปอร์ไบค์',
    serviceMatchScore: 98
  },

  // 16. SUZUKI HAYABUSA 1340
  {
    id: 'yod_hayabusa_38',
    name: 'ยงยุทธ เหยี่ยวเวหา (พี่ยอด)',
    nameEn: 'Yongyuth Hayabusa (Yod)',
    nickname: 'พี่ยอด',
    gender: 'male',
    level: 38,
    tierName: 'Legend Sovereign 🦅',
    rating: 5.00,
    totalTrips: 8900,
    phone: '086-999-1340',
    avatarEmoji: '🦅',
    vehicleModel: 'Suzuki Hayabusa Gen 3 1340',
    plateNumber: '3กพ 1340 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'พญาเหยี่ยว 1,340 ซีซี นิ่งสนิทดั่งเรือรบ ลู่ลมตามหลักอากาศพลศาสตร์ชั้นสูง',
      'เบาะนั่งหลังกว้างขวาง นุ่มสบายเป็นพิเศษสำหรับรถสปอร์ตทัวร์ริ่ง',
      'ระบบช่วยเหลือ Suzuki Intelligent Ride System (S.I.R.S.)',
      'ประสบการณ์ขับขี่ทัวร์ริ่งความเร็วคงที่กว่า 18 ปี'
    ],
    specialtyTags: ['รถสายสปอร์ต', 'พญาเหยี่ยว 1340cc', 'นิ่งมั่นคง', 'สปอร์ตทัวร์ริ่ง'],
    distanceKm: 0.5,
    etaMinutes: 3,
    bio: 'พญาเหยี่ยวฮายาบูสะ นิ่งสนิท ลมไม่ปะทะตัวผู้โดยสาร นั่งสบายกว่าสปอร์ตทั่วไป',
    serviceMatchScore: 99
  },

  // 17. APRILIA RSV4 FACTORY 1100
  {
    id: 'mario_rsv4_34',
    name: 'มาริโอ้ วาเลนติน (โอ้)',
    nameEn: 'Mario Valentin (Oh)',
    nickname: 'พี่โอ้',
    gender: 'male',
    level: 34,
    tierName: 'Imperial Master 🇮🇹',
    rating: 4.99,
    totalTrips: 7400,
    phone: '087-443-2211',
    avatarEmoji: '🏎️',
    vehicleModel: 'Aprilia RSV4 Factory 1100',
    plateNumber: '4กข 1100 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'เครื่องยนต์ V4 65 องศา 217 แรงม้า สไตล์รถแข่ง WorldSBK แชมป์โลก 54 สมัย',
      'ระบบช่วงล่างกึ่งแอคทีฟ Öhlins Smart EC 2.0 ปรับความหนืด 100 ครั้งต่อวินาที',
      'ปีกวิงเล็ตผสานในแฟริ่งสองชั้น (Double Fairing)',
      'เบรก Brembo Stylema พร้อม Cornering ABS'
    ],
    specialtyTags: ['รถสายสปอร์ต', 'เครื่องยนต์ V4', 'Öhlins Smart EC', 'อิตาเลียนเรซซิ่ง'],
    distanceKm: 0.6,
    etaMinutes: 3,
    bio: 'เสียง V4 หวานแน่นสไตล์อิตาลี ช่วงล่างไฟฟ้าปรับนุ่มหนึบอัตโนมัติ ปลอดภัยทุกโค้ง',
    serviceMatchScore: 97
  },

  // 18. KAWASAKI NINJA ZX-6R 636
  {
    id: 'golf_zx6r_26',
    name: 'กิตติพงษ์ สนามเขียว (กอล์ฟ)',
    nameEn: 'Kittipong Sanamkiew (Golf)',
    nickname: 'พี่กอล์ฟ',
    gender: 'male',
    level: 26,
    tierName: 'Platinum Sovereign 🟢',
    rating: 4.98,
    totalTrips: 5800,
    phone: '085-332-1199',
    avatarEmoji: '⚡',
    vehicleModel: 'Kawasaki Ninja ZX-6R 636',
    plateNumber: '6กข 6360 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'เครื่องยนต์ 4 สูบเรียง 636 ซีซี 130 แรงม้า เสียงท่อหวานละมุน',
      'ควิกชิฟเตอร์ KQS ขึ้นเกียร์นุ่มนวลไม่ต้องกำคลัตช์',
      'ระบบเบรกอัจฉริยะ KIBS Cornering ABS',
      'หมวกกันน็อก Shoei พร้อมบลูทูธคมชัด'
    ],
    specialtyTags: ['รถสายสปอร์ต', 'เสียง 4 สูบหวาน', 'ควิกชิฟเตอร์ KQS', 'คล่องตัว'],
    distanceKm: 0.4,
    etaMinutes: 2,
    bio: 'เสียงหวานของเครื่องยนต์ 4 สูบเรียง 13,000 รอบ/นาที ขี่นุ่มนวล ทรงตัวคล่องแคล่ว',
    serviceMatchScore: 96
  },

  // 19. HARLEY-DAVIDSON FAT BOY 114
  {
    id: 'chet_fatboy_28',
    name: 'สุเชษฐ์ มัสเซิลโครม (พี่เชษฐ์)',
    nameEn: 'Suchet Musclechrome (Chet)',
    nickname: 'พี่เชษฐ์',
    gender: 'male',
    level: 28,
    tierName: 'Platinum Sovereign 🦅',
    rating: 5.00,
    totalTrips: 6400,
    phone: '081-555-1144',
    avatarEmoji: '🧔‍♂️',
    vehicleModel: 'Harley-Davidson Fat Boy 114',
    plateNumber: '7กม 1140 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'เครื่องยนต์ Milwaukee-Eight 114 V-Twin 1,868 ซีซี แรงบิด 155 Nm มหาศาล',
      'ล้อแม็กตันอะลูมิเนียมหล่อเงา Lakester Cast Aluminum กว้างขวาง บึกบึน',
      'เบาะหลังคัสตอมบุเจลพร้อมพนักพิงหลัง นั่งสบายเหมือนโซฟา',
      'ผ่านการอบรมการขับขี่ครุยเซอร์เพื่อการท่องเที่ยวและถ่ายรูป'
    ],
    specialtyTags: ['รถสายคลาสสิค', 'ฮาเลย์ ฟัตบอย 114', 'เบาะโซฟานุ่ม', 'ถ่ายรูปเช็กอิน'],
    distanceKm: 0.5,
    etaMinutes: 3,
    bio: 'ตำนานคนเหล็ก เท่ บึกบึน เครื่องยนต์ 1,868 ซีซี แรงบิดนุ่มลึก เบาะนั่งสบายที่สุด',
    serviceMatchScore: 98
  },

  // 20. HARLEY-DAVIDSON BREAKOUT 117
  {
    id: 'singha_breakout_29',
    name: 'สิงหนาท ชอปเปอร์ (พี่สิงห์)',
    nameEn: 'Singhanat Chopper (Singha)',
    nickname: 'พี่สิงห์',
    gender: 'male',
    level: 29,
    tierName: 'Platinum Sovereign 🌟',
    rating: 5.00,
    totalTrips: 6700,
    phone: '089-117-7788',
    avatarEmoji: '🤠',
    vehicleModel: 'Harley-Davidson Breakout 117',
    plateNumber: '9กข 1170 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'เครื่องยนต์ใหญ่ที่สุด Milwaukee-Eight 117 V-Twin 1,923 ซีซี',
      'ยางหลังยักษ์ 240 มม. และกรองเปลือย Heavy Breather ชุบโครเมียมเงางามทั้งคัน',
      'เบาะหลังคัสตอมพร้อมพนักพิง Sissy Bar วางเท้าสบาย',
      'ช่างภาพประจำรถ ถ่ายภาพมุมสวยให้ผู้โดยสาร'
    ],
    specialtyTags: ['รถสายคลาสสิค', 'ฮาเลย์ เบรกเอาท์ 117', 'ยางหลังยักษ์ 240', 'โครเมียมเงาวับ'],
    distanceKm: 0.6,
    etaMinutes: 3,
    bio: 'ราชาโครเมียมเงาวับ ยางหลังยักษ์ 240 มม. โดดเด่นสะกดทุกสายตาบนท้องถนน',
    serviceMatchScore: 98
  },

  // 21. HARLEY-DAVIDSON SPORTSTER S
  {
    id: 'rock_sportster_s_27',
    name: 'รณกร พาวเวอร์แม็กซ์ (ร็อค)',
    nameEn: 'Ronnakorn Powermax (Rock)',
    nickname: 'พี่ร็อค',
    gender: 'male',
    level: 27,
    tierName: 'Platinum Sovereign 🔥',
    rating: 4.99,
    totalTrips: 6100,
    phone: '086-125-0011',
    avatarEmoji: '🔥',
    vehicleModel: 'Harley-Davidson Sportster S',
    plateNumber: '2กบ 1250 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'เครื่องยนต์ Revolution Max 1250T 121 แรงม้า ระบายความร้อนด้วยน้ำ',
      'ท่อไอเสียยกสูงสไตล์ Flat Track ดุดัน ทันสมัย',
      'ระบบ Cornering ABS และเบรก Brembo Monoblock ปลอดภัย',
      'หน้าจอ TFT ทรงกลมพร้อมระบบ Bluetooth'
    ],
    specialtyTags: ['รถสายคลาสสิค', 'Sportster S 1250', 'Muscle V-Twin', 'Brembo ABS'],
    distanceKm: 0.5,
    etaMinutes: 3,
    bio: 'ฮาร์ลีย์ยุคใหม่ 121 แรงม้า ท่อไอเสียยกสูง ดุดัน ทรงพลัง ควบคุมง่ายและนุ่มนวล',
    serviceMatchScore: 97
  },

  // 22. TRIUMPH BONNEVILLE T120
  {
    id: 'charles_bonneville_24',
    name: 'ชาญวิทย์ บริติชคลาสสิก (ชาลส์)',
    nameEn: 'Charnwit British (Charles)',
    nickname: 'พี่ชาลส์',
    gender: 'male',
    level: 24,
    tierName: 'Platinum Sovereign 🇬🇧',
    rating: 4.99,
    totalTrips: 5500,
    phone: '081-120-7799',
    avatarEmoji: '🎩',
    vehicleModel: 'Triumph Bonneville T120',
    plateNumber: '4กม 1200 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'เครื่องยนต์อังกฤษ High Torque 1,200 ซีซี 2 สูบคู่ขนาน 270 องศา นุ่มนวลละมุน',
      'เบาะนั่งหนานุ่มสไตล์ลอนดอนวินเทจ พร้อมราวจับโครเมียม',
      'ผ่านการอบรมมารยาทสุภาพบุรุษสไตล์อังกฤษ (Gentleman Chauffeur)',
      'หมวกกันน็อกหนังวินเทจและแว่นกันลมคลาสสิก'
    ],
    specialtyTags: ['รถสายคลาสสิค', 'บอนเนวิลล์ T120', 'สุภาพบุรุษอังกฤษ', 'นุ่มนวลสุขุม'],
    distanceKm: 0.5,
    etaMinutes: 3,
    bio: 'สุภาพบุรุษอังกฤษตัวจริง ขับขี่นุ่มนวล สุภาพ ให้เกียรติผู้โดยสารทุกระดับ',
    serviceMatchScore: 98
  },

  // 23. ROYAL ENFIELD CLASSIC 350
  {
    id: 'than_classic350_17',
    name: 'ธนภูมิ ศักดิ์สิทธิ์ (แทน)',
    nameEn: 'Thanapoom Saksit (Than)',
    nickname: 'พี่แทน',
    gender: 'male',
    level: 17,
    tierName: 'Gold Knight 🌟',
    rating: 4.99,
    totalTrips: 3900,
    phone: '081-445-6677',
    avatarEmoji: '🧘‍♂️',
    vehicleModel: 'Royal Enfield Classic 350',
    plateNumber: '2ขค 9988 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'เครื่องยนต์ J-Series 350 ซีซี เสียงตึ้กๆ นุ่มลึก คลาสสิกย้อนยุค',
      'เชี่ยวชาญเส้นทางสายมู เทวสถาน และวัดสำคัญรอบกรุงเทพฯ (Mu-Te-Lu Specialist)',
      'มีความรู้เรื่องบทสวดบูชาองค์เทพ ท้าวเวสสุวรรณ พระพิฆเนศ พระแม่ลักษมี',
      'เบาะนั่งสปริงคลาสสิก นั่งสบาย'
    ],
    specialtyTags: ['WIN MU BUDDY', 'รถสายคลาสสิค', 'สายมู', 'ไหว้พระ 9 วัด', 'ท้าวเวสสุวรรณ'],
    distanceKm: 0.4,
    etaMinutes: 2,
    bio: 'สายมูตัวจริง รู้ประวัติและจุดตั้งจิตอธิษฐาน พาไปไหว้พระขอพรได้ตรงจุด พร้อมช่วยจัดเตรียมของไหว้',
    serviceMatchScore: 99
  },

  // 24. ROYAL ENFIELD SUPER METEOR 650
  {
    id: 'sun_meteor650_21',
    name: 'สุริยา ทวินทัวเรอร์ (ซัน)',
    nameEn: 'Suriya Twintourer (Sun)',
    nickname: 'พี่ซัน',
    gender: 'male',
    level: 21,
    tierName: 'Platinum Sovereign 👑',
    rating: 4.98,
    totalTrips: 4700,
    phone: '089-650-3322',
    avatarEmoji: '🧔',
    vehicleModel: 'Royal Enfield Super Meteor 650',
    plateNumber: '5กฮ 6500 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'เครื่องยนต์ 2 สูบ 650 ซีซี องศาข้อเหวี่ยง 270° เสียงนุ่มแน่นไร้แรงสั่นสะเทือน',
      'พนักพิงหลังผู้โดยสารหนังแท้ Sissy Bar รองรับแผ่นหลังสบายตลอดทาง',
      'โช้กอัพหน้าหัวกลับ Showa SFF-BP และเบรก ByBre Brembo',
      'ระบบนำทาง Tripper Navigation บนหน้าปัด'
    ],
    specialtyTags: ['รถสายคลาสสิค', 'ซูเปอร์มีทีเออร์ 650', 'มีพนักพิงหลัง', 'ครุยเซอร์ 2 สูบ'],
    distanceKm: 0.6,
    etaMinutes: 3,
    bio: 'ครุยเซอร์ 2 สูบแท้ มีพนักพิงหลังหนังแท้ นั่งพิงสบาย ล่องลมริมน้ำหรือทางไกลไร้เมื่อยล้า',
    serviceMatchScore: 98
  },

  // 25. VESPA 946 CHRISTIAN DIOR
  {
    id: 'dior_vespa946_33',
    name: 'อภิสิทธิ์ ลักชัวรี่ (ดีออร์)',
    nameEn: 'Aphisit Luxury (Dior)',
    nickname: 'พี่ดีออร์',
    gender: 'male',
    level: 33,
    tierName: 'Imperial Master 💎',
    rating: 5.00,
    totalTrips: 7200,
    phone: '088-946-8888',
    avatarEmoji: '✨',
    vehicleModel: 'Vespa 946 Christian Dior Edition',
    plateNumber: '1กข 0946 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'ยานยนต์ลิมิเต็ดระดับไฮเอนด์โลก ลวดลาย Dior Oblique แท้',
      'เบาะหนังแท้ลวดลายโมโนแกรม Dior เย็บมือประณีตจากอิตาลี',
      'บริการรับส่ง VIP งานอีเวนต์ พรมแดง และถ่ายภาพแฟชั่นเช็คอิน',
      'มารยาทการบริการระดับโรงแรม 6 ดาว'
    ],
    specialtyTags: ['รถสายคลาสสิค', 'เวสป้า 946 Dior', 'VIP Luxury', 'งานอีเวนต์', 'แฟชั่น'],
    distanceKm: 0.7,
    etaMinutes: 4,
    bio: 'งานศิลปะสองล้อระดับโอต์กูตูร์จากอิตาลี นั่งสบาย หรูหรา เหมาะสำหรับวันพิเศษและงานสำคัญ',
    serviceMatchScore: 99
  },

  // 26. LAMBRETTA X300 SR
  {
    id: 'gigi_lambretta_22',
    name: 'จิรภัทร มิลานสไตล์ (จีจี้)',
    nameEn: 'Jirapat Milanstyle (Gigi)',
    nickname: 'พี่จีจี้',
    gender: 'female',
    level: 22,
    tierName: 'Platinum Sovereign 🇮🇹',
    rating: 4.99,
    totalTrips: 4950,
    phone: '087-300-4455',
    avatarEmoji: '👩‍🎤',
    vehicleModel: 'Lambretta X300 SR',
    plateNumber: '7กบ 3000 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'สกู๊ตเตอร์อิตาลีดีไซน์ Diamond Lines เหลี่ยมเพชรสุดหรูหรา',
      'กูรูพาเช็คอินคาเฟ่ลับ ถ่ายรูปสตรีทแฟชั่น และร้านนั่งชิว (Lifestyle Expert)',
      'ระบบกันสะเทือนหน้า Double Arm-Link นุ่มนวล ทรงตัวมั่นใจ',
      'บริการถ่ายรูปมุมเก๋ให้ผู้โดยสารฟรี'
    ],
    specialtyTags: ['WIN Lifestyle', 'รถสายคลาสสิค', 'แลมเบรตต้า X300', 'คาเฟ่ฮอปปิ้ง', 'ถ่ายรูป'],
    distanceKm: 0.5,
    etaMinutes: 3,
    bio: 'พี่วินสายแฟชั่นแลมเบรตต้า พาทัวร์คาเฟ่และร้านชิคๆ พร้อมช่วยถ่ายรูปมุมสวยลงสตอรี่',
    serviceMatchScore: 98
  },

  // 27. BMW R18 FIRST EDITION
  {
    id: 'klaus_bmwr18_36',
    name: 'กฤษณะ บิ๊กบ็อกเซอร์ (คลาวด์)',
    nameEn: 'Kritsana Bigboxer (Klaus)',
    nickname: 'พี่คลาวด์',
    gender: 'male',
    level: 36,
    tierName: 'Imperial Master 🇩🇪',
    rating: 5.00,
    totalTrips: 8100,
    phone: '081-180-1818',
    avatarEmoji: '👑',
    vehicleModel: 'BMW R18 First Edition',
    plateNumber: '1กค 1800 กทม.',
    hasDeliveryBox: false,
    certifications: [
      'เครื่องยนต์บิ๊กบ็อกเซอร์ 1,802 ซีซี ใหญ่ที่สุดในประวัติศาสตร์ BMW',
      'เพลาขับเปลือยชุบโครเมียมเงางามหมุนโชว์ เอกลักษณ์ระดับโลก',
      'เบาะหลังคัสตอมบุเจลกระจายน้ำหนัก นุ่มนวลขั้นสุดยอด',
      'ผ่านการอบรม VIP Chauffeur ประจำสถานทูตและโรงแรมหรู'
    ],
    specialtyTags: ['รถสายคลาสสิค', 'BMW R18 บิ๊กบ็อกเซอร์', 'เพลาขับเปลือย', 'VIP Master'],
    distanceKm: 0.6,
    etaMinutes: 3,
    bio: 'ความสง่างามของบิ๊กบ็อกเซอร์เยอรมัน 1,802 ซีซี เพลาขับเปลือยหมุนโชว์ นุ่มนวล ทรงเกียรติ',
    serviceMatchScore: 99
  },

  // 28. HONDA REBEL 1100 DCT
  {
    id: 'somchai_rebel1100_19',
    name: 'สมเกียรติ ออโต้ครุยเซอร์ (เกียรติ)',
    nameEn: 'Somkiat Autocruiser (Kiat)',
    nickname: 'พี่เกียรติ',
    gender: 'male',
    level: 19,
    tierName: 'Gold Knight 🌟',
    rating: 4.97,
    totalTrips: 4200,
    phone: '082-110-0909',
    avatarEmoji: '🤠',
    vehicleModel: 'Honda Rebel 1100 DCT',
    plateNumber: '3กม 1100 กทม.',
    hasDeliveryBox: true,
    certifications: [
      'เกียร์อัตโนมัติ DCT 6 สปีด ไร้รอยต่อ นุ่มนวล ไม่กระตุกกระชาก',
      'เบาะเตี้ย 700 มม. นั่งขึ้นลงสะดวกสบายมากสำหรับทุกคน',
      'ผ่านการอบรมรับส่งผู้โดยสารทั่วไป ผู้สูงอายุ และพัสดุด่วน',
      'กล่องเก็บของนิรภัย Win Express ติดตั้งแน่นหนา'
    ],
    specialtyTags: ['รถสายคลาสสิค', 'Rebel 1100 DCT', 'เกียร์ออโต้ DCT', 'WIN Express', 'นุ่มนวล'],
    distanceKm: 0.4,
    etaMinutes: 2,
    bio: 'บ็อบเบอร์คลาสสิกเกียร์อัตโนมัติ DCT นุ่มนวล ไร้แรงกระตุก เปลี่ยนเกียร์สมูทที่สุดในตระกูลครุยเซอร์',
    serviceMatchScore: 97
  }
];
