"use client";
import { useState, useEffect, useCallback } from "react";
import { format, parseISO, addHours } from "date-fns";
import { X, Trash2, MapPin, Clock, AlignLeft, Loader2, Tag } from "lucide-react";
import { useCalendarStore } from "@/lib/store";
import { api } from "@/lib/api";
import { CalendarEvent, EVENT_COLORS } from "@/lib/types";
import { cn, hexToRgba } from "@/lib/utils";
import FileUploadPanel from "../FileAttachment/FileUploadPanel";

export default function EventModal() {
  const { selectedEvent, isEventModalOpen, modalDate, closeEventModal, addEvent, updateEvent, removeEvent } =
    useCalendarStore();

  const isNew = !selectedEvent;
  const defaultStart = modalDate || new Date();
  const defaultEnd = addHours(defaultStart, 1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState(format(defaultStart, "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(format(defaultEnd, "yyyy-MM-dd'T'HH:mm"));
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("#6366F1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedEvent, setSavedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (selectedEvent) {
      setTitle(selectedEvent.title);
      setDescription(selectedEvent.description);
      setLocation(selectedEvent.location);
      setStartTime(format(parseISO(selectedEvent.start_time), "yyyy-MM-dd'T'HH:mm"));
      setEndTime(format(parseISO(selectedEvent.end_time), "yyyy-MM-dd'T'HH:mm"));
      setAllDay(selectedEvent.all_day);
      setColor(selectedEvent.color);
      setSavedEvent(selectedEvent);
    } else {
      const s = modalDate || new Date();
      const e = addHours(s, 1);
      setTitle("");
      setDescription("");
      setLocation("");
      setStartTime(format(s, "yyyy-MM-dd'T'HH:mm"));
      setEndTime(format(e, "yyyy-MM-dd'T'HH:mm"));
      setAllDay(false);
      setColor("#6366F1");
      setSavedEvent(null);
    }
    setError("");
  }, [selectedEvent, modalDate, isEventModalOpen]);

  const handleSave = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        description,
        location,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        all_day: allDay,
        color,
      };

      if (isNew) {
        const created = await api.events.create(payload);
        addEvent(created);
        setSavedEvent(created);
      } else if (selectedEvent) {
        const updated = await api.events.update(selectedEvent.id, payload);
        updateEvent(updated);
        setSavedEvent(updated);
      }
    } catch (e: any) {
      setError(e.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    try {
      await api.events.delete(selectedEvent.id);
      removeEvent(selectedEvent.id);
      closeEventModal();
    } catch (e: any) {
      setError(e.message || "삭제에 실패했습니다.");
    }
  };

  const handleAttachmentChange = useCallback((eventId: number) => {
    api.events.get(eventId).then((updated) => {
      updateEvent(updated);
      setSavedEvent(updated);
    });
  }, [updateEvent]);

  if (!isEventModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeEventModal}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color accent bar */}
        <div className="h-1 w-full rounded-t-2xl" style={{ backgroundColor: color }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            {isNew ? "새 일정" : (selectedEvent?.calendar_source !== "local" ? "일정 보기" : "일정 편집")}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && selectedEvent?.calendar_source === "local" && (
              <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={closeEventModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6">
          {/* Title */}
          <input
            type="text"
            placeholder="제목 추가"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={selectedEvent?.calendar_source !== "local" && !isNew}
            className="w-full text-xl font-medium text-gray-900 placeholder-gray-300 border-b-2 border-gray-100 focus:border-indigo-400 outline-none pb-2 mb-4 transition-colors disabled:opacity-70"
          />

          {/* Color picker */}
          <div className="flex items-center gap-2 mb-4">
            <Tag size={15} className="text-gray-400 shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.name}
                  className={cn(
                    "w-6 h-6 rounded-full transition-transform hover:scale-110",
                    color === c.value && "ring-2 ring-offset-2 ring-gray-400 scale-110"
                  )}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setColor(c.value)}
                />
              ))}
            </div>
          </div>

          {/* All day */}
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <div
              className={cn(
                "w-10 h-5 rounded-full transition-colors relative",
                allDay ? "bg-indigo-500" : "bg-gray-200"
              )}
              onClick={() => setAllDay(!allDay)}
            >
              <div className={cn(
                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                allDay ? "translate-x-5" : "translate-x-0.5"
              )} />
            </div>
            <span className="text-sm text-gray-600">하루 종일</span>
          </label>

          {/* Time */}
          <div className="flex items-start gap-3 mb-4">
            <Clock size={15} className="text-gray-400 mt-2.5 shrink-0" />
            <div className="flex-1 space-y-2">
              {!allDay ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="flex-1 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-6">~</span>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="flex-1 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="date"
                    value={startTime.slice(0, 10)}
                    onChange={(e) => setStartTime(e.target.value + "T00:00")}
                    className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                  <input
                    type="date"
                    value={endTime.slice(0, 10)}
                    onChange={(e) => setEndTime(e.target.value + "T23:59")}
                    className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                </>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 mb-4">
            <MapPin size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="장소 추가"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 text-sm text-gray-700 placeholder-gray-300 border-b border-gray-100 focus:border-indigo-400 outline-none pb-1 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="flex items-start gap-3 mb-4">
            <AlignLeft size={15} className="text-gray-400 mt-1 shrink-0" />
            <textarea
              placeholder="메모 추가"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex-1 text-sm text-gray-700 placeholder-gray-300 border border-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* File attachments (available after event is saved) */}
          {savedEvent && (
            <FileUploadPanel
              eventId={savedEvent.id}
              attachments={savedEvent.attachments}
              onChange={() => handleAttachmentChange(savedEvent.id)}
            />
          )}

          {!savedEvent && isNew && (
            <p className="text-xs text-gray-400 text-center mt-2">
              일정을 먼저 저장한 후 파일을 첨부할 수 있습니다.
            </p>
          )}
        </div>

        {/* Footer */}
        {(isNew || selectedEvent?.calendar_source === "local") && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={closeEventModal}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: color }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isNew ? "저장" : "수정"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
