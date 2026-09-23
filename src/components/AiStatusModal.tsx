import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, ExternalLink, RotateCw, ShieldCheck, X } from 'lucide-react';

interface AiStatusData {
  status: 'ok' | 'warning' | 'error';
  providerMode?: string;
  apiKeyRequired?: boolean;
  providers?: Array<{ id: string; name: string; url: string }>;
  message?: string;
  timestamp?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AiStatusModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<AiStatusData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/status');
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) void load(); }, [isOpen]);
  if (!isOpen) return null;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="w-full max-w-xl rounded-3xl border border-cyan-400/30 bg-[#07111f] p-5 text-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-cyan-300"><Activity className="h-5 w-5" /> WIN-AI External Mode</div>
          <p className="mt-1 text-xs text-slate-400">ไม่ใช้ API key ของ AI provider ภายใน WINRIDER</p>
        </div>
        <button onClick={onClose} className="rounded-xl border border-white/10 p-2"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
          <div>
            <div className="font-black text-emerald-200">โหมดไม่ใช้ API key พร้อมใช้งาน</div>
            <p className="mt-1 text-xs leading-5 text-slate-300">{data?.message || 'WINRIDER เตรียม prompt แล้วให้ผู้ใช้เปิด AI ภายนอกด้วยตัวเอง'}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300">
        <ShieldCheck className="mr-1 inline h-4 w-4 text-cyan-300" />
        Prompt และรูปจะไม่ถูกส่งไป AI provider อัตโนมัติจากเซิร์ฟเวอร์ WINRIDER ผู้ใช้เป็นผู้เลือกคัดลอกและเปิดบริการภายนอกเอง
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(data?.providers || []).map((provider) => <a key={provider.id} href={provider.url} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-xs font-black text-cyan-300 hover:bg-white/10">
          <ExternalLink className="mr-1 inline h-4 w-4" />{provider.name}
        </a>)}
      </div>

      <button onClick={() => void load()} disabled={loading} className="mt-4 w-full rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-300">
        <RotateCw className={`mr-1 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />รีเฟรชสถานะ
      </button>
    </div>
  </div>;
};
