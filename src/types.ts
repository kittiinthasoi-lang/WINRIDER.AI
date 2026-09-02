export type AppMode = 'passenger' | 'driver' | 'merchant' | 'partner' | 'market' | 'hospital' | 'register' | 'codex';

export type ChapterId = 
  | 'soul' 
  | 'finance' 
  | 'intelligence' 
  | 'armor' 
  | 'weapons' 
  | 'ecosystem' 
  | 'hub_galactic';

export interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  modelName?: string;
  type: string;
  category?: 'commuter' | 'touring' | 'scooter' | 'sport' | 'ev' | 'classic';
  plateNumber: string;
  registrationNumber?: string;
  insuranceStatus?: string;
  status: 'READY' | 'IN_USE' | 'MAINTENANCE';
  isPrimary?: boolean;
  mileage: string;
  fuel: number;
  oil: number;
  batteryHealth?: number;
  image?: string;
  accent: string;
  description: string;
  displacement?: string;
  fuelEconomy?: string;
  dailyRidesDone?: number;
  iconEmoji?: string;
}

export interface FlashSaleItem {
  id: string;
  title: string;
  price: number;
  originalPrice: number;
  timeLeft: string;
  salesCount: number;
  category: string;
  imageIcon: string;
}

export interface WeaponItem {
  id: number;
  code: string;
  name: string;
  nameEn: string;
  category: string;
  description: string;
  specs: string[];
  tacticalBenefit: string;
  goldAccent: string;
  iconName: string;
  levelRequired: number;
}

export interface ArmorTier {
  levelRange: string;
  title: string;
  titleEn: string;
  badge: string;
  xpRequired: number;
  description: string;
  perks: string[];
  colorTheme: string;
  rarity: 'Common' | 'Tactical' | 'Imperial' | 'Legendary' | 'Godlike';
}

export interface PillarItem {
  id: string;
  number: number;
  name: string;
  nameEn: string;
  tagline: string;
  targetAudience: string;
  vehicleType: string;
  highlight: string;
  icon: string;
}

export interface C2CProduct {
  id: string;
  riderName: string;
  riderId: string;
  title: string;
  price: number;
  category: 'Homemade Food' | 'Handcraft' | 'Vintage/2nd Hand' | 'Sacred Amulet';
  description: string;
  location: string;
  rating: number;
}

export interface CIZone {
  id: string;
  name: string;
  nameTh: string;
  ghostRunnersCount: number;
  capillaryRoutesMapped: number;
  floodRisk: 'Low' | 'Medium' | 'High';
  stealthCoverage: number; // percentage
  keyShortcut: string;
}

export type DreamRideCategory = 'all' | 'standard' | 'sport' | 'classic';

export interface DreamRideSpecs {
  brandAndModel: string;
  brand: string;
  model: string;
  engine: string;
  displacement: string;
  power: string;
  torque: string;
  boreAndStroke?: string;
  transmission: string;
  driveSystem: string;
  frontSuspension: string;
  rearSuspension: string;
  frontBrakes: string;
  rearBrakes: string;
  frameAndChassis: string;
  wheelAndTires: string;
  dimensions: string;
  seatHeight: string;
  passengerSeatErgo: string;
  fuelCapacity: string;
  curbWeight: string;
  topSpeed: string;
  comfortScore: number; // out of 100
  safetyRating: number; // out of 100
  fuelOrRange: string;
  electronicsAndSafety: string;
}

export interface DreamRideVehicle {
  id: string;
  name: string;
  thaiName: string;
  category: DreamRideCategory;
  categoryLabel: string;
  tagline: string;
  description: string;
  iconEmoji: string;
  badge: string;
  specs: DreamRideSpecs;
  amenities: string[];
  experienceModes: string[];
  baseMultiplier: number;
  priceAddon: number;
  recommendedFor: string;
  knightRankRequired: string;
  colorTheme: string;
}

export interface AmenityOption {
  id: string;
  name: string;
  nameEn?: string;
  category: 'safety' | 'comfort' | 'tech' | 'care' | 'special';
  categoryLabel: string;
  categoryLabelEn?: string;
  icon: string;
  price: number; // 0 for helmet, 10 to 50 for other items
  touristPrice?: number; // 10% - 20% tourist markup (0 for helmet)
  description: string;
  descriptionEn?: string;
  isHelmet: boolean;
  popular?: boolean;
}

export interface SelectedAmenityItem {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  touristPrice?: number;
  isHelmet: boolean;
  icon?: string;
}

