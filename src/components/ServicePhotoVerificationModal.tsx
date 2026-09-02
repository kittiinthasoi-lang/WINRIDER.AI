import React from 'react';
import { Camera, CheckCircle2, ShieldCheck, MapPin, Clock, User, Phone, Check, Share2, Sparkles } from 'lucide-react';
import { playTactileBlip } from '../utils/audio';

interface ServicePhotoVerificationModalProps {
  type: 'express_delivery' | 'family_arrival';
  serviceName: string;
  driverName: string;
  driverLevel: number;
  recipientOrPassengerName: string;
  locationName: string;
  audioEnabled: boolean;
  onClose: () => void;
}

export const ServicePhotoVerificationModal: React.FC<ServicePhotoVerificationModalProps> = ({
  type,
  serviceName,
  driverName,
  driverLevel,
  recipientOrPassengerName,
  locationName,
  audioEnabled,
  onClose
}) => {
  const isExpress = type === 'express_delivery';
  const currentTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#091224] rounded-3xl border-2 border-cyan-400 p-5 sm:p-6 shadow-[0_0_40px_rgba(0,210,255,0.35)] space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center text-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isExpress ? '📸 ภาพถ่ายยืนยันการส่งพัสดุ (POD)' : '📸 ภาพถ่ายยืนยันส่งถึงที่หมายปลอดภัย'}
              </h3>
              <span className="text-[10px] text-cyan-300 font-mono">
                {isExpress ? 'WIN EXPRESS PROOF OF DELIVERY' : 'WIN FAMILY SAFE ARRIVAL VERIFICATION'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Photo View Box with HUD Overlay */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/50 bg-gradient-to-br from-slate-900 via-[#071120] to-black aspect-[4/3] flex items-center justify-center shadow-inner group">
          {/* Simulated Scene Graphic */}
          <div className="text-center p-4 space-y-2">
            <div className="text-5xl animate-bounce">
              {isExpress ? '📦' : '👵'}
            </div>
            <div className="text-xs font-bold text-white font-mono">
              {isExpress ? 'พัสดุบรรจุภัณฑ์โปร่งใสส่งถึงมือเรียบร้อย' : 'ส่งถึงมือญาติ/เจ้าหน้าที่เรียบร้อยและปลอดภัย'}
            </div>
            <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              ✓ AI Vision Verified: 100% Match
            </span>
          </div>

          {/* HUD Overlay Details */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            <div className="px-2 py-0.5 rounded-lg bg-black/70 border border-white/20 text-[9px] font-mono text-cyan-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE GPS STAMP</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-black/70 border border-white/20 text-[9px] font-mono text-amber-300">
              {currentTime}
            </div>
          </div>

          <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/80 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono text-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[200px]">{locationName}</span>
            </div>
            <span className="text-emerald-400 font-bold">13.7367° N, 100.5610° E</span>
          </div>
        </div>

        {/* Audit Details */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-300">
            <span>ผู้ปฏิบัติการส่ง:</span>
            <span className="font-bold text-white">{driverName} (LV.{driverLevel})</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>{isExpress ? 'ผู้รับมอบพัสดุ:' : 'ผู้โดยสารที่ดูแล:'}</span>
            <span className="font-bold text-cyan-300">{recipientOrPassengerName}</span>
          </div>
          {isExpress && (
            <div className="flex justify-between items-center text-emerald-300">
              <span>มาตรฐานบรรจุภัณฑ์:</span>
              <span className="font-bold">✓ ตรวจสอบความโปร่งใสผ่าน</span>
            </div>
          )}
          {!isExpress && (
            <div className="flex justify-between items-center text-blue-300">
              <span>การส่งแจ้งเตือน:</span>
              <span className="font-bold">✓ ส่ง SMS & รูปถ่ายให้ผู้ปกครองแล้ว</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (audioEnabled) playTactileBlip(800);
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-md transition-all active:scale-98 cursor-pointer"
        >
          รับทราบ & ปิดหน้าต่าง
        </button>

      </div>
    </div>
  );
};
