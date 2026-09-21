import { auth } from '../firebase';

export type SosIncident = {
  id: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'cancelled';
  latitude?: number;
  longitude?: number;
  note?: string;
  createdAt: string;
};

async function headers() {
  const user = auth.currentUser;
  if (!user) throw new Error('ต้องเข้าสู่ระบบก่อน');
  return { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' };
}

export async function createSosIncident(params: { latitude?: number; longitude?: number; note?: string }) {
  const response = await fetch('/api/sos/incidents', { method: 'POST', headers: await headers(), body: JSON.stringify(params) });
  if (!response.ok) throw new Error(`SOS_CREATE_${response.status}`);
  return response.json() as Promise<{ incident: SosIncident }>;
}

export async function getMySosIncidents() {
  const response = await fetch('/api/sos/incidents', { headers: await headers() });
  if (!response.ok) throw new Error(`SOS_LIST_${response.status}`);
  return response.json() as Promise<{ incidents: SosIncident[] }>;
}
