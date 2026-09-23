import React, { useEffect, useMemo, useState } from 'react';
import { emitQuestMetric } from '../services/questService';
import { Loader2, MapPin, Package, PlusCircle, Search, ShieldCheck, ShoppingBag, Store, User, X } from 'lucide-react';
import { MarketItem, MarketItemCategory } from '../types';
import { AdminPhotoEvidencePicker, PhotoEvidenceResult } from './AdminPhotoEvidencePicker';
import { CustomerPaymentQrCodeModal } from './CustomerPaymentQrCodeModal';
import { auth } from '../firebase';

interface Props {
  audioEnabled?: boolean;
  onOpenWinBuddy?: () => void;
  customerListedItems?: MarketItem[];
  onAddNewCustomerItem?: (item: MarketItem) => void;
  onBackToMain?: () => void;
}

const categories: Record<MarketItemCategory, string> = {
  rider_gear: 'อุปกรณ์ขับขี่', food_snack: 'อาหารและขนม', second_hand: 'มือหนึ่ง/มือสอง',
  fashion_accessories: 'เสื้อผ้าและเครื่องประดับ', handmade_art: 'งานศิลปะและคราฟต์',
  produce_fruit: 'ผักและผลไม้', medicine_health: 'สุขภาพ', pet_supplies: 'อุปกรณ์สัตว์เลี้ยง',
  stationery_craft: 'เครื่องเขียน', electronics_gadget: 'อุปกรณ์อิเล็กทรอนิกส์',
};

const normalize = (raw: Partial<MarketItem> & Record<string, unknown>): MarketItem => ({
  id: String(raw.id || ''), title: String(raw.title || ''), price: Number(raw.price) || 0,
  originalPrice: typeof raw.originalPrice === 'number' ? raw.originalPrice : undefined,
  sellerType: raw.sellerType === 'merchant' ? 'merchant' : 'citizen',
  sellerName: String(raw.sellerName || 'ผู้ขายในชุมชน'), sellerAvatar: String(raw.sellerAvatar || '👤'),
  sellerAvatarUrl: typeof raw.sellerAvatarUrl === 'string' ? raw.sellerAvatarUrl : undefined,
  sellerUid: typeof raw.sellerUserId === 'string' ? raw.sellerUserId : (typeof raw.sellerUid === 'string' ? raw.sellerUid : undefined),
  sellerLocationEnabled: raw.sellerLocationEnabled === true,
  sellerLatitude: Number.isFinite(Number(raw.sellerLatitude)) ? Number(raw.sellerLatitude) : undefined,
  sellerLongitude: Number.isFinite(Number(raw.sellerLongitude)) ? Number(raw.sellerLongitude) : undefined,
  sellerLevel: Number(raw.sellerLevel) || 0, sellerRating: Number(raw.sellerRating) || 0,
  category: (raw.category || 'second_hand') as MarketItemCategory,
  categoryLabel: String(raw.categoryLabel || categories[(raw.category || 'second_hand') as MarketItemCategory]),
  condition: (raw.condition || 'used') as MarketItem['condition'],
  conditionLabel: String(raw.conditionLabel || 'ผู้ขายระบุสภาพสินค้า'),
  description: String(raw.description || ''), imageIcon: String(raw.imageIcon || '📦'),
  imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
  location: String(raw.location || ''), distanceKm: typeof raw.distanceKm === 'number' ? raw.distanceKm : 0,
  stock: Number(raw.stock) || 1, salesCount: Number(raw.salesCount) || 0,
  tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [],
  isCustomerListed: raw.isCustomerListed !== false, isAiVerified: raw.isAiVerified === true,
  aiCertificateId: typeof raw.aiCertificateId === 'string' ? raw.aiCertificateId : undefined,
  aiQualityScore: typeof raw.aiQualityScore === 'number' ? raw.aiQualityScore : undefined,
  aiVerifiedDate: typeof raw.aiVerifiedDate === 'string' ? raw.aiVerifiedDate : undefined,
  sellerWalletId: typeof raw.sellerWalletId === 'string' ? raw.sellerWalletId : undefined,
});

