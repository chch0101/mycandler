"use client";
import { useRef, useEffect } from "react";
import { format, isSameDay, isToday, parseISO, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { useCalendarStore } from "@/lib/store";
import { CalendarEvent } from "@/lib/types";
import { getEventPosition, hexToRgba, cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64;

export default function DayView() {
  const { currentDate, events, selectEvent, openNewEventModal } = useCalendarStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (new Date().getHours() - 2) * HOUR_HEIGHT);
    }
  }, []);

  const dayEvents = events.filter(
    (e) => !e.all_day && isSameDay(parseISO(e.start_time), currentDate)
  );
  const allDayEvents = events.filter(
    (e) => e.all_day && isSameDay(parseISO(e.start_time), currentDate)
  );
  const dayStart = startOfDay(currentDate);
  const today = isToday(currentDate);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex border-b border-gray-100 py-4 px-6">
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wider">
            {format(currentDate, "EEEE", { locale: ko })}
          </p>
          <div className={cn(
            "flex items-center gap-3 mt-1",
          )}>
            <span className={cn(
              "text-4xl font-bold",
              today ? "text-indigo-600" : "text-gray-900"
            )}>
              {format(currentDate, "d")}
            </span>
            <span className="text-lg text-gray-500">
              {format(currentDate, "yyyy년 M월", { locale: ko })}
            </span>
          </div>
          {allDayEvents.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {allDayEvents.map((e) => (
                <span
                  key={e.id}
                  className="text-xs px-3 py-1 rounded-full font-medium cursor-pointer"
                  style={{ backgroundColor: hexToRgba(e.color, 0.15), color: e.color }}
                  onClick={() => selectEvent(e)}
                >
                  {e.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: `${HOUR_HEIGHT * 24}px` }}>
          <div className="w-16 shrink-0 relative">
            {HOURS.map((h) => (
              <div key={h} style={{ height: `${HOUR_HEIGHT}px` }} className="relative">
                <span className="absolute -top-2.5 right-3 text-xs text-gray-400">
                  {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
          </div>

          <div className={cn("flex-1 relative border-l border-gray-100", today && "bg-indigo-50/20")}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full border-t border-gray-100 cursor-pointer hover:bg-indigo-50/50 transition-colors"
                style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const minute = Math.floor(((e.clientY - rect.top) / HOUR_HEIGHT) * 60);
                  const d = new Date(currentDate);
                  d.setHours(h, minute, 0, 0);
                  openNewEventModal(d);
                }}
              />
            ))}

            {today && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 60 * HOUR_HEIGHT}px` }}
              >
                <div className="relative flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                  <div className="flex-1 h-px bg-red-500" />
                </div>
              </div>
            )}

            {dayEvents.map((event) => {
              const { top, height } = getEventPosition(event, dayStart);
              return (
                <div
                  key={event.id}
                  className="absolute left-2 right-2 rounded-lg cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    backgroundColor: hexToRgba(event.color, 0.12),
                    borderLeft: `4px solid ${event.color}`,
                  }}
                  onClick={() => selectEvent(event)}
                >
                  <div className="px-3 py-2">
                    <p className="font-semibold text-sm" style={{ color: event.color }}>
                      {event.title}
                    </p>
                    {height >= 50 && (
                      <p className="text-xs mt-0.5" style={{ color: event.color, opacity: 0.7 }}>
                        {format(parseISO(event.start_time), "HH:mm")} – {format(parseISO(event.end_time), "HH:mm")}
                      </p>
                    )}
                    {height >= 80 && event.description && (
                      <p className="text-xs mt-1 text-gray-500 line-clamp-2">{event.description}</p>
                    )}
                    {event.attachments.length > 0 && (
                      <span className="text-xs mt-1 inline-flex items-center gap-1" style={{ color: event.color, opacity: 0.8 }}>
                        📎 {event.attachments.length}개 첨부파일
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
