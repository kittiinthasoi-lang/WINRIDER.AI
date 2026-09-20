/**
 * WINRIDER.AI Core Double-Entry Ledger System
 * 
 * บันทึกบัญชีแยกประเภทคู่ (Double-Entry Ledger)
 * ควบคุม 5 ถังเงิน: system, insurance, pension, helmet, equipment
 */

export interface LedgerEntry {
  id: string;
  txId: string;
  tripId?: string;
  debitAccount: string;   // บัญชีเดบิต (เช่น: 'WALLET_KNIGHT', 'CASH_COLLECTION')
  creditAccount: string;  // บัญชีเครดิต (เช่น: 'BUCKET_INSURANCE', 'REVENUE_SYSTEM')
  amount: number;
  bucket: 'system' | 'insurance' | 'pension' | 'helmet' | 'equipment' | 'general';
  description: string;
  createdAt: string;
}

export interface KnightWalletState {
  uid: string;
  balance: number;       // ยอดเงินพร้อมถอน (แสดงสีทอง #FFC93C)
  pending: number;       // ยอดรอดำเนินการ
  locked: number;        // ยอดคงค้างสำรอง
  buckets: {
    system: number;      // ถังค่าระบบ
    insurance: number;   // ถังกองทุนคุ้มครองอุบัติเหตุ
    pension: number;     // ถังเงินออมอนาคต
    helmet: number;      // ถังมัดจำหมวกกันน็อก
    equipment: number;   // ถังผ่อนอุปกรณ์/ชุดเกราะ
  };
  equipmentInstallment: {
    totalGoal: number;   // 3,600 บาท
    paidAmount: number;  // ผ่อนแล้ว X บาท
    todayDeductionsCount: number; // วันนี้หักไปแล้ว X รอบ
    dailyLimit: number;  // สูงสุด 20 รอบต่อวัน
    isCompleted: boolean;
  };
}

export class LedgerEngine {
  private entries: LedgerEntry[] = [];
  private wallet: KnightWalletState;

