import { CalendarEvent, Attachment, CalendarSync } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API 오류가 발생했습니다.");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  events: {
    list: (start?: string, end?: string) => {
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      return request<CalendarEvent[]>(`/api/events?${params}`);
    },
    get: (id: number) => request<CalendarEvent>(`/api/events/${id}`),
    create: (data: Partial<CalendarEvent>) =>
      request<CalendarEvent>("/api/events", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<CalendarEvent>) =>
      request<CalendarEvent>(`/api/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/api/events/${id}`, { method: "DELETE" }),
  },

  files: {
    upload: async (eventId: number, file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE_URL}/api/files/${eventId}/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "업로드 실패");
      }
      return res.json();
    },
    getSummary: (id: number) => request<{
      id: number;
      summary: string;
      summary_status: string;
      is_paper: boolean;
      original_filename: string;
    }>(`/api/files/${id}/summary`),
    delete: (id: number) => request<void>(`/api/files/${id}`, { method: "DELETE" }),
    downloadUrl: (id: number) => `${BASE_URL}/api/files/${id}/download`,
  },

  sync: {
    list: () => request<CalendarSync[]>("/api/sync/list"),
    googleAuthUrl: (redirect_uri: string) =>
      request<{ auth_url: string; state: string }>(
        `/api/sync/google/auth-url?redirect_uri=${encodeURIComponent(redirect_uri)}`
      ),
    googleCallback: (code: string, state: string, redirect_uri: string) =>
      request<{ id: number; message: string }>("/api/sync/google/callback", {
        method: "POST",
        body: JSON.stringify({ code, state, redirect_uri }),
      }),
    appleConnect: (data: { server_url: string; username: string; password: string; name: string }) =>
      request<{ id: number; message: string }>("/api/sync/apple/connect", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    runSync: (sync_id: number) =>
      request<{ message: string; total: number; imported: number }>("/api/sync/run", {
        method: "POST",
        body: JSON.stringify({ sync_id }),
      }),
    delete: (id: number) => request<void>(`/api/sync/${id}`, { method: "DELETE" }),
  },
};
