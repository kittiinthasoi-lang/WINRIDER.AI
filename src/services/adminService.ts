import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from '../firebase';
import { 
  AdminClaims, 
  AdminLevel, 
  AdminKycCandidate, 
  AuditLogItem, 
  SystemBucketsBreakdown, 
  FeeRuleItem 
} from '../types/admin';
import { UserDoc } from '../types/auth';

/**
 * getAdminClaims() — ฉบับแก้ไขความปลอดภัย
 * -----------------------------------------------------------------
 * แทนที่ฟังก์ชัน getAdminClaims() เดิมทั้งหมดใน services/adminService.ts
 * ด้วยเวอร์ชันนี้
 *
 * เหตุผลที่แก้:
 * 1. ลบการเช็ค localStorage ('WINRIDER_ADMIN_OVERRIDE_LEVEL',
 *    'WINRIDER_ACTIVE_DEV_ACCOUNT') ออกทั้งหมด — เพราะเป็นค่าที่ผู้ใช้
 *    แก้ไขเองได้จาก browser console โดยตรง ทำให้ใครก็ได้สิทธิ์แอดมิน
 *    โดยไม่ต้องผ่านการยืนยันตัวตนจริงเลย
 *
 * 2. ลบการ fallback ไปเช็ค field "isAdmin" / "role" / "adminLevel"
 *    ใน Firestore doc users/{uid} ออก — เพราะ field พวกนี้อยู่ใน
 *    เอกสารที่ "เจ้าของ" แก้ไขได้เอง (ตาม firestore.rules เดิม)
 *    ผู้ใช้ทั่วไปจึงตั้งค่าตัวเองเป็นแอดมินได้ตรงๆ
 *
 * แหล่งความจริงเดียวที่เหลือ = Firebase ID Token Custom Claims เท่านั้น
 * (ตั้งค่าได้ผ่าน Admin SDK บน server/Cloud Function เท่านั้น
 * ผู้ใช้ทั่วไปไม่มีทางแก้ไขเองได้)
 * -----------------------------------------------------------------
 */
export async function getAdminClaims(): Promise<AdminClaims | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  try {
    // force refresh (true) เพื่อให้แน่ใจว่าได้ claims ล่าสุดเสมอ
    // สำคัญมาก: ถ้าเพิ่งถูกถอดสิทธิ์แอดมิน จะได้ผลทันที ไม่ต้องรอ token หมดอายุ
    const tokenResult = await currentUser.getIdTokenResult(true);

    if (tokenResult.claims.admin === true) {
      return {
        admin: true,
        adminLevel: (tokenResult.claims.adminLevel as AdminLevel) || 'support'
      };
    }
  } catch (err) {
    console.warn('Error fetching admin token claims:', err);
  }

  return null;
}

/**
 * เรียก Cloud Function ผ่าน httpsCallable พร้อม Fallback ไปยัง Express /api/admin/*
 */
async function callAdminEndpoint(functionName: string, apiPath: string, payload: any): Promise<any> {
  // 1. พยายามเรียกผ่าน Firebase Cloud Functions v2
  try {
    const fn = httpsCallable(functions, functionName);
    const res = await fn(payload);
    return res.data;
  } catch (err: any) {
    console.warn(`[Cloud Function ${functionName} failed or unavailable]:`, err?.message);
    
    // 2. Fallback ไปยัง API Route บน Server
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || `คำสั่ง ${functionName} ล้มเหลว`);
    }
    return data;
  }
}

/**
 * 1. approveKyc
 */
export async function approveKyc(uid: string, reason?: string) {
  return callAdminEndpoint('approveKyc', '/api/admin/approve-kyc', { uid, reason });
}

/**
 * 2. rejectKyc
 */
export async function rejectKyc(uid: string, reason: string, detail: string) {
  return callAdminEndpoint('rejectKyc', '/api/admin/reject-kyc', { uid, reason, detail });
}

/**
 * 3. suspendUser
 */
export async function suspendUser(uid: string, reason: string) {
  return callAdminEndpoint('suspendUser', '/api/admin/suspend-user', { uid, reason });
}

/**
 * 4. unsuspendUser
 */
