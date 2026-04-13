"use client";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, isToday, addMonths, subMonths
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useCalendarStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function MiniCalendar() {
  const { currentDate, setCurrentDate, events } = useCalendarStore();
  const [miniDate, setMiniDate] = useState(() => new Date(currentDate));

  const monthStart = startOfMonth(miniDate);
  const monthEnd = endOfMonth(miniDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventDates = new Set(
    events.map((e) => format(new Date(e.start_time), "yyyy-MM-dd"))
  );

  return (
    <div className="px-3 py-2">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          onClick={() => setMiniDate(subMonths(miniDate, 1))}
        >
          <ChevronLeft size={14} className="text-gray-400" />
        </button>
        <button
          className="text-sm font-semibold text-gray-200 hover:text-white transition-colors"
          onClick={() => { setMiniDate(new Date()); setCurrentDate(new Date()); }}
        >
          {format(miniDate, "yyyy년 M월", { locale: ko })}
        </button>
        <button
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          onClick={() => setMiniDate(addMonths(miniDate, 1))}
        >
          <ChevronRight size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="text-center text-[10px] text-gray-500 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, miniDate);
          const isSelected = isSameDay(day, currentDate);
          const today = isToday(day);
          const hasEvents = eventDates.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => {
                setCurrentDate(day);
                setMiniDate(day);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center w-7 h-7 mx-auto rounded-full text-[11px] transition-all",
                !isCurrentMonth && "opacity-30",
                isSelected && "bg-indigo-600 text-white font-semibold",
                today && !isSelected && "text-indigo-400 font-semibold",
                !isSelected && !today && isCurrentMonth && "text-gray-300 hover:bg-white/10",
              )}
            >
              {format(day, "d")}
              {hasEvents && !isSelected && (
                <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-400 opacity-70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
