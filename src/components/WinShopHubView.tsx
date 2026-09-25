import React, { useEffect, useMemo, useState } from 'react';
import { emitQuestMetric } from '../services/questService';
import { auth } from '../firebase';
import {
  Building2, ChevronRight, Clock3, ExternalLink, Loader2, MapPin, Navigation,
  Package, Percent, Phone, Search, ShieldCheck, ShoppingBag, Store, Tag, UserRound, X
} from 'lucide-react';
import { MarketItem } from '../types';
import { useRealGeolocation } from '../hooks/useRealGeolocation';
import { WinStreetMarketView } from './WinStreetMarketView';
import { getExternalGoogleMapsNavUrl } from '../services/googleRoutesService';
import { WIN_SHOP_ITEMS } from '../data/winShopItems';
import { CustomerPaymentQrCodeModal } from './CustomerPaymentQrCodeModal';

interface ShopProfile {
  id: string;
  role: 'merchant' | 'partner';
  name: string;
  description: string;
  avatarUrl: string;
  avatarEmoji: string;
  address: string;
  phone: string;
  walletId?: string;
  email?: string;
  contactPerson?: string;
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
  onOpenBusinessProfile?: (profile: ShopProfile) => void;
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
  audioEnabled, customerListedItems, onAddNewCustomerItem, onBackToMain, onRideToDestination, onOpenBusinessProfile,
}) => {
  const geo = useRealGeolocation(true);
  const [activeTab, setActiveTab] = useState<'home' | 'official' | 'street' | 'merchants' | 'partners' | 'community'>('home');
  const [profiles, setProfiles] = useState<ShopProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ShopProfile | null>(null);
  const [purchaseProduct, setPurchaseProduct] = useState<{ profile: ShopProfile; record: Record<string, unknown> } | null>(null);
  const [officialPurchase, setOfficialPurchase] = useState<(typeof WIN_SHOP_ITEMS)[number] | null>(null);
  const [selectedOfficialItem, setSelectedOfficialItem] = useState<(typeof WIN_SHOP_ITEMS)[number] | null>(null);
  const [officialWalletId, setOfficialWalletId] = useState('');
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
        const user = auth.currentUser;
        if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนเปิด WIN Shop');
        const response = await fetch('/api/shop/directory', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        const payload = await response.json() as { profiles?: ShopProfile[]; error?: string };
        if (!response.ok) throw new Error(payload.error || 'โหลดร้านค้าและพาร์ทเนอร์ไม่สำเร็จ');
        if (!cancelled) setProfiles(Array.isArray(payload.profiles) ? payload.profiles : []);
        try {
          const walletResponse = await fetch('/api/shop/official-wallet', {
            headers: { Authorization: `Bearer ${await user.getIdToken()}` },
            cache: 'no-store',
          });
          const walletPayload = await walletResponse.json().catch(() => ({})) as { walletId?: string };
          if (!cancelled && walletResponse.ok) setOfficialWalletId(String(walletPayload.walletId || ''));
        } catch {
          if (!cancelled) setOfficialWalletId('');
        }
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
    if (activeTab !== 'merchants' && activeTab !== 'partners') return [];
    const role = activeTab === 'merchants' ? 'merchant' : 'partner';
    const search = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (profile.role !== role) return false;
      if (!search) return true;
      return `${profile.name} ${profile.category} ${profile.description} ${profile.address}`.toLowerCase().includes(search);
    });
  }, [profiles, activeTab, query]);

  useEffect(() => {
    const addressProfiles = filteredProfiles.filter((profile) => profile.address);
    if (!geo.isRealGps || geo.latitude === null || geo.longitude === null || addressProfiles.length === 0) {
      setRoutes({});
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const resolved: Record<string, { distanceKm: number; etaMinutes: number | null }> = {};
        for (let offset = 0; offset < addressProfiles.length; offset += 20) {
          const batch = addressProfiles.slice(offset, offset + 20);
          const response = await fetch('/api/places/resolve-routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              latitude: geo.latitude,
              longitude: geo.longitude,
              places: batch.map((profile) => ({
                key: profile.id,
                query: `${profile.name} ${profile.address} ประเทศไทย`,
              })),
            }),
          });
          const payload = await response.json() as { routes?: Array<{ key: string; distanceKm: number; etaMinutes: number | null }> };
          if (!response.ok) continue;
          for (const route of payload.routes || []) resolved[route.key] = route;
        }
        if (!cancelled) setRoutes(resolved);
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
      void emitQuestMetric('citizen.shop_profile_view', 1);
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
              <h2 className="text-2xl font-black tracking-tight text-white">WIN SHOP</h2>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-300">
                เลือก WIN SHOP OFFICIAL สำหรับสินค้าทางการของแอป หรือ WIN Street Market สำหรับร้านค้า พาร์ทเนอร์ และตลาดชุมชน
              </p>
            </div>
            {onBackToMain && <button type="button" onClick={onBackToMain} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black text-white hover:bg-white/10">← กลับหน้าหลัก</button>}
          </div>

          {activeTab === 'home' ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setActiveTab('official'); setSelectedProfile(null); setQuery(''); }}
                className="rounded-3xl border border-amber-400/30 bg-amber-400/5 p-5 text-left transition-all hover:border-amber-300 hover:bg-amber-400/10"
              >
                <ShieldCheck className="mb-3 h-7 w-7 text-amber-300" />
                <div className="text-lg font-black text-white">WIN SHOP OFFICIAL</div>
                <div className="mt-1 text-xs text-slate-400">สินค้าทางการของแอป WINRIDER.AI</div>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('street'); setSelectedProfile(null); setQuery(''); }}
                className="rounded-3xl border border-cyan-400/30 bg-cyan-400/5 p-5 text-left transition-all hover:border-cyan-300 hover:bg-cyan-400/10"
              >
                <ShoppingBag className="mb-3 h-7 w-7 text-cyan-300" />
                <div className="text-lg font-black text-white">WIN Street Market</div>
                <div className="mt-1 text-xs text-slate-400">ร้านค้า • พาร์ทเนอร์ • ตลาดชุมชน</div>
              </button>
            </div>
          ) : activeTab === 'street' ? (
            <div className="mt-5">
              <button type="button" onClick={() => setActiveTab('home')} className="mb-3 text-xs font-black text-cyan-300">← กลับ WIN SHOP</button>
              <div className="grid gap-3 sm:grid-cols-3">
                <button type="button" onClick={() => { setActiveTab('merchants'); setQuery(''); }} className="rounded-3xl border border-white/10 bg-black/20 p-5 text-left hover:border-cyan-400/50">
                  <Store className="mb-3 h-6 w-6 text-cyan-300" />
                  <div className="font-black text-white">ร้านค้า</div>
                  <div className="mt-1 text-[10px] text-slate-500">โปรไฟล์ร้านค้าทั้งหมด เรียงใกล้สุดก่อน</div>
                </button>
                <button type="button" onClick={() => { setActiveTab('partners'); setQuery(''); }} className="rounded-3xl border border-white/10 bg-black/20 p-5 text-left hover:border-cyan-400/50">
                  <Building2 className="mb-3 h-6 w-6 text-cyan-300" />
                  <div className="font-black text-white">พาร์ทเนอร์</div>
                  <div className="mt-1 text-[10px] text-slate-500">โปรไฟล์พาร์ทเนอร์ทั้งหมด เรียงใกล้สุดก่อน</div>
                </button>
                <button type="button" onClick={() => setActiveTab('community')} className="rounded-3xl border border-white/10 bg-black/20 p-5 text-left hover:border-amber-400/50">
                  <UserRound className="mb-3 h-6 w-6 text-amber-300" />
                  <div className="font-black text-white">ตลาดชุมชน</div>
                  <div className="mt-1 text-[10px] text-slate-500">สินค้าที่พลเมืองลงขายในแอป</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setActiveTab(activeTab === 'official' ? 'home' : 'street')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-cyan-300">
                ← {activeTab === 'official' ? 'กลับ WIN SHOP' : 'กลับ WIN Street Market'}
              </button>
              <span className="text-xs text-slate-400">
                {activeTab === 'official' ? 'WIN SHOP OFFICIAL' : activeTab === 'merchants' ? 'ร้านค้าทั้งหมด' : activeTab === 'partners' ? 'พาร์ทเนอร์ทั้งหมด' : 'ตลาดชุมชน'}
              </span>
            </div>
          )}
        </div>
      </section>

      {activeTab === 'home' || activeTab === 'street' ? null : activeTab === 'official' ? (
        <section className="space-y-3">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
            <p className="text-xs font-black text-amber-300">WIN OFFICIAL SHOP</p>
            <p className="mt-1 text-sm text-slate-300">สินค้าที่ WINRIDER.AI จำหน่ายเอง แยกจากร้านค้า พาร์ทเนอร์ และ WIN Street Market ชัดเจน</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WIN_SHOP_ITEMS.map((item) => (
              <article
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOfficialItem(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedOfficialItem(item);
                  }
                }}
                className="cursor-pointer overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-b from-[#0B1830] to-[#071126] shadow-lg transition-all hover:-translate-y-0.5 hover:border-amber-300/50"
              >
                <div className="h-44 bg-slate-950">
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[9px] font-black text-amber-300">WIN OFFICIAL</span>
                      <h3 className="mt-2 text-sm font-black text-white">{item.name}</h3>
                    </div>
                    <span className="shrink-0 text-sm font-black text-amber-300">฿{item.price.toLocaleString()}</span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-slate-300">{item.description}</p>
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px]">
                    <span className="text-cyan-300">{item.categoryTh}</span>
                    <span className={item.inStock ? 'font-black text-emerald-300' : 'font-black text-rose-300'}>
                      {item.inStock ? `คงเหลือ ${item.stockCount}` : 'หมด'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>แตะสินค้าเพื่อดูรายละเอียดทั้งหมด</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                  <button
                    type="button"
                    disabled={!item.inStock || !officialWalletId}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOfficialPurchase(item);
                    }}
                    className="w-full rounded-xl bg-amber-400 px-3 py-2.5 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ShoppingBag className="mr-1 inline h-4 w-4" />
                    {item.inStock ? 'ซื้อสินค้า' : 'สินค้าหมด'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : activeTab === 'community' ? (
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
                {geo.isRealGps ? '📍 ใช้ระยะเส้นตรงโดยประมาณจากตำแหน่งคุณ' : '📍 เปิดตำแหน่งเพื่อเรียงตามระยะทางโดยประมาณ'}
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
                <button key={profile.id} type="button" onClick={() => { openProfile(profile); onOpenBusinessProfile?.(profile); }}
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
                    <div className="mt-3 flex items-center justify-end">
                      <span className="inline-flex items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[10px] font-black text-cyan-200">
                        ดูโปรไฟล์{profile.role === 'merchant' ? 'ร้านค้า' : 'พาร์ทเนอร์'} <ChevronRight className="h-3.5 w-3.5" />
                      </span>
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
                {selectedProfile.phone && <button type="button" onClick={() => callProfile(selectedProfile.phone)} className="rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-black text-white"><Phone className="mr-1 inline h-4 w-4 text-emerald-300" />{selectedProfile.role === "merchant" ? "โทรหาร้าน" : "โทรหาพาร์ทเนอร์"}</button>}
                <button type="button" onClick={() => void shareProfile(selectedProfile)} className="rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-black text-white"><ExternalLink className="mr-1 inline h-4 w-4 text-amber-300" />แชร์โปรไฟล์</button>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              {(selectedProfile.phone || selectedProfile.email || selectedProfile.contactPerson) && <section className="rounded-2xl border border-white/10 bg-white/5 p-4"><h4 className="text-xs font-black text-white">ช่องทางติดต่อ</h4><div className="mt-2 grid gap-2 sm:grid-cols-3">{selectedProfile.contactPerson && <div className="rounded-xl bg-black/15 p-2.5"><p className="text-[9px] text-slate-500">ผู้ติดต่อ</p><p className="text-xs font-bold text-white">{selectedProfile.contactPerson}</p></div>}{selectedProfile.phone && <div className="rounded-xl bg-black/15 p-2.5"><p className="text-[9px] text-slate-500">โทรศัพท์</p><p className="text-xs font-bold text-white">{selectedProfile.phone}</p></div>}{selectedProfile.email && <div className="rounded-xl bg-black/15 p-2.5"><p className="text-[9px] text-slate-500">อีเมล</p><p className="truncate text-xs font-bold text-white">{selectedProfile.email}</p></div>}</div></section>}
              {selectedProfile.address && (
                <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-cyan-300">📍 ที่ตั้งร้านค้า / พาร์ทเนอร์</h4>
                    <a
                      href={getExternalGoogleMapsNavUrl(`${selectedProfile.name} ${selectedProfile.address}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-400/20 transition-colors"
                    >
                      <Navigation className="h-3 w-3" />
                      เปิด Google Maps นำทาง ↗
                    </a>
                  </div>
                  <p className="mt-2 text-sm text-white">{selectedProfile.address}</p>
                  <p className="mt-1 text-[10px] text-slate-500">ข้อมูลจากโปรไฟล์ที่ลงทะเบียนใน WINRIDER.AI</p>
                </section>
              )}
              {selectedProfile.highlights.length > 0 && <section><h4 className="mb-2 text-sm font-black text-amber-300">จุดเด่นของร้าน/พาร์ทเนอร์</h4><div className="flex flex-wrap gap-2">{selectedProfile.highlights.map((item) => <span key={item} className="rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-xs text-amber-100">{item}</span>)}</div></section>}
              {([
                ['products', 'สินค้า', 'สินค้าที่ลงขายในหน้าร้าน', 'products'],
                ['services', 'บริการ', 'บริการที่พาร์ทเนอร์เปิดให้จอง/สอบถาม', 'services'],
                ['promotions', 'โปรโมชันและสิทธิพิเศษ', 'ดีล ส่วนลด และเงื่อนไขที่ร้านประกาศ', 'promos'],
              ] as const).map(([key, title, subtitle, icon]) => {
                const records = selectedProfile[key];
                return <section key={key}><div className="mb-2 flex items-end justify-between"><div><h4 className="flex items-center gap-2 text-sm font-black text-white"><SectionIcon kind={icon} />{title}</h4><p className="text-[10px] text-slate-500">{subtitle}</p></div><span className="text-[10px] font-mono text-slate-500">{records.length} รายการ</span></div>
                  {records.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 p-5 text-center text-xs text-slate-500">เจ้าของโปรไฟล์ยังไม่ได้ลงข้อมูลส่วนนี้</div> :
                    <div className="grid gap-3 sm:grid-cols-2">{records.map((record, index) => {
                      const titleText = valueText(record, ['title', 'name', 'serviceName']) || `${title} ${index + 1}`;
                      const imageUrl = valueText(record, ['imageUrl', 'image', 'photoUrl']);
                      const priceText = valueText(record, ['price', 'discountText', 'fee']);
                      const stockText = valueText(record, ['stock', 'available', 'capacity']);
                      return <article key={index} className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0A1730] to-[#071126]">
                        <div className="flex gap-3 p-3.5">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 text-2xl">
                            {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : key === 'products' ? '🛍️' : key === 'services' ? '🤝' : '🏷️'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-sm font-black text-white">{titleText}</h5>
                              {priceText && <span className="shrink-0 text-xs font-black text-amber-300">{priceText}</span>}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-300">{valueText(record, ['description', 'detail', 'condition']) || 'เจ้าของโปรไฟล์ยังไม่ได้เพิ่มรายละเอียด'}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
                              {stockText && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-emerald-300">{key === 'products' ? `คงเหลือ ${stockText}` : `รองรับ ${stockText}`}</span>}
                              {valueText(record, ['validUntil']) && <span className="rounded-full bg-white/5 px-2 py-1 text-slate-400">ถึง {valueText(record, ['validUntil'])}</span>}
                              {valueText(record, ['category']) && <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-cyan-300">{valueText(record, ['category'])}</span>}
                            </div>
                          </div>
                        </div>
                        {key === 'products' && <div className="border-t border-white/5 px-3.5 py-2.5">
                          <button
                            type="button"
                            onClick={() => setPurchaseProduct({ profile: selectedProfile, record })}
                            disabled={!selectedProfile.walletId || Number(record.stock ?? 1) < 1 || Number(record.price ?? 0) <= 0}
                            className="w-full rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ShoppingBag className="mr-1 inline h-3.5 w-3.5" />
                            {Number(record.stock ?? 1) < 1 ? 'สินค้าหมด' : 'ซื้อสินค้า'}
                          </button>
                        </div>}
                        {key === 'services' && <div className="border-t border-white/5 px-3.5 py-2.5 text-[10px] text-slate-400">บริการจากพาร์ทเนอร์ • ติดต่อเพื่อยืนยันคิวและเงื่อนไข</div>}
                      </article>;
                    })}</div>}
                </section>;
              })}
            </div>
          </div>
        </div>
      )}

      {selectedOfficialItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 backdrop-blur-md sm:items-center sm:p-4"
          onClick={() => setSelectedOfficialItem(null)}
        >
          <div
            className="max-h-[96vh] w-full max-w-4xl overflow-y-auto rounded-t-[30px] border border-amber-400/30 bg-[#071126] text-white shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#071126]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">WIN SHOP OFFICIAL</p>
                <p className="text-xs text-slate-400">{selectedOfficialItem.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfficialItem(null)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                aria-label="ปิดรายละเอียดสินค้า"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
              <div className="bg-black">
                <img
                  src={selectedOfficialItem.imageUrl}
                  alt={selectedOfficialItem.name}
                  className="h-auto max-h-[72vh] w-full object-contain"
                />
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${selectedOfficialItem.badgeColor}`}>
                      {selectedOfficialItem.badge}
                    </span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
                      {selectedOfficialItem.categoryTh}
                    </span>
                  </div>
                  <h3 className="text-xl font-black leading-snug text-white sm:text-2xl">{selectedOfficialItem.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{selectedOfficialItem.nameEn}</p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <span className="text-3xl font-black text-amber-300">฿{selectedOfficialItem.price.toLocaleString()}</span>
                  {selectedOfficialItem.originalPrice > selectedOfficialItem.price && (
                    <span className="pb-1 text-sm text-slate-500 line-through">฿{selectedOfficialItem.originalPrice.toLocaleString()}</span>
                  )}
                  <span className={`ml-auto rounded-full px-3 py-1 text-xs font-black ${selectedOfficialItem.inStock ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
                    {selectedOfficialItem.inStock ? `คงเหลือ ${selectedOfficialItem.stockCount}` : 'สินค้าหมด'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-sm font-black text-amber-300">★ {selectedOfficialItem.rating}</div>
                    <div className="mt-1 text-[9px] text-slate-500">{selectedOfficialItem.reviewsCount.toLocaleString()} รีวิว</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-sm font-black text-cyan-300">{selectedOfficialItem.salesCount.toLocaleString()}</div>
                    <div className="mt-1 text-[9px] text-slate-500">ขายแล้ว</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-sm font-black text-white">{selectedOfficialItem.pointsCost.toLocaleString()}</div>
                    <div className="mt-1 text-[9px] text-slate-500">แต้มอ้างอิง</div>
                  </div>
                </div>

                <section>
                  <h4 className="text-xs font-black text-white">รายละเอียดสินค้า</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{selectedOfficialItem.description}</p>
                </section>

                <section>
                  <h4 className="text-xs font-black text-cyan-300">คุณสมบัติหลัก</h4>
                  <div className="mt-2 space-y-2">
                    {selectedOfficialItem.keySpecs.map((spec) => (
                      <div key={spec} className="flex gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-300">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                        <span>{spec}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Tactical Advantage</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{selectedOfficialItem.tacticalAdvantage}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-300">Gold Accent Detail</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{selectedOfficialItem.goldAccentDetail}</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">การชำระ / ผ่อน</h4>
                  <p className="mt-2 text-xs font-bold text-white">{selectedOfficialItem.installment}</p>
                </section>

                <button
                  type="button"
                  disabled={!selectedOfficialItem.inStock || !officialWalletId}
                  onClick={() => {
                    setOfficialPurchase(selectedOfficialItem);
                    setSelectedOfficialItem(null);
                  }}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-3.5 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.22)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ShoppingBag className="mr-1.5 inline h-4 w-4" />
                  {selectedOfficialItem.inStock ? `ซื้อสินค้า ฿${selectedOfficialItem.price.toLocaleString()}` : 'สินค้าหมด'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {officialPurchase && (
        <CustomerPaymentQrCodeModal
          isOpen={Boolean(officialPurchase)}
          onClose={() => setOfficialPurchase(null)}
          customerName="WINRIDER.AI OFFICIAL"
          defaultItemTitle={officialPurchase.name}
          defaultAmount={officialPurchase.price}
          customerWalletId={officialWalletId}
          audioEnabled={audioEnabled !== false}
        />
      )}

      {purchaseProduct && (
        <CustomerPaymentQrCodeModal
          isOpen={Boolean(purchaseProduct)}
          onClose={() => setPurchaseProduct(null)}
          customerName={purchaseProduct.profile.name}
          defaultItemTitle={valueText(purchaseProduct.record, ['title', 'name', 'label']) || 'สินค้าใน WIN SHOP'}
          defaultAmount={Number(purchaseProduct.record.price || 0)}
          customerWalletId={purchaseProduct.profile.walletId || ''}
          audioEnabled={audioEnabled !== false}
        />
      )}
    </div>
  );
};
