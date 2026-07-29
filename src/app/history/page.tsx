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

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Dynamic filter for search bar
  const filteredScans = scans.filter((scan) =>
    scan.tree_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-[#191919]">

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
          <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#191919] mb-2">
                Scan Gallery
              </h1>
              <p className="text-sm text-[#191919]/60 max-w-2xl leading-relaxed">
                Browse all public tree scan results and forest carbon estimations.
              </p>
            </div>
            {scans.length > 0 && (
              <div className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 self-start md:self-auto">
                {scans.length} scan{scans.length !== 1 ? "s" : ""} loaded
              </div>
            )}
          </div>

          {/* Search Bar HUD */}
          <div className="mb-8 max-w-md">
            <div className="relative flex items-center shadow-sm rounded-xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#191919]/10 focus-within:border-[#191919] transition-all">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tree code (e.g. POHON-6144)…"
                className="w-full pl-9 pr-4 py-2.5 bg-transparent focus:outline-none text-xs font-semibold text-[#191919] placeholder:text-slate-400"
              />
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Error Message */}
          {error && !loading && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-8 text-center max-w-2xl mb-8">
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
                  return (
                    <Link
                      key={`${record.id}-${idx}`}
                      href={`/estimator?code=${encodeURIComponent(record.tree_code)}`}
                      className="relative rounded-2xl overflow-hidden group border border-slate-200 hover:border-slate-350 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 bg-white flex flex-col"
                    >
                      {/* Top portion: Card Image */}
                      <div className="h-44 w-full relative overflow-hidden bg-slate-50">
                        {record.thumbnail_url ? (
                          <img
                            src={record.thumbnail_url}
                            alt={`Thumbnail for ${record.tree_code}`}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                            <span className="text-2xl mb-1">🌳</span>
                            <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">No Preview</span>
                          </div>
                        )}
                        
                        {/* Top corner count badge */}
                        <div className="absolute top-3 left-3 flex gap-1 items-center">
                          <span className="text-[8px] font-bold uppercase tracking-widest bg-[#191919]/60 backdrop-blur-sm text-white px-2 py-0.5 rounded">
                            #{record.id}
                          </span>
                          {isInvalid && (
                            <span className="text-[8px] font-bold uppercase tracking-widest bg-rose-600 text-white px-2 py-0.5 rounded shadow-sm">
                              Invalid
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom portion: Structured Metadata */}
                      <div className="p-4 flex-1 flex flex-col bg-white">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">
                          {formatDate(record.scan_date)}
                        </span>
                        <h3 className="text-sm font-bold tracking-wider uppercase font-mono text-[#191919] group-hover:text-slate-600 transition-colors">
                          {record.tree_code}
                        </h3>

                        {/* Thin divider */}
                        <div className="h-px bg-slate-100 my-3" />

                        {/* Metrics Table Grid */}
                        {isInvalid ? (
                          <span className="text-rose-500 text-[10px] font-medium tracking-wide">
                            Points3D missing (reprocessing required)
                          </span>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {/* DBH */}
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">DBH</span>
                              <span className="text-xs font-semibold text-[#191919] mt-0.5 font-mono">
                                {record.dbh_cm ? `${record.dbh_cm.toFixed(1)} cm` : "-"}
                              </span>
                            </div>
                            {/* Height */}
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Height</span>
                              <span className="text-xs font-semibold text-[#191919] mt-0.5 font-mono">
                                {record.tinggi_m ? `${record.tinggi_m.toFixed(1)} m` : "-"}
                              </span>
                            </div>
                            {/* CO2e */}
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">CO₂e</span>
                              <span className="text-xs font-bold text-emerald-700 mt-0.5 font-mono">
                                {record.co2e_kg ? `${record.co2e_kg.toFixed(0)} kg` : "-"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Load More Pagination Button */}
              {hasMore && searchQuery === "" && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-8 py-3 border border-slate-200 text-sm font-semibold rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-sm"
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
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-300 gap-2 bg-slate-50/55 rounded-2xl border border-dashed border-slate-200">
              <span className="text-3xl opacity-50">🌳</span>
              <p className="text-sm font-semibold text-slate-400">No matching scans found</p>
              <p className="text-xs text-slate-300 max-w-xs mt-0.5">Try searching for a different tree code or adjust your query.</p>
            </div>
          )}

          {/* Center Loading Spinner for first page */}
          {loading && scans.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading gallery scans…</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
