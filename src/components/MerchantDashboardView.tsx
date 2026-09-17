import React, { useState } from 'react';
import { Store, ShoppingBag, Bike, TrendingUp, CheckCircle, Clock, Plus, ArrowRight } from 'lucide-react';

interface MerchantDashboardViewProps {
  shopName?: string;
  onSwitchRole?: () => void;
}

export const MerchantDashboardView: React.FC<MerchantDashboardViewProps> = ({
  shopName = 'ร้านอาหารไทยชาววัง (สามย่าน)',
  onSwitchRole
}) => {
  const [gpTier, setGpTier] = useState<'founding' | 'standard'>('founding');
  const gpRate = gpTier === 'founding' ? 5 : 10; // 5% for founding partners

  const [orders, setOrders] = useState([
    { id: 'ORD-8801', items: 'ข้าวมันไก่พิเศษ 2 กล่อง + น้ำเก๊กฮวย', total: 160, deliveryFee: 35, status: 'WAITING_KNIGHT', time: '5 นาทีที่แล้ว' },
    { id: 'ORD-8802', items: 'ก๋วยเตี๋ยวต้มยำโบราณ 3 ชาม', total: 210, deliveryFee: 40, status: 'DELIVERED', time: '35 นาทีที่แล้ว' }
  ]);

  const [newOrderModal, setNewOrderModal] = useState(false);
  const [newOrderItems, setNewOrderItems] = useState('');
  const [newOrderAmount, setNewOrderAmount] = useState(150);

  const handleCreateOrder = () => {
    if (!newOrderItems.trim()) return;
    const newOrd = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      items: newOrderItems,
      total: Number(newOrderAmount),
      deliveryFee: 35,
      status: 'WAITING_KNIGHT',
      time: 'เมื่อสักครู่'
    };
    setOrders([newOrd, ...orders]);
    setNewOrderModal(false);
    setNewOrderItems('');
  };

  return (
    <div className="min-h-screen bg-[#0A1633] text-white flex flex-col font-thai max-w-md mx-auto pb-20">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-[#00D4FF]/20 bg-[#0A1633]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#00D4FF]/20 border border-[#00D4FF] flex items-center justify-center text-[#00D4FF]">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">{shopName}</h1>
            <span className="text-[10px] text-gray-400">ร้านค้าพันธมิตรชุมชน</span>
          </div>
        </div>

        {onSwitchRole && (
          <button
            onClick={onSwitchRole}
            className="text-[11px] px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition"
          >
            สลับบทบาท
          </button>
        )}
      </header>

      <main className="p-4 space-y-4">
        {/* GP Tier Card */}
        <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">อัตราค่าบริการ GP ชุมชน</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFC93C]/20 text-[#FFC93C] border border-[#FFC93C]/40 font-bold">
              FOUNDING TIER ({gpRate}%)
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{gpRate}%</span>
            <span className="text-xs text-emerald-400 font-medium">โปร่งใส ไม่คิดค่าธรรมเนียมแอบแฝง</span>
          </div>
          <p className="text-[11px] text-gray-400">
            ระบบคิดค่า GP เพียง {gpRate}% เพื่อเป็นค่าดำเนินงานระบบและกองทุนสวัสดิการชุมชน
          </p>
        </div>

        {/* Action Button: Call Knight */}
        <button
          onClick={() => setNewOrderModal(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#00D4FF] text-[#0A1633] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#38E1FF] transition shadow-[0_0_20px_rgba(0,212,255,0.4)] active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างออเดอร์ & เรียกอัศวินส่งด่วน</span>
        </button>

        {/* Orders List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider px-1">
            รายการออเดอร์ส่งด่วน
          </h3>

          <div className="space-y-2">
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-3.5 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/20 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#00D4FF]" />
                    {o.id}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    o.status === 'WAITING_KNIGHT' 
                      ? 'bg-amber-500/20 text-amber-300' 
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {o.status === 'WAITING_KNIGHT' ? 'กำลังรออัศวินรับของ' : 'จัดส่งสำเร็จ'}
                  </span>
                </div>

                <p className="text-gray-300 text-[11px]">{o.items}</p>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                  <span className="text-gray-400">ยอดออเดอร์: <strong>฿{o.total}</strong> | ค่าส่ง: <strong>฿{o.deliveryFee}</strong></span>
                  <span className="text-gray-500">{o.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* New Order Modal */}
      {newOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0A1633] border border-[#00D4FF]/40 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">สร้างรายการส่งด่วนร้านค้า</h3>
            <div>
              <label className="text-[11px] text-gray-300 block mb-1">รายการอาหาร/สินค้า</label>
              <textarea
                value={newOrderItems}
                onChange={(e) => setNewOrderItems(e.target.value)}
                placeholder="เช่น ข้าวผัดกุ้ง 2 จาน"
                className="w-full bg-[#0A1633] border border-[#00D4FF]/25 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00D4FF]"
                rows={3}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-300 block mb-1">มูลค่าสินค้า (บาท)</label>
              <input
                type="number"
                value={newOrderAmount}
                onChange={(e) => setNewOrderAmount(Number(e.target.value))}
                className="w-full bg-[#0A1633] border border-[#00D4FF]/25 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00D4FF]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setNewOrderModal(false)}
                className="flex-1 py-2 rounded-xl border border-white/15 text-gray-400 text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateOrder}
                className="flex-1 py-2 rounded-xl bg-[#00D4FF] text-[#0A1633] font-bold text-xs"
              >
                ยืนยันเรียกอัศวิน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
