import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { emitQuestMetric } from '../services/questService';
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Share2,
  Users,
  Search,
  X,
  Bike,
  Zap,
  Sparkles,
  Flame,
} from 'lucide-react';
import { NearbyEventsResponse, WinAlertCategory, WinAlertEvent } from '../data/winAlertEventsData';
import { playTactileBlip, speakThaiText } from '../utils/audio';
import { sendBrowserNotification } from '../utils/notifications';
import { useRealGeolocation } from '../hooks/useRealGeolocation';
import { buildGoogleMapsCoordinateUrl } from '../services/googleMapsExternal';

interface WinAlertEventsCardProps {
  audioEnabled: boolean;
  onBookEventRide: (event: WinAlertEvent) => void;
  onSelectEvent?: (event: WinAlertEvent) => void;
  className?: string;
}

const categories: Array<{ id: 'all' | WinAlertCategory; label: string; icon: string }> = [
  { id: 'all', label: 'ทั้งหมด', icon: '✨' },
  { id: 'concert', label: 'คอนเสิร์ต', icon: '🎤' },
  { id: 'sports', label: 'การแข่งขันกีฬา', icon: '🏆' },
  { id: 'sale', label: 'งานลดราคาสินค้า', icon: '🏷️' },
  { id: 'market', label: 'ตลาดนัดกลางคืน', icon: '🎪' },
  { id: 'festival', label: 'เทศกาลสำคัญ', icon: '🎉' },
  { id: 'community', label: 'อีเวนต์อื่นๆ', icon: '📅' },
];

