"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/AuthProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

// Dynamic load of Leaflet map (client-only)
const PlotMap = dynamic(() => import("@/components/PlotMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center min-h-[350px]">
      <span className="w-6 h-6 border-2 border-[#191919] border-t-transparent rounded-full animate-spin mr-2" />
      <p className="text-xs text-slate-500 font-medium">Memuat peta satelit...</p>
    </div>
  ),
});

interface Owner {
  username: string;
  display_name: string;
}

interface Plot {
  id: number;
  plot_code: string;
  name: string;
  description: string;
  privacy: "public" | "private";
  gps_centroid_lat: number | null;
  gps_centroid_lon: number | null;
  session_active: boolean;
  created_at: string;
  owner: Owner;
  owner_user_id?: number;
}

interface Scan {
  id: number;
  tree_code: string;
  scan_date: string;
  dbh_cm: number;
  tinggi_m: number;
  biomassa_kg: number;
  karbon_kg: number;
  co2e_kg: number;
  co2e_uncertainty_pct: number;
  thumbnail_url?: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  quality_status: string;
  splat_file_url?: string;
  species_predictions?: Array<{
    scientific_name: string;
    common_name: string;
    confidence: number;
  }> | string;
}

interface Aggregation {
  total_co2e_kg: number;
  combined_uncertainty_kg: number;
  combined_uncertainty_pct: number;
}

