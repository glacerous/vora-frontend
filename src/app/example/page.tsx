"use client";

import React, { useState, useEffect, useRef } from "react";
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

const BACKEND_URL = "https://vora-52k9.onrender.com";

const LogoMark = () => (
  <svg viewBox="0 0 256 256" fill="currentColor" className="w-5 h-5 text-[#191919]">
    <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
    <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
    <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
  </svg>
);

const MetricCard = ({
  id,
  label,
  value,
  unit,
}: {
  id: string;
  label: string;
  value: string;
  unit: string;
}) => (
  <div
    id={id}
    className="flex flex-col gap-0.5 bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl px-4 py-3 shadow-sm"
  >
    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
      {label}
    </span>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-serif font-normal text-[#191919] leading-tight">
        {value}
      </span>
      <span className="text-[10px] text-slate-400 font-medium">{unit}</span>
    </div>
  </div>
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

      {/* ── Full-screen 3D Viewer ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {currentScan ? (
          <iframe
            src={`${BACKEND_URL}/viewer.html?url=${encodeURIComponent(currentScan.splat_file_url)}`}
            allow="xr-spatial-tracking; autoplay; fullscreen"
            className="w-full h-full border-none"
            title="WebGL Tree Splat Viewer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white">
            {loading ? (
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-5xl mb-4 opacity-20">🌳</span>
                <p className="text-sm text-slate-400 font-medium">No scan loaded</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-3.5 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-semibold text-sm tracking-tight">Vora</span>
        </Link>

        {/* Centre title */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Example Scan /
          </span>
          <span className="text-xs font-bold text-[#191919]">{activeTreeCode}</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* GPU status pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
            <span className={`w-1.5 h-1.5 rounded-full ${pipelineStatus?.stage === "idle" ? "bg-emerald-500" : "bg-amber-400 animate-ping"}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {pipelineStatus?.stage === "idle" ? "GPU Ready" : pipelineStatus?.stage || "…"}
            </span>
          </div>
          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#191919] text-white text-[10px] font-bold uppercase tracking-wider transition hover:bg-slate-700"
          >
            {sidebarOpen ? "Close" : "Scans"}
          </button>
          <Link href="/estimator" className="text-xs font-medium text-slate-500 hover:text-[#191919] transition">
            Estimator →
          </Link>
        </div>
      </div>

      {/* ── Right Sidebar: scan list ──────────────────────────────── */}
      <div
        className={`absolute top-[57px] right-0 bottom-0 z-20 w-72 bg-white/95 backdrop-blur-lg border-l border-slate-200/70 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Tree Lookup</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tree code..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:border-slate-400 text-sm font-semibold"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#191919] text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition"
            >
              Go
            </button>
          </form>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Scans ({history.length})
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            </div>
          ) : history.length > 0 ? (
            history.map((record) => (
              <button
                key={record.id}
                onClick={() => { setCurrentScan(record); setSidebarOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition text-xs ${
                  currentScan?.id === record.id
                    ? "bg-[#191919] text-white border-[#191919]"
                    : "bg-transparent border-transparent hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold uppercase">{record.tree_code}</span>
                  <span className={`${currentScan?.id === record.id ? "text-white/50" : "text-slate-400"}`}>#{record.id}</span>
                </div>
                <span className={`text-[10px] ${currentScan?.id === record.id ? "text-white/60" : "text-slate-400"}`}>
                  {formatDate(record.scan_date)}
                </span>
              </button>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">No scans found.</p>
          )}
        </div>
      </div>

      {/* ── Metrics Overlay (bottom-left over 3D) ────────────────── */}
      {currentScan && (
        <div className="absolute bottom-6 left-5 z-20 flex flex-col gap-2">
          <MetricCard id="pill-dbh" label="Trunk Diameter (DBH)" value={currentScan.dbh_cm.toFixed(1)} unit="cm" />
          <MetricCard id="pill-height" label="Tree Height" value={currentScan.tinggi_m.toFixed(1)} unit="m" />
          <MetricCard id="pill-biomass" label="Biomass" value={currentScan.biomassa_kg.toFixed(1)} unit="kg" />
          <MetricCard id="pill-carbon" label="Stored Carbon" value={currentScan.karbon_kg.toFixed(1)} unit="kg" />
          <MetricCard id="pill-co2e" label="CO₂ Equivalent" value={currentScan.co2e_kg.toFixed(1)} unit="kg" />
        </div>
      )}

      {/* ── Reconstruction status banner ─────────────────────────── */}
      {pipelineStatus && pipelineStatus.stage !== "idle" && (
        <div className="absolute bottom-6 right-5 z-20 max-w-xs bg-amber-50/95 backdrop-blur-md border border-amber-200 rounded-2xl px-4 py-3 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Reconstruction Active</span>
          </div>
          <p className="text-xs text-amber-700/80 leading-relaxed italic">{pipelineStatus.message}</p>
        </div>
      )}

      {/* ── Error toast ──────────────────────────────────────────── */}
      {error && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#191919] text-white text-xs px-5 py-3 rounded-2xl shadow-xl">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100 transition">✕</button>
        </div>
      )}
    </div>
  );
}
