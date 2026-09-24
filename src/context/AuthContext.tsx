import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, authPersistenceReady, db } from '../firebase';
import { UserDoc } from '../types/auth';
import { clearUserSession } from '../utils/userSession';
import { internalEmailToWinUid, normalizeWinUid, winUidToInternalEmail } from '../auth/winUid';

interface SignUpPayload {
  firstName: string;
  lastName: string;
  winUid: string;
  password: string;
}

export interface GoogleOnboardingInfo {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
}

interface GoogleSignInResult {
  existingProfile: boolean;
  profile: UserDoc | null;
  google: GoogleOnboardingInfo;
}

interface AuthContextType {
  firebaseUser: User | null;
  userData: UserDoc | null;
  role: UserDoc['role'] | null;
  loading: boolean;
  googleOnboarding: GoogleOnboardingInfo | null;
  signInWithWinUid: (winUid: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<GoogleSignInResult | null>;
  signUpWithWinUid: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<UserDoc | null>;
  adoptUserData: (profile: UserDoc) => void;
  promoteToSuperAdmin: () => void;
  clearGoogleOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ONBOARDING_KEY = 'WINRIDER_PENDING_ONBOARDING';
export const SESSION_CACHE_KEY = 'WINRIDER_ACTIVE_SESSION_PROFILE';

function splitGoogleName(user: User): GoogleOnboardingInfo {
  const displayName = String(user.displayName || '').trim();
  const parts = displayName.split(/\s+/).filter(Boolean);
  return {
    email: String(user.providerData.find((p) => p.providerId === 'google.com')?.email || user.email || ''),
    displayName,
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
    photoURL: user.photoURL || undefined,
  };
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function shouldFallbackToRedirect(error: any): boolean {
  const code = String(error?.code || error?.message || '').toLowerCase();
  // Do not redirect after popup-blocked/cancelled on iOS: that produces the
  // "reload back to the same page" behavior. Redirect is reserved only for
  // environments where Firebase explicitly cannot run popup auth at all.
  return (
    code.includes('operation-not-supported-in-this-environment') ||
    code.includes('web-storage-unsupported')
  );
}

function cachedProfile(): UserDoc | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) as UserDoc : null;
  } catch {
    return null;
  }
}

function cacheProfile(profile: UserDoc | null) {
  if (typeof window === 'undefined') return;
  try {
    if (profile) window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(profile));
    else window.localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // Embedded previews may restrict storage.
  }
}

