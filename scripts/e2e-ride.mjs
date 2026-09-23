/**
 * WINRIDER.AI production-like ride E2E harness.
 *
 * Required:
 * E2E_BASE_URL=https://...
 * E2E_PASSENGER_TOKEN=<Firebase ID token>
 * E2E_PASSENGER_UID=<uid>
 * E2E_DRIVER_TOKEN=<Firebase ID token>
 * E2E_DRIVER_UID=<uid>
 * E2E_COMPLETION_PROOF_URL=https://...
 *
 * This creates real staging records. Do not point it at production unless the
 * account and environment are explicitly approved for a controlled test.
 */
const env = process.env;
const required = ['E2E_BASE_URL','E2E_PASSENGER_TOKEN','E2E_PASSENGER_UID','E2E_DRIVER_TOKEN','E2E_DRIVER_UID','E2E_COMPLETION_PROOF_URL'];
for (const k of required) if (!env[k]) throw new Error(`${k} is required`);
if (!/^https:\/\//.test(env.E2E_BASE_URL)) throw new Error('E2E_BASE_URL must be HTTPS');

const base = env.E2E_BASE_URL.replace(/\/$/, '');
const passengerHeaders = { 'content-type':'application/json', authorization:`Bearer ${env.E2E_PASSENGER_TOKEN}` };
const driverHeaders = { 'content-type':'application/json', authorization:`Bearer ${env.E2E_DRIVER_TOKEN}` };

async function request(path, init, expected=[200,201]) {
  const res = await fetch(base + path, init);
  const body = await res.json().catch(()=>({}));
  if (!expected.includes(res.status)) throw new Error(`${init?.method||'GET'} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}
function order(id) {
  return {
    id,
    serviceId:'knight',
    serviceTitle:'E2E Controlled Ride',
    serviceIconEmoji:'🛵',
    passengerUserId:env.E2E_PASSENGER_UID,
    passengerName:'E2E Passenger',
    pickupLocation:'E2E origin',
    dropoffLocation:'E2E destination',
    pickupCoord:{lat:13.7563,lng:100.5018},
    dropoffCoord:{lat:13.7600,lng:100.5100},
    distanceKm:1,
    fare:30,
    preferredDriverId:env.E2E_DRIVER_UID,
  };
}
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Happy path: create -> idempotent replay -> accept -> heading -> pickup -> transit -> complete.
const rideId = `e2e-happy-${suffix}`;
const create = await request('/api/orders',{method:'POST',headers:passengerHeaders,body:JSON.stringify(order(rideId))});
if (!create.order || create.order.id !== rideId) throw new Error('Create did not return the requested ride');
const replay = await request('/api/orders',{method:'POST',headers:passengerHeaders,body:JSON.stringify(order(rideId))});
if (!replay.idempotentReplay) throw new Error('Create replay was not idempotent');

await request(`/api/orders/${rideId}/accept`,{method:'POST',headers:driverHeaders,body:'{}'});
for (const status of ['heading_pickup','picked_up','in_transit']) {
  const result = await request(`/api/orders/${rideId}/step`,{method:'POST',headers:driverHeaders,body:JSON.stringify({status})});
  if (result.order?.status !== status) throw new Error(`Expected ${status}`);
}
await request(`/api/orders/${rideId}/completion-proof`,{method:'POST',headers:driverHeaders,body:JSON.stringify({proofUrl:env.E2E_COMPLETION_PROOF_URL,latitude:13.7600,longitude:100.5100})});
const completed = await request(`/api/orders/${rideId}/step`,{method:'POST',headers:driverHeaders,body:JSON.stringify({status:'completed'})});
if (completed.order?.status !== 'completed') throw new Error('Ride did not complete');

// Invalid backward/terminal transition must be rejected.
await request(`/api/orders/${rideId}/step`,{method:'POST',headers:driverHeaders,body:JSON.stringify({status:'in_transit'})},[409]);

// Cancellation path: a passenger may cancel a fresh request.
const cancelId = `e2e-cancel-${suffix}`;
await request('/api/orders',{method:'POST',headers:passengerHeaders,body:JSON.stringify(order(cancelId))});
const cancelled = await request(`/api/orders/${cancelId}/step`,{method:'POST',headers:passengerHeaders,body:JSON.stringify({status:'cancelled'})});
if (cancelled.order?.status !== 'cancelled') throw new Error('Ride did not cancel');

// Optional decline fixture: configure a pending ride that is currently offered to E2E_DRIVER_UID.
if (env.E2E_DECLINE_RIDE_ID) {
  await request(`/api/orders/${env.E2E_DECLINE_RIDE_ID}/decline`,{method:'POST',headers:driverHeaders,body:'{}'});
}

console.log(JSON.stringify({ok:true,happyRideId:rideId,cancelRideId:cancelId,declineRideId:env.E2E_DECLINE_RIDE_ID||null},null,2));
