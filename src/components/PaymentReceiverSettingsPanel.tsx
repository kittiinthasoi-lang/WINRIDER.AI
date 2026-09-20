import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Ban, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Save, 
  Loader2, 
  Smartphone, 
  CreditCard, 
  Building2, 
  Wallet,
  Landmark,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { auth } from '../firebase';
import { generateBankAccountQRDataUrl } from '../utils/promptpay';
import { 
  getPaymentProfile, 
  savePaymentProfile, 
  uploadBankQrImage, 
  generateDynamicPromptPayQR,
  PaymentProfile, 
  PaymentReceiverType, 
  PaymentProfileStatus 
} from '../services/paymentProfileService';
import { playTactileBlip, playLevelUpFanfare } from '../utils/audio';

interface PaymentReceiverSettingsPanelProps {
  userId?: string;
  role?: 'knight' | 'citizen' | 'merchant' | 'partner';
  defaultName?: string;
  audioEnabled?: boolean;
  onClose?: () => void;
  onSaved?: (profile: PaymentProfile) => void;
}

export const PaymentReceiverSettingsPanel: React.FC<PaymentReceiverSettingsPanelProps> = ({
  userId,
  role = 'citizen',
  defaultName = '',
  audioEnabled = true,
  onClose,
  onSaved
}) => {
  const currentUid = userId || auth.currentUser?.uid || 'guest_user';
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingQr, setUploadingQr] = useState<boolean>(false);

  const [accountName, setAccountName] = useState<string>(defaultName);
  const [receiverType, setReceiverType] = useState<PaymentReceiverType>('citizen_phone');
  const [promptPayId, setPromptPayId] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [bankSlipQrUrl, setBankSlipQrUrl] = useState<string | null>(null);

  const [existingProfile, setExistingProfile] = useState<PaymentProfile | null>(null);
  const [previewQr, setPreviewQr] = useState<string>('');
  const [testAmount, setTestAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'info' | 'preview'>('info');

  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load existing profile
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const p = await getPaymentProfile(currentUid);
        if (isMounted && p) {
          setExistingProfile(p);
          setAccountName(p.accountName);
          setReceiverType(p.receiverType);
          setPromptPayId(p.promptPayId);
          setBankName(p.bankName || '');
          setBankSlipQrUrl(p.bankSlipQrUrl || null);
          if (p.qrCodeDataUrl) {
            setPreviewQr(p.qrCodeDataUrl);
          }
        } else if (isMounted && defaultName) {
          setAccountName(defaultName);
        }
      } catch (err) {
        console.warn('Error loading payment profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [currentUid, defaultName]);

  // Real-time dynamic QR generation when PromptPay ID / bank account or test amount changes
  useEffect(() => {
    const clean = promptPayId.replace(/[^0-9]/g, '');

    if (receiverType === 'bank_account') {
      if (clean.length >= 10 && clean.length <= 15 && bankName.trim() && accountName.trim()) {
        generateBankAccountQRDataUrl({
          bankName: bankName.trim(),
          accountNumber: clean,
          accountName: accountName.trim(),
        })
          .then(dataUrl => setPreviewQr(dataUrl))
          .catch(() => {});
      } else {
        setPreviewQr('');
      }
      return;
    }

    if (clean.length >= 9) {
      generateDynamicPromptPayQR(clean, testAmount > 0 ? testAmount : undefined)
        .then(dataUrl => setPreviewQr(dataUrl))
        .catch(() => {});
    } else {
      setPreviewQr('');
    }
  }, [promptPayId, testAmount, receiverType, bankName, accountName]);

  const handleFileUpload = async (file?: File) => {
    if (!file) return;
    setUploadingQr(true);
    setErrorMessage('');
    try {
      if (audioEnabled) playTactileBlip(800);
      const url = await uploadBankQrImage(file, currentUid);
      setBankSlipQrUrl(url);
      setStatusMessage('อัปโหลดรูป QR จากแอปธนาคารสำเร็จเรียบร้อย');
    } catch (err: any) {
      setErrorMessage(err?.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    if (!accountName.trim()) {
      setErrorMessage('กรุณาระบุชื่อบัญชีให้ถูกต้อง');
      return;
    }
    const cleanId = promptPayId.replace(/[^0-9]/g, '');

    if (receiverType === 'bank_account') {
      if (!cleanId || cleanId.length < 10 || cleanId.length > 15) {
        setErrorMessage('กรุณากรอกเลขบัญชีธนาคารให้ถูกต้อง (10-15 หลัก)');
        return;
      }
      if (!bankName.trim()) {
        setErrorMessage('กรุณาระบุชื่อธนาคาร');
        return;
      }
    } else {
      if (!cleanId || cleanId.length < 9) {
        setErrorMessage('กรุณากรอกหมายเลข PromptPay ให้ถูกต้อง (เบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก)');
        return;
      }
    }

    setSaving(true);
    try {
      if (audioEnabled) playTactileBlip(950);
      const saved = await savePaymentProfile({
        userId: currentUid,
        role: role as 'knight' | 'citizen' | 'merchant' | 'partner',
        accountName: accountName.trim(),
        receiverType,
        promptPayId: cleanId,
        bankName: bankName.trim(),
        bankSlipQrUrl
      });

      setExistingProfile(saved);
      if (saved.qrCodeDataUrl) setPreviewQr(saved.qrCodeDataUrl);
      setStatusMessage('บันทึกข้อมูลเรียบร้อยแล้ว สถานะถูกตั้งเป็น "รอตรวจสอบ" อัตโนมัติ เพื่อให้ Super Admin ตรวจสอบก่อนเปิดแสดง QR');
      
      if (audioEnabled) playLevelUpFanfare();
      if (onSaved) onSaved(saved);
    } catch (err: any) {
      setErrorMessage(err?.message || 'บันทึกข้อมูลช่องทางรับเงินไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status?: PaymentProfileStatus) => {
    switch (status) {
      case 'verified':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ยืนยันแล้ว (พร้อมรับเงินจริง)</span>
          </div>
        );
      case 'needs_correction':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>ต้องแก้ไขข้อมูล</span>
          </div>
        );
      case 'suspended':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold">
            <Ban className="w-3.5 h-3.5 text-rose-400" />
            <span>ระงับการใช้งาน</span>
          </div>
        );
      case 'pending_review':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>รอตรวจสอบโดย Super Admin</span>
          </div>
        );
    }
  };

  const roleLabel = {
    knight: 'พี่วินอัศวิน (Knight)',
    citizen: 'ลูกค้า / พลเมือง (Citizen)',
    merchant: 'ร้านค้า (Merchant)',
    partner: 'พาร์ทเนอร์ (Partner)'
  }[role];

  return (
    <div className="rounded-3xl border border-cyan-400/40 bg-gradient-to-b from-[#0B152A] via-[#060D1E] to-[#030712] p-4 sm:p-6 text-white shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(0,210,255,0.4)]">
            <QrCode className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">ตั้งค่าช่องทางรับเงินจริง (PromptPay)</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 font-mono font-bold">
                0% GP Direct P2P
              </span>
            </div>
            <p className="text-xs text-slate-400">
              สำหรับ {roleLabel} • รับเงินตรงเข้าบัญชีคุณ ไร้ตัวกลาง
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Current Status Card */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] text-slate-400 font-mono">สถานะช่องทางรับเงินปัจจุบัน:</div>
          <div>{statusBadge(existingProfile?.status)}</div>
        </div>

        {existingProfile?.reviewNotes && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 max-w-sm">
            <div className="font-bold flex items-center gap-1 text-amber-300">
              <AlertCircle className="w-3.5 h-3.5" /> หมายเหตุจาก Super Admin:
            </div>
            <div className="mt-0.5">{existingProfile.reviewNotes}</div>
          </div>
        )}
      </div>

      {/* Notification banner */}
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 text-xs text-cyan-200/90 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">นโยบายความปลอดภัย & กฎเหล็กของระบบ:</p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            • เมื่อท่านบันทึกหรือแก้ไขข้อมูล ระบบจะปรับสถานะกลับเป็น <strong className="text-amber-300">"รอตรวจสอบ"</strong> โดยอัตโนมัติ<br/>
            • Super Admin จะต้องตรวจสอบความถูกต้องของชื่อบัญชีและหมายเลข PromptPay ก่อนจึงจะเปิดแสดง QR ให้ผู้โดยสารหรือลูกค้าสแกนได้<br/>
            • หากยังไม่ได้รับการอนุมัติ ระบบจะไม่แสดง QR จำลองหรือสร้าง QR ทดแทนโดยเด็ดขาด
          </p>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Account Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span>ชื่อบัญชี / ชื่อผู้รับเงิน (ภาษาไทย หรือ อังกฤษตรงตามบัญชีธนาคาร) *</span>
            <span className="text-[10px] text-slate-400">ต้องตรงกับชื่อเจ้าของบัญชี</span>
          </label>
          <input
            type="text"
            required
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="เช่น นายกิตติ อินทะสร้อย หรือ ร้านกาแฟอัศวิน"
            className="w-full rounded-xl border border-white/20 bg-slate-900/80 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* Receiver Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200">ประเภทหมายเลข PromptPay *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'citizen_phone' as const, label: 'เบอร์มือถือ', sub: '10 หลัก', icon: Smartphone },
              { id: 'national_id' as const, label: 'เลขบัตร ปชช.', sub: '13 หลัก', icon: CreditCard },
              { id: 'merchant_tax_id' as const, label: 'เลขนิติบุคคล/ภาษี', sub: '13 หลัก', icon: Building2 },
              { id: 'e_wallet' as const, label: 'e-Wallet ID', sub: '15 หลัก', icon: Wallet },
              { id: 'bank_account' as const, label: 'บัญชีธนาคาร', sub: 'เลขบัญชี', icon: Landmark },
            ].map(({ id, label, sub, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (audioEnabled) playTactileBlip(800);
                  setReceiverType(id);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  receiverType === id
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                    : 'border-white/10 bg-black/30 text-slate-400 hover:border-white/20'
                }`}
              >
                <Icon className="w-4 h-4 mb-1 text-cyan-300" />
                <div className="text-xs font-bold">{label}</div>
                <div className="text-[10px] text-slate-400">{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* PromptPay ID / Bank Account Number Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span>{receiverType === 'bank_account' ? 'เลขบัญชีธนาคาร *' : 'หมายเลข PromptPay *'}</span>
            <span className="text-[10px] text-cyan-300 font-mono">
              {receiverType === 'bank_account' ? 'ระบุตัวเลข 10-15 หลัก' :
               receiverType === 'citizen_phone' ? 'ระบุเบอร์โทร เช่น 0812345678' : 'ระบุตัวเลขเท่านั้น'}
            </span>
          </label>
          <input
            type="text"
            required
            value={promptPayId}
            onChange={(e) => setPromptPayId(e.target.value)}
            placeholder={
              receiverType === 'bank_account' ? 'เช่น 1234567890' :
              receiverType === 'citizen_phone' ? '08XXXXXXXX' : 
              receiverType === 'national_id' ? '1XXXXXXXXXXXX' : 
              receiverType === 'merchant_tax_id' ? '0XXXXXXXXXXXX' : '15 หลัก e-Wallet'
            }
            className="w-full rounded-xl border border-white/20 bg-slate-900/80 p-3 text-sm font-mono text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* Bank Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200">
            {receiverType === 'bank_account' ? 'ธนาคารเจ้าของบัญชี *' : 'ธนาคารเจ้าของบัญชี (ระบุเพื่อความชัดเจน)'}
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="เช่น กสิกรไทย, ไทยพาณิชย์, กรุงไทย, กรุงเทพ, ออมสิน"
            className="w-full rounded-xl border border-white/20 bg-slate-900/80 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* Real-time EMVCo PromptPay Preview & Bank Slip Upload Box */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          {/* Box 1: Auto-generated QR (PromptPay EMVCo or Bank Account info) */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col items-center justify-between text-center space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-cyan-300 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>{receiverType === 'bank_account' ? 'QR ข้อมูลบัญชีธนาคาร' : 'QR พร้อมเพย์มาตรฐาน EMVCo'}</span>
              </span>
              <p className="text-[10px] text-slate-400">
                {receiverType === 'bank_account'
                  ? 'สแกนแล้วแสดงชื่อธนาคาร/เลขบัญชี/ชื่อบัญชี (ไม่ใช่ QR โอนเงินอัตโนมัติ)'
                  : 'สร้างแบบเรียลไทม์ตามมาตรฐานธนาคารแห่งประเทศไทย'}
              </p>
            </div>

            {previewQr ? (
              <div className="p-2.5 rounded-2xl bg-white shadow-xl">
                <img src={previewQr} alt="QR ช่องทางรับเงิน" className="w-40 h-40 object-contain mx-auto" />
                <div className="text-[9px] text-slate-800 font-mono font-bold mt-1">
                  {receiverType === 'bank_account' ? 'BANK ACCOUNT INFO' : 'THAI QR PAYMENT'}
                </div>
              </div>
            ) : (
              <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center p-3 text-slate-500 text-xs">
                <QrCode className="w-8 h-8 mb-2 opacity-40" />
                <span>
                  {receiverType === 'bank_account'
                    ? 'กรอกชื่อบัญชี ธนาคาร และเลขบัญชีเพื่อสร้าง QR'
                    : 'กรอกหมายเลขพร้อมเพย์เพื่อสร้าง QR จริง'}
                </span>
              </div>
            )}

            {/* Test dynamic amount (PromptPay only) */}
            {previewQr && receiverType !== 'bank_account' && (
              <div className="w-full pt-2 border-t border-white/10 space-y-1">
                <label className="text-[10px] text-slate-400 block">ทดสอบสร้าง QR ระบุยอดเงินจริง:</label>
                <div className="flex items-center gap-1 justify-center">
                  {[0, 35, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTestAmount(amt)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                        testAmount === amt 
                          ? 'bg-cyan-400 text-slate-950 border-cyan-300' 
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {amt === 0 ? 'อิสระ' : `฿${amt}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Box 2: Upload QR from Banking App */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col items-center justify-between text-center space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                <span>รูป QR จากแอปธนาคาร (ทางเลือกเสริม)</span>
              </span>
              <p className="text-[10px] text-slate-400">บันทึกรูป QR จาก K PLUS, SCB EASY, Krungthai NEXT ฯลฯ</p>
            </div>

            {bankSlipQrUrl ? (
              <div className="relative group">
                <div className="p-2 rounded-2xl bg-white shadow-xl">
                  <img src={bankSlipQrUrl} alt="รูป QR จากธนาคาร" className="w-40 h-40 object-contain mx-auto rounded-lg" />
                </div>
                <button
                  type="button"
                  onClick={() => setBankSlipQrUrl(null)}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-500"
                  title="ลบรูปภาพ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="w-40 h-40 rounded-2xl border-2 border-dashed border-amber-400/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 flex flex-col items-center justify-center p-3 text-amber-200 cursor-pointer transition-all">
                {uploadingQr ? (
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-2" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mb-2 text-amber-400" />
                    <span className="text-[11px] font-bold">อัปโหลดรูป QR ธนาคาร</span>
                    <span className="text-[9px] text-slate-400 mt-1">JPG / PNG / WEBP (สูงสุด 5MB)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingQr}
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
              </label>
            )}

            <div className="text-[10px] text-slate-400">
              {bankSlipQrUrl ? '✓ แนบรูป QR ธนาคารเรียบร้อยแล้ว' : 'หากไม่อัปโหลด ระบบจะใช้ QR ด้านซ้ายที่สร้างอัตโนมัติ'}
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="submit"
            disabled={saving || uploadingQr}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.4)] disabled:opacity-50 active:scale-98"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกและสร้าง QR จริง...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกข้อมูลรับเงิน (ส่งให้ Super Admin ตรวจสอบ)</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-colors"
            >
              ปิด
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
