import React, { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { Building2, ChevronRight, Loader2, MapPin, Package, Percent, Search, ShieldCheck, ShoppingBag, Store, Tag, X } from 'lucide-react';
import { MarketItem } from '../types';
import { useRealGeolocation } from '../hooks/useRealGeolocation';
import { WinStreetMarketView } from './WinStreetMarketView';

interface ShopProfile {
  id: string;
  role: 'merchant' | 'partner';
  name: string;
  description: string;
  avatarUrl: string;
  avatarEmoji: string;
  address: string;
  phone: string;
  category: string;
  products: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
  promotions: Array<Record<string, unknown>>;
  highlights: string[];
}

interface WinShopHubViewProps {
  audioEnabled?: boolean;
  customerListedItems?: MarketItem[];
  onAddNewCustomerItem?: (item: MarketItem) => void;
  onBackToMain?: () => void;
  onRideToDestination?: (name: string, address?: string, distanceKm?: number) => void;
}

const valueText = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) if (typeof record[key] === 'string' || typeof record[key] === 'number') return String(record[key]);
  return '';
};

export const WinShopHubView: React.FC<WinShopHubViewProps> = ({
  audioEnabled, customerListedItems, onAddNewCustomerItem, onBackToMain, onRideToDestination,
}) => {
  const geo = useRealGeolocation(true);
  const [activeTab, setActiveTab] = useState<'merchants' | 'partners' | 'community'>('merchants');
  const [profiles, setProfiles] = useState<ShopProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ShopProfile | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [routes, setRoutes] = useState<Record<string, { distanceKm: number; etaMinutes: number | null }>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const user = getAuth().currentUser;
        if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนเปิดตลาดประชาชน');
        const response = await fetch('/api/shop/directory', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        const payload = await response.json() as { profiles?: ShopProfile[]; error?: string };
        if (!response.ok) throw new Error(payload.error || 'โหลดร้านค้าและพาร์ทเนอร์ไม่สำเร็จ');
        if (!cancelled) setProfiles(Array.isArray(payload.profiles) ? payload.profiles : []);
      } catch (error) {
        if (!cancelled) { setProfiles([]); setErrorMessage(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ'); }
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const addressProfiles = profiles.filter((profile) => profile.address).slice(0, 20);
    if (!geo.isRealGps || geo.latitude === null || geo.longitude === null || addressProfiles.length === 0) return;
    let cancelled = false;
    const loadRoutes = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;
        const response = await fetch('/api/places/resolve-routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
          body: JSON.stringify({
            latitude: geo.latitude, longitude: geo.longitude,
            places: addressProfiles.map((profile) => ({ key: profile.id, query: `${profile.name} ${profile.address} ประเทศไทย` })),
          }),
        });
        const payload = await response.json() as { routes?: Array<{ key: string; distanceKm: number; etaMinutes: number | null }> };
        if (!cancelled && response.ok) setRoutes(Object.fromEntries((payload.routes || []).map((route) => [route.key, route])));
      } catch { if (!cancelled) setRoutes({}); }
    };
    void loadRoutes();
    return () => { cancelled = true; };
  }, [profiles, geo.isRealGps, geo.latitude, geo.longitude]);

  const visibleProfiles = useMemo(() => profiles.filter((profile) => {
    if (activeTab === 'community') return false;
    if (profile.role !== (activeTab === 'merchants' ? 'merchant' : 'partner')) return false;
    const search = query.trim().toLowerCase();
    return !search || `${profile.name} ${profile.category} ${profile.description} ${profile.address}`.toLowerCase().includes(search);
  }), [profiles, activeTab, query]);

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#17213A] via-[#0B1428] to-[#070D1E] p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">ตลาดประชาชน • Thailand is Home</p>
            <h2 className="mt-1 text-xl font-black text-white">ร้านค้า พาร์ทเนอร์ และสินค้าจากประชาชน</h2>
            <p className="mt-1 text-sm text-slate-300">ดูโปรไฟล์ สินค้า บริการ ส่วนลด และโปรโมชันจากบัญชีที่ลงทะเบียนจริง</p>
          </div>
          {onBackToMain && <button type="button" onClick={onBackToMain} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white">← กลับหน้าหลัก</button>}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {([
            ['merchants', 'ร้านค้า', Store], ['partners', 'พาร์ทเนอร์', Building2], ['community', 'ตลาดประชาชน', ShoppingBag],
          ] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => { setActiveTab(id); setSelectedProfile(null); }} className={`min-h-12 rounded-xl px-3 text-xs font-black ${activeTab === id ? 'bg-amber-400 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300'}`}>
              <Icon className="mr-1 inline h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'community' ? (
        <WinStreetMarketView audioEnabled={audioEnabled} customerListedItems={customerListedItems} onAddNewCustomerItem={onAddNewCustomerItem} />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ ประเภท สินค้า หรือบริการ" className="w-full rounded-xl border border-white/10 bg-[#0A1530] py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-cyan-400" />
          </div>
          {loading && <div className="p-10 text-center text-slate-300"><Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" />กำลังโหลดบัญชีจริง…</div>}
          {!loading && errorMessage && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{errorMessage}</div>}
          {!loading && !errorMessage && visibleProfiles.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">ยังไม่มี{activeTab === 'merchants' ? 'ร้านค้า' : 'พาร์ทเนอร์'}ที่ลงทะเบียนและผ่านอนุมัติ ระบบไม่แสดงบัญชีตัวอย่างแทน</div>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProfiles.map((profile) => {
              const route = routes[profile.id];
              return <button key={profile.id} type="button" onClick={() => setSelectedProfile(profile)} className="rounded-2xl border border-white/10 bg-[#0B162D] p-4 text-left hover:border-cyan-400/50">
                <div className="flex items-start gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-2xl">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : profile.avatarEmoji}</div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-white">{profile.name}</h3><p className="text-xs text-cyan-300">{profile.category || (profile.role === 'merchant' ? 'ร้านค้า' : 'พาร์ทเนอร์')}</p></div><ChevronRight className="h-4 w-4 text-slate-500" /></div>
                <p className="mt-3 line-clamp-2 text-xs text-slate-300">{profile.description || 'เจ้าของบัญชียังไม่ได้เพิ่มรายละเอียดสาธารณะ'}</p>
                <p className="mt-2 text-[11px] text-slate-400"><MapPin className="mr-1 inline h-3.5 w-3.5" />{route ? `${route.distanceKm} กม. • ${route.etaMinutes || '—'} นาทีจากตำแหน่งคุณ` : profile.address || 'ยังไม่ได้ระบุที่อยู่'}</p>
              </button>;
            })}
          </div>
        </>
      )}

      {selectedProfile && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-cyan-400/40 bg-[#071126] p-5 text-white"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-cyan-300">{selectedProfile.role === 'merchant' ? 'โปรไฟล์ร้านค้า' : 'โปรไฟล์พาร์ทเนอร์'} • อ่านอย่างเดียว</p><h3 className="mt-1 text-xl font-black">{selectedProfile.name}</h3><p className="mt-1 text-sm text-slate-300">{selectedProfile.description || 'ยังไม่มีคำอธิบาย'}</p></div><button onClick={() => setSelectedProfile(null)} className="rounded-xl bg-white/10 p-2"><X className="h-5 w-5" /></button></div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"><p><MapPin className="mr-1 inline h-4 w-4 text-cyan-300" />{selectedProfile.address || 'ยังไม่ได้ระบุที่อยู่'}</p>{selectedProfile.phone && <p className="mt-2">โทร: <a className="text-cyan-300" href={`tel:${selectedProfile.phone.replace(/\D/g, '')}`}>{selectedProfile.phone}</a></p>}</div>
        {([['สินค้า', selectedProfile.products, Package], ['บริการ', selectedProfile.services, ShieldCheck], ['ส่วนลดและโปรโมชัน', selectedProfile.promotions, Percent]] as const).map(([title, records, Icon]) => <section key={title} className="mt-4"><h4 className="mb-2 text-sm font-black text-amber-300"><Icon className="mr-1 inline h-4 w-4" />{title}</h4>{records.length === 0 ? <p className="rounded-xl bg-white/5 p-3 text-xs text-slate-400">เจ้าของบัญชียังไม่ได้เพิ่มข้อมูล</p> : <div className="grid gap-2 sm:grid-cols-2">{records.map((record, index) => <div key={index} className="rounded-xl border border-white/10 bg-black/30 p-3"><p className="text-sm font-bold">{valueText(record, ['title', 'name', 'serviceName']) || `${title} ${index + 1}`}</p><p className="mt-1 text-xs text-slate-300">{valueText(record, ['description', 'detail', 'condition', 'discount'])}</p><p className="mt-1 text-xs font-bold text-amber-300">{valueText(record, ['price', 'discountText', 'validUntil'])}</p></div>)}</div>}</section>)}
        {selectedProfile.highlights.length > 0 && <section className="mt-4"><h4 className="mb-2 text-sm font-black text-amber-300"><Tag className="mr-1 inline h-4 w-4" />จุดเด่น</h4><div className="flex flex-wrap gap-2">{selectedProfile.highlights.map((item) => <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs">{item}</span>)}</div></section>}
        {routes[selectedProfile.id] && onRideToDestination && <button onClick={() => onRideToDestination(selectedProfile.name, selectedProfile.address, routes[selectedProfile.id].distanceKm)} className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-400 to-cyan-400 py-3 text-sm font-black text-slate-950">เรียกพี่วินไปที่นี่ • {routes[selectedProfile.id].distanceKm} กม.</button>}
      </div></div>}
    </div>
  );
};