  constructor(initialWallet?: Partial<KnightWalletState>) {
    this.wallet = {
      uid: initialWallet?.uid || 'KNT-SOVEREIGN-01',
      balance: initialWallet?.balance ?? 0.0,
      pending: initialWallet?.pending ?? 0.0,
      locked: initialWallet?.locked ?? 0.0,
      buckets: {
        system: initialWallet?.buckets?.system ?? 0.0,
        insurance: initialWallet?.buckets?.insurance ?? 0.0,
        pension: initialWallet?.buckets?.pension ?? 0.0,
        helmet: initialWallet?.buckets?.helmet ?? 0.0,
        equipment: initialWallet?.buckets?.equipment ?? 0.0
      },
      equipmentInstallment: {
        totalGoal: 3600,
        paidAmount: initialWallet?.equipmentInstallment?.paidAmount ?? 0,
        todayDeductionsCount: initialWallet?.equipmentInstallment?.todayDeductionsCount ?? 0,
        dailyLimit: 20,
        isCompleted: (initialWallet?.equipmentInstallment?.paidAmount ?? 0) >= 3600
      }
    };

    // ตัวอย่างประวัติธุรกรรมแบบ Double-Entry
    this.entries = [
      {
        id: 'LEDGER-001',
        txId: 'TX-TRIP-9901',
        tripId: 'TRIP-9901',
        debitAccount: 'FARE_REVENUE',
        creditAccount: 'WALLET_KNIGHT',
        amount: 45.0,
        bucket: 'general',
        description: 'ค่าโดยสารสุทธิจากภารกิจรับส่งผู้โดยสาร BTS หมอชิต',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'LEDGER-002',
        txId: 'TX-DEDUCT-9901-INS',
        tripId: 'TRIP-9901',
        debitAccount: 'WALLET_KNIGHT',
        creditAccount: 'BUCKET_INSURANCE',
        amount: 1.0,
        bucket: 'insurance',
        description: 'สมทบกองทุนคุ้มครองอุบัติเหตุอัศวิน (1 บาท/รอบ)',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'LEDGER-003',
        txId: 'TX-DEDUCT-9901-PEN',
        tripId: 'TRIP-9901',
        debitAccount: 'WALLET_KNIGHT',
        creditAccount: 'BUCKET_PENSION',
        amount: 1.0,
        bucket: 'pension',
        description: 'สะสมเงินออมเพื่ออนาคตอัศวิน (1 บาท/รอบ)',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'LEDGER-004',
        txId: 'TX-DEDUCT-9901-EQP',
        tripId: 'TRIP-9901',
        debitAccount: 'WALLET_KNIGHT',
        creditAccount: 'BUCKET_EQUIPMENT',
        amount: 1.0,
        bucket: 'equipment',
        description: 'ผ่อนชำระชุดเกราะและกล่องอัจฉริยะ (1 บาท/รอบ)',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'LEDGER-005',
        txId: 'TX-TOPUP-9800',
        debitAccount: 'PROMPTPAY_INFLOW',
        creditAccount: 'WALLET_KNIGHT',
        amount: 500.0,
        bucket: 'general',
        description: 'เติมเงินผ่านระบบ PromptPay QR สำเร็จ',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  }

  public getWallet(): KnightWalletState {
    return { ...this.wallet };
  }

  public getLedgerEntries(): LedgerEntry[] {
    return [...this.entries];
  }

  /**
   * บันทึกรายการหักเข้าถังเงินเมื่อจบภารกิจ (Double-Entry Posting)
   */
  public postTripSettlement(params: {
    tripId: string;
    grossFare: number;
    systemFee: number;
    insuranceFee: number;
    pensionFee: number;
    equipmentFee: number;
  }): { wallet: KnightWalletState; createdEntries: LedgerEntry[] } {
    const now = new Date().toISOString();
    const created: LedgerEntry[] = [];
    const totalDeductions = params.systemFee + params.insuranceFee + params.pensionFee + params.equipmentFee;
    const netEarnings = params.grossFare - totalDeductions;

    // 1. Credit Knight Wallet with Net Earnings
    this.wallet.balance += netEarnings;
    const netEntry: LedgerEntry = {
      id: `LEDGER-${Date.now()}-NET`,
      txId: `TX-NET-${params.tripId}`,
      tripId: params.tripId,
      debitAccount: 'FARE_REVENUE',
      creditAccount: 'WALLET_KNIGHT',
      amount: netEarnings,
      bucket: 'general',
      description: `ค่าโดยสารสุทธิภารกิจ #${params.tripId}`,
      createdAt: now
    };
    created.push(netEntry);

    // 2. Buckets Allocation
    if (params.systemFee > 0) {
      this.wallet.buckets.system += params.systemFee;
      created.push({
        id: `LEDGER-${Date.now()}-SYS`,
        txId: `TX-FEE-SYS-${params.tripId}`,
        tripId: params.tripId,
        debitAccount: 'FARE_REVENUE',
        creditAccount: 'BUCKET_SYSTEM',
        amount: params.systemFee,
        bucket: 'system',
        description: 'ค่าระบบปฏิบัติการอัศวิน WINRIDER.AI',
        createdAt: now
      });
    }

    if (params.insuranceFee > 0) {
      this.wallet.buckets.insurance += params.insuranceFee;
      created.push({
        id: `LEDGER-${Date.now()}-INS`,
        txId: `TX-FEE-INS-${params.tripId}`,
        tripId: params.tripId,
        debitAccount: 'FARE_REVENUE',
        creditAccount: 'BUCKET_INSURANCE',
        amount: params.insuranceFee,
        bucket: 'insurance',
        description: 'เงินสมทบกองทุนคุ้มครองอุบัติเหตุ',
        createdAt: now
      });
    }

    if (params.pensionFee > 0) {
      this.wallet.buckets.pension += params.pensionFee;
      created.push({
        id: `LEDGER-${Date.now()}-PEN`,
        txId: `TX-FEE-PEN-${params.tripId}`,
        tripId: params.tripId,
        debitAccount: 'FARE_REVENUE',
        creditAccount: 'BUCKET_PENSION',
        amount: params.pensionFee,
        bucket: 'pension',
        description: 'เงินออมเพื่ออนาคตอัศวิน',
        createdAt: now
      });
    }

    if (params.equipmentFee > 0 && !this.wallet.equipmentInstallment.isCompleted) {
      this.wallet.buckets.equipment += params.equipmentFee;
      this.wallet.equipmentInstallment.paidAmount = Math.min(
        this.wallet.equipmentInstallment.totalGoal,
        this.wallet.equipmentInstallment.paidAmount + params.equipmentFee
      );
      this.wallet.equipmentInstallment.todayDeductionsCount += 1;
      if (this.wallet.equipmentInstallment.paidAmount >= this.wallet.equipmentInstallment.totalGoal) {
        this.wallet.equipmentInstallment.isCompleted = true;
      }
      created.push({
        id: `LEDGER-${Date.now()}-EQP`,
        txId: `TX-FEE-EQP-${params.tripId}`,
        tripId: params.tripId,
        debitAccount: 'FARE_REVENUE',
        creditAccount: 'BUCKET_EQUIPMENT',
        amount: params.equipmentFee,
        bucket: 'equipment',
        description: 'ผ่อนอุปกรณ์ชุดเกราะอัศวิน',
        createdAt: now
      });
    }

    this.entries.unshift(...created);
    return {
      wallet: { ...this.wallet },
      createdEntries: created
    };
  }

  /**
   * เติมเงินผ่าน PromptPay
   */
  public topupViaPromptPay(amount: number): LedgerEntry {
    this.wallet.balance += amount;
    const entry: LedgerEntry = {
      id: `LEDGER-${Date.now()}-TOPUP`,
      txId: `TX-TOPUP-${Date.now()}`,
      debitAccount: 'PROMPTPAY_INFLOW',
      creditAccount: 'WALLET_KNIGHT',
      amount,
      bucket: 'general',
      description: `เติมเงินเข้ากระเป๋าอัศวินผ่าน PromptPay QR`,
      createdAt: new Date().toISOString()
    };
    this.entries.unshift(entry);
    return entry;
  }
}

export const globalLedgerEngine = new LedgerEngine();
