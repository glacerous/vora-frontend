"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok");
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
        throw new Error(data.detail || "Gagal melakukan registrasi");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Gagal membuat akun");
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
            Daftar Akun Baru
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Mulai memetakan biomass pohon dan berkontribusi terhadap pelestarian hutan karbon
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 mb-6 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-3 mb-6 flex items-center gap-2.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p className="leading-snug">Registrasi berhasil! Mengalihkan ke halaman masuk...</p>
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
              placeholder="Masukkan username"
              className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Nama Tampilan
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama lengkap atau panggilan"
              className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Ulangi Kata Sandi
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik kembali kata sandi"
              className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600/50 text-[#0d0f12] font-semibold text-sm rounded-xl py-3.5 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2 select-none cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-[#0d0f12] border-t-transparent rounded-full animate-spin" />
            ) : (
              "Daftar Akun"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/40 text-center">
          <p className="text-xs text-slate-400">
            Sudah memiliki akun?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
