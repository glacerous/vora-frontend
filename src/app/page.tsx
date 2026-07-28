"use client";

import React, { useState, useEffect, useRef } from "react";

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

export default function Dashboard() {
  // Search & State variables
  const [searchInput, setSearchInput] = useState("TEST-0001");
  const [activeTreeCode, setActiveTreeCode] = useState("TEST-0001");
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SVG Line Coordinates state
  const parentRef = useRef<HTMLDivElement>(null);
  const iframeWrapperRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number; id: string }>
  >([]);

  // Fetch History for Tree Code
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
        // Default to latest scan in history
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

  // Poll Pipeline Status
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
    if (!parentRef.current || !iframeWrapperRef.current || !currentScan) return;

    const parentRect = parentRef.current.getBoundingClientRect();
    const iframeRect = iframeWrapperRef.current.getBoundingClientRect();

    // Visual termination targets relative to the iframe width/height
    const relativeTargets: Record<string, { x: number; y: number }> = {
      dbh: { x: 0.48, y: 0.70 },     // Tree trunk base
      height: { x: 0.49, y: 0.24 },  // Tree top tip
      biomass: { x: 0.53, y: 0.38 }, // Canopy / Foliage
      carbon: { x: 0.47, y: 0.52 },  // Middle trunk
      co2e: { x: 0.50, y: 0.81 },    // Roots / Ground area
    };

    const ids = ["dbh", "height", "biomass", "carbon", "co2e"] as const;
    const newLines = ids
      .map((id) => {
        const pill = document.getElementById(`pill-${id}`);
        if (pill) {
          const pillRect = pill.getBoundingClientRect();
          // Line starts at the left-middle edge of the pill card
          const x1 = pillRect.left - parentRect.left;
          const y1 = pillRect.top + pillRect.height / 2 - parentRect.top;

          // Line terminates at the offset coordinate within the iframe viewport
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

  // Initial load
  useEffect(() => {
    fetchTreeHistory(activeTreeCode);
    pollStatus();

    // Start polling status every 3 seconds
    const statusInterval = setInterval(pollStatus, 3000);
    return () => clearInterval(statusInterval);
  }, [activeTreeCode]);

  // Adjust lines on resize or state change
  useEffect(() => {
    updateLineCoordinates();
    window.addEventListener("resize", updateLineCoordinates);
    
    // Tiny delay to ensure browser layout has completed reflow
    const timer = setTimeout(updateLineCoordinates, 400);

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

  // Human readable dates
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
    <div
      ref={parentRef}
      className="flex-1 flex flex-col min-h-screen bg-gradient-to-b from-sky-400 to-emerald-500 text-slate-900 relative p-4 md:p-6 overflow-x-hidden font-sans"
    >
      {/* Header bar */}
      <header className="flex flex-col sm:flex-row justify-between items-center bg-white/85 backdrop-blur-md border border-white/50 shadow-lg rounded-2xl p-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 animate-pulse" />
          <h1 className="font-head text-3xl uppercase tracking-wider text-slate-850">
            VORA CARBON DASHBOARD
          </h1>
        </div>
        
        {/* Modal GPU status dot */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/5 rounded-full border border-slate-950/10">
          <span className={`w-2 h-2 rounded-full ${pipelineStatus?.stage === "idle" ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Modal GPU Status: {pipelineStatus?.stage === "idle" ? "Ready" : pipelineStatus?.stage || "Connecting"}
          </span>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left column: Controls & History */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Search Box */}
          <div className="bg-white/85 backdrop-blur-md border border-white/50 rounded-2xl shadow-md p-5">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-3">
              Search Tree Code
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. TEST-0001"
                className="flex-1 px-4 py-2 rounded-xl bg-slate-950/5 border border-slate-950/15 focus:outline-none focus:border-sky-500 transition text-slate-800 text-sm font-semibold"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition duration-150 text-sm shadow-md"
              >
                Go
              </button>
            </form>
          </div>

          {/* Active Reconstruction Stage (if not idle) */}
          {pipelineStatus && pipelineStatus.stage !== "idle" && (
            <div className="bg-amber-500/15 border border-amber-500/30 backdrop-blur-md rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-800">
                  Processing Reconstruction
                </h3>
              </div>
              <p className="text-xs font-semibold text-amber-900 capitalize mb-1">
                Stage: {pipelineStatus.stage}
              </p>
              <p className="text-xs text-amber-700/80 leading-relaxed italic">
                {pipelineStatus.message}
              </p>
            </div>
          )}

          {/* History Lists */}
          <div className="bg-white/85 backdrop-blur-md border border-white/50 rounded-2xl shadow-md p-5 flex-1 flex flex-col">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-3">
              Scan History ({history.length})
            </h2>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length > 0 ? (
              <div className="flex-1 overflow-y-auto max-h-[400px] lg:max-h-none pr-1 flex flex-col gap-2">
                {history.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => setCurrentScan(record)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      currentScan?.id === record.id
                        ? "bg-gradient-to-r from-sky-50/70 to-emerald-50/70 border-sky-500/50 shadow-sm"
                        : "bg-transparent border-slate-950/5 hover:border-slate-950/15 hover:bg-slate-950/5"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-slate-800 uppercase">
                        {record.tree_code}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        ID: {record.id}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatDate(record.scan_date)}
                    </div>
                    {record.confidence_note && (
                      <div className="text-[10px] text-emerald-600/85 mt-1 truncate italic">
                        {record.confidence_note}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-10 text-center text-slate-400 text-sm">
                No scan items.
              </div>
            )}
          </div>
        </div>

        {/* Center column: 3D WebGL Iframe Viewer */}
        <div className="lg:col-span-6 flex flex-col">
          <div
            ref={iframeWrapperRef}
            className="flex-1 relative min-h-[450px] lg:min-h-none bg-slate-950/20 rounded-2xl overflow-hidden border border-white/40 shadow-2xl flex flex-col"
          >
            {currentScan ? (
              <iframe
                src={`${BACKEND_URL}/viewer.html?url=${encodeURIComponent(
                  currentScan.splat_file_url
                )}`}
                allow="xr-spatial-tracking; autoplay; fullscreen"
                className="w-full h-full border-none flex-1"
                title="Vora 3D Splat Viewer"
                onLoad={() => {
                  // Trigger line updates once iframe finishes loading
                  setTimeout(updateLineCoordinates, 1000);
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-600 bg-white/20 backdrop-blur-sm">
                <span className="text-5xl mb-4">🌳</span>
                <h3 className="font-bold text-lg mb-1">No scan selected</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Search a tree code and select a scan from history list to visualize the 3D Gaussian Splat model.
                </p>
              </div>
            )}
            
            {/* Target dots overlaying the 3D viewer (only shown if iframe is active) */}
            {currentScan && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {lines.map((l) => (
                  <div
                    key={`dot-${l.id}`}
                    style={{
                      position: "absolute",
                      left: l.x2 + parentRef.current!.getBoundingClientRect().left - iframeWrapperRef.current!.getBoundingClientRect().left - 5,
                      top: l.y2 + parentRef.current!.getBoundingClientRect().top - iframeWrapperRef.current!.getBoundingClientRect().top - 5,
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#0284c7",
                      border: "1.5px solid #ffffff",
                      boxShadow: "0 0 8px rgba(2, 132, 199, 0.8)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Carbon Metrics Pills */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <div className="flex flex-col gap-6 w-full pr-2">
            
            {/* DBH */}
            <div
              id="pill-dbh"
              className="bg-white/85 backdrop-blur-md border-2 border-white/50 rounded-2xl p-4 shadow-md flex flex-col gap-1 transition duration-250 hover:-translate-x-1 hover:border-sky-500 pointer-events-auto"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Trunk Diameter (DBH)
              </span>
              <span className="font-head text-4xl text-slate-850 flex items-baseline gap-1">
                {currentScan ? currentScan.dbh_cm.toFixed(1) : "-"}
                <span className="font-sans text-xs font-semibold text-slate-400 tracking-normal lowercase">
                  cm
                </span>
              </span>
            </div>

            {/* Height */}
            <div
              id="pill-height"
              className="bg-white/85 backdrop-blur-md border-2 border-white/50 rounded-2xl p-4 shadow-md flex flex-col gap-1 transition duration-250 hover:-translate-x-1 hover:border-sky-500 pointer-events-auto"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Tree Height
              </span>
              <span className="font-head text-4xl text-slate-850 flex items-baseline gap-1">
                {currentScan ? currentScan.tinggi_m.toFixed(1) : "-"}
                <span className="font-sans text-xs font-semibold text-slate-400 tracking-normal lowercase">
                  m
                </span>
              </span>
            </div>

            {/* Biomass */}
            <div
              id="pill-biomass"
              className="bg-white/85 backdrop-blur-md border-2 border-white/50 rounded-2xl p-4 shadow-md flex flex-col gap-1 transition duration-250 hover:-translate-x-1 hover:border-sky-500 pointer-events-auto"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Estimated Biomass
              </span>
              <span className="font-head text-4xl text-slate-850 flex items-baseline gap-1">
                {currentScan ? currentScan.biomassa_kg.toFixed(1) : "-"}
                <span className="font-sans text-xs font-semibold text-slate-400 tracking-normal lowercase">
                  kg
                </span>
              </span>
            </div>

            {/* Stored Carbon */}
            <div
              id="pill-carbon"
              className="bg-white/85 backdrop-blur-md border-2 border-white/50 rounded-2xl p-4 shadow-md flex flex-col gap-1 transition duration-250 hover:-translate-x-1 hover:border-sky-500 pointer-events-auto"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Stored Carbon
              </span>
              <span className="font-head text-4xl text-slate-850 flex items-baseline gap-1">
                {currentScan ? currentScan.karbon_kg.toFixed(1) : "-"}
                <span className="font-sans text-xs font-semibold text-slate-400 tracking-normal lowercase">
                  kg
                </span>
              </span>
            </div>

            {/* CO2 Equivalent */}
            <div
              id="pill-co2e"
              className="bg-white/85 backdrop-blur-md border-2 border-white/50 rounded-2xl p-4 shadow-md flex flex-col gap-1 transition duration-250 hover:-translate-x-1 hover:border-sky-500 pointer-events-auto"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                CO2 Equivalent (CO2e)
              </span>
              <span className="font-head text-4xl text-slate-850 flex items-baseline gap-1">
                {currentScan ? currentScan.co2e_kg.toFixed(1) : "-"}
                <span className="font-sans text-xs font-semibold text-slate-400 tracking-normal lowercase">
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
              stroke="rgba(8, 29, 42, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          ))}
        </svg>
      )}

      {/* Error Bar */}
      {error && (
        <div className="fixed bottom-6 left-6 right-6 bg-red-600 text-white font-semibold text-sm px-6 py-4 rounded-xl shadow-lg border border-red-500 z-50 flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-white hover:text-red-200">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
