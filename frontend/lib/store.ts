import { create } from "zustand";
import { CalendarEvent, ViewMode } from "./types";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { api } from "./api";

interface CalendarStore {
  events: CalendarEvent[];
  viewMode: ViewMode;
  currentDate: Date;
  selectedEvent: CalendarEvent | null;
  isEventModalOpen: boolean;
  modalDate: Date | null;
  isLoading: boolean;

  setViewMode: (mode: ViewMode) => void;
  setCurrentDate: (date: Date) => void;
  navigate: (direction: "prev" | "next" | "today") => void;
  selectEvent: (event: CalendarEvent | null) => void;
  openNewEventModal: (date: Date) => void;
  closeEventModal: () => void;
  fetchEvents: () => Promise<void>;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  removeEvent: (id: number) => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: [],
  viewMode: "week",
  currentDate: new Date(),
  selectedEvent: null,
  isEventModalOpen: false,
  modalDate: null,
  isLoading: false,

  setViewMode: (mode) => {
    set({ viewMode: mode });
    get().fetchEvents();
  },

  setCurrentDate: (date) => {
    set({ currentDate: date });
    get().fetchEvents();
  },

  navigate: (direction) => {
    const { currentDate, viewMode } = get();
    let newDate = currentDate;

    if (direction === "today") {
      newDate = new Date();
    } else if (viewMode === "week") {
      newDate = direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    } else if (viewMode === "day") {
      newDate = direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1);
    } else {
      const diff = direction === "next" ? 1 : -1;
      newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + diff, 1);
    }

    set({ currentDate: newDate });
    get().fetchEvents();
  },

  selectEvent: (event) => set({ selectedEvent: event, isEventModalOpen: !!event }),
  openNewEventModal: (date) => set({ modalDate: date, selectedEvent: null, isEventModalOpen: true }),
  closeEventModal: () => set({ isEventModalOpen: false, selectedEvent: null, modalDate: null }),

  fetchEvents: async () => {
    const { currentDate, viewMode } = get();
    set({ isLoading: true });
    try {
      let start: Date, end: Date;
      if (viewMode === "week") {
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
      } else if (viewMode === "day") {
        start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
      } else {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      }

      const events = await api.events.list(
        start.toISOString(),
        end.toISOString()
      );
      set({ events });
    } catch (e) {
      console.error("Failed to fetch events:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  updateEvent: (event) =>
    set((s) => ({ events: s.events.map((e) => (e.id === event.id ? event : e)) })),
  removeEvent: (id) =>
    set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
}));
