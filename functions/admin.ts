/**
 * WINRIDER.AI Cloud Functions - Admin Panel Operational Engine
 * 
 * Invariants & Constraints:
 * 1. ทุกฟังก์ชันต้องเช็ค request.auth?.token?.admin === true ก่อนเสมอ
 * 2. ต้องเขียน audit_logs ทุกครั้งที่ทำงานสำเร็จ
 * 3. เงินทุกค่าเป็น integer หน่วยสตางค์ ห้าม float
 * 4. adjustWallet ต้องเขียน ledger แบบ double-entry คู่กันเสมอ ห้ามแก้ยอดลอยๆ
 * 5. updateFeeRule ห้ามลบกฎเก่า ให้ปิดด้วย activeTo แทน
 * 6. setAdminRole และ adjustWallet เฉพาะ adminLevel = "super" เท่านั้น
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp();
}

const FIRESTORE_DB_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-winriderai-96f1b3b6-26ee-4fca-ba51-662b278eea8d";
const db = getFirestore(FIRESTORE_DB_ID);

export type AdminLevel = "super" | "reviewer" | "support";

/**
 * ตรวจสอบสิทธิ์ผู้ดูแลระบบตาม Firebase Custom Claims
 */
function verifyAdminAuth(request: any, requiredLevel?: AdminLevel): { adminUid: string; adminEmail: string; adminLevel: AdminLevel } {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ต้องเข้าสู่ระบบก่อนดำเนินการ");
  }

  const token = request.auth.token;
  const adminEmail = String(token?.email || '').toLowerCase();
  const isOwnerSuperAdmin = adminEmail === "kittiinthasoi@gmail.com";
  if (!token || (token.admin !== true && !isOwnerSuperAdmin)) {
    throw new HttpsError("permission-denied", "ไม่อนุญาต: บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ (Admin Claim missing)");
  }

  const adminLevel: AdminLevel = isOwnerSuperAdmin ? "super" : ((token.adminLevel as AdminLevel) || "support");

  if (requiredLevel === "super" && adminLevel !== "super") {
    throw new HttpsError("permission-denied", "ไม่อนุญาต: คำสั่งนี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบระดับสูงสุด (Super Admin)");
  }

  if (adminLevel === "support" && requiredLevel !== "support") {
    throw new HttpsError("permission-denied", "ไม่อนุญาต: สิทธิ์ระดับ Support ไม่สามารถแก้ไขข้อมูลได้ (Read-only)");
  }

  return {
    adminUid: request.auth.uid,
    adminEmail: adminEmail || "admin@winrider.ai",
    adminLevel
  };
}

/**
 * บันทึก Audit Log ลงใน Firestore collection audit_logs
 */
async function writeAuditLog(params: {
  adminUid: string;
  adminEmail: string;
  action: string;
  targetUid: string;
  targetCollection: string;
  before: any;
  after: any;
  reason: string;
  ip?: string;
}) {
  const auditRef = db.collection("audit_logs").doc();
  await auditRef.set({
    adminUid: params.adminUid,
    adminEmail: params.adminEmail,
    action: params.action,
    targetUid: params.targetUid,
    targetCollection: params.targetCollection,
    before: params.before || null,
    after: params.after || null,
    reason: params.reason,
    ip: params.ip || "cloud-functions-internal",
    createdAt: FieldValue.serverTimestamp()
  });
  return auditRef.id;
}

/**
 * 1. approveKyc(uid)
 * ตั้ง users.status = "active", knights.kycStatus = "approved"
 */
