import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarDays, Check, Clock3, Loader2, MapPin, Settings2, X } from 'lucide-react';
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

type NotificationKind = 'prayer' | 'holy_days' | 'observance' | 'fasting' | 'religious_events';

interface ReligiousNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SavedPreferences {
  faiths: FaithId[];
  kinds: NotificationKind[];
  city: string;
  country: string;
}

interface PrayerTimesResponse {
  data?: { timings?: Record<string, string> };
}

const STORAGE_KEY = 'winrider_faith_sacred_calendar_preferences';

const FAITHS: Array<{ id: FaithId; label: string; symbol: string }> = [
  { id: 'all', label: 'ทุกศาสนา', symbol: '🌍' },
  { id: 'buddhism', label: 'พุทธ', symbol: '☸️' },
  { id: 'islam', label: 'อิสลาม', symbol: '☪️' },
  { id: 'christianity', label: 'คริสต์', symbol: '✝️' },
  { id: 'hinduism', label: 'ฮินดู', symbol: '🕉️' },
  { id: 'judaism', label: 'ยิว', symbol: '✡️' },
  { id: 'sikhism', label: 'ซิกข์', symbol: '🪯' },
  { id: 'jainism', label: 'เชน', symbol: '🪷' },
  { id: 'bahai', label: 'บาไฮ', symbol: '✨' },
  { id: 'shinto', label: 'ชินโต', symbol: '⛩️' },
  { id: 'taoism', label: 'เต๋า', symbol: '☯️' },
  { id: 'zoroastrianism', label: 'โซโรอัสเตอร์', symbol: '🔥' },
  { id: 'other', label: 'ศาสนา/ความเชื่ออื่น ๆ', symbol: '🕊️' },
];

const NOTIFICATION_KINDS: Array<{ id: NotificationKind; label: string; description: string; symbol: string }> = [
  { id: 'prayer', label: 'เวลาละหมาด / เวลาปฏิบัติศาสนกิจ', description: 'แสดงเวลาละหมาดตามเมืองและประเทศจริง', symbol: '🕌' },
  { id: 'holy_days', label: 'วันสำคัญ / วันศักดิ์สิทธิ์', description: 'วันพระ เทศกาล และวันสำคัญของศาสนาที่เลือก', symbol: '📅' },
  { id: 'observance', label: 'วันปฏิบัติทางศาสนา', description: 'กิจวัตร พิธี และวันประกอบศาสนกิจ', symbol: '🙏' },
  { id: 'fasting', label: 'ช่วงถือศีลอด', description: 'แจ้งช่วงเริ่มต้นและสิ้นสุดการถือศีลอด', symbol: '🕯️' },
  { id: 'religious_events', label: 'กิจกรรมและเหตุการณ์ทางศาสนา', description: 'กิจกรรมชุมชนและเหตุการณ์จากแหล่งข้อมูลที่เชื่อถือได้', symbol: '🔔' },
];

const DEFAULT_KINDS = NOTIFICATION_KINDS.map(({ id }) => id);
const VALID_FAITHS = new Set(FAITHS.map(({ id }) => id));
const VALID_KINDS = new Set(DEFAULT_KINDS);

const readSavedPreferences = (): SavedPreferences | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<SavedPreferences> | null;
    if (!parsed) return null;
    return {
      faiths: (parsed.faiths || []).filter((id): id is FaithId => VALID_FAITHS.has(id as FaithId)),
      kinds: (parsed.kinds || []).filter((id): id is NotificationKind => VALID_KINDS.has(id as NotificationKind)),
      city: typeof parsed.city === 'string' && parsed.city.trim() ? parsed.city : 'Bangkok',
      country: typeof parsed.country === 'string' && parsed.country.trim() ? parsed.country : 'Thailand',
    };
  } catch {
    return null;
  }
};