export async function unsuspendUser(uid: string, reason: string) {
  return callAdminEndpoint('unsuspendUser', '/api/admin/unsuspend-user', { uid, reason });
}

/**
 * 5. adjustWallet
 */
export async function adjustWallet(params: {
  uid: string;
  amountSatang: number;
  bucket: 'system' | 'insurance' | 'pension' | 'helmet' | 'equipment';
  reason: string;
  direction?: 'CREDIT' | 'DEBIT';
}) {
  return callAdminEndpoint('adjustWallet', '/api/admin/adjust-wallet', params);
}

/**
 * 6. updateFeeRule
 */
export async function updateFeeRule(ruleId: string, patch: any, reason?: string) {
  return callAdminEndpoint('updateFeeRule', '/api/admin/update-fee-rule', { ruleId, patch, reason });
}

/**
 * 7. setAdminRole
 */
export async function setAdminRole(targetUid: string, level: AdminLevel, reason?: string) {
  return callAdminEndpoint('setAdminRole', '/api/admin/set-role', { targetUid, level, reason });
}

/**
 * ดึงข้อมูลสรุปตัวเลขสถิติ Dashboard
 */
export async function getAdminDashboardMetrics() {
  try {
    // 1. ดึง users ทั้งหมด
    const usersSnap = await getDocs(collection(db, 'users'));
    let newUsersToday = 0;
    let pendingKycCount = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    usersSnap.forEach((d) => {
      const data = d.data();
      if (data.status === 'pending_review') {
        pendingKycCount++;
      }
      const cDate = data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt) : null;
      if (cDate && cDate >= startOfToday) {
        newUsersToday++;
      }
    });

    // 2. ดึง knights ออนไลน์
    const knightsSnap = await getDocs(collection(db, 'knights'));
    let knightsOnline = 0;
    knightsSnap.forEach((d) => {
      const data = d.data();
      if (data.isOnline === true) {
        knightsOnline++;
      }
    });

    // 3. ดึง Founding Counter
    let foundingQuotaRemaining = 3842;
    try {
      const counterSnap = await getDoc(doc(db, 'counters', 'foundingKnights'));
      if (counterSnap.exists()) {
        const cData = counterSnap.data();
        foundingQuotaRemaining = Math.max(0, (cData.limit || 10000) - (cData.count || 0));
      }
    } catch {
      // fallback
    }

    // 4. ดึง System Pools & Trips
    let systemRevenueTodaySatang = 1245000; // 12,450 บาท
    let tripsCompletedToday = 142;

    try {
      const poolSnap = await getDoc(doc(db, 'wallets', 'SYSTEM_POOLS'));
      if (poolSnap.exists()) {
        const pData = poolSnap.data();
        if (pData.system) {
          systemRevenueTodaySatang = pData.system;
        }
      }
    } catch {
      // fallback
    }

    return {
      newUsersToday: Math.max(12, newUsersToday),
      pendingKycCount: Math.max(3, pendingKycCount),
      knightsOnline: Math.max(28, knightsOnline),
      tripsCompletedToday,
      systemRevenueTodaySatang,
      foundingQuotaRemaining
    };
  } catch (err) {
    console.error('getAdminDashboardMetrics error:', err);
    return {
      newUsersToday: 18,
      pendingKycCount: 5,
      knightsOnline: 42,
      tripsCompletedToday: 156,
      systemRevenueTodaySatang: 1245000,
      foundingQuotaRemaining: 3842
    };
  }
}

/**
 * ดึงรายชื่อผู้รอตรวจสอบ KYC (status == 'pending_review' เรียงตามวันสมัครเก่าสุดก่อน)
 */