export interface MatchedDriver {
  id: string;
  name: string;
  nameEn: string;
  nickname: string;
  gender: 'female' | 'male';
  level: number;
  tierName: string;
  rating: number;
  totalTrips: number;
  phone: string;
  avatarEmoji: string;
  vehicleModel: string;
  plateNumber: string;
  hasDeliveryBox?: boolean;
  certifications: string[];
  specialtyTags: string[];
  distanceKm: number;
  etaMinutes: number;
  bio: string;
  serviceMatchScore: number;
}

export interface LifestylePlace {
  id: string;
  name: string;
  category: 'restaurant' | 'cafe' | 'pub' | 'chill' | 'pet_cafe' | 'temple';
  categoryLabel: string;
  icon: string;
  area: string;
  distanceKm: number;
  rating: number;
  highlight: string;
  recommendedMenu: string;
  tag: string;
}

export type MarketItemCategory = 
  | 'food_snack' 
  | 'produce_fruit' 
  | 'second_hand' 
  | 'fashion_accessories' 
  | 'handmade_art' 
  | 'medicine_health' 
  | 'pet_supplies' 
  | 'stationery_craft' 
  | 'electronics_gadget';

export interface MarketItem {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  sellerType: 'merchant' | 'citizen';
  sellerName: string;
  sellerAvatar: string;
  sellerLevel: number;
  sellerRating: number;
  category: MarketItemCategory;
  categoryLabel: string;
  condition: 'new' | 'used' | 'handmade' | 'fresh';
  conditionLabel: string;
  description: string;
  imageIcon: string;
  imageUrl?: string;
  location: string;
  distanceKm: number;
  stock: number;
  salesCount: number;
  tags: string[];
  isCustomerListed?: boolean;
  isAiVerified?: boolean;
  aiCertificateId?: string;
  aiQualityScore?: number;
  aiVerifiedDate?: string;
}

export type PartnerCategory = 'pub_bar' | 'hotel' | 'buffet' | 'cafe_club' | 'wellness';

export interface PartnerEvent {
  id: string;
  title: string;
  time: string;
  description: string;
  highlight: string;
  artistOrChef?: string;
  tag: string;
}

export interface PartnerPromotion {
  id: string;
  title: string;
  discount: string;
  condition: string;
  validUntil: string;
  badge: string;
}

export interface PartnerProfile {
  id: string;
  name: string;
  category: PartnerCategory;
  categoryLabel: string;
  icon: string;
  coverGradient: string;
  rating: number;
  reviewCount: number;
  level: number;
  tierName: string;
  xp: number;
  nextXp: number;
  address: string;
  distanceKm: number;
  phone: string;
  openHours: string;
  todayCustomersArrivingViaWin: number;
  activeWinDriversInZone: number;
  description: string;
  amenities: string[];
  eventsToday: PartnerEvent[];
  promotionsToday: PartnerPromotion[];
  specialHighlights: string[];
  walletQrAddress: string;
}

export type EmergencyServiceType = 'hospital' | 'fire_station' | 'rescue_volunteer';

export interface EmergencyStation {
  id: string;
  name: string;
  type: EmergencyServiceType;
  typeLabel: string;
  icon: string;
  phone: string;
  hotline?: string;
  address: string;
  distanceKm: number;
  activeUnitsCount?: number;
  assignedWinDriversCount?: number;
  activeVolunteers?: number;
  activeAmbulances?: number;
  avgResponseTimeMinutes?: number;
  status: 'ONLINE' | 'ACTIVE_DISPATCH' | 'STANDBY' | 'ready' | 'standby';
  highlight?: string;
  colorTheme?: string;
  specialties?: string[];
  availableVehicles?: string[];
}

export interface TransitHub {
  id: string;
  name: string;
  nameEn: string;
  type: 'bts' | 'mrt' | 'train' | 'bus' | 'ferry' | 'airport';
  typeLabel: string;
  lineName?: string;
  icon: string;
  color: string;
  distanceKm: number;
  transferLines: string[];
  winStandCount: number;
  estimatedFareThb: number;
}

export interface MerchantDeliveryBreakdown {
  baseOrderFee: number;
  merchantSurcharge: number; // 5 THB
  breakdown: {
    insuranceFee: number; // 2 THB
    driverPickupCompensation: number; // 2 THB
    systemFee: number; // 1 THB
  };
  packagingBoxFee: number; // 5 THB
  totalAddon: number;
}