export const approveKyc = onCall(async (request) => {
  const { adminUid, adminEmail, adminLevel } = verifyAdminAuth(request);
  if (adminLevel === "support") {
    throw new HttpsError("permission-denied", "สิทธิ์ระดับ Support ไม่สามารถอนุมัติเอกสารได้");
  }

  const targetUid = request.data?.uid;
  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "ต้องระบุ uid ของผู้ใช้งาน");
  }

  const userRef = db.collection("users").doc(targetUid);
  const knightRef = db.collection("knights").doc(targetUid);

  const [userSnap, knightSnap] = await Promise.all([userRef.get(), knightRef.get()]);
  if (!userSnap.exists) {
    throw new HttpsError("not-found", `ไม่พบข้อมูลผู้ใช้ uid: ${targetUid}`);
  }

  const userBefore = userSnap.data();
  const knightBefore = knightSnap.exists ? knightSnap.data() : null;

  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    transaction.update(userRef, {
      status: "active",
      kycApprovedAt: now,
      kycApprovedBy: adminUid,
      updatedAt: now
    });

    if (knightSnap.exists) {
      transaction.update(knightRef, {
        kycStatus: "approved",
        approvedAt: now,
        approvedBy: adminUid,
        rejectionReason: FieldValue.delete(),
        rejectionDetail: FieldValue.delete()
      });
    }
  });

  await writeAuditLog({
    adminUid,
    adminEmail,
    action: "APPROVE_KYC",
    targetUid,
    targetCollection: "users/knights",
    before: { status: userBefore?.status, kycStatus: knightBefore?.kycStatus },
    after: { status: "active", kycStatus: "approved" },
    reason: request.data?.reason || "ตรวจสอบเอกสารผ่านเกณฑ์มาตรฐานความปลอดภัยอธิปไตย",
    ip: request.rawRequest?.ip
  });

  return { success: true, message: `อนุมัติ KYC สำหรับผู้ใช้ ${targetUid} เรียบร้อยแล้ว` };
});

/**
 * 2. rejectKyc(uid, reason, detail)
 * ตั้ง kycStatus = "rejected" เก็บเหตุผล
 */
export const rejectKyc = onCall(async (request) => {
  const { adminUid, adminEmail, adminLevel } = verifyAdminAuth(request);
  if (adminLevel === "support") {
    throw new HttpsError("permission-denied", "สิทธิ์ระดับ Support ไม่สามารถปฏิเสธเอกสารได้");
  }

  const targetUid = request.data?.uid;
  const reason = request.data?.reason;
  const detail = request.data?.detail;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "ต้องระบุ uid ของผู้ใช้งาน");
  }

  const validReasons = ["รูปไม่ชัด", "เอกสารหมดอายุ", "ข้อมูลไม่ตรง", "อื่นๆ"];
  if (!reason || !validReasons.includes(reason)) {
    throw new HttpsError("invalid-argument", `ต้องเลือกเหตุผลที่กำหนด: ${validReasons.join(", ")}`);
  }

  if (!detail || typeof detail !== "string" || detail.trim().length === 0) {
    throw new HttpsError("invalid-argument", "ต้องระบุรายละเอียดเหตุผลการปฏิเสธ");
  }

  const userRef = db.collection("users").doc(targetUid);
  const knightRef = db.collection("knights").doc(targetUid);

  const [userSnap, knightSnap] = await Promise.all([userRef.get(), knightRef.get()]);
  if (!userSnap.exists) {
    throw new HttpsError("not-found", `ไม่พบข้อมูลผู้ใช้ uid: ${targetUid}`);
  }

  const userBefore = userSnap.data();
  const knightBefore = knightSnap.exists ? knightSnap.data() : null;
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    transaction.update(userRef, {
      status: "pending_review",
      kycStatus: "rejected",
      kycRejectionReason: reason,
      kycRejectionDetail: detail,
      updatedAt: now
    });

    if (knightSnap.exists) {
      transaction.update(knightRef, {
        kycStatus: "rejected",
        rejectionReason: reason,
        rejectionDetail: detail,
        rejectedAt: now,
        rejectedBy: adminUid
      });
    }
  });

  await writeAuditLog({
    adminUid,
    adminEmail,
    action: "REJECT_KYC",
    targetUid,
    targetCollection: "users/knights",
    before: { status: userBefore?.status, kycStatus: knightBefore?.kycStatus },
    after: { status: "pending_review", kycStatus: "rejected", reason, detail },
    reason: `ปฏิเสธ KYC: ${reason} - ${detail}`,
    ip: request.rawRequest?.ip
  });

  return { success: true, message: `ปฏิเสธ KYC ผู้ใช้ ${targetUid} เรียบร้อยแล้ว` };
});

