export interface WinExpressBoxOption {
  id: string;
  name: string;
  nameEn: string;
  category: 'parcel' | 'document' | 'food';
  icon: string;
  badge: string;
  price: number;
  description: string;
  specs: string[];
  maxWeightKg: number;
  highlight: string;
}

export const WIN_EXPRESS_BOX_OPTIONS: WinExpressBoxOption[] = [
  {
    id: 'box_parcel_secure',
    name: 'กล่องพัสดุด่วนกันกระแทก (Secure Parcel Box)',
    nameEn: 'Shockproof Parcel SafeBox',
    category: 'parcel',
    icon: '📦',
    badge: 'กันกระแทก 100% (โปร 5฿)',
    price: 5,
    description: 'กล่องฮาร์ดเคสล็อคแน่นหนา บุโฟมกันกระแทก 360 องศา ป้องกันการตกหล่นและการสั่นสะเทือน ปรับลดค่ากล่องเหลือ 5 บาท เพื่อประชาชน',
    specs: ['โฟม EVA ซับแรงกระแทก', 'สายรัดนิรภัย Quick-Lock', 'ซีลปิดผนึก Security Seal ป้องกันการเปิด'],
    maxWeightKg: 15,
    highlight: 'เหมาะสำหรับพัสดุทั่วไป อุปกรณ์อิเล็กทรอนิกส์ เสื้อผ้า หรือของขวัญ'
  },
  {
    id: 'box_document_waterproof',
    name: 'ซอง/กล่องเอกสารซีลกันน้ำ & กันยับ (Waterproof Document SafeBox)',
    nameEn: 'Weatherproof Document Vault',
    category: 'document',
    icon: '📄',
    badge: 'กันน้ำ & ไร้รอยยับ (โปร 5฿)',
    price: 5,
    description: 'เคสเอกสารแบบแข็งพิเศษ ซีลกันน้ำฝน IP67 มั่นใจเอกสารสัญญา เช็ค หรือพาสปอร์ตไม่ยับ ไม่เปียก ค่ากล่องพิเศษเพียง 5 บาท',
    specs: ['เคสแข็งกันพับงอ (Rigid Folder)', 'ซีลซิลิโคนกันน้ำฝน 100%', 'ซองแยกช่องใส่เอกสาร A4 / โฉนด / ใบกำกับภาษี'],
    maxWeightKg: 5,
    highlight: 'เหมาะสำหรับเอกสารสำคัญ สัญญาธุรกิจ ตราประทับ พาสปอร์ต และจดหมายด่วน'
  },
  {
    id: 'box_food_thermal',
    name: 'กล่องเก็บอุณหภูมิรักษาความสดอาหาร (Thermal Insulated Food SafeBox)',
    nameEn: 'Thermal Climate Food Box',
    category: 'food',
    icon: '🍱',
    badge: 'รักษาอุณหภูมิ ร้อน/เย็น (โปร 5฿)',
    price: 5,
    description: 'กล่องฉนวนความร้อน-เย็น เกรด Food-Safe บรรจุตัวล็อคถ้วยชามและเครื่องดื่ม ป้องกันอาหารหกเลอะเทอะ ค่ากล่องประหยัดเพียง 5 บาท',
    specs: ['ฉนวนเก็บความร้อน/เย็น 3 ชั่วโมง', 'ช่องล็อคแก้วน้ำกันหก (Anti-Spill Grid)', 'แผ่นซับคราบน้ำมันและฆ่าเชื้อ UV'],
    maxWeightKg: 10,
    highlight: 'เหมาะสำหรับอาหารปรุงสุก ขนมอบ เบเกอรี่ เครื่องดื่ม และของสด'
  }
];

export const WIN_EXPRESS_DRIVER_REQUIREMENTS = {
  minDriverLevel: 10,
  minDriverRank: 'Bronze Knight (อัศวินทองแดง) ขึ้นไป',
  reason: 'เนื่องจากงาน Win Express ขนส่งพัสดุมูลค่าสูง เอกสารสัญญาสำคัญ และอาหารที่ต้องรักษาความสะอาด คนขับต้องมีทักษะขับขี่นุ่มนวลและรับผิดชอบสูง',
  standardEquipment: [
    'กล่องท้ายรถมาตรฐาน WIN Express Quick-Vault พร้อมกุญแจดิจิทัล',
    'ชุดคลุมกันฝนเกรดพรีเมียมสำหรับปกป้องกล่องพัสดุ',
    'ระบบยืนยันพิกัดส่งมอบด้วย OTP และภาพถ่าย Photo Verification'
  ]
};