export const ReligiousNotificationsModal: React.FC<ReligiousNotificationsModalProps> = ({ isOpen, onClose }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [faiths, setFaiths] = useState<FaithId[]>(['all']);
  const [kinds, setKinds] = useState<NotificationKind[]>(DEFAULT_KINDS);
  const [city, setCity] = useState('Bangkok');
  const [country, setCountry] = useState('Thailand');
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string>>({});
  const [loadingPrayer, setLoadingPrayer] = useState(false);
  const [prayerError, setPrayerError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPermission(getNotificationPermission());
    const saved = readSavedPreferences();
    if (!saved) return;
    setFaiths(saved.faiths.length ? saved.faiths : ['all']);
    setKinds(saved.kinds);
    setCity(saved.city);
    setCountry(saved.country);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ faiths, kinds, city, country } satisfies SavedPreferences));
  }, [isOpen, faiths, kinds, city, country]);

  const showPrayerTimes = kinds.includes('prayer') && (faiths.includes('all') || faiths.includes('islam'));

  useEffect(() => {
    if (!isOpen || !showPrayerTimes || !city.trim() || !country.trim()) {
      setPrayerTimes({});
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingPrayer(true);
      setPrayerError('');
      try {
        const response = await fetch(
          `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city.trim())}&country=${encodeURIComponent(country.trim())}&method=4`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Prayer API unavailable');
        const json = await response.json() as PrayerTimesResponse;
        setPrayerTimes(json.data?.timings || {});
        if (!json.data?.timings) setPrayerError('ไม่พบข้อมูลเวลาละหมาดของพื้นที่นี้');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setPrayerTimes({});
          setPrayerError('โหลดข้อมูลไม่ได้ กรุณาตรวจสอบชื่อเมือง ประเทศ หรืออินเทอร์เน็ต');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingPrayer(false);
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, showPrayerTimes, city, country]);

  const prayerEntries = useMemo(
    () => [
      ['Fajr', 'ฟัจญ์ร'],
      ['Dhuhr', 'ซุฮ์ริ'],
      ['Asr', 'อัสริ'],
      ['Maghrib', 'มัฆริบ'],
      ['Isha', 'อิชาอ์'],
    ].filter(([key]) => prayerTimes[key]).map(([key, label]) => ({ key, label, value: prayerTimes[key] })),
    [prayerTimes]
  );

  const toggleFaith = (faith: FaithId) => {
    if (faith === 'all') {
      setFaiths(['all']);
      return;
    }
    setFaiths((current) => {
      const selected = current.filter((id) => id !== 'all');
      if (selected.includes(faith)) {
        const next = selected.filter((id) => id !== faith);
        return next.length ? next : ['all'];
      }
      return [...selected, faith];
    });
  };

  const toggleKind = (kind: NotificationKind) => {
    setKinds((current) => current.includes(kind) ? current.filter((id) => id !== kind) : [...current, kind]);
  };

  const enablePush = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : getNotificationPermission());
  };

  const testNotification = () => {
    sendBrowserNotification('🪷 WINRIDER.AI • Faith & Sacred Calendar', {
      body: 'ระบบพร้อมแจ้งเตือนวันสำคัญ ศาสนกิจ และเวลาละหมาดตามการตั้งค่าของคุณ',
      tag: 'faith-sacred-calendar-test',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="faith-calendar-title">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-amber-300/25 bg-gradient-to-b from-[#101A35] via-[#090F22] to-black text-slate-100 shadow-[0_0_60px_rgba(255,215,0,0.14)]">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-xl bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="ปิด Faith & Sacred Calendar">
          <X className="h-5 w-5" />
        </button>

        <header className="border-b border-white/10 p-5 sm:p-7">
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-2xl">🪷</div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Faith & Sacred Calendar</div>
              <h2 id="faith-calendar-title" className="text-xl font-black sm:text-2xl">ศูนย์แจ้งเตือนศาสนาและวันสำคัญ</h2>
              <p className="mt-1 text-xs text-slate-400">เคารพทุกศาสนา ทุกความเชื่อ และให้ผู้ใช้เลือกการแจ้งเตือนด้วยตนเอง</p>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-black text-white">Browser Push</div>
                <div className="text-[11px] text-slate-400">
                  {permission === 'granted' ? 'เปิดใช้งานแล้ว' : permission === 'denied' ? 'เบราว์เซอร์ปิดกั้นการแจ้งเตือน' : 'ยังไม่ได้อนุญาตการแจ้งเตือน'}
                </div>
              </div>
              {permission === 'granted' ? (
                <button type="button" onClick={testNotification} className="rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-xs font-bold text-cyan-300">ทดสอบแจ้งเตือน</button>
              ) : (
                <button type="button" onClick={enablePush} className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-slate-950">เปิด Browser Push</button>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2"><Settings2 className="h-4 w-4 text-amber-300" /><h3 className="font-black">ศาสนา / ความเชื่อที่ต้องการติดตาม</h3></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FAITHS.map((faith) => {
                const selected = faiths.includes(faith.id);
                return (
                  <button key={faith.id} type="button" onClick={() => toggleFaith(faith.id)} aria-pressed={selected} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${selected ? 'border-amber-300/50 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    <span className="text-base">{faith.symbol}</span><span className="flex-1">{faith.label}</span>{selected && <Check className="h-3.5 w-3.5 text-emerald-300" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2"><BellRing className="h-4 w-4 text-cyan-300" /><h3 className="font-black">ประเภทการแจ้งเตือน</h3></div>
            <div className="space-y-2">
              {NOTIFICATION_KINDS.map((kind) => {
                const selected = kinds.includes(kind.id);
                return (
                  <button key={kind.id} type="button" onClick={() => toggleKind(kind.id)} aria-pressed={selected} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selected ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-white/10 bg-white/5'}`}>
                    <span className="text-xl">{kind.symbol}</span>
                    <span className="flex-1"><span className="block text-xs font-bold text-white">{kind.label}</span><span className="mt-0.5 block text-[10px] text-slate-500">{kind.description}</span></span>
                    {selected && <Check className="h-4 w-4 text-emerald-300" />}
                  </button>
                );
              })}
            </div>
          </section>

          {showPrayerTimes && (
            <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <div className="mb-3 flex items-center gap-2"><Clock3 className="h-4 w-4 text-emerald-300" /><h3 className="font-black">เวลาละหมาดตามเมือง / ประเทศจริง</h3></div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <label className="text-[10px] text-slate-400">เมือง<input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white" /></label>
                <label className="text-[10px] text-slate-400">ประเทศ<input value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white" /></label>
              </div>
              {loadingPrayer ? (
                <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลดเวลาละหมาด...</div>
              ) : prayerEntries.length ? (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">{prayerEntries.map((prayer) => <div key={prayer.key} className="rounded-xl border border-white/10 bg-black/25 p-2 text-center"><div className="text-[9px] text-slate-500">{prayer.label}</div><div className="mt-1 text-xs font-black text-emerald-300">{prayer.value}</div></div>)}</div>
              ) : (
                <div className="text-[10px] text-rose-300">{prayerError || 'กำลังรอข้อมูลพื้นที่'}</div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-violet-300" /><h3 className="font-black">ปฏิทินวันสำคัญหลายศาสนา</h3></div>
            <div className="flex items-start gap-2 text-[11px] text-slate-400"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" /><span>ระบบบันทึกศาสนา ประเภทการแจ้งเตือน เมือง และประเทศไว้บนอุปกรณ์นี้แล้ว วันสำคัญที่แสดงต้องอ้างอิงแหล่งข้อมูลตามศาสนา นิกาย ภูมิภาค และเขตเวลาของผู้ใช้</span></div>
          </section>
        </div>
      </div>
    </div>
  );
};