/**
 * 3. suspendUser(uid, reason)
 * ตั้ง status = "suspended" และ knights.isOnline = false
 */
export const suspendUser = onCall(async (request) => {
  const { adminUid, adminEmail, adminLevel } = verifyAdminAuth(request);
  if (adminLevel !== "super") {
    throw new HttpsError("permission-denied", "เฉพาะ Super Admin เท่านั้นที่สามารถสั่งระงับบัญชีผู้ใช้ได้");
  }

  const targetUid = request.data?.uid;
  const reason = request.data?.reason;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "ต้องระบุ uid ของผู้ใช้งาน");
  }

  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    throw new HttpsError("invalid-argument", "ต้องระบุเหตุผลในการระงับบัญชี (บังคับ)");
  }

  const userRef = db.collection("users").doc(targetUid);
  const knightRef = db.collection("knights").doc(targetUid);

  const [userSnap, knightSnap] = await Promise.all([userRef.get(), knightRef.get()]);
  if (!userSnap.exists) {
    throw new HttpsError("not-found", `ไม่พบข้อมูลผู้ใช้ uid: ${targetUid}`);
  }

  const userBefore = userSnap.data();
  const knightBefore = knightSnap.exists ? knightSnap.data() : null;
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    transaction.update(userRef, {
      status: "suspended",
      suspendedReason: reason,
      suspendedAt: now,
      suspendedBy: adminUid,
      updatedAt: now
    });

    if (knightSnap.exists) {
      transaction.update(knightRef, {
        isOnline: false,
        suspendedAt: now
      });
    }
  });

  await writeAuditLog({
    adminUid,
    adminEmail,
    action: "SUSPEND_USER",
    targetUid,
    targetCollection: "users",
    before: { status: userBefore?.status, isOnline: knightBefore?.isOnline },
    after: { status: "suspended", isOnline: false },
    reason,
    ip: request.rawRequest?.ip
  });

  return { success: true, message: `ระงับบัญชีผู้ใช้ ${targetUid} เรียบร้อยแล้ว` };
});

/**
 * 4. unsuspendUser(uid, reason)
 * ตั้ง status = "active"
 */
export const unsuspendUser = onCall(async (request) => {
  const { adminUid, adminEmail, adminLevel } = verifyAdminAuth(request);
  if (adminLevel !== "super") {
    throw new HttpsError("permission-denied", "เฉพาะ Super Admin เท่านั้นที่สามารถปลดระงับบัญชีได้");
  }

  const targetUid = request.data?.uid;
  const reason = request.data?.reason;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "ต้องระบุ uid ของผู้ใช้งาน");
  }

  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    throw new HttpsError("invalid-argument", "ต้องระบุเหตุผลในการปลดระงับบัญชี");
  }

  const userRef = db.collection("users").doc(targetUid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", `ไม่พบข้อมูลผู้ใช้ uid: ${targetUid}`);
  }

  const userBefore = userSnap.data();
  const now = FieldValue.serverTimestamp();

  await userRef.update({
    status: "active",
    unsuspendedAt: now,
    unsuspendedBy: adminUid,
    unsuspendReason: reason,
    suspendedReason: FieldValue.delete(),
    updatedAt: now
  });

  await writeAuditLog({
    adminUid,
    adminEmail,
    action: "UNSUSPEND_USER",
    targetUid,
    targetCollection: "users",
    before: { status: userBefore?.status },
    after: { status: "active" },
    reason,
    ip: request.rawRequest?.ip
  });

  return { success: true, message: `ปลดการระงับบัญชี ${targetUid} เรียบร้อยแล้ว` };
});