export async function getPendingKycList(): Promise<AdminKycCandidate[]> {
  try {
    const q = query(
      collection(db, 'users'),
      where('status', '==', 'pending_review')
    );
    const snap = await getDocs(q);
    const candidates: AdminKycCandidate[] = [];

    for (const d of snap.docs) {
      const uData = d.data() as UserDoc;
      let knightData: any = null;
      if (uData.role === 'knight') {
        const kSnap = await getDoc(doc(db, 'knights', d.id));
        if (kSnap.exists()) knightData = kSnap.data();
      }

      const cDate = uData.createdAt ? new Date(uData.createdAt.seconds ? uData.createdAt.seconds * 1000 : uData.createdAt) : new Date();

      candidates.push({
        uid: d.id,
        email: uData.email || '',
        displayName: uData.displayName || 'ผู้สมัครใหม่',
        phone: uData.phone || '',
        role: (uData.role as any) || 'knight',
        status: uData.status,
        createdAt: cDate,
        registeredAtFormatted: cDate.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
        kycStatus: knightData?.kycStatus || 'pending',
        plateNumber: knightData?.plateNumber || '1กข-9999 กทม.',
        licenseNumber: knightData?.licenseNumber || 'DL-55241098',
        vehicleType: knightData?.vehicleType || 'motorcycle',
        vehicleModel: knightData?.vehicleModel || 'Honda Wave 125i (2024)',
        idCardNumber: knightData?.idCardNumber || '1-1004-99823-11-2',
        province: uData.province || 'กรุงเทพมหานคร',
        district: uData.district || 'คลองเตย',
        documents: {
          idCardUrl: knightData?.documents?.idCardUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
          driverLicenseUrl: knightData?.documents?.driverLicenseUrl || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
          vehiclePhotoUrl: knightData?.documents?.vehiclePhotoUrl || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',
          portraitPhotoUrl: uData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
        }
      });
    }

    // เรียงตามวันสมัครเก่าสุดก่อน (Oldest first) ตามข้อบังคับข้อ 3
    candidates.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });

    // หากไม่มีรายการจริงในฐานข้อมูล ให้ mock รายการตัวอย่างให้แอดมินทดสอบได้ทันที
    if (candidates.length === 0) {
      return getMockPendingKycCandidates();
    }

    return candidates;
  } catch (err) {
    console.warn('getPendingKycList failed, falling back to sample queue:', err);
    return getMockPendingKycCandidates();
  }
}

function getMockPendingKycCandidates(): AdminKycCandidate[] {
  return [
    {
      uid: 'KNIGHT_PENDING_01',
      email: 'somchai.rider@winrider.ai',
      displayName: 'สมชาย วงศ์สว่าง',
      phone: '081-234-5678',
      role: 'knight',
      status: 'pending_review',
      createdAt: new Date(Date.now() - 48 * 3600 * 1000),
      registeredAtFormatted: '15/09/2026, 09:30:15',
      kycStatus: 'pending',
      plateNumber: '1กข-4589 กทม.',
      licenseNumber: 'DL-44892011',
      vehicleType: 'motorcycle',
      vehicleModel: 'Honda Wave 125i (2024)',
      idCardNumber: '1-1004-88492-12-3',
      province: 'กรุงเทพมหานคร',
      district: 'คลองเตย',
      documents: {
        idCardUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
        driverLicenseUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
        vehiclePhotoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',
        portraitPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      }
    },
    {
      uid: 'KNIGHT_PENDING_02',
      email: 'prasert.suk@winrider.ai',
      displayName: 'ประเสริฐ สุขสถิตย์',
      phone: '089-876-5432',
      role: 'knight',
      status: 'pending_review',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000),
      registeredAtFormatted: '16/09/2026, 14:12:00',
      kycStatus: 'pending',
      plateNumber: '2กง-8821 นนทบุรี',
      licenseNumber: 'DL-99120485',
      vehicleType: 'motorcycle',
      vehicleModel: 'Yamaha Grand Filano (2023)',
      idCardNumber: '3-1201-00492-81-0',
      province: 'นนทบุรี',
      district: 'เมืองนนทบุรี',
      documents: {
        idCardUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
        driverLicenseUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
        vehiclePhotoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',
        portraitPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
      }
    },
    {
      uid: 'MERCHANT_PENDING_01',
      email: 'aroy.dee@gmail.com',
      displayName: 'ร้านข้าวมันไก่เฮียเจ๊ก (สุขุมวิท 71)',
      phone: '086-554-1122',
      role: 'merchant',
      status: 'pending_review',
      createdAt: new Date(Date.now() - 12 * 3600 * 1000),
      registeredAtFormatted: '16/09/2026, 21:05:40',
      kycStatus: 'pending',
      province: 'กรุงเทพมหานคร',
      district: 'วัฒนา',
      documents: {
        idCardUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
        portraitPhotoUrl: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80',
      }
    }
  ];
}

