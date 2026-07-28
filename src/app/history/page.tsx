"use client";

import React, { useState } from "react";
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

const LogoMark = () => (
  <svg viewBox="0 0 256 256" fill="currentColor" className="w-6 h-6 text-[#191919]">
    <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
    <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
    <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
  </svg>
);

export default function HistoryPage() {
  const [input, setInput] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric"
      });
    } catch { return dateStr; }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError(null);
    setHistory([]);
    setSearched(false);
    setActiveCode(code);

    try {
      const res = await fetch(`${BACKEND_URL}/history/${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.success && data.history?.length > 0) {
        setHistory(data.history);
      } else {
        setError(`No scan records found for tree code "${code}".`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to reach backend.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-[#191919]">

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
          <LogoMark />
          <span className="font-semibold text-base tracking-tight text-[#191919]">Vora</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/reconstruct" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            New scan
          </Link>
          <Link href="/estimator" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Estimator
          </Link>
        </div>
      </nav>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Heading */}
          <div className="mb-10">
            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight mb-2">
              Scan history
            </h1>
            <p className="text-sm text-[#191919]/50 leading-relaxed">
              Enter your tree code to retrieve all previous scan results and carbon estimates.
            </p>
          </div>

          {/* Search box */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-12 max-w-2xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter tree code — e.g. POHON-1234"
              className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-slate-400 text-sm font-medium transition"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-[#191919] hover:bg-[#191919]/90 text-white text-sm font-medium rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "…" : "Lookup"}
            </button>
          </form>

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 text-slate-400 py-6">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Fetching records for {activeCode}…</span>
            </div>
          )}

          {/* Error */}
          {error && searched && !loading && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-8 text-center max-w-2xl">
              <p className="text-sm text-slate-500 font-medium">{error}</p>
              <p className="text-xs text-slate-400 mt-2">
                Make sure the code is correct, then try again.
              </p>
            </div>
          )}

          {/* Results Grid */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {history.length} scan{history.length > 1 ? "s" : ""} found for{" "}
                  <span className="text-[#191919] font-mono">{activeCode}</span>
                </h2>
                <Link
                  href={`/estimator?code=${encodeURIComponent(activeCode)}`}
                  className="text-xs font-semibold text-[#191919] hover:opacity-75 transition"
                >
                  Open in 3D Estimator →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {history.map((record, idx) => (
                  <Link
                    key={record.id}
                    href={`/estimator?code=${encodeURIComponent(record.tree_code)}`}
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden group border border-slate-100 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-slate-50 flex flex-col"
                  >
                    {/* Cover Thumbnail Image */}
                    {record.thumbnail_url ? (
                      <img
                        src={record.thumbnail_url}
                        alt={`Thumbnail for ${record.tree_code}`}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center text-slate-400">
                        <span className="text-3xl mb-1 opacity-45">🌳</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-35">No Preview</span>
                      </div>
                    )}

                    {/* Gradient Overlay for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pt-12" />

                    {/* Top Right: CO2e Value Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-center shadow-sm">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">CO₂e</span>
                      <span className="text-sm font-head font-normal text-[#191919] leading-none">
                        {record.co2e_kg ? record.co2e_kg.toFixed(0) : "-"}
                        <span className="text-[9px] font-sans font-semibold text-slate-400 ml-0.5">kg</span>
                      </span>
                    </div>

                    {/* Top Left: Scan Order Indicator badge */}
                    <div className="absolute top-3 left-3 flex gap-1">
                      {idx === 0 && (
                        <span className="text-[8px] font-bold uppercase tracking-widest bg-emerald-500 text-white px-2 py-1 rounded-lg">
                          Latest
                        </span>
                      )}
                      <span className="text-[8px] font-bold uppercase tracking-widest bg-black/40 backdrop-blur-sm text-white/90 px-2 py-1 rounded-lg">
                        #{history.length - idx}
                      </span>
                    </div>

                    {/* Bottom Metadata Panel */}
                    <div className="mt-auto relative z-10 p-4 text-white flex flex-col">
                      <span className="text-[10px] text-white/60 font-medium mb-0.5">
                        {formatDate(record.scan_date)}
                      </span>
                      <h3 className="text-sm font-bold tracking-wider uppercase font-mono">
                        {record.tree_code}
                      </h3>

                      {/* Pill Mini Metrics Row */}
                      <div className="flex gap-3 mt-2 text-[10px] text-white/70 border-t border-white/10 pt-2">
                        <span>DBH: <strong>{record.dbh_cm ? record.dbh_cm.toFixed(1) : "-"} cm</strong></span>
                        <span>Height: <strong>{record.tinggi_m ? record.tinggi_m.toFixed(1) : "-"} m</strong></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty first state */}
          {!loading && !searched && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-300 gap-2 max-w-2xl">
              <span className="text-4xl opacity-50">🌳</span>
              <p className="text-sm font-semibold mt-2 text-slate-400">Enter a tree code above to load its scan history</p>
              <p className="text-xs text-slate-300 max-w-xs mt-1">If you just submitted a scan, please allow a few minutes for the pipeline process to finish before looking it up.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
