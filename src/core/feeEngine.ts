/**
 * WINRIDER.AI Core Fee Engine
 * 
 * ข้อกำหนดทางธุรกิจหลัก:
 * 1. ทุกการคำนวณใช้หน่วย "สตางค์" (integer) ห้ามใช้ float เด็ดขาด
 * 2. อ่านกฎจาก fee_rules collection (Firestore) ไม่ hardcode ตัวเลขตายตัว
 * 3. โครงสร้างบันไดอัศวิน (Tiered Flat Fee):
 *    - <= 30 บาท (<= 3,000 สตางค์) หัก 2 บาท (200 สตางค์)
 *    - 31-60 บาท (3,001 - 6,000 สตางค์) หัก 4 บาท (400 สตางค์)
 *    - 61-120 บาท (6,001 - 12,000 สตางค์) หัก 6 บาท (600 สตางค์)
 *    - 121-250 บาท (12,001 - 25,000 สตางค์) หัก 8 บาท (800 สตางค์)
 *    - > 250 บาท (> 25,000 สตางค์) หัก 10 บาท (1,000 สตางค์ เพดานตายตัว)
 * 4. ฝั่งพลเมือง: หัก 5 บาท (500 สตางค์) ทุกทริป:
 *    - ค่าระบบ (system): 3 บาท (300 สตางค์)
 *    - คุ้มครองอุบัติเหตุ (insurance): 1 บาท (100 สตางค์)
 *    - มัดจำหมวก (helmet): 1 บาท (100 สตางค์)
 * 5. Founding Knight Lock:
 *    - ถ้า knight.isFoundingKnight === true ให้หัก 2 บาท (200 สตางค์) เสมอทุกระยะทาง ตลอดชีพ
 * 6. ค่าอุปกรณ์:
 *    - หักเพิ่ม 4 บาท (400 สตางค์) เฉพาะ 20 รอบแรกของวัน (reset ตาม timezone Asia/Bangkok เวลา 00:00)
 *    - หยุดหักอัตโนมัติเมื่อยอดสะสมครบ 3,600 บาท (360,000 สตางค์)
 * 7. ร้านค้า GP:
 *    - founding = 5% (500 bps)
 *    - standard = 10% (1,000 bps)
 *    - growth = 13% (1,300 bps)
 * 8. ฟังก์ชันหลัก calculateFees(input) คืน object ที่แตกเป็น 5 bucket: system, insurance, pension, helmet, equipment
 */


// 5 ถังเงินหลักของระบบ WINRIDER.AI (หน่วย: สตางค์ integer)
export interface FeeBucketsSatang {
  system: number;     // ค่าระบบ / เซิร์ฟเวอร์
  insurance: number;  // กองทุนคุ้มครองอุบัติเหตุ
  pension: number;    // เงินออมเพื่ออนาคตอัศวิน
  helmet: number;     // มัดจำหมวกนิรภัยพลเมือง
  equipment: number;  // ผ่อนชำระชุดเกราะ/อุปกรณ์
}

export interface KnightTierRule {
  id: string;
  nameTh: string;
  fareMinSatang: number;
  fareMaxSatang: number;
  feeSatang: number;
  buckets: FeeBucketsSatang;
}

export interface FeeRulesConfig {
  version: string;
  updatedAt: string;
  knightTiers: KnightTierRule[];
  foundingKnight: {
    feeSatang: number;
    buckets: FeeBucketsSatang;
  };
  citizen: {
    feeSatang: number;
    buckets: FeeBucketsSatang;
  };
  equipment: {
    perRoundSatang: number;
    maxRoundsPerDay: number;
    totalCapSatang: number;
    timezone: string;
  };
  merchantGP: {
    foundingBps: number; // 500 = 5.00%
    standardBps: number; // 1000 = 10.00%
    growthBps: number;   // 1300 = 13.00%
  };
}

/**
 * กฎตั้งต้น (Default Master Rules) ตรงตามสเปก 100%
 * ทุกตัวเลขเป็น integer สตางค์ (1 บาท = 100 สตางค์)
 */
