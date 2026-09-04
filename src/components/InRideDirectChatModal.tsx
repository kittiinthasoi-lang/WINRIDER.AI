import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  User, 
  Bike 
} from 'lucide-react';
import { 
  ChatMessage, 
  getOrderChatMessages, 
  sendChatMessage, 
  subscribeToChatMessages, 
  DRIVER_QUICK_REPLIES, 
  PASSENGER_QUICK_REPLIES 
} from '../utils/chatSync';
import { playTactileBlip, speakThaiText } from '../utils/audio';
import { notifyNewChatMessage } from '../utils/notifications';

interface InRideDirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentUserRole: 'passenger' | 'driver';
  currentUserName: string;
  otherPartyName: string;
  audioEnabled?: boolean;
}

export const InRideDirectChatModal: React.FC<InRideDirectChatModalProps> = ({
  isOpen,
  onClose,
  orderId,
  currentUserRole,
  currentUserName,
  otherPartyName,
  audioEnabled = true,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickReplies = currentUserRole === 'driver' ? DRIVER_QUICK_REPLIES : PASSENGER_QUICK_REPLIES;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load existing messages when opened
  useEffect(() => {
    if (!isOpen || !orderId) return;
    const existing = getOrderChatMessages(orderId);
    setMessages(existing);
    setTimeout(scrollToBottom, 100);
  }, [isOpen, orderId]);

  // Subscribe to real-time incoming messages
  useEffect(() => {
    if (!isOpen || !orderId) return;

    const unsubscribe = subscribeToChatMessages((incomingMsg) => {
      if (incomingMsg.orderId === orderId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) return prev;
          return [...prev, incomingMsg];
        });

        // If incoming from the other party
        if (incomingMsg.senderRole !== currentUserRole) {
          if (audioEnabled) playTactileBlip(1100);
          if (ttsEnabled) {
            speakThaiText(incomingMsg.text);
          }
          notifyNewChatMessage(incomingMsg.senderName, incomingMsg.text);
        }

        setTimeout(scrollToBottom, 100);
      }
    });

    return () => unsubscribe();
  }, [isOpen, orderId, currentUserRole, audioEnabled, ttsEnabled]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string, isQuick = false) => {
    const text = (textToSend || inputText).trim();
    if (!text || !orderId) return;

    const newMsg = sendChatMessage({
      orderId,
      senderRole: currentUserRole,
      senderName: currentUserName,
      text,
      isQuickReply: isQuick,
    });

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    if (audioEnabled) playTactileBlip(880);
    setTimeout(scrollToBottom, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,210,255,0.25)] text-slate-100 flex flex-col h-[85vh] max-h-[640px] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              currentUserRole === 'driver' 
                ? 'bg-amber-500/20 border-amber-400 text-amber-300' 
                : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
            }`}>
              {currentUserRole === 'driver' ? <Bike className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-slate-400 uppercase">
                  {currentUserRole === 'driver' ? 'ติดต่อผู้โดยสาร' : 'ติดต่อพี่วินอัศวิน'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{otherPartyName}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio TTS Toggle */}
            <button
              type="button"
              onClick={() => {
                setTtsEnabled(!ttsEnabled);
                if (audioEnabled) playTactileBlip(700);
              }}
              className={`p-2 rounded-xl border transition-all ${
                ttsEnabled
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
              title={ttsEnabled ? 'ระบบอ่านออกเสียงเปิดอยู่ (TTS On)' : 'ปิดเสียงอ่านข้อความ'}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Bubble Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <MessageSquare className="w-10 h-10 text-cyan-500/40 mb-2 animate-bounce" />
              <p className="text-xs font-mono font-medium text-slate-400">
                ยังไม่มีข้อความในทริปนี้
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                แตะปุ่มข้อความด่วนด้านล่างเพื่อสื่อสารกับ{currentUserRole === 'driver' ? 'ผู้โดยสาร' : 'พี่วิน'}ได้อย่างปลอดภัย
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderRole === currentUserRole;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-mono text-slate-400">
                      {isMe ? 'ฉัน' : msg.senderName}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {msg.timestamp}
                    </span>
                  </div>
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed break-words shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs border border-cyan-400/30'
                        : 'bg-white/10 text-slate-100 rounded-bl-xs border border-white/10'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies Carousel */}
        <div className="p-2.5 border-t border-white/10 bg-white/5">
          <div className="text-[10px] font-mono text-cyan-300 font-bold mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>ตอบด่วนเพื่อความปลอดภัยในการขับขี่ (Quick Replies):</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(reply, true)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white/10 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 text-[11px] font-medium transition-all active:scale-95 shrink-0"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-white/10 bg-slate-950 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="พิมพ์ข้อความถึงคนขับ/ผู้โดยสาร..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(0,210,255,0.3)]"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
