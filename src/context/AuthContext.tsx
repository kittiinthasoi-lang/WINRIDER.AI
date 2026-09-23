import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserDoc, UserRole } from '../types/auth';
import { clearUserSession } from '../utils/userSession';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: UserDoc | null;
  role: UserRole | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid: string) => {
    const snapshot = await getDoc(doc(db, 'users', uid));
    setUserData(snapshot.exists() ? (snapshot.data() as UserDoc) : null);
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      setFirebaseUser(user);
      if (!user) {
        setUserData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        setUserData(snapshot.exists() ? (snapshot.data() as UserDoc) : null);
        setLoading(false);
      }, (error) => {
        console.error('Unable to load the authenticated user profile:', error);
        setUserData(null);
        setLoading(false);
      });
    });
    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try { await signInWithPopup(auth, googleProvider); }
    catch (error) { setLoading(false); throw error; }
  };
  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (error) { setLoading(false); throw error; }
  };
  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try { await createUserWithEmailAndPassword(auth, email, password); }
    catch (error) { setLoading(false); throw error; }
  };
  const signOut = async () => {
    setLoading(true);
    try {
      clearUserSession();
      await firebaseSignOut(auth);
      setUserData(null);
      setFirebaseUser(null);
    } finally { setLoading(false); }
  };
  const refreshUserData = async () => {
    if (firebaseUser) await fetchUserProfile(firebaseUser.uid);
  };

  return <AuthContext.Provider value={{ firebaseUser, userData, role: userData?.role ?? null, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshUserData }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
