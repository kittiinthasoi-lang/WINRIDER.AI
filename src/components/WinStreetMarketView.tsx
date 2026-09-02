import React, { useState, useEffect } from 'react';
import { 
  MarketItem, 
  MarketItemCategory 
} from '../types';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Tag, 
  PlusCircle, 
  Sparkles, 
  Star, 
  MapPin, 
  Truck, 
  ShieldCheck, 
  Store, 
  User, 
  CheckCircle2, 
  X, 
  Receipt,
  ShoppingCart,
  QrCode,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Heart,
  Package,
  Layers,
  Bike
} from 'lucide-react';
import { playTactileBlip, playLevelUpFanfare, playRadarScan } from '../utils/audio';
import { WinScanAndPayModal } from './WinScanAndPayModal';
import { CustomerPaymentQrCodeModal } from './CustomerPaymentQrCodeModal';
import { AIProductPhotoVerifier, AIVerificationResult } from './AIProductPhotoVerifier';
import confetti from 'canvas-confetti';

interface WinStreetMarketViewProps {
  audioEnabled?: boolean;
  onOpenWinBuddy?: () => void;
  customerListedItems?: MarketItem[];
  onAddNewCustomerItem?: (item: MarketItem) => void;
  onBackToMain?: () => void;
}

export const SAMPLE_MARKET_ITEMS: MarketItem[] = [
  {
    id: 'm-001',
    title: 'ผัดกะเพราเนื้อโคขุนสับพรีเมียม + ไข่ดาวกรอบลาวา',
    price: 89,
    originalPrice: 110,
    sellerType: 'merchant',
    sellerName: 'ร้านป้าสมร ตามสั่งกระทะเหล็กซอย 39',
    sellerAvatar: '🍳',
    sellerLevel: 45,
    sellerRating: 4.9,
    category: 'food_snack',
    categoryLabel: 'อาหาร & เครื่องดื่ม',
    condition: 'fresh',
    conditionLabel: 'ปรุงสดใหม่',
    description: 'ผัดกะเพราโบราณแท้ ไม่ใส่ถั่วฝักยาว เนื้อโคขุนบดหยาบ หอมใบกะเพราบ้าน พริกแห้งจินดาแซ่บถึงใจ',
    imageIcon: '🥩',
    location: 'สุขุมวิท 39 (พร้อมพงษ์)',
    distanceKm: 0.6,
    stock: 25,
    salesCount: 420,
    tags: ['ขายดีอันดับ 1', 'รสจัดจ้าน', 'ปรุงสด']
  },
  {
    id: 'm-002',
    title: 'กล้องฟิล์ม Olympus OM-1 Vintage สภาพสะสม 98%',
    price: 3900,
    originalPrice: 4800,
    sellerType: 'citizen',
    sellerName: 'น้องบีม มมส. (ลูกค้าซอยทองหล่อ 13)',
    sellerAvatar: '📸',
    sellerLevel: 28,
    sellerRating: 5.0,
    category: 'second_hand',
    categoryLabel: 'ของมือสอง & วินเทจ',
    condition: 'used',
    conditionLabel: 'มือ 2 สภาพนางฟ้า',
    description: 'กล้องฟิล์มส่วนตัว ใช้งานปกติ สปีดชัตเตอร์ตรง ช่องมองใส ไม่มีฝ้า ไม่มีรา แถมเลนส์ 50mm f/1.8 ฟรี',
    imageIcon: '📷',
    location: 'ทองหล่อ 13',
    distanceKm: 1.2,
    stock: 1,
    salesCount: 1,
    tags: ['มือสองคัดเกรด', 'Rare Item', 'ของแท้ 100%']
  },
  {
    id: 'm-003',
    title: 'บราวนี่ดาร์กช็อกโกแลตฟัดจ์ เนื้อหนึบหน้าฟิล์ม (โฮมเมด)',
    price: 65,
    originalPrice: 85,
    sellerType: 'citizen',
    sellerName: 'พี่ขวัญ ขนมอบเตาหอม (ลูกค้าเอกมัย)',
    sellerAvatar: '🧁',
    sellerLevel: 19,
    sellerRating: 4.95,
    category: 'food_snack',
    categoryLabel: 'อาหาร & ขนมทำเอง',
    condition: 'fresh',
    conditionLabel: 'ขนมอบสด',
    description: 'ช็อกโกแลตแท้นำเข้าจากเบลเยียม 70% หวานน้อย เนยสดแท้ 100% อบสดใหม่เช้าวันนี้ พร้อมส่งทันที',
    imageIcon: '🍫',
    location: 'เอกมัย ซอย 4',
    distanceKm: 0.9,
    stock: 12,
    salesCount: 88,
    tags: ['โฮมเมด', 'หวานน้อย', 'พร้อมส่ง']
  },
  {
    id: 'm-004',
    title: 'ชุดยาสามัญประจำบ้าน WIN Care (พารา+ยาแก้แพ้+เกลือแร่+เบตาดีน)',
    price: 135,
    originalPrice: 160,
    sellerType: 'merchant',
    sellerName: 'ร้านขายยาฟาร์มาแคร์ สุขุมวิท 24',
    sellerAvatar: '💊',
    sellerLevel: 62,
    sellerRating: 4.98,
    category: 'medicine_health',
    categoryLabel: 'ยารักษาโรค & สุขภาพ',
    condition: 'new',
    conditionLabel: 'ของใหม่มี อย.',
    description: 'เซ็ตยาสามัญดูแลฉุกเฉินเบื้องต้น พร้อมฉลากคำแนะนำการใช้ยาจากเภสัชกร มีใบอนุญาตถูกต้อง',
    imageIcon: '🩺',
    location: 'สุขุมวิท 24',
    distanceKm: 0.4,
    stock: 50,
    salesCount: 310,
    tags: ['เภสัชกรแนะนำ', 'จัดส่งด่วน', 'มาตรฐานสากล']
  },
  {
    id: 'm-005',
    title: 'สร้อยข้อมือหินมงคลนำโชค ไหมทอง + ไทเกอร์อาย (งานแฮนด์เมด)',
    price: 290,
    originalPrice: 450,
    sellerType: 'citizen',
    sellerName: 'ครูเจ มินิมอลอาร์ต (ลูกค้าอโศก)',
    sellerAvatar: '✨',
    sellerLevel: 33,
    sellerRating: 4.88,
    category: 'fashion_accessories',
    categoryLabel: 'เครื่องประดับ & งานคราฟต์',
    condition: 'handmade',
    conditionLabel: 'งานทำมือแฮนด์เมด',
    description: 'ร้อยด้วยเอ็นยืดคุณภาพสูง หินแท้ขนาด 8 มม. เสริมพลังการเงิน ความมั่งคั่ง และการเจรจาค้าขาย',
    imageIcon: '📿',
    location: 'อโศกมนตรี',
    distanceKm: 1.5,
    stock: 4,
    salesCount: 42,
    tags: ['แฮนด์เมด', 'เสริมดวง', 'ของขวัญ']
  },
  {
    id: 'm-006',
    title: 'มะม่วงน้ำดอกไม้สีทองสวนอินทรีย์ ปลอดสารพิษ (1 กก.)',
    price: 95,
    originalPrice: 120,
    sellerType: 'merchant',
    sellerName: 'แผงผลไม้ป้าแดง ตลาดสดคลองเตย',
    sellerAvatar: '🥭',
    sellerLevel: 51,
    sellerRating: 4.85,
    category: 'produce_fruit',
    categoryLabel: 'ผัก & ผลไม้สด',
    condition: 'fresh',
    conditionLabel: 'สดจากสวน',
    description: 'หวานฉ่ำ ไร้เสี้ยน เก็บสดเช้าตรู่จากสวนปลอดสารพิษ วิตามินซีสูง คัดพิเศษทุกลูก',
    imageIcon: '🥭',
    location: 'ตลาดคลองเตย',
    distanceKm: 2.1,
    stock: 30,
    salesCount: 190,
    tags: ['ออร์แกนิก', 'สดจากสวน', 'หวานธรรมชาติ']
  },
  {
    id: 'm-007',
    title: 'อาหารแมวพรีเมียม Grain-Free สูตรแซลมอน & ไก่ (ถุง 1.5 กก.)',
    price: 340,
    originalPrice: 390,
    sellerType: 'merchant',
    sellerName: 'ร้านเพ็ทช็อปฮีโร่ สัตว์เลี้ยงสุขสันต์',
    sellerAvatar: '🐾',
    sellerLevel: 39,
    sellerRating: 4.92,
    category: 'pet_supplies',
    categoryLabel: 'อาหาร & อุปกรณ์สัตว์เลี้ยง',
    condition: 'new',
    conditionLabel: 'ของใหม่ 100%',
    description: 'สูตรบำรุงขนสวย ลดขนร่วง ปราศจากข้าวโพด ข้าวสาลี และสารเคมีสังเคราะห์ เหมาะกับน้องแมวทุกวัย',
    imageIcon: '🐱',
    location: 'พระราม 4',
    distanceKm: 1.8,
    stock: 18,
    salesCount: 125,
    tags: ['เกรนฟรี', 'บำรุงขน', 'สัตว์เลี้ยง']
  },
  {
    id: 'm-008',
    title: 'ภาพวาดสีน้ำทิวทัศน์คลองบางกอกน้อย ขนาด A3 (พร้อมกรอบไม้สัก)',
    price: 850,
    originalPrice: 1200,
    sellerType: 'citizen',
    sellerName: 'พี่อาร์ต จิตรกรอิสระ',
    sellerAvatar: '🎨',
    sellerLevel: 41,
    sellerRating: 5.0,
    category: 'handmade_art',
    categoryLabel: 'งานศิลปะ & ภาพวาด',
    condition: 'handmade',
    conditionLabel: 'ผลงานต้นฉบับ Original',
    description: 'วาดด้วยสีน้ำเกรดศิลปิน Arches 300g ลายพู่กันประณีต ถ่ายทอดวิถีชีวิตริมน้ำฝั่งธนบุรี',
    imageIcon: '🖼️',
    location: 'ฝั่งธนบุรี เจริญนคร',
    distanceKm: 3.2,
    stock: 1,
    salesCount: 8,
    tags: ['งานศิลปะแท้', 'กรอบไม้สัก', 'แต่งบ้าน']
  },
  {
    id: 'm-009',
    title: 'เสื้อยืดวินเทจ Harley Davidson 90s ลายอินทรีแท้ USA',
    price: 690,
    originalPrice: 950,
    sellerType: 'citizen',
    sellerName: 'คุณโจ้ คอวินเทจ 90s',
    sellerAvatar: '👕',
    sellerLevel: 35,
    sellerRating: 4.9,
    category: 'fashion_accessories',
    categoryLabel: 'เสื้อผ้ามือ 1 & มือ 2',
    condition: 'used',
    conditionLabel: 'มือ 2 วินเทจแท้',
    description: 'ไซส์ L อก 42 ยาว 29 สภาพเฟดสวย ตะเข็บเดี่ยวทั้งตัว ผ้าบางนุ่ม ไม่มีตำหนิขาดรู',
    imageIcon: '🦅',
    location: 'พระโขนง',
    distanceKm: 2.8,
    stock: 1,
    salesCount: 15,
    tags: ['วินเทจแท้ 90s', 'ตะเข็บเดี่ยว', 'ผ้าบาง']
  },
  {
    id: 'm-010',
    title: 'สมุดบันทึกหนังแท้แฮนด์เมด ลายสลักสิงโตอธิปไตย + ปากกาไม้สัก',
    price: 320,
    originalPrice: 420,
    sellerType: 'merchant',
    sellerName: 'ร้านเครื่องเขียนสยามอาร์ตแล็บ',
    sellerAvatar: '📒',
    sellerLevel: 44,
    sellerRating: 4.94,
    category: 'stationery_craft',
    categoryLabel: 'เครื่องเขียน & สินค้าทำมือ',
    condition: 'handmade',
    conditionLabel: 'งานทำมือแฮนด์เมด',
    description: 'กระดาษถนอมสายตานำเข้า 120 แกรม เข้าเล่มมือด้วยเชือกเทียนอย่างแน่นหนา',
    imageIcon: '📚',
    location: 'สยามสแควร์',
    distanceKm: 3.5,
    stock: 14,
    salesCount: 96,
    tags: ['หนังแท้', 'ของขวัญ', 'แฮนด์เมด']
  },
  {
    id: 'm-011',
    title: 'ต่างหูเงินแท้ 925 ประดับไข่มุกน้ำจืดแท้ชุบทองคำขาว (Handmade Jewelry)',
    price: 490,
    originalPrice: 750,
    sellerType: 'citizen',
    sellerName: 'คุณพลอย จิวเวลรี่ดีไซน์ (ลูกค้าทองหล่อ)',
    sellerAvatar: '💍',
    sellerLevel: 31,
    sellerRating: 4.97,
    category: 'fashion_accessories',
    categoryLabel: 'เครื่องประดับ & จิวเวลรี่',
    condition: 'handmade',
    conditionLabel: 'งานแฮนด์เมดแท้',
    description: 'เงินแท้ 925 ปลอดสารนิกเกิล ไม่แพ้ ไม่คัน ไข่มุกน้ำจืดคัดทรงกลมเงางาม เคลือบทองคำขาวกันหมอง',
    imageIcon: '✨',
    location: 'ทองหล่อ 8',
    distanceKm: 1.1,
    stock: 6,
    salesCount: 38,
    tags: ['เครื่องประดับแท้', 'เงิน 925', 'ไข่มุกแท้']
  },
  {
    id: 'm-012',
    title: 'เซ็ตยาแก้หวัดเจ็บคอ & ยาสามัญประจำบ้าน + ยาดมสมุนไพรสูตรโบราณ 100 ปี',
    price: 165,
    originalPrice: 210,
    sellerType: 'merchant',
    sellerName: 'ร้านยาสยามฟาร์มาซี สาขาอโศก',
    sellerAvatar: '💊',
    sellerLevel: 58,
    sellerRating: 4.99,
    category: 'medicine_health',
    categoryLabel: 'ยารักษาโรค & ยาสามัญประจำบ้าน',
    condition: 'new',
    conditionLabel: 'ยาแผนปัจจุบันมี อย.',
    description: 'ชุดดูแลสุขภาพฉุกเฉิน ยาพาราเซตามอล 500mg, ยาแก้แพ้ลดน้ำมูก, ยาอมแก้เจ็บคอ, สเปรย์พ่นคอโพรโพลิส และยาดมสมุนไพรกฤษณา',
    imageIcon: '🌿',
    location: 'อโศกมนตรี',
    distanceKm: 0.8,
    stock: 45,
    salesCount: 520,
    tags: ['ยาสามัญประจำบ้าน', 'แก้หวัดเจ็บคอ', 'ส่งด่วน 20 นาที']
  },
  {
    id: 'm-013',
    title: 'กระเป๋าผ้าแคนวาสเพ้นท์มือ ลายแมวเหมียวสตรีทวิน (One of a Kind)',
    price: 250,
    originalPrice: 350,
    sellerType: 'citizen',
    sellerName: 'น้องมิ้นท์ นักศึกษาเพาะช่าง (ลูกค้าเจริญกรุง)',
    sellerAvatar: '🎨',
    sellerLevel: 22,
    sellerRating: 5.0,
    category: 'handmade_art',
    categoryLabel: 'งานศิลปะ & สินค้าทำมือ',
    condition: 'handmade',
    conditionLabel: 'เพ้นท์มือชิ้นเดียวในโลก',
    description: 'ผ้าแคนวาสหนา 14 ออนซ์ ทนทาน ซักได้ สีอะคริลิกเกรดพรีเมียมไม่ลอกหลุด ใส่ iPad และหนังสือได้สบาย',
    imageIcon: '👜',
    location: 'เจริญกรุง 43',
    distanceKm: 2.3,
    stock: 3,
    salesCount: 19,
    tags: ['งานแฮนด์เมด', 'เพ้นท์มือ', 'ของขวัญ']
  },
  {
    id: 'm-014',
    title: 'ผักสลัดไฮโดรโปนิกส์อินทรีย์รวม 5 ชนิด (กรีนโอ๊ค/เรดโอ๊ค/คอส/บัตเตอร์เฮด/ฟิลเลย์)',
    price: 85,
    originalPrice: 105,
    sellerType: 'merchant',
    sellerName: 'ฟาร์มผักไฮโดรในเมือง Urban Green',
    sellerAvatar: '🥬',
    sellerLevel: 47,
    sellerRating: 4.91,
    category: 'produce_fruit',
    categoryLabel: 'ผัก & ผลไม้สด',
    condition: 'fresh',
    conditionLabel: 'เก็บสดเช้านี้',
    description: 'ปลูกด้วยระบบน้ำวนปิด ไร้สารเคมีและยาฆ่าแมลง 100% กรอบหวาน ไม่ขม สะอาดพร้อมทานทันที',
    imageIcon: '🥗',
    location: 'สุขุมวิท 71 (ปรีดีฯ)',
    distanceKm: 1.9,
    stock: 40,
    salesCount: 280,
    tags: ['ผักปลอดสาร', 'สลัดสดกรอบ', 'ออร์แกนิก']
  },
  {
    id: 'm-015',
    title: 'iPad Air 5 (M1) 64GB WiFi สี Starlight สภาพ 99% ประกันศูนย์เหลือ 6 เดือน',
    price: 14500,
    originalPrice: 19900,
    sellerType: 'citizen',
    sellerName: 'คุณแบงค์ วิศวกรซอฟต์แวร์ (ลูกค้าสาทร)',
    sellerAvatar: '📱',
    sellerLevel: 37,
    sellerRating: 5.0,
    category: 'second_hand',
    categoryLabel: 'ของมือสอง & อุปกรณ์ไอที',
    condition: 'used',
    conditionLabel: 'มือสอง สภาพ 99%',
    description: 'เครื่องแท้ศูนย์ไทย ไม่เคยตกหล่น ไร้รอยขีดข่วน ติดฟิล์มกระจก Paperlike เรียบร้อย พร้อมกล่องและหัวชาร์จแท้ครบ',
    imageIcon: '💻',
    location: 'สาทรเหนือ',
    distanceKm: 2.7,
    stock: 1,
    salesCount: 1,
    tags: ['มือสองสภาพนางฟ้า', 'ประกันศูนย์', 'ของแท้ 100%']
  }
];

