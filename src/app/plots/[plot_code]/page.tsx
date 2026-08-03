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
    <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center min-h-[250px]">
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

  // Leaflet map visibility state
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Fine-grid dimensions: 24 columns x 20 rows of 24px each (576px wide, 480px high)
  const GRID_COLS = 24;
  const GRID_ROWS = 20;
  const CELL_SIZE = 24;

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

  // Visual Spatial Grid Auto-layout logic for 24x20 grid
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
        // Ensure within bounds
        const xVal = Math.max(0, Math.min(s.grid_position_x, GRID_COLS - 1));
        const yVal = Math.max(0, Math.min(s.grid_position_y, GRID_ROWS - 1));
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
      return Object.values(newPositions).some((pos) => pos.x === x && pos.y === y);
    };

    const findAvailableCell = () => {
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
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

        let targetX = minLon === maxLon ? Math.floor(GRID_COLS / 2) : Math.round(((lon - minLon) / (maxLon - minLon)) * (GRID_COLS - 1));
        let targetY = minLat === maxLat ? Math.floor(GRID_ROWS / 2) : (GRID_ROWS - 1) - Math.round(((lat - minLat) / (maxLat - minLat)) * (GRID_ROWS - 1));

        // If target cell is already occupied, resolve with spiral search
        if (isOccupied(targetX, targetY)) {
          let resolved = false;
          const maxRadius = Math.max(GRID_COLS, GRID_ROWS);
          for (let r = 1; r < maxRadius && !resolved; r++) {
            for (let dy = -r; dy <= r && !resolved; dy++) {
              for (let dx = -r; dx <= r && !resolved; dx++) {
                const nx = targetX + dx;
                const ny = targetY + dy;
                if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS && !isOccupied(nx, ny)) {
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

    // Calculate coordinate position inside container
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    // Snap offset position to the nearest 24px grid coordinate index
    const targetX = Math.max(0, Math.min(Math.round((offsetX - 12) / CELL_SIZE), GRID_COLS - 1));
    const targetY = Math.max(0, Math.min(Math.round((offsetY - 12) / CELL_SIZE), GRID_ROWS - 1));

    // Find if another node occupies target coordinate slot
    const occupyingTreeCode = Object.keys(gridPositions).find(
      (code) => gridPositions[code].x === targetX && gridPositions[code].y === targetY
    );

    setGridPositions((prev) => {
      const updated = { ...prev };
      
      if (occupyingTreeCode) {
        // Swap slots
        const sourcePos = prev[draggedTreeCode];
        updated[occupyingTreeCode] = sourcePos;
      }
      
      updated[draggedTreeCode] = { x: targetX, y: targetY };
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
      <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center px-6 font-sans">
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
      .map(s => getSpeciesName(s))
      .filter((s): s is string => s !== null && s !== undefined)
  );
  const totalSpecies = uniqueSpecies.size;
  const totalCo2e = aggregation?.total_co2e_kg || 0;

  // Species-based colors
  const speciesList = Array.from(uniqueSpecies);
  const colorPalettes = [
    { bg: "bg-emerald-550 hover:bg-emerald-500", text: "text-emerald-600", border: "border-emerald-200", lightBg: "bg-emerald-50/40" },
    { bg: "bg-sky-550 hover:bg-sky-500", text: "text-sky-600", border: "border-sky-200", lightBg: "bg-sky-50/40" },
    { bg: "bg-amber-550 hover:bg-amber-500", text: "text-amber-600", border: "border-amber-200", lightBg: "bg-amber-50/40" },
    { bg: "bg-purple-550 hover:bg-purple-500", text: "text-purple-600", border: "border-purple-200", lightBg: "bg-purple-50/40" },
    { bg: "bg-rose-550 hover:bg-rose-500", text: "text-rose-600", border: "border-rose-200", lightBg: "bg-rose-50/40" },
    { bg: "bg-indigo-550 hover:bg-indigo-500", text: "text-indigo-600", border: "border-indigo-200", lightBg: "bg-indigo-50/40" },
  ];

  const getSpeciesColor = (speciesName: string | null) => {
    if (!speciesName) return { bg: "bg-slate-400 hover:bg-slate-350", text: "text-slate-500", border: "border-slate-200", lightBg: "bg-slate-50/40" };
    const index = speciesList.indexOf(speciesName.trim().toLowerCase());
    if (index === -1) return { bg: "bg-slate-400 hover:bg-slate-350", text: "text-slate-500", border: "border-slate-200", lightBg: "bg-slate-50/40" };
    return colorPalettes[index % colorPalettes.length];
  };

  const gpsScans = scans.filter((s) => s.gps_lat !== null && s.gps_lon !== null);

  return (
    <div className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col font-sans">
      <main className="flex-1 pt-28 pb-16 px-6 relative overflow-hidden">
        {/* Background radial overlays */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-emerald-500/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-slate-200/50 blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
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
          </section>

          {/* Column Layout Dashboard */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Kolom Kiri: Dominan Kanvas Grid Spasial */}
            <div className="flex-1 w-full lg:max-w-[68%] flex flex-col gap-6">
              
              {/* Kanvas Grid Spasial Card */}
              <div 
                onClick={() => setSelectedNode(null)}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4 relative select-none"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest">Peta Spasial Grid Hutan</h3>
                    <p className="text-xs text-slate-450 mt-0.5">Geser node untuk memposisikan pohon (snap-to-grid 24px)</p>
                  </div>
                  {isLayoutDirty && isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveLayout();
                      }}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-sm cursor-pointer transition-all"
                    >
                      {actionLoading ? "Menyimpan..." : "Simpan Tata Letak"}
                    </button>
                  )}
                </div>

                {/* Grid Canvas Wrapper with responsive overflow */}
                <div className="w-full overflow-x-auto border border-slate-100 rounded-2xl bg-slate-50/20 p-4">
                  <div 
                    style={{
                      width: "576px",
                      height: "480px",
                      backgroundImage: "linear-gradient(to right, rgba(226, 232, 240, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(226, 232, 240, 0.45) 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="relative bg-[#fafbfd] border border-slate-200/50 rounded-xl overflow-hidden shrink-0"
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
                            width: `${CELL_SIZE}px`,
                            height: `${CELL_SIZE}px`,
                          }}
                          className="flex items-center justify-center group"
                        >
                          <div
                            draggable={isOwner}
                            onDragStart={(e) => handleDragStart(e, scan.tree_code)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNode(scan);
                            }}
                            className={`w-[18px] h-[18px] rounded-full border cursor-pointer transition-all ${specColor.bg.split(' ')[0]} ${specColor.border} flex items-center justify-center relative hover:scale-125 hover:shadow-md ${
                              isSelected ? "ring-4 ring-emerald-500/35 scale-125 border-emerald-600 shadow" : ""
                            }`}
                          >
                            <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-mono px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-40 select-none">
                              {scan.tree_code}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Absolute Popover (Appears next to selected node) */}
                    {selectedNode && (() => {
                      const pos = gridPositions[selectedNode.tree_code];
                      if (!pos) return null;
                      const specName = getSpeciesName(selectedNode);
                      const specCommon = getSpeciesCommonName(selectedNode);
                      const specColor = getSpeciesColor(specName);
                      
                      // Dynamically position left/right based on grid column to prevent cutoffs
                      const showOnLeft = pos.x > 15;
                      const popoverLeft = showOnLeft ? pos.x * CELL_SIZE - 200 : pos.x * CELL_SIZE + 28;
                      // Clamp top coordinate to remain visible in grid window bounds
                      const popoverTop = Math.max(10, Math.min(pos.y * CELL_SIZE - 30, 480 - 170));

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
                          className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xl flex flex-col gap-2.5 animate-fadeIn select-none pointer-events-auto"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-655 px-2 py-0.5 rounded-lg font-bold">
                              {selectedNode.tree_code}
                            </span>
                            <button
                              onClick={() => setSelectedNode(null)}
                              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                            {specName && (
                              <span className={`text-[8px] font-semibold border ${specColor.border} ${specColor.lightBg} ${specColor.text} px-2 py-0.5 rounded-full capitalize w-fit`}>
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
                            className="bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-[10px] rounded-lg py-1.5 text-center shadow-sm transition-all"
                          >
                            Buka detail →
                          </Link>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Stats, Actions, Carbon Bar, Collapsible Map */}
            <div className="w-full lg:w-[32%] flex flex-col gap-6">
              
              {/* Large Editorial Hero Stat */}
              <section className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Total Biomassa Karbon Plot</span>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <h2 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-[#191919] leading-none">
                      {totalCo2e.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </h2>
                    <span className="text-sm font-sans text-slate-400 font-medium">kg CO₂e</span>
                  </div>
                  {aggregation && aggregation.total_co2e_kg > 0 && (
                    <div className="mt-2.5">
                      <span className="text-[9px] font-semibold text-slate-500 bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-xl">
                        &plusmn; {aggregation.combined_uncertainty_kg.toFixed(1)} kg ({aggregation.combined_uncertainty_pct.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-4 flex flex-col gap-2.5 text-xs text-slate-500 font-medium border-t border-slate-100 pt-4">
                    <div className="flex justify-between">
                      <span>Jumlah Pohon:</span>
                      <span className="text-slate-700 font-bold">{scans.length} pohon</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spesies Terdeteksi:</span>
                      <span className="text-slate-700 font-bold">{totalSpecies} spesies</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rata-rata DBH:</span>
                      <span className="text-slate-700 font-bold">{avgDbh.toFixed(1)} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rata-rata Tinggi:</span>
                      <span className="text-slate-700 font-bold">{avgTinggi.toFixed(1)} m</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Carbon Contribution Stacked Bar */}
              {scans.length > 0 && (
                <section className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Komposisi Karbon</span>
                    <span className="text-[9px] text-slate-400 italic">Hover segmen</span>
                  </div>
                  
                  <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100 border border-slate-250/20 shadow-inner select-none">
                    {scans.map((scan) => {
                      const specName = getSpeciesName(scan);
                      const color = getSpeciesColor(specName);
                      const pct = totalCo2e > 0 ? (scan.co2e_kg / totalCo2e) * 100 : 0;
                      if (pct < 0.5) return null;
                      return (
                        <div
                          key={scan.id}
                          className={`${color.bg} transition-all duration-300 relative group cursor-pointer border-r border-white/20 last:border-r-0`}
                          style={{ width: `${pct}%` }}
                        >
                          {/* Custom Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 min-w-[160px] bg-[#0d0f12] text-white rounded-xl p-2.5 shadow-xl text-[10px] leading-normal pointer-events-none">
                            <div className="font-bold border-b border-white/10 pb-0.5 mb-1">{scan.tree_code}</div>
                            <div className="italic text-slate-300 truncate">{specName || "Spesies..."}</div>
                            <div className="flex justify-between mt-1 text-slate-455">
                              <span>CO₂e:</span>
                              <span className="font-bold text-emerald-400">{scan.co2e_kg.toFixed(1)} kg</span>
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0d0f12]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {speciesList.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      {speciesList.slice(0, 4).map((spec, idx) => {
                        const color = getSpeciesColor(spec);
                        return (
                          <div key={idx} className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold capitalize">
                            <span className={`w-2 h-2 rounded-full ${color.bg.split(' ')[0]}`} />
                            <span className="italic truncate max-w-[80px]">{spec}</span>
                          </div>
                        );
                      })}
                      {speciesList.length > 4 && (
                        <span className="text-[9px] text-slate-400 font-semibold">+{speciesList.length - 4} spesies lagi</span>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Collapsible Leaflet Map Section */}
              <section className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Peta GPS Asli</h2>
                  <button
                    onClick={() => setIsMapExpanded(prev => !prev)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer border border-emerald-250/70 rounded-lg px-2.5 py-1 hover:bg-emerald-50 transition-all select-none"
                  >
                    {isMapExpanded ? "Sembunyikan" : "Lihat Peta"}
                  </button>
                </div>
                
                <div className={`transition-all duration-300 ease-in-out overflow-hidden relative ${
                  isMapExpanded ? "h-[260px] border border-slate-200 rounded-2xl" : "h-0 border-0"
                }`}>
                  {isMapExpanded && (
                    <PlotMap
                      scans={scans}
                      centroidLat={plot?.gps_centroid_lat || null}
                      centroidLon={plot?.gps_centroid_lon || null}
                    />
                  )}
                </div>
                
                {isMapExpanded && gpsScans.length < scans.length && (
                  <p className="text-[9px] text-slate-450 leading-normal italic mt-1">
                    * Menampilkan {gpsScans.length} dari {scans.length} pohon.
                  </p>
                )}
              </section>

              {/* Action Controls for Owner */}
              {isOwner && (
                <section className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-3">
                  <h3 className="font-bold text-xs text-slate-550 uppercase tracking-widest mb-1">Aksi Plot</h3>
                  
                  <button
                    onClick={toggleSession}
                    disabled={actionLoading}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      plot?.session_active
                        ? "border-emerald-650 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-slate-200 hover:border-slate-300 text-slate-655 hover:bg-slate-50"
                    }`}
                  >
                    {actionLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                    ) : plot?.session_active ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-555 inline-block animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-350 inline-block" />
                    )}
                    Sesi Capture: {plot?.session_active ? "Aktif" : "Nonaktif"}
                  </button>

                  <button
                    onClick={() => setIsAddTreeModalOpen(true)}
                    className="w-full py-2.5 bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span className="text-sm font-bold leading-none">+</span> Tambah Pohon Baru
                  </button>
                </section>
              )}
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
                    <p className="text-[10px] text-red-655 bg-red-50 border border-red-100 px-3 py-2 rounded-lg font-medium">{claimError}</p>
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
