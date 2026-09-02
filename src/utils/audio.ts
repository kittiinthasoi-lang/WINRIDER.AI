// Web Audio API Synthesizer for high-precision tactile feedback

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playTactileBlip(freq = 880, duration = 0.05, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Gracefully ignore audio failures if browser restricts audio
  }
}

export function playNfcSyncSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const startTime = ctx.currentTime + index * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.07, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.16);
    });
  } catch {
    // Ignore
  }
}

export function playLevelUpFanfare() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const chords = [
      { freq: 440, delay: 0 },
      { freq: 554.37, delay: 0.08 },
      { freq: 659.25, delay: 0.16 },
      { freq: 880, delay: 0.28 },
      { freq: 1108.73, delay: 0.38 },
      { freq: 1318.51, delay: 0.48 }
    ];
    chords.forEach(({ freq, delay }) => {
      const startTime = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.06, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.32);
    });
  } catch {
    // Ignore
  }
}

export function playRadarScan() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // Ignore
  }
}

export function playEngineRev(baseFreq = 200, duration = 0.6) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    
    // Engine revving simulation curve (idle -> rev -> settled)
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, ctx.currentTime + duration * 0.4);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  } catch {
    // Ignore
  }
}

export function playCameraSnap() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Fast snap & mechanical shutter
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // Ignore
  }
}

export function playPaymentSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const freqs = [587.33, 880, 1174.66, 1760]; // D5, A5, D6, A6
    freqs.forEach((freq, idx) => {
      const startTime = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.09, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.26);
    });
  } catch {
    // Ignore
  }
}

export type AIVoicePersona = 'fah_sai' | 'knight_bold' | 'scifi_ai' | 'formal_polite';

export const AI_VOICE_PERSONAS: { id: AIVoicePersona; name: string; tag: string; desc: string; defaultPitch: number; defaultRate: number; icon: string }[] = [
  { id: 'fah_sai', name: 'น้องฟ้าใส (AI สดใส)', tag: 'Cheerful Girl', desc: 'น้ำเสียงสดใสร่าเริง เป็นมิตร สบายหู เหมาะกับทุกทริป', defaultPitch: 1.25, defaultRate: 1.1, icon: '🌸' },
  { id: 'knight_bold', name: 'พี่วินเก๋าเกม (หนักแน่น)', tag: 'Pro Knight', desc: 'เสียงเข้ม ชัดเจน สไตล์พี่วินมือโปรแม่นยำทุกตรอกซอกซอย', defaultPitch: 0.85, defaultRate: 1.05, icon: '🛵' },
  { id: 'scifi_ai', name: 'AI Cyber HUD (ไซไฟไฮเทค)', tag: 'Cybernetic', desc: 'สำเนียงประมวลผลด่วน แม่นยำ ชัดเป๊ะ อิงระบบนำทางอวกาศ', defaultPitch: 1.1, defaultRate: 1.3, icon: '🤖' },
  { id: 'formal_polite', name: 'เสียงสุภาพ ทางการ', tag: 'Polite Formal', desc: 'น้ำเสียงเรียบร้อย นุ่มนวล ชัดถ้อยชัดคำ สุภาพสูงสุด', defaultPitch: 1.0, defaultRate: 0.95, icon: '🎩' },
];

export function speakThaiText(
  text: string, 
  persona: AIVoicePersona = 'fah_sai', 
  customRate?: number, 
  customPitch?: number
) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      
      const config = AI_VOICE_PERSONAS.find(p => p.id === persona) || AI_VOICE_PERSONAS[0];
      utterance.pitch = customPitch !== undefined ? customPitch : config.defaultPitch;
      utterance.rate = customRate !== undefined ? customRate : config.defaultRate;
      
      // Try to select Thai voice if available in browser
      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.startsWith('th'));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore if speech synth not supported
    }
  }
}

