import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { emitQuestMetric } from '../services/questService';
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Share2,
  Users,
  X,
} from 'lucide-react';
import { NearbyEventsResponse, WinAlertCategory, WinAlertEvent } from '../data/winAlertEventsData';
import { playTactileBlip, speakThaiText } from '../utils/audio';
import { sendBrowserNotification } from '../utils/notifications';
import { auth } from '../firebase';
import { loadAccountPreference, saveAccountPreference } from '../services/accountPersistenceService';

interface WinAlertEventsCardProps {
  audioEnabled: boolean;
  onBookEventRide: (event: WinAlertEvent) => void;
  onSelectEvent?: (event: WinAlertEvent) => void;
  className?: string;
}

const categories: Array<{ id: 'all' | WinAlertCategory; label: string; icon: string }> = [
  { id: 'all', label: 'ทั้งหมด', icon: '✨' },
  { id: 'sale', label: 'ลดราคา', icon: '🏷️' },
  { id: 'market', label: 'ตลาด / ป๊อปอัพ', icon: '🎪' },
  { id: 'concert', label: 'คอนเสิร์ต', icon: '🎤' },
  { id: 'sports', label: 'กีฬา', icon: '🏆' },
  { id: 'festival', label: 'เทศกาล', icon: '🎉' },
  { id: 'community', label: 'งานอีเวนต์', icon: '📅' },
];

const categoryMeta: Record<WinAlertCategory, { label: string; icon: string; className: string }> = {
  sale: { label: 'ลดราคา', icon: '🏷️', className: 'border-rose-400/40 bg-rose-500/15 text-rose-200' },
  market: { label: 'ตลาด / ป๊อปอัพ', icon: '🎪', className: 'border-amber-400/40 bg-amber-500/15 text-amber-200' },
  concert: { label: 'คอนเสิร์ต', icon: '🎤', className: 'border-violet-400/40 bg-violet-500/15 text-violet-200' },
  sports: { label: 'กีฬา', icon: '🏆', className: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200' },
  festival: { label: 'เทศกาล', icon: '🎉', className: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200' },
  community: { label: 'งานอีเวนต์', icon: '📅', className: 'border-blue-400/40 bg-blue-500/15 text-blue-200' },
  other: { label: 'งานอีเวนต์', icon: '📍', className: 'border-slate-400/40 bg-slate-500/15 text-slate-200' },
};

const bangkokDateKey = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok',
  }).format(date);
};

