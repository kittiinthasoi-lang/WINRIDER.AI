import React, { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import {
  Building2, ChevronRight, Clock3, ExternalLink, Loader2, MapPin, Navigation,
  Package, Percent, Phone, Search, ShieldCheck, ShoppingBag, Store, Tag, UserRound, X
} from 'lucide-react';
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
  openHours?: string;
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

const SectionIcon = ({ kind }: { kind: 'products' | 'services' | 'promos' }) => {
  if (kind === 'products') return <Package className="h-4 w-4" />;
  if (kind === 'services') return <ShieldCheck className="h-4 w-4" />;
  return <Percent className="h-4 w-4" />;
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
    void (async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const user = getAuth().currentUser;
        if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนเปิด WIN Shop');
        const response = await fetch('/api/shop/directory', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        const payload = await response.json() as { profiles?: ShopProfile[]; error?: string };
        if (!response.ok) throw new Error(payload.error || 'โหลดร้านค้าและพาร์ทเนอร์ไม่สำเร็จ');
        if (!cancelled) setProfiles(Array.isArray(payload.profiles) ? payload.profiles : []);
      } catch (error) {
        if (!cancelled) {
          setProfiles([]);
          setErrorMessage(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredProfiles = useMemo(() => {
    const role = activeTab === 'merchants' ? 'merchant' : 'partner';
    const search = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (profile.role !== role) return false;
      if (!search) return true;
      return `${profile.name} ${profile.category} ${profile.description} ${profile.address}`.toLowerCase().includes(search);
    });
  }, [profiles, activeTab, query]);

  useEffect(() => {
    const addressProfiles = filteredProfiles.filter((profile) => profile.address).slice(0, 20);
    if (!geo.isRealGps || geo.latitude === null || geo.longitude === null || addressProfiles.length === 0) {
      setRoutes({});
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;
        const response = await fetch('/api/places/resolve-routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
          body: JSON.stringify({
            latitude: geo.latitude,
            longitude: geo.longitude,
            places: addressProfiles.map((profile) => ({
              key: profile.id,
              query: `${profile.name} ${profile.address} ประเทศไทย`,
            })),
          }),
        });
        const payload = await response.json() as { routes?: Array<{ key: string; distanceKm: number; etaMinutes: number | null }> };
        if (!cancelled && response.ok) {
          setRoutes(Object.fromEntries((payload.routes || []).map((route) => [route.key, route])));
        }
      } catch {
        if (!cancelled) setRoutes({});
      }
    })();
    return () => { cancelled = true; };
  }, [filteredProfiles, geo.isRealGps, geo.latitude, geo.longitude]);

  const orderedProfiles = useMemo(() => [...filteredProfiles].sort((a, b) => {
    const da = routes[a.id]?.distanceKm;
    const db = routes[b.id]?.distanceKm;
    if (typeof da === 'number' && typeof db === 'number') return da - db;
    if (typeof da === 'number') return -1;
    if (typeof db === 'number') return 1;
    return a.name.localeCompare(b.name, 'th');
  }), [filteredProfiles, routes]);

  const openProfile = (profile: ShopProfile) => {
    if (audioEnabled) window.dispatchEvent(new CustomEvent('winrider:tactile_blip', { detail: { frequency: 780 } }));
    setSelectedProfile(profile);
  };

  const callProfile = (phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone.replace(/\D/g, '')}`;
  };

  const shareProfile = async (profile: ShopProfile) => {
    const shareText = `${profile.name} • ${profile.category || (profile.role === 'merchant' ? 'ร้านค้า' : 'พาร์ทเนอร์')} • WINRIDER.AI`;
    try {
      if (navigator.share) await navigator.share({ title: profile.name, text: shareText });
      else await navigator.clipboard?.writeText(shareText);
    } catch { /* user cancelled */ }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-[#10213D] via-[#09162D] to-[#070D1E] shadow-2xl">
        <div className="relative p-5 sm:p-6">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300">
                <ShoppingBag className="h-4 w-4" /> WIN SHOP
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-amber-300">LOCAL COMMERCE</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">ร้านค้า • พาร์ทเนอร์ • WIN Street Market</h2>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-300">
                ศูนย์รวมโปรไฟล์ธุรกิจในระบบ WIN และสินค้าที่ประชาชนลงขายเอง — เรียงร้านค้าที่มีเส้นทางจริงใกล้คุณก่อน
              </p>
            </div>
            {onBackToMain && <button type="button" onClick={onBackToMain} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black text-white hover:bg-white/10">← กลับหน้าหลัก</button>}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {([
              ['merchants', 'ร้านค้า', 'ดูสินค้าหน้าร้าน', Store],
              ['partners', 'พาร์ทเนอร์', 'ดูบริการ/สิทธิพิเศษ', Building2],
              ['community', 'WIN Street Market', 'ของที่ประชาชนขาย', ShoppingBag],
            ] as const).map(([id, label, sub, Icon]) => (
              <button key={id} type="button" onClick={() => { setActiveTab(id); setSelectedProfile(null); setQuery(''); }}
                className={`group rounded-2xl border p-3 text-left transition-all sm:p-4 ${activeTab === id ? 'border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_25px_rgba(0,210,255,0.2)]' : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-400/40'}`}>
                <Icon className="mb-2 h-5 w-5" />
                <div className="text-xs font-black sm:text-sm">{label}</div>
                <div className={`mt-0.5 text-[9px] sm:text-[10px] ${activeTab === id ? 'text-slate-800/80' : 'text-slate-500'}`}>{sub}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeTab === 'community' ? (
        <WinStreetMarketView
          audioEnabled={audioEnabled}
          customerListedItems={customerListedItems}
          onAddNewCustomerItem={onAddNewCustomerItem}
        />
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-[#081329] p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeTab === 'merchants' ? 'ค้นหาร้านค้า สินค้า หรือหมวดหมู่' : 'ค้นหาพาร์ทเนอร์ บริการ หรือหมวดหมู่'}
                  className="w-full rounded-xl border border-white/10 bg-[#050C1B] py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-cyan-400" />
              </label>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-mono text-slate-400">
                {geo.isRealGps ? '📍 ใช้เส้นทางจริงจากตำแหน่งคุณ' : '📍 เปิดตำแหน่งเพื่อเรียงตามระยะทางจริง'}
              </div>
            </div>
          </section>

          {loading && <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-300"><Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" />กำลังโหลดบัญชีจริง…</div>}
          {!loading && errorMessage && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{errorMessage}</div>}
          {!loading && !errorMessage && orderedProfiles.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <Store className="mx-auto mb-3 h-9 w-9 text-slate-500" />
              <h3 className="font-black text-white">ยังไม่มี{activeTab === 'merchants' ? 'ร้านค้า' : 'พาร์ทเนอร์'}ที่พร้อมแสดง</h3>
              <p className="mt-1 text-sm text-slate-400">ระบบจะแสดงเฉพาะบัญชีที่ลงทะเบียนและเปิดใช้งานจริง</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orderedProfiles.map((profile, index) => {
              const route = routes[profile.id];
              const totalContent = profile.products.length + profile.services.length + profile.promotions.length;
              return (
                <button key={profile.id} type="button" onClick={() => openProfile(profile)}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0B1830] to-[#071126] text-left shadow-lg transition-all hover:-translate-y-0.5 hover:border-cyan-400/50">
                  <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 opacity-70" />
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-2xl">
                        {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : profile.avatarEmoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-sm font-black text-white">{profile.name}</h3>
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        </div>
                        <p className="mt-0.5 truncate text-[10px] font-bold text-cyan-300">{profile.category || (profile.role === 'merchant' ? 'ร้านค้า' : 'พาร์ทเนอร์')}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-300">{profile.description || 'ยังไม่ได้เพิ่มคำอธิบายสาธารณะ'}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {profile.highlights.slice(0, 3).map((item) => <span key={item} className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-slate-300">{item}</span>)}
                      {totalContent > 0 && <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-bold text-cyan-300">{totalContent} รายการ</span>}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[10px]">
                      <span className="truncate text-slate-500"><MapPin className="mr-1 inline h-3.5 w-3.5" />{profile.address || 'ยังไม่ระบุที่อยู่'}</span>
                      {route ? <span className="shrink-0 font-black text-cyan-300">{route.distanceKm} กม.</span> : <span className="shrink-0 text-slate-600">—</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={() => setSelectedProfile(null)}>
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] border border-cyan-400/30 bg-[#071126] text-white shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-white/10 bg-[#071126]/95 p-4 backdrop-blur-xl sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/40 bg-black/30 text-3xl">
                  {selectedProfile.avatarUrl ? <img src={selectedProfile.avatarUrl} alt="" className="h-full w-full object-cover" /> : selectedProfile.avatarEmoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-bold text-cyan-300">{selectedProfile.role === 'merchant' ? 'ร้านค้าใน WIN' : 'พาร์ทเนอร์ใน WIN'}</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h3 className="mt-1 text-xl font-black">{selectedProfile.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{selectedProfile.description || 'ยังไม่มีคำอธิบาย'}</p>
                </div>
                <button type="button" onClick={() => setSelectedProfile(null)} className="rounded-xl bg-white/10 p-2 text-slate-300 hover:bg-white/15"><X className="h-5 w-5" /></button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-black/25 p-2.5"><MapPin className="mb-1 h-4 w-4 text-cyan-300" /><p className="text-[9px] text-slate-500">ระยะทาง</p><p className="text-xs font-black text-cyan-300">{routes[selectedProfile.id] ? `${routes[selectedProfile.id].distanceKm} กม.` : 'เปิด GPS'}</p></div>
                <div className="rounded-xl bg-black/25 p-2.5"><Clock3 className="mb-1 h-4 w-4 text-amber-300" /><p className="text-[9px] text-slate-500">เวลา</p><p className="truncate text-xs font-black text-white">{selectedProfile.openHours || 'ไม่ระบุ'}</p></div>
                <div className="rounded-xl bg-black/25 p-2.5"><Package className="mb-1 h-4 w-4 text-emerald-300" /><p className="text-[9px] text-slate-500">สินค้า</p><p className="text-xs font-black text-white">{selectedProfile.products.length} รายการ</p></div>
                <div className="rounded-xl bg-black/25 p-2.5"><Tag className="mb-1 h-4 w-4 text-fuchsia-300" /><p className="text-[9px] text-slate-500">โปร/สิทธิ์</p><p className="text-xs font-black text-white">{selectedProfile.promotions.length} รายการ</p></div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {onRideToDestination && selectedProfile.address && (
                  <button type="button" onClick={() => onRideToDestination(selectedProfile.name, selectedProfile.address, routes[selectedProfile.id]?.distanceKm)}
                    className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(0,210,255,0.25)]">
                    <Navigation className="mr-1 inline h-4 w-4" />ปักหมุดเรียกพี่วินไปที่นี่
                  </button>
                )}
                {selectedProfile.phone && <button type="button" onClick={() => callProfile(selectedProfile.phone)} className="rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-black text-white"><Phone className="mr-1 inline h-4 w-4 text-emerald-300" />โทรหาร้าน</button>}
                <button type="button" onClick={() => void shareProfile(selectedProfile)} className="rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-black text-white"><ExternalLink className="mr-1 inline h-4 w-4 text-amber-300" />แชร์โปรไฟล์</button>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              {selectedProfile.address && <section className="rounded-2xl border border-white/10 bg-white/5 p-4"><h4 className="text-xs font-black text-cyan-300">📍 ที่ตั้ง</h4><p className="mt-2 text-sm text-white">{selectedProfile.address}</p><p className="mt-1 text-[10px] text-slate-500">ข้อมูลจากโปรไฟล์ที่ลงทะเบียนใน WINRIDER.AI</p></section>}
              {selectedProfile.highlights.length > 0 && <section><h4 className="mb-2 text-sm font-black text-amber-300">จุดเด่นของร้าน/พาร์ทเนอร์</h4><div className="flex flex-wrap gap-2">{selectedProfile.highlights.map((item) => <span key={item} className="rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-xs text-amber-100">{item}</span>)}</div></section>}
              {([
                ['products', 'สินค้า', 'สินค้าที่ลงขายในหน้าร้าน', 'products'],
                ['services', 'บริการ', 'บริการที่พาร์ทเนอร์เปิดให้จอง/สอบถาม', 'services'],
                ['promotions', 'โปรโมชันและสิทธิพิเศษ', 'ดีล ส่วนลด และเงื่อนไขที่ร้านประกาศ', 'promos'],
              ] as const).map(([key, title, subtitle, icon]) => {
                const records = selectedProfile[key];
                return <section key={key}><div className="mb-2 flex items-end justify-between"><div><h4 className="flex items-center gap-2 text-sm font-black text-white"><SectionIcon kind={icon} />{title}</h4><p className="text-[10px] text-slate-500">{subtitle}</p></div><span className="text-[10px] font-mono text-slate-500">{records.length} รายการ</span></div>
                  {records.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 p-5 text-center text-xs text-slate-500">เจ้าของโปรไฟล์ยังไม่ได้ลงข้อมูลส่วนนี้</div> :
                    <div className="grid gap-2 sm:grid-cols-2">{records.map((record, index) => <article key={index} className="rounded-2xl border border-white/10 bg-[#0A1730] p-3.5">
                      <div className="flex items-start justify-between gap-2"><h5 className="text-sm font-black text-white">{valueText(record, ['title', 'name', 'serviceName']) || `${title} ${index + 1}`}</h5><span className="text-xs font-black text-amber-300">{valueText(record, ['price', 'discountText'])}</span></div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">{valueText(record, ['description', 'detail', 'condition']) || 'เจ้าของโปรไฟล์ยังไม่ได้เพิ่มรายละเอียด'}</p>
                      {valueText(record, ['validUntil']) && <p className="mt-2 text-[10px] text-slate-500">ใช้ได้ถึง {valueText(record, ['validUntil'])}</p>}
                    </article>)}</div>}
                </section>;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
