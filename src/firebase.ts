import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import fallbackConfig from '../firebase-applet-config.json';
import { installGoogleMapsCostGuard } from './services/googleMapsCostGuard';

const FIREBASE_APP_NAME = 'winrider-decoded-robot-6lkcn';
const FIREBASE_PROJECT_ID = 'decoded-robot-6lkcn';
const FIREBASE_AUTH_DOMAIN = 'decoded-robot-6lkcn.firebaseapp.com';

// This auth runtime is pinned to the WINRIDER Firebase project. We intentionally
// use a named Firebase app so an older/default app left alive by AI Studio HMR
// cannot redirect Google Authentication to another Firebase project.
const firebaseConfig = {
  apiKey: fallbackConfig.apiKey,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: 'decoded-robot-6lkcn.firebasestorage.app',
  messagingSenderId: '522447939215',
  appId: '1:522447939215:web:3c3f76e8251a2ad32cf2fa',
};

if (
  fallbackConfig.projectId !== FIREBASE_PROJECT_ID ||
  fallbackConfig.authDomain !== FIREBASE_AUTH_DOMAIN
) {
  throw new Error('WINRIDER_FIREBASE_CONFIG_MISMATCH');
}

const rawDbId = fallbackConfig.firestoreDatabaseId;
const databaseId = (!rawDbId || rawDbId === '(default)') ? undefined : rawDbId;

const app = getApps().some((candidate) => candidate.name === FIREBASE_APP_NAME)
  ? getApp(FIREBASE_APP_NAME)
  : initializeApp(firebaseConfig, FIREBASE_APP_NAME);

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);
export { FIREBASE_PROJECT_ID, FIREBASE_AUTH_DOMAIN };
export const FIREBASE_GOOGLE_REDIRECT_HANDLER = `https://${FIREBASE_AUTH_DOMAIN}/__/auth/handler`;

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
