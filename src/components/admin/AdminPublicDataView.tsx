import React, { useEffect, useState } from 'react';
import { Database, Download, CheckCircle2, XCircle, RefreshCw, ShieldCheck, MapPin, CalendarDays } from 'lucide-react';
import { getAuthHeaders } from '../../utils/dispatchSync';

type DataKind = 'events' | 'attractions' | 'restaurants' | 'accommodations' | 'souvenirs';
type PendingRecord = { id:string; kind?:DataKind; name?:string; title?:string; category?:string; address?:string; province?:string; district?:string; latitude?:number|null; longitude?:number|null; startAt?:string; endAt?:string; };

const DATASETS = [
  ['events','Win Alert / กิจกรรม','เทศกาล งานประเพณี และกิจกรรมท่องเที่ยว'],
  ['attractions','ปลายทาง / แหล่งท่องเที่ยว','สถานที่ท่องเที่ยวทั่วประเทศ'],
  ['restaurants','ร้านอาหาร','ร้านอาหารและภัตตาคารจาก TAT'],
  ['accommodations','ที่พัก','โรงแรม รีสอร์ท โฮมสเตย์ และที่พัก'],
  ['souvenirs','ร้านของที่ระลึก','ร้านของฝากและสินค้าชุมชน'],
] as const;

async function api(path:string, init?:RequestInit) {
  const response = await fetch(path, { ...init, headers:{ ...(await getAuthHeaders()), Accept:'application/json', ...(init?.headers || {}) }});
  const payload = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
  return payload;
}

