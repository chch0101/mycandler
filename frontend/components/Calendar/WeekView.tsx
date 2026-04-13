"use client";
import { useRef, useEffect } from "react";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday,
  parseISO, startOfDay
} from "date-fns";
import { ko } from "date-fns/locale";
import { useCalendarStore } from "@/lib/store";
import { CalendarEvent } from "@/lib/types";
import { getEventPosition, hexToRgba, cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // px per hour

interface EventBlockProps {
  event: CalendarEvent;
  dayStart: Date;
  onClick: () => void;
}

function EventBlock({ event, dayStart, onClick }: EventBlockProps) {
  const { top, height } = getEventPosition(event, dayStart);
  const bg = hexToRgba(event.color, 0.15);
  const border = event.color;

  return (
    <div
      className="absolute left-1 right-1 rounded-md cursor-pointer overflow-hidden group transition-all duration-150 hover:shadow-md hover:z-10"
      style={{ top: `${top}px`, height: `${height}px`, backgroundColor: bg, borderLeft: `3px solid ${border}` }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="px-2 py-1">
        <p className="text-xs font-semibold truncate" style={{ color: border }}>
          {event.title}
        </p>
        {height >= 44 && (
          <p className="text-xs truncate" style={{ color: border, opacity: 0.75 }}>
            {format(parseISO(event.start_time), "HH:mm")} – {format(parseISO(event.end_time), "HH:mm")}
          </p>
        )}
        {event.attachments.length > 0 && (
          <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-60" style={{ color: border }} />
        )}
      </div>
    </div>
  );
}

interface AllDayEventProps {
  event: CalendarEvent;
  onClick: () => void;
}

function AllDayEvent({ event, onClick }: AllDayEventProps) {
  return (
    <div
      className="text-xs px-2 py-0.5 rounded-full cursor-pointer truncate mb-0.5 font-medium"
      style={{ backgroundColor: hexToRgba(event.color, 0.2), color: event.color, border: `1px solid ${hexToRgba(event.color, 0.4)}` }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {event.title}
    </div>
  );
}

export default function WeekView() {
  const { currentDate, events, selectEvent, openNewEventModal } = useCalendarStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current) {
      const hour = new Date().getHours();
      scrollRef.current.scrollTop = Math.max(0, (hour - 2) * HOUR_HEIGHT);
    }
  }, []);

  const timedEvents = events.filter((e) => !e.all_day);
  const allDayEvents = events.filter((e) => e.all_day);

  function getEventsForDay(day: Date) {
    return timedEvents.filter((e) => isSameDay(parseISO(e.start_time), day));
  }

  function getAllDayForDay(day: Date) {
    return allDayEvents.filter((e) => isSameDay(parseISO(e.start_time), day));
  }

  function handleGridClick(day: Date, hourIndex: number, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const yOffset = e.clientY - rect.top;
    const minute = Math.floor((yOffset / HOUR_HEIGHT) * 60);
    const clickedDate = new Date(day);
    clickedDate.setHours(hourIndex, minute, 0, 0);
    openNewEventModal(clickedDate);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header row */}
      <div className="flex border-b border-gray-100">
        <div className="w-14 shrink-0" />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className="flex-1 text-center py-3 border-l border-gray-100 first:border-l-0">
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                {format(day, "EEE", { locale: ko })}
              </p>
              <div className={cn(
                "mx-auto mt-1 w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold",
                today ? "bg-indigo-600 text-white" : "text-gray-800"
              )}>
                {format(day, "d")}
              </div>
              {/* All-day events */}
              <div className="px-1 mt-1 min-h-[20px]">
                {getAllDayForDay(day).map((e) => (
                  <AllDayEvent key={e.id} event={e} onClick={() => selectEvent(e)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ minHeight: `${HOUR_HEIGHT * 24}px` }}>
          {/* Time labels */}
          <div className="w-14 shrink-0 relative">
            {HOURS.map((h) => (
              <div key={h} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                <span className="absolute -top-2.5 right-2 text-xs text-gray-400 select-none">
                  {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayStart = startOfDay(day);
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);

            return (
              <div key={day.toISOString()} className={cn(
                "flex-1 relative border-l border-gray-100",
                today && "bg-indigo-50/30"
              )}>
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-gray-100 cursor-pointer hover:bg-indigo-50/40 transition-colors"
                    style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    onClick={(e) => handleGridClick(day, h, e)}
                  />
                ))}

                {/* Half-hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={`half-${h}`}
                    className="absolute w-full border-t border-gray-50 border-dashed pointer-events-none"
                    style={{ top: `${h * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                  />
                ))}

                {/* Current time indicator */}
                {today && <CurrentTimeIndicator />}

                {/* Events */}
                {dayEvents.map((event) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    dayStart={dayStart}
                    onClick={() => selectEvent(event)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator() {
  const now = new Date();
  const top = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT;

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
      <div className="relative flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
        <div className="flex-1 h-px bg-red-500" />
      </div>
    </div>
  );
}
