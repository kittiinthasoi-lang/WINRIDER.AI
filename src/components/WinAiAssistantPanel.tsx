import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Camera, Check, Copy, Loader2, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { auth } from '../firebase';

type AssistantMode = 'motorcycle_mechanic' | 'personal_commerce';
type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; image?: string; source?: string };

interface Props { mode: AssistantMode; }

const prompts = {
  motorcycle_mechanic: [
    'รถสตาร์ตติดยาก ควรตรวจอะไรตามลำดับ?',
    'มีเสียงดังจากล้อหน้า ช่วยประเมินความเร่งด่วน',
    'ช่วยทำเช็กลิสต์ตรวจรถก่อนออกวิ่งงาน',
  ],
  personal_commerce: [
    'ช่วยตั้งราคาสินค้า พร้อมช่วงราคาต่ำ-กลาง-สูง',
    'ช่วยคำนวณต้นทุน กำไร และราคาขายที่เหมาะสม',
    'ช่วยเขียนประกาศขายให้น่าเชื่อถือและอ่านง่าย',
  ],
};

export const WinAiAssistantPanel: React.FC<Props> = ({ mode }) => {
  const [message, setMessage] = useState('');
  const [image, setImage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const mechanic = mode === 'motorcycle_mechanic';

  useEffect(() => {
    let cancelled = false;
    auth.currentUser?.getIdToken().then((token) => fetch('/api/ai/status', { headers: { Authorization: `Bearer ${token}` } }))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'ตรวจสถานะ WIN-AI ไม่สำเร็จ');
        if (!cancelled) setConfigured(Boolean(data.configured));
      }).catch((error) => { if (!cancelled) { setConfigured(false); setStatusError(error?.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const handleImage = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'กรุณาใช้รูป JPG, PNG หรือ WEBP ขนาดไม่เกิน 4 MB' }]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const ask = async (override?: string) => {
    const text = String(override ?? message).trim();
    if ((!text && !image) || loading) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: text || 'ช่วยวิเคราะห์รูปนี้', image: image || undefined };
    const history = messages.slice(-8).map(({ role, text }) => ({ role, text }));
    setMessages((current) => [...current, userMessage]);
    setMessage(''); setImage(''); setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนใช้ WIN-AI');
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30_000);
      const response = await fetch('/api/ai/personal-assistant', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode, message: userMessage.text, imageDataUrl: userMessage.image, history }),
      });
      window.clearTimeout(timeout);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `WIN-AI ตอบกลับผิดพลาด (${response.status})`);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: String(data.reply || 'ไม่พบคำตอบ'), source: data.source }]);
      setConfigured(true);
    } catch (error: any) {
      const text = error?.name === 'AbortError' ? 'WIN-AI ใช้เวลาตอบนานเกิน 30 วินาที กรุณากดลองใหม่' : (error?.message || 'ไม่สามารถเชื่อมต่อ WIN-AI ได้');
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text }]);
    } finally { setLoading(false); }
  };

  const copy = async (item: ChatMessage) => {
    await navigator.clipboard?.writeText(item.text);
    setCopiedId(item.id); window.setTimeout(() => setCopiedId(''), 1500);
  };

  return <section className="space-y-4 rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-[#0A1B38] to-[#060D1E] p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950"><Bot className="h-6 w-6" /></div><div><h3 className="font-black text-white">{mechanic ? 'WIN-AI ช่างส่วนตัว' : 'WIN-AI ผู้ช่วยส่วนตัว'}</h3><p className="text-xs text-cyan-200">{mechanic ? 'วิเคราะห์อาการรถ รูปชิ้นส่วน และลำดับตรวจอย่างปลอดภัย' : 'ตั้งราคา คำนวณต้นทุน เขียนประกาศ สูตรอาหาร และคำแนะนำสำหรับขายของ'}</p></div></div>{messages.length > 0 && <button onClick={() => setMessages([])} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-red-300" title="ล้างบทสนทนา"><Trash2 className="h-4 w-4" /></button>}</div>

    {configured === false && <div className="flex items-start gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200"><AlertTriangle className="h-5 w-5 shrink-0" /><div><p className="font-black">WIN-AI ยังเชื่อม Gemini ไม่สำเร็จ</p><p className="mt-1">{statusError || 'ตั้งค่า GEMINI_API_KEY ใน Environment Variables ของระบบ Deploy แล้ว Redeploy อีกครั้ง'}</p></div></div>}

    {messages.length === 0 && <div className="grid gap-2 sm:grid-cols-3">{prompts[mode].map((prompt) => <button key={prompt} onClick={() => void ask(prompt)} disabled={loading || configured === false} className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 text-left text-[11px] font-bold text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-40">{prompt}</button>)}</div>}

    {messages.length > 0 && <div className="max-h-[48vh] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-3">{messages.map((item) => <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[92%] rounded-2xl p-3 text-sm leading-relaxed ${item.role === 'user' ? 'bg-cyan-400 text-slate-950' : 'border border-white/10 bg-[#101B31] text-slate-200'}`}>{item.image && <img src={item.image} alt="รูปที่ส่งให้ WIN-AI" className="mb-2 max-h-40 rounded-xl object-contain" />}<div className="whitespace-pre-wrap">{item.text}</div>{item.role === 'assistant' && <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-2"><span className="text-[9px] text-slate-500">{item.source ? `Gemini • ${item.source}` : 'WIN-AI'}</span><button onClick={() => void copy(item)} className="text-slate-400 hover:text-cyan-300">{copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>}</div></div>)}{loading && <div className="flex items-center gap-2 text-xs text-cyan-200"><Loader2 className="h-4 w-4 animate-spin" />WIN-AI กำลังวิเคราะห์...</div>}<div ref={endRef} /></div>}

    {image && <div className="relative w-fit"><img src={image} alt="รูปสำหรับวิเคราะห์" className="max-h-48 rounded-2xl border border-white/10 object-contain" /><button onClick={() => setImage('')} className="absolute right-1 top-1 rounded-full bg-black/80 p-1 text-white"><X className="h-4 w-4" /></button></div>}
    <textarea value={message} maxLength={4000} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(); } }} rows={3} placeholder={mechanic ? 'ระบุยี่ห้อ รุ่น ปี เลขไมล์ อาการ เสียง กลิ่น และเวลาที่เริ่มเป็น...' : 'อธิบายสินค้า สภาพ ต้นทุน พื้นที่ขาย หรืองบและวัตถุดิบที่มี...'} className="w-full rounded-2xl border border-white/15 bg-black/40 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none" />
    <div className="flex flex-wrap items-center gap-2"><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"><Camera className="h-4 w-4" />{image ? 'เปลี่ยนรูป' : 'แนบรูป'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => handleImage(event.target.files?.[0])} /></label><button type="button" disabled={loading || configured === false || (!message.trim() && !image)} onClick={() => void ask()} className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}ส่งให้ WIN-AI</button>{messages.length > 0 && <button onClick={() => { const last = [...messages].reverse().find((item) => item.role === 'user'); if (last) void ask(last.text); }} disabled={loading || configured === false} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:opacity-40"><RotateCcw className="h-4 w-4" />ลองอีกครั้ง</button>}<span className="ml-auto text-[9px] text-slate-500">{message.length}/4000</span></div>
    <p className="flex items-start gap-2 text-[11px] text-amber-200/80"><AlertTriangle className="h-4 w-4 shrink-0" />{mechanic ? 'AI ไม่แทนช่าง หากเกี่ยวกับเบรก ยาง น้ำมันรั่ว กลิ่นไหม้ ล้อ หรือเครื่องร้อน ให้หยุดรถทันที' : 'ราคาและสูตรเป็นคำแนะนำ ควรตรวจต้นทุน วันที่ แหล่งข้อมูล และข้อกำหนดสินค้าก่อนขายจริง'}</p>
  </section>;
};