export const AdminPublicDataView:React.FC = () => {
  const [pending,setPending]=useState<PendingRecord[]>([]);
  const [loading,setLoading]=useState(false);
  const [importing,setImporting]=useState<string|null>(null);
  const [message,setMessage]=useState('');

  const loadPending=async()=>{
    setLoading(true);
    try {
      const [events,places]=await Promise.all([api('/api/admin/win-alert/pending?limit=100'),api('/api/admin/public-data/pending?limit=200')]);
      setPending([...(events.records||[]),...(places.records||[])]);
      setMessage('');
    } catch(e){ setMessage(e instanceof Error?e.message:'โหลดคิวตรวจไม่สำเร็จ'); }
    finally{setLoading(false);}
  };
  useEffect(()=>{void loadPending();},[]);

  const importData=async(kind:string)=>{
    setImporting(kind); setMessage('');
    try {
      const result=await api('/api/admin/public-data/import-tat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kinds:kind==='all'?DATASETS.map(x=>x[0]):[kind]})});
      const failed=Object.entries(result.results||{}).filter(([,v]:any)=>!v?.ok);
      setMessage(failed.length ? 'บางชุดนำเข้าไม่สำเร็จ: '+failed.map(([k,v]:any)=>k+' ('+v.error+')').join(', ') : 'นำเข้าแล้ว และส่งเข้าคิว Admin Verify เรียบร้อย');
      await loadPending();
    } catch(e){setMessage(e instanceof Error?e.message:'นำเข้าข้อมูลไม่สำเร็จ');}
    finally{setImporting(null);}
  };

  const review=async(record:PendingRecord,approved:boolean)=>{
    try{
      const event=record.kind==='events'||Boolean(record.title);
      await api(event?'/api/admin/win-alert/review':'/api/admin/public-data/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:record.id,kind:record.kind,approved})});
      setPending(p=>p.filter(x=>x.id!==record.id));
    }catch(e){setMessage(e instanceof Error?e.message:'บันทึกผลตรวจไม่สำเร็จ');}
  };

  return <div className="space-y-5">
    <section className="rounded-3xl border border-cyan-400/20 bg-[#0A1633] p-5 shadow-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2"><Database className="h-5 w-5 text-cyan-300"/><h1 className="text-xl font-black text-white">WIN Public Data Hub</h1><span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-300">FREE + ADMIN VERIFY</span></div><p className="mt-1 text-xs text-slate-400">ข้อมูลสาธารณะไทยเข้ามาเป็นข้อมูลรอตรวจเท่านั้น ลูกค้าจะเห็นเมื่อแอดมินอนุมัติ</p></div>
        <div className="flex gap-2"><button onClick={()=>void importData('all')} disabled={!!importing} className="flex items-center gap-2 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"><Download className="h-4 w-4"/>{importing==='all'?'กำลังนำเข้า...':'นำเข้าทุกชุด'}</button><button onClick={()=>void loadPending()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>รีเฟรช</button></div>
      </div>
      {message&&<div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">{message}</div>}
    </section>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {DATASETS.map(([kind,label,description])=><button key={kind} onClick={()=>void importData(kind)} disabled={!!importing} className="rounded-2xl border border-slate-800 bg-[#0A1633] p-4 text-left hover:border-cyan-400/40 disabled:opacity-50"><div className="flex items-center gap-2 text-sm font-black text-white"><Database className="h-4 w-4 text-cyan-300"/>{label}</div><p className="mt-2 text-[10px] leading-4 text-slate-400">{description}</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300"><Download className="h-3 w-3"/>นำเข้าเพื่อรอตรวจ</span></button>)}
    </div>
    <section className="rounded-3xl border border-slate-800 bg-[#0A1633] p-5">
      <div className="mb-3 flex items-center gap-2"><Database className="h-4 w-4 text-cyan-300"/><h2 className="text-sm font-black text-white">แหล่งข้อมูลสาธารณะที่คัดแล้ว</h2></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3">
          <div className="text-xs font-black text-cyan-200">TAT Data Catalog</div>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">กิจกรรม แหล่งท่องเที่ยว ร้านอาหาร ที่พัก และร้านของที่ระลึก • Open Data Common • ไม่มีการจำกัดการเข้าถึงข้อมูล</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3">
          <div className="text-xs font-black text-emerald-200">data.go.th / Open Government Data</div>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">แหล่งข้อมูลภาครัฐสำหรับต่อยอดสุขภาพ ความปลอดภัย อากาศ การเดินทาง และเมือง โดยจะนำเข้าเฉพาะชุดที่ผ่านการคัดเลือกและ Admin Verify ก่อนใช้งานจริง</p>
        </div>
      </div>
    </section>

    <section className="rounded-3xl border border-amber-400/20 bg-[#0A1633] p-5">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-sm font-black text-white"><ShieldCheck className="h-5 w-5 text-amber-300"/>คิว Admin Verify</h2><p className="text-[10px] text-slate-500">ไม่อนุมัติ = ไม่แสดงในแอป</p></div><span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-mono font-bold text-amber-300">{pending.length} รายการ</span></div>
      {pending.length===0?<div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-xs text-slate-500">ไม่มีข้อมูลรอตรวจ</div>:<div className="space-y-2">{pending.slice(0,100).map(record=><div key={record.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="truncate text-xs font-black text-white">{record.title||record.name||'ไม่มีชื่อ'}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-slate-400"><span>{record.kind||'events'}</span>{record.province&&<span>• {record.province}</span>}{record.category&&<span>• {record.category}</span>}{record.startAt&&<span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3"/>{new Date(record.startAt).toLocaleDateString('th-TH')}</span>}{record.latitude!=null&&record.longitude!=null&&<span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3"/>มีพิกัด</span>}</div>{record.address&&<div className="mt-1 truncate text-[9px] text-slate-500">{record.address}</div>}</div><div className="flex shrink-0 gap-2"><button onClick={()=>void review(record,false)} className="flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[10px] font-bold text-rose-300"><XCircle className="h-3.5 w-3.5"/>ไม่อนุมัติ</button><button onClick={()=>void review(record,true)} className="flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[10px] font-bold text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5"/>อนุมัติ</button></div></div>)}</div>}
    </section>
  </div>;
};
