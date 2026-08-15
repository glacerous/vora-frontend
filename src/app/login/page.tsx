"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth, useSettings } from "@/components/AuthProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/my-plots";
  const { user, refreshUser } = useAuth();
  const { t, language } = useSettings();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect directly.
  useEffect(() => {
    if (user) {
      router.push(redirectPath);
    }
  }, [user, redirectPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(BACKEND_URL + "/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || (language === "id" ? "Nama pengguna atau kata sandi salah" : "Invalid username or password"));
      }

      document.cookie = "session_token=true; path=/; max-age=31536000; SameSite=Lax";

      await refreshUser();
      router.push(redirectPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (language === "id" ? "Gagal masuk" : "Failed to log in"));
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
            {t("auth.loginTitle")}
          </h1>
          <p className="text-xs text-[#79716b] mt-1.5 leading-relaxed">
            {t("auth.loginSub")}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-6 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#79716b]">
              {t("auth.email")} / Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={language === "id" ? "Masukkan username" : "Enter username"}
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
              t("auth.loginBtn")
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl text-xs flex flex-col gap-2 relative">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-[#292524]">
              {language === "id" ? "Akun Demo Evaluasi" : "Evaluation Demo Account"}
            </div>
          </div>
          <div className="grid grid-cols-[60px_1fr] gap-x-2 gap-y-1 font-mono text-[11px]">
            <span className="text-[#79716b]">User:</span>
            <span className="text-[#292524] select-all font-semibold">juri_demo</span>
            <span className="text-[#79716b]">Pass:</span>
            <span className="text-[#292524] select-all font-semibold">demo123</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#e7e5e4] text-center">
          <p className="text-xs text-[#79716b]">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="text-[#616c39] hover:underline font-semibold">
              {t("auth.registerBtn")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
          <div className="w-6 h-6 border-2 border-[#616c39] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
