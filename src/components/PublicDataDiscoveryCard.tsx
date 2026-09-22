import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Hotel, MapPin, RefreshCw, Search, ShoppingBag, Utensils, Landmark } from 'lucide-react';

type Kind = 'events' | 'attractions' | 'restaurants' | 'accommodations' | 'souvenirs';
type RecordItem = { id: string; name?: string; title?: string; category?: string; address?: string; province?: string; startAt?: string; endAt?: string; latitude?: number; longitude?: number };
const tabs: Array<{ kind: Kind; label: string; icon: React.ReactNode }> = [
  { kind: 'events', label: 'กิจกรรม', icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { kind: 'attractions', label: 'เที่ยว', icon: <Landmark className="h-3.5 w-3.5" /> },
  { kind: 'restaurants', label: 'ร้านอาหาร', icon: <Utensils className="h-3.5 w-3.5" /> },
  { kind: 'accommodations', label: 'ที่พัก', icon: <Hotel className="h-3.5 w-3.5" /> },
  { kind: 'souvenirs', label: 'ของที่ระลึก', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
];

interface Props { enabled?: boolean; }

/**
 * Optional public-data discovery surface.
 * It is deliberately opt-in so the customer home is not a general web-data hub.
 * Public records are informational only; Google Maps is opened externally.
 */
export const PublicDataDiscoveryCard: React.FC<Props> = ({ enabled = false }) => {
  const [active, setActive] = useState<Kind>('events');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Record<string, RecordItem[]>>({});
  const [loading, setLoading] = useState(false);

  const load = async (q = query) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/public-data/discovery?query=${encodeURIComponent(q)}&limit=12`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('โหลดข้อมูลสาธารณะไม่สำเร็จ');
      const payload = await response.json();
      setData(payload.data || {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) void load('');
  }, [enabled]);

  const records = useMemo(() => data[active] || [], [data, active]);
  if (!enabled) return null;

  return (
    <section className="rounded-3xl border border-cyan-400/15 bg-[#08152E] p-4 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-black text-white">ข้อมูลสาธารณะประเทศไทย</h2><span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[8px] font-black text-emerald-300">FREE • SOURCE DIRECT</span></div>
          <p className="mt-1 text-[9px] text-slate-500">ข้อมูลสาธารณะเพื่อการอ้างอิงเท่านั้น • ไม่ใช่แผนที่ในแอป • เปิด Google Maps ภายนอกเมื่อผู้ใช้เลือก</p>
        </div>
        <div className="flex items-center gap-2"><div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950/60 px-2"><Search className="h-3.5 w-3.5 text-slate-500" /><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void load(); }} placeholder="ค้นหาทั่วไทย..." className="w-36 bg-transparent py-2 text-[10px] text-white outline-none placeholder:text-slate-600" /></div><button onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button></div>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{tabs.map(tab => <button key={tab.kind} onClick={() => setActive(tab.kind)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[9px] font-bold ${active === tab.kind ? 'bg-cyan-400 text-slate-950' : 'border border-slate-800 bg-slate-950/50 text-slate-400'}`}>{tab.icon}{tab.label}</button>)}</div>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {records.length === 0 && !loading && <div className="col-span-full rounded-2xl border border-dashed border-slate-800 p-5 text-center text-[10px] text-slate-500">ยังไม่มีข้อมูลในหมวดนี้</div>}
        {records.map(item => <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="truncate text-xs font-black text-white">{item.name || item.title || 'ไม่มีชื่อ'}</div>
          {item.category && <div className="mt-1 text-[9px] text-cyan-300">{item.category}</div>}
          {item.address && <div className="mt-1 line-clamp-2 text-[9px] leading-4 text-slate-500">{item.address}{item.province ? ` • ${item.province}` : ''}</div>}
          {item.startAt && <div className="mt-1 text-[9px] text-amber-300">{new Date(item.startAt).toLocaleDateString('th-TH')}{item.endAt ? ` – ${new Date(item.endAt).toLocaleDateString('th-TH')}` : ''}</div>}
          {Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)) && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name || item.title || ''} ${item.address || ''}`)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-cyan-300"><MapPin className="h-3 w-3" />เปิด Google Maps ภายนอก</a>}
        </article>)}
      </div>
    </section>
  );
};
