"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/my-plots";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in (check from session_token or verify /auth/me), redirect directly.
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, {
          credentials: "include",
        });
        if (res.ok) {
          router.push(redirectPath);
        }
      } catch (err) {
        // ignore not logged in error
      }
    };
    checkLogin();
  }, [router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Username atau password salah");
      }

      // Successful login
      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal masuk ke akun");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0d0f12] text-white flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-emerald-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-slate-900/40 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-[#161920]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold tracking-wider text-emerald-400 font-serif mb-2">
            VORA
          </Link>
          <h1 className="text-xl font-semibold tracking-wide text-slate-100">
            Masuk ke Portal Vora
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Kelola plot hutan karbon Anda dan pantau data biomass secara akurat
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 mb-6 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600/50 text-[#0d0f12] font-semibold text-sm rounded-xl py-3.5 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all mt-3 flex items-center justify-center gap-2 select-none cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-[#0d0f12] border-t-transparent rounded-full animate-spin" />
            ) : (
              "Masuk ke Akun"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/40 text-center">
          <p className="text-xs text-slate-400">
            Belum memiliki akun?{" "}
            <Link href="/register" className="text-emerald-400 hover:underline">
              Daftar Baru
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0d0f12] text-white flex flex-col items-center justify-center">
        <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400">Memuat halaman masuk...</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
