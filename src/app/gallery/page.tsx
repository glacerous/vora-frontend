"use client";

import React, { useState, useEffect } from "react";
import Loader from "@/components/Loader";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useAuth, useSettings, formatDbh, formatHeight, formatCo2e } from "@/components/AuthProvider";

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

interface Plot {
  id: number;
  plot_code: string;
  name: string;
  description: string;
  privacy: "public" | "private";
  session_active: boolean;
  created_at: string;
  scans_count: number;
  total_co2e_kg: number;
  thumbnails: string[];
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";
const PAGE_LIMIT = 12;

const UiverseLoader = () => <Loader size={110} />;

const TreeIcon = ({ className = "w-8 h-8 text-[#a8a29e]" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22V12" />
    <path d="M12 12L8 8" />
    <path d="M12 10L16 6" />
    <path d="M12 15L7 10" />
    <path d="M12 13L17 8" />
    <path d="M12 7L9 4" />
    <path d="M12 5L15 2" />
  </svg>
);

export default function HistoryPage() {
  const { isWakingUp } = useAuth();
  const { language, unit, t } = useSettings();
  const [galleryTab, setGalleryTab] = useState<"tree" | "plot">("tree");
  
  // Scans tab states
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "high-carbon" | "estimated"
  
  // Plots tab states
  const [plots, setPlots] = useState<Plot[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);

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
      const res = await fetch(`${BACKEND_URL}/scans?limit=${PAGE_LIMIT}&offset=${currentOffset}`, { cache: 'no-store' });

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

  const fetchPlots = async () => {
    setPlotsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/plots`, { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to fetch public plots.");
      const data = await res.json();
      setPlots(data.plots || []);
    } catch (err: any) {
      setError(err.message || "A connection error occurred");
    } finally {
      setPlotsLoading(false);
    }
  };

  // Initial load for scans
  useEffect(() => {
    fetchScans(0, false);
  }, []);

  // Load plots when clicking plots tab
  useEffect(() => {
    if (galleryTab === "plot" && plots.length === 0) {
      fetchPlots();
    }
  }, [galleryTab]);

  const handleLoadMore = () => {
    const nextOffset = offset + PAGE_LIMIT;
    setOffset(nextOffset);
    fetchScans(nextOffset, true);
  };

  // Multi-criteria client-side dynamic search + tab filters
  const filteredScans = scans.filter((scan) => {
    const matchesSearch = scan.tree_code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "high-carbon") {
      return (scan.co2e_kg || 0) >= 200;
    }
    if (activeTab === "estimated") {
      return scan.dbh_cm !== null && scan.dbh_cm !== undefined;
    }
    return true;
  });

  const validScans = scans.filter(s => s.dbh_cm);

  return (
    <div className="min-h-screen bg-[#fafaf9]/60 flex flex-col font-sans text-[#292524]">

      {/* ── Main content area ────────────────────────────────────── */}
      <main className="flex-1 pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Heading Section */}
          <div className="mb-8 border-b border-[#e7e5e4] pb-6">
            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#292524] mb-2">
              {language === "id" ? "Galeri Scan" : "Scan Gallery"}
            </h1>
            <p className="text-sm text-[#292524]/60 max-w-2xl leading-relaxed">
              {language === "id" ? "Jelajahi pemindaian pohon 3D publik dan plot hutan yang dipetakan oleh komunitas Vora." : "Discover public 3D tree scans and forest plots mapped by the Vora community."}
            </p>
          </div>

          {/* Gallery Mode Tabs */}
          <div className="flex border-b border-[#e7e5e4] mb-8 select-none">
            <button
              onClick={() => setGalleryTab("tree")}
              className={`pb-3.5 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                galleryTab === "tree"
                  ? "border-[#616c39] text-[#616c39]"
                  : "border-transparent text-[#79716b] hover:text-[#292524]"
              }`}
            >
              {language === "id" ? "Pohon Publik" : "Public Trees"}
            </button>
            <button
              onClick={() => setGalleryTab("plot")}
              className={`pb-3.5 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                galleryTab === "plot"
                  ? "border-[#616c39] text-[#616c39]"
                  : "border-transparent text-[#79716b] hover:text-[#292524]"
              }`}
            >
              {language === "id" ? "Plot Publik" : "Public Plots"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-150 text-red-700 text-xs rounded-2xl p-4 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* TAB 1: Public Trees */}
          {galleryTab === "tree" && (
            scans.length > 0 ? (
              <div className="animate-fadeIn">
                {/* Toolbar: Search input + Segmented Filter Tabs */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Search input with whatsapp style Uiverse component */}
                  <form onSubmit={(e) => e.preventDefault()} className="whatsapp-search-form">
                    <label htmlFor="search">
                      <input
                        required
                        autoComplete="off"
                        placeholder={language === "id" ? "Cari kode pohon..." : "Search tree code..."}
                        id="search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="whatsapp-search-icon">
                        <svg strokeWidth="2.5" stroke="currentColor" viewBox="0 0 24 24" fill="none" className="whatsapp-search-swap-on">
                          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinejoin="round" strokeLinecap="round"></path>
                        </svg>
                        <svg strokeWidth="2.5" stroke="currentColor" viewBox="0 0 24 24" fill="none" className="whatsapp-search-swap-off">
                          <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinejoin="round" strokeLinecap="round"></path>
                        </svg>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSearchQuery("")} 
                        className="whatsapp-search-close-btn"
                        aria-label="Clear search"
                      >
                        <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current">
                          <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                        </svg>
                      </button>
                    </label>
                  </form>

                  {/* Segmented Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl self-start md:self-auto select-none overflow-x-auto max-w-full flex-nowrap scrollbar-none shrink-0">
                    {[
                      { id: "all", label: language === "id" ? `Semua Scan (${scans.length})` : `All Scans (${scans.length})` },
                      { id: "high-carbon", label: language === "id" ? `Karbon Tinggi (${scans.filter(s => (s.co2e_kg || 0) >= 200).length})` : `High Carbon (${scans.filter(s => (s.co2e_kg || 0) >= 200).length})` },
                      { id: "estimated", label: language === "id" ? `Terestimasi (${validScans.length})` : `Estimated (${validScans.length})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all duration-200 whitespace-nowrap shrink-0 ${
                          activeTab === tab.id
                            ? "bg-white text-[#292524] shadow-sm font-semibold animate-fadeIn"
                            : "text-[#79716b] hover:text-[#292524]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results Grid / Filter Empty State */}
                {filteredScans.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center">
                      {filteredScans.map((record, idx) => {
                        const isInvalid = record.dbh_cm === null || record.dbh_cm === undefined;
                        return (
                          <div
                            key={record.tree_code}
                            className="bg-white border border-[#e7e5e4] hover:border-[#292524] rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group w-full"
                          >
                            {/* Image Container */}
                            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#fafaf9] mb-3">
                              {record.thumbnail_url ? (
                                <img
                                  src={record.thumbnail_url}
                                  alt={`Thumbnail for ${record.tree_code}`}
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#79716b]/30 bg-[#fafaf9]">
                                  <TreeIcon className="w-12 h-12" />
                                </div>
                              )}

                              {/* Top ID Tag */}
                              <div className="absolute top-2.5 left-2.5 z-10">
                                <span className="px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] font-medium">
                                  #{record.id}
                                </span>
                              </div>

                              {/* Bottom Gradient & Clean Mono Tree Code */}
                              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10">
                                <span className="font-mono text-xs font-semibold text-white tracking-wider block drop-shadow-sm">
                                  {record.tree_code}
                                </span>
                              </div>
                            </div>

                            {/* Card Footer: Typography & Actions */}
                            <div className="flex items-center justify-between gap-2 px-1 pt-1 pb-0.5">
                              <div className="flex flex-col">
                                <div className="font-serif text-base font-normal text-[#292524] leading-tight">
                                  {formatCo2e(record.co2e_kg, unit)}
                                </div>
                                {isInvalid ? (
                                  <span className="text-[10px] text-rose-500 font-semibold mt-0.5 font-sans">
                                    {language === "id" ? "Scan tidak valid" : "Invalid scan"}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-mono text-[#79716b] mt-0.5">
                                    {record.dbh_cm ? `${formatDbh(record.dbh_cm, unit)} DBH` : "-"} · {record.tinggi_m ? `${formatHeight(record.tinggi_m, unit)} H` : "-"}
                                  </span>
                                )}
                              </div>

                              <Link
                                href={`/reconstruct?code=${encodeURIComponent(record.tree_code)}&phase=result`}
                                className="px-3.5 py-1.5 bg-[#292524] hover:bg-[#616c39] text-white text-xs font-semibold rounded-lg transition-colors duration-200 select-none shrink-0"
                              >
                                {language === "id" ? "Lihat" : "View"}
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More Pagination Button */}
                    {hasMore && searchQuery === "" && activeTab === "all" && (
                      <div className="flex justify-center mt-12">
                        <button
                          onClick={handleLoadMore}
                          disabled={loading}
                          className="px-8 py-3 border border-[#e7e5e4] text-sm font-semibold rounded-2xl bg-white hover:bg-[#fafaf9] hover:border-[#a8a29e] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] select-none cursor-pointer"
                        >
                          {loading && (
                            <div className="w-3.5 h-3.5 border-2 border-[#a8a29e] border-t-transparent rounded-full animate-spin" />
                          )}
                          {language === "id" ? "Muat lebih banyak scan" : "Load more scans"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-[#a8a29e] gap-2 bg-white rounded-2xl border border-[#e7e5e4] shadow-sm">
                    <TreeIcon className="w-10 h-10 text-[#d6d3d1] mb-1" />
                    <p className="text-sm font-semibold text-[#79716b]">{language === "id" ? "Tidak ada scan yang cocok" : "No matching scans found"}</p>
                    <p className="text-xs text-[#a8a29e] max-w-xs mt-0.5">{language === "id" ? "Coba cari dengan kode pohon lain atau sesuaikan filter." : "Try searching for a different tree code or adjust your query filter."}</p>
                  </div>
                )}
              </div>
            ) : (
              !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-[#a8a29e] gap-2 bg-white rounded-2xl border border-[#e7e5e4] shadow-sm animate-fadeIn">
                  <TreeIcon className="w-12 h-12 text-[#d6d3d1] mb-1" />
                  <p className="text-sm font-semibold mt-2 text-[#79716b]">{language === "id" ? "Belum ada scan di galeri" : "No scans found in the gallery"}</p>
                </div>
              )
            )
          )}

          {/* TAB 2: Public Plots */}
          {galleryTab === "plot" && (
            plotsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
                <UiverseLoader />
                
                {isWakingUp && (
                  <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 mt-2 max-w-sm flex items-center gap-2 leading-relaxed animate-pulse">
                    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>
                      {language === "id"
                        ? "Membangunkan server backend (cold start Render.com). Ini mungkin memakan waktu hingga 50 detik."
                        : "Waking up backend servers (Render.com cold start). This may take up to 50 seconds."}
                    </span>
                  </p>
                )}
              </div>
            ) : plots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {plots.map((plot) => (
                  <div
                    key={plot.id}
                    className="bg-white border border-[#e7e5e4]/80 rounded-2xl p-6 shadow-sm hover:border-[#a8a29e] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4 select-none">
                        <span className="text-[10px] font-mono tracking-wider bg-[#fafaf9] text-[#79716b] border border-[#e7e5e4] px-2 py-0.5 rounded font-bold">
                          {plot.plot_code}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          plot.privacy === "public"
                            ? "bg-sky-50 text-sky-700 border-sky-100"
                            : "bg-[#fafaf9] text-[#79716b] border-[#e7e5e4]"
                        }`}>
                          {plot.privacy === "public" ? (language === "id" ? "Publik" : "Public") : (language === "id" ? "Privat" : "Private")}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-[#292524] mb-2 hover:text-[#616c39] transition-colors font-serif">
                        <Link href={`/plots/${plot.plot_code}`}>
                          {plot.name}
                        </Link>
                      </h3>

                      <p className="text-xs text-[#79716b] leading-relaxed mb-6 line-clamp-2">
                        {plot.description || (language === "id" ? "Tidak ada deskripsi lokasi." : "No location description.")}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#fafaf9] flex justify-between items-center select-none font-sans">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2.5 overflow-hidden">
                          {plot.thumbnails && plot.thumbnails.length > 0 ? (
                            plot.thumbnails.map((url, i) => (
                              <img
                                key={i}
                                className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover object-center border border-[#e7e5e4]"
                                src={url}
                                alt="Tree avatar"
                                loading="lazy"
                              />
                            ))
                          ) : (
                            <div className="inline-block h-7 w-7 rounded-full bg-[#fafaf9] ring-2 ring-white border border-[#e7e5e4] flex items-center justify-center text-[#79716b]">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            </div>
                          )}
                          {plot.scans_count > 3 && (
                            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#fafaf9] text-[9px] font-bold text-[#79716b] border border-[#e7e5e4] ring-2 ring-white">
                              +{plot.scans_count - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col text-[10px] text-[#79716b] leading-tight">
                          <span>{language === "id" ? "Pohon" : "Trees"}: <span className="font-semibold text-[#292524]">{plot.scans_count}</span></span>
                          <span className="mt-0.5">CO₂e: <span className="font-bold text-[#292524]">{plot.total_co2e_kg ? plot.total_co2e_kg.toFixed(1) : 0} kg</span></span>
                        </div>
                      </div>
                      
                      <Link
                        href={`/plots/${plot.plot_code}`}
                        className="text-xs text-[#616c39] font-bold hover:text-[#616c39] flex items-center gap-1 transition-colors"
                      >
                        {language === "id" ? "Detail Plot →" : "Plot Details →"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-[#a8a29e] gap-2 bg-white rounded-2xl border border-[#e7e5e4] shadow-sm animate-fadeIn">
                <TreeIcon className="w-12 h-12 text-[#d6d3d1] mb-1" />
                <p className="text-sm font-semibold mt-2 text-[#79716b]">
                  {language === "id" ? "Belum ada plot publik di galeri" : "No public plots found in the gallery"}
                </p>
              </div>
            )
          )}

          {/* Center Loading Spinner for first page scans */}
          {loading && scans.length === 0 && galleryTab === "tree" && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-6 animate-fadeIn">
              <UiverseLoader />
              
              {isWakingUp && (
                <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 mt-2 max-w-sm flex items-center gap-2 leading-relaxed animate-pulse">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>
                    {language === "id"
                      ? "Membangunkan server backend (cold start Render.com). Ini mungkin memakan waktu hingga 50 detik."
                      : "Waking up backend servers (Render.com cold start). This may take up to 50 seconds."}
                  </span>
                </p>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