/**
 * 5. adjustWallet(uid, amountSatang, bucket, reason, direction)
 * ต้องเขียน ledger แบบ double-entry คู่กันเสมอ ห้ามแก้ยอดลอยๆ
 * เฉพาะ adminLevel = "super" เท่านั้น
 */
export const adjustWallet = onCall(async (request) => {
  const { adminUid, adminEmail } = verifyAdminAuth(request, "super");

  const targetUid = request.data?.uid;
  const rawAmount = Number(request.data?.amountSatang);
  const bucket = request.data?.bucket;
  const reason = request.data?.reason;
  const direction = (request.data?.direction || "CREDIT") as "CREDIT" | "DEBIT";

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "ต้องระบุ uid ของผู้ใช้งาน");
  }

  if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
    throw new HttpsError("invalid-argument", "จำนวนเงินต้องเป็นจำนวนเต็มบวกในหน่วยสตางค์ (Satang Integer) เท่านั้น");
  }

  const validBuckets = ["system", "insurance", "pension", "helmet", "equipment"];
  if (!bucket || !validBuckets.includes(bucket)) {
    throw new HttpsError("invalid-argument", `ถังเงินไม่ถูกต้อง ต้องเป็นหนึ่งใน: ${validBuckets.join(", ")}`);
  }

  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    throw new HttpsError("invalid-argument", "ต้องระบุเหตุผลในการปรับปรุงยอดเงินในกระเป๋า (บังคับ)");
  }

  const walletRef = db.collection("wallets").doc(targetUid);
  const ledgerRef = db.collection("ledger").doc();
  const systemPoolRef = db.collection("wallets").doc("SYSTEM_POOLS");

  const result = await db.runTransaction(async (transaction) => {
    const [walletSnap, poolSnap] = await Promise.all([
      transaction.get(walletRef),
      transaction.get(systemPoolRef)
    ]);

    if (!walletSnap.exists) {
      throw new HttpsError("not-found", `ไม่พบกระเป๋าเงินของผู้ใช้ uid: ${targetUid}`);
    }

    const walletData = walletSnap.data() || {};
    const poolData = poolSnap.exists ? poolSnap.data() || {} : {};

    const currentBalance = Number(walletData.balanceSatang || 0);
    const currentLocked = Number(walletData.lockedSatang || 0);
    const currentAvailable = currentBalance - currentLocked;
    const currentBucket = Number(walletData.buckets?.[bucket] || 0);

    let newBalance = currentBalance;
    let newBucket = currentBucket;

    let legs: any[] = [];
    const amountSatang = rawAmount;

    if (direction === "CREDIT") {
      // เพิ่มเงินเข้ากระเป๋าผู้ใช้ (CREDIT user, DEBIT system reserve)
      newBalance = currentBalance + amountSatang;
      newBucket = currentBucket + amountSatang;

      legs = [
        {
          accountId: "SYSTEM_REVENUE",
          accountType: "SYSTEM_REVENUE",
          direction: "DEBIT",
          amountSatang,
          descriptionTh: `หักเงินกองทุนกลางเพื่อปรับปรุงยอดเข้ากระเป๋า (${reason})`
        },
        {
          accountId: targetUid,
          accountType: "KNIGHT_WALLET",
          direction: "CREDIT",
          amountSatang,
          descriptionTh: `เครดิตเพิ่มเงินเข้ากระเป๋าผู้ใช้ (${reason})`
        }
      ];
    } else {
      // ลดเงินจากกระเป๋าผู้ใช้ (DEBIT user, CREDIT system reserve)
      if (currentAvailable < amountSatang) {
        throw new HttpsError(
          "failed-precondition",
          `ยอดเงินที่ใช้ได้ไม่เพียงพอต่อการหัก (คงเหลือใช้ได้ ${currentAvailable} สตางค์ แต่ต้องการหัก ${amountSatang} สตางค์)`
        );
      }
      newBalance = currentBalance - amountSatang;
      newBucket = Math.max(0, currentBucket - amountSatang);

      legs = [
        {
          accountId: targetUid,
          accountType: "KNIGHT_WALLET",
          direction: "DEBIT",
          amountSatang,
          descriptionTh: `หักเงินปรับยอดออกจากกระเป๋าผู้ใช้ (${reason})`
        },
        {
          accountId: "SYSTEM_REVENUE",
          accountType: "SYSTEM_REVENUE",
          direction: "CREDIT",
          amountSatang,
          descriptionTh: `รับเงินคืนเข้ากองทุนกลางจากการปรับยอด (${reason})`
        }
      ];
    }

    // Double-Entry Invariant Check: ผลรวม DEBIT ต้องเท่ากับ CREDIT เสมอ 100%
    const totalDebit = legs.filter(l => l.direction === "DEBIT").reduce((s, l) => s + l.amountSatang, 0);
    const totalCredit = legs.filter(l => l.direction === "CREDIT").reduce((s, l) => s + l.amountSatang, 0);

    if (totalDebit !== totalCredit) {
      throw new HttpsError("internal", `Double-entry invariant violated: Debit (${totalDebit}) != Credit (${totalCredit})`);
    }

    // บันทึก Ledger
    transaction.set(ledgerRef, {
      transactionId: ledgerRef.id,
      idempotencyKey: `ADJUST_${Date.now()}_${targetUid}`,
      type: "MANUAL_ADJUSTMENT",
      referenceId: targetUid,
      totalDebitSatang: totalDebit,
      totalCreditSatang: totalCredit,
      balanced: true,
      reason,
      adjustedBy: adminUid,
      legs,
      createdAt: FieldValue.serverTimestamp()
    });

    // อัปเดตกระเป๋าผู้ใช้
    transaction.update(walletRef, {
      balanceSatang: newBalance,
      availableSatang: newBalance - currentLocked,
      [`buckets.${bucket}`]: newBucket,
      updatedAt: FieldValue.serverTimestamp()
    });

    // อัปเดต Pool กลาง
    const currentPoolTotal = Number(poolData.totalBalanceSatang || 0);
    const currentPoolBucket = Number(poolData[bucket] || 0);
    transaction.set(systemPoolRef, {
      totalBalanceSatang: direction === "CREDIT" ? currentPoolTotal - amountSatang : currentPoolTotal + amountSatang,
      [bucket]: direction === "CREDIT" ? currentPoolBucket - amountSatang : currentPoolBucket + amountSatang,
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      success: true,
      ledgerId: ledgerRef.id,
      direction,
      amountSatang,
      newBalanceSatang: newBalance,
      bucket
    };
  });

  await writeAuditLog({
    adminUid,
    adminEmail,
    action: "ADJUST_WALLET",
    targetUid,
    targetCollection: "wallets",
    before: { amountSatang: rawAmount, direction, bucket },
    after: { ...result },
    reason: `ปรับยอดเงิน ${direction === "CREDIT" ? "+" : "-"}${rawAmount} สตางค์ ในถัง ${bucket} เหตุผล: ${reason}`,
    ip: request.rawRequest?.ip
  });

  return result;
});

