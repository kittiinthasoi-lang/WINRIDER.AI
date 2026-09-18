import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserDoc, UserRole } from '../types/auth';
import { seedFeeRulesIfEmpty } from '../services/feeRulesService';
import { UserSession, saveUserSession, clearUserSession } from '../utils/userSession';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: UserDoc | null;
  role: UserRole | null;
  loading: boolean;
  isDevAccount: boolean;
  activeDevAccount: UserSession | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithDevAccount: (account: UserSession) => void;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_STORAGE_KEY = 'WINRIDER_ACTIVE_DEV_ACCOUNT';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [activeDevAccount, setActiveDevAccount] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Auto-seed fee rules on startup
  useEffect(() => {
    seedFeeRulesIfEmpty();
  }, []);

  const signInWithDevAccount = (account: UserSession) => {
    try {
      localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(account));
      saveUserSession(account);
      setActiveDevAccount(account);

      const roleMap: Record<string, UserRole> = {
        driver: 'knight',
        customer: 'citizen',
        merchant: 'merchant',
        partner: 'partner',
      };

        const signInWithDevAccount = (account: UserSession) => {
    // 🛑 บล็อกการทำงานใน Production เพื่อความปลอดภัย
    if (import.meta.env.PROD) {
      console.warn("Dev mode disabled in production");
      return;
    }

    try {
      localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(account));
      saveUserSession(account);
      setActiveDevAccount(account);

      // แทนที่จะสร้าง devUserData ปลอมๆ ขึ้นมา
      // ให้ตั้งค่า userData เป็น null เพื่อให้ระบบไปดึงจากฐานข้อมูลจริง
      setUserData(null); 
      
      // เรายังคงเก็บ firebaseUser ไว้จำลองสถานะ Login
      setFirebaseUser({ uid: account.id, email: account.email } as FirebaseUser);
      
    } catch (error) {
      console.error("Dev login failed", error);
    }
  
        const signInWithDevAccount = (account: UserSession) => {
    if (import.meta.env.PROD) {
      console.warn("Dev mode disabled in production");
      return;
    }

    try {
      localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(account));
      saveUserSession(account);
      setActiveDevAccount(account);
      setUserData(null); 
setUserData(devUserData);

      setFirebaseUser({ 
        uid: account.id, 
        email: account.email || `${account.id}@dev.winrider.ai` 
      } as FirebaseUser);
      
      setLoading(false);
      
    } catch (error) {
      console.error("Dev login failed", error);
    }
  }; // ปีกกาปิดของฟังก์ชันอยู่ตรงนี้ (จบการทำงาน)

  // Restore dev account on initial load if present
  useEffect(() => {
    const savedDev = localStorage.getItem(DEV_STORAGE_KEY);
    if (savedDev) {
      try {
        const parsed = JSON.parse(savedDev) as UserSession;
        signInWithDevAccount(parsed);
      } catch (e) {
        localStorage.removeItem(DEV_STORAGE_KEY);
      }
    }
  }, []);

  const fetchUserProfile = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserData(snap.data() as UserDoc);
      } else {
        setUserData(null);
      }
    } catch (err) {
      console.warn('Error fetching user profile from Firestore:', err);
      setUserData(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Real user logged in, clear developer session
        localStorage.removeItem(DEV_STORAGE_KEY);
        setActiveDevAccount(null);
        setFirebaseUser(user);

        // Listen to live updates on users/{uid}
        const isSuperAdmin = user.email === 'kittiinthasoi@gmail.com' || user.email?.toLowerCase().includes('kittiinthasoi');
        const userRef = doc(db, 'users', user.uid);
        const unsubDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserDoc;
            if (isSuperAdmin && (!data.isAdmin || data.adminLevel !== 'super')) {
              const updatedAdmin = { ...data, isAdmin: true, adminLevel: 'super' };
              setUserData(updatedAdmin);
              try {
                await setDoc(userRef, { isAdmin: true, adminLevel: 'super' }, { merge: true });
              } catch (e) {
                // ignore
              }
            } else {
              setUserData(data);
            }
          } else {
            if (isSuperAdmin) {
              const defaultAdminDoc: UserDoc = {
                uid: user.uid,
                email: user.email!,
                displayName: user.displayName || 'Kitti Inthasoi (Super Admin)',
                phone: user.phoneNumber || '081-999-8888',
                role: 'partner',
                status: 'active',
                isAdmin: true,
                adminLevel: 'super',
                level: 1,
                xp: 0,
                rating: 5.0,
                avatarUrl: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setUserData(defaultAdminDoc);
              try {
                await setDoc(userRef, defaultAdminDoc, { merge: true });
              } catch (e) {
                console.warn('Auto provision admin doc error:', e);
              }
            } else {
              setUserData(null);
            }
          }
          setLoading(false);
        }, (err) => {
          console.warn('onSnapshot user error:', err);
          if (isSuperAdmin) {
            setUserData({
              uid: user.uid,
              email: user.email!,
              displayName: user.displayName || 'Kitti Inthasoi (Super Admin)',
              phone: '081-999-8888',
              role: 'partner',
              status: 'active',
              isAdmin: true,
              adminLevel: 'super',
              level: 1,
              xp: 0,
              rating: 5.0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            setLoading(false);
          } else {
            fetchUserProfile(user.uid).finally(() => setLoading(false));
          }
        });

        return () => unsubDoc();
      } else {
        // If developer account is active, do not overwrite it with null
        const savedDev = localStorage.getItem(DEV_STORAGE_KEY);
        if (savedDev) {
          try {
            const parsed = JSON.parse(savedDev) as UserSession;
            signInWithDevAccount(parsed);
            return;
          } catch {
            localStorage.removeItem(DEV_STORAGE_KEY);
          }
        }
        setUserData(null);
        setFirebaseUser(null);
        setActiveDevAccount(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    localStorage.removeItem(DEV_STORAGE_KEY);
    setActiveDevAccount(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    localStorage.removeItem(DEV_STORAGE_KEY);
    setActiveDevAccount(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    localStorage.removeItem(DEV_STORAGE_KEY);
    setActiveDevAccount(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      localStorage.removeItem(DEV_STORAGE_KEY);
      setActiveDevAccount(null);
      clearUserSession();
      if (auth.currentUser) {
        await fbSignOut(auth);
      }
      setUserData(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (firebaseUser) {
      await fetchUserProfile(firebaseUser.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userData,
        role: userData?.role || null,
        loading,
        isDevAccount: !!activeDevAccount,
        activeDevAccount,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithDevAccount,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

