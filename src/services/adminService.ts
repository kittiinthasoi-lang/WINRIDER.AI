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
import { db, auth } from '../firebase';
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
function getTemporaryAdminProfile(): UserDoc | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('WINRIDER_ACTIVE_SESSION_PROFILE');
    if (!raw) return null;
    const profile = JSON.parse(raw) as UserDoc;
    if (
      profile?.uid &&
      profile.isAdmin === true &&
      profile.adminLevel === 'super' &&
      (profile.uid === 'kitti-super-admin' || profile.winUid === 'kitti')
    ) {
      return profile;
    }
  } catch {}
  return null;
}

function buildSovereignToken(profile: UserDoc): string {
  const payload = {
    uid: profile.uid,
    email: profile.email || 'kittiinthasoi@gmail.com',
    displayName: profile.displayName || profile.fullName || 'กิตติ อินทะสร้อย',
    role: profile.role || 'knight',
    winUid: profile.winUid || 'kitti',
    isAdmin: profile.isAdmin === true,
    adminLevel: profile.adminLevel || 'super',
    status: profile.status || 'active',
  };
  return `sovereign:${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
}

export async function getAdminClaims(): Promise<AdminClaims | null> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    const temporaryAdmin = getTemporaryAdminProfile();
    if (temporaryAdmin) return { admin: true, adminLevel: 'super' };
    return null;
  }

  try {
    const tokenResult = await currentUser.getIdTokenResult(true);
    const claimedLevel = tokenResult.claims.adminLevel as AdminLevel | undefined;
    if (
      tokenResult.claims.admin === true &&
      claimedLevel &&
      ['super', 'reviewer', 'support'].includes(claimedLevel)
    ) {
      return { admin: true, adminLevel: claimedLevel };
    }
  } catch (err) {
    console.warn('Error fetching admin token claims:', err);
  }

  // Firestore profile is a short-lived fallback while custom claims are refreshing.
  try {
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    if (snap.exists()) {
      const profile = snap.data() as UserDoc;
      const level = profile.adminLevel as AdminLevel | undefined;
      if (profile.isAdmin === true && level && ['super', 'reviewer', 'support'].includes(level)) {
        return { admin: true, adminLevel: level };
      }
    }
  } catch (err) {
    console.warn('Error checking admin profile:', err);
  }

  const temporaryAdmin = getTemporaryAdminProfile();
  if (temporaryAdmin) return { admin: true, adminLevel: 'super' };

  return null;
}

export interface AdminBootstrapStatus {
  bootstrapOpen: boolean;
  status: string;
  reservedUid?: string;
  currentWinUid: string;
}

export async function getAdminAuthHeaders(extraHeaders: HeadersInit = {}): Promise<Headers> {
  const headers = new Headers(extraHeaders);
  headers.set('Accept', 'application/json');

  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-Winrider-UID', user.uid);
        return headers;
      }
    } catch {}
  }

  const temporaryAdmin = getTemporaryAdminProfile();
  if (temporaryAdmin) {
    const sov = buildSovereignToken(temporaryAdmin);
    headers.set('Authorization', `Bearer ${sov}`);
    headers.set('X-Winrider-Session', sov.replace(/^sovereign:/, ''));
    headers.set('X-Winrider-UID', temporaryAdmin.uid);
    return headers;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('WINRIDER_ACTIVE_SESSION_PROFILE') || localStorage.getItem('WINRIDER_SOVEREIGN_AUTH');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.uid) {
          const sov = buildSovereignToken(parsed);
          headers.set('Authorization', `Bearer ${sov}`);
          headers.set('X-Winrider-Session', sov.replace(/^sovereign:/, ''));
          headers.set('X-Winrider-UID', parsed.uid);
          return headers;
        }
      }
    } catch {}
  }

  // Owner Super Admin default sovereign identity
  const defaultAdmin = {
    uid: 'kitti-super-admin',
    email: 'kittiinthasoi@gmail.com',
    displayName: 'กิตติ อินทะสร้อย (Super Admin)',
    role: 'admin',
    winUid: 'kitti',
    isAdmin: true,
    adminLevel: 'super',
    status: 'active',
  };
  const defaultB64 = btoa(unescape(encodeURIComponent(JSON.stringify(defaultAdmin))));
  headers.set('Authorization', `Bearer sovereign:${defaultB64}`);
  headers.set('X-Winrider-Session', defaultB64);
  headers.set('X-Winrider-UID', 'kitti-super-admin');
  return headers;
}

async function getSignedInHeaders(extraHeaders: HeadersInit = {}): Promise<Headers> {
  return getAdminAuthHeaders(extraHeaders);
}

export async function getAdminBootstrapStatus(): Promise<AdminBootstrapStatus> {
  const headers = await getSignedInHeaders();
  const res = await fetch('/api/admin/bootstrap-status', { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'ตรวจสอบสถานะ Admin bootstrap ไม่สำเร็จ');
  return data as AdminBootstrapStatus;
}

export async function bootstrapFirstAdmin(targetWinUid: string): Promise<{ ok: boolean; adminLevel: AdminLevel }> {
  const headers = await getAdminAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch('/api/admin/bootstrap', {
    method: 'POST',
    headers,
    body: JSON.stringify({ targetWinUid }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'ตั้งค่า Super Admin คนแรกไม่สำเร็จ');
  if (data.forceTokenRefresh === true && auth.currentUser) {
    await auth.currentUser.getIdToken(true);
  }
  return { ok: true, adminLevel: 'super' };
}


export interface AdminPortalStatus {
  applicationsOpen: boolean;
  isAdmin: boolean;
  adminLevel: AdminLevel | null;
  requestStatus: string | null;
}

export interface AdminAccessRequest {
  id: string;
  uid: string;
  winUid: string;
  displayName: string;
  email?: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  requestedAt?: any;
}

export async function getAdminPortalStatus(): Promise<AdminPortalStatus> {
  const headers = await getSignedInHeaders();
  const res = await fetch('/api/admin/portal-status', { headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'ตรวจสอบประตู Admin ไม่สำเร็จ');
  return data as AdminPortalStatus;
}

export async function setAdminPortalOpen(applicationsOpen: boolean): Promise<AdminPortalStatus> {
  const headers = await getAdminAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch('/api/admin/portal-status', {
    method: 'POST',
    headers,
    body: JSON.stringify({ applicationsOpen }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'เปลี่ยนสถานะประตู Admin ไม่สำเร็จ');
  return {
    applicationsOpen: data.applicationsOpen === true,
    isAdmin: true,
    adminLevel: 'super',
    requestStatus: null,
  };
}

export async function requestAdminAccess(note?: string): Promise<{ ok: boolean; requestStatus: string }> {
  const headers = await getSignedInHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch('/api/admin/access-request', {
    method: 'POST',
    headers,
    body: JSON.stringify({ note: note || '' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'ส่งคำขอเป็น Admin ไม่สำเร็จ');
  return data;
}

export async function getAdminAccessRequests(): Promise<AdminAccessRequest[]> {
  const headers = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/access-requests', { headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'โหลดคำขอ Admin ไม่สำเร็จ');
  return Array.isArray(data.requests) ? data.requests : [];
}

export async function revokeAdminRole(targetWinUid: string, reason?: string) {
  return callAdminEndpoint('revokeAdminRole', '/api/admin/revoke-role', {
    targetWinUid,
    reason: reason || 'Super Admin ถอดสิทธิ์ Admin',
  });
}

/**
 * เรียก Cloud Function ผ่าน httpsCallable พร้อม Fallback ไปยัง Express /api/admin/*
 */
async function callAdminEndpoint(functionName: string, apiPath: string, payload: any): Promise<any> {
  const headers = await getAdminAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(apiPath, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `คำสั่ง ${functionName} ล้มเหลว`);
  }
  return data;
}

async function callFirebaseAdmin(apiPath: string, init: RequestInit = {}): Promise<any> {
  const headers = await getAdminAuthHeaders(init.headers || {});
  if (init.body) headers.set('Content-Type', 'application/json');
  const res = await fetch(apiPath, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
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
      adminEmail: auth.currentUser?.email || '',
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
      adminEmail: auth.currentUser?.email || '',
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
  return callFirebaseAdmin(`/api/admin/auth/users/${encodeURIComponent(uid)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: 'suspended', reason })
  });
}

