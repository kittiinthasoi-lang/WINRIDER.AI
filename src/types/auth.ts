export type UserRole = 'knight' | 'citizen' | 'merchant' | 'partner';
export type UserStatus = 'pending_review' | 'active' | 'suspended';

export interface PdpaConsent {
  version: string;
  acceptedAt: any;
}

export interface UserDoc {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  phone: string;
  province?: string;
  district?: string;
  status: UserStatus;
  pdpaConsent?: PdpaConsent;
  level?: number;
  xp?: number;
  rating?: number;
  avatarUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface KnightDoc {
  level: number;
  xp: number;
  isOnline: boolean;
  vehicleType: 'motorcycle' | 'car';
  plateNumber: string;
  licenseNumber: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  isFoundingKnight: boolean;
  equipmentPaidSatang: number;
  dailyEquipmentCount: number;
  certifications: string[];
  documents?: {
    driverLicenseUrl?: string;
    vehiclePhotoUrl?: string;
  };
}

export interface CitizenDoc {
  savedAddresses: string[];
  emergencyContact: {
    name: string;
    phone: string;
  };
}

export interface MerchantDoc {
  shopName: string;
  shopType: string;
  address: string;
  gpRate: number;
  taxId?: string;
}

export interface PartnerDoc {
  orgName: string;
  orgType: string;
  contactPerson: string;
  estimatedUsers: number;
  gpRate: number;
}

export interface WalletDoc {
  balanceSatang: number;
  pendingSatang: number;
  lockedSatang: number;
  buckets: {
    system: number;
    insurance: number;
    pension: number;
    helmet: number;
    equipment: number;
  };
}

export interface FoundingCounterDoc {
  count: number;
  limit: number;
}
