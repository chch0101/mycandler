"use client";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Calendar as CalIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useCalendarStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import WeekView from "@/components/Calendar/WeekView";
import DayView from "@/components/Calendar/DayView";
import EventModal from "@/components/Calendar/EventModal";

export default function Home() {
  const { viewMode, setViewMode, currentDate, navigate, fetchEvents, isLoading } = useCalendarStore();

  useEffect(() => {
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getHeaderTitle() {
    if (viewMode === "day") return format(currentDate, "yyyy년 M월 d일 EEEE", { locale: ko });
    return format(currentDate, "yyyy년 M월", { locale: ko });
  }

  return (
    <div className="flex h-full bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate("prev")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => navigate("next")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              onClick={() => navigate("today")}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              오늘
            </button>
            <h2 className="text-lg font-semibold text-gray-800 ml-2">{getHeaderTitle()}</h2>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            {([
              { mode: "day" as const, icon: <CalendarDays size={15} />, label: "일" },
              { mode: "week" as const, icon: <CalIcon size={15} />, label: "주" },
            ] as const).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === mode
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          {viewMode === "week" && <WeekView />}
          {viewMode === "day" && <DayView />}
        </main>
      </div>
      <EventModal />
    </div>
  );
}
