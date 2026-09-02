import React, { useState } from 'react';
import { 
  Flame, 
  MapPin, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  Tag, 
  Share2, 
  Bookmark, 
  BookmarkCheck,
  TrendingUp, 
  Navigation,
  CheckCircle2,
  Calendar,
  X
} from 'lucide-react';
import { WIN_ALERT_EVENTS, WinAlertEvent } from '../data/winAlertEventsData';
import { playTactileBlip, playLevelUpFanfare, speakThaiText } from '../utils/audio';

interface WinAlertEventsCardProps {
  audioEnabled: boolean;
  onBookEventRide: (event: WinAlertEvent) => void;
  onSelectEvent?: (event: WinAlertEvent) => void;
  className?: string;
}

export const WinAlertEventsCard: React.FC<WinAlertEventsCardProps> = ({
  audioEnabled,
  onBookEventRide,
  onSelectEvent,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(['event-01']);
  const [selectedEventModal, setSelectedEventModal] = useState<WinAlertEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: '🔥 ทั้งหมด (All Events)', icon: '✨' },
    { id: 'mall_sale', label: '🏬 มิดเยียร์ห้างใหญ่', icon: '🛍️' },
    { id: 'popup_market', label: '🎪 ตลาดป๊อปอัพ', icon: '🎨' },
    { id: 'food_fest', label: '🍜 เทศกาลอาหาร', icon: '🥟' },
    { id: 'concert', label: '🎤 คอนเสิร์ต', icon: '🎸' },
  ];

  const filteredEvents = selectedCategory === 'all' 
    ? WIN_ALERT_EVENTS 
    : WIN_ALERT_EVENTS.filter(e => e.category === selectedCategory);

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioEnabled) playTactileBlip(800);
    setBookmarkedIds(prev => {
      const exists = prev.includes(id);
      if (exists) {
        setToastMessage('ยกเลิกบันทึกอีเวนต์');
        return prev.filter(item => item !== id);
      } else {
        setToastMessage('บันทึกอีเวนต์ลงในรายการที่สนใจแล้ว ⭐');
        return [...prev, id];
      }
    });
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleShare = (event: WinAlertEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioEnabled) playTactileBlip(850);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`ไปงาน ${event.title} ด้วยกันไหม? นั่ง WIN ไม่ต้องวนหาที่จอด: ${event.venueName}`);
    }
    setToastMessage(`คัดลอกลิงก์อีเวนต์ "${event.title}" เรียบร้อยแล้ว!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenDetail = (event: WinAlertEvent) => {
    if (audioEnabled) playTactileBlip(900);
    setSelectedEventModal(event);
    if (onSelectEvent) onSelectEvent(event);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[#00D2FF] text-slate-950 font-bold font-mono text-xs shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER WITH PROACTIVE WIN-ALERT ENGINE */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            <Flame className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>WIN-ALERT EVENT DISCOVERY</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  LIVE LOCAL EVENTS
                </span>
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              ตรวจจับอีเวนต์ลดราคา ตลาดนัดป๊อปอัพ และคอนเสิร์ตรอบตัวคุณ พร้อมเรียกวินไป-กลับเลี่ยงรถติด
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          {filteredEvents.length} อีเวนต์เด็ด
        </span>
      </div>

      {/* CATEGORY FILTER CHIPS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              if (audioEnabled) playTactileBlip(750);
              setSelectedCategory(cat.id);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
              selectedCategory === cat.id
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(255,215,0,0.4)] scale-105'
                : 'bg-[#09152C] text-slate-300 border-white/10 hover:border-cyan-400/40 hover:text-white'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* RICH MEDIA EVENT CARDS (CAROUSEL / GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredEvents.map(event => {
          const isSaved = bookmarkedIds.includes(event.id);

          return (
            <div
              key={event.id}
              onClick={() => handleOpenDetail(event)}
              className="group relative rounded-3xl bg-gradient-to-b from-[#0F2248] via-[#0A1835] to-[#060E22] border-2 border-white/10 hover:border-[#FFD700]/70 transition-all duration-300 cursor-pointer shadow-xl overflow-hidden flex flex-col justify-between"
            >
              {/* Top Banner Image with Holographic Overlay */}
              <div className="relative h-36 w-full overflow-hidden bg-slate-900">
                <img 
                  src={event.bannerImage} 
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1835] via-black/40 to-transparent" />

                {/* Badges on Image */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  <span className={`px-2 py-0.8 rounded-full text-[10px] font-mono font-black border backdrop-blur-md ${event.categoryBadgeColor}`}>
                    {event.categoryIcon} {event.categoryLabel}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleToggleBookmark(event.id, e)}
                      className="p-1.5 rounded-xl bg-black/60 backdrop-blur-md text-amber-400 hover:bg-black/80 border border-white/20 transition-all"
                      title="บันทึกอีเวนต์"
                    >
                      {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 fill-amber-400" /> : <Bookmark className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => handleShare(event, e)}
                      className="p-1.5 rounded-xl bg-black/60 backdrop-blur-md text-slate-300 hover:text-white hover:bg-black/80 border border-white/20 transition-all"
                      title="แชร์อีเวนต์"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Distance & Time Pill on bottom of Image */}
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[#00D2FF] font-bold border border-cyan-400/40 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.distanceKm} กม. จากคุณ
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-amber-300 font-bold border border-amber-400/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {event.remainingTimeText}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-[#FFD700] transition-colors leading-snug line-clamp-2">
                    {event.title}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono mt-1">
                    <span className="text-amber-400">📍 {event.venueName}</span>
                    <span>•</span>
                    <span className="text-slate-400">{event.venueArea}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                {/* Promo perk bar & Book ride CTA */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300 flex items-center justify-between">
                    <span className="flex items-center gap-1 truncate font-bold">
                      <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span>{event.discountOrPerk}</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black ml-1 flex-shrink-0">
                      {event.winRiderPromoCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (audioEnabled) {
                          playTactileBlip(950);
                          speakThaiText(`เตรียมเรียกรถไปงาน ${event.title}`);
                        }
                        onBookEventRide(event);
                      }}
                      className="flex-1 py-2 px-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs font-mono shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5 fill-slate-950" />
                      <span>เรียกวินไปงานนี้ (Book Ride)</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(event);
                      }}
                      className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-mono font-bold"
                      title="ดูรายละเอียดงาน"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EVENT DETAIL POPUP MODAL */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#0F2248] via-[#091530] to-[#050C1C] border-2 border-amber-400 shadow-[0_0_50px_rgba(255,215,0,0.3)] overflow-hidden max-h-[90vh] flex flex-col text-slate-100">
            {/* Modal Image Header */}
            <div className="relative h-44 w-full bg-slate-950 flex-shrink-0">
              <img 
                src={selectedEventModal.bannerImage} 
                alt={selectedEventModal.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#091530] via-black/40 to-transparent" />

              <button
                onClick={() => setSelectedEventModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-4 right-4">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border backdrop-blur-md ${selectedEventModal.categoryBadgeColor}`}>
                  {selectedEventModal.categoryIcon} {selectedEventModal.categoryLabel}
                </span>
                <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                  {selectedEventModal.title}
                </h3>
              </div>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto font-sans text-xs">
              {/* Event Time & Location Badges */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    สถานที่จัดงาน
                  </span>
                  <p className="text-white font-bold mt-0.5">{selectedEventModal.venueName}</p>
                  <span className="text-[10px] text-cyan-300">{selectedEventModal.venueArea}</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    เวลา & วันที่
                  </span>
                  <p className="text-white font-bold mt-0.5">{selectedEventModal.timeRange}</p>
                  <span className="text-[10px] text-amber-300">{selectedEventModal.startDate} - {selectedEventModal.endDate}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase">รายละเอียดงาน</h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {selectedEventModal.description}
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-mono font-bold text-amber-400 uppercase">ไฮไลต์ที่คุณไม่ควรพลาด</h4>
                <ul className="space-y-1">
                  {selectedEventModal.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggested WIN pickup spot & Promo */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-cyan-500/10 border border-amber-500/40 space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-300 font-bold">🎟️ สิทธิพิเศษสำหรับผู้ใช้ WIN:</span>
                  <span className="px-2 py-0.5 rounded bg-[#FFD700] text-slate-950 font-black">
                    โค้ด: {selectedEventModal.winRiderPromoCode}
                  </span>
                </div>
                <p className="text-slate-200 text-[11px]">{selectedEventModal.discountOrPerk}</p>
                <div className="text-[10px] text-cyan-300 pt-1 border-t border-white/10">
                  📍 จุดนัดรับแนะนำ: <strong>{selectedEventModal.suggestedPickupPoint}</strong>
                </div>
              </div>
            </div>

            {/* Modal Bottom CTA */}
            <div className="p-4 bg-[#060D1E] border-t border-white/10 flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedEventModal(null);
                  if (audioEnabled) {
                    playTactileBlip(1000);
                    speakThaiText(`เตรียมเรียกรถไปงาน ${selectedEventModal.title}`);
                  }
                  onBookEventRide(selectedEventModal);
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-[#00D2FF] to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs font-mono shadow-[0_0_20px_rgba(0,210,255,0.5)] flex items-center justify-center gap-2 transition-all"
              >
                <Navigation className="w-4 h-4 fill-slate-950" />
                <span>เรียกอัศวิน WIN ไปงานนี้ทันที ({selectedEventModal.distanceKm} กม.)</span>
              </button>

              <button
                onClick={() => setSelectedEventModal(null)}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
