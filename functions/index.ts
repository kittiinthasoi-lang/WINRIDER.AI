/**
 * WINRIDER.AI Cloud Functions
 * Sovereign Double-Entry Financial Engine & Wallet Management
 * 
 * Functions:
 * 1. onTripCompleted (Firestore trigger) - คำนวณค่าธรรมเนียม, เขียน ledger entries แบบ debit/credit คู่กัน, อัปเดต wallet buckets ทั้งหมดใน Firestore Transaction เดียว
 * 2. topUpWallet (callable) - รับการเติมเงิน ตรวจสอบ idempotency key ป้องกันเติมซ้ำ
 * 3. requestPayout (callable) - ขอถอนเงิน ตรวจว่ายอด available เพียงพอ (balance - locked)
 * 4. onUserCreated (Firestore trigger) - สร้าง initial wallet ด้วย Admin SDK อัตโนมัติ
 * 
 * Invariants & Constraints:
 * - ทุก transaction ต้องมี idempotencyKey ป้องกันการยิงซ้ำ
 * - ผลรวม debit ต้องเท่ากับ credit เสมอ ถ้าไม่เท่าให้ throw error และ rollback
 * - คำนวณด้วยหน่วยสตางค์ (Satang Integer) 100% ห้ามใช้ Floating point เด็ดขาด
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp();
}

// Support custom named Firestore database from applet configuration
const FIRESTORE_DB_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-winriderai-96f1b3b6-26ee-4fca-ba51-662b278eea8d";
export const db = getFirestore(FIRESTORE_DB_ID);

/**
 * 5 ถังเงินหลักของระบบ WINRIDER.AI (หน่วย: สตางค์ integer)
 */
export interface FeeBucketsSatang {
  system: number;     // ค่าระบบ / เซิร์ฟเวอร์
  insurance: number;  // กองทุนคุ้มครองอุบัติเหตุ
  pension: number;    // เงินออมเพื่ออนาคตอัศวิน
  helmet: number;     // มัดจำหมวกนิรภัยพลเมือง
  equipment: number;  // ผ่อนชำระชุดเกราะ/อุปกรณ์
}

export interface LedgerLeg {
  accountId: string;
  accountType: 
    | 'CITIZEN_WALLET' 
    | 'KNIGHT_WALLET' 
    | 'SYSTEM_REVENUE' 
    | 'INSURANCE_FUND' 
    | 'PENSION_FUND' 
    | 'HELMET_DEPOSIT' 
    | 'EQUIPMENT_INSTALLMENT'
    | 'CLEARING_PAYMENT_GATEWAY' 
    | 'CLEARING_PAYOUT_PENDING';
  direction: 'DEBIT' | 'CREDIT';
  amountSatang: number;
  descriptionTh: string;
}

/**
 * Helper: Bangkok Timezone Date String YYYY-MM-DD
 */
function getBangkokDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * คำนวณค่าธรรมเนียมตามกฎบันไดอัศวินและพลเมือง (หน่วยสตางค์ integer)
 */
