"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth, useSettings } from "@/components/AuthProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/my-plots";
  const { user, refreshUser } = useAuth();
  const { language } = useSettings();
  const isId = language === "id";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect directly.
  useEffect(() => {
    if (user) {
      window.location.href = redirectPath;
    }
  }, [user, redirectPath]);

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
        throw new Error(data.detail || (isId ? "Nama pengguna atau kata sandi salah" : "Invalid username or password"));
      }

      document.cookie = "session_token=true; path=/; max-age=31536000; SameSite=Lax";

      await refreshUser();
      window.location.href = redirectPath;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isId ? "Gagal masuk ke akun" : "Failed to sign in"));
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setUsername("juri_demo");
    setPassword("demo123");
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col items-center justify-center relative overflow-hidden px-4 py-12 font-sans selection:bg-[#616c39]/30">
      
      {/* Subtle radial ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#616c39]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Modern Dark Card */}
      <div className="w-full max-w-[420px] bg-[#121215] border border-[#27272a] rounded-3xl p-7 sm:p-9 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] relative z-10 text-left">
        
        {/* Top V Logo Badge */}
        <div className="w-11 h-11 rounded-xl bg-[#1c1c21] border border-[#3f3f46]/40 flex items-center justify-center mb-6 shadow-inner">
          <Image
            src="/vora_v_logo_white.png"
            alt="Vora"
            width={24}
            height={24}
            className="w-5.5 h-5.5 object-contain"
            priority
          />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {isId ? "Masuk ke akun Anda" : "Sign in to your account"}
        </h1>
        <p className="text-xs text-[#a1a1aa] mt-1.5 leading-relaxed">
          {isId
            ? "Akses dasbor plot, manajemen inventaris pohon, dan analisis 3D."
            : "Access your plot dashboard, tree inventory, and 3D analytics."}
        </p>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/60 border border-red-500/40 text-red-200 text-xs rounded-xl p-3 mt-5 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
          
          {/* Username Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#e4e4e7]">
              {isId ? "Nama pengguna" : "Username"}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isId ? "Masukkan username..." : "Enter username..."}
              className="bg-[#09090b] border border-[#27272a] focus:border-[#616c39] focus:ring-1 focus:ring-[#616c39] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#71717a] focus:outline-none transition-all w-full"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#e4e4e7]">
              {isId ? "Kata sandi" : "Password"}
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-[#09090b] border border-[#27272a] focus:border-[#616c39] focus:ring-1 focus:ring-[#616c39] rounded-xl pl-4 pr-11 py-2.5 text-sm text-white placeholder-[#71717a] focus:outline-none transition-all w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-[#71717a] hover:text-[#d4d4d8] transition cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e4e4e7] hover:bg-white text-black font-semibold text-sm rounded-xl py-3 transition-all active:scale-[0.99] mt-2 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              isId ? "Masuk Sekarang" : "Sign In"
            )}
          </button>
        </form>

        {/* Demo Account Capsule */}
        <div className="mt-5 p-3.5 bg-[#09090b] border border-[#27272a] rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-[#e4e4e7] block text-[11px]">
              {isId ? "Akun Demo Evaluasi" : "Evaluation Demo Account"}
            </span>
            <span className="font-mono text-[10px] text-[#a1a1aa]">
              user: <strong className="text-white">juri_demo</strong> &middot; pass: <strong className="text-white">demo123</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={fillDemoAccount}
            className="px-2.5 py-1 bg-[#18181b] hover:bg-[#27272a] border border-[#3f3f46] text-[#e4e4e7] text-[10px] font-mono font-medium rounded-lg transition cursor-pointer"
          >
            {isId ? "Isi Otomatis" : "Auto Fill"}
          </button>
        </div>

      </div>

      {/* Bottom Switch Link */}
      <div className="mt-6 text-center z-10">
        <p className="text-xs text-[#a1a1aa]">
          {isId ? "Belum punya akun?" : "Don't have an account?"}{" "}
          <Link href="/register" className="text-white font-semibold hover:underline">
            {isId ? "Buat akun" : "Sign up"}
          </Link>
        </p>
      </div>

    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
          <div className="w-6 h-6 border-2 border-[#616c39] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
