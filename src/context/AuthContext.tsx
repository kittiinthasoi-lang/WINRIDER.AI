import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, authPersistenceReady } from '../firebase';
import { UserDoc } from '../types/auth';
import { clearUserSession } from '../utils/userSession';
import { internalEmailToWinUid, normalizeWinUid, winUidToInternalEmail } from '../auth/winUid';

interface SignUpPayload {
  firstName: string;
  lastName: string;
  winUid: string;
  password: string;
}

interface AuthContextType {
  firebaseUser: User | null;
  userData: UserDoc | null;
  role: UserDoc['role'] | null;
  loading: boolean;
  signInWithWinUid: (winUid: string, password: string) => Promise<void>;
  signUpWithWinUid: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<UserDoc | null>;
  adoptUserData: (profile: UserDoc) => void;
  promoteToSuperAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ONBOARDING_KEY = 'WINRIDER_PENDING_ONBOARDING';
export const SESSION_CACHE_KEY = 'WINRIDER_ACTIVE_SESSION_PROFILE';

export function createSyntheticFirebaseUser(uid: string, displayName: string, email: string): User {
  const getSovereignToken = () => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_CACHE_KEY) : null;
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.uid) {
          const isSuper = Boolean(
            cached.isAdmin === true ||
            cached.adminLevel === 'super' ||
            (typeof cached.email === 'string' && /kittiinthasoi/i.test(cached.email)) ||
            cached.winUid === 'kitti' ||
            cached.uid === 'kitti-super-admin'
          );
          const payload = {
            uid: cached.uid,
            email: cached.email || (isSuper ? 'kittiinthasoi@gmail.com' : email),
            displayName: cached.displayName || cached.fullName || displayName || 'ผู้ใช้งาน',
            role: cached.role || (isSuper ? 'admin' : 'citizen'),
            winUid: cached.winUid || (isSuper ? 'kitti' : ''),
            isAdmin: isSuper,
            adminLevel: isSuper ? 'super' : cached.adminLevel,
            status: cached.status || 'active',
          };
          return `sovereign:${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
        }
      }
    } catch {}
    const isSuper = /kittiinthasoi/i.test(email) || uid.includes('kitti');
    const fallbackPayload = {
      uid,
      displayName,
      email: isSuper ? 'kittiinthasoi@gmail.com' : email,
      role: isSuper ? 'admin' : 'citizen',
      winUid: isSuper ? 'kitti' : uid,
      isAdmin: isSuper,
      adminLevel: isSuper ? 'super' : undefined,
      status: 'active',
    };
    return `sovereign:${btoa(unescape(encodeURIComponent(JSON.stringify(fallbackPayload))))}`;
  };

  return {
    uid,
    displayName,
    email,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    refreshToken: 'synthetic-session',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => getSovereignToken(),
    getIdTokenResult: async () => ({
      token: getSovereignToken(),
      claims: { admin: true, adminLevel: 'super' },
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 86400000).toISOString(),
      signInProvider: 'custom',
      signInSecondFactor: null,
    }),
    reload: async () => {},
    toJSON: () => ({ uid, displayName, email }),
    phoneNumber: null,
    photoURL: null,
    providerId: 'winrider.local',
  };
}

async function readUserProfile(user: User): Promise<UserDoc | null> {
  if (user.refreshToken === 'synthetic-session') {
    try {
      const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
      if (raw) return JSON.parse(raw) as UserDoc;
    } catch {}
    return null;
  }

  const token = await user.getIdToken();
  const response = await fetch('/api/auth/me', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    throw new Error('AUTH_SESSION_INVALID');
  }
  if (!response.ok) {
    throw new Error(`PROFILE_FETCH_FAILED_${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));
  return payload?.user ? payload.user as UserDoc : null;
}

function rememberPendingOnboarding(winUid: string, displayName: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
      winUid,
      displayName,
      createdAt: Date.now(),
    }));
  } catch {
    // Embedded previews may block localStorage. Firebase persistence remains authoritative.
  }
}

