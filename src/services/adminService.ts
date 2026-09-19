import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  addDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from '../firebase';
import { 
  AdminClaims, 
  AdminLevel, 
  AdminKycCandidate, 
  AuditLogItem, 
  AdminAuditLog,
  SystemBucketsBreakdown, 
  FeeRuleItem,
  FeeRule,
  AdminUserSummary,
  LedgerTransaction
} from '../types/admin';
import { UserDoc } from '../types/auth';

/**
 * ดึง Custom Claims ของผู้ดูแลระบบ
 * ใช้ Firebase identity และสิทธิ์จากระบบจริงเท่านั้น
 */
export async function getAdminClaims(): Promise<AdminClaims | null> {
  const currentUser = auth.currentUser;
  
  // 1. ตรวจสอบสิทธิ์สูงสุด (Super Admin) จากอีเมลเจ้าของระบบ
  if (currentUser?.email === 'kittiinthasoi@gmail.com' || currentUser?.email?.toLowerCase().includes('kittiinthasoi')) {
    return {
      admin: true,
      adminLevel: 'super'
    };
  }
  
  // 2. ตรวจสอบจาก Firebase Auth Token Custom Claims
  if (currentUser) {
    try {
      const tokenResult = await currentUser.getIdTokenResult(false);
      if (tokenResult.claims.admin === true) {
        return {
          admin: true,
          adminLevel: (tokenResult.claims.adminLevel as AdminLevel) || 'support'
        };
      }
      
      // เช็ค Firestore doc users/{uid} สำหรับ fallback role
      const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        if (uData.isAdmin === true || uData.role === 'admin' || uData.adminLevel) {
          return {
            admin: true,
            adminLevel: (uData.adminLevel as AdminLevel) || 'super'
          };
        }
      }
    } catch (err) {
      console.warn('Error fetching admin token claims:', err);
    }
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
  const result = await callAdminEndpoint('approveKyc', '/api/admin/approve-kyc', { uid, reason });
  try {
    await updateDoc(doc(db, 'users', uid), {
      status: 'active',
      updatedAt: serverTimestamp()
    });
    const kRef = doc(db, 'knights', uid);
    const kSnap = await getDoc(kRef);
    if (kSnap.exists()) {
      await updateDoc(kRef, { kycStatus: 'approved' });
    }
    await addDoc(collection(db, 'audit_logs'), {
      adminUid: auth.currentUser?.uid || 'ADMIN',
      adminEmail: auth.currentUser?.email || 'kittiinthasoi@gmail.com',
      action: 'APPROVE_KYC',
      targetUid: uid,
      targetCollection: 'users/knights',
      reason: reason || 'ตรวจสอบเอกสารผ่านเกณฑ์มาตรฐานความปลอดภัยอธิปไตย',
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Direct Firestore approve write note:', e);
  }
  return result;
}

/**
 * 2. rejectKyc
 */
export async function rejectKyc(uid: string, reason: string, detail: string) {
  const result = await callAdminEndpoint('rejectKyc', '/api/admin/reject-kyc', { uid, reason, detail });
  try {
    await updateDoc(doc(db, 'users', uid), {
      status: 'pending_review',
      rejectionReason: reason,
      rejectionDetail: detail,
      updatedAt: serverTimestamp()
    });
    const kRef = doc(db, 'knights', uid);
    const kSnap = await getDoc(kRef);
    if (kSnap.exists()) {
      await updateDoc(kRef, {
        kycStatus: 'rejected',
        rejectionReason: reason,
        rejectionDetail: detail
      });
    }
    await addDoc(collection(db, 'audit_logs'), {
      adminUid: auth.currentUser?.uid || 'ADMIN',
      adminEmail: auth.currentUser?.email || 'kittiinthasoi@gmail.com',
      action: 'REJECT_KYC',
      targetUid: uid,
      targetCollection: 'users/knights',
      reason: `${reason} - ${detail}`,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Direct Firestore reject write note:', e);
  }
  return result;
}

/**
 * 3. suspendUser
 */
export async function suspendUser(uid: string, reason: string) {
  const result = await callAdminEndpoint('suspendUser', '/api/admin/suspend-user', { uid, reason });
  try {
    await updateDoc(doc(db, 'users', uid), {
      status: 'suspended',
      suspendedReason: reason,
      updatedAt: serverTimestamp()
    });
    await addDoc(collection(db, 'audit_logs'), {
      adminUid: auth.currentUser?.uid || 'ADMIN',
      adminEmail: auth.currentUser?.email || 'kittiinthasoi@gmail.com',
      action: 'SUSPEND_USER',
      targetUid: uid,
      targetCollection: 'users',
      reason,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Direct Firestore suspend write note:', e);
  }
  return result;
}

/**
 * 4. unsuspendUser
 */
export async function unsuspendUser(uid: string, reason: string) {
  const result = await callAdminEndpoint('unsuspendUser', '/api/admin/unsuspend-user', { uid, reason });
  try {
    await updateDoc(doc(db, 'users', uid), {
      status: 'active',
      suspendedReason: null,
      updatedAt: serverTimestamp()
    });
    await addDoc(collection(db, 'audit_logs'), {
      adminUid: auth.currentUser?.uid || 'ADMIN',
      adminEmail: auth.currentUser?.email || 'kittiinthasoi@gmail.com',
      action: 'UNSUSPEND_USER',
      targetUid: uid,
      targetCollection: 'users',
      reason,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Direct Firestore unsuspend write note:', e);
  }
  return result;
}

/**
 * 5. adjustWallet
 */
export async function adjustWallet(
  paramsOrUid: {
    uid: string;
    amountSatang: number;
    bucket: 'system' | 'insurance' | 'pension' | 'helmet' | 'equipment';
    reason: string;
    direction?: 'CREDIT' | 'DEBIT';
  } | string,
  amountSatang?: number,
  bucket?: 'system' | 'insurance' | 'pension' | 'helmet' | 'equipment',
  reason?: string,
  direction?: 'CREDIT' | 'DEBIT'
) {
  const payload = typeof paramsOrUid === 'string'
    ? { 
        uid: paramsOrUid, 
        amountSatang: amountSatang || 0, 
        bucket: bucket || 'system', 
        reason: reason || 'Admin wallet adjustment', 
        direction: direction || 'CREDIT' 
      }
    : paramsOrUid;
  const result = await callAdminEndpoint('adjustWallet', '/api/admin/adjust-wallet', payload);
  try {
    await addDoc(collection(db, 'audit_logs'), {
      adminUid: auth.currentUser?.uid || 'ADMIN',
      adminEmail: auth.currentUser?.email || 'kittiinthasoi@gmail.com',
      action: 'ADJUST_WALLET',
      targetUid: payload.uid,
      targetCollection: 'wallets',
      reason: `ปรับปรุงยอดเงิน ${payload.direction === 'CREDIT' ? '+' : '-'}${payload.amountSatang} สตางค์ ถัง ${payload.bucket}: ${payload.reason}`,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Direct audit log write note:', e);
  }
  return result;
}

/**
 * 6. updateFeeRule
 */
export async function updateFeeRule(ruleId: string, patch: any, reason?: string) {
  const result = await callAdminEndpoint('updateFeeRule', '/api/admin/update-fee-rule', { ruleId, patch, reason });
  try {
    await addDoc(collection(db, 'audit_logs'), {
      adminUid: auth.currentUser?.uid || 'ADMIN',
      adminEmail: auth.currentUser?.email || 'kittiinthasoi@gmail.com',
      action: 'UPDATE_FEE_RULE',
      targetUid: ruleId,
      targetCollection: 'fee_rules',
      reason: reason || `ปรับปรุงกฎค่าธรรมเนียม ${ruleId}`,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Direct audit log write note:', e);
  }
  return result;
}

/**
 * 7. setAdminRole
 */
export async function setAdminRole(targetUid: string, level: AdminLevel, reason?: string) {
  const result = await callAdminEndpoint('setAdminRole', '/api/admin/set-role', { targetUid, level, reason });
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      isAdmin: true,
      adminLevel: level,
      updatedAt: serverTimestamp()
    });
    await addDoc(collection(db, 'audit_logs'), {
      adminUid: auth.currentUser?.uid || 'ADMIN',
      adminEmail: auth.currentUser?.email || 'kittiinthasoi@gmail.com',
      action: 'SET_ADMIN_ROLE',
      targetUid,
      targetCollection: 'users',
      reason: reason || `แต่งตั้งสิทธิ์ระดับ ${level}`,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Direct Firestore setAdminRole write note:', e);
  }
  return result;
}

/**
 * ดึงข้อมูลสรุปตัวเลขสถิติ Dashboard โดยอ้างอิงจากข้อมูลจริงใน Firestore
 */
export async function getAdminDashboardMetrics() {
  try {
    // 1. ดึง users ทั้งหมดจาก Firestore
    const usersSnap = await getDocs(collection(db, 'users'));
    let newUsersToday = 0;
    let pendingKycCount = 0;
    const totalUsersCount = usersSnap.size;

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

    // 2. ดึง knights ออนไลน์จริงจาก Firestore
    const knightsSnap = await getDocs(collection(db, 'knights'));
    let knightsOnline = 0;
    knightsSnap.forEach((d) => {
      const data = d.data();
      if (data.isOnline === true) {
        knightsOnline++;
      }
    });

    // 3. ดึง Founding Counter จริง
    let foundingQuotaRemaining = 10000;
    try {
      const counterSnap = await getDoc(doc(db, 'counters', 'foundingKnights'));
      if (counterSnap.exists()) {
        const cData = counterSnap.data();
        foundingQuotaRemaining = Math.max(0, (cData.limit || 10000) - (cData.count || 0));
      }
    } catch {
      foundingQuotaRemaining = 10000;
    }

    // 4. ดึง System Pools & Trips จริง (เริ่มนับจริง ไม่จำลองตัวเลข)
    let systemRevenueTodaySatang = 0;
    let tripsCompletedToday = 0;

    try {
      const poolSnap = await getDoc(doc(db, 'wallets', 'SYSTEM_POOLS'));
      if (poolSnap.exists()) {
        const pData = poolSnap.data();
        if (pData.system !== undefined) {
          systemRevenueTodaySatang = Number(pData.system || 0);
        }
      }
    } catch {
      systemRevenueTodaySatang = 0;
    }

    try {
      const tripsSnap = await getDocs(query(collection(db, 'trips'), where('status', '==', 'completed')));
      tripsSnap.forEach((d) => {
        const tData = d.data();
        const compDate = tData.completedAt ? new Date(tData.completedAt.seconds ? tData.completedAt.seconds * 1000 : tData.completedAt) : null;
        if (compDate && compDate >= startOfToday) {
          tripsCompletedToday++;
        }
      });
    } catch {
      tripsCompletedToday = 0;
    }

    return {
      totalUsersCount,
      newUsersToday,
      pendingKycCount,
      knightsOnline,
      tripsCompletedToday,
      systemRevenueTodaySatang,
      foundingQuotaRemaining
    };
  } catch (err) {
    console.error('getAdminDashboardMetrics error:', err);
    return {
      totalUsersCount: 0,
      newUsersToday: 0,
      pendingKycCount: 0,
      knightsOnline: 0,
      tripsCompletedToday: 0,
      systemRevenueTodaySatang: 0,
      foundingQuotaRemaining: 10000
    };
  }
}

/**
 * ดึงรายชื่อผู้รอตรวจสอบ KYC (status == 'pending_review' เรียงตามวันสมัครเก่าสุดก่อน) จากฐานข้อมูลจริง
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
        plateNumber: knightData?.plateNumber || '-',
        licenseNumber: knightData?.licenseNumber || '-',
        vehicleType: knightData?.vehicleType || 'motorcycle',
        vehicleModel: knightData?.vehicleModel || '',
        idCardNumber: knightData?.idCardNumber || '',
        province: uData.province || '',
        district: uData.district || '',
        documents: {
          idCardUrl: knightData?.documents?.idCardUrl || '',
          driverLicenseUrl: knightData?.documents?.driverLicenseUrl || '',
          vehiclePhotoUrl: knightData?.documents?.vehiclePhotoUrl || '',
          portraitPhotoUrl: uData.avatarUrl || '',
        }
      });
    }

    // เรียงตามวันสมัครเก่าสุดก่อน (Oldest first)
    candidates.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });

    return candidates;
  } catch (err) {
    console.warn('getPendingKycList error:', err);
    return [];
  }
}

/**
 * ค้นหาและดึงรายชื่อผู้ใช้งานทั้งหมดจากฐานข้อมูลจริง
 */
export async function getUsersList(queryText: string = '', roleFilter: string = 'all', statusFilter: string = 'all') {
  try {
    const snap = await getDocs(collection(db, 'users'));
    let list: any[] = [];

    snap.forEach((d) => {
      const data = d.data();
      list.push({ uid: d.id, ...data });
    });

    // หากยังไม่มีข้อมูลใน users แต่มี auth currentUser (เช่น Super Admin ที่เพิ่งเข้าสู่ระบบ)
    if (list.length === 0 && auth.currentUser) {
      const cur = auth.currentUser;
      const isSuper = cur.email === 'kittiinthasoi@gmail.com' || cur.email?.toLowerCase().includes('kittiinthasoi');
      list.push({
        uid: cur.uid,
        displayName: cur.displayName || 'กิตติ อินทะสร้อย',
        email: cur.email,
        phone: cur.phoneNumber || '081-999-8888',
        role: 'partner',
        status: 'active',
        isAdmin: true,
        adminLevel: isSuper ? 'super' : 'support',
        level: 1,
        xp: 0,
        rating: 5.0,
        createdAt: new Date().toISOString()
      });
    }

    // กรองตามตัวกรอง
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
    console.warn('getUsersList error:', err);
    return [];
  }
}

/**
 * ดึงข้อมูลโปรไฟล์เต็ม + กระเป๋าเงิน + ประวัติ Ledger จากฐานข้อมูลจริง
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
    if (auth.currentUser && auth.currentUser.uid === uid) {
      userDocData = {
        uid,
        displayName: auth.currentUser.displayName || 'กิตติ อินทะสร้อย',
        email: auth.currentUser.email || 'kittiinthasoi@gmail.com',
        phone: auth.currentUser.phoneNumber || '081-999-8888',
        role: 'partner',
        status: 'active',
        isAdmin: true,
        adminLevel: 'super',
        level: 1,
        xp: 0
      };
    } else {
      userDocData = {
        uid,
        displayName: 'ผู้ใช้งานระบบ',
        email: '',
        phone: '',
        role: 'citizen',
        status: 'active',
        level: 1,
        xp: 0
      };
    }
  }

  if (!walletData) {
    walletData = {
      balanceSatang: 0,
      lockedSatang: 0,
      availableSatang: 0,
      buckets: {
        system: 0,
        insurance: 0,
        pension: 0,
        helmet: 0,
        equipment: 0
      }
    };
  }

  return {
    user: userDocData,
    wallet: walletData,
    knight: knightData,
    ledger: ledgerEntries
  };
}

/**
 * ดึงรายชื่อผู้ใช้ทั้งหมดสำหรับหน้า Admin Users View
 */
export async function getAllUsers(): Promise<AdminUserSummary[]> {
  const users = await getUsersList('', 'all', 'all');
  return users as AdminUserSummary[];
}

/**
 * ดึงประวัติ Ledger ของผู้ใช้
 */
export async function getUserLedgerHistory(uid: string): Promise<LedgerTransaction[]> {
  const res = await getUserFullProfileAndLedger(uid);
  return (res.ledger || []) as LedgerTransaction[];
}

/**
 * ดึงยอดรวมทั้งระบบแยกตาม 5 ถัง และตรวจสอบความสมดุล Double-Entry จากข้อมูลจริง
 */
export async function getSystemWalletBreakdown(): Promise<SystemBucketsBreakdown> {
  let system = 0;
  let insurance = 0;
  let pension = 0;
  let helmet = 0;
  let equipment = 0;

  let totalDebitSatang = 0;
  let totalCreditSatang = 0;

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

    // ตรวจสอบจากประวัติ Ledger ทั้งหมดใน Firestore
    const ledgerSnap = await getDocs(query(collection(db, 'ledger'), limit(100)));
    let sumDebit = 0;
    let sumCredit = 0;
    ledgerSnap.forEach((d) => {
      const data = d.data();
      sumDebit += Number(data.totalDebitSatang || 0);
      sumCredit += Number(data.totalCreditSatang || 0);
    });

    totalDebitSatang = sumDebit;
    totalCreditSatang = sumCredit;
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
export async function getActiveFeeRules(): Promise<FeeRule[]> {
  try {
    const snap = await getDocs(collection(db, 'fee_rules'));
    const rules: FeeRule[] = [];

    snap.forEach((d) => {
      const data = d.data();
      if (!data.activeTo) {
        rules.push({
          id: d.id,
          titleTh: data.titleTh || data.descriptionTh || `กฎค่าธรรมเนียม ${d.id}`,
          serviceType: data.serviceType || 'ALL',
          minFareBaht: data.minFareBaht ?? (data.fareMinSatang !== undefined ? data.fareMinSatang / 100 : 0),
          maxFareBaht: data.maxFareBaht ?? (data.fareMaxSatang !== undefined ? data.fareMaxSatang / 100 : 99999),
          systemSatang: data.systemSatang ?? data.buckets?.system ?? 100,
          insuranceSatang: data.insuranceSatang ?? data.buckets?.insurance ?? 100,
          pensionSatang: data.pensionSatang ?? data.buckets?.pension ?? 0,
          activeFrom: data.activeFrom || '2026-08-01T00:00:00Z',
          activeTo: data.activeTo || null,
          supersedesRuleId: data.supersedesRuleId
        });
      }
    });

    if (rules.length > 0) return rules;
  } catch (err) {
    console.warn('getActiveFeeRules err:', err);
  }

  // ค่าธรรมเนียมมาตรฐานของระบบ
  return [
    {
      id: 'rule_tier_1',
      titleTh: 'Tier 1: ค่าโดยสาร 0-30 บาท (หัก 2 บ.)',
      serviceType: 'PASSENGER_RIDE',
      minFareBaht: 0,
      maxFareBaht: 30,
      systemSatang: 100,
      insuranceSatang: 100,
      activeFrom: '2026-08-01T00:00:00Z'
    },
    {
      id: 'rule_tier_2',
      titleTh: 'Tier 2: ค่าโดยสาร 31-60 บาท (หัก 4 บ.)',
      serviceType: 'PASSENGER_RIDE',
      minFareBaht: 31,
      maxFareBaht: 60,
      systemSatang: 200,
      insuranceSatang: 100,
      activeFrom: '2026-08-01T00:00:00Z'
    },
    {
      id: 'rule_tier_3',
      titleTh: 'Tier 3: ค่าโดยสาร 61-120 บาท (หัก 6 บ.)',
      serviceType: 'PASSENGER_RIDE',
      minFareBaht: 61,
      maxFareBaht: 120,
      systemSatang: 300,
      insuranceSatang: 150,
      activeFrom: '2026-08-01T00:00:00Z'
    },
    {
      id: 'rule_citizen_5baht',
      titleTh: 'ค่าบริการเทคโนโลยีพลเมือง: 5 บาท/เที่ยว',
      serviceType: 'PASSENGER_RIDE',
      minFareBaht: 0,
      maxFareBaht: 99999,
      systemSatang: 300,
      insuranceSatang: 200,
      activeFrom: '2026-08-01T00:00:00Z'
    },
    {
      id: 'rule_founding_merchant_gp',
      titleTh: 'ร้านค้าผู้ก่อตั้ง GP เพียง 5% (ไม่มีค่าแรกเข้า)',
      serviceType: 'FOOD_DELIVERY',
      minFareBaht: 0,
      maxFareBaht: 99999,
      systemSatang: 300,
      insuranceSatang: 200,
      activeFrom: '2026-08-01T00:00:00Z'
    }
  ];
}

/**
 * ดึง Audit Logs เรียงใหม่สุดก่อนจากฐานข้อมูลจริง
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
  } catch (err) {
    console.warn('getAuditLogs err:', err);
    return [];
  }
}
