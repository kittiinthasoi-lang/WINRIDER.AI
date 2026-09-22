import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Wrench, 
  Store, 
  Camera, 
  Loader2, 
  Send, 
  AlertTriangle, 
  RotateCw, 
  X, 
  Trash2, 
  Copy, 
  Check, 
  Activity, 
  Sparkles,
  ShieldAlert,
  HelpCircle,
  ImageIcon
} from 'lucide-react';
import { auth } from '../firebase';
import { AiStatusModal } from './AiStatusModal';
import { loadAccountPreference, saveAccountPreference } from '../services/accountPersistenceService';

export type AssistantMode = 'motorcycle_mechanic' | 'personal_commerce';

interface Props {
  mode?: AssistantMode;
  onModeChange?: (mode: AssistantMode) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  timestamp: number;
  source?: string;
  error?: {
    code: string;
    message: string;
    canRetry?: boolean;
  };
}

const MECHANIC_PRESETS = [
  { label: '🛵 สตาร์ตไม่ติด มีเสียงแชะๆ', query: 'รถสตาร์ตไม่ติด มีเสียงแชะๆ เงียบไปเลย (Honda Wave 110i) ต้องตรวจอะไรก่อน?' },
  { label: '🛑 เบรกหน้ามีเสียงเอี๊ยด เบรกลึก', query: 'เบรกหน้ามีเสียงเอี๊ยด แป้นเบรกลึก ไม่ค่อยอยู่ เกิดจากอะไรและซ่อมเท่าไร?' },
  { label: '💨 ท่อไอเสียมีควันขาว เร่งไม่ขึ้น', query: 'ท่อไอเสียมีควันขาวออก รถเร่งไม่ค่อยขึ้น น้ำมันเครื่องหาย มีความเสี่ยงแค่ไหน?' },
  { label: '🔋 ไฟเลี้ยว-แตรไม่ดังหลังตากฝน', query: 'ไฟเลี้ยวและแตรไม่ดังหลังจอดตากฝน แบตเตอรี่ยังใหม่ ฟิวส์หรือระบบไฟรั่ว?' },
  { label: '⚙️ โซ่หย่อน มีเสียงดังกุกๆ', query: 'โซ่หย่อนและมีเสียงดังกุกๆ ตอนเร่งความเร็ว ต้องเปลี่ยนชุดโซ่สเตอร์หรือแค่ตั้ง?' },
  { label: '🌡️ เครื่องร้อนจัดและมีกลิ่นไหม้', query: 'ขี่มาสักพักเครื่องร้อนจัดและมีกลิ่นไหม้แถวท่อไอเสีย ควรจอดไหม?' },
];

const COMMERCE_PRESETS = [
  { label: '💰 คำนวณต้นทุน/กำไร กะเพราหมูกรอบ', query: 'ช่วยคำนวณต้นทุน/กำไร และตั้งราคาขายกล่อง "ข้าวกะเพราหมูกรอบไข่ดาว" ให้ได้กำไร 40%' },
  { label: '📢 เขียนแคปชั่นขายหมวกกันน็อก 95%', query: 'ช่วยเขียนแคปชั่นประกาศขาย "หมวกกันน็อกเต็มใบสภาพ 95% ใช้งาน 1 เดือน" ให้น่าสนใจ' },
  { label: '🍳 ขอสูตรหมูทอดกระเทียมทำข้าวกล่อง', query: 'ขอสูตรและสัดส่วนหมูทอดกระเทียมพริกไทย สำหรับทำข้าวกล่อง 20 กล่อง พร้อมคำนวณต้นทุน' },
  { label: '🏷️ ประเมินราคาขายเสื้อการ์ดมือสอง', query: 'ช่วยประเมินช่วงราคาขายต่อ เสื้อแจ็คเก็ตการ์ดขับมอเตอร์ไซค์มือสอง สภาพดี ไม่มีรอยขาด' },
  { label: '📊 วางแผนคิดโปร 1 แถม 1 ไม่ให้ขาดทุน', query: 'ร้านขายเครื่องดื่ม อยากจัดโปรโมชั่น 1 แถม 1 มีวิธีคำนวณต้นทุนอย่างไรไม่ให้เข้าเนื้อ?' },
  { label: '☕ คำนวณต้นทุนเปิดร้านกาแฟโบราณ', query: 'อยากเริ่มต้นขายชาไทยและกาแฟโบราณ มีสูตรและวิธีคิดต้นทุนต่อแก้วอย่างไร?' },
];

