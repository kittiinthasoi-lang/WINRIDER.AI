import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const QUEST_SEASON_ID = '2026-S3';

export type QuestMetricEvent = {
  metricKey: string;
  amount?: number;
};

export async function loadQuestState(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid, 'progression', QUEST_SEASON_ID));
  return snap.exists() ? snap.data() : { seasonId: QUEST_SEASON_ID, progress: {}, claimed: [] };
}

export async function saveQuestState(uid: string, state: { progress?: Record<string, number>; claimed?: string[] }) {
  await setDoc(doc(db, 'users', uid, 'progression', QUEST_SEASON_ID), {
    seasonId: QUEST_SEASON_ID,
    progress: state.progress || {},
    claimed: state.claimed || [],
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function recordQuestMetric(event: QuestMetricEvent) {
  const user = auth.currentUser;
  if (!user || !event.metricKey) return null;
  const current = await loadQuestState(user.uid);
  const progress = { ...(current.progress || {}) };
  progress[event.metricKey] = (Number(progress[event.metricKey]) || 0) + Math.max(0, event.amount ?? 1);
  await saveQuestState(user.uid, { progress, claimed: current.claimed || [] });
  return progress[event.metricKey];
}

export async function claimQuest(questId: string, rewardXp: number, metricKey: string, totalRequired: number) {
  const user = auth.currentUser;
  if (!user) throw new Error('ต้องเข้าสู่ระบบก่อนรับรางวัล');
  const current = await loadQuestState(user.uid);
  const claimed = new Set<string>(current.claimed || []);
  if (claimed.has(questId)) return { alreadyClaimed: true };

  const progress = Number((current.progress || {})[metricKey]) || 0;
  if (progress < totalRequired) throw new Error('ภารกิจยังไม่ถึงเป้าหมาย');

  claimed.add(questId);
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() || {};

  await saveQuestState(user.uid, { progress: current.progress || {}, claimed: Array.from(claimed) });
  await setDoc(userRef, {
    xp: (Number(userData.xp) || 0) + rewardXp,
    questSeason: QUEST_SEASON_ID,
    missionsCompleted: (Number(userData.missionsCompleted) || 0) + 1,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return { alreadyClaimed: false };
}


export function emitQuestMetric(metricKey: string, amount = 1) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('winrider:quest-metric', { detail: { metricKey, amount } }));
  }
  return recordQuestMetric({ metricKey, amount }).catch(error => {
    console.warn('Quest metric persistence failed:', error);
    return null;
  });
}
