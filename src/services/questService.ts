import { auth } from '../firebase';

export const QUEST_SEASON_ID = '2026-S3';

export type QuestMetricEvent = {
  metricKey: string;
  amount?: number;
  eventId?: string;
};

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('ต้องเข้าสู่ระบบก่อน');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function loadQuestState(uid: string) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) return { seasonId: QUEST_SEASON_ID, progress: {}, claimed: [] };
  const response = await fetch(`/api/quests/state?season=${encodeURIComponent(QUEST_SEASON_ID)}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(`QUEST_STATE_${response.status}`);
  const data = await response.json();
  return {
    seasonId: data.seasonId || QUEST_SEASON_ID,
    progress: { ...(data.lifetime || {}), ...(data.weekly || {}), ...(data.daily || {}) },
    daily: data.daily || {},
    weekly: data.weekly || {},
    lifetime: data.lifetime || {},
    claimed: Object.keys(data.claimed || {}),
  };
}

export async function saveQuestState() {
  // Quest state is server-authoritative. This function remains as a compatibility
  // no-op so legacy callers cannot bypass server validation.
  return loadQuestState(auth.currentUser?.uid || '');
}

export async function recordQuestMetric(event: QuestMetricEvent) {
  if (!auth.currentUser || !event.metricKey) return null;
  const response = await fetch('/api/quests/event', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      metricKey: event.metricKey,
      amount: Math.min(5, Math.max(1, Math.floor(event.amount ?? 1))),
      ...(event.eventId ? { eventId: event.eventId } : {}),
    }),
  });
  if (!response.ok) throw new Error(`QUEST_EVENT_${response.status}`);
  const data = await response.json();
  return Number(data.value) || 0;
}

export async function claimQuest(questId: string) {
  const response = await fetch('/api/quests/claim', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ questId }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(String(payload.error || `QUEST_CLAIM_${response.status}`));
  }
  return response.json();
}

export function emitQuestMetric(metricKey: string, amount = 1, eventId?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('winrider:quest-metric', {
      detail: { metricKey, amount, eventId }
    }));
  }
  return recordQuestMetric({ metricKey, amount, eventId }).catch(error => {
    console.warn('Quest metric persistence failed:', error);
    return null;
  });
}