function calculateTripFeesInternal(params: {
  fareSatang: number;
  isFoundingKnight: boolean;
  equipmentPaidSatang: number;
  dailyEquipmentCount: number;
  lastTripDateKey?: string;
  currentDateKey: string;
}) {
  const { fareSatang, isFoundingKnight, currentDateKey, lastTripDateKey } = params;

  // 1. ตรวจสอบการรีเซ็ตรอบอุปกรณ์ประจำวัน (Asia/Bangkok)
  let dailyEquipmentCount = params.dailyEquipmentCount || 0;
  let equipmentPaidSatang = params.equipmentPaidSatang || 0;
  if (lastTripDateKey && lastTripDateKey !== currentDateKey) {
    dailyEquipmentCount = 0;
  }

  // 2. ฝั่งอัศวิน: Tiered Flat Fee หรือ Founding Knight Lock
  let knightFeeSatang = 0;
  let knightBuckets: FeeBucketsSatang = { system: 0, insurance: 0, pension: 0, helmet: 0, equipment: 0 };

  if (isFoundingKnight) {
    // Founding Knight Lock: 2 บาท (200 สตางค์) เสมอทุกระยะทาง ตลอดชีพ
    knightFeeSatang = 200;
    knightBuckets = { system: 100, insurance: 100, pension: 0, helmet: 0, equipment: 0 };
  } else {
    // โครงสร้างบันไดอัศวิน (Tiered Flat Fee)
    if (fareSatang <= 3000) {
      // <= 30 บาท หัก 2 บาท
      knightFeeSatang = 200;
      knightBuckets = { system: 100, insurance: 100, pension: 0, helmet: 0, equipment: 0 };
    } else if (fareSatang <= 6000) {
      // 31-60 บาท หัก 4 บาท
      knightFeeSatang = 400;
      knightBuckets = { system: 200, insurance: 100, pension: 100, helmet: 0, equipment: 0 };
    } else if (fareSatang <= 12000) {
      // 61-120 บาท หัก 6 บาท
      knightFeeSatang = 600;
      knightBuckets = { system: 300, insurance: 200, pension: 100, helmet: 0, equipment: 0 };
    } else if (fareSatang <= 25000) {
      // 121-250 บาท หัก 8 บาท
      knightFeeSatang = 800;
      knightBuckets = { system: 400, insurance: 200, pension: 200, helmet: 0, equipment: 0 };
    } else {
      // 250 บาทขึ้นไป หัก 10 บาท (เพดานตายตัว)
      knightFeeSatang = 1000;
      knightBuckets = { system: 500, insurance: 300, pension: 200, helmet: 0, equipment: 0 };
    }
  }

  // 3. ค่าอุปกรณ์: หักเพิ่ม 4 บาท (400 สตางค์) เฉพาะ 20 รอบแรกของวัน หยุดเมื่อครบ 3,600 บาท (360,000 สตางค์)
  let equipmentFeeSatang = 0;
  if (dailyEquipmentCount < 20 && equipmentPaidSatang < 360000) {
    const remainingToCap = 360000 - equipmentPaidSatang;
    equipmentFeeSatang = Math.min(400, remainingToCap);
  }

  const totalKnightDeductionSatang = knightFeeSatang + equipmentFeeSatang;
  const netKnightEarningsSatang = fareSatang - totalKnightDeductionSatang;

  // 4. ฝั่งพลเมือง: หัก 5 บาท (500 สตางค์) ทุกทริป: ค่าระบบ 3 + คุ้มครองอุบัติเหตุ 1 + มัดจำหมวก 1
  const citizenFeeSatang = 500;
  const citizenBuckets: FeeBucketsSatang = {
    system: 300,
    insurance: 100,
    pension: 0,
    helmet: 100,
    equipment: 0
  };

  const totalCitizenPaySatang = fareSatang + citizenFeeSatang;

  // 5. รวมถังเงินระบบ 5 Buckets
  const combinedBuckets: FeeBucketsSatang = {
    system: knightBuckets.system + citizenBuckets.system,
    insurance: knightBuckets.insurance + citizenBuckets.insurance,
    pension: knightBuckets.pension + citizenBuckets.pension,
    helmet: knightBuckets.helmet + citizenBuckets.helmet,
    equipment: equipmentFeeSatang
  };

  return {
    fareSatang,
    knightFeeSatang,
    equipmentFeeSatang,
    totalKnightDeductionSatang,
    netKnightEarningsSatang,
    citizenFeeSatang,
    totalCitizenPaySatang,
    combinedBuckets,
    knightBuckets,
    citizenBuckets,
    newDailyEquipmentCount: dailyEquipmentCount + (equipmentFeeSatang > 0 ? 1 : 0),
    newEquipmentPaidSatang: equipmentPaidSatang + equipmentFeeSatang
  };
}

/**
 * 1. onTripCompleted (Firestore trigger)
 * 
 * ทำงานเมื่อทริปเปลี่ยนสถานะเป็น 'COMPLETED':
 * - คำนวณค่าธรรมเนียมตามบันไดอัศวิน & พลเมือง
 * - เขียน ledger entries แบบ debit/credit คู่กัน (Double-Entry Bookkeeping)
 * - อัปเดต wallet buckets ทั้งหมดใน Firestore Transaction เดียว
 * - บันทึก Idempotency key ป้องกันการประมวลผลซ้ำ
 */
