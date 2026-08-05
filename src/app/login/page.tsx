"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

import { useAuth } from "@/components/AuthProvider";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/my-plots";
  const { user, refreshUser } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFillDemo = () => {
    setUsername("juri_demo");
    setPassword("demo123");
  };

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
        throw new Error(data.detail || "Invalid username or password");
      }

      // Set frontend-domain cookie immediately to allow server-side middleware to let navigation through
      document.cookie = "session_token=true; path=/; max-age=31536000; SameSite=Lax";

      // Successful login - refresh global user context
      await refreshUser();
      router.push(redirectPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center relative overflow-hidden px-4 font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-slate-200/50 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-[#191919] mb-2">
            Vora.
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[#191919]">
            Sign In to Vora Portal
          </h1>
          <p className="text-xs text-[#191919]/60 mt-1.5 leading-relaxed">
            Manage your forest carbon plots and monitor biomass data accurately.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-150 text-red-700 text-xs rounded-xl p-3 mb-6 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
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
              placeholder="Enter username"
              className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-4 py-3 text-sm text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-4 py-3 text-sm text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#191919] hover:bg-[#191919]/90 disabled:bg-[#191919]/50 text-white font-semibold text-sm rounded-xl py-3.5 shadow-sm active:scale-[0.98] transition-all mt-3 flex items-center justify-center gap-2 select-none cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs flex flex-col gap-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Akun Demo Juri</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors hover:underline cursor-pointer select-none"
            >
              Isi otomatis
            </button>
          </div>
          <div className="grid grid-cols-[60px_1fr] gap-x-2 gap-y-1 font-mono text-[11px]">
            <span className="text-slate-400">User:</span>
            <span className="text-slate-700 select-all">juri_demo</span>
            <span className="text-slate-400">Pass:</span>
            <span className="text-slate-700 select-all">demo123</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#191919] hover:underline font-semibold">
              Sign Up
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
      <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center font-sans">
        <span className="w-8 h-8 border-3 border-[#191919] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Loading sign in page...</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
