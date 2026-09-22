import { buildWebhookPayload, dispatchToWebhook, isAutoDispatchEnabled } from './webhookDispatcher';
import { emitQuestMetric } from '../services/questService';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface LiveRideOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceIconEmoji: string;
  passengerUserId?: string;
  passengerName: string;
  passengerPhone: string;
  passengerAvatarEmoji?: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fare: number;
  welfareFund2Baht: number; // 2.00 Baht
  netFare: number;
  estMinutes: number;
  status: 'pending' | 'accepted' | 'heading_pickup' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  // Driver Info (once accepted)
  driverUserId?: string;
  driverName?: string;
  driverLevel?: number;
  driverPhone?: string;
  driverAvatarEmoji?: string;
  driverPlate?: string;
  driverVehicle?: string;
  driverRating?: number;
  // Trip details
  tipAmount?: number;
  tips?: number;
  platformFee?: number;
  settled?: boolean;
  settlementStatus?: 'PENDING' | 'SETTLED';
  ledgerTransactionId?: string;
  fareSatang?: number;
  tipSatang?: number;
  citizenFeeSatang?: number;
  citizenTotalPaidSatang?: number;
  knightFeeSatang?: number;
  equipmentFeeSatang?: number;
  knightPayoutSatang?: number;
  ratingGiven?: number;
  reviewComment?: string;
  pickupCoord?: { lat: number; lng: number };
  dropoffCoord?: { lat: number; lng: number };
  customerGender?: 'female' | 'male';
  preferredDriverId?: string;
  offeredDriverId?: string;
  offerExpiresAt?: string;
  dispatchMode?: 'preferred' | 'automatic';
}

type OrderEventCallback = (order: LiveRideOrder, eventType: 'created' | 'accepted' | 'step_changed' | 'completed') => void;

const STORAGE_KEY_ORDERS = 'winrider_live_orders_list';
const BROADCAST_CHANNEL_NAME = 'winrider_dispatch_sync_channel';
const DISPATCH_FRESHNESS_MS = 15 * 60 * 1000;

// Singleton Broadcast Channel
let broadcastChannel: BroadcastChannel | null = null;
const listeners: Set<OrderEventCallback> = new Set();

function isValidLiveOrder(value: unknown): value is LiveRideOrder {
  if (!value || typeof value !== 'object') return false;
  const order = value as Partial<LiveRideOrder>;
  return Boolean(
    order.id &&
    order.passengerUserId &&
    order.passengerName &&
    order.pickupLocation &&
    order.dropoffLocation &&
    Number.isFinite(Number(order.fare)) &&
    ['pending', 'accepted', 'heading_pickup', 'picked_up', 'in_transit', 'completed', 'cancelled'].includes(String(order.status))
  );
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = (e) => {
        if (e.data && isValidLiveOrder(e.data.order) && e.data.type) {
          listeners.forEach((cb) => {
            try {
              cb(e.data.order, e.data.type);
            } catch (err) {
              console.error('Listener callback error:', err);
            }
          });
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel not supported or error:', err);
    }
  }
  return broadcastChannel;
}

// Listen to storage events for cross-tab sync fallback
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'winrider_last_order_event' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data && isValidLiveOrder(data.order) && data.type) {
          listeners.forEach((cb) => cb(data.order, data.type));
        }
      } catch (err) {
        console.error('Storage sync error:', err);
      }
    }
  });
}

function broadcastEvent(order: LiveRideOrder, type: 'created' | 'accepted' | 'step_changed' | 'completed') {
  const channel = getChannel();
  if (channel) {
    channel.postMessage({ order, type, timestamp: Date.now() });
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      'winrider_last_order_event',
      JSON.stringify({ order, type, timestamp: Date.now() })
    );
  }
  listeners.forEach((cb) => {
    try {
      cb(order, type);
    } catch (err) {
      console.error(err);
    }
  });
}

export function subscribeToLiveOrders(callback: OrderEventCallback): () => void {
  getChannel(); // ensure channel initialized
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getLocalLiveOrders(): LiveRideOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidLiveOrder) : [];
  } catch {
    return [];
  }
}

export function saveLocalLiveOrders(orders: LiveRideOrder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders.slice(0, 30)));
}

/**
 * Fetch available orders for driver from server or local store fallback
 */
export async function fetchAvailableOrdersForDriver(): Promise<LiveRideOrder[]> {
  try {
    const headers = await getAuthHeaders();
    const currentUserId = getAuth().currentUser?.uid;
    const res = await fetch('/api/orders?scope=dispatch', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.orders)) {
        const freshnessCutoff = Date.now() - DISPATCH_FRESHNESS_MS;
        return (data.orders as LiveRideOrder[]).filter((order) => {
          const createdAtMs = Date.parse(order.createdAt);
          return isValidLiveOrder(order)
            && order.status === 'pending'
            && order.passengerUserId !== currentUserId
            && Number.isFinite(createdAtMs)
            && createdAtMs >= freshnessCutoff;
        });
      }
    }
  } catch (err) {
    console.warn('Unable to load live dispatch orders:', err);
  }
  return [];
}

