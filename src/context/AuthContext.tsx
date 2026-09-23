import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserDoc, UserRole } from '../types/auth';
import { clearUserSession } from '../utils/userSession';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: UserDoc | null;
  role: UserRole | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInAsOwner: () => Promise<void>;
  signInWithAdminEmail: (email: string) => Promise<void>;
  saveUserProfile: (profile: Partial<UserDoc>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid: string) => {
    try {
      const snapshot = await getDoc(doc(db, 'users', uid));
      if (snapshot.exists()) {
        const d = snapshot.data() as UserDoc;
        setUserData(d);
        try {
          localStorage.setItem(`WINRIDER_USER_DOC_${uid}`, JSON.stringify(d));
        } catch {}
      }
    } catch (err) {
      console.warn('fetchUserProfile non-fatal notice:', err);
    }
  };

  useEffect(() => {
    // Check for saved sovereign owner session on initial load
    let hasSavedOwnerSession = false;
    try {
      const savedRaw = localStorage.getItem('WINRIDER_SOVEREIGN_AUTH');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed?.token && parsed?.user) {
          hasSavedOwnerSession = true;
          const ownerUser = {
            uid: parsed.user.uid,
            email: parsed.user.email,
            displayName: parsed.user.displayName,
            photoURL: null,
            metadata: { creationTime: parsed.user.createdAt || new Date().toISOString() },
            getIdToken: async () => parsed.token as string,
            getIdTokenResult: async () => ({
              token: parsed.token,
              claims: { admin: true, adminLevel: 'super', email: parsed.user.email },
            }),
          } as unknown as FirebaseUser;

          setFirebaseUser(ownerUser);
          setUserData({
            uid: parsed.user.uid,
            email: parsed.user.email,
            displayName: parsed.user.displayName,
            role: 'knight',
            isAdmin: true,
            adminLevel: 'super',
            status: 'active',
            phone: '081-999-9999',
            level: 100,
            xp: 99999,
            rating: 5.0,
            createdAt: parsed.user.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn('Failed reading saved owner session:', e);
    }

    // Process any returning Google Redirect result
    import('firebase/auth').then(({ getRedirectResult }) => {
      getRedirectResult(auth).catch(() => {});
    });

    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      if (user) {
        setFirebaseUser(user);
        const isOwner = user.email?.toLowerCase() === 'kittiinthasoi@gmail.com' ||
          user.email?.toLowerCase().includes('kittiinthasoi');

        // Immediately attempt fast cache read to prevent blank/flicker
        try {
          const cachedRaw = localStorage.getItem(`WINRIDER_USER_DOC_${user.uid}`);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached && (cached.role || cached.uid)) {
              setUserData(cached);
              setLoading(false);
            }
          }
        } catch {}

        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserDoc;
            let finalDoc: UserDoc;
            if (isOwner) {
              finalDoc = {
                ...data,
                displayName: 'กิตติ อินทะสร้อย',
                isAdmin: true,
                adminLevel: 'super',
                role: data.role || 'knight',
                level: 100,
                rating: 5.0,
              };
            } else {
              finalDoc = data;
            }
            setUserData(finalDoc);
            try {
              localStorage.setItem(`WINRIDER_USER_DOC_${user.uid}`, JSON.stringify(finalDoc));
            } catch {}
          } else {
            // Document not yet created or pending sync
            let hasRestored = false;
            try {
              const cachedRaw = localStorage.getItem(`WINRIDER_USER_DOC_${user.uid}`);
              if (cachedRaw) {
                const cached = JSON.parse(cachedRaw);
                if (cached && cached.role) {
                  setUserData(cached);
                  setDoc(doc(db, 'users', user.uid), cached, { merge: true }).catch(() => {});
                  hasRestored = true;
                }
              }
            } catch {}

            if (!hasRestored) {
              if (isOwner) {
                const defaultAdminUser: UserDoc = {
                  uid: user.uid,
                  email: user.email || 'kittiinthasoi@gmail.com',
                  displayName: 'กิตติ อินทะสร้อย',
                  role: 'knight',
                  isAdmin: true,
                  adminLevel: 'super',
                  status: 'active',
                  phone: '081-999-9999',
                  level: 100,
                  xp: 99999,
                  rating: 5.0,
                  createdAt: user.metadata.creationTime || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setUserData(defaultAdminUser);
                try {
                  localStorage.setItem(`WINRIDER_USER_DOC_${user.uid}`, JSON.stringify(defaultAdminUser));
                } catch {}
                setDoc(doc(db, 'users', user.uid), defaultAdminUser, { merge: true }).catch(() => {});
              } else {
                setUserData(null);
              }
            }
          }
          setLoading(false);
        }, (error) => {
          console.warn('User profile document notice:', error);
          let cached: UserDoc | null = null;
          try {
            const cachedRaw = localStorage.getItem(`WINRIDER_USER_DOC_${user.uid}`);
            if (cachedRaw) cached = JSON.parse(cachedRaw);
          } catch {}

          if (cached && cached.role) {
            setUserData(cached);
          } else if (isOwner) {
            setUserData({
              uid: user.uid,
              email: user.email || 'kittiinthasoi@gmail.com',
              displayName: 'กิตติ อินทะสร้อย',
              role: 'knight',
              isAdmin: true,
              adminLevel: 'super',
              status: 'active',
              phone: '081-999-9999',
              level: 100,
              xp: 99999,
              rating: 5.0,
              createdAt: user.metadata.creationTime || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            setUserData(null);
          }
          setLoading(false);
        });
      } else {
        if (!hasSavedOwnerSession) {
          setFirebaseUser(null);
          setUserData(null);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogleRedirect = async () => {
    const { signInWithRedirect } = await import('firebase/auth');
    await signInWithRedirect(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithAdminEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isOwner = cleanEmail === 'kittiinthasoi@gmail.com' || cleanEmail.includes('kittiinthasoi');
    if (!isOwner) {
      throw new Error('อีเมลนี้ไม่ใช่บัญชีแอดมินสูงสุดของระบบ');
    }
    const res = await fetch('/api/auth/admin-email-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(data.error || 'เข้าสู่ระบบแอดมินไม่สำเร็จ');
    }

    const ownerUser = {
      uid: data.user.uid,
      email: data.user.email,
      displayName: data.user.displayName,
      photoURL: null,
      metadata: { creationTime: data.user.createdAt || new Date().toISOString() },
      getIdToken: async () => data.token as string,
      getIdTokenResult: async () => ({
        token: data.token,
        claims: { admin: true, adminLevel: 'super', email: data.user.email },
      }),
    } as unknown as FirebaseUser;

    const userDoc: UserDoc = {
      uid: data.user.uid,
      email: data.user.email,
      displayName: data.user.displayName,
      role: 'knight',
      isAdmin: true,
      adminLevel: 'super',
      status: 'active',
      phone: '081-999-9999',
      level: 100,
      xp: 99999,
      rating: 5.0,
      createdAt: data.user.createdAt || new Date().toISOString(),
      updatedAt: data.user.updatedAt || new Date().toISOString(),
    };

    try {
      localStorage.setItem('WINRIDER_SOVEREIGN_AUTH', JSON.stringify({ token: data.token, user: data.user }));
      localStorage.setItem(`WINRIDER_USER_DOC_${data.user.uid}`, JSON.stringify(userDoc));
    } catch {}

    setFirebaseUser(ownerUser);
    setUserData(userDoc);
  };

  const signInAsOwner = async () => {
    await signInWithAdminEmail('kittiinthasoi@gmail.com');
  };

  const saveUserProfile = async (profile: Partial<UserDoc>) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const isOwner = firebaseUser.email?.toLowerCase() === 'kittiinthasoi@gmail.com' ||
      firebaseUser.email?.toLowerCase().includes('kittiinthasoi');

    const updated: UserDoc = {
      ...(userData || {}),
      ...profile,
      uid,
      email: firebaseUser.email || (userData?.email ?? ''),
      displayName: isOwner ? 'กิตติ อินทะสร้อย' : (profile.displayName || userData?.displayName || firebaseUser.displayName || 'ผู้ใช้งาน'),
      isAdmin: isOwner ? true : (profile.isAdmin ?? userData?.isAdmin ?? false),
      adminLevel: isOwner ? 'super' : (profile.adminLevel ?? userData?.adminLevel),
      updatedAt: new Date().toISOString(),
    } as UserDoc;

    setUserData(updated);
    try {
      localStorage.setItem(`WINRIDER_USER_DOC_${uid}`, JSON.stringify(updated));
    } catch {}

    try {
      await setDoc(doc(db, 'users', uid), updated, { merge: true });
    } catch (e) {
      console.warn('Direct Firestore save failed, syncing with server fallback:', e);
    }

    try {
      const token = await firebaseUser.getIdToken();
      await fetch('/api/users/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updated),
      });
    } catch (apiErr) {
      console.warn('Server profile sync warning:', apiErr);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('WINRIDER_SOVEREIGN_AUTH');
      clearUserSession();
      await firebaseSignOut(auth).catch(() => {});
      setUserData(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (firebaseUser) await fetchUserProfile(firebaseUser.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userData,
        role: userData?.role ?? null,
        loading,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signInWithEmail,
        signUpWithEmail,
        signInAsOwner,
        signInWithAdminEmail,
        saveUserProfile,
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