export function createSyntheticFirebaseUser(uid: string, displayName: string, email: string): User {
  const getCachedClaims = () => {
    const cached = cachedProfile();
    const isAdmin = cached?.isAdmin === true;
    return {
      admin: isAdmin,
      adminLevel: isAdmin ? cached?.adminLevel : undefined,
    };
  };

  const getSovereignToken = () => {
    const cached = cachedProfile();
    const claims = getCachedClaims();
    const payload = {
      uid: cached?.uid || uid,
      email: cached?.email || email,
      displayName: cached?.displayName || cached?.fullName || displayName || 'ผู้ใช้งาน',
      role: cached?.role || 'citizen',
      winUid: cached?.winUid || internalEmailToWinUid(email) || uid,
      isAdmin: claims.admin,
      adminLevel: claims.adminLevel,
      status: cached?.status || 'active',
    };
    return `sovereign:${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
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
    getIdTokenResult: async () => {
      const claims = getCachedClaims();
      return {
        token: getSovereignToken(),
        claims,
        authTime: new Date().toISOString(),
        issuedAtTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 86400000).toISOString(),
        signInProvider: 'custom',
        signInSecondFactor: null,
      };
    },
    reload: async () => {},
    toJSON: () => ({ uid, displayName, email }),
    phoneNumber: null,
    photoURL: null,
    providerId: 'winrider.local',
  } as User;
}

async function readUserProfile(user: User): Promise<UserDoc | null> {
  if (user.refreshToken === 'synthetic-session') {
    return cachedProfile();
  }

  let localProfile: UserDoc | null = null;

  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      localProfile = snap.data() as UserDoc;
    }
  } catch (firestoreError) {
    console.warn('Direct Firestore profile read failed:', firestoreError);
  }

  // Always let the backend confirm the authenticated account once. This is
  // where the existing owner account is promoted to Super Admin when its real
  // contact email matches the configured owner email.
  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/auth/me', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const payload = await response.json().catch(() => ({}));
      if (payload?.forceTokenRefresh === true) {
        await user.getIdToken(true);
      }
      const serverProfile = payload?.user ? payload.user as UserDoc : null;
      if (serverProfile?.role || serverProfile?.isAdmin === true) {
        return serverProfile;
      }
    } else if (response.status === 401) {
      console.warn('Backend auth profile check returned 401; using Firestore profile if available.');
    }
  } catch (serverError) {
    console.warn('Backend profile check failed; using Firestore profile:', serverError);
  }

  return localProfile && (localProfile.role || localProfile.isAdmin === true)
    ? localProfile
    : null;
}

function rememberPendingOnboarding(winUid: string, displayName: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ winUid, displayName, createdAt: Date.now() }));
  } catch {}
}

function clearPendingOnboarding() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(ONBOARDING_KEY); } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [googleOnboarding, setGoogleOnboarding] = useState<GoogleOnboardingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    authPersistenceReady.finally(async () => {
      if (!active) return;

      try {
        const redirectCredential = await getRedirectResult(auth);
        if (redirectCredential?.user && active) {
          setFirebaseUser(redirectCredential.user);
        }
      } catch (redirectError) {
        console.warn('Google redirect completion failed:', redirectError);
      }

      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        setLoading(true);

        if (!user) {
          const cached = cachedProfile();
          if (cached?.uid && cached?.role) {
            const synthetic = createSyntheticFirebaseUser(
              cached.uid,
              cached.displayName || cached.fullName || 'ผู้ใช้งาน',
              cached.email || winUidToInternalEmail(cached.winUid || cached.uid)
            );
            setFirebaseUser(synthetic);
            setUserData(cached);
          } else {
            setFirebaseUser(null);
            setUserData(null);
          }
          setGoogleOnboarding(null);
          setLoading(false);
          return;
        }

        setFirebaseUser(user);
        try {
          const profile = await readUserProfile(user);
          if (!active) return;
          setUserData(profile);
          if (profile?.role || profile?.isAdmin === true) {
            cacheProfile(profile);
            clearPendingOnboarding();
            setGoogleOnboarding(null);
          } else if (user.providerData.some((p) => p.providerId === 'google.com')) {
            setGoogleOnboarding(splitGoogleName(user));
          }
        } catch (error) {
          console.warn('Firebase auth profile hydration failed:', error);
          if (!active) return;
          setUserData(null);
          if (user.providerData.some((p) => p.providerId === 'google.com')) {
            setGoogleOnboarding(splitGoogleName(user));
          }
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
      const credential = await signInWithEmailAndPassword(auth, winUidToInternalEmail(normalizedUid), password);
      setFirebaseUser(credential.user);
      const profile = await readUserProfile(credential.user);
      setUserData(profile);
      setGoogleOnboarding(null);
      if (profile?.role || profile?.isAdmin === true) {
        cacheProfile(profile);
        clearPendingOnboarding();
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<GoogleSignInResult | null> => {
    setLoading(true);
    try {
      const provider = googleProvider();

      let credential;
      try {
        // IMPORTANT for iPhone/iPad: call signInWithPopup synchronously from the
        // tap event before awaiting any promise. Otherwise Safari/Chrome on iOS
        // can treat the Google chooser as a blocked popup and simply reload.
        const popupPromise = signInWithPopup(auth, provider);
        await authPersistenceReady.catch(() => {});
        credential = await popupPromise;
      } catch (popupError: any) {
        if (!shouldFallbackToRedirect(popupError)) throw popupError;
        await signInWithRedirect(auth, provider);
        return null;
      }

      const google = splitGoogleName(credential.user);
      setFirebaseUser(credential.user);

      let profile: UserDoc | null = null;
      try {
        profile = await readUserProfile(credential.user);
      } catch {
        profile = null;
      }

      if (profile?.role) {
        setUserData(profile);
        cacheProfile(profile);
        setGoogleOnboarding(null);
        clearPendingOnboarding();
        return { existingProfile: true, profile, google };
      }

      setUserData(null);
      setGoogleOnboarding(google);
      return { existingProfile: false, profile: null, google };
    } finally {
      setLoading(false);
    }
  };

  const signUpWithWinUid = async ({ firstName, lastName, winUid, password }: SignUpPayload) => {
    setLoading(true);
    try {
      await authPersistenceReady;
      const normalizedWinUid = normalizeWinUid(winUid);
      const credential = await createUserWithEmailAndPassword(auth, winUidToInternalEmail(normalizedWinUid), password);
      const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      if (displayName) await updateProfile(credential.user, { displayName });
      await credential.user.getIdToken(true);
      rememberPendingOnboarding(normalizedWinUid, displayName);
      setFirebaseUser(credential.user);
      setUserData(null);
      setGoogleOnboarding(null);
    } finally {
      setLoading(false);
    }
  };

  const adoptUserData = (profile: UserDoc) => {
    cacheProfile(profile);
    const activeUser = auth.currentUser || createSyntheticFirebaseUser(
      profile.uid,
      profile.displayName || profile.fullName || 'ผู้ใช้งาน',
      profile.email || winUidToInternalEmail(profile.winUid || profile.uid)
    );
    setFirebaseUser(activeUser);
    setUserData(profile);
    setGoogleOnboarding(null);
    if (profile.role) clearPendingOnboarding();
  };

  const promoteToSuperAdmin = () => {
    setUserData((current) => {
      if (!current) return current;
      const updated: UserDoc = { ...current, isAdmin: true, adminLevel: 'super' };
      cacheProfile(updated);
      return updated;
    });
  };

  const signOut = async () => {
    setLoading(true);
    try {
      clearUserSession();
      clearPendingOnboarding();
      cacheProfile(null);
      await firebaseSignOut(auth).catch(() => {});
      setUserData(null);
      setFirebaseUser(null);
      setGoogleOnboarding(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async (): Promise<UserDoc | null> => {
    const user = auth.currentUser;
    if (!user) return userData;
    await user.reload();
    setFirebaseUser(user);
    const profile = await readUserProfile(user);
    setUserData(profile);
    if (profile?.role) {
      cacheProfile(profile);
      clearPendingOnboarding();
      setGoogleOnboarding(null);
    }
    return profile;
  };

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      userData,
      role: userData?.role ?? null,
      loading,
      googleOnboarding,
      signInWithWinUid,
      signInWithGoogle,
      signUpWithWinUid,
      signOut,
      refreshUserData,
      adoptUserData,
      promoteToSuperAdmin,
      clearGoogleOnboarding: () => setGoogleOnboarding(null),
    }}>
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
