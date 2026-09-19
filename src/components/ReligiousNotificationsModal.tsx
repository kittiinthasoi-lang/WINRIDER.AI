import React, { useEffect, useMemo, useState } from 'react';
import {
  Flower2,
  X,
  BellRing,
  Clock3,
  CalendarDays,
  Settings2,
  Check,
  MapPin,
  Loader2,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendBrowserNotification,
} from '../utils/notifications';

type FaithId =
  | 'all'
  | 'buddhism'
  | 'islam'
  | 'christianity'
  | 'hinduism'
  | 'judaism'
  | 'sikhism'
  | 'jainism'
  | 'bahai'
  | 'shinto'
  | 'taoism'
  | 'zoroastrianism'
  | 'other';

type NotificationKind =
  | 'prayer'
  | 'holy_days'
  | 'fasting'
  | 'weekly_observance'
  | 'religious_events';

interface ReligiousNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioEnabled?: boolean;
}

const FAITHS: Array<{ id: FaithId; label: string; emoji: string }> = [
  { id: 'all', label: 'ทุกศาสนา / ทุกความเชื่อ', emoji: '🌍' },
  { id: 'buddhism', label: 'พุทธ', emoji: '☸️' },
  { id: 'islam', label: 'อิสลาม', emoji: '☪️' },
  { id: 'christianity', label: 'คริสต์', emoji: '✝️' },
  { id: 'hinduism', label: 'ฮินดู', emoji: '🕉️' },
  { id: 'judaism', label: 'ยิว', emoji: '✡️' },
  { id: 'sikhism', label: 'ซิกข์', emoji: '🪯' },
  { id: 'jainism', label: 'เชน', emoji: '🪷' },
  { id: 'bahai', label: 'บาไฮ', emoji: '✨' },
  { id: 'shinto', label: 'ชินโต', emoji: '⛩️' },
  { id: 'taoism', label: 'เต๋า', emoji: '☯️' },
  { id: 'zoroastrianism', label: 'โซโรอัสเตอร์', emoji: '🔥' },
  { id: 'other', label: 'ความเชื่อ / ศาสนาอื่น ๆ', emoji: '🕊️' },
];

const NOTIFICATION_KINDS: Array<{ id: NotificationKind; label: string; description: string }> = [
  { id: 'prayer', label: 'เวลาสวดมนต์ / เวลาละหมาด', description: 'รองรับเวลาละหมาดตามสถานที่จริง และขยายไปยังเวลาปฏิบัติของแต่ละศาสนา' },
  { id: 'holy_days', label: 'วันสำคัญ / วันศักดิ์สิทธิ์', description: 'เทศกาล วันศักดิ์สิทธิ์ และวันสำคัญของศาสนาที่เลือก' },
  { id: 'fasting', label: 'วันถือศีลอด / ช่วงอดอาหาร', description: 'แจ้งเตือนช่วงเริ่ม–สิ้นสุดการถือศีลอดเมื่อมีข้อมูลจากปฏิทินที่รองรับ' },
  { id: 'weekly_observance', label: 'วันปฏิบัติประจำสัปดาห์', description: 'เช่น วันประกอบศาสนกิจหรือวันศักดิ์สิทธิ์ประจำสัปดาห์' },
  { id: 'religious_events', label: 'กิจกรรมและเหตุการณ์ทางศาสนา', description: 'กิจกรรมชุมชน ศาสนพิธี และเหตุการณ์ที่มาจากแหล่งข้อมูลที่เชื่อถือได้' },
];

interface PrayerTimesResponse {
  data?: {
    timings?: Record<string, string>;
  };
}

const STORAGE_KEY = 'winrider_religious_notification_preferences';

const DEFAULT_KINDS: NotificationKind[] = [
  'prayer',
  'holy_days',
  'fasting',
  'weekly_observance',
  'religious_events',
];

