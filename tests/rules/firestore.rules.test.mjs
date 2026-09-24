import test, { after } from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-winrider-rules';
const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const env = await initializeTestEnvironment({ projectId, firestore: { rules } });
after(async () => { await env.cleanup(); });

async function seed(path, value) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), value);
  });
}

test('owner profile update cannot elevate privilege fields', async () => {
  await env.clearFirestore();
  await seed('users/alice', { role:'citizen', status:'active', xp:0, displayName:'Alice' });
  const db = env.authenticatedContext('alice', { email:'alice@example.test' }).firestore();

  await assertSucceeds(updateDoc(doc(db,'users/alice'), { displayName:'Alice Updated' }));
  await assertFails(updateDoc(doc(db,'users/alice'), { role:'admin' }));
  await assertFails(updateDoc(doc(db,'users/alice'), { admin:true }));
  await assertFails(updateDoc(doc(db,'users/alice'), { adminLevel:'super' }));
  await assertFails(updateDoc(doc(db,'users/alice'), { xp:999999 }));
  await assertFails(updateDoc(doc(db,'users/alice'), { status:'active', level:100 }));
});

test('client cannot write rides, wallets, ledgers or audit logs', async () => {
  await env.clearFirestore();
  const db = env.authenticatedContext('alice').firestore();

  await assertFails(setDoc(doc(db,'rides/ride-1'), { passengerUserId:'alice', fare:30, status:'pending' }));
  await assertFails(setDoc(doc(db,'wallets/alice'), { userId:'alice', balanceSatang:999999 }));
  await assertFails(setDoc(doc(db,'ledger/entry-1'), { userId:'alice', amountSatang:1 }));
  await assertFails(setDoc(doc(db,'ledger_entries/entry-1'), { userId:'alice', amountSatang:1 }));
  await assertFails(setDoc(doc(db,'audit_logs/log-1'), { actorUid:'alice', action:'FAKE' }));
});

test('account preferences are owner-scoped', async () => {
  await env.clearFirestore();
  const alice = env.authenticatedContext('alice').firestore();
  const bob = env.authenticatedContext('bob').firestore();

  await assertSucceeds(setDoc(doc(alice,'account_preferences/alice'), { theme:'dark' }));
  assert.equal((await assertSucceeds(getDoc(doc(alice,'account_preferences/alice')))).data()?.theme, 'dark');
  await assertFails(getDoc(doc(bob,'account_preferences/alice')));
  await assertFails(setDoc(doc(bob,'account_preferences/alice'), { theme:'light' }));
});

test('knight cannot self-approve KYC or manipulate dispatch privilege fields', async () => {
  await env.clearFirestore();
  await seed('knights/knight-1', { kycStatus:'pending_review', level:1, activeRideId:null, displayName:'Knight' });
  const db = env.authenticatedContext('knight-1').firestore();

  await assertSucceeds(updateDoc(doc(db,'knights/knight-1'), {
    profileCustomization: { displayName:'Knight Updated' }
  }));
  await assertFails(updateDoc(doc(db,'knights/knight-1'), { displayName:'Knight Privilege Bypass' }));
  await assertFails(updateDoc(doc(db,'knights/knight-1'), { kycStatus:'approved' }));
  await assertFails(updateDoc(doc(db,'knights/knight-1'), { level:100 }));
  await assertFails(updateDoc(doc(db,'knights/knight-1'), { activeRideId:'ride-admin-injected' }));
  await assertFails(updateDoc(doc(db,'knights/knight-1'), { dispatchJobsAccepted:999 }));
});

test('privileged moderation remains server-authoritative even for an admin client', async () => {
  await env.clearFirestore();
  await seed('users/alice', { role:'citizen', status:'active' });
  const adminDb = env.authenticatedContext('admin-1', { admin:true, adminLevel:'super' }).firestore();
  await assertFails(updateDoc(doc(adminDb,'users/alice'), { status:'suspended' }));
});
