import React, { useState, useMemo } from 'react';
import { emitQuestMetric } from '../services/questService';
import { getAuth } from 'firebase/auth';
import { FlashSaleItem } from '../types';
import { NeonProfileAvatar } from './NeonProfileAvatar';
import { SovereignTiersModal } from './SovereignTiersModal';
import { SovereignQuestCenter } from './SovereignQuestCenter';
import { WinScanAndPayModal } from './WinScanAndPayModal';
import { MerchantParcelPickupMapModal } from './MerchantParcelPickupMapModal';
import { ProfileCustomizerModal, ProfileCustomizationData } from './ProfileCustomizerModal';
import { DensityRadarOverlay } from './DensityRadarOverlay';
import { AIProductPhotoVerifier, AIVerificationResult } from './AIProductPhotoVerifier';
import { CyberGraphic } from './CyberGraphic';
import { getMerchantTier, calculateLevelMaxXp, getLevelDifficultyMetrics } from '../data/tierHierarchyData';
import { playTactileBlip, playRadarScan, playLevelUpFanfare } from '../utils/audio';
import { getCurrentUserSession } from '../utils/userSession';
import confetti from 'canvas-confetti';
import { loadProfileCustomization } from '../services/profileService';
import { ProfileQuickActions } from './ProfileQuickActions';
import { 
  ShoppingBag, 
  Users, 
  Truck, 
  TrendingUp, 
  Clock, 
  Plus, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  DollarSign, 
  ArrowUpRight, 
  Store, 
  Zap,
  Activity,
  Flame,
  Award,
  ChevronRight,
  Package,
  CreditCard,
  Banknote,
  QrCode,
  Radio,
  Eye,
  Camera,
  Bike,
  Navigation,
  Ticket,
  Gift,
  ShoppingCart,
  MapPin,
  Star,
  Check,
  X,
  PlusCircle,
  Tag,
  Phone,
  AlertCircle
} from 'lucide-react';

export interface StoreCatalogProduct {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice: number;
  discountBadge?: string;
  imageIcon: string;
  description: string;
  stock: number;
  soldCount: number;
  isFlashSale?: boolean;
  aiVerified?: boolean;
}

interface StoreVoucher {
  id: string;
  code: string;
  title: string;
  discountText: string;
  minSpend: number;
  discountValue: number;
  isPercent: boolean;
  validUntil: string;
}

const INITIAL_STORE_PRODUCTS: StoreCatalogProduct[] = [];

// Promotions must be created by the merchant account; no seeded vouchers are shown.
const STORE_VOUCHERS: StoreVoucher[] = [];

interface MerchantCommandCenterProps {
  audioEnabled: boolean;
  onOpenWinBuddy?: () => void;
  onRideToStore?: (storeName: string, storeAddress: string, distanceKm?: number) => void;
  initialPerspective?: 'owner' | 'customer';
  canEdit?: boolean;
  customerProfile?: {
    id: string; name: string; description: string; avatarUrl: string; avatarEmoji: string; address: string; phone: string; category: string; products: Array<Record<string, unknown>>; services: Array<Record<string, unknown>>; promotions: Array<Record<string, unknown>>; highlights: string[]; openHours?: string;
  };
}

