"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

interface Plot {
  id: number;
  plot_code: string;
  name: string;
  description: string;
  privacy: "public" | "private";
  session_active: boolean;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  display_name: string;
  is_demo_account: boolean;
}

export default function MyPlotsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user and plots
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch user profile
        const userRes = await fetch(`${BACKEND_URL}/auth/me`, {
          credentials: "include",
        });

        if (!userRes.ok) {
          router.push("/login?redirect=/my-plots");
          return;
        }

        const userData = await userRes.json();
        setUser(userData);

        // 2. Fetch plots owned by this user
        const plotsRes = await fetch(`${BACKEND_URL}/users/${userData.id}/plots`, {
          credentials: "include",
        });

        if (plotsRes.ok) {
          const plotsData = await plotsRes.json();
          setPlots(plotsData.plots || []);
        } else {
          setError("Gagal memuat daftar plot");
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan koneksi");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Gagal logout:", err);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0f12] text-white flex flex-col items-center justify-center">
        <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400">Memuat data plot hutan...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0f12] text-white px-6 py-12 md:px-16 md:py-20 relative overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-emerald-950/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-slate-900/30 blur-[130px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header / Nav */}
        <header className="flex justify-between items-center pb-8 border-b border-slate-800/60 mb-12">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide text-slate-100">
              Dashboard Plot
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Selamat datang kembali, <span className="text-emerald-400 font-medium">{user?.display_name || user?.username}</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/plots/create"
              className="bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] font-semibold text-xs rounded-xl px-4 py-2.5 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/18 transition-all"
            >
              + Buat Plot Baru
            </Link>

            <button
              onClick={handleLogout}
              className="border border-slate-800 hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 text-xs rounded-xl px-4 py-2.5 transition-all cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl p-4 mb-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Plots list */}
        {plots.length === 0 ? (
          <div className="bg-[#161920]/40 border border-slate-800/60 rounded-3xl p-12 text-center max-w-xl mx-auto mt-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-200 mb-2">Belum ada Plot Hutan</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
              Buat plot hutan baru terlebih dahulu untuk mulai merekam, memetakan, dan memantau estimasi biomassa karbon pohon Anda.
            </p>
            <Link
              href="/plots/create"
              className="inline-block bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] font-semibold text-xs rounded-xl px-5 py-3 transition-all"
            >
              Mulai Buat Plot Pertama
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plots.map((plot) => (
              <div
                key={plot.id}
                className="bg-[#161920]/60 border border-slate-800/80 rounded-2xl p-6 shadow-md hover:border-slate-700/80 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-mono tracking-wider bg-slate-800/80 text-slate-400 px-2 py-1 rounded">
                      {plot.plot_code}
                    </span>
                    <div className="flex items-center gap-2">
                      {plot.session_active && (
                        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Sesi Aktif
                        </span>
                      )}
                      <span className={`text-[10px] capitalize px-2 py-0.5 rounded-full border ${
                        plot.privacy === "public"
                          ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-800"
                      }`}>
                        {plot.privacy}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-slate-200 mb-2 hover:text-emerald-400 transition-colors">
                    <Link href={`/plots/${plot.plot_code}`}>
                      {plot.name}
                    </Link>
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed mb-6 line-clamp-2">
                    {plot.description || "Tidak ada deskripsi."}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/40 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">
                    Dibuat {new Date(plot.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  
                  <Link
                    href={`/plots/${plot.plot_code}`}
                    className="text-xs text-emerald-400 font-semibold hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    Detail Plot →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