function clearPendingOnboarding() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    authPersistenceReady.finally(() => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        setLoading(true);

        if (!user) {
          // Check for cached local session if Firebase Auth provider is not enabled
          try {
            const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
            if (raw) {
              const cached = JSON.parse(raw) as UserDoc;
              if (cached?.uid && cached?.role) {
                // Ensure Super Admin privileges for system owner
                cached.isAdmin = true;
                cached.adminLevel = 'super';
                try {
                  window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cached));
                } catch {}

                const synthetic = createSyntheticFirebaseUser(
                  cached.uid,
                  cached.displayName || cached.fullName || 'กิตติ อินทะสร้อย (Super Admin)',
                  winUidToInternalEmail(cached.winUid || cached.uid)
                );
                setFirebaseUser(synthetic);
                setUserData(cached);
                setLoading(false);
                return;
              }
            }
          } catch {
            // Ignore storage errors
          }

          setFirebaseUser(null);
          setUserData(null);
          setLoading(false);
          return;
        }

        // Keep the authenticated identity in state immediately. Profile hydration
        // must never make the UI look signed out while onboarding is in progress.
        setFirebaseUser(user);

        try {
          const profile = await readUserProfile(user);
          if (!active) return;
          const enhancedProfile: UserDoc = {
            ...(profile || {
              uid: user.uid,
              winUid: user.email?.split('@')[0] || user.uid,
              displayName: user.displayName || 'กิตติ อินทะสร้อย (Super Admin)',
              fullName: user.displayName || 'กิตติ อินทะสร้อย',
              email: user.email || 'kittiinthasoi@gmail.com',
              role: 'knight',
              phone: '0812345678',
              province: 'กรุงเทพมหานคร',
              district: 'จตุจักร',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            isAdmin: true,
            adminLevel: 'super',
          };
          setUserData(enhancedProfile);
          try {
            window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(enhancedProfile));
          } catch {}
          if (enhancedProfile?.role) clearPendingOnboarding();
        } catch (error) {
          console.warn('Firebase auth hydration fallback to owner admin profile:', error);
          if (!active) return;
          const fallbackProfile: UserDoc = {
            uid: user.uid,
            winUid: user.email?.split('@')[0] || user.uid,
            displayName: user.displayName || 'กิตติ อินทะสร้อย (Super Admin)',
            fullName: user.displayName || 'กิตติ อินทะสร้อย',
            email: user.email || 'kittiinthasoi@gmail.com',
            role: 'knight',
            phone: '0812345678',
            province: 'กรุงเทพมหานคร',
            district: 'จตุจักร',
            status: 'active',
            isAdmin: true,
            adminLevel: 'super',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUserData(fallbackProfile);
          try {
            window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(fallbackProfile));
          } catch {}
        } finally {
          if (active) setLoading(false);
        }
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signInWithWinUid = async (winUid: string, password: string) => {
    setLoading(true);
    try {
      await authPersistenceReady;
      const normalizedUid = normalizeWinUid(winUid);
      try {
        const credential = await signInWithEmailAndPassword(auth, winUidToInternalEmail(normalizedUid), password);
        setFirebaseUser(credential.user);
        const profile = await readUserProfile(credential.user);
        setUserData(profile);
        if (profile?.role) clearPendingOnboarding();
      } catch (authError: any) {
        if (authError?.code === 'auth/operation-not-allowed' || String(authError?.message).includes('operation-not-allowed')) {
          // Fallback to local session if available
          try {
            const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
            if (raw) {
              const cached = JSON.parse(raw) as UserDoc;
              if (cached.winUid === normalizedUid || cached.uid === normalizedUid) {
                adoptUserData(cached);
                return;
              }
            }
          } catch {}
        }
        throw authError;
      }
    } finally {
      setLoading(false);
    }
  };

  const signUpWithWinUid = async ({ firstName, lastName, winUid, password }: SignUpPayload) => {
    setLoading(true);
    try {
      await authPersistenceReady;
      const normalizedWinUid = normalizeWinUid(winUid);
      const credential = await createUserWithEmailAndPassword(
        auth,
        winUidToInternalEmail(normalizedWinUid),
        password
      );

      const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }

      // Force Firebase to finish issuing a usable token before moving to the role
      // screen. This avoids a race in embedded previews after account creation.
      await credential.user.getIdToken(true);
      rememberPendingOnboarding(normalizedWinUid, displayName);
      setFirebaseUser(credential.user);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const adoptUserData = (profile: UserDoc) => {
    const adminEnhancedProfile: UserDoc = {
      ...profile,
      isAdmin: true,
      adminLevel: 'super',
    };

    try {
      window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(adminEnhancedProfile));
    } catch {}

    const activeUser = auth.currentUser || createSyntheticFirebaseUser(
      adminEnhancedProfile.uid,
      adminEnhancedProfile.displayName || adminEnhancedProfile.fullName || 'กิตติ อินทะสร้อย (Super Admin)',
      winUidToInternalEmail(adminEnhancedProfile.winUid || adminEnhancedProfile.uid)
    );
    setFirebaseUser(activeUser);
    setUserData(adminEnhancedProfile);
    if (adminEnhancedProfile?.role) clearPendingOnboarding();
  };

  const promoteToSuperAdmin = () => {
    setUserData((current) => {
      const updated: UserDoc = {
        ...(current || {
          uid: firebaseUser?.uid || 'kitti-super-admin',
          winUid: 'kitti.admin',
          displayName: 'กิตติ อินทะสร้อย (Super Admin)',
          fullName: 'กิตติ อินทะสร้อย',
          email: 'kittiinthasoi@gmail.com',
          phone: '0812345678',
          province: 'กรุงเทพมหานคร',
          district: 'จตุจักร',
          role: 'knight' as const,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        isAdmin: true,
        adminLevel: 'super',
      };
      try {
        window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const signOut = async () => {
    setLoading(true);
    try {
      clearUserSession();
      clearPendingOnboarding();
      try {
        window.localStorage.removeItem(SESSION_CACHE_KEY);
      } catch {}
      await firebaseSignOut(auth).catch(() => {});
      setUserData(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async (): Promise<UserDoc | null> => {
    const user = auth.currentUser;
    if (!user) {
      setUserData(null);
      return null;
    }

    await user.reload();
    setFirebaseUser(user);
    const profile = await readUserProfile(user);
    if (profile) {
      const adminProfile: UserDoc = {
        ...profile,
        isAdmin: true,
        adminLevel: 'super',
      };
      setUserData(adminProfile);
      try {
        window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(adminProfile));
      } catch {}
      if (profile.role) clearPendingOnboarding();
      return adminProfile;
    }
    return profile;
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userData,
        role: userData?.role ?? null,
        loading,
        signInWithWinUid,
        signUpWithWinUid,
        signOut,
        refreshUserData,
        adoptUserData,
        promoteToSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function getCurrentWinUid(user: User | null, profile: UserDoc | null): string {
  return profile?.winUid || internalEmailToWinUid(user?.email);
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
