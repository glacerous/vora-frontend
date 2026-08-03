"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

export default function CreatePlotPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"private" | "public">("private");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name,
        description: description || null,
        privacy,
        gps_centroid_lat: lat ? parseFloat(lat) : null,
        gps_centroid_lon: lon ? parseFloat(lon) : null,
      };

      const res = await fetch(`${BACKEND_URL}/plots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Gagal membuat plot");
      }

      router.push(`/plots/${data.plot_code}`);
    } catch (err: any) {
      setError(err.message || "Gagal membuat plot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0d0f12] text-white px-6 py-12 md:px-16 md:py-20 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-emerald-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-slate-900/40 blur-[120px] pointer-events-none" />

      <div className="max-w-xl mx-auto relative z-10">
        {/* Back Link */}
        <div className="mb-8">
          <Link href="/my-plots" className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5">
            ← Kembali ke Dashboard
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#161920]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-xl font-semibold tracking-wide text-slate-100">
              Buat Plot Hutan Baru
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Tentukan area pengelompokan pohon Anda untuk agregasi data biomassa karbon yang akurat
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
                Nama Plot
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Plot Mangrove A1"
                className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Deskripsi
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tulis detail mengenai lokasi atau karakteristik plot pohon ini..."
                rows={3}
                className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full resize-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Privasi Plot
              </label>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <button
                  type="button"
                  onClick={() => setPrivacy("private")}
                  className={`border rounded-xl p-3.5 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    privacy === "private"
                      ? "border-emerald-500 bg-emerald-500/5 text-emerald-400"
                      : "border-slate-800 bg-[#0d0f12]/40 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs font-semibold">Private</span>
                  <span className="text-[9px] text-center leading-normal opacity-85">Hanya bisa diakses oleh Anda</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrivacy("public")}
                  className={`border rounded-xl p-3.5 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    privacy === "public"
                      ? "border-emerald-500 bg-emerald-500/5 text-emerald-400"
                      : "border-slate-800 bg-[#0d0f12]/40 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs font-semibold">Public</span>
                  <span className="text-[9px] text-center leading-normal opacity-85">Bisa dilihat oleh juri/publik</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  GPS Centroid Lat (Opsional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-6.2088"
                  className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  GPS Centroid Lon (Opsional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="106.8456"
                  className="bg-[#0d0f12]/60 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-full"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600/50 text-[#0d0f12] font-semibold text-sm rounded-xl py-3.5 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2 select-none cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-[#0d0f12] border-t-transparent rounded-full animate-spin" />
              ) : (
                "Simpan & Buat Plot"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
