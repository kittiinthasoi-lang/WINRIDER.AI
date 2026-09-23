import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserDoc, UserRole } from '../types/auth';
import {
  WinAuthUser,
  refreshWinAuthProfile,
  registerWinAuth,
  restoreWinAuthSession,
  signInWinAuth,
  signOutWinAuth,
} from '../auth/winAuthClient';
import { clearUserSession } from '../utils/userSession';

interface AuthContextType {
  firebaseUser: WinAuthUser | null;
  userData: UserDoc | null;
  role: UserRole | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, role: UserRole) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<WinAuthUser | null>(null);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    restoreWinAuthSession()
      .then(({ user, profile }) => {
        if (!active) return;
        setFirebaseUser(user);
        setUserData(profile);
      })
      .catch(() => {
        if (!active) return;
        setFirebaseUser(null);
        setUserData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user, profile } = await signInWinAuth(email, password);
      setFirebaseUser(user);
      setUserData(profile);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, role: UserRole) => {
    setLoading(true);
    try {
      const { user, profile } = await registerWinAuth(email, password, role);
      setFirebaseUser(user);
      setUserData(profile);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (_email: string) => {
    const error = new Error('การรีเซ็ตรหัสผ่านต้องให้แอดมินดำเนินการ');
    (error as any).code = 'WIN_AUTH_ADMIN_RESET_REQUIRED';
    throw error;
  };

  const signOut = async () => {
    setLoading(true);
    try {
      clearUserSession();
      await signOutWinAuth();
      setUserData(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (!firebaseUser) return;
    const { user, profile } = await refreshWinAuthProfile();
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