export default function PlotDetailPage() {
  const router = useRouter();
  const params = useParams();
  const plotCode = params.plot_code as string;

  const { user: currentUser } = useAuth();
  const [plot, setPlot] = useState<Plot | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [aggregation, setAggregation] = useState<Aggregation | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // States for new UI elements
  const [isAddTreeModalOpen, setIsAddTreeModalOpen] = useState(false);
  const [unclaimedScans, setUnclaimedScans] = useState<Scan[]>([]);
  const [unclaimedLoading, setUnclaimedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedScanId, setExpandedScanId] = useState<number | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimLoading, setClaimLoading] = useState<number | null>(null);

  // Check ownership
  useEffect(() => {
    if (plot && currentUser) {
      setIsOwner(
        currentUser.id === plot.owner_user_id || 
        currentUser.username === plot.owner?.username
      );
    } else {
      setIsOwner(false);
    }
  }, [plot, currentUser]);

  // Fetch plot details
  const fetchPlotDetails = async () => {
    try {
      const plotRes = await fetch(`${BACKEND_URL}/plots/${plotCode}`, {
        credentials: "include",
      });

      if (!plotRes.ok) {
        if (plotRes.status === 403) {
          throw new Error("Plot ini bersifat privat dan hanya dapat diakses oleh pemilik.");
        } else if (plotRes.status === 404) {
          throw new Error("Plot tidak ditemukan.");
        } else {
          throw new Error("Gagal mengambil detail plot.");
        }
      }

      const data = await plotRes.json();
      setPlot(data.plot);
      setScans(data.scans || []);
      setAggregation(data.aggregation);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlotDetails();
  }, [plotCode]);

  // Fetch unclaimed scans when modal opens
  const fetchUnclaimedScans = async () => {
    setUnclaimedLoading(true);
    setClaimError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/scans?limit=100`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        // Filter to keep only scans where claimed_by_user_id IS NULL (unclaimed)
        const unclaimed = (data.scans || []).filter((s: any) => s.claimed_by_user_id === null);
        setUnclaimedScans(unclaimed);
      }
    } catch (err) {
      console.error("Gagal mengambil data scan lama:", err);
    } finally {
      setUnclaimedLoading(false);
    }
  };

  useEffect(() => {
    if (isAddTreeModalOpen) {
      fetchUnclaimedScans();
    }
  }, [isAddTreeModalOpen]);

  const toggleSession = async () => {
    if (!plot) return;
    setActionLoading(true);
    setError(null);

    const endpoint = plot.session_active ? "stop" : "start";

    try {
      const res = await fetch(`${BACKEND_URL}/plots/${plot.id}/session/${endpoint}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Gagal mengontrol sesi");
      }

      // Refresh plot details
      await fetchPlotDetails();
    } catch (err: any) {
      setError(err.message || "Gagal mengontrol sesi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartNewScan = async () => {
    if (!plot) return;
    setActionLoading(true);
    try {
      if (!plot.session_active) {
        const startRes = await fetch(`${BACKEND_URL}/plots/${plot.id}/session/start`, {
          method: "POST",
          credentials: "include",
        });
        if (!startRes.ok) {
          throw new Error("Gagal mengaktifkan sesi plot");
        }
      }
      router.push("/reconstruct");
    } catch (err: any) {
      setError(err.message || "Gagal memulai scan baru");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimOldScan = async (scan: Scan) => {
    if (!plot) return;
    setClaimLoading(scan.id);
    setClaimError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/plots/${plot.id}/claim-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tree_code: scan.tree_code }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Gagal menghubungkan scan ke plot");
      }

      await fetchPlotDetails();
      setIsAddTreeModalOpen(false);
      setSearchQuery("");
    } catch (err: any) {
      setClaimError(err.message || "Gagal menghubungkan scan");
    } finally {
      setClaimLoading(null);
    }
  };

  // Helper functions for species information parsing
  const getSpeciesName = (scan: Scan) => {
    if (!scan.species_predictions) return null;
    let preds = scan.species_predictions;
    if (typeof preds === "string") {
      try {
        preds = JSON.parse(preds);
      } catch {
        return null;
      }
    }
    if (!Array.isArray(preds) || preds.length === 0) return null;
    return preds[0]?.scientific_name || null;
  };

  const getSpeciesCommonName = (scan: Scan) => {
    if (!scan.species_predictions) return null;
    let preds = scan.species_predictions;
    if (typeof preds === "string") {
      try {
        preds = JSON.parse(preds);
      } catch {
        return null;
      }
    }
    if (!Array.isArray(preds) || preds.length === 0) return null;
    return preds[0]?.common_name || null;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center">
        <span className="w-8 h-8 border-3 border-[#191919] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Mengambil informasi detail plot...</p>
      </main>
    );
  }

  if (error && !plot) {
    return (
      <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center px-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-150 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-650" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-2">Akses Terbatas</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/my-plots" className="bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl px-4 py-2.5 transition-all shadow-sm">
              Kembali ke Dashboard
            </Link>
            <Link href="/login" className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs rounded-xl px-4 py-2.5 transition-all">
              Masuk Akun
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Statistics calculation inside component
  const validDbhScans = scans.filter(s => s.dbh_cm > 0);
  const avgDbh = validDbhScans.length > 0 
    ? validDbhScans.reduce((sum, s) => sum + s.dbh_cm, 0) / validDbhScans.length
    : 0;

  const validTinggiScans = scans.filter(s => s.tinggi_m > 0);
  const avgTinggi = validTinggiScans.length > 0 
    ? validTinggiScans.reduce((sum, s) => sum + s.tinggi_m, 0) / validTinggiScans.length
    : 0;

  const uniqueSpecies = new Set(
    scans
      .map(s => {
        const name = getSpeciesName(s);
        return name ? name.trim().toLowerCase() : null;
      })
      .filter(Boolean)
  );
  const totalSpecies = uniqueSpecies.size;
  const totalCo2e = aggregation?.total_co2e_kg || 0;

  // Species-based color palettes
  const speciesList = Array.from(uniqueSpecies);
  const colorPalettes = [
    { bg: "bg-emerald-500 hover:bg-emerald-450", text: "text-emerald-500", border: "border-emerald-100", lightBg: "bg-emerald-50/30" },
    { bg: "bg-sky-500 hover:bg-sky-450", text: "text-sky-500", border: "border-sky-100", lightBg: "bg-sky-50/30" },
    { bg: "bg-amber-500 hover:bg-amber-450", text: "text-amber-500", border: "border-amber-100", lightBg: "bg-amber-50/30" },
    { bg: "bg-purple-500 hover:bg-purple-450", text: "text-purple-500", border: "border-purple-100", lightBg: "bg-purple-50/30" },
    { bg: "bg-rose-500 hover:bg-rose-450", text: "text-rose-500", border: "border-rose-100", lightBg: "bg-rose-50/30" },
    { bg: "bg-indigo-500 hover:bg-indigo-450", text: "text-indigo-500", border: "border-indigo-100", lightBg: "bg-indigo-50/30" },
  ];

  const getSpeciesColor = (speciesName: string | null) => {
    if (!speciesName) return { bg: "bg-slate-400 hover:bg-slate-350", text: "text-slate-400", border: "border-slate-100", lightBg: "bg-slate-50/30" };
    const index = speciesList.indexOf(speciesName.trim().toLowerCase());
    if (index === -1) return { bg: "bg-slate-400 hover:bg-slate-350", text: "text-slate-400", border: "border-slate-100", lightBg: "bg-slate-50/30" };
    return colorPalettes[index % colorPalettes.length];
  };

  const gpsScans = scans.filter((s) => s.gps_lat !== null && s.gps_lon !== null);

  return (
    <div className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col font-sans">
      <main className="flex-1 pt-28 pb-16 px-6 relative overflow-hidden">
        {/* Background radial overlays */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-emerald-500/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-slate-200/50 blur-[130px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Back Link & Info Badges */}
          <div className="mb-8 flex justify-between items-center">
            <Link href="/my-plots" className="text-xs text-slate-500 hover:text-emerald-700 transition-colors flex items-center gap-1.5 font-medium">
              ← Kembali ke Dashboard
            </Link>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200/50 px-2.5 py-1 rounded-xl">
                {plot?.plot_code}
              </span>
              <span className={`text-[10px] uppercase px-2.5 py-1 rounded-full border font-bold ${
                plot?.privacy === "public"
                  ? "bg-sky-50 text-sky-700 border-sky-100"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                {plot?.privacy}
              </span>
            </div>
          </div>

          {/* Plot Information Panel */}
          <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-normal tracking-tight text-[#191919] font-serif">{plot?.name}</h1>
              <p className="text-sm text-slate-500 mt-2.5 max-w-xl leading-relaxed">{plot?.description || "Tidak ada deskripsi lokasi."}</p>
              <p className="text-[10px] text-slate-450 mt-4 leading-none">
                Dibuat oleh <span className="text-slate-700 font-semibold">{plot?.owner.display_name}</span> pada {plot && new Date(plot.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {isOwner && (
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 select-none">
                <button
                  onClick={toggleSession}
                  disabled={actionLoading}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    plot?.session_active
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {actionLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                  ) : plot?.session_active ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-350 inline-block" />
                  )}
                  Mode Sesi: {plot?.session_active ? "Aktif" : "Nonaktif"}
                </button>

                <button
                  onClick={() => setIsAddTreeModalOpen(true)}
                  className="px-4 py-2.5 bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span className="text-sm font-bold leading-none">+</span> Tambah Pohon
                </button>
              </div>
            )}
          </section>

          {/* Large Editorial Hero Stat */}
          <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 flex flex-col gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Total Biomassa Karbon Plot</span>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="font-serif text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight text-[#191919] leading-none">
                  {totalCo2e.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </h2>
                <span className="text-lg sm:text-xl font-sans text-slate-400 font-medium">kg CO₂e</span>
                {aggregation && aggregation.total_co2e_kg > 0 && (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded ml-2 inline-block align-middle">
                    &plusmn; {aggregation.combined_uncertainty_kg.toFixed(1)} kg ({aggregation.combined_uncertainty_pct.toFixed(1)}%)
                  </span>
                )}
              </div>
              
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium border-t border-slate-100 pt-4">
                <span>{scans.length} pohon terdata</span>
                <span className="w-1 h-1 rounded-full bg-slate-350" />
                <span>{totalSpecies} spesies terdeteksi</span>
                <span className="w-1 h-1 rounded-full bg-slate-350" />
                <span>Rata-rata DBH: {avgDbh.toFixed(1)} cm</span>
                <span className="w-1 h-1 rounded-full bg-slate-350" />
                <span>Rata-rata Tinggi: {avgTinggi.toFixed(1)} m</span>
              </div>
            </div>

            {/* Horizontal Stacked Bar Chart for Carbon Contribution */}
            {scans.length > 0 && (
              <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Komposisi Kontribusi Karbon per Pohon</span>
                  <span className="text-[9px] text-slate-400 font-semibold italic">Hover segmen untuk melihat data pohon</span>
                </div>
                
                <div className="flex h-5 w-full rounded-full overflow-hidden bg-slate-100 border border-slate-200/40 shadow-inner select-none">
                  {scans.map((scan) => {
                    const specName = getSpeciesName(scan);
                    const color = getSpeciesColor(specName);
                    const pct = totalCo2e > 0 ? (scan.co2e_kg / totalCo2e) * 100 : 0;
                    if (pct < 0.5) return null; // skip tiny elements to avoid rendering issues
                    return (
                      <div
                        key={scan.id}
                        className={`${color.bg} transition-all duration-300 relative group cursor-pointer border-r border-white/20 last:border-r-0`}
                        style={{ width: `${pct}%` }}
                      >
                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 min-w-[200px] bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs leading-normal pointer-events-none">
                          <div className="font-bold border-b border-white/10 pb-1 mb-1">{scan.tree_code}</div>
                          <div className="text-[10px] text-slate-300 italic mb-1">{specName || "Spesies tidak terklasifikasi"}</div>
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>CO₂e:</span>
                            <span className="font-semibold text-emerald-400">{scan.co2e_kg.toFixed(1)} kg</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Kontribusi:</span>
                            <span className="font-semibold text-white">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Species Legend */}
                {speciesList.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
                    {speciesList.map((spec, idx) => {
                      const color = getSpeciesColor(spec);
                      return (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold capitalize">
                          <span className={`w-2.5 h-2.5 rounded-full ${color.bg.split(' ')[0]}`} />
                          <span className="italic">{spec}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Leaflet Map Centroid Location Visualizer */}
          <div className="flex flex-col gap-4 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Peta Sebaran & Lokasi Plot</h2>
            <div className="h-[400px] bg-slate-50 rounded-3xl overflow-hidden relative border border-slate-200 shadow-sm">
              <PlotMap
                scans={scans}
                centroidLat={plot?.gps_centroid_lat || null}
                centroidLon={plot?.gps_centroid_lon || null}
              />
            </div>
            {gpsScans.length < scans.length && (
              <p className="text-[10px] text-slate-450 leading-normal italic">
                * Menampilkan {gpsScans.length} dari {scans.length} pohon ({scans.length - gpsScans.length} pohon tidak memiliki data GPS EXIF).
              </p>
            )}
          </div>

          {/* Tree Scans Responsive Cards Grid Section */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Daftar Rekaman Pohon ({scans.length})</h2>
            
            {scans.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 italic text-xs leading-relaxed">
                Belum ada rekaman pohon dalam plot ini. Silakan klik "+ Tambah Pohon" di atas untuk memasukkan data.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scans.map((scan) => {
                  const isExpanded = expandedScanId === scan.id;
                  const specName = getSpeciesName(scan);
                  const specCommon = getSpeciesCommonName(scan);
                  const specColor = getSpeciesColor(specName);
                  return (
                    <div 
                      key={scan.id} 
                      className={`border rounded-3xl bg-white shadow-sm overflow-hidden transition-all duration-300 ${
                        isExpanded ? "border-slate-300 md:col-span-2 shadow-md" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Main card panel click area */}
                      <div 
                        onClick={() => setExpandedScanId(isExpanded ? null : scan.id)}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          {scan.thumbnail_url ? (
                            <img
                              src={scan.thumbnail_url}
                              alt={scan.tree_code}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              {scan.tree_code}
                              <span className="text-[10px] font-normal text-slate-400 font-mono">
                                {new Date(scan.scan_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            </h4>
                            <p className="text-xs text-slate-550 mt-1">
                              DBH: <span className="font-semibold text-slate-700">{scan.dbh_cm.toFixed(1)} cm</span> | 
                              Tinggi: <span className="font-semibold text-slate-700">{scan.tinggi_m.toFixed(1)} m</span>
                            </p>
                            {specName && (
                              <span className={`inline-block text-[9px] font-semibold border ${specColor.border} ${specColor.lightBg} ${specColor.text} px-2 py-0.5 rounded-full capitalize mt-1.5`}>
                                <i>{specName}</i> {specCommon ? `(${specCommon})` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-900 block">{scan.co2e_kg.toFixed(1)} kg</span>
                            <span className="text-[10px] text-slate-450 font-medium block mt-0.5">CO₂e</span>
                          </div>
                          <span className="text-slate-400 text-xs transition-transform duration-300 ml-1" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* Inline Splat Preview Panel */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex flex-col gap-4 animate-fadeIn">
                          {scan.splat_file_url ? (
                            <div className="flex flex-col gap-4">
                              <div className="h-[300px] w-full bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-200/80 shadow-inner">
                                <iframe
                                  src={`${BACKEND_URL}/viewer.html?v=11&code=${scan.tree_code}&url=${encodeURIComponent(scan.splat_file_url)}`}
                                  allow="xr-spatial-tracking; autoplay; fullscreen"
                                  className="w-full h-full border-none"
                                  title={`3D Splat Preview ${scan.tree_code}`}
                                />
                              </div>
                              <div className="flex justify-end">
                                <Link
                                  href={`/reconstruct?code=${scan.tree_code}&phase=result`}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                                >
                                  Buka viewer 3D lengkap →
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-10 text-slate-400 text-xs italic bg-white/50 border border-slate-100 rounded-2xl">
                              Data 3D splat tidak tersedia untuk pohon ini.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Tambah Pohon */}
      {isAddTreeModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsAddTreeModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col gap-6 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-xl text-[#191919] font-normal">Tambah Pohon ke Plot</h3>
                <p className="text-xs text-slate-500 mt-1">Pilih metode untuk menambahkan rekaman biomassa pohon.</p>
              </div>
              <button 
                onClick={() => setIsAddTreeModalOpen(false)} 
                className="text-slate-400 hover:text-[#191919] text-sm font-semibold w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              {/* Option A */}
              <div 
                className="border border-slate-200/80 rounded-2xl p-5 hover:border-[#191919]/60 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col gap-2" 
                onClick={handleStartNewScan}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg leading-none">+</span>
                  <span className="font-semibold text-sm text-[#191919]">Mulai Scan Baru</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed ml-10.5">
                  Rekam video/foto pohon baru dengan kamera Anda secara langsung. Sesi plot akan diaktifkan secara otomatis.
                </p>
              </div>

              {/* Option B */}
              <div className="border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  </span>
                  <span className="font-semibold text-sm text-[#191919]">Hubungkan Scan Lama</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed ml-10.5">
                  Pilih hasil rekaman pohon sebelumnya yang belum terasosiasikan dengan plot mana pun.
                </p>
                
                <div className="ml-10.5 border-t border-slate-100 pt-4 flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Cari kode pohon (misal: POHON-1234)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-xl px-3.5 py-2 text-xs text-[#191919] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
                  />

                  {claimError && (
                    <p className="text-[10px] text-red-650 bg-red-50 border border-red-100 px-3 py-2 rounded-lg font-medium">{claimError}</p>
                  )}

                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {unclaimedLoading ? (
                      <div className="text-center py-4 text-slate-400 text-[11px] font-medium flex items-center justify-center gap-1.5">
                        <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        Memuat data scan...
                      </div>
                    ) : unclaimedScans.length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-[11px] italic">
                        Tidak ada scan unclaimed yang tersedia.
                      </div>
                    ) : (
                      unclaimedScans
                        .filter(s => s.tree_code.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((scan) => (
                          <div 
                            key={scan.id} 
                            onClick={() => handleClaimOldScan(scan)}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100/70 hover:border-slate-250/60 transition-all cursor-pointer"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">{scan.tree_code}</span>
                              <span className="text-[10px] text-slate-500">DBH: {scan.dbh_cm.toFixed(1)} cm</span>
                            </div>
                            <button 
                              disabled={claimLoading !== null}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#191919] font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              {claimLoading === scan.id ? "Menghubungkan..." : "Hubungkan"}
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
