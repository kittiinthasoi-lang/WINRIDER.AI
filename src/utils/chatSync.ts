export interface ChatMessage {
  id: string;
  orderId: string;
  senderRole: 'passenger' | 'driver';
  senderName: string;
  text: string;
  timestamp: string;
  isQuickReply?: boolean;
}

const STORAGE_KEY_PREFIX = 'winrider_chat_messages_';
const CHAT_CHANNEL_NAME = 'winrider_chat_channel';

let chatChannel: BroadcastChannel | null = null;
const chatListeners: Set<(message: ChatMessage) => void> = new Set();

function getChatChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!chatChannel && 'BroadcastChannel' in window) {
    try {
      chatChannel = new BroadcastChannel(CHAT_CHANNEL_NAME);
      chatChannel.onmessage = (e) => {
        if (e.data && e.data.message) {
          chatListeners.forEach((cb) => {
            try {
              cb(e.data.message);
            } catch (err) {
              console.error('Chat listener error:', err);
            }
          });
        }
      };
    } catch (err) {
      console.warn('Chat BroadcastChannel not available:', err);
    }
  }
  return chatChannel;
}

export function subscribeToChatMessages(callback: (message: ChatMessage) => void): () => void {
  getChatChannel();
  chatListeners.add(callback);
  return () => {
    chatListeners.delete(callback);
  };
}

export function getOrderChatMessages(orderId: string): ChatMessage[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${orderId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to get chat messages:', err);
    return [];
  }
}

export function sendChatMessage(params: {
  orderId: string;
  senderRole: 'passenger' | 'driver';
  senderName: string;
  text: string;
  isQuickReply?: boolean;
}): ChatMessage {
  const message: ChatMessage = {
    id: 'MSG-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
    orderId: params.orderId,
    senderRole: params.senderRole,
    senderName: params.senderName,
    text: params.text,
    timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    isQuickReply: params.isQuickReply,
  };

  const existing = getOrderChatMessages(params.orderId);
  existing.push(message);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${params.orderId}`, JSON.stringify(existing));
  }

  // Broadcast to other tabs
  const ch = getChatChannel();
  if (ch) {
    ch.postMessage({ message });
  }

  return message;
}

export const DRIVER_QUICK_REPLIES = [
  'ถึงหน้าจุดรับแล้วครับ 🛵',
  'รถติดเล็กน้อยครับ อีกประมาณ 2 นาที 🚦',
  'กำลังวนรถเข้าหน้าทางเข้าครับ 🔄',
  'มีหมวกกันน็อคพร้อมหมวกคลุมฆ่าเชื้อให้เรียบร้อยครับ 🛡️',
  'ขับขี่ปลอดภัยตามกฎจราจรครับ ⚡',
];

export const PASSENGER_QUICK_REPLIES = [
  'กำลังลงลิฟต์ค่ะ รอสักครู่ 🏢',
  'รออยู่หน้าป้อมยามทางเข้า 🚶‍♀️',
  'ใส่เสื้อสีขาว กางเกงยีนส์ค่ะ 👕',
  'ขอแวะจุดดรอปหน้าปากซอยแป๊บเดียวได้ไหมคะ 📍',
  'ขอบคุณมากค่ะพี่วิน 🙏',
];
