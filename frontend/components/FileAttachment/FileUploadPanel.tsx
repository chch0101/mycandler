"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Paperclip, Upload, X, FileText, Download, Loader2, BookOpen, File, ChevronDown, ChevronUp } from "lucide-react";
import { Attachment } from "@/lib/types";
import { api } from "@/lib/api";
import { formatFileSize, cn } from "@/lib/utils";

interface Props {
  eventId: number;
  attachments: Attachment[];
  onChange: () => void;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  "application/pdf": <FileText size={16} className="text-red-500" />,
  "text/plain": <File size={16} className="text-gray-500" />,
  "text/markdown": <File size={16} className="text-gray-500" />,
};

function getFileIcon(type: string) {
  return FILE_ICONS[type] || <File size={16} className="text-gray-400" />;
}

function SummaryCard({ attachment }: { attachment: Attachment }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(attachment.summary_status);
  const [summary, setSummary] = useState(attachment.summary);
  const [isPaper, setIsPaper] = useState(attachment.is_paper);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setStatus(attachment.summary_status);
    setSummary(attachment.summary);
    setIsPaper(attachment.is_paper);
  }, [attachment]);

  // Poll for summary if pending/processing
  useEffect(() => {
    if (status === "done" || status === "error") return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await api.files.getSummary(attachment.id);
        setStatus(data.summary_status as any);
        setSummary(data.summary);
        setIsPaper(data.is_paper);
        if (data.summary_status === "done" || data.summary_status === "error") {
          clearInterval(pollRef.current!);
        }
      } catch (e) {
        clearInterval(pollRef.current!);
      }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [attachment.id, status]);

  if (status === "pending" || status === "processing") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg mt-2">
        <Loader2 size={14} className="animate-spin text-amber-500 shrink-0" />
        <span className="text-xs text-amber-700">
          {status === "processing" ? "Gemma AI가 요약 중..." : "요약 대기 중..."}
        </span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="px-3 py-2 bg-red-50 rounded-lg mt-2">
        <p className="text-xs text-red-600">{summary || "요약 생성에 실패했습니다."}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-indigo-100">
      <button
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors",
          isPaper
            ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5">
          {isPaper ? <BookOpen size={12} /> : <FileText size={12} />}
          <span>{isPaper ? "기술 논문 요약" : "AI 요약"} (Gemma 4)</span>
        </div>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="px-3 py-3 bg-white">
          <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{summary}</div>
        </div>
      )}
    </div>
  );
}

export default function FileUploadPanel({ eventId, attachments, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError("");
    try {
      await api.files.upload(eventId, file);
      onChange();
    } catch (e: any) {
      setError(e.message || "업로드 실패");
    } finally {
      setUploading(false);
    }
  }, [eventId, onChange]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) await uploadFile(file);
  }, [uploadFile]);

  const handleDelete = async (id: number) => {
    if (!confirm("이 파일을 삭제하시겠습니까?")) return;
    try {
      await api.files.delete(id);
      onChange();
    } catch (e: any) {
      setError(e.message || "삭제 실패");
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip size={14} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-600">첨부파일</span>
        {attachments.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {attachments.length}
          </span>
        )}
      </div>

      {/* Dropzone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer",
          dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.txt,.md,.docx"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            for (const file of files) await uploadFile(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-indigo-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">업로드 중...</span>
          </div>
        ) : (
          <div>
            <Upload size={20} className="mx-auto text-gray-300 mb-1" />
            <p className="text-xs text-gray-400">
              PDF, TXT, MD, DOCX 파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-xs text-gray-300 mt-0.5">최대 50MB · AI 자동 요약</p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className="shrink-0">{getFileIcon(att.file_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{att.original_filename}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(att.file_size)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={api.files.downloadUrl(att.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={14} />
                  </a>
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={() => handleDelete(att.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <SummaryCard attachment={att} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
