import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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

interface AuthContextType {
  firebaseUser: User | null;
  userData: UserDoc | null;
  role: UserDoc['role'] | null;
  loading: boolean;
  signInWithWinUid: (winUid: string, password: string) => Promise<void>;
  signUpWithWinUid: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function readUserProfile(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() as UserDoc : null;
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
        try {
          if (!user) {
            setFirebaseUser(null);
            setUserData(null);
            return;
          }

          const profile = await readUserProfile(user.uid);
          if (!active) return;
          setFirebaseUser(user);
          setUserData(profile);
        } catch (error) {
          console.warn('Firebase auth hydration failed:', error);
          if (!active) return;
          setFirebaseUser(user);
          setUserData(null);
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
      const profile = await readUserProfile(credential.user.uid);
      setFirebaseUser(credential.user);
      setUserData(profile);
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
      setFirebaseUser(credential.user);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      clearUserSession();
      await firebaseSignOut(auth);
      setUserData(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    const user = auth.currentUser;
    if (!user) {
      setUserData(null);
      return;
    }
    await user.reload();
    const profile = await readUserProfile(user.uid);
    setFirebaseUser(user);
    setUserData(profile);
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
