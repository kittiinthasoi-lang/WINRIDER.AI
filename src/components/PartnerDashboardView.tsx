import React, { useState } from 'react';
import { Building2, Users, Calendar, Clock, CheckCircle, Plus, ShieldCheck, MapPin } from 'lucide-react';

interface PartnerDashboardViewProps {
  orgName?: string;
  onSwitchRole?: () => void;
}

export const PartnerDashboardView: React.FC<PartnerDashboardViewProps> = ({
  orgName = 'โรงพยาบาลกรุงเทพคริสเตียน (ฝ่ายบริการผู้ป่วยนอก)',
  onSwitchRole
}) => {
  const [activeBookings, setActiveBookings] = useState([
    { id: 'GRP-101', date: 'วันนี้ 14:00', route: 'รพ.กรุงเทพคริสเตียน → BTS ศาลาแดง', passengersCount: 8, knightsAssigned: 4, status: 'CONFIRMED' },
    { id: 'GRP-102', date: 'พรุ่งนี้ 08:30', route: 'รพ.กรุงเทพคริสเตียน → MRT สามย่าน', passengersCount: 12, knightsAssigned: 6, status: 'SCHEDULED' }
  ]);

  const [groupModal, setGroupModal] = useState(false);
  const [routeText, setRouteText] = useState('');
  const [passengerCount, setPassengerCount] = useState(5);

  const handleCreateGroupBooking = () => {
    if (!routeText.trim()) return;
    const newBooking = {
      id: `GRP-${Math.floor(100 + Math.random() * 900)}`,
      date: 'วันนี้ ตามนัดหมาย',
      route: routeText,
      passengersCount: Number(passengerCount),
      knightsAssigned: Math.ceil(Number(passengerCount) / 2),
      status: 'CONFIRMED'
    };
    setActiveBookings([newBooking, ...activeBookings]);
    setGroupModal(false);
    setRouteText('');
  };

  return (
    <div className="min-h-screen bg-[#0A1633] text-white flex flex-col font-thai max-w-md mx-auto pb-20">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-[#00D4FF]/20 bg-[#0A1633]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#00D4FF]/20 border border-[#00D4FF] flex items-center justify-center text-[#00D4FF]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">{orgName}</h1>
            <span className="text-[10px] text-gray-400">องค์กรพันธมิตร B2B Retainer</span>
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
        {/* Retainer Summary Card */}
        <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">สัญญา Retainer ประจำเดือน</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
              ACTIVE
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">฿25,000</span>
            <span className="text-xs text-gray-400">/ เดือน</span>
          </div>
          <p className="text-[11px] text-gray-400">
            โควตาภารกิจกลุ่ม 450 เที่ยว / การรับประกันอัศวินสแตนด์บาย 100% ภายใน 3 นาที
          </p>
        </div>

        {/* Group Booking Button */}
        <button
          onClick={() => setGroupModal(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#00D4FF] text-[#0A1633] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#38E1FF] transition shadow-[0_0_20px_rgba(0,212,255,0.4)] active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>จองคิวรถล่วงหน้าเป็นกลุ่ม (Group Booking)</span>
        </button>

        {/* Bookings List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider px-1">
            รายการจองรถเป็นกลุ่ม
          </h3>

          <div className="space-y-2">
            {activeBookings.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/20 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00D4FF]" />
                    {b.id} • {b.passengersCount} ท่าน
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] font-semibold">
                    {b.status}
                  </span>
                </div>

                <p className="text-gray-300 text-[11px] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{b.route}</span>
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                  <span className="text-gray-400">อัศวินที่จัดสรร: <strong className="text-white">{b.knightsAssigned} คัน</strong></span>
                  <span className="text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#00D4FF]" />
                    {b.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned Knights at Spot */}
        <div className="p-4 rounded-2xl bg-[#0A1633] border border-[#00D4FF]/25 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white">รายชื่ออัศวินประจำจุดองค์กร</h4>
            <span className="text-[10px] text-emerald-400">พร้อมปฏิบัติการ 6 คัน</span>
          </div>

          <div className="space-y-2 text-xs">
            {['อัศวินสมชาย (วินหน้า รพ.)', 'อัศวินวิชัย (วิน BTS ศาลาแดง)', 'อัศวินเอกชัย (วินสีลม ซอย 2)'].map((k, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white">{k}</span>
                <span className="text-[10px] text-[#00D4FF] font-medium">สแตนด์บาย</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* New Group Booking Modal */}
      {groupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0A1633] border border-[#00D4FF]/40 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">จองรถล่วงหน้าเป็นกลุ่ม (B2B)</h3>
            <div>
              <label className="text-[11px] text-gray-300 block mb-1">เส้นทางรับ-ส่ง</label>
              <input
                type="text"
                value={routeText}
                onChange={(e) => setRouteText(e.target.value)}
                placeholder="เช่น รพ. → สถานีรถไฟฟ้า"
                className="w-full bg-[#0A1633] border border-[#00D4FF]/25 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00D4FF]"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-300 block mb-1">จำนวนผู้โดยสาร (ท่าน)</label>
              <input
                type="number"
                value={passengerCount}
                onChange={(e) => setPassengerCount(Number(e.target.value))}
                className="w-full bg-[#0A1633] border border-[#00D4FF]/25 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00D4FF]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setGroupModal(false)}
                className="flex-1 py-2 rounded-xl border border-white/15 text-gray-400 text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateGroupBooking}
                className="flex-1 py-2 rounded-xl bg-[#00D4FF] text-[#0A1633] font-bold text-xs"
              >
                ยืนยันจัดสรรอัศวิน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
