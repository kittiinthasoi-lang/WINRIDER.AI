import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  X, 
  Send, 
  ShieldCheck, 
  Smartphone, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendBrowserNotification 
} from '../utils/notifications';
import { playTactileBlip, playLevelUpFanfare } from '../utils/audio';

interface PushNotificationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioEnabled?: boolean;
}

export const PushNotificationManagerModal: React.FC<PushNotificationManagerModalProps> = ({
  isOpen,
  onClose,
  audioEnabled = true,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!isOpen) return;
    setPermission(getNotificationPermission());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (audioEnabled) {
      if (granted) playLevelUpFanfare();
      else playTactileBlip(500);
    }
  };

  const handleTestBrowserPush = () => {
    if (permission !== 'granted') {
      handleRequestPermission();
      return;
    }
    sendBrowserNotification('🚨 ทดสอบการแจ้งเตือน WINRIDER.AI', {
      body: 'ระบบ Web Push ทำงานสมบูรณ์! พร้อมรับแจ้งเตือนออเดอร์ใหม่และพิกัดเรียลไทม์',
    });
    if (audioEnabled) playTactileBlip(1000);
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,210,255,0.25)] text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
              REAL-TIME ALERT BROADCASTER
            </div>
            <h3 className="text-lg font-black text-white">
              ระบบแจ้งเตือน Web Push & LINE Notify
            </h3>
          </div>
        </div>

        {/* Section 1: Browser Web Push Notifications */}
        <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Web Push Notification (บนมือถือ/เบราว์เซอร์)</span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                permission === 'granted'
                  ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                  : 'bg-amber-500/20 border border-amber-400 text-amber-300'
              }`}
            >
              {permission === 'granted' ? 'ได้รับอนุญาตแล้ว (Active)' : 'ยังไม่อนุญาต'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            แจ้งเตือนเมื่อมีออเดอร์ใหม่เข้ามา หรือเมื่อพี่วินเดินทางมาถึงจุดรับ แม้ขณะสลับไปเปิดหน้าจออื่น
          </p>

          <div className="flex gap-2">
            {permission !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all active:scale-98 shadow-md"
              >
                กดเพื่อขออนุญาตแจ้งเตือน (Allow Push)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestBrowserPush}
                className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>ทดสอบยิง Push Notification ทันที</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-400/20">
          <div className="text-xs font-bold text-white">LINE / ภายนอก</div>
          <p className="text-[11px] text-slate-400 mt-2">
            Token สำหรับบริการแจ้งเตือนภายนอกถูกเก็บฝั่งเซิร์ฟเวอร์แล้ว เพื่อไม่ให้เปิดเผย credential ในเบราว์เซอร์
          </p>
          <div className="mt-2 text-[10px] text-emerald-300">
            หากตั้งค่า LINE_NOTIFY_TOKEN บนเซิร์ฟเวอร์ ระบบสามารถส่งการแจ้งเตือนอัตโนมัติได้
          </div>
        </div>

        {/* Dispatch Rules Overview */}
        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-400 space-y-1">
          <div className="font-bold text-slate-300 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>เหตุการณ์ที่ระบบจะส่งการแจ้งเตือนอัตโนมัติ:</span>
          </div>
          <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-slate-300 pl-4">
            <div>• ออเดอร์ใหม่เข้าเรดาร์</div>
            <div>• พี่วินกดรับงาน</div>
            <div>• อัศวินถึงจุดนัดพบ</div>
            <div>• ส่งข้อความแชทด่วน</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition-all active:scale-95"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};
