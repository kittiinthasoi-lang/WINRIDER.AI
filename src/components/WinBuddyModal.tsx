import React, { useState } from 'react';
import { playTactileBlip, speakThaiText } from '../utils/audio';
import { 
  Bot, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Radio, 
  Sparkles, 
  ShieldCheck, 
  Navigation,
  Repeat
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  audioEnabled: boolean;
}

export const WinBuddyModal: React.FC<Props> = ({ isOpen, onClose, audioEnabled }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'rider' | 'buddy'; text: string; time: string }>>([
    {
      sender: 'buddy',
      text: 'สวัสดีครับท่านอัศวิน! WIN Buddy AI พร้อมให้คำปรึกษายุทธวิธี สั่งงานด้วยเสียง หรือค้นหาเส้นทางลัด CI Map ได้ทันทีครับ',
      time: '10:00'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (customText?: string) => {
    const textToSend = customText || query;
    if (!textToSend.trim()) return;

    if (audioEnabled) playTactileBlip(900);
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { sender: 'rider', text: textToSend, time: timeStr }]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/win-buddy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });
      const data = await res.json();
      const reply = data.reply || 'รับทราบสัญญาณครับท่านอัศวิน WIN Buddy กำลังดำเนินการ';

      setMessages(prev => [...prev, { sender: 'buddy', text: reply, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }]);
      if (audioEnabled) speakThaiText(reply);
    } catch {
      const fallback = '🛡️ [Tactical Offline] รับทราบคำสั่งครับพี่อัศวิน ระบบ Safe Pass และ 2 บาทครองเมืองพร้อมสนับสนุนเสมอ!';
      setMessages(prev => [...prev, { sender: 'buddy', text: fallback, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }]);
      if (audioEnabled) speakThaiText(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicSim = () => {
    setIsListening(true);
    if (audioEnabled) playTactileBlip(1200);
    setTimeout(() => {
      setIsListening(false);
      handleSend('บัดดี้ ตรวจสอบเส้นทางลัดจากวงเวียนใหญ่ไปท่าพระให้หน่อย');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#070D1E] border border-cyan-500/50 rounded-2xl flex flex-col shadow-[0_0_40px_rgba(0,210,255,0.3)] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0A1A3A] border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_10px_rgba(0,210,255,0.4)]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>WIN BUDDY AI COPILOT</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </h3>
              <p className="text-[10px] text-cyan-300 font-mono">100% Touchless Voice NLP Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Command Buttons */}
        <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex gap-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => handleSend('บัดดี้ หางานขากลับ AI Backhaul Match ด่วน')}
            className="px-2.5 py-1 rounded-md bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 whitespace-nowrap"
          >
            <Repeat className="w-3 h-3 inline mr-1" /> Backhaul Match
          </button>
          <button
            onClick={() => handleSend('ซอยแคบมาก ขอเปิดใช้งาน Safe Pass Transfer')}
            className="px-2.5 py-1 rounded-md bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 whitespace-nowrap"
          >
            <Navigation className="w-3 h-3 inline mr-1" /> Safe Pass
          </button>
          <button
            onClick={() => handleSend('เช็คสถานะ The Guardian Zipper และแบตเตอรี่ชิป')}
            className="px-2.5 py-1 rounded-md bg-amber-950 border border-amber-700 text-amber-300 hover:bg-amber-900 whitespace-nowrap"
          >
            <ShieldCheck className="w-3 h-3 inline mr-1" /> Armor Diagnostic
          </button>
        </div>

        {/* Messages */}
        <div className="h-72 overflow-y-auto p-4 space-y-3 bg-black/50 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'rider' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                  m.sender === 'rider'
                    ? 'bg-[#00D2FF] text-slate-950 font-medium rounded-tr-none'
                    : 'bg-[#0E224D] text-slate-100 border border-cyan-500/30 rounded-tl-none'
                }`}
              >
                <p>{m.text}</p>
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-0.5 px-1">{m.time}</span>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs py-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
              <span>กำลังประมวลผลคำสั่งยุทธวิธี...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 bg-[#070D1E] border-t border-white/10 flex items-center gap-2">
          <button
            onClick={handleMicSim}
            className={`p-2.5 rounded-xl border transition-all ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <input
            type="text"
            placeholder="พิมพ์ข้อความ หรือสั่งงานด้วยเสียง..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-[#00D2FF] text-slate-950 font-bold hover:brightness-110 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
