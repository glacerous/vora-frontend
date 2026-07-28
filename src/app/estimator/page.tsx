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
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    className="w-6 h-6 text-[#191919]"
  >
    <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
    <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
    <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
  </svg>
);

export default function Dashboard() {
  const [searchInput, setSearchInput] = useState("");
  const [activeTreeCode, setActiveTreeCode] = useState("");
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const iframeWrapperRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number; id: string }>
  >([]);

  // Fetch scan records for tree code
  const fetchTreeHistory = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/history/${code}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch history (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.history && data.history.length > 0) {
        setHistory(data.history);
        setCurrentScan(data.history[0]);
      } else {
        setHistory([]);
        setCurrentScan(null);
        setError(`No scans found for tree code "${code}"`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load data from backend.");
      setHistory([]);
      setCurrentScan(null);
    } finally {
      setLoading(false);
    }
  };

  // Poll reconstruction pipeline status
  const pollStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/status`);
      if (res.ok) {
        const data = await res.json();
        setPipelineStatus(data);
      }
    } catch (err) {
      console.warn("Failed to poll status:", err);
    }
  };

  // Calculate coordinates for SVG connecting lines
  const updateLineCoordinates = () => {
    if (!dashboardRef.current || !iframeWrapperRef.current || !currentScan) return;

    const parentRect = dashboardRef.current.getBoundingClientRect();
    const iframeRect = iframeWrapperRef.current.getBoundingClientRect();

    const relativeTargets: Record<string, { x: number; y: number }> = {
      dbh: { x: 0.48, y: 0.70 },
      height: { x: 0.49, y: 0.24 },
      biomass: { x: 0.53, y: 0.38 },
      carbon: { x: 0.47, y: 0.52 },
      co2e: { x: 0.50, y: 0.81 },
    };

    const ids = ["dbh", "height", "biomass", "carbon", "co2e"] as const;
    const newLines = ids
      .map((id) => {
        const pill = document.getElementById(`pill-${id}`);
        if (pill) {
          const pillRect = pill.getBoundingClientRect();
          const x1 = pillRect.left - parentRect.left;
          const y1 = pillRect.top + pillRect.height / 2 - parentRect.top;

          const t = relativeTargets[id];
          const x2 = iframeRect.left - parentRect.left + iframeRect.width * t.x;
          const y2 = iframeRect.top - parentRect.top + iframeRect.height * t.y;

          return { x1, y1, x2, y2, id };
        }
        return null;
      })
      .filter(Boolean) as typeof lines;

    setLines(newLines);
  };

  // Fetch only when activeTreeCode changes and is not empty
  useEffect(() => {
    if (activeTreeCode) {
      fetchTreeHistory(activeTreeCode);
    }
  }, [activeTreeCode]);

  // Status poller
  useEffect(() => {
    pollStatus();
    const statusInterval = setInterval(pollStatus, 3000);
    return () => clearInterval(statusInterval);
  }, []);

  // Check URL search parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        setSearchInput(code);
        setActiveTreeCode(code);
      }
    }
  }, []);

  // Update lines on resize
  useEffect(() => {
    updateLineCoordinates();
    window.addEventListener("resize", updateLineCoordinates);
    const timer = setTimeout(updateLineCoordinates, 450);

    return () => {
      window.removeEventListener("resize", updateLineCoordinates);
      clearTimeout(timer);
    };
  }, [currentScan, history]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActiveTreeCode(searchInput.trim());
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden flex flex-col font-sans text-[#191919]">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-semibold text-base tracking-tight text-[#191919]">
            Vora
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/example" className="text-sm font-medium text-[#191919]/75 hover:text-[#191919] transition">
            View Example Scan
          </Link>
          <Link href="/" className="text-sm font-medium text-[#191919]/75 hover:text-[#191919] transition">
            Home
          </Link>
        </div>
      </nav>

      {/* Main Dashboard Section */}
      <main
        ref={dashboardRef}
        className="flex-1 pt-24 pb-12 px-4 md:p-6 lg:p-8 flex flex-col max-w-[1400px] w-full mx-auto"
      >
        {/* Inner header bar */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 mb-6 gap-4 shadow-sm mt-4">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 animate-pulse" />
            <h2 className="font-head text-2xl uppercase tracking-wider text-slate-800">
              3D CARBON ESTIMATOR
            </h2>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
            <span className={`w-2 h-2 rounded-full ${pipelineStatus?.stage === "idle" ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Modal GPU: {pipelineStatus?.stage === "idle" ? "Ready" : pipelineStatus?.stage || "Connecting"}
            </span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
          
          {/* Left Column: Search & History list */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Search Box */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block mb-2">
                Tree Lookup
              </span>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter tree code..."
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-950/5 border border-slate-950/15 focus:outline-none focus:border-slate-450 transition text-slate-850 text-sm font-semibold"
                />
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition duration-155 text-sm shadow-md"
                >
                  Go
                </button>
              </form>
            </div>

            {/* Polling Banner */}
            {pipelineStatus && pipelineStatus.stage !== "idle" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="font-bold text-xs uppercase tracking-wider text-amber-800">
                    Reconstruction Active
                  </span>
                </div>
                <p className="text-xs text-amber-700/80 leading-relaxed italic">
                  {pipelineStatus.message}
                </p>
              </div>
            )}

            {/* History Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex-1 flex flex-col min-h-[300px]">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block mb-3">
                Scans Database ({history.length})
              </span>
              
              {loading ? (
                <div className="flex-1 flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-450 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : history.length > 0 ? (
                <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-none pr-1 flex flex-col gap-2">
                  {history.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => setCurrentScan(record)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        currentScan?.id === record.id
                          ? "bg-slate-100 border-[#191919]/10 shadow-sm"
                          : "bg-transparent border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-800 uppercase">
                          {record.tree_code}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ID: {record.id}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatDate(record.scan_date)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-8 text-center text-slate-400 text-xs">
                  No scan items loaded. Enter tree code to lookup.
                </div>
              )}
            </div>
          </div>

          {/* Center Column: 3D viewer iframe */}
          <div className="lg:col-span-6 flex flex-col">
            <div
              ref={iframeWrapperRef}
              className="flex-1 relative min-h-[450px] lg:min-h-none bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col"
            >
              {currentScan ? (
                <iframe
                  src={`${BACKEND_URL}/viewer.html?url=${encodeURIComponent(
                    currentScan.splat_file_url
                  )}`}
                  allow="xr-spatial-tracking; autoplay; fullscreen"
                  className="w-full h-full border-none flex-1"
                  title="WebGL Tree Scan Splat player"
                  onLoad={() => {
                    setTimeout(updateLineCoordinates, 1000);
                  }}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-4xl mb-3">🌳</span>
                  <h4 className="font-bold text-sm mb-1">No Scan Selected</h4>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Search a tree code in the lookup bar on the left to load its 3D scan and metrics.
                  </p>
                </div>
              )}
              
              {/* Target Dot Highlights */}
              {currentScan && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {lines.map((l) => (
                    <div
                      key={`dot-${l.id}`}
                      style={{
                        position: "absolute",
                        left: l.x2 + dashboardRef.current!.getBoundingClientRect().left - iframeWrapperRef.current!.getBoundingClientRect().left - 5,
                        top: l.y2 + dashboardRef.current!.getBoundingClientRect().top - iframeWrapperRef.current!.getBoundingClientRect().top - 5,
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "#191919",
                        border: "1.5px solid #ffffff",
                        boxShadow: "0 0 8px rgba(25, 25, 25, 0.4)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Carbon metrics display */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            <div className="flex flex-col gap-5 w-full pr-1">
              
              {/* DBH */}
              <div
                id="pill-dbh"
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-1 transition duration-200 hover:-translate-x-1 hover:border-[#191919]/50 pointer-events-auto"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Trunk Diameter (DBH)
                </span>
                <span className="font-head text-4xl text-[#191919] flex items-baseline gap-1">
                  {currentScan ? currentScan.dbh_cm.toFixed(1) : "-"}
                  <span className="font-sans text-xs font-semibold text-slate-400 tracking-normal lowercase">
                    cm
                  </span>
                </span>
              </div>

              {/* Height */}
              <div
                id="pill-height"
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-1 transition duration-200 hover:-translate-x-1 hover:border-[#191919]/50 pointer-events-auto"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tree Height
                </span>
                <span className="font-head text-4xl text-[#191919] flex items-baseline gap-1">
                  {currentScan ? currentScan.tinggi_m.toFixed(1) : "-"}
                  <span className="font-sans text-xs font-semibold text-slate-400 tracking-normal lowercase">
                    m
                  </span>
                </span>
              </div>

              {/* Biomass */}
              <div
                id="pill-biomass"
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-1 transition duration-200 hover:-translate-x-1 hover:border-[#191919]/50 pointer-events-auto"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Estimated Biomass
                </span>
                <span className="font-head text-4xl text-[#191919] flex items-baseline gap-1">
                  {currentScan ? currentScan.biomassa_kg.toFixed(1) : "-"}
                  <span className="font-sans text-xs font-semibold text-slate-400 tracking-normal lowercase">
                    kg
                  </span>
                </span>
              </div>

              {/* Stored Carbon */}
              <div
                id="pill-carbon"
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-1 transition duration-200 hover:-translate-x-1 hover:border-[#191919]/50 pointer-events-auto"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Stored Carbon
                </span>
                <span className="font-head text-4xl text-[#191919] flex items-baseline gap-1">
                  {currentScan ? currentScan.karbon_kg.toFixed(1) : "-"}
                  <span className="font-sans text-xs font-semibold text-slate-450 tracking-normal lowercase">
                    kg
                  </span>
                </span>
              </div>

              {/* CO2 Equivalent */}
              <div
                id="pill-co2e"
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-1 transition duration-200 hover:-translate-x-1 hover:border-[#191919]/50 pointer-events-auto"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  CO2 Equivalent (CO2e)
                </span>
                <span className="font-head text-4xl text-[#191919] flex items-baseline gap-1">
                  {currentScan ? currentScan.co2e_kg.toFixed(1) : "-"}
                  <span className="font-sans text-xs font-semibold text-slate-450 tracking-normal lowercase">
                    kg
                  </span>
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* SVG Connecting Lines Overlay */}
        {currentScan && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-5"
            style={{ width: "100%", height: "100%" }}
          >
            {lines.map((line) => (
              <line
                key={`line-${line.id}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(25, 25, 25, 0.2)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            ))}
          </svg>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#191919] border-t border-[#191919] py-12 px-6 sm:px-10 text-center">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/50">
          <p>© 2026 Vora. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/example" className="hover:text-white transition">Example</Link>
            <a href="#privacy" className="hover:text-white transition">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 left-6 right-6 bg-red-650 text-white font-semibold text-sm px-6 py-4 rounded-xl shadow-lg border border-red-500 z-50 flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-white hover:text-red-200 border-none bg-transparent cursor-pointer text-base">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
