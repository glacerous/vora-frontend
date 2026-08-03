"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

import { useAuth } from "@/components/AuthProvider";

export default function CreatePlotPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"private" | "public">("private");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login?redirect=/plots/create");
    }
  }, [currentUser, authLoading, router]);

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
    <div className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col font-sans">

      <main className="flex-1 pt-28 pb-16 px-6 relative overflow-hidden">
        {/* Background radial overlays */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-slate-200/50 blur-[120px] pointer-events-none" />

        <div className="max-w-xl mx-auto relative z-10">
          {/* Back Link */}
          <div className="mb-8">
            <Link href="/my-plots" className="text-xs text-slate-500 hover:text-emerald-700 transition-colors flex items-center gap-1.5 font-medium">
              ← Kembali ke Dashboard
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white border border-slate-200/85 rounded-3xl p-8 shadow-sm">
            <div className="mb-8">
              <h1 className="text-xl font-semibold tracking-tight text-[#191919]">
                Buat Plot Hutan Baru
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Tentukan area pengelompokan pohon Anda untuk agregasi data biomassa karbon yang akurat
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
                  Nama Plot
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Plot Mangrove A1"
                  className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-4 py-3 text-sm text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
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
                  className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-4 py-3 text-sm text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full resize-none"
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
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
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
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
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
                    className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-4 py-3 text-sm text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
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
                    className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-4 py-3 text-sm text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#191919] hover:bg-[#191919]/90 disabled:bg-[#191919]/50 text-white font-semibold text-sm rounded-xl py-3.5 shadow-md transition-all mt-4 flex items-center justify-center gap-2 select-none cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Simpan & Buat Plot"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
