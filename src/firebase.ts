import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import fallbackConfig from '../firebase-applet-config.json';
import { installGoogleMapsCostGuard } from './services/googleMapsCostGuard';
import { auth as winAuth } from './auth/winAuthClient';

const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket || 'decoded-robot-6lkcn.firebasestorage.app',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
};

const rawDbId = metaEnv.VITE_FIREBASE_DATABASE_ID || metaEnv.VITE_FIRESTORE_DATABASE_ID || fallbackConfig.firestoreDatabaseId;
const databaseId = (!rawDbId || rawDbId === '(default)') ? undefined : rawDbId;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
// Authentication is owned by WINRIDER server sessions. Firebase remains only for legacy data services during migration.
export const auth: any = winAuth;
export const authPersistenceReady = Promise.resolve();
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Prevent accidental Google Maps/Places/Routes request loops in the browser.
// This is an optimization/safety layer; Cloud billing quotas remain authoritative.
if (typeof window !== 'undefined') {
  installGoogleMapsCostGuard();

  getDocFromServer(doc(db, '_connection_test', 'ping')).catch((err) => {
    // Non-blocking connectivity test
    if (err?.message?.includes('the client is offline')) {
      console.warn('Firebase network warning:', err.message);
    }
  });
}

export default app;
