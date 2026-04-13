import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarEvent } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKo(date: Date | string, fmt: string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: ko });
}

export function getEventPosition(event: CalendarEvent, dayStart: Date) {
  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);

  const startMinutes = differenceInMinutes(start, dayStart);
  const durationMinutes = Math.max(differenceInMinutes(end, start), 30);

  // Each hour = 60px
  const topPx = (startMinutes / 60) * 60;
  const heightPx = Math.max((durationMinutes / 60) * 60, 28);

  return { top: topPx, height: heightPx };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
