import crypto from "crypto";

export type WinAuthRole = "citizen" | "knight" | "merchant" | "partner";
export type WinAuthStatus = "pending_review" | "active" | "suspended";

export interface WinAuthStoredUser {
  uid: string;
  email: string;
  passwordHash: string;
  role: WinAuthRole;
  status: WinAuthStatus;
  displayName: string;
  phone: string;
  isAdmin?: boolean;
  adminLevel?: "super" | "reviewer" | "support";
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

const PREFIX = "winrider:auth";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function redisConfig() {
  const url = String(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
  const token = String(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "");
  if (!url || !token) {
    const error = new Error("WIN_AUTH_STORE_NOT_CONFIGURED");
    (error as any).code = "WIN_AUTH_STORE_NOT_CONFIGURED";
    throw error;
  }
  return { url, token };
}

async function redisCommand<T = unknown>(args: Array<string | number>): Promise<T> {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args.map((value) => String(value))),
  });
  const payload = await response.json().catch(() => ({})) as { result?: T; error?: string };
  if (!response.ok || payload.error) {
    const error = new Error(payload.error || `WIN_AUTH_STORE_HTTP_${response.status}`);
    (error as any).code = "WIN_AUTH_STORE_ERROR";
    throw error;
  }
  return payload.result as T;
}

export function normalizeWinAuthEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function emailIndexKey(email: string): string {
  const digest = crypto.createHash("sha256").update(normalizeWinAuthEmail(email)).digest("hex");
  return `${PREFIX}:email:${digest}`;
}

function userKey(uid: string): string {
  return `${PREFIX}:user:${uid}`;
}

function sessionKey(rawToken: string): string {
  const digest = crypto.createHash("sha256").update(rawToken).digest("hex");
  return `${PREFIX}:session:${digest}`;
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
  const raw = await redisCommand<string | null>(["GET", userKey(uid)]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WinAuthStoredUser;
  } catch {
    return null;
  }
}

export async function getWinAuthUserByEmail(email: string): Promise<WinAuthStoredUser | null> {
  const uid = await redisCommand<string | null>(["GET", emailIndexKey(email)]);
  return uid ? getWinAuthUserById(uid) : null;
}

export async function createWinAuthUser(input: {
  email: string;
  password: string;
  role: WinAuthRole;
  displayName?: string;
  phone?: string;
  status?: WinAuthStatus;
  isAdmin?: boolean;
  adminLevel?: "super" | "reviewer" | "support";
}): Promise<WinAuthStoredUser> {
  const email = normalizeWinAuthEmail(input.email);
  const uid = `WIN-${crypto.randomUUID()}`;
  const emailKey = emailIndexKey(email);
  const claimed = await redisCommand<string | null>(["SET", emailKey, uid, "NX"]);
  if (claimed !== "OK") {
    const error = new Error("EMAIL_ALREADY_REGISTERED");
    (error as any).code = "EMAIL_ALREADY_REGISTERED";
    throw error;
  }

  const now = new Date().toISOString();
  const user: WinAuthStoredUser = {
    uid,
    email,
    passwordHash: hashWinAuthPassword(input.password),
    role: input.role,
    status: input.status || "pending_review",
    displayName: String(input.displayName || email.split("@")[0] || "ผู้สมัครใหม่").slice(0, 120),
    phone: String(input.phone || "").slice(0, 40),
    isAdmin: input.isAdmin === true,
    adminLevel: input.adminLevel,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await redisCommand(["SET", userKey(uid), JSON.stringify(user)]);
    await redisCommand(["SADD", `${PREFIX}:users`, uid]);
    return user;
  } catch (error) {
    await redisCommand(["DEL", emailKey]).catch(() => undefined);
    throw error;
  }
}

export async function saveWinAuthUser(user: WinAuthStoredUser): Promise<WinAuthStoredUser> {
  const next = { ...user, email: normalizeWinAuthEmail(user.email), updatedAt: new Date().toISOString() };
  await redisCommand(["SET", userKey(user.uid), JSON.stringify(next)]);
  await redisCommand(["SET", emailIndexKey(next.email), next.uid]);
  await redisCommand(["SADD", `${PREFIX}:users`, next.uid]);
  return next;
}

export async function listWinAuthUsers(): Promise<WinAuthStoredUser[]> {
  const ids = await redisCommand<string[]>(["SMEMBERS", `${PREFIX}:users`]);
  if (!Array.isArray(ids) || !ids.length) return [];
  const users = await Promise.all(ids.map((uid) => getWinAuthUserById(uid)));
  return users.filter((user): user is WinAuthStoredUser => Boolean(user));
}

export async function createWinAuthSession(uid: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  await redisCommand(["SET", sessionKey(rawToken), uid, "EX", SESSION_TTL_SECONDS]);
  return rawToken;
}

export async function getWinAuthSessionUser(rawToken: string): Promise<WinAuthStoredUser | null> {
  if (!rawToken || rawToken.length < 20) return null;
  const uid = await redisCommand<string | null>(["GET", sessionKey(rawToken)]);
  return uid ? getWinAuthUserById(uid) : null;
}

export async function deleteWinAuthSession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  await redisCommand(["DEL", sessionKey(rawToken)]);
}