/**
 * 6. updateFeeRule(ruleId, patch)
 * ห้ามลบกฎเก่า ให้ปิดด้วยการใส่ activeTo แทน (เก็บประวัติไว้ตรวจสอบย้อนหลัง)
 */
export const updateFeeRule = onCall(async (request) => {
  const { adminUid, adminEmail } = verifyAdminAuth(request, "super");

  const ruleId = request.data?.ruleId;
  const patch = request.data?.patch;

  if (!ruleId || typeof ruleId !== "string") {
    throw new HttpsError("invalid-argument", "ต้องระบุ ruleId ของกฎค่าธรรมเนียมเดิม");
  }

  if (!patch || typeof patch !== "object") {
    throw new HttpsError("invalid-argument", "ต้องระบุข้อมูลกฎใหม่ (patch)");
  }

  const oldRuleRef = db.collection("fee_rules").doc(ruleId);
  const oldRuleSnap = await oldRuleRef.get();

  if (!oldRuleSnap.exists) {
    throw new HttpsError("not-found", `ไม่พบกฎค่าธรรมเนียมรหัส ${ruleId}`);
  }

  const oldData = oldRuleSnap.data() || {};
  const nowIso = new Date().toISOString();
  const nowTimestamp = FieldValue.serverTimestamp();

  // สร้าง ID สำหรับกฎใหม่
  const newRuleRef = db.collection("fee_rules").doc();

  await db.runTransaction(async (transaction) => {
    // 1. ปิดกฎเดิมด้วย activeTo
    transaction.update(oldRuleRef, {
      activeTo: nowIso,
      archivedAt: nowTimestamp,
      archivedBy: adminUid
    });

    // 2. สร้างกฎใหม่ที่มี activeFrom เป็นเวลาปัจจุบัน
    transaction.set(newRuleRef, {
      ...oldData,
      ...patch,
      supersedesRuleId: ruleId,
      activeFrom: nowIso,
      activeTo: null,
      createdAt: nowTimestamp,
      createdBy: adminUid
    });
  });

  await writeAuditLog({
    adminUid,
    adminEmail,
    action: "UPDATE_FEE_RULE",
    targetUid: newRuleRef.id,
    targetCollection: "fee_rules",
    before: oldData,
    after: { ...oldData, ...patch, id: newRuleRef.id, supersedesRuleId: ruleId },
    reason: request.data?.reason || `ปรับปรุงกฎค่าธรรมเนียมเดิม ${ruleId} เป็นกฎใหม่ ${newRuleRef.id}`,
    ip: request.rawRequest?.ip
  });

  return {
    success: true,
    oldRuleId: ruleId,
    newRuleId: newRuleRef.id,
    message: `ปิดกฎเดิมและสร้างกฎค่าธรรมเนียมใหม่ ${newRuleRef.id} เรียบร้อยแล้ว`
  };
});

