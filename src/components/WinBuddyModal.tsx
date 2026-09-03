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
      text: 'สวัสดีครับท่านอัศวิน! สั่งการด้วยเสียงของพี่วิน พร้อมให้คำปรึกษายุทธวิธี สั่งรับงาน นำทางเลี่ยงรถติด CI Map หรือคำนวณมิเตอร์ได้ทันทีครับ',
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
      if (audioEnabled) speakThaiText(reply, 'knight_bold');
    } catch {
      const fallback = '🛡️ [Tactical Offline] รับทราบคำสั่งครับพี่อัศวิน ระบบ Safe Pass และ 2 บาทครองเมืองพร้อมสนับสนุนเสมอ!';
      setMessages(prev => [...prev, { sender: 'buddy', text: fallback, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }]);
      if (audioEnabled) speakThaiText(fallback, 'knight_bold');
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
      <div className="w-full max-w-lg bg-[#070D1E] border border-amber-500/50 rounded-2xl flex flex-col shadow-[0_0_40px_rgba(255,215,0,0.25)] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#1A1202] via-[#0A1A3A] to-[#070D1E] border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-[#FFD700] to-yellow-500 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_15px_rgba(255,215,0,0.5)]">
              <Bot className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>สั่งการด้วยเสียงของพี่วิน (หุ่นยนต์ WIN Buddy AI)</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </h3>
              <p className="text-[10px] text-amber-300/80 font-mono">โหมด: พี่วิน & อัศวินลาดตระเวน (Tactical Robot Copilot)</p>
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
            className="px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-500/40 text-amber-300 hover:bg-amber-900/50 whitespace-nowrap"
          >
            <Repeat className="w-3 h-3 inline mr-1" /> Backhaul Match
          </button>
          <button
            onClick={() => handleSend('ซอยแคบมาก ขอเปิดใช้งาน Safe Pass Transfer')}
            className="px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50 whitespace-nowrap"
          >
            <Navigation className="w-3 h-3 inline mr-1" /> Safe Pass
          </button>
          <button
            onClick={() => handleSend('เช็คสถานะ The Guardian Zipper และแบตเตอรี่ชิป')}
            className="px-2.5 py-1 rounded-md bg-blue-950/40 border border-blue-500/40 text-blue-300 hover:bg-blue-900/50 whitespace-nowrap"
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
                    ? 'bg-[#FFD700] text-slate-950 font-medium rounded-tr-none'
                    : 'bg-[#0E224D] text-slate-100 border border-cyan-500/30 rounded-tl-none'
                }`}
              >
                <p>{m.text}</p>
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-0.5 px-1">{m.time}</span>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-amber-400 text-xs py-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
              <span>กำลังประมวลผลคำสั่งยุทธวิธีอัศวิน...</span>
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
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <input
            type="text"
            placeholder="พิมพ์คำสั่ง หรือกดไมค์เพื่อสั่งการพี่วิน..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-[#FFD700] text-slate-950 font-bold hover:brightness-110 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
