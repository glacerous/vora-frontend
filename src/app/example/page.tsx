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
}

interface PipelineStatus {
  stage: string;
  message: string;
  frame_count: number;
  error: string | null;
  carbon_estimation: any | null;
  frames: string[];
  has_result: boolean;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

const LogoMark = () => (
  <svg viewBox="0 0 256 256" fill="currentColor" className="w-6 h-6 text-[#191919]">
    <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
    <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
    <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
  </svg>
);

export default function ExampleDashboard() {
  const [searchInput, setSearchInput] = useState("TEST-0001");
  const [activeTreeCode, setActiveTreeCode] = useState("TEST-0001");
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchTreeHistory = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/history/${code}`);
      if (!res.ok) throw new Error(`Failed to fetch history (HTTP ${res.status})`);
      const data = await res.json();
      if (data.success && data.history && data.history.length > 0) {
        setHistory(data.history);
        setCurrentScan(data.history[0]);
      } else {
        setHistory([]);
        setCurrentScan(null);
        setError(`No scans found for "${code}"`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
      setHistory([]);
      setCurrentScan(null);
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/status`);
      if (res.ok) setPipelineStatus(await res.json());
    } catch {}
  };

  useEffect(() => { if (activeTreeCode) fetchTreeHistory(activeTreeCode); }, [activeTreeCode]);
  useEffect(() => {
    pollStatus();
    const iv = setInterval(pollStatus, 3000);
    return () => clearInterval(iv);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) setActiveTreeCode(searchInput.trim());
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return dateStr; }
  };

  return (
    <div className="fixed inset-0 bg-white overflow-hidden font-sans text-[#191919]">

      {/* ── Full-screen 3D Viewer ──────────────────────────────── */}
      <div className="absolute inset-0 z-0 bg-white">
        {currentScan ? (
          <iframe
            src={`${BACKEND_URL}/viewer.html?v=10&url=${encodeURIComponent(currentScan.splat_file_url)}`}
            allow="xr-spatial-tracking; autoplay; fullscreen"
            className="w-full h-full border-none"
            title="3D Tree Gaussian Splat Viewer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            {loading
              ? <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              : <p className="text-sm text-slate-300 font-medium tracking-wide">No scan loaded</p>
            }
          </div>
        )}
      </div>

      {/* ── Navbar — exact match to landing page ──────────────── */}
      <nav className="absolute top-0 left-0 right-0 z-30 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <Link href="/" className="flex items-center cursor-pointer">
          <span className="font-bold text-xl tracking-tight text-[#191919]">Vora.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <Link href="/gallery" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Gallery
          </Link>
        </div>
      </nav>

      {/* Floating Sidebar Toggle Button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-[88px] right-6 z-30 p-3 bg-[#191919] text-white hover:bg-[#191919]/90 rounded-full transition-all duration-200 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95"
          aria-label="Toggle Scans Drawer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      )}

      {/* ── Slide-in sidebar — scan list ──────────────────────── */}
      <div
        className={`absolute top-[65px] right-0 bottom-0 z-20 w-full max-w-[300px] sm:w-80 bg-white border-l border-slate-100 flex flex-col transition-transform duration-300 ease-in-out pt-[12px] ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header with Close Button */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tree Lookup</p>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-[#191919] flex items-center justify-center text-[10px] transition"
          >
            ✕
          </button>
        </div>

        {/* Search inside sidebar */}
        <div className="px-5 pb-5 border-b border-slate-100">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tree code…"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-slate-400 text-sm font-medium"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#191919] text-white text-xs font-semibold rounded-lg hover:bg-[#191919]/90 transition"
            >
              Go
            </button>
          </form>
        </div>

        {/* Scan list */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            Scans ({history.length})
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            </div>
          ) : history.length > 0 ? (
            <div className="flex flex-col gap-1">
              {history.map((record) => (
                <button
                  key={record.id}
                  onClick={() => { setCurrentScan(record); setSidebarOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition text-xs ${
                    currentScan?.id === record.id
                      ? "bg-[#191919] text-white border-[#191919]"
                      : "border-transparent hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold uppercase">{record.tree_code}</span>
                    <span className={currentScan?.id === record.id ? "text-white/50" : "text-slate-300"}>#{record.id}</span>
                  </div>
                  <span className={`text-[10px] ${currentScan?.id === record.id ? "text-white/60" : "text-slate-400"}`}>
                    {formatDate(record.scan_date)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-300 text-center py-8">No scans found.</p>
          )}
        </div>
      </div>

      {/* ── Carbon metrics — bottom-center overlay ──────────────── */}
      {currentScan && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-auto">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl px-5 py-3 flex items-center justify-between sm:justify-start gap-4 sm:gap-6 divide-x divide-slate-100 overflow-x-auto select-none">
            {[
              { label: "DBH", value: currentScan.dbh_cm.toFixed(1), unit: "cm" },
              { label: "Height", value: currentScan.tinggi_m.toFixed(1), unit: "m" },
              { label: "Biomass", value: currentScan.biomassa_kg.toFixed(1), unit: "kg" },
              { label: "Carbon", value: currentScan.karbon_kg.toFixed(1), unit: "kg" },
              { label: "CO₂e", value: currentScan.co2e_kg.toFixed(1), unit: "kg" },
            ].map(({ label, value, unit }, idx) => (
              <div key={label} className={`flex flex-col gap-0.5 ${idx > 0 ? "pl-4 sm:pl-6" : ""}`}>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
                <div className="flex items-baseline">
                  <span className="font-serif text-xl sm:text-2xl text-[#191919] leading-none">{value}</span>
                  <span className="text-[10px] text-slate-450 font-medium ml-1">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pipeline status banner ─────────────────────────────── */}
      {pipelineStatus && pipelineStatus.stage !== "idle" && (
        <div className="absolute bottom-24 right-6 z-20 max-w-xs bg-white border border-amber-200 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Reconstruction Active</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{pipelineStatus.message}</p>
        </div>
      )}

      {/* ── Error toast ───────────────────────────────────────── */}
      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#191919] text-white text-xs px-5 py-3 rounded-xl shadow-lg">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition">✕</button>
        </div>
      )}
    </div>
  );
}
