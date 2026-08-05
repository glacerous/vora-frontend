"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/components/AuthProvider";

interface ScanRecord {
  id: number;
  scan_date: string;
  tree_code: string;
  dbh_cm: number;
  tinggi_m: number;
  biomassa_kg: number;
  karbon_kg: number;
  co2e_kg: number;
  splat_file_url: string;
  confidence_note?: string;
  thumbnail_url?: string;
}

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

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";
const PAGE_LIMIT = 12;

const UiverseLoader = () => (
  <div className="newtons-cradle">
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
  </div>
);

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

export default function HistoryPage() {
  const { isWakingUp } = useAuth();
  const [galleryTab, setGalleryTab] = useState<"tree" | "plot">("tree");
  
  // Scans tab states
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "high-carbon" | "estimated"
  
  // Plots tab states
  const [plots, setPlots] = useState<Plot[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric"
      });
    } catch { return dateStr; }
  };

  const fetchScans = async (currentOffset: number, append: boolean = true) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/scans?limit=${PAGE_LIMIT}&offset=${currentOffset}`, { cache: 'no-store' });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      
      if (data.success && data.scans) {
        if (append) {
          setScans((prev) => [...prev, ...data.scans]);
        } else {
          setScans(data.scans);
        }
        
        if (data.scans.length < PAGE_LIMIT) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        throw new Error("Failed to load scan history payload.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to reach backend.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlots = async () => {
    setPlotsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/plots`, { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to fetch public plots.");
      const data = await res.json();
      setPlots(data.plots || []);
    } catch (err: any) {
      setError(err.message || "A connection error occurred");
    } finally {
      setPlotsLoading(false);
    }
  };

  // Initial load for scans
  useEffect(() => {
    fetchScans(0, false);
  }, []);

  // Load plots when clicking plots tab
  useEffect(() => {
    if (galleryTab === "plot" && plots.length === 0) {
      fetchPlots();
    }
  }, [galleryTab]);

  const handleLoadMore = () => {
    const nextOffset = offset + PAGE_LIMIT;
    setOffset(nextOffset);
    fetchScans(nextOffset, true);
  };

  // Multi-criteria client-side dynamic search + tab filters
  const filteredScans = scans.filter((scan) => {
    const matchesSearch = scan.tree_code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "high-carbon") {
      return (scan.co2e_kg || 0) >= 200;
    }
    if (activeTab === "estimated") {
      return scan.dbh_cm !== null && scan.dbh_cm !== undefined;
    }
    return true;
  });

  const validScans = scans.filter(s => s.dbh_cm);

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans text-[#191919]">

      {/* ── Main content area ────────────────────────────────────── */}
      <main className="flex-1 pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Heading Section */}
          <div className="mb-8 border-b border-slate-200/50 pb-6">
            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#191919] mb-2">
              Scan Gallery
            </h1>
            <p className="text-sm text-[#191919]/60 max-w-2xl leading-relaxed">
              Discover public 3D tree scans and forest plots mapped by the Vora community.
            </p>
          </div>

          {/* Gallery Mode Tabs */}
          <div className="flex border-b border-slate-200/60 mb-8 select-none">
            <button
              onClick={() => setGalleryTab("tree")}
              className={`pb-3.5 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                galleryTab === "tree"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              Public Trees
            </button>
            <button
              onClick={() => setGalleryTab("plot")}
              className={`pb-3.5 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                galleryTab === "plot"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              Public Plots
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-150 text-red-700 text-xs rounded-2xl p-4 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* TAB 1: Public Trees */}
          {galleryTab === "tree" && (
            scans.length > 0 ? (
              <div className="animate-fadeIn">
                {/* Toolbar: Search input + Segmented Filter Tabs */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Search input with whatsapp style Uiverse component */}
                  <form onSubmit={(e) => e.preventDefault()} className="whatsapp-search-form">
                    <label htmlFor="search">
                      <input
                        required
                        autoComplete="off"
                        placeholder="Search tree code…"
                        id="search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="whatsapp-search-icon">
                        <svg strokeWidth="2.5" stroke="currentColor" viewBox="0 0 24 24" fill="none" className="whatsapp-search-swap-on">
                          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinejoin="round" strokeLinecap="round"></path>
                        </svg>
                        <svg strokeWidth="2.5" stroke="currentColor" viewBox="0 0 24 24" fill="none" className="whatsapp-search-swap-off">
                          <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinejoin="round" strokeLinecap="round"></path>
                        </svg>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSearchQuery("")} 
                        className="whatsapp-search-close-btn"
                        aria-label="Clear search"
                      >
                        <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current">
                          <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                        </svg>
                      </button>
                    </label>
                  </form>

                  {/* Segmented Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200/50 rounded-xl self-start md:self-auto select-none overflow-x-auto max-w-full flex-nowrap scrollbar-none shrink-0">
                    {[
                      { id: "all", label: `All Scans (${scans.length})` },
                      { id: "high-carbon", label: `High Carbon (${scans.filter(s => (s.co2e_kg || 0) >= 200).length})` },
                      { id: "estimated", label: `Estimated (${validScans.length})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all duration-200 whitespace-nowrap shrink-0 ${
                          activeTab === tab.id
                            ? "bg-white text-[#191919] shadow-sm font-semibold animate-fadeIn"
                            : "text-slate-500 hover:text-[#191919]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results Grid / Filter Empty State */}
                {filteredScans.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center">
                      {filteredScans.map((record, idx) => {
                        const isInvalid = record.dbh_cm === null || record.dbh_cm === undefined;
                        return (
                          <div
                            key={`${record.id}-${idx}`}
                            className="animate-fadeIn w-full flex justify-center"
                            style={{
                              animationDelay: `${(idx % 6) * 0.05}s`,
                            }}
                          >
                            <div className="vora-card">
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
                                <div className="vora-card-job-summary flex flex-col items-start">
                                  <div className="card__job text-base font-extrabold text-[#141417] leading-none mb-1">
                                    {record.co2e_kg ? `${record.co2e_kg.toFixed(0)} kg CO₂e` : "-"}
                                  </div>
                                  {isInvalid ? (
                                    <span className="text-[10px] text-rose-500 font-semibold font-sans">
                                      Invalid scan
                                    </span>
                                  ) : (
                                    <div className="text-[10px] text-slate-450 font-semibold font-sans">
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
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More Pagination Button */}
                    {hasMore && searchQuery === "" && activeTab === "all" && (
                      <div className="flex justify-center mt-12">
                        <button
                          onClick={handleLoadMore}
                          disabled={loading}
                          className="px-8 py-3 border border-slate-200 text-sm font-semibold rounded-2xl bg-white hover:bg-slate-50 hover:border-slate-350 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] select-none cursor-pointer"
                        >
                          {loading && (
                            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          )}
                          Load more scans
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-slate-350 gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <TreeIcon className="w-10 h-10 text-slate-300 mb-1" />
                    <p className="text-sm font-semibold text-slate-455">No matching scans found</p>
                    <p className="text-xs text-slate-350 max-w-xs mt-0.5">Try searching for a different tree code or adjust your query filter.</p>
                  </div>
                )}
              </div>
            ) : (
              !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-350 gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
                  <TreeIcon className="w-12 h-12 text-slate-300 mb-1" />
                  <p className="text-sm font-semibold mt-2 text-slate-400">No scans found in the gallery</p>
                </div>
              )
            )
          )}

          {/* TAB 2: Public Plots */}
          {galleryTab === "plot" && (
            plotsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
                <UiverseLoader />
                <p className="text-xs text-slate-450 font-medium">Loading public plots…</p>
                {isWakingUp && (
                  <p className="text-xs text-amber-600 mt-1 max-w-xs animate-pulse leading-relaxed">
                    ⚡ Waking up backend servers (Render.com free tier cold start). This may take up to 50 seconds.
                  </p>
                )}
              </div>
            ) : plots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
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
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-100">
                          {plot.privacy}
                        </span>
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
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-350 gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
                <TreeIcon className="w-12 h-12 text-slate-300 mb-1" />
                <p className="text-sm font-semibold mt-2 text-slate-400">No public plots found in the gallery</p>
              </div>
            )
          )}

          {/* Center Loading Spinner for first page scans */}
          {loading && scans.length === 0 && galleryTab === "tree" && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-6 animate-fadeIn">
              <UiverseLoader />
              <p className="text-xs text-slate-455 font-medium">Loading gallery scans…</p>
              {isWakingUp && (
                <p className="text-xs text-amber-600 mt-1 max-w-xs animate-pulse leading-relaxed">
                  ⚡ Waking up backend servers (Render.com free tier cold start). This may take up to 50 seconds.
                </p>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