export const DEFAULT_FEE_RULES_CONFIG: FeeRulesConfig = {
  version: '2026.1',
  updatedAt: '2026-01-01T00:00:00Z',
  knightTiers: [
    {
      id: 'tier_1',
      nameTh: '<= 30 บาท',
      fareMinSatang: 0,
      fareMaxSatang: 3000,
      feeSatang: 200,
      buckets: { system: 100, insurance: 100, pension: 0, helmet: 0, equipment: 0 }
    },
    {
      id: 'tier_2',
      nameTh: '31-60 บาท',
      fareMinSatang: 3001,
      fareMaxSatang: 6000,
      feeSatang: 400,
      buckets: { system: 200, insurance: 100, pension: 100, helmet: 0, equipment: 0 }
    },
    {
      id: 'tier_3',
      nameTh: '61-120 บาท',
      fareMinSatang: 6001,
      fareMaxSatang: 12000,
      feeSatang: 600,
      buckets: { system: 300, insurance: 200, pension: 100, helmet: 0, equipment: 0 }
    },
    {
      id: 'tier_4',
      nameTh: '121-250 บาท',
      fareMinSatang: 12001,
      fareMaxSatang: 25000,
      feeSatang: 800,
      buckets: { system: 400, insurance: 200, pension: 200, helmet: 0, equipment: 0 }
    },
    {
      id: 'tier_5',
      nameTh: '250 บาทขึ้นไป (เพดานตายตัว)',
      fareMinSatang: 25001,
      fareMaxSatang: 999999999,
      feeSatang: 1000,
      buckets: { system: 500, insurance: 300, pension: 200, helmet: 0, equipment: 0 }
    }
  ],
  foundingKnight: {
    feeSatang: 200,
    buckets: { system: 100, insurance: 100, pension: 0, helmet: 0, equipment: 0 }
  },
  citizen: {
    feeSatang: 500, // 5 บาท
    buckets: { system: 300, insurance: 100, pension: 0, helmet: 100, equipment: 0 }
  },
  equipment: {
    perRoundSatang: 400,    // 4 บาท
    maxRoundsPerDay: 20,    // 20 รอบแรกของวัน
    totalCapSatang: 360000, // 3,600 บาท (360,000 สตางค์)
    timezone: 'Asia/Bangkok'
  },
  merchantGP: {
    foundingBps: 500,  // 5%
    standardBps: 1000, // 10%
    growthBps: 1300    // 13%
  }
};

let cachedFirestoreRules: FeeRulesConfig | null = null;

/**
 * ดึงกฎจาก collection 'fee_rules' ใน Firestore
 */
export async function getFeeRulesFromFirestore(): Promise<FeeRulesConfig> {
  if (cachedFirestoreRules) return cachedFirestoreRules;
  try {
    // Keep the pure fee engine importable in Node tests without bootstrapping
    // Firebase Auth. Firestore is loaded only when this persistence adapter is used.
    const [{ doc, getDoc, collection, getDocs }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('../firebase'),
    ]);
    const configDocRef = doc(db, 'fee_rules', 'current_rules');
    const docSnap = await getDoc(configDocRef);
    if (docSnap.exists()) {
      cachedFirestoreRules = docSnap.data() as FeeRulesConfig;
      return cachedFirestoreRules;
    }

    // Fallback: ตรวจสอบ doc แยกย่อยหากมีการเก็บแบบแยกเอกสาร
    const colSnap = await getDocs(collection(db, 'fee_rules'));
    if (!colSnap.empty) {
      // มีคอลเลกชันแต่ไม่มี current_rules doc ให้ใช้ default พร้อมแคช
      cachedFirestoreRules = { ...DEFAULT_FEE_RULES_CONFIG };
      return cachedFirestoreRules;
    }
  } catch (err) {
    console.warn('FeeEngine: Unable to read fee_rules from Firestore, fallback to default config:', err);
  }
  return DEFAULT_FEE_RULES_CONFIG;
}

export function setCachedFeeRules(rules: FeeRulesConfig): void {
  cachedFirestoreRules = rules;
}

export function clearCachedFeeRules(): void {
  cachedFirestoreRules = null;
}

/**
 * ฟังก์ชันช่วยแปลงวันและเวลาตาม Timezone Asia/Bangkok
 * สำหรับตรวจสอบรอบของวัน (reset ณ 00:00 น.)
 */
