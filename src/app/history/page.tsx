"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

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

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
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
      const res = await fetch(`${BACKEND_URL}/scans?limit=${PAGE_LIMIT}&offset=${currentOffset}`);
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

      {/* ── Navbar — 100% identical to landing page ──────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
          <LogoMark />
          <span className="font-semibold text-base tracking-tight text-[#191919]">Vora</span>
        </Link>

        {/* Center links (matching landing page perfectly) */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/#product" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Product
          </Link>
          <Link href="/#solutions" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Solutions
          </Link>
          <Link href="/#pricing" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Pricing
          </Link>
          <Link href="/history" className="text-sm text-[#191919] font-medium transition-colors duration-200">
            Gallery
          </Link>
        </div>

        {/* Right CTA button */}
        <Link
          href="/estimator"
          className="px-5 py-2.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200 shadow-sm"
        >
          View Estimator
        </Link>
      </nav>

      {/* ── Main content area ────────────────────────────────────── */}
      <main className="flex-1 pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Heading Section */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-200/50 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Forest Registry Dashboard</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#191919] mb-2">
                Scan Gallery
              </h1>
              <p className="text-sm text-[#191919]/60 max-w-2xl leading-relaxed">
                Browse all public tree scan results and forest carbon estimations.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 shadow-sm rounded-xl px-3.5 py-2 self-start md:self-auto">
              Total Forest Size: <span className="text-[#191919] font-bold">{scans.length} Tree{scans.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Real-time Aggregate Dashboard Stats */}
          {scans.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Forest Size</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-serif text-[#191919]">{scans.length}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">monitored trees</span>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 block mb-1">Carbon Capture (CO₂e)</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-serif text-emerald-950 font-semibold">
                    {totalCO2e.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">kg sequestered</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Avg Trunk Diameter</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-serif text-[#191919]">
                    {averageDBH.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">cm DBH</span>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar: Search input + Segmented Filter Tabs */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 border border-slate-200/60 p-3 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            {/* Search Pill */}
            <div className="relative w-full max-w-sm flex items-center bg-white border border-slate-200 rounded-full focus-within:ring-2 focus-within:ring-[#191919]/10 focus-within:border-[#191919] transition-all">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tree code (e.g. POHON-6144)…"
                className="w-full pl-9 pr-4 py-2 bg-transparent focus:outline-none text-xs font-semibold text-[#191919] placeholder:text-slate-400"
              />
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

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

          {/* Error Message */}
          {error && !loading && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-5 py-8 text-center max-w-2xl mb-8">
              <p className="text-sm text-slate-500 font-medium">{error}</p>
              <button 
                onClick={() => { setOffset(0); fetchScans(0, false); }}
                className="mt-4 px-4 py-2 bg-[#191919] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Results Grid */}
          {filteredScans.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredScans.map((record, idx) => {
                  const isInvalid = record.dbh_cm === null || record.dbh_cm === undefined;
                  const indexProgress = Math.min(((record.co2e_kg || 0) / 1000) * 100, 100);
                  
                  return (
                    <Link
                      key={`${record.id}-${idx}`}
                      href={`/estimator?code=${encodeURIComponent(record.tree_code)}`}
                      className="relative rounded-2xl overflow-hidden group border border-slate-200 hover:border-slate-350 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 bg-white flex flex-col p-3"
                    >
                      {/* Polaroid Framed Top Portion: Image inside padding */}
                      <div className="h-44 w-full relative overflow-hidden bg-slate-50 rounded-xl border border-slate-100">
                        {record.thumbnail_url ? (
                          <img
                            src={record.thumbnail_url}
                            alt={`Thumbnail for ${record.tree_code}`}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                            <span className="text-2xl mb-1">🌳</span>
                            <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">No Preview</span>
                          </div>
                        )}
                        
                        {/* Custom Counter Indicator Tag */}
                        <div className="absolute top-2.5 left-2.5 flex gap-1 items-center z-10">
                          <span className="text-[8px] font-bold uppercase tracking-widest bg-[#191919]/60 backdrop-blur-sm text-white px-2 py-0.5 rounded">
                            #{record.id}
                          </span>
                          {isInvalid && (
                            <span className="text-[8px] font-bold uppercase tracking-widest bg-rose-600 text-white px-2 py-0.5 rounded">
                              Invalid
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Polaroid Framed Bottom Portion: Detailed Metadata */}
                      <div className="pt-4 pb-2 px-1 flex-1 flex flex-col bg-white">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {formatDate(record.scan_date)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            IDX: {record.id}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold tracking-wider uppercase font-mono text-[#191919] group-hover:text-slate-600 transition-colors">
                            {record.tree_code}
                          </h3>
                          {/* Dynamic SVG Arrow */}
                          <svg
                            className="w-3.5 h-3.5 text-slate-400 transform translate-x-0 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-all duration-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>

                        {/* Thin divider */}
                        <div className="h-px bg-slate-100 my-3" />

                        {/* Valid Stats vs Invalid message */}
                        {isInvalid ? (
                          <span className="text-rose-500 text-[10px] font-medium tracking-wide">
                            Points3D missing (reprocessing required)
                          </span>
                        ) : (
                          <div className="flex flex-col gap-3.5">
                            {/* DBH + Height horizontal grids */}
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#191919]">
                              <div>
                                <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-sans font-bold">DBH</span>
                                <strong>{record.dbh_cm ? `${record.dbh_cm.toFixed(1)} cm` : "-"}</strong>
                              </div>
                              <div>
                                <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-sans font-bold">Height</span>
                                <strong>{record.tinggi_m ? `${record.tinggi_m.toFixed(1)} m` : "-"}</strong>
                              </div>
                            </div>

                            {/* Minimalist Sequestration Progress index meter */}
                            <div>
                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-1">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                  style={{ width: `${indexProgress}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold">
                                <span>CO₂e Sequestration Index</span>
                                <span className="text-emerald-700 font-mono font-bold">
                                  {record.co2e_kg ? `${record.co2e_kg.toFixed(0)} kg` : "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
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
            /* Empty state (either query filter or no scans) */
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-350 gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-3xl opacity-50">🌳</span>
              <p className="text-sm font-semibold text-slate-450">No matching scans found</p>
              <p className="text-xs text-slate-350 max-w-xs mt-0.5">Try searching for a different tree code or adjust your query filter.</p>
            </div>
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
