import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react';
import { CalibrationSession } from '../../types/schema';
import { useLanguage } from '../../context/LanguageContext';

interface CalibrationDatePickerProps {
  sessions: CalibrationSession[];
  selectedSessionIndex: number;
  onSelectSession: (index: number) => void;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalibrationDatePicker: React.FC<CalibrationDatePickerProps> = ({
  sessions,
  selectedSessionIndex,
  onSelectSession,
}) => {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const monthNames = language === 'id' ? MONTH_NAMES_ID : MONTH_NAMES_EN;
  const dayNames = language === 'id' ? DAY_NAMES_ID : DAY_NAMES_EN;

  const activeSession = sessions[selectedSessionIndex] || sessions[sessions.length - 1];

  // Helper to parse YYYY-MM-DD reliably without timezone shift
  const parseDateParts = (dateStr: string) => {
    if (!dateStr) return { year: new Date().getFullYear(), month: new Date().getMonth(), day: new Date().getDate() };
    const dateOnly = dateStr.split('T')[0].split(' ')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10) - 1, // 0-indexed
        day: parseInt(parts[2], 10),
      };
    }
    const d = new Date(dateStr);
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  };

  const activeParts = parseDateParts(activeSession?.calibration_date);

  // Calendar view state (which month/year is currently being viewed)
  const [viewYear, setViewYear] = useState<number>(activeParts.year);
  const [viewMonth, setViewMonth] = useState<number>(activeParts.month);

  // Sync view when activeSession changes externally
  useEffect(() => {
    if (activeSession?.calibration_date) {
      const parts = parseDateParts(activeSession.calibration_date);
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
  }, [activeSession?.calibration_date]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format date for button display: e.g. "15 Feb 2026 • 10:32 WIB"
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return t.datePicker.selectDate;
    const parts = parseDateParts(dateStr);
    const monthShort = monthNames[parts.month]?.slice(0, 3) || '';
    const timeMatch = dateStr.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
    const timePart = timeMatch ? ` • ${timeMatch[1]} WIB` : '';
    return `${parts.day} ${monthShort} ${parts.year}${timePart}`;
  };

  const isLatestSession = selectedSessionIndex === sessions.length - 1;

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Jump directly to a session's month and select it
  const handleJumpToSession = (index: number) => {
    const session = sessions[index];
    if (session) {
      const parts = parseDateParts(session.calibration_date);
      setViewYear(parts.year);
      setViewMonth(parts.month);
      onSelectSession(index);
    }
  };

  // Build calendar matrix
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Create lookup for calibration sessions by date string YYYY-MM-DD
  const sessionsByDate: Record<string, { index: number; session: CalibrationSession }> = {};
  sessions.forEach((s, idx) => {
    if (s.calibration_date) {
      const dateKey = s.calibration_date.split('T')[0].split(' ')[0];
      sessionsByDate[dateKey] = { index: idx, session: s };
    }
  });

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* ── DATE BUTTON TRIGGER ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border shadow-xs ${
          isOpen
            ? 'bg-[#E8F4F0] border-[#357F6B] text-[#192E27] ring-2 ring-[#357F6B]/20'
            : 'bg-white border-[#E4EFEA] text-[#192E27] hover:border-[#357F6B]/50 hover:bg-[#F4F7F6]'
        }`}
        title="Klik untuk membuka kalender tanggal kalibrasi"
      >
        <div className="w-5 h-5 rounded-lg bg-[#E8F4F0] text-[#357F6B] flex items-center justify-center shrink-0">
          <CalendarIcon className="w-3.5 h-3.5" />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#769188] font-sans font-semibold uppercase tracking-wider">
            {t.datePicker.dateLabel}:
          </span>
          <span className="text-xs font-bold text-[#192E27]">
            {formatDisplayDate(activeSession?.calibration_date)}
          </span>
        </div>

        {isLatestSession && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-sans uppercase font-extrabold bg-[#E8F4F0] text-[#357F6B] border border-[#357F6B]/20">
            {t.datePicker.latest}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#769188] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#357F6B]' : ''
          }`}
        />
      </button>

      {/* ── CALENDAR DROPDOWN POPOVER ── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-[#D5E5DF] p-4 text-[#192E27] animate-fade-in">
          {/* Header Popover: Month & Year Navigator */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E4EFEA]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#192E27]">
                {monthNames[viewMonth]} {viewYear}
              </span>
              <span className="text-[10px] font-mono font-bold bg-[#E8F4F0] text-[#357F6B] px-2 py-0.5 rounded-full">
                {sessions.length} {t.datePicker.recordedSessions}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#769188] hover:text-[#192E27] hover:bg-[#E8F4F0] transition"
                title={t.datePicker.prevMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#769188] hover:text-[#192E27] hover:bg-[#E8F4F0] transition"
                title={t.datePicker.nextMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Jump Chips for Recorded Calibration Sessions */}
          {sessions.length > 1 && (
            <div className="py-2.5 border-b border-[#E4EFEA]">
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#769188] uppercase tracking-wider mb-1.5">
                <span>{t.datePicker.quickJump}:</span>
                <span className="text-[#357F6B] font-mono">{sessions.length} {t.datePicker.datesCount}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sessions.map((s, idx) => {
                  const isCurrent = idx === selectedSessionIndex;
                  const isLatest = idx === sessions.length - 1;
                  return (
                    <button
                      key={s.calibration_id || idx}
                      type="button"
                      onClick={() => handleJumpToSession(idx)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-[#357F6B] text-white shadow-xs'
                          : 'bg-[#F4F7F6] text-[#192E27] hover:bg-[#E8F4F0] border border-[#E4EFEA]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-[#357F6B]'}`} />
                      <span>{s.calibration_date}</span>
                      {isLatest && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase font-extrabold ${
                          isCurrent ? 'bg-white/20 text-white' : 'bg-[#E8F4F0] text-[#357F6B]'
                        }`}>
                          {t.datePicker.latest}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#769188] uppercase tracking-wider pt-2.5 pb-1">
            {dayNames.map((dayName, dIdx) => (
              <div key={dayName} className={dIdx === 0 ? 'text-rose-500' : ''}>
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Previous month padding days */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => {
              const prevDate = daysInPrevMonth - firstDayOfMonth + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  className="h-8 flex items-center justify-center text-[#A3B8B0]/50 text-[11px] font-mono select-none"
                >
                  {prevDate}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const sessionInfo = sessionsByDate[dateStr];
              const isMarked = !!sessionInfo;
              const isSelected = sessionInfo && sessionInfo.index === selectedSessionIndex;

              if (isMarked) {
                // MARKED CALIBRATION DATE (TEPAT TANGGAL KALIBRASI DIMARK)
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      onSelectSession(sessionInfo.index);
                      // keep open or close, allow operator to see mark
                    }}
                    className={`h-8 rounded-lg font-mono font-bold text-xs relative flex flex-col items-center justify-center transition-all group ${
                      isSelected
                        ? 'bg-[#357F6B] text-white shadow-sm ring-2 ring-[#357F6B] ring-offset-1 font-black'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-400 hover:bg-emerald-100 hover:border-emerald-600'
                    }`}
                    title={`${t.datePicker.sessionHover}: ${dateStr} (${t.datePicker.clickToDisplay})`}
                  >
                    <span>{day}</span>
                    {/* Visual dot marker on the date */}
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? 'bg-amber-300' : 'bg-[#357F6B]'
                      }`}
                    />

                    {/* Popover Hover tooltip badge */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none whitespace-nowrap">
                      <div className="bg-[#0D1513] text-white text-[10px] font-sans px-2 py-1 rounded-md shadow-lg border border-[#1B2925]">
                        <span className="text-emerald-400 font-bold">● {t.datePicker.sessionHover}</span>: {dateStr}
                      </div>
                      <div className="w-1.5 h-1.5 bg-[#0D1513] rotate-45 -mt-0.5" />
                    </div>
                  </button>
                );
              }

              // Normal days without calibration
              return (
                <div
                  key={dateStr}
                  className="h-8 rounded-lg flex items-center justify-center text-[#769188] hover:text-[#192E27] hover:bg-[#F4F7F6] text-[11px] font-mono transition"
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend & Selected Session Details */}
          <div className="mt-3 pt-3 border-t border-[#E4EFEA] space-y-2">
            {/* Active Session Info Snippet */}
            {activeSession && (
              <div className="p-2.5 rounded-xl bg-[#F4F7F6] border border-[#E4EFEA] text-[11px] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#769188] font-bold uppercase tracking-wider">
                    {t.datePicker.activeSession}:
                  </div>
                  <div className="font-mono font-bold text-[#192E27] mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#357F6B]" />
                    <span>{activeSession.calibration_date}</span>
                    <span className="text-[10px] text-[#769188] font-sans font-normal">
                      ({activeSession.technician_name || t.datePicker.leadTech})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                    activeSession.as_found_status === 'Pass'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {activeSession.as_found_status || 'PASS'}
                  </span>
                </div>
              </div>
            )}

            {/* Visual Legend */}
            <div className="flex items-center justify-between text-[10px] text-[#769188] pt-1 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-50 border border-emerald-400 flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-[#357F6B]" />
                </span>
                <span>{t.datePicker.calibratedDateLegend}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#357F6B] flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-amber-300" />
                </span>
                <span>{t.datePicker.selectedSessionLegend}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