export const WinAiAssistantPanel: React.FC<Props> = ({ mode: propMode, onModeChange }) => {
  const [currentMode, setCurrentMode] = useState<AssistantMode>(propMode || 'motorcycle_mechanic');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<{ text: string; image?: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes
  useEffect(() => {
    if (propMode && propMode !== currentMode) {
      setCurrentMode(propMode);
    }
  }, [propMode]);

  // Load account chat history from Firestore, with localStorage migration/fallback.
  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      const key = `win_ai_history_${currentMode}`;
      const localSaved = localStorage.getItem(key);
      let localMessages: ChatMessage[] | null = null;
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed)) localMessages = parsed;
        } catch (e) {
          console.error('Failed to parse chat history', e);
        }
      }
      try {
        const cloudMessages = await loadAccountPreference<ChatMessage[]>(key);
        if (cancelled) return;
        if (Array.isArray(cloudMessages)) {
          setMessages(cloudMessages);
          return;
        }
        if (localMessages) {
          setMessages(localMessages);
          await saveAccountPreference(key, localMessages.slice(-20));
          return;
        }
      } catch {
        if (cancelled) return;
        if (localMessages) {
          setMessages(localMessages);
          return;
        }
      }
      if (cancelled) return;
      const initialGreeting: ChatMessage = {
        id: 'greeting',
        role: 'assistant',
        text: currentMode === 'motorcycle_mechanic'
          ? `สวัสดีครับ! ผมคือ **WIN-AI ช่างส่วนตัว** 🛵
พร้อมช่วยวิเคราะห์อาการรถจักรยานยนต์ จัดโครงสร้างคำตอบ 5 มิติ:

1. 🚨 **ระดับความเร่งด่วน** (ต่ำ / ปานกลาง / สูงมาก)
2. 🔍 **สาเหตุที่เป็นไปได้**
3. 🛠️ **วิธีตรวจเช็กเบื้องต้นอย่างปลอดภัย**
4. ⚠️ **สิ่งที่ห้ามทำเด็ดขาด**
5. 💵 **ประมาณการค่าใช้จ่ายและค่าอะไหล่**

*สามารถแนบรูปถ่ายชิ้นส่วน (JPG, PNG, WEBP) หรือพิมพ์ยี่ห้อ รุ่น และอาการได้เลยครับ!*`
          : `สวัสดีครับ! ผมคือ **WIN-AI ผู้ช่วยส่วนตัว** 💼
พร้อมเป็นที่ปรึกษาด้านการค้าขายและการประกอบอาชีพ:

• 💰 **คำนวณต้นทุน & กำไร (Margin)** และตั้งราคาขายที่แข่งขันได้
• 📢 **เขียนแคปชั่น/ประกาศขายสินค้า** ที่ดึงดูดลูกค้าและปิดการขายไว
• 🍳 **แจกสูตรอาหาร/เครื่องดื่ม** พร้อมคำนวณขนาดเสิร์ฟและต้นทุนต่อจาน
• 💡 **แนะนำโปรโมชั่นและกลยุทธ์การขาย**

*พิมพ์คำถามหรือเลือกหัวข้อตัวอย่างด้านล่างได้ทันทีครับ!*`,
        timestamp: Date.now(),
        source: 'WIN-AI System'
      };
      setMessages([initialGreeting]);
    };
    void loadHistory();
    return () => { cancelled = true; };
  }, [currentMode]);

  // Save history locally for fast UX and to the account for cross-session recovery.
  useEffect(() => {
    if (messages.length > 0) {
      const trimmed = messages.slice(-20);
      localStorage.setItem(`win_ai_history_${currentMode}`, JSON.stringify(trimmed));
      if (auth.currentUser) {
        void saveAccountPreference(`win_ai_history_${currentMode}`, trimmed).catch(() => { /* local cache remains available */ });
      }
    }
  }, [messages, currentMode]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleModeSwitch = (newMode: AssistantMode) => {
    setCurrentMode(newMode);
    onModeChange?.(newMode);
    setLastFailedMessage(null);
  };

  const clearHistory = () => {
    localStorage.removeItem(`win_ai_history_${currentMode}`);
    void saveAccountPreference(`win_ai_history_${currentMode}`, []).catch(() => { /* ignore persistence failure */ });
    const initialGreeting: ChatMessage = {
      id: `greeting-${Date.now()}`,
      role: 'assistant',
      text: currentMode === 'motorcycle_mechanic'
        ? 'เริ่มการสนทนาใหม่กับ **WIN-AI ช่างส่วนตัว** แล้วครับ บอกอาการรถหรือแนบรูปชิ้นส่วนได้เลย!'
        : 'เริ่มการสนทนาใหม่กับ **WIN-AI ผู้ช่วยส่วนตัว** แล้วครับ ต้องการให้ช่วยตั้งราคา หรือคิดสูตรอาหารรายการไหนครับ?',
      timestamp: Date.now(),
      source: 'WIN-AI System'
    };
    setMessages([initialGreeting]);
    setLastFailedMessage(null);
  };

  const handleImageFile = (file?: File) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('กรุณาเลือกไฟล์รูปภาพที่เป็น JPG, PNG หรือ WEBP เท่านั้น');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปภาพเกินกำหนด (จำกัดไม่เกิน 4 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async (overrideText?: string, overrideImage?: string) => {
    const textToSend = (overrideText !== undefined ? overrideText : input).trim();
    const imageToSend = overrideImage !== undefined ? overrideImage : image;

    if (!textToSend && !imageToSend) return;

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: textToSend,
      image: imageToSend || undefined,
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setImage('');
    setLoading(true);
    setLastFailedMessage(null);

    // Build context history (up to last 8 messages before this one)
    const historyPayload = updatedMessages
      .slice(0, -1) // exclude current message
      .slice(-8)    // last 8
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.text
      }));

    // Setup 30s Timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw {
          code: 'UNAUTHENTICATED',
          message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน WIN-AI'
        };
      }

      const response = await fetch('/api/ai/personal-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: currentMode,
          message: textToSend,
          imageDataUrl: imageToSend || undefined,
          history: historyPayload
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        const errorObj = {
          code: data.errorCode || 'UNKNOWN_ERROR',
          message: data.error || 'WIN-AI ไม่พร้อมให้บริการในขณะนี้',
          canRetry: true
        };
        // If there's a fallback reply even on error, provide it gracefully
        if (data.fallbackReply) {
          const assistantMessage: ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            text: `${data.fallbackReply}\n\n*(⚠️ ข้อสังเกตระบบ: ${data.error})*`,
            timestamp: Date.now(),
            source: 'Local Fallback (ออฟไลน์)',
            error: errorObj
          };
          setMessages(prev => [...prev, assistantMessage]);
          setLastFailedMessage({ text: textToSend, image: imageToSend });
        } else {
          throw errorObj;
        }
      } else {
        const assistantMessage: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          text: String(data.reply || 'ไม่พบคำตอบจากระบบ'),
          timestamp: Date.now(),
          source: data.source || 'gemini-3.6-flash'
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      let errorCode = error?.code || 'UNKNOWN';
      let errorMessage = error?.message || 'ไม่สามารถเชื่อมต่อระบบ WIN-AI ได้';

      if (error?.name === 'AbortError') {
        errorCode = 'TIMEOUT';
        errorMessage = 'การตอบกลับจาก AI หมดเวลา (เกิน 30 วินาที) กรุณากดปุ่มลองใหม่อีกครั้ง';
      }

      const assistantErrorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `ขออภัยครับ เกิดข้อผิดพลาด:\n**${errorMessage}**`,
        timestamp: Date.now(),
        source: 'Error Handler',
        error: {
          code: errorCode,
          message: errorMessage,
          canRetry: true
        }
      };

      setMessages(prev => [...prev, assistantErrorMessage]);
      setLastFailedMessage({ text: textToSend, image: imageToSend });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      sendMessage(lastFailedMessage.text, lastFailedMessage.image);
    }
  };

  const isMechanic = currentMode === 'motorcycle_mechanic';
  const activePresets = isMechanic ? MECHANIC_PRESETS : COMMERCE_PRESETS;

  return (
    <section 
      id="win-ai-assistant-container"
      className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#081226] via-[#050B18] to-[#03070F] p-4 sm:p-5 shadow-2xl flex flex-col min-h-[580px]"
    >
      {/* Top Bar: Mode Switcher & Status Diagnostics */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/50 border border-white/10">
          <button
            type="button"
            id="tab-mechanic-mode"
            onClick={() => handleModeSwitch('motorcycle_mechanic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              isMechanic 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md scale-[1.02]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>WIN-AI ช่างส่วนตัว</span>
          </button>
          <button
            type="button"
            id="tab-commerce-mode"
            onClick={() => handleModeSwitch('personal_commerce')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              !isMechanic 
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-md scale-[1.02]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>WIN-AI ผู้ช่วยส่วนตัว</span>
          </button>
        </div>

        {/* Action buttons: AI Status & Clear History */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-ai-status-modal"
            onClick={() => setStatusModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
            title="ตรวจสอบสถานะการเชื่อมต่อ AI"
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">ตรวจสถานะ AI</span>
          </button>
          <button
            type="button"
            id="btn-clear-chat-history"
            onClick={clearHistory}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 text-[11px] font-medium transition-colors"
            title="ล้างประวัติการสนทนานี้"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mode Description Bar */}
      <div className={`mt-3 px-3 py-2 rounded-2xl text-xs flex items-center justify-between border ${
        isMechanic
          ? 'bg-amber-950/25 border-amber-500/30 text-amber-200'
          : 'bg-cyan-950/25 border-cyan-500/30 text-cyan-200'
      }`}>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            {isMechanic
              ? 'ช่างส่วนตัว: วิเคราะห์ 5 มิติ (ความเร่งด่วน • สาเหตุ • วิธีตรวจ • ข้อห้าม • ค่าใช้จ่าย)'
              : 'ผู้ช่วยส่วนตัว: ช่วยคำนวณต้นทุน/กำไร (Margin) • ตั้งราคาขาย • เขียนแคปชั่น • แจกสูตร'}
          </span>
        </div>
        <span className="text-[10px] font-mono opacity-75 px-2 py-0.5 rounded bg-black/40">
          จำบริบท 8 ข้อความ
        </span>
      </div>

      {/* Chat Messages Thread */}
      <div 
        id="win-ai-chat-thread"
        className="flex-1 overflow-y-auto my-3 pr-1 space-y-4 max-h-[420px] scrollbar-thin scrollbar-thumb-white/10"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-lg ${
                  isMechanic
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950'
                    : 'bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950'
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 shadow-md space-y-2 ${
                isUser
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm'
                  : msg.error
                  ? 'bg-red-950/40 border border-red-500/40 text-red-100 rounded-tl-sm'
                  : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm backdrop-blur-md'
              }`}>
                {/* User uploaded image preview inside bubble */}
                {msg.image && (
                  <div className="rounded-2xl overflow-hidden border border-white/20 max-w-xs">
                    <img 
                      src={msg.image} 
                      alt="รูปประกอบคำถาม" 
                      className="w-full max-h-56 object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Text Content */}
                <div className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap select-text">
                  {msg.text}
                </div>

                {/* Error Banner & Code */}
                {msg.error && (
                  <div className="mt-2 pt-2 border-t border-red-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-red-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono font-bold uppercase">{msg.error.code}</span>
                    </div>
                    {msg.error.canRetry && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="px-2.5 py-1 rounded-xl bg-red-500/30 hover:bg-red-500/50 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <RotateCw className="w-3 h-3" />
                        ลองใหม่อีกครั้ง
                      </button>
                    )}
                  </div>
                )}

                {/* Bubble Footer: Source & Timestamp & Copy */}
                {!isUser && !msg.error && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      {msg.source || 'gemini-3.6-flash'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(msg.text, msg.id)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                      title="คัดลอกข้อความ"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Loading Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isMechanic
                ? 'bg-amber-400 text-slate-950'
                : 'bg-cyan-400 text-slate-950'
            }`}>
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-cyan-200 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{isMechanic ? 'WIN-AI กำลังประเมินโครงสร้าง 5 มิติ...' : 'WIN-AI กำลังคำนวณราคาและวิเคราะห์คำตอบ...'}</span>
              <span className="text-[10px] text-slate-400 ml-2 font-mono">(Timeout 30s)</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Quick Question Chips */}
      <div className="border-t border-white/10 pt-2 pb-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5 font-bold">
          <HelpCircle className="w-3 h-3 text-cyan-400" />
          <span>คำถามตัวอย่างแนะนำ ({isMechanic ? 'ช่างมอเตอร์ไซค์' : 'ค้าขาย & อาหาร'}):</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {activePresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(preset.query)}
              className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition-all shrink-0 flex items-center gap-1 disabled:opacity-40"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image Preview before sending */}
      {image && (
        <div className="relative inline-block my-2 p-1 rounded-2xl border border-cyan-400/40 bg-black/60 max-w-fit">
          <img 
            src={image} 
            alt="รูปที่จะส่งให้ AI วิเคราะห์" 
            className="h-20 w-auto rounded-xl object-contain" 
            referrerPolicy="no-referrer"
          />
          <button
            type="button"
            onClick={() => setImage('')}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
            title="ลบรูปภาพ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Box & Attachment */}
      <div 
        className={`relative rounded-2xl border transition-all ${
          isDragOver 
            ? 'border-cyan-400 bg-cyan-950/40' 
            : 'border-white/15 bg-black/50 focus-within:border-cyan-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          handleImageFile(file);
        }}
      >
        <textarea
          id="win-ai-input-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={2}
          placeholder={
            isMechanic
              ? 'พิมพ์ยี่ห้อ รุ่น ปี และอาการ เช่น สตาร์ตติดยาก มีเสียงดังที่เบรกหน้า... (กด Enter เพื่อส่ง)'
              : 'พิมพ์สินค้าที่ต้องการขาย งบประมาณ วัตถุดิบ หรือสูตรอาหารที่อยากให้คำนวณ... (กด Enter เพื่อส่ง)'
          }
          className="w-full bg-transparent p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none resize-none"
        />

        {/* Controls inside input bar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-2">
            {/* Camera / Image Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleImageFile(e.target.files?.[0])}
            />
            <button
              type="button"
              id="btn-upload-image"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                image 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title="แนบรูปภาพ (JPG, PNG, WEBP ไม่เกิน 4 MB)"
            >
              {image ? <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> : <Camera className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{image ? 'เปลี่ยนรูป' : 'แนบรูป'}</span>
            </button>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              ลากวางรูป JPG/PNG/WEBP (≤4MB)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {lastFailedMessage && !loading && (
              <button
                type="button"
                id="btn-retry-failed-message"
                onClick={handleRetry}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                ลองใหม่
              </button>
            )}

            <button
              type="button"
              id="btn-send-message"
              disabled={loading || (!input.trim() && !image)}
              onClick={() => sendMessage()}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isMechanic
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:brightness-110 shadow-lg'
                  : 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 hover:brightness-110 shadow-lg'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>ส่งคำถาม</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-3 pt-2 border-t border-white/10 flex items-start gap-2 text-[11px] text-amber-200/80">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          {isMechanic ? (
            <span>
              <b>คำเตือนความปลอดภัยช่าง:</b> คำแนะนำ AI เป็นการวินิจฉัยเบื้องต้น หากพบปัญหา<b>ระบบเบรก ยางแตก น้ำมันรั่วซึม กลิ่นไหม้ หรือเครื่องร้อนจัด</b> ให้<b>หยุดใช้รถทันที</b>และติดต่อช่างผู้ชำนาญ
            </span>
          ) : (
            <span>
              <b>คำแนะนำการค้า:</b> ข้อมูลราคาและสูตรอาหารเป็นการประมาณการเบื้องต้น ผู้ขายควรคำนวณต้นทุนจริงและปฏิบัติตามมาตรฐานความปลอดภัยของอาหารและกฎหมายการค้า
            </span>
          )}
        </div>
      </div>

      {/* Modal: AI Diagnostics & Status */}
      <AiStatusModal 
        isOpen={statusModalOpen} 
        onClose={() => setStatusModalOpen(false)} 
      />
    </section>
  );
};