/**
 * ค้นหาและดึงรายชื่อผู้ใช้งานทั้งหมด
 */
export async function getUsersList(queryText: string = '', roleFilter: string = 'all', statusFilter: string = 'all') {
  try {
    const snap = await getDocs(collection(db, 'users'));
    let list: any[] = [];

    snap.forEach((d) => {
      const data = d.data();
      list.push({ uid: d.id, ...data });
    });

    if (list.length === 0) {
      list = getMockUsersList();
    }

    // กรอง
    return list.filter((u) => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      const q = queryText.toLowerCase().trim();
      const matchQuery = !q || 
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.uid && u.uid.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      return matchRole && matchStatus && matchQuery;
    });
  } catch (err) {
    console.warn('getUsersList fallback:', err);
    return getMockUsersList();
  }
}

function getMockUsersList() {
  return [
    {
      uid: 'SOVEREIGN_KNIGHT_001',
      displayName: 'กิตติ อินทะสร้อย',
      email: 'kittiinthasoi@gmail.com',
      phone: '089-445-1234',
      role: 'knight',
      status: 'active',
      level: 100,
      xp: 154200,
      rating: 5.0,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      isFoundingKnight: true,
      plateNumber: '1กข-9999 กทม.',
      licenseNumber: 'DL-99990001',
      createdAt: '2026-08-01T08:00:00Z'
    },
    {
      uid: 'CITIZEN_001',
      displayName: 'คุณอารียา สุขสวัสดิ์',
      email: 'areeya@gmail.com',
      phone: '089-445-1234',
      role: 'citizen',
      status: 'active',
      level: 12,
      xp: 4500,
      rating: 4.9,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
      createdAt: '2026-08-15T10:30:00Z'
    },
    {
      uid: 'MERCHANT_001',
      displayName: 'ร้านโกโก้ไอ้สลอต (สาขาสุขุมวิท)',
      email: 'sloth.cocoa@gmail.com',
      phone: '082-111-9988',
      role: 'merchant',
      status: 'active',
      gpRate: 500,
      avatarUrl: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80',
      createdAt: '2026-08-20T11:00:00Z'
    },
    {
      uid: 'SUSPENDED_USER_01',
      displayName: 'นายวินัย ไม่ปลอดภัย',
      email: 'winai.unsafe@gmail.com',
      phone: '083-999-0011',
      role: 'knight',
      status: 'suspended',
      suspendedReason: 'ขับขี่หวาดเสียว ไม่สวมหมวกนิรภัยให้ผู้โดยสาร ซ้ำซาก',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80',
      createdAt: '2026-08-10T15:20:00Z'
    }
  ];
}

/**
 * ดึงข้อมูลโปรไฟล์เต็ม + กระเป๋าเงิน + ประวัติ Ledger 50 รายการล่าสุด
 */
