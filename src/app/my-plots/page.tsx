"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

interface Plot {
  id: number;
  plot_code: string;
  name: string;
  description: string;
  privacy: "public" | "private";
  session_active: boolean;
  created_at: string;
  scans_count: number;
  total_co2e_kg: number;
  thumbnails: string[];
}

interface ScanRecord {
  id: number;
  tree_code: string;
  scan_date: string;
  dbh_cm: number;
  tinggi_m: number;
  biomassa_kg: number;
  karbon_kg: number;
  co2e_kg: number;
  thumbnail_url?: string | null;
  species_predictions?: Array<{
    scientific_name: string;
    common_name: string;
    confidence: number;
  }> | string;
}

export default function MyPlotsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"trees" | "plots">("trees");
  const [plots, setPlots] = useState<Plot[]>([]);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/my-plots");
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    if (!user) return;
    setDataLoading(true);
    setError(null);
    try {
      // Fetch plots
      const plotsRes = await fetch(`${BACKEND_URL}/users/${user.id}/plots`, { credentials: "include" });
      let plotsData: Plot[] = [];
      if (plotsRes.ok) {
        const pJson = await plotsRes.json();
        plotsData = pJson.plots || [];
        setPlots(plotsData);
      } else {
        throw new Error("Gagal mengambil data plot.");
      }

      // Fetch user's individual scans
      const scansRes = await fetch(`${BACKEND_URL}/users/${user.id}/scans`, { credentials: "include" });
      if (scansRes.ok) {
        const sJson = await scansRes.json();
        setScans(sJson.scans || []);
      } else {
        throw new Error("Gagal mengambil data rekaman pohon.");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan koneksi");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getSpeciesName = (scan: ScanRecord) => {
    if (!scan.species_predictions) return null;
    let preds = scan.species_predictions;
    if (typeof preds === "string") {
      try {
        preds = JSON.parse(preds);
      } catch {
        return null;
      }
    }
    if (!Array.isArray(preds) || preds.length === 0) return null;
    return preds[0]?.scientific_name || null;
  };

  const getSpeciesCommonName = (scan: ScanRecord) => {
    if (!scan.species_predictions) return null;
    let preds = scan.species_predictions;
    if (typeof preds === "string") {
      try {
        preds = JSON.parse(preds);
      } catch {
        return null;
      }
    }
    if (!Array.isArray(preds) || preds.length === 0) return null;
    return preds[0]?.common_name || null;
  };

  const loading = authLoading || (user && dataLoading);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center font-sans">
        <span className="w-8 h-8 border-3 border-[#191919] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Memuat data dashboard...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col font-sans">
      <main className="flex-1 pt-28 pb-20 px-6 relative overflow-hidden">
        {/* Background radial overlays */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-emerald-500/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-slate-200/50 blur-[130px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          
          {/* Header */}
          <header className="flex justify-between items-center pb-6 border-b border-slate-200/80 mb-8 select-none">
            <div>
              <h1 className="text-2xl font-serif font-normal tracking-tight text-[#191919]">
                Dashboard
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Selamat datang kembali, <span className="text-emerald-700 font-semibold">{user?.display_name || user?.username}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/plots/create"
                className="bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl px-4 py-2.5 shadow-sm transition-all"
              >
                + Buat Plot Baru
              </Link>
            </div>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-150 text-red-700 text-xs rounded-2xl p-4 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200/60 mb-8 select-none">
            <button
              onClick={() => setActiveTab("trees")}
              className={`pb-3.5 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "trees"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              Pohon Saya ({scans.length})
            </button>
            <button
              onClick={() => setActiveTab("plots")}
              className={`pb-3.5 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "plots"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              Plot Saya ({plots.length})
            </button>
          </div>

          {/* TAB 1: Pohon Saya */}
          {activeTab === "trees" && (
            scans.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto mt-8 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-800 mb-2">Belum ada Rekaman Pohon</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
                  Rekam pohon baru secara mandiri menggunakan modul reconstruct kami untuk memvisualisasikan data biomassa.
                </p>
                <Link
                  href="/reconstruct"
                  className="inline-block bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl px-5 py-3 transition-all"
                >
                  Mulai Scan Pohon
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scans.map((scan) => {
                  const specName = getSpeciesName(scan);
                  const specCommon = getSpeciesCommonName(scan);
                  return (
                    <div
                      key={scan.id}
                      className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:border-slate-350 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3 select-none">
                          <span className="text-[10px] font-mono tracking-wider bg-slate-100 text-slate-500 border border-slate-200/50 px-2 py-0.5 rounded">
                            {scan.tree_code}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(scan.scan_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <div className="flex items-start gap-3.5 mb-4">
                          {scan.thumbnail_url ? (
                            <img
                              src={scan.thumbnail_url}
                              alt={scan.tree_code}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            </div>
                          )}

                          <div className="min-w-0">
                            {specName ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-800 capitalize truncate italic">
                                  {specName}
                                </span>
                                {specCommon && (
                                  <span className="text-[10px] text-slate-450 truncate">
                                    {specCommon}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Belum terklasifikasi</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-[11px] text-slate-500 mb-2">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block select-none">DBH</span>
                            <span className="font-semibold text-slate-700">{scan.dbh_cm.toFixed(1)} cm</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block select-none">Tinggi</span>
                            <span className="font-semibold text-slate-700">{scan.tinggi_m.toFixed(1)} m</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100/60 flex justify-between items-baseline mt-4 select-none">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Estimasi CO₂e</span>
                          <span className="text-sm font-bold text-slate-800">{scan.co2e_kg.toFixed(1)} kg</span>
                        </div>
                        
                        <Link
                          href={`/reconstruct?code=${scan.tree_code}&phase=result`}
                          className="text-xs text-emerald-650 font-bold hover:text-emerald-700 transition-colors"
                        >
                          Detail 3D &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: Plot Saya */}
          {activeTab === "plots" && (
            plots.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto mt-8 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-800 mb-2">Belum ada Plot Hutan</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
                  Buat plot baru untuk mengagregasikan koordinat sebaran, DBH rata-rata, dan total estimasi target karbon.
                </p>
                <Link
                  href="/plots/create"
                  className="inline-block bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl px-5 py-3 transition-all"
                >
                  Mulai Buat Plot Pertama
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plots.map((plot) => (
                  <div
                    key={plot.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:border-slate-350 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4 select-none">
                        <span className="text-[10px] font-mono tracking-wider bg-slate-100 text-slate-500 border border-slate-200/50 px-2 py-0.5 rounded font-bold">
                          {plot.plot_code}
                        </span>
                        <div className="flex items-center gap-2">
                          {plot.session_active && (
                            <span className="flex items-center gap-1.2 text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                              Sesi Aktif
                            </span>
                          )}
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                            plot.privacy === "public"
                              ? "bg-sky-50 text-sky-700 border-sky-100"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {plot.privacy}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-semibold text-slate-800 mb-2 hover:text-emerald-750 transition-colors font-serif">
                        <Link href={`/plots/${plot.plot_code}`}>
                          {plot.name}
                        </Link>
                      </h3>

                      <p className="text-xs text-slate-500 leading-relaxed mb-6 line-clamp-2">
                        {plot.description || "Tidak ada deskripsi lokasi."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center select-none font-sans">
                      <div className="flex items-center gap-3">
                        {/* Overlapping thumbnail avatars */}
                        <div className="flex -space-x-2.5 overflow-hidden">
                          {plot.thumbnails && plot.thumbnails.length > 0 ? (
                            plot.thumbnails.map((url, i) => (
                              <img
                                key={i}
                                className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover object-center border border-slate-200"
                                src={url}
                                alt="Tree avatar"
                              />
                            ))
                          ) : (
                            <div className="inline-block h-7 w-7 rounded-full bg-slate-50 ring-2 ring-white border border-slate-200 flex items-center justify-center text-slate-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            </div>
                          )}
                          {plot.scans_count > 3 && (
                            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-50 text-[9px] font-bold text-slate-550 border border-slate-200 ring-2 ring-white">
                              +{plot.scans_count - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col text-[10px] text-slate-455 leading-tight">
                          <span>Pohon: <span className="font-semibold text-slate-750">{plot.scans_count}</span></span>
                          <span className="mt-0.5">CO₂e: <span className="font-bold text-slate-800">{plot.total_co2e_kg ? plot.total_co2e_kg.toFixed(1) : 0} kg</span></span>
                        </div>
                      </div>
                      
                      <Link
                        href={`/plots/${plot.plot_code}`}
                        className="text-xs text-emerald-650 font-bold hover:text-emerald-700 flex items-center gap-1 transition-colors"
                      >
                        Detail Plot &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </main>
    </div>
  );
}
