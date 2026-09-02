import React, { useState } from 'react';
import { playTactileBlip, playLevelUpFanfare, playRadarScan } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Shield, 
  Zap, 
  Activity, 
  Wind, 
  HardHat, 
  Shirt, 
  CheckCircle2, 
  Sparkles, 
  Award, 
  Sliders, 
  Eye, 
  Flame,
  Radio,
  HelpCircle,
  RotateCw
} from 'lucide-react';

interface ArmorLevelTestingLabProps {
  audioEnabled?: boolean;
  onEquipSuit?: (suitId: string) => void;
}

export const ArmorLevelTestingLab: React.FC<ArmorLevelTestingLabProps> = ({ 
  audioEnabled = true,
  onEquipSuit 
}) => {
  const [selectedSimLevel, setSelectedSimLevel] = useState<number>(45);
  const [isTestingActive, setIsTestingActive] = useState<boolean>(false);
  const [activeTestModule, setActiveTestModule] = useState<'impact' | 'aero' | 'hud' | 'all'>('all');
  const [testScore, setTestScore] = useState<{ impact: number; aero: number; hud: number } | null>({
    impact: 94.8,
    aero: 89.2,
    hud: 98.6
  });

  // Quiz state for driver XP reward
  const [activeQuizIndex, setActiveQuizIndex] = useState<number>(0);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const quizQuestions = [
    {
      q: 'โมเดลผ่อนชุดเกราะ 4 บาท (1+1+1+1) หักเฉพาะกี่รอบแรกของวัน?',
      options: [
        '10 รอบแรกของวัน',
        '20 รอบแรกของวัน (สูงสุด 80฿/วัน)',
        'หักทุกรอบตลอดวันไม่มีจำกัด',
        '30 รอบแรกของวัน'
      ],
      correct: 1,
      explanation: 'ถูกต้อง! หักเพียง 20 รอบแรกของวัน (วันละ 80฿) รอบที่ 21 เป็นต้นไปฟรีค่าผ่อนเกราะทันที ผ่อนครบ 45 วันรับกรรมสิทธิ์ 100%'
    },
    {
      q: 'ค่าบริการ "2 บาทครองเมือง" ของ WINRIDER.AI แบ่ง 1 บาทหลังไปที่ใด?',
      options: [
        'กำไรผู้ถือหุ้นต่างชาติ',
        'ค่าโฆษณาทีวี',
        'ประกันอุบัติเหตุคุ้มครอง 100% & กองทุนเกษียณอัศวิน',
        'ค่าบริการซอฟต์แวร์รายเดือน'
      ],
      correct: 2,
      explanation: 'ถูกต้อง! 1 บาทแรกพัฒนา AI/Cloud Server และ 1 บาทหลังสมทบกองทุนสวัสดิการเกษียณและประกันภัยของอัศวิน'
    },
    {
      q: 'ชุดเกราะอัศวินระดับสูงใช้วัสดุการ์ดป้องกันจุดสำคัญชนิดใด?',
      options: [
        'การ์ดฟองน้ำทั่วไป',
        'การ์ด D3O โมเลกุลอัจฉริยะซับแรงกระแทก + ผืนผ้า Cordura 600D',
        'พลาสติกแข็งรีไซเคิล',
        'แผ่นโฟมอัดแน่น'
      ],
      correct: 1,
      explanation: 'ถูกต้อง! การ์ด D3O นุ่มยืดหยุ่นขณะขับขี่ แต่จะแข็งตัวทันทีเมื่อเกิดแรงกระแทกเพื่อปกป้องร่างกายอัศวิน 100%'
    }
  ];

  // Level simulation tiers (Level 1 to 100 - 10 Tiers)
  const tierData = [
    {
      level: 1,
      title: 'Level 1–10: อัศวินพื้นฐาน (Standard Knight)',
      defense: 72,
      aero: 78,
      weather: 75,
      honorBonus: '+0%',
      suitId: 'suit-v1',
      perk: 'เสื้อเกราะ + หมวกกันน็อก รุ่น Standard, ชิลด์ใส UV400, การ์ดมาตรฐาน CE, The Guardian Zipper'
    },
    {
      level: 11,
      title: 'Level 11–20: อัศวินทองแดง (Bronze Knight)',
      defense: 78,
      aero: 82,
      weather: 80,
      honorBonus: '+10% Safe Pass',
      suitId: 'suit-v2',
      perk: 'เสื้อเกราะ + หมวกกันน็อก รุ่น Bronze Edition, การ์ด D3O, ลายเส้นทองแดงขัดเงา'
    },
    {
      level: 21,
      title: 'Level 21–30: อัศวินเงิน (Silver Knight)',
      defense: 84,
      aero: 86,
      weather: 84,
      honorBonus: '+20% VIP Matching',
      suitId: 'suit-v3',
      perk: 'เสื้อเกราะ + หมวกกันน็อก รุ่น Silver Edition, ชิลด์ปรอทเงิน HUD สะท้อนความร้อน'
    },
    {
      level: 31,
      title: 'Level 31–40: อัศวินทองคำ (Gold Knight)',
      defense: 90,
      aero: 90,
      weather: 88,
      honorBonus: '+35% Escort Bonus',
      suitId: 'suit-v4',
      perk: 'เสื้อเกราะ + หมวกกันน็อก รุ่น Gold Edition, สลักด้ายทองคำ 3%, กระจก Gold Mirrored Smart HUD'
    },
    {
      level: 41,
      title: 'Level 41–50: อัศวินแพลตินัม (Platinum Knight)',
      defense: 94,
      aero: 93,
      weather: 92,
      honorBonus: '+50% Elite Access',
      suitId: 'suit-v5',
      perk: 'เสื้อเกราะ + หมวกกันน็อก รุ่น Platinum Edition, Carbon Fiber Multi-Layer, เซ็นเซอร์แรงกระแทกสด'
    },
    {
      level: 51,
      title: 'Level 51–60: อัศวินเพชร (Diamond Knight)',
      defense: 96,
      aero: 95,
      weather: 95,
      honorBonus: '+65% CI Master Map',
      suitId: 'suit-v6',
      perk: 'เสื้อเกราะ + หมวกกันน็อก รุ่น Diamond Edition, ผ้า Gore-Tex Pro + โครงสร้างรังผึ้งเพชร'
    },
    {
      level: 61,
      title: 'Level 61–70: อัศวินผู้พิชิต (Conqueror Knight)',
      defense: 97,
      aero: 97,
      weather: 96,
      honorBonus: '+80% Long Haul Bonus',
      suitId: 'suit-v7',
      perk: 'รุ่นผู้พิชิต มี 4 แบบสะสมตามซีซัน (Spring, Storm, Cyber, Iron Blood) เป็นกุญแจสู่ขั้นจักรพรรดิ'
    },
    {
      level: 71,
      title: 'Level 71–80: อัศวินจักรพรรดิ (Emperor Knight)',
      defense: 99,
      aero: 98,
      weather: 98,
      honorBonus: '+90% Sovereign Council',
      suitId: 'suit-v8',
      perk: 'รุ่นจักรพรรดิ (ผู้นำวิก) ✦ เงื่อนไข: สะสมชุดผู้พิชิตครบทั้ง 4 แบบก่อนถึงจะเริ่มปลดล็อกได้!'
    },
    {
      level: 81,
      title: 'Level 81–90: อัศวินตำนาน (Legendary Knight)',
      defense: 99,
      aero: 99,
      weather: 99,
      honorBonus: '+95% Master Trainer',
      suitId: 'suit-v9',
      perk: 'รุ่นอัศวินผู้เป็นตำนาน มี 3 แบบระดับอภิมหาแรร์ให้สะสม สลับใส่ชุดย้อนหลังได้ทุกสไตล์ 100%'
    },
    {
      level: 91,
      title: 'Level 91–100: อัศวินเทพเจ้า (Godlike Knight)',
      defense: 100,
      aero: 100,
      weather: 100,
      honorBonus: '+100% Cosmic Sovereign (Max)',
      suitId: 'suit-v10',
      perk: 'รุ่น Godlike Custom Edition ร่วมออกแบบเองได้ มี 1 เดียวในโลก งบตัดชุด 100,000฿ บันทึกชื่อนิรันดร์'
    }
  ];

  const currentTier = [...tierData].reverse().find(t => selectedSimLevel >= t.level) || tierData[0];

  const handleRunStressTest = () => {
    setIsTestingActive(true);
    if (audioEnabled) playRadarScan();

    setTimeout(() => {
      setIsTestingActive(false);
      setTestScore({
        impact: +(90 + Math.random() * 9.5).toFixed(1),
        aero: +(88 + Math.random() * 11.5).toFixed(1),
        hud: +(95 + Math.random() * 4.9).toFixed(1)
      });
      if (audioEnabled) playLevelUpFanfare();
      confetti({
        particleCount: 45,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#00D2FF', '#FFD700', '#10B981']
      });
    }, 1200);
  };

  const handleAnswerQuiz = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
    const isCorrect = optionIndex === quizQuestions[activeQuizIndex].correct;
    if (isCorrect) {
      if (audioEnabled) playLevelUpFanfare();
      setQuizScore(prev => prev + 1);
    } else {
      if (audioEnabled) playTactileBlip(400);
    }
  };

  const handleNextQuizQuestion = () => {
    if (activeQuizIndex + 1 < quizQuestions.length) {
      setActiveQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setQuizCompleted(true);
      if (audioEnabled) playLevelUpFanfare();
      confetti({
        particleCount: 60,
        spread: 80,
        colors: ['#FFD700', '#00D2FF', '#FFFFFF']
      });
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0B1530] via-[#070D1E] to-[#040813] border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(0,210,255,0.2)] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg">
            <Activity className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">ศูนย์ทดสอบสมรรถนะ & เลเวลเกราะ</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 font-bold">
                ARMOR LAB & SIMULATOR
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              ทดสอบค่าซับแรงกระแทก D3O, อุโมงค์ลมแอโรไดนามิกส์, ค่าหน่วงบลูทูธ HUD และจำลองการไต่เลเวลเกราะอัศวิน
            </p>
          </div>
        </div>
      </div>

      {/* Level Tier Simulator Slider */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5 font-mono">
            <Sliders className="w-4 h-4 text-[#FFD700]" />
            เลือกระดับเลเวลเกราะจำลอง (Level 1 - 100):
          </span>
          <span className="font-mono font-black text-cyan-300 text-sm bg-cyan-950/80 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
            LEVEL {selectedSimLevel}
          </span>
        </div>

        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={selectedSimLevel}
          onChange={(e) => {
            setSelectedSimLevel(Number(e.target.value));
            if (audioEnabled) playTactileBlip(450 + Number(e.target.value) * 6);
          }}
          className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        {/* Tier Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-center text-[10px] font-mono">
          {tierData.map((t, idx) => {
            const nextLevel = tierData[idx + 1]?.level || 101;
            const isMatch = selectedSimLevel >= t.level && selectedSimLevel < nextLevel;
            return (
              <button
                key={t.level}
                onClick={() => {
                  setSelectedSimLevel(t.level);
                  if (audioEnabled) playTactileBlip(800);
                }}
                className={`p-2 rounded-xl border transition-all text-left space-y-0.5 ${
                  isMatch 
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,210,255,0.3)]' 
                    : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-[11px] text-white">LVL {t.level}</div>
                <div className="text-[9px] truncate text-cyan-300">{t.title.split(':')[1]}</div>
                <div className="text-[8px] text-amber-300 font-bold">{t.honorBonus}</div>
              </button>
            );
          })}
        </div>

        {/* Current Selected Tier Card Preview */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0C1E40] via-[#091630] to-[#060F22] border border-cyan-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>{currentTier.title}</span>
            </h4>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40">
              โบนัส: {currentTier.honorBonus}
            </span>
          </div>

          <p className="text-[11px] text-slate-300">
            <strong>สิทธิประโยชน์ & สเปก:</strong> {currentTier.perk}
          </p>

          {/* Dynamic Telemetry Stats Bars */}
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs text-center">
            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[9px] text-slate-400 block">DEFENSE (D3O)</span>
              <span className="text-cyan-300 font-bold">{currentTier.defense}%</span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[9px] text-slate-400 block">AERODYNAMICS</span>
              <span className="text-emerald-400 font-bold">{currentTier.aero}%</span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[9px] text-slate-400 block">WEATHERPROOF</span>
              <span className="text-blue-400 font-bold">{currentTier.weather}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stress Test Simulator & Benchmarking */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0D1E42] via-[#09152E] to-[#070E22] border border-[#FFD700]/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFD700] font-mono">
            <Zap className="w-4 h-4 text-[#FFD700]" />
            <span>ผลการทดสอบห้องแล็บอธิปไตย (LIVE STRESS BENCHMARK)</span>
          </div>
          <button
            onClick={handleRunStressTest}
            disabled={isTestingActive}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md ${
              isTestingActive
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#FFD700] to-amber-500 text-slate-950 hover:brightness-110'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isTestingActive ? 'animate-spin' : ''}`} />
            <span>{isTestingActive ? 'กำลังทดสอบ...' : 'รันผลทดสอบแล็บสด'}</span>
          </button>
        </div>

        {/* Benchmark 3 Gauges */}
        {testScore && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono">
            {/* Impact Test */}
            <div className="p-3 rounded-2xl bg-black/50 border border-cyan-500/30 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  แรงกระแทก D3O
                </span>
                <span className="text-cyan-300 font-black text-sm">{testScore.impact}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${testScore.impact}%` }} />
              </div>
              <p className="text-[9px] text-slate-400">ซับแรงกระแทกสูงกว่าเกณฑ์ ECE 22.06 มาตรฐานสากล</p>
            </div>

            {/* Aerodynamics Wind Test */}
            <div className="p-3 rounded-2xl bg-black/50 border border-emerald-500/30 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-emerald-400" />
                  อุโมงค์ลม 140km/h
                </span>
                <span className="text-emerald-300 font-black text-sm">{testScore.aero}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${testScore.aero}%` }} />
              </div>
              <p className="text-[9px] text-slate-400">ลดแรงต้านลม ลู่ลม ลดความล้ากล้ามเนื้อคอ 40%</p>
            </div>

            {/* HUD & Comms Latency Test */}
            <div className="p-3 rounded-2xl bg-black/50 border border-amber-500/30 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  HUD & Comms Latency
                </span>
                <span className="text-amber-300 font-black text-sm">{testScore.hud}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${testScore.hud}%` }} />
              </div>
              <p className="text-[9px] text-slate-400">ความหน่วงต่ำเพียง 1.2ms ต่อบลูทูธฉุกเฉินและระบบ AI</p>
            </div>
          </div>
        )}
      </div>

      {/* Knight Armor Mastery Quiz for +1,500 XP */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#09152E] via-[#060F22] to-[#040A18] border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 font-mono">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>แบบทดสอบจิตวิญญาณ & ความรู้เกราะอัศวิน (+1,500 XP)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] font-bold">
            ข้อที่ {activeQuizIndex + 1} / {quizQuestions.length}
          </span>
        </div>

        {!quizCompleted ? (
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-white leading-relaxed">
              {quizQuestions[activeQuizIndex].q}
            </h4>

            <div className="space-y-2">
              {quizQuestions[activeQuizIndex].options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === quizQuestions[activeQuizIndex].correct;
                let btnStyle = 'bg-black/40 border-white/10 hover:border-cyan-400/50 text-slate-200';
                
                if (selectedAnswer !== null) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-950/80 border-emerald-400 text-emerald-200 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={selectedAnswer !== null}
                    onClick={() => handleAnswerQuiz(idx)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {selectedAnswer !== null && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedAnswer !== null && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-cyan-200 bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/30">
                  💡 {quizQuestions[activeQuizIndex].explanation}
                </p>
                <button
                  onClick={handleNextQuizQuestion}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[#FFD700] text-slate-950 font-black text-xs shadow-md"
                >
                  {activeQuizIndex + 1 < quizQuestions.length ? 'ไปข้อถัดไป &rarr;' : 'ดูผลคะแนนรวม & รับ XP'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-[#FFD700] to-emerald-400 flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg">
              🏆
            </div>
            <div>
              <h4 className="text-sm font-black text-white">ยอดเยี่ยม! คุณผ่านการทดสอบ {quizScore}/{quizQuestions.length} ข้อ</h4>
              <p className="text-xs text-amber-300 font-mono mt-0.5">+1,500 XP สะสมเข้าโปรไฟล์อัศวินเรียบร้อย</p>
            </div>
            <button
              onClick={() => {
                setActiveQuizIndex(0);
                setSelectedAnswer(null);
                setQuizCompleted(false);
                setQuizScore(0);
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold font-mono"
            >
              ทดสอบใหม่อีกครั้ง
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
