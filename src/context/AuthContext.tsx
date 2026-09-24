import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, authPersistenceReady, db } from '../firebase';
import { UserDoc } from '../types/auth';
import { clearUserSession } from '../utils/userSession';

interface AuthContextType {
  firebaseUser: User | null;
  userData: UserDoc | null;
  role: UserDoc['role'] | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authError(code: string, message: string) {
  const error = new Error(message);
  (error as any).code = code;
  return error;
}

async function readUserProfile(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() as UserDoc : null;
}

async function bootstrapOwnerIfEligible(user: User): Promise<void> {
  const token = await user.getIdToken();
  const response = await fetch('/api/auth/bootstrap-owner', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: '{}',
  });

  // The endpoint intentionally returns owner:false for normal users.
  if (response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (payload?.owner === true && payload?.claimsUpdated === true) {
      await user.getIdToken(true);
    }
    return;
  }

  const payload = await response.json().catch(() => ({}));
  if (response.status === 412 && payload?.code === 'OWNER_EMAIL_NOT_VERIFIED') {
    throw authError('auth/email-not-verified', 'กรุณายืนยันอีเมลเจ้าของระบบก่อนเข้าสู่ Super Admin');
  }
  if (response.status >= 500) {
    console.warn('Owner bootstrap endpoint unavailable:', payload?.code || response.status);
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
        try {
          if (!user) {
            setFirebaseUser(null);
            setUserData(null);
            return;
          }

          // Email/password identities must prove ownership of the mailbox before
          // onboarding or owner elevation. Federated providers already expose a
          // verified email when Firebase marks emailVerified=true.
          if (user.providerData.some((provider) => provider.providerId === 'password') && !user.emailVerified) {
            // Keep the short-lived Firebase user object intact while sign-up sends
            // the verification email. signUpWithEmail/signInWithEmail explicitly
            // signs the unverified session out after the message is sent.
            setFirebaseUser(null);
            setUserData(null);
            return;
          }

          await bootstrapOwnerIfEligible(user);
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

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authPersistenceReady;
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = credential.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user).catch(() => undefined);
        await firebaseSignOut(auth);
        throw authError(
          'auth/email-not-verified',
          'อีเมลนี้ยังไม่ได้ยืนยัน ระบบส่งลิงก์ยืนยันให้อีกครั้งแล้ว'
        );
      }

      await bootstrapOwnerIfEligible(user);
      const profile = await readUserProfile(user.uid);
      setFirebaseUser(user);
      setUserData(profile);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authPersistenceReady;
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(credential.user);
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await authPersistenceReady;
    await sendPasswordResetEmail(auth, email.trim());
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
    await bootstrapOwnerIfEligible(user);
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
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
