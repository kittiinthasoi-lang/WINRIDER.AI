import type { RegistrationProfile, UserDoc, UserRole } from '../types/auth';

const TOKEN_KEY = 'winrider.auth.session';

export interface WinAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  metadata: { creationTime?: string };
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: Record<string, unknown> }>;
}

type AuthPayload = {
  token?: string;
  user?: UserDoc;
  error?: string;
  code?: string;
};

let currentProfile: UserDoc | null = null;
let currentToken = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) || '' : '';

function buildCompatUser(profile: UserDoc | null): WinAuthUser | null {
  if (!profile) return null;
  return {
    uid: profile.uid,
    email: profile.email || null,
    displayName: profile.displayName || null,
    phoneNumber: profile.phone || null,
    photoURL: profile.avatarUrl || null,
    metadata: { creationTime: typeof profile.createdAt === 'string' ? profile.createdAt : undefined },
    getIdToken: async () => currentToken,
    getIdTokenResult: async () => ({
      claims: {
        admin: profile.isAdmin === true,
        isAdmin: profile.isAdmin === true,
        adminLevel: profile.adminLevel,
        role: profile.role,
        status: profile.status,
      },
    }),
  };
}

export const auth: any = {
  get currentUser() {
    return buildCompatUser(currentProfile);
  },
};

function authError(payload: AuthPayload, fallback: string) {
  const error = new Error(payload.error || fallback);
  (error as any).code = payload.code || payload.error || fallback;
  return error;
}

async function request(path: string, init: RequestInit = {}, useToken = false): Promise<AuthPayload> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (useToken && currentToken) headers.set('Authorization', `Bearer ${currentToken}`);
  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as AuthPayload;
  if (!response.ok) throw authError(payload, `WIN_AUTH_HTTP_${response.status}`);
  return payload;
}

function storeSession(payload: AuthPayload) {
  if (!payload.token || !payload.user) throw new Error('WIN_AUTH_INVALID_RESPONSE');
  currentToken = payload.token;
  currentProfile = payload.user;
  if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, currentToken);
  return { user: buildCompatUser(currentProfile)!, profile: currentProfile };
}

export async function restoreWinAuthSession() {
  if (!currentToken) {
    currentProfile = null;
    return { user: null as WinAuthUser | null, profile: null as UserDoc | null };
  }
  try {
    const payload = await request('/api/auth/me', { method: 'GET' }, true);
    if (!payload.user) throw new Error('WIN_AUTH_PROFILE_MISSING');
    currentProfile = payload.user;
    return { user: buildCompatUser(currentProfile), profile: currentProfile };
  } catch (error) {
    currentToken = '';
    currentProfile = null;
    if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
    throw error;
  }
}

export async function enterTemporaryAdmin() {
  const payload = await request('/api/auth/temporary-admin-entry', {
    method: 'POST',
    body: '{}',
  });
  return storeSession(payload);
}

export async function signInWinAuth(email: string, password: string) {
  const payload = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return storeSession(payload);
}

export async function registerWinAuth(email: string, password: string, role: UserRole, registration: RegistrationProfile) {
  const payload = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password, role, registration }),
  });
  return storeSession(payload);
}

export async function refreshWinAuthProfile() {
  const payload = await request('/api/auth/me', { method: 'GET' }, true);
  if (!payload.user) throw new Error('WIN_AUTH_PROFILE_MISSING');
  currentProfile = payload.user;
  return { user: buildCompatUser(currentProfile), profile: currentProfile };
}

export async function signOutWinAuth() {
  try {
    if (currentToken) await request('/api/auth/logout', { method: 'POST', body: '{}' }, true);
  } finally {
    currentToken = '';
    currentProfile = null;
    if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
  }
}

export function getWinAuthToken(): string {
  return currentToken;
}

export async function getWinAuthHeaders(): Promise<Record<string, string>> {
  return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
}