export function getBangkokDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function isDifferentBangkokDay(
  lastTimestamp?: string | Date | number,
  currentDate: Date = new Date()
): boolean {
  if (!lastTimestamp) return false;
  const lastDate = new Date(lastTimestamp);
  if (isNaN(lastDate.getTime())) return false;
  return getBangkokDateKey(lastDate) !== getBangkokDateKey(currentDate);
}

export interface KnightFeeInput {
  isFoundingKnight?: boolean;
  equipmentPaidSatang?: number; // ยอดสะสมที่ผ่อนไปแล้ว (สตางค์)
  dailyEquipmentCount?: number; // จำนวนรอบที่หักอุปกรณ์ไปแล้วในวันนี้ (0, 1, 2, ...)
  lastTripTimestamp?: string | Date | number; // เวลาของทริปล่าสุดเพื่อตรวจสอบการเปลี่ยนวัน
}

export interface CalculateFeesInput {
  fareSatang: number; // ค่าโดยสารรวม (สตางค์) เช่น 30 บาท = 3000 สตางค์
  knight?: KnightFeeInput;
  rules?: FeeRulesConfig; // ส่ง config กฎเข้ามาได้ หรือเว้นว่างเพื่อใช้ cached/Firestore rules
  now?: Date | string | number; // สำหรับจำลองเวลาการทดสอบ
}

export interface CalculateFeesResult {
  fareSatang: number;
  knightFeeSatang: number;
  equipmentFeeSatang: number;
  totalKnightDeductionSatang: number; // knightFeeSatang + equipmentFeeSatang
  citizenFeeSatang: number;
  netKnightEarningsSatang: number;    // fareSatang - totalKnightDeductionSatang
  totalCitizenPaySatang: number;      // fareSatang + citizenFeeSatang
  
  // 5 Buckets หลัก (ระบบ, ประกัน, บำนาญ, หมวก, อุปกรณ์) - รวมทั้งฝั่งอัศวินและพลเมือง
  buckets: FeeBucketsSatang;
  
  // แตกย่อยเฉพาะฝั่งอัศวิน
  knightBuckets: FeeBucketsSatang;
  
  // แตกย่อยเฉพาะฝั่งพลเมือง
  citizenBuckets: FeeBucketsSatang;

  // รายละเอียดการตัดสินใจ
  appliedTierId: string;
  appliedTierNameTh: string;
  isFoundingKnightApplied: boolean;
  equipmentApplied: boolean;
  newDailyEquipmentCount: number;
  newEquipmentPaidSatang: number;
}

/**
 * ฟังก์ชันหลัก calculateFees(input)
 * คืน object ที่แตกเป็น 5 bucket: system, insurance, pension, helmet, equipment
 * คำนวณด้วยหน่วย "สตางค์" (integer) 100%
 */
