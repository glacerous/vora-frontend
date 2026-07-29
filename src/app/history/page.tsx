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
          <div className="mb-12 border-b border-slate-100 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/50">Forest Carbon Registry</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-[#191919] mb-3">
                Scan Gallery
              </h1>
              <p className="text-sm text-[#191919]/65 max-w-2xl leading-relaxed">
                Browse all public tree scan results, interactive 3D Gaussian Splat reconstructions, and estimated forest carbon sequestration datasets.
              </p>
            </div>
            {scans.length > 0 && (
              <div className="flex items-center gap-2 self-start md:self-auto px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-600">
                  {scans.length} Scan{scans.length !== 1 ? "s" : ""} Indexed
                </span>
              </div>
            )}
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
          {scans.length > 0 && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {scans.map((record, idx) => {
                  const isInvalid = record.dbh_cm === null || record.dbh_cm === undefined;
                  return (
                    <Link
                      key={`${record.id}-${idx}`}
                      href={`/estimator?code=${encodeURIComponent(record.tree_code)}`}
                      className="relative aspect-[4/3] rounded-2xl overflow-hidden group border border-slate-200/60 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-slate-50 flex flex-col"
                    >
                      {/* Cover Thumbnail Image */}
                      {record.thumbnail_url ? (
                        <img
                          src={record.thumbnail_url}
                          alt={`Thumbnail for ${record.tree_code}`}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center text-slate-400">
                          <span className="text-3xl mb-1 opacity-45">🌳</span>
                          <span className="text-[10px] uppercase font-bold tracking-widest opacity-35">No Preview</span>
                        </div>
                      )}

                      {/* Gradient Overlay for Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pt-12" />

                      {/* Top Right: CO2e Value Badge (Premium Dark Glass Look) */}
                      {!isInvalid && (
                        <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl text-center shadow-sm flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <div className="text-left">
                            <span className="block text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none mb-0.5">CO₂e Sequestration</span>
                            <span className="text-xs font-bold text-white font-mono leading-none">
                              {record.co2e_kg ? record.co2e_kg.toFixed(0) : "-"}
                              <span className="text-[9px] text-emerald-400 font-sans ml-0.5">kg</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Top Left: Scan Counter / Invalid badge */}
                      <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                        <div className="flex gap-1">
                          {idx === 0 && !isInvalid && (
                            <span className="text-[8px] font-bold uppercase tracking-widest bg-emerald-500 text-white px-2 py-1 rounded-lg shadow-sm">
                              Latest
                            </span>
                          )}
                          <span className="text-[8px] font-bold uppercase tracking-widest bg-black/40 backdrop-blur-sm text-white/95 px-2 py-1 rounded-lg">
                            #{scans.length - idx}
                          </span>
                        </div>
                        {isInvalid && (
                          <span className="text-[8px] font-bold uppercase tracking-wide bg-rose-600 text-white px-2 py-1 rounded-lg shadow-sm border border-rose-500">
                            ⚠️ Invalid
                          </span>
                        )}
                      </div>

                      {/* Bottom Metadata Panel */}
                      <div className="mt-auto relative z-10 p-5 text-white flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-white/65 font-medium tracking-wide">
                            {formatDate(record.scan_date)}
                          </span>
                          <span className="text-[9px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full font-mono">
                            ID: {record.id}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold tracking-wider uppercase font-mono text-white group-hover:text-emerald-300 transition-colors">
                            {record.tree_code}
                          </h3>
                          {/* Hover Arrow Indicator */}
                          <svg
                            className="w-4 h-4 text-white/60 transform translate-x-0 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-all duration-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>

                        {/* Pill Mini Metrics Row */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                          {isInvalid ? (
                            <span className="text-rose-300 text-[10px] font-medium tracking-wide flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              Reprocessing required
                            </span>
                          ) : (
                            <>
                              <div className="px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-mono text-white/95 flex items-center gap-1.5">
                                <span className="text-white/50 text-[9px] uppercase font-sans">DBH</span>
                                <strong>{record.dbh_cm ? record.dbh_cm.toFixed(1) : "-"} <span className="font-normal text-[9px]">cm</span></strong>
                              </div>
                              <div className="px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-mono text-white/95 flex items-center gap-1.5">
                                <span className="text-white/50 text-[9px] uppercase font-sans">H</span>
                                <strong>{record.tinggi_m ? record.tinggi_m.toFixed(1) : "-"} <span className="font-normal text-[9px]">m</span></strong>
                              </div>
                              <div className="px-2 py-1 bg-emerald-500/25 border border-emerald-500/20 backdrop-blur-md rounded-lg text-[10px] font-mono text-emerald-300 flex items-center gap-1.5 ml-auto">
                                <span className="text-emerald-300/50 text-[9px] uppercase font-sans">Carbon</span>
                                <strong>{record.karbon_kg ? record.karbon_kg.toFixed(1) : "-"} <span className="font-normal text-[9px]">kg</span></strong>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Load More Pagination Button */}
              {hasMore && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-8 py-3 border border-slate-200 text-sm font-semibold rounded-2xl hover:bg-slate-50 hover:border-slate-350 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-sm"
                  >
                    {loading && (
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    )}
                    Load more scans
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {scans.length === 0 && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-300 gap-2">
              <span className="text-4xl opacity-50">🌳</span>
              <p className="text-sm font-semibold mt-2 text-slate-400">No scans found in the gallery</p>
              <p className="text-xs text-slate-300 max-w-xs mt-1">Upload a video in the New Scan page to generate your first 3D reconstruction.</p>
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
