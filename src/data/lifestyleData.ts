import { LifestylePlace } from '../types';

export const LIFESTYLE_PLACES: LifestylePlace[] = [
  // 1. ร้านอาหาร (Restaurants)
  {
    id: 'food_1',
    name: 'ร้านอาหารตามสั่งป้าสมร (Michelin Local)',
    category: 'restaurant',
    categoryLabel: '🍲 ร้านอาหารเด็ด',
    icon: '🍲',
    area: 'ตลาดพลู ฝั่งธนบุรี',
    distanceKm: 1.2,
    rating: 4.9,
    highlight: 'กระเพราหมูกรอบเตาถ่านสูตรโบราณ และต้มยำหัวปลาหม้อไฟ',
    recommendedMenu: 'กระเพราเนื้อสับไข่ดาวกรอบ, ผัดซีอิ๊วเส้นกรอบ',
    tag: 'Michelin Local'
  },
  {
    id: 'food_2',
    name: 'สมศักดิ์ ปูอบ สาขาเจริญรัถ',
    category: 'restaurant',
    categoryLabel: '🍲 ร้านอาหารเด็ด',
    icon: '🦀',
    area: 'คลองสาน - เจริญรัถ',
    distanceKm: 2.1,
    rating: 5.0,
    highlight: 'ปูอบวุ้นเส้นและกุ้งอบวุ้นเส้นระดับตำนาน วุ้นเส้นเหนียวนุ่มน้ำซอสซึมเข้าเนื้อ',
    recommendedMenu: 'ปูไข่อบวุ้นเส้นพิเศษ, กุ้งอบวุ้นเส้น',
    tag: 'Street Legend'
  },
  {
    id: 'food_3',
    name: 'ทิพย์สมัย ผัดไทยประตูผี (ต้นตำรับ)',
    category: 'restaurant',
    categoryLabel: '🍲 ร้านอาหารเด็ด',
    icon: '🍤',
    area: 'มหาไชย - พระนคร',
    distanceKm: 3.8,
    rating: 4.8,
    highlight: 'ผัดไทยเส้นจันท์ห่อไข่กุ้งสด และน้ำส้มคั้นสดในตำนาน',
    recommendedMenu: 'ผัดไทยมันกุ้งห่อไข่, น้ำส้มคั้นสดเกร็ดส้ม',
    tag: 'Must-Visit'
  },

  // 2. คาเฟ่ (Cafes)
  {
    id: 'cafe_1',
    name: 'Craftsman x Roastery Sukhumvit 39',
    category: 'cafe',
    categoryLabel: '☕ คาเฟ่สเปเชียลตี้',
    icon: '☕',
    area: 'สุขุมวิท 39 (พร้อมพงษ์)',
    distanceKm: 2.4,
    rating: 4.9,
    highlight: 'คาเฟ่สไตล์ลอฟท์ดิบเท่ เมล็ดกาแฟ Single Origin คั่วเอง บรรยากาศเงียบสงบ',
    recommendedMenu: 'Dirty Coffee, Yuzu Cold Brew, ครัวซองต์อัลมอนด์',
    tag: 'Specialty Coffee'
  },
  {
    id: 'cafe_2',
    name: 'The Jam Factory Cafe & Gallery',
    category: 'cafe',
    categoryLabel: '☕ คาเฟ่สเปเชียลตี้',
    icon: '🌿',
    area: 'คลองสาน ริมแม่น้ำเจ้าพระยา',
    distanceKm: 1.8,
    rating: 4.8,
    highlight: 'โกดังเก่าปรับปรุงเป็นคาเฟ่ใต้ร่มเงาต้นไทรยักษ์ ริมแม่น้ำเจ้าพระยา',
    recommendedMenu: 'Matcha Espresso Latte, เค้กแครอทครีมชีส',
    tag: 'Riverside Vibe'
  },
  {
    id: 'cafe_3',
    name: 'Nana Coffee Roasters Bangna',
    category: 'cafe',
    categoryLabel: '☕ คาเฟ่สเปเชียลตี้',
    icon: '☕',
    area: 'บางนา - ตราด',
    distanceKm: 4.5,
    rating: 4.9,
    highlight: 'สวนสไตล์ญี่ปุ่นและการตกแต่งแบบธรรมชาติ แชมป์โลกไซฟอนและดริป',
    recommendedMenu: 'Kanda Signature Blend, Nitro Nitro Peach',
    tag: 'Champion Barista'
  },

  // 3. ผับ บาร์ & เลานจ์ (Pubs & Bars)
  {
    id: 'pub_1',
    name: 'Tep Bar - Cultural Bar of Bangkok',
    category: 'pub',
    categoryLabel: '🍸 ผับ & บาร์ค็อกเทล',
    icon: '🍸',
    area: 'ซอยนานา เยาวราช',
    distanceKm: 3.2,
    rating: 4.9,
    highlight: 'บาร์ไทยโมเดิร์น ดนตรีไทยสดประยุกต์และค็อกเทลสมุนไพรไทยแท้',
    recommendedMenu: 'ทอง (Song of Siam Cocktail), ยาดองเซ็ตมหาเสน่ห์',
    tag: 'Thai Craft Spirits'
  },
  {
    id: 'pub_2',
    name: 'Rabbit Hole Hidden Speakeasy',
    category: 'pub',
    categoryLabel: '🍸 ผับ & บาร์ค็อกเทล',
    icon: '🍸',
    area: 'ทองหล่อ สุขุมวิท 55',
    distanceKm: 4.1,
    rating: 4.8,
    highlight: 'บาร์ลับประตูไม้ 3 ชั้น มิกโซโลจิสต์ระดับเอเชียท็อป 50',
    recommendedMenu: 'White Truffle Martini, Mad Hatter Cocktail',
    tag: 'Speakeasy Bar'
  },

  // 4. ร้านนั่งชิว & ดนตรีสด (Chill & Live Music)
  {
    id: 'chill_1',
    name: 'View Dee Relax & Restaurant ริมสระน้ำ',
    category: 'chill',
    categoryLabel: '🎶 ร้านนั่งชิวดนตรีสด',
    icon: '🎶',
    area: 'กัลปพฤกษ์ - ราชพฤกษ์',
    distanceKm: 2.7,
    rating: 4.7,
    highlight: 'บรรยากาศเปิดโล่งริมสระน้ำ ดนตรีสดฟังสบาย เหมาะกับการสังสรรค์ครอบครัวและเพื่อน',
    recommendedMenu: 'ขาหมูเยอรมันทอดกรอบ, กุ้งแช่น้ำปลาวาซาบิ',
    tag: 'Live Acoustic'
  },
  {
    id: 'chill_2',
    name: 'Samsara Cafe & Meal ริมเจ้าพระยา',
    category: 'chill',
    categoryLabel: '🎶 ร้านนั่งชิวดนตรีสด',
    icon: '🌅',
    area: 'ทรงวาด - สัมพันธวงศ์',
    distanceKm: 3.0,
    rating: 4.9,
    highlight: 'บ้านไม้ริมน้ำ ลมโกรก วิวพระอาทิตย์ตกสะท้อนน้ำเจ้าพระยา',
    recommendedMenu: 'เบียร์คราฟต์ไทย, ปลากะพงทอดน้ำปลา',
    tag: 'Sunset View'
  },

  // 5. คาเฟ่หมาแมว & สัตว์เลี้ยง (Pet Cafes)
  {
    id: 'pet_cafe_1',
    name: 'Caturday Cat Cafe (คาเฟ่แมวเหมียวสุดคิ้วท์)',
    category: 'pet_cafe',
    categoryLabel: '🐱 คาเฟ่สัตว์เลี้ยง Pet Friendly',
    icon: '🐱',
    area: 'ราชเทวี (ใกล้ BTS ราชเทวี)',
    distanceKm: 3.6,
    rating: 4.9,
    highlight: 'น้องแมวกว่า 40 สายพันธุ์ ขนฟู สะอาด เป็นมิตร อุ้มเล่นได้',
    recommendedMenu: 'เค้กช็อกโกแลตหน้าน้องแมว, ชาเขียวมัทฉะลาเต้',
    tag: 'Cat Kingdom'
  },
  {
    id: 'pet_cafe_2',
    name: 'Dog In Town Ari (คาเฟ่สุนัขบ๊อกๆ ใจกลางอารีย์)',
    category: 'pet_cafe',
    categoryLabel: '🐶 คาเฟ่สัตว์เลี้ยง Pet Friendly',
    icon: '🐶',
    area: 'อารีย์สัมพันธ์ ซอย 3',
    distanceKm: 4.8,
    rating: 4.9,
    highlight: 'สนามหญ้ากว้างขวาง น้องหมาไซบีเรียน ซามอยด์ และคอร์กี้ขี้เล่น',
    recommendedMenu: 'วาฟเฟิลไอศกรีม, สมูทตี้ผลไม้สด',
    tag: 'Dog Park & Cafe'
  },
  {
    id: 'pet_cafe_3',
    name: 'Pet Planet & Exotic Cafe (คาเฟ่สัตว์พิเศษ)',
    category: 'pet_cafe',
    categoryLabel: '🐰 คาเฟ่สัตว์เลี้ยง Pet Friendly',
    icon: '🐰',
    area: 'พระราม 2 - ท่าข้าม',
    distanceKm: 3.4,
    rating: 4.8,
    highlight: 'คาเฟ่รวมกระต่ายฮอลแลนด์ลอป นกแก้วมาคอว์ และเมียร์แคตสุดน่ารัก',
    recommendedMenu: 'อิตาเลียนโซดา, แพนเค้กเนยสด',
    tag: 'Exotic Pets'
  },

  // 6. สายมู & วัดศักดิ์สิทธิ์ (Mu-Te-Lu Temples)
  {
    id: 'temple_1',
    name: 'วัดกัลยาณมิตร วรมหาวิหาร (หลวงพ่อโต ซำปอกง)',
    category: 'temple',
    categoryLabel: '⛩️ ไหว้พระสายมู 9 วัด',
    icon: '⛩️',
    area: 'ริมแม่น้ำเจ้าพระยา ฝั่งธนบุรี',
    distanceKm: 1.5,
    rating: 5.0,
    highlight: 'ไหว้พระพุทธไตรรัตนนายก (หลวงพ่อโต) เสริมมิตรภาพ การค้า ความสำเร็จ การเดินทางปลอดภัย',
    recommendedMenu: 'ชุดธูปเทียนทองคำหลวงพ่อโต, ผ้ายันต์มงคล',
    tag: 'Sovereign Fortune'
  },
  {
    id: 'temple_2',
    name: 'ศาลเจ้าพ่อเสือ พระนคร (เสาชิงช้า)',
    category: 'temple',
    categoryLabel: '⛩️ ไหว้พระสายมู 9 วัด',
    icon: '🐅',
    area: 'ศาลเจ้าพ่อเสือ พระนคร',
    distanceKm: 3.9,
    rating: 5.0,
    highlight: 'สะเดาะเคราะห์ ต่อชะตา เสริมอำนาจบารมี ค้าขายร่ำรวย ปัดเป่าอุปสรรค',
    recommendedMenu: 'ชุดไหว้หมูสามชั้น ไข่สด และข้าวเหนียวหวาน',
    tag: 'Supreme Protection'
  },
  {
    id: 'temple_3',
    name: 'วัดระฆังโฆสิตาราม วรมหาวิหาร (สมเด็จโต)',
    category: 'temple',
    categoryLabel: '⛩️ ไหว้พระสายมู 9 วัด',
    icon: '🔔',
    area: 'ศิริราช บางกอกน้อย',
    distanceKm: 2.8,
    rating: 5.0,
    highlight: 'สวดพระคาถาชินบัญชร ชื่อเสียงโด่งดัง ดังก้องกังวานดั่งเสียงระฆัง',
    recommendedMenu: 'บทสวดพระคาถาชินบัญชรฉบับสมบูรณ์, ดอกบัวบูชาพระ',
    tag: 'Fame & Harmony'
  }
];