export const ReligiousNotificationsModal: React.FC<ReligiousNotificationsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [faiths, setFaiths] = useState<FaithId[]>(['all']);
  const [kinds, setKinds] = useState<NotificationKind[]>(DEFAULT_KINDS);
  const [city, setCity] = useState('Bangkok');
  const [country, setCountry] = useState('Thailand');
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string>>({});
  const [loadingPrayer, setLoadingPrayer] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState('รอเชื่อมต่อปฏิทินศาสนาหลายศาสนา');

  useEffect(() => {
    if (!isOpen) return;
    setPermission(getNotificationPermission());

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) {
        if (Array.isArray(saved.faiths)) setFaiths(saved.faiths);
        if (Array.isArray(saved.kinds)) setKinds(saved.kinds);
        if (typeof saved.city === 'string') setCity(saved.city);
        if (typeof saved.country === 'string') setCountry(saved.country);
      }
    } catch {
      // Ignore malformed local preferences.
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ faiths, kinds, city, country }));
  }, [isOpen, faiths, kinds, city, country]);

  useEffect(() => {
    if (!isOpen || !kinds.includes('prayer') || !faiths.includes('all') && !faiths.includes('islam')) {
      setPrayerTimes({});
      return;
    }

    const controller = new AbortController();
    const loadPrayerTimes = async () => {
      setLoadingPrayer(true);
      try {
        const response = await fetch(
          `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=4`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Prayer API unavailable');
        const json = (await response.json()) as PrayerTimesResponse;
        setPrayerTimes(json.data?.timings || {});
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setPrayerTimes({});
        }
      } finally {
        setLoadingPrayer(false);
      }
    };

    void loadPrayerTimes();
    return () => controller.abort();
  }, [isOpen, faiths, kinds, city, country]);

  const prayerEntries = useMemo(
    () => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
      .filter((key) => prayerTimes[key])
      .map((key) => ({ key, value: prayerTimes[key] })),
    [prayerTimes]
  );

  const toggleFaith = (faith: FaithId) => {
    if (faith === 'all') {
      setFaiths(['all']);
      return;
    }
    setFaiths((current) => {
      const next = current.filter((id) => id !== 'all');
      return next.includes(faith)
        ? next.filter((id) => id !== faith)
        : [...next, faith];
    });
  };

  const toggleKind = (kind: NotificationKind) => {
    setKinds((current) => current.includes(kind)
      ? current.filter((id) => id !== kind)
      : [...current, kind]);
  };

  const enablePush = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
  };

  const testNotification = () => {
    sendBrowserNotification('🪷 WINRIDER.AI • ศูนย์แจ้งเตือนศาสนา', {
      body: 'ระบบพร้อมแจ้งเตือนศาสนา วันสำคัญ และเวลาละหมาดตามการตั้งค่าของคุณ',
      tag: 'religious-notification-test',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-300/25 bg-gradient-to-b from-[#101A35] via-[#090F22] to-black text-slate-100 shadow-[0_0_60px_rgba(255,215,0,0.14)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          aria-label="ปิดศูนย์แจ้งเตือนศาสนา"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-7 border-b border-white/10">
          <div className="flex items-center gap-3 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-300/10 border border-amber-300/30 flex items-center justify-center text-amber-200">
              <Flower2 className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.18em] font-black text-amber-300 uppercase">
                FAITH & SACRED CALENDAR
              </div>
              <h2 className="text-xl sm:text-2xl font-black">ศูนย์แจ้งเตือนศาสนาและวันสำคัญ</h2>
              <p className="text-xs text-slate-400 mt-1">
                เคารพทุกศาสนา ทุกความเชื่อ และให้ผู้ใช้เลือกสิ่งที่ต้องการรับแจ้งเตือนด้วยตนเอง
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="font-black text-white">เปิดการแจ้งเตือน</div>
                <div className="text-[11px] text-slate-400">
                  {permission === 'granted' ? 'อนุญาตแล้ว' : 'ต้องอนุญาตจากเบราว์เซอร์ก่อน'}
                </div>
              </div>
              {permission === 'granted' ? (
                <button
                  type="button"
                  onClick={testNotification}
                  className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold"
                >
                  ทดสอบแจ้งเตือน
                </button>
              ) : (
                <button
                  type="button"
                  onClick={enablePush}
                  className="px-3 py-2 rounded-xl bg-amber-300 text-slate-950 text-xs font-black"
                >
                  อนุญาตการแจ้งเตือน
                </button>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-amber-300" />
              <h3 className="font-black">ศาสนา / ความเชื่อที่ต้องการติดตาม</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FAITHS.map((faith) => {
                const selected = faiths.includes(faith.id);
                return (
                  <button
                    key={faith.id}
                    type="button"
                    onClick={() => toggleFaith(faith.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${
                      selected
                        ? 'border-amber-300/50 bg-amber-300/10 text-amber-100'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base">{faith.emoji}</span>
                    <span className="flex-1">{faith.label}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <BellRing className="w-4 h-4 text-cyan-300" />
              <h3 className="font-black">ประเภทการแจ้งเตือน</h3>
            </div>
            <div className="space-y-2">
              {NOTIFICATION_KINDS.map((kind) => {
                const selected = kinds.includes(kind.id);
                return (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => toggleKind(kind.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left ${
                      selected ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selected ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-slate-500'
                    }`}>
                      {selected ? <Check className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white">{kind.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{kind.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {kinds.includes('prayer') && (faiths.includes('all') || faiths.includes('islam')) && (
            <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock3 className="w-4 h-4 text-emerald-300" />
                <h3 className="font-black">เวลาละหมาดจากข้อมูลตามสถานที่จริง</h3>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <label className="text-[10px] text-slate-400">
                  เมือง
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-white"
                  />
                </label>
                <label className="text-[10px] text-slate-400">
                  ประเทศ
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-white"
                  />
                </label>
              </div>

              {loadingPrayer ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดเวลาละหมาด...
                </div>
              ) : prayerEntries.length > 0 ? (
                <div className="grid grid-cols-5 gap-1.5">
                  {prayerEntries.map((prayer) => (
                    <div key={prayer.key} className="rounded-xl bg-black/25 border border-white/10 p-2 text-center">
                      <div className="text-[9px] text-slate-500">{prayer.key}</div>
                      <div className="text-xs font-black text-emerald-300 mt-1">{prayer.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500">
                  ยังโหลดข้อมูลไม่ได้ กรุณาตรวจสอบเมือง/ประเทศหรือการเชื่อมต่ออินเทอร์เน็ต
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-violet-300" />
              <h3 className="font-black">ปฏิทินวันสำคัญหลายศาสนา</h3>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-slate-400">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-violet-300" />
              <span>
                {calendarStatus}. ระบบนี้ออกแบบให้ใช้แหล่งข้อมูลปฏิทินที่ระบุศาสนาและภูมิภาค
                เพื่อหลีกเลี่ยงการเดาวันสำคัญจากข้อมูลคงที่ เพราะบางวันขึ้นกับนิกาย ปฏิทินจันทรคติ
                และท้องถิ่น
              </span>
            </div>
          </section>

          <div className="text-[10px] text-slate-500 border-t border-white/10 pt-4">
            หมายเหตุ: การแจ้งเตือนเบราว์เซอร์ทำงานตามสิทธิ์ของอุปกรณ์ และการแจ้งเตือนแบบพื้นหลังที่แม่นยำ
            ต้องมี service worker/แหล่งข้อมูลปฏิทินที่เชื่อถือได้และกำหนดตารางเวลาตามเขตเวลาของผู้ใช้
          </div>
        </div>
      </div>
    </div>
  );
};
