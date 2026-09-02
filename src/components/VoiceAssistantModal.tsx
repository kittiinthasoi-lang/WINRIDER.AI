import React, { useState, useEffect, useRef } from 'react';
import { playTactileBlip, playRadarScan, speakThaiText } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Flame, 
  Radio,
  Zap,
  HelpCircle
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  audioEnabled: boolean;
  onClose: () => void;
  onSelectServiceByVoice: (serviceId: string, serviceName: string) => void;
  onSelectDreamRideByVoice: (searchQuery: string) => void;
  onSetDestinationByVoice: (destination: string) => void;
  onTriggerSosByVoice: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  audioEnabled,
  onClose,
  onSelectServiceByVoice,
  onSelectDreamRideByVoice,
  onSetDestinationByVoice,
  onTriggerSosByVoice
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [assistantResponse, setAssistantResponse] = useState<string>('สวัสดีครับ! พูดคำสั่งเสียงภาษาไทยได้เลย เช่น "เลือกรถในฝันฮอนด้าเวฟ", "ส่งของ Win Express", "ขอพี่วินผู้หญิง" หรือเลือกคำสั่งด่วนด้านล่าง');
  const [commandStatus, setCommandStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const recognitionRef = useRef<any>(null);

  // Suggested Voice Prompts
  const quickVoicePrompts = [
    { label: '🛵 เลือกรถประหยัดสุด: ฮอนด้า เวฟ (+0฿ เริ่ม 15฿)', action: 'เลือกรถพื้นฐานประหยัดที่สุด ฮอนด้า เวฟ' },
    { label: '⚡ เลือกรถในฝัน: ดูคาติ พานิกาเล่ (Ducati Panigale V4)', action: 'เลือกรถในฝัน ดูคาติ พานิกาเล่' },
    { label: '🦅 เลือกรถในฝัน: ฮาร์เลย์ แฟตบอย (Harley Fat Boy)', action: 'เลือกรถในฝัน ฮาร์เลย์ แฟตบอย' },
    { label: '📦 ส่งของด่วน WIN Express (+กล่อง 20฿)', action: 'ส่งของด่วน Win Express ค่ากล่อง 20 บาท' },
    { label: '👩‍🦰 ขอพี่วินผู้หญิง WIN MU BUDDY (LV.15+)', action: 'ขอพี่วินผู้หญิง Win Mu Buddy' },
    { label: '🕌 พาคุณตาไปละหมาดที่มัสยิด (WIN Spirit)', action: 'พาคุณตาไปละหมาดที่มัสยิด Win Spirit' },
    { label: '🪷 พาคุณยายไปทำบุญตักบาตร (WIN Spirit)', action: 'พาคุณยายไปทำบุญตักบาตร Win Spirit' },
    { label: '👵 พาผู้สูงอายุไปทำศาสนกิจ/หาหมอ (LV.20+)', action: 'พาผู้สูงอายุไปทำศาสนกิจ Win Spirit' },
    { label: '👨‍👩‍👧 รับส่งลูกไปโรงเรียน WIN Family (LV.15+)', action: 'รับส่งลูกไปโรงเรียน Win Family' },
    { label: '🍱 แม่ส่งข้าวกล่องให้ลูกที่หอ WIN Link', action: 'แม่ส่งข้าวกล่องให้ลูก Win Link' },
    { label: '☕ แนะนำคาเฟ่และร้านเด็ด WIN Lifestyle', action: 'แนะนำคาเฟ่และร้านเด็ด Win Lifestyle' },
    { label: '📍 ปักหมุดไปสยามพารากอน', action: 'เรียกรถมอเตอร์ไซค์ไปสยามพารากอน' },
    { label: '🚨 ขอความช่วยเหลือฉุกเฉิน SOS', action: 'ขอความช่วยเหลือฉุกเฉิน SOS' },
  ];

  // Process and Execute Voice Command
  const processVoiceCommand = (text: string) => {
    setCommandStatus('processing');
    const lower = text.toLowerCase();

    // 1. Emergency SOS
    if (lower.includes('sos') || lower.includes('ฉุกเฉิน') || lower.includes('ช่วยด้วย')) {
      const reply = "เปิดใช้งานระบบฉุกเฉิน WIN Emergency SOS เรียบร้อยแล้วครับ กำลังประสานงานศูนย์บัญชาการ Cosmo-Ko ทันที";
      setAssistantResponse(reply);
      if (audioEnabled) speakThaiText(reply);
      setCommandStatus('success');
      onTriggerSosByVoice();
      return;
    }

    // 2. Dream Ride Selection & Cheapest Economical Base Ride
    if (lower.includes('ประหยัด') || lower.includes('ถูกสุด') || lower.includes('รถในฝัน') || lower.includes('เวฟ') || lower.includes('wave') || lower.includes('ducati') || lower.includes('ดูคาติ') || lower.includes('harley') || lower.includes('ฮาร์เลย์') || lower.includes('bmw') || lower.includes('vespa') || lower.includes('เวสป้า') || lower.includes('xmax') || lower.includes('forza') || lower.includes('ninja')) {
      let vehicleName = 'ฮอนด้า เวฟ';
      if (lower.includes('ดูคาติ') || lower.includes('ducati') || lower.includes('พานิกาเล่') || lower.includes('panigale')) vehicleName = 'Ducati Panigale';
      else if (lower.includes('ฮาร์เลย์') || lower.includes('harley') || lower.includes('แฟตบอย') || lower.includes('fat boy')) vehicleName = 'Harley-Davidson Fat Boy';
      else if (lower.includes('เวสป้า') || lower.includes('vespa')) vehicleName = 'Vespa';
      else if (lower.includes('บีเอ็ม') || lower.includes('bmw')) vehicleName = 'BMW';
      else if (lower.includes('ฟอร์ซ่า') || lower.includes('forza')) vehicleName = 'Forza 350';
      else if (lower.includes('เอ็กซ์แม็กซ์') || lower.includes('xmax')) vehicleName = 'XMAX 300';
      else if (lower.includes('นินจา') || lower.includes('ninja')) vehicleName = 'Kawasaki Ninja';
      else if (lower.includes('ประหยัด') || lower.includes('ถูกสุด') || lower.includes('เวฟ') || lower.includes('wave')) vehicleName = 'Honda Wave';

      const reply = `รับทราบครับ! กำลังเลือกรถ ${vehicleName} (ประหยัดสุด เริ่ม 15฿ เพิ่ม ฿0) ให้ท่านเรียบร้อยแล้ว`;
      setAssistantResponse(reply);
      if (audioEnabled) speakThaiText(reply);
      setCommandStatus('success');
      confetti({ particleCount: 40, spread: 60 });
      onSelectDreamRideByVoice(vehicleName);
      return;
    }

    // 3. WIN Express (Mandatory 20฿ box fee)
    if (lower.includes('express') || lower.includes('เอกซ์เพรส') || lower.includes('ส่งของ') || lower.includes('พัสดุ') || lower.includes('กล่อง')) {
      const reply = "เปิดบริการ WIN Express ฝากพี่วินส่งของด่วน บังคับบวกค่ากล่องนิรภัย 20 บาท และคัดกรองพี่วินเลเวล 10 ขึ้นไปเรียบร้อยครับ";
      setAssistantResponse(reply);
      if (audioEnabled) speakThaiText(reply);
      setCommandStatus('success');
      confetti({ particleCount: 40, spread: 60, colors: ['#10B981', '#FFD700'] });
      onSelectServiceByVoice('express', 'Win Express (บังคับค่ากล่อง +20฿ • Level 10+)');
      return;
    }

    // 4. WIN MU BUDDY (Female/Male Knight, Level 15+, Sacred Prayers & Routes)
    if (lower.includes('mu') || lower.includes('buddy') || lower.includes('มู') || lower.includes('ผู้หญิง') || lower.includes('ไหว้พระ') || lower.includes('สายมู') || lower.includes('บทสวด')) {
      const reply = "เปิดบริการ WIN MU BUDDY แนะนำพี่วินเลเวล 15 ขึ้นไป พร้อมระบบคลังบทสวดมนต์ศักดิ์สิทธิ์และเส้นทางสายมู 9 วัดเรียบร้อยครับ";
      setAssistantResponse(reply);
      if (audioEnabled) speakThaiText(reply);
      setCommandStatus('success');
      confetti({ particleCount: 40, spread: 60, colors: ['#FFD700', '#EC4899'] });
      onSelectServiceByVoice('mu', 'WIN MU BUDDY (สายมู 9 วัด • Level 15+)');
      return;
    }

    // 5. WIN Spirit (Elderly Care, Level 20+, All Religions - Mosque / Temple / Church / Shrine)
    if (lower.includes('spirit') || lower.includes('ผู้สูงอายุ') || lower.includes('คนแก่') || lower.includes('ละหมาด') || lower.includes('มัสยิด') || lower.includes('ทำบุญ') || lower.includes('ตักบาตร') || lower.includes('โบสถ์') || lower.includes('มิสซา') || lower.includes('ศาสนกิจ') || lower.includes('หาหมอ') || lower.includes('คุณตา') || lower.includes('คุณยาย')) {
      const reply = "เปิดบริการ WIN Spirit ดูแลผู้สูงอายุและบริการพาทำศาสนกิจทุกศาสนา (ละหมาดมัสยิด/ทำบุญ/โบสถ์) พี่วินเลเวล 20 ขึ้นไป พร้อมดูแลรอรับกลับเรียบร้อยครับ";
      setAssistantResponse(reply);
      if (audioEnabled) speakThaiText(reply);
      setCommandStatus('success');
      confetti({ particleCount: 40, spread: 60, colors: ['#F43F5E', '#FFD700'] });
      onSelectServiceByVoice('spirit', 'WIN Spirit (ดูแลผู้สูงอายุ & พาทำศาสนกิจ • Level 20+)');
      return;
    }

    // 6. WIN Family (Child Care, Level 15+)
    if (lower.includes('family') || lower.includes('เด็ก') || lower.includes('ลูก') || lower.includes('ครอบครัว') || lower.includes('โรงเรียน')) {
      const reply = "เปิดบริการ WIN Family รับส่งคนในครอบครัวและน้องๆ นักเรียน พี่วินเลเวล 15 ขึ้นไป พร้อมหมวกกันน็อกเด็กปลอดภัย 100% เรียบร้อยครับ";
      setAssistantResponse(reply);
      if (audioEnabled) speakThaiText(reply);
      setCommandStatus('success');
      confetti({ particleCount: 40, spread: 60, colors: ['#3B82F6', '#FFD700'] });
      onSelectServiceByVoice('family', 'WIN Family (รับส่งเด็ก & ครอบครัว • Level 15+)');
      return;
    }

    // 7. WIN Link (Short-Medium Fast Delivery for Lunchbox/Report)
    if (lower.includes('link') || lower.includes('ข้าวกล่อง') || lower.includes('รายงาน') || lower.includes('หอพัก') || lower.includes('ลืมไว้') || lower.includes('ส่งด่วน')) {
      const reply = "เปิดบริการ WIN Link ส่งของด่วนสายสัมพันธ์ระยะสั้น-กลาง เช่น แม่ส่งข้าวกล่องให้ลูกที่หอ หรือส่งรายงานที่ลืมไว้ เรียบร้อยครับ";
      setAssistantResponse(reply);
      if (audioEnabled) speakThaiText(reply);
      setCommandStatus('success');
      confetti({ particleCount: 40, spread: 60, colors: ['#00D2FF', '#FFD700'] });
      onSelectServiceByVoice('link', 'WIN LINK (ส่งของด่วนระยะสั้น-กลาง • แม่ส่งข้าวกล่อง)');
      return;
    }

    // 8. WIN Lifestyle (Food / Cafe / Pub / Pet Cafe)
    if (lower.includes('lifestyle') || lower.includes('คาเฟ่') || lower.includes('ร้านอาหาร') || lower.includes('ผับ') || lower.includes('บาร์') || lower.includes('หมาแมว') || lower.includes('สตรีทฟู้ด')) {
      const reply = "เปิดบริการ WIN Lifestyle แนะนำร้านอาหาร คาเฟ่ ผับบาร์ ร้านนั่งชิว และคาเฟ่สัตว์เลี้ยง Pet Friendly เรียบร้อยครับ";
      setAssistantResponse(reply);
      if (audioEnabled) speakThaiText(reply);
      setCommandStatus('success');
      confetti({ particleCount: 40, spread: 60, colors: ['#A855F7', '#FFD700'] });
      onSelectServiceByVoice('lifestyle', 'WIN Lifestyle (ร้านอาหาร • คาเฟ่ • ผับบาร์ • คาเฟ่สัตว์)');
      return;
    }

    // 9. Destination Setting (e.g. สยาม, อิมแพ็ค, ตลาดพลู)
    if (lower.includes('ไป') || lower.includes('สยาม') || lower.includes('ตลาดพลู') || lower.includes('ไอคอนสยาม') || lower.includes('อิมแพ็ค')) {
      let dest = text.replace(/เรียกรถมอเตอร์ไซค์ไป|เรียกรถไป|พาไป|ไปที่|ไป/g, '').trim();
      if (!dest) dest = 'สยามพารากอน';
      const reply = `รับทราบครับ! ปักหมุดปลายทางไปที่ "${dest}" และกำลังเปิดหน้าจองให้ทันที`;
      setAssistantResponse(reply);
      if (audioEnabled) speakThaiText(reply);
      setCommandStatus('success');
      confetti({ particleCount: 35, spread: 55 });
      onSetDestinationByVoice(dest);
      return;
    }

    // Fallback general response
    const reply = `รับคำสั่ง: "${text}" เรียบร้อยแล้วครับ ระบบ WINRIDER.AI กำลังจัดเตรียมอัศวินที่ตรงใจที่สุดให้ท่าน`;
    setAssistantResponse(reply);
    if (audioEnabled) speakThaiText(reply);
    setCommandStatus('success');
  };

  // Start Speech Recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("⚠️ เบราว์เซอร์นี้ยังไม่รองรับ Web Speech API โดยตรง ท่านสามารถแตะเลือกคำสั่งเสียงด่วนภาษาไทยด้านล่างได้ทันทีครับ");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        if (audioEnabled) playTactileBlip(1200);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
        if (event.results[0].isFinal) {
          processVoiceCommand(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#071126] rounded-3xl border-2 border-[#00D2FF] p-6 shadow-[0_0_50px_rgba(0,210,255,0.4)] space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00D2FF] via-blue-600 to-indigo-700 flex items-center justify-center text-2xl shadow-[0_0_20px_#00D2FF]">
              🎙️
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>WIN Voice Assistant (ระบบสั่งการด้วยเสียงภาษาไทย)</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FFD700] text-slate-950 font-bold font-mono">
                  VOICE AI
                </span>
              </h3>
              <p className="text-xs text-cyan-300 font-mono">
                สั่งการเรียกรถ เลือกรถในฝัน เลือกบริการ และส่งของด่วนได้ทันที
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Massive Interactive Microphone Visualizer */}
        <div className="text-center py-4 space-y-3">
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-[#00D2FF] animate-ping opacity-60" />
                <div className="absolute -inset-3 rounded-full border border-cyan-400/40 animate-pulse" />
              </>
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all active:scale-95 border-2 ${
                isListening 
                  ? 'bg-gradient-to-br from-rose-600 to-red-500 border-white animate-bounce shadow-[0_0_30px_#EF4444]' 
                  : 'bg-gradient-to-br from-[#00D2FF] via-blue-600 to-indigo-700 border-cyan-300 hover:brightness-110 shadow-[0_0_25px_#00D2FF]'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-8 h-8" />
                  <span className="text-[10px] font-bold mt-1 font-mono">แตะเพื่อหยุด</span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8" />
                  <span className="text-[10px] font-bold mt-1 font-mono">แตะเพื่อพูด</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs font-mono text-slate-300">
            {isListening ? (
              <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                <Radio className="w-4 h-4 text-emerald-400" />
                กำลังรับฟังเสียงภาษาไทยของคุณ...
              </span>
            ) : (
              'แตะปุ่มไมโครโฟนเพื่อพูด หรือแตะที่คำสั่งด่วนด้านล่าง'
            )}
          </p>

          {/* Live Transcript Display */}
          {transcript && (
            <div className="p-3 rounded-2xl bg-black/60 border border-cyan-500/40 text-xs font-mono text-cyan-300 text-left">
              <span className="text-[10px] text-slate-400 block mb-0.5">คุณพูดว่า:</span>
              <span className="text-white font-bold text-sm">"{transcript}"</span>
            </div>
          )}
        </div>

        {/* AI Assistant Feedback Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0B1A38] to-[#060D1E] border border-[#FFD700]/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#FFD700] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FFD700]" />
              การตอบสนองของระบบ (WINRIDER AI VOICE):
            </span>
            <button 
              onClick={() => {
                if (audioEnabled) {
                  playTactileBlip(1000);
                  speakThaiText(assistantResponse);
                }
              }}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 flex items-center gap-1 text-[10px] font-mono"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>อ่านออกเสียง</span>
            </button>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans">
            {assistantResponse}
          </p>
        </div>

        {/* Quick Voice Prompt Chips */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>คำสั่งเสียงภาษาไทยยอดนิยม (แตะเพื่อสั่งทันที):</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">1-TAP EXECUTION</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {quickVoicePrompts.map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(950);
                  setTranscript(prompt.action);
                  processVoiceCommand(prompt.action);
                }}
                className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-400 hover:bg-cyan-950/40 text-left text-xs text-slate-200 transition-all flex items-center justify-between gap-2 group"
              >
                <span className="text-[11px] leading-snug line-clamp-1">{prompt.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition-all"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
