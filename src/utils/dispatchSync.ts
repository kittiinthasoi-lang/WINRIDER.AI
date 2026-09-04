import { buildWebhookPayload, dispatchToWebhook, isAutoDispatchEnabled } from './webhookDispatcher';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export interface LiveRideOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceIconEmoji: string;
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
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fare: number;
  estMinutes?: number;
}): Promise<LiveRideOrder> {
  const now = new Date().toISOString();
  const orderId = `WIN-${Math.floor(1000 + Math.random() * 9000)}`;
  const fare = Number(orderInput.fare || 40);
  const welfareFund2Baht = 2.0;
  const netFare = Math.max(0, fare - welfareFund2Baht);

  const newOrder: LiveRideOrder = {
    id: orderId,
    serviceId: orderInput.serviceId,
    serviceTitle: orderInput.serviceTitle,
    serviceIconEmoji: orderInput.serviceIconEmoji || '🛵',
    passengerName: orderInput.passengerName || 'คุณผู้โดยสาร',
    passengerPhone: orderInput.passengerPhone || '089-123-4567',
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

  // Save locally
  const orders = getLocalLiveOrders();
  orders.unshift(newOrder);
  saveLocalLiveOrders(orders);

  // Sync to server backend & Firestore Cloud DB
  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    }).catch(() => {});
  } catch {}

  try {
    setDoc(doc(db, 'rides', newOrder.id), {
      ...newOrder,
      sovereignFundCut: newOrder.welfareFund2Baht,
    }).catch((err) => console.warn('Firestore setDoc order err:', err));
  } catch {}

  // Broadcast to other tabs
  broadcastEvent(newOrder, 'created');

  // Trigger Low-Code Webhook (Make.com, Zapier, Google Sheets, LINE OA)
  if (isAutoDispatchEnabled()) {
    const payload = buildWebhookPayload({
      event: 'order_created',
      orderId: newOrder.id,
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
      driverName: driverInfo.driverName,
      driverLevel: driverInfo.driverLevel,
      driverPhone: driverInfo.driverPhone || '081-998-3344',
      driverPlate: driverInfo.driverPlate || '1กข 7789 กทม.',
      driverAvatarEmoji: driverInfo.driverAvatarEmoji || '🦁',
      driverVehicle: driverInfo.driverVehicle || 'Honda Wave 125i',
    };
    orders[orderIndex] = targetOrder;
    saveLocalLiveOrders(orders);
  } else {
    // Fallback order
    targetOrder = {
      id: orderId,
      serviceId: 'knight',
      serviceTitle: 'WIN KNIGHT',
      serviceIconEmoji: '🛵',
      passengerName: 'คุณอารียา สุขสวัสดิ์',
      passengerPhone: '089-445-1234',
      pickupLocation: 'ซอยสุขุมวิท 23 (แยก 4)',
      dropoffLocation: 'BTS อโศก (ทางออก 3)',
      distanceKm: 2.5,
      fare: 45,
      welfareFund2Baht: 2.0,
      netFare: 43,
      estMinutes: 7,
      status: 'accepted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...driverInfo,
    };
  }

  // Update server & Firestore
  try {
    fetch(`/api/orders/${orderId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driverInfo),
    }).catch(() => {});
  } catch {}

  try {
    updateDoc(doc(db, 'rides', targetOrder.id), {
      status: 'accepted',
      updatedAt: new Date().toISOString(),
      driverName: driverInfo.driverName,
      driverLevel: driverInfo.driverLevel,
      driverPhone: driverInfo.driverPhone || '081-998-3344',
      driverPlate: driverInfo.driverPlate || '1กข 7789 กทม.',
    }).catch((err) => console.warn('Firestore update accept err:', err));
  } catch {}

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

  try {
    updateDoc(doc(db, 'rides', updatedOrder.id), {
      status: newStatus,
      updatedAt: updatedOrder.updatedAt,
    }).catch((err) => console.warn('Firestore update step err:', err));
  } catch {}

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

  try {
    updateDoc(doc(db, 'rides', completedOrder.id), {
      status: 'completed',
      tipAmount: completedOrder.tipAmount,
      ratingGiven: completedOrder.ratingGiven,
      reviewComment: completedOrder.reviewComment,
      updatedAt: completedOrder.updatedAt,
    }).catch((err) => console.warn('Firestore update complete err:', err));
  } catch {}

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
