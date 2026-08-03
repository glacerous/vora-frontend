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
    <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center min-h-[250px]">
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
  target_co2e_kg: number | null;
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
  grid_position_x?: number | null;
  grid_position_y?: number | null;
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

  // States for plot add / claim tree modal
  const [isAddTreeModalOpen, setIsAddTreeModalOpen] = useState(false);
  const [unclaimedScans, setUnclaimedScans] = useState<Scan[]>([]);
  const [unclaimedLoading, setUnclaimedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimLoading, setClaimLoading] = useState<number | null>(null);

  // States for the Visual Spatial Grid Canvas & Layout (Fine Grid)
  const [gridPositions, setGridPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isLayoutDirty, setIsLayoutDirty] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Scan | null>(null);
  const [draggedTreeCode, setDraggedTreeCode] = useState<string | null>(null);

  // Spatial display mode (grid canvas or Leaflet gps map)
  const [spatialMode, setSpatialMode] = useState<"grid" | "gps">("grid");

  // Fine-grid dimensions configurations (24px cells)
  const CELL_SIZE = 24;
  const DEFAULT_COLS = 24;
  const DEFAULT_ROWS = 21; // perfectly aligns with height 504px

  // Table filter tabs
  const [filterTab, setFilterTab] = useState<"all" | "large" | "small">("all");

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

  // Visual Spatial Grid Auto-layout logic for 24px dense coordinate mapping
  useEffect(() => {
    if (scans.length === 0) {
      setGridPositions({});
      return;
    }

    const newPositions: Record<string, { x: number; y: number }> = {};
    const unplacedScans: Scan[] = [];

    // 1. First assign scans that already have saved positions in DB
    scans.forEach((s) => {
      if (s.grid_position_x !== undefined && s.grid_position_x !== null &&
          s.grid_position_y !== undefined && s.grid_position_y !== null) {
        // Ensure within reasonable grid boundaries
        const xVal = Math.max(0, Math.min(s.grid_position_x, DEFAULT_COLS - 2));
        const yVal = Math.max(0, Math.min(s.grid_position_y, DEFAULT_ROWS - 2));
        newPositions[s.tree_code] = { x: xVal, y: yVal };
      } else {
        unplacedScans.push(s);
      }
    });

    if (unplacedScans.length === 0) {
      setGridPositions(newPositions);
      return;
    }

    const isOccupied = (x: number, y: number) => {
      // Since nodes are 2x2 cells (48px), check for overlapping 2x2 footprints
      return Object.values(newPositions).some(
        (pos) => Math.abs(pos.x - x) < 2 && Math.abs(pos.y - y) < 2
      );
    };

    const findAvailableCell = () => {
      for (let y = 0; y < DEFAULT_ROWS - 1; y += 2) {
        for (let x = 0; x < DEFAULT_COLS - 1; x += 2) {
          if (!isOccupied(x, y)) {
            return { x, y };
          }
        }
      }
      // fall back to sequential cells if stepped grid is full
      for (let y = 0; y < DEFAULT_ROWS - 1; y++) {
        for (let x = 0; x < DEFAULT_COLS - 1; x++) {
          if (!isOccupied(x, y)) {
            return { x, y };
          }
        }
      }
      return { x: 0, y: 0 };
    };

    // 2. Map relative GPS coordinates to empty grid cells for scans that have GPS
    const gpsScans = unplacedScans.filter((s) => s.gps_lat !== null && s.gps_lon !== null);
    const noGpsScans = unplacedScans.filter((s) => s.gps_lat === null || s.gps_lon === null);

    if (gpsScans.length > 0) {
      const lats = gpsScans.map((s) => s.gps_lat as number);
      const lons = gpsScans.map((s) => s.gps_lon as number);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      gpsScans.forEach((scan) => {
        const lat = scan.gps_lat as number;
        const lon = scan.gps_lon as number;

        let targetX = minLon === maxLon ? Math.floor(DEFAULT_COLS / 2) : Math.round(((lon - minLon) / (maxLon - minLon)) * (DEFAULT_COLS - 2));
        let targetY = minLat === maxLat ? Math.floor(DEFAULT_ROWS / 2) : (DEFAULT_ROWS - 2) - Math.round(((lat - minLat) / (maxLat - minLat)) * (DEFAULT_ROWS - 2));

        // Ensure indices are even numbers to align nicely with 2x2 grid stepping
        targetX = Math.round(targetX / 2) * 2;
        targetY = Math.round(targetY / 2) * 2;

        if (isOccupied(targetX, targetY)) {
          let resolved = false;
          const maxRadius = Math.max(DEFAULT_COLS, DEFAULT_ROWS);
          for (let r = 2; r < maxRadius && !resolved; r += 2) {
            for (let dy = -r; dy <= r && !resolved; dy += 2) {
              for (let dx = -r; dx <= r && !resolved; dx += 2) {
                const nx = targetX + dx;
                const ny = targetY + dy;
                if (nx >= 0 && nx < DEFAULT_COLS - 1 && ny >= 0 && ny < DEFAULT_ROWS - 1 && !isOccupied(nx, ny)) {
                  targetX = nx;
                  targetY = ny;
                  resolved = true;
                }
              }
            }
          }
          if (!resolved) {
            const cell = findAvailableCell();
            targetX = cell.x;
            targetY = cell.y;
          }
        }

        newPositions[scan.tree_code] = { x: targetX, y: targetY };
      });
    }

    // 3. Fallback sequential grid positioning for scans without GPS info
    noGpsScans.forEach((scan) => {
      const cell = findAvailableCell();
      newPositions[scan.tree_code] = { x: cell.x, y: cell.y };
    });

    setGridPositions(newPositions);
  }, [scans]);

  // Native HTML5 Drag and Drop handlers using screen offsets relative to grid canvas rect
  const handleDragStart = (e: React.DragEvent, treeCode: string) => {
    setDraggedTreeCode(treeCode);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTreeCode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    // Center of 48px node is 24px, so subtract 24px to match drag pointer coordinate index
    const targetX = Math.round((offsetX - 24) / CELL_SIZE);
    const targetY = Math.round((offsetY - 24) / CELL_SIZE);

    const cols = Math.floor(rect.width / CELL_SIZE);
    const rows = Math.floor(rect.height / CELL_SIZE);

    // Keep the 2x2 footprint completely inside the grid bounding container
    const clampedX = Math.max(0, Math.min(targetX, cols - 2));
    const clampedY = Math.max(0, Math.min(targetY, rows - 2));

    // Swap coordinates if overlap is detected
    const occupyingTreeCode = Object.keys(gridPositions).find(
      (code) => gridPositions[code].x === clampedX && gridPositions[code].y === clampedY
    );

    setGridPositions((prev) => {
      const updated = { ...prev };
      
      if (occupyingTreeCode) {
        const sourcePos = prev[draggedTreeCode];
        updated[occupyingTreeCode] = sourcePos;
      }
      
      updated[draggedTreeCode] = { x: clampedX, y: clampedY };
      return updated;
    });

    setIsLayoutDirty(true);
    setDraggedTreeCode(null);
  };

  const handleSaveLayout = async () => {
    if (!plot) return;
    setActionLoading(true);
    try {
      const layoutData = Object.entries(gridPositions).map(([treeCode, pos]) => ({
        tree_code: treeCode,
        grid_position_x: pos.x,
        grid_position_y: pos.y,
      }));

      const res = await fetch(`${BACKEND_URL}/plots/${plot.id}/layout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ layout: layoutData }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan tata letak baru.");
      }

      setIsLayoutDirty(false);
      await fetchPlotDetails();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan tata letak.");
    } finally {
      setActionLoading(false);
    }
  };

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

  // Helper functions for species predictions
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
      <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center font-sans">
        <span className="w-8 h-8 border-3 border-[#191919] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Mengambil informasi detail plot...</p>
      </main>
    );
  }

  if (error && !plot) {
    return (
      <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center px-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-150 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-650" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1.5">Akses Terbatas</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-5">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/my-plots" className="bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-lg px-4 py-2 transition-all shadow-sm">
              Dashboard
            </Link>
            <Link href="/login" className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs rounded-lg px-4 py-2 transition-all">
              Masuk
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const validDbhScans = scans.filter(s => s.dbh_cm > 0);
  const avgDbh = validDbhScans.length > 0 
    ? validDbhScans.reduce((sum, s) => sum + s.dbh_cm, 0) / validDbhScans.length
    : 0;

  const validTinggiScans = scans.filter(s => s.tinggi_m > 0);
  const avgTinggi = validTinggiScans.length > 0 
    ? validTinggiScans.reduce((sum, s) => sum + s.tinggi_m, 0) / validTinggiScans.length
    : 0;

  // Case bug fix: convert predicted species names to lowercase when generating the unique set
  const uniqueSpecies = new Set(
    scans
      .map(s => getSpeciesName(s)?.trim().toLowerCase())
      .filter((s): s is string => s !== null && s !== undefined)
  );
  const totalSpecies = uniqueSpecies.size;
  const totalCo2e = aggregation?.total_co2e_kg || 0;

  // Species-based colors
  const speciesList = Array.from(uniqueSpecies);
  const colorPalettes = [
    { bg: "bg-emerald-600 hover:bg-emerald-500", text: "text-emerald-700", border: "border-emerald-250", lightBg: "bg-emerald-50/50" },
    { bg: "bg-sky-600 hover:bg-sky-500", text: "text-sky-700", border: "border-sky-250", lightBg: "bg-sky-50/50" },
    { bg: "bg-amber-600 hover:bg-amber-500", text: "text-amber-700", border: "border-amber-250", lightBg: "bg-amber-50/50" },
    { bg: "bg-purple-600 hover:bg-purple-500", text: "text-purple-700", border: "border-purple-250", lightBg: "bg-purple-50/50" },
    { bg: "bg-rose-600 hover:bg-rose-500", text: "text-rose-700", border: "border-rose-250", lightBg: "bg-rose-50/50" },
    { bg: "bg-indigo-600 hover:bg-indigo-500", text: "text-indigo-700", border: "border-indigo-250", lightBg: "bg-indigo-50/50" },
  ];

  const getSpeciesColor = (speciesName: string | null) => {
    if (!speciesName) return { bg: "bg-slate-500 hover:bg-slate-400", text: "text-slate-700", border: "border-slate-350", lightBg: "bg-slate-50/50" };
    const index = speciesList.indexOf(speciesName.trim().toLowerCase());
    if (index === -1) return { bg: "bg-slate-500 hover:bg-slate-400", text: "text-slate-700", border: "border-slate-350", lightBg: "bg-slate-50/50" };
    return colorPalettes[index % colorPalettes.length];
  };

  const gpsScans = scans.filter((s) => s.gps_lat !== null && s.gps_lon !== null);

  // Table filtering based on tab selection
  const filteredScans = scans.filter((s) => {
    if (filterTab === "large") return s.dbh_cm > 10;
    if (filterTab === "small") return s.dbh_cm <= 10;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col font-sans">
      <main className="flex-1 pt-24 pb-12 px-4 sm:px-6 relative overflow-hidden">
        {/* Background radial overlays */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-emerald-500/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-slate-200/50 blur-[130px] pointer-events-none" />

        <div className="max-w-[1440px] mx-auto relative z-10 flex flex-col gap-4">
          {/* Top toolbar matching dashboard reference */}
          <div className="flex justify-between items-center select-none pb-2 border-b border-slate-200/40">
            <Link href="/my-plots" className="text-xs text-slate-500 hover:text-emerald-700 transition-colors flex items-center gap-1.5 font-medium">
              ← Kembali ke Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <span className={`text-[9px] uppercase px-2 py-0.5 rounded border font-bold ${
                plot?.privacy === "public"
                  ? "bg-sky-50 text-sky-700 border-sky-100"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                {plot?.privacy}
              </span>
              
              {isOwner && (
                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  <button
                    onClick={toggleSession}
                    disabled={actionLoading}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      plot?.session_active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-755 hover:bg-emerald-100"
                        : "border-slate-200 hover:border-slate-300 text-slate-655 hover:bg-slate-50"
                    }`}
                  >
                    {actionLoading ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                    ) : plot?.session_active ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-350 inline-block" />
                    )}
                    Sesi: {plot?.session_active ? "Aktif" : "Nonaktif"}
                  </button>

                  <button
                    onClick={() => setIsAddTreeModalOpen(true)}
                    className="px-3 py-1.5 bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-[10px] rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span className="text-xs font-bold leading-none">+</span> Tambah Pohon
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start mt-2">
            
            {/* KOLOM KIRI (col-span-4): Plot Profile, Stats, progress circular, dan diagram spesies */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              
              {/* Card 1: Plot Profile & Carbon Target Gauge (Unified Left Dashboard Header) */}
              <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center">
                <div className="w-full border-b border-slate-100 pb-3.5 mb-4 flex flex-col gap-1 text-left select-none">
                  <span className="text-[9px] font-mono text-emerald-750 font-bold block mb-0.5">{plot?.plot_code}</span>
                  <h1 className="text-lg font-bold tracking-tight text-slate-800 font-serif leading-tight">{plot?.name}</h1>
                  <p className="text-[10px] text-slate-500 leading-normal line-clamp-3 mt-1.5">{plot?.description || "Tidak ada deskripsi lokasi."}</p>
                  <span className="text-[9px] text-slate-400 mt-2 block font-medium">
                    Oleh <span className="text-slate-600 font-semibold">{plot?.owner.display_name}</span> &bull; {plot && new Date(plot.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>

                {plot?.target_co2e_kg && plot.target_co2e_kg > 0 ? (
                  <>
                    <h3 className="font-bold text-[10px] text-slate-455 uppercase tracking-widest self-start mb-1 select-none">Progres Target Karbon</h3>
                    
                    {/* Curved SVG Gauge */}
                    <div className="relative flex flex-col items-center justify-center py-3 select-none">
                      <svg className="w-40 h-22" viewBox="0 0 100 60">
                        <path
                          d="M 10 50 A 40 40 0 0 1 90 50"
                          fill="none"
                          stroke="#f1f5f9"
                          strokeWidth="10"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10 50 A 40 40 0 0 1 90 50"
                          fill="none"
                          stroke="url(#progressGradient)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray="125.6"
                          strokeDashoffset={125.6 - (Math.min(totalCo2e / plot.target_co2e_kg, 1) * 125.6)}
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#059669" />
                            <stop offset="100%" stopColor="#0284c7" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute bottom-1 text-center">
                        <span className="text-xl font-semibold text-[#191919]">{Math.round(Math.min(totalCo2e / plot.target_co2e_kg, 1) * 100)}%</span>
                        <span className="text-[9px] text-slate-400 block font-medium mt-0.5">dari target {plot.target_co2e_kg >= 1000 ? `${(plot.target_co2e_kg / 1000).toFixed(0)}k` : plot.target_co2e_kg} kg</span>
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="text-center w-full border-t border-slate-100 pt-3 mt-1.5 select-none">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Total Estimasi CO₂e</span>
                  <h2 className="font-serif text-2xl font-normal text-slate-900 tracking-tight">
                    {totalCo2e.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
                    <span className="text-xs font-sans text-slate-450 font-medium">kg</span>
                  </h2>
                  <div className="mt-2 flex justify-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-505 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-md">
                      Pohon: {scans.length}
                    </span>
                    {aggregation && (
                      <span className="text-[9px] font-bold text-slate-505 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-md">
                        Uncertainty: &plusmn;{aggregation.combined_uncertainty_pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {/* Card 2: Distribusi Spesies (Fleet Distribution By Type) */}
              <section className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-sm flex flex-col gap-3">
                <h3 className="font-bold text-[10px] text-slate-455 uppercase tracking-widest select-none">Kontribusi per Spesies</h3>
                
                <div className="flex flex-col gap-3 max-h-[240px] overflow-y-auto pr-1">
                  {speciesList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">Spesies belum terklasifikasi</p>
                  ) : (
                    speciesList.map((spec, idx) => {
                      const specScans = scans.filter(s => getSpeciesName(s)?.trim().toLowerCase() === spec);
                      const specCo2e = specScans.reduce((sum, s) => sum + s.co2e_kg, 0);
                      const specPct = totalCo2e > 0 ? (specCo2e / totalCo2e) * 100 : 0;
                      const color = getSpeciesColor(spec);
                      return (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs text-slate-650 font-semibold capitalize">
                            <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.bg.split(' ')[0]}`} />
                              <span className="italic truncate">{spec}</span>
                              <span className="text-[9px] text-slate-400 font-normal shrink-0">({specScans.length} pohon)</span>
                            </div>
                            <span className="font-bold text-slate-800 shrink-0">{specPct.toFixed(0)}%</span>
                          </div>
                          {/* Progress bar track */}
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                            <div 
                              className={`h-full ${color.bg.split(' ')[0]} rounded-full transition-all duration-500`} 
                              style={{ width: `${specPct}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Card 3: Rata-rata & Visual Wave Dist (Fuel Usage & Cost) */}
              <section className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-sm flex flex-col gap-3">
                <h3 className="font-bold text-[10px] text-slate-455 uppercase tracking-widest select-none">Dimensi Rata-rata & Kerapatan DBH</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block select-none">Avg DBH</span>
                    <span className="text-lg font-bold font-serif text-slate-800">{avgDbh.toFixed(1)} cm</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block select-none">Avg Tinggi</span>
                    <span className="text-lg font-bold font-serif text-slate-800">{avgTinggi.toFixed(1)} m</span>
                  </div>
                </div>

                {/* Stylized density bar graph (wave simulation) - only if scans length >= 5 */}
                {scans.length >= 5 ? (
                  <div className="flex items-end justify-between h-12 bg-[#fafbfd] border border-slate-200/50 rounded-lg p-2.5 mt-0.5 select-none">
                    {[45, 60, 30, 80, 50, 75, 45, 90, 65, 35, 70, 55, 85, 30].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="w-1.5 bg-emerald-500/20 hover:bg-emerald-500 rounded-full transition-all duration-300 cursor-pointer"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-12 bg-[#fafbfd] border border-slate-200/50 rounded-lg p-2.5 mt-0.5 text-[10px] text-slate-400 font-medium italic select-none text-center">
                    Butuh minimal 5 pohon untuk melihat sebaran DBH
                  </div>
                )}
              </section>

            </div>

            {/* KOLOM KANAN (col-span-8): Visualisasi Spasial (Grid/GPS Map) dan Table */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
              
              {/* Card 4: Visualisasi Spasial (Grid Canvas dan Leaflet Map disatukan dalam tab) */}
              <div 
                onClick={() => setSelectedNode(null)}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-4 relative select-none"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest">
                      {spatialMode === "grid" ? "Peta Spasial Grid Hutan" : "Peta Sebaran GPS Satelit"}
                    </h3>
                    <p className="text-[11px] text-slate-450 mt-0.5">
                      {spatialMode === "grid" 
                        ? "Geser node 48x48px (2x2 sel) untuk memposisikan letak pohon sebenarnya" 
                        : "Menampilkan sebaran geografis koordinat GPS asli pohon di peta"}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Save layout button */}
                    {spatialMode === "grid" && isLayoutDirty && isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveLayout();
                        }}
                        disabled={actionLoading}
                        className="bg-[#191919] hover:bg-[#191919]/90 text-white font-bold text-[10px] rounded-lg px-2.5 py-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        {actionLoading ? "Menyimpan..." : "Simpan Tata Letak"}
                      </button>
                    )}

                    {/* Mode Toggle Tabs */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSpatialMode("grid"); }} 
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                          spatialMode === "grid" ? "bg-white text-[#191919] shadow-xs" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Grid Spasial
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSpatialMode("gps"); }} 
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                          spatialMode === "gps" ? "bg-white text-[#191919] shadow-xs" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Peta GPS
                      </button>
                    </div>
                  </div>
                </div>

                {/* Spatial display container - height matched to grid to avoid HMR shifts */}
                {spatialMode === "grid" ? (
                  <div className="w-full overflow-x-auto border border-slate-200/50 rounded-lg bg-slate-50/20 p-2">
                    <div 
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      style={{
                        height: `${DEFAULT_ROWS * CELL_SIZE}px`,
                        backgroundImage: "linear-gradient(to right, rgba(226, 232, 240, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(226, 232, 240, 0.45) 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                      className="relative bg-[#fafbfd] rounded-lg overflow-hidden w-full select-none"
                    >
                      {/* Render tree node items */}
                      {scans.map((scan) => {
                        const pos = gridPositions[scan.tree_code];
                        if (!pos) return null;
                        const specName = getSpeciesName(scan);
                        const specColor = getSpeciesColor(specName);
                        const isSelected = selectedNode?.tree_code === scan.tree_code;

                        return (
                          <div
                            key={scan.id}
                            style={{
                              position: "absolute",
                              left: `${pos.x * CELL_SIZE}px`,
                              top: `${pos.y * CELL_SIZE}px`,
                              width: "48px",
                              height: "64px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                            }}
                            title={scan.tree_code}
                          >
                            {/* The 48x48px Node Box */}
                            <div
                              draggable={isOwner}
                              onDragStart={(e) => handleDragStart(e, scan.tree_code)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNode(scan);
                              }}
                              className={`w-12 h-12 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-center hover:scale-105 hover:shadow-md ${
                                specColor.bg.split(' ')[0]
                              } ${specColor.border} ${
                                isSelected ? "ring-4 ring-emerald-500/35 border-emerald-600 shadow-md scale-105" : ""
                              }`}
                            >
                              <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m-5-8h10L12 5zM4 17h16L12 11z" />
                              </svg>
                            </div>
                            
                            {/* Small label below node */}
                            <span className="text-[8px] font-mono font-bold text-slate-505 bg-white/80 border border-slate-200/50 px-1 py-0.2 rounded shadow-xs mt-1 block w-fit mx-auto text-center pointer-events-none select-none shrink-0 truncate max-w-full">
                              #{scan.tree_code.replace("POHON-", "")}
                            </span>
                          </div>
                        );
                      })}

                      {/* Absolute Popover */}
                      {selectedNode && (() => {
                        const pos = gridPositions[selectedNode.tree_code];
                        if (!pos) return null;
                        const specName = getSpeciesName(selectedNode);
                        const specColor = getSpeciesColor(specName);
                        
                        const showOnLeft = pos.x > 15;
                        const popoverLeft = showOnLeft ? pos.x * CELL_SIZE - 200 : pos.x * CELL_SIZE + 52;
                        const popoverTop = Math.max(10, Math.min(pos.y * CELL_SIZE - 10, (DEFAULT_ROWS * CELL_SIZE) - 170));

                        return (
                          <div
                            style={{
                              position: "absolute",
                              left: `${popoverLeft}px`,
                              top: `${popoverTop}px`,
                              width: "190px",
                              zIndex: 50,
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xl flex flex-col gap-2.5 animate-fadeIn select-none pointer-events-auto"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                {selectedNode.tree_code}
                              </span>
                              <button
                                onClick={() => setSelectedNode(null)}
                                className="text-slate-400 hover:text-slate-700 text-xs font-bold font-sans"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="flex flex-col gap-1 text-[11px] text-slate-555">
                              {specName && (
                                <span className={`text-[8px] font-semibold border ${specColor.border} ${specColor.lightBg} ${specColor.text} px-2 py-0.5 rounded capitalize w-fit`}>
                                  <i>{specName}</i>
                                </span>
                              )}
                              <div className="flex justify-between border-b border-slate-100 pb-1 mt-1">
                                <span>DBH:</span>
                                <span className="font-bold text-slate-800">{selectedNode.dbh_cm.toFixed(1)} cm</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span>Tinggi:</span>
                                <span className="font-bold text-slate-800">{selectedNode.tinggi_m.toFixed(1)} m</span>
                              </div>
                              <div className="flex justify-between text-emerald-800 font-semibold mt-0.5">
                                <span>CO₂e:</span>
                                <span className="font-bold">{selectedNode.co2e_kg.toFixed(1)} kg</span>
                              </div>
                            </div>

                            <Link
                              href={`/reconstruct?code=${selectedNode.tree_code}&phase=result`}
                              className="bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-[10px] rounded py-1.5 text-center shadow-sm transition-all"
                            >
                              Buka detail →
                            </Link>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div style={{ height: `${DEFAULT_ROWS * CELL_SIZE}px` }} className="border border-slate-200 rounded-lg overflow-hidden relative">
                    <PlotMap
                      scans={scans}
                      centroidLat={plot?.gps_centroid_lat || null}
                      centroidLon={plot?.gps_centroid_lon || null}
                    />
                  </div>
                )}
                
                {spatialMode === "gps" && gpsScans.length < scans.length && (
                  <p className="text-[9px] text-slate-455 leading-normal italic mt-1 select-none">
                    * Menampilkan {gpsScans.length} dari {scans.length} pohon dengan metadata GPS EXIF.
                  </p>
                )}
              </div>

              {/* Card 5: Orders-style Tree Scans Table */}
              <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest select-none">Daftar Rekaman Pohon ({filteredScans.length})</h3>
                  </div>
                  
                  {/* Tab Filters */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 select-none">
                    <button 
                      onClick={() => setFilterTab("all")} 
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        filterTab === "all" ? "bg-white text-[#191919] shadow-xs" : "text-slate-500 hover:text-slate-755"
                      }`}
                    >
                      Semua
                    </button>
                    <button 
                      onClick={() => setFilterTab("large")} 
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        filterTab === "large" ? "bg-white text-[#191919] shadow-xs" : "text-slate-500 hover:text-slate-755"
                      }`}
                    >
                      DBH &gt; 10cm
                    </button>
                    <button 
                      onClick={() => setFilterTab("small")} 
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        filterTab === "small" ? "bg-white text-[#191919] shadow-xs" : "text-slate-505 hover:text-slate-755"
                      }`}
                    >
                      DBH &le; 10cm
                    </button>
                  </div>
                </div>

                {/* Table Layout */}
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-500">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">
                        <th className="py-2.5 px-3">Pohon</th>
                        <th className="py-2.5 px-3">Klasifikasi Spesies</th>
                        <th className="py-2.5 px-3">Metrik Fisik</th>
                        <th className="py-2.5 px-3 text-right">Biomassa</th>
                        <th className="py-2.5 px-3 text-right">CO₂e</th>
                        <th className="py-2.5 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScans.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center italic text-slate-400">
                            Belum ada rekaman pohon untuk kriteria ini.
                          </td>
                        </tr>
                      ) : (
                        filteredScans.map((scan) => {
                          const specName = getSpeciesName(scan);
                          const specCommon = getSpeciesCommonName(scan);
                          const specColor = getSpeciesColor(specName);

                          return (
                            <React.Fragment key={scan.id}>
                              {/* Row click to view details */}
                              <tr 
                                onClick={() => router.push(`/reconstruct?code=${scan.tree_code}&phase=result`)}
                                className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                              >
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2.5">
                                    {scan.thumbnail_url ? (
                                      <img
                                        src={scan.thumbnail_url}
                                        alt={scan.tree_code}
                                        className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-bold text-slate-800 block text-xs">{scan.tree_code}</span>
                                      <span className="text-[10px] text-slate-400 block font-mono">
                                        {new Date(scan.scan_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                
                                <td className="py-3 px-3">
                                  {specName ? (
                                    <div className="flex flex-col">
                                      <span className={`text-[10px] font-semibold ${specColor.text} capitalize`}>
                                        <i>{specName}</i>
                                      </span>
                                      {specCommon && <span className="text-[9px] text-slate-400">{specCommon}</span>}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">Tidak terklasifikasi</span>
                                  )}
                                </td>
                                
                                <td className="py-3 px-3">
                                  <div className="flex flex-col gap-0.5">
                                    <span>DBH: <span className="font-semibold text-slate-700">{scan.dbh_cm.toFixed(1)} cm</span></span>
                                    <span>Tinggi: <span className="font-semibold text-slate-700">{scan.tinggi_m.toFixed(1)} m</span></span>
                                  </div>
                                </td>
                                
                                <td className="py-3 px-3 text-right font-medium text-slate-600">
                                  {scan.biomassa_kg.toFixed(1)} kg
                                </td>
                                
                                <td className="py-3 px-3 text-right font-bold text-slate-800">
                                  {scan.co2e_kg.toFixed(1)} kg
                                </td>
                                
                                <td className="py-3 px-3 text-right">
                                  <span className="text-slate-455 hover:text-emerald-700 font-semibold transition-colors flex items-center justify-end gap-1 select-none">
                                    Lihat 3D <span className="text-xs">&rarr;</span>
                                  </span>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>

      {/* Modal Tambah Pohon */}
      {isAddTreeModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsAddTreeModalOpen(false)}
          />
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xl relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col gap-5 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-lg text-[#191919] font-normal">Tambah Pohon ke Plot</h3>
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
              <div 
                className="border border-slate-200 rounded-lg p-4 hover:border-[#191919]/60 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col gap-1.5" 
                onClick={handleStartNewScan}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base leading-none">+</span>
                  <span className="font-semibold text-xs text-[#191919]">Mulai Scan Baru</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed ml-8">
                  Rekam video/foto pohon baru dengan kamera Anda secara langsung. Sesi plot akan diaktifkan secara otomatis.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  </span>
                  <span className="font-semibold text-xs text-[#191919]">Hubungkan Scan Lama</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed ml-8">
                  Pilih hasil rekaman pohon sebelumnya yang belum terasosiasikan dengan plot mana pun.
                </p>
                
                <div className="ml-8 border-t border-slate-100 pt-3 flex flex-col gap-2.5">
                  <input
                    type="text"
                    placeholder="Cari kode pohon (misal: POHON-1234)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-[#191919] rounded-lg px-3 py-1.5 text-xs text-[#191919] placeholder-slate-455 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-full"
                  />

                  {claimError && (
                    <p className="text-[10px] text-red-650 bg-red-50 border border-red-100 px-3 py-1.5 rounded font-medium">{claimError}</p>
                  )}

                  <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {unclaimedLoading ? (
                      <div className="text-center py-3 text-slate-400 text-[10px] font-semibold flex items-center justify-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        Memuat data scan...
                      </div>
                    ) : unclaimedScans.length === 0 ? (
                      <div className="text-center py-3 text-slate-400 text-[10px] italic">
                        Tidak ada scan unclaimed yang tersedia.
                      </div>
                    ) : (
                      unclaimedScans
                        .filter(s => s.tree_code.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((scan) => (
                          <div 
                            key={scan.id} 
                            onClick={() => handleClaimOldScan(scan)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100/70 hover:border-slate-200 transition-all cursor-pointer"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">{scan.tree_code}</span>
                              <span className="text-[10px] text-slate-500">DBH: {scan.dbh_cm.toFixed(1)} cm</span>
                            </div>
                            <button 
                              disabled={claimLoading !== null}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-[#191919] font-bold text-[9px] rounded transition-colors cursor-pointer"
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
