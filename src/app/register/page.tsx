"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth, useSettings } from "@/components/AuthProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { t, language } = useSettings();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(BACKEND_URL + "/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          display_name: displayName || username,
          password,
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || (language === "id" ? "Registrasi gagal" : "Registration failed"));
      }

      document.cookie = "session_token=true; path=/; max-age=31536000; SameSite=Lax";

      await refreshUser();
      router.push("/my-plots");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (language === "id" ? "Terjadi kesalahan" : "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#292524] flex flex-col items-center justify-center relative overflow-hidden px-4 font-sans selection:bg-[#616c39]/15">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-[#616c39]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-[#e7e5e4]/50 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white border border-[#e7e5e4] rounded-3xl p-8 shadow-sm relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-3">
            <Image src="/logo-wordmark.png" alt="Vora Logo" width={140} height={36} className="h-6 w-auto mx-auto" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[#292524]">
            {t("auth.registerTitle")}
          </h1>
          <p className="text-xs text-[#79716b] mt-1.5 leading-relaxed">
            {t("auth.registerSub")}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-6 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#79716b]">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="forestry_researcher"
              className="bg-[#fafaf9] border border-[#e7e5e4] focus:border-[#616c39] rounded-xl px-4 py-3 text-sm text-[#292524] placeholder-[#a8a29e] focus:outline-none focus:ring-4 focus:ring-[#616c39]/10 transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#79716b]">
              {t("auth.name")}
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Dr. Jane Forester"
              className="bg-[#fafaf9] border border-[#e7e5e4] focus:border-[#616c39] rounded-xl px-4 py-3 text-sm text-[#292524] placeholder-[#a8a29e] focus:outline-none focus:ring-4 focus:ring-[#616c39]/10 transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#79716b]">
              {t("auth.password")}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-[#fafaf9] border border-[#e7e5e4] focus:border-[#616c39] rounded-xl px-4 py-3 text-sm text-[#292524] placeholder-[#a8a29e] focus:outline-none focus:ring-4 focus:ring-[#616c39]/10 transition-all w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#616c39] hover:bg-[#4e572c] disabled:bg-[#616c39]/50 text-white font-semibold text-sm rounded-xl py-3.5 shadow-sm active:scale-[0.98] transition-all mt-3 flex items-center justify-center gap-2 select-none cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              t("auth.registerBtn")
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#e7e5e4] text-center">
          <p className="text-xs text-[#79716b]">
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="text-[#616c39] hover:underline font-semibold">
              {t("auth.loginBtn")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
