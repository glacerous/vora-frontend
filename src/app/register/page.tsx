"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth, useSettings, setAuthToken } from "@/components/AuthProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

export default function RegisterPage() {
  const { refreshUser } = useAuth();
  const { language } = useSettings();
  const isId = language === "id";

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic Password Validation Checks
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const passedChecksCount = [hasMinLen, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

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
        throw new Error(data.detail || (isId ? "Registrasi akun gagal" : "Registration failed"));
      }

      // Automatically login after successful registration
      try {
        const tokenRes = await fetch(BACKEND_URL + "/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          credentials: "include",
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.access_token) {
            setAuthToken(tokenData.access_token);
          }
        }
      } catch (tokenErr) {
        console.warn("Auto-login token fetch:", tokenErr);
      }

      await refreshUser();
      window.location.href = "/my-plots";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isId ? "Terjadi kesalahan saat pendaftaran" : "An error occurred during registration"));
    } finally {
      setLoading(false);
    }
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
            {isId ? "Daftar Akun" : "Create Account"}
          </h1>
          <p className="text-xs text-[#79716b] mt-1.5 font-sans">
            {isId ? "Sudah punya akun?" : "Already have an account?"}{" "}
            <Link href="/login" className="text-[#292524] font-semibold underline underline-offset-4 hover:text-[#616c39] transition">
              {isId ? "Masuk ke akun" : "Log in"}
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

        {/* Register Form (NO EMAIL - USERNAME BASED) */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#292524] flex items-center gap-0.5">
              {isId ? "Nama Lengkap" : "Full Name"} <span className="text-[#d97757]">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Dr. Jane Forester"
              className="bg-white border border-[#e7e5e4] focus:border-[#292524] focus:ring-2 focus:ring-[#292524]/5 rounded-xl px-4 py-2.5 text-sm text-[#292524] placeholder-[#a8a29e] focus:outline-none transition-all w-full shadow-2xs"
            />
          </div>

          {/* Username (Not Email) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#292524] flex items-center gap-0.5">
              {isId ? "Nama Pengguna" : "Username"} <span className="text-[#d97757]">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="forestry_researcher"
              className="bg-white border border-[#e7e5e4] focus:border-[#292524] focus:ring-2 focus:ring-[#292524]/5 rounded-xl px-4 py-2.5 text-sm text-[#292524] placeholder-[#a8a29e] focus:outline-none transition-all w-full shadow-2xs"
            />
            <span className="text-[11px] text-[#79716b]">
              {isId ? "Digunakan untuk masuk ke akun dan mengidentifikasi plot Anda." : "Used to sign in and identify your forest plots."}
            </span>
          </div>

          {/* Password */}
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

            {/* 4 Segmented Strength Indicator Bars */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              <div className={`h-1 rounded-full transition-all duration-300 ${passedChecksCount >= 1 ? "bg-[#616c39]" : "bg-[#e7e5e4]"}`} />
              <div className={`h-1 rounded-full transition-all duration-300 ${passedChecksCount >= 2 ? "bg-[#616c39]" : "bg-[#e7e5e4]"}`} />
              <div className={`h-1 rounded-full transition-all duration-300 ${passedChecksCount >= 3 ? "bg-[#616c39]" : "bg-[#e7e5e4]"}`} />
              <div className={`h-1 rounded-full transition-all duration-300 ${passedChecksCount >= 4 ? "bg-[#616c39]" : "bg-[#e7e5e4]"}`} />
            </div>

            {/* 4 Password Rule Badges */}
            <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[11px] text-[#79716b] mt-2">
              <div className={`flex items-center gap-1.5 transition-colors ${hasMinLen ? "text-[#292524] font-medium" : ""}`}>
                <span className={`w-1 h-1 rounded-full ${hasMinLen ? "bg-[#616c39]" : "bg-[#d6d3d1]"}`} />
                <span>{isId ? "Minimal 8 karakter" : "At least 8 characters"}</span>
              </div>
              <div className={`flex items-center gap-1.5 transition-colors ${hasUpper ? "text-[#292524] font-medium" : ""}`}>
                <span className={`w-1 h-1 rounded-full ${hasUpper ? "bg-[#616c39]" : "bg-[#d6d3d1]"}`} />
                <span>{isId ? "Satu huruf kapital" : "One uppercase letter"}</span>
              </div>
              <div className={`flex items-center gap-1.5 transition-colors ${hasNumber ? "text-[#292524] font-medium" : ""}`}>
                <span className={`w-1 h-1 rounded-full ${hasNumber ? "bg-[#616c39]" : "bg-[#d6d3d1]"}`} />
                <span>{isId ? "Satu angka" : "One number"}</span>
              </div>
              <div className={`flex items-center gap-1.5 transition-colors ${hasSymbol ? "text-[#292524] font-medium" : ""}`}>
                <span className={`w-1 h-1 rounded-full ${hasSymbol ? "bg-[#616c39]" : "bg-[#d6d3d1]"}`} />
                <span>{isId ? "Satu simbol" : "One symbol"}</span>
              </div>
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
              isId ? "DAFTAR AKUN" : "CREATE ACCOUNT"
            )}
          </button>
        </form>

      </div>

      {/* Footer Legal Disclaimer */}
      <div className="mt-8 text-center max-w-sm">
        <p className="text-[11px] text-[#79716b] leading-relaxed">
          {isId ? (
            <>Dengan mendaftar, Anda menyetujui <span className="underline underline-offset-2 text-[#292524]">Syarat & Ketentuan</span> dan <span className="underline underline-offset-2 text-[#292524]">Kebijakan Privasi</span> Vora.</>
          ) : (
            <>By registering, you agree to Vora <span className="underline underline-offset-2 text-[#292524]">Terms of Service</span> and <span className="underline underline-offset-2 text-[#292524]">Privacy Policy</span>.</>
          )}
        </p>
      </div>

    </main>
  );
}
