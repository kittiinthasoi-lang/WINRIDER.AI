import React, { useState } from 'react';
import { CI_MAP_ZONES } from '../data/bibleData';
import { playTactileBlip, playRadarScan, speakThaiText } from '../utils/audio';
import { 
  Radio, 
  Map, 
  Cpu, 
  Send, 
  Mic, 
  MicOff, 
  Bot, 
  Zap, 
  ShieldCheck, 
  Compass, 
  Navigation,
  Eye,
  Droplets,
  Repeat
} from 'lucide-react';

interface Props {
  audioEnabled: boolean;
}

export const IntelligenceStealthSection: React.FC<Props> = ({ audioEnabled }) => {
  const [selectedZone, setSelectedZone] = useState<string>(CI_MAP_ZONES[0].id);
  const [stealthModeActive, setStealthModeActive] = useState<boolean>(true);
  const [floodAvoidanceActive, setFloodAvoidanceActive] = useState<boolean>(true);
  
  // WIN Buddy AI Live Interaction State
  const [inputVoiceQuery, setInputVoiceQuery] = useState<string>('');
  const [buddyMessages, setBuddyMessages] = useState<Array<{ sender: 'rider' | 'buddy'; text: string; time: string; protocol?: string }>>([
    {
      sender: 'buddy',
      text: 'สวัสดีครับพี่อัศวิน! WIN Buddy AI พร้อมปฏิบัติการภาคสนาม เชื่อมต่อกับระบบ CI Map เส้นเลือดฝอยฝั่งธนบุรีเรียบร้อย สั่งงานด้วยเสียงหรือกดคีย์ลัดได้ทันทีครับ',
      time: '10:00',
      protocol: 'system_ready'
    }
  ]);
  const [isLoadingBuddy, setIsLoadingBuddy] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const activeZoneData = CI_MAP_ZONES.find(z => z.id === selectedZone) || CI_MAP_ZONES[0];

  const handleSendBuddyQuery = async (queryText?: string, mode?: string) => {
    const textToSend = queryText || inputVoiceQuery;
    if (!textToSend.trim()) return;

    if (audioEnabled) playTactileBlip(950);

    const currentTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const newRiderMsg = { sender: 'rider' as const, text: textToSend, time: currentTime };
    setBuddyMessages(prev => [...prev, newRiderMsg]);
    setInputVoiceQuery('');
    setIsLoadingBuddy(true);

    try {
      const response = await fetch('/api/win-buddy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          mode: mode || 'voice_nlp',
          context: {
            currentZone: activeZoneData.name,
            stealthMode: stealthModeActive,
            floodAvoidance: floodAvoidanceActive,
            time: currentTime,
          }
        })
      });

      const data = await response.json();
      const buddyReply = data.reply || 'รับทราบคำสั่งครับพี่อัศวิน WIN Buddy กำลังดำเนินการ';
      
      setBuddyMessages(prev => [
        ...prev, 
        { sender: 'buddy', text: buddyReply, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), protocol: data.protocol }
      ]);

      if (audioEnabled) {
        speakThaiText(buddyReply);
      }
    } catch (error) {
      console.error('Error contacting WIN Buddy AI:', error);
      const fallbackReply = '📍 รับทราบคำสั่งครับพี่อัศวิน ระบบประมวลผล Safe Pass & Backhaul Match ทำงานในโหมด Tactical Offline เรียบร้อย!';
      setBuddyMessages(prev => [
        ...prev, 
        { sender: 'buddy', text: fallbackReply, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }
      ]);
      if (audioEnabled) speakThaiText(fallbackReply);
    } finally {
      setIsLoadingBuddy(false);
    }
  };

  const handleTriggerQuickProtocol = (protocolName: string, text: string) => {
    if (audioEnabled) playRadarScan();
    handleSendBuddyQuery(text, protocolName);
  };

  const handleSimulateMic = () => {
    if (!isListening) {
      setIsListening(true);
      if (audioEnabled) playTactileBlip(1200);
      setTimeout(() => {
        setIsListening(false);
        handleSendBuddyQuery('บัดดี้ หางานขากลับเข้าซอยจรัญ 13 ด่วนเลย มีอัศวินคนไหนส่งต่อไหม?', 'backhaul');
      }, 2500);
    }
  };

  return (
    <section className="space-y-10">
      {/* Title Header */}
      <div className="relative rounded-2xl overflow-hidden border border-[#00D2FF]/30 bg-gradient-to-br from-[#070D1E] via-[#08183E] to-[#050A17] p-6 sm:p-10 shadow-[0_0_30px_rgba(0,210,255,0.15)]">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] text-xs font-bold tracking-wide">
            <Radio className="w-3.5 h-3.5" /> BIBLE CHAPTER 03 : INTELLIGENCE & STEALTH
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            สมองกลและการจารกรรม <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] via-[#5CE1E6] to-[#FFD700]">
              ยุทธการ CI Map "Ghost Runners" & ผู้ช่วยเสียง WIN Buddy AI
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
            แผนที่ลับเส้นเลือดฝอยที่ Google Map มองไม่เห็น ได้รับการสแกนและบันทึกโดยนักวิ่งเงา <strong>Ghost Runners</strong> ผสานกับปัญญาประดิษฐ์สั่งงานด้วยเสียง 100% เชื่อมต่ออัศวินเป็นโครงข่ายประสาทเดียวทั่วพระนคร
          </p>
        </div>
      </div>

      {/* CI Map Intelligence Visualizer & Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Map Interactive Canvas */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-bold text-cyan-400 font-mono">STEALTH CAPILLARY RADAR</span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Map className="w-4 h-4 text-cyan-300" /> แผนที่เส้นเลือดฝอยลับฝั่งธนบุรี (CI Map)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="toggle-stealth-btn"
                onClick={() => {
                  setStealthModeActive(!stealthModeActive);
                  if (audioEnabled) playTactileBlip(700);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1 border transition-all ${
                  stealthModeActive 
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(0,210,255,0.3)]' 
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Stealth Mode
              </button>
              <button
                id="toggle-flood-btn"
                onClick={() => {
                  setFloodAvoidanceActive(!floodAvoidanceActive);
                  if (audioEnabled) playTactileBlip(800);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1 border transition-all ${
                  floodAvoidanceActive 
                    ? 'bg-blue-950 text-blue-300 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" /> เลี่ยงน้ำท่วม
              </button>
            </div>
          </div>

          {/* Simulated Radar Visual Area */}
          <div className="relative h-64 sm:h-72 w-full rounded-xl bg-gradient-to-br from-[#02050E] via-[#050C1F] to-[#030714] border border-cyan-500/20 overflow-hidden flex items-center justify-center">
            {/* Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00d2ff0a_1px,transparent_1px),linear-gradient(to_bottom,#00d2ff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            {/* Radar Circular Rings */}
            <div className="absolute w-56 h-56 rounded-full border border-cyan-500/20 animate-pulse pointer-events-none" />
            <div className="absolute w-36 h-36 rounded-full border border-cyan-500/30 pointer-events-none" />
            <div className="absolute w-16 h-16 rounded-full border border-cyan-500/40 pointer-events-none" />

            {/* Sweep Needle */}
            <div className="absolute w-56 h-56 rounded-full border-t-2 border-cyan-400/40 animate-spin pointer-events-none" style={{ animationDuration: '6s' }} />

            {/* Ghost Runner Nodes */}
            <div className="relative z-10 w-full h-full p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-cyan-400 bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  GHOST RUNNERS: {activeZoneData.ghostRunnersCount} ACTIVE
                </span>
                <span className="text-[10px] font-mono text-amber-400 bg-black/60 px-2 py-0.5 rounded border border-amber-500/30">
                  COVERAGE: {activeZoneData.stealthCoverage}%
                </span>
              </div>

              {/* Center Map Tag */}
              <div className="text-center space-y-1 bg-black/70 p-3 rounded-xl border border-cyan-500/30 backdrop-blur-sm max-w-sm mx-auto shadow-2xl">
                <p className="text-xs font-bold text-white">{activeZoneData.nameTh}</p>
                <p className="text-[11px] text-cyan-300 font-mono flex items-center justify-center gap-1">
                  <Navigation className="w-3 h-3" /> {activeZoneData.keyShortcut}
                </p>
              </div>

              <div className="flex justify-between items-end text-[10px] font-mono text-slate-400">
                <span>ความเสี่ยงน้ำท่วม: <strong className={activeZoneData.floodRisk === 'Low' ? 'text-emerald-400' : 'text-amber-400'}>{activeZoneData.floodRisk}</strong></span>
                <span>{activeZoneData.capillaryRoutesMapped} เส้นเลือดฝอยที่บันทึกแล้ว</span>
              </div>
            </div>
          </div>

          {/* Zone Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CI_MAP_ZONES.map((zone) => (
              <button
                key={zone.id}
                id={`btn-zone-${zone.id}`}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(600);
                  setSelectedZone(zone.id);
                }}
                className={`p-2 rounded-lg text-left text-xs transition-all border ${
                  selectedZone === zone.id
                    ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                    : 'bg-black/30 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <p className="font-bold truncate">{zone.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{zone.ghostRunnersCount} Runners</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Live WIN Buddy AI Voice & Tactical Copilot */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#070D1E] border border-[#00D2FF]/40 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>WIN BUDDY AI</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-[10px] text-cyan-300 font-mono">100% Touchless Voice NLP Copilot</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
              TACTICAL ENGINE
            </span>
          </div>

          {/* Quick AI Protocols Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              id="proto-backhaul-btn"
              onClick={() => handleTriggerQuickProtocol('backhaul', 'บัดดี้ ตรวจหางานขากลับแถวตลาดพลูให้หน่อย')}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-950/60 border border-cyan-600/40 text-cyan-300 hover:bg-cyan-900/60 transition-all flex items-center gap-1"
            >
              <Repeat className="w-3 h-3" /> Backhaul Match
            </button>
            <button
              id="proto-safepass-btn"
              onClick={() => handleTriggerQuickProtocol('safepass', 'ซอยแคบมาก ขอโอนงาน Safe Pass ให้เพื่อนอัศวิน')}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-950/60 border border-cyan-600/40 text-cyan-300 hover:bg-cyan-900/60 transition-all flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Safe Pass Transfer
            </button>
            <button
              id="proto-predictive-btn"
              onClick={() => handleTriggerQuickProtocol('predictive', 'เปิดโหมด เราไปส่งได้นะ พยากรณ์ฝนและลูกค้า')}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-950/60 border border-cyan-600/40 text-cyan-300 hover:bg-cyan-900/60 transition-all flex items-center gap-1"
            >
              <Compass className="w-3 h-3" /> Predictive Dispatch
            </button>
            <button
              id="proto-armor-btn"
              onClick={() => handleTriggerQuickProtocol('armor', 'เช็คสถานะ The Guardian Zipper และแบตเตอรี่ชิป')}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-950/60 border border-amber-600/40 text-amber-300 hover:bg-amber-900/60 transition-all flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" /> Armor Status
            </button>
          </div>

          {/* Chat Messages Feed */}
          <div className="h-56 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-black/40 border border-white/5 text-xs">
            {buddyMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'rider' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-2.5 rounded-xl max-w-[88%] leading-relaxed ${
                    msg.sender === 'rider'
                      ? 'bg-[#00D2FF] text-slate-950 font-medium rounded-tr-none'
                      : 'bg-[#0A1838] text-slate-200 border border-cyan-500/30 rounded-tl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-0.5 px-1">{msg.time}</span>
              </div>
            ))}
            {isLoadingBuddy && (
              <div className="flex items-center gap-2 text-cyan-400 text-xs py-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                <span>WIN Buddy กำลังประมวลผลตรรกะจักรวาล...</span>
              </div>
            )}
          </div>

          {/* Voice & Input Area */}
          <div className="flex items-center gap-2">
            <button
              id="buddy-mic-toggle-btn"
              onClick={handleSimulateMic}
              title="กดเพื่อสั่งงานด้วยเสียง NLP (Hands-free Voice Command)"
              className={`p-3 rounded-xl transition-all flex items-center justify-center border ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-[0_0_15px_#f43f5e]'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <input
              id="buddy-text-input"
              type="text"
              placeholder={isListening ? 'กำลังรับฟังเสียงคำสั่ง...' : 'พิมพ์คำสั่ง หรือสั่งงานด้วยเสียง...'}
              value={inputVoiceQuery}
              onChange={(e) => setInputVoiceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendBuddyQuery();
              }}
              className="flex-1 px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />

            <button
              id="buddy-send-btn"
              onClick={() => handleSendBuddyQuery()}
              disabled={isLoadingBuddy}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