export const WinStreetMarketView: React.FC<WinStreetMarketViewProps> = ({
  audioEnabled = true,
  onOpenWinBuddy,
  customerListedItems = [],
  onAddNewCustomerItem,
  onBackToMain
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sellerTypeFilter, setSellerTypeFilter] = useState<'all' | 'merchant' | 'citizen'>('all');
  // Helper to normalize items that may come from different sources
  const normalizeMarketItem = (raw: any): MarketItem => {
    if (!raw) {
      return {
        id: `c2c-unknown-${Math.random()}`,
        title: 'สินค้าทั่วไป',
        price: 99,
        sellerType: 'citizen',
        sellerName: 'พลเมือง WIN',
        sellerAvatar: '👤',
        sellerLevel: 1,
        sellerRating: 5.0,
        category: 'second_hand',
        categoryLabel: 'ของทั่วไป',
        condition: 'used',
        conditionLabel: 'สภาพดี',
        description: '',
        imageIcon: '📦',
        location: 'กรุงเทพฯ',
        distanceKm: 1.0,
        stock: 1,
        salesCount: 0,
        tags: ['C2C']
      };
    }
    const title = raw.title || raw.name || 'สินค้าทั่วไป';
    const sellerName = raw.sellerName || raw.seller || 'พลเมือง WIN';
    const sellerType = raw.sellerType || (raw.sellerRole === 'customer' ? 'citizen' : 'citizen');
    const tags = Array.isArray(raw.tags) 
      ? raw.tags 
      : typeof raw.tag === 'string' 
        ? [raw.tag] 
        : ['C2C สินค้าพลเมือง'];

    return {
      id: raw.id || `mkt-${Date.now()}-${Math.random()}`,
      title,
      price: typeof raw.price === 'number' ? raw.price : Number(raw.price) || 50,
      originalPrice: raw.originalPrice,
      sellerType,
      sellerName,
      sellerAvatar: raw.sellerAvatar || raw.imageEmoji || '👤',
      sellerLevel: raw.sellerLevel || 10,
      sellerRating: raw.sellerRating || raw.rating || 5.0,
      category: raw.category || 'second_hand',
      categoryLabel: raw.categoryLabel || raw.tag || 'สินค้าทั่วไป',
      condition: raw.condition || 'used',
      conditionLabel: raw.conditionLabel || (raw.condition === 'handmade' ? 'งานทำมือ' : raw.condition === 'new' ? 'ของใหม่' : 'สภาพดี'),
      description: raw.description || '',
      imageIcon: raw.imageIcon || raw.imageEmoji || raw.icon || '📦',
      location: raw.location || 'กรุงเทพมหานคร',
      distanceKm: typeof raw.distanceKm === 'number' ? raw.distanceKm : 1.2,
      stock: typeof raw.stock === 'number' ? raw.stock : (raw.inStock || 1),
      salesCount: typeof raw.salesCount === 'number' ? raw.salesCount : (raw.sales || 0),
      tags,
      isCustomerListed: raw.isCustomerListed ?? true
    };
  };

  const [items, setItems] = useState<MarketItem[]>(() => {
    const rawList = [...SAMPLE_MARKET_ITEMS, ...(customerListedItems || [])];
    return rawList.map(normalizeMarketItem);
  });

  // Sync when customerListedItems prop updates
  useEffect(() => {
    if (customerListedItems && customerListedItems.length > 0) {
      setItems(prev => {
        const normalizedIncoming = customerListedItems.map(normalizeMarketItem);
        const map = new Map<string, MarketItem>();
        prev.forEach(item => map.set(item.id, item));
        normalizedIncoming.forEach(item => map.set(item.id, item));
        return Array.from(map.values());
      });
    }
  }, [customerListedItems]);
  
  // Cart & Order System
  const [cart, setCart] = useState<{ item: MarketItem; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState<boolean>(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [selectedItemForPay, setSelectedItemForPay] = useState<MarketItem | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);

  // Customer Custom QR Code Modal
  const [isCustomerQrModalOpen, setIsCustomerQrModalOpen] = useState<boolean>(false);
  const [customerQrAmount, setCustomerQrAmount] = useState<number>(150);
  const [customerQrTitle, setCustomerQrTitle] = useState<string>('สินค้าจาก วันนี้มีของมาขาย');

  // New Listing Form Modal for Customer
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newCategory, setNewCategory] = useState<MarketItemCategory>('second_hand');
  const [newCondition, setNewCondition] = useState<'new' | 'used' | 'handmade' | 'fresh'>('used');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('คอนโดสุขุมวิท 39');
  const [newEmoji, setNewEmoji] = useState<string>('📦');
  const [customerAiVerified, setCustomerAiVerified] = useState<AIVerificationResult | null>(null);
  const [inspectingCertItem, setInspectingCertItem] = useState<MarketItem | null>(null);

  // Delivery fee rules:
  // Base delivery fee = 25 THB
  // Merchant surcharge = +5 THB (2 insurance + 2 driver compensation + 1 system)
  // Packaging fee = 5 THB (reduced from previous 15)
  const DELIVERY_SURCHARGE = 5; // 2 insurance + 2 pickup + 1 system
  const PACKAGING_FEE = 5; // mandatory box fee reduced to 5 THB
  const BASE_DELIVERY_FEE = 25;

  const categories: { id: string; label: string; icon: string }[] = [
    { id: 'all', label: 'ทั้งหมด', icon: '🌟' },
    { id: 'food_snack', label: 'อาหาร & ขนม', icon: '🍜' },
    { id: 'second_hand', label: 'มือหนึ่ง/มือสอง', icon: '📦' },
    { id: 'fashion_accessories', label: 'เสื้อผ้า/เครื่องประดับ', icon: '💎' },
    { id: 'handmade_art', label: 'งานศิลปะ & คราฟต์', icon: '🎨' },
    { id: 'produce_fruit', label: 'ผัก & ผลไม้สด', icon: '🍎' },
    { id: 'medicine_health', label: 'ยาสามัญ & สุขภาพ', icon: '💊' },
    { id: 'pet_supplies', label: 'อาหารสัตว์เลี้ยง', icon: '🐾' },
    { id: 'stationery_craft', label: 'เครื่องเขียน', icon: '✏️' },
  ];

  const filteredItems = items.filter(item => {
    if (!item) return false;
    const title = (item.title || (item as any).name || '').toLowerCase();
    const seller = (item.sellerName || (item as any).seller || '').toLowerCase();
    const tags = Array.isArray(item.tags) 
      ? item.tags 
      : typeof (item as any).tag === 'string' 
        ? [(item as any).tag] 
        : [];
    const q = (searchQuery || '').toLowerCase().trim();

    const matchesSearch = !q || 
      title.includes(q) || 
      seller.includes(q) || 
      tags.some(t => typeof t === 'string' && t.toLowerCase().includes(q));

    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSeller = sellerTypeFilter === 'all' || 
      item.sellerType === sellerTypeFilter ||
      ((item as any).sellerRole === 'customer' && sellerTypeFilter === 'citizen');
      
    return matchesSearch && matchesCat && matchesSeller;
  });

  const handleAddToCart = (item: MarketItem) => {
    if (audioEnabled) playTactileBlip(900);
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    if (audioEnabled) playTactileBlip(500);
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const handleOpenDirectPay = (item: MarketItem) => {
    if (audioEnabled) playTactileBlip(1100);
    setSelectedItemForPay(item);
    setIsPayModalOpen(true);
  };

  const calculateCartTotals = () => {
    const subtotal = cart.reduce((sum, curr) => sum + (curr.item.price * curr.quantity), 0);
    const hasItems = cart.length > 0;
    const delivery = hasItems ? BASE_DELIVERY_FEE : 0;
    const surcharge = hasItems ? DELIVERY_SURCHARGE : 0; // 5 THB
    const packaging = hasItems ? PACKAGING_FEE : 0; // 5 THB
    const grandTotal = subtotal + delivery + surcharge + packaging;
    return { subtotal, delivery, surcharge, packaging, grandTotal };
  };

  const handleExecuteCheckout = () => {
    if (cart.length === 0) return;
    if (audioEnabled) playLevelUpFanfare();
    
    const { subtotal, delivery, surcharge, packaging, grandTotal } = calculateCartTotals();
    const receiptData = {
      orderId: `WIN-MKT-${Date.now().toString().slice(-6)}`,
      items: [...cart],
      subtotal,
      delivery,
      surcharge,
      packaging,
      grandTotal,
      time: new Date().toLocaleTimeString('th-TH'),
      riderAssigned: 'พี่วินสมหมาย (Forza 350 • Level 85)'
    };

    setLastReceipt(receiptData);
    setIsCheckoutSuccess(true);
    setCart([]);
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#00D2FF', '#FFD700', '#10B981', '#FF6B6B']
    });
  };

  const handlePublishCustomerItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice) {
      alert('กรุณากรอกชื่อสินค้าและราคาให้ครบถ้วน');
      return;
    }

    if (!customerAiVerified) {
      alert('⚠️ กฎระเบียบความปลอดภัยตลาด WIN Street Market: จำเป็นต้องถ่ายรูปสินค้าและผ่านการตรวจสอบยืนยันด้วย AI Vision Guard ก่อนลงขายทุกครั้ง');
      return;
    }

    const createdItem: MarketItem = {
      id: `c2c-${Date.now()}`,
      title: newTitle,
      price: Number(newPrice) || 50,
      sellerType: 'citizen',
      sellerName: 'คุณผู้โดยสาร (คุณ)',
      sellerAvatar: '👤',
      sellerLevel: 10,
      sellerRating: 5.0,
      category: newCategory,
      categoryLabel: categories.find(c => c.id === newCategory)?.label || 'ของทั่วไป',
      condition: newCondition,
      conditionLabel: newCondition === 'used' ? 'มือสองสภาพดี' : newCondition === 'handmade' ? 'แฮนด์เมด' : 'ของใหม่',
      description: newDescription || 'สินค้าสภาพดี พร้อมส่งผ่านพี่วินทันที',
      imageIcon: customerAiVerified.imageIcon || newEmoji || '📦',
      imageUrl: customerAiVerified.imageUrl,
      location: newLocation,
      distanceKm: 0.2,
      stock: 1,
      salesCount: 0,
      tags: ['AI Verified ✨', 'ลงขายวันนี้', 'C2C ลูกค้าขายเอง', 'พร้อมส่ง'],
      isCustomerListed: true,
      isAiVerified: true,
      aiCertificateId: customerAiVerified.certificateId,
      aiQualityScore: customerAiVerified.qualityScore,
      aiVerifiedDate: new Date().toLocaleDateString('th-TH')
    };

    setItems(prev => [createdItem, ...prev]);
    if (onAddNewCustomerItem) onAddNewCustomerItem(createdItem);

    if (audioEnabled) playLevelUpFanfare();
    confetti({
      particleCount: 70,
      spread: 75,
      colors: ['#FFD700', '#00D2FF', '#10B981']
    });

    setIsSellModalOpen(false);
    setNewTitle('');
    setNewPrice('');
    setNewDescription('');
    setCustomerAiVerified(null);
  };

  const totals = calculateCartTotals();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Back to Main Action Bar */}
      {onBackToMain && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-black/50 border border-cyan-500/30 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(900);
              onBackToMain();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold font-mono flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <span>← กลับสู่หน้าหลัก (Back to Home)</span>
          </button>
          <span className="text-[11px] text-amber-300 font-mono font-bold flex items-center gap-1">
            <span>🛍️ WIN Street Market</span>
          </span>
        </div>
      )}

      {/* Hero Banner with Futuristic Street Market Atmosphere */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1736] via-[#070D1E] to-[#040814] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30 text-xs font-bold font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>WIN STREET MARKET • ตลาดนัดอธิปไตยเปิด 24 ชม.</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              ตลาดซื้อ-ขายสตรีทมาร์เก็ต <span className="text-[#00D2FF]">B2C & C2C</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              ศูนย์รวมของกิน ของใช้ สินค้ามือหนึ่ง/มือสอง ของแฮนด์เมด ยารักษาโรค เสื้อผ้า ผักผลไม้ 
              ทั้งจาก<strong>ร้านค้าพันธมิตร</strong>และ<strong>ลูกค้าทั่วไปลงขายเอง</strong> ส่งถึงมือไวโดยพี่วินความเร็วสูง!
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
                <Truck className="w-3.5 h-3.5 text-cyan-400" /> ค่าส่งบวกเพิ่ม 5฿ (ประกัน 2฿ + พี่วินรับ 2฿ + ระบบ 1฿)
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
                <Package className="w-3.5 h-3.5 text-amber-400" /> ค่ากล่อง/บรรจุภัณฑ์บังคับเหลือเพียง 5฿
              </span>
            </div>
          </div>

          {/* Quick Action Button & Cart Trigger */}
          <div className="flex flex-wrap sm:flex-col items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(1000);
                setIsSellModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>วันนี้มีของมาขาย (ลงขายฟรี!)</span>
            </button>

            {/* QR Code ของลูกค้า (ระบุจำนวนเงินเองได้) */}
            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(900);
                setCustomerQrAmount(150);
                setCustomerQrTitle('สินค้าจาก วันนี้มีของมาขาย');
                setIsCustomerQrModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-400/20 border-2 border-[#FFD700] hover:bg-amber-400/30 text-amber-300 font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4 text-[#FFD700]" />
              <span>QR Code ลูกค้า (ระบุยอดเอง)</span>
            </button>

            <button
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setIsCartOpen(true);
              }}
              className="relative w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>ตะกร้าสินค้า ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-mono font-bold flex items-center justify-center animate-bounce">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Search & Multi-Filters Toolbar */}
      <section className="p-5 rounded-3xl bg-[#070D1E]/90 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="ค้นหาอาหาร, ขนม, ของมือสอง, ยาสามัญ, กล้อง, งานฝีมือ, เสื้อผ้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/50 border border-cyan-500/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Seller Type Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 self-stretch sm:self-auto overflow-x-auto">
            {[
              { id: 'all' as const, label: 'ทั้งหมด', icon: '🌐' },
              { id: 'merchant' as const, label: '🏬 ร้านค้าทางการ', icon: '🏬' },
              { id: 'citizen' as const, label: '👤 ลูกค้าขายเอง (C2C)', icon: '🤝' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(700);
                  setSellerTypeFilter(tab.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  sellerTypeFilter === tab.id
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                if (audioEnabled) playTactileBlip(800);
                setSelectedCategory(cat.id);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold border-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                  : 'bg-black/30 text-slate-300 border-white/10 hover:border-white/30 hover:bg-white/5'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Market Items Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white font-mono">
              รายการสินค้า ({filteredItems.length} รายการ)
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">• ส่งด่วนด้วยเครือข่ายพี่วิน</span>
          </div>
          <span className="text-xs text-cyan-400">สแกนจ่ายผ่าน QR ได้ทันที</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#070D1E] border border-white/10 space-y-3">
            <div className="text-4xl">🔍</div>
            <h3 className="text-base font-bold text-white">ไม่พบสินค้าตามที่ระบุ</h3>
            <p className="text-xs text-slate-400">ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่นดูสิครับ</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSellerTypeFilter('all'); }}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:brightness-110"
            >
              รีเซ็ตการค้นหา
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id}
                className="group relative rounded-3xl bg-[#070D1E]/95 border border-white/10 hover:border-cyan-400/50 p-4 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,210,255,0.2)] flex flex-col justify-between"
              >
                {/* Header tag */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.sellerType === 'merchant'
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {item.sellerType === 'merchant' ? '🏬 ร้านค้า' : '👤 ลูกค้าขายเอง'}
                  </span>

                  <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" /> {item.distanceKm} กม.
                  </span>
                </div>

                {/* Main Product Display */}
                <div className="space-y-2.5">
                  <div className="relative w-full h-36 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border border-white/5 flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                        {item.imageIcon}
                      </span>
                    )}

                    {/* AI Verified Badge Overlay */}
                    {item.isAiVerified && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (audioEnabled) playTactileBlip(1000);
                          setInspectingCertItem(item);
                        }}
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-cyan-950/80 backdrop-blur-md border border-cyan-400 text-[9px] font-mono font-black text-cyan-300 flex items-center gap-1 shadow-lg hover:scale-105 transition-all"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>AI VERIFIED</span>
                      </button>
                    )}

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                      {item.conditionLabel}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Seller Info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{item.sellerAvatar}</span>
                      <span className="truncate text-slate-300">{item.sellerName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 font-mono font-bold flex-shrink-0">
                      <Star className="w-3 h-3 fill-current" /> {item.sellerRating}
                    </div>
                  </div>
                </div>

                {/* Price & Action Footer */}
                <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-black text-amber-400 font-mono">฿{item.price}</span>
                      {item.originalPrice && (
                        <span className="text-xs text-slate-500 line-through ml-1.5 font-mono">
                          ฿{item.originalPrice}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">ขายแล้ว {item.salesCount}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="py-2 px-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400 text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>ใส่ตะกร้า</span>
                    </button>
                    <button
                      onClick={() => handleOpenDirectPay(item)}
                      className="py-2 px-2 rounded-xl bg-cyan-500 text-slate-950 hover:brightness-110 text-xs font-black transition-all flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(0,210,255,0.3)]"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>สแกนจ่าย</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cart Modal / Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#070D1E] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ตะกร้าสินค้า WIN Street Market</h3>
                  <p className="text-xs text-slate-400">{cart.length} รายการที่เลือก</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  ไม่มีสินค้าในตะกร้า เลือกช้อปสินค้าได้เลยครับ
                </div>
              ) : (
                cart.map(({ item, quantity }) => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-xl">
                        {item.imageIcon}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white line-clamp-1">{item.title}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">฿{item.price} × {quantity} = ฿{item.price * quantity}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Summary Breakdown */}
            {cart.length > 0 && (
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>ราคาสินค้ารวม:</span>
                  <span className="text-white">฿{totals.subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ค่าจัดส่งพี่วินเริ่มต้น:</span>
                  <span className="text-white">฿{totals.delivery}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ค่าส่งบวกเพิ่ม (ประกัน 2฿ + พี่วิน 2฿ + ระบบ 1฿):</span>
                  <span className="text-cyan-300">+฿{totals.surcharge}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ค่ากล่อง/บรรจุภัณฑ์บังคับ (ลดเหลือ 5฿):</span>
                  <span className="text-amber-300">+฿{totals.packaging}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-white">
                  <span>ยอดสุทธิรวมทั้งสิ้น:</span>
                  <span className="text-amber-400 font-mono text-base">฿{totals.grandTotal} บาท</span>
                </div>
              </div>
            )}

            {/* Checkout Trigger */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsCartOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-xs font-bold"
              >
                เลือกซื้อต่อ
              </button>
              <button
                onClick={handleExecuteCheckout}
                disabled={cart.length === 0}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] disabled:opacity-40"
              >
                ยืนยันสั่งซื้อและชำระเงิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Success Receipt Modal */}
      {isCheckoutSuccess && lastReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#070D1E] border border-emerald-500/50 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-lg font-black text-white">สั่งซื้อสินค้าสตรีทมาร์เก็ตสำเร็จ!</h4>
              <p className="text-xs text-slate-400">รหัสออเดอร์: {lastReceipt.orderId}</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>พี่วินผู้รับงาน:</span>
                <span className="text-cyan-300 font-bold">{lastReceipt.riderAssigned}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ยอดชำระสุทธิ:</span>
                <span className="text-amber-400 font-bold">฿{lastReceipt.grandTotal} THB</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>เวลาสั่งซื้อ:</span>
                <span className="text-slate-300">{lastReceipt.time} น.</span>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutSuccess(false)}
              className="w-full py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs hover:brightness-110 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              รับทราบ & ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Customer "วันนี้มีของมาขาย" Listing Modal */}
      {isSellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#070D1E] border border-[#FFD700]/50 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#FFD700]/20 text-[#FFD700]">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ลงขายสินค้าวันนี้ (C2C)</h3>
                  <p className="text-xs text-slate-400">โพสต์ขายของมือสอง ขนมทำเอง หรือของแฮนด์เมดได้ทันที</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSellModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishCustomerItem} className="space-y-4 text-xs">
              {/* Mandatory AI Photo Verification Section */}
              <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>AI Vision Guard (ข้อบังคับการลงขาย)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                    Mandatory AI Verification
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  ถ่ายรูปสินค้าจริงเพื่อวิเคราะห์สภาพสินค้า ยืนยันความปลอดภัย และออกใบรับรอง AI Guard Certificate
                </p>

                <AIProductPhotoVerifier
                  audioEnabled={audioEnabled}
                  onVerificationComplete={(result) => {
                    setCustomerAiVerified(result);
                    if (!newTitle) setNewTitle(result.suggestedTitle);
                    if (!newPrice) setNewPrice(result.estimatedPriceRange.min.toString());
                    if (!newDescription) setNewDescription(result.detectedFeatures.join(', '));
                  }}
                  onReset={() => setCustomerAiVerified(null)}
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">ชื่อสินค้า / สิ่งที่ต้องการขาย:</label>
                <input 
                  type="text"
                  required
                  placeholder="เช่น กล้องฟิล์ม, คุกกี้อบสด, เสื้อวินเทจ, หนังสือเรียน..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">ราคาขาย (บาท):</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    placeholder="เช่น 150"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold text-xs focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">อิโมจิสินค้า:</label>
                  <div className="flex gap-1.5">
                    {['📦', '🍪', '📷', '👗', '🎨', '📿', '📚', '🪴'].map(em => (
                      <button
                        type="button"
                        key={em}
                        onClick={() => setNewEmoji(em)}
                        className={`p-1.5 rounded-lg border text-sm ${
                          newEmoji === em ? 'border-amber-400 bg-amber-500/20' : 'border-white/10 bg-black/40'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">หมวดหมู่:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MarketItemCategory)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                  >
                    <option value="second_hand">ของมือสอง & วินเทจ</option>
                    <option value="food_snack">อาหาร & ขนมทำเอง</option>
                    <option value="fashion_accessories">เสื้อผ้า & เครื่องประดับ</option>
                    <option value="handmade_art">งานฝีมือ & ศิลปะ</option>
                    <option value="produce_fruit">ผักผลไม้จากสวน</option>
                    <option value="stationery_craft">เครื่องเขียน</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">สภาพสินค้า:</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as any)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                  >
                    <option value="used">มือสองสภาพดี</option>
                    <option value="handmade">งานทำมือ แฮนด์เมด</option>
                    <option value="fresh">ปรุงสดใหม่ / สดจากสวน</option>
                    <option value="new">ของใหม่มือหนึ่ง</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">รายละเอียดสินค้า:</label>
                <textarea 
                  rows={3}
                  placeholder="ระบุจุดเด่น สภาพ ไซส์ หรือรสชาติ เพื่อให้ผู้ซื้อตัดสินใจง่ายขึ้น..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">จุดนัดรับของพี่วิน:</label>
                <input 
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              {/* Quick Customer QR Code Generation for this listing */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFD700]/20 text-[#FFD700]">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-300 block">QR Code รับเงินสินค้านี้ (ระบุยอดเอง)</span>
                    <span className="text-[10px] text-slate-400">สร้าง QR Code พร้อมเพย์/วอลเล็ตให้ผู้ซื้อสแกนทันที</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    setCustomerQrAmount(Number(newPrice) || 150);
                    setCustomerQrTitle(newTitle || 'สินค้าจาก วันนี้มีของมาขาย');
                    setIsCustomerQrModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md active:scale-95 shrink-0"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>เปิด QR Code</span>
                </button>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSellModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!customerAiVerified}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${
                    customerAiVerified 
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.4)] cursor-pointer hover:brightness-110' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  }`}
                >
                  {customerAiVerified ? 'โพสต์ลงตลาดนัดทันที ✨' : 'กรุณาถ่ายรูปให้ AI ยืนยันก่อน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct QR Pay Modal */}
      {selectedItemForPay && (
        <WinScanAndPayModal
          isOpen={isPayModalOpen}
          onClose={() => { setIsPayModalOpen(false); setSelectedItemForPay(null); }}
          entityName={selectedItemForPay.sellerName}
          entityType={selectedItemForPay.sellerType}
          entityCategoryLabel={selectedItemForPay.categoryLabel}
          defaultAmount={selectedItemForPay.price}
          audioEnabled={audioEnabled}
        />
      )}

      {/* Customer "วันนี้มีของมาขาย" Custom QR Code Modal (ระบุจำนวนเงินเองได้) */}
      <CustomerPaymentQrCodeModal
        isOpen={isCustomerQrModalOpen}
        onClose={() => setIsCustomerQrModalOpen(false)}
        customerName="คุณลูกค้า (ผู้ขายชุมชน C2C)"
        defaultItemTitle={customerQrTitle}
        defaultAmount={customerQrAmount}
        audioEnabled={audioEnabled}
      />

      {/* AI Guard Verification Certificate Inspection Modal */}
      {inspectingCertItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#070D1E] border border-cyan-400/60 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Vision Guard™ Certificate</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {inspectingCertItem.aiCertificateId || 'CERT-AI-WIN-AUTHENTIC'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setInspectingCertItem(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/60 flex items-center justify-center">
              {inspectingCertItem.imageUrl ? (
                <img 
                  src={inspectingCertItem.imageUrl} 
                  alt={inspectingCertItem.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-6xl">{inspectingCertItem.imageIcon}</span>
              )}
              <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>AI Passed {inspectingCertItem.aiQualityScore || 98}%</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-1">
                <div className="text-slate-400 text-[10px]">ชื่อสินค้าที่รับรอง</div>
                <div className="text-white font-bold text-sm">{inspectingCertItem.title}</div>
                <div className="text-slate-300 text-[11px]">{inspectingCertItem.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                  <div className="text-slate-400 text-[10px]">ผู้ลงขาย</div>
                  <div className="text-white font-bold">{inspectingCertItem.sellerName}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                  <div className="text-slate-400 text-[10px]">วันที่ตรวจสอบ</div>
                  <div className="text-cyan-300 font-mono font-bold">
                    {inspectingCertItem.aiVerifiedDate || 'วันนี้'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-[11px] text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>ระบบได้วิเคราะห์ภาพถ่ายจริง ตรวจสอบไม่มีสิ่งของต้องห้าม และสภาพตรงตามหมวดหมู่ 100%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectingCertItem(null)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:brightness-110"
            >
              ปิดหน้าต่างการตรวจสอบ
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Back to Home Bar */}
      {onBackToMain && (
        <div className="pt-4 pb-2">
          <button
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(900);
              onBackToMain();
            }}
            className="w-full py-3.5 rounded-2xl bg-black/60 hover:bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md"
          >
            <span>← กลับสู่หน้าหลัก (Back to Home)</span>
          </button>
        </div>
      )}
    </div>
  );
};