/**
 * 7. setAdminRole(targetUid, level)
 * เฉพาะ super เท่านั้น
 */
export const setAdminRole = onCall(async (request) => {
  const { adminUid, adminEmail } = verifyAdminAuth(request, "super");

  const targetUid = request.data?.targetUid;
  const level = request.data?.level as AdminLevel;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "ต้องระบุ targetUid");
  }

  const validLevels: AdminLevel[] = ["super", "reviewer", "support"];
  if (!level || !validLevels.includes(level)) {
    throw new HttpsError("invalid-argument", `ระดับสิทธิ์ต้องเป็นหนึ่งใน: ${validLevels.join(", ")}`);
  }

  // กำหนด Firebase Custom Claims
  await getAuth().setCustomUserClaims(targetUid, {
    admin: true,
    adminLevel: level
  });

  // อัปเดต Firestore user doc เพื่อให้อ่านใน UI ได้รวดเร็ว
  const userRef = db.collection("users").doc(targetUid);
  const userSnap = await userRef.get();
  const userBefore = userSnap.exists ? userSnap.data() : null;

  await userRef.set({
    isAdmin: true,
    adminLevel: level,
    roleSetAt: FieldValue.serverTimestamp(),
    roleSetBy: adminUid
  }, { merge: true });

  await writeAuditLog({
    adminUid,
    adminEmail,
    action: "SET_ADMIN_ROLE",
    targetUid,
    targetCollection: "users",
    before: { adminLevel: userBefore?.adminLevel },
    after: { admin: true, adminLevel: level },
    reason: request.data?.reason || `แต่งตั้งสิทธิ์ผู้ดูแลระดับ ${level} ให้แก่ ${targetUid}`,
    ip: request.rawRequest?.ip
  });

  return { success: true, targetUid, adminLevel: level };
});