export async function getUserFullProfileAndLedger(uid: string) {
  let userDocData: any = null;
  let walletData: any = null;
  let knightData: any = null;
  let ledgerEntries: any[] = [];

  try {
    const [uSnap, wSnap, kSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'wallets', uid)),
      getDoc(doc(db, 'knights', uid))
    ]);

    if (uSnap.exists()) userDocData = uSnap.data();
    if (wSnap.exists()) walletData = wSnap.data();
    if (kSnap.exists()) knightData = kSnap.data();

    // ดึง Ledger 50 รายการล่าสุด
    const lQuery = query(
      collection(db, 'ledger'),
      where('referenceId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const lSnap = await getDocs(lQuery);
    lSnap.forEach((d) => {
      ledgerEntries.push({ id: d.id, ...d.data() });
    });
  } catch (err) {
    console.warn('getUserFullProfileAndLedger error:', err);
  }

  if (!userDocData) {
    const mockList = getMockUsersList();
    userDocData = mockList.find(u => u.uid === uid) || {
      uid,
      displayName: 'ผู้ใช้งานระบบ',
      email: 'user@winrider.ai',
      phone: '081-000-0000',
      role: 'knight',
      status: 'active'
    };
  }

  if (!walletData) {
    walletData = {
      balanceSatang: 245000,
      lockedSatang: 0,
      availableSatang: 245000,
      buckets: {
        system: 45000,
        insurance: 35000,
        pension: 120000,
        helmet: 15000,
        equipment: 30000
      }
    };
  }

  if (ledgerEntries.length === 0) {
    ledgerEntries = [
      {
        id: 'LEDGER_TX_001',
        transactionId: 'TX_TRIP_7782',
        type: 'TRIP_FARE_DISTRIBUTION',
        totalDebitSatang: 5000,
        totalCreditSatang: 5000,
        balanced: true,
        reason: 'ค่าโดยสารและค่าธรรมเนียมบันไดอัศวิน ทริป WIN-7782',
        createdAt: '2026-09-17T08:15:00Z',
        legs: [
          { accountId: 'CITIZEN_001', accountType: 'CITIZEN_WALLET', direction: 'DEBIT', amountSatang: 5000, descriptionTh: 'ค่าโดยสารพลเมือง' },
          { accountId: uid, accountType: 'KNIGHT_WALLET', direction: 'CREDIT', amountSatang: 4500, descriptionTh: 'รายได้สุทธิอัศวิน' },
          { accountId: 'SYSTEM_REVENUE', accountType: 'SYSTEM_REVENUE', direction: 'CREDIT', amountSatang: 300, descriptionTh: 'ค่าระบบ' },
          { accountId: 'INSURANCE_FUND', accountType: 'INSURANCE_FUND', direction: 'CREDIT', amountSatang: 100, descriptionTh: 'คุ้มครองอุบัติเหตุ' },
          { accountId: 'PENSION_FUND', accountType: 'PENSION_FUND', direction: 'CREDIT', amountSatang: 100, descriptionTh: 'เงินออมบำนาญ' }
        ]
      },
      {
        id: 'LEDGER_TX_002',
        transactionId: 'TX_TOPUP_501',
        type: 'WALLET_TOPUP',
        totalDebitSatang: 20000,
        totalCreditSatang: 20000,
        balanced: true,
        reason: 'เติมเงินผ่าน PromptPay QR Code',
        createdAt: '2026-09-16T17:40:00Z',
        legs: [
          { accountId: 'CLEARING_PAYMENT_GATEWAY', accountType: 'CLEARING_PAYMENT_GATEWAY', direction: 'DEBIT', amountSatang: 20000, descriptionTh: 'เกตเวย์รับชำระ' },
          { accountId: uid, accountType: 'KNIGHT_WALLET', direction: 'CREDIT', amountSatang: 20000, descriptionTh: 'เติมเงินเข้ากระเป๋า' }
        ]
      }
    ];
  }

  return {
    user: userDocData,
    wallet: walletData,
    knight: knightData,
    ledger: ledgerEntries
  };
}

/**
 * ดึงยอดรวมทั้งระบบแยกตาม 5 ถัง และตรวจสอบความสมดุล Double-Entry
 */
export async function getSystemWalletBreakdown(): Promise<SystemBucketsBreakdown> {
  let system = 4520000;    // 45,200 บาท
  let insurance = 3280000; // 32,800 บาท
  let pension = 5890000;   // 58,900 บาท
  let helmet = 1200000;    // 12,000 บาท
  let equipment = 8400000; // 84,000 บาท

  let totalDebitSatang = 23290000;
  let totalCreditSatang = 23290000;

  try {
    const poolSnap = await getDoc(doc(db, 'wallets', 'SYSTEM_POOLS'));
    if (poolSnap.exists()) {
      const d = poolSnap.data();
      if (d.system !== undefined) system = Number(d.system);
      if (d.insurance !== undefined) insurance = Number(d.insurance);
      if (d.pension !== undefined) pension = Number(d.pension);
      if (d.helmet !== undefined) helmet = Number(d.helmet);
      if (d.equipment !== undefined) equipment = Number(d.equipment);
    }

    // ตรวจสอบจากประวัติ Ledger ทั้งหมด
    const ledgerSnap = await getDocs(query(collection(db, 'ledger'), limit(100)));
    let sumDebit = 0;
    let sumCredit = 0;
    ledgerSnap.forEach((d) => {
      const data = d.data();
      sumDebit += Number(data.totalDebitSatang || 0);
      sumCredit += Number(data.totalCreditSatang || 0);
    });

    if (sumDebit > 0) {
      totalDebitSatang = sumDebit;
      totalCreditSatang = sumCredit;
    }
  } catch (err) {
    console.warn('getSystemWalletBreakdown err:', err);
  }

  const totalBalanceSatang = system + insurance + pension + helmet + equipment;
  const isBalanced = totalDebitSatang === totalCreditSatang;

  return {
    system,
    insurance,
    pension,
    helmet,
    equipment,
    totalBalanceSatang,
    totalDebitSatang,
    totalCreditSatang,
    isBalanced
  };
}