/**
 * 1. Passenger creates order -> triggers real-time broadcast and auto-webhook
 */
export async function createLiveOrder(orderInput: {
  serviceId: string;
  serviceTitle: string;
  serviceIconEmoji: string;
  passengerUserId?: string;
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fare: number;
  estMinutes?: number;
  pickupCoord: { lat: number; lng: number };
  dropoffCoord?: { lat: number; lng: number };
  customerGender?: 'female' | 'male';
  preferredDriverId?: string;
}): Promise<LiveRideOrder> {
  // The verified Firebase UID is the only valid owner identifier. A profile or
  // legacy local session ID must never be used as the ride owner.
  const authenticatedUid = getAuth().currentUser?.uid;
  if (!authenticatedUid) throw new Error('AUTHENTICATED_PASSENGER_REQUIRED');
  const now = new Date().toISOString();
  const orderId = `WIN-${crypto.randomUUID()}`;
  const fare = Number(orderInput.fare);
  if (!Number.isFinite(fare) || fare <= 0) throw new Error('INVALID_REAL_ORDER_FARE');
  const welfareFund2Baht = 2.0;
  const netFare = Math.max(0, fare - welfareFund2Baht);

  const newOrder: LiveRideOrder = {
    id: orderId,
    serviceId: orderInput.serviceId,
    serviceTitle: orderInput.serviceTitle,
    serviceIconEmoji: orderInput.serviceIconEmoji || '🛵',
    passengerUserId: authenticatedUid,
    passengerName: orderInput.passengerName,
    passengerPhone: orderInput.passengerPhone,
    pickupLocation: orderInput.pickupLocation,
    dropoffLocation: orderInput.dropoffLocation,
    distanceKm: orderInput.distanceKm,
    fare,
    welfareFund2Baht,
    netFare,
    estMinutes: orderInput.estMinutes || Math.max(5, Math.round(orderInput.distanceKm * 3.5)),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    pickupCoord: orderInput.pickupCoord,
    ...(orderInput.dropoffCoord ? { dropoffCoord: orderInput.dropoffCoord } : {}),
    ...(orderInput.customerGender ? { customerGender: orderInput.customerGender } : {}),
    ...(orderInput.preferredDriverId ? { preferredDriverId: orderInput.preferredDriverId } : {}),
  };

  // Server API is the primary authority for ride creation.
  let persistedOrder: LiveRideOrder = newOrder;
  try {
    const createResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(newOrder),
    });

    if (createResponse.ok) {
      const createdServerOrder = await createResponse.json();
      persistedOrder = (createdServerOrder?.order || newOrder) as LiveRideOrder;
    } else {
      const failure = await createResponse.json().catch(() => ({})) as { error?: string; code?: string; activeOrderId?: string };
      const reason = failure.code || failure.error || `HTTP_${createResponse.status}`;
      
      // If server store is unavailable (e.g. during fresh deploy or ADC sync), fall back to client Firestore directly
      if (createResponse.status === 503 || reason.includes('ORDER_STORE_UNAVAILABLE')) {
        console.warn('[Dispatch] Server store unavailable, falling back to direct Firestore & local dispatch sync');
        persistedOrder = { ...newOrder, clientFallbackCreated: true } as any;
      } else {
        throw new Error(`ORDER_CREATE_FAILED:${reason}${failure.activeOrderId ? `:${failure.activeOrderId}` : ''}`);
      }
    }
  } catch (err: any) {
    if (err?.message?.startsWith('ORDER_CREATE_FAILED:')) {
      throw err;
    }
    console.warn('[Dispatch] Network/Server order dispatch error, falling back to direct client persistence:', err);
    persistedOrder = { ...newOrder, clientFallbackCreated: true } as any;
  }

  // Dual sync: Persist directly to client Firestore so the document is always safely stored
  try {
    const rideRef = doc(db, 'rides', persistedOrder.id);
    await setDoc(rideRef, {
      ...persistedOrder,
      clientSyncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (firestoreClientErr) {
    console.warn('[Client Firestore Sync]:', firestoreClientErr);
  }

  const orders = getLocalLiveOrders();
  orders.unshift(persistedOrder);
  saveLocalLiveOrders(orders);

  // Broadcast to other tabs
  broadcastEvent(persistedOrder, 'created');

  // Trigger Low-Code Webhook (Make.com, Zapier, Google Sheets, LINE OA)
  if (isAutoDispatchEnabled()) {
    const payload = buildWebhookPayload({
      event: 'order_created',
      orderId: newOrder.id,
      passengerUserId: newOrder.passengerUserId,
      passengerName: newOrder.passengerName,
      passengerPhone: newOrder.passengerPhone,
      serviceTitle: newOrder.serviceTitle,
      pickupLocation: newOrder.pickupLocation,
      dropoffLocation: newOrder.dropoffLocation,
      distanceKm: newOrder.distanceKm,
      fare: newOrder.fare,
      status: 'pending',
    });
    dispatchToWebhook(payload).catch((e) => console.warn('Webhook auto-dispatch:', e));
  }

  return persistedOrder;
}

/**
 * 2. Knight Driver accepts order -> updates status, broadcasts to passenger tab, sends webhook
 */
export async function acceptLiveOrder(
  orderId: string,
  driverInfo: {
    driverUserId?: string;
    driverName: string;
    driverLevel: number;
    driverPhone?: string;
    driverPlate?: string;
    driverAvatarEmoji?: string;
    driverVehicle?: string;
  }
): Promise<LiveRideOrder | null> {
  // Server API is the single source of truth for acceptance.
  const acceptResponse = await fetch(`/api/orders/${orderId}/accept`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({}),
  });
  if (!acceptResponse.ok) {
    const failure = await acceptResponse.json().catch(() => ({})) as { error?: string; code?: string };
    const reason = failure.code || failure.error || `HTTP_${acceptResponse.status}`;
    throw new Error(`ORDER_ACCEPT_FAILED:${reason}`);
  }
  const acceptedServerOrder = await acceptResponse.json();
  if (!isValidLiveOrder(acceptedServerOrder?.order)) return null;
  const targetOrder = acceptedServerOrder.order as LiveRideOrder;
  const orders = getLocalLiveOrders().filter((order) => order.id !== targetOrder.id);
  orders.unshift(targetOrder);
  saveLocalLiveOrders(orders);

  // Broadcast event
  broadcastEvent(targetOrder, 'accepted');

  // Trigger Webhook for acceptance
  if (isAutoDispatchEnabled()) {
    const payload = buildWebhookPayload({
      event: 'order_accepted',
      orderId: targetOrder.id,
      passengerName: targetOrder.passengerName,
      passengerPhone: targetOrder.passengerPhone,
      serviceTitle: targetOrder.serviceTitle,
      pickupLocation: targetOrder.pickupLocation,
      dropoffLocation: targetOrder.dropoffLocation,
      distanceKm: targetOrder.distanceKm,
      fare: targetOrder.fare,
      status: 'accepted',
      driverName: targetOrder.driverName,
      driverLevel: targetOrder.driverLevel,
      driverPlate: targetOrder.driverPlate,
    });
    dispatchToWebhook(payload).catch((e) => console.warn('Webhook auto-dispatch:', e));
  }

  return targetOrder;
}

/**
 * Filter orders strictly by passengerUserId for individual user privacy
 */
export function getOrdersForPassenger(userId: string): LiveRideOrder[] {
  if (!userId) return [];
  const all = getLocalLiveOrders();
  return all.filter((o) => o.passengerUserId === userId);
}

/**
 * Filter orders strictly by driverUserId
 */
export function getOrdersForDriver(driverUserId: string): LiveRideOrder[] {
  if (!driverUserId) return [];
  const all = getLocalLiveOrders();
  return all.filter((o) => o.driverUserId === driverUserId);
}

/**
 * Fetch orders from Firestore for specific user
 */
export async function fetchFirestoreOrdersForUser(userId: string, role: 'customer' | 'driver' = 'customer'): Promise<LiveRideOrder[]> {
  if (!userId) return [];
  try {
    const fieldName = role === 'driver' ? 'driverUserId' : 'passengerUserId';
    const q = query(collection(db, 'rides'), where(fieldName, '==', userId));
    const snap = await getDocs(q);
    const results: LiveRideOrder[] = [];
    snap.forEach((doc) => {
      results.push(doc.data() as LiveRideOrder);
    });
    return results;
  } catch (e) {
    console.warn('Firestore fetch user orders error:', e);
    return role === 'driver' ? getOrdersForDriver(userId) : getOrdersForPassenger(userId);
  }
}

/**
 * 3. Driver advances step -> broadcasts step change
 */
export async function advanceLiveOrderStep(
  orderId: string,
  newStatus: LiveRideOrder['status']
): Promise<LiveRideOrder | null> {
  const stepResponse = await fetch(`/api/orders/${orderId}/step`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ status: newStatus }),
  });
  if (!stepResponse.ok) {
    throw new Error(`ORDER_STEP_FAILED_${stepResponse.status}`);
  }
  const payload = await stepResponse.json();
  if (!isValidLiveOrder(payload?.order)) return null;
  const updatedOrder = payload.order as LiveRideOrder;
  if (newStatus === 'completed') {
    void emitQuestMetric('driver.completed_trip', 1);
    if (Number.isFinite(updatedOrder.distanceKm) && Number.isFinite(updatedOrder.estMinutes)) void emitQuestMetric('driver.routed_trip', 1);
    if (['spirit', 'family', 'pet', 'express'].includes(String(updatedOrder.serviceId).toLowerCase())) void emitQuestMetric('driver.special_service', 1);
  }
  const orders = getLocalLiveOrders().filter((order) => order.id !== orderId);
  orders.unshift(updatedOrder);
  saveLocalLiveOrders(orders);

  broadcastEvent(updatedOrder, 'step_changed');
  return updatedOrder;
}

