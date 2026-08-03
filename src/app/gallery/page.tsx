"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";

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

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";
const PAGE_LIMIT = 12;

const LogoMark = () => (
  <svg viewBox="0 0 256 256" fill="currentColor" className="w-6 h-6 text-[#191919]">
    <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
    <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
    <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
  </svg>
);

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
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Search and Segment Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "high-carbon" | "estimated"

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

  // Initial load
  useEffect(() => {
    fetchScans(0, false);
  }, []);

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

  // Aggregate Stats Calculations
  const validScans = scans.filter(s => s.dbh_cm);
  const totalCO2e = scans.reduce((acc, s) => acc + (s.co2e_kg || 0), 0);
  const averageDBH = validScans.length > 0 
    ? scans.reduce((acc, s) => acc + (s.dbh_cm || 0), 0) / validScans.length 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans text-[#191919]">

      {/* ── Main content area ────────────────────────────────────── */}
      <main className="flex-1 pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Heading Section */}
          <div className="mb-10 border-b border-slate-200/50 pb-6">
            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#191919] mb-2">
              Scan Gallery
            </h1>
            <p className="text-sm text-[#191919]/60 max-w-2xl leading-relaxed">
              Browse all public tree scan results and forest carbon estimations.
            </p>
          </div>

          {/* Main Content Interface (Rendered only once data is loaded or API call completes) */}
          {scans.length > 0 ? (
            <div>
              {/* Toolbar: Search input + Segmented Filter Tabs */}
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search input with custom Uiverse style */}
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
                <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200/50 rounded-xl self-start md:self-auto">
                  {[
                    { id: "all", label: `All Scans (${scans.length})` },
                    { id: "high-carbon", label: `High Carbon (${scans.filter(s => (s.co2e_kg || 0) >= 200).length})` },
                    { id: "estimated", label: `Estimated (${validScans.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-white text-[#191919] shadow-sm font-semibold"
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
                        <Reveal
                          key={`${record.id}-${idx}`}
                          delay={(idx % 6) * 0.06}
                        >
                          <div className="vora-card">
                            <section className="vora-card-hero relative overflow-hidden bg-[#fef4e2]">
                              {/* Background Image/Icon filling the container */}
                              {record.thumbnail_url ? (
                                <img
                                  src={record.thumbnail_url}
                                  alt={`Thumbnail for ${record.tree_code}`}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-amber-500/10 bg-[#fef4e2]">
                                  <TreeIcon className="w-16 h-16" />
                                </div>
                              )}

                              {/* Dark text-overlay gradient for image readability */}
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
                                  <div className="text-[10px] text-slate-400 font-semibold font-sans">
                                    {record.dbh_cm ? `${record.dbh_cm.toFixed(1)} cm DBH` : "-"} / {record.tinggi_m ? `${record.tinggi_m.toFixed(1)} m H` : "-"}
                                  </div>
                                )}
                              </div>
                              <div className="vora-card-view-save">
                                <Link
                                  href={`/estimator?code=${encodeURIComponent(record.tree_code)}`}
                                  className="vora-card-btn"
                                >
                                  View
                                </Link>
                              </div>
                            </footer>
                          </div>
                        </Reveal>
                      );
                    })}
                  </div>

                  {/* Load More Pagination Button */}
                  {hasMore && searchQuery === "" && activeTab === "all" && (
                    <div className="flex justify-center mt-12">
                      <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="px-8 py-3 border border-slate-200 text-sm font-semibold rounded-2xl bg-white hover:bg-slate-50 hover:border-slate-350 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
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
                /* Search Filter Empty State */
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-350 gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <TreeIcon className="w-10 h-10 text-slate-300 mb-1" />
                  <p className="text-sm font-semibold text-slate-455">No matching scans found</p>
                  <p className="text-xs text-slate-350 max-w-xs mt-0.5">Try searching for a different tree code or adjust your query filter.</p>
                </div>
              )}
            </div>
          ) : (
            /* Database is empty (scans.length === 0) */
            !loading && !error && (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-350 gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <TreeIcon className="w-12 h-12 text-slate-300 mb-1" />
                <p className="text-sm font-semibold mt-2 text-slate-400">No scans found in the gallery</p>
                <p className="text-xs text-slate-300 max-w-xs mt-1">Upload a video in the New Scan page to generate your first 3D reconstruction.</p>
              </div>
            )
          )}

          {/* Center Loading Spinner for first page */}
          {loading && scans.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
              <UiverseLoader />
              <p className="text-xs text-slate-450 font-medium">Loading gallery scans…</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
