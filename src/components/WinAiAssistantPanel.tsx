import React, { useState } from 'react';
import { Bot, Camera, Loader2, Send, AlertTriangle } from 'lucide-react';
import { auth } from '../firebase';

type AssistantMode = 'motorcycle_mechanic' | 'personal_commerce';

interface Props {
  mode: AssistantMode;
}

export const WinAiAssistantPanel: React.FC<Props> = ({ mode }) => {
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<string>('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const mechanic = mode === 'motorcycle_mechanic';

  const handleImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 4 * 1024 * 1024) {
      setReply('กรุณาใช้รูป JPG/PNG/WEBP ขนาดไม่เกิน 4 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const ask = async () => {
    if (!message.trim() && !image) return;
    setLoading(true);
    setReply('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนใช้ WIN-AI');
      const response = await fetch('/api/ai/personal-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode, message: message.trim(), imageDataUrl: image || undefined })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'WIN-AI ยังไม่พร้อมใช้งาน');
      setReply(String(data.reply || 'ไม่พบคำตอบ'));
    } catch (error: any) {
      setReply(error?.message || 'ไม่สามารถเชื่อมต่อ WIN-AI ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-[#0A1B38] to-[#060D1E] p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center"><Bot className="w-6 h-6" /></div>
        <div>
          <h3 className="font-black text-white">{mechanic ? 'WIN-AI ช่างส่วนตัว' : 'WIN-AI ผู้ช่วยส่วนตัว'}</h3>
          <p className="text-xs text-cyan-200">{mechanic ? 'วิเคราะห์อาการรถจักรยานยนต์ รูปชิ้นส่วน และแนวทางตรวจเบื้องต้น' : 'ช่วยตั้งราคา เปรียบเทียบสินค้า เขียนประกาศ คำนวณต้นทุน และแนะนำสูตรอาหาร'}</p>
        </div>
      </div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
        placeholder={mechanic ? 'บอกยี่ห้อ รุ่น ปี และอาการ เช่น สตาร์ตติดยาก มีเสียงดังจากล้อหน้า...' : 'อธิบายสินค้า สิ่งที่ต้องการขาย หรืองบ/วัตถุดิบที่มี...'}
        className="w-full rounded-2xl border border-white/15 bg-black/40 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none" />
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 flex items-center gap-2">
          <Camera className="w-4 h-4" /> {image ? 'เปลี่ยนรูป' : 'แนบรูป'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} />
        </label>
        <button type="button" disabled={loading || (!message.trim() && !image)} onClick={ask}
          className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-40 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} วิเคราะห์ด้วย WIN-AI
        </button>
      </div>
      {image && <img src={image} alt="รูปสำหรับวิเคราะห์" className="max-h-48 rounded-2xl border border-white/10 object-contain" />}
      {reply && <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-relaxed text-slate-200">{reply}</div>}
      <p className="flex items-start gap-2 text-[11px] text-amber-200/80"><AlertTriangle className="w-4 h-4 shrink-0" />
        {mechanic ? 'คำแนะนำ AI ไม่แทนช่าง หากเกี่ยวกับเบรก ยาง น้ำมันรั่ว กลิ่นไหม้ หรือเครื่องร้อน ให้หยุดรถและติดต่อช่างทันที' : 'ราคาและสูตรเป็นคำแนะนำ ควรตรวจแหล่งข้อมูล วันที่ ต้นทุนจริง และข้อกำหนดสินค้าก่อนประกาศขาย'}
      </p>
    </section>
  );
};
