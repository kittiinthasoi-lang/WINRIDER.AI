import { collection, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_FEE_RULES_CONFIG } from '../core/feeEngine';

export interface FeeRuleItem {
  id?: string;
  serviceType: string;
  payerRole: 'knight' | 'citizen' | 'merchant' | 'partner';
  fareMinSatang?: number;
  fareMaxSatang?: number;
  amountSatang?: number;
  percentBps?: number;
  tier?: 'standard' | 'founding';
  maxRoundsPerDay?: number;
  totalCapSatang?: number;
  buckets: {
    system?: number;
    insurance?: number;
    pension?: number;
    helmet?: number;
    equipment?: number;
  };
  activeFrom?: any;
}

export const INITIAL_FEE_RULES: FeeRuleItem[] = [
  {
    id: 'knight_standard',
    serviceType: 'ALL',
    payerRole: 'knight',
    fareMinSatang: 0,
    fareMaxSatang: 999999,
    amountSatang: 500,
    buckets: { system: 300, insurance: 100, pension: 100 },
    tier: 'standard',
  },
  {
    id: 'knight_founding',
    serviceType: 'ALL',
    payerRole: 'knight',
    fareMinSatang: 0,
    fareMaxSatang: 999999,
    amountSatang: 200,
    buckets: { system: 100, insurance: 100 },
    tier: 'founding',
  },
  {
    id: 'citizen_standard',
    serviceType: 'ALL',
    payerRole: 'citizen',
    fareMinSatang: 0,
    fareMaxSatang: 999999,
    amountSatang: 500,
    buckets: { system: 300, insurance: 100, helmet: 100 },
  },
  {
    id: 'merchant_standard',
    serviceType: 'ALL',
    payerRole: 'merchant',
    percentBps: 1000,
    buckets: { system: 1000 },
  },
  {
    id: 'partner_standard',
    serviceType: 'ALL',
    payerRole: 'partner',
    percentBps: 1000,
    buckets: { system: 1000 },
  },
  {
    id: 'equipment_knight',
    serviceType: 'EQUIPMENT',
    payerRole: 'knight',
    amountSatang: 400,
    maxRoundsPerDay: 20,
    totalCapSatang: 360000,
    buckets: { equipment: 400 },
  },
];

let cachedRules: FeeRuleItem[] | null = null;

export async function seedFeeRulesIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, 'fee_rules');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      // Seed master config
      const masterDoc = doc(db, 'fee_rules', 'current_rules');
      await setDoc(masterDoc, {
        ...DEFAULT_FEE_RULES_CONFIG,
        updatedAt: new Date().toISOString(),
      });

      for (const rule of INITIAL_FEE_RULES) {
        const { id, ...data } = rule;
        const targetDoc = doc(db, 'fee_rules', id || `${rule.payerRole}_${rule.serviceType}`);
        await setDoc(targetDoc, {
          ...data,
          activeFrom: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('Seed fee rules note (may require auth or network):', err);
  }
}

export async function getFeeRules(): Promise<FeeRuleItem[]> {
  if (cachedRules) return cachedRules;
  try {
    const colRef = collection(db, 'fee_rules');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      cachedRules = snap.docs.map(d => ({ id: d.id, ...d.data() } as FeeRuleItem));
      return cachedRules;
    }
  } catch (err) {
    console.warn('Could not fetch fee_rules from Firestore, using initial template:', err);
  }
  return INITIAL_FEE_RULES;
}

export function satangToBaht(satang?: number): number {
  if (satang === undefined || satang === null) return 0;
  return Math.round(satang / 100);
}

export function bpsToPercent(bps?: number): number {
  if (bps === undefined || bps === null) return 0;
  return bps / 100;
}
