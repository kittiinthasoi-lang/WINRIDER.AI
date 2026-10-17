import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RequestableRole } from '../../types/auth';
import { requestRoleAddition, getMyRoleRequests } from '../../services/registrationService';
import { playTactileBlip } from '../../utils/audio';
import { 
  Bike, 
  Store, 
  Building2, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  X, 
  ChevronRight, 
  Sparkles,
  Send
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: RequestableRole;
}

export const RoleRequestModal: React.FC<Props> = ({ isOpen, onClose, initialRole }) => {
  const { userData, refreshUserData } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RequestableRole>(initialRole || 'knight');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Knight form
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car'>('motorcycle');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Merchant form
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('อาหารตามสั่ง/สตรีทฟู้ด');
  const [shopAddress, setShopAddress] = useState('');
  const [taxId, setTaxId] = useState('');

  // Partner form
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('โรงเรียน/มหาวิทยาลัย');
  const [contactPerson, setContactPerson] = useState('');
  const [estimatedUsers, setEstimatedUsers] = useState<number>(100);

  useEffect(() => {
    if (initialRole) setSelectedRole(initialRole);
  }, [initialRole]);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const list = await getMyRoleRequests();
      setMyRequests(list);
    } catch {
      setMyRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      void fetchRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const enabledRoles: string[] = Array.isArray(userData?.enabledRoles)
    ? userData.enabledRoles
    : [userData?.role || 'citizen'];

  const alreadyHasRole = enabledRoles.includes(selectedRole) || userData?.role === selectedRole;
  const pendingReq = myRequests.find((r) => r.targetRole === selectedRole && r.status === 'pending');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (alreadyHasRole) {
      setError('คุณมีบทบาทนี้ในระบบอยู่แล้ว');
      return;
    }

    if (pendingReq) {
      setError('คุณได้ยื่นคำขอสำหรับบทบาทนี้แล้ว อยู่ระหว่างรอแอดมินอนุมัติ');
      return;
    }

    let details: Record<string, any> = {};

    if (selectedRole === 'knight') {
      if (!plateNumber.trim()) {
        setError('กรุณากรอกหมายเลขทะเบียนรถ (เช่น 1กข 9999 กทม.)');
        return;
      }
      if (!licenseNumber.trim()) {
        setError('กรุณากรอกเลขที่ใบอนุญาตขับขี่');
        return;
      }
      details = {
        vehicleType,
        plateNumber: plateNumber.trim(),
        licenseNumber: licenseNumber.trim(),
      };
    } else if (selectedRole === 'merchant') {
      if (!shopName.trim()) {
        setError('กรุณาระบุชื่อร้านค้า');
        return;
      }
      if (!shopAddress.trim()) {
        setError('กรุณาระบุที่ตั้งร้านค้า');
        return;
      }
      details = {
        shopName: shopName.trim(),
        shopType,
        shopAddress: shopAddress.trim(),
        taxId: taxId.trim(),
      };
    } else if (selectedRole === 'partner') {
      if (!orgName.trim()) {
        setError('กรุณาระบุชื่อองค์กรหรือหน่วยงาน');
        return;
      }
      if (!contactPerson.trim()) {
        setError('กรุณาระบุชื่อผู้ประสานงาน');
        return;
      }
      details = {
        orgName: orgName.trim(),
        orgType,
        contactPerson: contactPerson.trim(),
        estimatedUsers: Number(estimatedUsers) || 100,
      };
    }

    setSubmitting(true);
    playTactileBlip(900);

    try {
      await requestRoleAddition(selectedRole, details);
      setSuccessMsg('ยื่นคำขอเพิ่มบทบาทสำเร็จ! ระบบได้ส่งข้อมูลให้แอดมินตรวจสอบแล้ว');
      playTactileBlip(1000);
      void fetchRequests();
      void refreshUserData();
    } catch (err: any) {
      setError(err?.message || 'ยื่นคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const roleMeta = {
    knight: {
      title: 'พี่วิน / ไรเดอร์',
      desc: 'รับส่งผู้โดยสาร ส่งพัสดุ และช่วยเหลืองานกู้ภัยฉุกเฉิน',
      color: 'border-amber-400/50 bg-amber-500/10 text-amber-300',
      activeColor: 'border-amber-400 bg-amber-500/25 ring-2 ring-amber-400/50',
      icon: Bike,
    },
    merchant: {
      title: 'ร้านค้าพันธมิตร',
      desc: 'เปิดร้านค้า ขายอาหาร เครื่องดื่ม สินค้าชุมชน ในระบบ WIN SHOP',
      color: 'border-pink-400/50 bg-pink-500/10 text-pink-300',
      activeColor: 'border-pink-400 bg-pink-500/25 ring-2 ring-pink-400/50',
      icon: Store,
    },
    partner: {
      title: 'องค์กรพาร์ทเนอร์',
      desc: 'สถานพยาบาล โรงเรียน มหาวิทยาลัย องค์กรเอกชน และหน่วยกู้ภัย',
      color: 'border-purple-400/50 bg-purple-500/10 text-purple-300',
      activeColor: 'border-purple-400 bg-purple-500/25 ring-2 ring-purple-400/50',
      icon: Building2,
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0A1633] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>ROLE EXPANSION SYSTEM</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-thai">
              ขอเพิ่มบทบาทใน WINRIDER
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ผู้ใช้ใหม่ทุกคนเริ่มต้นเป็น <strong className="text-cyan-300">ผู้โดยสาร</strong> หากต้องการเป็นพี่วิน ร้านค้า หรือพาร์ทเนอร์ สามารถยื่นขอเพิ่มบทบาทให้แอดมินอนุมัติได้ที่นี่
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Roles Status */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-400 mb-2 font-mono">บทบาทที่คุณมีในปัจจุบัน:</div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ผู้โดยสาร (Passenger / พลเมือง)
            </span>
            {enabledRoles.includes('knight') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold">
                <Bike className="w-3.5 h-3.5 text-amber-400" />
                พี่วิน (Knight Driver)
              </span>
            )}
            {enabledRoles.includes('merchant') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-500/15 border border-pink-400/40 text-pink-300 text-xs font-bold">
                <Store className="w-3.5 h-3.5 text-pink-400" />
                ร้านค้า (Merchant)
              </span>
            )}
            {enabledRoles.includes('partner') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-400/40 text-purple-300 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                พาร์ทเนอร์ (Partner)
              </span>
            )}
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
            เลือกบทบาทที่ต้องการขอเพิ่ม:
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {(['knight', 'merchant', 'partner'] as RequestableRole[]).map((rKey) => {
              const meta = roleMeta[rKey];
              const Icon = meta.icon;
              const isSelected = selectedRole === rKey;
              const hasRole = enabledRoles.includes(rKey);
              const pending = myRequests.some((r) => r.targetRole === rKey && r.status === 'pending');

              return (
                <button
                  key={rKey}
                  type="button"
                  onClick={() => {
                    setSelectedRole(rKey);
                    setError('');
                    setSuccessMsg('');
                    playTactileBlip(750);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 relative ${
                    isSelected ? meta.activeColor : 'border-white/10 bg-slate-900/40 hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-5 h-5 text-current" />
                    {hasRole && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        มีแล้ว
                      </span>
                    )}
                    {!hasRole && pending && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        รอตรวจ
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold font-thai">{meta.title}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{meta.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Pending Request Banner */}
        {pendingReq && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>คำขอเพิ่มบทบาทนี้อยู่ระหว่างรอแอดมินอนุมัติ</span>
            </div>
            <p className="text-[11px] text-slate-300">
              ยื่นคำขอเมื่อ: {new Date(pendingReq.createdAt).toLocaleString('th-TH')}
            </p>
          </div>
        )}

        {/* Has Role Notice */}
        {alreadyHasRole && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>คุณได้รับสิทธิ์ใช้งานบทบาทนี้เรียบร้อยแล้ว สามารถสลับโหมดใช้งานได้ทันที</span>
          </div>
        )}

        {/* Dynamic Form */}
        {!alreadyHasRole && !pendingReq && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedRole === 'knight' && (
              <div className="space-y-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                <div className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <Bike className="w-4 h-4" />
                  <span>ข้อมูลยานพาหนะและใบขับขี่</span>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">ประเภทยานพาหนะ:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVehicleType('motorcycle')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        vehicleType === 'motorcycle'
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-white/10 bg-black/20 text-slate-400'
                      }`}
                    >
                      🏍️ รถจักรยานยนต์ (มอเตอร์ไซค์)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('car')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        vehicleType === 'car'
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-white/10 bg-black/20 text-slate-400'
                      }`}
                    >
                      🚗 รถยนต์ส่วนบุคคล
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    หมายเลขทะเบียนรถ (เช่น 1กข 9999 กทม.) <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="1กข 9999 กทม."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    เลขที่ใบอนุญาตขับขี่สาธารณะหรือใบขับขี่ <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="เลขที่ใบขับขี่"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {selectedRole === 'merchant' && (
              <div className="space-y-3 p-4 rounded-2xl border border-pink-500/20 bg-pink-500/5">
                <div className="font-bold text-sm text-pink-300 flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>ข้อมูลร้านค้าพันธมิตร</span>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    ชื่อร้านค้า <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="เช่น ข้าวมันไก่เฮียชัย, กาแฟโบราณลุงสม"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">ประเภทร้านค้า:</label>
                  <select
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-400"
                  >
                    <option value="อาหารตามสั่ง/สตรีทฟู้ด">อาหารตามสั่ง / สตรีทฟู้ด</option>
                    <option value="เครื่องดื่ม/คาเฟ่">เครื่องดื่ม / คาเฟ่</option>
                    <option value="ร้านขายของชำ/มินิมาร์ท">ร้านขายของชำ / มินิมาร์ท</option>
                    <option value="เบเกอรี่และของหวาน">เบเกอรี่และของหวาน</option>
                    <option value="สินค้าและบริการทั่วไป">สินค้าและบริการทั่วไป</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    ที่ตั้งร้านค้า <span className="text-red-400">*</span>:
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    เลขประจำตัวผู้เสียภาษี (ถ้ามี):
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="13 หลัก (ไม่บังคับ)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
                  />
                </div>
              </div>
            )}

            {selectedRole === 'partner' && (
              <div className="space-y-3 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
                <div className="font-bold text-sm text-purple-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>ข้อมูลองค์กรหรือหน่วยงาน</span>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    ชื่อองค์กร / หน่วยงาน <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="เช่น มหาวิทยาลัยเกษตรศาสตร์, โรงพยาบาลปิยะเวท"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">ประเภทองค์กร:</label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="โรงเรียน/มหาวิทยาลัย">โรงเรียน / มหาวิทยาลัย</option>
                    <option value="โรงพยาบาล/คลินิก">โรงพยาบาล / คลินิก / ศูนย์แพทย์</option>
                    <option value="มูลนิธิกู้ภัย/บรรเทาสาธารณภัย">มูลนิธิกู้ภัย / บรรเทาสาธารณภัย</option>
                    <option value="อาคารสำนักงาน/คอนโดมิเนียม">อาคารสำนักงาน / คอนโดมิเนียม</option>
                    <option value="หน่วยงานภาครัฐหรือเอกชน">หน่วยงานภาครัฐหรือเอกชน</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    ชื่อผู้ติดต่อ / ผู้ประสานงาน <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="ชื่อ-นามสกุล ผู้ประสานงาน"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    จำนวนบุคลากร/ผู้ใช้งานโดยประมาณ:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={estimatedUsers}
                    onChange={(e) => setEstimatedUsers(Number(e.target.value) || 100)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#00D4FF] via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-600 text-slate-950 font-black text-sm transition-all shadow-[0_0_20px_rgba(0,212,255,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>กำลังส่งคำขอให้แอดมิน...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>ส่งคำขอเพิ่มบทบาท (รอแอดมินอนุมัติ)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* History of Requests */}
        {myRequests.length > 0 && (
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="text-xs font-mono text-slate-400">ประวัติคำขอเพิ่มบทบาทของคุณ:</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-white/10 bg-slate-900/50 p-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    {req.targetRole === 'knight' && <Bike className="w-4 h-4 text-amber-400" />}
                    {req.targetRole === 'merchant' && <Store className="w-4 h-4 text-pink-400" />}
                    {req.targetRole === 'partner' && <Building2 className="w-4 h-4 text-purple-400" />}
                    <div>
                      <div className="font-bold text-white capitalize">
                        {req.targetRole === 'knight' ? 'พี่วิน' : req.targetRole === 'merchant' ? 'ร้านค้า' : 'พาร์ทเนอร์'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : req.status === 'rejected'
                        ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'rejected' ? 'ถูกปฏิเสธ' : 'รอแอดมินอนุมัติ'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
