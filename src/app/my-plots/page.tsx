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

const TreeIcon = ({ className = "w-8 h-8 text-slate-350" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22V12" />
    <path d="M12 12L8 8" />
    <path d="M12 10L16 6" />
    <path d="M12 15L7 10" />
    <path d="M12 13L17 8" />
    <path d="M12 7L9 4" />
    <path d="M12 5L15 2" />
  </svg>
);

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
        throw new Error("Failed to fetch plots.");
      }

      // Fetch user's individual scans
      const scansRes = await fetch(`${BACKEND_URL}/users/${user.id}/scans`, { credentials: "include" });
      if (scansRes.ok) {
        const sJson = await scansRes.json();
        setScans(sJson.scans || []);
      } else {
        throw new Error("Failed to fetch tree records.");
      }
    } catch (err: any) {
      setError(err.message || "A connection error occurred");
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
        <p className="text-sm text-slate-500 font-medium">Loading dashboard data...</p>
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
                Welcome back, <span className="text-emerald-700 font-semibold">{user?.display_name || user?.username}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/plots/create"
                className="bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl px-4 py-2.5 shadow-sm transition-all"
              >
                + Create New Plot
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
              My Trees ({scans.length})
            </button>
            <button
              onClick={() => setActiveTab("plots")}
              className={`pb-3.5 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "plots"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              My Plots ({plots.length})
            </button>
          </div>

          {/* TAB 1: My Trees */}
          {activeTab === "trees" && (
            scans.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto mt-8 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-800 mb-2">No Tree Records Yet</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
                  Record a new tree using our reconstruct module to visualize biomass data.
                </p>
                <Link
                  href="/reconstruct"
                  className="inline-block bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl px-5 py-3 transition-all"
                >
                  Start Tree Scan
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center">
                {scans.map((record) => {
                  const isInvalid = record.dbh_cm === null || record.dbh_cm === undefined;
                  return (
                    <div key={record.id} className="vora-card animate-fadeIn">
                      <section className="vora-card-hero relative overflow-hidden bg-[#fef4e2]">
                        {record.thumbnail_url ? (
                          <img
                            src={record.thumbnail_url}
                            alt={`Thumbnail for ${record.tree_code}`}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-amber-500/10 bg-[#fef4e2]">
                            <TreeIcon className="w-16 h-16" />
                          </div>
                        )}

                        {record.thumbnail_url && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-0" />
                        )}

                        <header className="vora-card-hero-header relative z-10 w-full">
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded backdrop-blur-sm border ${
                            record.thumbnail_url 
                              ? "bg-black/30 border-white/10 text-white" 
                              : "bg-white/40 border-slate-200 text-slate-600"
                          }`}>
                            #{record.id}
                          </span>
                        </header>

                        <p className={`vora-card-job-title relative z-10 tracking-tight font-sans font-extrabold ${
                          record.thumbnail_url 
                            ? "text-white" 
                            : "text-[#141417]"
                        }`}>
                          {record.tree_code}
                        </p>
                      </section>

                      <footer className="vora-card-footer">
                        <div className="vora-card-job-summary flex flex-col items-start font-sans">
                          <div className="card__job text-base font-extrabold text-[#141417] leading-none mb-1">
                            {record.co2e_kg ? `${record.co2e_kg.toFixed(0)} kg CO₂e` : "-"}
                          </div>
                          {isInvalid ? (
                            <span className="text-[10px] text-rose-500 font-semibold">
                              Invalid scan
                            </span>
                          ) : (
                            <div className="text-[10px] text-slate-450 font-semibold">
                              {record.dbh_cm ? `${record.dbh_cm.toFixed(1)} cm DBH` : "-"} / {record.tinggi_m ? `${record.tinggi_m.toFixed(1)} m H` : "-"}
                            </div>
                          )}
                        </div>
                        <div className="vora-card-view-save select-none">
                          <Link
                            href={`/reconstruct?code=${encodeURIComponent(record.tree_code)}&phase=result`}
                            className="vora-card-btn"
                          >
                            View
                          </Link>
                        </div>
                      </footer>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: My Plots */}
          {activeTab === "plots" && (
            plots.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto mt-8 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-800 mb-2">No Forest Plots Yet</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
                  Create a new plot to aggregate spread coordinates, average DBH, and total estimated carbon target.
                </p>
                <Link
                  href="/plots/create"
                  className="inline-block bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl px-5 py-3 transition-all"
                >
                  Create Your First Plot
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
                        {plot.description || "No location description."}
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
                                loading="lazy"
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
                          <span>Trees: <span className="font-semibold text-slate-750">{plot.scans_count}</span></span>
                          <span className="mt-0.5">CO₂e: <span className="font-bold text-slate-800">{plot.total_co2e_kg ? plot.total_co2e_kg.toFixed(1) : 0} kg</span></span>
                        </div>
                      </div>
                      
                      <Link
                        href={`/plots/${plot.plot_code}`}
                        className="text-xs text-emerald-650 font-bold hover:text-emerald-700 flex items-center gap-1 transition-colors"
                      >
                        Plot Details &rarr;
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
