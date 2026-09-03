import React, { useState, useEffect, useRef } from 'react';
import { playTactileBlip, speakThaiText } from '../utils/audio';
import { AppMode } from '../types';
import { 
  Mic, 
  X, 
  Sparkles, 
  AudioWaveform,
  Send
} from 'lucide-react';

interface CustomerVoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioEnabled: boolean;
  onNavigateTab: (tab: 'home' | 'dreamRide' | 'petCare' | 'ride' | 'shop' | 'profile') => void;
  onNavigateMode: (mode: AppMode) => void;
}

interface CommandAction {
  id: string;
  phrase: string;
  icon: string;
  category: 'ride' | 'shop' | 'profile' | 'pet' | 'emergency' | 'system';
  speechResponse: string;
  action: () => void;
}

export const CustomerVoiceCommandModal: React.FC<CustomerVoiceCommandModalProps> = ({
  isOpen,
  onClose,
  audioEnabled,
  onNavigateTab,
  onNavigateMode
}) => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [lastResponse, setLastResponse] = useState<string>(
    'สวัสดีค่ะ! ฉันคือผู้ช่วยเสียงลูกค้า สั่งเรียกรถ เปิดรถในฝัน สั่งของใน WIN SHOP หรือดูโปรไฟล์ได้เลยค่ะ'
  );
  const [activeActionHint, setActiveActionHint] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const recognitionRef = useRef<any>(null);

  // Command library specifically crafted for customer & passenger app operations
  const commandLibrary: CommandAction[] = [
    {
      id: 'call_ride_bts',
      phrase: 'เรียกวินไป BTS บางหว้า',
      icon: '📍',
      category: 'ride',
      speechResponse: 'รับทราบค่ะ! นำทางไปหน้าเรียกรถ พร้อมค้นหาพี่วินที่ใกล้คุณที่สุดไปยัง BTS บางหว้า ค่าโดยสารเริ่มต้น 2 บาทครองเมืองค่ะ',
      action: () => {
        onNavigateMode('passenger');
        onNavigateTab('ride');
      }
    },
    {
      id: 'dream_ride',
      phrase: 'เปิดหน้ารถในฝัน',
      icon: '🏍️',
      category: 'ride',
      speechResponse: 'เปิดหน้ารถในฝันและคลังแต่งรถอัศวิน Wave, PCX, Africa Twin ให้คุณเลือกสรรแล้วค่ะ',
      action: () => {
        onNavigateMode('passenger');
        onNavigateTab('dreamRide');
      }
    },
    {
      id: 'track_win_3d',
      phrase: 'ดูเรดาร์ติดตามพี่วิน (3D)',
      icon: '📡',
      category: 'ride',
      speechResponse: 'เปิดจอเรดาร์ 3 มิติ ติดตามพิกัดและระยะห่างของพี่วินแบบเรียลไทม์ให้แล้วค่ะ',
      action: () => {
        onNavigateMode('passenger');
        onNavigateTab('ride');
      }
    },
    {
      id: 'open_win_shop',
      phrase: 'เปิดตลาด WIN SHOP',
      icon: '🛒',
      category: 'shop',
      speechResponse: 'พาคุณเข้าสู่ตลาด WIN SHOP ช้อปดีลเด็ดและอุปกรณ์คุณภาพราคาประหยัดแล้วค่ะ',
      action: () => {
        onNavigateMode('passenger');
        onNavigateTab('shop');
      }
    },
    {
      id: 'view_profile_credit',
      phrase: 'ดูโปรไฟล์และวงเงินเครดิต',
      icon: '🦥',
      category: 'profile',
      speechResponse: 'เปิดหน้าโปรไฟล์พลเมือง ตรวจสอบตราอธิปไตย Level 100 และวงเงินเครดิตความน่าเชื่อถือ 5,000 บาทแล้วค่ะ',
      action: () => {
        onNavigateMode('passenger');
        onNavigateTab('profile');
      }
    },
    {
      id: 'pet_care_ride',
      phrase: 'เรียกรถพาน้องหมาน้องแมวไปหาหมอ',
      icon: '🐾',
      category: 'pet',
      speechResponse: 'เปิดบริการ WIN-Pet Care รถพร้อมแคปซูลปรับอากาศพาสัตว์เลี้ยงเดินทางอย่างปลอดภัยค่ะ',
      action: () => {
        onNavigateMode('passenger');
        onNavigateTab('petCare');
      }
    },
    {
      id: 'emergency_sos',
      phrase: 'แจ้งเหตุฉุกเฉิน SOS กู้ชีพ',
      icon: '🚨',
      category: 'emergency',
      speechResponse: 'เปิดศูนย์กู้ชีพและพยาบาลฉุกเฉินทันที พร้อมส่งพิกัดดาวเทียมให้ทีมช่วยเหลือค่ะ',
      action: () => {
        onNavigateMode('hospital');
      }
    },
    {
      id: 'check_fare_policy',
      phrase: 'เช็กค่าบริการ 2 บาทครองเมือง',
      icon: '⚡',
      category: 'system',
      speechResponse: 'แพลตฟอร์มวินคิดค่าธรรมเนียมเพียง 2 บาทครองเมือง ยุติธรรม โปร่งใส ไม่เอาเปรียบผู้โดยสารและคนขับค่ะ',
      action: () => {
        onNavigateMode('passenger');
        onNavigateTab('home');
      }
    }
  ];

  // Initialize Web Speech API if supported in browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'th-TH';
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setSpokenText(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
          if (spokenText) {
            processVoiceQuery(spokenText);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [spokenText]);

  if (!isOpen) return null;

  // Process user's spoken or typed intent
  const processVoiceQuery = (rawText: string) => {
    const text = rawText.trim().toLowerCase();
    if (!text) return;

    if (audioEnabled) playTactileBlip(900);

    // Matching logic
    let matchedCommand = commandLibrary.find(cmd => 
      text.includes(cmd.phrase.toLowerCase()) ||
      (cmd.id === 'call_ride_bts' && (text.includes('bts') || text.includes('เรียกวิน') || text.includes('ไปบางหว้า') || text.includes('ไปตลาดพลู') || text.includes('เรียกรถ'))) ||
      (cmd.id === 'dream_ride' && (text.includes('รถในฝัน') || text.includes('แต่งรถ') || text.includes('คัสตอม') || text.includes('wave') || text.includes('pcx'))) ||
      (cmd.id === 'track_win_3d' && (text.includes('เรดาร์') || text.includes('3d') || text.includes('ตามวิน') || text.includes('พี่วินอยู่ไหน') || text.includes('รอพี่วิน'))) ||
      (cmd.id === 'open_win_shop' && (text.includes('ช้อป') || text.includes('ร้านค้า') || text.includes('ซื้อของ') || text.includes('shop') || text.includes('หมวกกันน็อก'))) ||
      (cmd.id === 'view_profile_credit' && (text.includes('โปรไฟล์') || text.includes('เครดิต') || text.includes('วงเงิน') || text.includes('สลอต') || text.includes('พลเมือง'))) ||
      (cmd.id === 'pet_care_ride' && (text.includes('สัตว์เลี้ยง') || text.includes('หมา') || text.includes('แมว') || text.includes('pet') || text.includes('หาหมอ'))) ||
      (cmd.id === 'emergency_sos' && (text.includes('ฉุกเฉิน') || text.includes('sos') || text.includes('กู้ชีพ') || text.includes('โรงพยาบาล') || text.includes('ช่วยด้วย'))) ||
      (cmd.id === 'check_fare_policy' && (text.includes('2 บาท') || text.includes('ค่าโดยสาร') || text.includes('ราคา') || text.includes('ครองเมือง')))
    );

    if (matchedCommand) {
      setLastResponse(matchedCommand.speechResponse);
      setActiveActionHint(`ดำเนินการ: ${matchedCommand.phrase}`);
      if (audioEnabled) {
        speakThaiText(matchedCommand.speechResponse, 'fah_sai');
      }
      setTimeout(() => {
        matchedCommand.action();
        onClose();
      }, 1800);
    } else {
      const fallback = `รับทราบคำสั่ง "${rawText}" ค่ะ กำลังนำทางไปหน้าหลักเพื่อช่วยเหลือคุณค่ะ`;
      setLastResponse(fallback);
      setActiveActionHint(`ค้นหาในแอป: "${rawText}"`);
      if (audioEnabled) {
        speakThaiText(fallback, 'fah_sai');
      }
      setTimeout(() => {
        onNavigateMode('passenger');
        onNavigateTab('home');
        onClose();
      }, 2000);
    }
  };

  const handleStartListening = () => {
    if (recognitionRef.current) {
      try {
        setSpokenText('');
        setIsListening(true);
        if (audioEnabled) playTactileBlip(1200);
        recognitionRef.current.start();
        return;
      } catch {
        // Fall back to simulation
      }
    }

    // Simulation fallback if browser mic permission denied or running in sandbox
    setIsListening(true);
    setSpokenText('กำลังฟังเสียงคำสั่งของคุณ...');
    if (audioEnabled) playTactileBlip(1200);

    setTimeout(() => {
      const sampleQueries = [
        'เรียกวินไป BTS บางหว้า',
        'เปิดหน้ารถในฝัน',
        'ดูเรดาร์ติดตามพี่วิน (3D)',
        'เปิดตลาด WIN SHOP',
        'ดูโปรไฟล์และวงเงินเครดิต'
      ];
      const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
      setSpokenText(randomQuery);
      setIsListening(false);
      processVoiceQuery(randomQuery);
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#070D1E] border border-cyan-500/50 rounded-3xl flex flex-col shadow-[0_0_50px_rgba(0,210,255,0.35)] overflow-hidden">
        
        {/* Header: Specific to Customer & Passenger Voice Commands */}
        <div className="p-4 bg-gradient-to-r from-[#0A1A3A] via-[#091530] to-[#070D1E] border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(0,210,255,0.5)]">
              <AudioWaveform className="w-5 h-5 text-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>สั่งการด้วยเสียงลูกค้า (Customer Voice AI)</span>
                </h3>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <p className="text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                <span>โหมด: ผู้โดยสารและลูกค้าใช้งานแอป</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-400 font-bold">100% Touchless UI</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* AI Response Display Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-[#0C1E3C] to-[#071124] border border-cyan-500/30 relative overflow-hidden shadow-inner">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                  <span>น้องฟ้าใส AI ตอบกลับ</span>
                  {activeActionHint && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {activeActionHint}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                  {lastResponse}
                </p>
              </div>
            </div>

            {spokenText && (
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2 text-xs font-mono text-amber-300">
                <span className="text-slate-400">คำสั่งเสียงที่คุณพูด:</span>
                <span className="font-bold bg-black/40 px-2 py-0.5 rounded border border-amber-400/30 truncate">
                  "{spokenText}"
                </span>
              </div>
            )}
          </div>

          {/* Center Microphone Button with Sound Wave Animations */}
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="relative">
              {isListening && (
                <>
                  <div className="absolute -inset-4 rounded-full bg-cyan-400/20 animate-ping pointer-events-none" />
                  <div className="absolute -inset-8 rounded-full bg-cyan-500/10 animate-pulse pointer-events-none" />
                </>
              )}
              <button
                id="customer-voice-mic-main-btn"
                onClick={handleStartListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl relative z-10 active:scale-95 ${
                  isListening
                    ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_0_35px_rgba(244,63,94,0.6)] animate-pulse'
                    : 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 shadow-[0_0_30px_rgba(0,210,255,0.6)] hover:scale-105'
                }`}
              >
                {isListening ? (
                  <AudioWaveform className="w-10 h-10 animate-bounce text-white" />
                ) : (
                  <AudioWaveform className="w-10 h-10 text-slate-950" />
                )}
              </button>
            </div>

            <div className="text-center">
              <span className="text-xs font-black text-white block">
                {isListening ? 'กำลังรับฟังคลื่นเสียงของคุณ...' : 'แตะคลื่นเสียงเพื่อพูดสั่งการแอป'}
              </span>
              <p className="text-[11px] text-slate-400">
                รองรับภาษาไทย พูดสั่งเรียกรถ ช้อปปิ้ง หรือเปิดเมนูต่างๆ ได้ทันที
              </p>
            </div>
          </div>

          {/* Text input alternative */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInput.trim()) {
                    processVoiceQuery(customInput);
                    setCustomInput('');
                  }
                }}
                placeholder="หรือพิมพ์คำสั่งที่ต้องการ เช่น เรียกวินไป BTS บางหว้า..."
                className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => {
                  if (customInput.trim()) {
                    processVoiceQuery(customInput);
                    setCustomInput('');
                  }
                }}
                className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