const categoryMeta: Record<WinAlertCategory, { label: string; icon: string; className: string }> = {
  concert: { label: 'คอนเสิร์ต & ดนตรีสด', icon: '🎤', className: 'border-violet-400/50 bg-violet-500/20 text-violet-200' },
  sports: { label: 'การแข่งขันกีฬา', icon: '🏆', className: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200' },
  sale: { label: 'งานลดราคาสินค้า & เอ็กซ์โป', icon: '🏷️', className: 'border-rose-400/50 bg-rose-500/20 text-rose-200' },
  market: { label: 'ตลาดนัดกลางคืน & สตรีทฟู้ด', icon: '🎪', className: 'border-amber-400/50 bg-amber-500/20 text-amber-200' },
  festival: { label: 'เทศกาลสำคัญ', icon: '🎉', className: 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200' },
  community: { label: 'อีเวนต์ทั่วไป', icon: '📅', className: 'border-blue-400/50 bg-blue-500/20 text-blue-200' },
  other: { label: 'อีเวนต์สำคัญ', icon: '📍', className: 'border-slate-400/50 bg-slate-500/20 text-slate-200' },
};

const bangkokDateKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(date);
};

const formatDay = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00+07:00`);
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(date);
};

const BOOKMARK_KEY = 'winrider_real_event_bookmarks';
const NOTIFIED_DATE_KEY = 'winrider_daily_events_last_notified';

export const WinAlertEventsCard: React.FC<WinAlertEventsCardProps> = ({
  audioEnabled,
  onBookEventRide,
  onSelectEvent,
  className = '',
}) => {
  const geo = useRealGeolocation(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | WinAlertCategory>('all');
  const [events, setEvents] = useState<WinAlertEvent[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    if (typeof localStorage === 'undefined') return [];
    try {
      const saved = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });
  const [selectedEventModal, setSelectedEventModal] = useState<WinAlertEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [eventDate, setEventDate] = useState(bangkokDateKey());
  const [rangeDays, setRangeDays] = useState<1 | 7 | 30>(7);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarkedIds));
    }
  }, [bookmarkedIds]);

  const loadEvents = useCallback(async () => {
    const today = bangkokDateKey();
    setEventDate(today);
    setLoading(true);
    setErrorMessage('');
    try {
      const geoParams =
        geo.latitude && geo.longitude ? `&latitude=${geo.latitude}&longitude=${geo.longitude}` : '';
      const apiUrl = `/api/events/daily?date=${encodeURIComponent(today)}&days=${rangeDays}&country=TH${geoParams}`;
      const response = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('เซิร์ฟเวอร์ Win Alert ไม่ได้ส่งข้อมูล JSON');
      }
      const data = (await response.json()) as NearbyEventsResponse & { message?: string };
      if (!response.ok) throw new Error(data.message || 'โหลด Win Alert ประจำวันไม่สำเร็จ');
      const realEvents = Array.isArray(data.events) ? data.events : [];
      setEvents(realEvents);
      setSourceName(data.source || 'WINRIDER.AI • Public Event Data');
      setFetchedAt(data.fetchedAt || new Date().toISOString());

      if (
        realEvents.length > 0 &&
        typeof localStorage !== 'undefined' &&
        localStorage.getItem(NOTIFIED_DATE_KEY) !== today
      ) {
        sendBrowserNotification(`🏍️ Win Alert เราไปส่งได้นะ: มีอีเวนต์วันนี้ ${realEvents.length} รายการ`, {
          body: 'เปิดดูคอนเสิร์ต การแข่งขันกีฬา งานลดราคา และตลาดนัดกลางคืนวันนี้ พี่วินพร้อมพาไปส่งถึงที่',
          tag: `daily-events-${today}`,
        });
        localStorage.setItem(NOTIFIED_DATE_KEY, today);
      }
    } catch (error) {
      setEvents([]);
      setErrorMessage(error instanceof Error ? error.message : 'โหลดกิจกรรมจริงประจำวันไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [rangeDays, geo.latitude, geo.longitude]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (selectedCategory !== 'all' && event.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = event.title.toLowerCase().includes(q);
        const matchVenue = (event.venueName || '').toLowerCase().includes(q);
        const matchArea = (event.venueArea || '').toLowerCase().includes(q);
        const matchDesc = (event.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchVenue && !matchArea && !matchDesc) return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleBookmark = (id: string, clickEvent: React.MouseEvent) => {
    clickEvent.stopPropagation();
    if (audioEnabled) playTactileBlip(800);
    setBookmarkedIds((current) => {
      const saved = current.includes(id);
      showToast(saved ? 'ยกเลิกบันทึกอีเวนต์แล้ว' : 'บันทึกอีเวนต์ไว้แล้ว');
      return saved ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const shareEvent = async (event: WinAlertEvent, clickEvent: React.MouseEvent) => {
    clickEvent.stopPropagation();
    const text = `🏍️ Win Alert เราไปส่งได้นะ: ${event.title}\n📍 สถานที่: ${event.venueName} (${event.venueArea || ''})\n🕒 เวลา: ${formatDateTime(event.startAt)}\nข้อมูลจาก: ${event.sourceName}`;
    try {
      if (navigator.share) await navigator.share({ title: event.title, text });
      else await navigator.clipboard.writeText(text);
      showToast('คัดลอกข้อมูลกิจกรรมสำหรับแชร์แล้ว');
    } catch {
      // User cancelled share sheet
    }
  };

  const bookRide = (event: WinAlertEvent) => {
    if (audioEnabled) {
      playTactileBlip(950);
      speakThaiText(`Win Alert เราไปส่งได้นะ! กำลังคำนวณเส้นทางและเรียกพี่วินไปงาน ${event.title} ค่ะ`);
    }
    onBookEventRide(event);
  };

  return (
    <section className={`space-y-3.5 w-full max-w-full overflow-hidden ${className}`} aria-labelledby="daily-events-title">
      {toastMessage && (
        <div
          className="fixed left-1/2 top-16 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-amber-300 bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 shadow-2xl"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* 1. HERO HEADER BANNER: WIN ALERT เราไปส่งได้นะ */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#0C1F42] via-[#08152E] to-[#040A18] border-2 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.18)]">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 text-slate-950 shadow-lg ring-2 ring-amber-300/40">
            <Bike className="h-6 w-6 animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="daily-events-title" className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                <span>Win Alert เราไปส่งได้นะ</span>
                <span className="text-xl">🏍️</span>
              </h3>
              <span className="rounded-full border border-amber-400/50 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black text-amber-300 font-mono shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                LIVE EVENTS
              </span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 font-mono">
                ✓ มีรถพร้อมรับส่ง
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-200/90 font-mono font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{formatDay(eventDate)}</span>
            </p>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              มีอีเว้นต์วันนี้? คอนเสิร์ตใหญ่, การแข่งขันกีฬา, มหกรรมลดราคาสินค้า, ตลาดนัดกลางคืน และเทศกาลสำคัญ พี่วินพร้อมพาคุณไปส่งถึงหน้างานทันที เลี่ยงรถติด ไม่ต้องกังวลเรื่องที่จอด!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadEvents()}
          disabled={loading}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-3.5 text-xs font-black text-cyan-200 hover:bg-cyan-500/30 active:scale-95 transition-all shrink-0 shadow"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>อัปเดตอีเวนต์วันนี้</span>
        </button>
      </div>

      {/* 2. SEARCH BAR & STATS (NO OVERFLOW) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาคอนเสิร์ต, กีฬา, งานลดราคา, ตลาดนัดกลางคืน หรือสถานที่จัดงาน..."
            className="w-full rounded-2xl border border-white/10 bg-[#07132B] pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none transition-all font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono">
          <span className="rounded-2xl border border-white/10 bg-[#07132B] px-3 py-2 text-cyan-300 font-bold whitespace-nowrap">
            พบ {filteredEvents.length} งาน
          </span>
          {([1, 7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRangeDays(days)}
              className={`rounded-2xl border px-3 py-2 text-xs font-black transition-all ${
                rangeDays === days
                  ? 'border-cyan-400 bg-cyan-400 text-slate-950 shadow'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {days === 1 ? 'วันนี้' : `${days} วัน`}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CATEGORY FILTER BUTTONS (CONCERTS, SPORTS, SALES, NIGHT MARKETS, ETC.) */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar max-w-full">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => {
              if (audioEnabled) playTactileBlip(800);
              setSelectedCategory(category.id);
            }}
            className={`min-h-10 whitespace-nowrap rounded-xl border px-3 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategory === category.id
                ? 'border-amber-400 bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(251,191,36,0.35)]'
                : 'border-white/10 bg-[#07132B] text-slate-300 hover:bg-white/10'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {/* 4. LOADING & ERROR STATES */}
      {loading && (
        <div className="flex min-h-36 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 text-sm text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          <span>กำลังรวบรวมข้อมูลอีเวนต์ คอนเสิร์ต ตลาด และงานลดราคาของวันนี้...</span>
        </div>
      )}

      {!loading && errorMessage && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-bold">ยังโหลด Win Alert ไม่ได้</p>
              <p className="mt-1 text-rose-200/80">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !errorMessage && filteredEvents.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-[#07132B] p-8 text-center space-y-2">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-500" />
          <p className="font-bold text-white text-base">ไม่พบอีเวนต์ในหมวดนี้สำหรับช่วงเวลานี้</p>
          <p className="text-xs text-slate-400">
            ลองสลับเป็นหมวด "ทั้งหมด" หรือขยายช่วงเวลาเป็น 7 วัน หรือ 30 วัน
          </p>
        </div>
      )}

      {/* 5. EVENT CARDS GRID WITH "เราไปส่งได้นะ" CALL TO ACTION */}
      {!loading && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredEvents.map((event) => {
            const meta = categoryMeta[event.category] || categoryMeta.other;
            const saved = bookmarkedIds.includes(event.id);
            return (
              <article
                key={event.id}
                onClick={() => {
                  if (audioEnabled) playTactileBlip(900);
                  setSelectedEventModal(event);
                  onSelectEvent?.(event);
                  emitQuestMetric('citizen.win_alert_preview', 1);
                }}
                className="group cursor-pointer rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-[#0B1A38] via-[#071228] to-[#040A18] p-4 shadow-lg hover:border-amber-400/60 hover:shadow-[0_0_20px_rgba(251,191,36,0.18)] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Category Pill & Bookmark/Share */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold flex items-center gap-1 ${meta.className}`}>
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(clickEvent) => toggleBookmark(event.id, clickEvent)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-amber-300 hover:bg-white/10 transition-all"
                        aria-label={saved ? 'ยกเลิกบันทึก' : 'บันทึกอีเวนต์'}
                      >
                        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={(clickEvent) => void shareEvent(event, clickEvent)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-300 hover:bg-white/10 transition-all"
                        aria-label="แชร์อีเวนต์"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="mt-3 text-sm sm:text-base font-black leading-snug text-white group-hover:text-amber-300 transition-colors">
                    {event.title}
                  </h4>

                  {/* Details */}
                  <div className="mt-2.5 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                      <span className="font-semibold">{event.venueName}{event.venueArea ? ` • ${event.venueArea}` : ''}</span>
                    </div>

                    <div className="flex items-start gap-1.5 text-amber-200">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                      <span>{formatDateTime(event.startAt)}{event.endAt ? ` – ${formatDateTime(event.endAt)}` : ''}</span>
                    </div>

                    {typeof event.distanceKm === 'number' && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-300">
                        <Crosshair className="h-3 w-3" />
                        <span>~{event.distanceKm.toFixed(1)} กม. จากตำแหน่งคุณ</span>
                      </div>
                    )}

                    {typeof event.attendance === 'number' && event.attendance > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                        <Users className="h-3 w-3 text-amber-400" />
                        <span>คาดการณ์ผู้เข้าร่วม ~{event.attendance.toLocaleString('th-TH')} คน</span>
                        {event.attendance >= 20000 && (
                          <span className="rounded bg-rose-500/80 px-1.5 py-0.2 text-[9px] font-black text-white">
                            หนาแน่นสูง
                          </span>
                        )}
                      </div>
                    )}

                    {event.description && (
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-400 pt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* "เราไปส่งได้นะ" Action Row */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                  <a
                    href={buildGoogleMapsCoordinateUrl({ latitude: event.latitude, longitude: event.longitude })}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                    className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all shrink-0"
                    title="เปิดตำแหน่งใน Google Maps"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-cyan-300" />
                    <span className="hidden sm:inline">แผนที่</span>
                  </a>

                  {/* Prominent "เราไปส่งได้นะ" Button */}
                  <button
                    type="button"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      bookRide(event);
                    }}
                    className="flex-1 flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 py-2 px-3 text-xs font-black text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                  >
                    <Bike className="h-4 w-4" />
                    <span>เราไปส่งได้นะ</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {sourceName && !loading && (
        <p className="text-[11px] text-slate-500 text-center pt-1 font-mono">
          Win Alert: แหล่งข้อมูล {sourceName} • อัปเดต {formatDateTime(fetchedAt)}
        </p>
      )}

      {/* 6. EVENT DETAIL MODAL */}
      {selectedEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md overflow-hidden animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-detail-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-amber-400/50 bg-[#07132B] p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${categoryMeta[selectedEventModal.category]?.className || categoryMeta.other.className}`}>
                  <span>{categoryMeta[selectedEventModal.category]?.icon}</span>
                  <span>{categoryMeta[selectedEventModal.category]?.label}</span>
                </span>
                <h3 id="event-detail-title" className="mt-3 text-lg sm:text-xl font-black text-white">
                  {selectedEventModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white"
                aria-label="ปิดรายละเอียด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-white/10 bg-black/40 p-3.5 text-xs sm:text-sm">
              <p className="flex gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-cyan-300 mt-0.5" />
                <span className="font-semibold text-white">
                  {selectedEventModal.venueName}{selectedEventModal.venueArea ? ` • ${selectedEventModal.venueArea}` : ''}
                </span>
              </p>
              <p className="flex gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-amber-300 mt-0.5" />
                <span className="text-amber-200">
                  {formatDateTime(selectedEventModal.startAt)}
                  {selectedEventModal.endAt ? ` – ${formatDateTime(selectedEventModal.endAt)}` : ''}
                </span>
              </p>
              {typeof selectedEventModal.attendance === 'number' && selectedEventModal.attendance > 0 && (
                <p className="flex items-center gap-2 font-mono text-slate-300">
                  <Users className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>
                    คาดการณ์ผู้เข้าร่วม: ~{selectedEventModal.attendance.toLocaleString('th-TH')} คน
                    {selectedEventModal.attendance >= 20000 ? ' (จุดหนาแน่นสูง เลี่ยงรถติดด้วยพี่วิน)' : ''}
                  </span>
                </p>
              )}
            </div>

            {selectedEventModal.description && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-950/30 p-3.5 text-xs sm:text-sm leading-relaxed text-slate-200">
                <p className="mb-1 font-bold text-cyan-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>รายละเอียดกิจกรรม & แนะนำการเดินทาง:</span>
                </p>
                <p>{selectedEventModal.description}</p>
              </div>
            )}

            {/* Travel Advice Box */}
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
              <Bike className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <p>
                <strong>Win Alert เราไปส่งได้นะ:</strong> ไปงานนี้ด้วยพี่วิน สะดวกรวดเร็ว ไม่ต้องวนหาที่จอดรถ และส่งถึงหน้าประตูทางเข้าทันเวลาเริ่มงาน
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setSelectedEventModal(null);
                  bookRide(selectedEventModal);
                }}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 px-4 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.35)] hover:brightness-110 active:scale-95 transition-all"
              >
                <Bike className="h-4 w-4" />
                <span>🏍️ Win Alert เราไปส่งได้นะ (เรียกพี่วินเลย)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="min-h-12 rounded-xl bg-slate-800 hover:bg-slate-700 px-5 text-sm font-bold text-slate-300"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default WinAlertEventsCard;
