import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Sparkles, 
  Palette, 
  Check, 
  X, 
  Image as ImageIcon, 
  Upload, 
  RotateCcw,
  Sliders,
  Type
} from 'lucide-react';
import { playTactileBlip, playLevelUpFanfare } from '../utils/audio';
import confetti from 'canvas-confetti';

export interface ProfileCustomizationData {
  avatarUrl?: string;
  avatarEmoji?: string;
  displayName: string;
  bioStatus: string;
  themeColor: string; // e.g. '#00D2FF', '#FFD700', '#EC4899', '#10B981', '#8B5CF6'
  bannerGlow: string;
}

interface ProfileCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: ProfileCustomizationData;
  role: 'customer' | 'driver' | 'merchant' | 'partner';
  onSave: (newData: ProfileCustomizationData) => void;
  audioEnabled?: boolean;
}

const PRESET_THEME_COLORS = [
  { label: 'Cyber Neon Blue', hex: '#00D2FF', border: 'border-cyan-400', shadow: 'shadow-cyan-500/50' },
  { label: 'Sovereign Gold', hex: '#FFD700', border: 'border-amber-400', shadow: 'shadow-amber-500/50' },
  { label: 'Emerald Health', hex: '#10B981', border: 'border-emerald-400', shadow: 'shadow-emerald-500/50' },
  { label: 'Neon Pink', hex: '#EC4899', border: 'border-pink-400', shadow: 'shadow-pink-500/50' },
  { label: 'Galactic Purple', hex: '#8B5CF6', border: 'border-purple-400', shadow: 'shadow-purple-500/50' },
  { label: 'Solar Orange', hex: '#F97316', border: 'border-orange-400', shadow: 'shadow-orange-500/50' },
];

const PRESET_AVATARS: Record<string, string[]> = {
  customer: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  ],
  driver: [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  ],
  merchant: [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80',
  ],
  partner: [
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=200&auto=format&fit=crop&q=80',
  ]
};

export const ProfileCustomizerModal: React.FC<ProfileCustomizerModalProps> = ({
  isOpen,
  onClose,
  currentData,
  role,
  onSave,
  audioEnabled = true
}) => {
  const [displayName, setDisplayName] = useState(currentData.displayName);
  const [bioStatus, setBioStatus] = useState(currentData.bioStatus || 'พร้อมเดินทางสู่ความสำเร็จ');
  const [themeColor, setThemeColor] = useState(currentData.themeColor || '#00D2FF');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentData.avatarUrl);
  const [avatarEmoji, setAvatarEmoji] = useState(currentData.avatarEmoji || '🦥');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('ขนาดไฟล์ใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setAvatarUrl(result);
        if (audioEnabled) playTactileBlip(950);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (audioEnabled) playLevelUpFanfare();
    confetti({ particleCount: 50, spread: 60, colors: [themeColor, '#FFD700', '#FFFFFF'] });
    onSave({
      displayName: displayName.trim() || currentData.displayName,
      bioStatus: bioStatus.trim(),
      themeColor,
      avatarUrl,
      avatarEmoji,
      bannerGlow: `0 0 25px ${themeColor}40`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0B152B] via-[#070D1E] to-black border-2 border-cyan-500/40 rounded-3xl shadow-[0_0_40px_rgba(0,210,255,0.3)] text-slate-100 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-950 font-bold shadow-md"
              style={{ backgroundColor: themeColor }}
            >
              <Palette className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>ตกแต่ง & ปรับแต่งโปรไฟล์</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-400/40 uppercase">
                  {role}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">เปลี่ยนรูปประจำตัว สเตตัส และธีมสีนีออน</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Live Preview Card */}
          <div 
            className="p-4 rounded-2xl border transition-all relative overflow-hidden"
            style={{ 
              borderColor: `${themeColor}80`,
              background: `linear-gradient(135deg, ${themeColor}15 0%, rgba(7,13,30,0.9) 100%)`,
              boxShadow: `0 0 20px ${themeColor}25`
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div 
                  className="w-16 h-16 rounded-2xl overflow-hidden border-2 p-0.5 flex items-center justify-center bg-black/60 shadow-lg"
                  style={{ borderColor: themeColor }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-3xl">{avatarEmoji}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md cursor-pointer transition-transform active:scale-95"
                  title="อัปโหลดรูปภาพใหม่"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-black text-white truncate">{displayName || 'ชื่อของคุณ'}</h4>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: themeColor }} />
                </div>
                <p className="text-[11px] text-slate-300 italic truncate mt-0.5">"{bioStatus || 'ไม่มีคำคม'}"</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span 
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border"
                    style={{ 
                      backgroundColor: `${themeColor}20`, 
                      color: themeColor,
                      borderColor: `${themeColor}60`
                    }}
                  >
                    ธีมที่เลือกใช้งาน
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />

          {/* Avatar Options: Upload or Preset */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-cyan-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>รูปโปรไฟล์:</span>
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>+ เลือกไฟล์รูปจากเครื่อง (PNG/JPG)</span>
              </button>
            </label>

            {/* Presets Grid */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setAvatarUrl(undefined)}
                className={`p-2 rounded-xl border flex items-center gap-1 flex-shrink-0 transition-all ${
                  !avatarUrl ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold' : 'border-white/10 bg-black/40 text-slate-400'
                }`}
              >
                <span className="text-base">{avatarEmoji}</span>
                <span className="text-[10px]">ใช้อิโมจิตัวแทน</span>
              </button>

              {(PRESET_AVATARS[role] || PRESET_AVATARS.customer).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(850);
                    setAvatarUrl(preset);
                  }}
                  className={`w-10 h-10 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    avatarUrl === preset ? 'border-cyan-400 scale-105 shadow-[0_0_10px_#00D2FF]' : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt={`preset-${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Name & Bio Input */}
          <div className="space-y-3 font-mono">
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">
                ชื่อที่ต้องการแสดงผล (Display Name):
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="กรอกชื่อของคุณ"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-cyan-400 text-white text-xs font-sans outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">
                ข้อความสถานะ / สโลแกนประจำตัว (Bio Status):
              </label>
              <input
                type="text"
                value={bioStatus}
                onChange={(e) => setBioStatus(e.target.value)}
                placeholder="เช่น ผู้เดินทางที่รักความเร็ว, ส่งไวถึงที่หมายปลอดภัย"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-cyan-400 text-white text-xs font-sans outline-none transition-colors"
              />
            </div>
          </div>

          {/* Theme Color Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>เลือกโทนสีนีออนประจำโปรไฟล์:</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRESET_THEME_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => {
                    if (audioEnabled) playTactileBlip(800);
                    setThemeColor(color.hex);
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    themeColor === color.hex 
                      ? 'border-white bg-white/15 scale-105 shadow-md' 
                      : 'border-white/10 bg-black/40 hover:bg-white/5 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div 
                    className="w-6 h-6 rounded-full border border-white/30"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-[9px] text-slate-300 truncate w-full text-center">
                    {color.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
            style={{ backgroundColor: themeColor }}
          >
            <Check className="w-4 h-4 text-slate-950" />
            <span>บันทึกโปรไฟล์</span>
          </button>
        </div>
      </div>
    </div>
  );
};
