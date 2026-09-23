import crypto from "crypto";
import type { Firestore } from "firebase-admin/firestore";

export type WinAuthRole = "citizen" | "knight" | "merchant" | "partner";
export type WinAuthStatus = "pending_review" | "active" | "suspended";

export interface WinAuthRegistrationProfile {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  pdpaAccepted: boolean;
  gpsConsent: boolean;
  termsAccepted: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  winStation?: string;
  vestNumber?: string;
  plateNumber?: string;
  publicLicenseNumber?: string;
  vehicleModel?: string;
  yellowPlateConfirmed?: boolean;
  shopName?: string;
  shopType?: string;
  shopAddress?: string;
  taxId?: string;
  orgName?: string;
  orgType?: string;
  contactPerson?: string;
  orgAddress?: string;
  estimatedUsers?: number;
}

export interface WinAuthStoredUser {
  uid: string;
  email: string;
  passwordHash: string;
  role: WinAuthRole;
  status: WinAuthStatus;
  displayName: string;
  phone: string;
  registration?: WinAuthRegistrationProfile;
  isAdmin?: boolean;
  adminLevel?: "super" | "reviewer" | "support";
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
let storeDb: Firestore | null = null;

export function configureWinAuthStore(db: Firestore) {
  storeDb = db;
}

function authDb(): Firestore {
  if (!storeDb) {
    const error = new Error("WIN_AUTH_STORE_NOT_CONFIGURED");
    (error as any).code = "WIN_AUTH_STORE_NOT_CONFIGURED";
    throw error;
  }
  return storeDb;
}

function usersCollection() {
  return authDb().collection("winAuthUsers");
}

function emailIndexCollection() {
  return authDb().collection("winAuthEmailIndex");
}

function sessionsCollection() {
  return authDb().collection("winAuthSessions");
}

export function normalizeWinAuthEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function emailIndexId(email: string): string {
  return crypto.createHash("sha256").update(normalizeWinAuthEmail(email)).digest("hex");
}

function sessionId(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function hashWinAuthPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyWinAuthPassword(password: string, encodedHash: string): boolean {
  const [algorithm, salt, expectedHex] = String(encodedHash || "").split("$");
  if (algorithm !== "scrypt" || !salt || !/^[a-f0-9]{128}$/i.test(expectedHex || "")) return false;
  const actualHex = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actualHex, "hex"), Buffer.from(expectedHex, "hex"));
}

export async function getWinAuthUserById(uid: string): Promise<WinAuthStoredUser | null> {
  const snap = await usersCollection().doc(uid).get();
  return snap.exists ? snap.data() as WinAuthStoredUser : null;
}

export async function getWinAuthUserByEmail(email: string): Promise<WinAuthStoredUser | null> {
  const normalized = normalizeWinAuthEmail(email);
  if (!normalized) return null;
  const indexSnap = await emailIndexCollection().doc(emailIndexId(normalized)).get();
  if (!indexSnap.exists) return null;
  const uid = String(indexSnap.data()?.uid || "");
  return uid ? getWinAuthUserById(uid) : null;
}

export async function createWinAuthUser(input: {
  email: string;
  password: string;
  role: WinAuthRole;
  displayName?: string;
  phone?: string;
  registration?: WinAuthRegistrationProfile;
  status?: WinAuthStatus;
  isAdmin?: boolean;
  adminLevel?: "super" | "reviewer" | "support";
}): Promise<WinAuthStoredUser> {
  const db = authDb();
  const email = normalizeWinAuthEmail(input.email);
  const uid = `WIN-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const user: WinAuthStoredUser = {
    uid,
    email,
    passwordHash: hashWinAuthPassword(input.password),
    role: input.role,
    status: input.status || "pending_review",
    displayName: String(input.displayName || input.registration?.fullName || email.split("@")[0] || "ผู้สมัครใหม่").slice(0, 120),
    phone: String(input.phone || input.registration?.phone || "").slice(0, 40),
    registration: input.registration,
    isAdmin: input.isAdmin === true,
    adminLevel: input.adminLevel,
    createdAt: now,
    updatedAt: now,
  };

  const userRef = usersCollection().doc(uid);
  const emailRef = emailIndexCollection().doc(emailIndexId(email));
  await db.runTransaction(async (tx) => {
    const emailSnap = await tx.get(emailRef);
    if (emailSnap.exists) {
      const error = new Error("EMAIL_ALREADY_REGISTERED");
      (error as any).code = "EMAIL_ALREADY_REGISTERED";
      throw error;
    }
    tx.create(userRef, user);
    tx.create(emailRef, { uid, email, createdAt: now });
  });
  return user;
}

export async function saveWinAuthUser(user: WinAuthStoredUser): Promise<WinAuthStoredUser> {
  const db = authDb();
  const next: WinAuthStoredUser = {
    ...user,
    email: normalizeWinAuthEmail(user.email),
    updatedAt: new Date().toISOString(),
  };
  const userRef = usersCollection().doc(next.uid);
  const emailRef = emailIndexCollection().doc(emailIndexId(next.email));
  await db.runTransaction(async (tx) => {
    const emailSnap = await tx.get(emailRef);
    if (emailSnap.exists && String(emailSnap.data()?.uid || "") !== next.uid) {
      const error = new Error("EMAIL_ALREADY_REGISTERED");
      (error as any).code = "EMAIL_ALREADY_REGISTERED";
      throw error;
    }
    tx.set(userRef, next, { merge: true });
    tx.set(emailRef, { uid: next.uid, email: next.email, updatedAt: next.updatedAt }, { merge: true });
  });
  return next;
}

export async function listWinAuthUsers(): Promise<WinAuthStoredUser[]> {
  const snapshot = await usersCollection().limit(500).get();
  return snapshot.docs.map((doc) => doc.data() as WinAuthStoredUser);
}

export async function createWinAuthSession(uid: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  await sessionsCollection().doc(sessionId(rawToken)).set({
    uid,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  });
  return rawToken;
}

export async function getWinAuthSessionUser(rawToken: string): Promise<WinAuthStoredUser | null> {
  if (!rawToken || rawToken.length < 20) return null;
  const ref = sessionsCollection().doc(sessionId(rawToken));
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const expiresAt = Date.parse(String(data.expiresAt || ""));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await ref.delete().catch(() => undefined);
    return null;
  }
  const uid = String(data.uid || "");
  return uid ? getWinAuthUserById(uid) : null;
}

export async function deleteWinAuthSession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  await sessionsCollection().doc(sessionId(rawToken)).delete().catch(() => undefined);
}