export function calculateFees(input: CalculateFeesInput): CalculateFeesResult {
  const rules = input.rules || cachedFirestoreRules || DEFAULT_FEE_RULES_CONFIG;
  const fareSatang = Math.round(input.fareSatang);
  const knightInput = input.knight || {};
  const isFounding = Boolean(knightInput.isFoundingKnight);
  const currentTime = input.now ? new Date(input.now) : new Date();

  // 1. คำนวณบันไดอัศวิน (Tiered Flat Fee) หรือ Founding Knight Lock
  let knightFeeSatang = 0;
  let appliedTierId = 'founding_knight';
  let appliedTierNameTh = 'Founding Knight Lock (ตลอดชีพ 2 บาท)';
  let baseKnightBuckets: FeeBucketsSatang = { system: 0, insurance: 0, pension: 0, helmet: 0, equipment: 0 };

  if (isFounding) {
    // Founding Knight Lock: 2 บาทเสมอทุกระยะทาง ตลอดชีพ
    knightFeeSatang = rules.foundingKnight.feeSatang;
    baseKnightBuckets = { ...rules.foundingKnight.buckets };
  } else {
    // ค้นหา Tier ตามช่วงค่าโดยสาร
    const matchedTier = rules.knightTiers.find(
      (t) => fareSatang >= t.fareMinSatang && fareSatang <= t.fareMaxSatang
    ) || rules.knightTiers[rules.knightTiers.length - 1];

    appliedTierId = matchedTier.id;
    appliedTierNameTh = matchedTier.nameTh;
    knightFeeSatang = matchedTier.feeSatang;
    baseKnightBuckets = { ...matchedTier.buckets };
  }

  // 2. คำนวณค่าอุปกรณ์ (Equipment Fee: 4 บาท เฉพาะ 20 รอบแรกของวัน, เพดานสะสม 3,600 บาท)
  let currentDailyCount = knightInput.dailyEquipmentCount || 0;
  // ตรวจสอบว่าข้ามวัน (00:00 น. Asia/Bangkok) หรือยัง
  if (isDifferentBangkokDay(knightInput.lastTripTimestamp, currentTime)) {
    currentDailyCount = 0;
  }

  const currentEquipmentPaidSatang = knightInput.equipmentPaidSatang || 0;
  let equipmentFeeSatang = 0;
  let equipmentApplied = false;
  let newDailyEquipmentCount = currentDailyCount;
  let newEquipmentPaidSatang = currentEquipmentPaidSatang;

  const { perRoundSatang, maxRoundsPerDay, totalCapSatang } = rules.equipment;

  // ตรวจสอบเงื่อนไข:
  // - ยังไม่ครบ 20 รอบในวันนั้น (currentDailyCount < maxRoundsPerDay)
  // - ยอดสะสมยังไม่ครบ 360,000 สตางค์ (currentEquipmentPaidSatang < totalCapSatang)
  if (currentDailyCount < maxRoundsPerDay && currentEquipmentPaidSatang < totalCapSatang) {
    const remainingToCap = totalCapSatang - currentEquipmentPaidSatang;
    // หัก 400 สตางค์ หรือหักเฉพาะส่วนที่เหลือเพื่อให้ครบ 360,000 สตางค์
    equipmentFeeSatang = Math.min(perRoundSatang, remainingToCap);
    equipmentApplied = equipmentFeeSatang > 0;
    newDailyEquipmentCount = currentDailyCount + 1;
    newEquipmentPaidSatang = currentEquipmentPaidSatang + equipmentFeeSatang;
  }

  // รวมถังเงินฝั่งอัศวิน
  const knightBuckets: FeeBucketsSatang = {
    system: baseKnightBuckets.system,
    insurance: baseKnightBuckets.insurance,
    pension: baseKnightBuckets.pension,
    helmet: baseKnightBuckets.helmet,
    equipment: equipmentFeeSatang, // ค่าอุปกรณ์เข้าถัง equipment
  };

  const totalKnightDeductionSatang = knightFeeSatang + equipmentFeeSatang;
  const netKnightEarningsSatang = Math.max(0, fareSatang - totalKnightDeductionSatang);

  // 3. คำนวณฝั่งพลเมือง (หัก 5 บาททุกทริป: ค่าระบบ 3 + คุ้มครอง 1 + มัดจำหมวก 1)
  const citizenFeeSatang = rules.citizen.feeSatang;
  const citizenBuckets: FeeBucketsSatang = { ...rules.citizen.buckets };
  const totalCitizenPaySatang = fareSatang + citizenFeeSatang;

  // 4. ถังเงินรวม 5 Buckets ของทริป (system, insurance, pension, helmet, equipment)
  const totalBuckets: FeeBucketsSatang = {
    system: knightBuckets.system + citizenBuckets.system,
    insurance: knightBuckets.insurance + citizenBuckets.insurance,
    pension: knightBuckets.pension + citizenBuckets.pension,
    helmet: knightBuckets.helmet + citizenBuckets.helmet,
    equipment: knightBuckets.equipment + citizenBuckets.equipment,
  };

  return {
    fareSatang,
    knightFeeSatang,
    equipmentFeeSatang,
    totalKnightDeductionSatang,
    citizenFeeSatang,
    netKnightEarningsSatang,
    totalCitizenPaySatang,
    buckets: totalBuckets,
    knightBuckets,
    citizenBuckets,
    appliedTierId,
    appliedTierNameTh,
    isFoundingKnightApplied: isFounding,
    equipmentApplied,
    newDailyEquipmentCount,
    newEquipmentPaidSatang,
  };
}