const formatDay = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00+07:00`);
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
  }).format(date);
};

const BOOKMARK_KEY = 'winrider_real_event_bookmarks';
const NOTIFIED_DATE_KEY = 'winrider_daily_events_last_notified';

export const WinAlertEventsCard: React.FC<WinAlertEventsCardProps> = ({
  audioEnabled, onBookEventRide, onSelectEvent, className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | WinAlertCategory>('all');
  const [events, setEvents] = useState<WinAlertEvent[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    if (typeof localStorage === 'undefined') return [];
    try {
      const saved = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
  });
  const [selectedEventModal, setSelectedEventModal] = useState<WinAlertEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [eventDate, setEventDate] = useState(bangkokDateKey());

  useEffect(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  const loadEvents = useCallback(async () => {
    const today = bangkokDateKey();
    setEventDate(today);
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({ date: today, country: 'TH' });
      const response = await fetch(`/api/events/daily?${params.toString()}`, { headers: { Accept: 'application/json' } });
      const data = await response.json() as NearbyEventsResponse & { message?: string };
      if (!response.ok) throw new Error(data.message || 'โหลด Win Alert ประจำวันไม่สำเร็จ');
      const realEvents = Array.isArray(data.events) ? data.events : [];
      setEvents(realEvents);
      setSourceName(data.source || 'ผู้ให้บริการข้อมูลอีเวนต์');
      setFetchedAt(data.fetchedAt || new Date().toISOString());

      if (realEvents.length > 0 && typeof localStorage !== 'undefined'
        && localStorage.getItem(NOTIFIED_DATE_KEY) !== today) {
        sendBrowserNotification(`📅 วันนี้มีกิจกรรมจริง ${realEvents.length} รายการ`, {
          body: 'เปิด WINRIDER.AI เพื่อดูงานลดราคา ตลาด คอนเสิร์ต กีฬา และอีเวนต์วันนี้',
          tag: `daily-events-${today}`,
        });
        localStorage.setItem(NOTIFIED_DATE_KEY, today);
      }
    } catch (error) {
      setEvents([]);
      setErrorMessage(error instanceof Error ? error.message : 'โหลดกิจกรรมจริงประจำวันไม่สำเร็จ');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  const filteredEvents = useMemo(
    () => selectedCategory === 'all' ? events : events.filter((event) => event.category === selectedCategory),
    [events, selectedCategory]
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleBookmark = (id: string, clickEvent: React.MouseEvent) => {
    clickEvent.stopPropagation();
    if (audioEnabled) playTactileBlip(800);
    setBookmarkedIds((current) => {
      const saved = current.includes(id);
      showToast(saved ? 'ยกเลิกบันทึกกิจกรรมแล้ว' : 'บันทึกกิจกรรมจริงไว้แล้ว');
      return saved ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const shareEvent = async (event: WinAlertEvent, clickEvent: React.MouseEvent) => {
    clickEvent.stopPropagation();
    const text = `${event.title}\n${event.venueName}\n${formatDateTime(event.startAt)}\nข้อมูลจาก ${event.sourceName}`;
    try {
      if (navigator.share) await navigator.share({ title: event.title, text });
      else await navigator.clipboard.writeText(text);
      showToast('เตรียมข้อมูลกิจกรรมสำหรับแชร์แล้ว');
    } catch { /* The user may cancel the native share sheet. */ }
  };

  const bookRide = (event: WinAlertEvent) => {
    if (audioEnabled) {
      playTactileBlip(950);
      speakThaiText(`เตรียมเรียกพี่วินไปงาน ${event.title}`);
    }
    onBookEventRide(event);
  };

  return (
    <section className={`space-y-3 ${className}`} aria-labelledby="daily-events-title">
      {toastMessage && <div className="fixed left-1/2 top-16 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-2xl" role="status"><CheckCircle2 className="h-4 w-4" />{toastMessage}</div>}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 to-rose-500 text-slate-950"><CalendarDays className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h3 id="daily-events-title" className="text-base font-black text-white">Win Alert เราไปส่งได้นะ</h3><span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">ทั่วประเทศไทย</span></div>
            <p className="mt-1 text-sm text-slate-300">{formatDay(eventDate)}</p>
            <p className="mt-1 text-sm text-slate-400">กดสถานที่เพื่อให้ระบบขอ GPS ปัจจุบันและค้นหาปลายทาง พร้อมแสดงระยะทาง/เวลาแบบประมาณการก่อนเข้าสู่การจอง (เส้นทางถนนจริงปิดชั่วคราว)</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadEvents()} disabled={loading} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-sm font-bold text-cyan-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />อัปเดตวันนี้</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1.5">{categories.map((category) => <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className={`min-h-11 whitespace-nowrap rounded-xl border px-3 text-sm font-bold ${selectedCategory === category.id ? 'border-amber-300 bg-amber-300 text-slate-950' : 'border-white/10 bg-[#09152C] text-slate-300'}`}>{category.icon} {category.label}</button>)}</div>

      {loading && <div className="flex min-h-36 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 text-sm text-slate-300"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" />กำลังตรวจสอบ Win Alert และเตรียมข้อมูลสถานที่จริงของวันนี้...</div>}
      {!loading && errorMessage && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"><div className="flex gap-2"><AlertCircle className="h-5 w-5 shrink-0" /><div><p className="font-bold">ยังโหลด Win Alert ไม่ได้</p><p className="mt-1 text-rose-200/80">{errorMessage}</p><p className="mt-2 text-xs text-slate-400">ระบบไม่แสดงกิจกรรมจำลองแทนข้อมูลจริง</p></div></div></div>}
      {!loading && !errorMessage && filteredEvents.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-500" /><p className="mt-3 font-bold text-white">ไม่พบสถานที่/กิจกรรมจริงในหมวดนี้สำหรับวันนี้</p><p className="mt-1 text-sm text-slate-400">สถานที่/งานที่จัดหลายวันจะแสดงทุกวันจนถึงวันสิ้นสุดโดยอัตโนมัติ</p></div>}

      {!loading && filteredEvents.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{filteredEvents.map((event) => {
        const meta = categoryMeta[event.category];
        const saved = bookmarkedIds.includes(event.id);
        return <article key={event.id} onClick={() => { if (audioEnabled) playTactileBlip(900); setSelectedEventModal(event); onSelectEvent?.(event);
    emitQuestMetric('citizen.win_alert_preview', 1); }} className="cursor-pointer rounded-2xl border border-white/10 bg-gradient-to-b from-[#0F2248] to-[#060E22] p-4 shadow-lg transition-colors hover:border-cyan-400/50">
          <div className="flex items-start justify-between gap-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>{meta.icon} {meta.label}</span><div className="flex gap-1"><button type="button" onClick={(clickEvent) => toggleBookmark(event.id, clickEvent)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-amber-300" aria-label={saved ? 'ยกเลิกบันทึกกิจกรรม' : 'บันทึกกิจกรรม'}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}</button><button type="button" onClick={(clickEvent) => void shareEvent(event, clickEvent)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-slate-300" aria-label="แชร์กิจกรรม"><Share2 className="h-4 w-4" /></button></div></div>
          <h4 className="mt-3 text-base font-black leading-snug text-white">{event.title}</h4>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span>{event.venueName}{event.venueArea ? ` • ${event.venueArea}` : ''}</span></div>
            <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>{formatDateTime(event.startAt)}{event.endAt ? ` – ${formatDateTime(event.endAt)}` : ''}</span></div>
            {typeof event.attendance === 'number' && event.attendance > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>คาดการณ์ผู้เข้าร่วม ~{event.attendance.toLocaleString('th-TH')} คน</span>
                {event.attendance >= 2500 && (
                  <span className="rounded bg-rose-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white">หนาแน่นสูง</span>
                )}
              </div>
            )}
            {event.description && (
              <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                {event.description}
              </p>
            )}
          </div>
          <button type="button" onClick={(clickEvent) => { clickEvent.stopPropagation(); bookRide(event); }} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-4 text-sm font-black text-slate-950"><Navigation className="h-4 w-4" />คำนวณระยะทางจริง & เรียกพี่วิน</button>
        </article>;
      })}</div>}

      {sourceName && !loading && <p className="text-xs text-slate-500">แหล่งข้อมูล: {sourceName} • อัปเดต {formatDateTime(fetchedAt)} • แสดงเฉพาะกิจกรรมที่มีผลในวันที่เลือก</p>}

      {selectedEventModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="event-detail-title"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-cyan-400/30 bg-[#071126] p-5 text-slate-100 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold ${categoryMeta[selectedEventModal.category].className}`}>{categoryMeta[selectedEventModal.category].icon} {categoryMeta[selectedEventModal.category].label}</span><h3 id="event-detail-title" className="mt-3 text-xl font-black">{selectedEventModal.title}</h3></div><button type="button" onClick={() => setSelectedEventModal(null)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5" aria-label="ปิดรายละเอียด"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"><p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-cyan-300" /><span>{selectedEventModal.venueName}{selectedEventModal.venueArea ? ` • ${selectedEventModal.venueArea}` : ''}</span></p><p className="flex gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-amber-300" /><span>{formatDateTime(selectedEventModal.startAt)}{selectedEventModal.endAt ? ` – ${formatDateTime(selectedEventModal.endAt)}` : ''}</span></p>{typeof selectedEventModal.attendance === 'number' && selectedEventModal.attendance > 0 && (<p className="flex items-center gap-2 font-semibold text-amber-300"><Users className="h-4 w-4 shrink-0" /><span>คาดการณ์ผู้เข้าร่วม: ~{selectedEventModal.attendance.toLocaleString('th-TH')} คน {selectedEventModal.attendance >= 2500 ? '(จุดหนาแน่นสูง แนะนำเลี่ยงรถติดด้วยวิน)' : ''}</span></p>)}</div>{selectedEventModal.description && (<div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-950/30 p-4 text-sm leading-relaxed text-slate-200"><p className="mb-1 font-bold text-cyan-300">รายละเอียดกิจกรรม & ข้อแนะนำการเดินทาง:</p><p>{selectedEventModal.description}</p></div>)}<p className="mt-4 text-xs text-slate-500">รหัสผู้ให้บริการ: {selectedEventModal.providerEventId} • {selectedEventModal.sourceName}</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => { setSelectedEventModal(null); bookRide(selectedEventModal); }} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-cyan-400 px-4 text-sm font-black text-slate-950"><Navigation className="h-4 w-4" />คำนวณระยะทางจริง & เรียกพี่วินไป–กลับ</button><button type="button" onClick={() => setSelectedEventModal(null)} className="min-h-12 rounded-xl bg-slate-800 px-5 text-sm font-bold">ปิด</button></div></div></div>}
    </section>
  );
};