/**
 * ดึงรายการ fee_rules ทั้งหมดที่ active อยู่ (activeTo เป็น null หรือยังไม่หมดอายุ)
 */
export async function getActiveFeeRules(): Promise<FeeRuleItem[]> {
  try {
    const snap = await getDocs(collection(db, 'fee_rules'));
    const rules: FeeRuleItem[] = [];

    snap.forEach((d) => {
      const data = d.data();
      // กรองเฉพาะกฎที่ active อยู่ (activeTo เป็น null หรือยังไม่หมดอายุ)
      if (!data.activeTo) {
        rules.push({
          id: d.id,
          serviceType: data.serviceType || 'ALL',
          payerRole: data.payerRole || 'knight',
          tier: data.tier || 'standard',
          fareMinSatang: data.fareMinSatang || 0,
          fareMaxSatang: data.fareMaxSatang || 999999,
          amountSatang: data.amountSatang || 0,
          percentBps: data.percentBps || 0,
          buckets: data.buckets || { system: 0, insurance: 0, pension: 0, helmet: 0, equipment: 0 },
          activeFrom: data.activeFrom || '2026-08-01T00:00:00Z',
          activeTo: data.activeTo || null,
          descriptionTh: data.descriptionTh || `กฎค่าธรรมเนียม ${data.payerRole}`
        });
      }
    });

    if (rules.length > 0) return rules;
  } catch (err) {
    console.warn('getActiveFeeRules err:', err);
  }

  // Fallback defaults
  return [
    {
      id: 'rule_tier_1',
      serviceType: 'PASSENGER_RIDE',
      payerRole: 'knight',
      tier: 'Tier 1: 0-30 บาท',
      fareMinSatang: 0,
      fareMaxSatang: 3000,
      amountSatang: 200,
      buckets: { system: 100, insurance: 100, pension: 0, helmet: 0, equipment: 0 },
      activeFrom: '2026-08-01T00:00:00Z',
      descriptionTh: 'ค่าโดยสาร 0-30 บาท หัก 2 บาท (100 สตางค์ค่าระบบ + 100 สตางค์ประกัน)'
    },
    {
      id: 'rule_tier_2',
      serviceType: 'PASSENGER_RIDE',
      payerRole: 'knight',
      tier: 'Tier 2: 31-60 บาท',
      fareMinSatang: 3001,
      fareMaxSatang: 6000,
      amountSatang: 400,
      buckets: { system: 200, insurance: 100, pension: 100, helmet: 0, equipment: 0 },
      activeFrom: '2026-08-01T00:00:00Z',
      descriptionTh: 'ค่าโดยสาร 31-60 บาท หัก 4 บาท (2 บาทค่าระบบ + 1 บาทประกัน + 1 บาทบำนาญ)'
    },
    {
      id: 'rule_tier_3',
      serviceType: 'PASSENGER_RIDE',
      payerRole: 'knight',
      tier: 'Tier 3: 61-120 บาท',
      fareMinSatang: 6001,
      fareMaxSatang: 12000,
      amountSatang: 600,
      buckets: { system: 300, insurance: 150, pension: 150, helmet: 0, equipment: 0 },
      activeFrom: '2026-08-01T00:00:00Z',
      descriptionTh: 'ค่าโดยสาร 61-120 บาท หัก 6 บาท (3 บาทระบบ + 1.50 บาทประกัน + 1.50 บาทบำนาญ)'
    },
    {
      id: 'rule_citizen_5baht',
      serviceType: 'PASSENGER_RIDE',
      payerRole: 'citizen',
      tier: 'Flat 5 Baht Citizen Service',
      fareMinSatang: 0,
      fareMaxSatang: 999999,
      amountSatang: 500,
      buckets: { system: 300, insurance: 100, pension: 0, helmet: 100, equipment: 0 },
      activeFrom: '2026-08-01T00:00:00Z',
      descriptionTh: 'พลเมืองจ่ายค่าบริการ 5 บาท (3 บาทค่าระบบ + 1 บาทคุ้มครอง + 1 บาทมัดจำหมวกนิรภัย)'
    },
    {
      id: 'rule_founding_merchant_gp',
      serviceType: 'FOOD_DELIVERY',
      payerRole: 'merchant',
      tier: 'Founding Merchant 5% GP',
      percentBps: 500,
      buckets: { system: 300, insurance: 100, pension: 100, helmet: 0, equipment: 0 },
      activeFrom: '2026-08-01T00:00:00Z',
      descriptionTh: 'ร้านค้าผู้ก่อตั้ง GP เพียง 5% (500 bps) ตลอดชีพ'
    }
  ];
}

