"use client";
import { useState } from "react";
import { Plus, Calendar, Settings, RefreshCw, Loader2 } from "lucide-react";
import { useCalendarStore } from "@/lib/store";
import { api } from "@/lib/api";
import MiniCalendar from "./MiniCalendar";
import SyncPanel from "../Sync/SyncPanel";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const { openNewEventModal, fetchEvents } = useCalendarStore();
  const [syncing, setSyncing] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const syncs = await api.sync.list();
      if (syncs.length === 0) {
        setSyncMessage("연동된 캘린더가 없습니다.");
        setShowSync(true);
        return;
      }
      let total = 0;
      for (const sync of syncs) {
        const result = await api.sync.runSync(sync.id);
        total += result.imported;
      }
      setSyncMessage(`동기화 완료: ${total}개 가져옴`);
      await fetchEvents();
    } catch (e: any) {
      setSyncMessage(e.message || "동기화 실패");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(""), 4000);
    }
  };

  return (
    <aside className="w-64 bg-[#1a1d2e] flex flex-col h-full shrink-0 select-none">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Calendar size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">MyCandler</h1>
            <p className="text-gray-500 text-[10px] mt-0.5">나만의 캘린더</p>
          </div>
        </div>
      </div>

      {/* New event button */}
      <div className="px-4 mb-4">
        <button
          onClick={() => openNewEventModal(new Date())}
          className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          새 일정 만들기
        </button>
      </div>

      {/* Mini calendar */}
      <div className="mx-2 mb-2 rounded-xl bg-white/5">
        <MiniCalendar />
      </div>

      {/* Sync status message */}
      {syncMessage && (
        <div className="mx-3 px-3 py-2 bg-indigo-900/50 rounded-lg">
          <p className="text-xs text-indigo-300">{syncMessage}</p>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom actions */}
      <div className="px-3 pb-5 space-y-1">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm"
        >
          {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          캘린더 동기화
        </button>
        <button
          onClick={() => setShowSync(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm"
        >
          <Settings size={15} />
          연동 설정
        </button>
      </div>

      {showSync && <SyncPanel onClose={() => setShowSync(false)} />}
    </aside>
  );
}
