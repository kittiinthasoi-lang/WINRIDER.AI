import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const COLLECTION = 'account_preferences';

function currentUid(): string {
  const uid = auth.currentUser?.uid || '';
  if (!uid) throw new Error('ต้องเข้าสู่ระบบก่อนจึงจะบันทึกข้อมูลประจำบัญชีได้');
  return uid;
}

export async function loadAccountPreference<T>(key: string): Promise<T | null> {
  const uid = currentUid();
  const snap = await getDoc(doc(db, COLLECTION, uid, 'items', key));
  if (!snap.exists()) return null;
  return (snap.data().value ?? null) as T | null;
}

export async function saveAccountPreference<T>(key: string, value: T): Promise<void> {
  const uid = currentUid();
  await setDoc(
    doc(db, COLLECTION, uid, 'items', key),
    { value, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}