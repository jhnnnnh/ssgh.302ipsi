"use client";

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getMonthGridCells, toDateString } from "@/lib/calendar-grid";
import { EVENT_TYPE_DEFAULT_COLOR, EVENT_TYPE_LABELS, weekdayLabelClass } from "@/lib/calendar-constants";
import { WEEKDAY_KR } from "@/lib/time";
import type { CalendarEventType } from "@/lib/database.types";
import type { ResolvedCalendarEvent } from "@/lib/hooks/useCalendarEvents";

const MAX_BADGES_PER_DAY = 2;

export function CalendarGrid({
  events,
  onImport,
  importing,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  canManageEvent,
  showStudentName,
}: {
  events: ResolvedCalendarEvent[];
  onImport: () => void;
  importing: boolean;
  onAddEvent: (defaultDate?: string) => void;
  onEditEvent: (event: ResolvedCalendarEvent) => void;
  onDeleteEvent: (event: ResolvedCalendarEvent) => void;
  canManageEvent: (event: ResolvedCalendarEvent) => boolean;
  /** 교사 화면처럼 "(학생이름) (제목)" 형태로 표시할지 여부. */
  showStudentName?: boolean;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(toDateString(today));

  const cells = useMemo(() => getMonthGridCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ResolvedCalendarEvent[]>();
    for (const ev of events) {
      if (!ev.resolvedDate) continue;
      const list = map.get(ev.resolvedDate) ?? [];
      list.push(ev);
      map.set(ev.resolvedDate, list);
    }
    return map;
  }, [events]);

  function goPrevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const todayStr = toDateString(today);

  function displayTitle(ev: ResolvedCalendarEvent) {
    return showStudentName && ev.studentName ? `${ev.studentName} ${ev.resolvedTitle}` : ev.resolvedTitle;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevMonth}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-bold text-slate-900 w-28 text-center">
            {viewYear}년 {viewMonth}월
          </h3>
          <button
            onClick={goNextMonth}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onImport}
            disabled={importing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{importing ? "불러오는 중..." : "원서 일정 불러오기"}</span>
          </button>
          <button
            onClick={() => onAddEvent(selectedDate)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>일정 추가</span>
          </button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_KR.map((label, i) => (
            <div
              key={label}
              className={cn("text-center text-[11px] font-bold py-1.5", weekdayLabelClass(i))}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const dayEvents = eventsByDate.get(cell.dateStr) ?? [];
            const isSelected = cell.dateStr === selectedDate;
            const isToday = cell.dateStr === todayStr;
            return (
              <div
                key={cell.dateStr}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDate(cell.dateStr)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedDate(cell.dateStr);
                }}
                className={cn(
                  "min-h-[72px] sm:min-h-[84px] rounded-xl border p-1.5 text-left align-top transition flex flex-col gap-1 cursor-pointer",
                  isSelected
                    ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/40"
                    : "border-slate-100 hover:border-slate-300",
                  !cell.inMonth && "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0",
                    isToday ? "bg-indigo-600 text-white" : weekdayLabelClass(cell.dayOfWeek),
                  )}
                >
                  {cell.day}
                </span>
                <div className="space-y-0.5 min-w-0">
                  {dayEvents.slice(0, MAX_BADGES_PER_DAY).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(cell.dateStr);
                        if (canManageEvent(ev)) onEditEvent(ev);
                      }}
                      className="text-[9px] sm:text-[10px] font-bold text-white px-1.5 py-0.5 rounded truncate"
                      style={{ backgroundColor: ev.color }}
                    >
                      {displayTitle(ev)}
                    </div>
                  ))}
                  {dayEvents.length > MAX_BADGES_PER_DAY && (
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 px-1.5">
                      +{dayEvents.length - MAX_BADGES_PER_DAY}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Legend />

      <div className="border-t border-slate-100 pt-4">
        <h4 className="text-xs font-bold text-slate-700 mb-2">{selectedDate} 일정</h4>
        {selectedEvents.length === 0 ? (
          <p className="text-[11px] text-slate-400">등록된 일정이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {selectedEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ev.color }}
                />
                <span className="text-xs font-bold text-slate-800 truncate flex-1">
                  {displayTitle(ev)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {EVENT_TYPE_LABELS[ev.type]}
                </span>
                {canManageEvent(ev) && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditEvent(ev)}
                      className="w-6 h-6 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {ev.type !== "wonseo_linked" && (
                      <button
                        onClick={() => onDeleteEvent(ev)}
                        className="w-6 h-6 rounded-lg hover:bg-rose-100 text-rose-500 flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const LEGEND_TYPES: CalendarEventType[] = ["wonseo_linked", "personal", "class", "grade"];

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-slate-500">
      {LEGEND_TYPES.map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: EVENT_TYPE_DEFAULT_COLOR[t] }}
          />
          {EVENT_TYPE_LABELS[t]}
        </span>
      ))}
    </div>
  );
}