export const MerchantCommandCenter: React.FC<MerchantCommandCenterProps> = ({ 
  audioEnabled, 
  onOpenWinBuddy,
  onRideToStore,
  initialPerspective,
  canEdit = false,
  customerProfile
}) => {
  // Perspective state: แบบที่ 1 (ของร้านค้าเอง) หรือ แบบที่ 2 (หน้าร้านสำหรับลูกค้า)
  const [perspective, setPerspective] = useState<'owner' | 'customer'>(() => {
    if (!canEdit) return 'customer';
    if (initialPerspective) return initialPerspective;
    const session = getCurrentUserSession();
    return session?.role === 'merchant' ? 'owner' : 'customer';
  });

  React.useEffect(() => {
    setPerspective(canEdit && initialPerspective === 'owner' ? 'owner' : 'customer');
  }, [canEdit, initialPerspective]);

  const [knightsAvailable] = useState(0);
  const [merchantLevel, setMerchantLevel] = useState(() => 1);
  const [merchantNextXp, setMerchantNextXp] = useState(() => calculateLevelMaxXp(1, 'merchant'));
  const [merchantXp, setMerchantXp] = useState(0);
  const [merchantXpToast, setMerchantXpToast] = useState<string | null>(null);
  const [showTiersModal, setShowTiersModal] = useState<boolean>(false);
  const [tiersModalInitialRole, setTiersModalInitialRole] = useState<'knight' | 'citizen' | 'merchant'>('merchant');
  const [showScanAndPayModal, setShowScanAndPayModal] = useState<boolean>(false);
  const [showPickupMapModal, setShowPickupMapModal] = useState<boolean>(false);
  const [showProfileCustomizerModal, setShowProfileCustomizerModal] = useState<boolean>(false);
  const [merchantProfileData, setMerchantProfileData] = useState<ProfileCustomizationData>({
    displayName: 'ยังไม่ได้ตั้งชื่อร้านค้า',
    bioStatus: '',
    avatarEmoji: '🏪',
    themeColor: '#FFD700',
    bannerGlow: 'from-[#0D1E3A] via-[#09152B] to-[#060D1E]'
  });

  React.useEffect(() => {
    if (!canEdit) return;
    loadProfileCustomization('merchant').then((saved) => {
      if (saved) setMerchantProfileData(saved);
    }).catch((error) => console.warn('Unable to load merchant profile:', error));
  }, [canEdit]);

  React.useEffect(() => {
    if (!canEdit) return;
    void (async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;
        const response = await fetch('/api/shop/profile-content', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        const payload = await response.json() as { products?: StoreCatalogProduct[] };
        if (response.ok && Array.isArray(payload.products)) setStoreProducts(payload.products as StoreCatalogProduct[]);
      } catch (error) {
        console.warn('Unable to load merchant storefront content:', error);
      }
    })();
  }, [canEdit]);

  const persistMerchantProducts = async (products: StoreCatalogProduct[]) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;
      await fetch('/api/shop/profile-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ products }),
      });
    } catch (error) {
      console.warn('Unable to persist merchant storefront content:', error);
    }
  };

  const currentMerchantTier = useMemo(() => getMerchantTier(merchantLevel), [merchantLevel]);
  const merchantDifficultyMetrics = useMemo(() => getLevelDifficultyMetrics(merchantLevel), [merchantLevel]);

  // Merchant Financial Credit Score (คะแนนเครดิตทางการเงินร้านค้า)
  const [merchantCreditScore, setMerchantCreditScore] = useState<number>(0);
  const [workingCapitalAvailable, setWorkingCapitalAvailable] = useState<number>(0);

  // Products catalog state
  const [storeProducts, setStoreProducts] = useState<StoreCatalogProduct[]>(INITIAL_STORE_PRODUCTS);
  React.useEffect(() => {
    if (!customerProfile) return;
    setMerchantProfileData(prev => ({ ...prev, displayName: customerProfile.name, bioStatus: customerProfile.description, avatarUrl: customerProfile.avatarUrl || prev.avatarUrl }));
    if (Array.isArray(customerProfile.products)) setStoreProducts(customerProfile.products as StoreCatalogProduct[]);
  }, [customerProfile]);

  const [customerCategoryFilter, setCustomerCategoryFilter] = useState<string>('all');
  const [collectedVouchers, setCollectedVouchers] = useState<string[]>([]);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | null>(null);

  // Shopping cart state
  const [cart, setCart] = useState<{ product: StoreCatalogProduct; quantity: number }[]>([]);
  const [showCartModal, setShowCartModal] = useState<boolean>(false);
  const [checkoutDeliveryMethod, setCheckoutDeliveryMethod] = useState<'win_courier' | 'self_pickup'>('win_courier');
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState<boolean>(false);
  const [recentOrderId, setRecentOrderId] = useState<string>('');

  // Ride to store modal state
  const [showRideToStoreModal, setShowRideToStoreModal] = useState<boolean>(false);

  // Owner: Add new product listing modal state
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProdTitle, setNewProdTitle] = useState<string>('');
  const [newProdPrice, setNewProdPrice] = useState<string>('');
  const [newProdOrigPrice, setNewProdOrigPrice] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('ของฝากและขนมไทย');
  const [newProdStock, setNewProdStock] = useState<string>('');
  const [newProdDesc, setNewProdDesc] = useState<string>('');
  const [newProdIsFlash, setNewProdIsFlash] = useState<boolean>(false);
  const [newProdAiVerified, setNewProdAiVerified] = useState<AIVerificationResult | null>(null);

  const [flashSales, setFlashSales] = useState<FlashSaleItem[]>([]);
  const [deliveries, setDeliveries] = useState<Array<{ id: string; item: string; destination: string; eta: string; status: string; knight: string }>>([]);
  const [incomingCustomers] = useState<Array<{ name: string; status: string; eta: string; rideType: string }>>([]);

  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(true);

  // Store metadata
  const storeInfo = {
    name: customerProfile?.name || merchantProfileData.displayName || 'ยังไม่ได้ตั้งชื่อร้านค้า',
    address: customerProfile?.address || '',
    distanceKm: 0,
    estimatedWinFare: 0,
    openHours: customerProfile?.openHours || 'ยังไม่ได้ระบุเวลาทำการ',
    phone: customerProfile?.phone || '',
    rating: 0,
    reviewsCount: 0
  };

  const handleGainMerchantCredit = (points: number, reason: string) => {
    if (audioEnabled) playTactileBlip(1200);
    setMerchantCreditScore(prev => Math.min(850, prev + points));
    setMerchantXpToast(`💳 +${points} คะแนนเครดิตร้านค้า: ${reason}! (รวม: ${Math.min(850, merchantCreditScore + points)}/850)`);
    confetti({ particleCount: 45, spread: 65, colors: ['#FFD700', '#00D2FF', '#10B981'] });
    setTimeout(() => setMerchantXpToast(null), 3500);
  };

  const handleDrawWorkingCapital = (amount: number) => {
    if (workingCapitalAvailable < amount) {
      if (audioEnabled) playTactileBlip(400);
      alert(`⚠️ วงเงินหมุนเวียนคงเหลือไม่เพียงพอ (คงเหลือ ฿${workingCapitalAvailable.toLocaleString()})`);
      return;
    }
    if (audioEnabled) playRadarScan();
    setWorkingCapitalAvailable(prev => prev - amount);
    confetti({ particleCount: 50, spread: 75, colors: ['#FFD700', '#00D2FF'] });
    setMerchantXpToast(`💸 เบิกเงินทุนหมุนเวียนคู่ค้า 0% ดอกเบี้ย: ฿${amount.toLocaleString()} โอนเข้าบัญชีร้านค้าเรียบร้อย!`);
    setTimeout(() => setMerchantXpToast(null), 4000);
  };

  const handleGainMerchantXp = (amount: number, reason: string) => {
    if (audioEnabled) playTactileBlip(1100 + amount * 2);
    setMerchantXp(prev => {
      const newXp = prev + amount;
      if (newXp >= merchantNextXp) {
        const nextLvl = merchantLevel + 1;
        setMerchantLevel(nextLvl);
        const nextReq = calculateLevelMaxXp(nextLvl, 'merchant');
        setMerchantNextXp(nextReq);
        if (audioEnabled) playRadarScan();
        confetti({ particleCount: 80, spread: 90, colors: ['#FFD700', '#F59E0B', '#00D2FF'] });
        setMerchantXpToast(`👑 LEVEL UP! ร้านค้าเลื่อนขั้นเป็น Level ${nextLvl}! (หลอดถัดไป: ${nextReq.toLocaleString()} XP)`);
        return Math.max(0, newXp - merchantNextXp);
      } else {
        setMerchantXpToast(`✨ +${amount} XP: ${reason}`);
        setTimeout(() => setMerchantXpToast(null), 3500);
        return newXp;
      }
    });
  };

  const handleBulkPickup = () => {
    void emitQuestMetric('merchant.dispatch_ready', 1);
    if (audioEnabled) playRadarScan();
    alert('ยังไม่มีออเดอร์จริงสำหรับเรียกพี่วินรับพัสดุ');
  };

  const handleTogglePerspective = (mode: 'owner' | 'customer') => {
    if (mode === 'owner' && !canEdit) return;
    if (audioEnabled) playTactileBlip(1000);
    setPerspective(mode);
  };

  // Cart operations
  const handleAddToCart = (product: StoreCatalogProduct) => {
    if (audioEnabled) playTactileBlip(1100);
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    confetti({ particleCount: 30, spread: 50, colors: ['#00D2FF', '#FFD700'] });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : null;
      }
      return item;
    }).filter(Boolean) as { product: StoreCatalogProduct; quantity: number }[]);
  };

  const handleCollectVoucher = (voucherCode: string) => {
    if (audioEnabled) playLevelUpFanfare();
    setCollectedVouchers(prev => [...prev, voucherCode]);
    setSelectedVoucherCode(voucherCode);
    confetti({ particleCount: 40, spread: 60, colors: ['#FFD700', '#10B981'] });
  };

  const cartTotalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [cart]);

  const activeVoucher = useMemo(() => {
    if (!selectedVoucherCode) return null;
    return STORE_VOUCHERS.find(v => v.code === selectedVoucherCode) || null;
  }, [selectedVoucherCode]);

  const discountAmount = useMemo(() => {
    if (!activeVoucher) return 0;
    if (cartSubtotal < activeVoucher.minSpend) return 0;
    if (activeVoucher.isPercent) {
      return Math.round((cartSubtotal * activeVoucher.discountValue) / 100);
    }
    return activeVoucher.discountValue;
  }, [activeVoucher, cartSubtotal]);

  const deliveryFee = checkoutDeliveryMethod === 'win_courier' ? (activeVoucher?.code === 'WINRIDEFREE' ? 0 : 25) : 0;
  const cartGrandTotal = Math.max(0, cartSubtotal - discountAmount + deliveryFee);

  const handleConfirmOrder = () => {
    if (cart.length === 0) return;
    const orderId = '#ORD-' + Math.floor(1000 + Math.random() * 9000);
    setRecentOrderId(orderId);

    // Deduct stock
    setStoreProducts(prev => prev.map(p => {
      const inCart = cart.find(c => c.product.id === p.id);
      if (inCart) {
        return {
          ...p,
          stock: Math.max(0, p.stock - inCart.quantity),
          soldCount: p.soldCount + inCart.quantity
        };
      }
      return p;
    }));

    // Add to owner backoffice deliveries queue
    const newDelivery = {
      id: orderId,
      item: cart.map(c => `${c.product.title} (x${c.quantity})`).join(', '),
      destination: checkoutDeliveryMethod === 'win_courier' ? 'จัดส่งด่วนถึงบ้านผู้โดยสาร' : 'ลูกค้ามารับเองที่หน้าร้าน',
      eta: '10 นาที',
      status: 'ออเดอร์ใหม่จากลูกค้า (รอจัดส่ง)',
      knight: 'รอจัดสรรอัศวิน WINRIDER'
    };
    setDeliveries(prev => [newDelivery, ...prev]);

    // Give merchant XP and credit points
    handleGainMerchantXp(80, `ได้รับคำสั่งซื้อใหม่ ${orderId}`);
    handleGainMerchantCredit(5, `ลูกค้าสั่งซื้อสำเร็จ ${orderId}`);

    setCart([]);
    setShowCartModal(false);
    setShowOrderSuccessModal(true);
    if (audioEnabled) playLevelUpFanfare();
    confetti({ particleCount: 70, spread: 80, colors: ['#00D2FF', '#FFD700', '#10B981'] });
  };

  const handleRideToStoreConfirm = () => {
    setShowRideToStoreModal(false);
    confetti({ particleCount: 60, spread: 70, colors: ['#00D2FF', '#FFD700', '#10B981'] });
    if (onRideToStore) {
      onRideToStore(storeInfo.name, storeInfo.address, storeInfo.distanceKm);
    } else {
      window.dispatchEvent(new CustomEvent('winrider:set_destination', {
        detail: {
          name: storeInfo.name,
          address: storeInfo.address,
          distanceKm: storeInfo.distanceKm
        }
      }));
    }
  };

  // Owner: Add new product listing
  const handleAddNewProductListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdTitle || !newProdPrice) return;

    const newProd: StoreCatalogProduct = {
      id: 'prod-' + Date.now(),
      title: newProdTitle,
      category: newProdCategory,
      price: parseFloat(newProdPrice) || 199,
      originalPrice: parseFloat(newProdOrigPrice) || (parseFloat(newProdPrice) * 1.3),
      discountBadge: newProdOrigPrice ? `ลด ${Math.round((1 - (parseFloat(newProdPrice) / parseFloat(newProdOrigPrice))) * 100)}%` : undefined,
      imageIcon: newProdAiVerified?.imageIcon || '🎁',
      description: newProdDesc || 'สินค้าคุณภาพดี การันตีมาตรฐานโดยร้านค้าพันธมิตร',
      stock: parseInt(newProdStock) || 20,
      soldCount: 0,
      isFlashSale: newProdIsFlash,
      aiVerified: !!newProdAiVerified
    };

    const nextProducts = [newProd, ...storeProducts];
    setStoreProducts(nextProducts);
    void persistMerchantProducts(nextProducts);

    if (newProdIsFlash) {
      setFlashSales(prev => [{
        id: Date.now().toString(),
        title: newProdTitle,
        price: parseFloat(newProdPrice),
        originalPrice: parseFloat(newProdOrigPrice) || (parseFloat(newProdPrice) * 1.3),
        timeLeft: '06:00:00',
        salesCount: 0,
        category: newProdCategory,
        imageIcon: newProdAiVerified?.imageIcon || '⚡'
      }, ...prev]);
    }

    setNewProdTitle('');
    setNewProdPrice('');
    setNewProdOrigPrice('');
    setNewProdDesc('');
    setNewProdAiVerified(null);
    setShowAddProductModal(false);

    handleGainMerchantXp(180, "ลงของขายสินค้าใหม่สำเร็จ ✨");
    handleGainMerchantCredit(10, "ขยายแคตตาล็อกสินค้าหน้าร้าน");
    if (audioEnabled) playTactileBlip(1200);
    confetti({ particleCount: 60, spread: 75, colors: ['#00D2FF', '#FFD700', '#10B981'] });
  };

  // Filtered products for customer view
  const filteredProducts = useMemo(() => {
    if (customerCategoryFilter === 'all') return storeProducts;
    if (customerCategoryFilter === 'flash') return storeProducts.filter(p => p.isFlashSale);
    return storeProducts.filter(p => p.category.includes(customerCategoryFilter));
  }, [storeProducts, customerCategoryFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {merchantXpToast && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-black text-xs text-center shadow-2xl border-2 border-white/40 animate-bounce">
          {merchantXpToast}
        </div>
      )}
      {/* PERSPECTIVE SWITCHER BAR (แบบที่ 1 vs แบบที่ 2) */}
      <section className="p-4 rounded-3xl bg-gradient-to-r from-[#060E20] via-[#09152E] to-[#060E20] border-2 border-amber-400/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">ระบบหน้าจอโปรไฟล์ร้านค้า (Merchant Profile)</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border ${
                perspective === 'customer' 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/50'
              }`}>
                {perspective === 'customer' ? '🛍️ แบบที่ 2: มุมมองลูกค้าช้อปปิ้ง' : '🏪 แบบที่ 1: มุมมองร้านค้าเอง (หลังร้าน)'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {perspective === 'customer' 
                ? 'มุมมองสำหรับลูกค้า: ดูสินค้าที่ลงขาย สั่งซื้อสินค้า เก็บส่วนลด และปักหมุดเรียกพี่วินมาที่ร้าน'
                : 'มุมมองสำหรับร้านค้า: ลงของขายใหม่ จัดการออเดอร์หลังร้าน เรียกพี่วินรับพัสดุ และเบิกทุนหมุนเวียน'}
            </p>
          </div>
        </div>

        {/* Mode Switch Toggle Button */}
        <div className="flex items-center gap-1.5 p-1.5 bg-black/60 rounded-2xl border border-white/10 w-full md:w-auto justify-center">
          <button
            disabled={!canEdit}
            title={canEdit ? 'เปิดมุมมองหลังร้าน' : 'สงวนสิทธิ์เฉพาะเจ้าของร้าน'}
            onClick={() => handleTogglePerspective('owner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              perspective === 'owner'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                : canEdit ? 'text-slate-400 hover:text-white' : 'text-slate-600 cursor-not-allowed opacity-60'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>แบบที่ 1: ร้านค้าเอง (ลงของ/หลังร้าน)</span>
          </button>
          <button
            onClick={() => handleTogglePerspective('customer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              perspective === 'customer'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>แบบที่ 2: ลูกค้าดูของ/ซื้อสินค้า</span>
          </button>
        </div>
      </section>

      {/* OWNER CONTROL RAIL: compact back-office actions */}
      {perspective === 'owner' && (
        <section className="rounded-3xl border border-amber-400/25 bg-gradient-to-r from-[#151A2B] via-[#0B1730] to-[#081226] p-4 shadow-lg">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2"><Store className="h-4 w-4 text-amber-300" /><h3 className="text-sm font-black text-white">ศูนย์จัดการหน้าร้าน</h3><span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-mono font-bold text-amber-300">OWNER CONTROL</span></div>
              <p className="mt-1 text-[10px] text-slate-400">จัดการสิ่งที่ลูกค้าจะเห็นใน WIN Shop จากจุดเดียว แล้วกดดูหน้าร้านจริงเพื่อเช็กประสบการณ์ลูกค้า</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={() => setShowProfileCustomizerModal(true)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black text-white hover:border-cyan-400/40">🎨 โปรไฟล์</button>
              <button type="button" onClick={() => setShowAddProductModal(true)} className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-200 hover:bg-emerald-500/20">＋ ลงสินค้า</button>
              <button type="button" onClick={() => { setNewProdIsFlash(true); setShowAddProductModal(true); }} className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[10px] font-black text-amber-200 hover:bg-amber-400/20">⚡ Flash Sale</button>
              <button type="button" onClick={() => handleTogglePerspective('customer')} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[10px] font-black text-cyan-200 hover:bg-cyan-400/20">👁 ดูหน้าร้าน</button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-black/20 p-2"><p className="text-[9px] text-slate-500">สินค้าที่ลง</p><p className="text-sm font-black text-white">{storeProducts.length} รายการ</p></div>
            <div className="rounded-xl bg-black/20 p-2"><p className="text-[9px] text-slate-500">สต็อกรวม</p><p className="text-sm font-black text-cyan-300">{storeProducts.reduce((sum, item) => sum + item.stock, 0)} ชิ้น</p></div>
            <div className="rounded-xl bg-black/20 p-2"><p className="text-[9px] text-slate-500">Flash Sale</p><p className="text-sm font-black text-amber-300">{storeProducts.filter((item) => item.isFlashSale).length} รายการ</p></div>
            <div className="rounded-xl bg-black/20 p-2"><p className="text-[9px] text-slate-500">ออเดอร์/ส่งของ</p><p className="text-sm font-black text-emerald-300">{deliveries.length} รายการ</p></div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: CUSTOMER STOREFRONT (แบบที่ 2 สำหรับลูกค้าเข้ามาดูของที่ลงขาย ส่วนลด รายละเอียด และปักหมุดมาที่ร้าน) */}
      {/* ========================================================================= */}
      {perspective === 'customer' ? (
        <div className="space-y-6">
          {/* Customer Store Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0E2045] via-[#091530] to-[#070D1E] border-2 border-cyan-500/40 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden bg-black/60 border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.4)] flex-shrink-0">
                  <img 
                    src={merchantProfileData.avatarUrl || "/avatars/merchant.jpg"} 
                    alt={storeInfo.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                      OFFICIAL STORE 🛡️
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                      VERIFIED MERCHANDISE ✨
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-3xl font-black text-white tracking-wide">
                    {storeInfo.name}
                  </h1>

                  <p className="text-xs text-cyan-200/90 font-mono line-clamp-1">
                    {merchantProfileData.bioStatus}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono pt-1">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" /> {storeInfo.rating} ({storeInfo.reviewsCount} รีวิว)
                    </span>
                    <span className="flex items-center gap-1 text-cyan-300">
                      <MapPin className="w-3.5 h-3.5" /> {storeInfo.address}
                    </span>
                    <span className="text-emerald-400 font-bold">🕒 {storeInfo.openHours}</span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons for Customer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                {/* BIG ACTION BUTTON: "ปักหมุดเรียกพี่วินพาไปที่ร้านนี้" */}
                <button
                  onClick={() => {
                    if (audioEnabled) playRadarScan();
                    setShowRideToStoreModal(true);
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(0,210,255,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2.5 border border-white/40"
                >
                  <Bike className="w-5 h-5 text-slate-950" />
                  <div className="text-left">
                    <div className="leading-tight">📍 ปักหมุดเรียกพี่วินพาไปที่ร้าน</div>
                    <div className="text-[10px] font-mono text-slate-900/80 font-bold">
                      ห่าง {storeInfo.distanceKm} กม. • ~฿{storeInfo.estimatedWinFare} (4 นาที)
                    </div>
                  </div>
                </button>

                {/* Cart Button */}
                <button
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    setShowCartModal(true);
                  }}
                  className="px-5 py-3.5 rounded-2xl bg-black/60 hover:bg-black/80 border-2 border-amber-400 text-amber-300 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)] relative"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>ตะกร้าสินค้า</span>
                  {cartTotalItems > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-mono font-black">
                      {cartTotalItems}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Store highlights strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
              <div className="p-3 rounded-2xl bg-black/40 text-center space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">ระยะทางจากคุณ</span>
                <p className="text-base font-black text-cyan-400 font-mono">{storeInfo.distanceKm} กม.</p>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 text-center space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">ค่าโดยสารพี่วินประมาณ</span>
                <p className="text-base font-black text-emerald-400 font-mono">฿{storeInfo.estimatedWinFare}</p>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 text-center space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">พี่วินส่งด่วนถึงบ้าน</span>
                <p className="text-base font-black text-amber-400 font-mono">สวัสดิการ ฿2</p>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 text-center space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">รับประกันสินค้า</span>
                <p className="text-base font-black text-blue-400 font-mono">AI Verified 100%</p>
              </div>
            </div>
          </div>

          {/* STORE VOUCHERS STRIP (ส่วนลดร้านค้าสำหรับลูกค้า) */}
          <div className="p-5 rounded-3xl bg-[#081226] border border-amber-400/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-400" />
                <span>คูปองส่วนลดพิเศษสำหรับลูกค้า WINRIDER</span>
              </h3>
              <span className="text-xs font-mono text-cyan-300">กดเก็บคูปองเพื่อใช้ตอนสั่งซื้อ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STORE_VOUCHERS.map(vouch => {
                const isCollected = collectedVouchers.includes(vouch.code);
                return (
                  <div 
                    key={vouch.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isCollected 
                        ? 'bg-amber-500/10 border-amber-400/60' 
                        : 'bg-black/40 border-white/10 hover:border-amber-400/40'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.2 rounded bg-amber-500/20">
                        {vouch.discountText}
                      </span>
                      <h4 className="text-xs font-bold text-white leading-tight mt-1">{vouch.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">ขั้นต่ำ ฿{vouch.minSpend} • {vouch.validUntil}</p>
                    </div>

                    <button
                      onClick={() => handleCollectVoucher(vouch.code)}
                      disabled={isCollected}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex-shrink-0 ${
                        isCollected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 shadow-md'
                      }`}
                    >
                      {isCollected ? 'เก็บแล้ว ✓' : 'เก็บคูปอง'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PRODUCT SHOWCASE (รายการของที่ลงขายทั้งหมด) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#070D1E] border border-white/10">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-cyan-400" />
                  <span>สินค้าที่ลงขายทั้งหมด ({filteredProducts.length} รายการ)</span>
                </h3>
                <p className="text-xs text-slate-400">เลือกซื้อสินค้าและเลือกจัดส่งด่วนด้วยพี่วิน หรือรับเองที่หน้าร้าน</p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'flash', label: '⚡ Flash Sale' },
                  { id: 'กาแฟ', label: '☕ กาแฟ & ชา' },
                  { id: 'ของฝาก', label: '🎁 ของฝาก' },
                  { id: 'เกษตรอินทรีย์', label: '🍯 อินทรีย์' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCustomerCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      customerCategoryFilter === cat.id
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map(prod => (
                <div 
                  key={prod.id}
                  className="p-5 rounded-3xl bg-gradient-to-b from-[#09152E] to-[#060D1E] border-2 border-white/10 hover:border-cyan-400/60 shadow-xl transition-all space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <CyberGraphic emoji={prod.imageIcon} size="lg" rounded="rounded-2xl" className="w-14 h-14" />

                      <div className="flex flex-col items-end gap-1">
                        {prod.discountBadge && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-black">
                            {prod.discountBadge}
                          </span>
                        )}
                        {prod.aiVerified && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            AI Verified
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                        {prod.category}
                      </span>
                      <h4 className="text-sm sm:text-base font-black text-white group-hover:text-cyan-300 transition-colors mt-0.5">
                        {prod.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                        {prod.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-lg font-black text-amber-400 font-mono">
                          ฿{prod.price.toLocaleString()}
                        </span>
                        {prod.originalPrice > prod.price && (
                          <span className="text-xs text-slate-500 line-through ml-2 font-mono">
                            ฿{prod.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        คงเหลือ: <strong className="text-white">{prod.stock}</strong> ชิ้น
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(prod)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,210,255,0.4)] active:scale-95 transition-all"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>ใส่ตะกร้า</span>
                      </button>
                      <button
                        onClick={() => {
                          handleAddToCart(prod);
                          setShowCartModal(true);
                        }}
                        className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all"
                      >
                        ซื้อทันที
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MODE 1: OWNER COMMAND CENTER (แบบที่ 1 ของร้านค้าเอง ไว้ลงของขายและดูงานหลังร้าน) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Header Banner for Owner */}
          <div 
            className={`p-6 rounded-3xl bg-gradient-to-r ${merchantProfileData.bannerGlow || 'from-[#0C1E40] via-[#091530] to-[#070D1E]'} border border-[#FFD700]/40 shadow-2xl relative overflow-hidden space-y-4 transition-all`}
            style={{ borderColor: merchantProfileData.themeColor }}
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFD700]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {merchantProfileData.avatarUrl ? (
                  <div className="relative">
                    <img 
                      src={merchantProfileData.avatarUrl} 
                      alt={merchantProfileData.displayName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 shadow-lg"
                      style={{ borderColor: merchantProfileData.themeColor }}
                    />
                    <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-black/80 rounded-full text-[9px] font-bold text-amber-400 border border-amber-400">
                      LV.{merchantLevel}
                    </div>
                  </div>
                ) : (
                  <NeonProfileAvatar 
                    level={merchantLevel} 
                    emoji={merchantProfileData.avatarEmoji || "🏪"} 
                    role="merchant" 
                    size="lg" 
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-white flex items-center gap-1.5">
                      <span>{merchantProfileData.displayName}</span>
                    </h2>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 shadow-[0_0_10px_rgba(255,215,0,0.3)] flex items-center gap-1">
                      <span>{currentMerchantTier.badge}</span>
                      <span>{currentMerchantTier.title}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                      <CreditCard className="w-3 h-3" />
                      เครดิตร้านค้า: {merchantCreditScore}/850
                    </span>
                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(950);
                        setShowProfileCustomizerModal(true);
                      }}
                      className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-600/30 hover:brightness-110 text-cyan-300 border border-cyan-400/60 text-[10px] font-mono font-bold flex items-center gap-1 transition-all shadow-sm"
                    >
                      <Camera className="w-3 h-3 text-cyan-400" />
                      <span>แต่งโปรไฟล์ร้าน</span>
                    </button>
                    <button
                      onClick={() => {
                        if (audioEnabled) playTactileBlip(950);
                        setTiersModalInitialRole('merchant');
                        setShowTiersModal(true);
                      }}
                      className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                    >
                      <Award className="w-3 h-3 text-cyan-400" />
                      <span>ดูทำเนียบ 10 ระดับยศ</span>
                    </button>
                  </div>
                  <p className="text-xs text-amber-200/90 font-mono mt-0.5 line-clamp-1">
                    {merchantProfileData.bioStatus}
                  </p>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    รหัสบัญชีร้านค้า: <strong className="text-amber-300">MCH-AURA-ZENCO-001</strong> • วงเงินหมุนเวียน ฿{workingCapitalAvailable.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Owner Top Fast Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 transition-all active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>➕ ลงของขายใหม่ (Add Product)</span>
                </button>

                <button
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(900);
                    setShowScanAndPayModal(true);
                  }}
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#FFD700] via-amber-400 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center gap-2 transition-all active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  <span>WIN Scan & Pay (QR รับเงิน)</span>
                </button>

                <button
                  onClick={handleBulkPickup}
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center gap-2 transition-all"
                >
                  <Truck className="w-4 h-4" />
                  <span>เรียกพี่วินรับพัสดุ (Bulk Pickup)</span>
                </button>
              </div>
            </div>

            {/* MERCHANT XP PROGRESS BAR HEADER */}
            <div className="p-3 rounded-2xl bg-black/40 border border-[#FFD700]/30 space-y-1.5 font-mono">
              <div className="flex flex-wrap items-center justify-between text-xs gap-1">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#FFD700]" />
                  <span>หลอดระดับขั้นร้านค้าพันธมิตร (LV.{merchantLevel}):</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded border ${merchantDifficultyMetrics.badgeColor}`}>
                    {merchantDifficultyMetrics.difficultyLabel} ({merchantDifficultyMetrics.difficultyIndex})
                  </span>
                </span>
                <span className="text-white font-black">
                  {merchantXp.toLocaleString()} / {merchantNextXp.toLocaleString()} XP ({Math.round((merchantXp / merchantNextXp) * 100)}%)
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-white/10 relative">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-[#00D2FF] transition-all duration-500 relative shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                  style={{ width: `${Math.min(100, Math.max(5, (merchantXp / merchantNextXp) * 100))}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>ขาดอีก {(merchantNextXp - merchantXp).toLocaleString()} XP ถึงเลเวล {merchantLevel + 1}</span>
                <span className="text-amber-300 font-bold">ข้อมูลสิทธิพิเศษจะแสดงเมื่อมีข้อมูลจริงจากระบบ</span>
              </div>
            </div>
          </div>

          <ProfileQuickActions
            role="merchant"
            userName={storeInfo.name}
            audioEnabled={audioEnabled}
            questContent={<SovereignQuestCenter
              initialRole="merchant"
              merchantLevel={merchantLevel}
              audioEnabled={audioEnabled}
              onGainMerchantXp={(amount, reason) => handleGainMerchantXp(amount, reason)}
              onRewardBonusCash={(amount) => setWorkingCapitalAvailable(prev => prev + amount)}
            />}
          />

          {/* DYNAMIC 3D DENSITY RADAR OVERLAY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wide">
                  3D DENSITY RADAR (ระบบตรวจจับความหนาแน่นลูกค้า & อัศวิน WIN)
                </h3>
              </div>
              <button
                onClick={() => {
                  if (audioEnabled) playTactileBlip(850);
                  setShowRadarOverlay(!showRadarOverlay);
                }}
                className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-mono flex items-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showRadarOverlay ? 'ย่อเรดาร์' : '📡 ขยายเรดาร์ 3D Hologram'}</span>
              </button>
            </div>

            {showRadarOverlay && (
              <DensityRadarOverlay
                targetPerspective="merchant"
                venueName="ร้านค้าพันธมิตร WIN HQ (Merchant Command Center)"
                venueIcon="🏬"
                venueCategory="ศูนย์การค้า & พันธมิตรธุรกิจ"
                radiusKm={2.5}
                audioEnabled={audioEnabled}
              />
            )}
          </div>

          {/* Main Grid: Logistics & Outbound vs Flash Sales & Financials */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Col 1 & 2: Logistics & Deliveries */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Incoming Customers & Outbound Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Incoming Customers */}
                <div className="p-5 rounded-2xl bg-[#09152E] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      ลูกค้าที่กำลังเดินทางมาร้าน
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">เวลาถึงโดยประมาณ</span>
                  </div>

                  <div className="space-y-2">
                    {incomingCustomers.map((cust, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{cust.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono">
                              {cust.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{cust.rideType}</span>
                        </div>
                        <span className="text-xs font-bold text-cyan-300 font-mono">{cust.eta}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outbound Deliveries */}
                <div className="p-5 rounded-2xl bg-[#09152E] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      พัสดุและออเดอร์ที่กำลังส่งออก
                    </h4>
                    <button
                      onClick={() => {
                        if (audioEnabled) playRadarScan();
                        alert('การติดตามจะแสดงเมื่อมีพี่วินรับออเดอร์จริง');
                      }}
                      className="text-[10px] text-cyan-300 hover:text-white font-mono underline flex items-center gap-1"
                    >
                      <Truck className="w-3 h-3 text-[#00D2FF]" />
                      <span>ดูแผนที่ 3D สด ({deliveries.length} รายการ)</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {deliveries.map((del, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          if (audioEnabled) playTactileBlip(800);
                          alert('การติดตามจะแสดงเมื่อมีพี่วินรับออเดอร์จริง');
                        }}
                        className="p-3 rounded-xl bg-black/30 hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-500/40 space-y-1 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{del.id} • {del.item}</span>
                          <span className="text-emerald-400 font-mono text-[10px]">{del.status} ({del.eta})</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{del.destination}</span>
                          <span className="text-cyan-300">{del.knight}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Flash Sale & Store Catalog Manager */}
              <div className="p-6 rounded-3xl bg-[#09142A] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                      จัดการดีล Flash Sale & สินค้าหน้าร้าน ({storeProducts.length} ชิ้น)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      สินค้าทั้งหมดจะถูกแสดงให้ลูกค้าเห็นในแบบที่ 2 (Customer Storefront) แบบเรียลไทม์
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddProductModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ลงของขายใหม่ +</span>
                    </button>
                    <button
                      onClick={() => {
                        setNewProdIsFlash(true);
                        setShowAddProductModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#FFD700] hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Flash Sale +</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {storeProducts.map((sale) => (
                    <div key={sale.id} className="p-4 rounded-2xl bg-[#060D1E] border border-cyan-500/30 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <CyberGraphic emoji={sale.imageIcon} size="md" rounded="rounded-xl" className="w-10 h-10" />
                          <div>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-cyan-300 border border-white/10">
                              {sale.category}
                            </span>
                            <h5 className="text-xs font-bold text-white line-clamp-1 mt-0.5">{sale.title}</h5>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="text-sm font-black text-amber-400">฿{sale.price.toLocaleString()}</span>
                          {sale.originalPrice > sale.price && (
                            <span className="text-[10px] text-slate-500 line-through ml-2">฿{sale.originalPrice.toLocaleString()}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                          คงเหลือ {sale.stock} ชิ้น
                        </span>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>ขายแล้ว: <strong>{sale.soldCount} ชิ้น</strong></span>
                        <span className="text-emerald-400 font-bold">หน้าร้านเปิดขายปกติ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Col 3: Revenue Analytics & Financials */}
            <div className="space-y-6">
              {/* Real-time Revenue Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0F2248] via-[#091530] to-[#070D1E] border border-[#00D2FF]/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-300 font-bold uppercase">ยอดขายวันนี้</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    +36.2% เทียบกับเมื่อวาน
                  </span>
                </div>

                <div>
                  <div className="text-3xl font-black text-white">฿24,800.00</div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">เมื่อวาน: ฿18,200.00</div>
                </div>

                {/* Simple Bar Comparison */}
                <div className="space-y-2 pt-2 border-t border-white/10 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">วันนี้:</span>
                      <span className="text-cyan-400 font-bold">฿24,800 (100%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                      <div className="w-full h-full bg-cyan-400 shadow-[0_0_8px_#00D2FF]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">เมื่อวาน:</span>
                      <span className="text-slate-400">฿18,200 (73%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                      <div className="w-[73%] h-full bg-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Merchant Financial Credit Score Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0D2447] via-[#091633] to-[#070E22] border-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">คะแนนเครดิตร้านค้า</h4>
                      <p className="text-[10px] text-emerald-400 font-mono">AAA Sovereign Credit Score</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-emerald-400 font-mono drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                    {merchantCreditScore}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">วงเงินทุนหมุนเวียน 0% ดอกเบี้ย:</span>
                    <span className="text-amber-300 font-bold">฿{workingCapitalAvailable.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                      style={{ width: `${(workingCapitalAvailable / 250000) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleDrawWorkingCapital(20000)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs shadow-md"
                >
                  เบิกเงินทุนหมุนเวียน ฿20,000 (0% ดอกเบี้ย)
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SHOPPING CART & CHECKOUT FOR CUSTOMER */}
      {/* ========================================================================= */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-[#070D1E] border-2 border-cyan-400 p-6 shadow-[0_0_50px_rgba(0,210,255,0.3)] space-y-5 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">ตะกร้าสินค้า ({cartTotalItems} ชิ้น)</h3>
              </div>
              <button onClick={() => setShowCartModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="text-4xl">🛒</div>
                <p className="text-sm text-slate-400 font-mono">ตะกร้าสินค้าว่างเปล่า</p>
                <button
                  onClick={() => setShowCartModal(false)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  ไปเลือกชมสินค้า
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div key={item.product.id} className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CyberGraphic emoji={item.product.imageIcon} size="md" rounded="rounded-xl" className="w-10 h-10" />
                        <div>
                          <h5 className="text-xs font-bold text-white line-clamp-1">{item.product.title}</h5>
                          <p className="text-xs text-amber-400 font-mono font-bold">฿{item.product.price.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateCartQuantity(item.product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold text-white px-1">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateCartQuantity(item.product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery Method Selector */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <span className="text-xs font-mono text-cyan-300 font-bold uppercase">
                    เลือกวิธีรับสินค้า:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setCheckoutDeliveryMethod('win_courier')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        checkoutDeliveryMethod === 'win_courier'
                          ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                          : 'bg-black/20 border-white/10 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Bike className="w-4 h-4 text-cyan-400" />
                        <span>พี่วินส่งด่วนถึงบ้าน</span>
                      </div>
                      <p className="text-[10px] text-emerald-400 mt-1">ถึงใน 15 นาที (ค่าส่ง ฿25)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCheckoutDeliveryMethod('self_pickup')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        checkoutDeliveryMethod === 'self_pickup'
                          ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                          : 'bg-black/20 border-white/10 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-amber-400" />
                        <span>ไปรับเองที่หน้าร้าน</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">ฟรีค่าจัดส่ง</p>
                    </button>
                  </div>
                </div>

                {/* Voucher Selector */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-300 font-bold flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5" />
                      คูปองส่วนลดที่ใช้ได้:
                    </span>
                    {activeVoucher && (
                      <span className="text-emerald-400 font-bold font-mono">
                        ลด ฿{discountAmount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {STORE_VOUCHERS.map(v => {
                      const isSelected = selectedVoucherCode === v.code;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVoucherCode(isSelected ? null : v.code)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono whitespace-nowrap transition-all border ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-sm'
                              : 'bg-black/40 text-slate-300 border-white/10 hover:border-amber-400/40'
                          }`}
                        >
                          {v.code} ({v.discountText})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>ยอดรวมสินค้า:</span>
                    <span>฿{cartSubtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>ส่วนลดคูปอง:</span>
                      <span>-฿{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>ค่าจัดส่ง:</span>
                    <span>{deliveryFee === 0 ? 'ฟรี (฿0)' : `฿${deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-white/10">
                    <span>ยอดชำระสุทธิ:</span>
                    <span className="text-amber-400">฿{cartGrandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleConfirmOrder}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(255,215,0,0.5)] flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>ยืนยันสั่งซื้อสินค้า (Confirm Order)</span>
                  </button>
                  <button
                    onClick={() => setShowCartModal(false)}
                    className="px-4 py-3.5 rounded-xl bg-white/10 text-white font-mono text-xs"
                  >
                    ยกเลิก
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ORDER SUCCESS NOTIFICATION */}
      {/* ========================================================================= */}
      {showOrderSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#0C1E40] via-[#070D1E] to-[#040814] border-2 border-emerald-400 p-6 shadow-[0_0_50px_rgba(16,185,129,0.4)] text-center space-y-4 animate-scaleIn">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(16,185,129,0.5)]">
              🎉
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-mono font-bold">
                ORDER CONFIRMED
              </span>
              <h3 className="text-xl font-black text-white mt-2">สั่งซื้อสินค้าสำเร็จแล้ว!</h3>
              <p className="text-xs text-slate-300 font-mono mt-1">
                รหัสคำสั่งซื้อ: <strong className="text-amber-400">{recentOrderId}</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-left text-xs font-mono space-y-1.5">
              <p className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Bike className="w-4 h-4" />
                สถานะการจัดส่ง:
              </p>
              <p className="text-[11px] text-slate-300">
                ระบบได้ส่งงานพัสดุไปยังอัศวิน WINRIDER ในพื้นที่อโศกแล้ว พร้อมจัดส่งถึงมือคุณในเวลาประมาณ 10-15 นาที
              </p>
            </div>

            <button
              onClick={() => setShowOrderSuccessModal(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs shadow-lg"
            >
              ตกลงและกลับสู่หน้าร้าน
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RIDE TO STORE CONFIRMATION (ปักหมุดเรียกพี่วินพามาที่ร้านนี้) */}
      {/* ========================================================================= */}
      {showRideToStoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#0C1E40] via-[#070D1E] to-[#040814] border-2 border-cyan-400/60 p-6 shadow-[0_0_50px_rgba(0,210,255,0.3)] space-y-5 text-center relative animate-scaleIn">
            <button
              onClick={() => setShowRideToStoreModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(0,210,255,0.5)]">
              🛵
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono font-bold">
                WIN RIDE PINNING
              </span>
              <h3 className="text-lg font-black text-white mt-2">
                ปักหมุดเรียกพี่วินพาไปที่ {storeInfo.name}
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-mono">
                {storeInfo.address}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/50 border border-white/10 font-mono text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400">ระยะทาง</span>
                <p className="text-sm font-black text-cyan-400">{storeInfo.distanceKm} กม.</p>
              </div>
              <div className="space-y-0.5 border-x border-white/10">
                <span className="text-[10px] text-slate-400">เวลาประมาณ</span>
                <p className="text-sm font-black text-amber-400">~4 นาที</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400">ค่าโดยสาร</span>
                <p className="text-sm font-black text-emerald-400">฿{storeInfo.estimatedWinFare}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-left text-xs text-cyan-200 font-mono space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                จุดจอดเทียบด่วน VIP ในร่ม:
              </p>
              <p className="text-[11px] text-slate-300">
                จุดจอดพี่วิน VIP หน้าอาคาร Interchange 21 เชื่อมต่อ Skywalk BTS อโศก / MRT สุขุมวิท สะดวกสบาย
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRideToStoreConfirm}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.5)]"
              >
                <Bike className="w-4 h-4" />
                <span>ยืนยันเรียกพี่วินทันที</span>
              </button>
              <button
                onClick={() => setShowRideToStoreModal(false)}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW PRODUCT LISTING (สำหรับร้านค้าลงของขายใหม่) */}
      {/* ========================================================================= */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form onSubmit={handleAddNewProductListing} className="relative w-full max-w-lg bg-[#0A1428] rounded-3xl border-2 border-emerald-400 p-6 shadow-[0_0_40px_rgba(16,185,129,0.3)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">ลงของขายสินค้าใหม่ (Add Product)</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Mandatory AI Photo Verification Section */}
              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  📸 สแกนรูปถ่ายสินค้าด้วย AI Vision Guard (แนะนำ):
                </label>
                <AIProductPhotoVerifier
                  audioEnabled={audioEnabled}
                  initialItemName={newProdTitle}
                  initialCategory={newProdCategory}
                  onVerificationComplete={(result) => {
                    setNewProdAiVerified(result);
                    if (!newProdTitle) setNewProdTitle(result.detectedTitle);
                    if (!newProdPrice) setNewProdPrice(result.fairPriceRange.min.toString());
                    if (!newProdOrigPrice) setNewProdOrigPrice(result.fairPriceRange.max.toString());
                  }}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ชื่อสินค้า:</label>
                <input
                  type="text"
                  required
                  value={newProdTitle}
                  onChange={(e) => setNewProdTitle(e.target.value)}
                  placeholder="เช่น กาแฟดริปออร์แกนิก, ผ้าพันคอไหมแท้"
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">หมวดหมู่สินค้า:</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="ของฝากและขนมไทย">ของฝากและขนมไทย</option>
                    <option value="กาแฟและอาหารเลิศรส">กาแฟและอาหารเลิศรส</option>
                    <option value="หัตถศิลป์พรีเมียม">หัตถศิลป์พรีเมียม</option>
                    <option value="สินค้าเกษตรอินทรีย์">สินค้าเกษตรอินทรีย์</option>
                    <option value="เสื้อผ้าและแฟชั่น">เสื้อผ้าและแฟชั่น</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">จำนวนสต็อก (ชิ้น):</label>
                  <input
                    type="number"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    placeholder="เช่น 25"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">ราคาขายพิเศษ (บาท):</label>
                  <input
                    type="number"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="เช่น 299"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">ราคาปกติ/ราคาเต็ม (บาท):</label>
                  <input
                    type="number"
                    value={newProdOrigPrice}
                    onChange={(e) => setNewProdOrigPrice(e.target.value)}
                    placeholder="เช่น 390"
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">รายละเอียดสินค้า:</label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="ใส่คำอธิบายจุดเด่น วัตถุดิบ หรือขนาดสินค้า..."
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1E] border border-white/20 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10">
                <input
                  type="checkbox"
                  id="isFlashCheck"
                  checked={newProdIsFlash}
                  onChange={(e) => setNewProdIsFlash(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded"
                />
                <label htmlFor="isFlashCheck" className="text-xs text-amber-300 font-bold cursor-pointer">
                  ⚡ ตั้งเป็นสินค้า Flash Sale จำกัดเวลาพิเศษ
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 font-semibold text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
              >
                บันทึกและขึ้นหน้าร้านทันที
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 10-TIER SOVEREIGN CODEX MODAL */}
      <SovereignTiersModal
        isOpen={showTiersModal}
        onClose={() => setShowTiersModal(false)}
        initialRole={tiersModalInitialRole}
        currentLevel={merchantLevel}
        audioEnabled={audioEnabled}
      />

      {/* WIN SCAN & PAY QR GENERATOR MODAL */}
      <WinScanAndPayModal
        isOpen={showScanAndPayModal}
        onClose={() => setShowScanAndPayModal(false)}
        entityId="merchant_main"
        entityName={storeInfo.name}
        entityType="merchant"
        entityCategoryLabel="ร้านค้าในระบบ WINRIDER.AI"
        defaultAmount={0}
        audioEnabled={audioEnabled}
      />

      {/* 3D PARCEL PICKUP MAP MODAL */}
      <MerchantParcelPickupMapModal
        isOpen={showPickupMapModal}
        onClose={() => setShowPickupMapModal(false)}
        audioEnabled={audioEnabled}
        onGainMerchantXp={(amt, rsn) => handleGainMerchantXp(amt, rsn)}
      />

      {/* PROFILE CUSTOMIZER MODAL FOR MERCHANT */}
      <ProfileCustomizerModal
        isOpen={showProfileCustomizerModal}
        onClose={() => setShowProfileCustomizerModal(false)}
        currentData={merchantProfileData}
        role="merchant"
        onSave={(updated) => setMerchantProfileData(updated)}
        audioEnabled={audioEnabled}
      />
    </div>
  );
};
