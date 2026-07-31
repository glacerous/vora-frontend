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
  species_predictions?: Array<{
    scientific_name: string;
    common_name: string;
    confidence: number;
  }>;
  wood_density_used?: number;
  wood_density_source?: string;
  climate_zone_detected?: string;
  formula_used?: string;
  agb_kg?: number;
  bgb_kg?: number;
  gps_lat?: number;
  gps_lon?: number;
  thumbnail_url?: string;
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

const UiverseLoader = () => (
  <div className="newtons-cradle">
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
  </div>
);

export default function Dashboard() {
  const [searchInput, setSearchInput] = useState("");
  const [activeTreeCode, setActiveTreeCode] = useState("");
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  const lastSplatUrlRef = useRef<string | null>(null);

  // States for real-time progress elapsed timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pipelineStatus?.stage === "reconstructing") {
      if (!timerRef.current) {
        setElapsedTime(0);
        timerRef.current = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pipelineStatus?.stage]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // States for 2D Recalibration modal
  const [recalibModalOpen, setRecalibModalOpen] = useState(false);
  const [clickedPoints, setClickedPoints] = useState<Array<{x: number, y: number, dispWidth: number, dispHeight: number}>>([]);
  const [imgDimensions, setImgDimensions] = useState<{width: number, height: number} | null>(null);
  const [recalibLoading, setRecalibLoading] = useState(false);
  const [recalibError, setRecalibError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

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
        setSidebarOpen(true);
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

  const handleRecalibrate = async () => {
    if (clickedPoints.length < 2 || !imgDimensions || !currentScan) return;
    setRecalibLoading(true);
    setRecalibError(null);
    try {
      const W_org = imgDimensions.width;
      const H_org = imgDimensions.height;
      const p1_org = [
        (clickedPoints[0].x / clickedPoints[0].dispWidth) * W_org,
        (clickedPoints[0].y / clickedPoints[0].dispHeight) * H_org
      ];
      const p2_org = [
        (clickedPoints[1].x / clickedPoints[1].dispWidth) * W_org,
        (clickedPoints[1].y / clickedPoints[1].dispHeight) * H_org
      ];

      const res = await fetch(`${BACKEND_URL}/scan/${currentScan.id}/recalculate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p1: p1_org,
          p2: p2_org,
          width: W_org,
          height: H_org
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to recalculate scan");
      }

      await fetchTreeHistory(currentScan.tree_code);
      setRecalibModalOpen(false);
      setClickedPoints([]);

      const iframe = document.querySelector('iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'vora_metrics_updated', tree_code: currentScan.tree_code }, '*');
      }
    } catch (err: any) {
      setRecalibError(err.message || "An unexpected error occurred.");
    } finally {
      setRecalibLoading(false);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgDimensions({
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight
    });
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

  // Seed tree code from URL params (redirect from /reconstruct)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        setSearchInput(code);
        setActiveTreeCode(code);
      }
    }
  }, []);

  // Prevent browser Save Page (Ctrl+S / Cmd+S) shortcut globally on this page
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.code === "KeyS")) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleGlobalKeydown);
    return () => window.removeEventListener("keydown", handleGlobalKeydown);
  }, []);

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'vora_scene_loaded') {
        setSceneLoaded(true);
      } else if (e.data?.type === 'vora_metrics_updated') {
        if (e.data.tree_code) {
          fetchTreeHistory(e.data.tree_code);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Reset scene loaded state only when splat_file_url changes so the UI hides again while new scene loads
  useEffect(() => {
    if (currentScan) {
      if (currentScan.splat_file_url !== lastSplatUrlRef.current) {
        setSceneLoaded(false);
        lastSplatUrlRef.current = currentScan.splat_file_url;
      }
    } else {
      setSceneLoaded(false);
      lastSplatUrlRef.current = null;
    }
  }, [currentScan?.id, currentScan?.splat_file_url]);

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

      {/* ── Full-screen 3D Viewer Container ────────────────────── */}
      <div className="absolute inset-0 z-0 bg-white pt-[68px]">
        {currentScan ? (
          <iframe
            src={`${BACKEND_URL}/viewer.html?v=11&url=${encodeURIComponent(currentScan.splat_file_url)}`}
            allow="xr-spatial-tracking; autoplay; fullscreen"
            className="w-full h-full border-none"
            title="3D Tree Gaussian Splat Viewer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50/50">
            {pipelineStatus?.stage === "reconstructing" && pipelineStatus.tree_code === activeTreeCode ? (
              <div className="max-w-md w-[90%] bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 shadow-xl text-center space-y-6 flex flex-col items-center justify-center animate-fadeIn">
                <div className="relative flex items-center justify-center shrink-0">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-505 rounded-full animate-spin shrink-0" style={{ borderTopColor: '#10b981' }} />
                  <span className="absolute text-sm shrink-0">🌳</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Reconstruction In Progress</p>
                  <h2 className="font-serif text-2xl text-[#191919] font-normal leading-tight">{activeTreeCode}</h2>
                  <p className="text-xs text-slate-450 font-medium">Stage: <span className="text-[#191919] font-bold">{pipelineStatus.message}</span></p>
                </div>
                <div className="w-full bg-slate-100/50 rounded-2xl px-5 py-4 border border-slate-200/50 flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-semibold uppercase tracking-wider text-[9px]">Elapsed Time</span>
                  <span className="font-mono font-bold text-[#191919] bg-white border border-slate-200/80 px-3 py-1 rounded-xl text-sm shadow-sm">{formatElapsed(elapsedTime)}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal max-w-[280px]">
                  Connecting to GPU A10G Cloud. Gaussian Splat training and allometric carbon fitting runs in real-time.
                </p>
              </div>
            ) : loading ? (
              <UiverseLoader />
            ) : (
              <div className="text-center">
                <p className="text-sm text-slate-400 font-medium tracking-wide mb-1">No scan loaded</p>
                <p className="text-xs text-slate-300">Open the details drawer to search a tree code</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navbar — 100% identical to landing page ──────── */}
      <nav className="fixed top-0 left-0 right-0 z-55 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <Link href="/" className="flex items-center cursor-pointer">
          <span className="font-bold text-xl tracking-tight text-[#191919]">Vora.</span>
        </Link>

        {/* Center links (matching landing page perfectly) */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <Link href="/" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Home
          </Link>
          <Link href="/gallery" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Gallery
          </Link>
        </div>
      </nav>

      {/* Floating Sidebar Toggle Button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ opacity: (!currentScan || sceneLoaded) ? 1 : 0, pointerEvents: (!currentScan || sceneLoaded) ? 'auto' : 'none', transition: 'opacity 0.5s ease 0.1s' }}
          className="fixed top-[88px] right-6 z-35 p-3 bg-[#191919] text-white hover:bg-[#191919]/90 rounded-full transition-all duration-200 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95"
          aria-label="Toggle Details Drawer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      )}

      {/* ── Carbon metrics — Unified Glassmorphism Command Dock ──────────────── */}
      {currentScan && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-4xl w-[92%] sm:w-auto flex flex-col gap-2"
          style={{ opacity: sceneLoaded ? 1 : 0, transform: `translateX(-50%) translateY(${sceneLoaded ? 0 : 16}px)`, transition: 'opacity 0.5s ease, transform 0.5s ease', pointerEvents: sceneLoaded ? 'auto' : 'none' }}
        >
          {currentScan.confidence_note?.includes("WARNING") && (
            <div className="bg-amber-50/95 backdrop-blur-sm border border-amber-200/60 text-amber-900 text-[10px] sm:text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 max-w-md sm:max-w-xl">
              <span className="text-sm shrink-0">⚠️</span>
              <span>{currentScan.confidence_note}</span>
            </div>
          )}

          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl px-5 py-3 flex items-center justify-between sm:justify-start gap-4 sm:gap-6 divide-x divide-slate-100 overflow-x-auto">
            
            {/* DBH */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">DBH</span>
                {currentScan.confidence_note?.includes("WARNING") && (
                  <span className="text-amber-500 font-bold text-xs" title="Warning: insufficient height">⚠️</span>
                )}
              </div>
              <div className="flex items-baseline">
                <span className="font-serif text-2xl text-[#191919] leading-none">{currentScan.dbh_cm?.toFixed(1) ?? "--"}</span>
                <span className="text-[11px] text-slate-400 font-medium ml-1">cm</span>
              </div>
            </div>

            {/* Height */}
            <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Height</span>
              <div className="flex items-baseline">
                <span className="font-serif text-2xl text-[#191919] leading-none">{currentScan.tinggi_m?.toFixed(1) ?? "--"}</span>
                <span className="text-[11px] text-slate-400 font-medium ml-1">m</span>
              </div>
            </div>

            {/* Biomass */}
            <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Biomass</span>
              <div className="flex items-baseline">
                <span className="font-serif text-2xl text-[#191919] leading-none">{currentScan.biomassa_kg?.toFixed(1) ?? "--"}</span>
                <span className="text-[11px] text-slate-400 font-medium ml-1">kg</span>
              </div>
            </div>

            {/* Carbon */}
            <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Carbon</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-baseline">
                <span className="font-serif text-2xl text-emerald-950 font-normal leading-none">{currentScan.karbon_kg?.toFixed(1) ?? "--"}</span>
                <span className="text-[11px] text-emerald-600/70 font-medium ml-1">kg</span>
              </div>
            </div>

            {/* CO2e */}
            <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">CO₂e</span>
              <div className="flex items-baseline">
                <span className="font-serif text-2xl text-[#191919] leading-none">{currentScan.co2e_kg?.toFixed(1) ?? "--"}</span>
                <span className="text-[11px] text-slate-400 font-medium ml-1">kg</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Slide-in sidebar — Unified Tree Intelligence Panel ──────────────── */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-40 w-80 sm:w-96 bg-white border-l border-slate-200/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out pt-[60px] sm:pt-[72px] ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ opacity: (!currentScan || sceneLoaded) ? 1 : 0, pointerEvents: (!currentScan || sceneLoaded) ? 'auto' : 'none', transition: 'opacity 0.5s ease 0.15s, transform 0.3s ease' }}
      >
        {/* Sidebar Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold tracking-wider text-[#191919] uppercase">{activeTreeCode || "Search Tree"}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {history.length > 0 ? `${history.length} scan record${history.length !== 1 ? "s" : ""} found` : "No active scan"}
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-[#191919] flex items-center justify-center text-xs transition"
          >
            ✕
          </button>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          
          {/* Section 1: Search Form inside Sidebar */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Search Tree Code
            </h3>
            <form onSubmit={handleSearch} className="flex items-center w-full">
              <div className="relative w-full flex items-center shadow-sm rounded-xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#191919]/10 focus-within:border-[#191919] transition-all">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter code (e.g. POHON-6144)…"
                  className="w-full pl-9 pr-16 py-2.5 bg-transparent focus:outline-none text-xs font-semibold text-[#191919] placeholder:text-slate-400"
                />
                <svg
                  className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <button
                  type="submit"
                  className="absolute right-1.5 px-3 py-1 bg-[#191919] text-white text-[10px] font-semibold rounded-lg hover:bg-[#191919]/90 transition-colors duration-200"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Species Identification */}
          {currentScan && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Species Classification
                </h3>
                <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Pl@ntNet AI</span>
              </div>

              {currentScan.species_predictions && currentScan.species_predictions.length > 0 ? (
                <div className="space-y-3">
                  {/* Primary Hero Match */}
                  {currentScan.species_predictions[0] && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-slate-50 border border-emerald-100 relative overflow-hidden">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block mb-0.5">Top Specimen Match</span>
                          <h4 className="text-sm font-semibold text-[#191919] italic font-serif">
                            {currentScan.species_predictions[0].scientific_name}
                          </h4>
                          {currentScan.species_predictions[0].common_name && (
                            <p className="text-xs text-slate-500 font-medium capitalize mt-0.5">
                              {currentScan.species_predictions[0].common_name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-emerald-700 font-serif">
                            {currentScan.species_predictions[0].confidence.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-emerald-600/70 font-medium">Confidence</span>
                        </div>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden mt-3">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${currentScan.species_predictions[0].confidence}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Secondary Matches (Clean List, No Box Clutter) */}
                  {currentScan.species_predictions.length > 1 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-medium text-slate-400 block px-1">Other Probable Candidates</span>
                      <div className="divide-y divide-slate-100">
                        {currentScan.species_predictions.slice(1).map((pred, idx) => (
                          <div key={idx} className="py-2 px-1 flex items-center justify-between hover:bg-slate-50/50 rounded-lg transition-colors">
                            <div>
                              <span className="text-xs font-medium text-[#191919] italic block">
                                {pred.scientific_name}
                              </span>
                              {pred.common_name && (
                                <span className="text-[10px] text-slate-400 capitalize block">
                                  {pred.common_name}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-medium text-slate-400">
                              {pred.confidence.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 text-center">
                  <span className="text-xs text-slate-400">Species classification unavailable for this scan</span>
                </div>
              )}
            </div>
          )}

          {/* Section 2.5: How This Was Calculated (Expandable Panel) */}
          {currentScan && (
            <div className="border border-slate-200/80 rounded-2xl bg-slate-50/40 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <button
                onClick={() => setCalcOpen(!calcOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/80 text-left transition-all duration-200"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-450" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M15 11h.01M15 7h.01M12 14h.01M9 11h.01M18 20V4a1 1 0 00-1-1H7a1 1 0 00-1 1v16a1 1 0 001 1h10a1 1 0 001-1z" />
                  </svg>
                  How this was calculated
                </span>
                <span className="text-slate-450 text-[10px] font-bold">
                  {calcOpen ? "▲" : "▼"}
                </span>
              </button>

              {calcOpen && (
                <div className="px-4 pb-4 pt-3 text-xs space-y-3.5 border-t border-slate-200/50 bg-white font-sans divide-y divide-slate-100">
                  {/* Step 1: Input dimensions */}
                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700 uppercase text-[9px] tracking-wide">1. Input Tree Dimensions</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                      <div>Diameter (DBH): <span className="font-semibold text-[#191919]">{currentScan.dbh_cm?.toFixed(1) ?? "-"} cm</span></div>
                      <div>Tree Height: <span className="font-semibold text-[#191919]">{currentScan.tinggi_m?.toFixed(1) ?? "-"} m</span></div>
                    </div>
                  </div>

                  {/* Step 2: Species & Wood Density */}
                  <div className="pt-3 space-y-1.5">
                    <p className="font-semibold text-slate-700 uppercase text-[9px] tracking-wide">2. Wood Density Match</p>
                    <div className="space-y-1 text-slate-600 font-medium">
                      <div>Species Matched: <span className="font-semibold text-[#191919] italic">
                        {currentScan.species_predictions?.[0] 
                          ? `${currentScan.species_predictions[0].scientific_name} (${currentScan.species_predictions[0].confidence.toFixed(1)}%)` 
                          : "None (Generic Fallback)"}
                      </span></div>
                      <div>Wood Density (ρ): <span className="font-semibold text-[#191919]">{currentScan.wood_density_used?.toFixed(2) ?? "0.60"} g/cm³</span></div>
                      <div>Source: <span className="font-semibold text-[#191919] capitalize">{currentScan.wood_density_source?.replace("-", " ") ?? "generic default"}</span></div>
                    </div>
                  </div>

                  {/* Step 3: Climate Zone */}
                  <div className="pt-3 space-y-1.5">
                    <p className="font-semibold text-slate-700 uppercase text-[9px] tracking-wide">3. Climate & Allometric Formula</p>
                    <div className="space-y-1 text-slate-600 font-medium">
                      <div>GPS Coordinates: <span className="font-semibold text-[#191919]">
                        {currentScan.gps_lat !== null && currentScan.gps_lon !== null && currentScan.gps_lat !== undefined && currentScan.gps_lon !== undefined
                          ? `${currentScan.gps_lat.toFixed(4)}, ${currentScan.gps_lon.toFixed(4)}`
                          : "Not Available"}
                      </span></div>
                      <div>Climate Zone (Köppen): <span className="font-semibold text-[#191919]">{currentScan.climate_zone_detected ?? "Unknown"}</span></div>
                      <div>Formula Used: <span className="font-semibold text-emerald-800">{currentScan.formula_used ?? "Chave 2005 (moist)"}</span></div>
                    </div>
                  </div>

                  {/* Step 4: Biomass & Carbon Calculations */}
                  <div className="pt-3 space-y-2">
                    <p className="font-semibold text-slate-700 uppercase text-[9px] tracking-wide">4. Calculation Steps</p>
                    <div className="space-y-1.5 text-slate-600 font-medium font-sans">
                      <div className="flex justify-between">
                        <span>Above-Ground Biomass (AGB):</span>
                        <span className="font-semibold text-[#191919]">{currentScan.agb_kg?.toFixed(1) ?? "-"} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Below-Ground Biomass (BGB):</span>
                        <span className="font-semibold text-[#191919]">{currentScan.bgb_kg?.toFixed(1) ?? "-"} kg <span className="text-[10px] text-slate-400 font-normal">(AGB × 0.24)</span></span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-slate-100 pt-1.5 font-bold">
                        <span className="text-[#191919]">Total Dry Biomass:</span>
                        <span className="text-[#191919]">{currentScan.biomassa_kg?.toFixed(1) ?? "-"} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stored Carbon Stock:</span>
                        <span className="font-semibold text-emerald-800">{currentScan.karbon_kg?.toFixed(1) ?? "-"} kg <span className="text-[10px] text-emerald-600/70 font-normal">(Biomass × 0.47)</span></span>
                      </div>
                      <div className="flex justify-between border-t border-slate-150 pt-1.5 font-bold text-emerald-950">
                        <span>CO₂ Equivalent (CO₂e):</span>
                        <span>{currentScan.co2e_kg?.toFixed(1) ?? "-"} kg <span className="text-[10px] text-slate-400 font-normal">(Carbon × 3.67)</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recalibrate Trunk (2D) Action Button */}
          {currentScan && (
            <button
              onClick={() => {
                setClickedPoints([]);
                setRecalibError(null);
                setRecalibModalOpen(true);
              }}
              className="w-full py-3 bg-[#191919] hover:bg-[#191919]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              <svg className="w-4 h-4 text-emerald-450" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.24 11.54a3 3 0 00-4.24-4.24m0 0a3 3 0 00-4.24 4.24m4.24-4.24V3m0 0L8 5.5M11 3l3 2.5M3 12h18m-3 0a3 3 0 01-3 3H9a3 3 0 01-3-3" />
              </svg>
              Recalibrate Trunk (2D Photo)
            </button>
          )}

          {/* Section 3: Interactive Scan History Timeline */}
          {history.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Scan History Timeline
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <UiverseLoader />
                </div>
              ) : (
                <div className="relative pl-4 border-l border-slate-200 space-y-4">
                  {history.map((record) => {
                    const isActive = currentScan?.id === record.id;
                    return (
                      <div key={record.id} className="relative group">
                        {/* Timeline Node Marker */}
                        <span
                          className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white transition-all ${
                            isActive
                              ? "border-[#191919] ring-4 ring-[#191919]/10 bg-[#191919]"
                              : "border-slate-300 group-hover:border-slate-400"
                          }`}
                        />

                        <button
                          onClick={() => setCurrentScan(record)}
                          className={`w-full text-left p-3 rounded-xl transition-all ${
                            isActive
                              ? "bg-[#191919] text-white shadow-md"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-tight">{record.tree_code}</span>
                            <span className={`text-[10px] font-medium ${isActive ? "text-white/60" : "text-slate-400"}`}>
                              #{record.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-[10px] ${isActive ? "text-white/70" : "text-slate-400"}`}>
                              {formatDate(record.scan_date)}
                            </span>
                            <span className={`text-[10px] font-serif ${isActive ? "text-emerald-300" : "text-slate-500"}`}>
                              {record.dbh_cm ? `${record.dbh_cm.toFixed(1)} cm` : "Raw"}
                            </span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Link
            href="/reconstruct"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#191919] text-white text-xs font-medium rounded-xl hover:bg-[#191919]/90 transition-all shadow-sm"
          >
            <span>+ Upload New Scan</span>
          </Link>
        </div>
      </div>

      {/* ── Pipeline status banner ─────────────────────────────── */}
      {sceneLoaded && pipelineStatus && pipelineStatus.stage !== "idle" && (
        <div className="absolute bottom-6 right-6 z-30 max-w-xs bg-white/95 backdrop-blur-xl border border-amber-200/60 rounded-2xl px-4 py-3.5 shadow-lg animate-fadeIn flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Reconstructing {pipelineStatus.tree_code}</span>
            </div>
            <span className="font-mono text-[10px] font-bold bg-amber-50 border border-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              {formatElapsed(elapsedTime)}
            </span>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Current Stage</p>
            <p className="text-xs text-slate-700 font-bold mt-0.5">{pipelineStatus.message}</p>
          </div>
        </div>
      )}

      {/* ── Error toast ───────────────────────────────────────── */}
      {error && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#191919] text-[#ffffff] text-xs px-5 py-3 rounded-xl shadow-lg">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition">✕</button>
        </div>
      )}
      {/* ── 2D Recalibration Modal ────────────────────────────── */}
      {recalibModalOpen && currentScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-serif text-xl text-[#191919] font-normal">
                  Recalibrate Trunk Axis
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Click two points on the 2D image to set the trunk direction.
                </p>
              </div>
              <button
                onClick={() => {
                  setRecalibModalOpen(false);
                  setClickedPoints([]);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-[#191919] flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            {/* Error message */}
            {recalibError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium">
                {recalibError}
              </div>
            )}

            {/* Interactive Image Container */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {clickedPoints.length === 0 && "Step 1: Click the BASE of the trunk"}
                {clickedPoints.length === 1 && "Step 2: Click the TOP/UPPER part of the trunk"}
                {clickedPoints.length >= 2 && "Step 3: Ready to Recalibrate"}
              </div>

              <div 
                className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center select-none"
                style={{ maxHeight: '50vh' }}
              >
                <img
                  src={currentScan.thumbnail_url}
                  alt="Representative Scan Frame"
                  onLoad={handleImageLoad}
                  onClick={(e) => {
                    if (clickedPoints.length >= 2) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    setClickedPoints([...clickedPoints, {
                      x,
                      y,
                      dispWidth: rect.width,
                      dispHeight: rect.height
                    }]);
                  }}
                  onMouseMove={(e) => {
                    if (clickedPoints.length !== 1) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMousePos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    });
                  }}
                  className="max-h-[50vh] object-contain cursor-crosshair max-w-full"
                />

                {/* SVG Overlay to draw points & lines */}
                <svg className="absolute inset-0 pointer-events-none w-full h-full">
                  {clickedPoints.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r="6"
                      fill={idx === 0 ? "#10b981" : "#0284c7"}
                      stroke="white"
                      strokeWidth="2"
                    />
                  ))}
                  {/* Click labels */}
                  {clickedPoints.map((pt, idx) => (
                    <text
                      key={`lbl-${idx}`}
                      x={pt.x + 10}
                      y={pt.y + 4}
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      style={{ textShadow: '1px 1px 2px black' }}
                    >
                      {idx === 0 ? "1: Base" : "2: Top"}
                    </text>
                  ))}
                  {/* Dotted axis line */}
                  {clickedPoints.length === 2 && (
                    <line
                      x1={clickedPoints[0].x}
                      y1={clickedPoints[0].y}
                      x2={clickedPoints[1].x}
                      y2={clickedPoints[1].y}
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                    />
                  )}
                  {/* Hover preview line */}
                  {clickedPoints.length === 1 && mousePos && (
                    <line
                      x1={clickedPoints[0].x}
                      y1={clickedPoints[0].y}
                      x2={mousePos.x}
                      y2={mousePos.y}
                      stroke="#a855f7"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      opacity="0.7"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  setClickedPoints([]);
                  setMousePos(null);
                  setRecalibError(null);
                }}
                disabled={clickedPoints.length === 0 || recalibLoading}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#191919] text-xs font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset Points
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRecalibModalOpen(false);
                    setClickedPoints([]);
                  }}
                  disabled={recalibLoading}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[#191919] text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRecalibrate}
                  disabled={clickedPoints.length < 2 || recalibLoading}
                  className="px-6 py-2.5 bg-[#191919] hover:bg-[#191919]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {recalibLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Recalculating...
                    </>
                  ) : (
                    "Confirm Recalibration"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
