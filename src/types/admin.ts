import type { RegistrationProfile } from './auth';

export type AdminLevel = 'super' | 'reviewer' | 'support';

export interface AdminClaims {
  admin: boolean;
  adminLevel: AdminLevel;
}

export interface AdminKycCandidate {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: 'knight' | 'merchant' | 'partner';
  status: 'pending_review' | 'active' | 'suspended';
  createdAt: any;
  registeredAtFormatted?: string;
  kycStatus?: 'pending' | 'verified' | 'approved' | 'rejected';
  rejectionReason?: string;
  rejectionDetail?: string;
  plateNumber?: string;
  licenseNumber?: string;
  vehicleType?: 'motorcycle' | 'car';
  vehicleModel?: string;
  idCardNumber?: string;
  province?: string;
  district?: string;
  documents?: {
    idCardUrl?: string;
    driverLicenseUrl?: string;
    vehiclePhotoUrl?: string;
    portraitPhotoUrl?: string;
  };
}

export interface AuditLogItem {
  id?: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetUid: string;
  targetCollection?: string;
  before?: any;
  after?: any;
  reason: string;
  ip?: string;
  createdAt: any;
}

export type AdminAuditLog = AuditLogItem;

export interface FeeRule {
  id: string;
  titleTh: string;
  serviceType: string;
  minFareBaht: number;
  maxFareBaht: number;
  systemSatang: number;
  insuranceSatang: number;
  pensionSatang?: number;
  activeFrom: string;
  activeTo?: string | null;
  supersedesRuleId?: string;
}

export interface AdminUserSummary {
  uid: string;
  winUid?: string;
  displayName: string;
  email: string;
  phone: string;
  role: 'knight' | 'citizen' | 'merchant' | 'partner' | 'admin';
  status: 'active' | 'pending_review' | 'suspended';
  level?: number;
  xp?: number;
  rating?: number;
  avatarUrl?: string;
  isFoundingKnight?: boolean;
  plateNumber?: string;
  licenseNumber?: string;
  suspendedReason?: string;
  gpRate?: number;
  createdAt: any;
  updatedAt?: any;
  registration?: RegistrationProfile;
}

export interface LedgerLeg {
  accountId: string;
  accountType: string;
  direction: 'DEBIT' | 'CREDIT';
  amountSatang: number;
  descriptionTh?: string;
}

export interface LedgerTransaction {
  id: string;
  transactionId: string;
  type: string;
  totalDebitSatang: number;
  totalCreditSatang: number;
  balanced: boolean;
  reason: string;
  createdAt: string | Date;
  legs: LedgerLeg[];
}

export interface SystemBucketsBreakdown {
  system: number;
  insurance: number;
  pension: number;
  helmet: number;
  equipment: number;
  totalBalanceSatang: number;
  totalDebitSatang: number;
  totalCreditSatang: number;
  isBalanced: boolean;
}

export interface FeeRuleItem {
  id: string;
  serviceType: string;
  payerRole: string;
  tier?: string;
  fareMinSatang?: number;
  fareMaxSatang?: number;
  amountSatang?: number;
  percentBps?: number;
  buckets: {
    system: number;
    insurance: number;
    pension: number;
    helmet: number;
    equipment: number;
  };
  activeFrom?: string;
  activeTo?: string | null;
  supersedesRuleId?: string;
  descriptionTh?: string;
}