export async function declineLiveOrder(orderId: string): Promise<void> {
  const response = await fetch(`/api/orders/${orderId}/decline`, {
    method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`ORDER_DECLINE_FAILED_${response.status}`);
}

export async function cancelLiveOrder(orderId: string): Promise<LiveRideOrder | null> {
  return advanceLiveOrderStep(orderId, 'cancelled');
}

export interface DriverLiveLocation {
  lat: number;
  lng: number;
  timestamp?: string;
}

export async function fetchDriverLiveLocation(driverUserId: string): Promise<DriverLiveLocation | null> {
  if (!driverUserId) return null;
  try {
    const response = await fetch(`/api/knights/${encodeURIComponent(driverUserId)}/location`, { headers: await getAuthHeaders() });
    if (!response.ok) return null;
    const payload = await response.json();
    const location = payload?.location;
    if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return null;
    return { lat: Number(location.lat), lng: Number(location.lng), timestamp: location.timestamp };
  } catch { return null; }
}

export async function updateDriverPresence(input: {
  isOnline: boolean;
  latitude?: number;
  longitude?: number;
  activeVehicleId?: string;
}): Promise<void> {
  const response = await fetch('/api/knights/presence', {
    method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(`DRIVER_PRESENCE_FAILED_${response.status}:${payload.error || 'Unknown error'}`);
  }
}

export async function fetchMyOrders(): Promise<LiveRideOrder[]> {
  const response = await fetch('/api/orders', { headers: await getAuthHeaders() });
  if (!response.ok) throw new Error(`ORDER_FETCH_FAILED_${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload?.orders) ? payload.orders.filter(isValidLiveOrder) : [];
}

/**
 * ออเดอร์ที่ผู้ใช้คนนี้เป็น "ผู้โดยสาร" เท่านั้น
 * (server ส่งออเดอร์ทั้งหมดให้แอดมิน และส่งงาน pending ทั้งหมดให้พี่วิน
 * จึงต้องกรองที่หน้าจอผู้โดยสารเอง)
 */
export async function fetchMyPassengerOrders(): Promise<LiveRideOrder[]> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return [];
  const orders = await fetchMyOrders();
  return orders.filter((order) => order.passengerUserId === uid);
}
/**
 * 4. Trip completed with receipt & fund breakdown
 */
export async function completeLiveOrder(
  orderId: string,
  summary: {
    tipAmount: number;
    ratingGiven?: number;
    reviewComment?: string;
  }
): Promise<LiveRideOrder | null> {
  const orders = getLocalLiveOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex < 0) return null;

  const completeResponse = await fetch(`/api/orders/${orderId}/step`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      tipAmount: summary.tipAmount || 0,
      ratingGiven: summary.ratingGiven || 5,
      reviewComment: summary.reviewComment || 'ยอดเยี่ยม ขับขี่ปลอดภัย',
    }),
  });
  if (!completeResponse.ok) {
    throw new Error(`ORDER_COMPLETE_FAILED_${completeResponse.status}`);
  }
  const payload = await completeResponse.json();
  if (!isValidLiveOrder(payload?.order)) return null;
  const completedOrder = payload.order as LiveRideOrder;
  orders[orderIndex] = completedOrder;
  saveLocalLiveOrders(orders);

  broadcastEvent(completedOrder, 'completed');

  // Trigger Webhook for completion
  if (isAutoDispatchEnabled()) {
    const payload = buildWebhookPayload({
      event: 'order_completed',
      orderId: completedOrder.id,
      passengerName: completedOrder.passengerName,
      passengerPhone: completedOrder.passengerPhone,
      serviceTitle: completedOrder.serviceTitle,
      pickupLocation: completedOrder.pickupLocation,
      dropoffLocation: completedOrder.dropoffLocation,
      distanceKm: completedOrder.distanceKm,
      fare: completedOrder.fare,
      tipAmount: completedOrder.tipAmount,
      status: 'completed',
      driverName: completedOrder.driverName,
      driverLevel: completedOrder.driverLevel,
      driverPlate: completedOrder.driverPlate,
    });
    dispatchToWebhook(payload).catch((e) => console.warn('Webhook auto-dispatch:', e));
  }

  return completedOrder;
}