export const onTripCompleted = onDocumentWritten("rides/{rideId}", async (event) => {
  const beforeData = event.data?.before?.data();
  const afterData = event.data?.after?.data();

  // หากเอกสารถูกลบ ข้าม
  if (!afterData) return;

  const wasCompleted = beforeData?.status === "COMPLETED" || beforeData?.status === "completed";
  const isCompleted = afterData?.status === "COMPLETED" || afterData?.status === "completed";

  // รันเฉพาะเมื่อเพิ่งเปลี่ยนสถานะเป็น COMPLETED
  if (!isCompleted || wasCompleted) return;

  // ตรวจสอบว่าเคยตัดยอดไปแล้วหรือไม่
  if (afterData.settled === true || afterData.ledgerTransactionId) {
    console.log(`[onTripCompleted] Ride ${event.params.rideId} already settled. Skipping.`);
    return;
  }

  const rideId = event.params.rideId;
  const idempotencyKey = afterData.idempotencyKey || `trip_complete_${rideId}`;
  const citizenId = afterData.passengerId || afterData.citizenId || afterData.customerId || afterData.userId;
  const knightId = afterData.driverId || afterData.knightId;

  if (!citizenId || !knightId) {
    console.error(`[onTripCompleted] Missing citizenId (${citizenId}) or knightId (${knightId}) for ride ${rideId}`);
    return;
  }

  // คำนวณค่าโดยสารเป็นหน่วยสตางค์
  let fareSatang = 0;
  if (typeof afterData.fareSatang === "number" && afterData.fareSatang > 0) {
    fareSatang = Math.round(afterData.fareSatang);
  } else if (typeof afterData.fare === "number" && afterData.fare > 0) {
    fareSatang = Math.round(afterData.fare * 100);
  } else if (typeof afterData.price === "number" && afterData.price > 0) {
    fareSatang = Math.round(afterData.price * 100);
  }

  if (fareSatang <= 0) {
    console.warn(`[onTripCompleted] Ride ${rideId} has zero or negative fareSatang: ${fareSatang}`);
    return;
  }

  const tipSatang = Math.round(Number(afterData.tipAmount || 0) * 100);
  if (!Number.isInteger(tipSatang) || tipSatang < 0 || tipSatang > 1000000) {
    console.warn(`[onTripCompleted] Ride ${rideId} has invalid tipAmount: ${afterData.tipAmount}`);
    return;
  }

  const currentDateKey = getBangkokDateString();

  // รัน Firestore Transaction แบบอะตอมิกทั้งหมด
  await db.runTransaction(async (transaction) => {
    // 1. ตรวจสอบ Idempotency Key ใน transaction
    const idempRef = db.collection("idempotency_keys").doc(idempotencyKey);
    const idempSnap = await transaction.get(idempRef);
    if (idempSnap.exists) {
      console.log(`[onTripCompleted] IdempotencyKey ${idempotencyKey} already processed. Aborting duplicate execution.`);
      return;
    }

    // 2. ดึงข้อมูล Knight เพื่อเช็ค Founding Knight & Equipment status
    const knightRef = db.collection("knights").doc(knightId);
    const knightSnap = await transaction.get(knightRef);
    const knightData = knightSnap.exists ? knightSnap.data() || {} : {};

    const isFoundingKnight = Boolean(knightData.isFoundingKnight || afterData.isFoundingKnight);
    const equipmentPaidSatang = Number(knightData.equipmentPaidSatang || 0);
    const dailyEquipmentCount = Number(knightData.dailyEquipmentCount || 0);
    const lastTripDateKey = knightData.lastTripDateKey;

    // 3. คำนวณค่าธรรมเนียม
    const feeResult = calculateTripFeesInternal({
      fareSatang,
      isFoundingKnight,
      equipmentPaidSatang,
      dailyEquipmentCount,
      lastTripDateKey,
      currentDateKey
    });

    // 4. สร้าง Double-Entry Ledger Legs (Debit & Credit)
    const ledgerLegs: LedgerLeg[] = [];

    // [DEBIT] ฝั่งพลเมือง: จ่ายค่าโดยสาร + ค่าธรรมเนียมพลเมือง 500 สตางค์
    ledgerLegs.push({
      accountId: citizenId,
      accountType: 'CITIZEN_WALLET',
      direction: 'DEBIT',
      amountSatang: feeResult.totalCitizenPaySatang + tipSatang,
      descriptionTh: `หักชำระค่าโดยสาร ค่าธรรมเนียมพลเมือง และทิป ทริป #${rideId}`
    });

    // [CREDIT] ฝั่งอัศวิน: ได้รับรายได้สุทธิหลังหักค่าธรรมเนียมอัศวินและอุปกรณ์
    ledgerLegs.push({
      accountId: knightId,
      accountType: 'KNIGHT_WALLET',
      direction: 'CREDIT',
      amountSatang: feeResult.netKnightEarningsSatang,
      descriptionTh: `รับค่าโดยสารสุทธิ ทริป #${rideId}`
    });

    // [CREDIT] ทิปเข้าพี่วิน 100% โดยไม่หักค่าธรรมเนียม
    if (tipSatang > 0) {
      ledgerLegs.push({
        accountId: knightId,
        accountType: 'KNIGHT_WALLET',
        direction: 'CREDIT',
        amountSatang: tipSatang,
        descriptionTh: `ทิปพี่วิน 100% ทริป #${rideId}`
      });
    }

    // [CREDIT] เข้าถังระบบ (System Platform Pool)
    if (feeResult.combinedBuckets.system > 0) {
      ledgerLegs.push({
        accountId: 'SYSTEM_POOL_REVENUE',
        accountType: 'SYSTEM_REVENUE',
        direction: 'CREDIT',
        amountSatang: feeResult.combinedBuckets.system,
        descriptionTh: `ค่าบำรุงรักษาระบบ WINRIDER.AI ทริป #${rideId}`
      });
    }

    // [CREDIT] เข้าถังกองทุนอุบัติเหตุ (Insurance Fund Pool)
    if (feeResult.combinedBuckets.insurance > 0) {
      ledgerLegs.push({
        accountId: 'SYSTEM_POOL_INSURANCE',
        accountType: 'INSURANCE_FUND',
        direction: 'CREDIT',
        amountSatang: feeResult.combinedBuckets.insurance,
        descriptionTh: `เงินสมทบกองทุนคุ้มครองอุบัติเหตุ ทริป #${rideId}`
      });
    }

    // [CREDIT] เข้าถังกองทุนบำนาญอัศวิน (Pension Fund Pool)
    if (feeResult.combinedBuckets.pension > 0) {
      ledgerLegs.push({
        accountId: 'SYSTEM_POOL_PENSION',
        accountType: 'PENSION_FUND',
        direction: 'CREDIT',
        amountSatang: feeResult.combinedBuckets.pension,
        descriptionTh: `เงินออมสะสมบำนาญอัศวิน ทริป #${rideId}`
      });
    }

    // [CREDIT] เข้าถังมัดจำหมวกนิรภัยพลเมือง (Helmet Deposit Pool)
    if (feeResult.combinedBuckets.helmet > 0) {
      ledgerLegs.push({
        accountId: 'SYSTEM_POOL_HELMET',
        accountType: 'HELMET_DEPOSIT',
        direction: 'CREDIT',
        amountSatang: feeResult.combinedBuckets.helmet,
        descriptionTh: `มัดจำหมวกนิรภัยพลเมือง ทริป #${rideId}`
      });
    }

    // [CREDIT] เข้าถังผ่อนชำระชุดเกราะ/อุปกรณ์ (Equipment Installment Pool)
    if (feeResult.combinedBuckets.equipment > 0) {
      ledgerLegs.push({
        accountId: 'SYSTEM_POOL_EQUIPMENT',
        accountType: 'EQUIPMENT_INSTALLMENT',
        direction: 'CREDIT',
        amountSatang: feeResult.combinedBuckets.equipment,
        descriptionTh: `เงินผ่อนชำระชุดเกราะอุปกรณ์อัศวิน ทริป #${rideId}`
      });
    }

    // 5. ตรวจสอบเงื่อนไข Double-Entry: ผลรวม Debit ต้องเท่ากับ Credit เสมอ 100%
    const totalDebitSatang = ledgerLegs
      .filter((leg) => leg.direction === 'DEBIT')
      .reduce((sum, leg) => sum + leg.amountSatang, 0);

    const totalCreditSatang = ledgerLegs
      .filter((leg) => leg.direction === 'CREDIT')
      .reduce((sum, leg) => sum + leg.amountSatang, 0);

    if (totalDebitSatang !== totalCreditSatang) {
      throw new Error(
        `[DOUBLE_ENTRY_ERROR] Debits (${totalDebitSatang} satang) do not match Credits (${totalCreditSatang} satang) for ride ${rideId}! Transaction rollbacked.`
      );
    }

    // 6. ดึงและอัปเดต Wallets ของผู้ใช้งาน
    const citizenWalletRef = db.collection("wallets").doc(citizenId);
    const knightWalletRef = db.collection("wallets").doc(knightId);
    const systemPoolRef = db.collection("wallets").doc("SYSTEM_POOLS");

    const citizenWalletSnap = await transaction.get(citizenWalletRef);
    const citizenWalletData = citizenWalletSnap.exists ? citizenWalletSnap.data() || {} : {};

    const knightWalletSnap = await transaction.get(knightWalletRef);
    const knightWalletData = knightWalletSnap.exists ? knightWalletSnap.data() || {} : {};

    // อัปเดตกระเป๋าพลเมือง
    const currentCitizenBalance = Number(citizenWalletData.balanceSatang || 0);
    const currentCitizenLocked = Number(citizenWalletData.lockedSatang || 0);
    const newCitizenBalance = currentCitizenBalance - feeResult.totalCitizenPaySatang;

    transaction.set(
      citizenWalletRef,
      {
        userId: citizenId,
        role: "citizen",
        balanceSatang: newCitizenBalance,
        lockedSatang: currentCitizenLocked,
        availableSatang: newCitizenBalance - currentCitizenLocked,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // อัปเดตกระเป๋าอัศวิน
    const currentKnightBalance = Number(knightWalletData.balanceSatang || 0);
    const currentKnightLocked = Number(knightWalletData.lockedSatang || 0);
    const currentKnightPension = Number(knightWalletData.buckets?.pension || 0);
    const newKnightBalance = currentKnightBalance + feeResult.netKnightEarningsSatang + tipSatang;

    transaction.set(
      knightWalletRef,
      {
        userId: knightId,
        role: "knight",
        balanceSatang: newKnightBalance,
        lockedSatang: currentKnightLocked,
        availableSatang: newKnightBalance - currentKnightLocked,
        buckets: {
          ...(knightWalletData.buckets || {}),
          pension: currentKnightPension + feeResult.combinedBuckets.pension
        },
        equipmentPaidSatang: feeResult.newEquipmentPaidSatang,
        dailyEquipmentCount: feeResult.newDailyEquipmentCount,
        lastTripDateKey: currentDateKey,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // อัปเดตโปรไฟล์อัศวิน (นับรอบอุปกรณ์และยอดผ่อน)
    transaction.set(
      knightRef,
      {
        equipmentPaidSatang: feeResult.newEquipmentPaidSatang,
        dailyEquipmentCount: feeResult.newDailyEquipmentCount,
        lastTripDateKey: currentDateKey,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // อัปเดต Pool ระบบกลาง
    transaction.set(
      systemPoolRef,
      {
        poolId: "SYSTEM_POOLS",
        buckets: {
          system: FieldValue.increment(feeResult.combinedBuckets.system),
          insurance: FieldValue.increment(feeResult.combinedBuckets.insurance),
          pension: FieldValue.increment(feeResult.combinedBuckets.pension),
          helmet: FieldValue.increment(feeResult.combinedBuckets.helmet),
          equipment: FieldValue.increment(feeResult.combinedBuckets.equipment)
        },
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // 7. บันทึก Journal Ledger Entry
    const ledgerRef = db.collection("ledger").doc();
    transaction.set(ledgerRef, {
      transactionId: ledgerRef.id,
      idempotencyKey,
      type: "TRIP_COMPLETED",
      referenceId: rideId,
      citizenId,
      knightId,
      fareSatang: feeResult.fareSatang,
      tipSatang,
      citizenFeeSatang: feeResult.citizenFeeSatang,
      citizenTotalPaidSatang: feeResult.totalCitizenPaySatang + tipSatang,
      knightFeeSatang: feeResult.knightFeeSatang,
      equipmentFeeSatang: feeResult.equipmentFeeSatang,
      knightPayoutSatang: feeResult.netKnightEarningsSatang + tipSatang,
      fareSatang,
      totalDebitSatang,
      totalCreditSatang,
      balanced: true,
      feeBreakdown: {
        knightFeeSatang: feeResult.knightFeeSatang,
        equipmentFeeSatang: feeResult.equipmentFeeSatang,
        netKnightEarningsSatang: feeResult.netKnightEarningsSatang,
        citizenFeeSatang: feeResult.citizenFeeSatang,
        buckets: feeResult.combinedBuckets
      },
      legs: ledgerLegs,
      createdAt: FieldValue.serverTimestamp()
    });

    // 8. บันทึก Idempotency Key ป้องกันทำซ้ำ
    transaction.set(idempRef, {
      idempotencyKey,
      status: "COMPLETED",
      type: "TRIP_COMPLETED",
      referenceId: rideId,
      ledgerTransactionId: ledgerRef.id,
      totalSatang: totalDebitSatang,
      completedAt: FieldValue.serverTimestamp()
    });

    // 9. ปรับสถานะ Trip ให้เป็น settled
    const rideRef = db.collection("rides").doc(rideId);
    transaction.update(rideRef, {
      settled: true,
      ledgerTransactionId: ledgerRef.id,
      settlementStatus: "SETTLED",
      fareSatang: feeResult.fareSatang,
      tipSatang,
      citizenFeeSatang: feeResult.citizenFeeSatang,
      citizenTotalPaidSatang: feeResult.totalCitizenPaySatang + tipSatang,
      knightFeeSatang: feeResult.knightFeeSatang,
      equipmentFeeSatang: feeResult.equipmentFeeSatang,
      knightPayoutSatang: feeResult.netKnightEarningsSatang + tipSatang,
      feeSettledAt: FieldValue.serverTimestamp()
    });
  });

  console.log(`[onTripCompleted] Ride ${rideId} successfully processed with balanced Double-Entry ledger.`);
});

/**
 * 2. topUpWallet (callable function)
 * 
 * รับการเติมเงินเข้ากระเป๋า:
 * - ตรวจสอบ idempotencyKey ป้องกันเติมซ้ำ
 * - บันทึก Double-Entry Ledger (Debit: Payment Gateway Clearing, Credit: User Wallet)
 * - อัปเดต balanceSatang และ availableSatang ใน Firestore Transaction เดียว
 */
export const topUpWallet = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "ต้องเข้าสู่ระบบก่อนทำรายการเติมเงิน");
  }

  const uid = request.auth.uid;
  const data = request.data || {};
  const amountSatang = Math.round(Number(data.amountSatang || 0));
  const idempotencyKey = String(data.idempotencyKey || "").trim();
  const paymentMethod = String(data.paymentMethod || "PROMPTPAY").trim();
  const providerTransactionId = String(data.providerTransactionId || "").trim();

  if (!providerTransactionId) {
    throw new HttpsError("failed-precondition", "ต้องยืนยัน transaction จาก payment provider ก่อนเครดิตเงินเข้ากระเป๋า");
  }

  // ตรวจสอบความถูกต้องของ Input
  if (!amountSatang || amountSatang <= 0 || !Number.isInteger(amountSatang)) {
    throw new HttpsError("invalid-argument", "จำนวนเงินเติมต้องเป็นจำนวนเต็มสตางค์ที่มากกว่า 0 (เช่น 10000 สตางค์ = 100 บาท)");
  }

  if (!idempotencyKey) {
    throw new HttpsError("invalid-argument", "idempotencyKey จำเป็นต้องระบุเพื่อป้องกันการทำรายการซ้ำ");
  }

  // Never credit a wallet from a client-declared amount alone.
  // The provider adapter must return a verified transaction and matching amount.
  // Real provider integration is required before TOP_UP can be settled.
  throw new HttpsError("failed-precondition", "Payment provider verification is not configured; wallet top-up is disabled");

  // ดำเนินการใน Firestore Transaction
  const result = await db.runTransaction(async (transaction) => {
    const idempRef = db.collection("idempotency_keys").doc(idempotencyKey);
    const idempSnap = await transaction.get(idempRef);

    // หากเคยทำรายการด้วย Idempotency Key นี้แล้ว ให้คืนผลลัพธ์เดิมทันที (Idempotent response)
    if (idempSnap.exists) {
      const existing = idempSnap.data();
      return {
        success: true,
        alreadyProcessed: true,
        idempotencyKey,
        amountSatang: existing?.amountSatang || amountSatang,
        newBalanceSatang: existing?.newBalanceSatang,
        availableSatang: existing?.availableSatang,
        ledgerTransactionId: existing?.ledgerTransactionId
      };
    }

    const walletRef = db.collection("wallets").doc(uid);
    const walletSnap = await transaction.get(walletRef);
    const walletData = walletSnap.exists ? walletSnap.data() || {} : {};

    const currentBalance = Number(walletData.balanceSatang || 0);
    const currentLocked = Number(walletData.lockedSatang || 0);
    const newBalance = currentBalance + amountSatang;
    const newAvailable = newBalance - currentLocked;

    // Double-Entry Legs
    const ledgerLegs: LedgerLeg[] = [
      {
        accountId: `PAYMENT_GATEWAY_${paymentMethod.toUpperCase()}`,
        accountType: 'CLEARING_PAYMENT_GATEWAY',
        direction: 'DEBIT',
        amountSatang,
        descriptionTh: `รับเงินผ่านช่องทาง ${paymentMethod}`
      },
      {
        accountId: uid,
        accountType: (walletData.role === 'knight' ? 'KNIGHT_WALLET' : 'CITIZEN_WALLET') as any,
        direction: 'CREDIT',
        amountSatang,
        descriptionTh: `เติมเงินเข้ากระเป๋า ${uid}`
      }
    ];

    // ตรวจสอบ Double-Entry Equality
    const sumDebit = ledgerLegs.filter(l => l.direction === 'DEBIT').reduce((s, l) => s + l.amountSatang, 0);
    const sumCredit = ledgerLegs.filter(l => l.direction === 'CREDIT').reduce((s, l) => s + l.amountSatang, 0);

    if (sumDebit !== sumCredit) {
      throw new Error(`Double-entry check failed for top-up: Debit (${sumDebit}) != Credit (${sumCredit})`);
    }

    // อัปเดตกระเป๋าเงิน (Admin SDK Only)
    transaction.set(
      walletRef,
      {
        userId: uid,
        balanceSatang: newBalance,
        lockedSatang: currentLocked,
        availableSatang: newAvailable,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // บันทึก Ledger
    const ledgerRef = db.collection("ledger").doc();
    transaction.set(ledgerRef, {
      transactionId: ledgerRef.id,
      idempotencyKey,
      type: "TOP_UP",
      userId: uid,
      amountSatang,
      totalDebitSatang: sumDebit,
      totalCreditSatang: sumCredit,
      balanced: true,
      paymentMethod,
      legs: ledgerLegs,
      createdAt: FieldValue.serverTimestamp()
    });

    // บันทึก Idempotency Key
    transaction.set(idempRef, {
      idempotencyKey,
      status: "COMPLETED",
      type: "TOP_UP",
      userId: uid,
      amountSatang,
      newBalanceSatang: newBalance,
      availableSatang: newAvailable,
      ledgerTransactionId: ledgerRef.id,
      completedAt: FieldValue.serverTimestamp()
    });

    return {
      success: true,
      alreadyProcessed: false,
      idempotencyKey,
      amountSatang,
      newBalanceSatang: newBalance,
      availableSatang: newAvailable,
      ledgerTransactionId: ledgerRef.id
    };
  });

  return result;
});

/**
 * 3. requestPayout (callable function)
 * 
 * ขอถอนเงินออกจากกระเป๋า:
 * - ตรวจสอบว่ายอด available เพียงพอ (balanceSatang - lockedSatang >= amountSatang)
 * - ตรวจสอบ idempotencyKey ป้องกันการส่งคำขอซ้ำ
 * - บันทึก Double-Entry Ledger (Debit: User Wallet, Credit: Payout Clearing)
 * - ปรับลด balance หรือล็อคยอดเงินใน Firestore Transaction เดียว
 */
/**
 * Advance a payout only through an authenticated backend action.
 * State transitions are intentionally explicit; there is no client write path.
 */
export const updatePayoutStatus = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "ต้องเข้าสู่ระบบก่อนอัปเดตสถานะการถอนเงิน");
  if (request.auth.token.admin !== true || request.auth.token.adminLevel !== "super") {
    throw new HttpsError("permission-denied", "เฉพาะ Super Admin เท่านั้นที่อัปเดตสถานะ payout ได้");
  }

  const payoutId = String(request.data?.payoutId || "").trim();
  const nextStatus = String(request.data?.status || "").trim().toUpperCase();
  const allowed = ["PROCESSING", "COMPLETED", "FAILED", "CANCELLED"];
  if (!payoutId || !allowed.includes(nextStatus)) {
    throw new HttpsError("invalid-argument", "payoutId หรือสถานะไม่ถูกต้อง");
  }

  const payoutRef = db.collection("payout_requests").doc(payoutId);
  const result = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(payoutRef);
    if (!snap.exists) throw new HttpsError("not-found", "ไม่พบรายการถอนเงิน");
    const payout = snap.data() || {};
    const current = String(payout.status || "");
    const transitions: Record<string,string[]> = {
      PENDING_TRANSFER: ["PROCESSING", "FAILED", "CANCELLED"],
      PROCESSING: ["COMPLETED", "FAILED"],
      COMPLETED: [],
      FAILED: [],
      CANCELLED: []
    };
    if (!transitions[current]?.includes(nextStatus)) {
      throw new HttpsError("failed-precondition", `ไม่อนุญาตให้เปลี่ยนสถานะจาก ${current} เป็น ${nextStatus}`);
    }

    const history = Array.isArray(payout.statusHistory) ? payout.statusHistory : [];
    const amountSatang = Number(payout.amountSatang || 0);
    const userId = String(payout.userId || "");
    if (!Number.isInteger(amountSatang) || amountSatang <= 0 || !userId) {
      throw new HttpsError("failed-precondition", "ข้อมูล payout ไม่สมบูรณ์");
    }

    if (nextStatus === "FAILED" || nextStatus === "CANCELLED") {
      if (!payout.reversalLedgerTransactionId) {
        const reversalKey = "PAYOUT_REVERSAL_" + payoutId;
        const walletRef = db.collection("wallets").doc(userId);
        const idempotencyRef = db.collection("idempotency_keys").doc(reversalKey);
        const walletSnap = await transaction.get(walletRef);
        const idempotencySnap = await transaction.get(idempotencyRef);
        if (!walletSnap.exists) throw new HttpsError("not-found", "ไม่พบกระเป๋าเงินสำหรับคืนยอด payout");
        if (idempotencySnap.exists) throw new HttpsError("failed-precondition", "พบ reversal เดิมแล้ว");

        const wallet = walletSnap.data() || {};
        const currentBalance = Number(wallet.balanceSatang || 0);
        const currentAvailable = Number(wallet.availableSatang ?? currentBalance);
        const ledgerRef = db.collection("ledger").doc();
        const legs = [
          { accountId: "PAYOUT_CLEARING", accountType: "PAYOUT_CLEARING", direction: "DEBIT", amountSatang, descriptionTh: "คืนยอดถอนเงินจาก payout " + payoutId },
          { accountId: userId, accountType: "KNIGHT_WALLET", direction: "CREDIT", amountSatang, descriptionTh: "คืนเงินกลับกระเป๋าจาก payout " + payoutId }
        ];

        transaction.update(walletRef, {
          balanceSatang: currentBalance + amountSatang,
          availableSatang: currentAvailable + amountSatang,
          updatedAt: FieldValue.serverTimestamp()
        });
        transaction.set(ledgerRef, {
          transactionId: ledgerRef.id, idempotencyKey: reversalKey, type: "PAYOUT_REVERSAL",
          referenceId: payoutId, userId, amountSatang,
          totalDebitSatang: amountSatang, totalCreditSatang: amountSatang, balanced: true, legs,
          createdAt: FieldValue.serverTimestamp()
        });
        transaction.set(idempotencyRef, {
          idempotencyKey: reversalKey, status: "COMPLETED", type: "PAYOUT_REVERSAL",
          referenceId: payoutId, ledgerTransactionId: ledgerRef.id, amountSatang,
          completedAt: FieldValue.serverTimestamp()
        });
        transaction.update(payoutRef, {
          reversalLedgerTransactionId: ledgerRef.id,
          reversalAt: FieldValue.serverTimestamp()
        });
      }
    }

    transaction.update(payoutRef, {
      status: nextStatus,
      statusHistory: [...history, {
        status: nextStatus,
        at: FieldValue.serverTimestamp(),
        actorUid: request.auth!.uid,
        actorType: "super_admin"
      }],
      updatedAt: FieldValue.serverTimestamp(),
      ...(nextStatus === "COMPLETED" ? { completedAt: FieldValue.serverTimestamp() } : {}),
      ...(nextStatus === "FAILED" || nextStatus === "CANCELLED" ? { failedAt: FieldValue.serverTimestamp() } : {})
    });

    return { payoutId, current, nextStatus, amountSatang, userId, reversalApplied: nextStatus === "FAILED" || nextStatus === "CANCELLED" };
  });

  return { success: true, ...result };
});

export const requestPayout = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "ต้องเข้าสู่ระบบก่อนทำรายการขอถอนเงิน");
  }

  const uid = request.auth.uid;
  const data = request.data || {};
  const amountSatang = Math.round(Number(data.amountSatang || 0));
  const idempotencyKey = String(data.idempotencyKey || "").trim();
  const bankAccount = data.bankAccount || {};
  const bankName = String(bankAccount.bankName || "").trim();
  const accountNumber = String(bankAccount.accountNumber || "").replace(/\D/g, "");
  const accountName = String(bankAccount.accountName || "").trim();

  // ตรวจสอบความถูกต้องของ Input
  if (!amountSatang || amountSatang <= 0 || !Number.isInteger(amountSatang)) {
    throw new HttpsError("invalid-argument", "จำนวนเงินที่ขอถอนต้องเป็นจำนวนเต็มสตางค์ที่มากกว่า 0");
  }

  if (!idempotencyKey) {
    throw new HttpsError("invalid-argument", "idempotencyKey จำเป็นต้องระบุเพื่อป้องกันการถอนเงินซ้ำซ้อน");
  }

  if (!bankName || accountNumber.length < 10 || accountNumber.length > 16 || !accountName) {
    throw new HttpsError("invalid-argument", "ข้อมูลบัญชีรับเงินไม่ครบถ้วนหรือไม่ถูกต้อง");
  }

  const result = await db.runTransaction(async (transaction) => {
    // 1. เช็ค Idempotency Key
    const idempRef = db.collection("idempotency_keys").doc(idempotencyKey);
    const idempSnap = await transaction.get(idempRef);

    if (idempSnap.exists) {
      const existing = idempSnap.data();
      return {
        success: true,
        alreadyProcessed: true,
        idempotencyKey,
        payoutId: existing?.payoutId,
        amountSatang: existing?.amountSatang || amountSatang,
        remainingBalanceSatang: existing?.remainingBalanceSatang,
        availableSatang: existing?.availableSatang
      };
    }

    // 2. ตรวจสอบยอดเงินคงเหลือในกระเป๋า (Balance - Locked)
    const walletRef = db.collection("wallets").doc(uid);
    const walletSnap = await transaction.get(walletRef);

    if (!walletSnap.exists) {
      throw new HttpsError("not-found", "ไม่พบบัญชีกระเป๋าเงินของคุณในระบบ");
    }

    const walletData = walletSnap.data() || {};
    const userSnap = await transaction.get(db.collection("users").doc(uid));
    const userData = userSnap.exists ? userSnap.data() || {} : {};

    if (userData.status !== "active") {
      throw new HttpsError("failed-precondition", "บัญชีผู้ใช้ยังไม่อยู่ในสถานะ active จึงไม่สามารถถอนเงินได้");
    }

    if (!["citizen", "knight"].includes(String(walletData.role || ""))) {
      throw new HttpsError("failed-precondition", "ประเภทกระเป๋าเงินไม่สามารถขอถอนได้");
    }

    const currentBalance = Number(walletData.balanceSatang || 0);
    const currentLocked = Number(walletData.lockedSatang || 0);
    const available = currentBalance - currentLocked;

    if (available < amountSatang) {
      throw new HttpsError(
        "failed-precondition",
        `ยอดเงินคงเหลือที่ใช้ได้ไม่เพียงพอ (ยอดที่ใช้ได้: ${(available / 100).toFixed(2)} บาท [${available} สตางค์], ขอถอน: ${(amountSatang / 100).toFixed(2)} บาท [${amountSatang} สตางค์])`
      );
    }

    // 3. Double-Entry Legs
    const ledgerLegs: LedgerLeg[] = [
      {
        accountId: uid,
        accountType: (walletData.role === 'knight' ? 'KNIGHT_WALLET' : 'CITIZEN_WALLET') as any,
        direction: 'DEBIT',
        amountSatang,
        descriptionTh: `หักยอดเงินขอถอนเข้าบัญชีธนาคาร`
      },
      {
        accountId: 'CLEARING_PAYOUT_PENDING',
        accountType: 'CLEARING_PAYOUT_PENDING',
        direction: 'CREDIT',
        amountSatang,
        descriptionTh: `พักยอดเงินรอโอนไปยังบัญชีธนาคารภายนอก`
      }
    ];

    const sumDebit = ledgerLegs.filter(l => l.direction === 'DEBIT').reduce((s, l) => s + l.amountSatang, 0);
    const sumCredit = ledgerLegs.filter(l => l.direction === 'CREDIT').reduce((s, l) => s + l.amountSatang, 0);

    if (sumDebit !== sumCredit) {
      throw new Error(`Double-entry check failed for payout: Debit (${sumDebit}) != Credit (${sumCredit})`);
    }

    // 4. หัก balance และคำนวณ available ใหม่
    const newBalance = currentBalance - amountSatang;
    const newAvailable = newBalance - currentLocked;

    transaction.update(walletRef, {
      balanceSatang: newBalance,
      availableSatang: newAvailable,
      updatedAt: FieldValue.serverTimestamp()
    });

    // 5. สร้างรายการขอถอนเงิน (Payout Request)
    const payoutRef = db.collection("payout_requests").doc();
    transaction.set(payoutRef, {
      payoutId: payoutRef.id,
      idempotencyKey,
      userId: uid,
      amountSatang,
      bankAccount: {
        bankName,
        accountNumber,
        accountName
      },
      status: "PENDING_TRANSFER",
      statusHistory: [{
        status: "PENDING_TRANSFER",
        at: FieldValue.serverTimestamp(),
        actorUid: uid,
        actorType: "user"
      }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // 6. บันทึก Journal Ledger
    const ledgerRef = db.collection("ledger").doc();
    transaction.set(ledgerRef, {
      transactionId: ledgerRef.id,
      idempotencyKey,
      type: "PAYOUT_REQUEST",
      userId: uid,
      referenceId: payoutRef.id,
      amountSatang,
      totalDebitSatang: sumDebit,
      totalCreditSatang: sumCredit,
      balanced: true,
      legs: ledgerLegs,
      createdAt: FieldValue.serverTimestamp()
    });

    // 7. บันทึก Idempotency Key
    transaction.set(idempRef, {
      idempotencyKey,
      status: "COMPLETED",
      type: "PAYOUT_REQUEST",
      userId: uid,
      payoutId: payoutRef.id,
      amountSatang,
      remainingBalanceSatang: newBalance,
      availableSatang: newAvailable,
      ledgerTransactionId: ledgerRef.id,
      completedAt: FieldValue.serverTimestamp()
    });

    return {
      success: true,
      alreadyProcessed: false,
      payoutId: payoutRef.id,
      idempotencyKey,
      amountSatang,
      remainingBalanceSatang: newBalance,
      availableSatang: newAvailable,
      ledgerTransactionId: ledgerRef.id
    };
  });

  return result;
});

/**
 * 4. onUserDocCreated (Firestore trigger)
 * 
 * เมื่อสร้างเอกสารใน users/{uid} ให้ Admin SDK สร้างบัญชี wallets/{uid} ให้โดยอัตโนมัติ
 * ทำให้ฝั่ง Client ไม่จำเป็นต้องแตะต้อง collection wallets เลย สอดคล้องกับ Security Rules
 */
export const onUserDocCreated = onDocumentWritten("users/{uid}", async (event) => {
  const afterData = event.data?.after?.data();
  if (!afterData) return;

  const uid = event.params.uid;
  const walletRef = db.collection("wallets").doc(uid);
  const walletSnap = await walletRef.get();

  if (!walletSnap.exists) {
    await walletRef.set({
      userId: uid,
      role: afterData.role || "citizen",
      balanceSatang: 0,
      pendingSatang: 0,
      lockedSatang: 0,
      availableSatang: 0,
      buckets: {
        system: 0,
        insurance: 0,
        pension: 0,
        helmet: 0,
        equipment: 0
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log(`[onUserDocCreated] Initialized zero-balance wallet for user ${uid}`);
  }
});

// Admin Panel Operational Cloud Functions
export {
  approveKyc,
  rejectKyc,
  suspendUser,
  unsuspendUser,
  adjustWallet,
  updateFeeRule,
  setAdminRole
} from "./admin";
