export interface Attachment {
  id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  is_paper: boolean;
  summary: string;
  summary_status: "pending" | "processing" | "done" | "error";
  created_at: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  location: string;
  calendar_source: "local" | "google" | "apple";
  external_id?: string;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
}

export interface CalendarSync {
  id: number;
  type: "google" | "apple";
  name: string;
  is_active: boolean;
  last_synced?: string;
}

export type ViewMode = "week" | "day" | "month";

export const EVENT_COLORS = [
  { name: "인디고", value: "#6366F1" },
  { name: "파랑", value: "#3B82F6" },
  { name: "하늘", value: "#0EA5E9" },
  { name: "초록", value: "#10B981" },
  { name: "노랑", value: "#F59E0B" },
  { name: "주황", value: "#F97316" },
  { name: "빨강", value: "#EF4444" },
  { name: "분홍", value: "#EC4899" },
  { name: "보라", value: "#8B5CF6" },
  { name: "회색", value: "#6B7280" },
];
