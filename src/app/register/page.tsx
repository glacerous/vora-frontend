"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

export default function RegisterPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push("/my-plots");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Confirm password does not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          display_name: displayName || username,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to register");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
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
          <Link href="/" className="inline-block mb-2">
            <Image src="/logo-wordmark.png" alt="Vora" width={200} height={100} className="h-14 w-auto mx-auto" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[#191919]">
            Register New Account
          </h1>
          <p className="text-xs text-[#191919]/60 mt-1.5 leading-relaxed">
            Start mapping tree biomass and contribute to forest carbon preservation.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-150 text-red-700 text-xs rounded-xl p-3 mb-6 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs rounded-xl p-3 mb-6 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p className="leading-snug">Registration successful! Redirecting to login...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
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

          <div className="flex flex-col gap-2.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Full name or nickname"
              className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-4 py-3 text-sm text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-4 py-3 text-sm text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retype password"
              className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-4 py-3 text-sm text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-[#191919] hover:bg-[#191919]/90 disabled:bg-[#191919]/50 text-white font-semibold text-sm rounded-xl py-3.5 shadow-sm active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2 select-none cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Register Account"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#191919] hover:underline font-semibold">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
