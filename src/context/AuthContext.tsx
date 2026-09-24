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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ONBOARDING_KEY = 'WINRIDER_PENDING_ONBOARDING';

async function readUserProfile(user: User): Promise<UserDoc | null> {
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
          setUserData(profile);
          if (profile?.role) clearPendingOnboarding();
        } catch (error) {
          console.warn('Firebase auth hydration failed:', error);
          if (!active) return;
          // Preserve the authenticated user and let onboarding continue. A transient
          // profile read failure must not bounce the user to the sign-up screen.
          setUserData((current) => current);
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
      const credential = await signInWithEmailAndPassword(auth, winUidToInternalEmail(winUid), password);
      setFirebaseUser(credential.user);
      const profile = await readUserProfile(credential.user);
      setUserData(profile);
      if (profile?.role) clearPendingOnboarding();
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
    setFirebaseUser(auth.currentUser);
    setUserData(profile);
    if (profile?.role) clearPendingOnboarding();
  };

  const signOut = async () => {
    setLoading(true);
    try {
      clearUserSession();
      clearPendingOnboarding();
      await firebaseSignOut(auth);
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
      setUserData(profile);
      if (profile.role) clearPendingOnboarding();
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
