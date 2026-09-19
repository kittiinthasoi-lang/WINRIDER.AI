import { buildWebhookPayload, dispatchToWebhook, isAutoDispatchEnabled } from './webhookDispatcher';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
  ratingGiven?: number;
  reviewComment?: string;
}

type OrderEventCallback = (order: LiveRideOrder, eventType: 'created' | 'accepted' | 'step_changed' | 'completed') => void;

const STORAGE_KEY_ORDERS = 'winrider_live_orders_list';
const BROADCAST_CHANNEL_NAME = 'winrider_dispatch_sync_channel';

// Singleton Broadcast Channel
let broadcastChannel: BroadcastChannel | null = null;
const listeners: Set<OrderEventCallback> = new Set();

async function getAuthHeaders(): Promise<Record<string, string>> {
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
        if (e.data && e.data.order && e.data.type) {
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
        if (data && data.order && data.type) {
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
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalLiveOrders(orders: LiveRideOrder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders.slice(0, 30)));
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
}): Promise<LiveRideOrder> {
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
    passengerUserId: orderInput.passengerUserId,
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
  };

  // Server API is the single source of truth for ride creation.
  const createResponse = await fetch('/api/orders', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(newOrder),
  });
  if (!createResponse.ok) {
    throw new Error(`ORDER_CREATE_FAILED_${createResponse.status}`);
  }
  const createdServerOrder = await createResponse.json();
  const persistedOrder = (createdServerOrder?.order || newOrder) as LiveRideOrder;
  const orders = getLocalLiveOrders();
  orders.unshift(persistedOrder);
  saveLocalLiveOrders(orders);

  // Broadcast to other tabs
  broadcastEvent(newOrder, 'created');

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

  return newOrder;
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
  const orders = getLocalLiveOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);

  let targetOrder: LiveRideOrder;
  if (orderIndex >= 0) {
    targetOrder = {
      ...orders[orderIndex],
      status: 'accepted',
      updatedAt: new Date().toISOString(),
      driverUserId: driverInfo.driverUserId,
      driverName: driverInfo.driverName,
      driverLevel: driverInfo.driverLevel,
        driverPhone: driverInfo.driverPhone,
      driverPlate: driverInfo.driverPlate,
      driverAvatarEmoji: driverInfo.driverAvatarEmoji,
      driverVehicle: driverInfo.driverVehicle,
    };
    orders[orderIndex] = targetOrder;
    saveLocalLiveOrders(orders);
  } else {
    return null;
  }

  // Server API is the single source of truth for acceptance.
  const acceptResponse = await fetch(`/api/orders/${orderId}/accept`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({}),
  });
  if (!acceptResponse.ok) {
    throw new Error(`ORDER_ACCEPT_FAILED_${acceptResponse.status}`);
  }
  const acceptedServerOrder = await acceptResponse.json();
  if (acceptedServerOrder?.order) {
    Object.assign(targetOrder, acceptedServerOrder.order);
    orders[orderIndex] = targetOrder;
    saveLocalLiveOrders(orders);
  }

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
  const orders = getLocalLiveOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex < 0) return null;

  const updatedOrder: LiveRideOrder = {
    ...orders[orderIndex],
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  orders[orderIndex] = updatedOrder;
  saveLocalLiveOrders(orders);

  const stepResponse = await fetch(`/api/orders/${orderId}/step`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ status: newStatus }),
  });
  if (!stepResponse.ok) {
    throw new Error(`ORDER_STEP_FAILED_${stepResponse.status}`);
  }

  broadcastEvent(updatedOrder, 'step_changed');
  return updatedOrder;
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

  const completedOrder: LiveRideOrder = {
    ...orders[orderIndex],
    status: 'completed',
    tipAmount: summary.tipAmount || 0,
    ratingGiven: summary.ratingGiven || 5,
    reviewComment: summary.reviewComment || 'ยอดเยี่ยม ขับขี่ปลอดภัย',
    updatedAt: new Date().toISOString(),
  };
  orders[orderIndex] = completedOrder;
  saveLocalLiveOrders(orders);

  const completeResponse = await fetch(`/api/orders/${orderId}/step`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      status: 'completed',
      tipAmount: completedOrder.tipAmount,
    }),
  });
  if (!completeResponse.ok) {
    throw new Error(`ORDER_COMPLETE_FAILED_${completeResponse.status}`);
  }

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