/**
 * คำนวณ GP ร้านค้าพันธมิตร (หน่วย: สตางค์ integer)
 * founding = 5% (500 bps)
 * standard = 10% (1,000 bps)
 * growth = 13% (1,300 bps)
 */
export function calculateMerchantGP(
  orderTotalSatang: number,
  tier: 'founding' | 'standard' | 'growth',
  rules?: FeeRulesConfig
): {
  orderTotalSatang: number;
  gpBps: number;
  gpPercentText: string;
  gpAmountSatang: number;
  netPayoutSatang: number;
} {
  const activeRules = rules || cachedFirestoreRules || DEFAULT_FEE_RULES_CONFIG;
  const bpsMap = {
    founding: activeRules.merchantGP.foundingBps,
    standard: activeRules.merchantGP.standardBps,
    growth: activeRules.merchantGP.growthBps,
  };

  const gpBps = bpsMap[tier] || activeRules.merchantGP.standardBps;
  // คำนวณด้วย integer satang (bps / 10,000)
  const gpAmountSatang = Math.floor((orderTotalSatang * gpBps) / 10000);
  const netPayoutSatang = orderTotalSatang - gpAmountSatang;

  return {
    orderTotalSatang,
    gpBps,
    gpPercentText: `${gpBps / 100}%`,
    gpAmountSatang,
    netPayoutSatang,
  };
}

// -------------------------------------------------------------
// Backward Compatibility Layer สำหรับ Component เดิม (Dashboard/Wallet)
// -------------------------------------------------------------

export interface FeeBreakdown {
  baseFare: number;
  citizenPlatformFee: number;
  knightDeductions: {
    system: number;
    insurance: number;
    pension: number;
    helmet: number;
    equipment: number;
    totalDeduction: number;
  };
  knightNetEarnings: number;
  totalCitizenPay: number;
  appliedRules: any[];
}

export class FeeEngine {
  private config: FeeRulesConfig;

  constructor(customConfig?: FeeRulesConfig) {
    this.config = customConfig || DEFAULT_FEE_RULES_CONFIG;
  }

  public setRules(newConfig: FeeRulesConfig): void {
    this.config = newConfig;
  }

  public getRules(): FeeRulesConfig {
    return this.config;
  }

  public calculateTripFees(
    baseFareBaht: number,
    serviceType: string = 'GENERAL',
    isEquipmentFullyPaid: boolean = false
  ): FeeBreakdown {
    const fareSatang = Math.round(baseFareBaht * 100);
    const result = calculateFees({
      fareSatang,
      knight: {
        equipmentPaidSatang: isEquipmentFullyPaid ? 360000 : 0,
        dailyEquipmentCount: 0,
      },
      rules: this.config,
    });

    return {
      baseFare: baseFareBaht,
      citizenPlatformFee: result.citizenFeeSatang / 100,
      knightDeductions: {
        system: result.knightBuckets.system / 100,
        insurance: result.knightBuckets.insurance / 100,
        pension: result.knightBuckets.pension / 100,
        helmet: result.knightBuckets.helmet / 100,
        equipment: result.knightBuckets.equipment / 100,
        totalDeduction: result.totalKnightDeductionSatang / 100,
      },
      knightNetEarnings: result.netKnightEarningsSatang / 100,
      totalCitizenPay: result.totalCitizenPaySatang / 100,
      appliedRules: [
        { id: result.appliedTierId, name: result.appliedTierNameTh }
      ],
    };
  }

  public calculateMerchantGP(
    totalAmountBaht: number,
    tier: 'founding' | 'standard' | 'growth'
  ): { gpRate: number; gpAmount: number; netPayout: number } {
    const totalSatang = Math.round(totalAmountBaht * 100);
    const res = calculateMerchantGP(totalSatang, tier, this.config);
    return {
      gpRate: res.gpBps / 100,
      gpAmount: res.gpAmountSatang / 100,
      netPayout: res.netPayoutSatang / 100,
    };
  }
}

export const globalFeeEngine = new FeeEngine();