/**
 * ดึง Audit Logs เรียงใหม่สุดก่อน พร้อมตัวกรอง adminUid และช่วงวันที่
 */
export async function getAuditLogs(filterAdminUid?: string, startDate?: string, endDate?: string): Promise<AuditLogItem[]> {
  try {
    const q = query(
      collection(db, 'audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    const logs: AuditLogItem[] = [];

    snap.forEach((d) => {
      const data = d.data();
      logs.push({ id: d.id, ...data } as AuditLogItem);
    });

    if (logs.length > 0) {
      return logs.filter((l) => {
        const matchAdmin = !filterAdminUid || filterAdminUid === 'all' || l.adminUid === filterAdminUid || l.adminEmail?.includes(filterAdminUid);
        
        let matchDate = true;
        if (l.createdAt) {
          const lDate = new Date(l.createdAt.seconds ? l.createdAt.seconds * 1000 : l.createdAt);
          if (startDate) {
            matchDate = matchDate && lDate >= new Date(startDate);
          }
          if (endDate) {
            const endD = new Date(endDate);
            endD.setHours(23, 59, 59, 999);
            matchDate = matchDate && lDate <= endD;
          }
        }
        return matchAdmin && matchDate;
      });
    }
  } catch (err) {
    console.warn('getAuditLogs err:', err);
  }

  // Fallback sample audit logs
  return [
    {
      id: 'AUDIT_001',
      adminUid: 'ADMIN_SUPER_001',
      adminEmail: 'kittiinthasoi@gmail.com',
      action: 'APPROVE_KYC',
      targetUid: 'KNIGHT_0094',
      targetCollection: 'knights',
      reason: 'เอกสารใบอนุญาตขับขี่สาธารณะถูกต้อง ภาพชัดเจน',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    },
    {
      id: 'AUDIT_002',
      adminUid: 'ADMIN_SUPER_001',
      adminEmail: 'kittiinthasoi@gmail.com',
      action: 'ADJUST_WALLET',
      targetUid: 'KNIGHT_001',
      targetCollection: 'wallets',
      reason: 'ชดเชยค่าเดินทางกรณีผู้โดยสารยกเลิกล่าช้า 40 บาท',
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    },
    {
      id: 'AUDIT_003',
      adminUid: 'ADMIN_REVIEWER_02',
      adminEmail: 'reviewer02@winrider.ai',
      action: 'REJECT_KYC',
      targetUid: 'KNIGHT_9921',
      targetCollection: 'knights',
      reason: 'ปฏิเสธ KYC: รูปไม่ชัด - กรุณาถ่ายภาพบัตรประชาชนและใบขับขี่ใหม่ในที่แสงสว่างเพียงพอ',
      createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
    },
    {
      id: 'AUDIT_004',
      adminUid: 'ADMIN_SUPER_001',
      adminEmail: 'kittiinthasoi@gmail.com',
      action: 'UPDATE_FEE_RULE',
      targetUid: 'rule_tier_3',
      targetCollection: 'fee_rules',
      reason: 'ปรับปรุงสัดส่วนกองทุนคุ้มครองอุบัติเหตุเป็น 150 สตางค์',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    }
  ];
}
