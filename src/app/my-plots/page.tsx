"use client";

import React, { useState, useEffect } from "react";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, useSettings } from "@/components/AuthProvider";

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

const TreeIcon = ({ className = "w-8 h-8 text-[#a8a29e]" }) => (
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
  const { user, loading: authLoading, isWakingUp } = useAuth();
  const { language, t } = useSettings();
  
  const [activeTab, setActiveTab] = useState<"trees" | "plots">("trees");
  const [plots, setPlots] = useState<Plot[]>([]);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [treeToDelete, setTreeToDelete] = useState<string | null>(null);
  
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
      const [plotsRes, scansRes] = await Promise.all([
        fetch(`${BACKEND_URL}/users/${user.id}/plots`, { credentials: "include" }),
        fetch(`${BACKEND_URL}/users/${user.id}/scans`, { credentials: "include" })
      ]);

      if (!plotsRes.ok) throw new Error("Failed to fetch plots.");
      if (!scansRes.ok) throw new Error("Failed to fetch tree records.");

      const [pJson, sJson] = await Promise.all([
        plotsRes.json(),
        scansRes.json()
      ]);

      setPlots(pJson.plots || []);
      setScans(sJson.scans || []);
    } catch (err: any) {
      setError(err.message || "A connection error occurred");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDeleteScan = (treeCode: string) => {
    setTreeToDelete(treeCode);
  };

  const executeDeleteScan = async (treeCode: string) => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/scans/${encodeURIComponent(treeCode)}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to delete tree scan.");
      }
      
      // Remove the deleted scan from state
      setScans(prev => prev.filter(s => s.tree_code !== treeCode));
    } catch (err: any) {
      setError(err.message || "Failed to delete tree scan.");
    }
  };

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
      <main className="min-h-screen bg-[#fafaf9]/60 text-[#292524] flex flex-col items-center justify-center font-sans p-6 text-center select-none">
        <Loader size={110} className="mb-4" />
        
        {isWakingUp && (
          <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 mt-4 max-w-sm flex items-center gap-2 leading-relaxed animate-pulse">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Waking up backend servers (Render.com cold start). This may take up to 50 seconds on first visit.</span>
          </p>
        )}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]/60 text-[#292524] flex flex-col font-sans">
      <main className="flex-1 pt-28 pb-20 px-6 relative overflow-hidden">
        {/* Background radial overlays */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-[#4e572c]/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-[#e7e5e4]/50 blur-[130px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          
          {/* Header */}
          <header className="flex justify-between items-center pb-6 border-b border-[#e7e5e4]/80 mb-8 select-none">
            <div>
              <h1 className="text-2xl font-serif font-normal tracking-tight text-[#292524]">
                {language === "id" ? "Dasbor Plot" : "Dashboard"}
              </h1>
              <p className="text-xs text-[#79716b] mt-1 leading-relaxed">
                {language === "id" ? "Selamat datang kembali, " : "Welcome back, "}<span className="text-[#616c39] font-semibold">{user?.display_name || user?.username}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/plots/create"
                className="bg-[#292524] hover:bg-[#292524]/90 text-white font-semibold text-xs rounded-xl px-4 py-2.5 shadow-sm transition-all"
              >
                {language === "id" ? "+ Buat Plot Baru" : "+ Create New Plot"}
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
          <div className="flex border-b border-[#e7e5e4] mb-8 select-none">
            <button
              onClick={() => setActiveTab("trees")}
              className={`pb-3.5 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "trees"
                  ? "border-[#616c39] text-[#616c39]"
                  : "border-transparent text-[#79716b] hover:text-[#292524]"
              }`}
            >
              {language === "id" ? `Pohon Saya (${scans.length})` : `My Trees (${scans.length})`}
            </button>
            <button
              onClick={() => setActiveTab("plots")}
              className={`pb-3.5 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "plots"
                  ? "border-[#616c39] text-[#616c39]"
                  : "border-transparent text-[#79716b] hover:text-[#292524]"
              }`}
            >
              {language === "id" ? `Plot Saya (${plots.length})` : `My Plots (${plots.length})`}
            </button>
          </div>

          {/* TAB 1: My Trees */}
          {activeTab === "trees" && (
            scans.length === 0 ? (
              <div className="bg-white border border-[#e7e5e4] rounded-3xl p-12 text-center max-w-xl mx-auto mt-8 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#616c39]/10 border border-[#616c39]/20 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-[#616c39]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-[#292524] mb-2">{language === "id" ? "Belum Ada Catatan Pohon" : "No Tree Records Yet"}</h2>
                <p className="text-xs text-[#79716b] max-w-sm mx-auto leading-relaxed mb-6">
                  {language === "id" ? "Pindai pohon baru dengan modul rekonstruksi untuk memvisualisasikan data biomassa." : "Record a new tree using our reconstruct module to visualize biomass data."}
                </p>
                <Link
                  href="/reconstruct"
                  className="inline-block bg-[#292524] hover:bg-[#292524]/90 text-white font-semibold text-xs rounded-xl px-5 py-3 transition-all"
                >
                  {language === "id" ? "Mulai Scan Pohon" : "Start Tree Scan"}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center animate-fadeIn">
                {scans.map((record) => {
                  const isInvalid = record.dbh_cm === null || record.dbh_cm === undefined;
                  return (
                                        <div
                      key={record.id}
                      className="bg-white border border-[#e7e5e4] hover:border-[#292524] rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group w-full"
                    >
                      {/* Image Container */}
                      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#fafaf9] mb-3">
                        {record.thumbnail_url ? (
                          <img
                            src={record.thumbnail_url}
                            alt={`Thumbnail for ${record.tree_code}`}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#79716b]/30 bg-[#fafaf9]">
                            <TreeIcon className="w-12 h-12" />
                          </div>
                        )}

                        {/* Top ID Tag */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <span className="px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] font-medium">
                            #{record.id}
                          </span>
                        </div>

                        {/* Bottom Gradient & Clean Mono Tree Code */}
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10">
                          <span className="font-mono text-xs font-semibold text-white tracking-wider block drop-shadow-sm">
                            {record.tree_code}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Typography & Actions */}
                      <div className="flex items-center justify-between gap-2 px-1 pt-1 pb-0.5">
                        <div className="flex flex-col">
                          <div className="font-serif text-base font-normal text-[#292524] leading-tight">
                            {record.co2e_kg ? `${record.co2e_kg.toFixed(0)} kg CO₂e` : "-"}
                          </div>
                          {isInvalid ? (
                            <span className="text-[10px] text-rose-500 font-semibold mt-0.5 font-sans">
                              Invalid scan
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-[#79716b] mt-0.5">
                              {record.dbh_cm ? `${record.dbh_cm.toFixed(1)} cm DBH` : "-"} · {record.tinggi_m ? `${record.tinggi_m.toFixed(1)} m H` : "-"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          <Link
                            href={`/reconstruct?code=${encodeURIComponent(record.tree_code)}&phase=result`}
                            className="px-3 py-1.5 bg-[#292524] hover:bg-[#616c39] text-white text-xs font-semibold rounded-lg transition-colors duration-200"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDeleteScan(record.tree_code)}
                            className="p-1.5 text-[#79716b] hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                            title="Delete tree scan"
                          >
                            <svg 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              className="w-3.5 h-3.5"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: My Plots */}
          {activeTab === "plots" && (
            plots.length === 0 ? (
              <div className="bg-white border border-[#e7e5e4] rounded-3xl p-12 text-center max-w-xl mx-auto mt-8 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#616c39]/10 border border-[#616c39]/20 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-[#616c39]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-[#292524] mb-2">No Forest Plots Yet</h2>
                <p className="text-xs text-[#79716b] max-w-sm mx-auto leading-relaxed mb-6">
                  Create a new plot to aggregate spread coordinates, average DBH, and total estimated carbon target.
                </p>
                <Link
                  href="/plots/create"
                  className="inline-block bg-[#292524] hover:bg-[#292524]/90 text-white font-semibold text-xs rounded-xl px-5 py-3 transition-all"
                >
                  Create Your First Plot
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {plots.map((plot) => (
                  <div
                    key={plot.id}
                    className="bg-white border border-[#e7e5e4]/80 rounded-2xl p-6 shadow-sm hover:border-[#a8a29e] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4 select-none">
                        <span className="text-[10px] font-mono tracking-wider bg-[#fafaf9] text-[#79716b] border border-[#e7e5e4] px-2 py-0.5 rounded font-bold">
                          {plot.plot_code}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                            plot.privacy === "public"
                              ? "bg-sky-50 text-sky-700 border-sky-100"
                              : "bg-[#fafaf9] text-[#79716b] border-[#e7e5e4]"
                          }`}>
                            {plot.privacy}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-semibold text-[#292524] mb-2 hover:text-[#616c39] transition-colors font-serif">
                        <Link href={`/plots/${plot.plot_code}`}>
                          {plot.name}
                        </Link>
                      </h3>

                      <p className="text-xs text-[#79716b] leading-relaxed mb-6 line-clamp-2">
                        {plot.description || "No location description."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#fafaf9] flex justify-between items-center select-none font-sans">
                      <div className="flex items-center gap-3">
                        {/* Overlapping thumbnail avatars */}
                        <div className="flex -space-x-2.5 overflow-hidden">
                          {plot.thumbnails && plot.thumbnails.length > 0 ? (
                            plot.thumbnails.map((url, i) => (
                              <img
                                key={i}
                                className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover object-center border border-[#e7e5e4]"
                                src={url}
                                alt="Tree avatar"
                                loading="lazy"
                              />
                            ))
                          ) : (
                            <div className="inline-block h-7 w-7 rounded-full bg-[#fafaf9] ring-2 ring-white border border-[#e7e5e4] flex items-center justify-center text-[#79716b]">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            </div>
                          )}
                          {plot.scans_count > 3 && (
                            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#fafaf9] text-[9px] font-bold text-[#79716b] border border-[#e7e5e4] ring-2 ring-white">
                              +{plot.scans_count - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col text-[10px] text-[#79716b] leading-tight">
                          <span>Trees: <span className="font-semibold text-[#292524]">{plot.scans_count}</span></span>
                          <span className="mt-0.5">CO₂e: <span className="font-bold text-[#292524]">{plot.total_co2e_kg ? plot.total_co2e_kg.toFixed(1) : 0} kg</span></span>
                        </div>
                      </div>
                      
                      <Link
                        href={`/plots/${plot.plot_code}`}
                        className="text-xs text-[#616c39] font-bold hover:text-[#616c39] flex items-center gap-1 transition-colors"
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

      {/* Modal Confirm Delete Tree */}
      {treeToDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#292524]/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setTreeToDelete(null)}
          />
          
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-2xl relative z-10 w-full max-w-sm flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-base text-[#292524] font-bold">Delete Tree</h3>
                <p className="text-[10px] text-[#79716b] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-xs text-[#79716b] leading-relaxed font-sans">
              Are you sure you want to delete tree <span className="font-bold text-[#292524]">{treeToDelete}</span> and all of its reconstruction data?
            </p>
            
            <div className="flex justify-end gap-2 mt-2 font-sans">
              <button
                type="button"
                onClick={() => setTreeToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#79716b] hover:text-[#292524] bg-[#fafaf9] hover:bg-[#fafaf9] border border-[#e7e5e4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const code = treeToDelete;
                  setTreeToDelete(null);
                  await executeDeleteScan(code);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
