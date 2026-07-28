"use client";

import React, { useState, useEffect, useRef } from "react";
import BoomerangVideoBg from "@/components/BoomerangVideoBg";

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

// Custom SVG Logo Mark
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

// Custom SVG ArrowRight
const ArrowRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all duration-200"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default function Home() {
  // Search & State variables
  const [searchInput, setSearchInput] = useState("");
  const [activeTreeCode, setActiveTreeCode] = useState("");
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for lines calculation
  const dashboardRef = useRef<HTMLDivElement>(null);
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
    if (!dashboardRef.current || !iframeWrapperRef.current || !currentScan) return;

    const parentRect = dashboardRef.current.getBoundingClientRect();
    const iframeRect = iframeWrapperRef.current.getBoundingClientRect();

    // Visual termination targets relative to the iframe width/height
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

  // Fetch tree data only when activeTreeCode is populated (e.g. after search or example button click)
  useEffect(() => {
    if (activeTreeCode) {
      fetchTreeHistory(activeTreeCode);
    }
  }, [activeTreeCode]);

  // Poll status independently on mount
  useEffect(() => {
    pollStatus();
    const statusInterval = setInterval(pollStatus, 3000);
    return () => clearInterval(statusInterval);
  }, []);

  // Adjust lines on resize or state change
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

  const scrollToDashboard = () => {
    const el = document.getElementById("dashboard");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden flex flex-col font-sans">
      
      {/* ── Fixed navbar ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center transition-all duration-300">
        {/* Logo left */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <LogoMark />
          <span className="font-semibold text-base tracking-tight text-[#191919]">
            Vora
          </span>
        </div>

        {/* Center links (hidden below md) */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#product" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Product
          </a>
          <a href="#solutions" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Solutions
          </a>
          <a href="#pricing" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Pricing
          </a>
          <a href="#company" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Company
          </a>
        </div>

        {/* CTA right */}
        <button
          onClick={scrollToDashboard}
          className="px-5 py-2.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200 shadow-sm"
        >
          View Dashboard
        </button>
      </nav>

      {/* ── Section 1: Hero Landing Fold ─────────────────────────────────── */}
      <section className="relative flex flex-col items-center overflow-hidden h-screen z-10 select-none">
        {/* Boomerang looping video background */}
        <BoomerangVideoBg />

        {/* Content Overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-between">
          
          {/* Hero copy block */}
          <div className="pt-28 sm:pt-32 md:pt-36 lg:pt-40 px-4 sm:px-6 flex flex-col items-center text-center">
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tighter text-[#191919] font-normal">
              Measure forest <br className="hidden sm:inline" /> carbon.
            </h1>
            <p className="max-w-sm sm:max-w-md mt-5 sm:mt-6 md:mt-8 text-sm md:text-base text-[#191919]/70 leading-relaxed">
              3D Gaussian Splatting and carbon metrics estimation for environmental conservation. Reconstruct high-fidelity tree models, measure DBH, and estimate forest carbon storage from your browser.
            </p>
            <button
              onClick={scrollToDashboard}
              className="mt-6 sm:mt-8 md:mt-10 px-8 py-3.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200 shadow-md"
            >
              Start Analyzing
            </button>
          </div>

          {/* Bottom info panel */}
          <div className="w-full max-w-5xl px-4 sm:px-6 mt-auto">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 border-b-0 pt-8 sm:pt-10 md:pt-12 px-6 sm:px-8 md:px-12 pb-0 shadow-sm rounded-t-2xl">
              
              {/* Row 1 — 2 cols */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-end pb-6 sm:pb-8">
                <div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium">
                    WHAT DO WE DO?
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-serif font-normal leading-tight tracking-tight text-[#191919]">
                    Scans that <br className="hidden sm:inline" /> calculate impact.
                  </h2>
                </div>
                <p className="text-sm md:text-[15px] text-[#191919]/70 leading-relaxed">
                  AI-powered tree reconstruction built for researchers and conservationists. Models that capture every branch, estimate DBH, and calculate total stored carbon instantly.
                </p>
              </div>

              {/* Hairline divider */}
              <div className="h-px bg-gray-200 w-full" />

              {/* Row 2 — 3 interactive rows */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-4">
                
                <div
                  onClick={scrollToDashboard}
                  className="group bg-[#F4F3F3] hover:bg-[#eaeaea] transition-all duration-200 cursor-pointer px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center rounded-xl"
                >
                  <div className="text-sm text-[#191919] flex items-center">
                    <span className="text-[#191919]/40 text-xs">01</span>
                    <span className="mx-2 text-[#191919]/30 text-xs">/</span>
                    <span className="font-medium">Reconstruct</span>
                  </div>
                  <ArrowRight />
                </div>

                <div
                  onClick={scrollToDashboard}
                  className="group bg-[#F4F3F3] hover:bg-[#eaeaea] transition-all duration-200 cursor-pointer px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center rounded-xl"
                >
                  <div className="text-sm text-[#191919] flex items-center">
                    <span className="text-[#191919]/40 text-xs">02</span>
                    <span className="mx-2 text-[#191919]/30 text-xs">/</span>
                    <span className="font-medium">Analyze</span>
                  </div>
                  <ArrowRight />
                </div>

                <div
                  onClick={scrollToDashboard}
                  className="group bg-[#F4F3F3] hover:bg-[#eaeaea] transition-all duration-200 cursor-pointer px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center rounded-xl"
                >
                  <div className="text-sm text-[#191919] flex items-center">
                    <span className="text-[#191919]/40 text-xs">03</span>
                    <span className="mx-2 text-[#191919]/30 text-xs">/</span>
                    <span className="font-medium">Verify</span>
                  </div>
                  <ArrowRight />
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── Section 2: Vora 3D Carbon Dashboard Fold ────────────────────── */}
      <section
        ref={dashboardRef}
        id="dashboard"
        className="min-h-screen bg-slate-50 border-t border-slate-200 text-[#191919] relative p-4 md:p-6 lg:p-8 flex flex-col justify-center z-20"
      >
        {/* Inner header bar */}
        <div className="w-full max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 mb-6 gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 animate-pulse" />
            <h3 className="font-head text-2xl uppercase tracking-wider text-slate-800">
              3D CARBON ESTIMATOR
            </h3>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
            <span className={`w-2 h-2 rounded-full ${pipelineStatus?.stage === "idle" ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Modal GPU: {pipelineStatus?.stage === "idle" ? "Ready" : pipelineStatus?.stage || "Connecting"}
            </span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="w-full max-w-[1400px] mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
          
          {/* Search & History Column */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Search Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block mb-2">
                Tree Lookup
              </span>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="TEST-0001"
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-950/5 border border-slate-950/15 focus:outline-none focus:border-slate-450 transition text-slate-800 text-sm font-semibold"
                />
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition duration-150 text-sm shadow-md"
                >
                  Go
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setSearchInput("TEST-0001");
                  setActiveTreeCode("TEST-0001");
                }}
                className="mt-3 w-full bg-[#F4F3F3] hover:bg-[#eaeaea] text-[#191919] font-medium text-xs py-2.5 px-3 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm"
              >
                <span>🌳</span> Load Example Scan (TEST-0001)
              </button>
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
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex-1 flex flex-col">
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
                  No scan items.
                </div>
              )}
            </div>
          </div>

          {/* Iframe 3D WebGL Splat Viewer */}
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
                  <p className="text-xs text-slate-400 max-w-xs">
                    Select an item from the scans database list to visualize the 3D model.
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

          {/* Carbon Calculation Metrics Badges */}
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
                  <span className="font-sans text-xs font-semibold text-slate-400 tracking-normal lowercase">
                    kg
                  </span>
                </span>
              </div>

              {/* CO2 equivalent */}
              <div
                id="pill-co2e"
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-1 transition duration-200 hover:-translate-x-1 hover:border-[#191919]/50 pointer-events-auto"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  CO2 Equivalent (CO2e)
                </span>
                <span className="font-head text-4xl text-[#191919] flex items-baseline gap-1">
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
                stroke="rgba(25, 25, 25, 0.2)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            ))}
          </svg>
        )}

      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#191919] border-t border-[#191919] py-12 px-6 sm:px-10 text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/50">
          <p>© 2026 Vora. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#product" className="hover:text-white transition-colors duration-150">Product</a>
            <a href="#solutions" className="hover:text-white transition-colors duration-150">Solutions</a>
            <a href="#privacy" className="hover:text-white transition-colors duration-150">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors duration-150">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Fixed Error Toast */}
      {error && (
        <div className="fixed bottom-6 left-6 right-6 bg-red-650 text-white font-semibold text-sm px-6 py-4 rounded-xl shadow-lg border border-red-500 z-50 flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-white hover:text-red-200">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