export const WinStreetMarketView: React.FC<Props> = ({ customerListedItems = [], onAddNewCustomerItem, onBackToMain }) => {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | MarketItemCategory>('all');
  const [sellOpen, setSellOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [listingCategory, setListingCategory] = useState<MarketItemCategory>('second_hand');
  const [condition, setCondition] = useState<MarketItem['condition']>('used');
  const [photoEvidence, setPhotoEvidence] = useState<PhotoEvidenceResult | null>(null);
  const [purchaseItem, setPurchaseItem] = useState<MarketItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true); setError('');
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนเปิดตลาดประชาชน');
        const response = await fetch('/api/shop/listings', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        const payload = await response.json() as { listings?: Array<Partial<MarketItem> & Record<string, unknown>>; error?: string };
        if (!response.ok) throw new Error(payload.error || 'โหลดรายการสินค้าไม่สำเร็จ');
        if (!cancelled) {
          const serverItems = (payload.listings || []).map(normalize);
          // Server data is authoritative after re-login/reload; local callback state is only a short-lived UI fallback.
          const serverIds = new Set(serverItems.map((item) => item.id));
          const localOnly = customerListedItems.map((item) => normalize(item as MarketItem & Record<string, unknown>)).filter((item) => !serverIds.has(item.id));
          const merged = [...serverItems, ...localOnly];
          setItems(Array.from(new Map(merged.filter((item) => item.id).map((item) => [item.id, item])).values()));
        }
      } catch (cause) {
        if (!cancelled) { setItems([]); setError(cause instanceof Error ? cause.message : 'โหลดรายการสินค้าไม่สำเร็จ'); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [customerListedItems]);

  const visible = useMemo(() => items.filter((item) => item.sellerType === 'citizen').filter((item) => {
    const text = query.trim().toLowerCase();
    return (category === 'all' || item.category === category) && (!text || `${item.title} ${item.description} ${item.sellerName}`.toLowerCase().includes(text));
  }), [items, query, category]);

  const unpublish = async (item: MarketItem) => {
    const user = auth.currentUser;
    if (!user || item.sellerUid !== user.uid) return;
    if (!confirm(`ยกเลิกประกาศ “${item.title}” ?`)) return;
    setError('');
    try {
      const response = await fetch(`/api/shop/listings/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ action: 'UNPUBLISH' }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'ยกเลิกประกาศไม่สำเร็จ');
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ยกเลิกประกาศไม่สำเร็จ');
    }
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || Number(price) <= 0 || !location.trim()) { setError('กรุณากรอกชื่อ ราคา และจุดนัดรับจริงให้ครบ'); return; }
    if (!photoEvidence) { setError('กรุณาถ่ายหรือเลือกรูปสินค้าจริงก่อนส่งให้แอดมินตรวจ'); return; }
    setPublishing(true); setError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('กรุณาเข้าสู่ระบบอีกครั้ง');
      const response = await fetch('/api/shop/listings', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ title: title.trim(), price: Number(price), stock: 1, category: listingCategory,
          categoryLabel: categories[listingCategory], condition, description: description.trim(), location: location.trim(),
          imageUrl: photoEvidence.imageUrl, imageIcon: photoEvidence.imageIcon || '📸' }),
      });
      const payload = await response.json() as { listing?: Partial<MarketItem> & Record<string, unknown>; error?: string; pendingAdminReview?: boolean };
      if (!response.ok || !payload.listing) throw new Error(payload.error || 'ส่งรายการสินค้าให้แอดมินตรวจไม่สำเร็จ');
      setTitle(''); setPrice(''); setDescription(''); setLocation(''); setPhotoEvidence(null); setSellOpen(false);
      alert('ส่งรูปและรายการสินค้าให้แอดมินตรวจแล้ว เมื่ออนุมัติจึงจะแสดงในตลาด');
      void emitQuestMetric('merchant.catalog_update', 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'บันทึกรายการสินค้าไม่สำเร็จ'); }
    finally { setPublishing(false); }
  };

  return <div className="space-y-4">
    <section className="rounded-3xl border border-amber-400/30 bg-[#0B162D] p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-300">WIN STREET MARKET • COMMUNITY</p><h2 className="mt-1 text-xl font-black text-white">ตลาดประชาชน — ของที่ลูกค้าลงขายเอง</h2><p className="mt-1 text-sm text-slate-300">รวมสินค้าที่ผู้ใช้ WINRIDER.AI ลงขายจากหน้าโปรไฟล์ของตัวเอง พร้อมข้อมูลผู้ขาย จุดนัดรับ และรูปจริงที่ผ่านการตรวจโดยแอดมิน</p></div><div className="flex gap-2">{onBackToMain && <button onClick={onBackToMain} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white">← กลับ</button>}<button onClick={() => setSellOpen(true)} className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950"><PlusCircle className="mr-1 inline h-4 w-4" />ลงขายสินค้า</button></div></div></section>
    {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาสินค้า หรือชื่อผู้ขาย" className="w-full rounded-xl border border-white/10 bg-[#071126] py-3 pl-10 pr-3 text-sm text-white" /></label><select value={category} onChange={(e) => setCategory(e.target.value as 'all' | MarketItemCategory)} className="rounded-xl border border-white/10 bg-[#071126] px-3 py-2 text-sm text-white"><option value="all">ทุกหมวดหมู่</option>{Object.entries(categories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
    {loading ? <div className="p-10 text-center text-slate-300"><Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" />กำลังโหลดรายการจริง…</div> : visible.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center"><ShoppingBag className="mx-auto mb-3 h-9 w-9 text-slate-500" /><h3 className="font-bold text-white">ยังไม่มีสินค้าที่ลงขายจริง</h3><p className="mt-1 text-sm text-slate-400">เมื่อผู้ใช้ลงสินค้า รายการจะปรากฏที่นี่โดยไม่เติมข้อมูลตัวอย่าง</p></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#071126]"><div className="flex h-44 items-center justify-center bg-slate-900 text-5xl">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" /> : item.imageIcon}</div><div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-black text-white">{item.title}</h3><span className="whitespace-nowrap font-black text-amber-300">฿{item.price.toLocaleString()}</span></div><p className="line-clamp-2 text-xs text-slate-300">{item.description || 'ผู้ขายยังไม่ได้เพิ่มรายละเอียด'}</p><p className="text-xs text-cyan-300">{item.sellerType === 'merchant' ? <Store className="mr-1 inline h-3.5 w-3.5" /> : <User className="mr-1 inline h-3.5 w-3.5" />}{item.sellerName}</p><p className="text-xs text-slate-400"><MapPin className="mr-1 inline h-3.5 w-3.5" />{item.location || 'ผู้ขายยังไม่ได้ระบุจุดนัดรับ'}</p>{item.sellerWalletId && <p className="text-[10px] font-mono text-cyan-300">WIN Wallet: {item.sellerWalletId}</p>}{item.isAiVerified && <p className="text-xs font-bold text-emerald-300"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />ตรวจสอบภาพสินค้าแล้ว</p>}<div className="mt-2 grid gap-2"><button type="button" onClick={() => setPurchaseItem(item)} disabled={!item.sellerWalletId || item.stock < 1} className="w-full rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><ShoppingBag className="mr-1 inline h-3.5 w-3.5" />{item.stock < 1 ? 'สินค้าหมด' : 'ซื้อสินค้า'}</button>{item.sellerUid === auth.currentUser?.uid && <button type="button" onClick={() => void unpublish(item)} className="w-full rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-300">ยกเลิกประกาศ</button>}</div></div></article>)}</div>}
    {sellOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"><form onSubmit={publish} className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-amber-400/40 bg-[#071126] p-5 text-white"><div className="flex justify-between"><div><h3 className="font-black">ลงขายสินค้าใน WIN Street Market</h3><p className="text-xs text-slate-400">ข้อมูลจะบันทึกกับบัญชีที่เข้าสู่ระบบ</p></div><button type="button" onClick={() => setSellOpen(false)}><X /></button></div><AdminPhotoEvidencePicker category="market-listing" title="รูปสินค้าจริง" description="รูปจะถูกส่งเข้าคิว Admin Verification ก่อนแสดงขาย" onPhotoReady={setPhotoEvidence} onReset={() => setPhotoEvidence(null)} /><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อสินค้า" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" /><div className="grid grid-cols-2 gap-2"><input required min="1" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ราคา (บาท)" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm" /><select value={listingCategory} onChange={(e) => setListingCategory(e.target.value as MarketItemCategory)} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">{Object.entries(categories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div><select value={condition} onChange={(e) => setCondition(e.target.value as MarketItem['condition'])} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm"><option value="new">ของใหม่</option><option value="used">มือสอง</option><option value="handmade">งานทำมือ</option><option value="fresh">ของสด/ทำสด</option></select><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="รายละเอียดสินค้า" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" /><input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="จุดนัดรับจริง เช่น ชื่ออาคารหรือที่อยู่" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" /><button disabled={publishing || !photoEvidence} className="w-full rounded-xl bg-amber-400 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{publishing ? <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />กำลังบันทึก…</> : <><Package className="mr-1 inline h-4 w-4" />ส่งให้แอดมินตรวจ</>}</button></form></div>}

    {purchaseItem && <CustomerPaymentQrCodeModal
      isOpen={Boolean(purchaseItem)}
      onClose={() => setPurchaseItem(null)}
      customerName={purchaseItem.sellerName}
      defaultItemTitle={purchaseItem.title}
      defaultAmount={purchaseItem.price}
      customerWalletId={purchaseItem.sellerWalletId || ''}
      audioEnabled={true}
    />}
  </div>;
};
