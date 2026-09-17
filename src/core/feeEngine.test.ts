/**
 * Unit Tests for WINRIDER.AI Core Fee Engine
 * 
 * ครอบคลุม:
 * 1. ทุก Tier บันไดอัศวิน (Tier 1 ถึง Tier 5)
 * 2. เคส Founding Knight Lock (ตลอดชีพ 2 บาท ทุกระยะทาง)
 * 3. เคสค่าอุปกรณ์ รอบที่ 20 และรอบที่ 21 ของวัน (เพดาน 20 รอบ/วัน)
 * 4. เคสค่าอุปกรณ์ ข้ามวันตาม timezone Asia/Bangkok เวลา 00:00 (Reset เป็น 0)
 * 5. เคสค่าอุปกรณ์ ยอดสะสมครบ 3,600 บาท (360,000 สตางค์)
 * 6. ฝั่งพลเมือง 5 บาท แตกเป็น system 3 + insurance 1 + helmet 1
 * 7. ถังเงิน 5 Buckets (system, insurance, pension, helmet, equipment) เป็น integer สตางค์
 * 8. ค่า GP ร้านค้า (founding 5%, standard 10%, growth 13%)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  calculateFees, 
  calculateMerchantGP, 
  DEFAULT_FEE_RULES_CONFIG,
  getBangkokDateKey,
  isDifferentBangkokDay
} from './feeEngine';

describe('WINRIDER.AI Core Fee Engine Tests', () => {

  // =========================================================================
  // 1. ทดสอบบันไดอัศวิน (Tiered Flat Fee)
  // =========================================================================
  describe('โครงสร้างบันไดอัศวิน (Tiered Flat Fee)', () => {
    
    it('Tier 1: ค่าโดยสาร <= 30 บาท (<= 3,000 สตางค์) หัก 2 บาท (200 สตางค์)', () => {
      // ตัวอย่างที่ 1: 20 บาท (2,000 สตางค์)
      const res20 = calculateFees({
        fareSatang: 2000,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 } // ปิดค่าอุปกรณ์เพื่อตรวจเฉพาะค่าบริการบันได
      });
      assert.strictEqual(res20.knightFeeSatang, 200, 'ค่าบริการอัศวินต้องเป็น 200 สตางค์ (2 บาท)');
      assert.strictEqual(res20.appliedTierId, 'tier_1');
      assert.strictEqual(res20.netKnightEarningsSatang, 1800, 'อัศวินรับสุทธิ 1,800 สตางค์ (18 บาท)');

      // ตัวอย่างที่ 2: 30 บาทพอดี (3,000 สตางค์)
      const res30 = calculateFees({
        fareSatang: 3000,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(res30.knightFeeSatang, 200, 'ค่าโดยสาร 30 บาทพอดี ต้องหัก 200 สตางค์');
      assert.strictEqual(res30.appliedTierId, 'tier_1');
      assert.strictEqual(res30.netKnightEarningsSatang, 2800);
    });

    it('Tier 2: ค่าโดยสาร 31-60 บาท (3,001 - 6,000 สตางค์) หัก 4 บาท (400 สตางค์)', () => {
      // ตัวอย่างที่ 1: 31 บาท (3,100 สตางค์)
      const res31 = calculateFees({
        fareSatang: 3100,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(res31.knightFeeSatang, 400, 'ค่าโดยสาร 31 บาท ต้องหัก 400 สตางค์ (4 บาท)');
      assert.strictEqual(res31.appliedTierId, 'tier_2');
      assert.strictEqual(res31.netKnightEarningsSatang, 2700);

      // ตัวอย่างที่ 2: 60 บาท (6,000 สตางค์)
      const res60 = calculateFees({
        fareSatang: 6000,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(res60.knightFeeSatang, 400, 'ค่าโดยสาร 60 บาท ต้องหัก 400 สตางค์ (4 บาท)');
      assert.strictEqual(res60.appliedTierId, 'tier_2');
      assert.strictEqual(res60.netKnightEarningsSatang, 5600);
    });

    it('Tier 3: ค่าโดยสาร 61-120 บาท (6,001 - 12,000 สตางค์) หัก 6 บาท (600 สตางค์)', () => {
      // ตัวอย่างที่ 1: 61 บาท (6,100 สตางค์)
      const res61 = calculateFees({
        fareSatang: 6100,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(res61.knightFeeSatang, 600, 'ค่าโดยสาร 61 บาท ต้องหัก 600 สตางค์ (6 บาท)');
      assert.strictEqual(res61.appliedTierId, 'tier_3');
      assert.strictEqual(res61.netKnightEarningsSatang, 5500);

      // ตัวอย่างที่ 2: 120 บาท (12,000 สตางค์)
      const res120 = calculateFees({
        fareSatang: 12000,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(res120.knightFeeSatang, 600, 'ค่าโดยสาร 120 บาท ต้องหัก 600 สตางค์ (6 บาท)');
      assert.strictEqual(res120.appliedTierId, 'tier_3');
      assert.strictEqual(res120.netKnightEarningsSatang, 11400);
    });

    it('Tier 4: ค่าโดยสาร 121-250 บาท (12,001 - 25,000 สตางค์) หัก 8 บาท (800 สตางค์)', () => {
      // ตัวอย่างที่ 1: 150 บาท (15,000 สตางค์)
      const res150 = calculateFees({
        fareSatang: 15000,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(res150.knightFeeSatang, 800, 'ค่าโดยสาร 150 บาท ต้องหัก 800 สตางค์ (8 บาท)');
      assert.strictEqual(res150.appliedTierId, 'tier_4');
      assert.strictEqual(res150.netKnightEarningsSatang, 14200);

      // ตัวอย่างที่ 2: 250 บาทพอดี (25,000 สตางค์)
      const res250 = calculateFees({
        fareSatang: 25000,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(res250.knightFeeSatang, 800, 'ค่าโดยสาร 250 บาท ต้องหัก 800 สตางค์ (8 บาท)');
      assert.strictEqual(res250.appliedTierId, 'tier_4');
      assert.strictEqual(res250.netKnightEarningsSatang, 24200);
    });

    it('Tier 5: ค่าโดยสาร > 250 บาท (> 25,000 สตางค์) หัก 10 บาท (1,000 สตางค์ เพดานตายตัว)', () => {
      // ตัวอย่างที่ 1: 251 บาท (25,100 สตางค์)
      const res251 = calculateFees({
        fareSatang: 25100,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(res251.knightFeeSatang, 1000, 'ค่าโดยสาร 251 บาท ต้องหัก 1,000 สตางค์ (10 บาท)');
      assert.strictEqual(res251.appliedTierId, 'tier_5');

      // ตัวอย่างที่ 2: 800 บาท (80,000 สตางค์) ค่าโดยสารทางไกลมาก เพดานตายตัว 10 บาท
      const res800 = calculateFees({
        fareSatang: 80000,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(res800.knightFeeSatang, 1000, 'เพดานตายตัวต้องไม่เกิน 1,000 สตางค์ (10 บาท)');
      assert.strictEqual(res800.netKnightEarningsSatang, 79000, 'อัศวินรับสุทธิ 79,000 สตางค์ (790 บาท)');
    });
  });

  // =========================================================================
  // 2. ทดสอบ Founding Knight Lock
  // =========================================================================
  describe('Founding Knight Lock (อัศวินผู้ก่อตั้ง)', () => {
    it('ถ้า knight.isFoundingKnight === true ต้องหัก 2 บาท (200 สตางค์) เสมอทุกระยะทาง ตลอดชีพ', () => {
      // ระยะสั้น 25 บาท
      const shortTrip = calculateFees({
        fareSatang: 2500,
        knight: { isFoundingKnight: true, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(shortTrip.knightFeeSatang, 200);
      assert.strictEqual(shortTrip.isFoundingKnightApplied, true);

      // ระยะไกลมาก 600 บาท (60,000 สตางค์) ถ้าคนทั่วไปจะโดน 10 บาท แต่อัศวินก่อตั้งต้องหักแค่ 2 บาท (200 สตางค์)
      const longTrip = calculateFees({
        fareSatang: 60000,
        knight: { isFoundingKnight: true, dailyEquipmentCount: 20 }
      });
      assert.strictEqual(longTrip.knightFeeSatang, 200, 'Founding Knight ทริป 600 บาท ต้องถูกหักเพียง 200 สตางค์ (2 บาท)');
      assert.strictEqual(longTrip.isFoundingKnightApplied, true);
      assert.strictEqual(longTrip.netKnightEarningsSatang, 59800);
    });
  });

  // =========================================================================
  // 3. ทดสอบค่าอุปกรณ์ (Equipment Fee) รอบที่ 20 และ 21 ของวัน
  // =========================================================================
  describe('ค่าอุปกรณ์: 4 บาท เฉพาะ 20 รอบแรกของวัน', () => {
    
    it('เคสรอบที่ 1 ถึง 20 ของวัน (เช่น รอบที่ 20: dailyEquipmentCount === 19): หักเพิ่ม 4 บาท (400 สตางค์)', () => {
      const round20 = calculateFees({
        fareSatang: 5000, // ค่าโดยสาร 50 บาท (Tier 2 หัก 400 สตางค์)
        knight: {
          isFoundingKnight: false,
          dailyEquipmentCount: 19, // วิ่งมาแล้ว 19 รอบ รอบนี้เป็นรอบที่ 20
          equipmentPaidSatang: 19 * 400 // สะสมมา 7,600 สตางค์
        }
      });

      assert.strictEqual(round20.knightFeeSatang, 400, 'ค่าบริการตามบันได 400 สตางค์');
      assert.strictEqual(round20.equipmentFeeSatang, 400, 'รอบที่ 20 ต้องหักค่าอุปกรณ์ 400 สตางค์ (4 บาท)');
      assert.strictEqual(round20.totalKnightDeductionSatang, 800, 'รวมหัก 400 + 400 = 800 สตางค์ (8 บาท)');
      assert.strictEqual(round20.equipmentApplied, true);
      assert.strictEqual(round20.newDailyEquipmentCount, 20, 'รอบสะสมของวันต้องเพิ่มเป็น 20');
      assert.strictEqual(round20.newEquipmentPaidSatang, (19 * 400) + 400);
    });

    it('เคสรอบที่ 21 ของวัน (dailyEquipmentCount === 20): ไม่หักค่าอุปกรณ์ (0 สตางค์)', () => {
      const round21 = calculateFees({
        fareSatang: 5000,
        knight: {
          isFoundingKnight: false,
          dailyEquipmentCount: 20, // วิ่งครบ 20 รอบในวันนั้นแล้ว
          equipmentPaidSatang: 20 * 400
        }
      });

      assert.strictEqual(round21.knightFeeSatang, 400, 'ค่าบริการตามบันไดยังคงหัก 400 สตางค์');
      assert.strictEqual(round21.equipmentFeeSatang, 0, 'รอบที่ 21 ต้องไม่หักค่าอุปกรณ์ (0 สตางค์)');
      assert.strictEqual(round21.totalKnightDeductionSatang, 400, 'หักรวมเฉพาะค่าบริการบันได 400 สตางค์');
      assert.strictEqual(round21.equipmentApplied, false);
      assert.strictEqual(round21.newDailyEquipmentCount, 20, 'รอบสะสมยังคงอยู่ที่ 20');
    });

    it('เคสข้ามวันตาม timezone Asia/Bangkok เวลา 00:00: รีเซ็ตรอบกลับเป็น 0 และเริ่มหักใหม่', () => {
      // วันที่ 16 ก.ย. 2026 เวลา 23:55 น. ในกรุงเทพฯ
      const yesterday = '2026-09-16T16:55:00.000Z'; // 23:55 Bangkok (+7)
      // วันที่ 17 ก.ย. 2026 เวลา 00:05 น. ในกรุงเทพฯ
      const today = '2026-09-16T17:05:00.000Z'; // 00:05 Bangkok (+7)

      assert.strictEqual(isDifferentBangkokDay(yesterday, new Date(today)), true, 'ต้องตรวจพบการข้ามวันตาม Bangkok timezone');

      const nextDayTrip = calculateFees({
        fareSatang: 4000,
        knight: {
          isFoundingKnight: false,
          dailyEquipmentCount: 20, // เมื่อวานวิ่งครบ 20 รอบแล้ว
          lastTripTimestamp: yesterday,
          equipmentPaidSatang: 8000
        },
        now: today
      });

      assert.strictEqual(nextDayTrip.equipmentFeeSatang, 400, 'ข้ามวันใหม่แล้ว ต้องรีเซ็ตและหัก 400 สตางค์');
      assert.strictEqual(nextDayTrip.newDailyEquipmentCount, 1, 'จำนวนรอบของวันใหม่ต้องเริ่มนับที่ 1');
    });

    it('เคสหยุดหักอัตโนมัติเมื่อยอดสะสมครบ 3,600 บาท (360,000 สตางค์)', () => {
      // กรณีผ่อนครบ 360,000 สตางค์แล้ว
      const fullyPaid = calculateFees({
        fareSatang: 5000,
        knight: {
          isFoundingKnight: false,
          dailyEquipmentCount: 5,
          equipmentPaidSatang: 360000 // ครบ 3,600 บาทแล้ว
        }
      });
      assert.strictEqual(fullyPaid.equipmentFeeSatang, 0, 'ยอดสะสมครบ 3,600 บาทแล้ว ต้องไม่หักเพิ่ม');

      // กรณีเหลืออีกเพียง 200 สตางค์จะครบ 360,000 สตางค์ (มียอดสะสม 359,800 สตางค์)
      const partialCap = calculateFees({
        fareSatang: 5000,
        knight: {
          isFoundingKnight: false,
          dailyEquipmentCount: 5,
          equipmentPaidSatang: 359800
        }
      });
      assert.strictEqual(partialCap.equipmentFeeSatang, 200, 'ต้องหักเฉพาะส่วนที่เหลือ 200 สตางค์เพื่อให้แตะเพดาน 360,000 พอดี');
      assert.strictEqual(partialCap.newEquipmentPaidSatang, 360000);
    });
  });

  // =========================================================================
  // 4. ทดสอบฝั่งพลเมือง และ 5 Buckets
  // =========================================================================
  describe('ฝั่งพลเมือง และ ถังเงิน 5 Buckets', () => {

    it('ฝั่งพลเมือง: หัก 5 บาท (500 สตางค์) แตกเป็น ค่าระบบ 3 + คุ้มครอง 1 + มัดจำหมวก 1', () => {
      const res = calculateFees({
        fareSatang: 3000,
        knight: { isFoundingKnight: false, dailyEquipmentCount: 20 }
      });

      assert.strictEqual(res.citizenFeeSatang, 500, 'ค่าบริการพลเมือง 500 สตางค์ (5 บาท)');
      assert.strictEqual(res.citizenBuckets.system, 300, 'ค่าระบบฝั่งพลเมือง 300 สตางค์ (3 บาท)');
      assert.strictEqual(res.citizenBuckets.insurance, 100, 'คุ้มครองอุบัติเหตุ 100 สตางค์ (1 บาท)');
      assert.strictEqual(res.citizenBuckets.helmet, 100, 'มัดจำหมวกนิรภัย 100 สตางค์ (1 บาท)');
      assert.strictEqual(res.citizenBuckets.pension, 0);
      assert.strictEqual(res.citizenBuckets.equipment, 0);
      assert.strictEqual(res.totalCitizenPaySatang, 3500, 'พลเมืองจ่ายรวม 30 บาท + 5 บาท = 35 บาท (3,500 สตางค์)');
    });

    it('5 Buckets รวม: system, insurance, pension, helmet, equipment เป็น Integer สตางค์ทั้งหมด', () => {
      const res = calculateFees({
        fareSatang: 10000, // ค่าโดยสาร 100 บาท (Tier 3 หัก 600 สตางค์: system 300, insurance 200, pension 100)
        knight: {
          isFoundingKnight: false,
          dailyEquipmentCount: 0, // หักค่าอุปกรณ์ 400 สตางค์
          equipmentPaidSatang: 0
        }
      });

      // ตรวจสอบว่าทุก bucket เป็น integer ไม่ใช่ float
      assert.strictEqual(Number.isInteger(res.buckets.system), true);
      assert.strictEqual(Number.isInteger(res.buckets.insurance), true);
      assert.strictEqual(Number.isInteger(res.buckets.pension), true);
      assert.strictEqual(Number.isInteger(res.buckets.helmet), true);
      assert.strictEqual(Number.isInteger(res.buckets.equipment), true);

      // System = Knight (300) + Citizen (300) = 600 สตางค์
      assert.strictEqual(res.buckets.system, 600);
      // Insurance = Knight (200) + Citizen (100) = 300 สตางค์
      assert.strictEqual(res.buckets.insurance, 300);
      // Pension = Knight (100) = 100 สตางค์
      assert.strictEqual(res.buckets.pension, 100);
      // Helmet = Citizen (100) = 100 สตางค์
      assert.strictEqual(res.buckets.helmet, 100);
      // Equipment = Knight (400) = 400 สตางค์
      assert.strictEqual(res.buckets.equipment, 400);

      // ยอดรวมใน buckets ทั้ง 5 ต้องเท่ากับ knightDeduction + citizenFee
      const sumBuckets = res.buckets.system + res.buckets.insurance + res.buckets.pension + res.buckets.helmet + res.buckets.equipment;
      const expectedSum = res.totalKnightDeductionSatang + res.citizenFeeSatang;
      assert.strictEqual(sumBuckets, expectedSum, 'ผลรวมทั้ง 5 buckets ต้องตรงกับยอดหักรวมทั้งหมด');
    });
  });

  // =========================================================================
  // 5. ทดสอบ GP ร้านค้าพันธมิตร
  // =========================================================================
  describe('ร้านค้า GP (calculateMerchantGP)', () => {
    it('Founding Merchant GP: 5% (500 bps)', () => {
      const res = calculateMerchantGP(100000, 'founding'); // ยอดขาย 1,000 บาท (100,000 สตางค์)
      assert.strictEqual(res.gpBps, 500);
      assert.strictEqual(res.gpAmountSatang, 5000, 'หัก GP 5,000 สตางค์ (50 บาท)');
      assert.strictEqual(res.netPayoutSatang, 95000, 'ร้านค้ารับสุทธิ 95,000 สตางค์ (950 บาท)');
    });

    it('Standard Merchant GP: 10% (1,000 bps)', () => {
      const res = calculateMerchantGP(100000, 'standard');
      assert.strictEqual(res.gpBps, 1000);
      assert.strictEqual(res.gpAmountSatang, 10000, 'หัก GP 10,000 สตางค์ (100 บาท)');
      assert.strictEqual(res.netPayoutSatang, 90000, 'ร้านค้ารับสุทธิ 90,000 สตางค์ (900 บาท)');
    });

    it('Growth Merchant GP: 13% (1,300 bps)', () => {
      const res = calculateMerchantGP(100000, 'growth');
      assert.strictEqual(res.gpBps, 1300);
      assert.strictEqual(res.gpAmountSatang, 13000, 'หัก GP 13,000 สตางค์ (130 บาท)');
      assert.strictEqual(res.netPayoutSatang, 87000, 'ร้านค้ารับสุทธิ 87,000 สตางค์ (870 บาท)');
    });
  });

});
