"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("처리 중...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      setStatus("인증 정보가 없습니다.");
      setTimeout(() => router.push("/"), 2000);
      return;
    }

    const redirect = window.location.origin + "/auth/google/callback";
    api.sync.googleCallback(code, state, redirect)
      .then(() => {
        setStatus("Google Calendar 연결 완료!");
        setTimeout(() => router.push("/"), 1500);
      })
      .catch((e) => {
        setStatus(`연결 실패: ${e.message}`);
        setTimeout(() => router.push("/"), 3000);
      });
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">{status}</p>
      </div>
    </div>
  );
}
