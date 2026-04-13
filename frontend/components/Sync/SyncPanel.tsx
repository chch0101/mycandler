"use client";
import { useState, useEffect } from "react";
import { X, Globe, Apple, Loader2, Trash2, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { CalendarSync } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

type Tab = "list" | "google" | "apple";

export default function SyncPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("list");
  const [syncs, setSyncs] = useState<CalendarSync[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Apple form
  const [appleUser, setAppleUser] = useState("");
  const [applePass, setApplePass] = useState("");
  const [appleUrl, setAppleUrl] = useState("https://caldav.icloud.com");
  const [appleName, setAppleName] = useState("Apple Calendar");

  useEffect(() => {
    loadSyncs();
  }, []);

  // Handle Google OAuth callback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      handleGoogleCallback(code, state);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function loadSyncs() {
    try {
      const data = await api.sync.list();
      setSyncs(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleGoogleCallback(code: string, state: string) {
    setLoading(true);
    try {
      const result = await api.sync.googleCallback(code, state, window.location.origin + "/auth/google/callback");
      setMessage({ text: result.message, type: "success" });
      await loadSyncs();
      setTab("list");
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function connectGoogle() {
    setLoading(true);
    try {
      const redirect = window.location.origin + "/auth/google/callback";
      const data = await api.sync.googleAuthUrl(redirect);
      if ("error" in data) {
        setMessage({ text: (data as any).error, type: "error" });
        return;
      }
      window.location.href = data.auth_url;
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
      setLoading(false);
    }
  }

  async function connectApple() {
    if (!appleUser || !applePass) {
      setMessage({ text: "Apple ID와 앱 비밀번호를 입력해주세요.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const result = await api.sync.appleConnect({
        server_url: appleUrl,
        username: appleUser,
        password: applePass,
        name: appleName,
      });
      setMessage({ text: result.message, type: "success" });
      await loadSyncs();
      setTab("list");
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function syncNow(id: number) {
    setLoading(true);
    try {
      const result = await api.sync.runSync(id);
      setMessage({ text: result.message, type: "success" });
      await loadSyncs();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function deleteSync(id: number) {
    if (!confirm("이 연동을 삭제하시겠습니까?")) return;
    try {
      await api.sync.delete(id);
      await loadSyncs();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">캘린더 연동</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(["list", "google", "apple"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors",
                tab === t ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t === "list" ? "연동 목록" : t === "google" ? "Google" : "Apple"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {message && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg mb-4 text-sm",
              message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            )}>
              {message.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {message.text}
            </div>
          )}

          {tab === "list" && (
            <div>
              {syncs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="text-gray-500 text-sm">연동된 캘린더가 없습니다.</p>
                  <p className="text-gray-400 text-xs mt-1">Google 또는 Apple 탭에서 추가해주세요.</p>
                  <div className="flex gap-2 mt-4 justify-center">
                    <button
                      onClick={() => setTab("google")}
                      className="px-4 py-2 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Google 연동
                    </button>
                    <button
                      onClick={() => setTab("apple")}
                      className="px-4 py-2 bg-gray-50 text-gray-700 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Apple 연동
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {syncs.map((sync) => (
                    <div key={sync.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                        sync.type === "google" ? "bg-blue-100" : "bg-gray-200"
                      )}>
                        {sync.type === "google"
                          ? <Globe size={18} className="text-blue-600" />
                          : <Apple size={18} className="text-gray-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{sync.name}</p>
                        <p className="text-xs text-gray-400">
                          {sync.last_synced
                            ? `마지막 동기화: ${new Date(sync.last_synced).toLocaleString("ko-KR")}`
                            : "아직 동기화 안 됨"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => syncNow(sync.id)}
                          disabled={loading}
                          className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="지금 동기화"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => deleteSync(sync.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="연동 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "google" && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Globe size={24} className="text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-800">Google Calendar</p>
                    <p className="text-xs text-gray-500">OAuth2를 통해 안전하게 연동</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  연동 전에 <code className="bg-white px-1 rounded">backend/google_credentials.json</code> 파일이 필요합니다.
                  Google Cloud Console에서 OAuth2 클라이언트 ID를 만들고 다운로드하세요.
                </p>
              </div>
              <button
                onClick={connectGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                Google 계정으로 연결
              </button>
            </div>
          )}

          {tab === "apple" && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Apple size={22} className="text-gray-700" />
                  <div>
                    <p className="font-semibold text-gray-800">Apple Calendar (iCloud)</p>
                    <p className="text-xs text-gray-500">CalDAV 프로토콜 사용</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Apple ID 비밀번호 대신 <strong>앱 전용 비밀번호</strong>를 사용하세요.
                  appleid.apple.com → 보안 → 앱 전용 비밀번호
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Apple ID (이메일)</label>
                  <input
                    type="email"
                    value={appleUser}
                    onChange={(e) => setAppleUser(e.target.value)}
                    placeholder="example@icloud.com"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">앱 전용 비밀번호</label>
                  <input
                    type="password"
                    value={applePass}
                    onChange={(e) => setApplePass(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">서버 URL</label>
                  <input
                    type="text"
                    value={appleUrl}
                    onChange={(e) => setAppleUrl(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <button
                onClick={connectApple}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Apple size={16} />}
                Apple Calendar 연결
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
