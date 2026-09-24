import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import fallbackConfig from '../firebase-applet-config.json';
import { installGoogleMapsCostGuard } from './services/googleMapsCostGuard';

// WINRIDER.AI is intentionally pinned to the Firebase project below.
// Google AI Studio or hosting environment variables must not silently redirect
// authentication to a different Firebase project.
const firebaseConfig = {
  apiKey: fallbackConfig.apiKey,
  authDomain: fallbackConfig.authDomain,
  projectId: fallbackConfig.projectId,
  storageBucket: fallbackConfig.storageBucket || 'decoded-robot-6lkcn.firebasestorage.app',
  messagingSenderId: fallbackConfig.messagingSenderId,
  appId: fallbackConfig.appId,
};

if (firebaseConfig.projectId !== 'decoded-robot-6lkcn') {
  throw new Error('WINRIDER_FIREBASE_PROJECT_MISMATCH');
}

const rawDbId = fallbackConfig.firestoreDatabaseId;
const databaseId = (!rawDbId || rawDbId === '(default)') ? undefined : rawDbId;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_AUTH_DOMAIN = firebaseConfig.authDomain;

export const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Firebase Auth persistence could not be enabled:', error);
});
export const storage = getStorage(app);
export const functions = getFunctions(app);

if (typeof window !== 'undefined') {
  installGoogleMapsCostGuard();

  getDocFromServer(doc(db, '_connection_test', 'ping')).catch((err) => {
    if (err?.message?.includes('the client is offline')) {
      console.warn('Firebase network warning:', err.message);
    }
  });
}

export default app;
