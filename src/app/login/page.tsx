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
      setError(err instanceof Error ? err.message : (isId ? "Gagal masuk ke akun" : "Failed to log in"));
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setUsername("juri_demo");
    setPassword("demo123");
  };

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#292524] flex flex-col items-center justify-center px-4 py-16 font-sans selection:bg-[#616c39]/15">
      
      {/* Top Botanical V Logo (Above the Card, Centered) */}
      <div className="mb-8 flex justify-center">
        <Link href="/" className="group inline-block transition-transform hover:scale-105">
          <Image
            src="/vora_v_logo.png"
            alt="Vora Logo"
            width={46}
            height={46}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>
      </div>

      {/* Main Light Card */}
      <div className="w-full max-w-[430px] bg-[#ffffff] border border-[#e7e5e4] rounded-[26px] p-8 sm:p-10 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05),0_0_1px_rgba(0,0,0,0.1)] text-left">
        
        {/* Title & Switch link in Serif */}
        <div className="mb-7 pb-4 border-b border-[#e7e5e4]/60">
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#292524] tracking-tight">
            {isId ? "Masuk" : "Login"}
          </h1>
          <p className="text-xs text-[#79716b] mt-1.5 font-sans">
            {isId ? "Belum punya akun?" : "Don't have an account?"}{" "}
            <Link href="/register" className="text-[#292524] font-semibold underline underline-offset-4 hover:text-[#616c39] transition">
              {isId ? "Daftar sekarang" : "Sign up"}
            </Link>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-5 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Username Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#292524] flex items-center gap-0.5">
              {isId ? "Nama Pengguna" : "Username"} <span className="text-[#d97757]">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isId ? "Masukkan username..." : "Enter username..."}
              className="bg-white border border-[#e7e5e4] focus:border-[#292524] focus:ring-2 focus:ring-[#292524]/5 rounded-xl px-4 py-2.5 text-sm text-[#292524] placeholder-[#a8a29e] focus:outline-none transition-all w-full shadow-2xs"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#292524] flex items-center gap-0.5">
              {isId ? "Kata Sandi" : "Password"} <span className="text-[#d97757]">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white border border-[#e7e5e4] focus:border-[#292524] focus:ring-2 focus:ring-[#292524]/5 rounded-xl pl-4 pr-11 py-2.5 text-sm text-[#292524] placeholder-[#a8a29e] focus:outline-none transition-all w-full shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-[#79716b] hover:text-[#292524] transition cursor-pointer"
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
            className="w-full bg-[#292524] hover:bg-[#1c1917] text-white font-mono uppercase tracking-[0.06em] text-xs font-semibold rounded-xl py-3.5 transition-all shadow-sm active:scale-[0.99] mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              isId ? "MASUK" : "LOGIN"
            )}
          </button>
        </form>

        {/* Demo Account Capsule */}
        <div className="mt-6 p-3.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-[#292524] block text-[11px]">
              {isId ? "Akun Demo Evaluasi" : "Evaluation Demo Account"}
            </span>
            <span className="font-mono text-[10px] text-[#79716b]">
              user: <strong className="text-[#292524]">juri_demo</strong> &middot; pass: <strong className="text-[#292524]">demo123</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={fillDemoAccount}
            className="px-2.5 py-1 bg-white hover:bg-[#e7e5e4]/50 border border-[#e7e5e4] text-[#292524] text-[10px] font-mono font-medium rounded-lg transition cursor-pointer"
          >
            {isId ? "Isi Otomatis" : "Auto Fill"}
          </button>
        </div>

      </div>

      {/* Footer Legal Disclaimer */}
      <div className="mt-8 text-center max-w-sm">
        <p className="text-[11px] text-[#79716b] leading-relaxed">
          {isId ? (
            <>Dengan masuk, Anda menyetujui <span className="underline underline-offset-2 text-[#292524]">Syarat & Ketentuan</span> dan <span className="underline underline-offset-2 text-[#292524]">Kebijakan Privasi</span> Vora.</>
          ) : (
            <>By signing in, you agree to Vora <span className="underline underline-offset-2 text-[#292524]">Terms of Service</span> and <span className="underline underline-offset-2 text-[#292524]">Privacy Policy</span>.</>
          )}
        </p>
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