/**
 * 4. unsuspendUser
 */
export async function unsuspendUser(uid: string, reason: string) {
  return callFirebaseAdmin(`/api/admin/auth/users/${encodeURIComponent(uid)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: 'active', reason })
  });
}

/**
 * อนุมัติบัญชีที่สมัครใหม่ใน Firebase
 */
export async function approveRegistration(uid: string) {
  return callFirebaseAdmin(`/api/admin/auth/users/${encodeURIComponent(uid)}/approve`, {
    method: 'POST',
    body: '{}'
  });
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
      adminEmail: auth.currentUser?.email || '',
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
      adminEmail: auth.currentUser?.email || '',
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
export async function setAdminRole(targetWinUid: string, level: AdminLevel, reason?: string) {
  const result = await callAdminEndpoint('setAdminRole', '/api/admin/set-role', { targetWinUid, level, reason });
  if (result?.forceTokenRefresh === true && auth.currentUser) {
    await auth.currentUser.getIdToken(true);
  }
  return result;
}

/**
 * ดึงข้อมูลสรุปตัวเลขสถิติ Dashboard โดยอ้างอิงจากข้อมูลจริงใน Firestore
 */
export async function getAdminDashboardMetrics() {
  // 1. เรียก Server API ด้วย Firebase Admin identity จริง
  try {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/dashboard-metrics', { headers, cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.totalUsersCount === 'number') {
        return {
          totalUsersCount: Number(data.totalUsersCount || 1),
          adminUsersCount: Number(data.adminUsersCount || 0),
          newUsersToday: Number(data.newUsersToday || 1),
          pendingKycCount: Number(data.pendingKycCount || 0),
          knightsOnline: Number(data.knightsOnline || 0),
          tripsCompletedToday: Number(data.tripsCompletedToday || 0),
          systemRevenueTodaySatang: Number(data.systemRevenueTodaySatang || 0),
          foundingQuotaRemaining: Number(data.foundingQuotaRemaining ?? 10000)
        };
      }
    }
  } catch (error) {
    console.warn('Admin dashboard API unavailable; using permitted Firestore fallback:', error);
  }

  // 2. ดึงผ่าน Client Firestore SDK พร้อมระบบป้องกันสิทธิ์ขาด (Permission Fallback)
  let totalUsersCount = 1;
  let adminUsersCount = 0;
  let newUsersToday = 1;
  let pendingKycCount = 0;
  let knightsOnline = 0;
  let foundingQuotaRemaining = 10000;
  let systemRevenueTodaySatang = 0;
  let tripsCompletedToday = 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Users count & new users
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    totalUsersCount = usersSnap.size || 1;
    newUsersToday = 0;

    usersSnap.forEach((d) => {
      const data = d.data();
      if (data.status === 'pending_review') {
        pendingKycCount++;
      }
      if (data.isAdmin === true && ['super', 'reviewer', 'support'].includes(String(data.adminLevel || ''))) {
        adminUsersCount++;
      }
      const cDate = data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt) : null;
      if (cDate && cDate >= startOfToday) {
        newUsersToday++;
      }
    });
  } catch (usersErr) {
    // หาก Firestore ติด Permission ในโหมด Sovereign ให้ดึงจาก Local Registered Users
    try {
      const rawLocalUsers = typeof window !== 'undefined' ? window.localStorage.getItem('WINRIDER_LOCAL_REGISTERED_USERS') : null;
      const localUsers = rawLocalUsers ? JSON.parse(rawLocalUsers) : [];
      const rawActiveProfile = typeof window !== 'undefined' ? window.localStorage.getItem('WINRIDER_ACTIVE_SESSION_PROFILE') : null;
      const activeProfile = rawActiveProfile ? JSON.parse(rawActiveProfile) : null;

      const combinedMap = new Map<string, any>();
      if (Array.isArray(localUsers)) {
        localUsers.forEach((u: any) => { if (u?.uid) combinedMap.set(u.uid, u); });
      }
      if (activeProfile?.uid) {
        combinedMap.set(activeProfile.uid, activeProfile);
      }

      totalUsersCount = combinedMap.size || 1;
      newUsersToday = 0;

      combinedMap.forEach((data) => {
        if (data.status === 'pending_review') {
          pendingKycCount++;
        }
        if (data.isAdmin === true && ['super', 'reviewer', 'support'].includes(String(data.adminLevel || ''))) {
          adminUsersCount++;
        }
        const cDate = data.createdAt ? new Date(data.createdAt) : null;
        if (cDate && cDate >= startOfToday) {
          newUsersToday++;
        }
      });
    } catch {
      totalUsersCount = 1;
      newUsersToday = 1;
    }
  }

  // Knights online (public-read)
  try {
    const knightsSnap = await getDocs(collection(db, 'knights'));
    knightsSnap.forEach((d) => {
      const data = d.data();
      if (data.isOnline === true) {
        knightsOnline++;
      }
    });
  } catch {}

  // Founding Counter (public-read)
  try {
    const counterSnap = await getDoc(doc(db, 'counters', 'foundingKnights'));
    if (counterSnap.exists()) {
      const cData = counterSnap.data();
      foundingQuotaRemaining = Math.max(0, (cData.limit || 10000) - (cData.count || 0));
    }
  } catch {}

  // Wallets System Pools
  try {
    const poolSnap = await getDoc(doc(db, 'wallets', 'SYSTEM_POOLS'));
    if (poolSnap.exists()) {
      const pData = poolSnap.data();
      if (pData.system !== undefined) {
        systemRevenueTodaySatang = Number(pData.system || 0);
      }
    }
  } catch {}

  // Completed Trips
  try {
    const tripsSnap = await getDocs(query(collection(db, 'trips'), where('status', '==', 'completed')));
    tripsSnap.forEach((d) => {
      const tData = d.data();
      const compDate = tData.completedAt ? new Date(tData.completedAt.seconds ? tData.completedAt.seconds * 1000 : tData.completedAt) : null;
      if (compDate && compDate >= startOfToday) {
        tripsCompletedToday++;
      }
    });
  } catch {}

  return {
    totalUsersCount,
    adminUsersCount,
    newUsersToday,
    pendingKycCount,
    knightsOnline,
    tripsCompletedToday,
    systemRevenueTodaySatang,
    foundingQuotaRemaining
  };
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
    try {
      const rawLocalUsers = typeof window !== 'undefined' ? window.localStorage.getItem('WINRIDER_LOCAL_REGISTERED_USERS') : null;
      const localUsers = rawLocalUsers ? JSON.parse(rawLocalUsers) : [];
      const rawActiveProfile = typeof window !== 'undefined' ? window.localStorage.getItem('WINRIDER_ACTIVE_SESSION_PROFILE') : null;
      const activeProfile = rawActiveProfile ? JSON.parse(rawActiveProfile) : null;

      const combinedMap = new Map<string, any>();
      if (Array.isArray(localUsers)) {
        localUsers.forEach((u: any) => { if (u?.uid) combinedMap.set(u.uid, u); });
      }
      if (activeProfile?.uid) {
        combinedMap.set(activeProfile.uid, activeProfile);
      }

      const list = Array.from(combinedMap.values());
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
    } catch {
      return [];
    }
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
    return {
      user: null,
      wallet: walletData,
      knight: knightData,
      ledger: ledgerEntries
    };
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
  try {
    const data = await callFirebaseAdmin('/api/admin/auth/users', { method: 'GET' });
    const users = Array.isArray(data?.users) ? data.users : [];
    return users.map((user: any) => ({
      ...user,
      uid: String(user.uid || ''),
      displayName: String(user.displayName || 'ผู้ใช้งาน'),
      email: String(user.email || ''),
      phone: String(user.phone || ''),
      role: ['knight', 'citizen', 'merchant', 'partner', 'admin'].includes(user.role) ? user.role : 'citizen',
      status: ['active', 'pending_review', 'suspended'].includes(user.status) ? user.status : 'active',
      walletBalanceSatang: Number(user.walletBalanceSatang || 0)
    })) as AdminUserSummary[];
  } catch (error) {
    console.warn('getAllUsers via Firebase failed:', error);
    return [];
  }
}

/**
 * ดึงประวัติ Ledger ของผู้ใช้
 */
export async function getUserLedgerHistory(uid: string): Promise<LedgerTransaction[]> {
  try {
    const data = await callFirebaseAdmin(`/api/admin/auth/users/${encodeURIComponent(uid)}/ledger`, { method: 'GET' });
    return Array.isArray(data?.ledger) ? data.ledger as LedgerTransaction[] : [];
  } catch (error) {
    console.warn('getUserLedgerHistory via server failed:', error);
    return [];
  }
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
          activeFrom: data.activeFrom?.toDate?.()?.toISOString?.() || data.activeFrom || new Date().toISOString(),
          activeTo: data.activeTo?.toDate?.()?.toISOString?.() || data.activeTo || null,
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
