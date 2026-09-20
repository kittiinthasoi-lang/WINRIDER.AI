import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RotateCw, 
  Zap, 
  Cpu, 
  Key, 
  Clock, 
  Image as ImageIcon, 
  Layers, 
  X,
  ShieldCheck
} from 'lucide-react';

interface AiStatusData {
  status: 'ok' | 'warning' | 'error';
  geminiConfigured: boolean;
  apiKeyStatus: string;
  keyMasked: string;
  activeModels: string[];
  currentPrimaryModel: string;
  supportedModes: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  maxContextTurns: number;
  timeoutSeconds: number;
  supportedFormats: string[];
  maxFileSizeMB: number;
  timestamp: string;
}

interface PingResult {
  loading: boolean;
  success?: boolean;
  latencyMs?: number;
  model?: string;
  message?: string;
  errorCode?: string;
  error?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AiStatusModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<AiStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ping, setPing] = useState<PingResult>({ loading: false });

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/status');
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลสถานะ AI ได้');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการโหลดสถานะ');
    } finally {
      setLoading(false);
    }
  };

  const runPingTest = async () => {
    setPing({ loading: true });
    try {
      const res = await fetch('/api/ai/test-ping', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setPing({
          loading: false,
          success: false,
          errorCode: json.errorCode,
          error: json.error || 'การทดสอบล้มเหลว',
          latencyMs: json.latencyMs
        });
      } else {
        setPing({
          loading: false,
          success: true,
          latencyMs: json.latencyMs,
          model: json.model,
          message: json.message
        });
      }
    } catch (err: any) {
      setPing({
        loading: false,
        success: false,
        error: err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อทดสอบได้'
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="ai-status-modal"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-[#0B1528] to-[#040812] p-6 text-white shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
                ตรวจสถานะระบบ WIN-AI
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                  Live Diagnostics
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ตรวจสอบการเชื่อมต่อ Gemini API, โมเดลสำรอง และประสิทธิภาพการตอบกลับ
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading / Error States */}
        {loading && !data && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm text-cyan-200">กำลังตรวจสอบสถานะโมเดลและเซิร์ฟเวอร์...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-200 text-sm flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">เกิดข้อผิดพลาดในการตรวจสอบ</p>
              <p className="text-xs text-red-300/90">{error}</p>
              <button 
                type="button"
                onClick={fetchStatus}
                className="mt-2 text-xs text-red-300 underline font-medium"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* Primary Status Banner */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              data.status === 'ok' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-100'
            }`}>
              <div className="flex items-center gap-3">
                {data.status === 'ok' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="text-sm font-black">
                    {data.status === 'ok' ? 'ระบบ WIN-AI พร้อมให้บริการเต็มรูปแบบ' : 'ระบบใช้โหมดสำรอง (คีย์ยังไม่สมบูรณ์)'}
                  </div>
                  <div className="text-xs opacity-80">
                    โมเดลหลัก: <span className="font-mono text-cyan-300 font-bold">{data.currentPrimaryModel}</span> • ระบบสำรองอัตโนมัติ 4 ระดับ
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={fetchStatus}
                disabled={loading}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
            </div>

            {/* Live Ping Latency Test */}
            <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                    การทดสอบความเร็ว (Realtime Ping & Latency)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={runPingTest}
                  disabled={ping.loading}
                  className="px-3 py-1.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black hover:bg-cyan-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {ping.loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  ทดสอบเดี๋ยวนี้
                </button>
              </div>

              {ping.loading ? (
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2 text-xs text-cyan-200">
                  <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
                  กำลังส่งสัญญาณทดสอบไปยัง Google Gemini API...
                </div>
              ) : ping.success ? (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{ping.message || 'เชื่อมต่อสำเร็จ'}</span>
                  </div>
                  <div className="font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                    {ping.latencyMs} ms
                  </div>
                </div>
              ) : ping.error ? (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 flex items-center justify-between text-xs text-red-200">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>{ping.error}</span>
                  </div>
                  {ping.errorCode && (
                    <span className="font-mono text-[11px] bg-red-500/20 px-2 py-0.5 rounded text-red-300">
                      {ping.errorCode}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  กดปุ่ม &quot;ทดสอบเดี๋ยวนี้&quot; เพื่อส่ง ping ขนาดเล็กไปยัง Gemini และวัดเวลาตอบกลับจริง
                </p>
              )}
            </div>

            {/* Config & Security Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* API Key */}
              <div className="p-3.5 rounded-2xl border border-white/10 bg-black/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>สถานะ GEMINI_API_KEY</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">
                    {data.keyMasked}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    data.geminiConfigured 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {data.geminiConfigured ? 'พร้อมใช้งาน' : 'ยังไม่พบคีย์'}
                  </span>
                </div>
              </div>

              {/* Timeout & Context */}
              <div className="p-3.5 rounded-2xl border border-white/10 bg-black/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ขีดจำกัด Timeout & บริบท</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-medium">Timeout: <b className="text-cyan-300">{data.timeoutSeconds}s</b></span>
                  <span className="text-white font-medium">จำบริบท: <b className="text-cyan-300">{data.maxContextTurns} ข้อความ</b></span>
                </div>
              </div>

              {/* Vision Support */}
              <div className="p-3.5 rounded-2xl border border-white/10 bg-black/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>การวิเคราะห์รูปภาพ (Vision)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-medium">
                    {data.supportedFormats.join(', ')}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    ขนาดสูงสุด {data.maxFileSizeMB} MB
                  </span>
                </div>
              </div>

              {/* Fallback Hierarchy */}
              <div className="p-3.5 rounded-2xl border border-white/10 bg-black/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ระบบสลับโมเดลสำรอง</span>
                </div>
                <div className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>เปิดใช้งานอัตโนมัติ (Fallback Active)</span>
                </div>
              </div>
            </div>

            {/* Model Cascade List */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>ลำดับชั้นโมเดลสำรอง (Model Fallback Cascade)</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 divide-y divide-white/5 overflow-hidden">
                {data.activeModels.map((model, idx) => (
                  <div key={model} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-black flex items-center justify-center text-slate-300">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-mono font-bold text-white">{model}</div>
                        <div className="text-[10px] text-slate-400">
                          {idx === 0 
                            ? 'โมเดลหลัก: มัลติโมดอลความแม่นยำสูง (Default Workhorse)' 
                            : idx === 1 
                            ? 'โมเดลสำรอง 1: ความเร็วสูง ประหยัดทรัพยากร'
                            : idx === 2
                            ? 'โมเดลสำรอง 2: Flash อัตโนมัติ'
                            : 'โมเดลสำรอง 3: รุ่น Free Tier'}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      idx === 0 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/5 text-slate-400'
                    }`}>
                      {idx === 0 ? 'PRIMARY' : 'FALLBACK'}
                    </span>
                  </div>
                ))}
                <div className="p-3 flex items-center justify-between text-xs bg-amber-500/5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-[10px] font-black flex items-center justify-center text-amber-300">
                      5
                    </span>
                    <div>
                      <div className="font-bold text-amber-300">Local Tactical Fallback Engine</div>
                      <div className="text-[10px] text-slate-400">
                        ฐานข้อมูลช่าง 5 มิติ & สูตรคำนวณกำไร/ต้นทุนออฟไลน์ในตัวเครื่อง
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    EMERGENCY
                  </span>
                </div>
              </div>
            </div>

            {/* Error Cause Reference */}
            <div className="p-3.5 rounded-2xl border border-white/10 bg-black/30 space-y-2 text-xs">
              <div className="font-bold text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>คู่มือการแปลความหมายข้อผิดพลาดตรงสาเหตุ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="font-bold text-amber-300">🔑 คีย์ไม่ครบ:</span> ยังไม่ได้กำหนด GEMINI_API_KEY
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="font-bold text-red-300">🚫 คีย์ผิด:</span> API Key หมดอายุหรือสิทธิ์ไม่ถูกต้อง
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="font-bold text-cyan-300">⏳ โควต้าเต็ม:</span> โควต้าใช้งานรายวันของ Gemini เต็ม (429)
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="font-bold text-purple-300">⏱️ หมดเวลา:</span> การตอบกลับใช้เวลาเกิน 30 วินาที
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
