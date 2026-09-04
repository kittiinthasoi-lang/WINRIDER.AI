import React, { useState, useEffect } from 'react';
import {
  Share2,
  Database,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  Sliders,
  Trash2,
  Code2,
  Sparkles,
  X,
  Radio,
  Zap,
  Bot
} from 'lucide-react';
import {
  getSavedWebhookUrl,
  saveWebhookUrl,
  isAutoDispatchEnabled,
  setAutoDispatchEnabled,
  getDispatchLogs,
  clearDispatchLogs,
  buildWebhookPayload,
  dispatchToWebhook,
  WebhookLogEntry
} from '../utils/webhookDispatcher';
import { playTactileBlip } from '../utils/audio';

interface NoCodeWebhookBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioEnabled?: boolean;
}

export const NoCodeWebhookBridgeModal: React.FC<NoCodeWebhookBridgeModalProps> = ({
  isOpen,
  onClose,
  audioEnabled = false
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'sheets' | 'line' | 'logs'>('config');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: string;
    message: string;
    latencyMs?: number;
    httpCode?: number;
  } | null>(null);
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(getSavedWebhookUrl());
      setAutoDispatch(isAutoDispatchEnabled());
      setLogs(getDispatchLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (audioEnabled) playTactileBlip(900);
    saveWebhookUrl(webhookUrl);
    setTestResult({
      success: true,
      status: 'saved',
      message: 'บันทึก Webhook URL เรียบร้อยแล้ว'
    });
  };

  const handleToggleAuto = (enabled: boolean) => {
    setAutoDispatch(enabled);
    setAutoDispatchEnabled(enabled);
    if (audioEnabled) playTactileBlip(800);
  };

  const handleTestDispatch = async () => {
    if (audioEnabled) playTactileBlip(1000);
    setIsTesting(true);
    setTestResult(null);

    const testPayload = buildWebhookPayload({
      event: 'test_ping',
      orderId: `WIN-TEST-${Math.floor(100 + Math.random() * 900)}`,
      passengerName: 'คุณทดสอบ สมองกล (Test User)',
      passengerPhone: '089-999-8888',
      serviceTitle: 'WIN KNIGHT (ทดสอบยุทธวิธี)',
      pickupLocation: 'ซอยสุขุมวิท 23 (ปากซอยคาวบอย)',
      dropoffLocation: 'สถานีรถไฟฟ้า BTS อโศก',
      distanceKm: 1.8,
      fare: 35,
      status: 'pending',
      notes: 'ทดสอบส่งข้อมูลผ่าน Make.com / Zapier / Google Sheets'
    });

    const res = await dispatchToWebhook(testPayload);
    setIsTesting(false);
    setTestResult(res);
    setLogs(getDispatchLogs());
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (audioEnabled) playTactileBlip(1100);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const googleSheetsHeaders = [
    'A: Order ID',
    'B: Timestamp',
    'C: Service',
    'D: Passenger',
    'E: Phone',
    'F: Pickup',
    'G: Dropoff',
    'H: Distance_KM',
    'I: Gross_Fare',
    'J: Welfare_Fund_2B',
    'K: Knight_Net_Payout',
    'L: Tip_Amount',
    'M: Status',
    'N: Driver_Name',
    'O: Vehicle_Plate'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#081226] rounded-3xl border-2 border-[#00D2FF] p-5 sm:p-6 shadow-[0_0_50px_rgba(0,210,255,0.4)] space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00D2FF] to-blue-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_20px_rgba(0,210,255,0.5)]">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">No-Code Cloud & Webhook Dispatch Bridge</h3>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 font-bold">
                  SIMULATED BRAIN
                </span>
              </div>
              <p className="text-xs text-slate-400">
                จำลองสมอง AI ด้วย Google Sheets, Make.com, Zapier และ LINE OA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10 text-xs font-mono">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'config'
                ? 'bg-[#00D2FF] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>ตั้งค่า Webhook</span>
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'sheets'
                ? 'bg-[#00D2FF] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Google Sheets</span>
          </button>
          <button
            onClick={() => setActiveTab('line')}
            className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'line'
                ? 'bg-[#00D2FF] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>LINE OA / Flex</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition relative ${
              activeTab === 'logs'
                ? 'bg-[#00D2FF] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>ประวัติยิงข้อมูล</span>
            {logs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-1" />
            )}
          </button>
        </div>

        {/* 1. CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Sparkles className="w-4 h-4 text-[#FFD700]" />
                <span>หลักการ Lean MVP: "สมองจำลองจิตใจ"</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                แทนที่จะต้องสร้างระบบ Backend และ Dispatching AI ที่ซับซ้อนตั้งแต่วันแรก ระบบของเรารองรับการยิง Webhook (JSON) ไปยัง <strong>Make.com</strong>, <strong>Zapier</strong> หรือ <strong>Google Apps Script</strong> ทันทีที่ผู้โดยสารกดเรียกรถหรืออัศวินรับงาน
              </p>
            </div>

            {/* URL Input Form */}
            <form onSubmit={handleSaveUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Webhook URL (Make.com Custom Webhook / Zapier Catch Hook / Google Web App):</span>
                  <span className="text-[10px] text-cyan-400">รองรับ HTTPS POST</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hook.eu1.make.com/xxxx หรือ https://hooks.zapier.com/hooks/catch/xxxx"
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D2FF]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition active:scale-95"
                  >
                    บันทึก
                  </button>
                </div>
              </div>

              {/* Auto Dispatch Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>เปิดยิง Webhook อัตโนมัติทุกเที่ยววิ่ง (Auto-Dispatch)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    ยิงข้อมูลทันทีเมื่อสร้างออเดอร์, อัศวินกดรับงาน, และเมื่อส่งผู้โดยสารสำเร็จ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAuto(!autoDispatch)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    autoDispatch ? 'bg-[#00D2FF]' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                      autoDispatch ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Test Button & Result Box */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestDispatch}
                  disabled={isTesting}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] via-blue-600 to-indigo-600 hover:brightness-110 active:scale-98 text-slate-950 font-black text-xs font-mono shadow-[0_0_25px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2 transition"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>กำลังส่งสัญญาณทดสอบ...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-slate-950" />
                      <span>🚀 ทดสอบยิง Webhook จำลอง (1-Click Test Dispatch)</span>
                    </>
                  )}
                </button>

                {testResult && (
                  <div
                    className={`mt-3 p-3.5 rounded-2xl border text-xs font-mono space-y-1 animate-in fade-in ${
                      testResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {testResult.status === 'simulated' ? 'สถานะ: จำลองสำเร็จ (Offline Sandbox)' : 'สถานะ: ส่งสำเร็จ 200 OK'}
                      </span>
                      {testResult.latencyMs && <span>{testResult.latencyMs} ms</span>}
                    </div>
                    <p className="text-[11px] text-slate-300">{testResult.message}</p>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {/* 2. GOOGLE SHEETS TAB */}
        {activeTab === 'sheets' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>แบบโครงสร้างคอลัมน์ Google Sheets (Orders Database)</span>
                </span>
                <button
                  onClick={() => handleCopy(googleSheetsHeaders.join('\t'), 'headers')}
                  className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[10px] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedKey === 'headers' ? 'คัดลอกแล้ว!' : 'คัดลอกหัวตาราง'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-300">
                นำหัวตาราง 15 คอลัมน์นี้ไปวางที่แถวที่ 1 ใน Google Sheets ของคุณ เพื่อใช้ Make.com หรือ Zapier แมปปิ้งอัตโนมัติ:
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[10px]">
              {googleSheetsHeaders.map((header, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-black/50 border border-white/10 text-slate-300 flex items-center justify-between">
                  <span>{header}</span>
                </div>
              ))}
            </div>

            {/* Sample Google Apps Script Code snippet */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-cyan-300 font-bold">สูตร Google Apps Script (Webhook Receiver ฟรี 100%):</span>
                <button
                  onClick={() => handleCopy(`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow(data.googleSheetsRow);
  return ContentService.createTextOutput(JSON.stringify({"status":"success"})).setMimeType(ContentService.MimeType.JSON);
}`, 'gas')}
                  className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedKey === 'gas' ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด Apps Script'}</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-xl bg-black/90 text-slate-400 text-[9px] overflow-x-auto">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow(data.googleSheetsRow);
  return ContentService.createTextOutput(JSON.stringify({"status":"success"})).setMimeType(ContentService.MimeType.JSON);
}`}
              </pre>
            </div>
          </div>
        )}

        {/* 3. LINE OA TAB */}
        {activeTab === 'line' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-green-950/30 border border-green-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-green-300 font-bold">
                <Bot className="w-4 h-4" />
                <span>การเชื่อมต่อแจ้งเตือน LINE OA & Telegram Bot</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ใน Make.com หรือ Zapier ให้เลือกโมดูล <strong>LINE Messaging API</strong> หรือ <strong>LINE Notify</strong> แล้วนำตัวแปร <code>lineFlexMessage</code> ใน Webhook Payload ของเราไปวางได้ทันที พี่วินในคิวจะได้ข้อความการ์ดแจ้งเตือนทรงพลัง:
              </p>
            </div>

            {/* Preview of Flex Message */}
            <div className="max-w-xs mx-auto rounded-2xl bg-[#070D1E] border-2 border-cyan-400/80 p-4 space-y-3 shadow-xl font-sans">
              <div className="border-b border-white/10 pb-2">
                <span className="text-[10px] font-mono font-bold text-cyan-400">🦁 WINRIDER.AI SOVEREIGN DISPATCH</span>
                <h4 className="text-sm font-black text-white mt-0.5">🚨 มีงานใหม่เข้ามา! (WIN-7782)</h4>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>ผู้โดยสาร:</span>
                  <span className="text-white font-bold">คุณอารียา สุขสวัสดิ์</span>
                </div>
                <div className="p-2 rounded-xl bg-black/50 border border-white/5 space-y-1">
                  <div className="text-cyan-300">📍 จุดรับ: ซอยสุขุมวิท 23</div>
                  <div className="text-emerald-400">🏁 จุดส่ง: BTS อโศก</div>
                  <div className="text-slate-400 text-[10px]">📏 ระยะทาง: 2.4 กม.</div>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10 font-mono">
                  <span className="text-slate-400">ค่าโดยสาร:</span>
                  <span className="text-[#00D2FF] font-bold">฿45.00</span>
                </div>
                <div className="flex justify-between text-[10px] text-amber-300 font-mono">
                  <span>หักกองทุนสวัสดิการ:</span>
                  <span>-฿2.00</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
                  <span>รายได้สุทธิอัศวิน:</span>
                  <span className="text-emerald-400 text-sm font-mono font-black">฿43.00</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px]">บันทึกการส่ง Webhook ล่าสุด ({logs.length} รายการ):</span>
              {logs.length > 0 && (
                <button
                  onClick={() => {
                    clearDispatchLogs();
                    setLogs([]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>ล้างประวัติ</span>
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-black/40 border border-white/10 text-slate-500 space-y-2 font-mono">
                <Code2 className="w-8 h-8 mx-auto text-slate-600" />
                <p>ยังไม่มีประวัติการส่งข้อมูล</p>
                <p className="text-[10px]">กดปุ่ม "🚀 ทดสอบยิง Webhook จำลอง" ในแท็บแรก เพื่อทดลองส่งข้อมูล</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-black/50 border border-white/10 font-mono text-[11px] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-400' : log.status === 'simulated' ? 'bg-cyan-400' : 'bg-rose-400'
                        }`} />
                        <span>{log.event.toUpperCase()} ({log.payload.orderId})</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('th-TH')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>ค่าโดยสาร: ฿{log.payload.fare} (สุทธิ: ฿{log.payload.driverPayout})</span>
                      <span className="text-cyan-400">{log.latencyMs} ms</span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-black/80 text-slate-400 text-[9px] truncate">
                      {log.responsePreview || log.url}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
