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
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

const LogoMark = () => (
  <svg viewBox="0 0 256 256" fill="currentColor" className="w-6 h-6 text-[#191919]">
    <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
    <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
    <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
  </svg>
);

const MetricBadge = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-serif text-[#191919]">{value}</span>
      <span className="text-[10px] text-slate-400">{unit}</span>
    </div>
  </div>
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
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
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
      <main className="flex-1 pt-28 pb-20 px-4">
        <div className="max-w-2xl mx-auto">

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
          <form onSubmit={handleSearch} className="flex gap-3 mb-10">
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
            <div className="flex items-center gap-3 text-slate-400 py-4">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
              <span className="text-sm">Fetching records for {activeCode}…</span>
            </div>
          )}

          {/* Error */}
          {error && searched && !loading && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-6 text-center">
              <p className="text-sm text-slate-500">{error}</p>
              <p className="text-xs text-slate-400 mt-2">
                Make sure the code is correct, then try again.
              </p>
            </div>
          )}

          {/* Results */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {history.length} scan{history.length > 1 ? "s" : ""} found for{" "}
                  <span className="text-[#191919] font-mono">{activeCode}</span>
                </h2>
                <Link
                  href={`/estimator?code=${encodeURIComponent(activeCode)}`}
                  className="text-xs font-semibold text-[#191919] hover:opacity-70 transition"
                >
                  View in 3D Estimator →
                </Link>
              </div>

              <div className="flex flex-col gap-4">
                {history.map((record, idx) => (
                  <div
                    key={record.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Scan #{idx + 1}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] font-bold uppercase tracking-widest bg-[#191919] text-white px-2 py-0.5 rounded-full">
                              Latest
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(record.scan_date)}</p>
                      </div>
                      <Link
                        href={`/estimator?code=${encodeURIComponent(record.tree_code)}`}
                        className="text-xs font-semibold text-[#191919] border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
                      >
                        Open 3D →
                      </Link>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
                      <MetricBadge label="DBH" value={record.dbh_cm.toFixed(1)} unit="cm" />
                      <MetricBadge label="Height" value={record.tinggi_m.toFixed(1)} unit="m" />
                      <MetricBadge label="Biomass" value={record.biomassa_kg.toFixed(1)} unit="kg" />
                      <MetricBadge label="Carbon" value={record.karbon_kg.toFixed(1)} unit="kg" />
                      <MetricBadge label="CO₂e" value={record.co2e_kg.toFixed(1)} unit="kg" />
                    </div>

                    {/* Confidence note */}
                    {record.confidence_note && (
                      <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                        {record.confidence_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty first state */}
          {!loading && !searched && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-300 gap-2">
              <span className="text-4xl">🌳</span>
              <p className="text-sm font-medium mt-2">Enter a tree code above to load its scan history</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
