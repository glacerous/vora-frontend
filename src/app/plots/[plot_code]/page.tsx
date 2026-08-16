"use client";

import React, { useState, useEffect, useRef } from "react";
import Loader from "@/components/Loader";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth, useSettings } from "@/components/AuthProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

// Dynamic load of Leaflet map (client-only)
const PlotMap = dynamic(() => import("@/components/PlotMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#fafaf9] border border-[#e7e5e4] rounded-xl flex items-center justify-center min-h-[250px]">
      <Loader size={110} className="mr-2" />
      <p className="text-xs text-[#79716b] font-medium">Loading satellite map...</p>
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
  area_x1: number | null;
  area_y1: number | null;
  area_x2: number | null;
  area_y2: number | null;
  areas?: Array<{
    id?: number;
    name?: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>;
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
  const { language, t } = useSettings();
  const [plot, setPlot] = useState<Plot | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [aggregation, setAggregation] = useState<Aggregation | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // State for custom delete confirmation modal
  const [treeToRemove, setTreeToRemove] = useState<string | null>(null);

  // {language === "id" ? "Edit Plot" : "Edit Plot"} metadata modal states
  const [isEditPlotModalOpen, setIsEditPlotModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<"public" | "private">("private");

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
  const gridRef = useRef<HTMLDivElement>(null);

  // Custom container width measurement, panning offset states, and ResizeObserver
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(960);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // States for Area Bounding Box Drawing Mode
  interface PlotArea {
    id?: number;
    name?: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [plotAreas, setPlotAreas] = useState<PlotArea[]>([]);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null);
  const [editingAreaIndex, setEditingAreaIndex] = useState<number | null>(null);

  // Sync plotAreas when plot fetches
  useEffect(() => {
    if (plot) {
      if (plot.areas && Array.isArray(plot.areas) && plot.areas.length > 0) {
        setPlotAreas(plot.areas);
      } else if (plot.area_x1 !== null && plot.area_y1 !== null && plot.area_x2 !== null && plot.area_y2 !== null) {
        setPlotAreas([{
          name: "Area Utama",
          x1: plot.area_x1,
          y1: plot.area_y1,
          x2: plot.area_x2,
          y2: plot.area_y2,
        }]);
      } else {
        setPlotAreas([]);
      }
      setSelectedAreaIndex(null);
      setEditingAreaIndex(null);
    }
  }, [plot]);

  // Spatial display mode (grid canvas or Leaflet gps map)
  const [spatialMode, setSpatialMode] = useState<"grid" | "gps">("grid");

  // Fine-grid dimensions configurations (24px cells)
  const CELL_SIZE = 24;
  const DEFAULT_ROWS = 40; // perfectly aligns with height 960px
  const cols = Math.floor(containerWidth / CELL_SIZE);

  // Zoom logic
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25];

  const zoomIn = () => {
    setZoomLevel((prev) => {
      const idx = ZOOM_LEVELS.indexOf(prev);
      if (idx !== -1 && idx < ZOOM_LEVELS.length - 1) {
        return ZOOM_LEVELS[idx + 1];
      }
      return prev;
    });
  };

  const zoomOut = () => {
    setZoomLevel((prev) => {
      const idx = ZOOM_LEVELS.indexOf(prev);
      if (idx !== -1 && idx > 0) {
        return ZOOM_LEVELS[idx - 1];
      }
      return prev;
    });
  };

  const logicalWidth = containerWidth / Math.min(1, zoomLevel);

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

  // Sync edit plot form values
  useEffect(() => {
    if (plot) {
      setEditName(plot.name);
      setEditDescription(plot.description || "");
      setEditPrivacy(plot.privacy);
    }
  }, [plot]);

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
          throw new Error("Failed to fetch plot details.");
        }
      }

      const data = await plotRes.json();
      setPlot(data.plot);
      setScans(data.scans || []);
      setAggregation(data.aggregation);
    } catch (err: any) {
      setError(err.message || "A connection error occurred");
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
        const xVal = Math.max(0, Math.min(s.grid_position_x, cols - 2));
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
        for (let x = 0; x < cols - 1; x += 2) {
          if (!isOccupied(x, y)) {
            return { x, y };
          }
        }
      }
      // fall back to sequential cells if stepped grid is full
      for (let y = 0; y < DEFAULT_ROWS - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
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

        let targetX = minLon === maxLon ? Math.floor(cols / 2) : Math.round(((lon - minLon) / (maxLon - minLon)) * (cols - 2));
        let targetY = minLat === maxLat ? Math.floor(DEFAULT_ROWS / 2) : (DEFAULT_ROWS - 2) - Math.round(((lat - minLat) / (maxLat - minLat)) * (DEFAULT_ROWS - 2));

        // Ensure indices are even numbers to align nicely with 2x2 grid stepping
        targetX = Math.round(targetX / 2) * 2;
        targetY = Math.round(targetY / 2) * 2;

        if (isOccupied(targetX, targetY)) {
          let resolved = false;
          const maxRadius = Math.max(cols, DEFAULT_ROWS);
          for (let r = 2; r < maxRadius && !resolved; r += 2) {
            for (let dy = -r; dy <= r && !resolved; dy += 2) {
              for (let dx = -r; dx <= r && !resolved; dx += 2) {
                const nx = targetX + dx;
                const ny = targetY + dy;
                if (nx >= 0 && nx < cols - 1 && ny >= 0 && ny < DEFAULT_ROWS - 1 && !isOccupied(nx, ny)) {
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
  }, [scans, cols]);

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

    const offsetX = (clientX - rect.left) / zoomLevel;
    const offsetY = (clientY - rect.top) / zoomLevel;

    // Center of 48px node is 24px, so subtract 24px to match drag pointer coordinate index
    const targetX = Math.round((offsetX - 24) / CELL_SIZE);
    const targetY = Math.round((offsetY - 24) / CELL_SIZE);

    const cols = Math.floor((rect.width / zoomLevel) / CELL_SIZE);
    const rows = Math.floor((rect.height / zoomLevel) / CELL_SIZE);

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

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isDrawingMode) return;

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startPanX = panOffset.x;
    const startPanY = panOffset.y;

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;
      setPanOffset({ x: startPanX + dx, y: startPanY + dy });
    };

    const handleWindowMouseUp = () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
  };

  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !isOwner) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(Math.floor(((e.clientX - rect.left) / zoomLevel) / CELL_SIZE), cols));
    const y = Math.max(0, Math.min(Math.floor(((e.clientY - rect.top) / zoomLevel) / CELL_SIZE), DEFAULT_ROWS));
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
    setIsDragging(true);
  };

  const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !drawStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(Math.floor(((e.clientX - rect.left) / zoomLevel) / CELL_SIZE), cols));
    const y = Math.max(0, Math.min(Math.floor(((e.clientY - rect.top) / zoomLevel) / CELL_SIZE), DEFAULT_ROWS));
    setDrawCurrent({ x, y });
  };

  const handleGridMouseUp = () => {
    if (!isDragging || !drawStart || !drawCurrent) return;
    setIsDragging(false);
    
    if (drawStart.x !== drawCurrent.x && drawStart.y !== drawCurrent.y) {
      const newX1 = Math.min(drawStart.x, drawCurrent.x);
      const newY1 = Math.min(drawStart.y, drawCurrent.y);
      const newX2 = Math.max(drawStart.x, drawCurrent.x);
      const newY2 = Math.max(drawStart.y, drawCurrent.y);

      const newArea = {
        name: `Area ${plotAreas.length + 1}`,
        x1: newX1,
        y1: newY1,
        x2: newX2,
        y2: newY2
      };

      setPlotAreas(prev => [...prev, newArea]);
      setSelectedAreaIndex(plotAreas.length);
      setIsLayoutDirty(true);
    }
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const handleAreaMouseDown = (
    e: React.MouseEvent,
    index: number,
    actionType: "move" | "resize",
    handle?: "tl" | "tr" | "bl" | "br"
  ) => {
    e.stopPropagation();
    if (!isOwner) return;

    const areaEl = document.getElementById(`area-box-${index}`) as HTMLDivElement;
    if (!areaEl) return;

    const area = plotAreas[index];
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = area.x1 * CELL_SIZE;
    const startTop = area.y1 * CELL_SIZE;
    const startWidth = (area.x2 - area.x1) * CELL_SIZE;
    const startHeight = (area.y2 - area.y1) * CELL_SIZE;

    let hasMoved = false;

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      hasMoved = true;
      const dx = (moveEvent.clientX - startX) / zoomLevel;
      const dy = (moveEvent.clientY - startY) / zoomLevel;

      if (actionType === "move") {
        const maxLeft = (cols * CELL_SIZE) - startWidth;
        const maxTop = (DEFAULT_ROWS * CELL_SIZE) - startHeight;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        const transformX = newLeft - startLeft;
        const transformY = newTop - startTop;
        areaEl.style.transform = `translate3d(${transformX}px, ${transformY}px, 0)`;
      } else if (actionType === "resize" && handle) {
        let newLeft = startLeft;
        let newTop = startTop;
        let newWidth = startWidth;
        let newHeight = startHeight;

        if (handle === "tl") {
          newLeft = Math.max(0, Math.min(startLeft + dx, startLeft + startWidth - CELL_SIZE));
          newTop = Math.max(0, Math.min(startTop + dy, startTop + startHeight - CELL_SIZE));
          newWidth = startWidth - (newLeft - startLeft);
          newHeight = startHeight - (newTop - startTop);
        } else if (handle === "tr") {
          newTop = Math.max(0, Math.min(startTop + dy, startTop + startHeight - CELL_SIZE));
          newWidth = Math.max(CELL_SIZE, Math.min((cols * CELL_SIZE) - startLeft, startWidth + dx));
          newHeight = startHeight - (newTop - startTop);
        } else if (handle === "bl") {
          newLeft = Math.max(0, Math.min(startLeft + dx, startLeft + startWidth - CELL_SIZE));
          newWidth = startWidth - (newLeft - startLeft);
          newHeight = Math.max(CELL_SIZE, Math.min((DEFAULT_ROWS * CELL_SIZE) - startTop, startHeight + dy));
        } else if (handle === "br") {
          newWidth = Math.max(CELL_SIZE, Math.min((cols * CELL_SIZE) - startLeft, startWidth + dx));
          newHeight = Math.max(CELL_SIZE, Math.min((DEFAULT_ROWS * CELL_SIZE) - startTop, startHeight + dy));
        }

        areaEl.style.left = `${newLeft}px`;
        areaEl.style.top = `${newTop}px`;
        areaEl.style.width = `${newWidth}px`;
        areaEl.style.height = `${newHeight}px`;
      }
    };

    const handleWindowMouseUp = () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);

      if (!hasMoved) return;

      let finalLeft = startLeft;
      let finalTop = startTop;
      let finalWidth = startWidth;
      let finalHeight = startHeight;

      if (actionType === "move") {
        const style = window.getComputedStyle(areaEl);
        const matrix = new DOMMatrix(style.transform);
        finalLeft = startLeft + matrix.m41;
        finalTop = startTop + matrix.m42;
        areaEl.style.transform = "";
      } else if (actionType === "resize") {
        finalLeft = parseInt(areaEl.style.left) || startLeft;
        finalTop = parseInt(areaEl.style.top) || startTop;
        finalWidth = parseInt(areaEl.style.width) || startWidth;
        finalHeight = parseInt(areaEl.style.height) || startHeight;
      }

      const newX1 = Math.max(0, Math.min(Math.round(finalLeft / CELL_SIZE), cols - 1));
      const newY1 = Math.max(0, Math.min(Math.round(finalTop / CELL_SIZE), DEFAULT_ROWS - 1));
      const newX2 = Math.max(newX1 + 1, Math.min(Math.round((finalLeft + finalWidth) / CELL_SIZE), cols));
      const newY2 = Math.max(newY1 + 1, Math.min(Math.round((finalTop + finalHeight) / CELL_SIZE), DEFAULT_ROWS));

      areaEl.style.left = `${newX1 * CELL_SIZE}px`;
      areaEl.style.top = `${newY1 * CELL_SIZE}px`;
      areaEl.style.width = `${(newX2 - newX1) * CELL_SIZE}px`;
      areaEl.style.height = `${(newY2 - newY1) * CELL_SIZE}px`;

      setPlotAreas(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          x1: newX1,
          y1: newY1,
          x2: newX2,
          y2: newY2
        };
        return next;
      });

      setIsLayoutDirty(true);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
  };

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

  useEffect(() => {
    if (!plot || !isOwner || !isLayoutDirty) return;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
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
          body: JSON.stringify({
            layout: layoutData,
            area_x1: plotAreas.length > 0 ? plotAreas[0].x1 : null,
            area_y1: plotAreas.length > 0 ? plotAreas[0].y1 : null,
            area_x2: plotAreas.length > 0 ? plotAreas[0].x2 : null,
            area_y2: plotAreas.length > 0 ? plotAreas[0].y2 : null,
            areas: plotAreas.map((a, idx) => ({
              id: a.id,
              name: a.name || `Area ${idx + 1}`,
              x1: a.x1,
              y1: a.y1,
              x2: a.x2,
              y2: a.y2
            }))
          }),
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to save new layout.");
        }

        setIsLayoutDirty(false);
        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus((current) => current === "saved" ? "idle" : current);
        }, 2000);
      } catch (err: any) {
        console.error("Auto-save error:", err);
        setSaveStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [gridPositions, plotAreas, plot, isOwner, isLayoutDirty]);

  const handleRemoveTree = async (treeCode: string) => {
    if (!plot) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/plots/${plot.id}/remove-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tree_code: treeCode }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to remove tree from plot.");
      }

      // If success, remove from gridPositions and scans locally
      setGridPositions((prev) => {
        const next = { ...prev };
        delete next[treeCode];
        return next;
      });

      setScans((prev) => prev.filter((s) => s.tree_code !== treeCode));
      setSelectedNode(null);
      
      // Mark layout as dirty so it auto-saves the updated gridPositions (excluding the removed node)
      setIsLayoutDirty(true);
    } catch (err: any) {
      alert(err.message || "Failed to remove tree.");
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
      console.error("Failed to fetch old scan data:", err);
    } finally {
      setUnclaimedLoading(false);
    }
  };

  useEffect(() => {
    if (isAddTreeModalOpen) {
      fetchUnclaimedScans();
    }
  }, [isAddTreeModalOpen]);

  const handleEditPlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plot) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/plots/${plot.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
          privacy: editPrivacy,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update plot details.");
      }

      setPlot((prev) => prev ? { ...prev, name: editName, description: editDescription, privacy: editPrivacy } : null);
      setIsEditPlotModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to update plot details.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartNewScan = () => {
    router.push("/reconstruct");
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
        throw new Error(data.detail || "Failed to link scan to plot");
      }

      await fetchPlotDetails();
      setIsAddTreeModalOpen(false);
      setSearchQuery("");
    } catch (err: any) {
      setClaimError(err.message || "Failed to link scan");
    } finally {
      setClaimLoading(null);
    }
  };

  const handleExportData = (format: "csv" | "xlsx") => {
    if (!plot) return;
    window.open(`${BACKEND_URL}/plots/${plot.plot_code}/export?format=${format}`, "_blank");
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
      <main className="min-h-screen bg-[#fafaf9]/60 text-[#292524] flex flex-col items-center justify-center font-sans">
        <Loader size={110} className="mb-4" />
        <p className="text-sm text-[#79716b] font-medium">Mengambil informasi detail plot...</p>
      </main>
    );
  }

  if (error && !plot) {
    return (
      <main className="min-h-screen bg-[#fafaf9]/60 text-[#292524] flex flex-col items-center justify-center px-4 font-sans">
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 max-w-md text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-150 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-650" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-[#292524] mb-1.5">Akses Terbatas</h2>
          <p className="text-xs text-[#79716b] leading-relaxed mb-5">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/my-plots" className="bg-[#292524] hover:bg-[#292524]/90 text-white font-semibold text-xs rounded-lg px-4 py-2 transition-all shadow-sm">
              Dashboard
            </Link>
            <Link href="/login" className="border border-[#e7e5e4] hover:bg-[#fafaf9] text-[#79716b] text-xs rounded-lg px-4 py-2 transition-all">
              Login
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
  
  // Carbon density calculation
  const SCALE_M = 2; // 2 meters per cell
  let treesOutsideCount = 0;
  let hasBounds = plotAreas.length > 0;

  const isTreeInsideArea = (treeX: number, treeY: number, area: PlotArea) => {
    const xMin = Math.min(area.x1, area.x2);
    const xMax = Math.max(area.x1, area.x2);
    const yMin = Math.min(area.y1, area.y2);
    const yMax = Math.max(area.y1, area.y2);
    return treeX >= xMin && treeX <= xMax && treeY >= yMin && treeY <= yMax;
  };

  // Count trees outside ALL plot areas
  if (hasBounds) {
    scans.forEach((scan) => {
      const pos = gridPositions[scan.tree_code];
      if (pos) {
        const insideAny = plotAreas.some(area => isTreeInsideArea(pos.x, pos.y, area));
        if (!insideAny) {
          treesOutsideCount++;
        }
      } else {
        treesOutsideCount++;
      }
    });
  }

  // Calculate density and ha per area
  const areaStats = plotAreas.map((area, idx) => {
    const widthCells = Math.abs(area.x2 - area.x1);
    const heightCells = Math.abs(area.y2 - area.y1);
    const m2 = widthCells * heightCells * (SCALE_M * SCALE_M);
    const ha = m2 / 10000;
    
    let insideCo2e = 0;
    scans.forEach((scan) => {
      const pos = gridPositions[scan.tree_code];
      if (pos && isTreeInsideArea(pos.x, pos.y, area)) {
        insideCo2e += scan.co2e_kg;
      }
    });
    
    const density = ha > 0 ? (insideCo2e / 1000) / ha : 0;
    return {
      name: area.name || `Area ${idx + 1}`,
      ha,
      co2eKg: insideCo2e,
      density
    };
  });

  // Species-based colors
  const speciesList = Array.from(uniqueSpecies);

  // Calculate Shannon-Wiener Biodiversity Index (H')
  // Formula: H' = -sum(pi * ln(pi))
  let shannonIndex = 0.0;
  if (scans.length > 0) {
    const speciesCounts: Record<string, number> = {};
    let unidentifiedCount = 0;
    scans.forEach(s => {
      const name = getSpeciesName(s);
      if (name) {
        const cleanName = name.trim().toLowerCase();
        speciesCounts[cleanName] = (speciesCounts[cleanName] || 0) + 1;
      } else {
        unidentifiedCount++;
      }
    });
    
    let sum = 0.0;
    Object.values(speciesCounts).forEach(count => {
      const p_i = count / scans.length;
      sum += p_i * Math.log(p_i);
    });
    if (unidentifiedCount > 0) {
      const p_u = unidentifiedCount / scans.length;
      sum += p_u * Math.log(p_u);
    }
    shannonIndex = -sum;
  }

  let diversityLevel = "Low Diversity";
  let diversityDesc = "This plot has low species diversity, meaning it is dominated by one or a few species.";
  if (shannonIndex >= 1.5 && shannonIndex <= 3.0) {
    diversityLevel = "Medium Diversity";
    diversityDesc = "This plot has moderate species diversity, indicating a healthy mix of species.";
  } else if (shannonIndex > 3.0) {
    diversityLevel = "High Diversity";
    diversityDesc = "This plot has high species diversity, reflecting a highly resilient ecological structure.";
  }
  const colorPalettes = [
    { bg: "bg-[#616c39] hover:bg-[#4e572c]", text: "text-[#616c39]", border: "border-[#616c39]/30", lightBg: "bg-[#616c39]/10" },
    { bg: "bg-sky-600 hover:bg-sky-500", text: "text-sky-700", border: "border-sky-250", lightBg: "bg-sky-50/50" },
    { bg: "bg-amber-600 hover:bg-amber-500", text: "text-amber-700", border: "border-amber-250", lightBg: "bg-amber-50/50" },
    { bg: "bg-purple-600 hover:bg-purple-500", text: "text-purple-700", border: "border-purple-250", lightBg: "bg-purple-50/50" },
    { bg: "bg-rose-600 hover:bg-rose-500", text: "text-rose-700", border: "border-rose-250", lightBg: "bg-rose-50/50" },
    { bg: "bg-indigo-600 hover:bg-indigo-500", text: "text-indigo-700", border: "border-indigo-250", lightBg: "bg-indigo-50/50" },
  ];

  const getSpeciesColor = (speciesName: string | null) => {
    if (!speciesName) return { bg: "bg-[#fafaf9]0 hover:bg-[#a8a29e]", text: "text-[#292524]", border: "border-[#a8a29e]", lightBg: "bg-[#fafaf9]/50" };
    const index = speciesList.indexOf(speciesName.trim().toLowerCase());
    if (index === -1) return { bg: "bg-[#fafaf9]0 hover:bg-[#a8a29e]", text: "text-[#292524]", border: "border-[#a8a29e]", lightBg: "bg-[#fafaf9]/50" };
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
    <div className="min-h-screen bg-[#fafaf9]/60 text-[#292524] flex flex-col font-sans">
      <main className="flex-1 pt-24 pb-12 px-4 sm:px-6 relative overflow-hidden">
        {/* Background radial overlays */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-[#4e572c]/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-[#e7e5e4]/50 blur-[130px] pointer-events-none" />

        <div className="max-w-[1440px] mx-auto relative z-10 flex flex-col gap-4">
          {/* Top toolbar matching dashboard reference */}
          <div className="flex justify-between items-center select-none pb-2 border-b border-[#e7e5e4]/40">
            <Link href="/my-plots" className="text-xs text-[#79716b] hover:text-[#616c39] transition-colors flex items-center gap-1.5 font-medium">
              {language === "id" ? "← Kembali ke Dasbor" : "← Back to Dashboard"}
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] uppercase px-2 py-0.5 rounded border font-bold ${
                  plot?.privacy === "public"
                    ? "bg-sky-50 text-sky-700 border-sky-100"
                    : "bg-[#fafaf9] text-[#79716b] border-[#e7e5e4]"
                }`}>
                  {plot?.privacy}
                </span>
                {isOwner && (
                  <button
                    onClick={() => setIsEditPlotModalOpen(true)}
                    className="p-1 rounded hover:bg-[#fafaf9] transition-colors text-[#79716b] hover:text-[#292524] cursor-pointer flex items-center justify-center"
                    title={language === "id" ? "Edit Plot" : "Edit Plot"}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 18.291a8.96 8.96 0 01-3.06 1.981l-3.068 1.024 1.024-3.068a8.96 8.96 0 011.98-3.061L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Download Carbon Data button dropdown */}
              <div className="relative inline-block text-left select-none shrink-0">
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="px-3 py-1.5 bg-white hover:bg-[#fafaf9] text-[#292524] border border-[#e7e5e4] font-semibold text-[10px] rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-[#79716b]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>{language === "id" ? "Unduh Data Karbon" : "Download Carbon Data"}</span>
                </button>
                {exportDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setExportDropdownOpen(false)} 
                    />
                    <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white border border-[#e7e5e4]/80 shadow-lg py-1.5 z-50 animate-fadeIn text-xs">
                      <div className="px-3 py-1 text-[9px] font-bold text-[#79716b] uppercase tracking-wider border-b border-[#fafaf9] pb-1">
                        Format
                      </div>
                      <button
                        onClick={() => {
                          setExportDropdownOpen(false);
                          handleExportData("csv");
                        }}
                        className="w-full text-left px-3 py-2 text-[#292524] hover:bg-[#fafaf9] flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span className="font-semibold text-[#616c39] font-mono text-[10px] w-6">CSV</span>
                        <span>Comma Separated</span>
                      </button>
                      <button
                        onClick={() => {
                          setExportDropdownOpen(false);
                          handleExportData("xlsx");
                        }}
                        className="w-full text-left px-3 py-2 text-[#292524] hover:bg-[#fafaf9] flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span className="font-semibold text-[#616c39] font-mono text-[10px] w-6">XLSX</span>
                        <span>Excel Spreadsheet</span>
                      </button>
                      <div className="border-t border-[#fafaf9] mt-1 px-3 py-2 text-[9px] text-[#79716b] leading-relaxed font-medium">
                        {language === "id" ? "Data terstruktur yang siap menjadi lampiran pendukung pendaftaran proyek karbon di SRN PPI atau dokumentasi kredit karbon." : "Structured data suitable as a supporting attachment when registering a carbon project in SRN PPI or for carbon credit documentation."}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {isOwner && (
                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  <button
                    onClick={() => setIsAddTreeModalOpen(true)}
                    className="px-3 py-1.5 bg-[#292524] hover:bg-[#292524]/90 text-white font-semibold text-[10px] rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span className="text-xs font-bold leading-none">+</span> {language === "id" ? "Tambah Pohon" : "Add Tree"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start mt-2">
            
            {/* LEFT COLUMN (col-span-4): Plot Profile, Stats, progress circular, and species diagram */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              
              {/* Card 1: Plot Profile & Carbon Target Gauge (Unified Left Dashboard Header) */}
              <section className="bg-white border border-[#e7e5e4]/80 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center">
                <div className="w-full border-b border-[#fafaf9] pb-3.5 mb-4 flex flex-col gap-1 text-left select-none">
                  <span className="text-[9px] font-mono text-[#616c39] font-bold block mb-0.5">{plot?.plot_code}</span>
                  <h1 className="text-lg font-bold tracking-tight text-[#292524] font-serif leading-tight">{plot?.name}</h1>
                  <p className="text-[10px] text-[#79716b] leading-normal line-clamp-3 mt-1.5">{plot?.description || "No location description."}</p>
                  <span className="text-[9px] text-[#79716b] mt-2 block font-medium">
                    Oleh <span className="text-[#79716b] font-semibold">{plot?.owner.display_name}</span> &bull; {plot && new Date(plot.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>

                {plot?.target_co2e_kg && plot.target_co2e_kg > 0 ? (
                  <>
                    <h3 className="font-bold text-[10px] text-[#79716b] uppercase tracking-widest self-start mb-1 select-none">Carbon Target Progress</h3>
                    
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
                        <span className="text-xl font-semibold text-[#292524]">{Math.round(Math.min(totalCo2e / plot.target_co2e_kg, 1) * 100)}%</span>
                        <span className="text-[9px] text-[#79716b] block font-medium mt-0.5">dari target {plot.target_co2e_kg >= 1000 ? `${(plot.target_co2e_kg / 1000).toFixed(0)}k` : plot.target_co2e_kg} kg</span>
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="w-full border-t border-[#fafaf9] pt-3 mt-1.5 select-none flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-4 text-center items-start">
                    <div className="border-r border-[#fafaf9] pr-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#79716b] block mb-0.5">Total Estimasi CO₂e</span>
                      <h2 className="font-serif text-2xl font-normal text-[#292524] tracking-tight">
                        {totalCo2e.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
                        <span className="text-xs font-sans text-[#79716b] font-medium">kg</span>
                      </h2>
                      <div className="mt-2 flex justify-center gap-1.5">
                        <span className="text-[9px] font-bold text-[#79716b] bg-[#fafaf9] border border-[#e7e5e4] px-2 py-0.5 rounded-md">
                          Trees: {scans.length}
                        </span>
                        {aggregation && (
                          <span className="text-[9px] font-bold text-[#79716b] bg-[#fafaf9] border border-[#e7e5e4] px-2 py-0.5 rounded-md">
                            &plusmn;{aggregation.combined_uncertainty_pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pl-2 flex flex-col items-center justify-center min-h-[64px] w-full">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#79716b] block mb-0.5">Carbon Density</span>
                      {hasBounds && plotAreas.length === 1 ? (
                        <>
                          <h2 className="font-serif text-2xl font-normal text-[#292524] tracking-tight">
                            {areaStats[0].density.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                            <span className="text-xs font-sans text-[#79716b] font-medium font-bold">t/ha</span>
                          </h2>
                          <div className="mt-2 flex justify-center gap-1.5">
                            <span className="text-[9px] font-bold text-[#79716b] bg-[#fafaf9] border border-[#e7e5e4] px-2 py-0.5 rounded-md">
                              Area: {areaStats[0].ha.toFixed(3)} ha
                            </span>
                          </div>
                        </>
                      ) : hasBounds && plotAreas.length > 1 ? (
                        <div data-lenis-prevent className="flex flex-col gap-1.5 w-full text-left mt-1.5 max-h-[140px] overflow-y-auto pr-1 select-none">
                          {areaStats.map((stat, idx) => {
                            const isActive = selectedAreaIndex === idx;
                            return (
                              <div 
                                key={idx} 
                                onClick={() => setSelectedAreaIndex(idx)}
                                className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all border ${
                                  isActive 
                                    ? "bg-[#616c39]/10 border-[#616c39]/30 text-[#4e572c] font-semibold shadow-xs" 
                                    : "bg-[#fafaf9]/50 border-[#fafaf9] text-[#79716b] hover:bg-[#fafaf9]"
                                }`}
                              >
                                <span className="truncate max-w-[50%]">{stat.name}</span>
                                <div className="text-right">
                                  <span className="font-serif font-bold text-[#292524]">{stat.density.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t/ha</span>
                                  <span className="text-[8px] text-[#79716b] block">({stat.ha.toFixed(3)} ha)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[9px] text-[#79716b] font-medium italic text-center leading-normal max-w-[150px] mt-1">
                          Draw plot area to view carbon density per hectare
                        </p>
                      )}
                    </div>
                  </div>

                  {hasBounds && treesOutsideCount > 0 && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200/50 p-2 rounded-lg text-[9px] leading-normal font-semibold text-left">
                      <svg className="w-4.5 h-4.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>
                        {treesOutsideCount} trees are outside the marked area, excluded from density calculation
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Card 2: Distribusi Spesies (Fleet Distribution By Type) */}
              <section className="bg-white border border-[#e7e5e4]/80 rounded-xl p-4.5 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center select-none border-b border-[#fafaf9] pb-2">
                  <h3 className="font-bold text-[10px] text-[#79716b] uppercase tracking-widest">Species Distribution & Biodiversity</h3>
                </div>

                {/* Shannon-Wiener Biodiversity Index Display */}
                <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3 flex flex-col gap-1.5 select-none">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#79716b]">Shannon-Wiener Index (H')</span>
                    <span className="font-serif text-base font-bold text-[#292524]">{shannonIndex.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${shannonIndex < 1.5 ? "bg-amber-505" : shannonIndex <= 3.0 ? "bg-[#4e572c]" : "bg-sky-550"}`} />
                    <span className="text-xs font-bold text-[#292524]">{diversityLevel}</span>
                  </div>
                  <p className="text-[10px] text-[#79716b] leading-relaxed font-medium">
                    {diversityDesc}
                  </p>
                  <div className="border-t border-[#e7e5e4] mt-1 pt-1.5 text-[9px] text-[#79716b] leading-relaxed italic font-medium">
                    Note: Higher biodiversity forests are generally associated with premium pricing in voluntary carbon markets due to ecological resilience and environmental co-benefits.
                  </div>
                </div>

                <h4 className="font-bold text-[9px] text-[#79716b] uppercase tracking-widest mt-1 select-none">Contribution per Species</h4>
                
                <div data-lenis-prevent className="flex flex-col gap-3 max-h-[160px] overflow-y-auto pr-1">
                  {speciesList.length === 0 ? (
                    <p className="text-xs text-[#79716b] italic py-4 text-center">Species not classified yet</p>
                  ) : (
                    speciesList.map((spec, idx) => {
                      const specScans = scans.filter(s => getSpeciesName(s)?.trim().toLowerCase() === spec);
                      const specCo2e = specScans.reduce((sum, s) => sum + s.co2e_kg, 0);
                      const specPct = totalCo2e > 0 ? (specCo2e / totalCo2e) * 100 : 0;
                      const color = getSpeciesColor(spec);
                      return (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs text-[#79716b] font-semibold capitalize">
                            <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.bg.split(' ')[0]}`} />
                              <span className="italic truncate">{spec}</span>
                              <span className="text-[9px] text-[#79716b] font-normal shrink-0">({specScans.length} trees)</span>
                            </div>
                            <span className="font-bold text-[#292524] shrink-0">{specPct.toFixed(0)}%</span>
                          </div>
                          {/* Progress bar track */}
                          <div className="h-1.5 w-full bg-[#fafaf9] rounded-full overflow-hidden border border-[#e7e5e4]/20">
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
              <section className="bg-white border border-[#e7e5e4]/80 rounded-xl p-4.5 shadow-sm flex flex-col gap-3">
                <h3 className="font-bold text-[10px] text-[#79716b] uppercase tracking-widest select-none">Dimensi Rata-rata & Kerapatan DBH</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-[#79716b] uppercase tracking-wider block select-none">Avg DBH</span>
                    <span className="text-lg font-bold font-serif text-[#292524]">{avgDbh.toFixed(1)} cm</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-[#79716b] uppercase tracking-wider block select-none">Avg Tinggi</span>
                    <span className="text-lg font-bold font-serif text-[#292524]">{avgTinggi.toFixed(1)} m</span>
                  </div>
                </div>

                {/* Stylized density bar graph (wave simulation) - only if scans length >= 5 */}
                {scans.length >= 5 ? (
                  <div className="flex items-end justify-between h-12 bg-[#fafbfd] border border-[#e7e5e4] rounded-lg p-2.5 mt-0.5 select-none">
                    {[45, 60, 30, 80, 50, 75, 45, 90, 65, 35, 70, 55, 85, 30].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="w-1.5 bg-[#4e572c]/20 hover:bg-[#4e572c] rounded-full transition-all duration-300 cursor-pointer"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-12 bg-[#fafbfd] border border-[#e7e5e4] rounded-lg p-2.5 mt-0.5 text-[10px] text-[#79716b] font-medium italic select-none text-center">
                    Requires at least 5 trees to view DBH distribution
                  </div>
                )}
              </section>

            </div>

            {/* KOLOM KANAN (col-span-8): Visualisasi Spasial (Grid/GPS Map) dan Table */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
              
              <div 
                onClick={() => setSelectedNode(null)}
                className="hidden md:flex bg-white border border-[#e7e5e4] rounded-xl p-4 shadow-sm flex-col gap-4 relative select-none"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-xs text-[#79716b] uppercase tracking-widest">
                      {spatialMode === "grid" ? "Forest Spatial Grid Map" : "GPS Satellite Distribution Map"}
                    </h3>
                    <p className="text-[11px] text-[#79716b] mt-0.5">
                      {spatialMode === "grid" 
                        ? "Drag 48x48px nodes (2x2 cells) to position the actual tree location" 
                        : "Displays the geographical distribution of actual tree GPS coordinates on the map"}
                    </p>
                  </div>

                  {/* Passive Auto-save Indicator */}
                  {isOwner && spatialMode === "grid" && saveStatus !== "idle" && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e7e5e4] text-[10px] font-semibold transition-all select-none shadow-xs bg-white shrink-0">
                      {saveStatus === "saving" ? (
                        <>
                          <span className="w-3 h-3 border-2 border-[#a8a29e] border-t-transparent rounded-full animate-spin inline-block" />
                          <span className="text-[#79716b]">Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4e572c] inline-block animate-pulse" />
                          <span className="text-[#616c39] font-bold">Perubahan disimpan</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-stretch relative w-full">
                  {/* Vertical Photoshop-style Sidebar */}
                  <div className="flex flex-row md:flex-col gap-2 bg-[#fafaf9] border border-[#e7e5e4]/85 p-2 rounded-xl shadow-xs shrink-0 items-center justify-center md:justify-start w-full md:w-12 select-none z-20">
                    
                    {/* Grid Mode Button */}
                    <div className="relative group">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSpatialMode("grid"); }}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          spatialMode === "grid" 
                            ? "bg-[#292524] border-[#1c1917] text-white" 
                            : "bg-white border-[#fafaf9] hover:bg-[#fafaf9]/50 text-[#79716b]"
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                      </button>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 md:left-14 md:-translate-x-0 md:top-1/2 md:-translate-y-1/2 hidden group-hover:block bg-[#292524] text-white text-[9px] font-semibold px-2 py-1 rounded shadow-md whitespace-nowrap z-30">
                        Grid Spasial
                      </div>
                    </div>

                    {/* GPS Mode Button */}
                    <div className="relative group">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSpatialMode("gps"); }}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          spatialMode === "gps" 
                            ? "bg-[#292524] border-[#1c1917] text-white" 
                            : "bg-white border-[#fafaf9] hover:bg-[#fafaf9]/50 text-[#79716b]"
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.89-2.203a.75.75 0 00.407-.675V5.27a.75.75 0 00-1.08-.674L15 6.75 9 3.75 3.28 6.324A.75.75 0 003 7v11.75a.75.75 0 001.08.674L9 17.25l6 3m.503-.002L9 17.25m6 3l4.89-2.203a.75.75 0 00.407-.675V5.27a.75.75 0 00-1.08-.674L15 6.75" />
                        </svg>
                      </button>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 md:left-14 md:-translate-x-0 md:top-1/2 md:-translate-y-1/2 hidden group-hover:block bg-[#292524] text-white text-[9px] font-semibold px-2 py-1 rounded shadow-md whitespace-nowrap z-30">
                        GPS Map
                      </div>
                    </div>

                    {/* Divider for Zoom */}
                    {spatialMode === "grid" && <div className="w-full md:w-8 h-px bg-[#e7e5e4] my-0 md:my-1" />}

                    {/* Zoom In Button */}
                    {spatialMode === "grid" && (
                      <div className="relative group">
                        <button
                          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                          disabled={zoomLevel >= 1.25}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            zoomLevel >= 1.25
                              ? "bg-[#fafaf9] border-[#fafaf9] text-[#d6d3d1] cursor-not-allowed"
                              : "bg-white border-[#e7e5e4] text-[#79716b] hover:bg-[#fafaf9]"
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                          </svg>
                        </button>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 md:left-14 md:-translate-x-0 md:top-1/2 md:-translate-y-1/2 hidden group-hover:block bg-[#292524] text-white text-[9px] font-semibold px-2 py-1 rounded shadow-md whitespace-nowrap z-30">
                          Zoom In ({zoomLevel * 100}%)
                        </div>
                      </div>
                    )}

                    {/* Zoom Out Button */}
                    {spatialMode === "grid" && (
                      <div className="relative group">
                        <button
                          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                          disabled={zoomLevel <= 0.5}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            zoomLevel <= 0.5
                              ? "bg-[#fafaf9] border-[#fafaf9] text-[#d6d3d1] cursor-not-allowed"
                              : "bg-white border-[#e7e5e4] text-[#79716b] hover:bg-[#fafaf9]"
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                          </svg>
                        </button>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 md:left-14 md:-translate-x-0 md:top-1/2 md:-translate-y-1/2 hidden group-hover:block bg-[#292524] text-white text-[9px] font-semibold px-2 py-1 rounded shadow-md whitespace-nowrap z-30">
                          Zoom Out ({zoomLevel * 100}%)
                        </div>
                      </div>
                    )}

                    {/* Divider for Owner tools */}
                    {isOwner && spatialMode === "grid" && <div className="w-full md:w-8 h-px bg-[#e7e5e4] my-0 md:my-1" />}

                    {/* Draw Area Toggle Button */}
                    {isOwner && spatialMode === "grid" && (
                      <div className="relative group">
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsDrawingMode(!isDrawingMode); }}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            isDrawingMode 
                              ? "bg-[#616c39] border-[#616c39] text-white hover:bg-[#4e572c]" 
                              : "bg-white border-[#e7e5e4] text-[#79716b] hover:bg-[#fafaf9]"
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0l-6-6" />
                          </svg>
                        </button>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 md:left-14 md:-translate-x-0 md:top-1/2 md:-translate-y-1/2 hidden group-hover:block bg-[#292524] text-white text-[9px] font-semibold px-2 py-1 rounded shadow-md whitespace-nowrap z-30">
                          {isDrawingMode ? "Selesai Menandai" : "Tandai Area Plot"}
                        </div>
                      </div>
                    )}

                    {/* Clear Areas Button */}
                    {isOwner && spatialMode === "grid" && plotAreas.length > 0 && (
                      <div className="relative group">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlotAreas([]);
                            setSelectedAreaIndex(null);
                            setIsLayoutDirty(true);
                          }}
                          className="p-2 rounded-lg border border-red-150 bg-red-50 text-red-650 hover:bg-red-100 transition-all cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 md:left-14 md:-translate-x-0 md:top-1/2 md:-translate-y-1/2 hidden group-hover:block bg-[#292524] text-white text-[9px] font-semibold px-2 py-1 rounded shadow-md whitespace-nowrap z-30">
                          Hapus Semua Area
                        </div>
                      </div>
                    )}

                    {/* Spacer for desktop only */}
                    <div className="hidden md:block flex-1" />

                  </div>

                  {/* Canvas Container */}
                  <div className="flex-1 min-w-0 relative">
                    {spatialMode === "grid" ? (
                      <>
                        <div 
                          ref={containerRef}
                          style={{ height: "650px" }} 
                          className="w-full border border-[#e7e5e4] rounded-xl bg-[#fafaf9]/20 p-2 relative overflow-hidden select-none"
                        >
                          <div
                            style={{
                              transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0)`,
                              width: `${logicalWidth}px`,
                              height: `${DEFAULT_ROWS * CELL_SIZE}px`,
                            }}
                            className="absolute top-0 left-0 origin-top-left"
                          >
                            <div
                              style={{
                                transform: `scale(${zoomLevel})`,
                                transformOrigin: "top left",
                                transition: "transform 0.15s ease-out",
                                width: `${logicalWidth}px`,
                                height: `${DEFAULT_ROWS * CELL_SIZE}px`,
                              }}
                              className="absolute top-0 left-0"
                            >
                              <div 
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onMouseDown={(e) => {
                                  if (isDrawingMode) {
                                    handleGridMouseDown(e);
                                  } else {
                                    handleCanvasMouseDown(e);
                                  }
                                }}
                                onMouseMove={(e) => {
                                  if (isDrawingMode) {
                                    handleGridMouseMove(e);
                                  }
                                }}
                                onMouseUp={() => {
                                  if (isDrawingMode) {
                                    handleGridMouseUp();
                                  }
                                }}
                                style={{
                                  width: `${logicalWidth}px`,
                                  height: `${DEFAULT_ROWS * CELL_SIZE}px`,
                                  backgroundImage: "linear-gradient(to right, rgba(226, 232, 240, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(226, 232, 240, 0.45) 1px, transparent 1px)",
                                  backgroundSize: "24px 24px",
                                }}
                                className={`absolute top-0 left-0 bg-[#fafbfd] rounded-lg border border-[#fafaf9] select-none ${isDrawingMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
                                ref={gridRef}
                              >

                          {/* Temporary drawing selection overlay */}
                          {isDragging && drawStart && drawCurrent && (() => {
                            const xMin = Math.min(drawStart.x, drawCurrent.x);
                            const xMax = Math.max(drawStart.x, drawCurrent.x);
                            const yMin = Math.min(drawStart.y, drawCurrent.y);
                            const yMax = Math.max(drawStart.y, drawCurrent.y);
                            const left = xMin * CELL_SIZE;
                            const top = yMin * CELL_SIZE;
                            const width = (xMax - xMin) * CELL_SIZE;
                            const height = (yMax - yMin) * CELL_SIZE;
                            return (
                              <div 
                                style={{
                                  position: "absolute",
                                  left: `${left}px`,
                                  top: `${top}px`,
                                  width: `${width}px`,
                                  height: `${height}px`,
                                  pointerEvents: "none",
                                  zIndex: 10,
                                }}
                                className="border-2 border-[#616c39] border-dashed bg-[#4e572c]/10"
                              />
                            );
                          })()}

                          {/* Render all finalized plot areas */}
                          {plotAreas.map((area, index) => {
                            const isSelected = selectedAreaIndex === index;
                            const xMin = Math.min(area.x1, area.x2);
                            const xMax = Math.max(area.x1, area.x2);
                            const yMin = Math.min(area.y1, area.y2);
                            const yMax = Math.max(area.y1, area.y2);
                            const left = xMin * CELL_SIZE;
                            const top = yMin * CELL_SIZE;
                            const width = (xMax - xMin) * CELL_SIZE;
                            const height = (yMax - yMin) * CELL_SIZE;
                            
                            const stat = areaStats[index] || { ha: 0, density: 0 };

                            return (
                              <div
                                key={index}
                                id={`area-box-${index}`}
                                style={{
                                  position: "absolute",
                                  left: `${left}px`,
                                  top: `${top}px`,
                                  width: `${width}px`,
                                  height: `${height}px`,
                                  zIndex: isSelected ? 15 : 5,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAreaIndex(index);
                                }}
                                onMouseDown={(e) => {
                                  if ((e.target as HTMLElement).dataset.handle) return;
                                  if (isOwner && !isDrawingMode) {
                                    handleAreaMouseDown(e, index, "move");
                                  }
                                }}
                                className={`group/area border-2 rounded-md flex flex-col justify-between p-1.5 ${
                                  isSelected 
                                    ? "border-[#616c39] bg-[#4e572c]/15 ring-4 ring-[#616c39]/20 shadow-md" 
                                    : "border-[#616c39]/60 bg-[#4e572c]/5 hover:border-[#616c39] hover:bg-[#4e572c]/10"
                                }`}
                              >
                                {/* Area Label & Rename Input */}
                                <div className="flex items-center gap-1 bg-[#616c39]/90 text-white font-bold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs w-fit select-none pointer-events-auto">
                                  {editingAreaIndex === index ? (
                                    <input
                                      type="text"
                                      defaultValue={area.name || `Area ${index + 1}`}
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                      onBlur={(e) => {
                                        const newName = e.target.value.trim();
                                        if (newName) {
                                          setPlotAreas(prev => {
                                            const next = [...prev];
                                            next[index] = { ...next[index], name: newName };
                                            return next;
                                          });
                                          setIsLayoutDirty(true);
                                        }
                                        setEditingAreaIndex(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      className="bg-white border-0 rounded px-1 py-0 text-[8px] text-[#292524] font-bold focus:outline-none w-20"
                                    />
                                  ) : (
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isOwner) {
                                          setEditingAreaIndex(index);
                                        }
                                      }}
                                      title="Click to change name"
                                      className="cursor-pointer hover:underline"
                                    >
                                      {area.name || `Area ${index + 1}`}
                                    </span>
                                  )}
                                  
                                  {/* Delete single area button */}
                                  {isOwner && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPlotAreas(prev => prev.filter((_, i) => i !== index));
                                        setSelectedAreaIndex(null);
                                        setIsLayoutDirty(true);
                                      }}
                                      title="Hapus area ini"
                                      className="ml-1 text-white hover:text-red-200 flex items-center justify-center"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>

                                {/* Size label display */}
                                <span className="absolute bottom-1 right-1 text-[7px] text-[#79716b] font-bold bg-white/70 px-1 py-0.1 rounded select-none pointer-events-none">
                                  {stat.ha.toFixed(3)} ha
                                </span>

                                {/* Figma-style Resize Handles */}
                                {isSelected && isOwner && (
                                  <>
                                    <div
                                      data-handle="tl"
                                      onMouseDown={(e) => handleAreaMouseDown(e, index, "resize", "tl")}
                                      className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#616c39] rounded-full cursor-nwse-resize z-20 hover:scale-125 transition-transform"
                                    />
                                    <div
                                      data-handle="tr"
                                      onMouseDown={(e) => handleAreaMouseDown(e, index, "resize", "tr")}
                                      className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#616c39] rounded-full cursor-nesw-resize z-20 hover:scale-125 transition-transform"
                                    />
                                    <div
                                      data-handle="bl"
                                      onMouseDown={(e) => handleAreaMouseDown(e, index, "resize", "bl")}
                                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#616c39] rounded-full cursor-nesw-resize z-20 hover:scale-125 transition-transform"
                                    />
                                    <div
                                      data-handle="br"
                                      onMouseDown={(e) => handleAreaMouseDown(e, index, "resize", "br")}
                                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#616c39] rounded-full cursor-nwse-resize z-20 hover:scale-125 transition-transform"
                                    />
                                  </>
                                )}
                              </div>
                            );
                          })}

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
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                              position: "absolute",
                              left: `${pos.x * CELL_SIZE}px`,
                              top: `${pos.y * CELL_SIZE}px`,
                              width: "48px",
                              height: "64px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              zIndex: isSelected ? 30 : 20,
                            }}
                            title={scan.tree_code}
                          >
                            {/* The 48x48px Node Box */}
                            <div
                              draggable={isOwner && !isDrawingMode}
                              onDragStart={(e) => handleDragStart(e, scan.tree_code)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNode(scan);
                              }}
                              className={`w-12 h-12 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-center hover:scale-105 hover:shadow-md ${
                                specColor.bg.split(' ')[0]
                              } ${specColor.border} ${
                                isSelected ? "ring-4 ring-[#616c39]/35 border-[#616c39] shadow-md scale-105" : ""
                              }`}
                            >
                              <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m-5-8h10L12 5zM4 17h16L12 11z" />
                              </svg>
                            </div>
                            
                            {/* Small label below node */}
                            <span className="text-[8px] font-mono font-bold text-[#79716b] bg-white/80 border border-[#e7e5e4] px-1 py-0.2 rounded shadow-xs mt-1 block w-fit mx-auto text-center pointer-events-none select-none shrink-0 truncate max-w-full">
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
                            className="bg-white border border-[#e7e5e4] rounded-lg p-3.5 shadow-xl flex flex-col gap-2.5 animate-fadeIn select-none pointer-events-auto"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono bg-[#fafaf9] text-[#79716b] px-2 py-0.5 rounded font-bold">
                                {selectedNode.tree_code}
                              </span>
                              <button
                                onClick={() => setSelectedNode(null)}
                                className="text-[#79716b] hover:text-[#292524] p-0.5 rounded transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            <div className="flex flex-col gap-1 text-[11px] text-[#79716b]">
                              {specName && (
                                <span className={`text-[8px] font-semibold border ${specColor.border} ${specColor.lightBg} ${specColor.text} px-2 py-0.5 rounded capitalize w-fit`}>
                                  <i>{specName}</i>
                                </span>
                              )}
                              <div className="flex justify-between border-b border-[#fafaf9] pb-1 mt-1">
                                <span>DBH:</span>
                                <span className="font-bold text-[#292524]">{selectedNode.dbh_cm.toFixed(1)} cm</span>
                              </div>
                              <div className="flex justify-between border-b border-[#fafaf9] pb-1">
                                <span>Tinggi:</span>
                                <span className="font-bold text-[#292524]">{selectedNode.tinggi_m.toFixed(1)} m</span>
                              </div>
                              <div className="flex justify-between text-[#4e572c] font-semibold mt-0.5">
                                <span>CO₂e:</span>
                                <span className="font-bold">{selectedNode.co2e_kg.toFixed(1)} kg</span>
                              </div>
                            </div>

                            <Link
                              href={`/reconstruct?code=${selectedNode.tree_code}&phase=result`}
                              className="bg-[#292524] hover:bg-[#292524]/90 text-white font-semibold text-[10px] rounded py-1.5 text-center shadow-sm transition-all"
                            >
                              Buka detail →
                            </Link>
                            {isOwner && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTreeToRemove(selectedNode.tree_code);
                                }}
                                className="border border-red-250 hover:border-red-350 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[10px] rounded py-1.5 text-center shadow-sm transition-all cursor-pointer"
                              >
                                Keluarkan dari Plot
                              </button>
                            )}
                          </div>
                        );
                      })()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Explicit Scale Indicator Label (Anchored in place, never scales or scrolls) */}
                      <div className="absolute bottom-5 right-5 bg-white/95 backdrop-blur-xs border border-[#e7e5e4] rounded px-2.5 py-1 text-[9px] font-bold text-[#79716b] shadow-sm select-none z-30 pointer-events-none flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4e572c] animate-pulse" />
                        <span>1 kotak grid = 2 meter</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      {gpsScans.length < scans.length && (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-100 text-[10px] font-semibold text-amber-800 rounded-lg select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Showing {gpsScans.length} of {scans.length} trees — the rest do not have GPS data</span>
                        </div>
                      )}
                      <div style={{ height: `${DEFAULT_ROWS * CELL_SIZE}px` }} className="border border-[#e7e5e4] rounded-lg overflow-hidden relative">
                        <PlotMap
                          scans={scans}
                          centroidLat={plot?.gps_centroid_lat || null}
                          centroidLon={plot?.gps_centroid_lon || null}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

              {/* Card 5: Orders-style Tree Scans Table */}
              <section className="bg-white border border-[#e7e5e4] rounded-xl p-4 shadow-sm flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-xs text-[#79716b] uppercase tracking-widest select-none">Tree Records List ({filteredScans.length})</h3>
                  </div>
                  
                  {/* Tab Filters */}
                  <div className="flex bg-[#fafaf9] p-0.5 rounded-lg border border-[#e7e5e4] select-none">
                    <button 
                      onClick={() => setFilterTab("all")} 
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        filterTab === "all" ? "bg-white text-[#292524] shadow-xs" : "text-[#79716b] hover:text-[#292524]"
                      }`}
                    >
                      Semua
                    </button>
                    <button 
                      onClick={() => setFilterTab("large")} 
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        filterTab === "large" ? "bg-white text-[#292524] shadow-xs" : "text-[#79716b] hover:text-[#292524]"
                      }`}
                    >
                      DBH &gt; 10cm
                    </button>
                    <button 
                      onClick={() => setFilterTab("small")} 
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        filterTab === "small" ? "bg-white text-[#292524] shadow-xs" : "text-[#79716b] hover:text-[#292524]"
                      }`}
                    >
                      DBH &le; 10cm
                    </button>
                  </div>
                </div>

                {/* Table Layout */}
                <div data-lenis-prevent className="w-full max-h-[380px] overflow-y-auto overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-[#79716b]">
                    <thead>
                      <tr className="border-b border-[#fafaf9] text-[#79716b] font-bold uppercase tracking-wider text-[9px] select-none sticky top-0 bg-white z-10 shadow-xs">
                        <th className="py-2.5 px-3">Tree</th>
                        <th className="py-2.5 px-3">Species Classification</th>
                        <th className="py-2.5 px-3">Metrik Fisik</th>
                        <th className="py-2.5 px-3 text-right">Biomass</th>
                        <th className="py-2.5 px-3 text-right">CO₂e</th>
                        <th className="py-2.5 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScans.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center italic text-[#79716b]">
                            No tree records found for this criteria.
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
                                className="border-b border-[#fafaf9]/50 hover:bg-[#fafaf9]/50 transition-colors cursor-pointer"
                              >
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2.5">
                                    {scan.thumbnail_url ? (
                                      <img
                                        src={scan.thumbnail_url}
                                        alt={scan.tree_code}
                                        loading="lazy"
                                        className="w-8 h-8 rounded-lg object-cover border border-[#e7e5e4] shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-[#fafaf9] border border-[#e7e5e4] flex items-center justify-center text-[#79716b] shrink-0">
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-bold text-[#292524] block text-xs">{scan.tree_code}</span>
                                      <span className="text-[10px] text-[#79716b] block font-mono">
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
                                      {specCommon && <span className="text-[9px] text-[#79716b]">{specCommon}</span>}
                                    </div>
                                  ) : (
                                    <span className="text-[#79716b] italic">Tidak terklasifikasi</span>
                                  )}
                                </td>
                                
                                <td className="py-3 px-3">
                                  <div className="flex flex-col gap-0.5">
                                    <span>DBH: <span className="font-semibold text-[#292524]">{scan.dbh_cm.toFixed(1)} cm</span></span>
                                    <span>Tinggi: <span className="font-semibold text-[#292524]">{scan.tinggi_m.toFixed(1)} m</span></span>
                                  </div>
                                </td>
                                
                                <td className="py-3 px-3 text-right font-medium text-[#79716b]">
                                  {scan.biomassa_kg.toFixed(1)} kg
                                </td>
                                
                                <td className="py-3 px-3 text-right font-bold text-[#292524]">
                                  {scan.co2e_kg.toFixed(1)} kg
                                </td>
                                
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {isOwner && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTreeToRemove(scan.tree_code);
                                        }}
                                        title="Keluarkan dari plot"
                                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-all cursor-pointer flex items-center justify-center"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
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

      {/* Modal Confirm Delete Tree */}
      {treeToRemove && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#292524]/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setTreeToRemove(null)}
          />
          
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-2xl relative z-10 w-full max-w-sm flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-base text-[#292524] font-bold">Remove Tree</h3>
                <p className="text-[10px] text-[#79716b] mt-0.5">This action will remove the tree from the plot.</p>
              </div>
            </div>
            
            <p className="text-xs text-[#79716b] leading-relaxed">
              Are you sure you want to remove tree <span className="font-bold text-[#292524]">{treeToRemove}</span> from this plot?
            </p>
            
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setTreeToRemove(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#79716b] hover:text-[#292524] bg-[#fafaf9] hover:bg-[#fafaf9] border border-[#e7e5e4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const code = treeToRemove;
                  setTreeToRemove(null);
                  await handleRemoveTree(code);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
              >
                Keluarkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Tree */}
      {isAddTreeModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#292524]/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsAddTreeModalOpen(false)}
          />
          
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-5 shadow-2xl relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col gap-5 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-lg text-[#292524] font-normal">Add Tree to Plot</h3>
                <p className="text-xs text-[#79716b] mt-1">Select a method to add tree biomass records.</p>
              </div>
              <button 
                onClick={() => setIsAddTreeModalOpen(false)} 
                className="text-[#79716b] hover:text-[#292524] w-8 h-8 rounded-full bg-[#fafaf9] flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div data-lenis-prevent className="flex flex-col gap-4 overflow-y-auto pr-1">
              <div 
                className="border border-[#e7e5e4] rounded-lg p-4 hover:border-[#292524]/60 hover:bg-[#fafaf9]/50 transition-all cursor-pointer flex flex-col gap-1.5" 
                onClick={handleStartNewScan}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#616c39]/10 text-[#616c39] flex items-center justify-center font-bold text-base leading-none">+</span>
                  <span className="font-semibold text-xs text-[#292524]">Start New Scan</span>
                </div>
                <p className="text-[11px] text-[#79716b] leading-relaxed ml-8">
                  Record video/photos of a new tree directly with your camera.
                </p>
              </div>

              <div className="border border-[#e7e5e4] rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  </span>
                  <span className="font-semibold text-xs text-[#292524]">Hubungkan Scan Lama</span>
                </div>
                <p className="text-[11px] text-[#79716b] leading-relaxed ml-8">
                  Select a previous tree recording not yet associated with any plot.
                </p>
                
                <div className="ml-8 border-t border-[#fafaf9] pt-3 flex flex-col gap-2.5">
                  <input
                    type="text"
                    placeholder={language === "id" ? "Cari kode pohon (contoh: POHON-1234)..." : "Search tree code (e.g. POHON-1234)..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#fafaf9] border border-[#e7e5e4] focus:border-[#292524] rounded-lg px-3 py-1.5 text-xs text-[#292524] placeholder-[#a8a29e] focus:outline-none focus:ring-4 focus:ring-[#1c1917]/5 transition-all w-full"
                  />

                  {claimError && (
                    <p className="text-[10px] text-red-650 bg-red-50 border border-red-100 px-3 py-1.5 rounded font-medium">{claimError}</p>
                  )}

                  <div data-lenis-prevent className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {unclaimedLoading ? (
                      <div className="text-center py-3 text-[#79716b] text-[10px] font-semibold flex items-center justify-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-[#a8a29e] border-t-transparent rounded-full animate-spin" />
                        Loading scan data...
                      </div>
                    ) : unclaimedScans.length === 0 ? (
                      <div className="text-center py-3 text-[#79716b] text-[10px] italic">
                        No unclaimed scans available.
                      </div>
                    ) : (
                      unclaimedScans
                        .filter(s => s.tree_code.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((scan) => (
                          <div 
                            key={scan.id} 
                            onClick={() => handleClaimOldScan(scan)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[#fafaf9] border border-[#fafaf9]/70 hover:border-[#e7e5e4] transition-all cursor-pointer"
                          >
                            <div>
                              <span className="text-xs font-bold text-[#292524] block">{scan.tree_code}</span>
                              <span className="text-[10px] text-[#79716b]">DBH: {scan.dbh_cm.toFixed(1)} cm</span>
                            </div>
                            <button 
                              disabled={claimLoading !== null}
                              className="px-2 py-0.5 bg-[#fafaf9] hover:bg-[#e7e5e4] text-[#292524] font-bold text-[9px] rounded transition-colors cursor-pointer"
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

      {/* Modal {language === "id" ? "Edit Plot" : "Edit Plot"} */}
      {isEditPlotModalOpen && plot && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#292524]/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsEditPlotModalOpen(false)}
          />
          
          <form 
            onSubmit={handleEditPlot}
            className="bg-white border border-[#e7e5e4] rounded-xl p-5 shadow-2xl relative z-10 w-full max-w-md flex flex-col gap-4 animate-fadeIn"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-lg text-[#292524] font-normal">{language === "id" ? "Edit Plot" : "Edit Plot"} Info</h3>
                <p className="text-xs text-[#79716b] mt-1">Change the name, description, and privacy of this plot.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditPlotModalOpen(false)} 
                className="text-[#79716b] hover:text-[#292524] w-8 h-8 rounded-full bg-[#fafaf9] flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#79716b]">Plot Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-[#fafaf9] border border-[#e7e5e4] focus:border-[#292524] rounded-xl px-4 py-2.5 text-xs text-[#292524] focus:outline-none focus:ring-4 focus:ring-[#1c1917]/5 transition-all w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#79716b]">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="bg-[#fafaf9] border border-[#e7e5e4] focus:border-[#292524] rounded-xl px-4 py-2.5 text-xs text-[#292524] focus:outline-none focus:ring-4 focus:ring-[#1c1917]/5 transition-all w-full resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#79716b]">Plot Privacy</label>
                <div className="grid grid-cols-2 gap-3 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setEditPrivacy("private")}
                    className={`border rounded-xl p-2.5 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      editPrivacy === "private"
                        ? "border-[#616c39] bg-[#616c39]/10 text-[#616c39]"
                        : "border-[#e7e5e4] bg-white text-[#79716b] hover:border-[#e7e5e4]"
                    }`}
                  >
                    <span className="text-xs font-semibold">Private</span>
                    <span className="text-[9px] text-center opacity-85 leading-none">Only the owner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPrivacy("public")}
                    className={`border rounded-xl p-2.5 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      editPrivacy === "public"
                        ? "border-[#616c39] bg-[#616c39]/10 text-[#616c39]"
                        : "border-[#e7e5e4] bg-white text-[#79716b] hover:border-[#e7e5e4]"
                    }`}
                  >
                    <span className="text-xs font-semibold">Public</span>
                    <span className="text-[9px] text-center opacity-85 leading-none">Open to everyone</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-2 border-t border-[#fafaf9] pt-3.5">
              <button
                type="button"
                onClick={() => setIsEditPlotModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#79716b] bg-[#fafaf9] hover:bg-[#fafaf9] border border-[#e7e5e4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#292524] hover:bg-[#292524]/90 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1"
              >
                {actionLoading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
